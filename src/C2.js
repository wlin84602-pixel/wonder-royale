/* ---------- movement and AI ---------- */
const planeClock=()=>mp?mt:time;
let biomeT=0,lastBiome=-1,wantJump=false,zoomMul=1,dropT=null,dropPressed=false;
const DROP_T=10,DROP_FAST=5,DROP_TAP=.4;
const curZoom=()=>zoom*zoomMul*(admOn('wide')?.62:1);
function moveEnt(e,mx,my,spd,dt){
  const l=Math.hypot(mx,my);if(l>1){mx/=l;my/=l}
  const k=Math.min(1,dt*12);
  e.vx=lerp(e.vx,mx*spd,k);e.vy=lerp(e.vy,my*spd,k);
  e.x+=e.vx*dt;e.y+=e.vy*dt;resolve(e);
}
const healCount=e=>e.inv.reduce((a,it)=>a+(it&&it.type==='heal'?it.n:0),0);
function bwant(e,l){
  if(l.type==='gun'){
    const same=e.inv.find(it=>it&&it.type==='gun'&&it.w===l.w&&it.rar===l.rar);
    if(same)return same.ammo<gunMax(same)*.6;
    return e.inv.indexOf(null)>=0&&e.inv.filter(it=>it&&it.type==='gun').length<4;
  }
  if(l.type==='heal'){
    if(healCount(e)>=7)return false;
    return e.inv.indexOf(null)>=0||e.inv.some(it=>it&&it.type==='heal'&&it.id===l.kind&&it.n<HEALS[it.id].max);
  }
  return e.inv.some(it=>it&&it.type==='gun'&&CLSAMMO[WEAP[it.w].cls]===l.kind&&it.ammo<it.s.mag*3);
}
function botPick(e,d){
  let best=-1,bs=-1;
  e.inv.forEach((it,i)=>{
    if(!it||it.type!=='gun'||it.ammo<=0)return;
    const g=it.s;let s=g.dmg*g.pellets*(g.pellets>1?.55:1)/Math.max(.08,g.rate)*.1+it.rar*3;
    if(g.boom){s=g.boom.d/g.rate*.1+it.rar*3;if(d<190)s-=100}
    if(g.cls==='shotgun'&&d>420)s*=.3;
    if(g.cls==='sniper'&&d<250)s*=.4;
    if(s>bs){bs=s;best=i}
  });
  return best;
}
const goalOk=(e)=>e.goal&&(e.goal.crate?crates.indexOf(e.goal.ref)>=0:loot.includes(e.goal));
function botAI(e,dt){
  if(e.st===0){
    const t=Math.min(time,PLANE_T),pp=planePos(t);e.x=pp.x;e.y=pp.y;
    if(Math.hypot(pp.x-e.land.x,pp.y-e.land.y)<e.dropAt||time>PLANE_T-2.5)jumpOut(e,time);
    return;
  }
  if(e.st<3){const dx=e.land.x-e.x,dy=e.land.y-e.y,d=Math.hypot(dx,dy)||1;airStep(e,dt,dx/d,dy/d);return}
  for(const d of doors)if(!d.open&&Math.abs(d.cx-e.x)<d.w/2+60&&Math.abs(d.cy-e.y)<d.h/2+60)toggleDoor(d,false,e);
  e.think-=dt;
  if(e.think<=0){
    e.think=rand(.22,.4);
    const armed=e.inv.some(it=>it&&it.type==='gun'&&it.ammo>0);
    if(e.tgt&&(!armed||!e.tgt.alive||e.tgt.st!==3||dist2(e,e.tgt)>780*780||!los(e,e.tgt)))e.tgt=null;
    if(!e.tgt&&armed){
      let best=620*620,bt=null;
      for(const o of ents){if(o===e||!o.alive||o.st!==3)continue;const d2=dist2(e,o);if(d2<best&&los(e,o)){best=d2;bt=o}}
      if(bt){e.tgt=bt;e.react=rand(.25,.55)}
    }
    if(e.tgt){
      e.use=null;
      const bi=botPick(e,Math.hypot(e.tgt.x-e.x,e.tgt.y-e.y));
      if(bi>=0)e.sel=bi;
    }else{
      const needH=e.hp<60||e.sh<30;
      if(needH&&!e.use){
        const hi=e.inv.findIndex(it=>it&&it.type==='heal'&&HEALS[it.id].need(e)&&(e.hp<60?(it.id===2||it.id===3):true));
        if(hi>=0)e.sel=hi;
      }else if(!e.use){
        const h=held(e);
        if(!h||h.type!=='gun'){const bi=botPick(e,500);if(bi>=0)e.sel=bi}
      }
      if(!goalOk(e))e.goal=null;
      if(!e.goal){
        let best=700*700,bl=null;
        for(const l of loot){const d2=dist2(e,l);if(d2>=best)continue;if(bwant(e,l)){best=d2;bl=l}}
        if(!bl){let bc=680*680;for(const c of crates){const d2=dist2(e,c);if(d2<bc){bc=d2;bl={x:c.x,y:c.y,crate:true,ref:c}}}}
        e.goal=bl;
      }
    }
  }
  const zd=Math.hypot(e.x-zone.cx,e.y-zone.cy),seek=zd>zone.r-130;
  let mx=0,my=0,spd=185;
  if(e.tgt){
    const t=e.tgt,dx=t.x-e.x,dy=t.y-e.y,d=Math.hypot(dx,dy)||1,want=Math.atan2(dy,dx),it=heldGun(e),g=it?it.s:{rng:300,boom:null};
    e.ang=turn(e.ang,want,dt*8);
    const pref=g.rng*.5;
    e.st2-=dt;if(e.st2<=0){e.st2=rand(.7,1.7);e.strafe=Math.random()<.5?1:-1}
    const nx=dx/d,ny=dy/d,f=d>pref+70?1:d<pref-90?-1:0;
    mx=nx*f-ny*e.strafe*.85;my=ny*f+nx*e.strafe*.85;
    e.react-=dt;
    if(it&&e.react<=0&&Math.abs(angDiff(e.ang,want))<.14&&d<g.rng*.92&&!(g.boom&&d<170))shoot(e);
    if(zd>zone.r+10){const cdx=zone.cx-e.x,cdy=zone.cy-e.y,cd=Math.hypot(cdx,cdy)||1;mx=cdx/cd;my=cdy/cd;spd=215}
  }else{
    let tx,ty,stand=false;
    if(seek){tx=zone.cx+Math.cos(e.off)*e.offd;ty=zone.cy+Math.sin(e.off)*e.offd;spd=215}
    else if(e.use){stand=true;tx=e.x;ty=e.y}
    else if(e.goal){
      tx=e.goal.x;ty=e.goal.y;
      const hg=houseAt(tx,ty);
      if(hg&&hg.doors.length&&houseAt(e.x,e.y)!==hg){
        let bd=1e18,dd=hg.doors[0];for(const d of hg.doors){const q=(d.x-e.x)*(d.x-e.x)+(d.y-e.y)*(d.y-e.y);if(q<bd){bd=q;dd=d}}
        if(Math.hypot(dd.x-e.x,dd.y-e.y)>140&&Math.hypot(dd.ox-e.x,dd.oy-e.y)>40){tx=dd.ox;ty=dd.oy}else{tx=dd.x;ty=dd.y}
      }
      if(e.goal.crate&&Math.hypot(e.goal.x-e.x,e.goal.y-e.y)<e.goal.ref.r+52){
        stand=true;const a=Math.atan2(e.goal.y-e.y,e.goal.x-e.x);e.ang=turn(e.ang,a,dt*10);
        if(e.mcd<=0&&Math.abs(angDiff(e.ang,a))<.3){e.sel=e.sel;doMelee(e)}
      }
    }else{
      if(Math.hypot(e.wx-e.x,e.wy-e.y)<40||e.stk>1){
        const a=rand(0,TAU),d=rand(150,420);let nx=e.x+Math.cos(a)*d,ny=e.y+Math.sin(a)*d;
        if(Math.hypot(nx-zone.cx,ny-zone.cy)>zone.r-160){nx=zone.cx+Math.cos(a)*rand(0,zone.r*.5);ny=zone.cy+Math.sin(a)*rand(0,zone.r*.5)}
        e.wx=nx;e.wy=ny;e.stk=0;
      }
      tx=e.wx;ty=e.wy;spd=140;
    }
    const h=held(e);
    if(h&&h.type==='heal')shoot(e);
    const dx=tx-e.x,dy=ty-e.y,d=Math.hypot(dx,dy)||1;
    if(stand){mx=0;my=0}else{
      mx=dx/d;my=dy/d;
      if(d>6)e.ang=turn(e.ang,Math.atan2(dy,dx),dt*6);
    }
  }
  if(e.stk>0){const px=-my,py=mx;mx+=px*e.strafe*1.2;my+=py*e.strafe*1.2}
  e.stkT+=dt;
  if(e.stkT>.6){
    const moved=Math.hypot(e.x-e.lx,e.y-e.ly);
    if((mx||my)&&moved<18){e.stk++;e.strafe*=-1;if(!e.tgt)e.goal=null}else e.stk=0;
    e.lx=e.x;e.ly=e.y;e.stkT=0;
  }
  const g2=heldGun(e);
  moveEnt(e,mx,my,spd*(e.use?.5:1)*(g2?g2.s.slow:1),dt);
  tryPickup(e,false);
}

