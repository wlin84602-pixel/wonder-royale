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
 const C=context.IslandCore,s=run('islandState'),R=context.IslandRender;
 assert(Math.abs(s.size*s.size/(6000*6000)-10)<1e-10);assert.equal(s.buildings.length,85);assert.equal(new Set(s.buildings.map(b=>b.style)).size,12);
 game.width=1600;game.height=1100;const g=game.getContext('2d');g.fillStyle='#69ac51';g.fillRect(0,0,1600,1100);
 const names={house:'ROOMED HOUSE',market:'SUPERMARKET',garage:'GARAGE',barn:'BARN',poolhouse:'POOL HOUSE',kitchen:'KITCHEN',lounge:'LOUNGE',octagon:'OCTAGON STORE',bedroom:'BEDROOM HOUSE',diner:'DINER',hall:'HALL',warehouse:'WAREHOUSE'},types=context.IslandBuildings.TYPES,frames=[];
 for(let i=0;i<types.length;i++){
  const b=s.buildings.find(q=>q.style===types[i]),f=Math.min(.7,350/b.w,260/b.h),left=i%4*400+(400-b.w*f)/2,top=Math.floor(i/4)*355+50;
  g.save();g.translate(left-b.x*f,top-b.y*f);g.scale(f,f);R.floors(g,s,q=>q.id===b.id);for(const o of s.objects)if(o.building===b.id&&o.kind!=='door')R.object(g,o,s.time);for(const c of s.containers)if(c.building===b.id)R.crate(g,c);R.roofs(g,s,{x:b.x+b.w/2,y:b.y+b.h/2},q=>q.id===b.id);for(const d of s.doors)if(d.building===b.id)R.object(g,d,s.time);g.restore();
  g.fillStyle='#193e35';g.font='bold 15px sans-serif';g.textAlign='center';g.fillText(names[b.style],i%4*400+200,Math.floor(i/4)*355+340);frames.push({type:b.style,doors:b.entryPoints.length,props:s.objects.filter(o=>o.building===b.id).length});
 }
 fs.writeFileSync(path.join(__dirname,'../reference-buildings.png'),game.toBuffer('image/png'));
 const overview=createCanvas(1900,1900);R.map(overview.getContext('2d'),s,1900,1900,{x:s.size/2,y:s.size/2},null,null,null,s.size);fs.writeFileSync(path.join(__dirname,'../expanded-island-map.png'),overview.toBuffer('image/png'));
 // Open from the outside, then from the inside; the hinge pushes away from actor.
 const b=s.buildings.find(b=>b.style==='house'),entry=b.entryPoints[0],d=s.doors.find(d=>d.id===entry.door),center={x:d.x+d.w/2,y:d.y+d.h/2};
 d.open=false;d.lastUse=-100;s.time=20;assert(C.interactDoor(s,d,{...entry,phase:'ground'},[]).ok);const outside=d.swing;s.time=21;assert(C.interactDoor(s,d,{...entry,phase:'ground'},[]).ok);s.time=22;assert(C.interactDoor(s,d,{x:center.x+entry.dx*50,y:center.y+entry.dy*50,phase:'ground'},[]).ok);assert.equal(d.swing,-outside,'Door did not reverse push direction');
 const panels=createCanvas(1200,360),p=panels.getContext('2d');p.fillStyle='#69ac51';p.fillRect(0,0,1200,360);
 for(let i=0;i<3;i++){d.open=i!==0;d.swing=i===1?outside:-outside;d.changedAt=20;p.save();p.beginPath();p.rect(i*400,0,400,337);p.clip();p.translate(i*400+200-center.x*1.65,180-center.y*1.65);p.scale(1.65,1.65);R.floors(p,s,q=>q.id===b.id);for(const o of s.objects)if(o.building===b.id&&o.kind!=='door')R.object(p,o,21);R.object(p,d,21);p.restore();p.fillStyle='#193e35';p.font='bold 16px sans-serif';p.textAlign='center';p.fillText(['CLOSED','OPEN FROM OUTSIDE','OPEN FROM INSIDE'][i],i*400+200,352)}
 fs.writeFileSync(path.join(__dirname,'../reference-door-states.png'),panels.toBuffer('image/png'));
 // Real game frame in a furnished market at normal player/camera scale.
 game.width=1440;game.height=900;context.innerWidth=1440;context.innerHeight=900;
 run("resize();const shop=islandState.buildings.find(b=>b.style==='market');Object.assign(player,{x:shop.x+60,y:shop.y+190,phase:'ground',angle:0});cameraX=shop.x+shop.w/2;cameraY=shop.y+shop.h/2;cameraZoom=ISLAND_GROUND_ZOOM;draw()");
 fs.writeFileSync(path.join(__dirname,'../reference-buildings-in-game.png'),game.toBuffer('image/png'));
 // Renderer still culls the world instead of painting every one of 16k objects.
 const count=run('islandRenderCount');assert(count<s.objects.length*.12,'Expanded world was not culled');
 const result={status:'passed',size:s.size,areaMultiplier:s.size*s.size/36000000,buildings:s.buildings.length,doors:s.doors.length,objects:s.objects.length,groundLoot:s.loot.length,containers:s.containers.length,types:frames,normalCameraZoom:run('cameraZoom'),playerRadius:run('player.r'),visibleObjects:count,doorPush:'Reverses for inside/outside; fixed hinge',cosmetics:'Existing artwork and melee correction retained'};
 fs.writeFileSync(path.join(__dirname,'../expanded-map-render-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
