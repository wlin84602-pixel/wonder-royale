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
 run("newGame();initializeIsland(901);finishLanding();bots=[];slot=0;selectedItem='weapon';islandState.time=20;");
 game.width=680;game.height=620;context.innerWidth=680;context.innerHeight=620;
 run("resize();const house=islandState.buildings.find(b=>b.style==='hall'),entry=house.entryPoints[3];var hingeDoor=islandState.doors.find(d=>d.id===entry.door);hingeDoor.open=true;hingeDoor.swing=1;hingeDoor.changedAt=-100;const tx=Math.cos(hingeDoor.closedAngle),ty=Math.sin(hingeDoor.closedAngle);Object.assign(player,{x:hingeDoor.hingeX+tx*12+ty*8,y:hingeDoor.hingeY+ty*12-tx*8,hp:100,phase:'ground'});dropPhase='ground';running=false;cameraZoom=1.2;cameraX=hingeDoor.hingeX+110;cameraY=hingeDoor.hingeY-55;draw()");
 assert(run('IslandCore.blocked(islandState,player.x,player.y,26)'),'Failed to reproduce screenshot overlap');
 const sheet=createCanvas(1360,680),z=sheet.getContext('2d');z.fillStyle='#123039';z.fillRect(0,0,1360,680);z.drawImage(game,0,60);
 run('running=true;interact();running=false;islandState.time+=.06;draw()');assert(!run('hingeDoor.open'),'Hinge interaction did not close');assert(!run('IslandCore.blocked(islandState,player.x,player.y,26)'),'Player still embedded');z.drawImage(game,680,60);
 z.fillStyle='#f2f6e9';z.font='bold 22px sans-serif';z.textAlign='center';z.fillText('REPRODUCED HINGE OVERLAP',340,35);z.fillText('CLOSED: CHARACTER CLEAR AND FREE',1020,35);fs.writeFileSync(path.join(__dirname,'../hinge-clearance-comparison.png'),sheet.toBuffer('image/png'));
 const before=run('JSON.stringify({x:player.x,y:player.y})');run('IslandCore.moveActor(islandState,player,-1,0,.1)');assert(run('Math.hypot(player.x-'+JSON.parse(before).x+',player.y-'+JSON.parse(before).y+')')>10,'No movement after closing');
 console.log(JSON.stringify({status:'passed',frames:2,checks:['Screenshot overlap reproduced in actual game renderer','Pressing interact at hinge closes and clears character','Movement away succeeds after closing']}));
})().catch(e=>{console.error(e);process.exitCode=1});
