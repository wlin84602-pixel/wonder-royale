// Island integration. Existing weapon artwork, rates, reload functions and menus remain the source of truth.
let islandState=null,islandMarker=null,islandMapOpen=false,islandRenderCount=0,islandLastDt=.016,islandSound=null,islandInteractionNote='',islandNoteUntil=0;
const Island=IslandCore,IslandDraw=IslandRender;
const islandOriginal={newGame,goHome,end,update,draw,shoot,reload,swingMelee,interact,finishLanding,createPlaneRoute,useSelectedMedkit,onkeydown,onmousedown,oncontextmenu};
let islandNetwork={enabled:typeof location!=='undefined'&&/^https?:/.test(location.protocol)&&new URLSearchParams(location.search).get('online')==='1',ready:false,token:null,id:null,last:null,receivedAt:0,sequence:0,actionSeq:0,timer:null,stream:null,joining:false,generation:0,error:'',snapshots:[]};
function islandCurrentActors(){return [player,...bots].filter(Boolean)}
function islandNote(text){islandInteractionNote=text;islandNoteUntil=islandState.time+2}
function islandArmSound(){if(islandSound||typeof AudioContext==='undefined')return;try{islandSound=new AudioContext()}catch{}}
function islandDoorSound(open=true){if(!islandSound)return;try{const o=islandSound.createOscillator(),g=islandSound.createGain();o.type='triangle';o.frequency.setValueAtTime(open?170:230,islandSound.currentTime);o.frequency.exponentialRampToValueAtTime(open?95:140,islandSound.currentTime+.1);g.gain.setValueAtTime(.035,islandSound.currentTime);g.gain.exponentialRampToValueAtTime(.001,islandSound.currentTime+.13);o.connect(g);g.connect(islandSound.destination);o.start();o.stop(islandSound.currentTime+.14)}catch{}}
function initializeIsland(seed){
 islandState=Island.buildWorld(seed);islandMarker=null;islandMapOpen=false;$('#island-map-panel').style.display='none';
 buildings=islandState.buildings;trees=islandState.objects.filter(o=>o.kind==='tree');loot=islandState.loot;chests=islandState.containers;
 planeRoute=Island.planeRoute(seed);for(let i=0;i<bots.length;i++){const loc=islandState.locations[i%8],point=Island.findValid(islandState,{x:loc.x-470+islandState.random()*940,y:loc.y-450+islandState.random()*900},26,true);Object.assign(bots[i],planeRoute.start,{id:'offline-bot-'+i,phase:'plane',dropRemaining:10,dropFast:false,dropTarget:point,jumpAt:planeRoute.duration*(.18+islandState.random()*.62),parachute:i%5,revealedUntil:0});}
 player.id='local';player.phase='plane';player.revealedUntil=0;planeRoute=Island.planeRoute(seed);planeVariant=(seed>>>0)%2;planeElapsed=0;Object.assign(player,planeRoute.start);cameraX=world/2;cameraY=world/2;
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
 const hx=innerWidth/(cameraZoom*2),hy=innerHeight/(cameraZoom*2);cameraX=Island.clamp(cameraX,hx,world-hx);cameraY=Island.clamp(cameraY,hy,world-hy);
}
function islandNearestHint(){const target=Island.interactionTarget(islandState,player);if(!target||target.kind==='loot')return '';const q=target.object;return keyLabel(bindings.interact)+' · '+(target.kind==='door'?(q.open?'Close door':'Open door'):target.kind==='container'?(q.kind==='gold'?'Open gold chest':q.kind==='ammo'?'Open ammo crate':'Open crate'):'Pick up '+(q.type==='gun'?types[q.weapon].name:q.type))}
interact=function(){
 if(!islandState||dropPhase!=='ground'||!running)return;
 islandArmSound();if(islandNetwork.ready){islandSendAction('interact');return}
 const target=Island.interactionTarget(islandState,player);if(!target)return;
 if(target.kind==='door'){const door=target.object,result=Island.interactDoor(islandState,door,player,islandCurrentActors());if(result.ok)islandDoorSound(door.open);else if(result.reason==='Doorway occupied')islandNote('Doorway occupied');return}
 if(target.kind==='container'){Island.openContainer(islandState,target.object,player);return}
 const item=target.object;if(item.type==='gun'){let idx=player.inventory.findIndex((g,i)=>i>0&&!g);if(idx<0)idx=slot>0?slot:lastWeaponSlot;player.inventory[idx]=gun(item.weapon,item.rarity||0);slot=idx;lastWeaponSlot=idx;selectedItem='weapon'}
 else if(item.type==='med')player.med++;else if(item.type==='shield')player.shield=Math.min(100,player.shield+35);else if(item.type==='ammo')for(const g of player.inventory)if(g)g.reserve+=item.amount||30;
 item.taken=true;updateHUD();
}
shoot=function(a,angle,enemy=false,atMs=combatInputTimeMs()){
 if(islandNetwork.ready&&!enemy){islandSendInput();return false;}
 const result=islandOriginal.shoot(a,angle,enemy,atMs);
 if(result&&islandState)a.revealedUntil=islandState.time+1.5;return result;
};
reload=function(){if(islandNetwork.ready){islandSendAction('reload');return false}return islandOriginal.reload()};
swingMelee=function(){
 if(islandNetwork.ready){islandSendAction('melee');return}
 if(!islandState)return islandOriginal.swingMelee();
 if(!running||settingsOpen||matchMenuOpen||dropPhase!=='ground'||slot!==0||selectedItem!=='weapon')return;
 const all=bots;bots=all.filter(b=>!Island.raycast(islandState,player.x,player.y,b.x,b.y,0));islandOriginal.swingMelee();bots=all;player.revealedUntil=islandState.time+1.5;
 const range=selectedCosmetic('melees')<0?58:83,amount=selectedCosmetic('melees')<0?14:28;
 for(const object of islandState.index.query(player.x-range,player.y-range,range*2,range*2))if(!object.destroyed&&object.destructible){const b=Island.bounds(object),point=object.shape==='circle'?object:{x:b.x+b.w/2,y:b.y+b.h/2};if(dist(point,player)<range+20&&Math.cos(Math.atan2(point.y-player.y,point.x-player.x)-player.angle)>.15){const hit=Island.raycast(islandState,player.x,player.y,point.x,point.y,0);if(!hit||hit.object.id===object.id)Island.damageObject(islandState,object,amount,player)}}
};
useSelectedMedkit=function(){if(islandNetwork.ready){if(selectedItem==='medkit')islandSendAction('medkit');return}islandOriginal.useSelectedMedkit()};
function islandDeployBot(b,dt){if(b.phase==='plane'){Object.assign(b,Island.planePosition(planeRoute,islandState.time));if(islandState.time>=b.jumpAt||islandState.time>=planeRoute.duration)b.phase='parachute';return true}if(b.phase==='parachute'){const target=b.dropTarget||b,dx=target.x-b.x,dy=target.y-b.y,n=Math.hypot(dx,dy)||1;b.angle=Math.atan2(dy,dx);b.x=Island.clamp(b.x+dx/n*246*dt,40,5960);b.y=Island.clamp(b.y+dy/n*246*dt,40,5960);b.dropRemaining-=dt;if(b.dropRemaining<=0){Object.assign(b,Island.findValid(islandState,b,26,true));b.phase='ground';b.dropRemaining=0}return true}return false}
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
  if(collision){q.life=0;if(collision.target){const t=collision.target;if(t===player)damage(t,q.damage);else{t.hp-=q.damage;if(q.owner===player)t.hitByPlayer=true}}else Island.damageObject(islandState,collision.object,q.damage,q.owner)}
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
 const smooth=Math.min(1,dt*10);cameraZoom+=(1-cameraZoom)*smooth;cameraX+=(player.x-cameraX)*smooth;cameraY+=(player.y-cameraY)*smooth;
 const movement=movementVector();Island.moveActor(islandState,player,movement.dx,movement.dy,dt,player.speed);
 player.cd-=dt;player.meleeSwing=Math.max(0,(player.meleeSwing||0)-dt);updatePlayerAim();
 advancePlayerCombat(frameStartMs,combatTimeMs);
 if(selectedItem==='weapon'&&slot===0&&actionDown('fire')&&player.cd<=0)swingMelee();
 for(const b of bots)if(!islandDeployBot(b,dt))islandBotStep(b,dt);
 islandStepBullets(dt,frameStartMs);islandResolveDeaths();
 Island.advanceZone(islandState,dt,islandCurrentActors());storm=islandState.zone.current.r;
 islandClampCamera();updateHUD();if(player.hp<=0)end(false);else if(!bots.length)end(true);
};
function islandDrawPlaneAt(position){const art=planeSprites[planeVariant];x.save();x.translate(position.x,position.y);x.rotate(planeRoute.angle+Math.PI/2);if(art){const f=300/Math.max(art.width,art.height);x.drawImage(art,-art.width*f/2,-art.height*f/2,art.width*f,art.height*f)}else{x.fillStyle='#f3efdc';x.strokeStyle='#294847';x.lineWidth=4;x.beginPath();x.moveTo(0,-95);x.lineTo(18,-10);x.lineTo(90,28);x.lineTo(90,40);x.lineTo(12,20);x.lineTo(8,80);x.lineTo(-8,80);x.lineTo(-12,20);x.lineTo(-90,40);x.lineTo(-90,28);x.lineTo(-18,-10);x.closePath();x.fill();x.stroke()}x.restore()}
function islandDrawRemote(a){
 if(a.phase&&a.phase!=='ground'){const chute=cosmeticSprite('parachutes',a.parachute??0);if(chute){x.save();x.translate(a.x,a.y);x.rotate(a.angle+Math.PI/2);const f=110/Math.max(chute.width,chute.height);x.drawImage(chute,-chute.width*f/2,-chute.height*f/2,chute.width*f,chute.height*f);x.restore()}return}
 if(!islandNetwork.ready)return drawCharacter(a);
 const mask=cosmeticSprite('skins',a.skin),faceH=mask?mask.height*66/Math.max(mask.width,mask.height):66;x.save();x.translate(a.x,a.y);x.rotate(a.angle||0);const pack=cosmeticSprite('backpacks',a.backpack??-1);
 if(pack){const wings=a.backpack>=10;x.save();x.translate(wings?0:-faceH/2+3,0);x.rotate(wings?Math.PI/2:-Math.PI/2);const f=(wings?184:52)/Math.max(pack.width,pack.height);x.drawImage(pack,-pack.width*f/2,-pack.height*f/2,pack.width*f,pack.height*f);x.restore()}
 if(mask){const f=66/Math.max(mask.width,mask.height);x.save();x.rotate(Math.PI/2);x.drawImage(mask,-mask.width*f/2,-mask.height*f/2,mask.width*f,mask.height*f);x.restore()}else circle(0,0,25,'#c8d8a9');
 if(a.slot!==0)drawHeldWeapon(a.weaponType??0,faceH/2-4);else drawSidewaysMelee(a.melee??0,faceH/2-4,a.meleeSwing||0,cosmetics.skins[a.skin]?.[1]||'#d7dfcb');x.restore();
}
draw=function(){
 if(!islandState||!player)return islandOriginal.draw();islandClampCamera();
 x.setTransform(scale,0,0,scale,0,0);x.fillStyle='#4b9bb4';x.fillRect(0,0,innerWidth,innerHeight);
 const view={x:cameraX-innerWidth/(2*cameraZoom)-120,y:cameraY-innerHeight/(2*cameraZoom)-120,w:innerWidth/cameraZoom+240,h:innerHeight/cameraZoom+240},visible=b=>b.x+b.w>=view.x&&b.x<=view.x+view.w&&b.y+b.h>=view.y&&b.y<=view.y+view.h,objects=islandState.index.query(view.x,view.y,view.w,view.h);
 islandRenderCount=objects.length;
 x.save();x.translate(innerWidth/2,innerHeight/2);x.scale(cameraZoom,cameraZoom);x.translate(-cameraX,-cameraY);
 IslandDraw.terrain(x,islandState,view);IslandDraw.floors(x,islandState,visible);
 for(const o of objects)if(o.kind!=='door')IslandDraw.object(x,o,islandState.time);IslandDraw.bushes(x,islandState,visible);
 for(const q of chests)if(visible({x:q.x-30,y:q.y-30,w:60,h:60}))IslandDraw.crate(x,q);
 for(const q of loot)if(visible({x:q.x-80,y:q.y-80,w:160,h:160}))IslandDraw.loot(x,q,q.type==='gun'?weaponSprites[[1,0,2,3][q.weapon]]:null,tiers,dropPhase==='ground'&&dist(q,player)<85,keyLabel(bindings.interact));
 for(let q of bullets){x.save();x.translate(q.x,q.y);x.rotate(Math.atan2(q.vy,q.vx));let size=q.kind===3?13:q.kind===2?7:10;x.strokeStyle=q.owner===player?'#ffdc8a99':'#ff9b7a99';x.lineWidth=q.kind===2?1.3:2;x.beginPath();x.moveTo(-size*1.9,0);x.lineTo(-size*.35,0);x.stroke();x.fillStyle='#3d3025';x.fillRect(-size*.48,-2.8,size*.8,5.6);x.fillStyle=q.owner===player?'#d8aa67':'#c98369';x.fillRect(-size*.4,-2.1,size*.65,4.2);x.beginPath();x.moveTo(size*.25,-2.1);x.quadraticCurveTo(size*.65,0,size*.25,2.1);x.closePath();x.fillStyle='#f3d3a0';x.fill();x.fillStyle='#fff0ca';x.fillRect(-size*.25,-1.5,size*.42,.7);x.restore()}
 for(const b of bots)if((!b.phase||b.phase==='ground')&&Island.canSee(islandState,player,b)&&(!Island.buildingAt(islandState,b)||Island.buildingAt(islandState,b)?.id===Island.buildingAt(islandState,player)?.id))islandDrawRemote(b);
 if(dropPhase==='ground')drawCharacter(player);
 IslandDraw.canopies(x,objects,player);IslandDraw.roofs(x,islandState,player,visible,islandLastDt);for(const o of objects)if(o.kind==='door')IslandDraw.object(x,o,islandState.time);IslandDraw.gas(x,islandState,view);if(islandState.time<planeRoute.duration)islandDrawPlaneAt(Island.planePosition(planeRoute,islandState.time));if(dropPhase==='parachute')drawDropVehicle();for(const a of bots)if(a.phase==='parachute'&&Island.canSee(islandState,player,a))islandDrawRemote(a);
 if(islandMarker){x.strokeStyle='#ffdc5e';x.lineWidth=3;x.beginPath();x.arc(islandMarker.x,islandMarker.y,24,0,7);x.moveTo(islandMarker.x,islandMarker.y-33);x.lineTo(islandMarker.x,islandMarker.y+33);x.stroke()}
 if(dropPhase==='ground'){const hint=islandState.time<islandNoteUntil?islandInteractionNote:islandNearestHint();if(hint){x.font='bold 12px sans-serif';x.textAlign='center';x.fillStyle='#092b36e8';x.beginPath();x.roundRect(player.x-105,player.y-79,210,25,6);x.fill();x.fillStyle='#eff9eb';x.fillText(hint,player.x,player.y-62);x.textAlign='start'}}
 x.restore();drawLandingBar();
 if(player.gasHitUntil>islandState.time){x.strokeStyle='#54bfff90';x.lineWidth=14;x.strokeRect(7,7,innerWidth-14,innerHeight-14)}
 islandDrawMaps();
};
function islandDrawMaps(){
 if(!running)return;
 const mini=$('#island-minimap'),sz=innerWidth<700?132:184;if(mini.width!==sz){mini.width=sz;mini.height=sz}const m=mini.getContext('2d');
 const plane=islandState.time<planeRoute.duration?Island.planePosition(planeRoute,islandState.time):null;
 IslandDraw.map(m,islandState,sz,sz,player,islandMarker,plane?planeRoute:null,plane,dropPhase==='ground'?1900:6000);
 const z=islandState.zone,phase=z.phase+1,count=Island.zoneCountdown(islandState),label=z.mode==='prepare'?'GAS MOVES':z.mode==='shrink'?'GAS CLOSING':'FINAL CIRCLE';
 $('#island-zone-hud').textContent=label+' · '+count+'s · '+phase+'/6';
 if(islandMapOpen){const full=$('#island-full-map'),side=Math.max(240,Math.min(innerHeight-145,innerWidth-70,820));if(full.width!==side){full.width=side;full.height=side}IslandDraw.map(full.getContext('2d'),islandState,side,side,player,islandMarker,plane?planeRoute:null,plane);$('#island-map-timer').textContent=label+' IN '+count+'s'}
}
function toggleIslandMap(value=!islandMapOpen){if(!running||!islandState)return;islandMapOpen=value;$('#island-map-panel').style.display=value?'grid':'none';if(value)clearInput();islandDrawMaps()}
function islandMapPoint(e){const canvas=$('#island-full-map'),r=canvas.getBoundingClientRect();return{x:Island.clamp((e.clientX-r.left)/r.width*world,0,world),y:Island.clamp((e.clientY-r.top)/r.height*world,0,world)}}
$('#island-minimap').addEventListener('click',()=>toggleIslandMap(true));$('#island-close-map').onclick=()=>toggleIslandMap(false);
$('#island-full-map').addEventListener('click',e=>{if(!running)return;islandMarker=islandMapPoint(e);if(islandNetwork.ready)islandSendAction('marker',islandMarker)});
$('#island-full-map').addEventListener('contextmenu',e=>{e.preventDefault();islandMarker=null;if(islandNetwork.ready)islandSendAction('marker',{remove:true})});
onkeydown=function(e){
 const key=e.key.toLowerCase();if(running&&!settingsOpen&&!matchMenuOpen&&key===bindings.map){e.preventDefault?.();if(!e.repeat)toggleIslandMap();return}
 if(islandNetwork.enabled&&running&&!settingsOpen&&!matchMenuOpen&&key===' '&&dropPhase!=='ground'){e.preventDefault?.();if(!e.repeat){if(islandNetwork.ready)islandSendAction('jump');else islandNetwork.pendingDropCount=Math.min(2,(islandNetwork.pendingDropCount||0)+1)}return}
 islandOriginal.onkeydown(e);if(islandNetwork.ready)islandSendInput();
};
async function islandRequest(endpoint,body,token=islandNetwork.token){const response=await fetch('/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),keepalive:endpoint==='leave'});if(!response.ok)throw Error('Server request failed ('+response.status+')');return response.json()}
async function islandJoin(){
 const net=islandNetwork,generation=++net.generation;net.joining=true;net.ready=false;net.error='';
 try{
  const room=new URLSearchParams(location.search).get('room')||'main',data=await islandRequest('join',{room,name:localProfile.nickname,look:{skin:selectedCosmetic('skins'),backpack:selectedCosmetic('backpacks'),melee:selectedCosmetic('melees'),parachute:selectedCosmetic('parachutes')}},null);
  if(generation!==net.generation){islandRequest('leave',{},data.token).catch(()=>{});return}
  net.token=data.token;net.id=data.id;net.sequence=0;net.actionSeq=0;net.last=null;initializeIsland(data.seed);planeRoute=data.route;net.ready=true;net.joining=false;
  islandApplySnapshot(data.snapshot);const queuedDrops=net.pendingDropCount||0;net.pendingDropCount=0;for(let i=0;i<queuedDrops;i++)islandSendAction('jump');net.stream=new EventSource('/api/events?token='+encodeURIComponent(net.token));
  net.stream.onmessage=e=>{try{islandApplySnapshot(JSON.parse(e.data))}catch(error){console.error('Island snapshot:',error)}};
  net.stream.onerror=()=>{$('#island-network-state').textContent='RECONNECTING'};
  net.timer=setInterval(islandSendInput,1000/30);islandSendInput();$('#island-network-state').textContent='ONLINE · AUTHORITATIVE';
 }catch(error){net.joining=false;net.error=error.message;$('#island-network-state').textContent='CONNECTION FAILED · EXIT TO RETRY'}
}
function islandSendInput(){
 const net=islandNetwork;if(!net.ready||!net.token)return;const move=islandMapOpen||matchMenuOpen?{dx:0,dy:0}:movementVector();
 const input={seq:++net.sequence,dx:move.dx,dy:move.dy,aim:player.angle||0,fire:!islandMapOpen&&!matchMenuOpen&&selectedItem==='weapon'&&actionDown('fire'),slot};
 islandRequest('input',input).catch(()=>{$('#island-network-state').textContent='RECONNECTING'});
}
function islandSendAction(kind,extra={}){const net=islandNetwork;if(!net.ready)return;const token=net.token,request={kind,seq:++net.actionSeq,...extra};net.actionQueue=(net.actionQueue||Promise.resolve()).catch(()=>{}).then(()=>{if(net.token===token)return islandRequest('action',request,token)}).catch(()=>{});return net.actionQueue}
function islandApplySnapshot(snapshot){
 const net=islandNetwork;if(!snapshot||net.last&&snapshot.tick<=net.last.tick)return;
 if(snapshot.seed!==islandState.seed)initializeIsland(snapshot.seed);
 const before={x:player.x,y:player.y},priorDropPhase=dropPhase,first=!net.last;net.previous=net.last;net.last=snapshot;net.receivedAt=performance.now();islandState.time=snapshot.time;islandState.zone=snapshot.zone;islandMarker=snapshot.marker;
 const doorById=new Map(snapshot.doors.map(d=>[d.id,d]));for(const door of islandState.doors){const next=doorById.get(door.id);if(next){if(door.open!==next.open&&dist(door,player)<500)islandDoorSound(next.open);Object.assign(door,next)}}
 if((islandState.mapDestroyedCount||0)!==snapshot.destroyed.length){islandState.mapRevision=(islandState.mapRevision||0)+1;islandState.mapDestroyedCount=snapshot.destroyed.length}const broken=new Set(snapshot.destroyed),opened=new Set(snapshot.containers);for(const o of islandState.objects)o.destroyed=broken.has(o.id);for(const c of chests)c.open=opened.has(c.id);
 const pendingSlot=net.pendingSlot&&snapshot.self.sequence<net.pendingSlot.seq?net.pendingSlot.slot:null;if(net.pendingSlot&&snapshot.self.sequence>=net.pendingSlot.seq)net.pendingSlot=null;Object.assign(player,snapshot.self);if(!first&&player.phase==='ground'&&Math.hypot(before.x-player.x,before.y-player.y)<100){player.x=before.x+(player.x-before.x)*.4;player.y=before.y+(player.y-before.y)*.4}
 if(selectedItem==='medkit'&&player.med===0){selectedItem='weapon';keys[bindings.fire]=false;mouse.down=false}player.r=26;dropPhase=player.phase;if(priorDropPhase!=='ground'&&dropPhase==='ground')clearDropActionInput();dropRemaining=player.dropRemaining||0;dropFast=player.dropFast;planeElapsed=snapshot.time;planeRoute=snapshot.plane.route;slot=pendingSlot===null?player.slot:pendingSlot;
 bots=snapshot.actors;bullets=snapshot.bullets;loot=snapshot.loot;islandState.loot=loot;kills=player.kills||0;time=snapshot.time;storm=snapshot.zone.current.r;
 if(first){cameraX=player.x;cameraY=player.y;cameraZoom=dropPhase==='ground'?1:Math.max(innerWidth/world,innerHeight/world)}
 updateHUD();$('#alive').textContent=snapshot.alive+' ALIVE';$('#island-network-state').textContent='ONLINE · AUTHORITATIVE';
 if(player.hp<=0&&running)end(false);else if(snapshot.alive===1&&snapshot.time>3&&running)end(true);
}
function islandOnlineUpdate(dt){
 const net=islandNetwork;if(!net.ready||!net.last){islandClampCamera();return}
 islandState.time=net.last.time+Math.min(.2,(performance.now()-net.receivedAt)/1000);player.phase=dropPhase;
 updatePlayerAim();const fresh=performance.now()-net.receivedAt<1000;if(!fresh){$('#island-network-state').textContent='CONNECTION LOST · RETRYING';return}
 const movement=islandMapOpen||matchMenuOpen?{dx:0,dy:0}:movementVector();
 if(dropPhase==='ground')Island.moveActor(islandState,player,movement.dx,movement.dy,dt,player.speed);
 else if(dropPhase==='plane')Object.assign(player,Island.planePosition(planeRoute,islandState.time));
 else{const length=Math.hypot(movement.dx,movement.dy)||1;player.x=Island.clamp(player.x+movement.dx/length*246*dt,40,5960);player.y=Island.clamp(player.y+movement.dy/length*246*dt,40,5960);dropRemaining=Math.max(0,dropRemaining-dt*(dropFast?2:1))}
 // Interpolate visible remote actors only. Hidden actors are never sent by the server.
 if(net.previous){const f=Math.min(1,(performance.now()-net.receivedAt)/70);const previous=new Map(net.previous.actors.map(a=>[a.id,a]));bots=net.last.actors.map(a=>{const old=previous.get(a.id);return old?{...a,x:old.x+(a.x-old.x)*f,y:old.y+(a.y-old.y)*f}:a})}
 bullets=net.last.bullets.map(b=>({...b,x:b.x+b.vx*Math.min(.08,(performance.now()-net.receivedAt)/1000),y:b.y+b.vy*Math.min(.08,(performance.now()-net.receivedAt)/1000)}));
 const targetZoom=dropPhase==='plane'?Math.max(innerWidth/world,innerHeight/world):dropPhase==='parachute'?.60+(1-dropRemaining/10)*.24:1,smooth=Math.min(1,dt*10);
 cameraZoom+=(targetZoom-cameraZoom)*smooth;cameraX+=(player.x-cameraX)*smooth;cameraY+=(player.y-cameraY)*smooth;islandClampCamera();updateHUD();$('#alive').textContent=net.last.alive+' ALIVE';
}
function islandDisconnect(){
 const net=islandNetwork;net.generation++;if(net.timer)clearInterval(net.timer);net.timer=null;net.stream?.close();net.stream=null;
 if(net.token)islandRequest('leave',{},net.token).catch(()=>{});net.token=null;net.ready=false;net.joining=false;net.last=null;
}
function islandHideMapUI(){islandMapOpen=false;for(const id of ['island-map-panel','island-minimap','island-zone-hud','island-network-state'])$('#'+id).style.display='none';document.body?.classList?.toggle('island-match',false)}
goHome=function(){islandDisconnect();islandHideMapUI();islandOriginal.goHome()};
end=function(win){stayInMatch();islandHideMapUI();islandOriginal.end(win)};
$('#start').onclick=newGame;$('#result-home').onclick=goHome;
if(islandNetwork.enabled){$('#island-network-state').style.display='block';$('#island-network-state').textContent='ONLINE ROOM · PRESS SOLO TO JOIN'}

const islandPreviousSelectSlot=selectSlot,islandPreviousMouseUp=onmouseup,islandPreviousKeyUp=onkeyup;
selectSlot=function(index){islandPreviousSelectSlot(index);if(islandNetwork.ready){islandNetwork.pendingSlot={slot,seq:islandNetwork.sequence+1};islandSendInput()}};
onmouseup=function(e){islandPreviousMouseUp(e);if(islandNetwork.ready)islandSendInput()};
onkeyup=function(e){islandPreviousKeyUp(e);if(islandNetwork.ready)islandSendInput()};
onblur=function(){clearInput();if(islandNetwork.ready)islandSendInput()};
// A melee is carried across the body, rather than along the firearm's aim line.
// In character-local space +x faces forward and +y is the character's right.
function drawSidewaysMelee(index,mouth,swing=0,gloveColor='#d7dfcb'){
 const blade=cosmeticSprite('melees',index);if(gloveColor==='transparent')gloveColor='#bca255';
 if(!blade){circle(mouth+8,0,7,'#d7dfcb');return}
 const factor=76/Math.max(blade.width,blade.height),gripX=mouth+3,gripY=-12;
 const angle=(index>=10?Math.PI:Math.PI*5/4)-Math.sin((1-(swing||0)/.18)*Math.PI)*((swing||0)>0?.8:0);
 // The handle is the pivot, so the hand stays attached during the swing.
 const handleX=index>=10?0:blade.width*.28,handleY=blade.height*(index>=10?.30:.28);
 x.save();x.lineCap='round';x.strokeStyle='#28463f';x.lineWidth=8;x.beginPath();x.moveTo(mouth-7,-10);x.lineTo(gripX,gripY);x.stroke();
 x.strokeStyle=gloveColor;x.lineWidth=5;x.stroke();x.fillStyle=gloveColor;x.strokeStyle='#28463f';x.lineWidth=1.5;x.beginPath();x.arc(gripX,gripY,5,0,Math.PI*2);x.fill();x.stroke();
 x.translate(gripX,gripY);x.rotate(angle);x.drawImage(blade,(-blade.width/2-handleX)*factor,(-blade.height/2-handleY)*factor,blade.width*factor,blade.height*factor);x.restore();
}
drawEquippedMelee=function(mouth){drawSidewaysMelee(selectedCosmetic('melees'),mouth,player.meleeSwing||0,chosen('skins')[1])};
