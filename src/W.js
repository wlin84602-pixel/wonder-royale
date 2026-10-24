/* ---------- weapons (15, 7 rarities), heals (4), ammo, crates and the 7-slot inventory ---------- */
const RAR7N=['Common','Uncommon','Rare','Epic','Legendary','Mythic','Exotic'];
const RAR7C=['#b9c4c0','#5fe08a','#5cc8ff','#b07cff','#ffb02e','#ff5d8f','#2ef2d0'];
const NSLOT=6;
const AMMOC={light:{name:'Light ammo',amt:360,col:'#ffd166'},shell:{name:'Shells',amt:100,col:'#ff9a52'},medium:{name:'Medium ammo',amt:300,col:'#6ee7a8'},heavy:{name:'Heavy ammo',amt:80,col:'#b07cff'},rocket:{name:'Rockets',amt:30,col:'#ff6b4a'}};
const AMMOL=['light','shell','medium','heavy','rocket'];
const CLSAMMO={pistol:'light',smg:'light',shotgun:'shell',rifle:'medium',sniper:'heavy',rocket:'rocket'};
/* name, class, dmg, rate(s), bullet speed, spread, pellets, mag, range, drawn length, drawn start, sound, pick weight, extras */
const WEAP=[
  {name:'Sidearm',cls:'pistol',dmg:14,rate:.30,spd:900,spread:.03,pellets:1,mag:14,rng:650,len:25,x0:0,f:260,wt:14,tag:'Reliable'},
  {name:'Hand Cannon',cls:'pistol',dmg:44,rate:.85,spd:1250,spread:.012,pellets:1,mag:6,rng:850,len:36,x0:-2,f:130,wt:7,tag:'Heavy hitter'},
  {name:'Burst Pistol',cls:'pistol',dmg:11,rate:.42,spd:950,spread:.025,pellets:1,mag:15,rng:600,len:29,x0:0,f:310,wt:8,burst:3,gap:.06,tag:'3-shot burst'},
  {name:'Buzz SMG',cls:'smg',dmg:8,rate:.075,spd:850,spread:.10,pellets:1,mag:36,rng:480,len:35,x0:-8,f:340,wt:11,tag:'Fast spray'},
  {name:'Tac SMG',cls:'smg',dmg:11,rate:.10,spd:950,spread:.05,pellets:1,mag:28,rng:560,len:42,x0:-8,f:290,wt:9,tag:'Accurate'},
  {name:'Pump Shotgun',cls:'shotgun',dmg:9,rate:.90,spd:800,spread:.22,pellets:7,mag:6,rng:380,len:50,x0:-10,f:150,wt:11,tag:'Close range'},
  {name:'Double Barrel',cls:'shotgun',dmg:10,rate:1.15,spd:780,spread:.30,pellets:11,mag:2,rng:340,len:50,x0:-10,f:120,wt:6,tag:'2 big shots'},
  {name:'Auto Shotgun',cls:'shotgun',dmg:7,rate:.45,spd:800,spread:.26,pellets:6,mag:8,rng:360,len:46,x0:-4,f:170,wt:7,tag:'Rapid fire'},
  {name:'Assault Rifle',cls:'rifle',dmg:21,rate:.16,spd:1100,spread:.04,pellets:1,mag:24,rng:800,len:54,x0:-10,f:290,wt:12,tag:'All-rounder'},
  {name:'Marksman DMR',cls:'rifle',dmg:38,rate:.50,spd:1500,spread:.012,pellets:1,mag:12,rng:1000,len:60,x0:-12,f:230,wt:6,slow:.95,tag:'Precise'},
  {name:'Light MG',cls:'rifle',dmg:13,rate:.07,spd:1000,spread:.08,pellets:1,mag:60,rng:700,len:58,x0:-10,f:240,wt:4,slow:.84,tag:'60 rounds'},
  {name:'Bolt Sniper',cls:'sniper',dmg:75,rate:1.2,spd:1800,spread:0,pellets:1,mag:5,rng:1400,len:66,x0:-12,f:110,wt:5,slow:.92,view:.86,tag:'Long range'},
  {name:'Rail Gun',cls:'sniper',dmg:90,rate:1.6,spd:2600,spread:0,pellets:1,mag:4,rng:1700,len:62,x0:0,f:90,wt:2,pierce:1,slow:.9,view:.82,tag:'Pierces'},
  {name:'RPG',cls:'rocket',dmg:0,rate:1.6,spd:640,spread:.01,pellets:1,mag:2,rng:1100,len:67,x0:-14,f:70,wt:3,pj:'rocket',boom:{r:135,d:95},slow:.9,tag:'Rocket'},
  {name:'Grenade Launcher',cls:'rocket',dmg:0,rate:1.0,spd:540,spread:.03,pellets:1,mag:4,rng:700,len:44,x0:-8,f:100,wt:3,pj:'grenade',boom:{r:105,d:62},slow:.95,tag:'Grenades'},
  {name:'Longshot',cls:'sniper',dmg:85,rate:1.5,spd:2400,spread:0,pellets:1,mag:4,rng:2100,len:73,x0:-14,f:95,wt:2,slow:.9,fix:1,view:.74,tag:'85 dmg, wide view'},
  {name:'Wonder Sniper',cls:'sniper',dmg:90,rate:1.3,spd:2800,spread:0,pellets:1,mag:5,rng:2600,len:78,x0:-14,f:80,wt:0,slow:.92,fix:1,view:.56,tag:'90 dmg, huge view'}
];
const WCLS={pistol:'Pistol',smg:'SMG',shotgun:'Shotgun',rifle:'Rifle',sniper:'Sniper',rocket:'Explosive'};
const HEALS=[
  {name:'Small Pot',t:1,max:6,drop:2,col:'#5cc8ff',wt:40,sf:520,desc:'+25 shield',full:'Shield is already full',need:e=>e.sh<100,apply:e=>{e.sh=Math.min(100,e.sh+25)}},
  {name:'Big Pot',t:3,max:3,drop:1,col:'#2f7bff',wt:22,sf:380,desc:'+50 shield',full:'Shield is already full',need:e=>e.sh<100,apply:e=>{e.sh=Math.min(100,e.sh+50)}},
  {name:'Med Kit',t:3,max:3,drop:1,col:'#ff5d5d',wt:12,sf:300,desc:'+75 health',full:'Health is already full',need:e=>e.hp<100,apply:e=>{e.hp=Math.min(100,e.hp+75)}},
  {name:'Wonder Potion',t:1,max:2,drop:1,col:'#c58bff',wt:24,sf:660,desc:'+2 hp & shield /s',full:'Health and shield are full',need:e=>e.hp<100||e.sh<100,apply:e=>{e.regenT+=10}}
];
let CFG={crate:1,gold:1,rarity:1,startGun:0,heal:1};
const HEALMUL=[1.5,1,.6];
function setCfg(a){CFG.crate=clamp(a[0]|0,0,2);CFG.gold=a[1]?1:0;CFG.rarity=clamp(a[1+1]|0,0,2);CFG.startGun=a[3]?1:0;CFG.heal=clamp(a[4]|0,0,2)}

