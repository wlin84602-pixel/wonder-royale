'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),{performance}=require('perf_hooks');
let canvasPath;try{canvasPath=require.resolve('@napi-rs/canvas')}catch{canvasPath=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas')}
const {createCanvas,Image}=require(canvasPath);
(async()=>{
 const game=createCanvas(1440,900),mini=createCanvas(184,184),full=createCanvas(720,720),elements={},stored={};
 function el(s){if(s==='canvas')return game;if(s==='#island-minimap')return mini;if(s==='#island-full-map')return full;return elements[s]||={style:{},value:'',innerHTML:'',textContent:'',handlers:{},addEventListener(k,f){this.handlers[k]=f},setAttribute(k,v){this[k]=v}}}
 for(const c of [mini,full]){c.style={};c.handlers={};c.addEventListener=(k,f)=>c.handlers[k]=f}
 const context={performance,URL,URLSearchParams,document:{querySelector:el,createElement(type){if(type==='canvas')return createCanvas(300,150);throw Error(type)},addEventListener(){}},localStorage:{getItem(k){return stored[k]||null},setItem(k,v){stored[k]=v}},Image,Math,Date,console,devicePixelRatio:1,innerWidth:1440,innerHeight:900,requestAnimationFrame(){},setTimeout,clearTimeout};
 vm.createContext(context);const run=s=>vm.runInContext(s,context);let gameHtml=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');gameHtml=gameHtml.replace(/\/assets\/([a-f0-9]{20}\.(png|svg))/g,(_,name,type)=>'data:image/'+(type==='svg'?'svg+xml':'png')+';base64,'+fs.readFileSync(path.join(__dirname,'../public/assets',name)).toString('base64'));run(gameHtml.match(/<script>([\s\S]*)<\/script>/)[1]);
 for(let i=0;i<250;i++){if(run('cosmeticCategories.every(c=>cosmetics[c].length===cosmeticSprites[c].filter(Boolean).length)&&planeSprites.length===2'))break;await new Promise(r=>setTimeout(r,30))}
 assert(run('cosmeticCategories.every(c=>cosmetics[c].length===cosmeticSprites[c].filter(Boolean).length)'),'Artwork load failed');

 const {LobbySession}=require('../island/lobby-session.cjs'),rules=require('../island/combat-rules.json'),room=new LobbySession(901,rules,{bots:2});const host=room.join('Island Host',{skin:2,backpack:3,melee:4});room.join('Guest Player',{skin:4,backpack:1,melee:2});context.snap=room.snapshot(host.id);run('newGame();initializeIsland(901);islandNetwork.ready=true;islandNetwork.enabled=true;islandApplySnapshot(snap);draw()');assert(run('islandNetwork.inLobby'));fs.writeFileSync(path.join(__dirname,'../lobby-island-preview.png'),game.toBuffer('image/png'));console.log('PASS actual waiting-island renderer; original cosmetics loaded');
})().catch(e=>{console.error(e);process.exitCode=1});
