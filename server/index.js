'use strict';
/* Wonder Royale online server: Express (health + static client) + Socket.IO (rooms, authoritative match). */
const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { RoomManager } = require('./src/rooms');
const { Sim } = require('./src/sim');

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';                                   // Railway needs the app bound to all interfaces
const FRONTEND_URL = (process.env.FRONTEND_URL || '').trim();   // e.g. https://my-game.netlify.app  (comma-separated list allowed)

/* CORS: only the origin(s) named in FRONTEND_URL; '*' when it is not set (local development).
   (When the client is served by this same server, requests are same-origin and CORS does not apply.) */
const allowed = FRONTEND_URL ? FRONTEND_URL.split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean) : [];
const corsOrigin = allowed.length ? allowed : '*';

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {                              // CORS for the plain HTTP routes too
  const origin = req.headers.origin;
  if (corsOrigin === '*') res.setHeader('Access-Control-Allow-Origin', '*');
  else if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin');
  }
  next();
});
app.get('/health', (_req, res) => res.status(200).json({ ok: true, uptime: Math.round(process.uptime()) }));

/* The client is a static site. If it sits next to the server (monorepo deploy) we serve it here as well. */
const clientDir = [path.join(__dirname, '..', 'client'), path.join(__dirname, 'client')].find((d) => fs.existsSync(path.join(d, 'index.html')));
if (clientDir) {
  // html/js/css are always revalidated (ETag), so a new deploy shows up on the next normal refresh
  app.use(express.static(clientDir, {
    extensions: ['html'],
    setHeaders: (res, file) => { res.setHeader('Cache-Control', /\.(html|js|css)$/.test(file) ? 'no-cache' : 'public, max-age=3600'); }
  }));
  app.get('/', (_req, res) => res.sendFile(path.join(clientDir, 'index.html')));
} else {
  app.get('/', (_req, res) => res.type('text').send('Wonder Royale server is running. Host the client separately and point it at this URL.'));
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: corsOrigin, methods: ['GET', 'POST'], credentials: false },
  transports: ['polling', 'websocket'],                    // polling first, upgrade to websocket (works behind Railway's proxy)
  pingInterval: 10000,
  pingTimeout: 20000,
  maxHttpBufferSize: 1e5                                    // inputs are tiny; refuse big payloads
});

/* Load the game rules once to learn valid ranges (skins, melee weapons...) and to fail fast if the bundle is broken. */
const probe = new Sim();
const limits = probe.limits;
probe.dispose();

const rooms = new RoomManager(io, { limits, log: (...a) => console.log('[rooms]', ...a) });

server.listen(PORT, HOST, () => {
  console.log(`Wonder Royale server listening on ${HOST}:${PORT}`);
  console.log(`CORS: ${allowed.length ? allowed.join(', ') : '* (set FRONTEND_URL to restrict)'}`);
  console.log(clientDir ? `Serving client from ${clientDir}` : 'No client folder found; API only.');
});

function shutdown() { console.log('shutting down'); rooms.close(); io.close(); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); }
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
