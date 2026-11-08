// Screen-legible projectiles and short, attached weapon firing effects.
function islandDrawProjectile(ctx,q,zoom){
 const z=Math.max(.12,zoom),deagle=q.kind===0,pellet=q.kind===2,pulse=q.kind===5,gold=!!q.premium;
 const speed=Math.hypot(q.vx,q.vy),tail=Math.min(100,Math.max(pellet?20:28,speed*.028)),tip=deagle?10:pellet?5:q.kind===1?5.5:7;
 const width=Math.max(pellet?1.3:1.5,(deagle?2.2:1.25)/z);
 ctx.save();ctx.translate(q.x,q.y);ctx.rotate(Math.atan2(q.vy,q.vx));
 // Thin light streaks describe motion; the dark-edged tip remains a separate bullet.
 const trail=ctx.createLinearGradient(-tail,0,0,0);
 trail.addColorStop(0,'rgba(255,247,210,0)');trail.addColorStop(.4,gold?'rgba(255,220,115,.35)':'rgba(255,249,218,.3)');trail.addColorStop(1,pulse?'rgba(130,244,255,.92)':'rgba(255,250,222,.9)');
 ctx.strokeStyle=trail;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-tail,0);ctx.lineTo(0,0);ctx.stroke();
 ctx.fillStyle='#302c28';ctx.beginPath();ctx.moveTo(-tip, -width*.8);ctx.lineTo(tip*.45,-width*.6);ctx.lineTo(tip,0);ctx.lineTo(tip*.45,width*.6);ctx.lineTo(-tip,width*.8);ctx.closePath();ctx.fill();
 ctx.fillStyle=pulse?'#8cf1ff':gold?'#ffdf76':q.kind===1?'#a78247':'#e6ba70';ctx.fillRect(-tip*.7,-width*.43,tip*1.05,width*.86);
 ctx.restore();
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
