// Host-controlled waiting island.
(function(){
const previousApply=islandApplySnapshot,previousOnlineUpdate=islandOnlineUpdate,previousDraw=draw,previousKeyDown=onkeydown,previousMouseDown=onmousedown,previousDisconnect=islandDisconnect;
const lobbyHUD=$('#waiting-lobby'),roomInput=$('#lobby-room-input'),startButton=$('#lobby-start-match'),status=$('#lobby-status');
const params=typeof URLSearchParams!=='undefined'?new URLSearchParams(typeof location!=='undefined'?location.search:''):{get(){return null}};
roomInput.value=params.get('room')||'main';islandNetwork.room=roomInput.value;
function setWaiting(on){document.body?.classList?.toggle('waiting-room',on);lobbyHUD.style.display=on?'block':'none'}
function lobbyCamera(){const S=IslandLobby.SIZE;if(islandNetwork.lobbyOverview){cameraX=cameraY=S/2;cameraZoom=Math.min(innerWidth/(S+260),innerHeight/(S+260));return}cameraZoom=Math.max(innerWidth/(S+100),innerHeight/(S+100),innerWidth<700?.7:.85);const w=innerWidth/(2*cameraZoom),h=innerHeight/(2*cameraZoom);cameraX=Island.clamp(player.x,w,S-w);cameraY=Island.clamp(player.y,h,S-h)}
function lobbyUI(snapshot){const host=snapshot.hostId===player.id,hostName=snapshot.roster.find(p=>p.id===snapshot.hostId)?.name||'Host';$('#lobby-room-title').textContent='ROOM · '+snapshot.room;$('#lobby-player-count').textContent=snapshot.alive+' / 25 PLAYERS';status.textContent=host?'You are the host. Start whenever you are ready.':'Waiting for '+hostName+' to start the match.';startButton.disabled=!host;startButton.textContent=host?'START MATCH →':'WAITING FOR HOST';$('#lobby-roster').innerHTML=snapshot.roster.map(p=>'<li><span>'+htmlText(p.name)+(p.id===player.id?' (you)':'')+'</span><b>'+(p.id===snapshot.hostId?'HOST':'READY')+'</b></li>').join('');const u=new URL(typeof location!=='undefined'&&/^https?:/.test(location.protocol)?location.href:'https://bot-royale-production.up.railway.app/');u.search='';u.searchParams.set('room',snapshot.room);$('#lobby-invite-link').value=u.href}
islandApplySnapshot=function(snapshot){if(snapshot?.matchState==='waiting'){
 const net=islandNetwork;if(net.last&&snapshot.tick<=net.last.tick)return;if(snapshot.seed!==islandState?.seed)initializeIsland(snapshot.seed);const first=!net.inLobby,before=player?{x:player.x,y:player.y}:null;net.inLobby=true;net.lobbyWorld=net.lobbyWorld||IslandLobby.create(snapshot.seed);net.last=snapshot;net.receivedAt=performance.now();Object.assign(net.lobbyWorld,snapshot.lobby);if(first)net.lobbyOverview=false;Object.assign(player,snapshot.self);if(!first&&before&&Math.hypot(before.x-player.x,before.y-player.y)<100){player.x=before.x+(player.x-before.x)*.4;player.y=before.y+(player.y-before.y)*.4}bots=snapshot.actors;slot=0;selectedItem='weapon';dropPhase='lobby';bullets=[];time=0;kills=0;net.pendingDropCount=0;setWaiting(true);lobbyCamera();lobbyUI(snapshot);if(first)clearInput();return
 }if(islandNetwork.inLobby){islandNetwork.inLobby=false;islandNetwork.lobbyWorld=null;islandNetwork.last=null;setWaiting(false);clearInput()}return previousApply(snapshot)};
islandOnlineUpdate=function(dt){if(!islandNetwork.inLobby)return previousOnlineUpdate(dt);lobbyCamera();updatePlayerAim();if(!matchMenuOpen&&performance.now()-islandNetwork.receivedAt<1000){const m=movementVector();Island.moveActor(islandNetwork.lobbyWorld,player,m.dx,m.dy,dt,player.speed)}islandNetwork.lobbyWorld.time=(islandNetwork.last.lobby.time||0)+Math.min(.3,Math.max(0,(performance.now()-islandNetwork.receivedAt)/1000));if(actionDown('fire'))lobbyShot();return};
draw=function(){
 if(!islandNetwork.inLobby)return previousDraw();lobbyCamera();const s=islandNetwork.lobbyWorld,view={x:cameraX-innerWidth/(2*cameraZoom),y:cameraY-innerHeight/(2*cameraZoom),w:innerWidth/cameraZoom,h:innerHeight/cameraZoom};
 x.setTransform(scale,0,0,scale,0,0);x.fillStyle='#245b70';x.fillRect(0,0,innerWidth,innerHeight);x.save();x.translate(innerWidth/2,innerHeight/2);x.scale(cameraZoom,cameraZoom);x.translate(-cameraX,-cameraY);
 IslandLobbyRender.draw(x,s,view,player);
 const objects=s.index.query(view.x-100,view.y-100,view.w+200,view.h+200);for(const o of objects)if(o.kind!=='lobby-fixture')IslandDraw.object(x,o,s.time);
 for(const actor of [...bots,player]){if(actor.x<view.x-100||actor.x>view.x+view.w+100||actor.y<view.y-150||actor.y>view.y+view.h+100)continue;const remaining=Math.max(0,(actor.bounceUntil||0)-s.time),lift=remaining?Math.sin((1-remaining/1.1)*Math.PI)*110:0,dancing=(actor.dancingUntil||0)>s.time;
  if(dancing){x.strokeStyle=['#c595ed','#9fe1d0','#f5ce87'][Math.floor(s.time*3)%3];x.lineWidth=4;x.beginPath();x.arc(actor.x,actor.y,50+Math.sin(s.time*6)*5,0,7);x.stroke()}
  x.save();x.translate(0,-lift);if(IslandLobby.inRange(actor))drawCharacter({...actor,slot:1,itemKind:'gun',weaponType:0});else if(dancing)drawCharacter({...actor,angle:(actor.angle||0)+Math.sin(s.time*7)*.35,slot:0});else drawCharacter(actor);x.restore();
  x.font='bold 17px system-ui';x.textAlign='center';const name=(actor.id===islandNetwork.last.hostId?'★ ':'')+(actor.name||'Player');x.lineWidth=5;x.strokeStyle='#214941';x.strokeText(name,actor.x,actor.y+63-lift);x.fillStyle=actor===player?'#fff1b7':'#fff';x.fillText(name,actor.x,actor.y+63-lift);
 }IslandDraw.canopies(x,objects,player);x.restore();
 const mini=$('#lobby-island-map');if(mini.width!==180)mini.width=180;if(mini.height!==180)mini.height=180;IslandLobbyRender.mini(mini.getContext('2d'),s,[...bots,player].map(p=>({...p,local:p===player})),view);lobbyActivityUI();
};
function lobbyActivityUI(){
 const s=islandNetwork.lobbyWorld,key=keyLabel(bindings.interact);let hint='Walk around or choose an activity to travel there.',at=IslandLobby.nearest(player);
 if(IslandLobby.inRange(player))hint=keyLabel(bindings.fire)+' · Shoot targets · '+(player.arcadeHits||0)+' hits';
 else if(Math.hypot(player.x-s.ball.x,player.y-s.ball.y)<95)hint=key+' · Kick the ball · Aim with your mouse';
 else if(at==='race')hint=key+' · Start / restart your timed lap';
 else if(at==='dance')hint=key+' · Dance for 8 seconds';
 else if(at==='bounce')hint=key+' · Bounce';
 else if(at==='fountain')hint=key+' · Fountain confetti';
 if(player.raceStart!=null)hint='LAP '+Math.max(0,s.time-player.raceStart).toFixed(1)+'s · Next checkpoint '+(player.raceNext===0?'FINISH':player.raceNext);
 $('#lobby-activity-hint').textContent=hint;
 $('#lobby-personal-stats').textContent='TARGETS '+(player.arcadeHits||0)+'  ·  BEST LAP '+(player.raceBest?player.raceBest.toFixed(1)+'s':'—');
 $('#lobby-pitch-score').textContent='FOOTBALL  '+s.ball.blue+' : '+s.ball.orange;
 const nearest=IslandLobby.AREAS.reduce((a,b)=>Math.hypot(player.x-a.x,player.y-a.y)<Math.hypot(player.x-b.x,player.y-b.y)?a:b);
 $('#lobby-current-area').textContent=nearest.name;$('#lobby-map-toggle').textContent=islandNetwork.lobbyOverview?'FOLLOW PLAYER':'ISLAND OVERVIEW';
}
let lobbyLastShot=-100;
function lobbyShot(){if(!islandNetwork.inLobby||matchMenuOpen||!IslandLobby.inRange(player)||performance.now()-lobbyLastShot<190)return;updatePlayerAim();lobbyLastShot=performance.now();islandSendAction('lobby-shot',{aim:player.angle})}
function lobbyUse(){if(!islandNetwork.inLobby||matchMenuOpen)return;updatePlayerAim();islandSendAction('lobby-use',{aim:player.angle})}
onkeydown=function(e){if(!islandNetwork.inLobby)return previousKeyDown(e);const k=e.key.toLowerCase();if(matchMenuOpen){if(k==='escape')stayInMatch();return}if(k==='escape'||k===bindings.exit){e.preventDefault?.();openMatchMenu();return}if(!e.ctrlKey&&!e.altKey&&!e.metaKey){keys[k]=true;if(Object.values(bindings).includes(k))e.preventDefault?.();if(!e.repeat){if(k===bindings.interact)lobbyUse();if(k===bindings.map){islandNetwork.lobbyOverview=!islandNetwork.lobbyOverview;e.preventDefault?.()}if(k===bindings.fire)lobbyShot()}islandSendInput()}};
onmousedown=function(e){if(!islandNetwork.inLobby)return previousMouseDown(e);if(matchMenuOpen||e.target!==c)return;const key='mouse'+(e.button||0);keys[key]=true;if(key===bindings.fire){e.preventDefault?.();lobbyShot()}if(key===bindings.interact){e.preventDefault?.();lobbyUse()}islandSendInput()};
islandDisconnect=function(){setWaiting(false);islandNetwork.inLobby=false;islandNetwork.lobbyWorld=null;return previousDisconnect()};
startButton.onclick=async()=>{if(!islandNetwork.inLobby||islandNetwork.last.hostId!==player.id)return;startButton.disabled=true;const reply=await islandSendAction('start-match');if(!reply?.ok&&islandNetwork.inLobby){startButton.disabled=false;status.textContent=reply?.error||'Could not start. Try again.'}};
$('#lobby-copy-link').onclick=async()=>{try{await navigator.clipboard.writeText($('#lobby-invite-link').value);$('#lobby-copy-link').textContent='COPIED ✓'}catch{$('#lobby-invite-link').select?.();status.textContent='Copy the room link above to invite a friend.'}};
$('#lobby-new-room').onclick=()=>{roomInput.value='room-'+Math.random().toString(36).slice(2,8);islandNetwork.room=roomInput.value};
roomInput.addEventListener('input',()=>{islandNetwork.room=roomInput.value.trim()});
const originalHomePlay=$('#home-play').onclick;
$('#home-play').onclick=()=>{if(islandNetwork.enabled){const value=roomInput.value.trim();if(!/^[a-zA-Z0-9_-]{1,24}$/.test(value)){roomInput.setCustomValidity?.('Use 1–24 letters, numbers, hyphens or underscores.');roomInput.reportValidity?.();return}roomInput.setCustomValidity?.('');islandNetwork.room=value}originalHomePlay()};
if(islandNetwork.enabled){const button=$('#home-play');const title=button.querySelector?.('strong'),subtitle=button.querySelector?.('small'),badge=button.querySelector?.('.mode-badge');if(title)title.textContent='Multiplayer ▶';if(subtitle)subtitle.textContent='Join lobby · Host starts match';if(badge)badge.textContent='PLAY TOGETHER';$('#online-game-link').style.display='none'}
for(const area of IslandLobby.AREAS)$('#lobby-travel-'+area.id).onclick=()=>{if(islandNetwork.inLobby&&!matchMenuOpen)islandSendAction('lobby-travel',{area:area.id})};
$('#lobby-map-toggle').onclick=()=>{islandNetwork.lobbyOverview=!islandNetwork.lobbyOverview};
setWaiting(false);
})();
