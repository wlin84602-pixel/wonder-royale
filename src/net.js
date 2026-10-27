/* ============================================================================
   ONLINE CLIENT (Socket.IO)
   The server owns every piece of shared game state: positions of everyone, health and shields, inventories and ammo,
   loot on the ground, crates, trees, doors, the storm, kills and who is alive. This file only
     - sends this player's input ('in', 30 Hz) and requests ('act'), and
     - applies what the server sends back ('s' snapshots + events, 'm' private inventory) to the existing renderer.
   The local game code still draws everything, predicts ground movement for responsiveness, and plays effects.
   ============================================================================ */
const num=(v,d)=>typeof v==='number'&&isFinite(v)?v:d;
function cleanName(s){s=String(s==null?'':s).replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,12);return s||'Player'}
const MAXSLOTS=6;
let mt=0;                                   /* match clock, follows the server */
const remotes=new Map(),byPid=new Map();     /* other players by id; every player (incl. me) by id */
const NETIN={ix:0,iy:0,fire:false,mel:false,bo:false,ap:false};
let shotCount=0;function mpKill(){}          /* kept so the shared core links; kills are decided on the server */

let sock=null,connected=false,inRoom=false,myId='',myCode='',LOB=null;
let playing=false,endShown=false,matchSeed=-1,srvT=0,srvAt=0,overT=0,selLock=0,lastZoneKey='',lastMp='',myPlace=0,lastCd=-1;
let cfgM=[1,1,1,2,5,1,1,1,0,1],roster=[],winName='',inputT=0,rejoining=false,lobbyKey='';
const SKEY='wr_session';

/* ---------- session (so a reload or a dropped connection can come back to the same seat) ---------- */
function saveSession(){try{sessionStorage.setItem(SKEY,JSON.stringify({code:myCode,token:mySession.token,id:myId}))}catch(e){}}
function loadSession(){try{const o=JSON.parse(sessionStorage.getItem(SKEY)||'null');return o&&o.code&&o.token?o:null}catch(e){return null}}
function clearSession(){try{sessionStorage.removeItem(SKEY)}catch(e){}mySession.token=''}
const mySession={token:''};

/* ---------- connection ---------- */
function serverBase(){
  let b='';
  try{b=new URLSearchParams(location.search).get('server')||''}catch(e){}
  if(!b&&window.WR_CONFIG&&window.WR_CONFIG.server)b=String(window.WR_CONFIG.server);
  return b.replace(/\/+$/,'');
}
function loadIO(){
  return new Promise((res,rej)=>{
    if(typeof window.io==='function'){res();return}
    const s=document.createElement('script'),base=serverBase();
    const t=setTimeout(()=>{s.remove();rej(new Error('timeout'))},10000);
    s.src=(base||'')+'/socket.io/socket.io.js';
    s.onload=()=>{clearTimeout(t);typeof window.io==='function'?res():rej(new Error('no io'))};
    s.onerror=()=>{clearTimeout(t);rej(new Error('load'))};
    document.head.appendChild(s);
  });
}
function setNetStatus(t,bad){const el=$('onStatus');if(el){el.textContent=t;el.style.color=bad?'var(--bad)':''}}
let sockP=null;
function ensureSocket(){
  if(sock)return Promise.resolve(sock);
  if(sockP)return sockP;
  setNetStatus('Connecting to the server…');
  sockP=loadIO().then(()=>{
    const base=serverBase();
    const opts={transports:['polling','websocket'],reconnection:true,reconnectionAttempts:Infinity,reconnectionDelay:500,reconnectionDelayMax:5000,timeout:15000};
    sock=base?window.io(base,opts):window.io(opts);
    wireSocket(sock);
    return sock;
  }).catch(e=>{sockP=null;setNetStatus('Cannot reach the game server. Check the address in client/config.js or open the game from the server URL.',true);throw e});
  return sockP;
}
function call(ev,data){
  return new Promise(res=>{
    if(!sock||!sock.connected){res({ok:false,error:'Not connected to the server yet.'});return}
    let done=false;
    const t=setTimeout(()=>{if(!done){done=true;res({ok:false,error:'The server did not answer. Try again.'})}},8000);
    sock.emit(ev,data,r=>{if(done)return;done=true;clearTimeout(t);res(r||{ok:false,error:'No answer from the server.'})});
  });
}
function netAct(t,v){
  if(t==='sel')selLock=performance.now()+300;
  if(sock&&sock.connected&&inRoom)sock.emit('act',v===undefined?{t}:{t,v});
}
const myProfile=()=>({name:cleanName(P.name),skin:P.skin|0,sub:isSub()?1:0,ml:P.so?0:P.melee|0,bp:P.pack|0,cp:P.chute|0,so:P.so?1:0});

function wireSocket(s){
  s.on('connect',()=>{
    connected=true;$('netbar').hidden=true;
    setNetStatus('Connected. Create a room or join one with a code.');
    const ses=loadSession();
    if(ses&&(inRoom||rejoining))tryRejoin(ses);
    else authAdmin();
  });
  s.on('disconnect',()=>{connected=false;if(inRoom)$('netbar').hidden=false;setNetStatus('Connection lost. Reconnecting…',true)});
  s.on('connect_error',()=>{connected=false;if(inRoom)$('netbar').hidden=false;setNetStatus('Cannot reach the server. Retrying…',true)});
  s.on('lobby',onLobby);
  s.on('lp',onArena);
  s.on('ag',onGoal);
  s.on('cm',onChat);
  s.on('match:start',d=>{if(inRoom)beginMatch(d,false)});
  s.on('s',onSnap);
  s.on('m',m=>{if(playing)applyMe(m)});
  s.on('match:over',onOver);
  s.on('match:error',d=>{banner((d&&d.error)||'The match was reset by the server.',5)});
}
let rejoinBusy=false;
async function tryRejoin(ses){
  if(rejoinBusy)return;rejoinBusy=true;
  let r;try{r=await call('room:rejoin',{code:ses.code,token:ses.token})}finally{rejoinBusy=false}
  if(!r.ok){
    clearSession();
    if(inRoom||rejoining){rejoining=false;leaveOnline(false);$('onErr').textContent='';banner('Your seat in that room expired.',4)}
    return;
  }
  rejoining=false;inRoom=true;myId=r.id;myCode=r.code;mySession.token=r.token;saveSession();
  mp=true;$('netbar').hidden=true;
  if(r.match)beginMatch(r.match,true);
  else if(r.over){LOB=r.lobby;showHubless();showOverCard(r.over)}
  else{LOB=r.lobby;if(playing)exitMatch(true);showLobbyScreen();renderLobby()}
}

