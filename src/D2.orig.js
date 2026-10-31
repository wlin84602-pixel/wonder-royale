/* ---------- online play: lobby of up to 6, countdown, shared plane drop and match ----------
   Everyone derives the same map, loot, plane and storm from a round number, shared settings and one round clock.
   Each player publishes their own state through room presence; hits on a player are decided by that player's client.
   One peer (smallest label among synced peers) keeps the lobby phase, countdown and round clock. */
let room=null,roomState='wait',myPeer='',myName='Player',myOk=false,joinTime=0;
let ph=0,cd=0,rn=0,mt=0,ro=[],cfgM=[1,1,1,2,15,1,1,1,0,1],winName='',ei=0,prevPh=0;
let playing=false,roundSeen=-1,sched=[],endShown=false,amHost=false;
let shotCount=0,deathCount=0,killedBy='',myDrop=null,myPlace=0;
let mpTaken=[],needLootFilter=false,lastP={},pubT=0,lastZoneKey='',lastMp='',lobT=0;
const remotes=new Map(),takenSet=new Set();
const num=(v,d)=>typeof v==='number'&&isFinite(v)?v:d;
const seedFor=n=>n*7919+1234567;
const MAXSLOTS=6;
function cleanName(s){s=String(s==null?'':s).replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,12);return s||'Player'}
const myCfg=()=>[S.map,S.storm,S.loot,clamp(S.minP|0,2,6),[10,15,20][clamp(S.cd|0,0,2)],S.crate,S.gold,S.rarity,S.startGun,S.healSpd];

function buildSchedule(seed){
  const R=mulberry((seed^0x9e3779b9)>>>0),rr=(a,b)=>a+R()*(b-a);
  let cx=CX,cy=CY,r=ISLAND+120,t=0;const out=[];
  for(let i=0;i<ZRn.length;i++){
    const nr=ZRn[i],maxo=Math.max(0,r-nr)*.8,a=rr(0,TAU),d=Math.sqrt(R())*maxo;
    const ncx=cx+Math.cos(a)*d,ncy=cy+Math.sin(a)*d;
    out.push({i,t0:t,t1:t+ZWn[i],t2:t+ZWn[i]+ZSn[i],fcx:cx,fcy:cy,fr:r,ncx,ncy,nr});
    t+=ZWn[i]+ZSn[i];cx=ncx;cy=ncy;r=nr;
  }
  return out;
}
function applyZone(t){
  if(!zone)zone={};
  for(const s of sched){
    if(t<s.t1){Object.assign(zone,{cx:s.fcx,cy:s.fcy,r:s.fr,ncx:s.ncx,ncy:s.ncy,nr:s.nr,phase:s.i,state:'wait',t:t-s.t0});return}
    if(t<s.t2){
      const k=(t-s.t1)/(s.t2-s.t1);
      Object.assign(zone,{cx:lerp(s.fcx,s.ncx,k),cy:lerp(s.fcy,s.ncy,k),r:lerp(s.fr,s.nr,k),ncx:s.ncx,ncy:s.ncy,nr:s.nr,phase:s.i,state:'shrink',t:t-s.t1});return;
    }
  }
  const s=sched[sched.length-1];
  Object.assign(zone,{cx:s.ncx,cy:s.ncy,r:s.nr,ncx:s.ncx,ncy:s.ncy,nr:s.nr,phase:s.i,state:'done',t:0});
}
function zoneBanner(){
  const key=zone.phase+zone.state;
  if(key!==lastZoneKey){
    if(lastZoneKey)banner(zone.state==='shrink'?'The storm is closing in':zone.state==='wait'?'New circle marked. Move in.':'Final circle',3);
    lastZoneKey=key;
  }
}
function roundLen(cfg){
  const sm=STORMM[clamp(cfg[1]|0,0,2)],pt=PLANE_TS[clamp(cfg[0]|0,0,2)];
  let s=0;for(let i=0;i<ZW.length;i++)s+=(ZW[i]+ZS[i])*sm;
  return s+pt+8+25;
}
function winText(){return winName?winName+' wins the round!':'Round over'}

