'use strict';
const C=require('./world.js'),I=require('./inventory.js'),E=require('./emote-rules.js');
class Session{
 constructor(seed,rules,options={}){this.world=C.buildWorld(seed);this.rules=rules;this.actors=new Map();this.inputs=new Map();this.bullets=[];this.markers=new Map();this.time=0;this.tick=0;this.nextActor=0;this.nextBullet=0;this.damageEvents=[];this.nextDamageId=0;this.route=C.planeRoute(seed);this.maxPlayers=options.maxPlayers||25;this.botCount=options.bots??24;this.lastActions=new Map();this.addBots()}
 clip(g){return g.type===0?(g.rarity===4?10:7):g.type===1&&g.rarity===4?40:this.rules.types[g.type].clip}
 gun(type,rarity=0){const t=this.rules.types[type];return{type,rarity,ammo:this.clip({type,rarity}),reserve:this.clip({type,rarity})*4,reload:0,reloading:false,reloadEndsAtMs:0,nextFireAtMs:0,lastShotAtMs:null,fireProfile:this.rules.profiles[type],triggerMode:type===0?'press':'hold'}}
 addBots(){for(let i=0;i<this.botCount;i++){const l=this.world.locations[i%8],p=C.findValid(this.world,{x:l.x-500+this.world.random()*1000,y:l.y-500+this.world.random()*1000},26,true),id='bot-'+i;this.actors.set(id,{id,...p,hp:75,shield:10,r:26,speed:140,skin:i%26,backpack:-1,melee:0,parachute:0,angle:0,phase:'plane',bot:true,dropRemaining:C.DROP_SECONDS,dropFast:false,jumpAt:this.route.duration*(.18+this.world.random()*.62),dropTarget:p,slot:1,med:0,inventory:[null,this.gun(1),null,null,null,null],nextBotShot:0,turnUntil:0,steer:0})}}
 join(name,look={}){
 const humans=[...this.actors.values()].filter(p=>!p.bot);if(humans.length>=this.maxPlayers)throw Error('Room is full');
 const id='p-'+(++this.nextActor),pos=C.planePosition(this.route,this.time),p={id,emotes:E.normalize(look.emotes),name:String(name||'Player').slice(0,18),...pos,hp:100,shield:0,r:26,speed:C.PLAYER_SPEED,skin:C.clamp(look.skin??0,-1,25),backpack:C.clamp(look.backpack??-1,-1,21),melee:C.clamp(look.melee??0,-1,21),parachute:C.clamp(look.parachute??0,-1,4),angle:this.route.angle,phase:this.time<this.route.duration?'plane':'parachute',dropRemaining:C.DROP_SECONDS,dropFast:false,slot:1,med:0,inventory:[null,this.gun(1,4),null,null,null,null],ammoWallet:{smg:0,shotgun:0,sniper:0,p90:0},meleeReadyAt:0,lastAction:0,sequence:-1,revealedUntil:0,kills:0};
 this.actors.set(id,p);this.inputs.set(id,{dx:0,dy:0,aim:p.angle,fire:false});p.lastInputAt=this.time;
 // Keep the lobby at its configured size as humans join.
 const bot=[...this.actors.values()].find(a=>a.bot);if(bot&&this.actors.size>this.maxPlayers)this.actors.delete(bot.id);return p;
 }
 remove(id){this.actors.delete(id);this.inputs.delete(id);this.markers.delete(id)}
 input(id,m){
 const p=this.actors.get(id);if(!p||p.hp<=0||!Number.isSafeInteger(m.seq)||m.seq<=p.sequence)return false;
 if(![m.dx,m.dy,m.aim].every(Number.isFinite))return false;
 const previous=this.inputs.get(id),oldSlot=p.slot;p.sequence=m.seq;p.lastInputAt=this.time;
 if(Number.isInteger(m.slot)&&m.slot>=0&&m.slot<6)p.slot=m.slot;
 const switched=p.slot!==oldSlot,g=p.inventory[p.slot];if(g?.type===0)g.triggerMode='press';
 if(m.fire===false){p.blockFireUntilRelease=false;p.deagleNeedsRelease=false}
 const next={dx:C.clamp(m.dx,-1,1),dy:C.clamp(m.dy,-1,1),aim:m.aim,dive:m.dive===true,fire:m.fire===true&&!p.blockFireUntilRelease};
 if(switched&&g?.type===0&&next.fire)p.deagleNeedsRelease=true;
 const numbered=Number.isSafeInteger(m.pressSeq)&&m.pressSeq>=0,newPress=numbered?next.fire&&m.pressSeq>(p.lastFirePressSeq||0):next.fire&&!previous?.fire;if(numbered)p.lastFirePressSeq=Math.max(p.lastFirePressSeq||0,m.pressSeq);const freshAfterSwitch=numbered&&Number.isSafeInteger(m.slotPressFloor)&&m.slotPressFloor>=0&&m.pressSeq>m.slotPressFloor;if(newPress&&(!switched||freshAfterSwitch))p.deagleNeedsRelease=false;
 const pressed=newPress&&!(g?.type===0&&p.deagleNeedsRelease);
 // A press belongs to the slot on which it occurred; switching never transfers it.
 next.pressed=(!switched||freshAfterSwitch)&&(pressed||!switched&&previous?.pressed===true&&previous.pressSlot===p.slot);next.pressSlot=p.slot;this.inputs.set(id,next);
 if(pressed&&(!switched||freshAfterSwitch)&&p.phase==='ground'&&I.isGun(g)){this.finishReload(g,this.time*1000);if(g.reloading){g.reloading=false;g.reload=0;g.reloadEndsAtMs=0}}
 return true;
 }