/* ---------- room screens ---------- */
function showHubless(){$('hub').hidden=true;$('online').hidden=true;$('lobby').hidden=true}
function startOnline(){
  initAudio();
  $('hub').hidden=true;$('end').hidden=true;$('lobby').hidden=true;$('online').hidden=false;$('onErr').textContent='';
  if(!inRoom)setupPreview();
  state='lobby';showHud(false);
  ensureSocket().then(()=>{if(connected)setNetStatus('Connected. Create a room or join one with a code.')}).catch(()=>{});
}
function onlineStatus(){return{ok:true,text:'Wait in a lobby with real players · starts when 2 to 6 are in'}}
/* ---------- public lobby (SOLO button) ---------- */
async function startSolo(){
  startOnline();
  setNetStatus('Finding a lobby…');
  try{await ensureSocket()}catch(e){return}
  for(let i=0;i<160&&!connected;i++)await new Promise(r=>setTimeout(r,50));
  await authAdmin();
  const r=await call('room:solo',myProfile());
  if(!r.ok){$('onErr').textContent=r.error||'Could not find a lobby.';return}
  enterRoom(r);
}
/* ---------- admin (owner) login: the key is the ADMIN_KEY variable set on the server ---------- */
const AKEY='wr_admin_key';
async function authAdmin(ask){
  let k='';try{k=localStorage.getItem(AKEY)||''}catch(e){}
  if(ask){k=(window.prompt('Admin key (the ADMIN_KEY set on your server):')||'').trim();if(!k)return false}
  if(!k||!sock||!sock.connected)return false;
  const r=await call('admin:auth',{key:k});
  if(r.ok){try{localStorage.setItem(AKEY,k)}catch(e){}return true}
  if(ask)banner(r.error||'Wrong admin key.',4);
  else{try{localStorage.removeItem(AKEY)}catch(e){}}
  return false;
}
$('lobbyAdmin').addEventListener('click',async()=>{if(await authAdmin(true))banner('Admin unlocked.',3)});
$('lobbyPause').addEventListener('click',async()=>{
  const r=await call('room:ctl',{a:LOB&&LOB.paused?'resume':'pause'});
  if(r&&!r.ok)$('cdnote').textContent=r.error||'Could not do that.';
});
$('lobbyNow').addEventListener('click',async()=>{
  const r=await call('room:ctl',{a:'now'});
  if(r&&!r.ok)$('cdnote').textContent=r.error||'Could not start.';
});
function enterRoom(r){
  inRoom=true;myId=r.id;myCode=r.code;mySession.token=r.token;saveSession();LOB=r.lobby;
  mp=true;paused=false;
  $('online').hidden=true;showLobbyScreen();renderLobby();
}
function showLobbyScreen(){
  state='lobby';showHud(false);enterArena();
  $('hub').hidden=true;$('online').hidden=true;$('end').hidden=true;$('lobby').hidden=false;$('mpbar').hidden=true;$('pchip').hidden=true;
}
$('onCreate').addEventListener('click',async()=>{
  $('onErr').textContent='';initAudio();
  try{await ensureSocket()}catch(e){return}
  const r=await call('room:create',myProfile());
  if(!r.ok){$('onErr').textContent=r.error||'Could not create a room.';return}
  enterRoom(r);
});
async function doJoin(){
  const code=$('onCode').value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5);
  if(code.length<5){$('onErr').textContent='Room codes have 5 letters or numbers.';return}
  $('onErr').textContent='';initAudio();
  try{await ensureSocket()}catch(e){return}
  const r=await call('room:join',Object.assign({code},myProfile()));
  if(!r.ok){$('onErr').textContent=r.error||'Could not join that room.';return}
  enterRoom(r);
}
$('onJoin').addEventListener('click',doJoin);
$('onCode').addEventListener('keydown',ev=>{if(ev.key==='Enter')doJoin()});
$('onBack').addEventListener('click',()=>{$('online').hidden=true;mp=false;goHome()});
$('lobbyLeave').addEventListener('click',()=>leaveOnline(false));
$('leave').addEventListener('click',()=>leaveOnline(false));
$('lobbyStart').addEventListener('click',async()=>{
  const r=await call('room:start');
  if(r&&!r.ok)$('cdnote').textContent=r.error||'Could not start.';
});
$('roomCode').addEventListener('click',()=>{
  try{navigator.clipboard.writeText(myCode);$('cdnote').textContent='Room code copied.'}catch(e){}
});
function leaveOnline(silent){
  const was=inRoom;
  if(was&&sock&&sock.connected){try{sock.emit('room:leave',{})}catch(e){}}
  arenaOn=false;$('lobby').classList.remove('arena');
  inRoom=false;rejoining=false;clearSession();myId='';myCode='';LOB=null;lobbyKey='';
  playing=false;endShown=false;matchSeed=-1;NETMODE=null;mp=false;
  remotes.clear();byPid.clear();
  $('mpbar').hidden=true;$('pchip').hidden=true;$('netbar').hidden=true;$('online').hidden=true;$('end').hidden=true;
  if(!silent)goHome();
}