/* ---------- presence out ---------- */
function pub(force){
  if(!room)return;
  const now=performance.now();
  if(!force&&now-pubT<50)return;
  pubT=now;
  const Q={v:2,on:mp?1:0,n:myName,sk:P.skin,sb:isSub()?1:0,jt:joinTime,ok:myOk?1:0,mr:playing?rn:0};
  if(playing&&player){
    const p=player,hg=heldGun(p);
    Object.assign(Q,{x:Math.round(p.x),y:Math.round(p.y),a:Math.round(p.ang*100)/100,vx:Math.round(p.vx),vy:Math.round(p.vy),
      hp:Math.round(p.hp),sh:Math.round(p.sh),g:hg?hg.w:-1,gr:hg?hg.rar:0,al:p.alive?1:0,k:p.kills,sc:shotCount,dc:deathCount,kb:killedBy,dd:myDrop,
      dr:doorOps.slice(-6),tk:mpTaken.slice(),st:p.st,z:Math.round(p.z*100)/100,ml:p.ml,bp:p.bp,cp:p.cp|0,mc:p.mc,ec:p.ec,eg:p.eg});
  }
  if(amHost)Object.assign(Q,{ph,cd:Math.round(cd*10)/10,rn,mt:Math.round(mt*20)/20,ro,cf:cfgM,wn:winName,ei:Math.round(ei*10)/10});
  const patch={};let any=false;
  for(const k in Q){const s=JSON.stringify(Q[k]);if(lastP[k]!==s){lastP[k]=s;patch[k]=Q[k];any=true}}
  if(any){try{room.presence(patch).catch(()=>{})}catch(e){}}
}

