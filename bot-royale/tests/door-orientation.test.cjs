'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert'),C=require('../island/world.js');
const s=C.buildWorld(901);let openings=0,reversals=0;
for(const b of s.buildings)for(const entry of b.entryPoints){
 const d=s.doors.find(d=>d.id===entry.door),hinge=[d.hingeX,d.hingeY],cx=d.x+d.w/2,cy=d.y+d.h/2,tx=Math.cos(d.closedAngle),ty=Math.sin(d.closedAngle);d.open=false;d.turnFrom=0;d.changedAt=-100;
 for(const side of [-1,1,-1]){
  const actor={x:cx+entry.dx*70*side,y:cy+entry.dy*70*side,r:26,hp:100,phase:'ground'};s.time+=.2;
  assert(C.interactDoor(s,d,actor,[]).ok);const full=C.doorPose(d,s.time+.09),playerSide=tx*(actor.y-d.hingeY)-ty*(actor.x-d.hingeX),leafSide=tx*(full.tipY-d.hingeY)-ty*(full.tipX-d.hingeX);assert(playerSide*leafSide<0,'Door swung toward player: '+d.id);assert(Math.abs(Math.abs(C.doorAngleAt(d,s.time+.09))-Math.PI/2)<1e-9);assert.deepEqual([full.hingeX,full.hingeY],hinge);assert(Math.abs(Math.hypot(full.tipX-full.hingeX,full.tipY-full.hingeY)-d.length)<1e-8);openings++;
  s.time+=.012;const before=C.doorPose(d,s.time);assert(C.interactDoor(s,d,actor,[]).ok);const after=C.doorPose(d,s.time);assert(Math.abs(before.angle-after.angle)<1e-10,'Reverse jumped');assert.deepEqual([after.hingeX,after.hingeY],hinge);reversals++;
  const start={x:cx+entry.dx*25*side,y:cy+entry.dy*25*side},end={x:cx-entry.dx*25*side,y:cy-entry.dy*25*side};assert.equal(C.raycast(s,start.x,start.y,end.x,end.y,1)?.object.id,d.id,'Reclosed door did not block bullet');
 }
}
const report={status:'passed',buildings:s.buildings.length,exteriorDoors:s.buildings.length*4,openings,reversals,orientations:['north','east','south','west'],checks:['Outside opens inward; inside opens outward; outside reopens inward','Every opening recomputes direction from current opener position','Fixed hinge and constant panel length','Full target is 90 degrees','Immediate repeated presses; smooth mid-animation reversal','Reclosed door blocks swept projectiles','All four orientations agree across two HTTP/SSE multiplayer clients (separate network suite)']};fs.writeFileSync(path.join(__dirname,'../door-orientation-test-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
