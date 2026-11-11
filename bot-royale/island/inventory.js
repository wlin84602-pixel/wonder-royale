(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./world.js'):root.IslandCore,typeof module==='object'&&module.exports?require('./weapon-rules.js'):root.IslandWeaponStats);if(typeof module==='object'&&module.exports)module.exports=api;else root.IslandInventory=api})(typeof globalThis!=='undefined'?globalThis:this,function(C,WeaponStats){
'use strict';
const FAMILIES=['smg','shotgun','sniper','p90'];
const isMed=g=>(g?.kind==='med'||g?.kind==='small-shield'||g?.kind==='big-shield'),isGun=g=>!!g&&!isMed(g)&&Number.isInteger(g.type)&&g.type>=0&&g.type<7,family=g=>WeaponStats.familyFor(g,['sniper','p90','shotgun','sniper'][g?.type]||'smg');
function prepare(p){p.ammoWallet=p.ammoWallet||{smg:0,shotgun:0,sniper:0,p90:0};p.inventory=p.inventory||[null,null,null,null,null,null];p.med=p.inventory.reduce((n,g)=>n+(isMed(g)?g.count:0),0);return p}
function totals(p){prepare(p);const out={...p.ammoWallet};for(const g of p.inventory)if(isGun(g))out[family(g)]=(out[family(g)]||0)+Math.max(0,g.reserve||0);return out}
function feedGun(p,g){prepare(p);if(!isGun(g))return;const f=family(g);g.reserve=(g.reserve||0)+(p.ammoWallet[f]||0);p.ammoWallet[f]=0}
function addAmmo(p,f,n){prepare(p);if(!FAMILIES.includes(f))return false;n=Math.max(0,Math.floor(n));const held=p.inventory[p.slot],g=isGun(held)&&family(held)===f?held:p.inventory.find(g=>isGun(g)&&family(g)===f);if(g)g.reserve=(g.reserve||0)+n;else p.ammoWallet[f]=(p.ammoWallet[f]||0)+n;return true}
function pickup(s,p,item,makeGun){prepare(p);if(!item||item.taken)return false;
 if(item.type==='ammo'){addAmmo(p,item.ammoFamily||'smg',item.amount||30)}
 else if(item.type==='med'||item.type==='shield'||item.type==='big-shield'){const kind=item.type==='big-shield'?'big-shield':item.type==='shield'?'small-shield':'med';let g=p.inventory.find(g=>g?.kind===kind);if(g)g.count+=item.amount||1;else{const i=p.inventory.findIndex((g,i)=>i>0&&!g);if(i<0)return false;p.inventory[i]={kind,type:-1,count:item.amount||1,rarity:0}}}
 else if(item.type==='gun'){const i=p.inventory.findIndex((g,i)=>i>0&&!g);if(i<0)return false;p.inventory[i]=item.gunData?JSON.parse(JSON.stringify(item.gunData)):makeGun(item.weapon,item.rarity||0);p.slot=i;feedGun(p,p.inventory[i])}
 else return false;item.taken=true;prepare(p);return true;
}
function autoAmmo(s,p){if(p.phase&&p.phase!=='ground')return;for(const q of s.loot){if(q.taken||q.type!=='ammo')continue;const d=C.hyp(p,q);if(q.ignorePickupBy===p.id){if(d>64)delete q.ignorePickupBy;else continue}if(d>52||C.raycast(s,p.x,p.y,q.x,q.y,0))continue;pickup(s,p,q)}}
function spawn(s,p,item,preview){if(preview)return;const wanted={x:p.x+Math.cos(p.angle||0)*76,y:p.y+Math.sin(p.angle||0)*76},point=C.findValid(s,wanted,13);s.loot.push({id:'loot-'+s.nextId++,...point,...item,taken:false,ignorePickupBy:p.id})}
function act(s,p,m,preview=false){prepare(p);if(p.phase&&p.phase!=='ground')return{ok:false};
 if(m.kind==='inventory-move'){if(!Number.isInteger(m.from)||!Number.isInteger(m.to)||m.from<1||m.from>5||m.to<1||m.to>5||!p.inventory[m.from])return{ok:false};[p.inventory[m.from],p.inventory[m.to]]=[p.inventory[m.to],p.inventory[m.from]];if(p.slot===m.from)p.slot=m.to;else if(p.slot===m.to)p.slot=m.from}
 else if(m.kind==='inventory-drop'){if(!Number.isInteger(m.slot)||m.slot<1||m.slot>5||!p.inventory[m.slot])return{ok:false};const g=p.inventory[m.slot],gunData=JSON.parse(JSON.stringify(g));delete gunData.pulseStart;delete gunData.pulseSavedMs;spawn(s,p,isMed(g)?{type:g.kind==='big-shield'?'big-shield':g.kind==='small-shield'?'shield':'med',amount:g.count}:{type:'gun',weapon:g.type,rarity:g.rarity||0,gunData},preview);p.inventory[m.slot]=null}
 else if(m.kind==='ammo-drop'){if(!FAMILIES.includes(m.family))return{ok:false};const total=totals(p)[m.family]||0;if(total<=0)return{ok:false};const amount=Math.max(1,Math.round(total*.1));let left=amount,n=Math.min(left,p.ammoWallet[m.family]||0);p.ammoWallet[m.family]-=n;left-=n;for(const g of p.inventory)if(left&&isGun(g)&&family(g)===m.family){n=Math.min(left,g.reserve||0);g.reserve-=n;left-=n}spawn(s,p,{type:'ammo',ammoFamily:m.family,amount},preview);prepare(p);return{ok:true,amount}}
 else if(m.kind==='medkit'){const g=p.inventory[p.slot];if(!isMed(g)||g.count<=0||(g.kind==='big-shield'?(p.shield||0)>=100:g.kind==='small-shield'?(p.shield||0)>=50:p.hp>=100)||p.hp<=0||p.healing)return{ok:false};p.healing={slot:p.slot,kind:g.kind,startedAt:s.time,endsAt:s.time+(g.kind==='small-shield'?1.5:5)}} 
 else return{ok:false};prepare(p);return{ok:true};
}
function tickHealing(s,p){const h=p.healing;if(!h)return false;const g=p.inventory[h.slot];if(p.hp<=0||p.phase!=='ground'||p.slot!==h.slot||!isMed(g)||g.kind!==h.kind||g.count<=0){delete p.healing;return false}if(s.time+1e-8<h.endsAt)return false;if(h.kind==='big-shield')p.shield=Math.min(100,(p.shield||0)+50);else if(h.kind==='small-shield')p.shield=Math.min(50,(p.shield||0)+25);else p.hp=100;g.count--;if(!g.count)p.inventory[h.slot]=null;delete p.healing;prepare(p);return true}
return{tickHealing,FAMILIES,isMed,isGun,family,prepare,totals,feedGun,addAmmo,pickup,autoAmmo,act};
});
