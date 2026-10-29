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
  {length:60,grip:[0.76,0.78],angle:3.66,forward:10,side:30},
  {length:64,grip:[0.84,0.65],angle:3.70,forward:9,side:30},
  {length:74,grip:[0.79,0.8],angle:3.64,forward:7,side:31},
  {length:71,grip:[0.85,0.75],angle:3.67,forward:9,side:30},
  {length:60,grip:[0.77,0.8],angle:3.66,forward:10,side:30},
  {length:72,grip:[0.78,0.8],angle:3.63,forward:7,side:31},
  {length:67,grip:[0.85,0.75],angle:3.69,forward:9,side:30},
  {length:70,grip:[0.85,0.64],supportGrip:[0.57,0.81],angle:3.65,forward:8,side:31},
  {length:63,grip:[0.78,0.8],angle:3.67,forward:10,side:30},
  {length:67,grip:[0.82,0.8],angle:3.67,forward:9,side:30},
  {length:78,grip:[0.5,0.8],angle:2.70,forward:8,side:31},
  {length:74,grip:[0.5,0.8],angle:2.73,forward:9,side:31},
  {length:85,grip:[0.35,0.81],angle:2.77,forward:7,side:32},
  {length:86,grip:[0.5,0.82],angle:2.68,forward:7,side:31},
  {length:74,grip:[0.5,0.8],angle:2.74,forward:9,side:31},
  {length:78,grip:[0.5,0.81],angle:2.69,forward:8,side:31},
  {length:83,grip:[0.5,0.82],angle:2.67,forward:7,side:31},
  {length:76,grip:[0.5,0.8],angle:2.76,forward:8,side:32},
  {length:76,grip:[0.5,0.8],angle:2.74,forward:8,side:31},
  {length:77,grip:[0.5,0.8],angle:2.72,forward:8,side:31},
  {length:78,grip:[0.5,0.8],angle:2.71,forward:8,side:31},
  {length:80,grip:[0.5,0.81],angle:2.76,forward:7,side:32}
 ];
 // Some outfits already include ears, shoulder pods or fins. They remain one skin
 // layer; the shared tan fists are rendered separately without duplicating outfit details.
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
 const gripCache=new WeakMap();
 function gripPair(art,b,p,index){
  if(gripCache.has(art))return gripCache.get(art);let pixels;
  try{pixels=art.getContext('2d').getImageData(0,0,art.width,art.height).data}catch{}
  function visible(anchor){if(!pixels)return anchor;const cx=b.x+anchor[0]*b.w,cy=b.y+anchor[1]*b.h,r=Math.max(3,Math.ceil(Math.max(b.w,b.h)*.07));let best=Infinity,result=anchor;
   for(let yy=Math.max(b.y,Math.floor(cy-r));yy<=Math.min(b.y+b.h-1,cy+r);yy++)for(let xx=Math.max(b.x,Math.floor(cx-r));xx<=Math.min(b.x+b.w-1,cx+r);xx++){const distance=(xx-cx)**2+(yy-cy)**2;if(pixels[(yy*art.width+xx)*4+3]>100&&distance<best){best=distance;result=[(xx-b.x)/b.w,(yy-b.y)/b.h]}}return result
  }
  const pair=p.supportGrip?{grip:p.grip,supportGrip:p.supportGrip}:index<10?{grip:visible([Math.min(.98,p.grip[0]+.08),Math.min(.97,p.grip[1]+.08)]),supportGrip:p.grip}:{grip:visible([p.grip[0],.94]),supportGrip:visible([p.grip[0],index===13||index===16?.76:.56])};gripCache.set(art,pair);return pair
 }
 function melee(art,index,bodyInfo,swing=0){
  const b=bounds(art);if(!b)return null;const p=meleeProfiles[index];if(!p)return null;
  const grips=gripPair(art,b,p,index),f=p.length/Math.max(b.w,b.h),arc=swing>0?-Math.sin(Math.min(1,Math.max(0,1-swing/.18))*Math.PI)*.8:0;
  return {art,b,width:b.w*f,height:b.h*f,x:(index===12?40:35)+bodyInfo.profile.hand,y:-16,angle:(index<10?3.93:Math.PI)+arc,grip:grips.grip,supportGrip:grips.supportGrip};
 }
 function sprite(ctx,info,anchor=[.5,.5]){
  const {art,b,width,height}=info;ctx.drawImage(art,b.x,b.y,b.w,b.h,-width*anchor[0],-height*anchor[1],width,height);
 }
 function drawPack(ctx,info){if(!info)return;ctx.save();ctx.translate(info.x,info.y);ctx.rotate(info.angle);sprite(ctx,info);ctx.restore()}
 function drawBody(ctx,info){if(!info.art||!info.b)return false;ctx.save();ctx.rotate(Math.PI/2);sprite(ctx,info);ctx.restore();return true}
 const HAND_COLOR='#d4a463',HAND_OUTLINE='#30302e';
 function fist(ctx,x,y,r=8){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=HAND_COLOR;ctx.strokeStyle=HAND_OUTLINE;ctx.lineWidth=3.5;ctx.fill();ctx.stroke()}
 function drawFists(ctx,bodyInfo,swing=0){const punch=swing>0?Math.sin((1-swing/.18)*Math.PI)*9:0;ctx.save();fist(ctx,25+punch,-23,9);fist(ctx,25,23,9);ctx.restore()}
 function drawGunHands(ctx,bodyInfo,type=0){const mouth=bodyInfo.mouth;ctx.save();if(type===2){fist(ctx,mouth+6,-7,8);fist(ctx,mouth+35,6,7.5)}else{fist(ctx,mouth+4,9,8);fist(ctx,mouth+(type===0?15:23),-7,7.5)}ctx.restore()}
 function drawMelee(ctx,info){
  if(!info)return false;
  const c=Math.cos(info.angle),s=Math.sin(info.angle),dx=(info.supportGrip[0]-info.grip[0])*info.width,dy=(info.supportGrip[1]-info.grip[1])*info.height,sx=c*dx-s*dy,sy=s*dx+c*dy,length=Math.hypot(sx,sy)||1,nx=-sy/length,ny=sx/length;
  const hands=[{x:info.x+nx*6.5,y:info.y+ny*6.5},{x:info.x+sx-nx*6.5,y:info.y+sy-ny*6.5}];
  // Short, rounded forearms emerge from the body and remain connected to each grip
  // while the weapon pivots through its attack arc. The handle artwork draws above them.
  const bodyRadius=38;
  ctx.save();ctx.lineCap='round';
  for(const hand of hands){const d=Math.hypot(hand.x,hand.y);if(d>bodyRadius*.94){const start=bodyRadius*.94/d;ctx.beginPath();ctx.moveTo(hand.x*start,hand.y*start);ctx.lineTo(hand.x,hand.y);ctx.strokeStyle=HAND_OUTLINE;ctx.lineWidth=10;ctx.stroke();ctx.beginPath();ctx.moveTo(hand.x*start,hand.y*start);ctx.lineTo(hand.x,hand.y);ctx.strokeStyle=HAND_COLOR;ctx.lineWidth=6;ctx.stroke()}}
  ctx.restore();
  ctx.save();ctx.translate(info.x,info.y);ctx.rotate(info.angle);sprite(ctx,info,info.grip);ctx.restore();
  // Both round fists wrap opposite sides of the extended visual grip and remain
  // anchored to the body by the forearms during movement and swings.
  ctx.save();fist(ctx,hands[0].x,hands[0].y,8);fist(ctx,hands[1].x,hands[1].y,8);ctx.restore();return true
 }
 return Object.freeze({bounds,body,pack,melee,drawPack,drawBody,drawMelee,drawFists,drawGunHands,HAND_COLOR,packProfiles,meleeProfiles,bodyProfiles});
});
