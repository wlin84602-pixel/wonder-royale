(function(root,factory){
 const data=typeof module==='object'&&module.exports?require('./weapon-stats.json'):ISLAND_WEAPON_STATS_DATA;
 const api=factory(data);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.IslandWeaponStats=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(data){
 'use strict';
 const rarityIndex=r=>Math.max(0,Math.min(4,Math.floor(Number(r)||0)));
 function idFor(type,rarity=0){
  if(type===0)return rarityIndex(rarity)===4?'DEAGLE_UE':'DEAGLE';
  if(type===1)return rarityIndex(rarity)===4?'AK_UE':'AK';
  if(type===2)return 'PUMP_SHOTGUN';
  return null;
 }
 function variantFor(g){return data.variants[idFor(g?.type,g?.rarity)]||null}
 function magazineFor(g,fallback=0){return variantFor(g)?.magazine??fallback}
 function damageFor(g,fallback=0){
  const variant=variantFor(g);if(!variant)return fallback;
  return variant.damageByRarity?variant.damageByRarity[rarityIndex(g.rarity)]:variant.damage;
 }
 function cooldownFor(g,fallback=0){
  const variant=variantFor(g);if(!variant)return fallback;
  if(g.type===1)return (g.burstRemaining||0)>0?data.burst.bulletIntervalMs:data.burst.recoveryMs;
  return variant.cooldownMs;
 }
 function projectileFor(g){const variant=variantFor(g);return variant?data.projectiles[variant.projectile]:null}
 function familyFor(g,fallback='smg'){return variantFor(g)?.ammoFamily||fallback}
 return Object.freeze({data,idFor,variantFor,magazineFor,damageFor,cooldownFor,projectileFor,familyFor,rarityIndex});
});
