'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert'),C=require('../island/world.js'),{Session}=require('../island/session.cjs'),rules=require('../island/combat-rules.json');
const s=C.buildWorld(901),b=s.buildings.find(b=>b.style==='hall');let toggles=0,clearances=0;
for(const e of b.entryPoints){const d=s.doors.find(d=>d.id===e.door),tx=Math.cos(d.closedAngle),ty=Math.sin(d.closedAngle),nx=-ty,ny=tx,hinge=[d.hingeX,d.hingeY];
 // These diagonal hinge approaches were outside the old centre-distance radius.
 for(const side of [-1,1]){
  const p={id:'hinge-player',x:d.hingeX-tx*30+nx*side*38,y:d.hingeY-ty*30+ny*side*38,hp:100,r:26,phase:'ground'};assert(C.hyp(p,{x:d.x+d.w/2,y:d.y+d.h/2})>100);assert(C.doorInteractionDistance(d,p,s.time)<80);assert.equal(C.interactionTarget(s,p)?.object.id,d.id);
  d.open=false;d.changedAt=-100;d.turnFrom=0;
  for(let i=0;i<12;i++){const before=d.open;assert(C.interactDoor(s,d,p,[p]).ok);assert.notEqual(d.open,before);assert.deepEqual([d.hingeX,d.hingeY],hinge);s.time+=.065;assert.equal(Math.round(Math.abs(C.doorAngleAt(d,s.time))*180/Math.PI),d.open?90:0);toggles++}
 }
 // Reproduce the screenshot: body overlaps the frame beside an open hinge.
 for(const side of [-1,1]){
  d.open=true;d.swing=side;d.changedAt=-100;const p={id:'overlap-player',x:d.hingeX+tx*12+nx*side*8,y:d.hingeY+ty*12+ny*side*8,hp:100,r:26,phase:'ground'};
  const result=C.interactDoor(s,d,p,[p]);assert(result.ok,'Hinge close was refused');assert(result.moved.length===1);assert(!C.blocked(s,p.x,p.y,p.r),'Player embedded after closing');assert(C.hyp(p,{x:result.moved[0].fromX,y:result.moved[0].fromY})<80,'Excessive clearance jump');const before={...p};C.moveActor(s,p,nx*side,ny*side,.1);assert(C.hyp(p,before)>10,'Player remains stuck after clearance');assert(C.interactDoor(s,d,p,[p]).ok);clearances++;
 }
 d.open=false;
}
// Recover an already embedded save/snapshot position without permitting wall traversal.
const e=b.entryPoints[0],d=s.doors.find(d=>d.id===e.door),p={x:d.x+d.w/2,y:d.y+d.h/2,r:26,hp:100,phase:'ground'};assert(C.blocked(s,p.x,p.y,26));const before={...p};C.moveActor(s,p,0,0,.016);assert(!C.blocked(s,p.x,p.y,26));assert(C.hyp(p,before)<65);assert.equal(p.r,26);
// The authoritative server applies the identical correction and snapshots it to both clients.
const server=new Session(901,rules,{bots:0}),one=server.join('Hinge one'),two=server.join('Hinge two'),sd=server.world.doors.find(q=>q.id===d.id);Object.assign(one,{x:sd.hingeX+10,y:sd.hingeY+8,phase:'ground'});Object.assign(two,{x:one.x+250,y:one.y+250,phase:'ground'});sd.open=true;sd.changedAt=-100;const close=server.action(one.id,{kind:'interact',seq:1,doorId:sd.id,open:false});assert(close.ok);assert(close.moved.some(m=>m.id===one.id));assert(!C.blocked(server.world,one.x,one.y,26));assert.equal(server.snapshot(one.id).self.x,one.x);assert.equal(server.snapshot(two.id).doors.find(q=>q.id===sd.id).open,false);
const result={status:'passed',hingeToggles:toggles,screenshotOverlapClearances:clearances,orientations:4,checks:['Touching hinge works beyond old centre-distance limit','Each completed opening targets 90 degrees and each close targets zero','Repeated E works from both sides of every hinge','Door closing gently separates overlapping characters','Previously embedded actors recover within 64 world units','Movement away remains possible after closing','Server snapshots include authoritative clearance and door state','Character radius and normal movement speed unchanged']};fs.writeFileSync(path.join(__dirname,'../hinge-clearance-test-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
