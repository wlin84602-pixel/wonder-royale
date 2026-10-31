'use strict';
/* Rooms, lobby, match lifecycle and reconnects. Transport-agnostic: it only needs a Socket.IO-shaped `io`
   (io.on('connection'), io.to(room).emit, socket.join/emit/on). */
const crypto = require('crypto');
const { Sim } = require('./sim');

const MAX_PLAYERS = 6;          // lobby slots in the UI
const MIN_PLAYERS = 2;          // a match needs at least two people
const COUNTDOWN_S = 5;
const OVER_S = 10;              // results screen before returning to the lobby
const TICK_HZ = 30;
const GRACE_LOBBY_S = 20;       // how long a disconnected player keeps their lobby seat
const GRACE_PLAY_S = 45;        // ...and their character during a match
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const AUTO_CD_S = 30;           // public lobby: countdown once two real players are in
const FULL_CD_S = 10;           // ...shortened when the lobby is full
const AW = 800, AH = 450;       // waiting field: half width / half height (client draws the same rectangle)
const ARENA_LIM = 800;          // positions are clamped to +-this around the centre
const GOAL_H = 120;             // half height of each goal opening
const COINS_N = 9;
const DEFAULT_OPTS = { map: 1, storm: 1, loot: 1 };

const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
const int = (v, lo, hi, d) => Math.max(lo, Math.min(hi, Math.floor(num(v, d))));
const cleanName = (s) => {
  s = String(s == null ? '' : s).replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 12);
  return s || 'Player';
};

class RoomManager {
  constructor(io, opts = {}) {
    this.io = io;
    this.rooms = new Map();
    this.byToken = new Map();            // token -> {room, player}
    this.adminKey = String(opts.adminKey != null ? opts.adminKey : (process.env.ADMIN_KEY || ''));
    this.log = opts.log || (() => {});
    this.limits = opts.limits || { melees: 12, packs: 21, paras: 22, skins: 100, emotes: 24 };
    this.tickMs = 1000 / TICK_HZ;
    this.timer = setInterval(() => this.tick(), this.tickMs);
    this.last = Date.now();
    this.sweeper = setInterval(() => this.sweep(), 1000);
    io.on('connection', (socket) => this.onConnection(socket));
  }
  close() { clearInterval(this.timer); clearInterval(this.sweeper); for (const r of this.rooms.values()) r.sim && r.sim.dispose(); }

  /* ---------- socket wiring ---------- */
  onConnection(socket) {
    socket.data = socket.data || {};
    let bucket = 90, bucketT = Date.now();
    const allow = () => {                                   // simple flood limit: ~90 messages/s burst, 60/s sustained
      const now = Date.now();
      bucket = Math.min(90, bucket + (now - bucketT) * 0.06); bucketT = now;
      if (bucket < 1) return false; bucket -= 1; return true;
    };
    const ackSafe = (ack, v) => { if (typeof ack === 'function') { try { ack(v); } catch (e) { /* client went away */ } } };
    socket.on('room:create', (d, ack) => { if (!allow()) return; ackSafe(ack, this.create(socket, d || {})); });
    socket.on('room:join', (d, ack) => { if (!allow()) return; ackSafe(ack, this.join(socket, d || {})); });
    socket.on('room:rejoin', (d, ack) => { if (!allow()) return; ackSafe(ack, this.rejoin(socket, d || {})); });
    socket.on('room:leave', (_d, ack) => { this.leave(socket, true); ackSafe(ack, { ok: true }); });
    socket.on('room:solo', (d, ack) => { if (!allow()) return; ackSafe(ack, this.solo(socket, d || {})); });
    socket.on('room:ctl', (d, ack) => { if (!allow()) return; ackSafe(ack, this.control(socket, d || {})); });
    socket.on('admin:auth', (d, ack) => { if (!allow()) return; ackSafe(ack, this.adminAuth(socket, d || {})); });
    socket.on('room:start', (_d, ack) => { if (!allow()) return; ackSafe(ack, this.start(socket)); });
    socket.on('room:opts', (d, ack) => { if (!allow()) return; ackSafe(ack, this.setOpts(socket, d || {})); });
    socket.on('chat', (d) => { if (allow()) this.chat(socket, d); });
    socket.on('lp', (d) => { if (allow()) this.arenaPos(socket, d); });
    socket.on('in', (d) => { if (allow()) this.input(socket, d); });
    socket.on('act', (d) => { if (allow()) this.act(socket, d); });
    socket.on('pingx', (t, ack) => ackSafe(ack, t));
    socket.on('disconnect', () => this.onDisconnect(socket));
  }
  ctxOf(socket) {
    const { code, pid } = socket.data || {};
    const room = code && this.rooms.get(code);
    const p = room && room.players.get(pid);
    return room && p && p.socketId === socket.id ? { room, p } : null;
  }