/* ---------- items ---------- */
const WSC=.7;/* weapons are drawn 30% smaller */
const EQUIP_T=g=>0;
WEAP.forEach(b=>{b.mag*=10});
function statsOf(id,rar){
  const b=WEAP[id],k=rar;
  return{id,name:b.name,cls:b.cls,view:b.view||0,dmg:b.fix?b.dmg:Math.round(b.dmg*(1+.07*k)*10)/10,rate:b.cls==='sniper'||b.cls==='shotgun'?1:Math.min(b.cls==='rocket'?.22:.12,b.rate*(1-.022*k)*.72),spd:b.spd*(1+.02*k),spread:b.spread*(1-.07*k),pellets:b.pellets,mag:b.mag,rng:b.rng*(1+.02*k),
    len:b.len,x0:b.x0,f:b.f,burst:b.burst||0,gap:b.gap||.06,pierce:!!b.pierce,pj:b.pj||'',boom:b.boom?{r:b.boom.r*(1+.03*k),d:b.boom.d*(1+.07*k)}:null,slow:b.slow||1,col:RAR7C[rar]};
}
const mkGun=(w,rar,ammo)=>{const a=ammo==null?Math.round(WEAP[w].mag*3):ammo;return{type:'gun',w,rar,ammo:a,mg:Math.min(WEAP[w].mag,a),s:statsOf(w,rar)}};
const mkHeal=(id,n)=>({type:'heal',id,n});
const held=e=>e.remote?e.rh:e.inv[e.sel];
const MELEE_ITEM={type:'melee'};
const heldGun=e=>{const it=held(e);return it&&it.type==='gun'?it:null};
const gunMax=it=>it.s.mag*5;

/* ---------- rolling loot (seeded so every player in a live match sees the same items) ---------- */
const RW_FLOOR=[50,28,14,6,1.7,.28,.02],RW_CRATE=[40,28,16,9,4.5,2,.5],RW_GOLD=[2,10,22,30,22,10,4];
function pickW(R,ws){let s=0;for(const w of ws)s+=w;let r=R()*s;for(let i=0;i<ws.length;i++){r-=ws[i];if(r<=0)return i}return ws.length-1}
function rollRar(R,wr){
  const lv=CFG.rarity-1,m=lv<0?.6:lv>0?1.6:1;
  return pickW(R,wr.map((x,i)=>x*Math.pow(m,i)));
}
const WW=WEAP.map(w=>w.wt),HW=HEALS.map(h=>h.wt);
function rollLoot(R,wr,pref){
  let t=pref;
  if(!t){const r=R();t=r<.38?'gun':r<.6?'heal':'ammo'}
  if(t==='gun'){const w=pickW(R,WW),rar=rollRar(R,wr);return{type:'gun',w,rar,kind:w,amt:Math.round(WEAP[w].mag*3*(1+.04*rar))}}
  if(t==='heal'){const id=pickW(R,HW);return{type:'heal',kind:id,amt:HEALS[id].drop}}
  const cls=AMMOL[Math.floor(R()*5)];return{type:'ammo',kind:cls,amt:AMMOC[cls].amt}
}
function addLoot(x,y,d,id){const it={id:id===undefined?'x'+(lootN++):id,x,y,type:d.type,kind:d.kind,w:d.w,rar:d.rar||0,amt:d.amt,b:Math.random()*TAU};loot.push(it);if(NETHOOK)NETHOOK('loot+',it);return it}
const lootName=l=>l.type==='gun'?WEAP[l.w].name:l.type==='heal'?HEALS[l.kind].name:AMMOC[l.kind].name;
function spawnLootRandom(x,y){if(x===undefined){const p=freeSpot(80,14);x=p.x;y=p.y}addLoot(x,y,rollLoot(rnd,RW_FLOOR),gid++)}