/* ---------- lobby ---------- */
(function buildLobbyBits(){
  const box=$('slots');
  for(let i=0;i<MAXSLOTS;i++){
    const d=document.createElement('div');d.className='slot open';d.dataset.k='';
    const c=document.createElement('canvas');c.width=64;c.height=64;
    const n=document.createElement('div');n.className='sname';n.textContent='Open slot';
    d.appendChild(c);d.appendChild(n);box.appendChild(d);
  }
  const ho=$('hostOpts');
  const mk=(key,label,names)=>{
    const l=document.createElement('label');l.className='best';l.textContent=label+' ';
    const s=document.createElement('select');s.dataset.k=key;
    names.forEach((n,i)=>{const o=document.createElement('option');o.value=i;o.textContent=n;s.appendChild(o)});
    s.addEventListener('change',()=>{
      const o={};ho.querySelectorAll('select').forEach(x=>{o[x.dataset.k]=+x.value});
      call('room:opts',o);
    });
    l.appendChild(s);ho.appendChild(l);
  };
  mk('map','Map',['Small','Medium','Large']);mk('storm','Storm',['Slow','Normal','Fast']);mk('loot','Loot',['Sparse','Normal','Plentiful']);
})();
function onLobby(d){
  if(!inRoom)return;
  LOB=d;
  if(!d.players.some(p=>p.id===myId)){leaveOnline(false);banner('You were removed from the room.',4);return}
  if(d.phase==='lobby'&&(playing||endShown))exitMatch(true);
  if(!playing){renderLobby();if(arenaOn)syncArena()}
}
function renderLobby(){
  const d=LOB;if(!d)return;
  const me=d.players.find(p=>p.id===myId)||{},isAdmin=!!me.ad,host=d.hostId===myId&&!d.pub,ctl=isAdmin||host,slots=$('slots').children;
  $('roomCode').textContent=d.code;$('roomCode').hidden=!!d.pub;$('roomLbl').hidden=!!d.pub;$('lobbyTag').hidden=!d.pub;
  for(let i=0;i<MAXSLOTS;i++){
    const p=d.players[i],s=slots[i];if(!s)continue;
    const nm=s.querySelector('.sname'),cv2=s.querySelector('canvas');
    if(!p){s.className='slot open';nm.textContent='Open slot';if(s.dataset.k!==''){s.dataset.k='';const c=cv2.getContext('2d');if(c){c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,cv2.width,cv2.height)}}continue}
    const sk=clamp(p.skin|0,0,99);
    s.className='slot'+(p.id===myId?' me':'')+(p.id===d.hostId&&!d.pub?' host':'')+(p.ad?' host':'')+(p.connected?'':' away');
    nm.textContent=cleanName(p.name)+(p.ad?' ★':'')+(p.id===myId?' (you)':'')+(p.connected?'':' (reconnecting)');
    if(s.dataset.k!==String(sk)){s.dataset.k=String(sk);paintSkin(cv2,SKINS[sk],64,true)}
  }
  const o=d.opts,ms=['Small','Medium','Large'][clamp(o.map|0,0,2)],ss=['Slow','Normal','Fast'][clamp(o.storm|0,0,2)],ls=['Sparse','Normal','Plentiful'][clamp(o.loot|0,0,2)];
  if(arenaOn)arenaInfo();else $('lobbyInfo').textContent=ms+' map · '+ss+' storm · '+ls+' loot · '+d.min+' to '+d.max+' players';
  $('lobby').classList.toggle('arena',arenaOn);
  const ho=$('hostOpts');ho.hidden=!(ctl&&d.phase==='lobby');
  ho.querySelectorAll('select').forEach(s=>{if(document.activeElement!==s)s.value=String(o[s.dataset.k]|0)});
  const live=d.players.filter(p=>p.connected).length;
  const st=$('lobbyStart');st.hidden=!(ctl&&!d.pub)||d.phase!=='lobby';st.disabled=live<d.min;
  const lc=$('lobbyCtl');lc.hidden=!(ctl&&(d.phase==='lobby'||d.phase==='countdown'));
  $('lobbyPause').textContent=d.paused?'Resume countdown':'Pause countdown';
  $('lobbyAdmin').hidden=isAdmin;
  let big='',small='';
  if(d.phase==='countdown'){big=d.paused?'Paused at '+d.cd:'Starting in '+d.cd;small=d.paused?'The admin paused the countdown.':'Get ready to drop.'}
  else if(d.phase==='play'){big='Match in progress';small='Joining…'}
  else if(d.phase==='over'){big='Round over';small='Back to the lobby in a moment.'}
  else{big=d.paused?'Countdown paused':'Waiting for players';small=d.paused?'The admin paused the lobby. It will start when resumed.':live<d.min?live+' of '+d.min+' real players here. '+(d.pub?'The match starts by itself when '+d.min+' are in.':'Share the room code: '+d.code):(d.pub?'Starting automatically.':host?'Press Start match when everyone is in.':'Waiting for the host to start.')}
  $('cdown').classList.toggle('tick',d.phase==='countdown'&&!d.paused&&d.cd<=5);$('cdown').textContent=big;if(!/copied/.test($('cdnote').textContent)||d.phase!=='lobby')$('cdnote').textContent=small;
}

