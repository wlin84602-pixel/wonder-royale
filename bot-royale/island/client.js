// Island integration. Existing weapon artwork, rates, reload functions and menus remain the source of truth.
let islandState=null,islandMarker=null,islandMapOpen=false,islandRenderCount=0,islandLastDt=.016,islandSound=null,islandInteractionNote='',islandNoteUntil=0;
const Island=IslandCore,IslandDraw=IslandRender,ISLAND_GROUND_ZOOM=1/Math.sqrt(5);
const islandOriginal={newGame,goHome,end,update,draw,shoot,reload,swingMelee,interact,finishLanding,createPlaneRoute,useSelectedMedkit,onkeydown,onmousedown,oncontextmenu};
let islandNetwork={enabled:typeof location!=='undefined'&&/^https?:/.test(location.protocol)&&new URLSearchParams(location.search).get('online')==='1',ready:false,token:null,id:null,last:null,receivedAt:0,sequence:0,actionSeq:0,timer:null,stream:null,joining:false,generation:0,error:'',snapshots:[]};
// Plane view is 3x closer than the previous flight view; parachuting shows a 1.5x wider view than ground gameplay.
function islandFlightZoom(phase=dropPhase){const fit=Math.max(innerWidth/world,innerHeight/world),plane=Math.max(fit,Math.sqrt(6*innerWidth*innerHeight)/world)*3;return phase==='plane'?plane:phase==='parachute'?ISLAND_GROUND_ZOOM/1.5:ISLAND_GROUND_ZOOM}
function islandFollowFlight(dt){const smooth=Math.min(1,dt*10);cameraZoom+=(islandFlightZoom()-cameraZoom)*smooth;cameraX+=(player.x-cameraX)*smooth;cameraY+=(player.y-cameraY)*smooth;if(dropPhase==='plane'){cameraX=player.x;cameraY=player.y}islandClampCamera()}
updateDrop=function(dt){
 if(dropPhase==='plane'){planeElapsed+=dt;Object.assign(player,Island.planePosition(planeRoute,planeElapsed));if(planeElapsed>=planeRoute.duration)startParachuteDrop()}
 else if(dropPhase==='parachute'){dropFast=!!keys[' '];const {dx,dy}=movementVector(),length=Math.hypot(dx,dy)||1;player.x=Island.clamp(player.x+dx/length*Island.PARACHUTE_SPEED*dt,40,world-40);player.y=Island.clamp(player.y+dy/length*Island.PARACHUTE_SPEED*dt,40,world-40);dropRemaining=Math.max(0,dropRemaining-dt*(dropFast?2:1));if(dropRemaining<.000001)finishLanding()}
 islandFollowFlight(dt);if(dropPhase==='parachute')updatePlayerAim();updateHUD()
};
function islandCurrentActors(){return [player,...bots].filter(Boolean)}
function islandNote(text){islandInteractionNote=text;islandNoteUntil=islandState.time+2}
function islandArmSound(){if(islandSound||typeof AudioContext==='undefined')return;try{islandSound=new AudioContext()}catch{}}
function islandDoorSound(open=true){if(!islandSound)return;try{const o=islandSound.createOscillator(),g=islandSound.createGain();o.type='triangle';o.frequency.setValueAtTime(open?170:230,islandSound.currentTime);o.frequency.exponentialRampToValueAtTime(open?95:140,islandSound.currentTime+.1);g.gain.setValueAtTime(.035,islandSound.currentTime);g.gain.exponentialRampToValueAtTime(.001,islandSound.currentTime+.13);o.connect(g);g.connect(islandSound.destination);o.start();o.stop(islandSound.currentTime+.14)}catch{}}
function initializeIsland(seed){
 islandDamageNumbers=[];islandSeenDamageEvents=new Set();islandState=Island.buildWorld(seed);islandMarker=null;islandMapOpen=false;$('#island-map-panel').style.display='none';
 buildings=islandState.buildings;trees=islandState.objects.filter(o=>o.kind==='tree');loot=islandState.loot;chests=islandState.containers;
 planeRoute=Island.planeRoute(seed);for(let i=0;i<bots.length;i++){const loc=islandState.locations[i%8],point=Island.findValid(islandState,{x:loc.x-470+islandState.random()*940,y:loc.y-450+islandState.random()*900},26,true);Object.assign(bots[i],planeRoute.start,{id:'offline-bot-'+i,phase:'plane',dropRemaining:Island.DROP_SECONDS,dropFast:false,dropTarget:point,jumpAt:planeRoute.duration*(.18+islandState.random()*.62),parachute:i%5,shield:10,revealedUntil:0});}
 player.id='local';player.phase='plane';player.revealedUntil=0;planeRoute=Island.planeRoute(seed);planeVariant=(seed>>>0)%2;planeElapsed=0;Object.assign(player,planeRoute.start);cameraX=player.x;cameraY=player.y;cameraZoom=islandFlightZoom();
 if(typeof document.body?.classList?.toggle==='function')document.body.classList.toggle('island-match',true);
 $('#island-minimap').style.display='block';$('#island-zone-hud').style.display='block';$('#island-network-state').style.display='block';$('#island-network-state').textContent=islandNetwork.enabled?'CONNECTING':'SOLO · LOCAL';islandClampCamera();
}
newGame=function(){
 if(islandNetwork.token)islandDisconnect();
 islandOriginal.newGame();initializeIsland(Math.floor(Math.random()*4294967296));
 if(islandNetwork.enabled){islandNetwork.pendingDropCount=0;islandNetwork.actionQueue=Promise.resolve();islandJoin()}
};
createPlaneRoute=function(){return Island.planeRoute(islandState?.seed||Math.floor(Math.random()*4294967296))};
finishLanding=function(){
 islandOriginal.finishLanding();if(islandState){const point=Island.findValid(islandState,player,player.r,true);Object.assign(player,point);player.phase='ground';}
};
function islandClampCamera(){
 cameraZoom=Math.max(cameraZoom,innerWidth/world,innerHeight/world);
 if(dropPhase==='plane'||dropPhase==='parachute')return;
 const hx=innerWidth/(cameraZoom*2),hy=innerHeight/(cameraZoom*2);cameraX=Island.clamp(cameraX,hx,world-hx);cameraY=Island.clamp(cameraY,hy,world-hy);
}
function islandNearestHint(){const target=Island.interactionTarget(islandState,player);if(!target||target.kind==='loot'){const bush=Island.bushAt(islandState,player);return bush?(islandState.time<(player.revealedUntil||0)?'REVEALED · WAIT TO HIDE':'HIDDEN IN BUSH'):''}const q=target.object;return keyLabel(bindings.interact)+' · '+(target.kind==='door'?(q.open?'Close door':'Open door'):target.kind==='container'?(q.kind==='ultimate'?'Open ultimate crate':q.kind==='gold'?'Open gold chest':q.kind==='ammo'?'Open ammo crate':'Open wooden crate'):'Pick up '+(q.type==='gun'?types[q.weapon].name:q.type))}
interact=function(){
 if(!islandState||dropPhase!=='ground'||!running)return;
 const intent=movementVector();player.doorMoveX=intent.dx;player.doorMoveY=intent.dy;player.doorMoveAt=islandState.time;
 islandArmSound();if(islandNetwork.ready){
  const target=Island.interactionTarget(islandState,player);
  if(target?.kind==='door'){
   const d=target.object,net=islandNetwork;net.doorPredictions||=new Map();
   const before={open:d.open,lastUse:d.lastUse,changedAt:d.changedAt,swing:d.swing,turnFrom:d.turnFrom},result=Island.interactDoor(islandState,d,player,islandCurrentActors());
   if(!result.ok){if(result.reason==='Doorway occupied')islandNote(result.reason);return}
   const pending={seq:net.actionSeq+1,before,moved:result.moved||[]};net.doorPredictions.set(d.id,pending);islandDoorSound(d.open);
   islandSendAction('interact',{doorId:d.id,open:d.open}).then(reply=>{
    if(net.doorPredictions.get(d.id)!==pending)return;
    if(reply?.door)Object.assign(d,reply.door);else Object.assign(d,before);
    if(!reply?.ok){for(const move of pending.moved){const actor=islandCurrentActors().find(a=>a.id===move.id);if(actor&&dist(actor,move)<2){actor.x=move.fromX;actor.y=move.fromY}}net.doorPredictions.delete(d.id);}
   });return;
  }
  islandSendAction('interact');return
 }
 const target=Island.interactionTarget(islandState,player);if(!target)return;
 if(target.kind==='door'){const door=target.object,result=Island.interactDoor(islandState,door,player,islandCurrentActors());if(result.ok)islandDoorSound(door.open);else if(result.reason==='Doorway occupied')islandNote('Doorway occupied');return}
 if(target.kind==='container'){const items=Island.openContainer(islandState,target.object,player);for(const q of items)if(q.type==='ammo')IslandInventory.pickup(islandState,player,q);updateHUD();return}
 const ok=IslandInventory.pickup(islandState,player,target.object,(type,rarity)=>gun(type,rarity));if(!ok)islandNote('Loadout full');slot=player.slot??slot;selectedItem=IslandInventory.isMed(player.inventory[slot])?'medkit':'weapon';updateHUD();
}
shoot=function(a,angle,enemy=false,atMs=combatInputTimeMs()){
 if(islandNetwork.ready&&!enemy){islandSendInput();return false;}
 if(!enemy){const g=a.inventory[slot];if(IslandInventory.isMed(g))return false;if(g?.reloading){advanceWeaponReload(g,atMs);if(g.reloading){g.reloading=false;g.reload=0;g.reloadEndsAtMs=0}}IslandInventory.feedGun(a,g)}
 const firstBullet=bullets.length,result=islandOriginal.shoot(a,angle,enemy,atMs);if(result&&!enemy&&a.inventory[slot]?.type===2&&(a.inventory[slot].fireProfile||PLAYER_WEAPON_FIRE_PROFILE[2])==='Pump Shotgun')Island.configurePumpShot(bullets.slice(firstBullet),a.inventory[slot].rarity,angle);
 if(result&&islandState)a.revealedUntil=islandState.time+1.5;return result;
};
reload=function(){
 if(!player||!running||settingsOpen||matchMenuOpen||dropPhase!=='ground'||slot===0)return false;
 const g=player.inventory[slot];if(!IslandInventory.isGun(g))return false;
 if(islandNetwork.ready){islandSendAction('reload');return false}
 advanceWeaponReload(g,combatInputTimeMs());if(g.reloading)return false;
 IslandInventory.feedGun(player,g);return islandOriginal.reload()
};
swingMelee=function(){
 if(islandNetwork.ready){islandSendAction('melee');return}
 if(!islandState)return islandOriginal.swingMelee();
 if(!running||settingsOpen||matchMenuOpen||dropPhase!=='ground'||slot!==0||selectedItem!=='weapon')return;
 const all=bots;bots=all.filter(b=>!Island.raycast(islandState,player.x,player.y,b.x,b.y,0));islandOriginal.swingMelee();bots=all;player.revealedUntil=islandState.time+1.5;
 const range=selectedCosmetic('melees')<0?58:83,amount=selectedCosmetic('melees')<0?14:28;
 for(const object of islandState.index.query(player.x-range,player.y-range,range*2,range*2))if(!object.destroyed&&object.destructible){const b=Island.bounds(object),point=object.shape==='circle'?object:{x:b.x+b.w/2,y:b.y+b.h/2};if(dist(point,player)<range+20&&Math.cos(Math.atan2(point.y-player.y,point.x-player.x)-player.angle)>.15){const hit=Island.raycast(islandState,player.x,player.y,point.x,point.y,0);if(!hit||hit.object.id===object.id)Island.damageObject(islandState,object,amount,player)}}
};
useSelectedMedkit=function(){if(!running||dropPhase!=='ground'||selectedItem!=='medkit')return;player.slot=slot;if(islandNetwork.ready){islandSendAction('medkit');return}IslandInventory.act(islandState,player,{kind:'medkit'});selectedItem=IslandInventory.isMed(player.inventory[slot])?'medkit':'weapon';updateHUD()};
function islandDeployBot(b,dt){if(b.phase==='plane'){Object.assign(b,Island.planePosition(planeRoute,islandState.time));if(islandState.time>=b.jumpAt||islandState.time>=planeRoute.duration)b.phase='parachute';return true}if(b.phase==='parachute'){const target=b.dropTarget||b,dx=target.x-b.x,dy=target.y-b.y,n=Math.hypot(dx,dy)||1;b.angle=Math.atan2(dy,dx);b.x=Island.clamp(b.x+dx/n*Island.PARACHUTE_SPEED*dt,40,world-40);b.y=Island.clamp(b.y+dy/n*Island.PARACHUTE_SPEED*dt,40,world-40);b.dropRemaining-=dt;if(b.dropRemaining<=0){Object.assign(b,Island.findValid(islandState,b,26,true));b.phase='ground';b.dropRemaining=0}return true}return false}
function islandBotStep(b,dt){
 b.cd-=dt;b.turn-=dt;const targets=islandCurrentActors().filter(t=>t!==b&&t.hp>0&&(!t.phase||t.phase==='ground')&&dist(b,t)<700&&Island.canSee(islandState,b,t)).sort((a,c)=>dist(b,a)-dist(b,c)),target=targets[0];
 if(target){b.angle=Math.atan2(target.y-b.y,target.x-b.x);if(dist(b,target)>210)Island.moveActor(islandState,b,Math.cos(b.angle),Math.sin(b.angle),dt,105);if(b.cd<=0&&dist(b,target)<500)shoot(b,b.angle,true)}
 else{const z=islandState.zone.current;if(dist(b,z)>z.r-100)b.angle=Math.atan2(z.y-b.y,z.x-b.x);else if(b.turn<=0){b.angle=rnd(0,7);b.turn=rnd(.7,2)}const before={x:b.x,y:b.y};Island.moveActor(islandState,b,Math.cos(b.angle),Math.sin(b.angle),dt,85);if(dist(before,b)<.2)b.turn=0}
 const door=islandState.doors.find(d=>!d.open&&dist(b,{x:d.x+d.w/2,y:d.y+d.h/2})<75);if(door)Island.interactDoor(islandState,door,b,islandCurrentActors());
}
function islandStepBullets(dt,frameStartMs){
 for(const q of bullets){
  const travelDt=q.spawnTimeMs===undefined?dt:Math.max(0,(combatTimeMs-Math.max(frameStartMs,q.spawnTimeMs))/1000),nx=q.x+q.vx*travelDt,ny=q.y+q.vy*travelDt,wall=Island.raycast(islandState,q.x,q.y,nx,ny,1);let collision=wall?{t:wall.t,object:wall.object}:null;
  for(const target of islandCurrentActors())if(target!==q.owner&&target.hp>0&&target.phase==='ground'){const t=Island.segmentHitCircle(q.x,q.y,nx,ny,target);if(t!==null&&(!collision||t<collision.t))collision={t,target}}
  if(collision){q.life=0;if(collision.target){const t=collision.target;const oldHp=t.hp,oldShield=t.shield||0;damage(t,q.damage);if(q.owner===player){t.hitByPlayer=true;islandAddDamageNumber(t,Math.min(oldHp,Math.max(0,oldHp-t.hp)),Math.max(0,oldShield-t.shield))}Island.applyPumpHit(islandState,q,t)}else Island.damageObject(islandState,collision.object,q.damage,q.owner)}
  else{q.x=nx;q.y=ny;q.life-=travelDt}
 }
 bullets=bullets.filter(q=>q.life>0);
}
function islandResolveDeaths(){
 for(const b of bots)if(b.hp<=0&&!b.islandDead){b.islandDead=true;if(b.hitByPlayer)kills++;const point=Island.findValid(islandState,b,13);islandState.loot.push({id:'loot-'+islandState.nextId++,...point,type:'ammo',amount:30,taken:false})}
 bots=bots.filter(b=>b.hp>0);loot=islandState.loot.filter(l=>!l.taken);islandState.loot=loot;
}
update=function(dt,frameWallMs=combatWallTimeMs()){
 islandLastDt=dt;if(!islandState)return islandOriginal.update(dt,frameWallMs);
 if(islandNetwork.enabled){islandOnlineUpdate(dt);return}
 islandState.time+=dt;player.phase=dropPhase;
 if(dropPhase!=='ground'){
  islandOriginal.update(dt,frameWallMs);player.phase=dropPhase;for(const b of bots)if(!islandDeployBot(b,dt))islandBotStep(b,dt);islandStepBullets(dt,combatTimeMs);islandResolveDeaths();Island.advanceZone(islandState,dt,bots);islandClampCamera();return;
 }
 const frameStartMs=combatTimeMs;combatTimeMs+=Math.max(0,dt)*1000;combatWallAnchorMs=frameWallMs;time+=dt;
 const smooth=Math.min(1,dt*10);cameraZoom+=(ISLAND_GROUND_ZOOM-cameraZoom)*smooth;cameraX+=(player.x-cameraX)*smooth;cameraY+=(player.y-cameraY)*smooth;
 const movement=movementVector();Island.moveActor(islandState,player,movement.dx,movement.dy,dt,player.speed);IslandInventory.autoAmmo(islandState,player);
 player.cd-=dt;player.meleeSwing=Math.max(0,(player.meleeSwing||0)-dt);updatePlayerAim();
 advancePlayerCombat(frameStartMs,combatTimeMs);
 if(selectedItem==='weapon'&&slot===0&&actionDown('fire')&&player.cd<=0)swingMelee();
 for(const b of bots)if(!islandDeployBot(b,dt))islandBotStep(b,dt);
 islandStepBullets(dt,frameStartMs);islandResolveDeaths();
 Island.advanceZone(islandState,dt,islandCurrentActors());storm=islandState.zone.current.r;
 islandClampCamera();updateHUD();if(player.hp<=0)end(false);else if(!bots.length)end(true);
};
let islandHoverCanvas=false;
const islandPreviousMouseMove=onmousemove;
onmousemove=function(e){islandPreviousMouseMove(e);islandHoverCanvas=e.target===c};
let islandDamageNumbers=[],islandSeenDamageEvents=new Set();
function islandAddDamageNumber(target,hp,shield){
 if(hp<=0&&shield<=0)return;const now=performance.now(),id=target.id;let entry=islandDamageNumbers.findLast(e=>e.id===id&&now-e.started<180);
 if(entry){entry.hp+=hp;entry.shield+=shield;entry.x=target.x;entry.y=target.y}else islandDamageNumbers.push({id,x:target.x,y:target.y,hp,shield,started:now});if(islandDamageNumbers.length>48)islandDamageNumbers.shift()
}
function islandDrawDamageNumbers(){
 if(!islandDamageNumbers.length)return;const now=performance.now();islandDamageNumbers=islandDamageNumbers.filter(e=>now-e.started<850);if(!running||dropPhase!=='ground')return;
 const actors=new Map(islandCurrentActors().map(a=>[a.id,a]));x.save();x.font='bold 15px sans-serif';x.textAlign='center';x.textBaseline='middle';x.lineWidth=3;x.strokeStyle='#10232dcc';
 for(const e of islandDamageNumbers){const a=actors.get(e.id)||e,age=(now-e.started)/1000,sx=innerWidth/2+(a.x-cameraX)*cameraZoom,sy=innerHeight/2+(a.y-cameraY)*cameraZoom-Math.max(15,(a.r||26)*cameraZoom)-14-age*90;x.globalAlpha=Math.min(1,(.85-age)/.25);if(e.hp>0){const text=String(Math.round(e.hp));x.strokeText(text,sx,sy);x.fillStyle='#ffffff';x.fillText(text,sx,sy)}if(e.shield>0){const text=String(Math.round(e.shield)),yy=sy-(e.hp>0?18:0);x.strokeText(text,sx,yy);x.fillStyle='#ffab45';x.fillText(text,sx,yy)}}x.restore()
}
function islandReloadProgress(){
 const g=player?.inventory[slot];if(!running||dropPhase!=='ground'||!IslandInventory.isGun(g)||!g.reloading)return null;
 const now=islandNetwork.ready?islandState.time*1000:combatTimeMs,remaining=g.reloadEndsAtMs-now;
 return remaining>0?Island.clamp(1-remaining/WEAPON_RELOAD_MS,0,1):null
}
function islandDrawReloadRing(){
 const progress=islandReloadProgress();if(progress===null)return;const sx=innerWidth/2+(player.x-cameraX)*cameraZoom,sy=innerHeight/2+(player.y-cameraY)*cameraZoom,r=Math.max(18,player.r*cameraZoom+10);
 x.save();x.lineWidth=3.5;x.lineCap='round';x.strokeStyle='#102630b8';x.beginPath();x.arc(sx,sy,r,0,Math.PI*2);x.stroke();x.strokeStyle='#ffffff';x.beginPath();x.arc(sx,sy,r,-Math.PI/2,-Math.PI/2+progress*Math.PI*2);x.stroke();x.restore()
}
function islandDrawPlaneAt(position){const art=planeSprites[planeVariant];x.save();x.translate(position.x,position.y);x.rotate(planeRoute.angle+Math.PI/2);if(art){const f=300/Math.max(art.width,art.height);x.drawImage(art,-art.width*f/2,-art.height*f/2,art.width*f,art.height*f)}else{x.fillStyle='#f3efdc';x.strokeStyle='#294847';x.lineWidth=4;x.beginPath();x.moveTo(0,-95);x.lineTo(18,-10);x.lineTo(90,28);x.lineTo(90,40);x.lineTo(12,20);x.lineTo(8,80);x.lineTo(-8,80);x.lineTo(-12,20);x.lineTo(-90,40);x.lineTo(-90,28);x.lineTo(-18,-10);x.closePath();x.fill();x.stroke()}x.restore()}
function islandDrawRemote(a){
 if(a.phase&&a.phase!=='ground'){const chute=cosmeticSprite('parachutes',a.parachute??0);if(chute){x.save();x.translate(a.x,a.y);x.rotate(a.angle+Math.PI/2);const f=110/Math.max(chute.width,chute.height);x.drawImage(chute,-chute.width*f/2,-chute.height*f/2,chute.width*f,chute.height*f);x.restore()}return}
 if(!islandNetwork.ready)return drawCharacter(a);
 drawCharacter(a);
}
draw=function(){
 if(!islandState||!player)return islandOriginal.draw();islandClampCamera();
 x.setTransform(scale,0,0,scale,0,0);x.globalAlpha=1;x.globalCompositeOperation='source-over';x.setLineDash([]);x.fillStyle='#4b9bb4';x.fillRect(0,0,innerWidth,innerHeight);
 const view={x:cameraX-innerWidth/(2*cameraZoom)-120,y:cameraY-innerHeight/(2*cameraZoom)-120,w:innerWidth/cameraZoom+240,h:innerHeight/cameraZoom+240},visible=b=>b.x+b.w>=view.x&&b.x<=view.x+view.w&&b.y+b.h>=view.y&&b.y<=view.y+view.h;let objects=dropPhase==='plane'&&cameraZoom<.16&&IslandDraw.farScene?[]:islandState.index.query(view.x,view.y,view.w,view.h);
 islandRenderCount=objects.length;
 x.save();x.translate(innerWidth/2,innerHeight/2);x.scale(cameraZoom,cameraZoom);x.translate(-Math.round(cameraX*cameraZoom*scale)/(cameraZoom*scale),-Math.round(cameraY*cameraZoom*scale)/(cameraZoom*scale));
 const far=dropPhase==='plane'&&cameraZoom<.16&&IslandDraw.farScene&&IslandDraw.farScene(x,islandState,view);if(!far&&!objects.length)objects=islandState.index.query(view.x,view.y,view.w,view.h);islandRenderCount=objects.length;
 if(!far){IslandDraw.terrain(x,islandState,view);IslandDraw.floors(x,islandState,visible)}
 const opaque=new Map(islandState.buildings.filter(b=>visible(b)&&b.outline?.length===4&&!Island.canViewInterior(islandState,b,player)).map(b=>[b.id,b]));
 for(const o of objects)if(!far&&o.kind!=='door'){const b=opaque.get(o.building),r=b?Island.bounds(o):null;if(b&&r.x>b.x+24&&r.y>b.y+24&&r.x+r.w<b.x+b.w-24&&r.y+r.h<b.y+b.h-24)continue;IslandDraw.object(x,o,islandState.time)}
 for(const q of chests)if(!far&&visible({x:q.x-30,y:q.y-30,w:60,h:60}))IslandDraw.crate(x,q);
 for(const q of loot)if(visible({x:q.x-80,y:q.y-80,w:160,h:160})&&(!Island.buildingAt(islandState,q)||Island.canViewInterior(islandState,Island.buildingAt(islandState,q),player))){const sx=innerWidth/2+(q.x-cameraX)*cameraZoom,sy=innerHeight/2+(q.y-cameraY)*cameraZoom,hovered=islandHoverCanvas&&!islandMapOpen&&!matchMenuOpen&&!settingsOpen&&q.type==='gun'&&!q.taken&&Math.hypot(mouse.x-sx,mouse.y-sy)<=Math.max(12,37*cameraZoom);IslandDraw.loot(x,q,q.type==='gun'?weaponSprites[[1,0,2,3][q.weapon]]:null,tiers,dropPhase==='ground'&&(dist(q,player)<85||hovered),keyLabel(bindings.interact),q.type==='gun'?types[q.weapon]?.name:'')}
 for(let q of bullets){x.save();x.translate(q.x,q.y);x.rotate(Math.atan2(q.vy,q.vx));let size=q.kind===3?13:q.kind===2?12:10;x.strokeStyle=q.kind===2?'#ffe0a6dd':q.owner===player?'#ffdc8a99':'#ff9b7a99';x.lineWidth=q.kind===2?3:2;x.beginPath();x.moveTo(-size*1.9,0);x.lineTo(-size*.35,0);x.stroke();x.fillStyle='#3d3025';x.fillRect(-size*.48,-2.8,size*.8,5.6);x.fillStyle=q.owner===player?'#d8aa67':'#c98369';x.fillRect(-size*.4,-2.1,size*.65,4.2);x.beginPath();x.moveTo(size*.25,-2.1);x.quadraticCurveTo(size*.65,0,size*.25,2.1);x.closePath();x.fillStyle='#f3d3a0';x.fill();x.fillStyle='#fff0ca';x.fillRect(-size*.25,-1.5,size*.42,.7);x.restore()}
 for(const b of bots)if((!b.phase||b.phase==='ground')&&Island.canSee(islandState,player,b)&&(!Island.buildingAt(islandState,b)||Island.canViewInterior(islandState,Island.buildingAt(islandState,b),player)))islandDrawRemote(b);
 if(dropPhase==='ground')drawCharacter(player);
 if(!far)IslandDraw.bushes(x,islandState,visible,player);if(!far){IslandDraw.canopies(x,objects,player);IslandDraw.roofs(x,islandState,player,visible,islandLastDt)}for(const o of objects)if(!far&&o.kind==='door'&&(o.exterior||Island.canViewInterior(islandState,islandState.buildings.find(b=>b.id===o.building),player)))IslandDraw.object(x,o,islandState.time);IslandDraw.gas(x,islandState,view);if(islandState.time<planeRoute.duration)islandDrawPlaneAt(Island.planePosition(planeRoute,islandState.time));if(dropPhase==='parachute')drawDropVehicle();for(const a of bots)if(a.phase==='parachute'&&Island.canSee(islandState,player,a))islandDrawRemote(a);
 if(islandMarker){x.strokeStyle='#ffdc5e';x.lineWidth=3;x.beginPath();x.arc(islandMarker.x,islandMarker.y,24,0,7);x.moveTo(islandMarker.x,islandMarker.y-33);x.lineTo(islandMarker.x,islandMarker.y+33);x.stroke()}
 if(dropPhase==='ground'){const hint=islandState.time<islandNoteUntil?islandInteractionNote:islandNearestHint();if(hint){x.font='bold 12px sans-serif';x.textAlign='center';x.fillStyle='#092b36e8';x.beginPath();x.roundRect(player.x-105,player.y-79,210,25,6);x.fill();x.fillStyle='#eff9eb';x.fillText(hint,player.x,player.y-62);x.textAlign='start'}}
 x.restore();drawLandingBar();islandDrawReloadRing();islandDrawDamageNumbers();
 if(player.gasHitUntil>islandState.time){x.strokeStyle='#54bfff90';x.lineWidth=14;x.strokeRect(7,7,innerWidth-14,innerHeight-14)}
 islandDrawMaps();
};
function islandDrawMaps(){
 if(!running)return;
 const mini=$('#island-minimap'),sz=innerWidth<700?132:184;if(mini.width!==sz){mini.width=sz;mini.height=sz}const m=mini.getContext('2d');
 const plane=islandState.time<planeRoute.duration?Island.planePosition(planeRoute,islandState.time):null;
 IslandDraw.map(m,islandState,sz,sz,player,islandMarker,plane?planeRoute:null,plane,dropPhase==='ground'?1900/ISLAND_GROUND_ZOOM:world);
 const z=islandState.zone,phase=z.phase+1,count=Island.zoneCountdown(islandState),label=z.mode==='prepare'?'GAS MOVES':z.mode==='shrink'?'GAS CLOSING':'FINAL CIRCLE';
 islandSetText('#island-zone-hud',label+' · '+count+'s · '+phase+'/6');
 if(islandMapOpen){const full=$('#island-full-map'),side=Math.max(240,Math.min(innerHeight-145,innerWidth-70,820));if(full.width!==side){full.width=side;full.height=side}IslandDraw.map(full.getContext('2d'),islandState,side,side,player,islandMarker,plane?planeRoute:null,plane);$('#island-map-timer').textContent=label+' IN '+count+'s'}
}
function toggleIslandMap(value=!islandMapOpen){if(!running||!islandState)return;islandMapOpen=value;$('#island-map-panel').style.display=value?'grid':'none';if(value)clearInput();islandDrawMaps()}
function islandMapPoint(e){const canvas=$('#island-full-map'),r=canvas.getBoundingClientRect();return{x:Island.clamp((e.clientX-r.left)/r.width*world,0,world),y:Island.clamp((e.clientY-r.top)/r.height*world,0,world)}}
$('#island-minimap').addEventListener('click',()=>toggleIslandMap(true));$('#island-close-map').onclick=()=>toggleIslandMap(false);
$('#island-full-map').addEventListener('click',e=>{if(!running)return;islandMarker=islandMapPoint(e);if(islandNetwork.ready)islandSendAction('marker',islandMarker)});
$('#island-full-map').addEventListener('contextmenu',e=>{e.preventDefault();islandMarker=null;if(islandNetwork.ready)islandSendAction('marker',{remove:true})});
onkeydown=function(e){
 const key=e.key.toLowerCase();if(running&&!settingsOpen&&!matchMenuOpen&&key===bindings.map){e.preventDefault?.();if(!e.repeat)toggleIslandMap();return}
 if(running&&!settingsOpen&&!matchMenuOpen&&key===' '&&(dropPhase==='plane'||dropPhase==='parachute')){e.preventDefault?.();keys[' ']=true;dropFast=true;if(!e.repeat&&dropPhase==='plane'){if(islandNetwork.enabled){if(islandNetwork.ready)islandSendAction('jump');else islandNetwork.pendingDropCount=1}else{startParachuteDrop();keys[' ']=true;dropFast=true}}if(islandNetwork.ready)islandSendInput();return}
 islandOriginal.onkeydown(e);if(islandNetwork.ready)islandSendInput();
};
async function islandRequest(endpoint,body,token=islandNetwork.token){const response=await fetch('/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),keepalive:endpoint==='leave'});if(!response.ok)throw Error('Server request failed ('+response.status+')');return response.json()}
async function islandJoin(){
 const net=islandNetwork,generation=++net.generation;net.joining=true;net.ready=false;net.error='';
 try{
  const room=net.room||new URLSearchParams(location.search).get('room')||'main',data=await islandRequest('join',{room,name:localProfile.nickname,look:{skin:selectedCosmetic('skins'),backpack:selectedCosmetic('backpacks'),melee:selectedCosmetic('melees'),parachute:selectedCosmetic('parachutes')}},null);
  if(generation!==net.generation){islandRequest('leave',{},data.token).catch(()=>{});return}
  net.token=data.token;net.id=data.id;net.inputInFlight=0;net.lastSentInput=null;net.sequence=0;net.actionSeq=0;net.last=null;net.doorPredictions=new Map();initializeIsland(data.seed);planeRoute=data.route;net.ready=true;net.joining=false;
  islandApplySnapshot(data.snapshot);const queuedDrops=net.pendingDropCount||0;net.pendingDropCount=0;for(let i=0;i<queuedDrops;i++)islandSendAction('jump');net.stream=new EventSource('/api/events?token='+encodeURIComponent(net.token));
  net.stream.onmessage=e=>{try{islandApplySnapshot(JSON.parse(e.data))}catch(error){console.error('Island snapshot:',error)}};
  net.stream.onerror=()=>{$('#island-network-state').textContent='RECONNECTING'};
  net.timer=setInterval(islandSendInput,1000/30);islandSendInput();$('#island-network-state').textContent='ONLINE · AUTHORITATIVE';
 }catch(error){net.joining=false;net.error=error.message;$('#island-network-state').textContent='CONNECTION FAILED · EXIT TO RETRY'}
}
function islandSendInput(){
 const net=islandNetwork;if(!net.ready||!net.token)return;const move=islandMapOpen||matchMenuOpen?{dx:0,dy:0}:movementVector();
 const input={dx:move.dx,dy:move.dy,dive:!islandMapOpen&&!matchMenuOpen&&!!keys[' '],aim:player.angle||0,fire:!islandMapOpen&&!matchMenuOpen&&selectedItem==='weapon'&&actionDown('fire'),slot:net.loadoutPending?undefined:slot},last=net.lastSentInput;
 const priority=!last||input.dx!==last.dx||input.dy!==last.dy||input.fire!==last.fire||input.slot!==last.slot||input.dive!==last.dive;
 if((net.inputInFlight||0)>=2&&!priority)return;
 input.seq=++net.sequence;net.lastSentInput=input;net.inputInFlight=(net.inputInFlight||0)+1;const token=net.token,generation=net.generation;
 islandRequest('input',input).catch(()=>{if(net.token===token)$('#island-network-state').textContent='RECONNECTING'}).finally(()=>{if(net.token===token&&net.generation===generation)net.inputInFlight=Math.max(0,(net.inputInFlight||1)-1)});
}
function islandSendAction(kind,extra={}){const net=islandNetwork;if(!net.ready)return;const token=net.token,request={kind,seq:++net.actionSeq,...extra};net.actionQueue=(net.actionQueue||Promise.resolve()).catch(()=>{}).then(()=>{if(net.token===token)return islandRequest('action',request,token)}).catch(()=>{});return net.actionQueue}
function islandApplySnapshot(snapshot){
 const net=islandNetwork;if(!snapshot||net.last&&snapshot.tick<=net.last.tick)return;
 if(snapshot.seed!==islandState.seed)initializeIsland(snapshot.seed);
 const before={x:player.x,y:player.y},priorDropPhase=dropPhase,first=!net.last;net.previous=net.last;net.last=snapshot;net.receivedAt=performance.now();islandState.time=snapshot.time;islandState.zone=snapshot.zone;islandMarker=snapshot.marker;
 for(const e of snapshot.damageEvents||[])if(!islandSeenDamageEvents.has(e.id)){islandSeenDamageEvents.add(e.id);islandAddDamageNumber({id:e.target,x:e.x,y:e.y},e.hp,e.shield)}if(islandSeenDamageEvents.size>256){const ids=[...islandSeenDamageEvents];islandSeenDamageEvents=new Set(ids.slice(-128))}
 const doorById=new Map(snapshot.doors.map(d=>[d.id,d]));for(const door of islandState.doors){const next=doorById.get(door.id);if(next){const pending=net.doorPredictions?.get(door.id);if(pending&&snapshot.actionSeq<pending.seq)continue;if(pending)net.doorPredictions.delete(door.id);if(door.open!==next.open&&dist(door,player)<500)islandDoorSound(next.open);Object.assign(door,next)}}
 islandSyncWorldSnapshot(islandState,snapshot);
 const keptLoadout=net.loadoutPending&&snapshot.actionSeq<net.loadoutPending.seq?{inventory:player.inventory,ammoWallet:player.ammoWallet,med:player.med,slot}:null;if(net.loadoutPending&&snapshot.actionSeq>=net.loadoutPending.seq)net.loadoutPending=null;
 const pendingSlot=net.pendingSlot&&snapshot.self.sequence<net.pendingSlot.seq?net.pendingSlot.slot:null;if(net.pendingSlot&&snapshot.self.sequence>=net.pendingSlot.seq)net.pendingSlot=null;Object.assign(player,snapshot.self);if(keptLoadout)Object.assign(player,keptLoadout);
 if(selectedItem==='medkit'&&player.med===0){selectedItem='weapon';keys[bindings.fire]=false;mouse.down=false}player.r=26;dropPhase=player.phase;if(priorDropPhase!=='ground'&&dropPhase==='ground')clearDropActionInput();dropRemaining=player.dropRemaining||0;dropFast=dropPhase==='parachute'&&!!keys[' '];planeElapsed=snapshot.time;planeRoute=snapshot.plane.route;slot=keptLoadout?keptLoadout.slot:pendingSlot===null?player.slot:pendingSlot;selectedItem=IslandInventory.isMed(player.inventory[slot])?'medkit':'weapon';
 bots=snapshot.actors;bullets=snapshot.bullets;loot=snapshot.loot;islandState.loot=loot;kills=player.kills||0;time=snapshot.time;storm=snapshot.zone.current.r;
 if(first){cameraX=player.x;cameraY=player.y;cameraZoom=islandFlightZoom()}
 updateHUD();islandSetText('#alive',String(snapshot.alive));$('#island-network-state').textContent='ONLINE · AUTHORITATIVE';
 if(player.hp<=0&&running)end(false);else if(snapshot.alive===1&&snapshot.time>3&&running)end(true);
}
function islandOnlineUpdate(dt){
 const net=islandNetwork;if(!net.ready||!net.last){islandClampCamera();return}
 islandState.time=Math.max(islandState.time,net.last.time+Math.min(.2,(performance.now()-net.receivedAt)/1000));player.phase=dropPhase;
 updatePlayerAim();const fresh=performance.now()-net.receivedAt<1000;if(!fresh){$('#island-network-state').textContent='CONNECTION LOST · RETRYING';return}
 const movement=islandMapOpen||matchMenuOpen?{dx:0,dy:0}:movementVector();
 if(dropPhase==='ground')Island.moveActor(islandState,player,movement.dx,movement.dy,dt,player.speed);
 else if(dropPhase==='plane')Object.assign(player,Island.planePosition(planeRoute,islandState.time));
 else{dropFast=!!keys[' '];const length=Math.hypot(movement.dx,movement.dy)||1;player.x=Island.clamp(player.x+movement.dx/length*Island.PARACHUTE_SPEED*dt,40,world-40);player.y=Island.clamp(player.y+movement.dy/length*Island.PARACHUTE_SPEED*dt,40,world-40);dropRemaining=Math.max(0,dropRemaining-dt*(dropFast?2:1))}
 // Interpolate visible remote actors only. Hidden actors are never sent by the server.
 if(net.previous){const f=Math.min(1,(performance.now()-net.receivedAt)/70);if(net._previousActorsFor!==net.previous){net._previousActorsFor=net.previous;net._previousActors=new Map(net.previous.actors.map(a=>[a.id,a]))}if(net._renderActorsFor!==net.last){net._renderActorsFor=net.last;net._renderActors=net.last.actors.map(a=>({...a}))}bots=net._renderActors;for(let i=0;i<bots.length;i++){const a=net.last.actors[i],old=net._previousActors.get(a.id);bots[i].x=old?old.x+(a.x-old.x)*f:a.x;bots[i].y=old?old.y+(a.y-old.y)*f:a.y}}
 if(net._renderBulletsFor!==net.last){net._renderBulletsFor=net.last;net._renderBullets=net.last.bullets.map(b=>({...b}))}bullets=net._renderBullets;const bulletAge=Math.min(.08,(performance.now()-net.receivedAt)/1000);for(let i=0;i<bullets.length;i++){const src=net.last.bullets[i];bullets[i].x=src.x+src.vx*bulletAge;bullets[i].y=src.y+src.vy*bulletAge}
 const targetZoom=islandFlightZoom(),smooth=Math.min(1,dt*10);
 cameraZoom+=(targetZoom-cameraZoom)*smooth;cameraX+=(player.x+(net.visualOffset?.x||0)-cameraX)*smooth;cameraY+=(player.y+(net.visualOffset?.y||0)-cameraY)*smooth;islandClampCamera();updateHUD();islandSetText('#alive',String(net.last.alive));
}
function islandDisconnect(){
 const net=islandNetwork;net.generation++;if(net.timer)clearInterval(net.timer);net.timer=null;net.stream?.close();net.stream=null;
 if(net.token)islandRequest('leave',{},net.token).catch(()=>{});net.token=null;net.inputInFlight=0;net.lastSentInput=null;net.ready=false;net.joining=false;net.last=null;net.loadoutPending=null;net.pendingSlot=null;net.doorPredictions?.clear();
}
function islandHideMapUI(){islandMapOpen=false;for(const id of ['island-map-panel','island-minimap','island-zone-hud','island-network-state'])$('#'+id).style.display='none';document.body?.classList?.toggle('island-match',false)}
goHome=function(){islandDisconnect();islandHideMapUI();islandOriginal.goHome()};
end=function(win){stayInMatch();islandHideMapUI();islandOriginal.end(win)};
$('#start').onclick=newGame;$('#result-home').onclick=goHome;
if(islandNetwork.enabled){$('#island-network-state').style.display='block';$('#island-network-state').textContent='MULTIPLAYER · JOIN A LOBBY'}

const islandPreviousSelectSlot=selectSlot,islandPreviousMouseUp=onmouseup,islandPreviousKeyUp=onkeyup;
selectSlot=function(index){islandPreviousSelectSlot(index);if(islandNetwork.ready){islandNetwork.pendingSlot={slot,seq:islandNetwork.sequence+1};islandSendInput()}};
onmouseup=function(e){islandPreviousMouseUp(e);if(islandNetwork.ready)islandSendInput()};
onkeyup=function(e){islandPreviousKeyUp(e);if(e.key.toLowerCase()===' ')dropFast=false;if(islandNetwork.ready)islandSendInput()};
onblur=function(){clearInput();if(islandNetwork.ready)islandSendInput()};
// All grounded actors use one cosmetic assembly, including network opponents.
function islandCosmeticBody(skin){return CosmeticRig.body(cosmeticSprite('skins',skin),skin)}
function drawSidewaysMelee(index,mouth,swing=0,gloveColor='#d7dfcb',skin=selectedCosmetic('skins')){
 const bodyInfo=islandCosmeticBody(skin),info=CosmeticRig.melee(cosmeticSprite('melees',index),index,bodyInfo,swing);
 if(!CosmeticRig.drawMelee(x,info))CosmeticRig.drawFists?.(x,bodyInfo,swing);
}
drawEquippedMelee=function(mouth){drawSidewaysMelee(selectedCosmetic('melees'),mouth,player.meleeSwing||0,chosen('skins')[1])};
drawCharacter=function(a){
 const local=a===player,skin=local?selectedCosmetic('skins'):a.skin,packIndex=local?selectedCosmetic('backpacks'):(a.backpack??-1),meleeIndex=local?selectedCosmetic('melees'):(a.melee??-1);
 const bodyInfo=islandCosmeticBody(skin),equippedSlot=local?slot:(a.slot??1),g=local?(equippedSlot===0?null:a.inventory[equippedSlot]):(equippedSlot===0||a.itemKind==='empty'?null:{type:a.weaponType??0});
 x.save();x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.translate(a.x,a.y);x.rotate(a.angle||0);
 CosmeticRig.drawPack(x,CosmeticRig.pack(cosmeticSprite('backpacks',packIndex),packIndex,bodyInfo));
 if(!CosmeticRig.drawBody(x,bodyInfo))circle(0,0,26,'#ffd17b');
 if(local&&selectedItem==='medkit'||!local&&a.itemKind==='med'){CosmeticRig.drawGunHands?.(x,bodyInfo,0);const mouth=bodyInfo.mouth;x.fillStyle='#ecece1';x.beginPath();x.roundRect(mouth-2,-9,19,18,4);x.fill();x.fillStyle='#b84a43';x.fillRect(mouth+5,-6,3,12);x.fillRect(mouth+1,-2,11,3)}
 else if(g){CosmeticRig.drawGunHands?.(x,bodyInfo,g.type);drawHeldWeapon(g.type,bodyInfo.mouth);}
 else if(equippedSlot===0)drawSidewaysMelee(meleeIndex,bodyInfo.mouth,a.meleeSwing||0,cosmetics.skins[skin]?.[1]||'#bca255',skin);
 else CosmeticRig.drawFists?.(x,bodyInfo,a.meleeSwing||0);
 x.restore();
 if(!local&&!islandNetwork.ready){x.fillStyle='#263b2b';x.fillRect(a.x-22,a.y-43,44,5);x.fillStyle='#e7f07d';x.fillRect(a.x-22,a.y-43,44*Math.max(0,a.hp)/75,5)}
};
