'use strict';
const C=require('./world.js');
class Session{
 constructor(seed,rules,options={}){this.world=C.buildWorld(seed);this.rules=rules;this.actors=new Map();this.inputs=new Map();this.bullets=[];this.markers=new Map();this.time=0;this.tick=0;this.nextActor=0;this.nextBullet=0;this.route=C.planeRoute(seed);this.maxPlayers=options.maxPlayers||25;this.botCount=options.bots??24;this.lastActions=new Map();this.addBots()}
 gun(type,rarity=0){const t=this.rules.types[type];return{type,rarity,ammo:t.clip,reserve:t.clip*4,reload:0,reloading:false,reloadEndsAtMs:0,nextFireAtMs:0,lastShotAtMs:null,fireProfile:this.rules.profiles[type],triggerMode:'hold'}}
 addBots(){for(let i=0;i<this.botCount;i++){const l=this.world.locations[i%8],p=C.findValid(this.world,{x:l.x-500+this.world.random()*1000,y:l.y-500+this.world.random()*1000},26,true),id='bot-'+i;this.actors.set(id,{id,...p,hp:75,shield:0,r:26,speed:140,skin:i%26,backpack:-1,melee:0,parachute:0,angle:0,phase:'plane',bot:true,dropRemaining:10,dropFast:false,jumpAt:this.route.duration*(.18+this.world.random()*.62),dropTarget:p,slot:1,med:0,inventory:[null,this.gun(1),null,null,null,null],nextBotShot:0,turnUntil:0,steer:0})}}
 join(name,look={}){
 const humans=[...this.actors.values()].filter(p=>!p.bot);if(humans.length>=this.maxPlayers)throw Error('Room is full');
 const id='p-'+(++this.nextActor),pos=C.planePosition(this.route,this.time),p={id,name:String(name||'Player').slice(0,18),...pos,hp:100,shield:0,r:26,speed:205,skin:C.clamp(look.skin??0,-1,25),backpack:C.clamp(look.backpack??-1,-1,21),melee:C.clamp(look.melee??0,-1,21),parachute:C.clamp(look.parachute??0,-1,4),angle:this.route.angle,phase:this.time<this.route.duration?'plane':'parachute',dropRemaining:10,dropFast:false,slot:0,med:1,inventory:[null,this.gun(0),null,null,null,null],meleeReadyAt:0,lastAction:0,sequence:-1,revealedUntil:0,kills:0};
 this.actors.set(id,p);this.inputs.set(id,{dx:0,dy:0,aim:p.angle,fire:false});p.lastInputAt=this.time;
 // Keep the lobby at its configured size as humans join.
 const bot=[...this.actors.values()].find(a=>a.bot);if(bot&&this.actors.size>this.maxPlayers)this.actors.delete(bot.id);return p;
 }
 remove(id){this.actors.delete(id);this.inputs.delete(id);this.markers.delete(id)}
 input(id,m){
 const p=this.actors.get(id);if(!p||p.hp<=0||!Number.isSafeInteger(m.seq)||m.seq<=p.sequence)return false;
 if(![m.dx,m.dy,m.aim].every(Number.isFinite))return false;
 p.sequence=m.seq;p.lastInputAt=this.time;if(m.fire===false)p.blockFireUntilRelease=false;const next={dx:C.clamp(m.dx,-1,1),dy:C.clamp(m.dy,-1,1),aim:m.aim,fire:m.fire===true&&!p.blockFireUntilRelease};this.inputs.set(id,next);if(Number.isInteger(m.slot)&&m.slot>=0&&m.slot<6)p.slot=m.slot;return true;
 }
 action(id,m){
 const p=this.actors.get(id);if(!p||p.hp<=0||!Number.isSafeInteger(m.seq)||m.seq<0||m.seq<=(this.lastActions.get(id)??-1))return{ok:false};
 this.lastActions.set(id,m.seq);
 if(m.kind==='jump'){if(p.phase==='plane'){p.phase='parachute';p.dropRemaining=10;return{ok:true}}else if(p.phase==='parachute'){p.dropFast=true;return{ok:true}}return{ok:false}}
 if(m.kind==='marker'){if(m.remove)this.markers.delete(id);else if(Number.isFinite(m.x)&&Number.isFinite(m.y))this.markers.set(id,{x:C.clamp(m.x,0,C.SIZE),y:C.clamp(m.y,0,C.SIZE)});return{ok:true}}
 if(p.phase!=='ground')return{ok:false};
 if(m.kind==='reload'){const g=p.inventory[p.slot];return{ok:!!g&&this.reload(g,this.time*1000)}}
 if(m.kind==='medkit'){if(p.med<1||p.hp>=100)return{ok:false};p.med--;p.hp=Math.min(100,p.hp+45);return{ok:true}}
 if(m.kind==='melee')return{ok:this.melee(p)};
 if(m.kind==='interact')return this.interact(p);
 return{ok:false};
 }
 reload(g,at){this.finishReload(g,at);if(g.reloading||g.ammo>=this.rules.types[g.type].clip||g.reserve<=0)return false;g.reloading=true;g.reloadEndsAtMs=at+this.rules.reloadMs;g.reload=this.rules.reloadMs/1000;return true}
 finishReload(g,at){if(g.reloading&&at+1e-7>=g.reloadEndsAtMs){const add=Math.min(this.rules.types[g.type].clip-g.ammo,g.reserve);g.ammo+=add;g.reserve-=add;g.reloading=false}g.reload=g.reloading?Math.max(0,(g.reloadEndsAtMs-at)/1000):0}
 fire(p,at,enemy=false){
 if(enemy){if(p.phase!=='ground')return false;const a=p.angle+(this.world.random()*2-1)*.15;this.bullets.push({id:'b-'+(++this.nextBullet),x:p.x+Math.cos(a)*25,y:p.y+Math.sin(a)*25,vx:Math.cos(a)*630,vy:Math.sin(a)*630,kind:0,owner:p.id,spawnTimeMs:at,life:1,damage:9});p.revealedUntil=this.time+1.5;return true}const g=p.inventory[p.slot];if(p.phase!=='ground'||!g)return false;this.finishReload(g,at);if(g.reloading||at+1e-7<g.nextFireAtMs)return false;
 if(g.ammo<=0){this.reload(g,at);return false}
 const t=this.rules.types[g.type],count=g.type===2?5:1;g.ammo--;g.lastShotAtMs=at;g.nextFireAtMs=at+this.rules.cooldowns[g.fireProfile];p.revealedUntil=this.time+1.5;
 for(let i=0;i<count;i++){const spread=count>1?.16:.025,a=p.angle+(this.world.random()*2-1)*spread;this.bullets.push({id:'b-'+(++this.nextBullet),x:p.x+Math.cos(a)*25,y:p.y+Math.sin(a)*25,vx:Math.cos(a)*t.speed,vy:Math.sin(a)*t.speed,kind:g.type,owner:p.id,spawnTimeMs:at,life:count>1?.5:g.type===3?1.65:1,damage:t.damage*this.rules.rarity[g.rarity||0]})}
 if(g.ammo===0&&g.reserve>0)this.reload(g,at);return true;
 }
 melee(p){
 if(p.phase!=='ground'||this.time<(p.meleeReadyAt||0))return false;p.meleeReadyAt=this.time+.42;p.meleeSwing=.18;p.revealedUntil=this.time+1.5;
 const range=p.melee<0?58:83,damage=p.melee<0?14:28;
 for(const other of this.actors.values())if(other!==p&&other.hp>0&&other.phase==='ground'&&C.hyp(p,other)<=range&&Math.cos(Math.atan2(other.y-p.y,other.x-p.x)-p.angle)>.15&&!C.raycast(this.world,p.x,p.y,other.x,other.y,0))this.damage(other,damage,p);
 for(const o of this.world.index.query(p.x-range,p.y-range,range*2,range*2))if(o.destructible&&!o.destroyed){const b=C.bounds(o),q={x:b.x+b.w/2,y:b.y+b.h/2};if(C.hyp(p,q)<range+20&&Math.cos(Math.atan2(q.y-p.y,q.x-p.x)-p.angle)>.15)C.damageObject(this.world,o,damage,p)}
 const crate=this.world.containers.find(c=>c.kind==='basic'&&!c.open&&C.hyp(p,c)<range);if(crate){crate.hp-=damage;if(crate.hp<=0)C.openContainer(this.world,crate,p)}return true;
 }
 damage(p,n,source){const shield=Math.min(p.shield||0,n);p.shield-=shield;p.hp-=n-shield;if(p.hp<=0&&!p.dead){p.dead=true;if(source)source.kills=(source.kills||0)+1;const spot=C.findValid(this.world,p,12);this.world.loot.push({id:'loot-'+this.world.nextId++,...spot,type:'ammo',amount:30,taken:false})}}
 interact(p){
 const target=C.interactionTarget(this.world,p);if(!target)return{ok:false};if(target.kind==='door')return C.interactDoor(this.world,target.object,p,[...this.actors.values()]);if(target.kind==='container')return{ok:C.openContainer(this.world,target.object,p).length>0};const item=target.object;if(item.type==='gun'){let i=p.inventory.findIndex((g,i)=>i>0&&!g);if(i<0)i=p.slot>0?p.slot:1;p.inventory[i]=this.gun(item.weapon,item.rarity||0);p.slot=i}
 else if(item.type==='med')p.med++;else if(item.type==='shield')p.shield=Math.min(100,p.shield+35);else if(item.type==='ammo'){for(const g of p.inventory)if(g)g.reserve+=item.amount||30}
 item.taken=true;return{ok:true};
 }
 botInput(p,dt){
 const targets=[...this.actors.values()].filter(a=>a!==p&&a.hp>0&&a.phase==='ground'&&C.hyp(a,p)<800&&C.canSee(this.world,p,a)).sort((a,b)=>C.hyp(a,p)-C.hyp(b,p)),target=targets[0];
 if(target){p.angle=Math.atan2(target.y-p.y,target.x-p.x);if(C.hyp(target,p)>240)C.moveActor(this.world,p,Math.cos(p.angle),Math.sin(p.angle),dt,p.speed);
  if(this.time>=p.nextBotShot&&C.hyp(target,p)<550){this.fire(p,this.time*1000,true);p.nextBotShot=this.time+.55}
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
   const target=p.dropTarget||p,delta={x:target.x-p.x,y:target.y-p.y},distance=Math.hypot(delta.x,delta.y)||1,input=p.bot?{dx:delta.x/distance,dy:delta.y/distance,aim:Math.atan2(delta.y,delta.x)}:this.inputs.get(p.id)||{dx:0,dy:0,aim:p.angle};p.angle=input.aim;const length=Math.hypot(input.dx,input.dy)||1;p.x=C.clamp(p.x+input.dx/length*246*dt,80,5920);p.y=C.clamp(p.y+input.dy/length*246*dt,80,5920);p.dropRemaining-=dt*(p.dropFast?2:1);
   if(p.dropRemaining<=0){Object.assign(p,C.findValid(this.world,p,26,true));p.phase='ground';p.dropRemaining=0;if(!p.bot){const input=this.inputs.get(p.id);p.blockFireUntilRelease=!!input?.fire;if(input)input.fire=false}}continue;
  }
  if(p.bot){this.botInput(p,dt);continue}
  const input=this.time-(p.lastInputAt??this.time)>.35?{dx:0,dy:0,aim:p.angle,fire:false}:this.inputs.get(p.id)||{dx:0,dy:0,aim:p.angle,fire:false};p.angle=input.aim;C.moveActor(this.world,p,input.dx,input.dy,dt);
  const g=p.inventory[p.slot];if(input.fire&&p.slot===0)this.melee(p);
  if(input.fire&&g){let at=Math.max(start,g.nextFireAtMs);for(let n=0;n<8&&at<=this.time*1000+1e-7;n++){this.finishReload(g,at);if(g.reloading){at=Math.max(at,g.reloadEndsAtMs);continue}if(!this.fire(p,at))break;at=Math.max(g.nextFireAtMs,g.reloading?g.reloadEndsAtMs:0)}}
  for(const gun of p.inventory)if(gun)this.finishReload(gun,this.time*1000);
 }
 for(const b of this.bullets){
  const step=Math.max(0,(this.time*1000-Math.max(start,b.spawnTimeMs))/1000),nx=b.x+b.vx*step,ny=b.y+b.vy*step,wall=C.raycast(this.world,b.x,b.y,nx,ny,1);let closest=wall?{t:wall.t,wall:wall.object}:null;
  for(const p of live)if(p.id!==b.owner&&p.phase==='ground'){const t=C.segmentHitCircle(b.x,b.y,nx,ny,p);if(t!==null&&(!closest||t<closest.t))closest={t,actor:p}}
  if(closest){b.x+=(nx-b.x)*closest.t;b.y+=(ny-b.y)*closest.t;b.life=0;if(closest.actor)this.damage(closest.actor,b.damage,this.actors.get(b.owner));else C.damageObject(this.world,closest.wall,b.damage)}
  else{b.x=nx;b.y=ny;b.life-=step}
 }
 this.bullets=this.bullets.filter(b=>b.life>0);C.advanceZone(this.world,dt,live);if(this.world.events.length>60)this.world.events.splice(0,this.world.events.length-60);
 }
 snapshot(id){
 const self=this.actors.get(id);if(!self)return null;
 const actors=[...this.actors.values()].filter(a=>a.id!==id&&a.hp>0&&C.canSee(this.world,self,a)).map(p=>({id:p.id,name:p.name,x:p.x,y:p.y,hp:p.hp,shield:p.shield,angle:p.angle,phase:p.phase,dropRemaining:p.dropRemaining,skin:p.skin,backpack:p.backpack,melee:p.melee,parachute:p.parachute,slot:p.slot,weaponType:p.inventory[p.slot]?.type??0,bot:p.bot,meleeSwing:p.meleeSwing,revealedUntil:p.revealedUntil}));
 const alive=[...this.actors.values()].filter(p=>p.hp>0).length;
 return {tick:this.tick,time:this.time,seed:this.world.seed,self:JSON.parse(JSON.stringify(self)),actors,alive,zone:this.world.zone,plane:{route:this.route,position:C.planePosition(this.route,this.time)},doors:this.world.doors.map(d=>({id:d.id,open:d.open,changedAt:d.changedAt})),destroyed:this.world.objects.filter(o=>o.destroyed).map(o=>o.id),containers:this.world.containers.filter(c=>c.open).map(c=>c.id),loot:this.world.loot.filter(l=>!l.taken&&C.hyp(l,self)<1400),bullets:this.bullets.filter(b=>C.hyp(b,self)<1500).map(b=>({...b})),marker:this.markers.get(id)||null};
 }
}
module.exports={Session};

