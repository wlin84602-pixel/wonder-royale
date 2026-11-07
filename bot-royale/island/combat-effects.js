// Screen-legible projectiles and short, attached weapon firing effects.
function islandDrawProjectile(ctx,q,zoom){const deagle=q.kind===0,size=deagle?22:q.kind===2?13:11,z=Math.max(.12,zoom),tail=deagle?Math.max(40,19/z):Math.max(12,size*1.7),own=q.owner===player||q.owner===player?.id,gold=!!q.premium;ctx.save();ctx.translate(q.x,q.y);ctx.rotate(Math.atan2(q.vy,q.vx));if(!deagle)ctx.scale(Math.max(1,.7/z),Math.max(1,.7/z));ctx.lineCap='round';ctx.strokeStyle='#17191ddf';ctx.lineWidth=deagle?Math.max(7,3.2/z):q.kind===2?3.5:2.8;ctx.beginPath();ctx.moveTo(-tail,0);ctx.lineTo(size*.2,0);ctx.stroke();ctx.strokeStyle=gold?'#c89427':deagle?(own?'#edb352':'#d58d4e'):q.kind===2?'#d49531':'#66502e';ctx.lineWidth=deagle?Math.max(3.5,1.7/z):q.kind===2?2.3:1.8;ctx.beginPath();ctx.moveTo(-tail,0);ctx.lineTo(-size*.25,0);ctx.stroke();ctx.save();if(q.kind===1)ctx.scale(.68,.68);ctx.fillStyle='#202127';ctx.beginPath();ctx.roundRect(-size*.5,-(deagle?4:2.8),size*.9,deagle?8:5.6,2);ctx.fill();ctx.fillStyle=gold?'#a37720':deagle?'#c28e47':q.kind===2?'#ab7423':'#51422c';ctx.fillRect(-size*.4,-(deagle?2.7:1.8),size*.62,deagle?5.4:3.6);ctx.beginPath();ctx.moveTo(size*.2,-(deagle?3.3:2));ctx.quadraticCurveTo(size*.7,0,size*.2,deagle?3.3:2);ctx.closePath();ctx.fillStyle=gold?'#ffd76c':deagle?'#ffe0a1':q.kind===2?'#ffd270':'#96723b';ctx.fill();ctx.fillStyle=gold?'#fff1b7':deagle?'#fff0c5':q.kind===2?'#fff0b2':'#a27c42';ctx.fillRect(-size*.2,-(deagle?2:1.5),size*.43,deagle?1.4:.7);ctx.restore();ctx.restore()}
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
