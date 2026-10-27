/* Cosmetic assembly uses original pixels and alpha bounds, never hitbox dimensions. */
(function(root,factory){const rig=factory();if(typeof module==='object'&&module.exports)module.exports=rig;else root.CosmeticRig=rig})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const boundsCache=new WeakMap();
 // Widths/lengths are world pixels at the existing 66px outfit size. The reference's
 // circular body stays dominant; the complete silhouette adds roughly 25–40px.
 // Attachment coordinates use character space: +x forward, +y character-right.
 const packProfiles=[
  {width:28,rear:29,side:0},{width:30,rear:29,side:0},{width:29,rear:28,side:0},
  {width:30,rear:28,side:0},{width:28,rear:29,side:0},{width:29,rear:28,side:0},
  {width:30,rear:29,side:0},{width:29,rear:28,side:0},{width:27,rear:29,side:0},
  {width:29,rear:28,side:0},
  {width:78,rear:6,side:0},{width:78,rear:7,side:0},{width:80,rear:7,side:0},
  {width:76,rear:6,side:0},{width:78,rear:7,side:0},{width:76,rear:6,side:0},
  {width:78,rear:7,side:0},{width:80,rear:7,side:0},{width:79,rear:7,side:0},
  {width:77,rear:6,side:0},{width:77,rear:7,side:0},{width:80,rear:7,side:0}
 ];
 // Grip anchors are measured in each cropped artwork, not in the atlas cell.
 // Diagonal legacy blades and upright energy weapons have different handles.
 const meleeProfiles=[
  {length:38,grip:[.76,.78],angle:3.66,forward:15,side:24},
  {length:40,grip:[.78,.79],angle:3.70,forward:13,side:25},
  {length:49,grip:[.79,.80],angle:3.64,forward:12,side:25},
  {length:45,grip:[.79,.82],angle:3.67,forward:13,side:25},
  {length:38,grip:[.77,.80],angle:3.66,forward:15,side:24},
  {length:48,grip:[.78,.80],angle:3.63,forward:12,side:25},
  {length:42,grip:[.78,.80],angle:3.69,forward:14,side:25},
  {length:45,grip:[.78,.82],angle:3.65,forward:13,side:25},
  {length:39,grip:[.78,.80],angle:3.67,forward:15,side:24},
  {length:42,grip:[.76,.80],angle:3.67,forward:14,side:24},
  {length:49,grip:[.50,.80],angle:2.70,forward:12,side:25},
  {length:46,grip:[.50,.80],angle:2.73,forward:13,side:25},
  {length:53,grip:[.35,.81],angle:2.77,forward:11,side:25},
  {length:54,grip:[.50,.82],angle:2.68,forward:11,side:25},
  {length:46,grip:[.50,.80],angle:2.74,forward:13,side:25},
  {length:49,grip:[.50,.81],angle:2.69,forward:12,side:25},
  {length:52,grip:[.50,.82],angle:2.67,forward:11,side:25},
  {length:47,grip:[.50,.80],angle:2.76,forward:12,side:25},
  {length:47,grip:[.50,.80],angle:2.74,forward:12,side:25},
  {length:48,grip:[.50,.80],angle:2.72,forward:12,side:25},
  {length:49,grip:[.50,.80],angle:2.71,forward:12,side:25},
  {length:50,grip:[.50,.81],angle:2.76,forward:11,side:25}
 ];
 // Some outfits already include ears, shoulder pods or fins. They remain one skin
 // layer; no extra body, arms, backpack or mirrored wing copies are synthesized.
 const bodyProfiles=[
  {rear:0,hand:0},{rear:1,hand:0},{rear:0,hand:0},{rear:0,hand:1},{rear:0,hand:0},
  {rear:1,hand:0},{rear:0,hand:0},{rear:0,hand:0},{rear:0,hand:1},
  {rear:0,hand:0},{rear:0,hand:0},{rear:0,hand:1},{rear:0,hand:1},{rear:0,hand:1},
  {rear:0,hand:0},{rear:1,hand:0},{rear:1,hand:0},{rear:0,hand:1},
  {rear:0,hand:0},{rear:0,hand:0},{rear:1,hand:0},{rear:0,hand:1},
  {rear:1,hand:0},{rear:0,hand:0},{rear:0,hand:0},{rear:1,hand:0}
 ];
 for(const list of [packProfiles,meleeProfiles,bodyProfiles]){for(const p of list){if(p.grip)Object.freeze(p.grip);Object.freeze(p)}Object.freeze(list)}
 function bounds(art){
  if(!art||!art.width||!art.height)return null;if(boundsCache.has(art))return boundsCache.get(art);
  let result={x:0,y:0,w:art.width,h:art.height};
  try{
   const c=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(art.width,art.height):document.createElement('canvas');c.width=art.width;c.height=art.height;
   const z=c.getContext('2d',{willReadFrequently:true});z.drawImage(art,0,0);const data=z.getImageData(0,0,c.width,c.height).data;
   let left=c.width,top=c.height,right=-1,bottom=-1;
   for(let y=0;y<c.height;y++)for(let px=0;px<c.width;px++)if(data[(y*c.width+px)*4+3]>0){left=Math.min(left,px);top=Math.min(top,y);right=Math.max(right,px);bottom=Math.max(bottom,y)}
   if(right<left)return null;result={x:left,y:top,w:right-left+1,h:bottom-top+1};
  }catch{}
  result=Object.freeze(result);boundsCache.set(art,result);return result;
 }
 function body(art,index){
  const b=bounds(art),profile=bodyProfiles[index]||{rear:0,hand:0};
  // Retain the pre-existing outfit scale (66px canvas) and physical player size.
  const f=art?66/Math.max(art.width,art.height):1;
  return {art,b,width:b?b.w*f:52,height:b?b.h*f:52,mouth:art?art.height*f/2-4:22,profile};
 }
 function pack(art,index,bodyInfo){
  const b=bounds(art);if(!b)return null;const p=packProfiles[index];if(!p)return null;
  return {art,b,width:p.width,height:b.h*p.width/b.w,angle:Math.PI/2,x:-p.rear-bodyInfo.profile.rear,y:p.side};
 }
 function melee(art,index,bodyInfo,swing=0){
  const b=bounds(art);if(!b)return null;const p=meleeProfiles[index];if(!p)return null;
  const f=p.length/Math.max(b.w,b.h),arc=swing>0?-Math.sin(Math.min(1,Math.max(0,1-swing/.18))*Math.PI)*.8:0;
  return {art,b,width:b.w*f,height:b.h*f,x:p.forward+bodyInfo.profile.hand,y:p.side,angle:p.angle+arc,grip:p.grip};
 }
 function sprite(ctx,info,anchor=[.5,.5]){
  const {art,b,width,height}=info;ctx.drawImage(art,b.x,b.y,b.w,b.h,-width*anchor[0],-height*anchor[1],width,height);
 }
 function drawPack(ctx,info){if(!info)return;ctx.save();ctx.translate(info.x,info.y);ctx.rotate(info.angle);sprite(ctx,info);ctx.restore()}
 function drawBody(ctx,info){if(!info.art||!info.b)return false;ctx.save();ctx.rotate(Math.PI/2);sprite(ctx,info);ctx.restore();return true}
 function drawMelee(ctx,info,color='#d7dfcb'){
  if(!info)return false;
  // One hand follows the handle pivot; the blade swings around the same point.
  ctx.save();ctx.strokeStyle='#243b35';ctx.lineCap='round';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(info.x-3,info.y-4);ctx.lineTo(info.x,info.y);ctx.stroke();
  ctx.fillStyle=color==='transparent'?'#bca255':color;ctx.strokeStyle='#243b35';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(info.x,info.y,3.3,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.translate(info.x,info.y);ctx.rotate(info.angle);sprite(ctx,info,info.grip);ctx.restore();return true;
 }
 return Object.freeze({bounds,body,pack,melee,drawPack,drawBody,drawMelee,packProfiles,meleeProfiles,bodyProfiles});
});
