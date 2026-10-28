'use strict';
/* End-to-end browser test: two real Chromium pages running client/index.html play against the real RoomManager and
   authoritative sim. Only the Socket.IO transport is replaced by an in-memory bridge (the socket.io packages can't be
   installed in the sandbox this was built in). Needs playwright-core:  PLAYWRIGHT_PATH=/path/to/playwright-core node test/browser.js */
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright-core');
const { FakeIO } = require('./fakeio');
const { RoomManager } = require('../src/rooms');

const CLIENT = path.join(__dirname, '..', '..', 'client');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0; const ok = (c, m) => { assert.ok(c, m); pass++; console.log('  ok  ' + m); };

const FAKE_IO = `
(function(){
  window.__acks={};window.__aid=0;
  window.io=function(a,b){
    const opts=(typeof a==='object'&&a)?a:(b||{});window.__ioOpts=opts;
    const H={};
    const sock={connected:false,id:'',
      on(ev,fn){(H[ev]=H[ev]||[]).push(fn);return sock},
      emit(ev,data,ack){if(!sock.connected)return;let aid=0;if(typeof ack==='function'){aid=++window.__aid;window.__acks[aid]=ack}window.__bridge(ev,data===undefined?null:data,aid)},
      disconnect(){}};
    sock.volatile={emit:(...x)=>sock.emit(...x)};
    window.__deliver=function(ev,d){
      if(ev==='__ack'){const f=window.__acks[d.aid];delete window.__acks[d.aid];if(f)f(d.r);return}
      if(ev==='connect')sock.connected=true;
      if(ev==='disconnect')sock.connected=false;
      (H[ev]||[]).forEach(f=>f(d));
    };
    setTimeout(()=>window.__bridge('__connect',null,0),30);
    return sock;
  };
})();`;