/* ---------- waiting field: a big empty green rectangle with two mini games (Coin Rush, kick the ball) ---------- */
const ARENA_W=800,ARENA_H=450,GOAL_H=120;     /* half sizes; the server uses the same numbers */
let arenaOn=false,arenaPunch=false,lpT=0,arenaCoins=[],arenaBall={x:0,y:0,tx:0,ty:0},arenaMsg=null,arenaScore=new Map(),infoT=0;
function enterArena(){
  arenaOn=true;
  ISLAND=ARENA_W;CX=CY=ARENA_W+90;
  circs=[];blocks=[];decor=[];loot=[];houses=[];doors=[];wins=[];crates=[];
  bullets=[];parts=[];feed=[];ents=[];remotes.clear();byPid.clear();arenaCoins=[];arenaScore=new Map();arenaMsg=null;
  arenaBall={x:CX,y:CY,tx:CX,ty:CY};
  const mine=LOB&&LOB.players.find(p=>p.id===myId);
  player=mkNetEnt(Object.assign({id:myId},myProfile(),mine?{name:mine.name,skin:mine.skin,sub:mine.sub}:{}));
  player.st=3;player.remote=false;
  player.x=CX-ARENA_W*.5+Math.random()*80;player.y=CY+(Math.random()*2-1)*ARENA_H*.6;
  ents.push(player);byPid.set(myId,player);
  cam.x=CX;cam.y=CY;state='arena';showHud(false);lpT=0;
  syncArena();
}
function syncArena(){
  if(!arenaOn||!LOB)return;
  const ids=new Set();
  for(const p of LOB.players){
    ids.add(p.id);if(p.id===myId)continue;
    if(!remotes.has(p.id)){
      const r=mkNetEnt(p);r.st=3;r.remote=true;r.pend=true;r.tx=r.x=CX;r.ty=r.y=CY;r.tvx=0;r.tvy=0;r.tang=r.ang;
      remotes.set(p.id,r);byPid.set(p.id,r);ents.push(r);
    }
  }
  for(const [id,r] of [...remotes]){if(!ids.has(id)){remotes.delete(id);byPid.delete(id);const i=ents.indexOf(r);if(i>=0)ents.splice(i,1)}}
}
function arenaInfo(){
  if(!arenaOn||!LOB)return;
  const me=arenaScore.get(myId)||[0,0];
  const others=LOB.players.map(p=>{const sc=arenaScore.get(p.id)||[0,0];return cleanName(p.name)+' '+sc[0]+'/'+sc[1]}).join('  ·  ');
  const ms=['Small','Medium','Large'][clamp(LOB.opts.map|0,0,2)];
  $('lobbyInfo').textContent='Coins '+me[0]+'  ·  Goals '+me[1]+'  ·  '+ms+' map     ('+others+')';
}
function onArena(d){
  if(!arenaOn||!d||!d.p)return;
  for(const q of d.p){
    arenaScore.set(q[0],[q[4]|0,q[5]|0]);
    const r=remotes.get(q[0]);if(!r)continue;
    const pm=q[6]|0;if(r.pend||r.mcSeen==null)r.mcSeen=pm;else if(pm>r.mcSeen){r.mcSeen=pm;r.swing=.26;r.swA=num(q[3],r.ang);r.ang=r.swA}
    const nx=CX+num(q[1],0),ny=CY+num(q[2],0);
    if(r.pend){r.pend=false;r.x=nx;r.y=ny;r.tvx=0;r.tvy=0}
    else{r.tvx=(nx-r.tx)*7;r.tvy=(ny-r.ty)*7}
    r.tx=nx;r.ty=ny;r.tang=num(q[3],r.tang);r.vx=r.tvx;r.vy=r.tvy;
  }
  if(d.b){arenaBall.tx=CX+num(d.b[0],0);arenaBall.ty=CY+num(d.b[1],0)}
  if(d.c)arenaCoins=d.c.map(c=>({id:c[0],x:CX+c[1],y:CY+c[2]}));
  const t=performance.now();if(t-infoT>250){infoT=t;arenaInfo()}
}
/* chat: press Enter, type, press Enter; the message floats above your character for a few seconds */
const chatOpen=()=>!$('chatIn').hidden;
function openChat(){
  if(!arenaOn||state!=='arena')return;
  for(const k in down)down[k]=false;
  const c=$('chatIn');c.value='';c.hidden=false;c.focus();
}
function closeChat(){const c=$('chatIn');c.hidden=true;c.blur();setTimeout(focusGame,30)}
$('chatIn').addEventListener('keydown',ev=>{
  ev.stopPropagation();
  if(ev.key==='Enter'){ev.preventDefault();const t=$('chatIn').value.trim().slice(0,60);if(t&&sock&&sock.connected)sock.emit('chat',{t});closeChat()}
  else if(ev.key==='Escape'){ev.preventDefault();closeChat()}
});
window.addEventListener('keydown',ev=>{
  if(ev.key!=='Enter'||ev.repeat||!arenaOn||state!=='arena'||ev.target===$('chatIn'))return;
  ev.preventDefault();openChat();
},true);
function onChat(d){
  if(!arenaOn||!d)return;
  const e=byPid.get(d.id);if(e)e.chat={t:String(d.t).slice(0,60),l:5};
}
function drawBubble(e){
  const c=e.chat;if(!c)return;
  ctx.font='700 14px "Chakra Petch",sans-serif';ctx.textAlign='center';
  const words=c.t.split(' '),lines=[];let cur='';
  for(const w of words){const t=cur?cur+' '+w:w;if(ctx.measureText(t).width>190&&cur){lines.push(cur);cur=w}else cur=t}
  if(cur)lines.push(cur);
  const lh=17,w=Math.min(220,Math.max(...lines.map(l=>ctx.measureText(l).width))+20),h=lines.length*lh+12;
  const x=e.x,y=e.y-e.r-34-h;
  ctx.globalAlpha=Math.min(1,c.l*2);
  ctx.fillStyle='rgba(255,255,255,.96)';
  ctx.beginPath();ctx.roundRect?ctx.roundRect(x-w/2,y,w,h,10):ctx.rect(x-w/2,y,w,h);ctx.fill();
  ctx.beginPath();ctx.moveTo(x-7,y+h-1);ctx.lineTo(x+7,y+h-1);ctx.lineTo(x,y+h+8);ctx.closePath();ctx.fill();
  ctx.fillStyle='#16222a';lines.forEach((l,i)=>ctx.fillText(l,x,y+14+i*lh));
  ctx.globalAlpha=1;
}
function onGoal(d){if(arenaOn&&d)arenaMsg={t:2.4,txt:'GOAL!  '+cleanName(d.n)+' scored',mine:d.id===myId}}
function arenaView(){
  const sc=Math.min((W-16)/(2*ARENA_W+140),(H-16)/(2*ARENA_H+16));
  return{sc,ox:W/2,oy:H/2};
}
function arenaStep(dt){
  const p=player;if(!p)return;
  time+=dt;
  let ix=(isDown('right')?1:0)-(isDown('left')?1:0),iy=(isDown('down')?1:0)-(isDown('up')?1:0);
  if(stick.m.on){ix=stick.m.x;iy=stick.m.y}
  const v=arenaView();
  if(stick.a.on){if(Math.hypot(stick.a.x,stick.a.y)>.12)p.ang=Math.atan2(stick.a.y,stick.a.x)}
  else if(!isTouch)p.ang=Math.atan2(mouse.y-(v.oy+(p.y-CY)*v.sc),mouse.x-(v.ox+(p.x-CX)*v.sc));
  for(const e of ents){e.swing=Math.max(0,e.swing-dt);e.mcd=Math.max(0,e.mcd-dt);if(e.chat){e.chat.l-=dt;if(e.chat.l<=0)e.chat=null}}
  const wantPunch=arenaPunch;arenaPunch=false;
  if((wantPunch||isDown('fire')||isDown('melee')||melBtn||(stick.a.on&&Math.hypot(stick.a.x,stick.a.y)>.35))&&p.mcd<=0&&!chatOpen()){p.mcd=.4;p.swing=.26;p.swA=p.ang;p.mc++;sfx(210,.09,'sawtooth',.05,.4)}
  if(chatOpen()){ix=0;iy=0}
  moveEnt(p,ix,iy,265,dt);
  p.x=clamp(p.x,CX-ARENA_W+24,CX+ARENA_W-24);p.y=clamp(p.y,CY-ARENA_H+24,CY+ARENA_H-24);
  smoothRemotes(dt);
  const k=Math.min(1,dt*16);arenaBall.x+=(arenaBall.tx-arenaBall.x)*k;arenaBall.y+=(arenaBall.ty-arenaBall.y)*k;
  if(arenaMsg){arenaMsg.t-=dt;if(arenaMsg.t<=0)arenaMsg=null}
  lpT+=dt;
  if(lpT>=.066&&sock&&sock.connected){lpT=0;sock.volatile.emit('lp',{x:Math.round(p.x-CX),y:Math.round(p.y-CY),a:Math.round(p.ang*100)/100,m:p.mc|0})}
}
function drawArena(){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.fillStyle='#2f8a4a';ctx.fillRect(0,0,W,H);                       /* green everywhere */
  const v=arenaView();
  ctx.save();ctx.translate(v.ox,v.oy);ctx.scale(v.sc,v.sc);ctx.translate(-CX,-CY);
  const x0=CX-ARENA_W,y0=CY-ARENA_H,w=ARENA_W*2,h=ARENA_H*2;
  for(let i=0;i<16;i++){ctx.fillStyle=i%2?'#36994f':'#3aa055';ctx.fillRect(x0+i*w/16,y0,w/16+1,h)}      /* mown stripes */
  ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=6;ctx.strokeRect(x0,y0,w,h);
  ctx.beginPath();ctx.moveTo(CX,y0);ctx.lineTo(CX,y0+h);ctx.stroke();
  ctx.beginPath();ctx.arc(CX,CY,90,0,TAU);ctx.stroke();
  for(const sd of [-1,1]){                                              /* goals */
    const gx=CX+sd*ARENA_W;
    ctx.fillStyle='rgba(20,60,30,.55)';ctx.fillRect(sd>0?gx:gx-70,CY-GOAL_H,70,GOAL_H*2);
    ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=2;ctx.beginPath();
    for(let y=CY-GOAL_H;y<=CY+GOAL_H;y+=24){ctx.moveTo(sd>0?gx:gx-70,y);ctx.lineTo(sd>0?gx+70:gx,y)}
    for(let xx=0;xx<=70;xx+=24){ctx.moveTo((sd>0?gx:gx-70)+xx,CY-GOAL_H);ctx.lineTo((sd>0?gx:gx-70)+xx,CY+GOAL_H)}
    ctx.stroke();
    ctx.strokeStyle='#fff';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(gx,CY-GOAL_H);ctx.lineTo(gx+sd*70,CY-GOAL_H);ctx.lineTo(gx+sd*70,CY+GOAL_H);ctx.lineTo(gx,CY+GOAL_H);ctx.stroke();
    ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(gx,CY-GOAL_H,7,0,TAU);ctx.arc(gx,CY+GOAL_H,7,0,TAU);ctx.fill();
  }
  for(const c of arenaCoins){                                           /* coins */
    const bob=Math.sin(time*5+c.id%7)*3;
    ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(c.x+3,c.y+13,13,5,0,0,TAU);ctx.fill();
    ctx.fillStyle='#e2a418';ctx.beginPath();ctx.arc(c.x,c.y+bob,15,0,TAU);ctx.fill();
    ctx.fillStyle='#ffd34d';ctx.beginPath();ctx.arc(c.x,c.y+bob,11.5,0,TAU);ctx.fill();
    ctx.fillStyle='#fff3b0';ctx.fillRect(c.x-2,c.y+bob-7,4,14);
  }
  const b=arenaBall;                                                    /* ball */
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(b.x+5,b.y+9,26,12,0,0,TAU);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(b.x,b.y,26,0,TAU);ctx.fill();
  ctx.strokeStyle='#23303a';ctx.lineWidth=3;ctx.stroke();
  ctx.fillStyle='#23303a';ctx.beginPath();ctx.arc(b.x,b.y,8,0,TAU);ctx.fill();
  for(let i=0;i<5;i++){const a=i*TAU/5-Math.PI/2;ctx.beginPath();ctx.moveTo(b.x+Math.cos(a)*8,b.y+Math.sin(a)*8);ctx.lineTo(b.x+Math.cos(a)*22,b.y+Math.sin(a)*22);ctx.stroke()}
  const sorted=ents.slice().sort((p,q)=>p.y-q.y);
  for(const e of sorted){
    const rm=e.remote;e.remote=false;drawEnt(e);e.remote=rm;
    const sc=arenaScore.get(e.pid)||[0,0];
    ctx.font='700 13px "Chakra Petch",sans-serif';ctx.textAlign='center';ctx.fillStyle=e.sub?'#ffd166':'#fff';
    ctx.strokeStyle='rgba(0,0,0,.45)';ctx.lineWidth=3;
    const nm=e.name+(e===player?' (you)':'');ctx.strokeText(nm,e.x,e.y-e.r-12);ctx.fillText(nm,e.x,e.y-e.r-12);
  }
  for(const e of sorted)drawBubble(e);
  ctx.restore();
  ctx.textAlign='center';ctx.font='700 15px "Chakra Petch",sans-serif';ctx.fillStyle='rgba(255,255,255,.85)';
  ctx.fillText('Collect coins, kick the ball into a goal. Punch ('+actLabel('fire')+') to hit it, press Enter to chat.',W/2,H-10);
  if(arenaMsg){
    const a=Math.min(1,arenaMsg.t*2);ctx.globalAlpha=a;ctx.font='400 44px "Bungee",var(--display),sans-serif';
    ctx.fillStyle=arenaMsg.mine?'#ffd166':'#fff';ctx.strokeStyle='rgba(0,0,0,.5)';ctx.lineWidth=6;
    ctx.strokeText(arenaMsg.txt,W/2,H/2);ctx.fillText(arenaMsg.txt,W/2,H/2);ctx.globalAlpha=1;
  }
}

