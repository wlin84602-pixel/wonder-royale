/* Cosmetics use the supplied pixels and measured body diameters. */
(function(root,factory){
 const collection=typeof module==='object'&&module.exports?require('./cosmetic-collection.json'):COSMETIC_COLLECTION_DATA;
 const rig=factory(collection);
 if(typeof module==='object'&&module.exports)module.exports=rig;else root.CosmeticRig=rig;
})(typeof globalThis!=='undefined'?globalThis:this,function(collection){
 'use strict';
 const D=collection.bodyDiameter,HAND_COLOR='#d4a463',cache=new WeakMap();
 function bounds(art){
  if(!art||!art.width||!art.height)return null;
  if(cache.has(art))return cache.get(art);
  const result={x:0,y:0,w:art.width,h:art.height};cache.set(art,result);return result;
 }
 function body(art,index){
  const meta=collection.skins[index],factor=meta?D/meta.bodyDiameter:1;
  return{art,b:bounds(art),meta,width:art?art.width*factor:D,height:art?art.height*factor:D,mouth:D/2-4,profile:{hand:0,rear:0},diameter:D};
 }
 function attachment(art,meta){
  if(!art||!meta)return null;
  const width=meta.scale*D*art.width/(meta.visibleBounds?.w||art.width);
  return{art,b:bounds(art),meta,width,height:width*art.height/art.width,x:-meta.offset[1]*D,y:meta.offset[0]*D,angle:meta.rotation,pivot:meta.pivot};
 }
 function pack(art,index){return attachment(art,collection.backpacks[index])}
 function melee(art,index,bodyInfo,swing=0){
  const meta=collection.melees[index];if(!meta||!art)return null;
  const info=attachment(art,meta);
  info.swing=swing;info.index=index;
  // Both the resting pose and the swing use this asset's own local pivot.
  const progress=Math.max(0,Math.min(1,1-swing/.18));
  const reach=swing>0?Math.sin(progress*Math.PI):0;
  info.x+=reach*D*.25;
  info.angle-=reach*.42;
  info.grip=meta.pivot;
  return info;
 }
 function sprite(ctx,info){
  if(!info?.art)return;
  const pivot=info.pivot||info.meta?.pivot||[.5,.5];
  ctx.save();ctx.translate(info.x||0,info.y||0);ctx.rotate(info.angle||0);
  ctx.drawImage(info.art,-info.width*pivot[0],-info.height*pivot[1],info.width,info.height);ctx.restore();
 }
 function drawPack(ctx,info){sprite(ctx,info)}
 function drawBody(ctx,info){
  if(!info.art||!info.meta){
   ctx.save();ctx.fillStyle='#ffd17b';ctx.strokeStyle='#30302e';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,D/2,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();return true;
  }
  sprite(ctx,{...info,angle:info.meta.rotation,pivot:info.meta.pivot});return true;
 }
 function fist(ctx,x,y,r=8){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=HAND_COLOR;ctx.strokeStyle='#30302e';ctx.lineWidth=3;ctx.fill();ctx.stroke()}
 function drawFists(ctx,info,swing=0){
  const punch=swing>0?Math.sin((1-swing/.18)*Math.PI)*8:0;
  ctx.save();fist(ctx,23+(info.punchHand===1?0:punch),-18);fist(ctx,23+(info.punchHand===1?punch:0),18);ctx.restore();
 }
 function drawGunHands(ctx,info,type=0){ctx.save();fist(ctx,info.mouth+4,9);fist(ctx,info.mouth+(type===0?15:type===2?35:23),-7,7.5);ctx.restore()}
 function drawMelee(ctx,info){
  if(!info)return false;
  if(info.meta.kind==='gloves'){
   const arts=info.art.gloves;if(!arts)return false;
   for(let i=0;i<arts.length;i++){
    const art=arts[i],visibleWidth=info.meta.parts[i].visibleBounds.w,width=D*info.meta.scale*art.width/visibleWidth,height=width*art.height/art.width;
    const punch=info.swing>0?Math.sin((1-info.swing/.18)*Math.PI)*5:0;
    sprite(ctx,{art,width,height,x:info.x+punch,y:(i===0?-1:1)*D*.36,angle:info.meta.rotation,pivot:info.meta.pivot});
   }
   return true;
  }
  const angle=info.angle-info.meta.rotation,cos=Math.cos(angle),sin=Math.sin(angle);
  const hands=[-1,1].map(side=>{
   const x=-3,y=side*D*.17-info.y;
   return{x:info.x+cos*x-sin*y,y:info.y+sin*x+cos*y,side};
  });
  ctx.save();ctx.lineCap='round';
  for(const hand of hands){
   ctx.beginPath();ctx.moveTo(D*.39,hand.side*D*.17);ctx.lineTo(hand.x,hand.y);
   ctx.strokeStyle='#30302e';ctx.lineWidth=9;ctx.stroke();
   ctx.strokeStyle=HAND_COLOR;ctx.lineWidth=5;ctx.stroke();
  }
  ctx.restore();sprite(ctx,info);
  // Fingers wrap over the handle, using the same pivot and reach as the weapon.
  ctx.save();for(const hand of hands)fist(ctx,hand.x,hand.y,6.2);ctx.restore();return true;
 }
 function drawAssembly(ctx,look,getArt,swing=0,showMelee=true){
  const info=body(getArt('skins',look.skin),look.skin);
  drawPack(ctx,pack(getArt('backpacks',look.backpack),look.backpack,info));
  drawBody(ctx,info);
  if(showMelee){const held=melee(getArt('melees',look.melee),look.melee,info,swing);if(!drawMelee(ctx,held))drawFists(ctx,info,swing)}
  return info;
 }
 return Object.freeze({bounds,body,pack,melee,drawPack,drawBody,drawMelee,drawFists,drawGunHands,drawAssembly,HAND_COLOR,collection});
});
