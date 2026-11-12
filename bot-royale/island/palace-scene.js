(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?require('./world.js'):root.IslandCore);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ApprovedPalace=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Core){
 'use strict';
 const palettes={
  'Throne Hall':['#55224f','#903666','#fff0ce','sun'],
  'West Hall':['#422453','#763667','#fff0ce','diamond'],
  'East Hall':['#422453','#763667','#fff0ce','diamond'],
  'West Tower':['#492352','#743665','#fff1cf','flower'],
  'East Tower':['#492352','#743665','#fff1cf','flower'],
  'Jade Pavilion':['#153f4b','#28656a','#e9f4df','flower'],
  'Azure Pavilion':['#153f4b','#28656a','#e9f4df','flower'],
  'West Lodge':['#4d2b60','#875281','#fff0ce','sun'],
  'East Lodge':['#224050','#4a6f7d','#e9f4df','sun'],
  'West Gate':['#512c54','#803f67','#fff0ce','diamond'],
  'East Gate':['#512c54','#803f67','#fff0ce','diamond']
 };
 function gradient(ctx,x,y,x2,y2,light,dark){
  const fill=ctx.createLinearGradient(x,y,x2,y2);
  fill.addColorStop(0,light);
  fill.addColorStop(1,dark);
  return fill;
 }
 function disk(ctx,x,y,r,fill,stroke,width=2){
  ctx.beginPath();
  ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fillStyle=fill;
  ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}
 }
 function star(ctx,r,inner,points){
  ctx.beginPath();
  for(let i=0;i<points*2;i++){
   const angle=i*Math.PI/points-Math.PI/2,radius=i%2?inner:r;
   const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius;
   if(i===0)ctx.moveTo(x,y);
   else ctx.lineTo(x,y);
  }
  ctx.closePath();
 }
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
  ctx.beginPath();
  for(let offset=size;offset<w;offset+=size){ctx.moveTo(x+offset,y);ctx.lineTo(x+offset,y+h)}
  for(let offset=size;offset<h;offset+=size){ctx.moveTo(x,y+offset);ctx.lineTo(x+w,y+offset)}
  ctx.strokeStyle='#86643b24';
  ctx.lineWidth=size*.023;
  ctx.stroke();
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
   if(building.name==='Throne Hall'){
    const center=building.x+building.w/2,top=building.y+47,height=building.h-154;
    ctx.fillStyle=gradient(ctx,center-75,top,center+75,top,'#803655','#a95271');
    ctx.beginPath();
    ctx.roundRect(center-74,top,148,height,16);
    ctx.fill();
    ctx.strokeStyle='#ad7137';
    ctx.lineWidth=7;
    ctx.stroke();
    ctx.strokeStyle='#edc373';
    ctx.lineWidth=3;
    ctx.stroke();
   }
   outline(ctx,building,23);
   ctx.strokeStyle='#bb903f';
   ctx.lineWidth=3;
   ctx.stroke();
   ctx.restore();
  }
  return true;
 }
 function roof(ctx,building){
  const palette=palettes[building.name];
  if(!palette)return false;
  const [shadow,accent,ivory,motif]=palette;
  const {x,y,w,h}=building,cx=x+w/2,cy=y+h/2;
  const shortest=Math.min(w,h),rim=Math.max(15,shortest*.075);
  ctx.save();
  ctx.lineJoin='round';
  outline(ctx,building,10);
  ctx.fillStyle=shadow;
  ctx.fill();
  ctx.strokeStyle='#302332';
  ctx.lineWidth=5;
  ctx.stroke();
  ctx.clip();
  outline(ctx,building,14);
  ctx.fillStyle=gradient(ctx,x,y,x+w,y+h,accent,shadow);
  ctx.fill();
  ctx.strokeStyle='#edba59';
  ctx.lineWidth=4;
  ctx.stroke();
  outline(ctx,building,rim+10);
  ctx.fillStyle=gradient(ctx,x,y,x,y+h,ivory,'#dbc49d');
  ctx.fill();
  ctx.strokeStyle='#9b632b';
  ctx.lineWidth=7;
  ctx.stroke();
  ctx.strokeStyle='#ffdb85';
  ctx.lineWidth=3;
  ctx.stroke();
  ctx.clip();
  // Fine seams and inset corner details keep the roof legible at close zoom.
  ctx.beginPath();
  for(let seam=x+rim+55;seam<x+w-rim-34;seam+=44){
   ctx.moveTo(seam,y+rim);
   ctx.lineTo(seam,y+h-rim);
  }
  ctx.strokeStyle='#93724123';
  ctx.lineWidth=1.5;
  ctx.stroke();
  if(building.outline.length===4){
   for(const sx of [-1,1])for(const sy of [-1,1]){
    ctx.save();
    ctx.translate(cx+sx*(w/2-rim-24),cy+sy*(h/2-rim-24));
    ctx.scale(-sx,-sy);
    ctx.beginPath();
    ctx.moveTo(0,25);
    ctx.lineTo(0,9);
    ctx.quadraticCurveTo(0,0,9,0);
    ctx.lineTo(25,0);
    ctx.strokeStyle='#a36e35';
    ctx.lineWidth=4;
    ctx.stroke();
    ctx.strokeStyle='#ffe2a0';
    ctx.lineWidth=2;
    ctx.stroke();
    disk(ctx,8,8,2.5,'#ac783f');
    ctx.restore();
   }
  }
  if(building.name.endsWith('Hall')){
   ctx.fillStyle=gradient(ctx,x,cy-12,x,cy+12,accent,shadow);
   ctx.fillRect(x,cy-13,w,26);
   ctx.fillStyle='#e9b958';
   ctx.fillRect(x,cy-15,w,3);
   ctx.fillRect(x,cy+12,w,3);
  }
  const r=shortest*(building.name==='Throne Hall'?.28:.255);
  ctx.translate(cx,cy);
  disk(ctx,0,0,r+6,'#5a382d','#503434');
  disk(ctx,0,0,r+3,gradient(ctx,-r,-r,r,r,'#fff0a6','#b4772e'),'#bd843a');
  disk(ctx,0,0,r-3,gradient(ctx,-r,-r,r,r,accent,shadow),'#694036');
  for(let i=0;i<8;i++){
   const angle=i*Math.PI/4;
   disk(ctx,Math.cos(angle)*r,Math.sin(angle)*r,2,'#fff0a1');
  }
  const points=motif==='sun'?12:4;
  if(motif==='flower'){
   ctx.beginPath();
   for(let i=0;i<4;i++){
    const angle=i*Math.PI/2;
    const x=Math.cos(angle)*r*.41,y=Math.sin(angle)*r*.41;
    ctx.moveTo(x+Math.cos(angle)*r*.43,y+Math.sin(angle)*r*.43);
    ctx.ellipse(x,y,r*.43,r*.17,angle,0,Math.PI*2);
   }
  }else star(ctx,r*.88,r*(points===12?.54:.38),points);
  ctx.fillStyle=gradient(ctx,0,-r,0,r,'#fff0a6','#d68a37');
  ctx.fill();
  ctx.strokeStyle='#a5632b';
  ctx.lineWidth=2;
  ctx.stroke();
  disk(ctx,0,0,r*.22,building.name.includes('Pavilion')?'#55c9c8':accent,'#ffe09a',3);
  if(building.name==='Throne Hall'){
   ctx.beginPath();
   ctx.moveTo(-r*.13,-r*.07);
   ctx.lineTo(-r*.075,-r*.025);
   ctx.lineTo(0,-r*.12);
   ctx.lineTo(r*.075,-r*.025);
   ctx.lineTo(r*.13,-r*.07);
   ctx.lineTo(r*.09,r*.085);
   ctx.lineTo(-r*.09,r*.085);
   ctx.closePath();
   ctx.fillStyle='#ffd979';
   ctx.fill();
  }
  ctx.restore();
  return true;
 }
 function roofs(ctx,state,viewer,visible,dt,paintRoof=roof){
  if(!state.palace)return false;
  const onGround=!viewer.phase||viewer.phase==='ground';
  for(const building of state.buildings){
   if(!building.palace||!visible(building))continue;
   // Cached plane rendering always draws fully opaque roofs and does not change player state.
   const revealed=onGround&&Core.canViewInterior(state,building,viewer);
   let alpha=1;
   if(onGround){
    const previous=building.roofAlpha??1,target=revealed?0:1;
    alpha=previous+Math.sign(target-previous)*Math.min(Math.abs(target-previous),Math.max(0,dt??.016)/.12);
    building.roofAlpha=alpha;
   }
   if(alpha<=0)continue;
   ctx.save();
   ctx.globalAlpha*=alpha;
   paintRoof(ctx,building);
   ctx.restore();
  }
  return true;
 }
 function wall(ctx,item){
  const dx=item.bx-item.ax,dy=item.by-item.ay,length=Math.hypot(dx,dy);
  const width=item.building?item.r*2:28;
  const glass=item.kind==='window';
  ctx.save();
  ctx.translate(item.ax,item.ay);
  ctx.rotate(Math.atan2(dy,dx));
  ctx.beginPath();
  ctx.roundRect(-2,-width/2,length+4,width,3);
  ctx.fillStyle=glass?gradient(ctx,0,-width/2,0,width/2,'#9df4ff','#218cb0'):gradient(ctx,0,-width/2,0,width/2,'#fff2cb','#c89450');
  ctx.strokeStyle=glass?'#28566d':'#694b37';
  ctx.lineWidth=3;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle=glass?'#d1faff':'#fff9de';
  ctx.fillRect(2,-width*.29,Math.max(0,length-4),2);
  if(glass){
   ctx.strokeStyle='#d1faff8a';
   ctx.lineWidth=2;
   for(let x=18;x<length-8;x+=34){
    ctx.beginPath();
    ctx.moveTo(x-4,width*.24);
    ctx.lineTo(x+4,-width*.24);
    ctx.stroke();
   }
  }
  ctx.restore();
 }
 function fountain(ctx,item){
  const r=item.r;
  ctx.save();
  ctx.translate(item.x,item.y);
  disk(ctx,2,7,r,'#53463838');
  disk(ctx,0,0,r,gradient(ctx,-r,-r,r,r,'#fff6df','#b79864'),'#594938',5);
  disk(ctx,0,0,r*.88,'#fbdda0','#a97538',4);
  disk(ctx,0,0,r*.77,gradient(ctx,0,-r,0,r,'#136b87','#45d9d9'),'#26495d',5);
  for(const ratio of [.46,.63,.71]){
   ctx.strokeStyle='#bdffff88';
   ctx.lineWidth=2;
   ctx.beginPath();
   ctx.arc(0,0,r*ratio,.24,4.7);
   ctx.stroke();
  }
  disk(ctx,0,3,r*.25,'#996433','#755133');
  disk(ctx,0,-4,r*.22,'#ffebba','#8d6d43',3);
  disk(ctx,0,-4,r*.145,'#9fe4e4','#4c93a1',2);
  ctx.restore();
 }
 function throne(ctx,item){
  const {x,y,w,h}=item;
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(w/100,h/100);
  ctx.beginPath();
  ctx.roundRect(8,5,84,88,19);
  ctx.fillStyle=gradient(ctx,8,0,90,92,'#ffe898','#a76430');
  ctx.fill();
  ctx.strokeStyle='#523135';
  ctx.lineWidth=4;
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(20,15,60,59,14);
  ctx.fillStyle=gradient(ctx,20,15,75,74,'#ab567d','#542447');
  ctx.fill();
  ctx.strokeStyle='#ffdb91';
  ctx.lineWidth=2;
  ctx.stroke();
  for(const yy of [30,48])for(const xx of [33,50,67])disk(ctx,xx,yy,2.8,'#e6aa8e');
  ctx.beginPath();
  ctx.roundRect(21,63,58,24,7);
  ctx.fillStyle='#903f62';
  ctx.fill();
  ctx.strokeStyle='#f4bc68';
  ctx.stroke();
  for(const xx of [15,85])disk(ctx,xx,65,8,'#ffdf87','#8d4f36',3);
  ctx.restore();
 }
 function object(ctx,item,time){
  if(item.palaceFountain){fountain(ctx,item);return true}
  if(item.kind==='sofa'&&item.building?.startsWith('palace-')){throne(ctx,item);return true}
  if(item.paint==='palace'&&item.shape==='segment'){wall(ctx,item);return true}
  if(item.kind!=='door'||!item.id.startsWith('palace-'))return false;
  const pose=Core.doorPose(item,time);
  ctx.save();
  ctx.translate(pose.hingeX,pose.hingeY);
  ctx.rotate(pose.angle);
  ctx.fillStyle=gradient(ctx,0,-7,0,7,'#a95397','#60275e');
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
 return{ready:()=>true,readyPromise:Promise.resolve(true),base,roof,roofs,object};
});
