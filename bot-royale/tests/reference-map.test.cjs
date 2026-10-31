'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert'),{performance}=require('perf_hooks'),C=require('../island/world.js'),{Session}=require('../island/session.cjs'),rules=require('../island/combat-rules.json');
const s=C.buildWorld(901);assert(Math.abs(C.SIZE**2/6000**2-10)<1e-12);assert.equal(s.buildings.length,85);assert.equal(new Set(s.buildings.map(b=>b.style)).size,12);assert(s.objects.filter(o=>o.kind==='window').length>600);
for(const d of s.doors){d.open=true;d.lastUse=-100}
let roomChecks=0;
for(const b of s.buildings)for(const room of b.rooms||[]){
 let point;for(let yy=room.y+30;yy<room.y+room.h-24&&!point;yy+=6)for(let xx=room.x+30;xx<room.x+room.w-24;xx+=6)if(!C.blocked(s,xx,yy,26)){point={x:xx,y:yy};break}
 assert(point,'No player-sized space in room: '+b.id+' '+b.style);roomChecks++;
}
const diagonal=s.objects.find(o=>o.shape==='segment'&&o.ax!==o.bx&&o.ay!==o.by),cx=(diagonal.ax+diagonal.bx)/2,cy=(diagonal.ay+diagonal.by)/2,dx=diagonal.bx-diagonal.ax,dy=diagonal.by-diagonal.ay,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
assert(C.solidHit(diagonal,cx,cy,26));assert.equal(C.raycast(s,cx-nx*60,cy-ny*60,cx+nx*60,cy+ny*60)?.object.id,diagonal.id,'Shots pass through diagonal window');
const actor={x:cx-nx*70,y:cy-ny*70,r:26};C.moveActor(s,actor,nx,ny,.6);assert((actor.x-cx)*nx+(actor.y-cy)*ny<0,'Actor crossed diagonal window');
const b=s.buildings.find(b=>b.style==='house'),entry=b.entryPoints[0],door=s.doors.find(d=>d.id===entry.door);door.open=false;s.time=1;assert(C.interactDoor(s,door,{...entry,phase:'ground'},[]).ok);const fromOutside=door.swing;s.time=2;assert(C.interactDoor(s,door,{...entry,phase:'ground'},[]).ok);s.time=3;assert(C.interactDoor(s,door,{x:door.x+door.w/2+entry.dx*60,y:door.y+door.h/2+entry.dy*60,phase:'ground'},[]).ok);assert.equal(door.swing,-fromOutside);
const route=C.planeRoute(901);assert(Math.max(route.start.x,route.start.y,route.end.x,route.end.y)>18000);assert(C.hyp(C.planePosition(route,route.duration),route.end)<1e-8);
const session=new Session(901,rules),p=session.join('Expanded test');Object.assign(p,{x:C.SIZE*.75,y:C.SIZE*.6,phase:'parachute',dropRemaining:10});session.input(p.id,{seq:1,dx:1,dy:0,aim:0,fire:false,slot:0});session.step(.5);assert(p.x>C.SIZE*.75,'Glide was clamped to old map bounds');
const snapshot=session.snapshot(p.id);assert(snapshot.doors.length<session.world.doors.length/4,'Unnecessary global door broadcast');assert(snapshot.doors.every(d=>Number.isFinite(d.swing)));
const start=performance.now();for(let tick=0;tick<1200;tick++)session.step(1/30);const elapsed=performance.now()-start;const data={status:'passed',areaMultiplier:10,size:C.SIZE,buildings:85,types:12,roomChecks,windowCollision:'straight and diagonal block players/projectiles',doorPush:'outside/inside reverse correctly',plane:'crosses the full enlarged island',glide:'past old 6000-unit boundary',nearbyDoorsPerSnapshot:snapshot.doors.length,allDoors:session.world.doors.length,simulation:{ticks:1200,actors:session.actors.size,averageStepMs:+(elapsed/1200).toFixed(3)}};
fs.writeFileSync(path.join(__dirname,'../reference-map-test-results.json'),JSON.stringify(data,null,2));console.log(JSON.stringify(data,null,2));