/* ---------- picking up, swapping and dropping ---------- */
const POUCHCAP=k=>AMMOC[k].amt*8;
/* a gun that runs dry draws a refill from the pouch before it is thrown away */
function refillFromPouch(e,it){
  const k=CLSAMMO[WEAP[it.w].cls],n=Math.min(e.pouch?e.pouch[k]:0,it.s.mag*2);
  if(n<=0)return false;
  it.ammo+=n;e.pouch[k]-=n;if(e===player)sfx(360,.06,'square',.03,1.1);return true;
}
/* give out: drop one stack of a spare ammo type on the ground for someone to pick up */
function dropAmmo(e,k){
  if(NETMODE==='client'){netAct('ammo',k);return}
  const n=Math.min(e.pouch[k],AMMOC[k].amt);if(n<=0)return;
  e.pouch[k]-=n;
  addLoot(e.x+Math.cos(e.ang)*50,e.y+Math.sin(e.ang)*50,{type:'ammo',kind:k,amt:n});
  loot[loot.length-1].nt=performance.now()+1800;
  sfx(300,.08,'square',.03,.7);
}
function dropDesc(it){return it.type==='gun'?{type:'gun',w:it.w,rar:it.rar,kind:it.w,amt:it.ammo}:{type:'heal',kind:it.id,amt:it.n}}
function give(e,l,manual){
  if(l.type==='ammo'){
    let any=false;
    if(!e.bot){
      /* spare ammo is stored in the ammo pouch; guns reload from it when they run dry */
      const room=POUCHCAP(l.kind)-e.pouch[l.kind];
      if(room>0){const n=Math.min(room,l.amt);e.pouch[l.kind]+=n;if(n<l.amt){l.amt-=n;if(NETHOOK)NETHOOK('loot~',l);return false}return true}
    }
    for(const it of e.inv)if(it&&it.type==='gun'&&CLSAMMO[WEAP[it.w].cls]===l.kind&&it.ammo<gunMax(it)){it.ammo=Math.min(gunMax(it),it.ammo+l.amt);any=true}
    return any;
  }
  if(l.type==='gun'){
    const i=e.inv.findIndex(it=>it&&it.type==='gun'&&it.w===l.w&&it.rar===l.rar);
    if(i>=0){const it=e.inv[i];if(it.ammo>=gunMax(it))return false;it.ammo=Math.min(gunMax(it),it.ammo+l.amt);return true}
    let f=e.inv.indexOf(null);
    if(f<0){if(!manual)return false;f=e.sel||1;const old=e.inv[f];if(old)addLoot(l.x,l.y,dropDesc(old))}
    e.inv[f]=mkGun(l.w,l.rar,l.amt);
    if(!e.use&&(manual||!heldGun(e)))e.sel=f;
    return true;
  }
  const H=HEALS[l.kind];
  let i=e.inv.findIndex(it=>it&&it.type==='heal'&&it.id===l.kind&&it.n<H.max);
  if(i>=0){e.inv[i].n=Math.min(H.max,e.inv[i].n+l.amt);return true}
  i=e.inv.indexOf(null);
  if(i<0){if(!manual)return false;i=e.sel||1;const old=e.inv[i];if(old)addLoot(l.x,l.y,dropDesc(old))}
  e.inv[i]=mkHeal(l.kind,Math.min(H.max,l.amt));
  if(!e.use&&(!held(e)||held(e).type==='melee'))e.sel=i;
  return true;
}
function dropList(e){
  const arr=[];
  e.inv.forEach(it=>{if(it&&it.type!=='melee')arr.push(it)});
  arr.sort((a,b)=>(b.type==='gun'?b.rar*10+b.s.dmg/10+5:3)-(a.type==='gun'?a.rar*10+a.s.dmg/10+5:3));
  return arr.slice(0,3);
}
/* reloading takes one second; spare rounds come from the gun's own reserve first, then the ammo pouch */
const RELOAD_T=1;
function reserveOf(e,it){const k=CLSAMMO[WEAP[it.w].cls];return Math.max(0,it.ammo-it.mg)+(e.pouch?e.pouch[k]:0)}
function startReload(e){
  if(NETMODE==='client'){if(e===player)netAct('reload');return false}
  const it=heldGun(e);if(!it||e.rl>0||e.st!==3)return false;
  if(it.mg>=it.s.mag||reserveOf(e,it)<=0)return false;
  e.rl=RELOAD_T;e.rlIt=it;if(e===player)sfx(260,.08,'square',.03,.7);return true;
}
function reloadStep(e,dt){
  if(NETMODE==='client'||!(e.rl>0))return;
  const it=heldGun(e);
  if(it!==e.rlIt||e.st!==3){e.rl=0;e.rlIt=null;return}
  e.rl-=dt;if(e.rl>0)return;
  e.rl=0;e.rlIt=null;
  let need=it.s.mag-it.mg;const own=Math.min(need,Math.max(0,it.ammo-it.mg));it.mg+=own;need-=own;
  if(need>0&&e.pouch){const k=CLSAMMO[WEAP[it.w].cls],n=Math.min(e.pouch[k],need);e.pouch[k]-=n;it.ammo+=n;it.mg+=n}
  if(e===player)sfx(520,.06,'square',.04,1.2);
}
function removeEmpty(e,i){
  const it=e.inv[i];
  if(it&&it.type==='gun'&&it.ammo<=0){if(e===player&&!(it.dry>0)){banner(WEAP[it.w].name+' is out of ammo.',2);it.dry=1.5}if(e!==player){e.inv[i]=null}}
}

/* ---------- healing ---------- */
function startUse(e){
  if(e.use||e.st!==3)return false;
  const it=held(e);if(!it||it.type!=='heal')return false;
  const H=HEALS[it.id];
  if(!H.need(e)){if(e===player&&bannerT<=0)banner(H.full,1.2);return false}
  e.use={slot:e.sel,t:0,T:H.t*HEALMUL[CFG.heal]*(e===player&&admOn('fast')?.05:1)};
  if(e===player)sfx(H.sf,.1,'sine',.04,1.3);
  return true;
}
function updUse(e,dt){
  if(e.remote||NETMODE==='client')return;
  if(e.regenT>0){
    const d=Math.min(dt,e.regenT);e.regenT-=dt;e.hp=Math.min(100,e.hp+2*d);e.sh=Math.min(100,e.sh+2*d);
    if(Math.random()<dt*10)burst(e.x,e.y,'#c58bff',1,70,.5);
  }
  const u=e.use;if(!u)return;
  const it=e.inv[u.slot];
  if(!it||it.type!=='heal'||u.slot!==e.sel||e.st!==3){e.use=null;return}
  u.t+=dt;
  if(Math.random()<dt*14)burst(e.x,e.y,HEALS[it.id].col,1,60,.5);
  if(u.t>=u.T){
    const H=HEALS[it.id];H.apply(e);it.n--;if(it.n<=0)e.inv[u.slot]=null;
    e.use=null;burst(e.x,e.y,H.col,10,130,.5);
    if(e===player)sfx(H.sf*1.5,.18,'sine',.05,1.5);
  }
}