/* ---------- match entry and exit ---------- */
function mkNetEnt(r){
  const e=mkEnt(CX,CY,false,cleanName(r.name),clamp(r.skin|0,0,99));
  e.sub=r.sub?1:0;e.so=r.so?1:0;e.ml=clamp(r.ml|0,0,MELEES.length-1);e.bp=clamp(r.bp|0,0,PACKS.length-1);e.cp=clamp(r.cp|0,0,PARAS.length-1);
  e.pid=r.id;e.st=0;e.mcSeen=0;e.ecSeen=0;e.rhk='';
  return e;
}
function beginMatch(d,restore){
  arenaOn=false;$('lobby').classList.remove('arena');
  if(playing&&!restore&&d.seed===matchSeed)return;
  matchSeed=d.seed;roster=d.roster;cfgM=d.cfg;
  NETMODE='client';mp=true;
  setMap(cfgM[0],cfgM[1],cfgM[2]);setCfg(cfgM.slice(5));booms.length=0;
  genWorld(d.seed);makePlane(d.seed);zone={cx:CX,cy:CY,r:ISLAND+120,ncx:CX,ncy:CY,nr:ISLAND+120,phase:0,state:'wait',t:0};
  bullets=[];parts=[];feed=[];ents=[];remotes.clear();byPid.clear();resetSess();
  player=null;
  for(const r of d.roster){
    const e=mkNetEnt(r);byPid.set(r.id,e);ents.push(e);
    if(r.id===myId){player=e;e.remote=false}else{e.remote=true;e.tx=e.x;e.ty=e.y;e.tvx=0;e.tvy=0;e.tang=e.ang;remotes.set(r.id,e)}
  }
  if(!player){NETMODE=null;exitMatch(true);return}      /* not part of this match */
  player.tx=player.x;player.ty=player.y;
  mt=0;srvT=0;srvAt=performance.now();aliveCount=ents.length;endShown=false;myPlace=0;lastZoneKey='';lastMp='';winName='';
  if(restore){
    if(d.world)applyWorld(d.world);
    if(d.snap){applySnap(d.snap,true);mt=d.snap.t}
    if(d.me)applyMe(d.me);
  }
  cam.x=player.x;cam.y=player.y;zoomMul=.72;
  state='play';playing=true;paused=false;
  $('lobby').hidden=true;$('end').hidden=true;$('hub').hidden=true;$('online').hidden=true;showHud(true);
  $('mpbar').hidden=false;$('pchip').hidden=false;lastFeed='\u0000';lastGun='';
  banner(restore?'Back in the match.':'Press Space to drop whenever you like. Hold Space to fall faster.',restore?3:6);
  dropT=null;dropPressed=false;kbSeen=false;setTimeout(focusGame,50);
}
function exitMatch(toLobby){
  playing=false;endShown=false;matchSeed=-1;NETMODE=null;remotes.clear();byPid.clear();
  if(toLobby){
    arenaOn=false;player=null;ents=[];showLobbyScreen();
    $('end').hidden=true;$('lobby').hidden=false;$('mpbar').hidden=true;$('pchip').hidden=true;
    renderLobby();
  }
}

