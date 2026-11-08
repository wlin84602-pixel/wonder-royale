(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.IslandBuildings=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const ROOM_SCALE=1.4,BUILDING_COUNT=85,MIN_GAP=200;
const TYPES=['house','market','garage','barn','poolhouse','kitchen','lounge','octagon','bedroom','diner','hall','warehouse'];

function addPalace(s){
 const F=2.8,ox=4200,oy=1600,X=v=>ox+v*F,Y=v=>oy+v*F;
 s.palace={x:X(60),y:Y(105),w:780*F,h:700*F,scale:F,ox,oy};const p=s.palace;
 const inside=(x,y)=>x>p.x-150&&x<p.x+p.w+150&&y>p.y-150&&y<p.y+p.h+150;
 const removed=new Set(s.buildings.filter(b=>b.x<p.x+p.w+150&&b.x+b.w>p.x-150&&b.y<p.y+p.h+150&&b.y+b.h>p.y-150).map(b=>b.id));s.buildings=s.buildings.filter(b=>!removed.has(b.id));s.objects=s.objects.filter(o=>!removed.has(o.building));s.doors=s.doors.filter(o=>!removed.has(o.building));s.containers=s.containers.filter(o=>!removed.has(o.building));
 s.water=s.water.filter(w=>{const x=w.kind==='lake'?w.x-w.rx:Math.min(w.ax,w.bx)-w.r,y=w.kind==='lake'?w.y-w.ry:Math.min(w.ay,w.by)-w.r,ww=w.kind==='lake'?w.rx*2:Math.abs(w.ax-w.bx)+w.r*2,hh=w.kind==='lake'?w.ry*2:Math.abs(w.ay-w.by)+w.r*2;return !(x<p.x+p.w+150&&x+ww>p.x-150&&y<p.y+p.h+150&&y+hh>p.y-150)});s.roads=s.roads.filter(r=>!r.points.some(([x,y])=>inside(x,y)));s.fields=s.fields.filter(f=>!inside(f.x,f.y));
 const id=k=>'palace-'+k+'-'+s.nextId++,put=o=>{o.id=id(o.kind);s.objects.push(o);return o};
 function line(kind,a,b,building){return put({kind,shape:'segment',ax:X(a[0]),ay:Y(a[1]),bx:X(b[0]),by:Y(b[1]),x:X(Math.min(a[0],b[0]))-9,y:Y(Math.min(a[1],b[1]))-9,w:Math.abs(a[0]-b[0])*F+18,h:Math.abs(a[1]-b[1])*F+18,r:9,solid:true,blocksShots:true,building,paint:'palace'})}
 function edge(a,b,building,portal=false){const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),at=t=>[a[0]+dx*t,b? a[1]+dy*t:0];if(!portal){line('wall',a,b,building);return}const rm=s.buildings.find(b=>b.id===building),mid=dy===0&&a[1]===((rm?.y||0)-oy)/F&&['West Hall','East Hall'].includes(rm?.name)?((rm.name==='West Hall'?190:710)-a[0])/dx:.5;const gap=(96/F)/len,lo=mid-gap/2,hi=mid+gap/2;for(const [u,v] of [[0,lo],[hi,1]]){const pad=(v-u)*.24;line('wall',at(u),at(u+pad),building);line('window',at(u+pad),at(v-pad),building);line('wall',at(v-pad),at(v),building)}const h=at(lo),tip=at(hi),d=put({kind:'door',shape:'rect',x:X(h[0])-(dx===0?9:0),y:Y(h[1])-(dy===0?9:0),w:dx===0?18:96,h:dy===0?18:96,hingeX:X(h[0]),hingeY:Y(h[1]),closedAngle:Math.atan2(dy,dx),length:96,solid:true,blocksShots:true,building,exterior:true,open:false,lastUse:-100,changedAt:-1,angle:0,swing:1});s.doors.push(d);const room=s.buildings.find(b=>b.id===building);room?.entryPoints.push({x:(X(h[0])+X(tip[0]))/2+dy/len*70,y:(Y(h[1])+Y(tip[1]))/2-dx/len*70,door:d.id})}
 const rooms=[[295,182,305,225,'Throne Hall','#87315e','#f4e4cb'],[114,256,180,150,'West Hall','#873caf','#e7aa5c'],[600,256,185,150,'East Hall','#873caf','#f1cfb3'],[130,138,120,120,'West Tower','#87315e','#d6b7e6'],[650,138,120,120,'East Tower','#87315e','#f4e4cb'],[140,472,115,98,'Jade Pavilion','#208e8c','#bde5be'],[645,472,115,98,'Azure Pavilion','#208e8c','#b6d7e8'],[298,610,99,83,'West Lodge','#ac65b3','#edba72'],[508,610,99,83,'East Lodge','#ac65b3','#b8e4d9'],[308,728,67,72,'West Gate','#ac65b3','#f4e4cb'],[524,728,67,72,'East Gate','#ac65b3','#f4e4cb']];
 for(const [x,y,w,h,name,roof,floor]of rooms){const b={id:id('room'),loc:'palace',x:X(x),y:Y(y),w:w*F,h:h*F,style:'palace',palace:true,name,roofColor:roof,floorColor:floor,floor:'tile',entryPoints:[],rooms:[],wallThickness:18};const cut=name.includes('Tower')?35:0;b.outline=(cut?[[x+cut,y],[x+w-cut,y],[x+w,y+cut],[x+w,y+h-cut],[x+w-cut,y+h],[x+cut,y+h],[x,y+h-cut],[x,y+cut]]:[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]).map(([a,b])=>[X(a),Y(b)]);s.buildings.push(b);for(let i=0;i<b.outline.length;i++){const a=b.outline[i],c=b.outline[(i+1)%b.outline.length];edge([(a[0]-ox)/F,(a[1]-oy)/F],[(c[0]-ox)/F,(c[1]-oy)/F],b.id,Math.abs(a[1]-c[1])<1&&(a[1]===Y(y+h)||name.endsWith('Hall')&&name!=='Throne Hall'&&a[1]===Y(y)))}}
 // Perimeter has the existing hinged doors; the broad southern entrance stays open.
 edge([35,70],[865,70],null,true);for(const xx of [35,865])for(const [a,b,portal]of [[70,285,false],[285,360,true],[360,500,false],[500,575,true],[575,800,false]])edge([xx,a],[xx,b],null,portal);edge([35,800],[308,800],null,false);edge([591,800],[865,800],null,false);
 put({kind:'sofa',shape:'rect',x:X(430),y:Y(210),w:100,h:100,solid:true,blocksShots:true,building:s.buildings.find(b=>b.name==='Throne Hall').id,color:'#9a3675'});
 put({kind:'rock',shape:'circle',x:X(450),y:Y(525),r:48*F,solid:true,blocksShots:true,palaceFountain:true});
 const unique=[];for(const d of s.doors.filter(d=>d.id.startsWith('palace-'))){const mx=d.hingeX+Math.cos(d.closedAngle)*d.length/2,my=d.hingeY+Math.sin(d.closedAngle)*d.length/2,existing=unique.find(o=>Math.hypot(o.mx-mx,o.my-my)<12);if(existing){s.objects=s.objects.filter(o=>o!==d);s.doors=s.doors.filter(o=>o!==d);for(const b of s.buildings)for(const e of b.entryPoints)if(e.door===d.id)e.door=existing.d.id}else unique.push({d,mx,my})}
 s.locations.push({id:'palace',name:'Wonderlust Palace',x:X(450),y:Y(525),kind:'palace',color:'#e5c561',risk:'high'});
}