/* ---------- shooting (volleys, bursts, projectiles, explosions) ---------- */
const booms=[];
/* walk from (x0,y0) to (x1,y1); returns the last open point before a wall/door/tree/rock, or null when the path is clear. Windows stay open. */
function blockedAt(x0,y0,x1,y1){
  const L=Math.hypot(x1-x0,y1-y0),n=Math.max(1,Math.ceil(L/8));
  let px=x0,py=y0;
  for(let i=1;i<=n;i++){
    const x=x0+(x1-x0)*i/n,y=y0+(y1-y0)*i/n;
    if(bulletObs(x,y))return{x:px,y:py,ob:bulletObs(x,y)};
    px=x;py=y;
  }
  return null;
}
function fireBullets(e,adv){
  const it=held(e);if(!it||it.type!=='gun')return;
  const g=it.s;
  const made=[];
  for(let i=0;i<g.pellets;i++){
    const a=e.ang+(Math.random()-.5)*2*(g.spread+(e.bot?e.acc:0));
    const sx=e.x+Math.cos(e.ang)*(e.r*.5+g.len*WSC)+Math.cos(a)*g.spd*adv,sy=e.y+Math.sin(e.ang)*(e.r*.5+g.len*WSC)+Math.sin(a)*g.spd*adv;
    /* nothing leaves the muzzle through a wall or a closed door, even when the gun barrel pokes past it */
    const bl=blockedAt(e.x,e.y,sx,sy);
    if(bl){
      if(g.pj)explode(bl.x,bl.y,g.boom,e);else{burst(bl.x,bl.y,g.col,2,80,.2);if(bl.ob&&(bl.ob.k==='tree'||bl.ob.k==='rock'))hurtTree(bl.ob,g.dmg)}
      continue;
    }
    const bl2={x:sx,y:sy,vx:Math.cos(a)*g.spd,vy:Math.sin(a)*g.spd,
      life:g.rng/g.spd-adv,dmg:g.dmg*(e===player&&admOn('one')?60:1),o:e,col:g.pj?'#ff9a52':g.col,k:g.id,pj:g.pj,boom:g.boom,pierce:g.pierce,hs:null};
    bullets.push(bl2);made.push(bl2);
  }
  if(NETHOOK)NETHOOK('shot',e,made);
}
function fireVolley(e){
  const it=heldGun(e);if(!it)return false;
  if(!e.bot){
    if(e.rl>0)return false;
    if(it.mg>it.ammo)it.mg=it.ammo;
    if(it.mg<=0){
      if(!startReload(e)&&!(e.dryT>0)){e.dryT=.35;sfx(160,.04,'square',.04,.6)}
      return false;
    }
  }else if(it.ammo<=0)return false;
  if(!(e===player&&admOn('ammo'))){it.ammo--;if(!e.bot)it.mg--}
  if(e===player)SESS.shots++;
  if(mp&&e===player)shotCount++;
  fireBullets(e,0);e.recoil=1;
  if(!e.bot)addShake(it.s.boom?9:it.s.pellets>1?6:it.s.dmg>40?7:2.5);
  shotSfx(e);
  if(e.bot&&it.ammo<=0){const i=e.inv.indexOf(it);if(i>=0)removeEmpty(e,i)}
  else if(!e.bot&&it.mg<=0)startReload(e);
  return true;
}
function shoot(e){
  if(NETMODE==='client')return;
  if(!e.alive||e.st!==3||e.eqT>0)return;
  const it=held(e);
  if(!it){if(e.mcd<=0)doMelee(e);return}
  if(it.type==='melee'){if(e.mcd<=0)doMelee(e);return}
  if(it.type==='heal'){startUse(e);return}
  if(e.cd>0||e.bq>0)return;
  const g=it.s;
  e.cd=g.rate*(e===player&&admOn('rapid')?.22:1);
  if(fireVolley(e)&&g.burst>1&&heldGun(e)===it){e.bq=g.burst-1;e.bt=g.gap}
}
function burstStep(e,dt){
  if(e.bq<=0)return;
  e.bt-=dt;
  if(e.bt<=0){
    const it=heldGun(e);
    if(!it){e.bq=0;return}
    e.bq--;e.bt=it.s.gap;fireVolley(e);
  }
}
function explode(x,y,B,owner){
  booms.push({x,y,r:B.r,t:0});
  burst(x,y,'#ffb02e',22,360,.6);burst(x,y,'#ff6b4a',16,260,.8);burst(x,y,'#5a4a42',12,160,1.0);
  if(player){const d=Math.hypot(player.x-x,player.y-y);if(d<700){addShake(12*(1-d/700));sfx(70,.4,'sawtooth',.09*(1-d/900),.3)}}
  for(const c of circs)if((c.k==='tree'||c.k==='rock')&&!c.dead&&Math.hypot(c.x-x,c.y-y)<B.r+c.r)hurtTree(c,B.d);
  for(const o of ents){
    if(!o.alive||o.st!==3)continue;
    const d=Math.hypot(o.x-x,o.y-y),rr=B.r+o.r;
    if(d>rr)continue;
    const dm=B.d*(1-Math.min(1,d/rr)*.7)*(o===owner?.5:1);
    if(!mp){damage(o,dm,owner);continue}
    if(o===player){damage(player,dm,owner);continue}
    if(o.remote&&owner===player){hitmark=.15;SESS.hits++;SESS.dmg+=dm}
  }
  if(owner===player||(owner&&owner.bot)||NETMODE==='server')for(const c of crates.slice())if(Math.hypot(c.x-x,c.y-y)<B.r+c.r)hurtCrate(c,B.d*.9,true);
}