/* ---------- applying server state ---------- */
function setRH(r,w,rar){
  const gk=w<0?'':w+'_'+rar;
  if(r.rhk!==gk){r.rhk=gk;r.rh=w>=0&&w<WEAP.length?mkGun(w,rar,999):null}
}
function applyWorld(w){
  loot=[];crates=[];
  for(const l of w.loot)addLoot(l[1],l[2],{type:l[3],kind:l[4],w:l[5]<0?undefined:l[5],rar:l[6],amt:l[7]},l[0]);
  for(const c of w.crates)crates.push({id:c[0],x:c[1],y:c[2],gold:!!c[3],hp:c[4],max:c[5],r:c[6],seed:c[7],air:c[8]?1:undefined,hit:0});
  for(const d of w.doors){const dd=doors[d[0]];if(dd){dd.open=!!d[1];dd.dir=d[2]===-1?-1:1;dd.anim=dd.open?1:0;dd.ts=Date.now()}}
  for(const c of w.circs){const o=circs[c[0]];if(o){o.hp=c[1];if(c[2]&&!o.dead)killTree(o,false)}}
}
function killTree(c,fx){
  const rk=c.k==='rock';c.dead=true;
  if(fx){burst(c.x,c.y,rk?'#98a6a3':'#3a8a54',22,280,.8);burst(c.x,c.y,rk?'#6c7774':'#6b4a2b',8,160,.6)}
  decor.push(rk?{x:c.x,y:c.y,c:'#6c7774',r:11}:{x:c.x,y:c.y,c:'#5d4126',r:9});
}
function applySnap(s,hard){
  srvT=s.t;srvAt=performance.now();
  if(s.z){
    zone.cx=s.z.cx;zone.cy=s.z.cy;zone.r=s.z.r;zone.ncx=s.z.nx;zone.ncy=s.z.ny;zone.nr=s.z.nr;zone.phase=s.z.ph;zone.state=s.z.s;zone.t=s.z.t;
  }
  aliveCount=s.al;
  for(const p of s.p){
    const e=byPid.get(p.i);if(!e)continue;
    e.alive=!!p.al;e.kills=p.k;e.sh=p.sh;e.hp=p.hp;
    if(e===player){
      const was=e.st;
      e.st=p.st;e.z=p.z;e.place=p.pl;
      if(p.st<3){e.tx=p.x;e.ty=p.y;e.vx=p.vx;e.vy=p.vy;if(hard||was!==p.st||Math.hypot(e.x-p.x,e.y-p.y)>300){e.x=p.x;e.y=p.y}}
      else{
        if(was<3){e.x=p.x;e.y=p.y;e.vx=0;e.vy=0}
        else if(p.c||hard||Math.hypot(e.x-p.x,e.y-p.y)>220){e.x=p.x;e.y=p.y}
      }
      if(p.mc>(e.mcSeen||0)){if(e.mcSeen!=null&&e.mcSeen>=0&&!hard){e.swing=.26;e.swA=e.ang;sfx(210,.09,'sawtooth',.05,.4)}e.mcSeen=p.mc}
      if(p.ec>(e.ecSeen||0)){if(!hard)e.emo={g:EMOTES[clamp(p.eg,0,EMOTES.length-1)].g,t:2.6};e.ecSeen=p.ec}
      e.mc=p.mc;e.ec=p.ec;
    }else{
      e.tx=p.x;e.ty=p.y;e.tvx=p.vx;e.tvy=p.vy;e.tang=p.a;e.st=p.st;e.z=p.z;e.place=p.pl;
      if(e.st<3||hard){e.x=e.tx;e.y=e.ty;e.ang=e.tang}
      setRH(e,p.g,p.gr);
      if(p.mc>e.mcSeen){if(!hard){e.swing=.26;e.swA=e.tang;e.ang=e.tang}e.mcSeen=p.mc}
      if(p.ec>e.ecSeen){if(!hard)e.emo={g:EMOTES[clamp(p.eg,0,EMOTES.length-1)].g,t:2.6};e.ecSeen=p.ec}
    }
  }
}
function applyMe(m){
  const p=player;if(!p)return;
  for(let i=0;i<NSLOT;i++){
    const v=m.inv[i],cur=p.inv[i];
    if(i===0){p.inv[0]=MELEE_ITEM;continue}
    if(!v){p.inv[i]=null;continue}
    if(v[0]===0){
      if(cur&&cur.type==='gun'&&cur.w===v[1]&&cur.rar===v[2]){cur.ammo=v[3];cur.mg=v[4]}
      else{const g=mkGun(v[1],v[2],v[3]);g.mg=v[4];p.inv[i]=g}
    }else{
      if(cur&&cur.type==='heal'&&cur.id===v[1])cur.n=v[2];else p.inv[i]=mkHeal(v[1],v[2]);
    }
  }
  for(let k=0;k<AMMOL.length;k++)p.pouch[AMMOL[k]]=m.pc[k]|0;
  if(performance.now()>selLock)p.sel=clamp(m.sel|0,0,NSLOT-1);
  p.use=m.us?{slot:m.us[0],t:m.us[1],T:m.us[2]}:null;
  p.rl=m.rl||0;p.regenT=m.rg?1:0;
}
function applyEvent(ev){
  const k=ev[0];
  switch(k){
    case 'shot':{
      const e=byPid.get(ev[1]),f=ev[2];if(!e)return;
      if(e!==player)setRH(e,ev[4],ev[5]);
      for(const q of ev[3])bullets.push({x:q[0],y:q[1],vx:q[2],vy:q[3],life:q[4],dmg:0,o:e,col:f.col,k:f.k,pj:f.pj||undefined,boom:f.boom||undefined,pierce:f.pierce?true:undefined,hs:null});
      e.recoil=1;
      if(e===player){SESS.shots++;const g=heldGun(player);addShake(f.boom?9:ev[3].length>1?6:g&&g.s.dmg>40?7:2.5)}
      if(!e.rh&&e!==player)setRH(e,ev[4],ev[5]);
      shotSfx(e);
      break}
    case 'hit':{
      const e=byPid.get(ev[1]);if(!e)return;
      e.hit=.1;e.hp=ev[6];e.sh=ev[7];
      burst(ev[2],ev[3],e.sh>0?COL.shield:'#ffffff',4,140,.35);
      if(e===player){addShake(5);dmgFlash=.3;sfx(120,.08,'square',.06,.5)}
      else if(ev[5]===myId){hitmark=.15;SESS.hits++;SESS.dmg+=ev[4];sfx(900,.04,'square',.03)}
      break}
    case 'l+':{if(!loot.some(l=>l.id===ev[1]))addLoot(ev[2],ev[3],{type:ev[4],kind:ev[5],w:ev[6]<0?undefined:ev[6],rar:ev[7],amt:ev[8]},ev[1]);break}
    case 'l-':{const i=loot.findIndex(l=>l.id===ev[1]);if(i>=0)loot.splice(i,1);if(ev[2]===myId)sfx(520,.05,'square',.03,1.3);break}
    case 'l~':{const l=loot.find(x=>x.id===ev[1]);if(l)l.amt=ev[2];break}
    case 'c':{const c=crates.find(x=>x.id===ev[1]);if(c){c.hp=ev[2];c.hit=.12}break}
    case 'c-':{const c=crates.find(x=>x.id===ev[1]);if(c)breakCrate(c,false);break}
    case 'c+':{if(!crates.some(c=>c.id===ev[1]))crates.push({id:ev[1],x:ev[2],y:ev[3],gold:!!ev[4],hp:ev[5],max:ev[6],r:ev[7],seed:ev[8],air:ev[9]?1:undefined,hit:0});break}
    case 't':{const c=circs[ev[1]];if(!c)return;c.hp=ev[2];c.hit=.14;if(ev[3]&&!c.dead)killTree(c,true);else burst(c.x,c.y,c.k==='rock'?'#a9b6b3':'#3a8a54',3,110,.35);break}
    case 'd':{const d=doors[ev[1]];if(!d)return;const o=!!ev[2];d.dir=ev[3]===-1?-1:1;d.ts=Date.now();d.pend=0;if(d.open!==o){d.open=o;if(Math.hypot(player.x-d.x,player.y-d.y)<900)sfx(o?300:210,.07,'square',.03,.8)}break}
    case 'f':{feed.push({t:ev[2],txt:ev[1]});break}
    case 'death':{
      const e=byPid.get(ev[1]);if(!e)return;
      e.alive=false;e.hp=0;e.place=ev[3];burst(ev[4],ev[5],'#ffffff',18,260,.7);
      if(e===player){myPlace=ev[3];e.use=null;e.rl=0}
      else if(ev[2]===myId)sfx(700,.12,'sine',.05,1.5);
      break}
  }
}
function onSnap(d){
  if(!playing||!player)return;
  applySnap(d.s,false);
  for(const ev of d.e)applyEvent(ev);
}

