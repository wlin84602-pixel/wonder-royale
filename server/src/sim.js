'use strict';
/* Headless host for the original game rules.
   The game's own code (server/game/sim-core.js: world generation, collisions, weapons, damage, loot, crates,
   doors, storm...) is loaded into an isolated vm context with a do-nothing stand-in for the browser APIs,
   so the server uses exactly the same rules the client uses to draw the world. One context per running match. */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const CORE_PATH = path.join(__dirname, '..', 'game', 'sim-core.js');
let script = null;
function getScript() {
  if (!script) script = new vm.Script(fs.readFileSync(CORE_PATH, 'utf8'), { filename: 'sim-core.js' });
  return script;
}

/* A stand-in for document/canvas/etc. Every property is another stand-in, every call returns one. */
function stub() {
  const fn = function () {};
  return new Proxy(fn, {
    get(_t, k) {
      if (k === Symbol.toPrimitive) return () => 0;
      if (k === 'length') return 0;
      if (k === 'then') return undefined;
      if (k === 'getPropertyValue') return () => '#000';
      return stub();
    },
    set() { return true; },
    apply() { return stub(); },
    construct() { return stub(); },
    has() { return true; }
  });
}

function makeSandbox() {
  const sb = {
    console: { log() {}, warn() {}, error: console.error.bind(console) },
    Math, Date, JSON, Object, Array, Number, String, Boolean, Set, Map, WeakMap, Symbol, Error,
    parseInt, parseFloat, isFinite, isNaN, setTimeout, clearTimeout, setInterval, clearInterval,
    Uint8Array, Uint8ClampedArray, Float32Array, Int32Array,
    performance: { now: () => Date.now() },
    document: stub(), navigator: { userAgent: 'node' },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    getComputedStyle: () => ({ getPropertyValue: () => '#000' }),
    requestAnimationFrame() {}, Image: function () { return {}; },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    screen: {}, location: { href: '', search: '' }, history: {},
    __NET: 'server'
  };
  sb.window = new Proxy({ innerWidth: 1000, innerHeight: 700, devicePixelRatio: 1, addEventListener() {}, removeEventListener() {} }, {
    get(t, k) { return k in t ? t[k] : (k in sb ? sb[k] : stub()); },
    set(t, k, v) { t[k] = v; return true; }
  });
  return sb;
}

const plain = (o) => JSON.parse(JSON.stringify(o));   // bring objects out of the vm realm

class Sim {
  constructor() {
    this.ctx = vm.createContext(makeSandbox());
    getScript().runInContext(this.ctx);
    this.srv = vm.runInContext('SRV', this.ctx);
    this.limits = plain(vm.runInContext('({melees:MELEES.length,packs:PACKS.length,paras:PARAS.length,skins:100,emotes:EMOTES.length})', this.ctx));
  }
  /* cfg = [map,storm,loot,minP,cd,crate,gold,rarity,startGun,healSpd] */
  init(seed, cfg, players) { this.srv.init(seed, cfg, players); this.cfg = cfg; }
  input(pid, d, now) { this.srv.input(pid, d, now); }
  act(pid, t, v) { this.srv.act(pid, t, v); }
  tick(dt) { this.srv.tick(dt); }
  snapshot() { return plain(this.srv.snapshot()); }
  clearCorr() { this.srv.clearCorr(); }
  mine(pid) { return plain(this.srv.mine(pid)); }
  world() { return plain(this.srv.world()); }
  flush() { return plain(this.srv.flush()); }
  aliveCount() { return this.srv.aliveCount(); }
  results() { return plain(this.srv.results()); }
  dropPlayer(pid) { this.srv.drop(pid); }
  roundLen(cfg) { return this.srv.roundLen(cfg); }
  planeT() { return this.srv.planeT(); }
  /* test/debug helper: evaluate an expression inside the simulation sandbox */
  eval(code) { return vm.runInContext(code, this.ctx); }
  dispose() { this.ctx = null; this.srv = null; }
}

module.exports = { Sim };