function populate(s,random,tools){
 const {playable,pointSegment,SpatialIndex}=tools,plots=new SpatialIndex();
 const id=p=>p+'-'+s.nextId++,put=o=>{o.id=o.id||id(o.kind);s.objects.push(o);return o};
 function make(x,y,type,variant=0,loc='showcase'){
  const wide=['poolhouse','kitchen','lounge','bedroom','diner','hall','warehouse'].includes(type),w=wide?520:480,h=wide?340:380,cut=type==='octagon'?64:0;
  const b={id:id('building'),loc,x,y,w,h,style:type,variant,cutaway:true,roofAlpha:0,floor:['market','garage','lounge','octagon','diner'].includes(type)?'tile':type==='poolhouse'?'sand':'wood',entryPoints:[],rooms:[],wallThickness:18};
  b.outline=cut?[[x+cut,y],[x+w-cut,y],[x+w,y+cut],[x+w,y+h-cut],[x+w-cut,y+h],[x+cut,y+h],[x,y+h-cut],[x,y+cut]]:[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
  s.buildings.push(b);
  const line=(kind,ax,ay,bx,by,extra={})=>put({kind,shape:'segment',ax,ay,bx,by,r:9,x:Math.min(ax,bx)-9,y:Math.min(ay,by)-9,w:Math.abs(bx-ax)+18,h:Math.abs(by-ay)+18,solid:true,blocksShots:true,building:b.id,paint:type==='barn'?'barn':'stone',...extra});
  const item=(kind,xx,yy,ww,hh,extra={})=>put({kind,shape:'rect',x:x+xx,y:y+yy,w:ww,h:hh,solid:true,blocksShots:true,building:b.id,...extra});
  function door(ax,ay,bx,by,exterior=false){
   const dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len,cx=(ax+bx)/2,cy=(ay+by)/2;
   const d=put({kind:'door',shape:'rect',x:Math.min(ax,bx)-(dx===0?9:0),y:Math.min(ay,by)-(dy===0?9:0),w:dx===0?18:Math.abs(dx),h:dy===0?18:Math.abs(dy),solid:true,blocksShots:true,building:b.id,open:false,lastUse:-100,changedAt:-1,angle:0,swing:1,hingeX:ax,hingeY:ay,closedAngle:Math.atan2(dy,dx),length:len,exterior});s.doors.push(d);
   if(exterior)b.entryPoints.push({x:cx-nx*70,y:cy-ny*70,dx:nx,dy:ny,door:d.id});
   return d;
  }
  function edge(a,c,portal=true){
   const dx=c[0]-a[0],dy=c[1]-a[1],len=Math.hypot(dx,dy),tx=dx/len,ty=dy/len,at=d=>[a[0]+tx*d,a[1]+ty*d];
   if(!portal){line('window',...a,...c);return}
   const gap=94,lo=(len-gap)/2,hi=(len+gap)/2;
   for(const [start,end]of [[0,lo],[hi,len]]){
    const span=end-start,window=Math.min(108,span-38),u=start+(span-window)/2,v=u+window;
    line('wall',...at(start),...at(u));line('window',...at(u),...at(v));line('wall',...at(v),...at(end));
   }
   door(...at(lo),...at(hi),true);
  }
  for(let i=0;i<b.outline.length;i++){const a=b.outline[i],c=b.outline[(i+1)%b.outline.length];edge(a,c,Math.abs(c[0]-a[0])<1||Math.abs(c[1]-a[1])<1)}
  function innerWall(ax,ay,bx,by,opening=true,gap=84){
   ax+=x;ay+=y;bx+=x;by+=y;const dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy),tx=dx/len,ty=dy/len,at=t=>[ax+tx*t,ay+ty*t];
   if(!opening){line('wall',ax,ay,bx,by,{interior:true});return}
   const l=(len-gap)/2,r=(len+gap)/2;line('wall',...at(0),...at(l),{interior:true});door(...at(l),...at(r));line('wall',...at(r),...at(len),{interior:true});
  }
  function bath(){
   const rx=w-132;b.rooms.push({x:x+rx,y:y+10,w:122,h:106,floor:'tile'});
   innerWall(rx,10,rx,116,false);innerWall(rx,116,w-10,116,true,104);
   item('toilet',w-57,28,30,40);item('toilet',w-57,73,30,32);item('sink',w-115,26,35,25);
  }
  const crate=(xx,yy)=>item('woodcrate',xx,yy,34,34,{hp:70,destructible:true});
  switch(type){
   case 'house':bath();innerWall(155,10,155,h-10,true);innerWall(10,136,155,136,true);item('counter',105,212,30,89);b.rooms.push({x:x+10,y:y+10,w:136,h:117,floor:'wood'});break;
   case 'market':for(const xx of [105,224,343]){item('shelf',xx,120,28,166);if(xx!==224)item('shelf',xx,52,28,30)}break;
   case 'garage':item('car',w-154,133,88,178);item('workbench',w-76,32,52,69);for(const [xx,yy]of [[28,27],[78,27],[29,h-65],[76,h-65],[28,h-110]])crate(xx,yy);break;
   case 'barn':item('tractor',w-126,74,68,90);for(const xx of [30,w-78])for(const yy of [38,h-88])item('hay',xx,yy,50,47,{hp:70,destructible:true});break;
   case 'poolhouse':bath();item('pool',135,65,170,210);break;
   case 'kitchen':item('counter',w-210,20,175,34);item('counter',w-57,54,22,55);item('mat',195,158,22,22,{solid:false,blocksShots:false});break;
   case 'lounge':bath();item('table',205,148,100,48);item('sofa',w-91,h-101,48,75,{color:'#398ebd'});break;
   case 'octagon':for(const [xx,yy]of [[74,39],[w-126,39],[70,h-81],[w-126,h-81]])crate(xx,yy);item('workbench',w-89,h-97,44,38);break;
   case 'bedroom':bath();innerWall(168,10,168,h-10,true);item('bed',36,48,91,64);item('desk',34,h-83,101,35);break;
   case 'diner':bath();item('counter',30,22,135,42);for(const xx of [85,290]){item('sofa',xx,109,103,32,{color:'#c7494b'});item('table',xx+10,160,83,55);item('sofa',xx,239,103,32,{color:'#c7494b'})}break;
   case 'hall':bath();item('counter',26,28,57,28);break;
   case 'warehouse':for(const [xx,yy]of [[30,h-68],[71,h-68],[30,h-111],[w-70,29],[w-70,72],[w-70,h-68],[w-111,h-68],[w-111,h-111]])crate(xx,yy);break;
  }
  // Expand the floor plan, keeping furniture, wall thickness and characters at their original size.
  const local=s.objects.filter(o=>o.building===b.id),px=v=>x+(v-x)*ROOM_SCALE,py=v=>y+(v-y)*ROOM_SCALE;
  b.w*=ROOM_SCALE;b.h*=ROOM_SCALE;b.outline=b.outline.map(([xx,yy])=>[px(xx),py(yy)]);
  for(const room of b.rooms){room.x=px(room.x);room.y=py(room.y);room.w*=ROOM_SCALE;room.h*=ROOM_SCALE}
  for(const o of local){
   if(o.shape==='segment'){o.ax=px(o.ax);o.ay=py(o.ay);o.bx=px(o.bx);o.by=py(o.by);o.x=Math.min(o.ax,o.bx)-o.r;o.y=Math.min(o.ay,o.by)-o.r;o.w=Math.abs(o.bx-o.ax)+o.r*2;o.h=Math.abs(o.by-o.ay)+o.r*2}
   else if(o.kind==='door'){const vertical=Math.abs(Math.cos(o.closedAngle))<.01;o.hingeX=px(o.hingeX);o.hingeY=py(o.hingeY);o.length*=ROOM_SCALE;o.x=px(o.x+(vertical?o.w/2:0))-(vertical?o.w/2:0);o.y=py(o.y+(vertical?0:o.h/2))-(vertical?0:o.h/2);if(vertical)o.h*=ROOM_SCALE;else o.w*=ROOM_SCALE}
   else{o.x=px(o.x+o.w/2)-o.w/2;o.y=py(o.y+o.h/2)-o.h/2}
  }
  for(const p of b.entryPoints){const d=s.doors.find(d=>d.id===p.door);p.x=d.x+d.w/2-p.dx*70;p.y=d.y+d.h/2-p.dy*70}
  plots.add({...b,shape:'rect'});
  // Interior drops are placed only in reachable, unobstructed floor areas.
  const solids=s.objects.filter(o=>o.building===b.id),candidates=[];
  for(let yy=y+48;yy<y+b.h-40;yy+=34)for(let xx=x+48;xx<x+b.w-40;xx+=34){
   if(b.entryPoints.some(p=>Math.hypot(xx-p.x,yy-p.y)<142)||b.rooms.some(room=>room.floor==='tile'&&xx>room.x&&xx<room.x+room.w&&yy>room.y&&yy<room.y+room.h))continue;
   if(solids.some(o=>tools.solidHit(o,xx,yy,24)))continue;candidates.push({x:xx,y:yy});
  }
  for(let i=0;i<2&&candidates.length;i++){
   const q=candidates.splice(Math.floor(random()*candidates.length),1)[0];s.containers.push({id:id('chest'),...q,kind:i?'ammo':'gold',open:false,hp:60,building:b.id});
   for(let j=candidates.length-1;j>=0;j--)if(Math.hypot(candidates[j].x-q.x,candidates[j].y-q.y)<60)candidates.splice(j,1);
  }
  return b;
 }
 function free(x,y,w,h){
  if(plots.query(x-MIN_GAP,y-MIN_GAP,w+2*MIN_GAP,h+2*MIN_GAP).some(b=>x<b.x+b.w+MIN_GAP&&x+w+MIN_GAP>b.x&&y<b.y+b.h+MIN_GAP&&y+h+MIN_GAP>b.y))return false;
  if(![[x-28,y-28],[x+w+28,y-28],[x+w+28,y+h+28],[x-28,y+h+28],[x+w/2,y+h/2]].every(p=>playable(s,...p,0)))return false;
  if(![[x+w/2,y-70],[x+w+70,y+h/2],[x+w/2,y+h+70],[x-70,y+h/2]].every(p=>playable(s,...p,26)))return false;
  if(s.roads.some(r=>r.points.slice(1).some((p,i)=>pointSegment(x+w/2,y+h/2,...r.points[i],...p)<r.width/2+Math.max(w,h)*.57)))return false;
  return true;
 }
 // Seeded best-candidate placement spreads individual buildings across dry land.
 // No neighborhood grids: every new plot samples the whole island.
 for(let n=0;n<BUILDING_COUNT;n++){
  const type=TYPES[n%TYPES.length],wide=['poolhouse','kitchen','lounge','bedroom','diner','hall','warehouse'].includes(type),w=(wide?520:480)*ROOM_SCALE,h=(wide?340:380)*ROOM_SCALE;
  let best=null,score=-1,valid=0;
  for(let attempt=0;attempt<4000&&valid<18;attempt++){
   const x=100+random()*(s.size-w-200),y=100+random()*(s.size-h-200);if(!free(x,y,w,h))continue;valid++;
   const distance=s.buildings.length?Math.min(...s.buildings.map(b=>Math.hypot(x+w/2-b.x-b.w/2,y+h/2-b.y-b.h/2))):random()*s.size;
   if(distance>score){score=distance;best={x,y}}
  }
  if(!best)throw Error('Not enough separated dry plots: '+n+'/'+BUILDING_COUNT);
  const loc=s.locations.reduce((a,b)=>Math.hypot(best.x-a.x,best.y-a.y)<Math.hypot(best.x-b.x,best.y-b.y)?a:b);
  make(best.x,best.y,type,n,loc.id);
 }
 addPalace(s);return {make};
}
return {TYPES,ROOM_SCALE,BUILDING_COUNT,MIN_GAP,populate,addPalace};
});


