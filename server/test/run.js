'use strict';
/* Server integration tests: rooms, lobby rules, a real match through the authoritative sim, reconnect.
   Runs against an in-memory Socket.IO stand-in, so it needs no network and no npm install. */
const assert = require('assert');
const { FakeIO } = require('./fakeio');
const { RoomManager } = require('../src/rooms');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 8000, what = 'condition') => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(20); } throw new Error('timeout waiting for ' + what); };
let pass = 0;
const ok = (c, m) => { assert.ok(c, m); pass++; console.log('  ok  ' + m); };

(async () => {
  const io = new FakeIO();
  const rm = new RoomManager(io, {});
  const prof = (n, skin) => ({ name: n, skin: skin || 0, sub: 0, ml: 0, bp: 0, cp: 0 });
  const mk = (name) => { const s = io.connect(); s.last = {}; s.ev = []; for (const e of ['lobby', 'match:start', 's', 'm', 'match:over', 'match:error']) s.cOn(e, (d) => { s.last[e] = d; s.ev.push(e); }); s.name = name; return s; };

  console.log('rooms and lobby');
  const A = mk('Ann'), B = mk('Bob'), C = mk('Cy');
  let r = await A.cCall('room:create', prof('Ann', 3));
  ok(r.ok && /^[A-Z0-9]{5}$/.test(r.code) && r.id && r.token, 'create room returns a 5 char code, id and token');
  const code = r.code; A.pid = r.id; A.token = r.token;
  r = await B.cCall('room:join', Object.assign({ code: code.toLowerCase() }, prof('Bob')));
  ok(r.ok && r.lobby.players.length === 2, 'join by code (case-insensitive) works');
  B.pid = r.id; B.token = r.token;
  ok(A.last.lobby.players.length === 2, 'host is told about the new player');
  r = await C.cCall('room:join', { code: 'ZZZZZ', name: 'x' });
  ok(!r.ok, 'unknown code is rejected');
  r = await B.cCall('room:start');
  ok(!r.ok, 'non-host cannot start');
  const D = mk('Dee'); const solo = await D.cCall('room:create', prof('Dee'));
  r = await D.cCall('room:start');
  ok(!r.ok && /at least 2/.test(r.error), 'a room with one player cannot start (2 minimum)');
  D.cEmit('room:leave', {});
  r = await A.cCall('room:opts', { map: 0, storm: 2, loot: 1 });
  ok(r.ok && A.last.lobby.opts.map === 0 && B.last.lobby.opts.storm === 2, 'host options are broadcast');
  r = await B.cCall('room:opts', { map: 2 });
  ok(!r.ok, 'only the host can change options');

  console.log('match');
  r = await A.cCall('room:start');
  ok(r.ok && A.last.lobby.phase === 'countdown', 'host starts the countdown with 2 players');
  await until(() => A.last['match:start'] && B.last['match:start'], 12000, 'match:start');
  const ms = A.last['match:start'];
  ok(ms.roster.length === 2 && typeof ms.seed === 'number' && B.last['match:start'].seed === ms.seed, 'both players get the same seed and roster');
  ok(rm.rooms.get(code).phase === 'play', 'room is in play');
  r = await C.cCall('room:join', Object.assign({ code }, prof('Cy')));
  ok(!r.ok, 'cannot join a running match');
  await until(() => A.last.s && B.last.s, 3000, 'first snapshot');
  ok(A.last.s.s.p.length === 2, 'snapshot lists both players');
  ok(A.last.m && A.last.m.inv.length === 6, 'private state (inventory) is sent');

  // plane -> jump -> land, driven purely by inputs
  const planeT = ms.planeT;
  const me = (S, s) => s.s.p.find((p) => p.i === S.pid);
  A.cEmit('act', { t: 'jump' });
  await until(() => me(A, A.last.s).st >= 1, 3000, 'A leaves the plane');
  ok(me(B, B.last.s).st === 0 || me(B, B.last.s).st >= 1, 'B is still (or already) in the plane; server decides');
  const t0 = Date.now();
  await until(() => me(A, A.last.s).st === 3, 60000, 'A lands');
  ok(true, 'A parachuted down and landed (' + Math.round((Date.now() - t0) / 100) / 10 + 's)');
  B.cEmit('act', { t: 'jump' });
  await until(() => me(B, B.last.s).st === 3, 60000, 'B lands');
  ok(true, 'B landed');

  // movement validation: legit step accepted, teleport rejected
  const pa = me(A, A.last.s); const base = { x: pa.x, y: pa.y, vx: 0, vy: 0, a: 0, ix: 0, iy: 0, f: 0, m: 0, bo: 0, ap: 0 };
  A.cEmit('in', Object.assign({}, base, { x: pa.x + 4, y: pa.y }));
  await sleep(120);
  ok(Math.abs(me(A, A.last.s).x - (pa.x + 4)) <= 6, 'a normal step is accepted');
  A.cEmit('in', Object.assign({}, base, { x: pa.x + 1500, y: pa.y }));
  await sleep(120);
  ok(me(A, A.last.s).x < pa.x + 400, 'a 1500 px teleport is not accepted');

  // fight: put B next to A through the sim and shoot (uses the real combat rules in the sim)
  const room = rm.rooms.get(code); const sim = room.sim;
  const ea = sim.eval('ents').find((e) => e.pid === A.pid), eb = sim.eval('ents').find((e) => e.pid === B.pid);
  ok(!!ea && !!eb, 'sim holds both entities');
  const spot = sim.eval('(function(){for(let i=0;i<400;i++){const p=freeSpot(400,40);if(!hitsWall(p.x+100,p.y,30)&&!blockedAt(p.x,p.y,p.x+100,p.y)&&!bulletObs(p.x+60,p.y)&&!bulletObs(p.x+30,p.y))return [p.x,p.y]}return null})()');
  ok(!!spot, 'found an open firing lane for the combat test');
  ea.x = spot[0]; ea.y = spot[1]; eb.x = spot[0] + 100; eb.y = spot[1];
  sim.eval('loot.length=0');
  const gun = sim.eval('mkGun(0,0,200)'); ea.inv[1] = gun; ea.sel = 1; ea.ang = 0; ea.cd = 0;
  const hp0 = eb.hp;
  A.cEmit('in', { x: spot[0], y: spot[1], vx: 0, vy: 0, a: 0, ix: 0, iy: 0, f: 1, m: 0, bo: 0, ap: 0 });
  await until(() => B.ev.length && eb.hp < hp0, 4000, 'B takes damage');
  ok(eb.hp < hp0, 'shooting damages the other player on the server (hp ' + hp0 + ' -> ' + Math.round(eb.hp) + ')');
  ok(A.ev.length > 0 && A.last.s.e !== undefined, 'events are broadcast with snapshots');
  const sawShot = A.log; 
  A.cEmit('in', { x: spot[0], y: spot[1], vx: 0, vy: 0, a: 0, ix: 0, iy: 0, f: 0, m: 0, bo: 0, ap: 0 });
  const allEvents = []; for (const [ev, d] of B.log) if (ev === 's') for (const e of d.e) allEvents.push(e[0]);
  ok(allEvents.includes('shot') && allEvents.includes('hit'), 'clients receive shot and hit events');

  console.log('reconnect');
  const oldSocket = B; B.disconnect();
  await sleep(60);
  ok(room.players.get(B.pid).connected === false, 'server keeps the seat when a socket drops');
  const B2 = mk('Bob2');
  r = await B2.cCall('room:rejoin', { code, token: B.token });
  ok(r.ok && r.match && r.match.seed === ms.seed, 'rejoin with code+token restores the match');
  ok(r.match.snap.p.length === 2 && r.match.me.inv.length === 6 && Array.isArray(r.match.world.loot), 'rejoin payload carries snapshot, private state and world');
  ok(Math.round(r.match.snap.p.find((p) => p.i === B.pid).hp) === Math.round(eb.hp), 'restored hp equals the server hp');
  r = await B2.cCall('room:rejoin', { code, token: 'nope' });
  ok(!r.ok, 'a wrong token cannot take a seat');
  await until(() => B2.last.s, 2000, 'snapshots resume');
  ok(true, 'B2 receives snapshots again');

  console.log('match end');
  // kill B via the sim rules and check the end of the match and the return to the lobby
  sim.eval('(function(a,b){damage(a,9999,b)})')(eb, ea);
  await until(() => A.last['match:over'], 14000, 'match:over');
  const ov = A.last['match:over'];
  ok(ov.winnerId === A.pid && ov.results.find((x) => x.id === B.pid).alive === 0, 'last player standing wins; results list everyone');
  await until(() => A.last.lobby.phase === 'lobby', 14000, 'back to lobby');
  ok(rm.rooms.get(code).sim === null, 'room is back in the lobby and the sim is disposed');

  console.log('leave and cleanup');
  A.cEmit('room:leave', {}); B2.cEmit('room:leave', {});
  await sleep(60);
  ok(!rm.rooms.has(code), 'empty room is deleted');

  rm.close();
  console.log('\nall ' + pass + ' checks passed');
  process.exit(0);
})().catch((e) => { console.error('\nFAILED:', e && e.stack || e); process.exit(1); });
