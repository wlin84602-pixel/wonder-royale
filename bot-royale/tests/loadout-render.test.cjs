'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),{performance}=require('perf_hooks');
let canvasPath;try{canvasPath=require.resolve('@napi-rs/canvas')}catch{canvasPath=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas')}
const {createCanvas,Image}=require(canvasPath);
(async()=>{
 const game=createCanvas(1440,900),mini=createCanvas(184,184),full=createCanvas(720,720),elements={},stored={};
 function el(s){if(s==='canvas')return game;if(s==='#island-minimap')return mini;if(s==='#island-full-map')return full;return elements[s]||={style:{},value:'',innerHTML:'',textContent:'',handlers:{},addEventListener(k,f){this.handlers[k]=f},setAttribute(k,v){this[k]=v}}}
 for(const c of [mini,full]){c.style={};c.handlers={};c.addEventListener=(k,f)=>c.handlers[k]=f}
 const context={document:{querySelector:el,createElement(type){if(type==='canvas')return createCanvas(300,150);throw Error(type)},addEventListener(){}},localStorage:{getItem(k){return stored[k]||null},setItem(k,v){stored[k]=v}},Image,Math,Date,console,devicePixelRatio:1,innerWidth:1440,innerHeight:900,requestAnimationFrame(){},setTimeout,clearTimeout};
 vm.createContext(context);const run=s=>vm.runInContext(s,context);let gameHtml=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');gameHtml=gameHtml.replace(/\/assets\/([a-f0-9]{20}\.(png|svg))/g,(_,name,type)=>'data:image/'+(type==='svg'?'svg+xml':'png')+';base64,'+fs.readFileSync(path.join(__dirname,'../public/assets',name)).toString('base64'));run(gameHtml.match(/<script>([\s\S]*)<\/script>/)[1]);
 for(let i=0;i<250;i++){if(run('cosmeticCategories.every(c=>cosmetics[c].length===cosmeticSprites[c].filter(Boolean).length)&&planeSprites.length===2'))break;await new Promise(r=>setTimeout(r,30))}
 assert(run('cosmeticCategories.every(c=>cosmetics[c].length===cosmeticSprites[c].filter(Boolean).length)'),'Artwork load failed');
 run("newGame();initializeIsland(901);finishLanding();bots=[];slot=0;selectedItem='weapon';islandState.time=10;");

 const s=run('islandState'),C=context.IslandCore,box=s.containers.find(c=>c.kind==='ammo'),b=s.buildings.find(b=>b.id===box.building);context.point=C.findValid(s,{x:box.x+55,y:box.y},26);run('Object.assign(player,point,{phase:"ground",angle:-Math.PI/2});dropPhase="ground";cameraX=player.x;cameraY=player.y;cameraZoom=ISLAND_GROUND_ZOOM;running=true;draw()');fs.writeFileSync(path.join(__dirname,'../loadout-world-preview.png'),game.toBuffer('image/png'));
 const preview=createCanvas(500,200),z=preview.getContext('2d');z.fillStyle='#74ad58';z.fillRect(0,0,500,200);for(let i=0;i<4;i++){z.save();z.translate(65+i*120,85);z.scale(2,2);context.IslandRender.crate(z,{kind:['basic','gold','ultimate','ammo'][i],x:0,y:0});z.restore();z.fillStyle='#16252c';z.font='bold 14px sans-serif';z.textAlign='center';z.fillText(['Wooden','Gold','Ultimate','Ammo'][i],65+i*120,170)}fs.writeFileSync(path.join(__dirname,'../small-ammo-box-preview.png'),preview.toBuffer('image/png'));console.log('PASS native game render and small ammo-box comparison');
})().catch(e=>{console.error(e);process.exitCode=1});
