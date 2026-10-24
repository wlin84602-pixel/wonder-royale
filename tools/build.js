#!/usr/bin/env node
/* Builds the two bundles from src/:
     client/game.js          = original game (B2 azure S X W C2) + net.js + E2          (runs in the browser)
     server/game/sim-core.js = original rules (B2 S X W C2) + server-shim.js             (runs headless in Node)
   Run:  node tools/build.js   */
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),src=f=>fs.readFileSync(path.join(root,'src',f),'utf8');
const join=a=>a.map(src).join('\n');
fs.mkdirSync(path.join(root,'client'),{recursive:true});
fs.mkdirSync(path.join(root,'server','game'),{recursive:true});
fs.writeFileSync(path.join(root,'client','game.js'),join(['B2.js','azure.js','S.js','X.js','W.js','C2.js','net.js','E2.js']));
fs.writeFileSync(path.join(root,'server','game','sim-core.js'),join(['B2.js','S.js','X.js','W.js','C2.js','server-shim.js']));
let html=src('index.src.html');
fs.writeFileSync(path.join(root,'client','index.html'),html);
console.log('built client/game.js ('+Math.round(fs.statSync(path.join(root,'client','game.js')).size/1024)+' KB) and server/game/sim-core.js ('+Math.round(fs.statSync(path.join(root,'server','game','sim-core.js')).size/1024)+' KB)');
