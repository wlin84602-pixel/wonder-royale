'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),{performance}=require('perf_hooks');
let canvasPath;try{canvasPath=require.resolve('@napi-rs/canvas')}catch{canvasPath=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas')}
const {createCanvas,Image}=require(canvasPath);
(async()=>{
 const game=createCanvas(1440,900),mini=createCanvas(184,184),full=createCanvas(720,720),elements={},stored={};
 function el(s){if(s==='canvas')return game;if(s==='#island-minimap'||s==='#lobby-island-map')return mini;if(s==='#island-full-map')return full;return elements[s]||={style:{},value:'',innerHTML:'',textContent:'',handlers:{},addEventListener(k,f){this.handlers[k]=f},setAttribute(k,v){this[k]=v}}}
 for(const c of [mini,full]){c.style={};c.handlers={};c.addEventListener=(k,f)=>c.handlers[k]=f}
 const context={performance,URL,URLSearchParams,document:{querySelector:el,createElement(type){if(type==='canvas')return createCanvas(300,150);throw Error(type)},addEventListener(){}},localStorage:{getItem(k){return stored[k]||null},setItem(k,v){stored[k]=v}},Image,Math,Date,console,devicePixelRatio:1,innerWidth:1440,innerHeight:900,requestAnimationFrame(){},setTimeout,clearTimeout};
 vm.createContext(context);const run=s=>vm.runInContext(s,context);let gameHtml=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');gameHtml=gameHtml.replace(/\/assets\/([a-f0-9]{20}\.(png|svg))/g,(_,name,type)=>'data:image/'+(type==='svg'?'svg+xml':'png')+';base64,'+fs.readFileSync(path.join(__dirname,'../public/assets',name)).toString('base64'));run(gameHtml.match(/<script>([\s\S]*)<\/script>/)[1]);
 for(let i=0;i<250;i++){if(run('cosmeticCategories.every(c=>cosmetics[c].length===cosmeticSprites[c].filter(Boolean).length)&&planeSprites.length===2'))break;await new Promise(r=>setTimeout(r,30))}
 assert(run('cosmeticCategories.every(c=>cosmetics[c].length===cosmeticSprites[c].filter(Boolean).length)'),'Artwork load failed');


 const R=context.IslandRender,LR=context.IslandLobbyRender,measures={};let counts={};for(const [group,api]of [['battle',R],['lobby',LR]])for(const name of Object.keys(api))if(typeof api[name]==='function'){const orig=api[name];api[name]=function(...args){const start=performance.now();try{return orig(...args)}finally{const k=group+'.'+name;counts[k]=(counts[k]||0)+performance.now()-start}}}
 run("newGame();initializeIsland(901);finishLanding();running=true;bots=[];islandState.time=25;");
 const cases=[
 ['ground',"const perfRoom=islandState.buildings.find(b=>b.style==='market');Object.assign(player,{x:perfRoom.x+perfRoom.w/2,y:perfRoom.y-140,phase:'ground'});dropPhase='ground';cameraX=player.x;cameraY=player.y;cameraZoom=ISLAND_GROUND_ZOOM;islandState.time=25;bots=[]"],
 ['ground-crowd',"bots=Array.from({length:24},(_,i)=>({id:'perf-'+i,x:player.x+(i%6-3)*75,y:player.y+(Math.floor(i/6)-2)*75,phase:'ground',hp:100,r:26,angle:i*.3,skin:i%26,backpack:i%22,melee:i%22,slot:1,weaponType:i%4,itemKind:'gun'}))"],
 ['plane',"bots=[];dropPhase='plane';player.phase='plane';cameraX=cameraY=world/2;cameraZoom=Math.max(innerWidth/world,innerHeight/world);islandState.time=0;planeElapsed=0"]
 ];
 for(const [name,setup]of cases){run(setup);for(let i=0;i<6;i++)run('draw()');counts={};const times=[];for(let i=0;i<24;i++){const start=performance.now();run('draw()');times.push(performance.now()-start)}times.sort((a,b)=>a-b);measures[name]={averageMs:+(times.reduce((a,b)=>a+b,0)/times.length).toFixed(2),p95Ms:+times[Math.floor(times.length*.95)].toFixed(2),cache:{...context.IslandPerformance?.stats},parts:Object.fromEntries(Object.entries(counts).map(([k,v])=>[k,+(v/times.length).toFixed(2)]))}}
 const {LobbySession}=require('../island/lobby-session.cjs'),rules=require('../island/combat-rules.json'),room=new LobbySession(901,rules,{bots:0});let host;for(let i=0;i<25;i++){const p=room.join('Player '+i,{skin:i%26,backpack:i%22,melee:i%22});if(!i)host=p}context.snap=room.snapshot(host.id);run('islandNetwork.enabled=true;islandNetwork.ready=true;islandNetwork.last=null;islandApplySnapshot(snap)');
 for(const overview of [false,true]){run('islandNetwork.lobbyOverview='+overview);for(let i=0;i<6;i++)run('draw()');counts={};const start=performance.now();for(let i=0;i<24;i++)run('draw()');measures[overview?'lobby-overview':'lobby-crowd']={averageMs:+((performance.now()-start)/24).toFixed(2),parts:Object.fromEntries(Object.entries(counts).map(([k,v])=>[k,+(v/24).toFixed(2)]))}}
 const suffix=process.argv.includes('--baseline')?'before':'after';fs.writeFileSync(path.join(__dirname,'../performance-'+suffix+'.json'),JSON.stringify({renderer:'Native Canvas, 1440x900, identical seeded scenes',measures},null,2));console.log(JSON.stringify(measures,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
