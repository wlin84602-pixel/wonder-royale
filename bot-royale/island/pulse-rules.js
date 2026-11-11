(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.IslandPulse=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const damage=[0,20,35,50,75,100];
 const fullChargeMs=5000;
 const selectedGun=new WeakMap();

 function chargeAt(gun,at){
  if(gun?.type!==5)return 0;
  const running=gun.pulseStart==null?0:Math.max(0,at-gun.pulseStart);
  return Math.min(fullChargeMs,(gun.pulseSavedMs??0)+running)/1000;
 }
 function pause(gun,at){
  if(gun?.type!==5||gun.pulseStart==null)return;
  gun.pulseSavedMs=chargeAt(gun,at)*1000;
  gun.pulseStart=null;
 }
 function start(player,at){
  const gun=player.inventory[player.slot];
  if(gun?.type!==5||player.phase!=='ground'||player.hp<=0||gun.reloading||gun.ammo<=0)return false;
  if(gun.pulseStart==null&&chargeAt(gun,at)<5)gun.pulseStart=at;
  return true;
 }
 function select(player,at,active=true){
  const gun=player.inventory[player.slot];
  const previous=selectedGun.get(player);
  if(previous!==gun){
   pause(previous,at);
   selectedGun.set(player,gun);
  }
  if(!active||!start(player,at))pause(gun,at);
  player.pulseCharge=chargeAt(gun,at);
  return gun;
 }
 function tick(player,held,at,fire,active=true){
  const gun=select(player,at,active);
  const pressed=held&&!player.pulseFireHeld;
  player.pulseFireHeld=held;
  if(!active||!pressed||player.pulseCharge<1||gun.reloading||gun.ammo<=0||player.phase!=='ground'||player.hp<=0)return;
  const level=Math.min(5,Math.floor(player.pulseCharge+1e-6));
  gun.chargeDamage=damage[level]+(gun.rarity===5?5:0);
  player.pulseReleasing=true;
  let fired;
  try{fired=fire()}finally{player.pulseReleasing=false}
  if(fired!==false){
   gun.pulseSavedMs=0;
   gun.pulseStart=null;
   select(player,at);
  }
 }
 return{tick,start,select,chargeAt,damage};
});