/* ---------- crates ---------- */
let crates=[];
function genCrates(A){
  crates=[];
  const m=[.45,1,1.7][CFG.crate],nC=Math.round(20*A*m*Math.sqrt(LOOTM)),nG=CFG.gold?Math.max(2,Math.round(4*A*m*Math.sqrt(LOOTM))):0;
  const place=(gold)=>{
    for(let k=0;k<30;k++){
      let x,y;
      if(houses.length&&rnd()<.4){const h=houses[Math.floor(rnd()*houses.length)];x=rand(h.x+60,h.x+h.w-60);y=rand(h.y+60,h.y+h.h-60)}
      else{const p=rp(120);x=p.x;y=p.y}
      if(hitsWall(x,y,34))continue;
      if(crates.some(c=>Math.hypot(c.x-x,c.y-y)<110))continue;
      return{x,y};
    }
    return null;
  };
  for(let i=0;i<nC+nG;i++){
    const gold=i>=nC,p=place(gold);
    const seed=Math.floor(rnd()*1e9);
    if(!p)continue;
    crates.push({id:crates.length,x:p.x,y:p.y,gold,hp:gold?170:70,max:gold?170:70,r:gold?30:26,seed,hit:0});
  }
}
/* ---------- airdrops: a seeded schedule, so every player sees the same drops land at the same time ---------- */
const AIR_T=9,AIR_GUNS=[10,12,13,14,15];
const WONDER=16;
let airs=[];
function genAirs(A){
  airs=[];const n=Math.max(2,Math.min(8,Math.round(2+1.6*Math.sqrt(A))));let t=rand(38,55);
  for(let i=0;i<n;i++){
    let x=CX,y=CY;
    for(let k=0;k<50;k++){const p=rp(260);if(!hitsWall(p.x,p.y,44)&&!houseAt(p.x,p.y)){x=p.x;y=p.y;break}}
    airs.push({i,t,x,y,seed:Math.floor(rnd()*1e9),told:false,landed:false});
    t+=rand(55,80);
  }
}
/* admin: call an airdrop down on any spot */
function forceAirdrop(x,y){
  const lim=ISLAND-90,dx=x-CX,dy=y-CY,d=Math.hypot(dx,dy);
  if(d>lim){x=CX+dx/d*lim;y=CY+dy/d*lim}
  airs.push({i:airs.length+50,t:planeClock(),x,y,seed:Math.floor(Math.random()*1e9),told:true,landed:false});
  feed.push({t:4,txt:'✈ Airdrop called - exotic gun + heals!'});sfx(520,.25,'triangle',.06,.7);
}
let airPick=false;
function airdropStep(){
  if(!airs.length||(!player&&NETMODE!=='server'))return;
  const tc=planeClock();
  for(const a of airs){
    if(a.landed||tc<a.t)continue;
    if(!a.told){a.told=true;if(tc<a.t+3&&NETMODE!=='client'){feed.push({t:6,txt:'✈ Airdrop incoming - exotic gun + heals!'});sfx(520,.25,'triangle',.06,.7)}}
    if(tc>=a.t+AIR_T){
      a.landed=true;
      const id='C'+(1000+a.i);
      if(typeof takenSet!=='undefined'&&takenSet.has(id))continue;
      if(NETMODE!=='client'){const ac2={id:1000+a.i,x:a.x,y:a.y,gold:true,air:1,hp:260,max:260,r:32,seed:a.seed,hit:0};crates.push(ac2);if(NETHOOK)NETHOOK('crate+',ac2)}
      burst(a.x,a.y,'#ffffff',18,260,.7);sfx(200,.3,'sawtooth',.06,.5);
      if(NETMODE!=='client'&&(NETMODE==='server'||player&&Math.hypot(player.x-a.x,player.y-a.y)<1400))feed.push({t:4,txt:'Airdrop landed - open it for a top-tier gun'});
    }
  }
}
function drawAirs(c,t){
  if(!airs.length)return;
  const tc=planeClock();
  for(const a of airs){
    if(a.landed||tc<a.t)continue;
    const f=Math.min(1,(tc-a.t)/AIR_T),alt=Math.pow(1-f,1.2)*820,sway=Math.sin(t*1.6+a.i)*10*(1-f);
    {const z=curZoom(),hw=W/2/z+120,hh=H/2/z+120;if(a.x<cam.x-hw||a.x>cam.x+hw||a.y+60<cam.y-hh||a.y-alt-120>cam.y+hh)continue}
    const s=26;
    c.save();
    c.fillStyle='rgba(0,0,0,.25)';c.beginPath();c.ellipse(a.x+6,a.y+8,s*(1.1-.3*f),s*(.8-.2*f),0,0,TAU);c.fill();
    c.strokeStyle='rgba(255,93,143,'+(.35+.3*Math.sin(t*5))+')';c.lineWidth=4;c.beginPath();c.arc(a.x,a.y,40+14*(1-f),0,TAU);c.stroke();
    const cx=a.x+sway,cy=a.y-alt;
    c.strokeStyle='rgba(255,255,255,.75)';c.lineWidth=1.6;c.beginPath();
    for(const o of[-44,-15,15,44]){c.moveTo(cx+o,cy-54);c.lineTo(cx,cy-s*.2)}
    c.stroke();
    c.fillStyle='#2f4f7a';c.fillRect(cx-s,cy-s*.2,s*2,s*1.5);
    c.fillStyle='#5f8fc8';c.fillRect(cx-s+4,cy-s*.2+4,s*2-8,s*1.5-8);
    c.strokeStyle='#10243d';c.lineWidth=3;c.strokeRect(cx-s,cy-s*.2,s*2,s*1.5);
    for(let k=0;k<4;k++){c.fillStyle=k%2?'#ffffff':'#ff5d8f';c.beginPath();c.moveTo(cx-48+k*24,cy-54);c.arc(cx,cy-54,48,Math.PI+k*Math.PI/4,Math.PI+(k+1)*Math.PI/4);c.closePath();c.fill()}
    c.strokeStyle='rgba(0,0,0,.5)';c.lineWidth=2;c.beginPath();c.arc(cx,cy-54,48,Math.PI,TAU);c.closePath();c.stroke();
    c.restore();
  }
}
function hurtCrate(c,d,local){
  if(NETMODE==='client'){c.hit=.14;burst(c.x,c.y,c.gold?'#ffd166':'#c89a5e',3,120,.3);return}
  c.hp-=d;c.hit=.14;burst(c.x,c.y,c.gold?'#ffd166':'#c89a5e',3,120,.3);
  if(NETHOOK)NETHOOK('crate',c);
  if(c.hp<=0)breakCrate(c,local);
}
function breakCrate(c,local){
  const i=crates.indexOf(c);if(i<0)return;crates.splice(i,1);
  burst(c.x,c.y,c.gold?'#ffd166':'#c89a5e',c.gold?26:16,250,.7);
  if(c.gold)burst(c.x,c.y,'#ffffff',10,200,.6);
  if(!player||Math.hypot(player.x-c.x,player.y-c.y)<900)sfx(c.gold?420:240,.16,'square',.05,.5);
  if(NETMODE==='client')return;/* the loot comes from the server as events */
  if(NETHOOK)NETHOOK('crate-',c);
  const R=mulberry(c.seed),wr=c.gold?RW_GOLD:RW_CRATE,plan=c.air?['air','h2','h1','h3','am','am2']:c.gold?['gun','gun','heal','am2','am2']:['gun','am2','am2'];
  plan.forEach((pref,k)=>{
    let d;
    if(pref==='air'){const w=Math.floor(R()*WEAP.length),rar=6;d={type:'gun',w,rar,kind:w,amt:Math.round(WEAP[w].mag*3*(1+.04*rar))}}
    else if(pref==='h2')d={type:'heal',kind:2,amt:2}
    else if(pref==='h1')d={type:'heal',kind:1,amt:2}
    else if(pref==='h3')d={type:'heal',kind:3,amt:2}
    else if(pref==='am'||pref==='am2'){const g=c.airGun!==undefined?c.airGun:0,cl=pref==='am'?CLSAMMO[WEAP[g].cls]:AMMOL[Math.floor(R()*AMMOL.length)];d={type:'ammo',kind:cl,amt:AMMOC[cl].amt*2}}
    else d=rollLoot(R,wr,pref||undefined);
    if(pref==='air')c.airGun=d.w;
    const a=k*TAU/plan.length+R()*.9,id='C'+c.id+'_'+k;
    if((typeof takenSet!=='undefined'&&takenSet.has(id))||loot.some(l=>l.id===id))return;
    addLoot(c.x+Math.cos(a)*(c.air?52:38),c.y+Math.sin(a)*(c.air?52:38),d,id);
  });
}