/* ---------- remote players ---------- */
function mkRemote(p,pr){
  const r=mkEnt(num(pr.x,CX),num(pr.y,CY),false,cleanName(pr.n),num(pr.sk,0));
  r.remote=true;r.peer=p.peer;r.tx=r.x;r.ty=r.y;r.tvx=0;r.tvy=0;r.tang=r.ang;
  r.sc=num(pr.sc,0);r.dc=num(pr.dc,0);r.mcSeen=num(pr.mc,0);r.ecSeen=num(pr.ec,0);r.tkRef=null;r.hp=clamp(num(pr.hp,100),0,100);
  return r;
}
function onRemoteDeath(r,pr,dc){
  const kb=typeof pr.kb==='string'?pr.kb:'';
  let by='The storm';
  if(kb&&kb===myPeer){by='You';player.kills++;sfx(700,.12,'sine',.05,1.5)}
  else{const k=remotes.get(kb);if(k)by=k.name}
  feed.push({t:5,txt:by+' eliminated '+r.name});
  burst(r.x,r.y,'#ffffff',18,260,.7);
  const d=pr.dd;
  if(d&&typeof d==='object'&&Array.isArray(d.i)){
    const gx=num(d.x,r.x),gy=num(d.y,r.y),sid=r.peer.slice(0,6);
    d.i.slice(0,3).forEach((q,k)=>{
      if(!Array.isArray(q))return;
      const a=k*2.1+.5,x=gx+Math.cos(a)*18,y=gy+Math.sin(a)*18,id='D'+sid+':'+dc+'_'+k;
      if(loot.some(l=>l.id===id)||takenSet.has(id))return;
      if(q[0]===0){const w=clamp(Math.floor(num(q[1],0)),0,WEAP.length-1),rar=clamp(Math.floor(num(q[2],0)),0,6);addLoot(x,y,{type:'gun',w,rar,kind:w,amt:clamp(Math.floor(num(q[3],10)),1,WEAP[w].mag*5)},id)}
      else{const hk=clamp(Math.floor(num(q[1],0)),0,HEALS.length-1);addLoot(x,y,{type:'heal',kind:hk,amt:clamp(Math.floor(num(q[2],1)),1,HEALS[hk].max)},id)}
    });
  }
  needLootFilter=true;
}
function syncRemotes(ps){
  const seen=new Set();
  for(const p of ps){
    if(p.sameTab)continue;
    const pr=p.presence;
    if(!pr||pr.on!==1||pr.v!==2||pr.mr!==rn||ro.indexOf(p.peer)<0)continue;
    seen.add(p.peer);
    let r=remotes.get(p.peer);
    if(!r){r=mkRemote(p,pr);remotes.set(p.peer,r);ents.push(r)}
    r.name=cleanName(pr.n);r.skin=clamp(Math.floor(num(pr.sk,0)),0,99);r.sub=pr.sb===1?1:0;
    r.tx=num(pr.x,r.tx);r.ty=num(pr.y,r.ty);r.tvx=num(pr.vx,0);r.tvy=num(pr.vy,0);r.tang=num(pr.a,r.tang);
    r.st=clamp(Math.floor(num(pr.st,3)),0,3);r.z=clamp(num(pr.z,0),0,1);
    if(r.st<3){r.x=r.tx;r.y=r.ty}
    const hp=clamp(num(pr.hp,100),0,100);
    if(hp<r.hp-.5){r.hit=.1;burst(r.x,r.y,'#ffffff',3,120,.3)}
    r.hp=hp;r.sh=clamp(num(pr.sh,0),0,100);{
      const gw=Math.floor(num(pr.g,-1)),gr=clamp(Math.floor(num(pr.gr,0)),0,6),gk=gw<0?'':gw+'_'+gr;
      if(r.rhk!==gk){r.rhk=gk;r.rh=gw>=0&&gw<WEAP.length?mkGun(gw,gr,999):null}
    }
    if(Array.isArray(pr.dr))for(const o of pr.dr){
      if(!Array.isArray(o))continue;const dd=doors[o[0]|0],ts=num(o[2],0);
      if(dd&&ts>dd.ts){dd.ts=ts;dd.dir=o[3]===-1?-1:1;if(!!dd.open!==!!o[1]){dd.open=!!o[1];sfx(dd.open?300:210,.07,'square',.03,.8)}}
    }
    r.kills=num(pr.k,0);r.alive=pr.al===1;
    const sc=num(pr.sc,r.sc);
    if(sc>r.sc&&r.alive&&r.st===3){const n=Math.min(6,sc-r.sc),rate=r.rh?r.rh.s.rate:.1;if(r.rh){for(let i=0;i<n;i++)fireBullets(r,(n-1-i)*rate);r.recoil=1;shotSfx(r)}}
    r.sc=sc;
    r.ml=clamp(Math.floor(num(pr.ml,0)),0,MELEES.length-1);r.bp=clamp(Math.floor(num(pr.bp,0)),0,PACKS.length-1);r.cp=clamp(Math.floor(num(pr.cp,0)),0,PARAS.length-1);
    const mc=num(pr.mc,r.mcSeen);
    if(mc>r.mcSeen){
      r.mcSeen=mc;r.swing=.26;r.swA=r.tang;r.ang=r.tang;
      const m=MELEES[r.ml];
      if(r.alive&&r.st===3&&player.alive&&player.st===3){
        const dx=player.x-r.x,dy=player.y-r.y,dd=Math.hypot(dx,dy);
        if(dd<m.rng+player.r+10&&Math.abs(angDiff(r.tang,Math.atan2(dy,dx)))<1.1&&los(r,player)){damage(player,m.dmg,r);burst(player.x,player.y,'#ffd166',5,170,.3)}
      }
    }
    const ec=num(pr.ec,r.ecSeen);
    if(ec>r.ecSeen){r.ecSeen=ec;r.emo={g:EMOTES[clamp(Math.floor(num(pr.eg,0)),0,EMOTES.length-1)].g,t:2.6}}
    const dc=num(pr.dc,r.dc);
    if(dc>r.dc)onRemoteDeath(r,pr,dc);
    r.dc=dc;
    if(pr.tk!==r.tkRef){
      r.tkRef=pr.tk;
      if(Array.isArray(pr.tk)){
        for(const id of pr.tk){
          if(typeof id!=='string')continue;
          if(!takenSet.has(id)){
            takenSet.add(id);
            if(id[0]==='C'&&id.indexOf('_')<0){const c=crates.find(x=>'C'+x.id===id);if(c)breakCrate(c,false)}
          }
        }
        needLootFilter=true;
      }
    }
  }
  for(const [k,r] of remotes){
    if(!seen.has(k)){
      remotes.delete(k);const i=ents.indexOf(r);if(i>=0)ents.splice(i,1);
      feed.push({t:4,txt:r.name+' left'});
    }
  }
  if(needLootFilter){loot=loot.filter(l=>!takenSet.has(l.id));needLootFilter=false}
}
function smoothRemotes(dt){
  const k=Math.min(1,dt*14);
  for(const r of remotes.values()){
    if(r.st<3)continue;
    r.x+=(r.tx+r.tvx*.06-r.x)*k;r.y+=(r.ty+r.tvy*.06-r.y)*k;
    r.ang+=angDiff(r.ang,r.tang)*k;
  }
}
function mpKill(from){
  const e=player;if(!e.alive)return;
  e.alive=false;e.hp=0;deathCount++;killedBy=from&&from.peer?from.peer:'';
  let alive=0;for(const r of remotes.values())if(r.alive)alive++;
  myPlace=alive+1;aliveCount=alive;
  const sid=myPeer.slice(0,6),dl=dropList(e);
  myDrop={x:Math.round(e.x),y:Math.round(e.y),i:dl.map(it=>it.type==='gun'?[0,it.w,it.rar,Math.round(it.ammo)]:[1,it.id,it.n])};
  dl.forEach((it,k)=>{const a=k*2.1+.5;addLoot(e.x+Math.cos(a)*18,e.y+Math.sin(a)*18,dropDesc(it),'D'+sid+':'+deathCount+'_'+k)});
  feed.push({t:5,txt:(from&&from.name?from.name:'The storm')+' eliminated you'});
  burst(e.x,e.y,'#ffffff',18,260,.7);
  pub(true);
}
function mpMatchStep(dt){
  const ps=room?room.peers():[];
  syncRemotes(ps);smoothRemotes(dt);
  let alive=player.alive?1:0;
  for(const r of remotes.values())if(r.alive)alive++;
  aliveCount=alive;
  applyZone(mt);zoneBanner();
}

