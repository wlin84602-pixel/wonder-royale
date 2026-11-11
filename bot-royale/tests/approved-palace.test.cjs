const assert=require('assert'),C=require('../island/world.js');let checks=0;for(const seed of [1,42,900]){const s=C.buildWorld(seed);assert.equal(s.buildings.length,11);const centers=s.doors.map(d=>({d,x:d.hingeX+Math.cos(d.closedAngle)*d.length/2,y:d.hingeY+Math.sin(d.closedAngle)*d.length/2}));for(let i=0;i<centers.length;i++)for(let j=i+1;j<centers.length;j++)assert(Math.hypot(centers[i].x-centers[j].x,centers[i].y-centers[j].y)>12,'Duplicate door');for(const {d,x,y}of centers)for(const sign of [-1,1]){const nx=-Math.sin(d.closedAngle)*sign,ny=Math.cos(d.closedAngle)*sign,a={id:'tester',x:x+nx*70,y:y+ny*70,r:26,hp:100,phase:'ground'};d.open=false;d.turnFrom=0;d.changedAt=-100;s.time+=1;assert(C.interactDoor(s,d,a,[]).ok);assert.equal(d.swing,-sign);s.time+=.1;assert(Math.abs(Math.abs(C.doorAngleAt(d,s.time))-Math.PI/2)<1e-8);for(let k=0;k<45;k++){C.moveActor(s,a,-nx,-ny,1/60,205);s.time+=1/60}assert((a.x-x)*nx+(a.y-y)*ny< -45,'Blocked open portal '+d.id+' '+sign);const prior=C.doorAngleAt(d,s.time);C.interactDoor(s,d,a,[]);assert(Math.abs(C.doorAngleAt(d,s.time)-prior)<1e-8);checks++}}
console.log('PASS: '+checks+' bidirectional door passages on three seeded maps; 90 ms swing, mid-animation continuity, 11 rooms and no stacked doors.');

for(const seed of [1,42,900]){
 const world=C.buildWorld(seed);
 const rooms=world.buildings;
 for(let i=0;i<rooms.length;i++){
  for(const other of rooms.slice(i+1)){
   const room=rooms[i];
   const gapX=Math.max(room.x-other.x-other.w,other.x-room.x-room.w);
   const gapY=Math.max(room.y-other.y-other.h,other.y-room.y-room.h);
   assert(Math.max(gapX,gapY)>=112-1e-7,room.name+' crowds '+other.name);
  }
 }
 // Check the two bypasses with the player's full collision radius.
 for(const crate of world.containers)crate.open=true;
 const {ox,oy,scale}=world.palace;
 for(const x of [291,633]){
  for(let y=148;y<=486;y+=4){
   assert(!C.blocked(world,ox+x*scale,oy+y*scale,C.PLAYER_RADIUS),'Blocked north bypass at '+x+', '+y);
  }
 }
}
console.log('PASS: every palace building has at least 112 units of clearance, and both north bypasses are walkable.');