  /* ---------- lobby ---------- */
  newCode() {
    for (let k = 0; k < 50; k++) {
      let c = ''; for (let i = 0; i < 5; i++) c += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
      if (!this.rooms.has(c)) return c;
    }
    return null;
  }
  profile(d) {
    const L = this.limits;
    return {
      name: cleanName(d.name), skin: int(d.skin, 0, L.skins - 1, 0), sub: d.sub ? 1 : 0,
      ml: int(d.ml, 0, L.melees - 1, 0), bp: int(d.bp, 0, L.packs - 1, 0), cp: int(d.cp, 0, L.paras - 1, 0), so: d.so ? 1 : 0
    };
  }
  addPlayer(room, socket, d) {
    const p = Object.assign({ id: crypto.randomBytes(4).toString('hex'), token: crypto.randomBytes(16).toString('hex'), socketId: socket.id, connected: true, discAt: 0, joinedAt: Date.now(), lastIn: 0, admin: !!socket.data.admin }, this.profile(d));
    room.players.set(p.id, p);
    this.byToken.set(p.token, { room, p });
    socket.data.code = room.code; socket.data.pid = p.id;
    socket.join(room.code);
    return p;
  }
  create(socket, d) {
    this.leave(socket, true);
    const code = this.newCode(); if (!code) return { ok: false, error: 'Server is full, try again.' };
    const room = { code, players: new Map(), hostId: null, phase: 'lobby', cd: 0, over: 0, opts: Object.assign({}, DEFAULT_OPTS), sim: null, match: null, rn: 0, results: null, pub: !!d._pub, paused: false };
    this.rooms.set(code, room);
    const p = this.addPlayer(room, socket, d);
    room.hostId = p.id;
    this.log('room created', code);
    this.pushLobby(room);
    return { ok: true, code, id: p.id, token: p.token, lobby: this.lobbyOf(room) };
  }
  join(socket, d) {
    const code = String(d.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
    const room = this.rooms.get(code);
    if (!room) return { ok: false, error: 'No room with that code.' };
    if (room.phase === 'play' || room.phase === 'over') return { ok: false, error: 'That match is already running. Try again when it ends.' };
    if (room.phase === 'lobby' || room.phase === 'countdown') {
      const live = [...room.players.values()].filter((x) => x.connected).length;
      if (live >= MAX_PLAYERS) return { ok: false, error: 'That room is full.' };
    }
    this.leave(socket, true);
    const p = this.addPlayer(room, socket, d);
    this.pushLobby(room);
    return { ok: true, code, id: p.id, token: p.token, lobby: this.lobbyOf(room) };
  }
  /* ---------- public lobby ("Solo" button), pause / resume / start instantly, admin ---------- */
  solo(socket, d) {
    let room = null;
    for (const r of this.rooms.values()) {
      if (!r.pub || (r.phase !== 'lobby' && r.phase !== 'countdown')) continue;
      if (this.liveCount(r) >= MAX_PLAYERS) continue;
      if (!room || this.liveCount(r) > this.liveCount(room)) room = r;     // fill the fullest open lobby first
    }
    if (!room) return this.create(socket, Object.assign({}, d, { _pub: true }));
    this.leave(socket, true);
    const p = this.addPlayer(room, socket, d);
    this.pushLobby(room);
    return { ok: true, code: room.code, id: p.id, token: p.token, lobby: this.lobbyOf(room) };
  }
  canControl(room, p) { return !!(p.admin || (!room.pub && room.hostId === p.id)); }
  adminAuth(socket, d) {
    if (!this.adminKey) return { ok: false, error: 'Admin is not set up on this server (set the ADMIN_KEY variable).' };
    if ((socket.data.adminFails | 0) >= 5) return { ok: false, error: 'Too many tries. Reload the page.' };
    const h = (x) => crypto.createHash('sha256').update(String(x)).digest();
    if (!crypto.timingSafeEqual(h(d.key), h(this.adminKey))) { socket.data.adminFails = (socket.data.adminFails | 0) + 1; return { ok: false, error: 'Wrong admin key.' }; }
    socket.data.admin = true;
    const c = this.ctxOf(socket);
    if (c) { c.p.admin = true; this.pushLobby(c.room); }
    return { ok: true };
  }
  control(socket, d) {
    const c = this.ctxOf(socket); if (!c) return { ok: false, error: 'Not in a room.' };
    const { room, p } = c;
    if (!this.canControl(room, p)) return { ok: false, error: 'Only the admin can do that.' };
    const a = String(d.a || '');
    if (a === 'pause' || a === 'resume') {
      if (room.phase !== 'lobby' && room.phase !== 'countdown') return { ok: false, error: 'Nothing to pause right now.' };
      room.paused = a === 'pause';
      this.pushLobby(room);
      return { ok: true };
    }
    if (a === 'now') {
      if (room.phase !== 'lobby' && room.phase !== 'countdown') return { ok: false, error: 'A match is already running.' };
      if (this.liveCount(room) < 1) return { ok: false, error: 'Nobody is connected.' };
      room.paused = false; room._lastCd = null;
      this.startMatch(room, true);
      return { ok: true };
    }
    return { ok: false, error: 'Unknown command.' };
  }
  rejoin(socket, d) {
    const hit = this.byToken.get(String(d.token || ''));
    const code = String(d.code || '').toUpperCase();
    if (!hit || hit.room.code !== code || !this.rooms.has(code)) return { ok: false, error: 'Session expired.' };
    const { room, p } = hit;
    if (p.socketId && p.socketId !== socket.id) {            // an old socket for the same seat: detach it
      const old = this.io.sockets && this.io.sockets.sockets && this.io.sockets.sockets.get && this.io.sockets.sockets.get(p.socketId);
      if (old) { old.data.code = null; old.data.pid = null; }
    }
    p.socketId = socket.id; p.connected = true; p.discAt = 0;
    socket.data.code = code; socket.data.pid = p.id;
    socket.join(code);
    const res = { ok: true, code, id: p.id, token: p.token, lobby: this.lobbyOf(room) };
    if (room.phase === 'play' && room.sim && room.match && room.match.roster.some((r) => r.id === p.id)) res.match = this.matchState(room, p.id);
    if (room.phase === 'over' && room.results) res.over = room.results;
    this.pushLobby(room);
    return res;
  }
  leave(socket, quiet) {
    const c = this.ctxOf(socket);
    if (!c) { socket.data.code = null; socket.data.pid = null; return; }
    const { room, p } = c;
    socket.leave && socket.leave(room.code);
    socket.data.code = null; socket.data.pid = null;
    this.removePlayer(room, p, quiet);
  }
  removePlayer(room, p, quiet) {
    room.players.delete(p.id); this.byToken.delete(p.token);
    if (room.phase === 'play' && room.sim) room.sim.dropPlayer(p.id);
    if (room.hostId === p.id) {
      const next = [...room.players.values()].find((x) => x.connected) || [...room.players.values()][0];
      room.hostId = next ? next.id : null;
    }
    if (!room.players.size) { this.destroy(room); return; }
    if (room.phase === 'countdown' && this.liveCount(room) < MIN_PLAYERS) { room.phase = 'lobby'; room.cd = 0; }
    if (!quiet || true) this.pushLobby(room);
  }
  destroy(room) { if (room.sim) room.sim.dispose(); room.sim = null; this.rooms.delete(room.code); this.log('room closed', room.code); }
  onDisconnect(socket) {
    const c = this.ctxOf(socket); if (!c) return;
    c.p.connected = false; c.p.discAt = Date.now(); c.p.socketId = null;
    const { room } = c;
    if (room.hostId === c.p.id) {
      const next = [...room.players.values()].find((x) => x.connected);
      if (next) room.hostId = next.id;
    }
    if (room.phase === 'countdown' && this.liveCount(room) < MIN_PLAYERS) { room.phase = 'lobby'; room.cd = 0; }
    this.pushLobby(room);
  }
  liveCount(room) { let n = 0; for (const p of room.players.values()) if (p.connected) n++; return n; }
  lobbyOf(room) {
    return {
      code: room.code, hostId: room.hostId, phase: room.phase, cd: Math.max(0, Math.ceil(room.cd)), min: MIN_PLAYERS, max: MAX_PLAYERS, opts: room.opts, pub: !!room.pub, paused: !!room.paused,
      players: [...room.players.values()].sort((a, b) => a.joinedAt - b.joinedAt).map((p) => ({ id: p.id, name: p.name, skin: p.skin, sub: p.sub, connected: p.connected, ad: p.admin ? 1 : 0 }))
    };
  }
  pushLobby(room) { this.io.to(room.code).emit('lobby', this.lobbyOf(room)); }
  start(socket) {
    const c = this.ctxOf(socket); if (!c) return { ok: false, error: 'Not in a room.' };
    const { room, p } = c;
    if (!this.canControl(room, p)) return { ok: false, error: room.pub ? 'Only the admin can start this lobby early.' : 'Only the host can start.' };
    if (room.phase !== 'lobby') return { ok: false, error: 'Already starting.' };
    if (this.liveCount(room) < MIN_PLAYERS) return { ok: false, error: 'Need at least ' + MIN_PLAYERS + ' players.' };
    room.phase = 'countdown'; room.cd = COUNTDOWN_S; room.paused = false;
    this.pushLobby(room);
    return { ok: true };
  }
  setOpts(socket, d) {
    const c = this.ctxOf(socket); if (!c) return { ok: false };
    const { room, p } = c;
    if (!this.canControl(room, p) || room.phase !== 'lobby') return { ok: false };
    room.opts = { map: int(d.map, 0, 2, room.opts.map), storm: int(d.storm, 0, 2, room.opts.storm), loot: int(d.loot, 0, 2, room.opts.loot) };
    this.pushLobby(room);
    return { ok: true };
  }

  /* ---------- match ---------- */
  cfgOf(room) { const o = room.opts; return [o.map, o.storm, o.loot, MIN_PLAYERS, COUNTDOWN_S, 1, 1, 1, 0, 1]; }
  startMatch(room, force) {
    const roster = [...room.players.values()].filter((p) => p.connected).slice(0, MAX_PLAYERS)
      .map((p) => ({ id: p.id, name: p.name, skin: p.skin, sub: p.sub, ml: p.ml, bp: p.bp, cp: p.cp, so: p.so }));
    if (roster.length < (force ? 1 : MIN_PLAYERS)) { room.phase = 'lobby'; room.cd = 0; this.pushLobby(room); return; }
    for (const p of [...room.players.values()]) if (!roster.some((r) => r.id === p.id)) { this.byToken.delete(p.token); room.players.delete(p.id); }
    for (const p of room.players.values()) { delete p.lx; delete p.ly; delete p.la; delete p.lt; p.ac = 0; p.ag = 0; }
    room.arena = null;
    room.rn++;
    const seed = (crypto.randomInt(1, 2 ** 30) ^ (room.rn * 7919)) >>> 0;
    const cfg = this.cfgOf(room);
    room.sim = new Sim();
    room.sim.init(seed, cfg, roster);
    room.match = { seed, cfg, roster, t0: Date.now(), len: room.sim.roundLen(cfg), planeT: room.sim.planeT(), overAt: 0, snapN: 0, lootSync: 0, lastMe: new Map() };
    room.phase = 'play'; room.results = null;
    this.log('match start', room.code, roster.length + ' players');
    this.pushLobby(room);
    this.io.to(room.code).emit('match:start', { seed, cfg, roster, planeT: room.match.planeT });
  }
  matchState(room, pid) {
    const m = room.match;
    return { seed: m.seed, cfg: m.cfg, roster: m.roster, planeT: m.planeT, world: room.sim.world(), snap: room.sim.snapshot(), me: room.sim.mine(pid) };
  }
  endMatch(room) {
    const sim = room.sim, res = sim.results();
    const alive = res.filter((r) => r.alive);
    room.results = { winner: alive.length === 1 ? alive[0].name : null, winnerId: alive.length === 1 ? alive[0].id : null, results: res, t: Math.round(sim.snapshot().t), returnIn: OVER_S };
    room.phase = 'over'; room.over = OVER_S;
    this.io.to(room.code).emit('match:over', room.results);
    this.pushLobby(room);
  }
  backToLobby(room) {
    if (room.sim) room.sim.dispose();
    room.sim = null; room.match = null; room.results = null; room.phase = 'lobby'; room.cd = 0; room.paused = false;
    for (const p of [...room.players.values()]) if (!p.connected) { this.byToken.delete(p.token); room.players.delete(p.id); }
    if (!room.players.size) { this.destroy(room); return; }
    if (!room.players.has(room.hostId)) room.hostId = [...room.players.values()][0].id;
    this.pushLobby(room);
  }
  /* waiting island: players walk around while the lobby counts down. Only cosmetic positions, relative to the island centre. */
  arenaPos(socket, d) {
    const c = this.ctxOf(socket); if (!c || !d || typeof d !== 'object') return;
    const { room, p } = c;
    if (room.phase !== 'lobby' && room.phase !== 'countdown') return;
    const nx = Math.max(-AW, Math.min(AW, num(d.x, 0))), ny = Math.max(-AH, Math.min(AH, num(d.y, 0))), now = Date.now();
    if (p.lx !== undefined && p.lt && now - p.lt > 20) { p.lvx = (nx - p.lx) / ((now - p.lt) / 1000); p.lvy = (ny - p.ly) / ((now - p.lt) / 1000); }
    p.lt = now; p.lx = nx; p.ly = ny;
    const m = Math.floor(num(d.m, 0));
    if (m > (p.lm | 0) && m - (p.lm | 0) < 5) p.punch = true;
    p.lm = Math.max(p.lm | 0, Math.min(m, 1e9));
    p.la = Math.max(-7, Math.min(7, num(d.a, 0)));
  }
  input(socket, d) {
    const c = this.ctxOf(socket); if (!c || !d || typeof d !== 'object') return;
    const { room, p } = c;
    if (room.phase !== 'play' || !room.sim) return;
    room.sim.input(p.id, { x: num(d.x, 0), y: num(d.y, 0), vx: num(d.vx, 0), vy: num(d.vy, 0), a: num(d.a, 0), ix: num(d.ix, 0), iy: num(d.iy, 0), f: d.f ? 1 : 0, m: d.m ? 1 : 0, bo: d.bo ? 1 : 0, ap: d.ap ? 1 : 0 }, Date.now());
  }
  act(socket, d) {
    const c = this.ctxOf(socket); if (!c || !d || typeof d.t !== 'string') return;
    const { room, p } = c;
    if (room.phase !== 'play' || !room.sim) return;
    let v = d.v;
    if (Array.isArray(v)) v = v.slice(0, 2).map((x) => Math.floor(num(x, -1)));
    else if (typeof v === 'number') v = Math.floor(num(v, -1));
    else if (typeof v === 'string') v = v.slice(0, 12);
    else v = undefined;
    room.sim.act(p.id, d.t.slice(0, 10), v);
  }

  /* ---------- loops ---------- */
  tick() {
    const now = Date.now(), dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    this.lpN = ((this.lpN | 0) + 1) % 2;
    for (const room of [...this.rooms.values()]) {
      if (room.phase === 'lobby' || room.phase === 'countdown') { this.tickArena(room, dt); if (this.lpN === 0) this.pushArena(room); }
      try { this.tickRoom(room, dt); } catch (e) { console.error('room error', room.code, e); this.closeBroken(room); }
    }
  }
  chat(socket, d) {
    const c = this.ctxOf(socket); if (!c || !d) return;
    const { room, p } = c;
    if (room.phase !== 'lobby' && room.phase !== 'countdown') return;
    const now = Date.now(); if (now - (p.chatAt || 0) < 700) return; p.chatAt = now;
    const t = String(d.t == null ? '' : d.t).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!t) return;
    this.io.to(room.code).emit('cm', { id: p.id, t });
  }
  /* mini games on the waiting field: Coin Rush (collect coins) and Kick the ball (score in either goal) */
  arenaOf(room) {
    if (!room.arena) {
      const rc = () => ({ id: Math.floor(Math.random() * 1e9), x: Math.round((Math.random() * 2 - 1) * (AW - 70)), y: Math.round((Math.random() * 2 - 1) * (AH - 70)) });
      room.arena = { coins: Array.from({ length: COINS_N }, rc), ball: { x: 0, y: 0, vx: 0, vy: 0 }, rc };
    }
    return room.arena;
  }
  tickArena(room, dt) {
    const A = this.arenaOf(room), b = A.ball, R = 22, BR = 26;
    const live = [...room.players.values()].filter((p) => p.connected && p.lx !== undefined);
    for (const p of live) {
      for (let i = 0; i < A.coins.length; i++) {
        const c = A.coins[i];
        if (Math.hypot(c.x - p.lx, c.y - p.ly) < R + 18) { p.ac = (p.ac | 0) + 1; A.coins[i] = A.rc(); }
      }
      if (p.punch) {                                                  // a punch near the ball sends it flying in the puncher's aim direction
        p.punch = false;
        if (Math.hypot(b.x - p.lx, b.y - p.ly) < R + BR + 38) { b.vx = Math.cos(p.la || 0) * 760; b.vy = Math.sin(p.la || 0) * 760; b.last = p.id; }
      }
      const dx = b.x - p.lx, dy = b.y - p.ly, d = Math.hypot(dx, dy);
      if (d < R + BR && d > 0.001) {
        const nx = dx / d, ny = dy / d, sp = Math.hypot(p.lvx || 0, p.lvy || 0);
        b.x = p.lx + nx * (R + BR); b.y = p.ly + ny * (R + BR);
        const kick = Math.max(300, Math.min(900, sp * 1.5));
        b.vx = nx * kick + (p.lvx || 0) * 0.3; b.vy = ny * kick + (p.lvy || 0) * 0.3;
        b.last = p.id;
      }
    }
    const f = Math.exp(-1.2 * dt); b.vx *= f; b.vy *= f;
    b.x += b.vx * dt; b.y += b.vy * dt;
    const inGoalY = Math.abs(b.y) < GOAL_H;
    if (Math.abs(b.x) > AW + 6 && inGoalY) {                       // goal
      const who = room.players.get(b.last);
      if (who) { who.ag = (who.ag | 0) + 1; this.io.to(room.code).emit('ag', { n: who.name, id: who.id }); }
      b.x = 0; b.y = 0; b.vx = 0; b.vy = 0; b.last = null;
    } else {
      if (b.x > AW - BR && !inGoalY) { b.x = AW - BR; b.vx = -Math.abs(b.vx) * 0.8; }
      if (b.x < -AW + BR && !inGoalY) { b.x = -AW + BR; b.vx = Math.abs(b.vx) * 0.8; }
      if (b.y > AH - BR) { b.y = AH - BR; b.vy = -Math.abs(b.vy) * 0.8; }
      if (b.y < -AH + BR) { b.y = -AH + BR; b.vy = Math.abs(b.vy) * 0.8; }
    }
  }
  pushArena(room) {
    const a = [];
    for (const p of room.players.values()) if (p.connected && p.lx !== undefined) a.push([p.id, Math.round(p.lx), Math.round(p.ly), Math.round(p.la * 100) / 100, p.ac | 0, p.ag | 0, p.lm | 0]);
    if (!a.length) return;
    const A = this.arenaOf(room);
    this.io.to(room.code).emit('lp', { p: a, b: [Math.round(A.ball.x), Math.round(A.ball.y)], c: A.coins.map((c) => [c.id, c.x, c.y]) });
  }
  closeBroken(room) {
    this.io.to(room.code).emit('match:error', { error: 'The match hit a server error and was reset.' });
    this.backToLobby(room);
  }
  tickRoom(room, dt) {
    if (room.phase === 'lobby' && room.pub && !room.paused && this.liveCount(room) >= MIN_PLAYERS) {
      room.phase = 'countdown'; room.cd = AUTO_CD_S; room._lastCd = null; this.pushLobby(room);       // public lobby starts itself
    }
    if (room.phase === 'countdown') {
      if (room.paused) return;
      if (room.pub && this.liveCount(room) >= MAX_PLAYERS && room.cd > FULL_CD_S) room.cd = FULL_CD_S;
      room.cd -= dt;
      const sec = Math.ceil(room.cd);
      if (room._lastCd !== sec) { room._lastCd = sec; this.pushLobby(room); }
      if (room.cd <= 0) { room._lastCd = null; this.startMatch(room); }
      return;
    }
    if (room.phase === 'over') {
      room.over -= dt;
      if (room.over <= 0) this.backToLobby(room);
      return;
    }
    if (room.phase !== 'play' || !room.sim) return;
    const sim = room.sim, m = room.match;
    sim.tick(dt);
    const snap = sim.snapshot(), ev = sim.flush();
    sim.clearCorr();
    m.snapN++;
    this.io.to(room.code).emit('s', { s: snap, e: ev });
    for (const p of room.players.values()) {
      if (!p.connected || !p.socketId) continue;
      const mine = sim.mine(p.id); if (!mine) continue;
      const key = JSON.stringify(mine);
      if (m.lastMe.get(p.id) !== key || m.snapN % 30 === 0) {
        m.lastMe.set(p.id, key);
        this.emitTo(p, 'm', mine);
      }
    }
    const alive = sim.aliveCount();
    if ((m.roster.length >= 2 && snap.t > 8 && alive <= 1) || snap.t > m.len) this.endMatch(room);
  }
  emitTo(p, ev, data) {
    const s = this.io.sockets && this.io.sockets.sockets && this.io.sockets.sockets.get && this.io.sockets.sockets.get(p.socketId);
    if (s) s.emit(ev, data);
    else if (this.io.to) this.io.to(p.socketId).emit(ev, data);
  }
  sweep() {
    const now = Date.now();
    for (const room of [...this.rooms.values()]) {
      for (const p of [...room.players.values()]) {
        if (p.connected) continue;
        const grace = (room.phase === 'play' ? GRACE_PLAY_S : GRACE_LOBBY_S) * 1000;
        if (now - p.discAt > grace) this.removePlayer(room, p, true);
      }
    }
  }
}

module.exports = { RoomManager, MAX_PLAYERS, MIN_PLAYERS, cleanName };