/* ---------- match entry and exit ---------- */
function enterMatch(){
  playing=true;roundSeen=rn;endShown=false;
  setMap(cfgM[0],cfgM[1],cfgM[2]);setCfg(cfgM.slice(5));booms.length=0;
  const seed=seedFor(rn);
  genWorld(seed);makePlane(seed);sched=buildSchedule(seed);zone={};applyZone(mt);
  bullets=[];parts=[];feed=[];ents=[];remotes.clear();takenSet.clear();mpTaken=[];needLootFilter=false;resetSess();
  player=mkEnt(CX,CY,false,myName,P.skin);player.sub=isSub()?1:0;player.ml=P.melee;player.bp=P.pack;player.cp=P.chute;player.st=0;giveStart(player);ents.push(player);
  cam.x=CX;cam.y=CY;aliveCount=1;lastP={};lastZoneKey='';lastMp='';myDrop=null;killedBy='';myPlace=0;zoomMul=.72;
  state='play';$('lobby').hidden=true;$('end').hidden=true;$('hub').hidden=true;showHud(true);
  $('mpbar').hidden=false;$('pchip').hidden=false;lastFeed='\u0000';lastGun='';
  banner('Press Space to drop whenever you like. Hold Space to fall faster.',6);
  dropT=null;dropPressed=false;kbSeen=false;setTimeout(focusGame,50);
  pub(true);
}
function exitMatch(toLobby){
  playing=false;roundSeen=-1;remotes.clear();takenSet.clear();lastP={};
  if(toLobby){
    state='lobby';player=null;ents=[];setupPreview();showHud(false);
    $('end').hidden=true;$('lobby').hidden=false;$('mpbar').hidden=true;$('pchip').hidden=true;lobT=0;
  }
}
function showMpEnd(){
  endShown=true;
  const alive=player.alive,won=alive&&aliveCount<=1&&ro.length>=2;
  const place=alive?Math.max(1,aliveCount):myPlace;
  const rw=recordMatch({place,total:ro.length,kills:player.kills,win:won,time:mt,mode:'Live',map:cfgM[0]});
  fillEnd(won?'Last one standing':alive?'Round over':'Eliminated',won?'You won the round.':winName?winName+' won the round.':'The round has ended.',place,player.kills,mt,rw);
  $('again').hidden=true;$('end').hidden=false;
}

