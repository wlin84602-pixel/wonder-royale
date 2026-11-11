(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?require('./world.js'):root.IslandCore);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ApprovedPalace=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Core){
 'use strict';
 const art=typeof Image==='undefined'?null:new Image();
 const readyPromise=new Promise(resolve=>{
  if(!art){resolve(false);return}
  art.onload=()=>resolve(true);
  art.onerror=()=>resolve(false);
  art.src='__APPROVED_PALACE_OVERVIEW__';
 });
 const ready=()=>Boolean(art?.complete&&art.naturalWidth);
 // Crop the decorative faces only. Walls, windows and doors are drawn from collision geometry.
 const roofsByName={
  'Throne Hall':[329,214,261,175],
  'West Hall':[152,282,146,99],
  'East Hall':[616,282,153,99],
  'West Tower':[150,151,113,109],
  'East Tower':[655,151,113,109],
  'Jade Pavilion':[159,475,112,83],
  'Azure Pavilion':[650,475,112,83],
  'West Lodge':[310,609,99,73],
  'East Lodge':[514,609,102,73],
  'West Gate':[317,725,76,58],
  'East Gate':[528,725,76,58]
 };
 function outline(ctx,building,inset=0){
  const cx=building.x+building.w/2,cy=building.y+building.h/2;
  const sx=1-inset*2/building.w,sy=1-inset*2/building.h;
  ctx.beginPath();
  building.outline.forEach(([x,y],i)=>{
   const px=cx+(x-cx)*sx,py=cy+(y-cy)*sy;
   if(i===0)ctx.moveTo(px,py);
   else ctx.lineTo(px,py);
  });
  ctx.closePath();
 }
 function tiles(ctx,x,y,w,h,size,color,joint){
  ctx.fillStyle=color;
  ctx.fillRect(x,y,w,h);
  ctx.fillStyle=joint;
  for(let row=0;row*size<h;row++){
   for(let col=row%2;col*size<w;col+=2)ctx.fillRect(x+col*size,y+row*size,Math.min(size,w-col*size),Math.min(size,h-row*size));
  }
 }
 function base(ctx,state){
  if(!state.palace)return false;
  const {ox,oy,scale}=state.palace;
  ctx.save();
  ctx.translate(ox,oy);
  ctx.scale(scale,scale);
  ctx.fillStyle='#8e7044';
  ctx.beginPath();
  ctx.roundRect(87,122,751,656,8);
  ctx.fill();
  tiles(ctx,90,125,745,650,26,'#ebdbbc','#e5d4b3');
  // A central promenade and stone thresholds distinguish walking routes from structures.
  ctx.fillStyle='#d5bf95';
  ctx.fillRect(431,417,62,405);
  ctx.fillRect(90,489,745,54);
  ctx.fillRect(449,125,26,27);
  ctx.beginPath();
  ctx.moveTo(291,516);
  ctx.lineTo(291,148);
  ctx.lineTo(633,148);
  ctx.lineTo(633,516);
  ctx.lineJoin='round';
  ctx.strokeStyle='#d5bf95';
  ctx.lineWidth=22;
  ctx.stroke();
  ctx.restore();

  for(const building of state.buildings){
   if(!building.palace)continue;
   for(const entry of building.entryPoints){
    const door=state.doors.find(item=>item.id===entry.door);
    if(!door)continue;
    ctx.save();
    ctx.translate(door.hingeX,door.hingeY);
    ctx.rotate(door.closedAngle);
    ctx.fillStyle='#cbb38b';
    ctx.fillRect(-10,-49,door.length+20,53);
    ctx.fillStyle='#fff0c8';
    ctx.fillRect(0,-16,door.length,22);
    ctx.restore();
   }
   ctx.save();
   outline(ctx,building);
   ctx.clip();
   tiles(ctx,building.x,building.y,building.w,building.h,60,building.floorColor,'#ffffff36');
   outline(ctx,building,23);
   ctx.strokeStyle='#bb903f';
   ctx.lineWidth=3;
   ctx.stroke();
   ctx.restore();
  }
  return true;
 }
 function roof(ctx,building){
  const crop=roofsByName[building.name];
  if(!crop)return false;
  const inset=12;
  ctx.save();
  outline(ctx,building,inset);
  ctx.fillStyle=building.roofColor;
  ctx.fill();
  ctx.strokeStyle='#4c2947';
  ctx.lineWidth=4;
  ctx.stroke();
  const artInset=building.name.endsWith('Hall')?20:inset;
  outline(ctx,building,artInset);
  ctx.clip();
  if(ready()){
   ctx.imageSmoothingEnabled=true;
   ctx.imageSmoothingQuality='high';
   ctx.drawImage(art,...crop,building.x+artInset,building.y+artInset,building.w-2*artInset,building.h-2*artInset);
  }
  ctx.restore();
  return true;
 }
 function roofs(ctx,state,viewer,visible,dt){
  if(!state.palace)return false;
  const onGround=!viewer.phase||viewer.phase==='ground';
  const inside=onGround?Core.buildingAt(state,viewer):null;
  for(const building of state.buildings){
   if(!building.palace||!visible(building))continue;
   // Cached plane rendering always draws fully opaque roofs and does not change player state.
   const entered=inside?.id===building.id;
   let alpha=1;
   if(onGround){
    const previous=building.roofAlpha??1,target=entered?0:1;
    alpha=previous+Math.sign(target-previous)*Math.min(Math.abs(target-previous),Math.max(0,dt??.016)/.12);
    building.roofAlpha=alpha;
   }
   if(alpha<=0)continue;
   ctx.save();
   ctx.globalAlpha*=alpha;
   if(onGround&&(entered||Core.canViewInterior(state,building,viewer))){
    ctx.beginPath();
    ctx.rect(building.x,building.y,building.w,building.h);
    ctx.moveTo(viewer.x+85,viewer.y);
    ctx.arc(viewer.x,viewer.y,85,0,Math.PI*2);
    ctx.clip('evenodd');
   }
   roof(ctx,building);
   ctx.restore();
  }
  return true;
 }
 function object(ctx,item,time){
  if(item.kind!=='door'||!item.id.startsWith('palace-'))return false;
  const pose=Core.doorPose(item,time);
  ctx.save();
  ctx.translate(pose.hingeX,pose.hingeY);
  ctx.rotate(pose.angle);
  ctx.fillStyle='#863492';
  ctx.strokeStyle='#392643';
  ctx.lineWidth=4;
  ctx.beginPath();
  ctx.roundRect(0,-7,item.length,14,4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle='#f7cd67';
  ctx.fillRect(5,-3,item.length-10,3);
  ctx.fillStyle='#fff1ba';
  ctx.beginPath();
  ctx.arc(item.length-13,2,3,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
  return true;
 }
 return{ready,readyPromise,base,roof,roofs,object};
});
