'use strict';
/* Minimal in-memory stand-in for a Socket.IO server, used by the tests only (the real one is `socket.io`). */
const { EventEmitter } = require('events');
let N = 0;
class FakeSocket {
  constructor(io) {
    this.io = io; this.id = 's' + (++N); this.data = {}; this.rooms = new Set();
    this.srv = new EventEmitter();      // handlers registered by the server
    this.cli = new EventEmitter();      // handlers registered by the (fake) client
    this.connected = true; this.log = [];
  }
  /* server side API */
  on(ev, fn) { this.srv.on(ev, fn); return this; }
  join(r) { this.rooms.add(r); }
  leave(r) { this.rooms.delete(r); }
  emit(ev, data) { if (this.connected) { this.log.push([ev, data]); this.cli.emit(ev, JSON.parse(JSON.stringify(data === undefined ? null : data))); } }
  /* client side API */
  cOn(ev, fn) { this.cli.on(ev, fn); return this; }
  cEmit(ev, data, ack) { return this.srv.emit(ev, data, ack); }
  cCall(ev, data) { return new Promise((res) => this.srv.emit(ev, data, res)); }
  disconnect() { if (!this.connected) return; this.connected = false; this.srv.emit('disconnect'); this.io.sockets.sockets.delete(this.id); }
}
class FakeIO extends EventEmitter {
  constructor() { super(); this.sockets = { sockets: new Map() }; }
  connect() { const s = new FakeSocket(this); this.sockets.sockets.set(s.id, s); this.emit('connection', s); return s; }
  to(room) { return { emit: (ev, d) => { for (const s of this.sockets.sockets.values()) if (s.rooms.has(room)) s.emit(ev, d); } }; }
}
module.exports = { FakeIO };
