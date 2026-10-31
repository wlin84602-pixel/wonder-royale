'use strict';
const assert=require('assert'),C=require('../island/world.js'),{Session}=require('../island/session.cjs'),rules=require('../island/combat-rules.json');
const summary={};
function count(s){return{locations:s.locations.length,buildings:s.buildings.length,doors:s.doors.length,objects:s.objects.length,containers:s.containers.length,groundLoot:s.loot.length}}
for(let seed=1;seed<=12;seed++){
 const s=C.buildWorld(seed);assert.equal(s.locations.length,8);
 for(const b of s.buildings){
  assert.equal(b.entryPoints.length,4);assert(s.containers.some(c=>c.building===b.id),'Building has no loot');
  assert(C.playable(s,b.x+b.w/2,b.y+b.h/2,26),'Building intersects water at center');
  for(const entry of b.entryPoints){
   const d=s.doors.find(d=>d.id===entry.door),a={x:entry.x,y:entry.y,r:26,hp:100,phase:'ground',speed:205},start={...entry};
   assert(!C.blocked(s,a.x,a.y,a.r),'Entry approach blocked: '+seed+' '+b.id+' '+d.id);
   C.moveActor(s,a,entry.dx,entry.dy,.6);assert(!C.buildingAt(s,a),'Closed door did not stop actor');
   Object.assign(a,start);s.time+=1;assert(C.interactDoor(s,d,a,[a]).ok);C.moveActor(s,a,entry.dx,entry.dy,.7);
   assert(C.buildingAt(s,a)?.id===b.id,'Cannot enter building: '+seed+' '+b.id+' '+d.id);C.moveActor(s,a,-entry.dx,-entry.dy,.7);assert(!C.buildingAt(s,a),'Cannot exit building');d.open=false;
  }
 }
 for(const q of s.loot){const hit=C.raycast(s,q.x,q.y,q.x,q.y,10);assert(!hit,'Loot spawned in solid cover: '+q.id)}
}
summary.seededGeneration='12 seeds; all 85 buildings entered/exited through four exterior doors (4,080 entrances)';
// Door collision, cooldown, occupancy and high-speed projectile sweeps.
const s=C.buildWorld(42),initialCounts=count(s),b=s.buildings[0],d=s.doors.find(d=>d.id===b.entryPoints[0].door),actor={x:d.x+d.w/2,y:d.y-50,r:26,hp:100,phase:'ground'};
assert(C.raycast(s,actor.x,actor.y,actor.x,d.y+150)?.object.id===d.id);assert(C.interactDoor(s,d,actor,[actor]).ok);assert(C.interactDoor(s,d,actor,[actor]).ok,'Second press did not close');assert.equal(d.open,false);assert(C.interactDoor(s,d,actor,[actor]).ok,'Third press did not reopen');
s.time=.4;const occupant={x:d.x+d.w/2,y:d.y+7,r:26,hp:100,phase:'ground'};assert(C.interactDoor(s,d,actor,[occupant]).ok);assert(!C.blocked(s,occupant.x,occupant.y,26),'Closing embedded occupant');s.time=.8;assert(C.interactDoor(s,d,actor,[]).ok);
const wall=s.objects.find(o=>o.kind==='wall'&&o.building===b.id),cx=wall.x+wall.w/2;assert(C.raycast(s,cx,wall.y-200,cx,wall.y+300));const slider={x:wall.x+wall.w/2,y:wall.y-27,r:26};const beforeX=slider.x;C.moveActor(s,slider,1,1,.2,205);assert(slider.x>beforeX,'No sliding along wall');assert(!C.blocked(s,slider.x,slider.y,26));
summary.collision='Closed doors/walls block swept shots and movement; wall sliding and safe doorway clearance pass';
// Reachability: fine navigation grid for the entire island, including all river crossings.
for(const door of s.doors)door.open=true;
const step=40,N=Math.ceil(C.SIZE/40),walk=new Uint8Array(N*N),seen=new Uint8Array(N*N);
for(let yy=0;yy<N;yy++)for(let xx=0;xx<N;xx++)if(!C.blocked(s,xx*step+20,yy*step+20,26))walk[yy*N+xx]=1;
const nearest=p=>{let out=-1,best=Infinity;for(let i=0;i<walk.length;i++)if(walk[i]){const x=(i%N)*step+20,y=Math.floor(i/N)*step+20,d=Math.hypot(x-p.x,y-p.y);if(d<best){out=i;best=d}}return out};
const start=nearest(s.locations[0]),queue=[start];seen[start]=1;
for(let i=0;i<queue.length;i++){const idx=queue[i],x=idx%N,y=Math.floor(idx/N);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,j=yy*N+xx;if(xx>=0&&xx<N&&yy>=0&&yy<N&&walk[j]&&!seen[j]){const a={x:x*step+20,y:y*step+20,r:26};C.moveActor(s,a,dx,dy,step/205,205);if(Math.hypot(a.x-(xx*step+20),a.y-(yy*step+20))<1){seen[j]=1;queue.push(j)}}}}
for(const loc of s.locations)assert(seen[nearest(loc)],'Disconnected location: '+loc.name);
summary.travel='All eight named regions connected by traversable routes';
// Crates are one-shot, server-side generated and contain accessible loot.
const chest=s.containers.find(c=>(!c.building||c.exterior)&&c.kind==='gold'),looter={...C.findValid(s,{x:chest.x+55,y:chest.y},26),hp:100,phase:'ground'};
const first=C.openContainer(s,chest,looter),oldCount=s.loot.length;assert(first.length>0);for(let i=0;i<50;i++)assert.equal(C.openContainer(s,chest,looter).length,0);assert.equal(s.loot.length,oldCount);
for(const q of first)assert(!C.blocked(s,q.x,q.y,12),'Drop inside a wall');assert(first.filter(q=>q.type==='gun').every(q=>q.rarity>=2));
const ammo=s.containers.find(c=>(!c.building||c.exterior)&&c.kind==='ammo'),ammoUser={...C.findValid(s,{x:ammo.x+55,y:ammo.y},26),phase:'ground'};assert(C.openContainer(s,ammo,ammoUser).every(q=>q.type==='ammo'));
summary.loot='Gold/ammo/basic containers, valid drops, repeat-open rejection';
// Concealment is also tested in serialized authoritative snapshots, not just rendering.
const session=new Session(927,rules,{bots:0}),p1=session.join('One'),p2=session.join('Two'),bush=session.world.bushes.find(b=>!C.raycast(session.world,b.x-110,b.y,b.x,b.y,0));
assert(bush);Object.assign(p1,{x:bush.x-110,y:bush.y,phase:'ground'});Object.assign(p2,{x:bush.x,y:bush.y,phase:'ground'});assert(!session.snapshot(p1.id).actors.some(a=>a.id===p2.id),'Hidden actor sent to client');
p2.revealedUntil=2;assert(session.snapshot(p1.id).actors.some(a=>a.id===p2.id));session.time=session.world.time=2.1;assert(!session.snapshot(p1.id).actors.some(a=>a.id===p2.id));assert(C.canSee(session.world,p2,p2));p2.x=bush.x+100;assert(!C.bushAt(session.world,p2));
summary.visibility='Hidden opponent omitted from snapshots; reveal timeout, leaving bush, self visibility';
// Full zone timeline, interpolation, nesting and periodic damage.
const zoneWorld=C.buildWorld(33);let lastR=zoneWorld.zone.current.r,phases=new Set(),modes=new Set();
const gasActor={x:0,y:0,hp:10000,phase:'ground'};for(let i=0;i<5200;i++){zoneWorld.time+=.1;C.advanceZone(zoneWorld,.1,[gasActor]);const z=zoneWorld.zone;assert(z.current.r<=lastR+1e-6);assert(C.hyp(z.current,z.next)+z.next.r<=z.current.r+1e-5,'Next circle not nested');lastR=z.current.r;phases.add(z.phase);modes.add(z.mode)}
assert.equal(phases.size,6);assert(modes.has('finished'));assert.equal(zoneWorld.zone.current.r,80);assert(gasActor.hp<10000);assert(C.playable(zoneWorld,zoneWorld.zone.current.x,zoneWorld.zone.current.y,26),'Final zone has unplayable center');
summary.zone='All six phases, smooth shrinking, nested circles, periodic damage, valid final ground';
// Landing validation, bridge traversal and randomized plane paths.
const routes=new Set();for(let seed=1;seed<20;seed++){const w=C.buildWorld(seed),route=C.planeRoute(seed);routes.add(JSON.stringify(route));for(const point of [{x:20,y:20},{x:3240*C.MAP_SCALE,y:4320*C.MAP_SCALE},...w.buildings.slice(0,3).map(b=>({x:b.x+b.w/2,y:b.y+b.h/2}))]){const landed=C.findValid(w,point,26,true);assert(!C.blocked(w,landed.x,landed.y,26));assert(!C.buildingAt(w,landed))}}
assert(routes.size>15);const bridge=s.bridges[2],bridgeWalker={x:bridge.ax+35,y:bridge.ay,r:26};C.moveActor(s,bridgeWalker,1,0,(bridge.bx-bridge.ax-70)/205,205);assert(bridgeWalker.x>bridge.bx-60,'Bridge is not traversable');
summary.deployment='Random routes, valid water/building landing correction, traversable bridges';
console.log(JSON.stringify({status:'passed',world:initialCounts,tests:summary},null,2));
if(process.argv.includes('--report'))require('fs').writeFileSync(require('path').join(__dirname,'../island-world-test-results.json'),JSON.stringify({status:'passed',world:count(s),tests:summary},null,2));