/* ---------- drawing: weapons ---------- */
function drawWeapon(c,id,rar,s){
  const A=RAR7C[rar]||'#aaa';
  c.save();c.scale(s,s);c.lineWidth=1.5;c.strokeStyle='rgba(0,0,0,.6)';c.lineJoin='round';
  if(rar>=5){c.shadowColor=A;c.shadowBlur=9}
  const D='#1b2326',M='#4a5b62',Wd='#7a5a3c',G='#4d5a43',L='#8ee9ff';
  const bx=(x,y,w,h,f)=>{c.fillStyle=f;c.fillRect(x,y,w,h);c.strokeRect(x,y,w,h)};
  const ci=(x,y,r,f)=>{c.fillStyle=f;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.stroke()};
  const pg=(pts,f)=>{c.fillStyle=f;c.beginPath();c.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)c.lineTo(pts[i],pts[i+1]);c.closePath();c.fill();c.stroke()};
  const dots=(x,y,n,gap,r,f)=>{c.fillStyle=f;for(let i=0;i<n;i++){c.beginPath();c.arc(x+i*gap,y,r,0,TAU);c.fill()}};
  /* every gun has its own colour AND silhouette; the thin stripe is its rarity colour */
  switch(id){
    case 0:/* Sidearm: slim steel pistol */
      bx(2,-4.5,22,7,'#9aa7b2');bx(2,2.5,18,3,'#4a5660');pg([3,3,11,3,9,14,1,14],'#2b3338');bx(6,-3,14,1.8,A);bx(22,-3.5,3,5,'#1b2326');break;
    case 1:/* Hand Cannon: chrome revolver, gold cylinder */
      pg([-2,3,6,3,4,14,-4,14],'#7a4a2a');bx(4,-5,10,10,'#c9d3da');bx(14,-4,20,5,'#e3eaee');ci(11,0,7.5,'#e0b83c');dots(8,-3,3,3,1,'#6a5210');dots(8,3,3,3,1,'#6a5210');bx(16,-3,16,1.6,A);bx(33,-5,3,7,'#8c97a0');break;
    case 2:/* Burst Pistol: teal, triple barrel */
      bx(2,-5.5,22,10,'#2fb5a8');bx(24,-5,5,3,'#1b2326');bx(24,-1.5,5,3,'#1b2326');bx(24,2,5,3,'#1b2326');pg([3,4,11,4,10,15,2,15],'#1d6e66');bx(6,-4,14,1.8,A);dots(8,0.5,3,5,1.3,'#d8fff9');break;
    case 3:/* Buzz SMG: yellow, big drum */
      bx(-8,-1.5,8,3,'#8a7a30');bx(0,-5,28,10,'#f2c230');bx(28,-2.5,7,5,'#3a3f45');ci(13,10,8,'#b98a10');c.strokeStyle='rgba(0,0,0,.5)';c.beginPath();c.moveTo(13,3);c.lineTo(13,17);c.moveTo(6,10);c.lineTo(20,10);c.stroke();c.strokeStyle='rgba(0,0,0,.6)';bx(5,-4,16,2,A);break;
    case 4:/* Tac SMG: black, long silencer, red dot */
      bx(-8,-3,8,6,'#3a444a');bx(0,-5,30,9,'#262c30');bx(30,-4,16,7,'#7d8990');c.strokeStyle='rgba(0,0,0,.55)';c.beginPath();for(let x=34;x<46;x+=4){c.moveTo(x,-4);c.lineTo(x,3)}c.stroke();c.strokeStyle='rgba(0,0,0,.6)';bx(9,4,6,13,'#4a545a');bx(10,-9,9,4,'#ff5d5d');bx(4,-4,18,1.8,A);break;
    case 5:/* Pump Shotgun: wood and steel, pump slide */
      bx(-10,-4,16,9,'#8a5a32');bx(6,-4,12,8,'#3a444a');bx(6,-4.5,44,4,'#9aa5ab');bx(6,1,38,3.5,'#5a656c');bx(24,-6,13,12,'#b27a44');c.strokeStyle='rgba(0,0,0,.4)';c.beginPath();c.moveTo(27,-5);c.lineTo(27,5);c.moveTo(30,-5);c.lineTo(30,5);c.moveTo(33,-5);c.lineTo(33,5);c.stroke();c.strokeStyle='rgba(0,0,0,.6)';bx(8,-3.5,9,2,A);break;
    case 6:/* Double Barrel: side-by-side barrels, red shells */
      pg([-10,-4,4,-3,4,5,-10,8],'#7a4a2a');bx(4,-5.5,12,11,'#3a444a');bx(16,-5.5,32,4.4,'#aab4ba');bx(16,1.1,32,4.4,'#aab4ba');ci(48,-3.3,2.4,'#d9453a');ci(48,3.3,2.4,'#d9453a');bx(5,-4,9,1.8,A);bx(18,-1.2,28,2.4,'#6a757c');break;
    case 7:/* Auto Shotgun: purple, drum, heat shield */
      bx(-8,-3,6,6,'#3b2866');bx(-4,-5,22,10,'#7a4fc0');bx(18,-3,28,6,'#8d98a0');c.strokeStyle='rgba(0,0,0,.5)';c.beginPath();for(let x=22;x<44;x+=5){c.moveTo(x,-3);c.lineTo(x,3)}c.stroke();ci(14,11,8,'#4d3380');ci(14,11,3,'#c6a8ff');bx(0,-6,12,2.5,A);bx(44,-4,4,8,'#ff9a52');break;
    case 8:/* Assault Rifle: olive, curved mag, carry handle */
      bx(-10,-4,16,9,'#3a4630');bx(6,-5,28,10,'#5f7e42');bx(34,-3,20,5,'#2f383d');pg([14,5,21,5,24,17,17,17],'#34422a');bx(12,-9,14,4,'#2b3328');bx(8,-4,12,2,A);bx(50,-6,4,3,'#2b3328');break;
    case 9:/* Marksman DMR: tan, scope */
      pg([-12,-4,2,-5,6,4,-12,5],'#6d4a2c');bx(6,-5,26,9,'#c9ab6e');bx(32,-2.5,28,5,'#5a656c');bx(16,-12,20,7,'#3a444a');ci(36,-8.5,3.3,L);ci(16,-8.5,3,'#2a3338');bx(8,4,6,9,'#8a7a50');bx(10,-4,20,2,A);break;
    case 10:/* Light MG: red, ammo belt, bipod */
      bx(-10,-5,16,10,'#5a3a2a');bx(6,-6,28,12,'#a8423a');bx(34,-3,24,6,'#4a545a');c.strokeStyle='rgba(0,0,0,.5)';c.beginPath();for(let x=38;x<56;x+=4){c.moveTo(x,-3);c.lineTo(x,3)}c.stroke();bx(10,6,18,10,'#2b3338');dots(13,11,4,4,1.8,'#e0b83c');bx(8,-5,16,2.2,A);c.strokeStyle='#c9d3da';c.lineWidth=2;c.beginPath();c.moveTo(48,3);c.lineTo(55,12);c.moveTo(48,-3);c.lineTo(55,-12);c.stroke();c.lineWidth=1.5;break;
    case 11:/* Bolt Sniper: navy, long barrel, big scope */
      pg([-12,-4,2,-5,6,4,-12,6],'#6d4a2c');bx(6,-4,30,8,'#34506e');bx(36,-2,30,4,'#9aa8b3');bx(14,-13,28,8,'#1d2a3a');ci(44,-9,4,L);ci(14,-9,3.4,'#101a24');bx(24,-4.5,10,3,A);bx(20,-8,3,5,'#9aa8b3');ci(22,6,2.4,'#c9d3da');break;
    case 12:/* Rail Gun: neon cyan rails */
      bx(0,-6,26,12,'#222c3a');bx(26,-8,36,3.5,'#2b3a4d');bx(26,4.5,36,3.5,'#2b3a4d');c.fillStyle='#48f0ff';c.fillRect(6,-1.5,54,3);c.shadowColor='#48f0ff';c.shadowBlur=8;c.fillRect(28,-6.8,32,1.4);c.fillRect(28,5.4,32,1.4);c.shadowBlur=rar>=5?9:0;bx(4,-4.5,7,9,A);ci(36,0,3.4,'#ffffff');ci(48,0,3.4,'#ffffff');break;
    case 13:/* RPG: olive tube, red warhead, flared rear */
      bx(-8,-5.5,60,11,'#6a7a4a');pg([-8,-5.5,-15,-9,-15,9,-8,5.5],'#3a4630');pg([52,-6.5,67,0,52,6.5],'#e8523a');bx(52,-7,3,14,'#2b3328');bx(14,5.5,6,11,'#2b3328');bx(22,-10,10,4.5,'#2b3328');bx(0,-5,9,2.2,A);bx(30,-1.2,18,2.4,'#4a5a30');break;
    case 14:/* Grenade Launcher: red body, fat drum */
      bx(-8,-3,12,7,'#5a3a2a');bx(4,-6,12,10,'#c43d3d');ci(22,0,11,'#3a3f45');c.strokeStyle='rgba(255,255,255,.35)';c.beginPath();for(let i=0;i<6;i++){const q=i*1.047;c.moveTo(22,0);c.lineTo(22+Math.cos(q)*10,Math.sin(q)*10)}c.stroke();c.strokeStyle='rgba(0,0,0,.6)';ci(22,0,3.6,'#e0b83c');bx(32,-5,12,10,'#8a949b');bx(34,-6,3,12,'#2b3338');bx(8,-6,14,2.5,A);break;
    case 15:/* Longshot: violet, huge twin scope, vented brake */
      pg([-14,-4,2,-5,6,4,-14,5],'#3b2866');bx(6,-3.5,34,7,'#7a4bd6');bx(40,-2,26,4,'#2b3040');bx(66,-5,7,10,'#1b2326');bx(14,-13,30,9,'#2b2548');ci(18,-8.5,4.4,L);ci(40,-8.5,4.4,L);c.strokeStyle='rgba(0,0,0,.6)';c.beginPath();c.moveTo(68,-3);c.lineTo(68,3);c.moveTo(71,-3);c.lineTo(71,3);c.stroke();bx(22,-3.5,12,2.8,A);ci(22,8,2.6,'#c6a8ff');break;
    case 16:/* Wonder Sniper: rainbow barrel, gold body, glowing star scope */
      pg([-14,-4,2,-5,6,4,-14,6],'#ffd166');bx(6,-4,30,8,'#2b2040');
      {const g=c.createLinearGradient(36,0,76,0);g.addColorStop(0,'#ff5d8f');g.addColorStop(.35,'#ffd166');g.addColorStop(.7,'#48f0ff');g.addColorStop(1,'#b07cff');c.fillStyle=g;c.fillRect(36,-2.4,40,4.8);c.strokeRect(36,-2.4,40,4.8)}
      bx(14,-14,34,9,'#1d1432');ci(20,-9.5,4.8,'#ff9ad0');ci(42,-9.5,4.8,'#8ee9ff');c.fillStyle='#fff';c.beginPath();c.arc(20,-9.5,1.6,0,TAU);c.arc(42,-9.5,1.6,0,TAU);c.fill();
      bx(22,-4,14,3,A);pg([12,8,14,12,18,12,15,15,17,19,12,16,7,19,9,15,6,12,10,12],'#ffd166');bx(72,-5,6,10,'#ff5d8f');break;
    default:bx(0,-4,24,8,D);
  }
  c.restore();
}
function drawGunIcon(c,id,rar,w,h){
  const b=WEAP[id];if(!b)return;
  c.save();c.translate(w/2,h/2);
  const ext=b.len-b.x0+6,s=Math.min((w*.9)/ext,(h*.8)/24);
  c.scale(s,s);c.translate(-(b.len+b.x0)/2,0);drawWeapon(c,id,rar,1);c.restore();
}
function drawHeal(c,id,s){
  c.save();c.scale(s,s);c.lineWidth=1.6;c.strokeStyle='rgba(0,0,0,.65)';c.lineJoin='round';
  const H=HEALS[id];
  if(id===0){
    c.fillStyle=H.col;c.beginPath();c.arc(0,3,7,0,TAU);c.fill();c.stroke();
    c.fillStyle='#cfe9f5';c.fillRect(-2.5,-8,5,6);c.strokeRect(-2.5,-8,5,6);c.fillStyle='#8a5a32';c.fillRect(-3,-11,6,3.5);
    c.fillStyle='rgba(255,255,255,.55)';c.beginPath();c.arc(-2.5,1,2,0,TAU);c.fill();
  }else if(id===1){
    c.fillStyle=H.col;c.beginPath();c.arc(0,3,10,0,TAU);c.fill();c.stroke();
    c.fillStyle='#cfe0ff';c.fillRect(-3.5,-11,7,8);c.strokeRect(-3.5,-11,7,8);c.fillStyle='#8a5a32';c.fillRect(-4.5,-14,9,4);
    c.fillStyle='#fff';c.beginPath();c.moveTo(0,-1);c.lineTo(5,1.5);c.lineTo(4,7);c.lineTo(0,10);c.lineTo(-4,7);c.lineTo(-5,1.5);c.closePath();c.fill();
    c.fillStyle='rgba(255,255,255,.35)';c.beginPath();c.arc(-4,0,2.5,0,TAU);c.fill();
  }else if(id===2){
    c.fillStyle='#f4f6f4';c.fillRect(-11,-7,22,15);c.strokeRect(-11,-7,22,15);
    c.strokeStyle='rgba(0,0,0,.65)';c.beginPath();c.arc(0,-7,5,Math.PI,TAU);c.stroke();
    c.fillStyle=H.col;c.fillRect(-2.5,-5,5,11);c.fillRect(-5.5,-2,11,5);
  }else{
    c.shadowColor=H.col;c.shadowBlur=8;
    const g=c.createLinearGradient(0,-8,0,12);g.addColorStop(0,'#ff7ad9');g.addColorStop(.5,'#8f74ff');g.addColorStop(1,'#5cc8ff');
    c.fillStyle=g;c.beginPath();c.moveTo(-3,-6);c.lineTo(3,-6);c.lineTo(9,10);c.lineTo(-9,10);c.closePath();c.fill();c.stroke();
    c.shadowBlur=0;c.fillStyle='#e8d9ff';c.fillRect(-3.5,-10,7,5);c.strokeRect(-3.5,-10,7,5);c.fillStyle='#8a5a32';c.fillRect(-4,-13,8,3.5);
    c.fillStyle='#fff';[[-2,3,1.4],[3,6,1],[1,0,1.1]].forEach(q=>{c.beginPath();c.arc(q[0],q[1],q[2],0,TAU);c.fill()});
  }
  c.restore();
}
function drawAmmoIcon(c,cls,s){
  c.save();c.scale(s,s);c.lineWidth=1.4;c.strokeStyle='rgba(0,0,0,.65)';
  const col=AMMOC[cls].col;
  if(cls==='shell'){for(const x of[-5,0,5]){c.fillStyle=col;c.fillRect(x-2.2,-6,4.4,11);c.strokeRect(x-2.2,-6,4.4,11);c.fillStyle='#d9a441';c.fillRect(x-2.2,3,4.4,3)}}
  else if(cls==='rocket'){c.fillStyle='#8a929a';c.fillRect(-9,-3,15,6);c.strokeRect(-9,-3,15,6);c.fillStyle=col;c.beginPath();c.moveTo(6,-4);c.lineTo(12,0);c.lineTo(6,4);c.closePath();c.fill();c.stroke()}
  else if(cls==='heavy'){c.fillStyle=col;c.fillRect(-2.5,-9,5,16);c.strokeRect(-2.5,-9,5,16);c.fillStyle='#d9a441';c.fillRect(-3.5,4,7,4);c.beginPath();c.moveTo(-2.5,-9);c.lineTo(0,-13);c.lineTo(2.5,-9);c.fill()}
  else{c.fillStyle='#4a5b62';c.fillRect(-9,-6,18,12);c.strokeRect(-9,-6,18,12);c.fillStyle=col;c.fillRect(-6,-3,12,6)}
  c.restore();
}
function drawCrate(c,k,t){
  const s=k.r,sh=k.hit>0?(Math.random()-.5)*4:0;
  c.save();c.translate(k.x+sh,k.y);
  if(k.air){
    const pulse=.5+.5*Math.sin(t*4);c.globalAlpha=.3+.25*pulse;c.fillStyle='#ff5d8f';c.beginPath();c.arc(0,0,s*2.3,0,TAU);c.fill();c.globalAlpha=1;
    c.fillStyle='rgba(0,0,0,.3)';c.fillRect(-s+5,-s+7,s*2,s*2);
    c.fillStyle=k.hit>0?'#fff':'#2f4f7a';c.fillRect(-s,-s,s*2,s*2);c.fillStyle='#5f8fc8';c.fillRect(-s+4,-s+4,s*2-8,s*2-8);
    c.strokeStyle='#10243d';c.lineWidth=4;c.strokeRect(-s,-s,s*2,s*2);
    c.fillStyle='#ff5d8f';c.fillRect(-s,-5,s*2,10);c.fillRect(-5,-s,10,s*2);
    c.fillStyle='#fff';c.beginPath();c.arc(0,0,7,0,TAU);c.fill();c.strokeStyle='#10243d';c.lineWidth=2;c.stroke();
    if(k.hp<k.max){c.fillStyle='rgba(0,0,0,.55)';c.fillRect(-s,-s-10,s*2,5);c.fillStyle='#ff5d8f';c.fillRect(-s,-s-10,s*2*k.hp/k.max,5)}
    c.restore();return;
  }
  if(k.gold){const pulse=.5+.5*Math.sin(t*3+k.id);c.globalAlpha=.25+.2*pulse;c.fillStyle='#ffd166';c.beginPath();c.arc(0,0,s*1.9,0,TAU);c.fill();c.globalAlpha=1}
  c.fillStyle='rgba(0,0,0,.28)';c.fillRect(-s+5,-s+7,s*2,s*2);
  c.fillStyle=k.hit>0?'#fff':k.gold?'#e0a622':'#9b6b3c';c.fillRect(-s,-s,s*2,s*2);
  c.fillStyle=k.gold?'#ffd166':'#b9834c';c.fillRect(-s+4,-s+4,s*2-8,s*2-8);
  c.strokeStyle=k.gold?'#8a5d00':'#5a3a1c';c.lineWidth=4;c.strokeRect(-s,-s,s*2,s*2);
  c.lineWidth=3;c.beginPath();c.moveTo(-s+4,-s+4);c.lineTo(s-4,s-4);c.moveTo(s-4,-s+4);c.lineTo(-s+4,s-4);c.stroke();
  if(k.gold){c.fillStyle='#fff7c2';c.beginPath();c.arc(0,0,6,0,TAU);c.fill();c.strokeStyle='#8a5d00';c.lineWidth=2;c.stroke()}
  if(k.hp<k.max){c.fillStyle='rgba(0,0,0,.55)';c.fillRect(-s,-s-10,s*2,5);c.fillStyle=k.gold?'#ffd166':'#c89a5e';c.fillRect(-s,-s-10,s*2*k.hp/k.max,5)}
  c.restore();
}
function drawProjectile(c,b){
  const a=Math.atan2(b.vy,b.vx);
  c.save();c.translate(b.x,b.y);c.rotate(a);
  if(b.pj==='rocket'){
    c.fillStyle='rgba(255,170,60,.9)';c.beginPath();c.moveTo(-8,0);c.lineTo(-24-Math.random()*10,-5);c.lineTo(-24-Math.random()*10,5);c.closePath();c.fill();
    c.fillStyle='#d6dde0';c.strokeStyle='rgba(0,0,0,.6)';c.lineWidth=1.5;c.fillRect(-10,-4,18,8);c.strokeRect(-10,-4,18,8);
    c.fillStyle='#ff6b4a';c.beginPath();c.moveTo(8,-4.5);c.lineTo(15,0);c.lineTo(8,4.5);c.closePath();c.fill();c.stroke();
  }else{
    c.fillStyle='#3d4a3f';c.strokeStyle='rgba(0,0,0,.6)';c.lineWidth=1.5;c.beginPath();c.arc(0,0,7,0,TAU);c.fill();c.stroke();
    c.fillStyle=Math.sin(b.life*30)>0?'#ff6b4a':'#ffd166';c.beginPath();c.arc(0,0,2.6,0,TAU);c.fill();
  }
  c.restore();
}