/* ---------- per frame ---------- */
function smoothRemotes(dt){
  const k=Math.min(1,dt*14);
  for(const r of remotes.values()){
    if(r.st<3)continue;
    r.x+=(r.tx+r.tvx*.06-r.x)*k;r.y+=(r.ty+r.tvy*.06-r.y)*k;
    r.ang+=angDiff(r.ang,r.tang)*k;
  }
}
function zoneBanner(){
  if(!zone)return;
  const key=zone.phase+zone.state;
  if(key!==lastZoneKey){
    if(lastZoneKey)banner(zone.state==='shrink'?'The storm is closing in':zone.state==='wait'?'New circle marked. Move in.':'Final circle',3);
    lastZoneKey=key;
  }
}
function mpMatchStep(dt){
  mt+=dt;
  const est=srvT+(performance.now()-srvAt)/1000,d=est-mt;
  if(Math.abs(d)>1)mt=est;else mt+=d*.08;
  smoothRemotes(dt);
  if(player&&player.st<3&&player.alive){const k=Math.min(1,dt*18);player.x+=(player.tx-player.x)*k;player.y+=(player.ty-player.y)*k}
  zoneBanner();
}
function netTick(dt){
  if(playing&&player&&NETMODE==='client'&&sock&&sock.connected){
    inputT-=dt;
    if(inputT<=0){
      inputT=1/30;
      const p=player;
      sock.volatile.emit('in',{x:Math.round(p.x*10)/10,y:Math.round(p.y*10)/10,vx:Math.round(p.vx),vy:Math.round(p.vy),a:Math.round(p.ang*1000)/1000,
        ix:NETIN.ix,iy:NETIN.iy,f:NETIN.fire?1:0,m:NETIN.mel?1:0,bo:NETIN.bo?1:0,ap:NETIN.ap?1:0});
    }
  }
  if(endShown){overT=Math.max(0,overT-dt);const el=$('endNote');if(el)el.textContent='Back to the lobby in '+Math.ceil(overT)+'s'}
}
function mpHud(){
  $('pcount').textContent=Math.max(0,aliveCount);
  let m='';
  if(endShown)m=winName?winName+' wins the round!':'Round over';
  else if(!player.alive)m='Eliminated, #'+myPlace+'. Spectating.';
  if(m!==lastMp){lastMp=m;$('mpmsg').textContent=m;$('mpmsg').hidden=!m}
}

/* ---------- end of match ---------- */
function onOver(d){
  if(!inRoom)return;
  showOverCard(d);
}
function showOverCard(d){
  endShown=true;overT=d.returnIn||10;winName=d.winner||'';
  const me=d.results.find(r=>r.id===myId)||{place:d.results.length,kills:0,alive:0};
  const won=d.winnerId===myId;
  const rw=recordMatch({place:me.place,total:d.results.length,kills:me.kills,win:won,time:d.t,mode:'Live',map:cfgM[0]});
  fillEnd(won?'Last one standing':me.alive?'Round over':'Eliminated',won?'You won the round.':d.winner?d.winner+' won the round.':'The round has ended.',me.place,me.kills,d.t,rw);
  $('again').hidden=true;$('end').hidden=false;
}

/* ---------- resume after a page reload ---------- */
(function resume(){
  const ses=loadSession();if(!ses)return;
  rejoining=true;myId=ses.id||'';myCode=ses.code;mySession.token=ses.token;
  ensureSocket().then(s=>{if(s.connected)tryRejoin(ses)}).catch(()=>{rejoining=false});
})();
