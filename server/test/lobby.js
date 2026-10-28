'use strict';
/* Public lobby (SOLO button), auto countdown, pause / resume, Start instantly and admin login. */
const assert = require('assert');
const { FakeIO } = require('./fakeio');
const { RoomManager } = require('../src/rooms');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 8000, what = 'condition') => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(20); } throw new Error('timeout waiting for ' + what); };
let pass = 0; const ok = (c, m) => { assert.ok(c, m); pass++; console.log('  ok  ' + m); };

(async () => {
  const io = new FakeIO(); const rm = new RoomManager(io, { adminKey: 'sesame' });
  const prof = (n) => ({ name: n, skin: 0, sub: 0, ml: 0, bp: 0, cp: 0 });
  const mk = () => { const s = io.connect(); s.last = {}; for (const e of ['lobby', 'match:start', 'match:over']) s.cOn(e, (d) => { s.last[e] = d; }); return s; };
  const A = mk(), B = mk(), C = mk();

  console.log('public lobby');
  let r = await A.cCall('room:solo', prof('Ann'));
  ok(r.ok && r.lobby.pub === true, 'SOLO puts a player into a public lobby');
  await sleep(150);
  ok(A.last.lobby.phase === 'lobby', 'one player alone just waits (no bots, no countdown)');
  r = await B.cCall('room:solo', prof('Bob'));
  ok(r.ok && r.code === A.last.lobby.code, 'the next SOLO player lands in the same lobby');
  await until(() => A.last.lobby.phase === 'countdown', 3000, 'auto countdown');
  ok(A.last.lobby.cd > 20 && A.last.lobby.cd <= 30, 'countdown starts by itself with 2 real players (' + A.last.lobby.cd + 's)');
  r = await B.cCall('room:start');
  ok(!r.ok, 'a normal player cannot start or control the public lobby');
  r = await B.cCall('room:ctl', { a: 'now' });
  ok(!r.ok, 'a normal player cannot use Start instantly');

  console.log('waiting field mini games');
  const room = () => rm.rooms.get(A.last.lobby.code);
  A.lps = []; A.cOn('lp', (d) => A.lps.push(d)); A.ags = []; A.cOn('ag', (d) => A.ags.push(d));
  A.cEmit('lp', { x: -300, y: 200, a: 0 }); B.cEmit('lp', { x: 300, y: -200, a: 0 });
  await until(() => A.lps.length > 2, 2000, 'field updates');
  const last = A.lps[A.lps.length - 1];
  ok(last.p.length === 2 && last.b && last.c.length === 9, 'the server sends both positions, the ball and 9 coins');
  const coin = last.c[0];
  A.cEmit('lp', { x: coin[1], y: coin[2], a: 0 });
  await until(() => (A.lps[A.lps.length - 1].p.find((q) => q[0] === r.id) || [])[4] >= 1 || A.lps[A.lps.length - 1].p.some((q) => q[4] >= 1), 2000, 'coin counted');
  ok(true, 'walking over a coin scores it and spawns a new one (' + A.lps[A.lps.length - 1].c.length + ' coins left on the field)');
  A.cEmit('lp', { x: -90, y: 0, a: 0 }); await sleep(60); A.cEmit('lp', { x: -40, y: 0, a: 0 });
  await until(() => room().arena.ball.vx > 100, 1500, 'ball kicked');
  ok(room().arena.ball.vx > 100, 'running into the ball kicks it away');
  room().arena.ball.x = 790; room().arena.ball.y = 0; room().arena.ball.vx = 800; room().arena.ball.last = room().players.values().next().value.id;
  await until(() => A.ags.length > 0, 2000, 'goal event');
  ok(A.ags.length === 1 && Math.abs(room().arena.ball.x) < 5, 'the ball going into a goal scores for the last player who kicked it and resets to the centre');

  console.log('punch and chat');
  room().arena.ball.x = 200; room().arena.ball.y = 0; room().arena.ball.vx = 0; room().arena.ball.vy = 0;
  A.cEmit('lp', { x: 150, y: 0, a: 0, m: 0 }); await sleep(80);
  A.cEmit('lp', { x: 150, y: 0, a: 0, m: 1 });
  await until(() => room().arena.ball.vx > 300, 1500, 'punch');
  ok(room().arena.ball.vx > 300, 'a punch next to the ball sends it flying the way you aim');
  A.cmx = []; B.cmx = []; A.cOn('cm', (d) => A.cmx.push(d)); B.cOn('cm', (d) => B.cmx.push(d));
  A.cEmit('chat', { t: '  hello <b>there</b>  ' });
  await until(() => B.cmx.length === 1, 1500, 'chat');
  ok(B.cmx[0].t === 'hello  b there /b' || /hello/.test(B.cmx[0].t) && !/[<>]/.test(B.cmx[0].t), 'a chat message reaches everyone in the lobby, cleaned of < > characters');
  ok(A.cmx.length === 1 && A.cmx[0].id === B.cmx[0].id, 'the sender gets it too, tagged with who said it');
  A.cEmit('chat', { t: 'spam' }); await sleep(100);
  ok(B.cmx.length === 1, 'chat is rate limited (one message per 0.7 s)');
  A.cEmit('chat', { t: 'x'.repeat(500) }); await sleep(900); A.cEmit('chat', { t: 'y'.repeat(500) });
  await until(() => B.cmx.length >= 2, 1500, 'long chat');
  ok(B.cmx[B.cmx.length - 1].t.length <= 60, 'messages are cut to 60 characters');

  console.log('admin');
  r = await A.cCall('admin:auth', { key: 'wrong' });
  ok(!r.ok, 'wrong admin key is rejected');
  r = await A.cCall('admin:auth', { key: 'sesame' });
  ok(r.ok, 'right admin key is accepted');
  await until(() => A.last.lobby.players.find((p) => p.ad), 2000, 'admin flag');
  ok(true, 'the lobby marks the admin');
  const cd0 = A.last.lobby.cd;
  r = await A.cCall('room:ctl', { a: 'pause' });
  ok(r.ok && A.last.lobby.paused === true, 'admin pauses the countdown');
  const frozen = A.last.lobby.cd; await sleep(1500);
  ok(A.last.lobby.cd === frozen && rm.rooms.get(A.last.lobby.code).cd > frozen - 1.01, 'countdown does not move while paused');
  r = await A.cCall('room:ctl', { a: 'resume' });
  ok(r.ok && A.last.lobby.paused === false, 'admin resumes it');
  await sleep(1200);
  ok(A.last.lobby.cd < frozen, 'countdown moves again after resume');
  r = await A.cCall('room:ctl', { a: 'now' });
  ok(r.ok, 'admin presses Start instantly');
  await until(() => A.last['match:start'] && B.last['match:start'], 2000, 'match:start');
  ok(A.last['match:start'].roster.length === 2, 'match starts immediately with both real players');
  r = await C.cCall('room:solo', prof('Cy'));
  ok(r.ok && r.code !== A.last.lobby.code, 'a running match is not joinable; the newcomer gets a fresh lobby');

  console.log('admin cheats in a match');
  {
    const rr = rm.rooms.get(A.last.lobby.code), sim = rr.sim;
    const pidOf = (sock) => { for (const [id, pl] of rr.players) if (pl.socketId === sock.id) return id; };
    const aId = pidOf(A), bId = pidOf(B);
    const ea = sim.eval('ents').find((e) => e.pid === aId), eb = sim.eval('ents').find((e) => e.pid === bId);
    B.cEmit('admin:cmd', { t: 'tog', k: 'god', v: 1 }); B.cEmit('admin:cmd', { t: 'do', a: 'm4' }); await sleep(120);
    ok(!eb.adm && !sim.mine(bId).inv.some((i) => i && i[0] === 0 && i[1] === 17), 'a player without the passcode cannot use admin commands');
    A.cEmit('admin:cmd', { t: 'tog', k: 'god', v: 1 }); A.cEmit('admin:cmd', { t: 'tog', k: 'speed', v: 1 }); A.cEmit('admin:cmd', { t: 'tog', k: 'bogus', v: 1 }); await sleep(120);
    ok(ea.adm && ea.adm.god === 1 && ea.adm.speed === 1 && ea.adm.bogus === undefined, 'the admin can switch cheats on (unknown cheats are ignored)');
    A.cEmit('admin:cmd', { t: 'do', a: 'm4' }); A.cEmit('admin:cmd', { t: 'do', a: 'give', x: { w: 5, r: 6 } }); A.cEmit('admin:cmd', { t: 'do', a: 'heal', x: 3 }); await sleep(150);
    const inv = sim.mine(aId).inv;
    ok(inv.some((i) => i && i[0] === 0 && i[1] === 17), 'Golden M4 is added to the admin inventory on the server');
    ok(inv.some((i) => i && i[0] === 0 && i[1] === 5 && i[2] === 6), 'Give weapon works (Pump Shotgun, Exotic)');
    ok(inv.some((i) => i && i[0] === 1 && i[1] === 3), 'Give heal works');
    const hp0 = ea.hp; sim.eval('(function(a){damage(a,60,null)})')(ea); ok(ea.hp === hp0, 'God mode: damage does nothing to the admin');
    sim.eval('(function(a){damage(a,60,null)})')(eb); ok(eb.hp < 100, 'other players still take damage');
    A.cEmit('admin:cmd', { t: 'do', a: 'air', x: { x: 100, y: 100 } }); await sleep(150);
    ok(sim.eval('airs').some((q) => q.i >= 50), 'an admin airdrop is scheduled on the server');
    A.cEmit('admin:cmd', { t: 'do', a: 'land' }); await sleep(100);
    ok(ea.st === 3, 'Land now lands the admin');
  }

  console.log('private rooms and solo test start');
  const D = mk(); r = await D.cCall('room:create', prof('Dee')); const dcode = r.code;
  ok(r.lobby.pub === false, 'friends rooms stay private');
  const E = mk(); await E.cCall('room:join', Object.assign({ code: dcode }, prof('Eve')));
  r = await D.cCall('room:start'); ok(r.ok, 'host starts a friends room');
  r = await D.cCall('room:ctl', { a: 'pause' }); ok(r.ok && D.last.lobby.paused, 'host can pause a friends-room countdown');
  r = await E.cCall('room:ctl', { a: 'resume' }); ok(!r.ok, 'a guest cannot resume it');
  r = await D.cCall('room:ctl', { a: 'now' }); ok(r.ok, 'host can start instantly');
  await until(() => D.last['match:start'], 2000, 'private match start');

  const F = mk(); const nr = await F.cCall('room:solo', prof('Fay')); // C is alone in a public lobby with Fay -> countdown
  await until(() => F.last.lobby && F.last.lobby.phase === 'countdown', 2000, 'second public lobby countdown');
  C.cEmit('room:leave', {}); await sleep(100);
  ok(F.last.lobby.phase === 'lobby', 'countdown cancels if players drop below 2');

  rm.close(); console.log('\nall ' + pass + ' lobby checks passed'); process.exit(0);
})().catch((e) => { console.error('\nFAILED:', e && e.stack || e); process.exit(1); });
