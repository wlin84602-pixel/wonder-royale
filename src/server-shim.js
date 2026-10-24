/* ============================================================================
   SERVER AUTHORITY LAYER
   Runs inside the same sandbox as the original game code (B2, S, X, W, C2), with NETMODE = 'server'.
   The client sends inputs and requests; this layer applies them with the game's own rules and reports every
   change of shared state as events + compact snapshots. Nothing here draws anything.
   ============================================================================ */
function srvKill(e,from){SRV.kill(e,from)}
var SRV=(function(){
  const EV=[],byId=new Map();
  const r0=v=>Math.round(v),r2=v=>Math.round(v*100)/100;
  const num=(v,d)=>typeof v==='number'&&isFinite(v)?v:d;
  const MAXV=265*1.12;                         /* fastest legitimate ground speed (px/s) with slack */
  let started=false,over=false,quiet=true;

  NETHOOK=function(type,a,b,c){
    if(quiet)return;
    switch(type){
      case 'shot':{
        const g=a.inv&&heldGun(a);if(!g||!b.length)return;
        const f=b[0];
        EV.push(['shot',a.pid,{col:f.col,k:f.k,pj:f.pj||'',boom:f.boom||null,pierce:f.pierce?1:0},b.map(q=>[r0(q.x),r0(q.y),r0(q.vx),r0(q.vy),r2(q.life)]),g.w,g.rar]);
        break}
      case 'hit':EV.push(['hit',a.pid,r0(a.x),r0(a.y),r0(c),b&&b.pid?b.pid:null,r0(a.hp),r0(a.sh)]);break;
      case 'loot+':EV.push(['l+',a.id,r0(a.x),r0(a.y),a.type,a.kind,a.w===undefined?-1:a.w,a.rar||0,a.amt]);break;
      case 'loot-':EV.push(['l-',a.id,b&&b.pid?b.pid:null]);break;
      case 'loot~':EV.push(['l~',a.id,a.amt]);break;
      case 'crate':EV.push(['c',a.id,r0(a.hp)]);break;
      case 'crate-':EV.push(['c-',a.id]);break;
      case 'crate+':EV.push(['c+',a.id,r0(a.x),r0(a.y),a.gold?1:0,a.hp,a.max,a.r,a.seed,a.air?1:0]);break;
      case 'tree':EV.push(['t',circs.indexOf(a),r0(a.hp),a.dead?1:0]);break;
      case 'door':EV.push(['d',a.id,a.open?1:0,a.dir||1]);break;
    }
  };

  function find(pid){return byId.get(pid)}
  function srvUse(e){
    const nd=nearestDoor(e,DOOR_REACH);let ld=1e9;
    for(const l of loot){const q=dist2(e,l);if(q<ld)ld=q}
    if(nd&&(ld>PICK_R*PICK_R||nd.q<=Math.sqrt(ld)*.5))toggleDoor(nd.d,true,e);
    else if(ld<=PICK_R*PICK_R)tryPickup(e,true);
    else openCrate(e);
  }
  const R={
    /* cfg = [map,storm,loot,minP,cd,crate,gold,rarity,startGun,healSpd] */
    init(seed,cfg,players){
      quiet=true;started=true;over=false;byId.clear();
      NETMODE='server';mp=false;player=null;
      setMap(cfg[0],cfg[1],cfg[2]);setCfg(cfg.slice(5));booms.length=0;
      genWorld(seed);makePlane(seed);
      bullets=[];parts=[];feed=[];ents=[];time=0;initZone();
      for(const p of players){
        const e=mkEnt(CX,CY,false,p.name,p.skin);
        e.sub=p.sub?1:0;e.ml=p.ml|0;e.bp=p.bp|0;e.cp=p.cp|0;e.st=0;e.pid=p.id;e.inp={ix:0,iy:0,fire:false,mel:false,ap:false};e.mvB=0;e.lastIn=0;e.corr=false;e.jumpReq=false;
        giveStart(e);ents.push(e);byId.set(p.id,e);
      }
      aliveCount=ents.length;
      quiet=false;
    },
    input(pid,d,nowMs){
      const e=find(pid);if(!e||!e.alive||!d)return;
      e.ang=num(d.a,e.ang);
      const ix=clamp(num(d.ix,0),-1,1),iy=clamp(num(d.iy,0),-1,1);
      e.inp={ix,iy,fire:!!d.f,mel:!!d.m,ap:!!d.ap};e.bo=!!d.bo;
      if(e.st===3){
        /* movement is predicted by the client; the server only accepts what a legitimate player could have done */
        const dtIn=e.lastIn?Math.min(.5,(nowMs-e.lastIn)/1000):.033;e.lastIn=nowMs;
        e.mvB=Math.min(MAXV*.6,e.mvB+dtIn*MAXV);
        const tx=num(d.x,e.x),ty=num(d.y,e.y),dx=tx-e.x,dy=ty-e.y,dd=Math.hypot(dx,dy);
        if(dd>0){
          const k=dd<=e.mvB?1:e.mvB/dd;
          e.x+=dx*k;e.y+=dy*k;e.mvB=Math.max(0,e.mvB-dd*k);
          if(k<1&&dd-e.mvB>40)e.corr=true;      /* cheating or severe lag: tell the client where it really is */
        }
        e.vx=clamp(num(d.vx,0),-400,400);e.vy=clamp(num(d.vy,0),-400,400);
        resolve(e);
      }
    },
    act(pid,t,v){
      const e=find(pid);if(!e||!e.alive)return;
      switch(t){
        case 'use':if(e.st===3)srvUse(e);break;
        case 'sel':{const i=v|0;if(e.st===3&&i>=0&&i<NSLOT&&e.sel!==i){e.sel=i;e.use=null}break}
        case 'reload':startReload(e);break;
        case 'jump':if(e.st===0)e.jumpReq=true;break;
        case 'boost':if(e.st===2)e.boost=Math.min(2,(e.boost||0)+.5);break;
        case 'ammo':if(e.st===3&&AMMOL.indexOf(v)>=0)dropAmmo(e,v);break;
        case 'emote':{const id=v|0;if(e.ecd<=0&&id>=0&&id<EMOTES.length){e.emo={g:EMOTES[id].g,t:2.6};e.ecd=1.2;e.ec++;e.eg=id}break}
        case 'swap':{
          if(!Array.isArray(v)||e.st!==3)break;const a=v[0]|0,b=v[1]|0;
          if(a>0&&b>0&&a<NSLOT&&b<NSLOT&&a!==b){const t2=e.inv[b];e.inv[b]=e.inv[a];e.inv[a]=t2;if(e.sel===a)e.sel=b;else if(e.sel===b)e.sel=a;e.use=null}
          break}
        case 'drop':{
          const i=v|0;if(e.st!==3||i<=0||i>=NSLOT)break;
          const it=e.inv[i];if(it&&it.type!=='melee'){
            const l=addLoot(e.x+Math.cos(e.ang)*50,e.y+Math.sin(e.ang)*50,dropDesc(it));l.nt=performance.now()+1800;
            e.inv[i]=null;if(e.use&&e.use.slot===i)e.use=null;
          }
          break}
      }
    },
    kill(e,from){
      if(!e.alive)return;
      e.alive=false;e.hp=0;e.use=null;e.rl=0;
      let alive=0;for(const o of ents)if(o.alive)alive++;
      aliveCount=alive;e.place=alive+1;
      if(from&&from!==e)from.kills++;
      dropList(e).forEach((it,k)=>{const a=k*2.1+.5;addLoot(e.x+Math.cos(a)*18,e.y+Math.sin(a)*18,dropDesc(it))});
      feed.push({t:5,txt:(from&&from!==e?from.name:'The storm')+' eliminated '+e.name});
      EV.push(['death',e.pid,from&&from!==e&&from.pid?from.pid:null,e.place,r0(e.x),r0(e.y)]);
    },
    /* a player that stayed disconnected too long leaves the match */
    drop(pid){const e=find(pid);if(e&&e.alive){e.st=3;kill(e,null)}},
    tick(dt){
      if(!started)return;
      time+=dt;updZone(dt);airdropStep();
      for(const e of ents){
        if(!e.alive)continue;
        if(e.st===0){
          const pp=planePos(Math.min(time,PLANE_T));e.x=pp.x;e.y=pp.y;
          if(e.jumpReq||time>PLANE_T-2.5){e.jumpReq=false;jumpOut(e,time)}
        }else if(e.st<3){
          airStep(e,dt,e.inp.ix,e.inp.iy);
        }else{
          if(e.inp.fire)shoot(e);
          if(e.inp.mel&&e.mcd<=0)doMelee(e);
          if(e.inp.ap)tryPickup(e,false);
        }
        reloadStep(e,dt);e.dryT=Math.max(0,(e.dryT||0)-dt);e.cd=Math.max(0,e.cd-dt);e.hit=Math.max(0,e.hit-dt);e.recoil=Math.max(0,e.recoil-dt*8);
        e.swing=Math.max(0,e.swing-dt);e.mcd=Math.max(0,e.mcd-dt);e.ecd=Math.max(0,e.ecd-dt);
        if(e.emo){e.emo.t-=dt;if(e.emo.t<=0)e.emo=null}
        burstStep(e,dt);updUse(e,dt);
        if(e.alive&&e.st===3&&Math.hypot(e.x-zone.cx,e.y-zone.cy)>zone.r)stormHurt(e,dt);
      }
      updBullets(dt);parts.length=0;
      for(const f of feed)EV.push(['f',f.txt,f.t]);
      feed.length=0;
    },
    snapshot(){
      const ps=[];
      for(const e of ents){
        const hg=heldGun(e);
        const o={i:e.pid,x:r0(e.x),y:r0(e.y),a:r2(e.ang),vx:r0(e.vx),vy:r0(e.vy),hp:Math.ceil(e.hp),sh:r0(e.sh),al:e.alive?1:0,k:e.kills,st:e.st,z:r2(e.z),
          g:hg?hg.w:-1,gr:hg?hg.rar:0,mc:e.mc,ec:e.ec,eg:e.eg,pl:e.place};
        if(e.corr){o.c=1}
        ps.push(o);
      }
      const z=zone;
      return{t:r2(time),al:aliveCount,p:ps,z:{cx:r0(z.cx),cy:r0(z.cy),r:r0(z.r),nx:r0(z.ncx),ny:r0(z.ncy),nr:r0(z.nr),ph:z.phase,s:z.state,t:r2(z.t)}};
    },
    clearCorr(){for(const e of ents)e.corr=false},
    mine(pid){
      const e=find(pid);if(!e)return null;
      return{
        inv:e.inv.map(it=>!it?0:it.type==='melee'?0:it.type==='gun'?[0,it.w,it.rar,it.ammo,it.mg]:[1,it.id,it.n]),
        pc:[e.pouch.light,e.pouch.shell,e.pouch.medium,e.pouch.heavy,e.pouch.rocket],
        sel:e.sel,us:e.use?[e.use.slot,r2(e.use.t),r2(e.use.T)]:0,rl:e.rl>0?r2(e.rl):0,rg:e.regenT>0?1:0,al:e.alive?1:0,pl:e.place,k:e.kills
      };
    },
    /* everything a client needs to rebuild the shared world after joining late or reconnecting */
    world(){
      return{
        loot:loot.map(l=>[l.id,r0(l.x),r0(l.y),l.type,l.kind,l.w===undefined?-1:l.w,l.rar||0,l.amt]),
        crates:crates.map(c=>[c.id,r0(c.x),r0(c.y),c.gold?1:0,r0(c.hp),c.max,c.r,c.seed,c.air?1:0]),
        doors:doors.filter(d=>d.open||d.dir).map(d=>[d.id,d.open?1:0,d.dir||1]),
        circs:circs.map((c,i)=>(c.dead||c.hp<(c.k==='rock'?150:100))?[i,r0(c.hp),c.dead?1:0]:null).filter(Boolean),
        t:r2(time)
      };
    },
    flush(){const out=EV.slice();EV.length=0;return out},
    aliveCount(){return aliveCount},
    results(){
      return ents.map(e=>({id:e.pid,name:e.name,place:e.alive?1:e.place,kills:e.kills,alive:e.alive?1:0})).sort((a,b)=>a.place-b.place);
    },
    roundLen(cfg){const sm=STORMM[clamp(cfg[1]|0,0,2)];let s=0;for(let i=0;i<ZW.length;i++)s+=(ZW[i]+ZS[i])*sm;return s+PLANE_TS[clamp(cfg[0]|0,0,2)]+8+25},
    planeT(){return PLANE_T}
  };
  return R;
})();