/* ---------- lobby ---------- */
function adoptHost(pr,hard){
  ph=clamp(Math.floor(num(pr.ph,0)),0,3);cd=num(pr.cd,0);rn=Math.floor(num(pr.rn,0));
  ro=Array.isArray(pr.ro)?pr.ro.filter(x=>typeof x==='string').slice(0,MAXSLOTS):[];
  if(Array.isArray(pr.cf)&&pr.cf.length>=5){cfgM=pr.cf.slice(0,10).map(x=>num(x,1));while(cfgM.length<10)cfgM.push(cfgM.length===8?0:1)}
  winName=typeof pr.wn==='string'?pr.wn.slice(0,12):'';
  ei=num(pr.ei,0);
  const hm=num(pr.mt,mt);
  if(hard)mt=hm;
  else{const d=hm+.05-mt;if(Math.abs(d)>1.2)mt=hm+.05;else mt+=d*.08}
}
function startMatch(lob){
  const sorted=lob.slice().sort((a,b)=>num(a.presence.jt,0)-num(b.presence.jt,0)||(a.peer<b.peer?-1:1));
  ro=sorted.slice(0,MAXSLOTS).map(p=>p.peer);
  rn=rn+1;mt=0;ph=2;ei=0;winName='';
}
function netTick(dt){
  if(!room)return;
  const ps=room.peers();
  const me=ps.find(p=>p.sameTab);if(me)myPeer=me.peer;
  const lob=ps.filter(p=>p.presence&&p.presence.on===1&&p.presence.v===2);
  const hostP=lob.filter(p=>p.presence.ok===1).sort((a,b)=>a.peer<b.peer?-1:1)[0];
  if(!myOk){
    if(hostP&&!hostP.sameTab)adoptHost(hostP.presence,true);
    myOk=true;
  }
  amHost=!hostP||hostP.sameTab;
  if(amHost){
    if(ph<2)cfgM=myCfg();
    const n=Math.min(MAXSLOTS,lob.length);
    if(ph===0){if(n>=cfgM[3]){ph=1;cd=cfgM[4]}}
    else if(ph===1){
      if(n<cfgM[3]){ph=0;cd=0}
      else{cd-=dt;if(n>=MAXSLOTS&&cd>5)cd=5;if(cd<=0)startMatch(lob)}
    }else if(ph===2){
      mt+=dt;
      let alive=0,aliveName='';
      for(const p of ps){
        if(ro.indexOf(p.peer)<0)continue;
        if(p.sameTab){if(playing&&player&&player.alive){alive++;aliveName=myName}}
        else if(p.presence&&p.presence.mr===rn&&p.presence.al===1){alive++;aliveName=cleanName(p.presence.n)}
      }
      if((ro.length>=2&&mt>8&&alive<=1)||mt>roundLen(cfgM)){ph=3;ei=0;winName=alive===1?aliveName:''}
    }else{ei+=dt;if(ei>=10){ph=0;ei=0;winName='';cd=0}}
  }else{
    adoptHost(hostP.presence,false);
    if(ph>=2)mt+=dt;
  }
  if(amHost&&ph===3)mt+=dt;
  if(ph===3&&prevPh!==3&&playing)banner(winText(),6);
  prevPh=ph;
  const inRo=ro.indexOf(myPeer)>=0&&myPeer!=='';
  if(playing&&(ph<2||rn!==roundSeen||!inRo))exitMatch(ph<2||!inRo||rn!==roundSeen);
  if(!playing&&ph===2&&inRo&&roundSeen!==rn&&mt<PLANE_T+40)enterMatch();
  if(playing&&ph===3&&!endShown&&player)showMpEnd();
  if(playing&&endShown){$('endNote').textContent='Back to the lobby in '+Math.max(0,Math.ceil(10-ei))+'s'}
  if(!playing){lobT-=dt;if(lobT<=0){lobT=.25;updLobbyUI(lob)}}
  pub(false);
}
function updLobbyUI(lob){
  const sorted=lob.slice().sort((a,b)=>num(a.presence.jt,0)-num(b.presence.jt,0)||(a.peer<b.peer?-1:1));
  const slots=$('slots').children,hostPeer=lob.filter(p=>p.presence.ok===1).sort((a,b)=>a.peer<b.peer?-1:1)[0];
  for(let i=0;i<MAXSLOTS;i++){
    const p=sorted[i],s=slots[i];if(!s)continue;
    const nm=s.querySelector('.sname'),cv2=s.querySelector('canvas');
    if(!p){s.className='slot open';nm.textContent='Open slot';if(s.dataset.k!==''){s.dataset.k='';const c=cv2.getContext('2d');if(c){c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,cv2.width,cv2.height)}}continue}
    const pr=p.presence,sk=clamp(Math.floor(num(pr.sk,0)),0,99);
    s.className='slot'+(p.sameTab?' me':'')+(hostPeer&&hostPeer.peer===p.peer?' host':'');
    nm.textContent=cleanName(pr.n)+(p.sameTab?' (you)':'');
    if(s.dataset.k!==String(sk)){s.dataset.k=String(sk);paintSkin(cv2,SKINS[sk],64,true)}
  }
  const wait=Math.max(0,lob.length-MAXSLOTS);
  const ms=['Small','Medium','Large'][clamp(cfgM[0]|0,0,2)],ss=['Slow','Normal','Fast'][clamp(cfgM[1]|0,0,2)],ls=['Sparse','Normal','Plentiful'][clamp(cfgM[2]|0,0,2)];
  $('lobbyInfo').textContent=ms+' map · '+ss+' storm · '+ls+' loot · starts with '+cfgM[3]+'+ players'+(wait?' · '+wait+' in queue':'');
  const n=Math.min(MAXSLOTS,lob.length);
  let big='',small='';
  if(ph>=2){big='Match in progress';small='You will join the next one automatically.'}
  else if(ph===1){big='Starting in '+Math.max(0,Math.ceil(cd));small=n>=MAXSLOTS?'Lobby is full.':'More players can still join.'}
  else{big='Waiting for players';small=n+' of '+cfgM[3]+' needed to start the countdown.'}
  $('cdown').textContent=big;$('cdnote').textContent=small;
}
function mpHud(){
  $('pcount').textContent=1+remotes.size;
  let m='';
  if(ph===3)m=winText();
  else if(!player.alive)m='Eliminated, #'+myPlace+'. Spectating.';
  if(m!==lastMp){lastMp=m;$('mpmsg').textContent=m;$('mpmsg').hidden=!m}
}