 action(id,m){
 const p=this.actors.get(id);if(!p||p.hp<=0||!Number.isSafeInteger(m.seq)||m.seq<0||m.seq<=(this.lastActions.get(id)??-1))return{ok:false};
 this.lastActions.set(id,m.seq);
 if(m.kind==='emote'||m.kind==='equip-emotes')return E.action(p,m,this.time);
 if(m.kind==='chat'){if(typeof m.text!=='string'||this.time<(p.chatReadyAt||0))return{ok:false};const text=Array.from(m.text.replace(/[\u0000-\u001f\u007f]/g,' ').trim()).slice(0,120).join('');if(!text)return{ok:false};p.chatText=text;p.chatUntil=this.time+6;p.chatReadyAt=this.time+.8;return{ok:true}}
 if(m.kind==='jump'){if(p.phase==='plane'){p.phase='parachute';p.dropRemaining=C.DROP_SECONDS;return{ok:true}}else if(p.phase==='parachute'){p.dropFast=this.inputs.get(id)?.dive===true;return{ok:true}}return{ok:false}}
 if(m.kind==='marker'){if(m.remove)this.markers.delete(id);else if(Number.isFinite(m.x)&&Number.isFinite(m.y))this.markers.set(id,{x:C.clamp(m.x,0,C.SIZE),y:C.clamp(m.y,0,C.SIZE)});return{ok:true}}
 if(p.phase!=='ground')return{ok:false};
 if(m.kind==='reload'){const g=p.inventory[p.slot];I.feedGun(p,g);return{ok:I.isGun(g)&&this.reload(g,this.time*1000)}}
 if(['inventory-move','inventory-drop','ammo-drop','medkit'].includes(m.kind)){const result=I.act(this.world,p,m);return{...result,loadout:{inventory:p.inventory,ammoWallet:p.ammoWallet,med:p.med,slot:p.slot,hp:p.hp}}}
 if(m.kind==='melee')return{ok:this.melee(p)};
 if(m.kind==='interact')return this.interact(p,m);
 return{ok:false};
 }
 reload(g,at){this.finishReload(g,at);if(g.reloading||g.ammo>=this.clip(g)||g.reserve<=0)return false;if(g.type===1)g.burstRemaining=0;g.reloading=true;g.reloadEndsAtMs=at+this.rules.reloadMs;g.reload=this.rules.reloadMs/1000;return true}
 finishReload(g,at){if(g.reloading&&at+1e-7>=g.reloadEndsAtMs){const add=Math.min(this.clip(g)-g.ammo,g.reserve);g.ammo+=add;g.reserve-=add;g.reloading=false}g.reload=g.reloading?Math.max(0,(g.reloadEndsAtMs-at)/1000):0}
 fire(p,at,enemy=false){
 const g=p.inventory[p.slot];if(p.phase!=='ground'||!I.isGun(g))return false;I.feedGun(p,g);this.finishReload(g,at);if(g.reloading||at+1e-7<g.nextFireAtMs)return false;
 if(g.ammo<=0){this.reload(g,at);return false}
 const t=this.rules.types[g.type],count=g.type===2?5:1;g.ammo--;g.lastShotAtMs=at;if(g.type===1)g.burstRemaining=(g.burstRemaining>0?g.burstRemaining:7)-1;g.nextFireAtMs=at+(g.type===0?(g.rarity===4?250:500):g.type===1?(g.burstRemaining>0?(g.rarity===4?45:65):(g.rarity===4?200:320)):this.rules.cooldowns[g.fireProfile]);p.revealedUntil=this.time+1.5;
 const firstBullet=this.bullets.length;for(let i=0;i<count;i++){const spread=count>1?.19:.025,a=p.angle+(this.world.random()*2-1)*spread;this.bullets.push({id:'b-'+(++this.nextBullet),x:p.x+Math.cos(a)*25,y:p.y+Math.sin(a)*25,vx:Math.cos(a)*t.speed,vy:Math.sin(a)*t.speed,kind:g.type,owner:p.id,spawnTimeMs:at,life:count>1?.5:g.type===3?1.65:1,premium:g.type===1&&g.rarity===4,damage:g.type===0?(g.rarity===4?45:40):g.type===1?[13,14,15,16,17][g.rarity||0]:t.damage*this.rules.rarity[g.rarity||0]})}
 if(g.type===2&&g.fireProfile==='Pump Shotgun')C.configurePumpShot(this.bullets.slice(firstBullet),g.rarity,p.angle);
 if(g.ammo===0&&g.reserve>0)this.reload(g,at);return true;
 }
 melee(p){
 if(p.phase!=='ground'||this.time<(p.meleeReadyAt||0))return false;p.meleeReadyAt=this.time+.42;p.meleeSwing=.18;p.punchHand=p.punchHand===0?1:0;p.revealedUntil=this.time+1.5;
 const range=p.melee<0?58:83,damage=p.melee<0?14:28;
 for(const other of this.actors.values())if(other!==p&&other.hp>0&&other.phase==='ground'&&C.hyp(p,other)<=range&&Math.cos(Math.atan2(other.y-p.y,other.x-p.x)-p.angle)>.15&&!C.raycast(this.world,p.x,p.y,other.x,other.y,0))this.damage(other,damage,p);
 for(const o of this.world.index.query(p.x-range,p.y-range,range*2,range*2))if(o.destructible&&!o.destroyed){const b=C.bounds(o),q={x:b.x+b.w/2,y:b.y+b.h/2};if(C.hyp(p,q)<range+20&&Math.cos(Math.atan2(q.y-p.y,q.x-p.x)-p.angle)>.15)C.damageObject(this.world,o,damage,p)}
 const crate=this.world.containers.find(c=>c.kind==='basic'&&!c.open&&C.hyp(p,c)<range);if(crate){crate.hp-=damage;if(crate.hp<=0)C.openContainer(this.world,crate,p)}return true;
 }
 damage(p,n,source){const shield=Math.min(p.shield||0,n),hp=Math.min(Math.max(0,p.hp),n-shield);p.shield=(p.shield||0)-shield;p.hp-=n-shield;if(source&&hp+shield>0){this.damageEvents.push({id:++this.nextDamageId,at:this.time,source:source.id,target:p.id,x:p.x,y:p.y,hp,shield});if(this.damageEvents.length>128)this.damageEvents.shift()}if(p.hp<=0&&!p.dead){p.dead=true;if(source)source.kills=(source.kills||0)+1;const spot=C.findValid(this.world,p,12);this.world.loot.push({id:'loot-'+this.world.nextId++,...spot,type:'ammo',amount:30,taken:false})}}
 interact(p,m={}){
  const intent=this.time-(p.lastInputAt??-100)<=.35?this.inputs.get(p.id):null;p.doorMoveX=intent?.dx||0;p.doorMoveY=intent?.dy||0;p.doorMoveAt=this.world.time;
  if(m.doorId){const d=this.world.doors.find(d=>d.id===m.doorId);if(!d)return{ok:false};const result=C.interactDoor(this.world,d,p,[...this.actors.values()],m.open);return{...result,door:{id:d.id,open:d.open,lastUse:d.lastUse,changedAt:d.changedAt,turnFrom:d.turnFrom??0,swing:d.swing}}}

 const target=C.interactionTarget(this.world,p);if(!target)return{ok:false};if(target.kind==='door')return C.interactDoor(this.world,target.object,p,[...this.actors.values()]);if(target.kind==='container'){const items=C.openContainer(this.world,target.object,p);for(const q of items)if(q.type==='ammo')I.pickup(this.world,p,q);return{ok:items.length>0}}return{ok:I.pickup(this.world,p,target.object,(type,rarity)=>this.gun(type,rarity))};
 }
 botInput(p,dt){
 const targets=[...this.actors.values()].filter(a=>a!==p&&a.hp>0&&a.phase==='ground'&&C.hyp(a,p)<800&&C.canSee(this.world,p,a)).sort((a,b)=>C.hyp(a,p)-C.hyp(b,p)),target=targets[0];
 if(target){p.angle=Math.atan2(target.y-p.y,target.x-p.x);if(C.hyp(target,p)>240)C.moveActor(this.world,p,Math.cos(p.angle),Math.sin(p.angle),dt,p.speed);
  if(this.time>=p.nextBotShot&&C.hyp(target,p)<550){this.fire(p,this.time*1000,true);p.nextBotShot=Math.max(this.time+.02,(p.inventory[p.slot]?.nextFireAtMs||0)/1000)}
 }else{
  const z=this.world.zone.current;if(C.hyp(p,z)>z.r-120)p.steer=Math.atan2(z.y-p.y,z.x-p.x);
  else if(this.time>=p.turnUntil){p.steer=this.world.random()*Math.PI*2;p.turnUntil=this.time+1+this.world.random()*2}
  const before={x:p.x,y:p.y};C.moveActor(this.world,p,Math.cos(p.steer),Math.sin(p.steer),dt,p.speed*.7);if(C.hyp(p,before)<1)p.turnUntil=0;p.angle=p.steer;
 }
 // Bots open nearby closed doors rather than walking through them.
 const door=this.world.doors.find(d=>!d.open&&C.hyp(p,{x:d.x+d.w/2,y:d.y+d.h/2})<80);if(door)C.interactDoor(this.world,door,p,[...this.actors.values()]);
 }
 step(dt=1/30){
 const start=this.time*1000;this.time+=dt;this.world.time=this.time;this.tick++;
 const live=[...this.actors.values()].filter(p=>p.hp>0);
 for(const p of live){p.meleeSwing=Math.max(0,(p.meleeSwing||0)-dt);
  if(p.phase==='plane'){Object.assign(p,C.planePosition(this.route,this.time));if(this.time>=this.route.duration||p.bot&&this.time>=p.jumpAt)p.phase='parachute';continue}
  if(p.phase==='parachute'){
   const target=p.dropTarget||p,delta={x:target.x-p.x,y:target.y-p.y},distance=Math.hypot(delta.x,delta.y)||1,input=p.bot?{dx:delta.x/distance,dy:delta.y/distance,aim:Math.atan2(delta.y,delta.x)}:this.inputs.get(p.id)||{dx:0,dy:0,aim:p.angle};p.angle=input.aim;const length=Math.hypot(input.dx,input.dy)||1;p.x=C.clamp(p.x+input.dx/length*C.PARACHUTE_SPEED*dt,80,C.SIZE-80);p.y=C.clamp(p.y+input.dy/length*C.PARACHUTE_SPEED*dt,80,C.SIZE-80);p.dropFast=!p.bot&&this.time-(p.lastInputAt??-1)<.35&&input.dive===true;p.dropRemaining-=dt*(p.dropFast?2:1);
   if(p.dropRemaining<=0){Object.assign(p,C.findValid(this.world,p,26,true));p.phase='ground';p.dropRemaining=0;if(!p.bot){const input=this.inputs.get(p.id);p.blockFireUntilRelease=!!input?.fire;if(input)input.fire=false}}continue;
  }
  if(p.bot){this.botInput(p,dt);continue}
  const input=this.time-(p.lastInputAt??this.time)>.35?{dx:0,dy:0,aim:p.angle,fire:false}:this.inputs.get(p.id)||{dx:0,dy:0,aim:p.angle,fire:false};p.angle=input.aim;C.moveActor(this.world,p,input.dx,input.dy,dt);
  I.autoAmmo(this.world,p);const g=p.inventory[p.slot];if(input.fire&&p.slot===0)this.melee(p);
  if((g?.triggerMode==='press'?input.pressed:input.fire||g?.type===1&&g.burstRemaining>0)&&I.isGun(g)){input.pressed=false;I.feedGun(p,g);let at=Math.max(start,g.nextFireAtMs);for(let n=0;n<8&&at<=this.time*1000+1e-7;n++){this.finishReload(g,at);if(g.reloading){at=Math.max(at,g.reloadEndsAtMs);continue}if(!this.fire(p,at))break;if(g.triggerMode==='press')break;at=Math.max(g.nextFireAtMs,g.reloading?g.reloadEndsAtMs:0)}}
  for(const gun of p.inventory)if(gun)this.finishReload(gun,this.time*1000);
 }
 for(const b of this.bullets){
  const step=Math.max(0,(this.time*1000-Math.max(start,b.spawnTimeMs))/1000),motion=C.projectileMotion(b,step),nx=motion.x,ny=motion.y,wall=C.raycast(this.world,b.x,b.y,nx,ny,1);let closest=wall?{t:wall.t,wall:wall.object}:null;
  for(const p of live)if(p.id!==b.owner&&p.phase==='ground'){const t=C.segmentHitCircle(b.x,b.y,nx,ny,p);if(t!==null&&(!closest||t<closest.t))closest={t,actor:p}}
  if(closest){b.x+=(nx-b.x)*closest.t;b.y+=(ny-b.y)*closest.t;b.life=0;if(closest.actor){this.damage(closest.actor,b.damage,this.actors.get(b.owner));C.applyPumpHit(this.world,b,closest.actor)}else C.damageObject(this.world,closest.wall,b.damage)}
  else{b.x=nx;b.y=ny;b.vx=motion.vx;b.vy=motion.vy;b.life-=step}
 }
 this.bullets=this.bullets.filter(b=>b.life>0);C.advanceZone(this.world,dt,live);if(this.world.events.length>60)this.world.events.splice(0,this.world.events.length-60);
 }
 snapshot(id){
 const self=this.actors.get(id);if(!self)return null;
 const actors=[...this.actors.values()].filter(a=>a.id!==id&&a.hp>0&&C.canSee(this.world,self,a)).map(p=>({id:p.id,name:p.name,chatText:p.chatText,chatUntil:p.chatUntil,emoteIndex:p.emoteIndex,emoteUntil:p.emoteUntil,x:p.x,y:p.y,hp:p.hp,shield:p.shield,angle:p.angle,phase:p.phase,dropRemaining:p.dropRemaining,skin:p.skin,backpack:p.backpack,melee:p.melee,parachute:p.parachute,slot:p.slot,weaponType:p.inventory[p.slot]?.type??1,weaponRarity:p.inventory[p.slot]?.rarity??0,weaponLastShotAtMs:p.inventory[p.slot]?.lastShotAtMs??null,itemKind:p.slot===0?'melee':I.isMed(p.inventory[p.slot])?'med':p.inventory[p.slot]?'gun':'empty',bot:p.bot,meleeSwing:p.meleeSwing,punchHand:p.punchHand,revealedUntil:p.revealedUntil}));
 const alive=[...this.actors.values()].filter(p=>p.hp>0).length;
 return {damageEvents:this.damageEvents.filter(e=>e.source===id&&this.time-e.at<1.2),tick:this.tick,actionSeq:this.lastActions.get(id)??-1,time:this.time,seed:this.world.seed,self:JSON.parse(JSON.stringify(self)),actors,alive,zone:this.world.zone,plane:{route:this.route,position:C.planePosition(this.route,this.time)},doors:this.world.doors.filter(d=>C.hyp(self,{x:d.x+d.w/2,y:d.y+d.h/2})<3500).map(d=>({id:d.id,open:d.open,changedAt:d.changedAt,turnFrom:d.turnFrom??0,swing:d.swing||1})),destroyed:this.world.objects.filter(o=>o.destroyed).map(o=>o.id),containers:this.world.containers.filter(c=>c.open).map(c=>c.id),loot:this.world.loot.filter(l=>!l.taken&&C.hyp(l,self)<3300&&(!C.buildingAt(this.world,l)||C.canViewInterior(this.world,C.buildingAt(this.world,l),self))),bullets:this.bullets.filter(b=>C.hyp(b,self)<3400).map(b=>({...b})),marker:this.markers.get(id)||null};
 }
}
module.exports={Session};

