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
  const vis = (P, id) => P.page.evaluate((i) => { const e = document.getElementById(i); const r = e && e.getBoundingClientRect(); return !!e && !e.hidden && r.width > 0 && r.height > 0 && getComputedStyle(e).display !== 'none'; }, id);
  console.log('home page');
  const label = await A.page.evaluate(() => [...document.querySelectorAll('#view button.go.big')].map((b) => b.textContent));
  ok(label.length === 1 && label[0] === 'SOLO', 'home page has one big SOLO button');
  await A.page.click('#view button.go.big');
  await waitFor(A, () => !document.getElementById('lobby').hidden, 8000, 'A in lobby');
  ok(true, 'clicking SOLO opens the lobby');
  ok(!(await vis(A, 'roomCode')) && !(await vis(A, 'slots')), 'the public lobby shows no room code and no big player grid (you are on the field instead)');
  ok(!(await vis(A, 'lobbyCtl')) && (await vis(A, 'lobbyAdmin')), 'normal player sees no pause / start buttons, only Admin login');
  await B.page.click('#view button.go.big');
  await waitFor(B, () => !document.getElementById('lobby').hidden, 8000, 'B in lobby');
  await waitFor(A, () => /Starting in/.test(document.getElementById('cdown').textContent), 5000, 'auto countdown');
  ok(true, 'countdown starts on its own when the second real player arrives');

  console.log('waiting island');
  await waitFor(A, () => state === 'arena' && ents.length === 2, 5000, 'A arena');
  await waitFor(B, () => state === 'arena' && ents.length === 2, 5000, 'B arena');
  ok(true, 'both players stand on the waiting island and see each other');
  ok(await A.ev('circs.length===0&&houses.length===0&&loot.length===0&&arenaCoins.length>0'), 'the waiting field is an empty rectangle with coins, no obstacles, buildings or loot');
  await waitFor(B, () => { const r = [...remotes.values()][0]; return r && !r.pend; }, 4000, 'remote placed');
  await sleep(300);
  const b0 = await B.ev('(()=>{const r=[...remotes.values()][0];return {x:r.x,y:r.y}})()');
  const a0 = await A.ev('({x:player.x,y:player.y})');
  await A.page.keyboard.down('KeyD'); await sleep(900); await A.page.keyboard.up('KeyD'); await sleep(500);
  const a1 = await A.ev('({x:player.x,y:player.y})');
  const b1 = await B.ev('(()=>{const r=[...remotes.values()][0];return {x:r.x,y:r.y}})()');
  ok(a1.x - a0.x > 60 || Math.abs(a1.x - a0.x) > 60, 'moving with the keys walks the player around the island (' + Math.round(a1.x - a0.x) + ' px)');
  ok(Math.abs(b1.x - b0.x) > 40 && Math.abs((b1.x - b0.x) - (a1.x - a0.x)) < 60, 'the other player sees that movement (' + Math.round(b1.x - b0.x) + ' px)');
  await A.page.screenshot({ path: process.env.SHOT_DIR ? process.env.SHOT_DIR + '/arena.png' : '/dev/null' });
  console.log('chat and punch in the browser');
  await A.page.keyboard.press('Enter');
  await waitFor(A, () => !document.getElementById('chatIn').hidden && document.activeElement.id === 'chatIn', 2000, 'chat box');
  ok(true, 'Enter opens the chat box');
  await A.page.keyboard.type('hi there');
  await A.page.keyboard.press('Enter');
  await waitFor(A, () => player.chat && player.chat.t === 'hi there', 3000, 'own bubble');
  await waitFor(B, () => [...remotes.values()][0].chat && [...remotes.values()][0].chat.t === 'hi there', 3000, 'bubble on B');
  ok(await A.page.evaluate(() => document.getElementById('chatIn').hidden), 'sending closes the chat box and the message floats over the character on both screens');
  if (process.env.SHOT_DIR) await A.page.screenshot({ path: process.env.SHOT_DIR + '/arena2.png' });
  const mc0 = await A.ev('player.mc');
  await A.page.mouse.click(550, 450);
  await sleep(300);
  ok((await A.ev('player.mc')) > mc0, 'left click throws a punch in the lobby');
  await waitFor(B, () => [...remotes.values()][0].mcSeen >= 1, 3000, 'punch seen by B');
  ok(true, 'the other player sees the punch');
  console.log('admin controls');
  await A.page.evaluate(() => { window.prompt = () => 'sesame'; });
  await A.page.click('#lobbyAdmin');
  await waitFor(A, () => !document.getElementById('lobbyCtl').hidden, 5000, 'admin buttons');
  ok(!(await vis(A, 'lobbyAdmin')), 'admin login unlocks Pause countdown and Start instantly');
  ok(!(await vis(B, 'lobbyCtl')), 'the other player still has no controls');
  await A.page.click('#lobbyPause');
  await waitFor(A, () => /Paused at/.test(document.getElementById('cdown').textContent), 3000, 'paused text');
  await waitFor(B, () => /Paused at/.test(document.getElementById('cdown').textContent), 3000, 'B sees pause');
  ok(true, 'pausing freezes the countdown for everyone');
  ok((await A.page.textContent('#lobbyPause')) === 'Resume countdown', 'button turns into Resume countdown');
  await A.page.click('#lobbyPause');
  await waitFor(A, () => /Starting in/.test(document.getElementById('cdown').textContent), 3000, 'resumed');
  ok(true, 'resume restarts the countdown');
  await A.page.click('#lobbyNow');
  await waitFor(A, () => typeof NETMODE !== 'undefined' && NETMODE === 'client' && playing, 15000, 'A in match');
  await waitFor(B, () => typeof NETMODE !== 'undefined' && NETMODE === 'client' && playing, 15000, 'B in match');
  ok(true, 'Start instantly drops both players into the match right away');
  ok(errors.filter((e) => !/ERR_TUNNEL|404/.test(e)).length === 0, 'no page errors');
  await browser.close(); rm.close(); srv.close();
  console.log('\nall ' + pass + ' solo-lobby browser checks passed'); process.exit(0);
})().catch((e) => { console.error('\nFAILED:', e && e.stack || e); process.exit(1); });