/* ---------- input ---------- */
const down={},mouse={x:0,y:0};let melBtn=false,capFn=null,capEnd=0,inTest=null,menuOpen=false;
const isTouch=!!(window.matchMedia&&window.matchMedia('(pointer:coarse)').matches);
const mkStick=()=>({on:false,id:null,ox:0,oy:0,cx:0,cy:0,x:0,y:0});
const stick={m:mkStick(),a:mkStick()};
const inAir=()=>state==='play'&&player&&player.alive&&player.st<3;
/* configurable controls: every action has up to 2 bindings, each 'K:<KeyboardEvent.code>', 'M:<0-7>' (mouse button) or 'W:up' / 'W:down' (wheel) */
const bindsOf=a=>(P&&P.binds&&P.binds[a])||[];
const latch={};
const isDown=a=>latch[a]||bindsOf(a).some(k=>down[k]);
const actionsOf=code=>{const r=[];if(P&&P.binds)for(const a in P.binds)if(P.binds[a].indexOf(code)>=0)r.push(a);return r};
function bindLabel(code){
  if(!code)return '—';
  const t=code[0],v=code.slice(2);
  if(t==='M')return ['Left click','Middle click','Right click','Mouse back','Mouse forward'][+v]||'Mouse '+(+v+1);
  if(t==='W')return v==='up'?'Wheel up':'Wheel down';
  const m={ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',Space:'Space',Escape:'Esc',ShiftLeft:'Left Shift',ShiftRight:'Right Shift',ControlLeft:'Left Ctrl',ControlRight:'Right Ctrl',AltLeft:'Left Alt',AltRight:'Right Alt',Backquote:'`',Minus:'-',Equal:'=',BracketLeft:'[',BracketRight:']',Semicolon:';',Quote:"'",Comma:',',Period:'.',Slash:'/',Backslash:'\\',Enter:'Enter',Tab:'Tab',CapsLock:'Caps Lock',Backspace:'Backspace'};
  if(m[v])return m[v];
  if(/^Key[A-Z]$/.test(v))return v.slice(3);
  if(/^Digit\d$/.test(v))return v.slice(5);
  if(/^Numpad/.test(v))return 'Num '+v.slice(6);
  return v;
}
const actLabel=a=>{const b=bindsOf(a).filter(Boolean);return b.length?b.map(bindLabel).join(' / '):'unbound'};
function doPause(){toggleMenu()}
function fireAction(a){
  if(state!=='play'||!player)return;
  if(a==='pause'){toggleMenu();return}
  if(a==='admin'){toggleAdmin();return}
  if(paused||menuOpen)return;
  if(a==='use'){if(inAir())return;if(NETMODE==='client'){if(player.alive)netAct('use');return}if(player.alive){
    /* a door you are touching comes first; otherwise pick up what is under you, otherwise open the nearest crate */
    const nd=nearestDoor(player,DOOR_REACH);let ld=1e9;for(const l of loot){const q=dist2(player,l);if(q<ld)ld=q}
    if(nd&&(ld>PICK_R*PICK_R||nd.q<=Math.sqrt(ld)*.5))toggleDoor(nd.d,true,player);
    else if(ld<=PICK_R*PICK_R)tryPickup(player,true);else openCrate()}return}
  let m=/^s([1-6])$/.exec(a);if(m){if(player.alive)selSlot(+m[1]-1);return}
  if(a==='reload'){if(player.alive)startReload(player);return}
  m=/^e([1-6])$/.exec(a);if(m){const n=+m[1]-1,bar=$('emobar');if(!bar.hidden){doEmote(n);bar.hidden=true}else if(n===0){fillEmoBar();bar.hidden=false}else doEmote(n);return}
  if(a==='alt'&&player.alive){const t=player.sel===1?2:1;if(player.inv[t])selSlot(t);else if(player.inv[3-t])selSlot(3-t);return}
  if(a==='next'&&player.alive)selSlot((player.sel+1)%NSLOT);
  if(a==='prev'&&player.alive)selSlot((player.sel+NSLOT-1)%NSLOT);
}
const ignoreTarget=t=>!!(t&&t.closest&&t.closest('button,input,select,textarea,a,#admin,#gmenu'));
function pressed(code){for(const a of actionsOf(code)){latch[a]=true;fireAction(a)}}
let kbSeen=false;
const codeOf=ev=>ev.code||(ev.key===' '?'Space':(ev.key&&ev.key.length===1?(/[a-z]/i.test(ev.key)?'Key'+ev.key.toUpperCase():/\d/.test(ev.key)?'Digit'+ev.key:ev.key):ev.key||''));
const focusGame=()=>{try{window.focus();if(document.activeElement&&document.activeElement!==cv&&/^(BUTTON|A)$/.test(document.activeElement.tagName))document.activeElement.blur();cv.focus({preventScroll:true})}catch(e){}};
cv.tabIndex=0;cv.style.outline='none';
window.addEventListener('keydown',ev=>{
  if(ev.target&&/^(INPUT|SELECT|TEXTAREA)$/.test(ev.target.tagName))return;
  const code='K:'+codeOf(ev);kbSeen=true;
  if(inTest&&!capFn)inTest(code);
  if(capFn){ev.preventDefault();if(!ev.repeat)capFn(code);return}
  down[code]=true;
  if(state==='play'&&!ev.ctrlKey&&!ev.metaKey&&!ev.altKey&&actionsOf(code).length)ev.preventDefault();
  if(state==='play'&&player&&!ev.repeat){if(codeOf(ev)==='Space'&&inAir()&&!menuOpen){dropPress();return}pressed(code)}
},true);
window.addEventListener('keyup',ev=>{down['K:'+codeOf(ev)]=false;if(state==='play'&&ev.target&&ev.target.tagName==='BUTTON'&&actionsOf('K:'+codeOf(ev)).length)ev.preventDefault()},true);
window.addEventListener('blur',()=>{for(const k in down)down[k]=false});
window.addEventListener('mousemove',ev=>{mouse.x=ev.clientX;mouse.y=ev.clientY;if(state==='play'&&ev.target===cv&&document.activeElement!==cv)focusGame()});
window.addEventListener('mousedown',ev=>{
  const code='M:'+ev.button;
  if(capFn){
    const inPanel=ev.target&&ev.target.closest&&ev.target.closest('.ctlpanel');
    if(ev.button===0&&!inPanel){capFn(null);return}
    ev.preventDefault();capEnd=performance.now();capFn(code);return;
  }
  if(inTest)inTest(code);
  if(airPick&&state==='play'&&!ignoreTarget(ev.target)){
    ev.preventDefault();airPick=false;cv.style.cursor='';
    $('banner').classList.remove('on');bannerT=0;
    if(ev.button===0){const z=curZoom();forceAirdrop(cam.x+(ev.clientX-W/2)/z,cam.y+(ev.clientY-H/2)/z)}else banner('Airdrop cancelled',1.5);
    return;
  }
  if((state!=='play'&&state!=='arena')||ignoreTarget(ev.target))return;
  if(player&&inAir()){if(ev.button!==0)ev.preventDefault();return}
  if(ev.button!==0)ev.preventDefault();else try{window.focus()}catch(e){}
  mouse.x=ev.clientX;mouse.y=ev.clientY;down[code]=true;
  if(state==='arena'&&code==='M:0')arenaPunch=true;
  if(player&&state==='play')pressed(code);
});
window.addEventListener('mouseup',ev=>{
  down['M:'+ev.button]=false;
  if(ev.button>=3&&(state==='play'||capFn))ev.preventDefault();
});
window.addEventListener('auxclick',ev=>{if(state==='play'||capFn)ev.preventDefault()});
window.addEventListener('contextmenu',ev=>{if(state==='play'||capFn)ev.preventDefault()});
window.addEventListener('wheel',ev=>{
  if(!ev.deltaY)return;
  const code=ev.deltaY>0?'W:down':'W:up';
  if(capFn){ev.preventDefault();capFn(code);return}
  if(inTest)inTest(code);
  if(state!=='play'||ignoreTarget(ev.target))return;
  if(actionsOf(code).length){
    down[code]=true;setTimeout(()=>{down[code]=false},130);
    if(player)pressed(code);
  }
},{passive:false});
cv.addEventListener('touchstart',ev=>{
  ev.preventDefault();
  for(const t of ev.changedTouches){
    const s=t.clientX<W/2?stick.m:stick.a;
    if(!s.on){s.on=true;s.id=t.identifier;s.ox=t.clientX;s.oy=t.clientY;s.cx=t.clientX;s.cy=t.clientY;s.x=0;s.y=0}
  }
},{passive:false});
cv.addEventListener('touchmove',ev=>{
  ev.preventDefault();
  for(const t of ev.changedTouches)for(const s of [stick.m,stick.a]){
    if(s.on&&s.id===t.identifier){
      let dx=t.clientX-s.ox,dy=t.clientY-s.oy;const d=Math.hypot(dx,dy),R=60;
      if(d>R){dx=dx/d*R;dy=dy/d*R}
      s.x=dx/R;s.y=dy/R;s.cx=s.ox+dx;s.cy=s.oy+dy;
    }
  }
},{passive:false});
function tend(ev){for(const t of ev.changedTouches)for(const s of [stick.m,stick.a])if(s.on&&s.id===t.identifier){s.on=false;s.x=0;s.y=0}}
cv.addEventListener('touchend',tend);cv.addEventListener('touchcancel',tend);
$('meleeBtn').addEventListener('pointerdown',ev=>{ev.preventDefault();melBtn=true});
window.addEventListener('pointerup',()=>{melBtn=false});
$('emoBtn').addEventListener('click',()=>{const bar=$('emobar');bar.hidden=!bar.hidden;if(!bar.hidden)fillEmoBar()});
function fillEmoBar(){
  const bar=$('emobar');bar.textContent='';
  for(let i=0;i<6;i++){
    const id=P.emotes[i],b=document.createElement('button');b.type='button';
    b.textContent=id>=0?EMOTES[id].g:'·';b.setAttribute('aria-label','Emote '+(i+1));const kl=document.createElement('i');kl.textContent='ZXCVBN'[i];b.appendChild(kl);
    b.addEventListener('click',()=>{doEmote(i);bar.hidden=true});bar.appendChild(b);
  }
}
function selSlot(i){
  const p=player;if(!p||!p.alive||p.st<3||i<0||i>=NSLOT)return;
  if(p.sel!==i){p.sel=i;p.use=null;sfx(480,.05,'square',.025,1.2);if(NETMODE==='client')netAct('sel',i)}
}
function openCrate(pl){
  const p=pl||player;let best=null,bd=1e9;
  for(const k of crates){const d=Math.hypot(k.x-p.x,k.y-p.y)-k.r-p.r;if(d<48&&d<bd){bd=d;best=k}}
  const nd=nearestDoor(p,DOOR_REACH);
  if(nd&&(!best||nd.q<bd+p.r)){toggleDoor(nd.d,true,p);return}
  if(best)hurtCrate(best,99999,true);
}
function doEmote(slot){
  const p=player;if(!p||!p.alive||p.ecd>0)return;
  let id=P.emotes[slot];
  if(slot===0&&(id===undefined||id<0||!owned2('emote',id)))id=P.emotes.find(x=>x>=0&&owned2('emote',x));
  if(id===undefined||id<0||!owned2('emote',id))return;
  p.emo={g:EMOTES[id].g,t:2.6};p.ecd=1.2;p.ec++;p.eg=id;
  if(NETMODE==='client')netAct('emote',id);
}
function dropPress(){
  const p=player;if(!p||!p.alive)return;
  if(p.st===0){wantJump=true;if(NETMODE==='client')netAct('jump')}
  else if(p.st===2){if(NETMODE==='client')netAct('boost');else p.boost=Math.min(2,(p.boost||0)+.5);sfx(520,.04,'square',.02,1.2)}
}
$('swap').addEventListener('click',()=>{if(state==='play'&&player&&player.alive){if(inAir())dropPress();else tryPickup(player,true)}});

function playerUpdate(dt){
  const p=player;
  let ix=(isDown('right')?1:0)-(isDown('left')?1:0),iy=(isDown('down')?1:0)-(isDown('up')?1:0);
  if(stick.m.on){ix=stick.m.x;iy=stick.m.y}
  let fire=isDown('fire');
  if(menuOpen){ix=0;iy=0;fire=false}
  const z=curZoom();
  if(stick.a.on){
    const m=Math.hypot(stick.a.x,stick.a.y);
    if(m>.12)p.ang=Math.atan2(stick.a.y,stick.a.x);
    fire=m>.35;
  }else if(!isTouch){
    p.ang=Math.atan2(mouse.y-(H/2+(p.y-cam.y)*z),mouse.x-(W/2+(p.x-cam.x)*z));
  }
  if(p.st===3&&p.alive&&admOn('aim')){
    let bt=null,bd=1500;
    for(const o of ents){if(o===p||!o.alive||o.st!==3)continue;const dd=Math.hypot(o.x-p.x,o.y-p.y);if(dd<bd&&los(p,o)){bd=dd;bt=o}}
    if(bt&&(fire||admOn('trig'))){p.ang=Math.atan2(bt.y-p.y,bt.x-p.x);if(admOn('trig'))fire=true}
  }
  if(NETMODE==='client'){NETIN.ix=ix;NETIN.iy=iy;NETIN.fire=!!fire;NETIN.mel=!!((isDown('melee')||melBtn)&&!menuOpen);NETIN.bo=!!down['K:Space']&&p.st===2;NETIN.ap=!!S.autoPick}
  if(p.st===0){
    const t=planeClock(),pp=planePos(Math.min(t,PLANE_T));
    p.x=pp.x;p.y=pp.y;
    if(NETMODE!=='client'&&((wantJump&&!menuOpen)||t>PLANE_T-2.5)){jumpOut(p,t)}
  }else if(p.st<3){
    dropT=null;dropPressed=false;
    if(wantJump&&p.st===2)p.cut=true;
    if(NETMODE!=='client')airStep(p,dt,ix,iy);
  }else{
    const pg=heldGun(p);
    moveEnt(p,ix,iy,265*(admOn('speed')?1.9:1)*(p.use?.55:1)*(pg?pg.s.slow:1),dt);
    {const hg=heldGun(p);
      if(hg!==p.lastHeld){p.lastHeld=hg;p.cd=0;p.bq=0;p.eqT=0;if(hg){p.eqT=EQUIP_T(hg.s);if(fire&&p.eqT>0)p.needClick=true}else p.eqT=0}
      if(p.needClick){if(!fire)p.needClick=false;else fire=false}}
    if(fire)shoot(p);
    if((isDown('melee')||melBtn)&&!menuOpen&&p.mcd<=0)doMelee(p);
    tryPickup(p,false);
  }
  wantJump=false;for(const k in latch)latch[k]=false;
}

/* ---------- frame update ---------- */
function update(dt){
  time+=dt;
  if(mp)mpMatchStep(dt);else updZone(dt);
  airdropStep();
  biomeT-=dt;if(biomeT<=0&&player&&player.alive&&player.st===3){biomeT=.5;const bb=biomeAt(player.x,player.y);if(bb!==lastBiome){if(lastBiome>=0)feed.push({t:3,txt:'📍 Entering the '+BIOMES[bb].n});lastBiome=bb}}
  if(player.alive)playerUpdate(dt);
  for(const e of ents){
    if(!e.alive)continue;
    if(e.bot)botAI(e,dt);
    reloadStep(e,dt);if(e.eqT>0)e.eqT-=dt;e.dryT=Math.max(0,(e.dryT||0)-dt);e.cd=Math.max(0,e.cd-dt);e.hit=Math.max(0,e.hit-dt);e.recoil=Math.max(0,e.recoil-dt*8);e.swing=Math.max(0,e.swing-dt);e.mcd=Math.max(0,e.mcd-dt);e.ecd=Math.max(0,e.ecd-dt);if(e.emo){e.emo.t-=dt;if(e.emo.t<=0)e.emo=null}
    burstStep(e,dt);updUse(e,dt);
    if(e.st===3&&(!mp||e===player)&&Math.hypot(e.x-zone.cx,e.y-zone.cy)>zone.r)stormHurt(e,dt);
  }
  updBullets(dt);updParts(dt);
  for(const l of loot)l.b+=dt*3;
  for(let i=feed.length-1;i>=0;i--){feed[i].t-=dt;if(feed[i].t<=0)feed.splice(i,1)}
  shake=Math.max(0,shake-dt*30);dmgFlash=Math.max(0,dmgFlash-dt);hitmark=Math.max(0,hitmark-dt);
  if(bannerT>0&&bannerT<900){bannerT-=dt;if(bannerT<=0)$('banner').classList.remove('on')}
  if(endT>0){endT-=dt;if(endT<=0)showEnd()}
  const f=camTarget(),k=Math.min(1,dt*7),zt=(player&&player.st<3&&player.alive)?.72:(player&&player.alive&&player.st===3&&heldGun(player)&&heldGun(player).s.view)||1;
  zoomMul+=(zt-zoomMul)*Math.min(1,dt*2.2);
  cam.x+=(f.x-cam.x)*k;cam.y+=(f.y-cam.y)*k;
}
function camTarget(){
  if(!mp||!player||player.alive)return player;
  let best=null,bd=1e18;
  for(const r of remotes.values()){if(!r.alive||r.st===0)continue;const d=dist2(r,player);if(d<bd){bd=d;best=r}}
  return best||player;
}

/* ---------- drawing ---------- */
function drawEnt(e){
  if(e.st===0)return;
  const sk=skinOf(e.skin),air=e.st<3;
  ctx.save();
  if(air){ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(e.x+e.z*34,e.y+e.z*56,e.r*(e.st===2?2.6:1),e.r*(e.st===2?2.6:1),0,0,TAU);ctx.fill()}
  else{ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(e.x+5,e.y+7,e.r,e.r*.88,0,0,TAU);ctx.fill()}
  ctx.translate(e.x,e.y);
  if(air){const sc=1+e.z*.5;ctx.scale(sc,sc)}
  if(e.sub&&!air){ctx.strokeStyle='rgba(255,209,102,.7)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,e.r+6,0,TAU);ctx.stroke()}
  if(e.st===2){
    /* the player hangs under the canopy, out of sight, and the parachute spins */
    ctx.rotate(e.ang);
    {const cs=chuteSkin(sk,e.cp|0);drawRopes(ctx,e.r*3.4,e.r,cs);drawChute(ctx,cs,e.r*3.4)}
    ctx.restore();return;
  }
  ctx.rotate(e.ang);
  if(!air&&!e.so)drawPack(ctx,e.bp,e.r);
  const hi=held(e),gi=hi&&hi.type==='gun'?hi:null,g=gi?gi.s:null,rc=e.recoil*4,s=e.r/22;
  if(!air){
    if(gi){
      ctx.save();ctx.translate(e.r*.5-rc,0);drawWeapon(ctx,gi.w,gi.rar,s*WSC);
      if(e.recoil>.55)drawFlash(ctx,g.len*s*WSC,gi.w===GOLDM4);
      ctx.restore();
    }else if(hi&&hi.type==='heal'){ctx.save();ctx.translate(e.r*1.0,e.r*.1);drawHeal(ctx,hi.id,s*.95);ctx.restore()}
  }
  drawChar(ctx,sk,e.r,{flash:e.hit>0});
  if(!air){
    ctx.fillStyle=e.hit>0?'#fff':sk.head;ctx.strokeStyle='rgba(0,0,0,.5)';ctx.lineWidth=2;
    if(gi){
      ctx.beginPath();ctx.arc(e.r*.78-rc,-e.r*.34,e.r*.2,0,TAU);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.arc(e.r*.78+g.len*.45*s-rc,e.r*.34,e.r*.2,0,TAU);ctx.fill();ctx.stroke();
    }else{
      /* fists: the left and the right hand take turns throwing the punch */
      const pu=e.swing>0&&e.ml===0,pk=pu?1-e.swing/.26:0,ext=pu?Math.sin(Math.min(1,pk)*Math.PI)*e.r*1.1:0,ps=(e.mc&1)?-1:1;
      for(const sd of[-1,1]){
        let hx=e.r*.88,hy=sd*e.r*.38,hr=e.r*.22;
        if(pu&&sd===ps){
          hx+=ext;hy-=sd*ext*.35;hr*=1+.3*ext/e.r;
          ctx.save();ctx.lineCap='round';ctx.strokeStyle='rgba(0,0,0,.45)';ctx.lineWidth=e.r*.34;ctx.beginPath();ctx.moveTo(e.r*.25,sd*e.r*.5);ctx.lineTo(hx,hy);ctx.stroke();
          ctx.strokeStyle=e.hit>0?'#fff':sk.head;ctx.lineWidth=e.r*.26;ctx.beginPath();ctx.moveTo(e.r*.25,sd*e.r*.5);ctx.lineTo(hx,hy);ctx.stroke();ctx.restore();
        }
        ctx.fillStyle=e.hit>0?'#fff':sk.head;ctx.strokeStyle='rgba(0,0,0,.5)';ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(hx,hy,hr,0,TAU);ctx.fill();ctx.stroke();
      }
    }
  }
  if(e.swing>0&&!air&&e.ml!==0){
    const k=1-e.swing/.26,a=lerp(-.9,.9,k);
    ctx.save();ctx.rotate(a-0);ctx.translate(e.r*.55,e.r*.3);
    drawMelee(ctx,e.ml,e.r/22);ctx.restore();
  }
  ctx.restore();
  if(e.use&&!air){
    const u=e.use,hh=e.inv[u.slot],col=hh&&hh.type==='heal'?HEALS[hh.id].col:'#fff';
    ctx.strokeStyle='rgba(0,0,0,.45)';ctx.lineWidth=7;ctx.beginPath();ctx.arc(e.x,e.y,e.r+14,0,TAU);ctx.stroke();
    ctx.strokeStyle=col;ctx.lineWidth=5;ctx.beginPath();ctx.arc(e.x,e.y,e.r+14,-Math.PI/2,-Math.PI/2+TAU*Math.min(1,u.t/u.T));ctx.stroke();
  }
  if(e.emo&&e.emo.t>0)drawEmoteBubble(ctx,e.x,e.y-e.r-(e.bot||e.remote?58:42),e.emo.g,e.emo.t);
  if(e.sh>0&&!air){ctx.strokeStyle='rgba(92,200,255,'+(.3+e.sh/200)+')';ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,e.r+5,0,TAU);ctx.stroke()}
  if((e.bot||e.remote)&&!air){
    ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(e.x-22,e.y-e.r-15,44,5);
    ctx.fillStyle=e.hp>50?COL.good:e.hp>25?COL.warn:COL.bad;ctx.fillRect(e.x-22,e.y-e.r-15,44*e.hp/100,5);
    if(S.names){ctx.font='700 12px "Chakra Petch",sans-serif';ctx.textAlign='center';ctx.fillStyle=e.sub?'#ffd166':'rgba(255,255,255,.88)';ctx.fillText(e.name,e.x,e.y-e.r-20)}
  }
}
const FLOORC=['#a98b5e','#9c8f6e','#7d8187','#5f666b','#b6a283','#8c7b68','#d9bd8c','#cdb07a','#a78560','#c9dbe4','#7a6a4c','#6b5e4a','#6e5144','#55525c','#b9a06a','#c8d3da'];
let doorT=performance.now();
function drawDoor(d,top){
  const now=performance.now();
  if(!top){
    /* each door animates on its own clock: a very quick 0.07 s swing, straight to the end */
    const dt=Math.min(.1,(now-(d.at||now))/1000);d.at=now;
    const tgt=d.open?1:0;
    if(d.anim<tgt)d.anim=Math.min(tgt,d.anim+dt/.07);else if(d.anim>tgt)d.anim=Math.max(tgt,d.anim-dt/.07);
  }
  const a=d.anim,hz=d.horiz,th=Math.min(hz?d.h:d.w,18),L=hz?d.w:d.h,mr=d.mir?-1:1;
  ctx.save();
  if(!top){ctx.fillStyle=FLOORC[d.hue]||'#a98b5e';ctx.fillRect(d.x,d.y,d.w,d.h)}
  /* the door is hinged at one end and swings 90 degrees into the building, so it never disappears */
  const inward=((d.side===0||d.side===3)?1:-1)*(d.dir||1);
  ctx.translate(hz?d.x+(d.mir?d.w:0):d.x+d.w/2,hz?d.y+d.h/2:d.y+(d.mir?d.h:0));
  ctx.rotate((hz?0:Math.PI/2)+a*Math.PI/2*(hz?inward:-inward)*mr);if(d.mir)ctx.scale(-1,1);
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(2,-th/2+3,L,th);
  /* wooden planks: warm base, long grain lines, board seams, knots, iron hinges and a brass handle */
  const g=ctx.createLinearGradient(0,-th/2,0,th/2);g.addColorStop(0,'#9a6a38');g.addColorStop(.5,'#7d4f26');g.addColorStop(1,'#62391a');
  ctx.fillStyle=g;ctx.fillRect(0,-th/2,L,th);
  ctx.save();ctx.beginPath();ctx.rect(0,-th/2,L,th);ctx.clip();
  const sd=(d.id||0)*7.13;
  ctx.lineWidth=1;
  for(let k=0;k<7;k++){
    const y=-th/2+(k+.5)*th/7,ph=Math.sin(sd+k*1.7)*2;
    ctx.strokeStyle=k%2?'rgba(50,25,8,.38)':'rgba(255,214,150,.22)';
    ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(L*.3,y+ph,L*.6,y-ph,L,y+ph*.5);ctx.stroke();
  }
  ctx.strokeStyle='rgba(30,14,4,.55)';ctx.lineWidth=1.5;
  for(let x=L/4;x<L-4;x+=L/4){ctx.beginPath();ctx.moveTo(x,-th/2);ctx.lineTo(x,th/2);ctx.stroke()}
  ctx.fillStyle='rgba(40,20,6,.45)';
  for(let k=0;k<2;k++){const kx=L*(.2+((Math.sin(sd*3+k*5)+1)/2)*.6),ky=Math.sin(sd+k*3)*th*.22;ctx.beginPath();ctx.ellipse(kx,ky,3.4,2,0,0,TAU);ctx.fill()}
  ctx.restore();
  ctx.fillStyle='#2e2a28';ctx.fillRect(2,-th/2+1,10,th-2);ctx.fillRect(L-30,-th/2+1,9,th-2);
  ctx.fillStyle='#55504c';ctx.fillRect(4,-th/2+3,6,2);ctx.fillRect(4,th/2-5,6,2);
  ctx.strokeStyle=top?'#ffd166':'rgba(0,0,0,.6)';ctx.lineWidth=top?3:2;ctx.strokeRect(0,-th/2,L,th);
  ctx.fillStyle='#e0b24a';ctx.beginPath();ctx.arc(L-12,0,4.5,0,TAU);ctx.fill();ctx.fillStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.arc(L-13.2,-1.2,1.6,0,TAU);ctx.fill();
  ctx.restore();
}
function drawTreeBody(c){
  const x=c.x,y=c.y,r=c.r,ci=(px,py,pr,f)=>{ctx.fillStyle=f;ctx.beginPath();ctx.arc(px,py,pr,0,TAU);ctx.fill()};
  switch(c.bm|0){
    case 1:/* cactus */
      ci(x,y,r*.62,'#3c7a40');ci(x-r*.1,y-r*.1,r*.42,'#56a050');
      for(const a of[0,1.57,3.14,4.71]){ci(x+Math.cos(a)*r*.78,y+Math.sin(a)*r*.78,r*.3,'#3c7a40');ci(x+Math.cos(a)*r*.78-1,y+Math.sin(a)*r*.78-1,r*.17,'#56a050')}
      ctx.fillStyle='#f4efd0';for(let i=0;i<6;i++){const a=i*1.047;ctx.fillRect(x+Math.cos(a)*r*.5,y+Math.sin(a)*r*.5,2,2)}
      break;
    case 2:/* snowy pine */
      ci(x,y,r,'#25503f');ci(x-r*.12,y-r*.12,r*.72,'#35705a');
      ctx.strokeStyle='#1d4234';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<8;i++){const a=i*.785;ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*r*.95,y+Math.sin(a)*r*.95)}ctx.stroke();
      ci(x-r*.1,y-r*.1,r*.42,'rgba(255,255,255,.92)');ci(x+r*.4,y+r*.25,r*.2,'rgba(255,255,255,.8)');
      break;
    case 3:/* swamp tree */
      ci(x,y,r,'#26402f');ci(x-r*.15,y-r*.15,r*.7,'#3a5f48');
      ci(x+r*.35,y+r*.3,r*.3,'#6b9a55');ci(x-r*.4,y+r*.1,r*.22,'#6b9a55');ci(x-r*.1,y-r*.35,r*.18,'#8bb867');
      ctx.strokeStyle='rgba(120,170,110,.6)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+r*.7,y+r*.1);ctx.lineTo(x+r*1.05,y+r*.4);ctx.moveTo(x-r*.6,y+r*.5);ctx.lineTo(x-r*.9,y+r*.85);ctx.stroke();
      break;
    case 4:/* dead tree */
      ctx.strokeStyle='#4e3224';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();
      for(let i=0;i<6;i++){const a=i*1.047+c.x*.01;ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*r*.95,y+Math.sin(a)*r*.95)}ctx.stroke();
      ctx.lineWidth=2.5;ctx.strokeStyle='#6a4630';ctx.beginPath();for(let i=0;i<6;i++){const a=i*1.047+c.x*.01+.5;ctx.moveTo(x+Math.cos(a-.5)*r*.5,y+Math.sin(a-.5)*r*.5);ctx.lineTo(x+Math.cos(a)*r*.8,y+Math.sin(a)*r*.8)}ctx.stroke();ctx.lineCap='butt';
      ci(x,y,r*.22,'#3a2418');
      break;
    default:
      ci(x,y,r,'#1f4a30');ci(x-r*.2,y-r*.2,r*.68,'#2b6a41');ci(x-r*.32,y-r*.32,r*.3,'#3a8a54');
  }
}
function drawFurn(b){
  const x=b.x,y=b.y,w=b.w,h=b.h;
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(x+4,y+5,w,h);
  ctx.fillStyle=b.col;rrect(ctx,x,y,w,h,5);ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.5)';ctx.lineWidth=2;ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=2;ctx.beginPath();
  if(b.furn==='shelf'||b.furn==='counter'){const n=b.furn==='shelf'?4:5;for(let i=1;i<n;i++){if(w>h){const xx=x+w*i/n;ctx.moveTo(xx,y+3);ctx.lineTo(xx,y+h-3)}else{const yy=y+h*i/n;ctx.moveTo(x+3,yy);ctx.lineTo(x+w-3,yy)}}}
  else if(b.furn==='bed'){ctx.fillStyle='rgba(255,255,255,.5)';ctx.fillRect(x+6,y+6,w-12,Math.min(h,w)*.28)}
  else if(b.furn==='couch'){ctx.moveTo(x+4,y+h*.35);ctx.lineTo(x+w-4,y+h*.35)}
  else if(b.furn==='crate'){ctx.moveTo(x+3,y+3);ctx.lineTo(x+w-3,y+h-3);ctx.moveTo(x+w-3,y+3);ctx.lineTo(x+3,y+h-3)}
  ctx.stroke();
}

const RUGC=['#a33a3a','#3a6aa3','#3f8a5a','#8a5aa3','#c79a3a','#3a8f94'],MATC=['#6b3a2a','#394a6b','#2f5a3a','#6b6b2a','#5a2f5a'];
function drawHouseFloorExtra(hs){
  ctx.save();ctx.beginPath();ctx.rect(hs.x,hs.y,hs.w,hs.h);ctx.clip();
  if(hs.fv===1){ctx.strokeStyle='rgba(30,25,20,.22)';ctx.lineWidth=2;ctx.beginPath();for(let x=hs.x+36;x<hs.x+hs.w;x+=36){ctx.moveTo(x,hs.y);ctx.lineTo(x,hs.y+hs.h)}ctx.stroke()}
  else if(hs.fv===2){ctx.fillStyle='rgba(0,0,0,.09)';for(let i=0;i*56<hs.w;i++)for(let j=0;j*56<hs.h;j++)if((i+j)%2===0)ctx.fillRect(hs.x+i*56,hs.y+j*56,56,56)}
  else if(hs.fv===3){ctx.strokeStyle='rgba(30,25,20,.3)';ctx.lineWidth=14;ctx.strokeRect(hs.x+46,hs.y+46,hs.w-92,hs.h-92);ctx.lineWidth=2;ctx.strokeRect(hs.x+30,hs.y+30,hs.w-60,hs.h-60)}
  const g=hs.rg;
  if(g&&hs.w>260){
    const rw=hs.w*g[2],rh=hs.h*g[3],rx=hs.x+hs.w*g[0],ry=hs.y+hs.h*g[1];
    ctx.globalAlpha=.55;ctx.fillStyle=RUGC[g[4]];ctx.fillRect(rx,ry,rw,rh);ctx.globalAlpha=.5;ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.strokeRect(rx+7,ry+7,rw-14,rh-14);ctx.globalAlpha=1;
  }
  ctx.restore();
  /* doormats and porch planters outside every door */
  for(const q of hs.doors){
    const d=q.d,out=d.side===0?[0,-1]:d.side===2?[0,1]:d.side===3?[-1,0]:[1,0];
    ctx.fillStyle=MATC[hs.mat];
    if(d.horiz)ctx.fillRect(d.x+6,d.side===0?d.y-24:d.y+d.h,d.w-12,24);else ctx.fillRect(d.side===3?d.x-24:d.x+d.w,d.y+6,24,d.h-12);
    ctx.fillStyle='rgba(255,255,255,.25)';
    if(d.horiz)ctx.fillRect(d.x+10,(d.side===0?d.y-24:d.y+d.h)+10,d.w-20,4);else ctx.fillRect((d.side===3?d.x-24:d.x+d.w)+10,d.y+10,4,d.h-20);
    if(hs.pl){
      for(const sg of[-1,1]){
        const px=d.cx+(d.horiz?sg*(d.w/2+22):0)+out[0]*20,py=d.cy+(d.horiz?0:sg*(d.h/2+22))+out[1]*20;
        ctx.fillStyle='#7a4e2d';ctx.beginPath();ctx.arc(px,py,10,0,TAU);ctx.fill();ctx.fillStyle=sg>0?'#3f9a4a':'#4fb35a';ctx.beginPath();ctx.arc(px,py,7,0,TAU);ctx.fill();
        ctx.fillStyle=['#ff6b8a','#ffd166','#fff'][(hs.mat+(sg>0?1:0))%3];ctx.beginPath();ctx.arc(px+2,py-2,2.5,0,TAU);ctx.fill();
      }
    }
  }
}
function drawRoofExtras(hs){
  if(!hs.rx||hs.w<250)return;
  for(const r of hs.rx){
    const x=hs.x+60+r[0]*(hs.w-170),y=hs.y+50+r[1]*(hs.h-130);
    ctx.save();ctx.translate(x,y);ctx.strokeStyle='rgba(0,0,0,.5)';ctx.lineWidth=3;
    if(r[2]===0){ctx.fillStyle='#9fd8ff';ctx.fillRect(0,0,56,40);ctx.strokeRect(0,0,56,40);ctx.beginPath();ctx.moveTo(28,0);ctx.lineTo(28,40);ctx.moveTo(0,20);ctx.lineTo(56,20);ctx.stroke();ctx.fillStyle='rgba(255,255,255,.4)';ctx.fillRect(4,4,20,10)}
    else if(r[2]===1){ctx.fillStyle='#8a929a';ctx.fillRect(0,0,44,44);ctx.strokeRect(0,0,44,44);ctx.fillStyle='#4a5058';ctx.beginPath();ctx.arc(22,22,15,0,TAU);ctx.fill();ctx.stroke();ctx.strokeStyle='#8a929a';ctx.lineWidth=3;for(let k=0;k<3;k++){ctx.beginPath();ctx.moveTo(22,22);ctx.lineTo(22+Math.cos(k*2.09+.4)*13,22+Math.sin(k*2.09+.4)*13);ctx.stroke()}}
    else if(r[2]===2){ctx.fillStyle='#1f3a6b';ctx.fillRect(0,0,76,48);ctx.strokeRect(0,0,76,48);ctx.strokeStyle='rgba(150,200,255,.7)';ctx.lineWidth=1.5;ctx.beginPath();for(let k=1;k<4;k++){ctx.moveTo(k*19,0);ctx.lineTo(k*19,48)}ctx.moveTo(0,24);ctx.lineTo(76,24);ctx.stroke()}
    else{ctx.fillStyle='#6b6f75';ctx.fillRect(0,0,26,26);ctx.strokeRect(0,0,26,26);ctx.fillStyle='#3a3d42';ctx.fillRect(5,5,16,16);ctx.fillStyle='#8a929a';ctx.fillRect(30,6,12,12);ctx.strokeRect(30,6,12,12)}
    ctx.restore();
  }
}
function drawRoofDetail(hs){
  const t=hs.type;ctx.save();
  if(t==='warehouse'){ctx.fillStyle='rgba(180,220,255,.28)';for(let i=0;i<3;i++)ctx.fillRect(hs.x+hs.w*(.18+i*.27),hs.y+hs.h*.4,hs.w*.14,hs.h*.2)}
  else if(t==='bunker'){ctx.strokeStyle='rgba(0,0,0,.45)';ctx.lineWidth=5;ctx.beginPath();ctx.arc(hs.x+hs.w/2,hs.y+hs.h/2,Math.min(hs.w,hs.h)*.22,0,TAU);ctx.stroke()}
  else if(t==='adobe'){ctx.strokeStyle='rgba(90,50,25,.5)';ctx.lineWidth=8;ctx.strokeRect(hs.x+10,hs.y+10,hs.w-20,hs.h-20);ctx.fillStyle='rgba(60,30,15,.45)';ctx.fillRect(hs.x+hs.w*.7,hs.y+hs.h*.2,34,34);ctx.fillStyle='rgba(255,230,190,.25)';ctx.beginPath();ctx.arc(hs.x+hs.w*.3,hs.y+hs.h*.6,26,0,TAU);ctx.fill()}
  else if(t==='lodge'){ctx.fillStyle='rgba(255,255,255,.8)';ctx.fillRect(hs.x-2,hs.y-2,hs.w+4,hs.h*.34);ctx.fillRect(hs.x+hs.w*.55,hs.y+hs.h*.5,hs.w*.4,hs.h*.2);ctx.fillStyle='rgba(60,40,30,.7)';ctx.fillRect(hs.x+hs.w*.12,hs.y+hs.h*.5,26,26)}
  else if(t==='fort'){ctx.fillStyle='rgba(30,15,10,.5)';for(let i=0;i<hs.w;i+=46)ctx.fillRect(hs.x+i,hs.y-4,26,12);for(let i=0;i<hs.w;i+=46)ctx.fillRect(hs.x+i,hs.y+hs.h-8,26,12);ctx.fillStyle='rgba(255,170,120,.2)';ctx.fillRect(hs.x+hs.w*.4,hs.y+hs.h*.4,hs.w*.2,hs.h*.2)}
  else if(t==='mine'){ctx.strokeStyle='rgba(20,20,26,.7)';ctx.lineWidth=7;ctx.beginPath();for(let x=hs.x+30;x<hs.x+hs.w;x+=60){ctx.moveTo(x,hs.y);ctx.lineTo(x,hs.y+hs.h)}ctx.stroke();ctx.fillStyle='rgba(255,200,80,.35)';ctx.fillRect(hs.x+hs.w*.5-12,hs.y+hs.h*.5-12,24,24)}
  else if(t==='barn'){ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=7;ctx.strokeRect(hs.x+hs.w*.3,hs.y+hs.h*.3,hs.w*.4,hs.h*.4);ctx.beginPath();ctx.moveTo(hs.x+hs.w*.3,hs.y+hs.h*.3);ctx.lineTo(hs.x+hs.w*.7,hs.y+hs.h*.7);ctx.moveTo(hs.x+hs.w*.7,hs.y+hs.h*.3);ctx.lineTo(hs.x+hs.w*.3,hs.y+hs.h*.7);ctx.stroke()}
  else if(t==='villa'){ctx.fillStyle='rgba(30,70,120,.5)';for(let i=0;i<3;i++)for(let j=0;j<2;j++)ctx.fillRect(hs.x+hs.w*.1+i*hs.w*.17,hs.y+hs.h*.14+j*hs.h*.16,hs.w*.14,hs.h*.12);ctx.fillStyle='rgba(90,200,240,.55)';ctx.fillRect(hs.x+hs.w*.58,hs.y+hs.h*.56,hs.w*.3,hs.h*.26)}
  else if(t==='tower'){ctx.strokeStyle='rgba(0,0,0,.3)';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(hs.x,hs.y);ctx.lineTo(hs.x+hs.w,hs.y+hs.h);ctx.moveTo(hs.x+hs.w,hs.y);ctx.lineTo(hs.x,hs.y+hs.h);ctx.stroke()}
  ctx.restore();
}
function drawDoorTip(){
  const p=player;if(!p||!p.alive||p.st!==3||state!=='play')return;
  const nd=nearestDoor(p,DOOR_REACH);if(!nd)return;
  const d=nd.d,z=curZoom(),t=(d.open?'Close':'Open')+' door ('+actLabel('use')+')';
  ctx.save();ctx.translate(d.cx,d.cy-(d.horiz?34:20));ctx.scale(1/z,1/z);
  ctx.font='700 13px "Chakra Petch",sans-serif';const w=ctx.measureText(t).width+18;
  ctx.fillStyle='rgba(8,20,22,.9)';ctx.strokeStyle='#ffd166';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-w/2,-24,w,26,7);ctx.fill();ctx.stroke();
  ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText(t,0,-6);ctx.restore();
}
function drawReload(){
  const p=player;if(!p||!p.alive||!(p.rl>0))return;
  const k=1-p.rl/RELOAD_T;
  ctx.save();ctx.translate(p.x,p.y-p.r-22);
  ctx.fillStyle='rgba(8,20,22,.8)';ctx.fillRect(-26,-4,52,8);ctx.fillStyle='#ffd166';ctx.fillRect(-25,-3,50*k,6);
  ctx.restore();
}
function drawLootTip(){
  const p=player;if(!p||!p.alive||p.st!==3||state!=='play')return;
  let best=null,bd=PICK_R*PICK_R;
  for(const l of loot){const d=dist2(p,l);if(d<bd){bd=d;best=l}}
  if(!best)return;
  const l=best;let t1,t2,col;
  if(l.type==='gun'){const s=statsOf(l.w,l.rar);t1=WEAP[l.w].name;col=wcol(l.w,l.rar);t2=wrn(l.w,l.rar)+' · '+(s.boom?'blast':s.dmg+(s.pellets>1?'x'+s.pellets:'')+' dmg')}
  else if(l.type==='heal'){t1=HEALS[l.kind].name;col=HEALS[l.kind].col;t2=HEALS[l.kind].desc}
  else{t1=AMMOC[l.kind].name;col=AMMOC[l.kind].col;t2='+'+l.amt}
  const t3=S.autoPick?'':'['+actLabel('use')+']';
  const z=curZoom();
  ctx.save();ctx.translate(l.x,l.y-34);ctx.scale(1/z,1/z);
  ctx.font='700 13px "Chakra Petch",sans-serif';
  const w=Math.max(ctx.measureText(t1).width,ctx.measureText(t2).width,t3?ctx.measureText(t3).width:0)+20,h=t3?58:42;
  ctx.fillStyle='rgba(8,20,22,.9)';ctx.strokeStyle=col;ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-w/2,-h,w,h,7);ctx.fill();ctx.stroke();
  ctx.textAlign='center';ctx.fillStyle=col;ctx.fillText(t1,0,-h+17);
  ctx.fillStyle='#e8f1ee';ctx.fillText(t2,0,-h+34);
  if(t3){ctx.fillStyle='rgba(255,255,255,.65)';ctx.fillText(t3,0,-h+51)}
  ctx.restore();
}
function drawLootItem(l){
  const bob=Math.sin(l.b)*2.5;
  let col;
  if(l.type==='gun')col=wcol(l.w,l.rar);else if(l.type==='heal')col=HEALS[l.kind].col;else col=AMMOC[l.kind].col;
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(l.x+3,l.y+16,24,9,0,0,TAU);ctx.fill();
  const hi=l.type==='gun'&&l.rar>=4,pu=Math.sin(l.b);
  /* soft glow in the rarity colour, then a solid tinted plate: no dark ring */
  const R=l.type==='gun'?(hi?64:56):34;
  const gr=ctx.createRadialGradient(l.x,l.y,4,l.x,l.y,R);gr.addColorStop(0,col);gr.addColorStop(1,'rgba(0,0,0,0)');
  ctx.globalAlpha=(hi?.62:.5)+.12*pu;ctx.fillStyle=gr;ctx.beginPath();ctx.arc(l.x,l.y,R,0,TAU);ctx.fill();ctx.globalAlpha=1;
  if(l.type==='gun'){
    const w=90,h=38,x=l.x-w/2,y=l.y+bob-h/2;
    ctx.fillStyle=col;ctx.globalAlpha=.38;ctx.beginPath();ctx.roundRect(x,y,w,h,14);ctx.fill();ctx.globalAlpha=1;
    ctx.strokeStyle=col;ctx.lineWidth=l.rar>=2?3.5:2.5;ctx.beginPath();ctx.roundRect(x,y,w,h,14);ctx.stroke();
    ctx.save();ctx.translate(l.x-42,l.y+bob-16);drawGunIcon(ctx,l.w,l.rar,84,32);ctx.restore();
  }else{
    ctx.fillStyle=col;ctx.globalAlpha=.34;ctx.beginPath();ctx.arc(l.x,l.y+bob,23,0,TAU);ctx.fill();ctx.globalAlpha=1;
    ctx.strokeStyle=col;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(l.x,l.y+bob,23,0,TAU);ctx.stroke();
    ctx.save();ctx.translate(l.x,l.y+bob);
    if(l.type==='heal'){drawHeal(ctx,l.kind,1.3);ctx.restore();if(l.amt>1){ctx.fillStyle='#fff';ctx.strokeStyle='rgba(0,0,0,.6)';ctx.lineWidth=3;ctx.font='700 12px "Chakra Petch",sans-serif';ctx.textAlign='left';ctx.strokeText('x'+l.amt,l.x+14,l.y+bob+24);ctx.fillText('x'+l.amt,l.x+14,l.y+bob+24)}}
    else{drawAmmoIcon(ctx,l.kind,1.3);ctx.restore()}
  }
}
function drawWorldPlane(){
  if(!plane)return;
  const t=planeClock();if(t>PLANE_T+1.5||t<0)return;
  const p=planePos(t);
  ctx.save();ctx.translate(p.x+60,p.y+90);ctx.rotate(plane.ang);drawPlane(ctx,250,true);ctx.restore();
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(plane.ang);drawPlane(ctx,250,false);ctx.restore();
}
let roofT=performance.now();
function draw(){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.fillStyle=COL.sea;ctx.fillRect(0,0,W,H);
  const z=curZoom(),sx=shake?rand(-shake,shake):0,sy=shake?rand(-shake,shake):0;
  ctx.translate(W/2+sx,H/2+sy);ctx.scale(z,z);ctx.translate(-cam.x,-cam.y);
  const vx0=cam.x-W/2/z-100,vx1=cam.x+W/2/z+100,vy0=cam.y-H/2/z-100,vy1=cam.y+H/2/z+100;
  const vis=o=>o.x>vx0&&o.x<vx1&&o.y>vy0&&o.y<vy1;
  ctx.fillStyle=COL.sand;ctx.beginPath();ctx.arc(CX,CY,ISLAND+70,0,TAU);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.2)';ctx.lineWidth=8;ctx.beginPath();ctx.arc(CX,CY,ISLAND+78,0,TAU);ctx.stroke();
  ctx.fillStyle=COL.grass;ctx.beginPath();ctx.arc(CX,CY,ISLAND-6,0,TAU);ctx.fill();
  ctx.save();ctx.beginPath();ctx.arc(CX,CY,ISLAND-6,0,TAU);ctx.clip();
  if(!biomeCv)buildBiomeCv();
  ctx.imageSmoothingEnabled=true;ctx.drawImage(biomeCv,biomeBox.x,biomeBox.y,biomeBox.s,biomeBox.s);
  ctx.strokeStyle='rgba(255,255,255,.06)';ctx.lineWidth=2;ctx.beginPath();
  const gs=200;
  for(let x=Math.floor(vx0/gs)*gs;x<vx1;x+=gs){ctx.moveTo(x,vy0);ctx.lineTo(x,vy1)}
  for(let y=Math.floor(vy0/gs)*gs;y<vy1;y+=gs){ctx.moveTo(vx0,y);ctx.lineTo(vx1,y)}
  ctx.stroke();
  for(const d of decor){if(vis(d)){ctx.fillStyle=d.c;ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,TAU);ctx.fill()}}
  ctx.restore();
  for(const hs of houses){
    if(hs.x>vx1||hs.x+hs.w<vx0||hs.y>vy1||hs.y+hs.h<vy0)continue;
    ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(hs.x+12,hs.y+14,hs.w,hs.h);
    ctx.fillStyle=FLOORC[hs.hue]||'#a98b5e';ctx.fillRect(hs.x,hs.y,hs.w,hs.h);
    drawFloorPattern(hs);
    if(hs.type==='farmhouse'||hs.type==='cabin'){ctx.fillStyle='rgba(120,50,50,.28)';ctx.fillRect(hs.x+hs.w*.3,hs.y+hs.h*.35,hs.w*.4,hs.h*.3)}
    drawHouseFloorExtra(hs);
    drawDoorYard(hs);
  }
  for(const b of blocks){
    if(b.x>vx1||b.x+b.w<vx0||b.y>vy1||b.y+b.h<vy0)continue;
    if(b.door){drawDoor(b);continue}
    if(b.furn){drawFurn(b);continue}
    if(b.win){drawWindowFace(b);continue}
    drawWallFace(b);
    ctx.strokeStyle='rgba(0,0,0,.5)';ctx.lineWidth=2;ctx.strokeRect(b.x,b.y,b.w,b.h);
  }
  for(const c of circs){if(c.k==='rock'&&!c.dead&&vis(c)){
    if(c.hit>0)c.hit=Math.max(0,c.hit-.016);
    const sx=c.hit>0?(Math.random()-.5)*3:0;
    ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.arc(c.x+5,c.y+7,c.r,0,TAU);ctx.fill();
    const rc=BIOMES[c.bm|0].rock;
    ctx.fillStyle=c.hit>0?'#ffffff':rc[0];ctx.beginPath();ctx.arc(c.x+sx,c.y,c.r,0,TAU);ctx.fill();
    ctx.fillStyle=c.hit>0?'#e8eeee':rc[1];ctx.beginPath();ctx.arc(c.x-c.r*.25+sx,c.y-c.r*.25,c.r*.55,0,TAU);ctx.fill();
    if(c.bm===4){ctx.strokeStyle='rgba(60,30,20,.35)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(c.x+sx,c.y,c.r*.78,0.4,2.6);ctx.stroke()}
    if(c.hp<c.max){const q=1-c.hp/c.max;ctx.strokeStyle='rgba(30,36,35,.7)';ctx.lineWidth=2;ctx.beginPath();
      ctx.moveTo(c.x-c.r*.5,c.y-c.r*.1);ctx.lineTo(c.x-c.r*.1,c.y+c.r*.1);ctx.lineTo(c.x+c.r*.2,c.y-c.r*.3);
      if(q>.35){ctx.moveTo(c.x+c.r*.1,c.y+c.r*.1);ctx.lineTo(c.x+c.r*.4,c.y+c.r*.5)}
      if(q>.65){ctx.moveTo(c.x-c.r*.3,c.y+c.r*.5);ctx.lineTo(c.x-c.r*.05,c.y+c.r*.2)}
      ctx.stroke()}
  }}
  const tt=performance.now()/1000;
  for(const k of crates){if(vis(k)){k.hit=Math.max(0,k.hit-.016);drawCrate(ctx,k,tt)}}
  drawAirs(ctx,tt);
  for(const l of loot){if(vis(l))drawLootItem(l)}
  if(S.aim&&player&&player.alive&&player.st===3){
    ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=2;ctx.setLineDash([10,10]);ctx.beginPath();ctx.moveTo(player.x,player.y);
    const pgn=heldGun(player),rg=pgn?pgn.s.rng:60;ctx.lineTo(player.x+Math.cos(player.ang)*rg,player.y+Math.sin(player.ang)*rg);ctx.stroke();ctx.setLineDash([]);
  }
  for(const e of ents){if(e.alive&&e!==player&&e.st===3&&vis(e))drawEnt(e)}
  if(player&&player.alive&&player.st===3)drawEnt(player);
  ctx.lineCap='round';
  for(const b of bullets){
    if(b.pj){drawProjectile(ctx,b);continue}
    if(b.k===GOLDM4){drawGoldBullet(ctx,b);continue}
    const big=b.dmg>=60,tl=big?.05:.03;
    ctx.strokeStyle=b.col;ctx.globalAlpha=.4;ctx.lineWidth=big?8:5;ctx.beginPath();ctx.moveTo(b.x-b.vx*tl,b.y-b.vy*tl);ctx.lineTo(b.x,b.y);ctx.stroke();
    ctx.globalAlpha=1;ctx.strokeStyle='#ffffff';ctx.lineWidth=big?3:2;ctx.beginPath();ctx.moveTo(b.x-b.vx*tl*.7,b.y-b.vy*tl*.7);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  ctx.globalAlpha=1;
  for(const bm of booms){const k=bm.t/.45;ctx.globalAlpha=.55*(1-k);ctx.fillStyle='#ffb02e';ctx.beginPath();ctx.arc(bm.x,bm.y,bm.r*(.35+.65*k),0,TAU);ctx.fill();ctx.globalAlpha=.9*(1-k);ctx.strokeStyle='#fff3c4';ctx.lineWidth=6*(1-k)+1;ctx.beginPath();ctx.arc(bm.x,bm.y,bm.r*(.3+.7*k),0,TAU);ctx.stroke()}
  ctx.globalAlpha=1;
  if(dnums.length){
    const nw=performance.now();ctx.textAlign='center';ctx.font='800 18px system-ui,sans-serif';ctx.lineWidth=4;ctx.strokeStyle='rgba(0,0,0,.7)';ctx.lineJoin='round';
    for(let i=dnums.length-1;i>=0;i--){const n=dnums[i],a=(nw-n.t)/700;if(a>=1){dnums.splice(i,1);continue}
      ctx.globalAlpha=1-a*a;const y=n.y-a*34;ctx.strokeText(n.v,n.x,y);ctx.fillStyle=n.col;ctx.fillText(n.v,n.x,y)}
    ctx.globalAlpha=1;ctx.textAlign='left';
  }
  for(const p of parts){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,TAU);ctx.fill()}
  {
    const nowT=performance.now(),rdt=Math.min(.1,(nowT-roofT)/1000);roofT=nowT;
    const fo=(state==='play'&&!paused||state==='play')?camTarget():null;
    for(const hs of houses){
      let inside=fo&&fo.x>hs.x&&fo.x<hs.x+hs.w&&fo.y>hs.y&&fo.y<hs.y+hs.h;
      /* standing by a door or a window of a building lets you see inside */
      if(!inside&&fo&&fo.x>hs.x-150&&fo.x<hs.x+hs.w+150&&fo.y>hs.y-150&&fo.y<hs.y+hs.h+150){
        inside=hs.doors.some(dr=>Math.hypot(dr.d.cx-fo.x,dr.d.cy-fo.y)<150)||wins.some(w=>w.x>hs.x-8&&w.x<hs.x+hs.w+8&&w.y>hs.y-8&&w.y<hs.y+hs.h+8&&Math.hypot(w.x+w.w/2-fo.x,w.y+w.h/2-fo.y)<130);
      }
      hs.ra+=((inside?0:1)-hs.ra)*Math.min(1,rdt*9);
      if(hs.ra<.02||hs.x>vx1||hs.x+hs.w<vx0||hs.y>vy1||hs.y+hs.h<vy0)continue;
      ctx.globalAlpha=hs.ra;
      drawRoofBody(hs);
      drawChimney(hs);
      drawRoofDetail(hs);drawRoofExtras(hs);
    }
    ctx.globalAlpha=1;
    for(const d of doors){if(d.x>vx1||d.x+d.w<vx0||d.y>vy1||d.y+d.h<vy0)continue;drawDoor(d,true)}
    drawDoorTip();
    ctx.globalAlpha=1;
  }
  ctx.globalAlpha=1;
  for(const c of circs){if(c.k==='tree'&&!c.dead&&vis(c)){
    if(c.hit>0)c.hit=Math.max(0,c.hit-.016);
    ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.arc(c.x+7,c.y+9,c.r,0,TAU);ctx.fill();
    drawTreeBody(c);
    if(c.hp<100){ctx.globalAlpha=(1-c.hp/100)*.55;ctx.fillStyle='#5d4126';ctx.beginPath();ctx.arc(c.x+c.r*.15,c.y+c.r*.2,c.r*.5,0,TAU);ctx.fill();ctx.globalAlpha=1}
    if(c.hit>0){ctx.globalAlpha=c.hit*3;ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(c.x,c.y,c.r*.95,0,TAU);ctx.stroke();ctx.globalAlpha=1}
  }}
  for(const e of ents){if(e.alive&&e!==player&&e.st>0&&e.st<3&&vis(e))drawEnt(e)}
  if(player&&player.alive&&player.st>0&&player.st<3)drawEnt(player);
  if(zone){
    ctx.fillStyle='rgba(143,116,255,.3)';ctx.beginPath();
    ctx.rect(cam.x-W*2,cam.y-H*2,W*4,H*4);ctx.arc(zone.cx,zone.cy,Math.max(1,zone.r),0,TAU);ctx.fill('evenodd');
    ctx.strokeStyle=COL.violet;ctx.lineWidth=5;ctx.beginPath();ctx.arc(zone.cx,zone.cy,Math.max(1,zone.r),0,TAU);ctx.stroke();
    if(zone.state!=='done'){ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=3;ctx.setLineDash([18,14]);ctx.beginPath();ctx.arc(zone.ncx,zone.ncy,zone.nr,0,TAU);ctx.stroke();ctx.setLineDash([])}
  }
  drawLootTip();drawReload();
  if(state==='play')drawWorldPlane();

  ctx.setTransform(DPR,0,0,DPR,0,0);
  if(player&&state==='play'){
    if(dmgFlash>0){const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.7);g.addColorStop(0,'rgba(255,60,60,0)');g.addColorStop(1,'rgba(255,60,60,'+Math.min(.6,dmgFlash*1.6)+')');ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
    if(player.alive&&player.hp<=30){const pu=.5+.5*Math.sin(performance.now()/260),g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.38,W/2,H/2,Math.max(W,H)*.75);g.addColorStop(0,'rgba(255,40,40,0)');g.addColorStop(1,'rgba(255,40,40,'+(.12+.2*pu)*(1-player.hp/45)+')');ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
    if(hitmark>0){ctx.strokeStyle='#fff';ctx.lineWidth=2.5;ctx.beginPath();const mxp=isTouch?W/2:mouse.x,myp=isTouch?H/2:mouse.y;ctx.moveTo(mxp-9,myp-9);ctx.lineTo(mxp-4,myp-4);ctx.moveTo(mxp+9,myp-9);ctx.lineTo(mxp+4,myp-4);ctx.moveTo(mxp-9,myp+9);ctx.lineTo(mxp-4,myp+4);ctx.moveTo(mxp+9,myp+9);ctx.lineTo(mxp+4,myp+4);ctx.stroke()}
  }
  for(const s of [stick.m,stick.a]){
    if(!s.on)continue;
    ctx.strokeStyle='rgba(255,255,255,.3)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(s.ox,s.oy,60,0,TAU);ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.3)';ctx.beginPath();ctx.arc(s.cx,s.cy,26,0,TAU);ctx.fill();
  }
  if(paused){ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(0,0,W,H)}
}
function drawMini(){
  const k=128/(ISLAND*2+200),X=x=>64+(x-CX)*k,Y=y=>64+(y-CY)*k;
  mctx.setTransform(1,0,0,1,0,0);mctx.clearRect(0,0,mm.width,mm.height);mctx.setTransform(DPR,0,0,DPR,0,0);
  mctx.fillStyle=COL.grass;mctx.beginPath();mctx.arc(64,64,ISLAND*k,0,TAU);mctx.fill();
  if(!biomeCv)buildBiomeCv();
  mctx.save();mctx.beginPath();mctx.arc(64,64,ISLAND*k,0,TAU);mctx.clip();mctx.drawImage(biomeCv,X(biomeBox.x),Y(biomeBox.y),biomeBox.s*k,biomeBox.s*k);mctx.restore();
  mctx.strokeStyle=COL.violet;mctx.lineWidth=2;mctx.beginPath();mctx.arc(X(zone.cx),Y(zone.cy),Math.max(1,zone.r*k),0,TAU);mctx.stroke();
  if(zone.state!=='done'){mctx.strokeStyle='#fff';mctx.lineWidth=1.5;mctx.beginPath();mctx.arc(X(zone.ncx),Y(zone.ncy),zone.nr*k,0,TAU);mctx.stroke()}
  if(plane){const t=planeClock();if(t>=0&&t<=PLANE_T){const p=planePos(t);mctx.fillStyle='#fff';mctx.beginPath();mctx.arc(X(p.x),Y(p.y),3,0,TAU);mctx.fill()}}
  for(const a of airs)if(a.told&&!a.landed){mctx.fillStyle='#ff5d8f';mctx.beginPath();mctx.arc(X(a.x),Y(a.y),3.4,0,TAU);mctx.fill()}
  for(const k of crates)if(k.gold){mctx.fillStyle=k.air?'#ff5d8f':'#ffd166';mctx.fillRect(X(k.x)-1.6,Y(k.y)-1.6,3.2,3.2)}
  if(admOn('esp'))for(const o of ents)if(o!==player&&o.alive){mctx.fillStyle='#ff4d4d';mctx.beginPath();mctx.arc(X(o.x),Y(o.y),2.6,0,TAU);mctx.fill()}
  if(player){
    const px=X(player.x),py=Y(player.y);
    mctx.fillStyle=player.alive?COL.coral:'#777';mctx.beginPath();mctx.arc(px,py,4,0,TAU);mctx.fill();
    mctx.strokeStyle='#fff';mctx.lineWidth=1.5;mctx.beginPath();mctx.moveTo(px,py);mctx.lineTo(px+Math.cos(player.ang)*9,py+Math.sin(player.ang)*9);mctx.stroke();
  }
}

/* ---------- HUD and solo flow ---------- */
const el={alive:$('alive'),kills:$('kills'),zone:$('zone'),hpb:$('hpb'),shb:$('shb'),hpt:$('hpt'),gun:$('gun'),ammo:$('ammo'),feed:$('feed'),swap:$('swap'),gi:$('gunicon'),tr:$('tr'),fps:$('fps')};
let lastFeed='',lastGun='',lastSwap='',fpsAcc=0,fpsN=0,fpsShow=0;
function hud(dt){
  {const db=$('dropbar');
    if(player.alive&&player.st===2){db.hidden=false;$('dropfill').style.width=Math.round(100*Math.max(0,player.z))+'%';$('droplabel').textContent='Altitude · hold or tap Space to fall faster (10s normal, 5s fast)'}
    else if(player.alive&&player.st===0){db.hidden=false;$('dropfill').style.width='100%';$('droplabel').textContent='Press Space whenever you want to drop'+(kbSeen||planeClock()<6?'':' (keys not responding? click the game once)')}
    else db.hidden=true}
  el.alive.textContent=aliveCount;el.kills.textContent=player.kills;
  let zt;
  if(player.st===0)zt='In the plane';
  else if(zone.state==='wait')zt='Storm in '+fmt(Math.max(0,Math.ceil(ZWn[zone.phase]-zone.t)));
  else if(zone.state==='shrink')zt='Storm closing '+Math.round((1-zone.t/ZSn[zone.phase])*100)+'%';
  else zt='Final circle';
  el.zone.textContent=zt;
  const hp=Math.max(0,Math.ceil(player.hp));
  el.hpb.style.width=hp+'%';el.shb.style.width=Math.round(player.sh)+'%';el.hpb.className=hp<=30?'low':hp<=60?'mid':'';
  el.hpt.textContent='Health '+hp+(player.sh>0?'  Shield '+Math.round(player.sh):'');
  const hi=held(player);
  let gname='Fists',gsub='',gcol='',gkey='fists';
  if(hi&&hi.type==='melee'){const mm=MELEES[player.ml]||MELEES[0];gname=mm.name;gsub=mm.dmg+' dmg';gcol=RCOL[mm.rarity]||'';gkey='m'+player.ml}
  else   if(hi&&hi.type==='gun'){gname=WEAP[hi.w].name;gsub=wrn(hi.w,hi.rar)+' · '+(player.rl>0?'Reloading…':hi.mg+' / '+reserveOf(player,hi))+' ['+actLabel('reload')+']';gcol=wcol(hi.w,hi.rar);gkey='g'+hi.w+'_'+hi.rar}
  else if(hi){gname=HEALS[hi.id].name+' x'+hi.n;gsub=HEALS[hi.id].desc;gcol=HEALS[hi.id].col;gkey='h'+hi.id}
  el.gun.textContent=gname;el.gun.style.color=gcol;el.ammo.textContent=gsub;
  if(lastGun!==gkey){lastGun=gkey;el.gun.classList.remove('pop');void el.gun.offsetWidth;el.gun.classList.add('pop');const c=el.gi.getContext('2d');if(c){c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,120,40);if(hi&&hi.type==='melee'){c.translate(40,20);drawMelee(c,player.ml,1.6)}else if(hi&&hi.type==='gun')drawGunIcon(c,hi.w,hi.rar,120,40);else if(hi){c.translate(60,22);drawHeal(c,hi.id,1.6)}}}
  updHotbar();
  const u=player.use;
  if(u&&player.inv[u.slot]){$('usebar').hidden=false;$('usefill').style.width=Math.round(100*Math.min(1,u.t/u.T))+'%';$('uselabel').textContent='Using '+HEALS[player.inv[u.slot].id].name}else $('usebar').hidden=true;
  const sw=player.st<3?'Jump':'Pick up';if(sw!==lastSwap){lastSwap=sw;el.swap.textContent=sw}
  el.tr.style.display=S.minimap?'':'none';
  if(S.fps){fpsAcc+=dt;fpsN++;if(fpsAcc>.5){fpsShow=Math.round(fpsN/fpsAcc);fpsAcc=0;fpsN=0}el.fps.hidden=false;el.fps.textContent=fpsShow+' fps'}else el.fps.hidden=true;
  if(mp)mpHud();
  const key=feed.map(f=>f.txt).join('|');
  if(key!==lastFeed){lastFeed=key;const pn=el.feed.childElementCount;el.feed.textContent='';feed.forEach((f,i)=>{const d=document.createElement('div');d.textContent=f.txt;if(i>=pn)d.className='new';el.feed.appendChild(d)})}
}
const hbEls=[];
/* drag a hotbar slot: onto another slot swaps them, up and out of the bar drops the item (slot 1 is the fixed melee slot) */
let drag=null;
function outOfBar(ev){const r=$('hotbar').getBoundingClientRect();return r.height>r.width?ev.clientX<r.left-50:ev.clientY<r.top-40}
function startDrag(ev,i){
  ev.preventDefault();selSlot(i);
  const p=player;if(!p||!p.alive||i===0||!p.inv[i]||menuOpen)return;
  drag={i,x:ev.clientX,y:ev.clientY,ghost:null};
}
window.addEventListener('pointermove',ev=>{
  if(!drag)return;
  if(!drag.ghost&&Math.hypot(ev.clientX-drag.x,ev.clientY-drag.y)>8){
    const g=document.createElement('div');g.className='dghost';
    const cc=document.createElement('canvas');cc.width=88;cc.height=52;try{cc.getContext('2d').drawImage(hbEls[drag.i].cv,0,0)}catch(e){}
    g.appendChild(cc);document.body.appendChild(g);drag.ghost=g;hbEls[drag.i].b.classList.add('drag');
  }
  if(drag.ghost){
    drag.ghost.style.left=ev.clientX+'px';drag.ghost.style.top=ev.clientY+'px';
    drag.ghost.classList.toggle('del',outOfBar(ev));
  }
});
function endDrag(ev){
  if(!drag)return;
  const d=drag;drag=null;
  if(d.ghost)d.ghost.remove();
  hbEls[d.i].b.classList.remove('drag');
  const p=player;
  if(!d.ghost||!ev||!p||!p.alive||menuOpen||state!=='play'||!p.inv[d.i])return;
  const el=document.elementFromPoint(ev.clientX,ev.clientY),sb=el&&el.closest?el.closest('.hslot'):null;
  const ti=hbEls.findIndex(h=>h.b===sb);
  if(NETMODE==='client'){
    if(ti>0&&ti!==d.i)netAct('swap',[d.i,ti]);
    else if(outOfBar(ev)&&p.inv[d.i]&&p.inv[d.i].type!=='melee')netAct('drop',d.i);
    return;
  }
  if(ti>0&&ti!==d.i){
    const t=p.inv[ti];p.inv[ti]=p.inv[d.i];p.inv[d.i]=t;
    if(p.sel===d.i)p.sel=ti;else if(p.sel===ti)p.sel=d.i;
    p.use=null;sfx(520,.05,'square',.025,1.2);
  }else if(outOfBar(ev)){
    const it=p.inv[d.i];
    if(it&&it.type!=='melee'){
      addLoot(p.x+Math.cos(p.ang)*50,p.y+Math.sin(p.ang)*50,dropDesc(it));
      loot[loot.length-1].nt=performance.now()+1800;
      p.inv[d.i]=null;if(p.use&&p.use.slot===d.i)p.use=null;
      sfx(300,.08,'square',.03,.7);
    }
  }
}
window.addEventListener('pointerup',endDrag);
window.addEventListener('pointercancel',()=>endDrag(null));
(function(){
  const bar=$('hotbar');
  for(let i=0;i<NSLOT;i++){
    const b=document.createElement('button');b.type='button';b.className='hslot';b.setAttribute('aria-label','Slot '+(i+1));
    const cv=document.createElement('canvas');cv.width=88;cv.height=52;
    const k=document.createElement('span');k.className='k';k.textContent=String(i+1);
    const n=document.createElement('span');n.className='c';
    b.appendChild(cv);b.appendChild(k);b.appendChild(n);
    b.addEventListener('pointerdown',ev=>startDrag(ev,i));
    bar.appendChild(b);hbEls.push({b,cv,n,key:'?'});
  }
})();
const abEls=[];
(function(){
  const bar=$('ammobar');if(!bar)return;
  for(const k of AMMOL){
    const b=document.createElement('button');b.type='button';b.className='achip';b.setAttribute('aria-label',AMMOC[k].name+': click to drop a stack');b.title=AMMOC[k].name+' (click to drop a stack for others)';
    const cv=document.createElement('canvas');cv.width=40;cv.height=24;
    const n=document.createElement('span');n.className='c';
    b.appendChild(cv);b.appendChild(n);
    b.addEventListener('click',ev=>{ev.preventDefault();if(player&&player.alive&&player.st===3&&!menuOpen)dropAmmo(player,k);b.blur()});
    bar.appendChild(b);abEls.push({b,cv,n,k,key:'?'});
  }
})();
function updAmmoBar(){
  const p=player;if(!p)return;
  const g=heldGun(p),gk=g?CLSAMMO[WEAP[g.w].cls]:'';
  for(const a of abEls){
    const v=p.pouch[a.k],key=v+'|'+(gk===a.k?1:0);
    if(key===a.key)continue;a.key=key;
    a.b.classList.toggle('use',gk===a.k);a.b.classList.toggle('empty',v<=0);
    a.n.textContent=String(v);
    const c=a.cv.getContext('2d');if(!c)continue;
    c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,40,24);c.translate(20,12);drawAmmoIcon(c,a.k,1.05);
  }
}
function updHotbar(){
  updAmmoBar();
  const p=player;
  for(let i=0;i<NSLOT;i++){
    const it=p.inv[i],h=hbEls[i],sel=i===p.sel;
    const key=(sel?'S':'-')+(it?(it.type==='melee'?'m'+p.ml:it.type==='gun'?'g'+it.w+'_'+it.rar+'_'+it.mg:'h'+it.id+'_'+it.n):'');
    if(key===h.key)continue;
    h.key=key;
    h.b.classList.toggle('sel',sel);
    h.b.style.borderColor=it?(it.type==='melee'?'#ffffff88':it.type==='gun'?wcol(it.w,it.rar):HEALS[it.id].col):'';
    h.n.textContent=it?(it.type==='melee'?'':it.type==='gun'?String(it.mg):'x'+it.n):'';
    const c=h.cv.getContext('2d');if(!c)continue;
    c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,88,52);
    if(it&&it.type==='melee'){c.translate(30,26);c.rotate(-.35);drawMelee(c,p.ml,1.25)}
    else if(it&&it.type==='gun')drawGunIcon(c,it.w,it.rar,88,40);
    else if(it){c.translate(44,24);drawHeal(c,it.id,1.5)}
  }
}
function showHud(on){$('hud').hidden=!on}
function showEnd(){
  state='over';
  const t=BOTN[clamp(S.bots|0,0,2)]+1;
  const rw=recordMatch({place:result.place,total:t,kills:result.kills,win:result.win,time:result.t,mode:'Solo',map:S.map});
  fillEnd(result.win?'Last one standing':'Eliminated',result.win?'The island is yours. Nobody else made it out of the storm.':'You placed #'+result.place+' of '+t+'. Loot faster and stay ahead of the circle.',result.place,result.kills,result.t,rw);
  $('again').hidden=false;$('end').hidden=false;$('again').focus({preventScroll:true});
}
function fillEnd(title,msg,place,kills,t,rw){
  const win=title==='Last one standing';
  $('end').classList.toggle('win',win);
  const cf=$('confetti');cf.textContent='';cf.hidden=!win;
  if(win){const cols=['#ffd166','#ff6b4a','#5cc8ff','#6ee7a8','#c58bff','#ffffff'];for(let i=0;i<36;i++){const p=document.createElement('i');p.style.left=(Math.random()*100)+'%';p.style.background=cols[i%cols.length];p.style.setProperty('--dx',((Math.random()-.5)*160)+'px');p.style.animationDelay=(-Math.random()*3.2)+'s';p.style.animationDuration=(2.4+Math.random()*1.8)+'s';cf.appendChild(p)}}
  $('endTitle').textContent=win?'Victory!':title;$('endMsg').textContent=msg;
  $('sPlace').textContent='#'+place;$('sTime').textContent=fmt(t);
  {const ke=$('sKills'),kn=kills|0,t0=performance.now();ke.textContent=kn?'0':'0';if(kn>0){const st=()=>{const k=Math.min(1,(performance.now()-t0)/700);ke.textContent=Math.round(kn*k);if(k<1)requestAnimationFrame(st)};requestAnimationFrame(st)}}
  $('rewards').textContent='+'+rw.xp+' XP · +'+rw.coins+' coins'+(rw.tier>rw.tier0?' · Battle pass tier '+rw.tier+' reached':'');
}
function startGame(){
  initAudio();if(mp)leaveOnline(true);
  dropT=null;dropPressed=false;kbSeen=false;setTimeout(focusGame,50);capFn=null;inTest=null;closeMenu(true);adminOpen=false;$('admin').hidden=true;for(const k in down)down[k]=false;mp=false;setupMatch();paused=false;state='play';zoomMul=.72;
  $('hub').hidden=true;$('lobby').hidden=true;$('end').hidden=true;showHud(true);$('mpbar').hidden=true;$('pchip').hidden=true;lastFeed='\u0000';lastGun='';
  banner('Press Space to drop whenever you like. Hold Space to fall faster.',6);
}
function goHome(){
  closeMenu(true);adminOpen=false;$('admin').hidden=true;
  if(mp)leaveOnline(true);
  mp=false;state='hub';player=null;paused=false;
  setupPreview();showHud(false);$('end').hidden=true;$('lobby').hidden=true;$('hub').hidden=false;showHub();
}
/* ---------- in-game menu (leave match) and admin cheat bar ---------- */
let adminOpen=false;
const adminOK=()=>state==='play'&&!!P.dev&&!mp;
function toggleMenu(){if(state!=='play')return;menuOpen?closeMenu():openMenu()}
function openMenu(){
  if(state!=='play')return;
  menuOpen=true;if(!mp)paused=true;
  $('gmenu').hidden=false;
  const ab=$('gmAdmin');
  ab.textContent=mp?'Admin panel (solo only)':P.dev?(adminOpen?'Hide admin panel':'Admin panel'):'Turn on Owner mode + admin panel';
  ab.disabled=mp;
  $('gmNote').textContent='Leaving ends this match and returns to the main menu.'+(mp?' Others in the room play on.':'');
  $('gmResume').focus();
}
function closeMenu(quiet){
  menuOpen=false;if(!quiet||state==='play')paused=false;
  $('gmenu').hidden=true;
  for(const k in down)down[k]=false;
}
function leaveMatch(){closeMenu(true);if(mp)leaveOnline(false);else goHome()}
function toggleAdmin(){
  if(state!=='play'||mp)return;
  if(!P.dev){P.dev=1;fixEquipped();saveProfile()}
  adminOpen=!adminOpen;buildAdmin();
}
$('menuBtn').addEventListener('click',ev=>{ev.currentTarget.blur();toggleMenu()});
$('gmResume').addEventListener('click',()=>closeMenu());
$('gmLeave').addEventListener('click',leaveMatch);
$('gmAdmin').addEventListener('click',()=>{toggleAdmin();closeMenu()});
const ADM_T=[['god','God mode','HP and shield never drop'],['ammo','Infinite ammo','Never run dry'],['rapid','Rapid fire','Guns fire 4x faster'],['one','One-hit kills','Your bullets do huge damage'],['speed','Super speed','Run nearly twice as fast'],['fast','Instant heals','Heals finish at once'],['nostorm','Storm immunity',''],['esp','Radar','All players on the minimap'],['wide','Wide view','Zoom out'],['aim','Aimbot','Locks onto the nearest enemy in sight while you shoot'],['trig','Auto-fire','Shoots by itself when an enemy is in sight (needs Aimbot)']];
function buildAdmin(){
  const a=$('admin');
  if(!adminOK()||!adminOpen){a.hidden=true;return}
  a.hidden=false;a.textContent='';
  const mk=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e};
  const act=fn=>ev=>{fn();ev.currentTarget.blur()};
  const ttl=mk('div','atitle','ADMIN');const x=mk('button','abtn','Close');x.type='button';x.addEventListener('click',act(()=>{adminOpen=false;buildAdmin()}));ttl.appendChild(x);a.appendChild(ttl);
  a.appendChild(mk('div','agrp','Cheats (on or off)'));
  for(const [k,l,dsc] of ADM_T){
    const r=mk('div','arow');const sp=mk('span','',l);if(dsc)sp.title=dsc;r.appendChild(sp);
    const b=mk('button','sw'+(ADM[k]?' on':''));b.type='button';b.setAttribute('role','switch');b.setAttribute('aria-label',l);b.setAttribute('aria-checked',ADM[k]?'true':'false');b.appendChild(mk('i'));
    b.addEventListener('click',act(()=>{ADM[k]=ADM[k]?0:1;b.classList.toggle('on',!!ADM[k]);b.setAttribute('aria-checked',ADM[k]?'true':'false')}));
    r.appendChild(b);a.appendChild(r);
  }
  const all=mk('div','brow2');
  const bOn=mk('button','abtn','All on'),bOff=mk('button','abtn','All off');bOn.type=bOff.type='button';
  bOn.addEventListener('click',act(()=>{for(const k in ADM)ADM[k]=1;buildAdmin()}));bOff.addEventListener('click',act(()=>{for(const k in ADM)ADM[k]=0;buildAdmin()}));
  all.appendChild(bOn);all.appendChild(bOff);a.appendChild(all);
  a.appendChild(mk('div','agrp','Instant actions'));
  const q=mk('div','brow2');
  const add=(t,fn)=>{const b=mk('button','abtn',t);b.type='button';b.addEventListener('click',act(()=>{if(player&&player.alive)fn()}));q.appendChild(b)};
  add('Full HP + shield',()=>{player.hp=100;player.sh=100;player.regenT=0});
  add('Refill ammo',()=>{for(const it of player.inv)if(it&&it.type==='gun'){it.ammo=gunMax(it);it.mg=it.s.mag}for(const k of AMMOL)player.pouch[k]=POUCHCAP(k)});
  add('Land now',()=>{if(player.st<3){player.st=3;banner('Landed',1.5)}});
  add('Kill all bots',()=>{for(const o of ents.slice())if(o!==player&&o.alive)damage(o,9999,player)});
  add('Max heals',()=>{for(let i=0;i<HEALS.length;i++)admGive(mkHeal(i,5))});
  add('Perfect layout',()=>{
    const pl=player;if(!pl)return;
    for(let i=1;i<NSLOT;i++)pl.inv[i]=null;
    const g=n=>WEAP.findIndex(w=>w.name===n);
    pl.inv[1]=mkGun(g('Buzz SMG'),6,0);pl.inv[2]=mkGun(g('Pump Shotgun'),6,0);pl.inv[3]=mkGun(g('Wonder Sniper'),6,0);
    for(let i=1;i<=3;i++){pl.inv[i].ammo=gunMax(pl.inv[i]);pl.inv[i].mg=pl.inv[i].s.mag}
    pl.inv[4]=mkHeal(2,3);pl.inv[5]=mkHeal(3,2);
    for(const k of AMMOL)pl.pouch[k]=POUCHCAP(k);
    pl.hp=100;pl.sh=100;pl.sel=1;pl.use=null;pl.rl=0;
  });
  add('Golden M4',()=>{const pl=player;if(!pl)return;const g=mkGun(GOLDM4,6,0);g.ammo=gunMax(g);g.mg=g.s.mag;admGive(g,1);pl.pouch.medium=POUCHCAP('medium')});
  add('Best kit',()=>{admGive(mkGun(WEAP.findIndex(w=>w.name==='Rail Gun'),6,0),1);admGive(mkGun(WEAP.findIndex(w=>w.name==='RPG'),6,0),1);admGive(mkGun(WEAP.findIndex(w=>w.name==='Auto Shotgun'),6,0),1);for(let i=0;i<HEALS.length;i++)admGive(mkHeal(i,5))});
  a.appendChild(q);
  a.appendChild(mk('div','agrp','Airdrop (exotic gun + heals)'));
  const ab=mk('div','brow2');
  const addA=(t,fn)=>{const b=mk('button','abtn',t);b.type='button';b.addEventListener('click',act(()=>{if(player&&player.alive)fn()}));ab.appendChild(b)};
  addA('On me',()=>forceAirdrop(player.x,player.y));
  addA('Pick a spot',()=>{airPick=true;cv.style.cursor='crosshair';banner('Click where the airdrop should land (right-click cancels)',4)});
  addA('Random spot',()=>{const p=rp(300);forceAirdrop(p.x,p.y)});
  a.appendChild(ab);
  a.appendChild(mk('div','agrp','Give a weapon'));
  const ws=mk('select');ws.setAttribute('aria-label','Weapon');WEAP.forEach((w,i)=>{const o=mk('option','',w.name);o.value=i;ws.appendChild(o)});
  const rs=mk('select');rs.setAttribute('aria-label','Rarity');RAR7N.forEach((n,i)=>{const o=mk('option','',n);o.value=i;rs.appendChild(o)});rs.value='6';
  ws.addEventListener('change',()=>ws.blur());rs.addEventListener('change',()=>rs.blur());
  a.appendChild(ws);a.appendChild(rs);
  const gb=mk('button','abtn wide','Give weapon');gb.type='button';gb.addEventListener('click',act(()=>{if(player&&player.alive)admGive(mkGun(+ws.value,+rs.value,0),1)}));a.appendChild(gb);
  a.appendChild(mk('div','agrp','Give a heal'));
  const hb=mk('div','brow2');
  HEALS.forEach((H,i)=>{const b=mk('button','abtn','+3 '+H.name);b.type='button';b.addEventListener('click',act(()=>{if(player&&player.alive)admGive(mkHeal(i,3))}));hb.appendChild(b)});
  a.appendChild(hb);
  a.appendChild(mk('div','gnote','Owner mode, solo play only. Hide or show with the Menu or '+actLabel('admin')+'.'));
}
function admGive(it,full){
  const p=player;if(!p)return;
  if(it.type==='gun'){it.ammo=gunMax(it);it.mg=it.s.mag}
  else{const o=p.inv.find(x=>x&&x.type==='heal'&&x.id===it.id);if(o){o.n=Math.min(99,o.n+it.n);return}}
  let i=p.inv.indexOf(null);
  if(i<0)i=p.sel||1;
  p.inv[i]=it;p.sel=i;p.use=null;
}
$('again').addEventListener('click',startGame);
$('home').addEventListener('click',goHome);

let last=performance.now(),menuT=0;
function frame(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(mp)netTick(dt);
  if(state==='arena'){arenaStep(dt);drawArena()}
  else if(state==='hub'||state==='lobby'){
    menuT+=dt;updZone(0);
    cam.x=CX+Math.cos(menuT*.12)*ISLAND*.4;cam.y=CY+Math.sin(menuT*.12)*ISLAND*.4;
    for(const l of loot)l.b+=dt*3;
    draw();
  }else{
    if(!paused)update(dt);
    draw();drawMini();hud(dt);
  }
  requestAnimationFrame(frame);
}