(async () => {
  // static server for client/
  const srv = http.createServer((req, res) => {
    let p = req.url.split('?')[0]; if (p === '/') p = '/index.html';
    const f = path.join(CLIENT, p);
    if (!f.startsWith(CLIENT) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(fs.readFileSync(f));
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + srv.address().port + '/';

  const io = new FakeIO();
  const rm = new RoomManager(io, { adminKey: 'sesame' });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errors = [];

  async function player(name) {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 700 } });
    const page = await ctx.newPage();
    const P = { name, page, fs: null, chain: Promise.resolve(), up: true };
    page.on('pageerror', (e) => errors.push(name + ': ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(name + ' console: ' + m.text()); });
    const push = (ev, d) => { P.chain = P.chain.then(() => page.evaluate(([e, x]) => window.__deliver && window.__deliver(e, x), [ev, d]).catch(() => {})); };
    P.attach = () => {
      const s = io.connect(); P.fs = s;
      const orig = s.cli.emit.bind(s.cli);
      s.cli.emit = (ev, d) => { if (P.fs === s && P.up) push(ev, d); return true; };
      push('connect', null);
    };
    await page.exposeFunction('__bridge', (ev, data, aid) => {
      if (ev === '__connect') { if (P.up) P.attach(); return; }
      if (!P.fs || !P.up) return;
      P.fs.srv.emit(ev, data, aid ? (r) => push('__ack', { aid, r: JSON.parse(JSON.stringify(r)) }) : undefined);
    });
    await page.addInitScript(FAKE_IO);
    P.drop = () => { P.up = false; const s = P.fs; s.disconnect(); P.chain = P.chain.then(() => page.evaluate(() => window.__deliver('disconnect', null))); return P.chain; };
    P.restore = () => { P.up = true; P.attach(); return P.chain; };
    P.ev = (code) => page.evaluate(code);
    P.goto = async () => { await page.goto(url); await page.waitForFunction(() => typeof state !== 'undefined' && !document.getElementById('hub').hidden, null, { timeout: 15000 }); };
    return P;
  }
  const waitFor = async (P, expr, ms = 20000, what = expr) => { try { await P.page.waitForFunction(expr, null, { timeout: ms, polling: 50 }); } catch (e) { throw new Error('[' + P.name + '] timeout waiting for: ' + what); } };

  const A = await player('Ann'), B = await player('Bob');
  await A.goto(); await B.goto();
  console.log('client boots');
  console.log(errors); ok(true, 'both pages load client/index.html');
  ok(await A.ev('typeof io') === 'function' && await A.ev('typeof startOnline') === 'function', 'online layer is linked into the game');

  console.log('room flow in the UI');
  await A.page.evaluate(() => { P.name = 'Ann'; startOnline(); });
  await waitFor(A, () => !document.getElementById('online').hidden, 5000, 'online overlay');
  await waitFor(A, () => /Connected/.test(document.getElementById('onStatus').textContent), 5000, 'connected status');
  ok(true, 'online overlay opens and reports Connected');
  ok(await A.ev('window.__ioOpts.reconnection') === true && JSON.stringify(await A.ev('window.__ioOpts.transports')) === '["polling","websocket"]', "client asks for transports ['polling','websocket'] and reconnection:true");
  await A.page.click('#onCreate');
  await waitFor(A, () => !document.getElementById('lobby').hidden && document.getElementById('roomCode').textContent.length === 5, 5000, 'lobby with a room code');
  const code = await A.ev("document.getElementById('roomCode').textContent");
  ok(/^[A-Z0-9]{5}$/.test(code), 'creating a room shows a 5 character code (' + code + ')');
  ok(await A.page.isDisabled('#lobbyStart'), 'host cannot start alone (button disabled)');

  await B.page.evaluate(() => { P.name = 'Bob'; startOnline(); });
  await waitFor(B, () => /Connected/.test(document.getElementById('onStatus').textContent), 5000, 'B connected');
  await B.page.fill('#onCode', 'ab');
  await B.page.click('#onJoin');
  ok(/5 letters/.test(await B.ev("document.getElementById('onErr').textContent")), 'short code is rejected in the UI');
  await B.page.fill('#onCode', 'ZZZZZ'); await B.page.click('#onJoin');
  await waitFor(B, () => /No room/.test(document.getElementById('onErr').textContent), 4000, 'no room error');
  ok(true, 'unknown code shows an error');
  await B.page.fill('#onCode', code); await B.page.click('#onJoin');
  await waitFor(B, () => !document.getElementById('lobby').hidden, 5000, 'B in lobby');
  await waitFor(A, () => document.querySelectorAll('#slots .slot:not(.open)').length === 2, 5000, 'A sees 2 players');
  await waitFor(B, () => document.querySelectorAll('#slots .slot:not(.open)').length === 2, 5000, 'B sees 2 players');
  ok(true, 'both lobbies list 2 players');
  ok(await B.page.isHidden('#lobbyStart') && await B.page.isHidden('#hostOpts'), 'non-host has no Start button or host options');
  await waitFor(A, () => !document.getElementById('lobbyStart').disabled, 3000, 'start enabled');
  await A.page.selectOption('#hostOpts select[data-k=map]', '0');
  await waitFor(B, () => /Small map/.test(document.getElementById('lobbyInfo').textContent), 3000, 'B sees map option');
  ok(true, 'host options reach the other player');
  await A.page.screenshot({ path: path.join(__dirname, 'shot-lobby.png') });

  console.log('match');
  await A.page.click('#lobbyStart');
  await waitFor(A, () => /Starting in/.test(document.getElementById('cdown').textContent), 3000, 'countdown');
  ok(true, 'countdown starts for the host');
  await waitFor(B, () => state === 'play' && playing === true, 15000, 'match starts for B');
  await waitFor(A, () => state === 'play' && playing === true, 15000, 'match starts for A');
  ok(await A.ev("NETMODE==='client' && mp===true && ents.length===2 && remotes.size===1"), 'client is in server-authoritative mode with 2 players');
  const room = rm.rooms.get(code), sim = room.sim;
  const w = sim.world();
  const cw = await A.ev('({loot:loot.length,crates:crates.length,doors:doors.length,circs:circs.length,island:ISLAND})');
  ok(cw.loot === w.loot.length && cw.crates === w.crates.length, 'client world (loot ' + cw.loot + ', crates ' + cw.crates + ') matches the server world from the same seed');
  ok(cw.circs === sim.eval('circs.length') && cw.doors === sim.eval('doors.length') && cw.island === sim.eval('ISLAND'), 'trees/rocks, doors and map size match the server');
  ok(await A.ev("player.pid && player.pid!==[...remotes.values()][0].pid"), 'each player has their own id and sees the other as remote');
  ok(await A.ev("player.inv.every((x,i)=>i===0?x&&x.type==='melee':x===null)"), 'inventory starts as server says (empty hands + melee)');

  // plane then jump: input -> server -> state back
  await A.page.click('canvas', { position: { x: 500, y: 300 } }).catch(() => {});
  await A.page.keyboard.press('Space');
  await waitFor(A, () => player.st >= 1, 8000, 'A leaves plane (server decided)');
  ok(true, "pressing Space asks the server to jump and the server's answer moves A out of the plane");
  await waitFor(B, () => [...remotes.values()][0].st >= 1, 5000, 'B sees A in the air');
  ok(true, 'B sees A parachuting (broadcast snapshot)');
  await B.page.click('canvas', { position: { x: 500, y: 300 } }).catch(() => {});
  await B.page.keyboard.press('Space');
  await waitFor(A, () => player.st === 3, 60000, 'A lands');
  await waitFor(B, () => player.st === 3, 60000, 'B lands');
  ok(true, 'both players landed (air phase is simulated on the server)');

  // local movement is predicted, the server accepts it
  const pa = await A.ev('({x:player.x,y:player.y})');
  await A.page.keyboard.down('KeyD'); await sleep(700); await A.page.keyboard.up('KeyD');
  await sleep(250);
  let mv = await A.ev('({x:player.x,y:player.y})');
  if (Math.abs(mv.x - pa.x) <= 40) {            // random landing spot can sit against a wall: try the other way
    await A.page.keyboard.down('KeyA'); await sleep(900); await A.page.keyboard.up('KeyA'); await sleep(250);
    mv = await A.ev('({x:player.x,y:player.y})');
  }
  const aPid = await A.ev('player.pid');
  const srvA = sim.eval('ents').find((e) => e.pid === aPid);
  ok(Math.abs(mv.x - pa.x) > 40, 'holding a move key moves the local player (' + Math.round(Math.abs(mv.x - pa.x)) + ' px)');
  ok(Math.hypot(srvA.x - mv.x, srvA.y - mv.y) < 40, 'server position follows the client (diff ' + Math.round(Math.hypot(srvA.x - mv.x, srvA.y - mv.y)) + ' px)');

  // server gives A a gun: it must show up in the client inventory (client never invents loot)
  const bPid = await B.ev('player.pid');
  const srvB = sim.eval('ents').find((e) => e.pid === bPid);
  const spot = sim.eval('(function(){for(let i=0;i<400;i++){const p=freeSpot(400,40);if(!hitsWall(p.x+120,p.y,30)&&!blockedAt(p.x,p.y,p.x+120,p.y)&&!bulletObs(p.x+60,p.y)&&!bulletObs(p.x+30,p.y))return [p.x,p.y]}return null})()');
  srvA.x = spot[0]; srvA.y = spot[1]; srvB.x = spot[0] + 120; srvB.y = spot[1]; srvA.corr = true; srvB.corr = true;
  // (artificial teleport for the test: put the client copies there too, as a server correction would)
  await Promise.all([A.page.evaluate(([x, y]) => { player.x = x; player.y = y; }, spot), B.page.evaluate(([x, y]) => { player.x = x + 120; player.y = y; }, spot)]);
  srvA.inv[1] = sim.eval('mkGun(0,0,200)'); srvA.sel = 1; srvA.ang = 0;
  await waitFor(A, () => player.inv[1] && player.inv[1].type === 'gun' && player.sel === 1, 4000, 'A inventory from server');
  ok(true, 'inventory change made on the server appears on the client');
  await waitFor(A, () => Math.hypot(cam.x - player.x, cam.y - player.y) < 3 && Math.hypot(remotes.values().next().value.x - remotes.values().next().value.tx, 0) < 3, 6000, 'camera settled');
  // aim at B and hold fire with the real mouse
  const geo = await A.ev('({ax:player.x,ay:player.y,z:curZoom(),cx:cam.x,cy:cam.y,W:W,H:H,bx:remotes.values().next().value.x,by:remotes.values().next().value.y})');
  const sx = geo.W / 2 + (geo.bx - geo.cx) * geo.z, sy = geo.H / 2 + (geo.by - geo.cy) * geo.z;
  const hp0 = srvB.hp;
  await A.page.mouse.move(sx, sy); await A.page.mouse.down();
  await waitFor(A, () => SESS.shots > 0 && bullets.length >= 0, 4000, 'A shot event');
  await sleep(500); await A.page.mouse.up();
  ok(srvB.hp < hp0, 'holding fire: the SERVER applied damage to B (' + hp0 + ' -> ' + Math.round(srvB.hp) + ')');
  await waitFor(B, () => player.hp < 100, 3000, 'B hp from snapshot');
  ok(true, "B's client shows the reduced health sent by the server (" + (await B.ev('Math.round(player.hp)')) + ')');
  ok(await A.ev('SESS.hits>0 && SESS.shots>0'), "A's client registered shots and hits from server events");
  await A.page.screenshot({ path: path.join(__dirname, 'shot-match.png') });

  console.log('reconnect');
  const hpBefore = Math.round(srvB.hp);
  await B.drop();
  await waitFor(B, () => !document.getElementById('netbar').hidden, 3000, 'netbar');
  ok(true, 'connection loss shows the reconnecting banner');
  ok(room.players.get(bPid).connected === false, 'server keeps the seat');
  srvB.hp -= 7; // the world moves on while B is away
  await B.restore();
  await waitFor(B, () => document.getElementById('netbar').hidden && playing === true, 6000, 'B restored');
  await sleep(400);
  ok(await B.ev('state==="play" && NETMODE==="client" && ents.length===2'), 'after reconnect B is back in the running match');
  ok(Math.abs((await B.ev('player.hp')) - Math.ceil(srvB.hp)) <= 1, 'restored health matches the server (' + (await B.ev('Math.round(player.hp)')) + ')');
  // full page reload also restores
  await B.page.reload();
  await waitFor(B, () => typeof state !== 'undefined' && state === 'play' && playing === true && ents.length === 2, 10000, 'B restored after reload');
  ok(true, 'reloading the page rejoins the same room and match (session stored in the browser)');
  ok(Math.abs((await B.ev('player.hp')) - Math.ceil(srvB.hp)) <= 1 && await B.ev('player.pid') === bPid, 'same player, same health after reload');

  console.log('admin panel online');
  {
    ok(!(await A.ev('admAuthed()')), 'online: the admin panel starts locked');
    const bad = await A.ev("adminPass('wrong-pass').then(r => r.ok)");
    ok(bad === false, 'online: a wrong passcode is refused by the server');
    const good = await A.ev("adminPass('sesame').then(r => r.ok)");
    ok(good === true && await A.ev('admAuthed()'), 'online: the right passcode unlocks it');
    await A.ev("(function(){ADM.god=1;admPush('god');ADM.speed=1;admPush('speed');admRun('m4');admRun('give',{w:5,r:6})})()");
    await sleep(400);
    const eA = sim.eval('ents').find((e) => e.pid === aPid);
    ok(eA.adm && eA.adm.god === 1 && eA.adm.speed === 1, 'online: cheat switches reach the server');
    await waitFor(A, () => player.inv.some((i) => i && i.type === 'gun' && i.w === GOLDM4) && player.inv.some((i) => i && i.type === 'gun' && i.w === 5), 4000, 'items arrive');
    ok(true, 'online: Golden M4 and a given weapon show up in the admin inventory');
    await A.ev("(function(){ADM.god=0;admPush('god');ADM.speed=0;admPush('speed')})()");
    ok(!(await B.ev('admAuthed()')), 'online: the other player stays locked');
  }

  console.log('match end');
  sim.eval('(function(a,b){damage(a,9999,b)})')(srvB, srvA);
  await waitFor(B, () => player.alive === false, 4000, 'B dead on client');
  ok(true, 'B sees elimination decided by the server');
  await waitFor(A, () => !document.getElementById('end').hidden, 15000, 'A end card');
  ok(/Victory/.test(await A.ev("document.getElementById('endTitle').textContent")), 'winner sees the result card');
  await waitFor(B, () => !document.getElementById('end').hidden, 15000, 'B end card');
  ok(true, 'loser sees the result card');
  await waitFor(A, () => !document.getElementById('lobby').hidden && !playing, 20000, 'back to lobby');
  await waitFor(B, () => !document.getElementById('lobby').hidden && !playing, 20000, 'B back to lobby');
  ok(true, 'both return to the room lobby after the results');
  await A.page.click('#lobbyLeave');
  await waitFor(A, () => !document.getElementById('hub').hidden, 3000, 'A at hub');
  await B.page.click('#lobbyLeave');
  await sleep(100);
  ok(!rm.rooms.has(code), 'leaving empties and removes the room');

  const real = errors.filter((e) => !/favicon|ERR_FILE_NOT_FOUND|Failed to load resource/.test(e));
  ok(real.length === 0, 'no page errors (' + (real[0] || 'none') + ')');
  await browser.close(); srv.close(); rm.close();
  console.log('\nall ' + pass + ' browser checks passed');
  process.exit(0);
})().catch((e) => { console.error('\nFAILED:', e && e.stack || e); process.exit(1); });
