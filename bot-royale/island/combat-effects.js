// A small cached wake texture avoids allocating a gradient for each live bullet.
const islandAirWakeCache=new Map();
function islandAirWake(style){
 if(islandAirWakeCache.has(style))return islandAirWakeCache.get(style);
 const canvas=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(128,32):
  typeof document.createElement==='function'?document.createElement('canvas'):null;
 if(!canvas)return null;
 canvas.width=128;canvas.height=32;
 const ctx=canvas.getContext('2d');
 const color=style==='pulse'?'125,232,255':style==='gold'?'255,219,135':'226,242,255';
 const fade=ctx.createLinearGradient(0,0,128,0);
 fade.addColorStop(0,`rgba(${color},0)`);
 fade.addColorStop(.48,`rgba(${color},.22)`);
 fade.addColorStop(1,`rgba(${color},.78)`);
 ctx.fillStyle=fade;
 ctx.beginPath();
 ctx.moveTo(0,16);
 ctx.quadraticCurveTo(74,11,128,14);
 ctx.lineTo(128,18);
 ctx.quadraticCurveTo(74,21,0,16);
 ctx.fill();
 // Air curling off the bullet widens as it falls behind.
 ctx.beginPath();
 for(const side of [-1,1]){
  ctx.moveTo(8,16+side*14);
  ctx.quadraticCurveTo(87,16+side*13,127,16+side*2);
 }
 for(const [x,spread] of [[56,10],[87,7]]){
  ctx.moveTo(x-9,16-spread);
  ctx.quadraticCurveTo(x+6,16,x-9,16+spread);
 }
 const edge=ctx.createLinearGradient(0,0,128,0);
 edge.addColorStop(0,'rgba(41,62,75,0)');
 edge.addColorStop(1,'rgba(41,62,75,.34)');
 ctx.strokeStyle=edge;
 ctx.lineWidth=3.4;
 ctx.stroke();
 ctx.strokeStyle=fade;
 ctx.lineWidth=1.7;
 ctx.stroke();
 islandAirWakeCache.set(style,canvas);
 return canvas;
}
function islandDrawProjectile(ctx,q,zoom,clockMs){
 const z=Math.max(.12,zoom),deagle=q.kind===0,pellet=q.kind===2,pulse=q.kind===5,gold=!!q.premium;
 const speed=Math.hypot(q.vx,q.vy),tip=deagle?10:pellet?5:q.kind===1?5.5:7;
 const width=Math.max(pellet?1.3:1.5,(deagle?2.2:1.25)/z);
 const elapsed=Number.isFinite(q.spawnTimeMs)&&Number.isFinite(clockMs)?Math.max(0,(clockMs-q.spawnTimeMs)/1000):.055;
 const wakeTime=Math.min(elapsed,pellet ? .043 : .062);
 const drag=Island.PROJECTILE_DRAG;
 const tail=Math.min(pellet?42:118,speed*Math.expm1(drag*wakeTime)/drag);
 ctx.save();
 const alpha=ctx.globalAlpha;
 ctx.translate(q.x,q.y);
 ctx.rotate(Math.atan2(q.vy,q.vx));
 if(tail>3){
  const wake=islandAirWake(pulse?'pulse':gold?'gold':'air');
  if(wake){
   const spread=Math.max(8,(pellet?11:15)/Math.sqrt(z));
   ctx.globalAlpha*=Math.min(1,speed/900)*Math.min(1,tail/15);
   ctx.drawImage(wake,-tail-tip*.3,-spread/2,tail,spread);
  }
 }
 ctx.globalAlpha=alpha;
 ctx.fillStyle='#302c28';
 ctx.beginPath();
 ctx.moveTo(-tip,-width*.8);
 ctx.lineTo(tip*.45,-width*.6);
 ctx.lineTo(tip,0);
 ctx.lineTo(tip*.45,width*.6);
 ctx.lineTo(-tip,width*.8);
 ctx.closePath();
 ctx.fill();
 ctx.fillStyle=pulse?'#8cf1ff':gold?'#ffdf76':q.kind===1?'#a78247':'#e6ba70';
 ctx.fillRect(-tip*.7,-width*.43,tip*1.05,width*.86);
 ctx.restore();
}
function islandWeaponKick(type,rarity,age){
 const duration=IslandWeaponStats.variantFor({type,rarity})?.recoilMs??85;
 if(!(age>=0&&age<duration))return 0;
 const attack=Math.min(age/8,1);
 const recovery=1-Math.max(0,age-8)/Math.max(1,duration-8);
 return ([7,4.2,9,8,3.6][type]||3)*Math.sin(attack*Math.PI/2)*recovery*recovery;
}
function islandMuzzleFlash(ctx,length,age,type,rarity){
 const duration=IslandWeaponStats.variantFor({type,rarity})?.muzzleFlashMs??40;
 if(!(age>=0&&age<duration))return;
 const progress=age/duration,alpha=1-progress;
 const reach=([23,18,31,29,16][type]||18)*(1+progress*.35),half=type===2?11:7;
 ctx.save();ctx.translate(0,-length);
 ctx.globalAlpha=alpha;ctx.fillStyle=rarity===5?'#ffd267':'#ffb24e';
 ctx.beginPath();ctx.moveTo(-half,1);ctx.lineTo(-half*.6,-reach*.5);ctx.lineTo(-2,-reach*.4);ctx.lineTo(0,-reach);ctx.lineTo(3,-reach*.45);ctx.lineTo(half,-reach*.3);ctx.lineTo(half*.6,1);ctx.closePath();ctx.fill();
 ctx.fillStyle='#fff4d0';ctx.beginPath();ctx.moveTo(-half*.35,0);ctx.lineTo(0,-reach*.66);ctx.lineTo(half*.35,0);ctx.closePath();ctx.fill();
 ctx.globalAlpha=alpha*.8;ctx.strokeStyle='#ffd790';ctx.lineWidth=1.5;ctx.beginPath();
 for(const side of [-1,1]){const spread=half*(.6+progress);const tip=-reach*(.35+progress*.5);ctx.moveTo(side*spread,tip);ctx.lineTo(side*(spread+4),tip-5)}
 ctx.stroke();ctx.restore();
}
function islandDrawGunCasing(ctx,mouth,type,age){if(!(age>=0&&age<240))return;const t=age/240;ctx.save();ctx.translate(mouth+5+t*16,14+t*31);ctx.rotate(t*5);ctx.globalAlpha=Math.min(1,(1-t)*3);ctx.fillStyle='#32271d';ctx.fillRect(-4,-2,8,4);ctx.fillStyle=type===2?'#a94032':'#c99a51';ctx.fillRect(-3,-1.3,6,2.6);ctx.fillStyle='#f0c87c';ctx.fillRect(-4,-1.6,1.5,3.2);ctx.restore()}
