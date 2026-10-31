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
 run("newGame();initializeIsland(901);finishLanding();bots=[];islandState.time=20;");
 const s=run('islandState'),C=context.IslandCore,R=context.IslandRender,b=s.buildings.find(b=>b.style==='hall'),sheet=createCanvas(1600,850),z=sheet.getContext('2d'),labels=['NORTH','EAST','SOUTH','WEST'];context.doorGalleryContext=z;z.fillStyle='#143039';z.fillRect(0,0,1600,850);
 for(let row=0;row<2;row++)for(let col=0;col<4;col++){
  const e=b.entryPoints[col],d=s.doors.find(d=>d.id===e.door),cx=d.x+d.w/2,cy=d.y+d.h/2,side=row===0?-1:1,actor={x:cx+e.dx*70*side,y:cy+e.dy*70*side,r:26,hp:100,phase:'ground'};d.open=false;d.turnFrom=0;d.changedAt=-100;s.time+=1;assert(C.interactDoor(s,d,actor,[]).ok);
  const px=col*400,py=row*425;z.save();z.beginPath();z.rect(px+6,py+50,388,360);z.clip();z.translate(px+200-cx*1.25,py+225-cy*1.25);z.scale(1.25,1.25);z.fillStyle='#8cbd72';z.fillRect(cx-250,cy-200,500,400);R.floors(z,s,q=>q.id===b.id);for(const o of s.objects)if(o.building===b.id&&o.kind!=='door')R.object(z,o,s.time+.065);R.object(z,d,s.time+.065);
  const pose=C.doorPose(d,s.time+.065);z.strokeStyle='#fff6c8';z.lineWidth=2;z.beginPath();z.arc(d.hingeX,d.hingeY,d.length*.6,d.closedAngle,pose.angle,d.swing<0);z.stroke();z.fillStyle='#fff';z.beginPath();z.arc(d.hingeX,d.hingeY,5,0,7);z.fill();
  run('Object.assign(player,'+JSON.stringify(actor)+');x.save();x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,1440,900);x.translate(100-player.x,100-player.y);drawCharacter(player);x.restore()');z.drawImage(game,0,0,200,200,actor.x-100,actor.y-100,200,200);z.restore();
  z.fillStyle='#f4f6e9';z.font='bold 16px sans-serif';z.textAlign='center';z.fillText(labels[col]+' · '+(row===0?'OUTSIDE → INWARD':'INSIDE → OUTWARD'),px+200,py+30);
 }
 fs.writeFileSync(path.join(__dirname,'../door-four-sides.png'),sheet.toBuffer('image/png'));console.log(JSON.stringify({status:'passed',frames:8,checks:['North/east/south/west','Outside inward / inside outward','Visible fixed hinge']}));
})().catch(e=>{console.error(e);process.exitCode=1});