/* ---------- entering and leaving ---------- */
function onlineStatus(){
  if(roomState==='wait')return{ok:false,text:'Connecting to the live room…'};
  if(!room)return{ok:false,text:'Live play needs this page opened in claude.ai by someone it has been shared with.'};
  const ps=room.peers(),inL=ps.filter(p=>p.presence&&p.presence.on===1).length;
  return{ok:true,text:ps.length+' here now'+(inL?' · '+inL+' in the lobby':'')};
}
function startOnline(){
  if(!room)return;
  initAudio();
  myName=cleanName(P.name);
  joinTime=Date.now();myOk=false;ph=0;cd=0;rn=0;mt=0;ro=[];winName='';ei=0;prevPh=0;playing=false;roundSeen=-1;lastP={};
  mp=true;paused=false;setupPreview();state='lobby';
  $('hub').hidden=true;$('end').hidden=true;$('lobby').hidden=false;showHud(false);lobT=0;
  pub(true);
}
function leaveOnline(silent){
  mp=false;playing=false;remotes.clear();takenSet.clear();lastP={};myOk=false;
  if(room){try{room.presence({on:0,ok:0,mr:0}).catch(()=>{})}catch(e){}}
  $('mpbar').hidden=true;$('pchip').hidden=true;
  if(!silent)goHome();
}
$('lobbyLeave').addEventListener('click',()=>leaveOnline(false));
$('leave').addEventListener('click',()=>leaveOnline(false));
(function buildSlots(){
  const box=$('slots');
  for(let i=0;i<MAXSLOTS;i++){
    const d=document.createElement('div');d.className='slot open';d.dataset.k='';
    const c=document.createElement('canvas');c.width=64;c.height=64;
    const n=document.createElement('div');n.className='sname';n.textContent='Open slot';
    d.appendChild(c);d.appendChild(n);box.appendChild(d);
  }
})();
(async function(){
  let r=null;
  try{r=window.claude&&window.claude.use?await window.claude.use('room'):null}catch(e){r=null}
  room=r;roomState=r?'ok':'none';
  if(room){try{room.presence({v:2,on:0}).catch(()=>{})}catch(e){}}
})();
