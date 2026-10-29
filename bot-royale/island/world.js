(function(root,factory){const api=factory(typeof module==="object"&&module.exports?require("./buildings.js"):root.IslandBuildings);if(typeof module==='object'&&module.exports)module.exports=api;else root.IslandCore=api})(typeof globalThis!=='undefined'?globalThis:this,function(Buildings){
'use strict';
const SIZE=6000,MAP_SCALE=Math.sqrt(10),PLAYER_RADIUS=26,CELL=160,PLAYER_SPEED=307.5,PARACHUTE_SPEED=492,DROP_SECONDS=10,GROUND_GUN_COUNT=16;
const LOCATIONS=[
{id:'verdant',name:'Verdant Village',x:1160,y:1220,kind:'residential',color:'#91ca78',risk:'medium'},
{id:'copper',name:'Copper Yard',x:4540,y:1110,kind:'industrial',color:'#b2a087',risk:'high'},
{id:'azure',name:'Azure Harbor',x:5160,y:4430,kind:'harbor',color:'#7fc5cc',risk:'high'},
{id:'maple',name:'Maple Meadows',x:1050,y:3410,kind:'forest',color:'#4b9c6b',risk:'quiet'},
{id:'golden',name:'Golden Acres',x:1580,y:5080,kind:'farm',color:'#d7c572',risk:'quiet'},
{id:'circuit',name:'Circuit Plaza',x:3370,y:2320,kind:'town',color:'#a4c0bd',risk:'high'},
{id:'stone',name:'Stonefall Quarry',x:4520,y:3090,kind:'quarry',color:'#b8b2a2',risk:'medium'},
{id:'crystal',name:'Crystal Crossing',x:3090,y:4520,kind:'lake',color:'#89b9b1',risk:'medium'}
];
const ZONE_PHASES=[
{prepare:70,shrink:50,dps:1,radius:2300*MAP_SCALE},
{prepare:45,shrink:40,dps:2,radius:1650*MAP_SCALE},
{prepare:30,shrink:35,dps:3,radius:1100*MAP_SCALE},
{prepare:20,shrink:30,dps:5,radius:650*MAP_SCALE},
{prepare:15,shrink:25,dps:8,radius:320*MAP_SCALE},
{prepare:10,shrink:20,dps:12,radius:80}
];
const COAST=[[390,175],[1630,105],[2670,210],[4030,145],[5440,330],[5820,1250],[5700,2470],[5840,3500],[5620,5100],[5080,5750],[3680,5840],[2230,5720],[970,5810],[230,5140],[140,3590],[265,2110],[140,920]];
function rng(seed){let n=seed>>>0;return ()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),hyp=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function pointSegment(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,t=clamp(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(px-ax-t*dx,py-ay-t*dy)}
function pointPolygon(x,y,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside}return inside}
function circleRect(x,y,r,o){return Math.hypot(x-clamp(x,o.x,o.x+o.w),y-clamp(y,o.y,o.y+o.h))<r-.001}
function bounds(o){return o.shape==='circle'?{x:o.x-o.r,y:o.y-o.r,w:o.r*2,h:o.r*2}:{x:o.x,y:o.y,w:o.w,h:o.h}}
class SpatialIndex{
 constructor(objects=[]){this.cells=new Map();for(const o of objects)this.add(o)}
 add(o){const b=bounds(o);for(let y=Math.floor(b.y/CELL);y<=Math.floor((b.y+b.h)/CELL);y++)for(let x=Math.floor(b.x/CELL);x<=Math.floor((b.x+b.w)/CELL);x++){const k=x+','+y;if(!this.cells.has(k))this.cells.set(k,[]);this.cells.get(k).push(o)}}
 query(x,y,w,h){const out=[],seen=new Set();for(let yy=Math.floor(y/CELL);yy<=Math.floor((y+h)/CELL);yy++)for(let xx=Math.floor(x/CELL);xx<=Math.floor((x+w)/CELL);xx++)for(const o of this.cells.get(xx+','+yy)||[])if(!seen.has(o.id)){seen.add(o.id);out.push(o)}return out}
}
function buildLegacyWorld(seed=1){
 const random=rng(seed),state={seed:seed>>>0,size:SIZE,time:0,locations:LOCATIONS.map(l=>({...l})),buildings:[],objects:[],doors:[],bushes:[],containers:[],loot:[],roads:[],bridges:[],water:[],fields:[],coast:COAST,events:[],nextId:0};
 const id=p=>p+'-'+state.nextId++,add=o=>{o.id=o.id||id(o.kind||'obj');state.objects.push(o);return o};
 const rect=(kind,x,y,w,h,extra={})=>add({kind,shape:'rect',x,y,w,h,solid:true,blocksShots:true,...extra});
 function building(loc,x,y,w,h,style='house',variant=0){
  const original={x,y};let placed=false;for(let radius=0;radius<=1000&&!placed;radius+=70)for(let k=0,n=radius?16:1;k<n;k++){const a=k/n*Math.PI*2,xx=original.x+Math.cos(a)*radius,yy=original.y+Math.sin(a)*radius;const corners=[[xx-30,yy-30],[xx+w+30,yy-30],[xx-30,yy+h+30],[xx+w+30,yy+h+30],[xx+w/2,yy+h/2]];if(corners.every(p=>playable(state,...p,0))&&!state.buildings.some(o=>xx<o.x+o.w+80&&xx+w+80>o.x&&yy<o.y+o.h+80&&yy+h+80>o.y)){x=xx;y=yy;placed=true;break}}if(!placed)throw Error('Building placement failed');const b={id:id('building'),loc:loc.id,x,y,w,h,style,variant,roofAlpha:1,entryPoints:[]};state.buildings.push(b);
  const thick=14,gap=82,mx=x+w/2;
  for(const yy of [y,y+h-thick]){
   rect('wall',x,yy,w/2-gap/2,thick,{building:b.id});rect('wall',mx+gap/2,yy,w/2-gap/2,thick,{building:b.id});
   const d=rect('door',mx-gap/2,yy,gap,thick,{building:b.id,open:false,lastUse:-100,changedAt:0,angle:0});state.doors.push(d);
   b.entryPoints.push({x:mx,y:yy===y?y-65:y+h+65,door:d.id});
  }
  rect('wall',x,y+thick,thick,h-thick*2,{building:b.id});rect('wall',x+w-thick,y+thick,thick,h-thick*2,{building:b.id});
  if(style==='warehouse'||style==='barn'){
   for(const xx of [x+34,x+w-100])for(const yy of [y+30,y+h-70])rect(style==='barn'?'hay':'pallet',xx,yy,Math.min(66,w*.18),40,{building:b.id,hp:70,destructible:true});
  }else{
   rect('sofa',x+35,y+42,70,32,{building:b.id});rect('table',x+w-102,y+h-88,65,45,{building:b.id});
   if(variant%2)rect('counter',x+w-76,y+35,35,73,{building:b.id});
   else rect('bed',x+34,y+h-94,63,51,{building:b.id});
  }
  for(let i=0;i<(style==='warehouse'?3:2);i++){const candidates=[];for(let yy=y+40;yy<y+h-35;yy+=28)for(let xx=x+40;xx<x+w-35;xx+=28){if(Math.abs(xx-mx)<56)continue;if(state.objects.some(o=>o.building===b.id&&(o.shape==='circle'?Math.hypot(xx-o.x,yy-o.y)<o.r+20:circleRect(xx,yy,20,o))))continue;if(state.containers.some(c=>Math.hypot(xx-c.x,yy-c.y)<43))continue;candidates.push({x:xx,y:yy})}const target={x:i%2?x+w-50:x+50,y:y+h/2};candidates.sort((a,b)=>hyp(a,target)-hyp(b,target));if(candidates[0])state.containers.push({id:id('chest'),...candidates[0],kind:i===0?'gold':i===1?'ammo':'basic',open:false,hp:60,building:b.id})}
  return b;
 }
 // A river crosses the island north to south, with a wider lake near Crystal Crossing.
 const river=[[2780,100],[2720,1000],[2900,1900],[2680,2900],[3010,3650],[3190,4500],[3070,5900]];
 for(let i=1;i<river.length;i++)state.water.push({kind:'river',ax:river[i-1][0],ay:river[i-1][1],bx:river[i][0],by:river[i][1],r:91});
 state.water.push({kind:'lake',x:3240,y:4320,rx:510,ry:380});
 const road=(points,paved=true,width=88)=>state.roads.push({points,paved,width});
 road([[650,1250],[2400,1250],[3400,1250],[5100,1250]]);
 road([[1100,1250],[1100,3400],[1580,5100]],false,74);
 road([[4700,1250],[4700,3100],[5200,4400]]);
 road([[1050,3400],[2350,2800],[3370,2320],[4700,3100]]);
 road([[1580,5100],[2360,4520],[3990,4520],[5200,4400]]);
 road([[3370,2320],[3580,3500],[3990,4520]],false,78);
 road([[1200,1250],[2100,2150],[3370,2320]],false,72);
 state.bridges.push({ax:2450,ay:1250,bx:3030,by:1250,width:132},{ax:2350,ay:2800,bx:2990,by:2580,width:128},{ax:2420,ay:4520,bx:3950,by:4520,width:136},{ax:1960,ay:2120,bx:3060,by:2280,width:120});
 for(const loc of state.locations){
  const style=loc.kind==='industrial'?'warehouse':loc.kind==='farm'?'barn':loc.kind==='town'?'shop':loc.kind==='harbor'?'warehouse':'house';
  const layouts=loc.kind==='industrial'?[[-450,-280,350,290],[80,-280,350,290],[-420,180,340,265],[105,180,340,265]]:
   loc.kind==='town'?[[-480,-290,270,220],[-110,-290,270,220],[255,-290,270,220],[-460,140,270,220],[-100,140,270,220],[260,140,270,220]]:
   loc.kind==='lake'?[[-680,-450,260,210],[-700,200,260,210],[620,-390,260,210],[650,200,260,210]]:
   [[-380,-260,280,230],[100,-260,280,230],[-380,150,280,230],[100,150,280,230]];
  layouts.forEach((p,i)=>building(loc,loc.x+p[0],loc.y+p[1],p[2],p[3],style,i));
  if(loc.kind==='farm')for(let i=0;i<4;i++)state.fields.push({x:loc.x-550+i*300,y:loc.y-600,w:240,h:220});
  if(loc.kind==='industrial'||loc.kind==='harbor')for(let i=0;i<7;i++){const cx=loc.x-470+i*147,cy=loc.y+640;if(playable(state,cx+55,cy+34,78))rect('container',cx,cy,110,68,{color:['#d27751','#679fa6','#d3b457'][i%3]})}
  if(loc.kind==='farm')for(let i=0;i<9;i++)rect('fence',loc.x-600+i*140,loc.y-660,104,10,{hp:65,destructible:true});
  if(loc.kind==='harbor')for(let i=0;i<3;i++)state.bridges.push({ax:loc.x+300,ay:loc.y-450+i*380,bx:5790,by:loc.y-450+i*380,width:118,dock:true});
 }
 function occupied(x,y,r=70){return state.buildings.some(b=>x>b.x-r&&x<b.x+b.w+r&&y>b.y-r&&y<b.y+b.h+r||b.entryPoints.some(p=>Math.hypot(x-p.x,y-p.y)<r+55))||state.roads.some(d=>d.points.slice(1).some((p,i)=>pointSegment(x,y,...d.points[i],...p)<d.width/2+r*.4))||state.bridges.some(b=>pointSegment(x,y,b.ax,b.ay,b.bx,b.by)<b.width/2+r)}
 function dry(x,y,r=0){return pointPolygon(x,y,COAST)&&!isWater(state,x,y,r)}
 for(let i=0;i<620;i++){
  const forest=i<170,x=forest?500+random()*1500:330+random()*5300,y=forest?2700+random()*1450:330+random()*5300;
  if(!dry(x,y,65)||occupied(x,y,76))continue;
  add({kind:'tree',shape:'circle',x,y,r:23+random()*7,canopy:57+random()*23,solid:true,blocksShots:true,hp:180,destructible:true,tint:i%3});
 }
 for(let i=0;i<230;i++){const x=350+random()*5250,y=350+random()*5250;if(!dry(x,y,50)||occupied(x,y,40))continue;
  if(i%3===0){const o={id:id('bush'),kind:'bush',shape:'circle',x,y,r:48+random()*19,solid:false,blocksShots:false};state.bushes.push(o);add(o)}
  else add({kind:i%5?'rock':'barrel',shape:'circle',x,y,r:i%5?24+random()*13:20,solid:true,blocksShots:true,hp:i%5?240:45,destructible:true});
 }
 const quarry=state.locations.find(l=>l.id==='stone');for(let i=0;i<22;i++){const a=i*2.4,r=410+random()*100;const x=quarry.x+Math.cos(a)*r,y=quarry.y+Math.sin(a)*r;if(!occupied(x,y,85))add({kind:'rock',shape:'circle',x,y,r:26+random()*24,solid:true,blocksShots:true,hp:260,destructible:true})}
 for(const [kind,locName,count]of [['planter','verdant',12],['machine','stone',6]]){const loc=state.locations.find(l=>l.id===locName);for(let i=0;i<count;i++){const a=i/count*Math.PI*2,xx=loc.x+Math.cos(a)*560,yy=loc.y+Math.sin(a)*550;if(dry(xx,yy,60)&&!occupied(xx,yy,70))rect(kind,xx-30,yy-20,60,kind==='machine'?65:28,{hp:kind==='machine'?220:65,destructible:true})}}
 state.index=new SpatialIndex(state.objects);
 for(const loc of state.locations){
  for(let i=0;i<16;i++){const spot=findValid(state,{x:loc.x-520+random()*1040,y:loc.y-480+random()*960},15);
   state.loot.push({id:id('loot'),x:spot.x,y:spot.y,type:i%5===0?'med':i%5===1?'shield':i%5===2?'ammo':'gun',weapon:1+Math.floor(random()*3),rarity:Math.floor(random()*(loc.risk==='high'?5:4)),amount:30,taken:false});
  }
  for(let i=0;i<4;i++){const spot=findValid(state,{x:loc.x-560+random()*1120,y:loc.y-500+random()*1000},24,true,true);state.containers.push({id:id('chest'),x:spot.x,y:spot.y,kind:i===0?'gold':i===1?'ammo':'basic',open:false,hp:60})}
 }
 for(const c of state.containers){Object.assign(c,{shape:'circle',r:18,solid:true,blocksShots:true,lootContainer:true,destructible:c.kind==='basic'});state.objects.push(c)}state.index=new SpatialIndex(state.objects);for(const q of state.loot)Object.assign(q,findValid(state,q,15));state.zone=createZone(state,random);state.random=random;return state;
}
function buildWorld(seed=1){
 const s=buildLegacyWorld(seed),F=MAP_SCALE,random=rng(seed^0x6ce9b6),point=p=>({x:p.x*F,y:p.y*F});
 s.size=SIZE*F;s.coast=COAST.map(([x,y])=>[x*F,y*F]);s.locations=LOCATIONS.map(l=>({...l,...point(l)}));
 const outdoor=s.objects.filter(o=>!o.building&&!o.lootContainer);
 for(const o of outdoor){o.x*=F;o.y*=F}
 s.roads=s.roads.map(r=>({...r,points:r.points.map(([x,y])=>[x*F,y*F])}));
 s.water=s.water.map(w=>w.kind==='lake'?{...w,x:w.x*F,y:w.y*F,rx:w.rx*F,ry:w.ry*F}:{...w,ax:w.ax*F,ay:w.ay*F,bx:w.bx*F,by:w.by*F,r:w.r*F});
 s.bridges=s.bridges.map(b=>({...b,ax:b.ax*F,ay:b.ay*F,bx:b.bx*F,by:b.by*F}));
 s.fields=s.fields.map(f=>({...f,x:f.x*F,y:f.y*F,w:f.w*F,h:f.h*F}));
 s.buildings=[];s.doors=[];s.containers=[];s.loot=[];s.objects=[];s.bushes=[];s.mapRevision=0;
 const tools={playable,pointSegment,SpatialIndex,solidHit};Buildings.populate(s,random,tools);
 // Wooden storage boxes use the same one-item loot rule as outdoor wooden crates.
 const woodenBoxes=s.objects.filter(o=>o.kind==='woodcrate');s.objects=s.objects.filter(o=>o.kind!=='woodcrate');
 for(const box of woodenBoxes)s.containers.push({...box,x:box.x+box.w/2,y:box.y+box.h/2,kind:'basic',shape:'circle',r:18,lootContainer:true,open:false,hp:70,destructible:true});
 const plots=new SpatialIndex(s.buildings.map(b=>({...b,shape:'rect'})));
 const occupied=(x,y,r)=>plots.query(x-r-180,y-r-180,2*r+360,2*r+360).some(b=>circleRect(x,y,r+45,b)||b.entryPoints.some(p=>Math.hypot(x-p.x,y-p.y)<r+90))||s.bridges.some(b=>pointSegment(x,y,b.ax,b.ay,b.bx,b.by)<b.width/2+r)||s.roads.some(road=>road.points.slice(1).some((p,i)=>pointSegment(x,y,...road.points[i],...p)<road.width/2+r*.35));
 for(const o of outdoor){const b=bounds(o),cx=o.shape==='circle'?o.x:o.x+o.w/2,cy=o.shape==='circle'?o.y:o.y+o.h/2;if(playable(s,cx,cy,o.r||20)&&!occupied(cx,cy,Math.max(b.w,b.h)/2)){s.objects.push(o);if(o.kind==='bush')s.bushes.push(o)}}
 const id=p=>p+'-'+s.nextId++;
 for(let i=0;i<7600;i++){
  const x=(330+random()*5300)*F,y=(330+random()*5300)*F;if(!playable(s,x,y,65)||occupied(x,y,70))continue;
  if(i<5600)s.objects.push({id:id('tree'),kind:'tree',shape:'circle',x,y,r:23+random()*7,canopy:57+random()*23,solid:true,blocksShots:true,hp:180,destructible:true,tint:i%3});
  else if(i%3===0){const q={id:id('bush'),kind:'bush',shape:'circle',x,y,r:48+random()*19,solid:false,blocksShots:false};s.bushes.push(q);s.objects.push(q)}
  else s.objects.push({id:id('cover'),kind:i%5?'rock':'barrel',shape:'circle',x,y,r:i%5?24+random()*13:20,solid:true,blocksShots:true,hp:i%5?240:45,destructible:true});
 }
 // Thin existing seeded tree positions without changing the building layout or other cover.
 let treeNumber=0;s.objects=s.objects.filter(o=>o.kind!=='tree'||treeNumber++%2===0);
 // Match solid tree footprints to the visible canopy, leaving a walkable gap between cover.
 const hardCover=new SpatialIndex(s.objects.filter(o=>o.kind!=='tree'&&o.solid)),treeSpacing=new SpatialIndex();
 s.objects=s.objects.filter(o=>{
  if(o.kind!=='tree')return true;
  o.trunkRadius=o.r;o.r=o.canopy*.9;o.solid=true;o.blocksShots=true;
  if(!playable(s,o.x,o.y,o.r+PLAYER_RADIUS+4)||occupied(o.x,o.y,o.r+PLAYER_RADIUS+4))return false;
  if(hardCover.query(o.x-o.r-70,o.y-o.r-70,o.r*2+140,o.r*2+140).some(q=>solidHit(q,o.x,o.y,o.r+PLAYER_RADIUS*2+8)))return false;
  if(treeSpacing.query(o.x-o.r-150,o.y-o.r-150,(o.r+150)*2,(o.r+150)*2).some(q=>hyp(o,q)<o.r+q.r+PLAYER_RADIUS*2+12))return false;
  treeSpacing.add(o);return true;
 });
 const coverIndex=new SpatialIndex(s.objects.filter(o=>o.solid)),bushClear=b=>playable(s,b.x,b.y,b.r*.78+PLAYER_RADIUS+4)&&!coverIndex.query(b.x-b.r-30,b.y-b.r-30,b.r*2+60,b.r*2+60).some(o=>solidHit(o,b.x,b.y,b.r*.78+PLAYER_RADIUS+4));
 s.bushes=s.bushes.filter(bushClear);const usableBushes=new Set(s.bushes);s.objects=s.objects.filter(o=>o.kind!=='bush'||usableBushes.has(o));
 const shrubRandom=rng(seed^0xb057c0),shrubSpacing=new SpatialIndex(s.bushes);let addedShrubs=0;
 for(let attempt=0;attempt<2400&&addedShrubs<120;attempt++){
  const q={id:'hide-bush-'+seed+'-'+attempt,kind:'bush',shape:'circle',x:100+shrubRandom()*(s.size-200),y:100+shrubRandom()*(s.size-200),r:50+shrubRandom()*16,solid:false,blocksShots:false};
  if(!playable(s,q.x,q.y,q.r+PLAYER_RADIUS)||occupied(q.x,q.y,q.r+PLAYER_RADIUS)||!bushClear(q))continue;
  if(shrubSpacing.query(q.x-250,q.y-250,500,500).some(b=>hyp(q,b)<q.r+b.r+100))continue;
  s.bushes.push(q);s.objects.push(q);shrubSpacing.add(q);addedShrubs++;
 }
 for(const b of s.bushes)b.hideRadius=b.r*.78;

 s.index=new SpatialIndex(s.objects);
 for(const loc of s.locations){
  // Remove loose heals and old guns while retaining existing ammunition and crate layout.
  for(let i=0;i<160;i++){const candidate={x:loc.x-1700+random()*3400,y:loc.y-1550+random()*3100};random();random();const lootId=id('loot');if(i%5===2)s.loot.push({id:lootId,...findValid(s,candidate,15),type:'ammo',amount:30,taken:false})}

  for(let i=0;i<40;i++){const p=findValid(s,{x:loc.x-1750+random()*3500,y:loc.y-1600+random()*3200},24,true,true,true);s.containers.push({id:id('chest'),...p,kind:i%10===0?'gold':i%4===1?'ammo':'basic',open:false,hp:60})}
 }
 // Exterior wall-side loot: one well-separated crate per side, never in a doorway.
 s.containers=[];const crateRandom=rng(seed^0xc7a7e51),crateSpacing=new SpatialIndex();
 for(const b of s.buildings){
  const edges=b.outline.map((p,i)=>[p,b.outline[(i+1)%b.outline.length]]).filter(([a,b])=>Math.abs(a[0]-b[0])<.01||Math.abs(a[1]-b[1])<.01);let placed=0;
  for(const [a,bp]of edges){const dx=bp[0]-a[0],dy=bp[1]-a[1],length=Math.hypot(dx,dy),nx=-dy/length,ny=dx/length;let found;
   for(const offset of [96,116,136]){const fractions=crateRandom()<.5?[.08,.92,.14,.86,.02,.98]:[.92,.08,.86,.14,.98,.02];for(const fraction of fractions){const t=fraction+(crateRandom()-.5)*.012,x=a[0]+dx*t-nx*offset,y=a[1]+dy*t-ny*offset;
    if(!playable(s,x,y,44)||blocked(s,x,y,44))continue;
    if(s.doors.some(d=>d.building===b.id&&d.exterior&&hyp({x,y},{x:d.x+d.w/2,y:d.y+d.h/2})<180))continue;
    if(s.index.query(x-120,y-120,240,240).some(o=>o.kind==='bush'&&hyp(o,{x,y})<o.r+44))continue;
    if(crateSpacing.query(x-180,y-180,360,360).some(c=>hyp(c,{x,y})<180))continue;
    found={id:id('chest'),x,y,building:b.id,exterior:true,kind:placed===0?'gold':'basic',open:false,hp:60};break;
   }if(found)break}
   if(found){s.containers.push(found);crateSpacing.add({...found,shape:'circle',r:18});placed++}
  }
 }
 const specialRandom=rng(seed^0x5171ab1e),pool=s.containers.slice();for(let i=pool.length-1;i>0;i--){const j=Math.floor(specialRandom()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
 if(pool.length<33)throw Error('Insufficient wall-side crate locations');for(let i=0;i<3;i++){pool[i].kind='ultimate';pool[i].hp=120}for(let i=3;i<33;i++)pool[i].kind='ammo';
 for(const c of s.containers){Object.assign(c,{shape:'circle',r:c.kind==='ammo'?12:18,solid:true,blocksShots:true,lootContainer:true,destructible:c.kind==='basic'});s.objects.push(c)}
 s.index=new SpatialIndex(s.objects);for(const q of s.loot)Object.assign(q,findValid(s,q,15));
 const lootRandom=rng(seed^0x1007a11);let groundGunCount=0;
 for(let attempt=0;attempt<4000&&groundGunCount<GROUND_GUN_COUNT;attempt++){
  const x=100+lootRandom()*(s.size-200),y=100+lootRandom()*(s.size-200);
  if(!playable(s,x,y,50)||blocked(s,x,y,40))continue;
  if(plots.query(x-100,y-100,200,200).some(b=>circleRect(x,y,100,b)))continue;
  if(s.index.query(x-140,y-140,280,280).some(o=>o.kind==='tree'&&hyp(o,{x,y})<o.canopy+50||o.kind==='bush'&&hyp(o,{x,y})<o.r+50))continue;
  if(s.loot.some(q=>hyp(q,{x,y})<(q.type==='gun'?1000:60)))continue;
  s.loot.push({id:id('loot'),x,y,type:'gun',weapon:Math.floor(lootRandom()*4),rarity:groundGunCount%8===7?1:0,taken:false});groundGunCount++;
 }
 if(groundGunCount!==GROUND_GUN_COUNT)throw Error('Not enough sparse ground-loot locations');
 s.zone=createZone(s,random);s.random=random;return s;
}
const PUMP_FULL_HIT_DAMAGE=Object.freeze([90,95,100,105,110]),pumpPelletGroups=new WeakMap();
function configurePumpShot(pellets,rarity,angle){const group={count:pellets.length,hits:new Map(),dx:Math.cos(angle),dy:Math.sin(angle)};for(const pellet of pellets){pellet.damage=PUMP_FULL_HIT_DAMAGE[clamp(rarity||0,0,4)]/pellets.length;pumpPelletGroups.set(pellet,group)}}
function applyPumpHit(s,pellet,target){const group=pumpPelletGroups.get(pellet);if(!group)return false;const count=(group.hits.get(target)||0)+1;group.hits.set(target,count);if(count!==group.count)return false;moveActor(s,target,group.dx,group.dy,.12,480);return true}
function solidHit(o,x,y,r){return o.shape==='circle'?Math.hypot(x-o.x,y-o.y)<r+o.r-.001:o.shape==='segment'?pointSegment(x,y,o.ax,o.ay,o.bx,o.by)<r+o.r-.001:circleRect(x,y,r,o)}
function segmentHitCapsule(ax,ay,bx,by,o,pad=0){
 const angle=Math.atan2(o.by-o.ay,o.bx-o.ax),c=Math.cos(angle),sn=Math.sin(angle),rot=(x,y)=>({x:(x-o.ax)*c+(y-o.ay)*sn,y:-(x-o.ax)*sn+(y-o.ay)*c}),a=rot(ax,ay),b=rot(bx,by),len=Math.hypot(o.bx-o.ax,o.by-o.ay),r=o.r+pad;
 const hits=[segmentHitRect(a.x,a.y,b.x,b.y,{x:0,y:-r,w:len,h:r*2}),segmentHitCircle(a.x,a.y,b.x,b.y,{x:0,y:0,r}),segmentHitCircle(a.x,a.y,b.x,b.y,{x:len,y:0,r})].filter(v=>v!==null);return hits.length?Math.min(...hits):null;
}

function onBridge(s,x,y,r=0){return s.bridges.some(b=>pointSegment(x,y,b.ax,b.ay,b.bx,b.by)<b.width/2-r)}
function isWater(s,x,y,r=0){if(onBridge(s,x,y,r))return false;return s.water.some(w=>w.kind==='lake'?Math.hypot((x-w.x)/(w.rx+r),(y-w.y)/(w.ry+r))<1:pointSegment(x,y,w.ax,w.ay,w.bx,w.by)<w.r+r)}
function playable(s,x,y,r=PLAYER_RADIUS){if(x-r>30&&y-r>30&&x+r<s.size-30&&y+r<s.size-30&&s.bridges.some(b=>b.dock&&pointSegment(x,y,b.ax,b.ay,b.bx,b.by)<b.width/2-r))return true;if(![[x,y],[x-r,y],[x+r,y],[x,y-r],[x,y+r]].every(p=>pointPolygon(...p,s.coast)))return false;return !isWater(s,x,y,r)}
function activeSolid(o){return !o.destroyed&&o.solid&&!(o.kind==='door'&&o.open)&&!(o.lootContainer&&o.open)}
function blocked(s,x,y,r=PLAYER_RADIUS){if(!playable(s,x,y,r))return true;return s.index.query(x-r,y-r,r*2,r*2).some(o=>activeSolid(o)&&solidHit(o,x,y,r))}
function findValid(s,p,r=PLAYER_RADIUS,avoidRoof=false,avoidBridges=false,avoidBushes=false){
 const valid=(x,y)=>(!avoidBushes||!s.index.query(x-r-100,y-r-100,(r+100)*2,(r+100)*2).some(o=>o.kind==='bush'&&hyp(o,{x,y})<o.r+r+24))&&(!avoidBridges||!s.bridges.some(b=>pointSegment(x,y,b.ax,b.ay,b.bx,b.by)<b.width/2+60))&&!blocked(s,x,y,r)&&(!avoidRoof||!s.buildings.some(b=>circleRect(x,y,r,b)||b.entryPoints.some(p=>Math.hypot(x-p.x,y-p.y)<90)));
 if(valid(p.x,p.y))return {x:p.x,y:p.y};
 for(let rad=20;rad<s.size*1.1;rad+=20)for(let i=0,n=Math.max(12,Math.ceil(rad*.28));i<n;i++){const a=i/n*Math.PI*2,x=p.x+Math.cos(a)*rad,y=p.y+Math.sin(a)*rad;if(valid(x,y))return{x,y}}
 throw Error('No valid island position');
}
function resolveActorOverlap(s,a){
 const r=a.r||PLAYER_RADIUS;if(!blocked(s,a.x,a.y,r)||!playable(s,a.x,a.y,r))return false;
 for(let radius=2;radius<=r*2+12;radius+=2)for(let i=0;i<40;i++){
  const angle=i/40*Math.PI*2,x=a.x+Math.cos(angle)*radius,y=a.y+Math.sin(angle)*radius;
  if(!blocked(s,x,y,r)){a.x=x;a.y=y;return true}
 }return false;
}
function contactNormal(o,x,y){
 let qx,qy;
 if(o.shape==='circle'){qx=o.x;qy=o.y}
 else if(o.shape==='segment'){const dx=o.bx-o.ax,dy=o.by-o.ay,t=clamp(((x-o.ax)*dx+(y-o.ay)*dy)/(dx*dx+dy*dy||1),0,1);qx=o.ax+dx*t;qy=o.ay+dy*t}
 else{qx=clamp(x,o.x,o.x+o.w);qy=clamp(y,o.y,o.y+o.h)}
 const dx=x-qx,dy=y-qy,length=Math.hypot(dx,dy);return length>1e-8?{x:dx/length,y:dy/length}:null;
}
function slideStep(s,a,vx,vy,radius){
 for(let pass=0;pass<4&&Math.hypot(vx,vy)>1e-7;pass++){
  const x=a.x,y=a.y;if(!blocked(s,x+vx,y+vy,radius)){a.x+=vx;a.y+=vy;return}
  let lo=0,hi=1;for(let i=0;i<14;i++){const mid=(lo+hi)/2;if(blocked(s,x+vx*mid,y+vy*mid,radius))hi=mid;else lo=mid}
  a.x=x+vx*lo;a.y=y+vy*lo;vx*=1-lo;vy*=1-lo;
  const contacts=s.index.query(a.x-radius-1,a.y-radius-1,radius*2+2,radius*2+2).filter(o=>activeSolid(o)&&solidHit(o,a.x,a.y,radius+.06));let projected=false;
  for(const o of contacts){const n=contactNormal(o,a.x,a.y);if(!n)continue;const budget=Math.hypot(vx,vy),into=vx*n.x+vy*n.y;if(into< -1e-8){vx-=n.x*into;vy-=n.y*into;
   if(o.kind==='tree'&&Math.hypot(vx,vy)<budget*.45){const cross=n.x*(a.doorMoveY||0)-n.y*(a.doorMoveX||0),side=Math.abs(cross)>1e-6?Math.sign(cross):a.treeSlideId===o.id?a.treeSlideSide:1;a.treeSlideId=o.id;a.treeSlideSide=side;vx=-n.y*side*budget*.8;vy=n.x*side*budget*.8}
   projected=true}}
  if(!projected){
   // Preserve sliding along coastline/bridge boundaries, which have no object normal.
   for(const [axis,amount]of [['x',vx],['y',vy]]){if(!amount)continue;const before=a[axis];let l=0,h=1;for(let j=0;j<12;j++){const m=(l+h)/2;a[axis]=before+amount*m;if(blocked(s,a.x,a.y,radius))h=m;else l=m}a[axis]=before+amount*l}return;
  }
 }
}
function moveActor(s,a,dx,dy,dt,speed=a.speed||205){
 a.doorMoveX=dx;a.doorMoveY=dy;a.doorMoveAt=s.time;resolveActorOverlap(s,a);
 const n=Math.hypot(dx,dy);if(n>1){dx/=n;dy/=n}const radius=a.r||PLAYER_RADIUS,steps=Math.max(1,Math.ceil(speed*dt/(radius*.4)));
 for(let i=0;i<steps;i++)slideStep(s,a,dx*speed*dt/steps,dy*speed*dt/steps,radius);
 return a;
}
function segmentHitRect(ax,ay,bx,by,o,pad=0){let lo=0,hi=1;for(const [p,d,min,max]of [[ax,bx-ax,o.x-pad,o.x+o.w+pad],[ay,by-ay,o.y-pad,o.y+o.h+pad]]){if(Math.abs(d)<1e-10){if(p<min||p>max)return null}else{let t1=(min-p)/d,t2=(max-p)/d;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);if(lo>hi)return null}}return lo}
function segmentHitCircle(ax,ay,bx,by,o,pad=0){const dx=bx-ax,dy=by-ay,fx=ax-o.x,fy=ay-o.y,r=o.r+pad,A=dx*dx+dy*dy,C=fx*fx+fy*fy-r*r;if(C<=0)return 0;if(A===0)return null;const B=2*(fx*dx+fy*dy),D=B*B-4*A*C;if(D<0)return null;const t=(-B-Math.sqrt(D))/(2*A);return t>=0&&t<=1?t:null}
function raycast(s,ax,ay,bx,by,pad=1,ignore=null){let best=null;for(const o of s.index.query(Math.min(ax,bx)-pad,Math.min(ay,by)-pad,Math.abs(bx-ax)+pad*2,Math.abs(by-ay)+pad*2)){if(o.destroyed||!o.blocksShots||o.kind==='door'&&o.open||o.lootContainer&&o.open||ignore&&ignore(o))continue;const t=o.shape==='circle'?segmentHitCircle(ax,ay,bx,by,o,pad):o.shape==='segment'?segmentHitCapsule(ax,ay,bx,by,o,pad):segmentHitRect(ax,ay,bx,by,o,pad);if(t!==null&&(!best||t<best.t))best={object:o,t}}return best}
const buildingLookups=new WeakMap();
function buildingAt(s,a){if(!s.buildings.length)return null;let entry=buildingLookups.get(s);if(!entry||entry.list!==s.buildings||entry.count!==s.buildings.length){entry={list:s.buildings,count:s.buildings.length,index:new SpatialIndex(s.buildings)};buildingLookups.set(s,entry)}return entry.index.query(a.x,a.y,0,0).find(b=>a.x>b.x+12&&a.x<b.x+b.w-12&&a.y>b.y+12&&a.y<b.y+b.h-12&&(!b.outline||pointPolygon(a.x,a.y,b.outline)))||null}
function bushAt(s,a){return s.index.query(a.x-1,a.y-1,2,2).find(b=>b.kind==='bush'&&Math.hypot(a.x-b.x,a.y-b.y)<(b.hideRadius??b.r*.83))||null}
function apertureDistance(o,p){return o.shape==='segment'?pointSegment(p.x,p.y,o.ax,o.ay,o.bx,o.by):o.hingeX!==undefined?pointSegment(p.x,p.y,o.hingeX,o.hingeY,o.hingeX+Math.cos(o.closedAngle)*o.length,o.hingeY+Math.sin(o.closedAngle)*o.length):hyp(p,{x:o.x+o.w/2,y:o.y+o.h/2})}
function canViewInterior(s,b,viewer){
 if(!b||!viewer||viewer.phase&&viewer.phase!=='ground')return false;
 if(buildingAt(s,viewer)?.id===b.id)return true;
 const distance=52;
 return s.index.query(viewer.x-distance,viewer.y-distance,distance*2,distance*2).some(o=>o.building===b.id&&(o.kind==='window'||o.kind==='door'&&o.exterior)&&
  apertureDistance(o,viewer)<=distance);
}
// Signed distance from the closed panel determines the push direction on every orientation.
function doorSwingAway(d,opener){const tx=Math.cos(d.closedAngle),ty=Math.sin(d.closedAngle),side=tx*(opener.y-d.hingeY)-ty*(opener.x-d.hingeX);return Math.abs(side)<1e-7?(d.swing||1):side>0?-1:1}
function doorPose(d,time){const angle=d.closedAngle+doorAngleAt(d,time);return{hingeX:d.hingeX,hingeY:d.hingeY,angle,tipX:d.hingeX+Math.cos(angle)*d.length,tipY:d.hingeY+Math.sin(angle)*d.length}}
function doorAngleAt(d,time){const target=d.open?(d.swing||1)*Math.PI/2:0,t=clamp((time-d.changedAt)/.09,0,1),f=t*t*(3-2*t);return(d.turnFrom??(d.open?0:(d.swing||1)*Math.PI/2))*(1-f)+target*f}
function canSee(s,viewer,target){if(viewer===target||viewer.id&&viewer.id===target.id)return true;if(target.phase&&target.phase!=='ground')return true;const building=buildingAt(s,target);if(building&&!canViewInterior(s,building,viewer))return false;if(target.phase&&target.phase!=='ground')return true;if(hyp(viewer,target)>3200)return false;const bush=bushAt(s,target);if(bush&&s.time>=(target.revealedUntil||0)&&bushAt(s,viewer)?.id!==bush.id)return false;return !raycast(s,viewer.x,viewer.y,target.x,target.y,0,o=>o.kind==='window'||o.kind==='door'&&o.exterior&&building&&apertureDistance(o,viewer)<=52)}
function doorInteractionDistance(door,a,time){
 if(door.hingeX===undefined)return apertureDistance(door,a);
 const pose=doorPose(door,time);
 return Math.min(apertureDistance(door,a),pointSegment(a.x,a.y,pose.hingeX,pose.hingeY,pose.tipX,pose.tipY));
}
function clearClosingDoor(s,door,opener,actors){
 const affected=[...new Set([opener,...actors])].filter(p=>(!p.phase||p.phase==='ground')&&p.hp>0&&circleRect(p.x,p.y,p.r||PLAYER_RADIUS,door));
 if(!affected.length)return[];
 const angle=door.closedAngle??(door.h>door.w?Math.PI/2:0),tx=Math.cos(angle),ty=Math.sin(angle),nx=-ty,ny=tx,hx=door.hingeX??door.x,hy=door.hingeY??door.y,length=door.length??Math.max(door.w,door.h),plans=[];
 for(const p of affected){
  const radius=p.r||PLAYER_RADIUS,u=(p.x-hx)*tx+(p.y-hy)*ty,side=(p.x-hx)*nx+(p.y-hy)*ny,motion=s.time-(p.doorMoveAt??-100)<.2?(p.doorMoveX||0)*nx+(p.doorMoveY||0)*ny:0,preferred=Math.abs(motion)>.2?Math.sign(motion):Math.abs(side)>.01?Math.sign(side):Math.sign((opener.x-hx)*nx+(opener.y-hy)*ny)||-(door.swing||1),margin=radius+12,offset=radius+11;
  const tangent=clamp(u,margin,length-margin),samples=[tangent,length/2,margin,length-margin],candidates=[];
  for(const sign of [preferred,-preferred])for(const along of samples){
   const x=hx+tx*along+nx*offset*sign,y=hy+ty*along+ny*offset*sign;
   if(blocked(s,x,y,radius))continue;
   if([...new Set([opener,...actors])].some(q=>q!==p&&!affected.includes(q)&&q.hp>0&&hyp(q,{x,y})<radius+(q.r||PLAYER_RADIUS)+1))continue;
   if(plans.some(q=>hyp(q,{x,y})<radius+q.r+1))continue;
   candidates.push({id:p.id,x,y,r:radius,fromX:p.x,fromY:p.y,actor:p,sidePenalty:sign===preferred?0:length});
  }
  candidates.sort((a,b)=>hyp(a,p)+a.sidePenalty-hyp(b,p)-b.sidePenalty);if(!candidates.length)return null;plans.push(candidates[0]);
 }
 for(const plan of plans){plan.actor.x=plan.x;plan.actor.y=plan.y}
 return plans.map(({actor,sidePenalty,r,...position})=>position);
}
function interactDoor(s,door,a,actors=[],desiredOpen){
 if(!door||door.kind!=='door'||doorInteractionDistance(door,a,s.time)>80)return {ok:false,reason:'Too far away'};
 const bot=a.bot||String(a.id||'').startsWith('offline-bot-');
 if(bot&&(s.time<(door.manualUntil||0)||s.time-door.lastUse<.35-1e-8))return{ok:false,reason:'Door cooling down'};
 if(typeof desiredOpen==='boolean'&&door.open===desiredOpen)return{ok:true};
 const moved=door.open?clearClosingDoor(s,door,a,actors):[];if(moved===null)return{ok:false,reason:'No clear space beside door'};
 const turnFrom=doorAngleAt(door,s.time);
 if(!door.open&&door.hingeX!==undefined)door.swing=doorSwingAway(door,a);
 door.open=!door.open;door.turnFrom=turnFrom;door.lastUse=s.time;door.changedAt=s.time;if(!bot)door.manualUntil=s.time+1.2;s.events.push({kind:'door',x:door.x,y:door.y,open:door.open});return{ok:true,moved};
}
function interactionTarget(s,a){if(a.phase&&a.phase!=='ground')return null;const candidates=[];for(const d of s.doors){const distance=doorInteractionDistance(d,a,s.time);if(distance<=80){const hingeDistance=d.hingeX===undefined?Infinity:hyp(a,{x:d.hingeX,y:d.hingeY});candidates.push({kind:'door',object:d,distance,hingeDistance,hingeTouch:hingeDistance<=(a.r||PLAYER_RADIUS)+26})}}for(const c of s.containers)if(!c.open&&hyp(a,c)<92){const hit=raycast(s,a.x,a.y,c.x,c.y,0);if(!hit||hit.object.id===c.id)candidates.push({kind:'container',object:c,distance:hyp(a,c)})}for(const l of s.loot)if(!l.taken&&hyp(a,l)<72&&!raycast(s,a.x,a.y,l.x,l.y,0))candidates.push({kind:'loot',object:l,distance:hyp(a,l)});return candidates.sort((a,b)=>(a.kind==='door'?0:1)-(b.kind==='door'?0:1)||(a.hingeTouch?0:1)-(b.hingeTouch?0:1)||(a.hingeTouch&&b.hingeTouch?a.hingeDistance-b.hingeDistance:a.distance-b.distance))[0]||null}
function openContainer(s,c,a,weaponCount=4){
 if(!c||c.open||hyp(a,c)>92||a.phase&&a.phase!=='ground')return[];const obstruction=raycast(s,a.x,a.y,c.x,c.y,0);if(obstruction&&obstruction.object.id!==c.id)return[];
 c.open=true;c.destroyed=true;c.solid=false;c.blocksShots=false;s.mapRevision=(s.mapRevision||0)+1;
 const random=s.random||rng(s.seed),heal=()=>random()<.65?'med':'shield',drops=c.kind==='ammo'?['ammo','ammo']:c.kind==='ultimate'?['gun','med','shield']:c.kind==='gold'?['gun',heal(),random()<.6?'gun':heal()]:[random()<.65?'gun':heal()],out=[];
 for(let i=0;i<drops.length;i++){
  const p=findValid(s,{x:c.x+(i-(drops.length-1)/2)*46,y:c.y+(drops.length>1?42:0)},13),q={id:'loot-'+s.nextId++,...p,type:drops[i],amount:drops[i]==='ammo'?45:1,taken:false};
  if(q.type==='ammo')q.ammoFamily=['smg','shotgun','sniper','p90'][Math.floor(random()*4)];
  if(q.type==='gun'){q.weapon=Math.floor(random()*Math.max(1,weaponCount));const roll=random();q.rarity=c.kind==='ultimate'?4:c.kind==='gold'?(roll<.6?2:roll<.9?3:4):(roll<.6?0:roll<.85?1:roll<.95?2:roll<.99?3:4)}
  s.loot.push(q);out.push(q);
 }s.events.push({kind:'crate',x:c.x,y:c.y});return out;
}
function damageObject(s,o,damage,actor){if(!o||o.destroyed||!o.destructible)return false;o.hp-=damage;if(o.hp<=0){o.destroyed=true;s.mapRevision=(s.mapRevision||0)+1;s.events.push({kind:'break',x:o.x,y:o.y});if(o.kind==='basic')openContainer(s,o,{x:o.x,y:o.y,phase:'ground'})}return true}
function createZone(s,random){const first={x:(.4+random()*.2)*s.size,y:(.4+random()*.2)*s.size,r:ZONE_PHASES[0].radius};return {phase:0,mode:'prepare',elapsed:0,current:{x:s.size/2,y:s.size/2,r:s.size*4100/6000},from:{x:s.size/2,y:s.size/2,r:s.size*4100/6000},next:first,damageTick:0}}
function nextCircle(s,previous,radius){const random=s.random||rng(s.seed),travel=Math.max(0,previous.r-radius);for(let i=0;i<300;i++){const a=random()*Math.PI*2,d=Math.sqrt(random())*travel*.82,p={x:previous.x+Math.cos(a)*d,y:previous.y+Math.sin(a)*d,r:radius};if(playable(s,p.x,p.y,40)&&(radius>650||Array.from({length:8},(_,k)=>{const a=k*Math.PI/4;return playable(s,p.x+Math.cos(a)*radius*.55,p.y+Math.sin(a)*radius*.55,0)}).every(Boolean)))return p}return{x:previous.x,y:previous.y,r:radius}}
function advanceZone(s,dt,actors=[]){
 const z=s.zone;let remain=dt;
 while(remain>1e-9&&z.mode!=='finished'){
  const cfg=ZONE_PHASES[z.phase],duration=z.mode==='prepare'?cfg.prepare:cfg.shrink,take=Math.min(remain,duration-z.elapsed);
  z.elapsed+=take;remain-=take;
  if(z.mode==='shrink'){const f=clamp(z.elapsed/cfg.shrink,0,1);for(const k of ['x','y','r'])z.current[k]=z.from[k]+(z.next[k]-z.from[k])*f}
  if(z.elapsed>=duration-1e-8){
   z.elapsed=0;if(z.mode==='prepare'){z.mode='shrink';z.from={...z.current}}
   else if(z.phase===ZONE_PHASES.length-1){z.mode='finished';z.current={...z.next}}
   else{z.phase++;z.mode='prepare';z.from={...z.current};z.next=nextCircle(s,z.current,ZONE_PHASES[z.phase].radius)}
  }
 }
 z.damageTick+=dt;
 while(z.damageTick>=1-1e-9){z.damageTick-=1;const dps=ZONE_PHASES[z.phase].dps;for(const a of actors)if(a.hp>0&&(!a.phase||a.phase==='ground')&&hyp(a,z.current)>z.current.r){a.hp-=dps;a.gasHitUntil=s.time+.3}}
 return z;
}
function zoneCountdown(s){const z=s.zone;if(z.mode==='finished')return 0;const c=ZONE_PHASES[z.phase];return Math.max(0,Math.ceil((z.mode==='prepare'?c.prepare:c.shrink)-z.elapsed))}
function planeRoute(seed){const r=rng(seed^0xabc143),edge=Math.floor(r()*4),offset=650+r()*4700,end=650+r()*4700,a=edge===0?{x:160,y:offset}:edge===1?{x:5840,y:offset}:edge===2?{x:offset,y:160}:{x:offset,y:5840},b=edge===0?{x:5840,y:end}:edge===1?{x:160,y:end}:edge===2?{x:end,y:5840}:{x:end,y:160};a.x*=MAP_SCALE;a.y*=MAP_SCALE;b.x*=MAP_SCALE;b.y*=MAP_SCALE;return{start:a,end:b,angle:Math.atan2(b.y-a.y,b.x-a.x),duration:hyp(a,b)/(220*MAP_SCALE)}}
function planePosition(route,time){const f=clamp(time/route.duration,0,1);return{x:route.start.x+(route.end.x-route.start.x)*f,y:route.start.y+(route.end.y-route.start.y)*f}}
return{SIZE:SIZE*MAP_SCALE,MAP_SCALE,PLAYER_RADIUS,PLAYER_SPEED,PARACHUTE_SPEED,DROP_SECONDS,GROUND_GUN_COUNT,PUMP_FULL_HIT_DAMAGE,configurePumpShot,applyPumpHit,solidHit,LOCATIONS:LOCATIONS.map(l=>({...l,x:l.x*MAP_SCALE,y:l.y*MAP_SCALE})),ZONE_PHASES,COAST:COAST.map(([x,y])=>[x*MAP_SCALE,y*MAP_SCALE]),SpatialIndex,rng,clamp,hyp,pointSegment,circleRect,buildWorld,playable,isWater,blocked,findValid,resolveActorOverlap,moveActor,raycast,segmentHitCircle,buildingAt,bushAt,apertureDistance,canViewInterior,doorSwingAway,doorPose,doorAngleAt,doorInteractionDistance,canSee,interactDoor,interactionTarget,openContainer,damageObject,advanceZone,zoneCountdown,planeRoute,planePosition,bounds};
});





