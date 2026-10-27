const $=id=>document.getElementById(id);
const cv=$('c'),ctx=cv.getContext('2d'),mm=$('mm'),mctx=mm.getContext('2d');
const css=getComputedStyle(document.documentElement);
const COL={};['sea','sand','grass','coral','violet','fg','good','warn','bad','shield'].forEach(k=>{COL[k]=css.getPropertyValue('--'+k).trim()});
let W=1,H=1,DPR=1,zoom=1;
function resize(){
  DPR=Math.min(2,window.devicePixelRatio||1);W=window.innerWidth;H=window.innerHeight;
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
  mm.width=Math.round(128*DPR);mm.height=Math.round(128*DPR);
  zoom=Math.max(.62,Math.min(1.1,Math.min(W,H)/760));
}
window.addEventListener('resize',resize);resize();

let rnd=Math.random;
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const TAU=Math.PI*2,rand=(a,b)=>a+rnd()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const dist2=(a,b)=>(a.x-b.x)*(a.x-b.x)+(a.y-b.y)*(a.y-b.y);
function angDiff(a,b){let d=(b-a)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d}
function turn(a,b,m){const d=angDiff(a,b);return Math.abs(d)<=m?b:a+Math.sign(d)*m}
const fmt=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');

/* custom switches (replaced by the saved profile settings on load) */
let S={sound:1,shake:1,minimap:1,names:1,autoPick:1,aim:0,fps:0,map:1,storm:1,loot:1,minP:2,cd:15,bots:1};
const ADM={god:0,ammo:0,rapid:0,one:0,speed:0,fast:0,nostorm:0,esp:0,wide:0};
/* NETMODE: null = solo, 'server' = headless authority in Node, 'client' = renders what the server says.
   NETHOOK is set by the server so every change to shared state (loot, crates, doors, trees, shots) is reported as an event. */
let NETMODE=(typeof __NET!=='undefined')?__NET:null,NETHOOK=null;
const admOn=k=>!!(ADM[k]&&P&&P.dev&&!mp);
const BOTN=[8,17,27],MAPS=[2200,3700,5600],PLANE_TS=[22,28,36],STORMM=[1.4,1,.7],LOOTMS=[.6,1,1.6];
const ROOF=['#7a4e45','#4f6577','#6d6a4a','#55565c','#7a5a2e','#4a6a58','#c68c5c','#b9473f','#6b4a32','#9cc3d6','#5d7a4c','#4a4036','#8b4f3a','#3d3b44','#a33b32','#dfe6ea'];
const NAMES=['Pip','Moss','Dash','Juno','Rook','Fizz','Nova','Bolt','Echo','Tango','Wren','Kip','Zed','Mako','Lux','Otto','Vex','Cleo','Hex','Rusty','Sable','Fern','Gus'];
const ZR=[1050,760,520,340,200,80],ZW=[20,18,16,14,12,10],ZS=[24,22,20,18,16,14];

let ISLAND=2300,CX=2390,CY=2390,MAPA=1,LOOTM=1,PLANE_T=23,ZRn=[],ZWn=[],ZSn=[];
function setMap(mi,si,li){
  mi=clamp(mi|0,0,2);si=clamp(si|0,0,2);li=clamp(li|0,0,2);
  ISLAND=MAPS[mi];CX=CY=ISLAND+90;MAPA=Math.pow(ISLAND/1520,2);LOOTM=LOOTMS[li];PLANE_T=PLANE_TS[mi];
  const k=ISLAND/1520,sm=STORMM[si];
  ZRn=ZR.map(r=>r*k);ZWn=ZW.map((w,i)=>w*sm+(i===0?PLANE_T+8:0));ZSn=ZS.map(s=>s*sm);
}
setMap(1,1,1);

let circs=[],blocks=[],decor=[],loot=[],ents=[],bullets=[],parts=[],feed=[],houses=[],doors=[],wins=[];
const doorOps=[];let matchT0=0;
let player=null,zone=null,aliveCount=0,time=0,shake=0,dmgFlash=0,hitmark=0,bannerT=0,endT=0,result=null;
let state='hub',paused=false,plane=null,mp=false;
const cam={x:CX,y:CY};
const SESS={shots:0,hits:0,dmg:0};
function resetSess(){SESS.shots=0;SESS.hits=0;SESS.dmg=0}
const addShake=v=>{shake=Math.max(shake,v*S.shake)};

/* ---------- audio ---------- */
let ac=null;
function initAudio(){if(!ac){try{ac=new (window.AudioContext||window.webkitAudioContext)()}catch(e){ac=null}}if(ac&&ac.state==='suspended'){try{ac.resume()}catch(e){}}}
function sfx(f,d,type,v,slide){
  if(!S.sound||!ac||ac.state!=='running')return;
  try{
    const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime;
    o.type=type||'square';o.frequency.setValueAtTime(f,t);
    if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f*slide),t+d);
    g.gain.setValueAtTime(v||.05,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+d);
  }catch(e){}
}
function shotSfx(e){
  const it=held(e),f=it&&it.type==='gun'?it.s.f:200;let v=.05;
  if((e.bot||e.remote)&&player){const d=Math.hypot(e.x-player.x,e.y-player.y);if(d>900)return;v=.05*(1-d/900)}
  if(v<.004)return;sfx(f,.09,'sawtooth',v,.35);
}

/* ---------- world ---------- */
let lootN=0,gid=0,gridOn=false,GW=1,cgrid=[],bgrid=[];
const EMPTY=[];
function rp(pad){const a=rand(0,TAU),d=Math.sqrt(rnd())*(ISLAND-pad);return{x:CX+Math.cos(a)*d,y:CY+Math.sin(a)*d}}
function cellOf(x,y){const gx=Math.floor(x/200),gy=Math.floor(y/200);return(gx<0||gy<0||gx>=GW||gy>=GW)?-1:gy*GW+gx}
function buildGrid(){
  GW=Math.ceil((CX*2+200)/200);cgrid=new Array(GW*GW);bgrid=new Array(GW*GW);
  const ins=(arr,o,x0,y0,x1,y1)=>{
    const a=Math.max(0,Math.floor(x0/200)),b=Math.min(GW-1,Math.floor(x1/200)),c=Math.max(0,Math.floor(y0/200)),d=Math.min(GW-1,Math.floor(y1/200));
    for(let gy=c;gy<=d;gy++)for(let gx=a;gx<=b;gx++){const i=gy*GW+gx;(arr[i]||(arr[i]=[])).push(o)}
  };
  for(const c of circs)ins(cgrid,c,c.x-c.cr-48,c.y-c.cr-48,c.x+c.cr+48,c.y+c.cr+48);
  for(const b of blocks)ins(bgrid,b,b.x-48,b.y-48,b.x+b.w+48,b.y+b.h+48);
}
function hitsWall(x,y,r,bm){
  r=r||0;
  let ca=circs,ba=blocks;
  if(gridOn){const i=cellOf(x,y);if(i<0)return false;ca=cgrid[i]||EMPTY;ba=bgrid[i]||EMPTY}
  for(const c of ca){if(c.dead)continue;const dx=x-c.x,dy=y-c.y,rr=r+c.cr;if(dx*dx+dy*dy<rr*rr)return true}
  for(const b of ba){if(b.open||bm&&(b.win||b.furn))continue;if(x>b.x-r&&x<b.x+b.w+r&&y>b.y-r&&y<b.y+b.h+r)return true}
  return false;
}
/* what a bullet runs into: trees (soak 100 damage, then fall), rocks, solid walls and closed doors. Windows and furniture let bullets pass. */
function bulletObs(x,y){
  let ca=circs,ba=blocks;
  if(gridOn){const i=cellOf(x,y);if(i<0)return null;ca=cgrid[i]||EMPTY;ba=bgrid[i]||EMPTY}
  for(const c of ca){if(c.dead)continue;const dx=x-c.x,dy=y-c.y,rr=c.k==='tree'?c.r*.62:c.cr;if(dx*dx+dy*dy<rr*rr)return c}
  for(const b of ba){if(b.open||b.win||b.furn)continue;if(x>b.x&&x<b.x+b.w&&y>b.y&&y<b.y+b.h)return b}
  return null;
}
function hurtTree(c,d){
  if(c.dead)return;
  const rk=c.k==='rock';
  if(NETMODE==='client'){c.hit=.14;burst(c.x,c.y,rk?'#a9b6b3':'#3a8a54',3,110,.35);return}
  c.hp-=d;c.hit=.14;burst(c.x,c.y,rk?'#a9b6b3':'#3a8a54',3,110,.35);
  if(c.hp<=0){
    c.dead=true;burst(c.x,c.y,rk?'#98a6a3':'#3a8a54',22,280,.8);burst(c.x,c.y,rk?'#6c7774':'#6b4a2b',8,160,.6);
    decor.push(rk?{x:c.x,y:c.y,c:'#6c7774',r:11}:{x:c.x,y:c.y,c:'#5d4126',r:9});
    if(player&&Math.hypot(player.x-c.x,player.y-c.y)<900)sfx(150,.18,'sawtooth',.05,.5);
  }
  if(NETHOOK)NETHOOK('tree',c);
}
function toggleDoor(d,local,who){
  if(Date.now()-d.ts<45)return;
  d.open=!d.open;d.ts=Date.now();
  if(NETMODE!=='server')burst(d.cx,d.cy,'#e6d5b0',3,70,.22);
  if(d.open&&who){
    /* swing away from whoever opens it: outwards when they stand inside, inwards when they are outside */
    const iv=d.side===0?[0,1]:d.side===2?[0,-1]:d.side===3?[1,0]:[-1,0];
    d.dir=((who.x-d.cx)*iv[0]+(who.y-d.cy)*iv[1])>0?-1:1;
  }
  if(!player||Math.hypot(player.x-d.x,player.y-d.y)<900)sfx(d.open?300:210,.07,'square',.03,.8);
  if(NETHOOK)NETHOOK('door',d);
}
const DOOR_REACH=74;
function nearestDoor(p,rng){
  let best=null,bd=rng;
  for(const d of doors){const dx=Math.max(d.x-p.x,0,p.x-(d.x+d.w)),dy=Math.max(d.y-p.y,0,p.y-(d.y+d.h)),q=Math.hypot(dx,dy);if(q<bd){bd=q;best=d}}
  return best?{d:best,q:bd}:null;
}
function houseAt(x,y){for(const h of houses)if(x>h.x&&x<h.x+h.w&&y>h.y&&y<h.y+h.h)return h;return null}
function freeSpot(pad,r){for(let i=0;i<60;i++){const p=rp(pad);if(!hitsWall(p.x,p.y,r))return p}return rp(pad)}
/* ---------- biomes: a seeded patchwork of regions, so every player sees the same land ---------- */
const BIOMES=[
  {n:'Meadow',g:'#3e8a52',dec:['#2d5c3d','#3f7a50','#4d8f5a'],rock:['#7d8b88','#98a6a3'],tree:1,rk:1,patch:'rgba(25,70,40,.28)'},
  {n:'Desert',g:'#d8be7c',dec:['#c9a85c','#e6d196','#b99a52'],rock:['#b89868','#d6ba88'],tree:.3,rk:1.1,patch:'rgba(184,140,70,.3)'},
  {n:'Tundra',g:'#dce7ee',dec:['#bcd0dc','#ffffff','#a9c3d3'],rock:['#8fb0c4','#c6deec'],tree:.75,rk:1,patch:'rgba(150,200,225,.45)'},
  {n:'Swamp',g:'#3d5f5a',dec:['#34513f','#5d7f5e','#2c4636'],rock:['#5d6b5a','#7b8c76'],tree:.9,rk:.6,patch:'rgba(18,46,66,.6)'},
  {n:'Badlands',g:'#b2704f',dec:['#8f5238','#c98a63','#7a4630'],rock:['#8a5a46','#b9795c'],tree:.18,rk:1.9,patch:'rgba(85,38,26,.32)'}];
let bseeds=[],biomeCv=null,biomeBox=null;
function genBiomes(){
  bseeds=[{x:CX,y:CY,b:0}];
  const n=Math.round(5+ISLAND/480),order=[];
  for(let i=0;i<n;i++)order.push(1+(i%4));
  for(let i=order.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));const t=order[i];order[i]=order[j];order[j]=t}
  for(let i=0;i<n;i++){
    let best=null,bd=-1;
    for(let k=0;k<30;k++){const p=rp(ISLAND*.05);let d=1e18;for(const s of bseeds)d=Math.min(d,Math.hypot(s.x-p.x,s.y-p.y));if(d>bd){bd=d;best=p}}
    bseeds.push({x:best.x,y:best.y,b:i%3===2?0:order[i]});
  }
  biomeCv=null;
}
function biomeAt(x,y){
  const wx=x+Math.sin(y*.0031+1.3)*170+Math.sin(y*.0113+.4)*55,wy=y+Math.sin(x*.0027+.7)*170+Math.sin(x*.0107+2.1)*55;
  let bi=0,bd=1e18;
  for(const s of bseeds){const dx=wx-s.x,dy=wy-s.y,d=dx*dx+dy*dy;if(d<bd){bd=d;bi=s.b}}
  return bi;
}
function hexRGB(h){h=(h||'#356b46').trim();if(h[0]!=='#'||h.length<7)return[53,107,70];return[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]}
function buildBiomeCv(){
  const cell=12,N=Math.ceil((ISLAND*2+160)/cell),ox=CX-ISLAND-80,oy=CY-ISLAND-80;
  const cv2=document.createElement('canvas');cv2.width=N;cv2.height=N;
  const g=cv2.getContext('2d'),im=g.createImageData(N,N),d=im.data;
  const cols=BIOMES.map(b=>hexRGB(b.g)),R2=(ISLAND+30)*(ISLAND+30);
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){
    const x=ox+i*cell+cell/2,y=oy+j*cell+cell/2,dx=x-CX,dy=y-CY;
    if(dx*dx+dy*dy>R2)continue;
    const wx=x+Math.sin(y*.0031+1.3)*170+Math.sin(y*.0113+.4)*55,wy=y+Math.sin(x*.0027+.7)*170+Math.sin(x*.0107+2.1)*55;
    let b1=-1,d1=1e18,d2=1e18;
    for(const s of bseeds){const ex=wx-s.x,ey=wy-s.y,dd=ex*ex+ey*ey;if(dd<d1){if(b1!==s.b)d2=d1;d1=dd;b1=s.b}else if(s.b!==b1&&dd<d2)d2=dd}
    let b2=b1;if(d2<1e17){for(const s of bseeds){if(s.b===b1)continue;const ex=wx-s.x,ey=wy-s.y;if(ex*ex+ey*ey===d2){b2=s.b;break}}}
    const m=b2===b1?0:Math.max(0,.5-Math.min(.5,(Math.sqrt(d2)-Math.sqrt(d1))/160)),ca=cols[b1],cb=cols[b2],
      c=[ca[0]+(cb[0]-ca[0])*m,ca[1]+(cb[1]-ca[1])*m,ca[2]+(cb[2]-ca[2])*m],n=(Math.sin(i*.31+j*.17)+Math.sin(i*.13-j*.29)+Math.sin(i*.07+j*.05)+Math.sin(i*1.7+j*2.3)*.3)*5,o=(j*N+i)*4;
    d[o]=Math.max(0,Math.min(255,c[0]+n));d[o+1]=Math.max(0,Math.min(255,c[1]+n));d[o+2]=Math.max(0,Math.min(255,c[2]+n));d[o+3]=255;
  }
  g.putImageData(im,0,0);
  biomeCv=cv2;biomeBox={x:ox,y:oy,s:N*cell};
}
function genWorld(seed){
  rnd=seed===undefined?Math.random:mulberry(seed);gid=0;gridOn=false;
  circs=[];blocks=[];decor=[];loot=[];
  genBiomes();
  const A=MAPA,nb=Math.min(70,Math.round(4.2*A)),HSC=2.24;houses=[];
  /* bw = how likely the type is in [meadow, desert, tundra, swamp, badlands] */
  const HT=[
    {n:'cabin',w:[300,400],h:[260,340],dw:118,nd:1,win:[1,2],furn:2,div:0,hue:0,T:20,bw:[3,1,2,2,1],fk:[0,1,3]},
    {n:'farmhouse',w:[430,540],h:[320,420],dw:118,nd:2,win:[2,3],furn:3,div:1,hue:1,T:20,bw:[3,0,1,1,0],fk:[0,1,2,3]},
    {n:'warehouse',w:[480,580],h:[300,380],dw:170,nd:2,win:[0,1],furn:2,div:0,hue:2,T:22,bw:[1,1,1,0,2],fk:[5,5,2]},
    {n:'bunker',w:[280,340],h:[260,300],dw:110,nd:1,win:[0,0],furn:1,div:0,hue:3,T:30,bw:[1,1,1,0,2],fk:[5,2]},
    {n:'shop',w:[400,500],h:[280,340],dw:118,nd:1,win:[2,3],furn:3,div:0,hue:4,T:20,bw:[2,1,1,0,0],fk:[4,4,2]},
    {n:'tower',w:[260,300],h:[260,300],dw:110,nd:1,win:[1,1],furn:1,div:0,hue:5,T:24,bw:[1,1,1,1,1],fk:[0,5]},
    {n:'barn',w:[520,620],h:[340,420],dw:200,nd:2,win:[0,1],furn:2,div:0,hue:14,T:20,bw:[2,0,0,0,0],fk:[5,5,2]},
    {n:'villa',w:[460,560],h:[360,440],dw:120,nd:2,win:[3,4],furn:4,div:1,hue:15,T:18,bw:[1,0,0,0,0],fk:[1,3,0,4]},
    {n:'adobe',w:[300,380],h:[280,340],dw:110,nd:1,win:[1,2],furn:2,div:0,hue:6,T:26,bw:[0,4,0,0,1],fk:[0,1,3]},
    {n:'bazaar',w:[500,620],h:[300,360],dw:160,nd:2,win:[2,3],furn:4,div:0,hue:7,T:16,bw:[0,2,0,0,0],fk:[4,4,5,0]},
    {n:'lodge',w:[380,480],h:[300,380],dw:118,nd:1,win:[2,3],furn:3,div:1,hue:8,T:24,bw:[0,0,4,0,0],fk:[0,1,2,3]},
    {n:'icehut',w:[240,300],h:[230,270],dw:100,nd:1,win:[1,1],furn:1,div:0,hue:9,T:22,bw:[0,0,2,0,0],fk:[3,5]},
    {n:'stilt',w:[260,340],h:[240,300],dw:104,nd:1,win:[2,2],furn:2,div:0,hue:10,T:16,bw:[0,0,0,4,0],fk:[0,3,5]},
    {n:'shack',w:[230,280],h:[220,250],dw:100,nd:1,win:[1,1],furn:1,div:0,hue:11,T:14,bw:[0,0,0,3,0],fk:[5,3]},
    {n:'fort',w:[520,640],h:[420,520],dw:150,nd:2,win:[0,0],furn:3,div:1,hue:12,T:34,bw:[0,0,0,0,3],fk:[5,5,2,4]},
    {n:'mine',w:[300,400],h:[240,300],dw:120,nd:1,win:[0,0],furn:2,div:0,hue:13,T:28,bw:[0,0,0,0,2],fk:[5,5,2]}];
  const FK=[['table',72,44,'#8a5f34'],['couch',96,38,'#5b4a7a'],['shelf',34,86,'#6b4a2b'],['bed',66,96,'#9a6b6b'],['counter',130,30,'#7a7f86'],['crate',44,44,'#a07a45']];
  doors=[];wins=[];doorOps.length=0;
  for(let i=0;i<nb*8&&houses.length<nb;i++){
    const p=rp(260),bm=biomeAt(p.x,p.y);
    let tot=0;for(const t of HT)tot+=t.bw[bm];let rr=rnd()*tot,ht=HT[0];for(const t of HT){rr-=t.bw[bm];if(rr<=0){ht=t;break}}
    const w=Math.round(rand(ht.w[0],ht.w[1])*HSC),h=Math.round(rand(ht.h[0],ht.h[1])*HSC),hs={x:p.x-w/2,y:p.y-h/2,w,h,hue:ht.hue,ra:1,doors:[],type:ht.n,bm};
    if(houses.some(o=>hs.x<o.x+o.w+120&&hs.x+hs.w+120>o.x&&hs.y<o.y+o.h+120&&hs.y+hs.h+120>o.y))continue;
    const T=ht.T,DOOR=ht.dw,WW=64,hue=ht.hue;
    const ops=[[],[],[],[]],s1=Math.floor(rand(0,4)),dsides=ht.nd===2?[s1,(s1+2)%4]:[s1];
    const dbl=DOOR>=120,D1=Math.min(dbl?DOOR/2:DOOR,72)*2;
    for(const s of dsides){const len=(s%2===0)?w:h,off=rand(50,len-50-D1*(dbl?2:1));ops[s].push({off,w:D1,k:'d',hd:0});if(dbl)ops[s].push({off:off+D1,w:D1,k:'d',hd:1})}
    for(let s=0;s<4;s++){
      const len=(s%2===0)?w:h,n=Math.floor(rand(ht.win[0],ht.win[1]+.999)*(ht.win[1]?2:1));
      for(let k=0;k<n;k++)for(let tr=0;tr<6;tr++){const off=rand(40,len-40-WW);if(ops[s].every(o=>off>o.off+o.w+30||off+WW+30<o.off)){ops[s].push({off,w:WW,k:'w'});break}}
    }
    const seg=(side,x0,y0,len,horiz)=>{
      const list=ops[side].sort((a,b)=>a.off-b.off);let cur=0;
      const wall=(a,l)=>{if(l<2)return;blocks.push(horiz?{x:x0+a,y:y0,w:l,h:T,hue,wall:1}:{x:x0,y:y0+a,w:T,h:l,hue,wall:1})};
      for(const o of list){
        wall(cur,o.off-cur);
        if(o.k==='w'){const bw=horiz?{x:x0+o.off,y:y0,w:o.w,h:T,hue,win:1}:{x:x0,y:y0+o.off,w:T,h:o.w,hue,win:1};blocks.push(bw);wins.push(bw)}
        else{
          const d=horiz?{x:x0+o.off,y:y0,w:o.w,h:T}:{x:x0,y:y0+o.off,w:T,h:o.w};
          Object.assign(d,{door:1,hue,open:false,ts:0,anim:0,side,horiz,id:doors.length,mir:o.hd===1?1:0});d.cx=d.x+d.w/2;d.cy=d.y+d.h/2;
          blocks.push(d);doors.push(d);if(o.hd===1){const q=doors[doors.length-2];q.pair=d;d.pair=q}
          hs.doors.push(horiz?{x:d.cx,y:y0+T/2,ox:d.cx,oy:y0+T/2+(side===0?-90:90),d}:{x:x0+T/2,y:d.cy,ox:x0+T/2+(side===3?-90:90),oy:d.cy,d});
        }
        cur=o.off+o.w;
      }
      wall(cur,len-cur);
    };
    seg(0,hs.x,hs.y,w,true);seg(2,hs.x,hs.y+h-T,w,true);seg(3,hs.x,hs.y,h,false);seg(1,hs.x+w-T,hs.y,h,false);
    if(ht.div){
      const dx=hs.x+w*rand(.38,.62),bad=[0,2].some(s=>ops[s].some(o=>o.k==='d'&&dx>hs.x+o.off-50&&dx<hs.x+o.off+o.w+50));
      if(!bad){const gap=rand(30,h-T*2-260);blocks.push({x:dx-7,y:hs.y+T,w:14,h:gap,hue,wall:1});blocks.push({x:dx-7,y:hs.y+T+gap+200,w:14,h:h-T*2-gap-200,hue,wall:1})}
    }
    for(let k=0;k<Math.ceil(ht.furn*.6);k++)for(let tr=0;tr<14;tr++){
      const kk=FK[ht.fk[Math.floor(rnd()*ht.fk.length)]],rot=rnd()<.5,fw=rot?kk[2]:kk[1],fh=rot?kk[1]:kk[2];
      const fx=rand(hs.x+T+34,hs.x+w-T-34-fw),fy=rand(hs.y+T+34,hs.y+h-T-34-fh);
      if(hs.doors.some(d=>Math.hypot(d.x-(fx+fw/2),d.y-(fy+fh/2))<170))continue;
      if(blocks.some(b=>!b.door&&fx<b.x+b.w+40&&fx+fw+40>b.x&&fy<b.y+b.h+40&&fy+fh+40>b.y))continue;
      blocks.push({x:fx,y:fy,w:fw,h:fh,hue,furn:kk[0],col:kk[3],rot:rot?1:0});break;
    }
    hs.fv=Math.floor(rnd()*4);hs.mat=Math.floor(rnd()*5);hs.rg=[rnd()*.3+.2,rnd()*.3+.2,rnd()*.25+.25,rnd()*.2+.2,Math.floor(rnd()*6)];hs.rx=[[rnd(),rnd(),Math.floor(rnd()*4)],[rnd(),rnd(),Math.floor(rnd()*4)]];hs.pl=rnd()<.6;
    houses.push(hs);
  }
  const nt=Math.round(100*A),nr=Math.round(40*A);
  const inH=(x,y,pad)=>houses.some(o=>x>o.x-pad&&x<o.x+o.w+pad&&y>o.y-pad&&y<o.y+o.h+pad);
  for(let i=0;i<Math.round(16*A);i++){const p=rp(30),bm=biomeAt(p.x,p.y);decor.push({x:p.x,y:p.y,c:BIOMES[bm].patch,r:rand(36,110)})}
  for(let i=0;i<nt;i++){
    const p=rp(50),bm=biomeAt(p.x,p.y);if(rnd()>BIOMES[bm].tree)continue;
    const r=bm===1?rand(17,26):bm===4?rand(26,38):rand(28,44);
    if(!hitsWall(p.x,p.y,r*.5)&&!inH(p.x,p.y,r+10))circs.push({x:p.x,y:p.y,r,cr:r*.5,k:'tree',hp:100,hit:0,bm});
  }
  for(let i=0;i<nr*2;i++){
    const p=rp(50),bm=biomeAt(p.x,p.y);if(rnd()>BIOMES[bm].rk/2)continue;
    const r=rand(24,48)*(bm===4?1.35:1);
    if(!hitsWall(p.x,p.y,r)&&!inH(p.x,p.y,r+10))circs.push({x:p.x,y:p.y,r,cr:r*.92,k:'rock',hp:150,max:150,hit:0,bm});
  }
  for(let i=0;i<Math.min(7000,Math.round(480*A));i++){const p=rp(10),bm=biomeAt(p.x,p.y),dc=BIOMES[bm].dec;decor.push({x:p.x,y:p.y,c:dc[Math.floor(rnd()*3)],r:rand(2,5)})}
  const nl=Math.round(17*A*LOOTM);
  for(let i=0;i<nl;i++)spawnLootRandom();
  for(const hs of houses){
    const n=1+Math.floor(rnd()*2);
    for(let k=0;k<n;k++){const x=rand(hs.x+50,hs.x+hs.w-50),y=rand(hs.y+50,hs.y+hs.h-50);if(!hitsWall(x,y,12))spawnLootRandom(x,y)}
    const d=hs.doors[0];if(d){const top=Math.abs(d.y-hs.y)<30,bot=Math.abs(d.y-hs.y-hs.h)<30,lft=Math.abs(d.x-hs.x)<30,x=d.x+(lft?-48:(top||bot)?0:48),y=d.y+(top?-48:bot?48:0);if(rnd()<.4&&!hitsWall(x,y,10))spawnLootRandom(x,y)}
  }
  genCrates(A);genAirs(A);
  buildGrid();gridOn=true;rnd=Math.random;
}
function resolve(e){
  let ca=circs,ba=blocks;
  if(gridOn){const i=cellOf(e.x,e.y);if(i>=0){ca=cgrid[i]||EMPTY;ba=bgrid[i]||EMPTY}else{ca=EMPTY;ba=EMPTY}}
  for(const c of ca){if(c.dead)continue;const dx=e.x-c.x,dy=e.y-c.y,rr=e.r+c.cr,d2=dx*dx+dy*dy;if(d2<rr*rr){const d=Math.sqrt(d2)||.01,k=(rr-d)/d;e.x+=dx*k;e.y+=dy*k}}
  for(const b of ba){
    if(b.open)continue;
    const nx=clamp(e.x,b.x,b.x+b.w),ny=clamp(e.y,b.y,b.y+b.h),dx=e.x-nx,dy=e.y-ny,d2=dx*dx+dy*dy;
    if(d2<e.r*e.r){
      if(d2<.0001){
        const l=e.x-b.x,r=b.x+b.w-e.x,t=e.y-b.y,bt=b.y+b.h-e.y,m=Math.min(l,r,t,bt);
        if(m===l)e.x=b.x-e.r;else if(m===r)e.x=b.x+b.w+e.r;else if(m===t)e.y=b.y-e.r;else e.y=b.y+b.h+e.r;
      }else{const d=Math.sqrt(d2),k=(e.r-d)/d;e.x+=dx*k;e.y+=dy*k}
    }
  }
  const dx=e.x-CX,dy=e.y-CY,d=Math.hypot(dx,dy),lim=ISLAND+60-e.r;
  if(d>lim){e.x=CX+dx/d*lim;e.y=CY+dy/d*lim}
}
function los(a,b){
  const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),n=Math.ceil(d/28);
  for(let i=1;i<n;i++){if(hitsWall(a.x+dx*i/n,a.y+dy*i/n,2,true))return false}
  return true;
}

/* ---------- plane and parachute ---------- */
function makePlane(seed){
  const R=mulberry((seed^0x51ed)>>>0),a=R()*TAU,off=(R()-.5)*ISLAND*.7,L=ISLAND+460;
  const dx=Math.cos(a),dy=Math.sin(a),px=-dy,py=dx;
  plane={dx,dy,ang:a,T:PLANE_T,sx:CX-dx*L+px*off,sy:CY-dy*L+py*off,speed:(2*L)/PLANE_T};
}
const planePos=t=>({x:plane.sx+plane.dx*plane.speed*t,y:plane.sy+plane.dy*plane.speed*t});
function jumpOut(e,t){
  const p=planePos(Math.min(t,PLANE_T));e.x=p.x;e.y=p.y;e.st=2;e.z=1;e.cut=false;e.boost=0;
  e.vx=plane.dx*plane.speed*.45;e.vy=plane.dy*plane.speed*.45;
  if(e===player)sfx(300,.4,'sine',.05,.4);
}
function airStep(e,dt,ix,iy){
  let spd;
  if(e.st===1){e.z-=dt*.6;spd=900;if(e.z<=.5){e.st=2;e.z=.5}}
  else{const bo=e.boost>0||!!e.bo||(e===player&&!!down['K:Space']);if(e.boost>0)e.boost-=dt;{let rt=bo?.6:.3;if(e.z<.25)rt=Math.min(rt,.05);e.z-=dt*rt}spd=bo?650:500}
  const l=Math.hypot(ix,iy),k=Math.min(1,dt*2.2),nx=l>1?ix/l:ix,ny=l>1?iy/l:iy;
  e.vx=lerp(e.vx,nx*spd,k);e.vy=lerp(e.vy,ny*spd,k);
  e.x+=e.vx*dt;e.y+=e.vy*dt;
  const dx=e.x-CX,dy=e.y-CY,d=Math.hypot(dx,dy),lim=ISLAND+60;
  if(d>lim){e.x=CX+dx/d*lim;e.y=CY+dy/d*lim}
  if(e.z<=0){e.z=0;e.st=3;e.vx*=.2;e.vy*=.2;resolve(e);burst(e.x,e.y,'#ffffff',10,160,.45)}
}

/* ---------- storm (solo and menu preview) ---------- */
function pickNext(){
  const r=ZRn[zone.phase],maxo=Math.max(0,zone.r-r)*.8,a=rand(0,TAU),d=Math.sqrt(Math.random())*maxo;
  zone.fcx=zone.cx;zone.fcy=zone.cy;zone.fr=zone.r;
  zone.ncx=zone.cx+Math.cos(a)*d;zone.ncy=zone.cy+Math.sin(a)*d;zone.nr=r;
}
function initZone(){zone={cx:CX,cy:CY,r:ISLAND+120,phase:0,t:0,state:'wait'};pickNext()}
function banner(msg,secs){const b=$('banner');b.textContent=msg;b.classList.add('on');bannerT=secs||3}
function updZone(dt){
  if(zone.state==='done')return;
  zone.t+=dt;
  if(zone.state==='wait'){
    if(zone.t>=ZWn[zone.phase]){zone.state='shrink';zone.t=0;if(state==='play')banner('The storm is closing in',3)}
  }else{
    const k=Math.min(1,zone.t/ZSn[zone.phase]);
    zone.cx=lerp(zone.fcx,zone.ncx,k);zone.cy=lerp(zone.fcy,zone.ncy,k);zone.r=lerp(zone.fr,zone.nr,k);
    if(k>=1){
      if(zone.phase>=ZRn.length-1){zone.state='done'}
      else{zone.phase++;zone.state='wait';zone.t=0;pickNext();if(state==='play')banner('New circle marked. Move in.',3)}
    }
  }
}

/* ---------- entities ---------- */
function mkEnt(x,y,bot,name,skin){
  return{x,y,vx:0,vy:0,r:25,hp:100,sh:0,inv:(()=>{const a=new Array(NSLOT).fill(null);a[0]=MELEE_ITEM;return a})(),sel:0,pouch:{light:0,shell:0,medium:0,heavy:0,rocket:0},rh:null,use:null,regenT:0,bq:0,bt:0,cd:0,ang:rand(0,TAU),bot,name,skin:skin|0,sub:0,kills:0,alive:true,hit:0,recoil:0,place:0,
    st:3,z:0,cut:false,dropAt:0,land:null,ml:0,bp:0,cp:0,swing:0,swA:0,mcd:0,ecd:0,emo:null,mc:0,ec:0,eg:-1,
    tgt:null,think:rand(0,.3),react:0,goal:null,wx:x,wy:y,strafe:1,st2:0,lx:x,ly:y,stk:0,stkT:0,acc:rand(.04,.12),off:rand(0,TAU),offd:rand(0,160)};
}
const cfgOfS=()=>[S.crate,S.gold,S.rarity,S.startGun,S.healSpd];
function giveStart(e){if(CFG.startGun)e.inv[1]=mkGun(0,0,48)}
function setupMatch(){
  setMap(S.map,S.storm,S.loot);setCfg(cfgOfS());booms.length=0;
  genWorld();bullets=[];parts=[];feed=[];ents=[];time=0;shake=0;dmgFlash=0;hitmark=0;endT=0;result=null;resetSess();
  makePlane(Math.floor(Math.random()*1e9));
  player=mkEnt(CX,CY,false,'You',P.skin);player.sub=isSub()?1:0;player.ml=P.so?0:P.melee;player.bp=P.pack;player.so=P.so?1:0;player.cp=P.chute;player.st=0;giveStart(player);ents.push(player);
  const nb=BOTN[clamp(S.bots|0,0,2)];
  for(let i=0;i<nb;i++){
    const b=mkEnt(CX,CY,true,NAMES[i%NAMES.length],Math.floor(Math.random()*100));
    b.st=0;b.dropAt=rand(350,850);b.bp=Math.floor(Math.random()*PACKS.length);b.cp=Math.random()<.5?0:Math.floor(Math.random()*PARAS.length);giveStart(b);
    const t=freeSpot(160,24);b.land=t;
    ents.push(b);
  }
  aliveCount=ents.length;initZone();cam.x=CX;cam.y=CY;
}
function setupPreview(){setMap(S.map,S.storm,S.loot);setCfg(cfgOfS());booms.length=0;genWorld();bullets=[];parts=[];feed=[];ents=[];player=null;initZone();cam.x=CX;cam.y=CY}

function grab(i,e){
  const l=loot[i];loot.splice(i,1);
  if(NETHOOK)NETHOOK('loot-',l,e);
}
const PICK_R=64;
function tryPickup(e,manual){
  if(NETMODE==='client'){if(manual&&e===player)netAct('use');return}
  if(e.st!==3)return;
  if(e===player&&!S.autoPick&&!manual)return;
  const R=manual?PICK_R:34,cand=[];
  for(let i=0;i<loot.length;i++){const l=loot[i],q=dist2(e,l);if(q>R*R)continue;if(!manual&&l.nt&&l.nt>performance.now())continue;cand.push([q,l])}
  if(!cand.length)return;
  cand.sort((a,c)=>a[0]-c[0]);
  for(const c of cand){
    const l=c[1];
    if(give(e,l,manual)){
      const i=loot.indexOf(l);if(i>=0)grab(i,e);
      if(!e.bot)sfx(l.type==='gun'?600:520,.08,'square',.04,1.4);
      if(manual)break;
    }
  }
}

/* ---------- combat ---------- */
function burst(x,y,col,n,sp,life){for(let i=0;i<n;i++){const a=rand(0,TAU),s=rand(.3,1)*sp;parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:life*rand(.6,1),max:life,col,r:rand(1.5,3.5)})}}
const dnums=[];
function popDmg(x,y,d,col){if(NETMODE==='server'||!(d>=1))return;dnums.push({x:x+rand(-10,10),y:y-18,v:Math.round(d),t:performance.now(),col:col||'#ffffff'});if(dnums.length>40)dnums.shift()}
function damage(e,d,from){
  if(!e.alive||NETMODE==='client')return;
  if(e===player&&admOn('god'))return;
  e.hit=.1;let rem=d;
  if(e.sh>0){const a=Math.min(e.sh,rem);e.sh-=a;rem-=a}
  e.hp-=rem;burst(e.x,e.y,e.sh>0?COL.shield:'#ffffff',4,140,.35);
  if(from===player&&e!==player){SESS.hits++;SESS.dmg+=d}
  if(e===player){addShake(5);dmgFlash=.3;sfx(120,.08,'square',.06,.5)}
  else if(from===player){hitmark=.15;sfx(900,.04,'square',.03);popDmg(e.x,e.y,d,e.sh>0?COL.shield:'#ffffff')}
  if(e.bot&&from&&from!==e)e.tgt=from;
  if(NETHOOK)NETHOOK('hit',e,from,d);
  if(e.hp<=0)kill(e,from);
}
function doMelee(e){
  if(NETMODE==='client')return;
  const m=MELEES[e.ml]||MELEES[0];
  e.mcd=m.cd;e.swing=.26;e.swA=e.ang;e.mc++;
  if(e===player)sfx(210,.09,'sawtooth',.05,.4);
  if(e.remote)return;
  for(const o of ents){
    if(o===e||!o.alive||o.st!==3||o.remote)continue;
    const dx=o.x-e.x,dy=o.y-e.y,d=Math.hypot(dx,dy);
    if(d>m.rng+o.r||Math.abs(angDiff(e.ang,Math.atan2(dy,dx)))>.95)continue;
    if(!los(e,o))continue;
    damage(o,m.dmg,e);burst(o.x,o.y,'#ffd166',5,170,.3);
  }
  for(const c of crates.slice()){
    const dx=c.x-e.x,dy=c.y-e.y,d=Math.hypot(dx,dy);
    if(d>m.rng+c.r+6||Math.abs(angDiff(e.ang,Math.atan2(dy,dx)))>1.05)continue;
    hurtCrate(c,m.dmg*1.2,true);
  }
}
function kill(e,from){
  if(!e.alive||NETMODE==='client')return;
  if(NETMODE==='server'){srvKill(e,from);return}
  if(mp&&e===player){mpKill(from);return}
  e.alive=false;e.hp=0;aliveCount--;
  if(from&&from!==e){from.kills++;if(from.bot&&Math.random()<.45)from.emo={g:EMOTES[Math.floor(Math.random()*EMOTES.length)].g,t:2.6}}
  const by=from&&from!==e?from.name:'The storm';
  feed.push({t:5,txt:by+' eliminated '+(e===player?'you':e.name)});
  dropList(e).forEach((it,k)=>{const a=k*2.1+.5;addLoot(e.x+Math.cos(a)*18,e.y+Math.sin(a)*18,dropDesc(it))});
  burst(e.x,e.y,'#ffffff',18,260,.7);
  if(e===player){player.place=aliveCount+1;finish(false)}
  else if(aliveCount===1&&player.alive){player.place=1;finish(true)}
}
function finish(win){if(result)return;result={win,place:win?1:player.place,kills:player.kills,t:time};endT=win?1.2:1.6}
function stormHurt(e,dt){
  if(NETMODE==='client')return;
  if(e===player&&(admOn('god')||admOn('nostorm')))return;
  e.hp-=(2+zone.phase*2)*dt;e.hit=Math.max(e.hit,.05);
  if(e===player)dmgFlash=Math.max(dmgFlash,.12);
  if(e.hp<=0)kill(e,null);
}
/* Online rule: each player's own client decides hits on that player, so a bullet only hurts the local player. */
function bulletHit(b,e){
  if(e.st!==3)return false;
  if(b.k===GOLDM4&&NETMODE!=='server'){burst(b.x,b.y,'#ffc93a',6,160,.35);burst(b.x,b.y,'#0b0906',6,160,.35)}
  if(NETMODE==='client'){burst(b.x,b.y,'#ffffff',4,120,.25);return true}
  if(!mp){damage(e,b.dmg,b.o);return true}
  if(e===player){if(b.o!==player){damage(e,b.dmg,b.o);return true}return false}
  if(e.remote&&b.o===player){burst(b.x,b.y,'#ffffff',4,120,.25);popDmg(e.x,e.y,b.dmg,'#ffffff');hitmark=.15;SESS.hits++;SESS.dmg+=b.dmg;return true}
  return false;
}
function updBullets(dt){
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i],steps=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/12)),sdt=dt/steps,mine=b.o===player||(b.o&&b.o.bot)||NETMODE==='server'||NETMODE==='client';
    let dead=false;
    for(let s=0;s<steps&&!dead;s++){
      b.x+=b.vx*sdt;b.y+=b.vy*sdt;
      if(b.k===GOLDM4&&NETMODE!=='server'&&s===0&&Math.random()<.7){const q=Math.random()<.5;parts.push({x:b.x,y:b.y,vx:rand(-45,45),vy:rand(-45,45),life:.35,max:.35,col:q?'#ffc93a':'#0b0906',r:rand(1.6,3.2)})}
      const ob=bulletObs(b.x,b.y);
      if(ob){if(b.pj)explode(b.x,b.y,b.boom,b.o);else{burst(b.x,b.y,b.col,3,90,.25);if(b.k===GOLDM4)burst(b.x,b.y,'#0b0906',4,110,.3);if(ob.k==='tree'||ob.k==='rock')hurtTree(ob,b.dmg)}dead=true;break}
      for(const e of ents){
        if(!e.alive||e===b.o||e.st!==3&&!b.pj)continue;
        if(b.hs&&b.hs.has(e))continue;
        const dx=e.x-b.x,dy=e.y-b.y,rr=e.r+3;
        if(dx*dx+dy*dy<rr*rr){
          if(b.pj){if(e.st!==3)continue;explode(b.x,b.y,b.boom,b.o);dead=true;break}
          if(bulletHit(b,e)){if(b.pierce){(b.hs||(b.hs=new Set())).add(e)}else{dead=true;break}}
        }
      }
      if(!dead&&mine){
        for(const c of crates){
          const dx=c.x-b.x,dy=c.y-b.y;
          if(dx*dx+dy*dy<(c.r+3)*(c.r+3)){
            if(b.pj)explode(b.x,b.y,b.boom,b.o);else{hurtCrate(c,b.dmg,true)}
            if(!b.pierce||b.pj)dead=true;
            break;
          }
        }
      }
    }
    b.life-=dt;
    if(!dead&&b.life<=0&&b.pj){explode(b.x,b.y,b.boom,b.o);dead=true}
    if(dead||b.life<=0)bullets.splice(i,1);
  }
  for(let i=booms.length-1;i>=0;i--){booms[i].t+=dt;if(booms[i].t>.45)booms.splice(i,1)}
}
function updParts(dt){
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.9;p.vy*=.9;p.life-=dt;if(p.life<=0)parts.splice(i,1)}
}

/* ---------- skins, weapons, plane: shared drawing code ---------- */
const ADJ=['Neon','Crimson','Frosty','Solar','Lunar','Mossy','Rusty','Velvet','Cosmic','Electric','Arctic','Golden','Shadow','Coral','Jade','Amber','Violet','Stormy','Dusty','Glitchy'];
const NOUN=['Fox','Ranger','Panda','Falcon','Wizard','Pirate','Ninja','Robot','Viking','Dragon','Cactus','Otter','Knight','Comet','Yeti','Gecko','Bandit','Pilot','Sphinx','Wolf','Mantis','Koala','Raven','Golem','Tiger'];
const HEADS=['#f1c9a5','#d9a07a','#a9714f','#7a4b34','#f4d9c0','#c8b6ff','#9be3c9','#cfd8dc'];
const RCOL=['#9db3ac','#5cc8ff','#b07cff','#ffb02e'],RNAME=['Common','Rare','Epic','Legendary'],RPRICE=[150,400,900,2000];
const PATN=['Solid','Stripes','Dots','Camo','Checker','Chevron','Split'];
const HATN=['Bare','Cap','Helmet','Horns','Ears','Mohawk','Halo','Crown','Visor','Antenna'];
const CHUTEN=['Panels','Rings','Star','Dots','Checker'];
const SKINS=(function(){
  const R=mulberry(20261010),out=[],used=new Set(),order=[],rar=[];
  for(let i=0;i<100;i++)order.push(i);
  for(let i=99;i>0;i--){const j=Math.floor(R()*(i+1)),t=order[i];order[i]=order[j];order[j]=t}
  order.forEach((id,k)=>{rar[id]=k<10?3:k<30?2:k<60?1:0});
  for(let i=0;i<6;i++)rar[i]=0;
  for(let i=0;i<100;i++){
    let name;
    do{name=ADJ[Math.floor(R()*ADJ.length)]+' '+NOUN[Math.floor(R()*NOUN.length)]}while(used.has(name));
    used.add(name);
    const hue=Math.round((i*137.508)%360),r=rar[i],sat=42+r*12,lig=52+(i%3)*4,h2=(hue+140+(i*13)%80)%360;
    out.push({
      id:i,name,rarity:r,
      src:i<6?'default':i<16?'free':i<41?'prem':i<61?'sub':'shop',
      tier:i<6?0:i<16?(i-5)*5:i<41?(i-15)*2:0,
      body:'hsl('+hue+' '+sat+'% '+lig+'%)',dark:'hsl('+hue+' '+sat+'% '+(lig-24)+'%)',
      accent:'hsl('+h2+' '+(62+r*8)+'% '+(60+(i%2)*6)+'%)',head:HEADS[Math.floor(R()*HEADS.length)],
      pat:Math.floor(R()*7),hat:Math.floor(R()*10),
      chute:{c1:'hsl('+((hue+200)%360)+' 70% '+(52+r*3)+'%)',c2:'hsl('+((hue+20+Math.floor(R()*90))%360)+' 75% 72%)',pat:Math.floor(R()*5)}
    });
  }
  Object.assign(out[0],{name:'Ember',body:'#ff6b4a',dark:'#c2432a',accent:'#ffd166',pat:0,hat:1,head:'#f1c9a5'});
  return out;
})();
/* skin 99: Azure Warden, drawn from the supplied artwork (background removed) as the helmet and shoulder wings */
Object.assign(SKINS[99],{name:'Azure Warden',rarity:3,src:'shop',tier:0,body:'#2f5fe0',dark:'#1f3fae',accent:'#f2f5ff',pat:5,head:'#2f5fe0',hat:0,helm:1,
  chute:{c1:'#2f5fe0',c2:'#f2f5ff',pat:2}});
/* more Warden-style skins: shoulder wings and a crested helm, drawn in code. They take the slots just below Azure Warden. */
[
 ['Crimson Warden','#c4352e','#7d1d19','#ffe6d5','feather','fin','#ff5a4a','#ffd7b0','star'],
 ['Verdant Warden','#2f8f4a','#1d5a2f','#e6ffd9','leaf','plume','#4fcf6a','#d6ff9a','flower'],
 ['Solar Warden','#e0a82a','#a06f10','#fff6c8','ray','ring','#ffd23f','#ff8a1f','sun'],
 ['Void Warden','#4a2a7a','#25133f','#e2c8ff','bat','horns','#7a4ac8','#1a0d2e','bat'],
 ['Frost Warden','#5bb8e8','#2a7aa8','#ffffff','crystal','fin','#bdeaff','#ffffff','hex'],
 ['Ember Warden','#d4501f','#8a2a0f','#ffe08a','flame','plume','#ff7a2a','#ffd23f','sun'],
 ['Jade Samurai','#2fa387','#1a6a58','#e8fff8','plate','horns','#38c9a4','#f2e6a0','diamond'],
 ['Storm Warden','#2a8fb0','#175a74','#d8fbff','bolt','fin','#4fe0ff','#fff27a','delta'],
 ['Rose Warden','#d9578f','#963060','#ffe3f1','petal','ring','#ff8ab8','#ffd1e6','heart']
].forEach((d,i)=>{
  const id=90+i;
  Object.assign(SKINS[id],{name:d[0],rarity:3,src:i%3===1?'sub':'shop',tier:0,body:d[1],dark:d[2],accent:d[3],pat:5,head:d[1],hat:0,helm:0,
    wd:{wing:d[4],crest:d[5],A:d[6],B:d[7]},chute:{c1:d[1],c2:d[3],pat:2,sh:d[8]}});
});
function drawWardenWings(c,sk,r,fl){
  const w=sk.wd,n=5;
  c.save();c.lineJoin='round';c.lineWidth=Math.max(1.4,r*.07);c.strokeStyle='rgba(0,0,0,.5)';
  for(const s of[-1,1])for(let k=n-1;k>=0;k--){
    c.save();c.translate(-r*.1,s*r*.72);c.rotate(-s*(.3+k*.3));
    const L=r*(2.1-k*.2),col=fl?'#ffffff':(k%2?w.B:w.A);c.fillStyle=col;c.beginPath();
    switch(w.wing){
      case 'leaf':c.moveTo(0,0);c.quadraticCurveTo(-L*.5,-r*.42,-L,0);c.quadraticCurveTo(-L*.5,r*.42,0,0);break;
      case 'ray':c.moveTo(0,-r*.14);c.lineTo(-L*1.1,0);c.lineTo(0,r*.14);c.closePath();break;
      case 'crystal':c.moveTo(0,0);c.lineTo(-L*.45,-r*.2);c.lineTo(-L,0);c.lineTo(-L*.45,r*.2);break;
      case 'flame':c.moveTo(0,0);c.quadraticCurveTo(-L*.5,-r*.4,-L,s*r*.12);c.quadraticCurveTo(-L*.55,r*.35,0,0);break;
      case 'plate':rrect(c,-L,-r*.2,L,r*.4,r*.18);break;
      case 'bolt':c.moveTo(0,-r*.1);c.lineTo(-L*.3,-r*.22);c.lineTo(-L*.45,r*.1);c.lineTo(-L*.75,-r*.12);c.lineTo(-L,r*.04);c.lineTo(-L*.7,r*.2);c.lineTo(-L*.4,r*.2);c.lineTo(-L*.2,r*.14);break;
      case 'petal':c.ellipse(-L*.5,0,L*.5,r*.3,0,0,TAU);break;
      case 'bat':c.moveTo(0,0);c.lineTo(-L*.3,-r*.3);c.lineTo(-L*.55,-r*.12);c.lineTo(-L*.8,-r*.3);c.lineTo(-L,0);c.lineTo(-L*.5,r*.26);break;
      default:c.ellipse(-L/2,0,L/2,r*.2,0,0,TAU);
    }
    c.closePath();c.fill();c.stroke();c.restore();
  }
  c.restore();
}
function drawWardenHelm(c,sk,r,fl){
  const w=sk.wd,hx=r*.12,hr=r*.6;
  c.save();c.lineJoin='round';c.lineWidth=2;c.strokeStyle='rgba(0,0,0,.5)';
  c.fillStyle=fl?'#ffffff':sk.body;c.beginPath();c.arc(hx,0,hr,0,TAU);c.fill();c.stroke();
  c.fillStyle=fl?'#eeeeee':sk.dark;c.beginPath();c.moveTo(hx+hr*.1,-hr*.5);c.lineTo(hx+hr*.95,-hr*.28);c.lineTo(hx+hr*.95,hr*.28);c.lineTo(hx+hr*.1,hr*.5);c.closePath();c.fill();
  c.fillStyle=fl?'#ffffff':w.B;c.fillRect(hx+hr*.55,-hr*.08,hr*.4,hr*.16);
  const A=fl?'#ffffff':w.A;c.fillStyle=A;
  if(w.crest==='fin'){c.beginPath();c.moveTo(hx+hr*.5,0);c.lineTo(hx-hr*.2,-hr*.14);c.lineTo(hx-hr*1.15,0);c.lineTo(hx-hr*.2,hr*.14);c.closePath();c.fill();c.stroke()}
  else if(w.crest==='plume'){for(let k=0;k<3;k++){c.beginPath();c.moveTo(hx,0);c.quadraticCurveTo(hx-hr*(.7+k*.1),(k-1)*hr*.5,hx-hr*(1.5-k*.1)*(1),(k-1)*hr*.3);c.quadraticCurveTo(hx-hr*.6,(k-1)*hr*.15+hr*.15,hx,0);c.fillStyle=k===1?(fl?'#fff':w.B):A;c.fill();c.stroke()}}
  else if(w.crest==='horns'){for(const q of[-1,1]){c.beginPath();c.moveTo(hx+hr*.1,q*hr*.45);c.quadraticCurveTo(hx+hr*.5,q*hr*1.2,hx+hr*1.1,q*hr*.95);c.quadraticCurveTo(hx+hr*.6,q*hr*.85,hx+hr*.45,q*hr*.45);c.closePath();c.fill();c.stroke()}}
  else{c.lineWidth=hr*.14;c.strokeStyle=A;c.beginPath();c.arc(hx,0,hr*.82,0,TAU);c.stroke();c.lineWidth=2;c.strokeStyle='rgba(0,0,0,.5)';c.beginPath();c.arc(hx,0,hr,0,TAU);c.stroke()}
  c.restore();
}
const skinOf=i=>SKINS[(i|0)>=0&&(i|0)<100?(i|0):0];

function rrect(c,x,y,w,h,r){
  c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);
  c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath();
}
function drawHat(c,h,r,sk){
  const hx=r*.12,hr=r*.58;
  c.lineWidth=2;c.strokeStyle='rgba(0,0,0,.45)';
  if(h===1){
    c.fillStyle=sk.accent;c.beginPath();c.arc(hx,0,hr*1.02,0,TAU);c.fill();c.stroke();
    rrect(c,hx+hr*.55,-hr*.62,hr*.7,hr*1.24,hr*.2);c.fill();c.stroke();
  }else if(h===2){
    c.fillStyle=sk.dark;c.beginPath();c.arc(hx,0,hr*1.1,0,TAU);c.fill();c.stroke();
    c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=3;c.beginPath();c.arc(hx,0,hr*.8,Math.PI*1.1,Math.PI*1.7);c.stroke();
  }else if(h===3){
    c.fillStyle='#f4efe2';
    for(const s of [-1,1]){c.beginPath();c.moveTo(hx-hr*.1,s*hr*.75);c.lineTo(hx+hr*.7,s*hr*1.75);c.lineTo(hx+hr*.55,s*hr*.65);c.closePath();c.fill();c.stroke()}
  }else if(h===4){
    for(const s of [-1,1]){c.fillStyle=sk.dark;c.beginPath();c.arc(hx-hr*.1,s*hr*.95,hr*.38,0,TAU);c.fill();c.stroke();c.fillStyle=sk.accent;c.beginPath();c.arc(hx-hr*.1,s*hr*.95,hr*.18,0,TAU);c.fill()}
  }else if(h===5){
    c.fillStyle=sk.accent;rrect(c,hx-hr*.95,-hr*.16,hr*1.9,hr*.32,hr*.14);c.fill();c.stroke();
  }else if(h===6){
    c.strokeStyle='#ffd166';c.lineWidth=3.5;c.beginPath();c.arc(hx,0,hr*1.28,0,TAU);c.stroke();
  }else if(h===7){
    c.fillStyle='#ffd166';c.beginPath();
    for(let k=0;k<6;k++){const a=-Math.PI*.5+k*(Math.PI/5);c.lineTo(hx+Math.cos(a)*hr*.55+hr*.15,Math.sin(a)*hr*1.05);c.lineTo(hx+Math.cos(a+Math.PI/10)*hr*.25+hr*.15,Math.sin(a+Math.PI/10)*hr*.6)}
    c.lineTo(hx-hr*.3,hr*.2);c.lineTo(hx-hr*.3,-hr*.2);c.closePath();c.fill();c.stroke();
  }else if(h===8){
    c.fillStyle='rgba(20,30,40,.88)';rrect(c,hx+hr*.05,-hr*.88,hr*.62,hr*1.76,hr*.22);c.fill();c.stroke();
    c.fillStyle='rgba(120,220,255,.55)';c.fillRect(hx+hr*.25,-hr*.7,hr*.1,hr*1.4);
  }else if(h===9){
    c.strokeStyle=sk.dark;c.lineWidth=3;c.beginPath();c.moveTo(hx-hr*.3,0);c.lineTo(hx-hr*1.4,-hr*1.0);c.stroke();
    c.fillStyle=sk.accent;c.beginPath();c.arc(hx-hr*1.4,-hr*1.0,hr*.22,0,TAU);c.fill();c.stroke();
  }
}
/* pre-scaled copies of the artwork (halved step by step) so it stays sharp at every size */
const AZ_LV=[];
function azLevel(need){
  if(!AZ_LV.length){
    let w=AZURE_IMG.naturalWidth,h=AZURE_IMG.naturalHeight;AZ_LV.push({w,h,img:AZURE_IMG});
    while(w>48){
      w=Math.round(w/2);h=Math.round(h/2);
      const cv=document.createElement('canvas');cv.width=w;cv.height=h;const x=cv.getContext('2d');
      x.imageSmoothingQuality='high';x.drawImage(AZ_LV[AZ_LV.length-1].img,0,0,w,h);AZ_LV.push({w,h,img:cv});
    }
  }
  let best=AZ_LV[0];for(const l of AZ_LV)if(l.w>=need)best=l;return best;
}
function drawChar(c,sk,r,o){
  o=o||{};
  const body=o.flash?'#ffffff':sk.body,dark=o.flash?'#e6e6e6':sk.dark;
  c.lineJoin='round';c.lineWidth=2;c.strokeStyle='rgba(0,0,0,.45)';
  c.fillStyle=dark;rrect(c,-r*1.05,-r*.5,r*.6,r,r*.2);c.fill();c.stroke();
  c.fillStyle=body;c.beginPath();c.ellipse(-r*.05,0,r*.72,r*.98,0,0,TAU);c.fill();c.stroke();
  if(!o.flash&&sk.pat){
    const p=sk.pat;
    c.save();c.beginPath();c.ellipse(-r*.05,0,r*.72,r*.98,0,0,TAU);c.clip();c.fillStyle=sk.accent;c.strokeStyle=sk.accent;
    if(p===1){c.lineWidth=r*.18;for(let k=-3;k<=3;k++){c.beginPath();c.moveTo(-r+k*r*.4,-r);c.lineTo(r*.4+k*r*.4,r);c.stroke()}}
    else if(p===2){for(let a=0;a<9;a++){c.beginPath();c.arc(-r*.6+(a%3)*r*.55,-r*.7+Math.floor(a/3)*r*.7,r*.13,0,TAU);c.fill()}}
    else if(p===3){c.globalAlpha=.8;[[-.3,-.5,.3],[.2,.3,.34],[-.4,.55,.25],[.35,-.45,.22]].forEach(b=>{c.beginPath();c.arc(b[0]*r,b[1]*r,b[2]*r,0,TAU);c.fill()});c.globalAlpha=1}
    else if(p===4){for(let i=0;i<4;i++)for(let j=0;j<4;j++)if((i+j)%2===0)c.fillRect(-r+i*r*.5,-r+j*r*.5,r*.5,r*.5)}
    else if(p===5){c.lineWidth=r*.16;for(let k=0;k<3;k++){c.beginPath();c.moveTo(-r*.6,-r*.55+k*r*.55);c.lineTo(0,-r*.15+k*r*.55);c.lineTo(r*.6,-r*.55+k*r*.55);c.stroke()}}
    else if(p===6){c.fillRect(-r,-r,r*2,r)}
    c.restore();
  }
  if(sk.wd)drawWardenWings(c,sk,r,!!o.flash);
  if(sk.wd){drawWardenHelm(c,sk,r,!!o.flash);return}
  if(sk.gold&&typeof drawGoldHead==='function'&&drawGoldHead(c,sk,r,o))return;
  if(sk.helm&&AZURE_IMG.complete&&AZURE_IMG.naturalWidth){
    c.save();c.translate(r*.1,0);c.rotate(-Math.PI/2);
    const w=r*3.1,h=w*AZURE_IMG.naturalHeight/AZURE_IMG.naturalWidth,tm=c.getTransform?c.getTransform():null,sc=tm?Math.hypot(tm.a,tm.b):1;
    c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
    c.drawImage(azLevel(w*sc).img,-w/2,-h*.48,w,h);
    if(o.flash){c.globalAlpha=.55;c.fillStyle='#ffffff';c.beginPath();c.arc(0,0,r*.6,0,TAU);c.fill()}
    c.restore();return;
  }
  c.fillStyle=o.flash?'#ffffff':sk.head;c.strokeStyle='rgba(0,0,0,.45)';c.lineWidth=2;
  c.beginPath();c.arc(r*.12,0,r*.58,0,TAU);c.fill();c.stroke();
  c.fillStyle='#10201f';c.beginPath();c.arc(r*.52,-r*.2,r*.09,0,TAU);c.arc(r*.52,r*.2,r*.09,0,TAU);c.fill();
  if(!o.flash)drawHat(c,sk.hat,r,sk);
}
const chuteSkin=(sk,cp)=>cp>0&&PARAS[cp]?{chute:PARAS[cp]}:sk;
/* canopy outlines: every shape is a list of points around the middle so panels, patterns and ropes work on any of them */
function chutePts(sh,R){
  const P=[],N=96,sg=Math.sign,ab=Math.abs,pw=Math.pow;
  const poly=(v)=>{for(let i=0;i<v.length;i++){const a=v[i],b=v[(i+1)%v.length];for(let k=0;k<12;k++)P.push([(a[0]+(b[0]-a[0])*k/12)*R,(a[1]+(b[1]-a[1])*k/12)*R])}};
  if(sh==='bat'){const h=[[.95,-.45],[.5,-1.05],[.15,-.7],[-.15,-1.1],[-.4,-.6],[-.8,-.95]];poly([[.7,0]].concat(h,[[-.85,0]],h.slice().reverse().map(p=>[p[0],-p[1]])));return P}
  if(sh==='delta'){poly([[1.1,0],[-.6,1.15],[-.3,0],[-.6,-1.15]]);return P}
  if(sh==='hex'){poly([0,1,2,3,4,5].map(k=>[Math.cos(k*Math.PI/3),Math.sin(k*Math.PI/3)]));return P}
  if(sh==='diamond'){poly([[1.1,0],[0,.8],[-1.1,0],[0,-.8]]);return P}
  if(sh==='cross'){poly([[.4,.4],[1,.4],[1,-.4],[.4,-.4],[.4,-1],[-.4,-1],[-.4,-.4],[-1,-.4],[-1,.4],[-.4,.4],[-.4,1],[.4,1]]);return P}
  for(let i=0;i<N;i++){
    const t=i*Math.PI*2/N,c=Math.cos(t),s=Math.sin(t);let x,y;
    if(sh==='ram'){x=1.25*sg(c)*pw(ab(c),.6);y=.8*sg(s)*pw(ab(s),.6)}
    else if(sh==='star'){const r=.46+.54*pw(ab(Math.cos(2.5*t)),1.6);x=c*r;y=s*r}
    else if(sh==='flower'){const r=.72+.28*Math.cos(6*t);x=c*r;y=s*r}
    else if(sh==='cloud'){const r=.78+.22*ab(Math.cos(3.5*t));x=c*r*1.1;y=s*r*.9}
    else if(sh==='clover'){const r=.4+.6*pw(ab(Math.cos(2*t)),.55);x=c*r;y=s*r}
    else if(sh==='sun'){const k=((t*6/Math.PI)%2+2)%2,r=.62+.38*ab(k-1);x=c*r;y=s*r}
    else if(sh==='heart'){const u=Math.sin(t),X=16*u*u*u,Y=13*c-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);x=-(Y-2)/15;y=X/15}
    else if(sh==='drop'){x=c*(1+.28*c);y=s*.86*(1-.12*c)}
    else{x=c;y=s}
    P.push([x*R,y*R]);
  }
  return P;
}
const _cpc={};
function chuteShape(sk,R){const sh=sk.chute.sh||'round',k=sh+'|'+Math.round(R);return _cpc[k]||(_cpc[k]=chutePts(sh,R))}
function drawChute(c,sk,R){
  const ch=sk.chute,P=chuteShape(sk,R),n=P.length;
  const path=()=>{c.beginPath();P.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath()};
  const M=R*1.25;
  c.save();path();c.clip();
  for(let i=0;i<8;i++){
    c.fillStyle=i%2?ch.c2:ch.c1;c.beginPath();c.moveTo(0,0);
    for(let k=Math.floor(i*n/8);k<=Math.floor((i+1)*n/8);k++){const p=P[k%n];c.lineTo(p[0],p[1])}
    c.closePath();c.fill();
  }
  c.fillStyle='rgba(255,255,255,.55)';c.strokeStyle='rgba(255,255,255,.55)';
  if(ch.pat===1){c.lineWidth=R*.07;for(const k of [.35,.65]){c.beginPath();c.arc(0,0,R*k,0,TAU);c.stroke()}}
  else if(ch.pat===2){c.beginPath();for(let k=0;k<10;k++){const a=k*Math.PI/5-Math.PI/2,rr=k%2?R*.2:R*.5;c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}c.closePath();c.fill()}
  else if(ch.pat===3){for(let k=0;k<8;k++){c.beginPath();c.arc(Math.cos(k*TAU/8)*R*.62,Math.sin(k*TAU/8)*R*.62,R*.09,0,TAU);c.fill()}}
  else if(ch.pat===4){for(let k=0;k<16;k++){if(k%2===0){c.beginPath();c.arc(0,0,R*.9,k*TAU/16,(k+1)*TAU/16);c.arc(0,0,R*.6,(k+1)*TAU/16,k*TAU/16,true);c.closePath();c.fill()}}}
  c.restore();
  c.strokeStyle='rgba(0,0,0,.4)';c.lineWidth=2;c.lineJoin='round';path();c.stroke();
  c.lineWidth=1.5;c.strokeStyle='rgba(0,0,0,.3)';
  for(let i=0;i<8;i++){const p=P[Math.floor(i*n/8)%n];c.beginPath();c.moveTo(0,0);c.lineTo(p[0],p[1]);c.stroke()}
}
function drawRopes(c,R,r,sk){
  const P=sk&&sk.chute?chuteShape(sk,R):null,n=P?P.length:0;
  c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=1.5;
  for(let i=0;i<8;i++){const a=i*TAU/8,p=P?P[Math.floor(i*n/8)%n]:[Math.cos(a)*R,Math.sin(a)*R];c.beginPath();c.moveTo(p[0]*.92,p[1]*.92);c.lineTo(Math.cos(a)*r*.4,Math.sin(a)*r*.4);c.stroke()}
}

/* weapons: drawn pointing along +x from the hand position */
function drawGoldBullet(c,b){
  const sp=Math.hypot(b.vx,b.vy)||1,ux=b.vx/sp,uy=b.vy/sp,L=120,tx=b.x-ux*L,ty=b.y-uy*L,t=performance.now()/1000;
  c.save();c.lineCap='round';
  /* black sleeve with a glowing gold core */
  c.globalAlpha=.8;c.strokeStyle='#0b0906';c.lineWidth=9;c.beginPath();c.moveTo(tx,ty);c.lineTo(b.x,b.y);c.stroke();
  const g=c.createLinearGradient(tx,ty,b.x,b.y);g.addColorStop(0,'rgba(255,201,58,0)');g.addColorStop(1,'rgba(255,214,90,1)');
  c.globalAlpha=1;c.strokeStyle=g;c.lineWidth=4.5;c.beginPath();c.moveTo(tx,ty);c.lineTo(b.x,b.y);c.stroke();
  /* gold and black dashes race along the trail */
  c.setLineDash([9,9]);c.lineDashOffset=-t*420;c.strokeStyle='#ffe28a';c.lineWidth=2.2;c.beginPath();c.moveTo(tx,ty);c.lineTo(b.x,b.y);c.stroke();
  c.lineDashOffset=-t*420+9;c.strokeStyle='#0b0906';c.lineWidth=2.2;c.beginPath();c.moveTo(tx,ty);c.lineTo(b.x,b.y);c.stroke();
  c.setLineDash([]);
  /* head: gold bead in a black ring, flipping between the two colours */
  const fl=Math.floor(t*30+b.x*.01)%2===0;
  c.fillStyle=fl?'#0b0906':'#ffc93a';c.beginPath();c.arc(b.x,b.y,6,0,Math.PI*2);c.fill();
  c.fillStyle=fl?'#ffc93a':'#0b0906';c.beginPath();c.arc(b.x,b.y,3.6,0,Math.PI*2);c.fill();
  c.fillStyle='#fff6d0';c.beginPath();c.arc(b.x,b.y,1.4,0,Math.PI*2);c.fill();
  c.restore();
}
function drawFlash(c,len,gold){
  if(gold){
    c.fillStyle='rgba(12,10,6,.95)';c.beginPath();c.moveTo(len-2,0);c.lineTo(len+12,-9);c.lineTo(len+34,0);c.lineTo(len+12,9);c.closePath();c.fill();
    c.fillStyle='rgba(255,201,58,.95)';c.beginPath();c.moveTo(len,0);c.lineTo(len+10,-5);c.lineTo(len+26,0);c.lineTo(len+10,5);c.closePath();c.fill();
    c.fillStyle='rgba(255,246,208,.95)';c.beginPath();c.moveTo(len+2,0);c.lineTo(len+8,-2);c.lineTo(len+14,0);c.lineTo(len+8,2);c.closePath();c.fill();return;
  }
  c.fillStyle='rgba(255,226,130,.95)';c.beginPath();c.moveTo(len-2,0);c.lineTo(len+10,-7);c.lineTo(len+28,0);c.lineTo(len+10,7);c.closePath();c.fill();
  c.fillStyle='rgba(255,255,255,.9)';c.beginPath();c.moveTo(len,0);c.lineTo(len+8,-3);c.lineTo(len+16,0);c.lineTo(len+8,3);c.closePath();c.fill();
}
function drawPlane(c,L,shadow){
  c.save();c.scale(L/200,L/200);c.lineJoin='round';c.strokeStyle='rgba(0,0,0,.4)';c.lineWidth=3;c.fillStyle='#e8eef0';
  if(shadow){
    c.fillStyle='rgba(0,0,0,.28)';
    c.beginPath();c.moveTo(20,0);c.lineTo(-20,-105);c.lineTo(-50,-105);c.lineTo(-34,0);c.lineTo(-50,105);c.lineTo(-20,105);c.closePath();c.fill();
    rrect(c,-104,-15,208,30,15);c.fill();c.fillRect(-104,-38,12,76);
    c.restore();return;
  }
  c.beginPath();c.moveTo(20,0);c.lineTo(-20,-105);c.lineTo(-50,-105);c.lineTo(-34,0);c.lineTo(-50,105);c.lineTo(-20,105);c.closePath();c.fill();c.stroke();
  c.beginPath();c.moveTo(-72,0);c.lineTo(-92,-38);c.lineTo(-104,-38);c.lineTo(-94,0);c.lineTo(-104,38);c.lineTo(-92,38);c.closePath();c.fill();c.stroke();
  c.fillStyle='#ff6b4a';rrect(c,-104,-15,208,30,15);c.fill();c.stroke();
  c.fillStyle='#ffd166';c.fillRect(-72,-15,16,30);
  c.fillStyle='#5cc8ff';c.beginPath();c.ellipse(56,0,15,10,0,0,TAU);c.fill();c.stroke();
  c.fillStyle='#2a3338';c.fillRect(100,-24,5,48);
  c.restore();
}
function paintSkin(canvas,sk,px,chute){
  const d=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(px*d);canvas.height=Math.round(px*d);canvas.style.width=px+'px';canvas.style.height=px+'px';
  const c=canvas.getContext('2d');if(!c)return;
  c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,px,px);c.translate(px/2,px/2);
  const r=px*(chute?.17:.34);
  if(chute){{const cs=chuteSkin(sk,typeof P!=='undefined'&&P?P.chute:0);drawChute(c,cs,px*.47);drawRopes(c,px*.47,r,cs)}}
  c.rotate(-Math.PI/2);drawChar(c,sk,r,{pv:1});
}

/* ---------- cosmetics: emotes, melee weapons, backpacks (data + drawing) ---------- */
/* item shape: {id,name,rarity,src:'default'|'free'|'prem'|'sub'|'shop',tier} same as skins */
const mkItems=(rows,extra)=>rows.map((r,i)=>Object.assign({id:i,name:r[0],rarity:r[1],src:r[2],tier:0},extra?extra(r,i):{}));
const EMOTES=mkItems([
  ['Smile',0,'default','😀'],['Cool',0,'default','😎'],['Thumbs Up',0,'default','👍'],['Wave',0,'default','👋'],
  ['Laugh',0,'free','😂'],['Party',1,'free','🎉'],['Heart',0,'free','❤️'],['Clap',1,'free','👏'],
  ['Fire',1,'prem','🔥'],['Skull',2,'prem','💀'],['Mind Blown',2,'prem','🤯'],['Flex',1,'prem','💪'],['Devil',2,'prem','😈'],['Cheer',1,'prem','🙌'],
  ['Crown',3,'sub','👑'],['Trophy',3,'sub','🏆'],['Starstruck',2,'sub','🤩'],['Rocket',2,'sub','🚀'],
  ['Cry',0,'shop','😭'],['Rage',0,'shop','😡'],['Think',0,'shop','🤔'],['Sleepy',0,'shop','😴'],['Ghost',1,'shop','👻'],['Alien',2,'shop','👽']
],r=>({g:r[3]}));
/* melee: dmg per hit, rng from attacker centre, cd seconds, len = drawn length at character radius 22 */
const MELEES=mkItems([
  ['Fists',0,'default',18,56,.38,26],['Baseball Bat',0,'free',26,72,.55,58],['Combat Knife',0,'free',20,60,.3,40],
  ['Hatchet',1,'prem',28,66,.5,48],['Frying Pan',1,'prem',24,64,.5,52],['Wrench',1,'prem',24,66,.45,50],
  ['Katana',2,'sub',30,80,.5,70],['War Hammer',2,'sub',38,72,.9,56],['Spear',2,'sub',26,100,.6,92],
  ['Scythe',2,'shop',30,92,.7,76],['Energy Baton',2,'shop',24,70,.4,56],['Golden Sword',3,'shop',32,82,.5,66]
],r=>({dmg:r[3],rng:r[4],cd:r[5],len:r[6]}));
/* parachute designs: id 0 follows the skin's own parachute */
const PARAS=mkItems([
  ['Skin match',0,'default'],['Cloud White',0,'default'],['Sunrise',0,'default'],['Ocean Wave',0,'shop'],['Forest Ring',0,'shop'],['Berry Dots',0,'shop'],
  ['Checker Rally',1,'shop'],['Neon Star',1,'shop'],['Midnight',1,'shop'],['Candy',1,'shop'],['Lava Panels',1,'shop'],['Mint Ring',1,'shop'],
  ['Royal Checker',2,'shop'],['Aurora',2,'shop'],['Ember Star',2,'shop'],['Glacier',2,'shop'],['Solar Flare',2,'sub'],['Phantom',2,'sub'],
  ['Golden Hour',3,'shop'],['Azure Warden',3,'sub'],['Prism',3,'shop'],['Void Star',3,'sub']
],(r,i)=>{
  const P=[[0,0,0],['#f4f6f4','#cfd6d4',0],['#ff7a45','#ffd166',1],['#1f78d1','#7fd1ff',0],['#1f8a4c','#a6e3a1',1],['#c2185b','#ffb3d1',3],
    ['#ffd23f','#1a1a2e',4],['#ff00c8','#00f0ff',2],['#0b0f2b','#4b5cff',0],['#ff5fa2','#ffe3f1',3],['#d6291f','#ff9a3d',0],['#26c6a6','#e0fff7',1],
    ['#3b2fa3','#ffd166',4],['#00c9a7','#8e44ff',0],['#ff6a00','#ffe08a',2],['#9fd8ff','#ffffff',1],['#ffb000','#ff3d00',0],['#2a2a35','#8e44ff',3],
    ['#ffc83d','#fff2b8',2],['#2f5fe0','#f2f5ff',2],['#ff4fd8','#4ff0ff',4],['#12091f','#b07cff',2]][i];
  const SH=['round','cloud','round','ram','hex','heart','diamond','star','bat','flower','delta','clover','drop','ram','star','hex','sun','bat','flower','drop','diamond','star'][i];
  return i===0?{c1:'#888',c2:'#ccc',pat:0,sh:'round'}:{c1:P[0],c2:P[1],pat:P[2],sh:SH};
});
const PACKS=mkItems([
  ['Scout Pack',0,'default','round',20,'#5a7d5c','#c2d6a8'],['Hiker',0,'free','square',28,'#9b5d3a','#e0b27a'],['Roll-top',0,'free','tall',200,'#3f6aa8','#a9c8f0'],
  ['Twin Pouch',1,'prem','twin',340,'#8a4aa8','#e2b8f0'],['Red Cape',1,'prem','cape',0,'#c4352e','#ffb3a8'],['Wings',2,'prem','wings',190,'#30b0c0','#c8f4f8'],
  ['Air Tank',2,'sub','tank',150,'#9aa8ae','#ff6b4a'],['Bedroll',1,'sub','bedroll',35,'#c9a24a','#7a4e2d'],['Shell',2,'sub','shell',160,'#2f9f77','#d8f5e4'],
  ['Supply Crate',1,'shop','crate',30,'#8a6a3a','#d2b27a'],['Jetpack',3,'shop','jet',215,'#505a6a','#ffb02e'],['Angel Wings',3,'shop','angel',50,'#f4f1e8','#ffd166'],
  ['Bat Wings',1,'shop','bat',280,'#3a2a4a','#b07cff'],['Butterfly',1,'shop','fly',330,'#ff8ad8','#ffe36b'],['Dragon Wings',2,'shop','dragon',10,'#2f8f4a','#ffb02e'],['Feather Wings',2,'shop','feather',210,'#e9eef2','#4aa3ff'],
  ['Fairy Wings',2,'shop','fairy',300,'#9ff0ff','#ff9bf0'],['Flame Wings',3,'sub','flame',20,'#ff5a1f','#ffd23f'],['Crystal Wings',3,'shop','crystal',190,'#7fd8ff','#ffffff'],['Robo Wings',2,'shop','robo',215,'#6b7683','#00e5ff'],['Phoenix',3,'sub','phoenix',35,'#d4380d','#ffe58f']
],r=>({shape:r[3],hue:r[4],c1:r[5],c2:r[6]}));
/* melee: stats live in MELEES rows above (columns 3-6) */

/* pass tiers for the new items (skins already carry their own tiers) */
(function(){
  const FT=[3,8,13,18,23,28,33,38],PT=[3,7,11,15,19,23,27,31,35,39,43,47];
  const fq=[[EMOTES,4],[MELEES,1],[PACKS,1],[EMOTES,5],[MELEES,2],[PACKS,2],[EMOTES,6],[EMOTES,7]];
  const pq=[[EMOTES,8],[MELEES,3],[PACKS,3],[EMOTES,9],[MELEES,4],[PACKS,4],[EMOTES,10],[MELEES,5],[PACKS,5],[EMOTES,11],[EMOTES,12],[EMOTES,13]];
  fq.forEach((q,i)=>{q[0][q[1]].tier=FT[i]});
  pq.forEach((q,i)=>{q[0][q[1]].tier=PT[i]});
})();

/* ---------- drawing ---------- */
function drawPack(c,idx,r){
  const p=PACKS[idx]||PACKS[0];
  c.save();c.lineWidth=Math.max(1.5,r*.1);c.strokeStyle='rgba(0,0,0,.45)';
  const f=(col)=>{c.fillStyle=col;c.fill();c.stroke()};
  switch(p.shape){
    case 'round':c.beginPath();c.arc(-r*.95,0,r*.66,0,TAU);f(p.c1);c.beginPath();c.arc(-r*1.05,0,r*.3,0,TAU);f(p.c2);break;
    case 'square':rrect(c,-r*1.6,-r*.64,r*1.05,r*1.28,r*.2);f(p.c1);c.fillStyle=p.c2;c.fillRect(-r*1.45,-r*.5,r*.18,r);break;
    case 'tall':rrect(c,-r*1.55,-r*.46,r*1.0,r*.92,r*.25);f(p.c1);rrect(c,-r*1.5,-r*.46,r*.35,r*.92,r*.15);f(p.c2);break;
    case 'twin':c.beginPath();c.arc(-r*1.0,-r*.55,r*.44,0,TAU);f(p.c1);c.beginPath();c.arc(-r*1.0,r*.55,r*.44,0,TAU);f(p.c1);c.beginPath();c.arc(-r*1.0,-r*.55,r*.2,0,TAU);f(p.c2);c.beginPath();c.arc(-r*1.0,r*.55,r*.2,0,TAU);f(p.c2);break;
    case 'cape':c.beginPath();c.moveTo(-r*.3,-r*.95);c.lineTo(-r*2.1,-r*.3);c.lineTo(-r*2.1,r*.3);c.lineTo(-r*.3,r*.95);c.closePath();f(p.c1);c.beginPath();c.moveTo(-r*.5,-r*.5);c.lineTo(-r*1.7,0);c.lineTo(-r*.5,r*.5);c.closePath();f(p.c2);break;
    case 'wings':for(const s of[-1,1]){c.save();c.translate(-r*.9,s*r*.6);c.rotate(s*.55);c.beginPath();c.ellipse(-r*.45,0,r*.95,r*.3,0,0,TAU);f(p.c1);c.beginPath();c.ellipse(-r*.35,0,r*.5,r*.14,0,0,TAU);f(p.c2);c.restore()}break;
    case 'tank':rrect(c,-r*1.7,-r*.38,r*1.15,r*.76,r*.38);f(p.c1);c.fillStyle=p.c2;c.fillRect(-r*1.35,-r*.38,r*.16,r*.76);c.fillRect(-r*1.0,-r*.38,r*.16,r*.76);break;
    case 'bedroll':rrect(c,-r*1.45,-r*1.0,r*.6,r*2.0,r*.3);f(p.c1);c.fillStyle=p.c2;c.fillRect(-r*1.45,-r*.35,r*.6,r*.14);c.fillRect(-r*1.45,r*.25,r*.6,r*.14);break;
    case 'shell':c.beginPath();c.arc(-r*.5,0,r*1.15,Math.PI*.5,Math.PI*1.5);c.closePath();f(p.c1);c.beginPath();c.arc(-r*.5,0,r*.7,Math.PI*.5,Math.PI*1.5);c.closePath();f(p.c2);break;
    case 'crate':rrect(c,-r*1.6,-r*.65,r*1.1,r*1.3,r*.08);f(p.c1);c.strokeStyle=p.c2;c.lineWidth=r*.1;c.beginPath();c.moveTo(-r*1.55,-r*.6);c.lineTo(-r*.55,r*.6);c.moveTo(-r*.55,-r*.6);c.lineTo(-r*1.55,r*.6);c.stroke();break;
    case 'jet':
      for(const s of[-1,1]){
        c.fillStyle=p.c2;c.beginPath();c.moveTo(-r*1.7,s*r*.4-r*.14);c.lineTo(-r*2.35,s*r*.4);c.lineTo(-r*1.7,s*r*.4+r*.14);c.closePath();c.fill();
        rrect(c,-r*1.7,s*r*.4-r*.26,r*1.1,r*.52,r*.2);f(p.c1);
      }break;
    case 'bat':for(const s of[-1,1]){c.save();c.scale(1,s);c.beginPath();c.moveTo(-r*.7,0);c.lineTo(-r*1.0,r*.9);c.lineTo(-r*1.45,r*.55);c.lineTo(-r*1.65,r*1.2);c.lineTo(-r*1.95,r*.7);c.lineTo(-r*2.2,r*1.1);c.lineTo(-r*2.2,r*.1);c.lineTo(-r*.8,r*.1);c.closePath();f(p.c1);c.beginPath();c.moveTo(-r*.8,r*.15);c.lineTo(-r*1.05,r*.7);c.lineTo(-r*1.9,r*.5);c.lineTo(-r*1.9,r*.15);c.closePath();f(p.c2);c.restore()}break;
    case 'fly':for(const s of[-1,1]){c.save();c.scale(1,s);c.beginPath();c.ellipse(-r*1.1,r*.8,r*.8,r*.55,.5,0,TAU);f(p.c1);c.beginPath();c.ellipse(-r*1.45,r*.3,r*.55,r*.4,-.4,0,TAU);f(p.c1);c.beginPath();c.arc(-r*1.15,r*.8,r*.2,0,TAU);f(p.c2);c.beginPath();c.arc(-r*1.5,r*.35,r*.14,0,TAU);f(p.c2);c.restore()}break;
    case 'dragon':for(const s of[-1,1]){c.save();c.scale(1,s);c.beginPath();c.moveTo(-r*.7,r*.1);c.lineTo(-r*1.1,r*1.35);c.lineTo(-r*1.5,r*.8);c.lineTo(-r*1.75,r*1.5);c.lineTo(-r*2.05,r*.8);c.lineTo(-r*2.4,r*1.2);c.lineTo(-r*2.2,r*.1);c.closePath();f(p.c1);c.strokeStyle=p.c2;c.lineWidth=r*.1;c.beginPath();c.moveTo(-r*.8,r*.15);c.lineTo(-r*1.1,r*1.3);c.moveTo(-r*.9,r*.15);c.lineTo(-r*1.75,r*1.45);c.moveTo(-r*1.0,r*.12);c.lineTo(-r*2.35,r*1.15);c.stroke();c.restore();c.strokeStyle='rgba(0,0,0,.45)';c.lineWidth=Math.max(1.5,r*.1)}break;
    case 'feather':for(const s of[-1,1])for(let k=0;k<5;k++){c.save();c.translate(-r*.7,s*r*.25);c.rotate(s*(.25+k*.3));c.beginPath();c.ellipse(-r*(.9+k*.1),0,r*(1.0-k*.05),r*.17,0,0,TAU);f(k%2?p.c2:p.c1);c.restore()}break;
    case 'fairy':for(const s of[-1,1]){c.globalAlpha=.85;c.save();c.translate(-r*.8,s*r*.2);c.rotate(s*.5);c.beginPath();c.ellipse(-r*.6,0,r*.95,r*.42,0,0,TAU);f(p.c1);c.restore();c.save();c.translate(-r*.8,s*r*.2);c.rotate(s*1.15);c.beginPath();c.ellipse(-r*.45,0,r*.6,r*.3,0,0,TAU);f(p.c2);c.restore();c.globalAlpha=1}break;
    case 'flame':for(const s of[-1,1])for(let k=0;k<4;k++){c.save();c.translate(-r*.75,s*r*.3);c.rotate(s*(.3+k*.34));c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-r*(.8+k*.1),-r*.3,-r*(1.5+(k%2)*.4),s*r*.05);c.quadraticCurveTo(-r*(.8+k*.1),r*.3,0,0);f(k%2?p.c2:p.c1);c.restore()}break;
    case 'crystal':for(const s of[-1,1])for(let k=0;k<3;k++){c.save();c.translate(-r*.75,s*r*.3);c.rotate(s*(.3+k*.45));c.beginPath();c.moveTo(0,-r*.16);c.lineTo(-r*(1.5-k*.15),0);c.lineTo(0,r*.16);c.closePath();f(k===1?p.c2:p.c1);c.restore()}break;
    case 'robo':for(const s of[-1,1]){c.save();c.translate(-r*.8,s*r*.3);c.rotate(s*.5);rrect(c,-r*1.6,-r*.14,r*1.6,r*.28,r*.05);f(p.c1);c.fillStyle=p.c2;c.fillRect(-r*1.45,-r*.07,r*1.1,r*.14);c.restore()}rrect(c,-r*1.1,-r*.3,r*.5,r*.6,r*.1);f(p.c1);break;
    case 'phoenix':for(const s of[-1,1])for(let k=0;k<5;k++){c.save();c.translate(-r*.7,s*r*.25);c.rotate(s*(.15+k*.3));c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-r*(1.0+k*.1),-r*.28,-r*(2.0-k*.12),s*r*.02);c.quadraticCurveTo(-r*(1.0+k*.1),r*.28,0,0);f(k%2?p.c2:p.c1);c.restore()}c.beginPath();c.moveTo(-r*.7,0);c.quadraticCurveTo(-r*1.6,-r*.3,-r*2.6,0);c.quadraticCurveTo(-r*1.6,r*.3,-r*.7,0);f(p.c2);break;
    case 'angel':
      for(const s of[-1,1])for(let k=0;k<3;k++){c.save();c.translate(-r*.7,s*r*.4);c.rotate(s*(.35+k*.38));c.beginPath();c.ellipse(-r*(.75+k*.12),0,r*(1.0-k*.12),r*.2,0,0,TAU);f(k===1?p.c2:p.c1);c.restore()}
      break;
  }
  c.restore();
}
/* weapon held at the hand, pointing along +x, in units where the character radius is 22 */
function drawMelee(c,idx,s){
  const m=MELEES[idx]||MELEES[0];
  c.save();c.scale(s,s);c.lineCap='round';c.lineJoin='round';
  const dark='rgba(0,0,0,.45)';
  const stick=(x0,x1,w,col)=>{c.strokeStyle=dark;c.lineWidth=w+3;c.beginPath();c.moveTo(x0,0);c.lineTo(x1,0);c.stroke();c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(x0,0);c.lineTo(x1,0);c.stroke()};
  const poly=(pts,col)=>{c.beginPath();c.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)c.lineTo(pts[i],pts[i+1]);c.closePath();c.fillStyle=col;c.fill();c.strokeStyle=dark;c.lineWidth=2;c.stroke()};
  switch(idx){
    case 0:c.fillStyle='#e8c9a8';c.strokeStyle=dark;c.lineWidth=2;c.beginPath();c.arc(22,0,9,0,TAU);c.fill();c.stroke();break;
    case 1:poly([0,-3,34,-4,58,-8,58,8,34,4,0,3],'#b98a52');stick(0,12,5,'#444');break;
    case 2:stick(0,14,7,'#2a2f33');poly([14,-5,40,-1,40,3,14,5],'#d6dde0');break;
    case 3:stick(0,40,5,'#8a5a32');poly([34,-4,48,-14,52,-2,52,10,46,12,34,4],'#aab4b8');break;
    case 4:stick(0,30,5,'#2a2f33');c.fillStyle='#3a4046';c.strokeStyle=dark;c.lineWidth=2;c.beginPath();c.arc(44,0,16,0,TAU);c.fill();c.stroke();c.fillStyle='#59616a';c.beginPath();c.arc(44,0,11,0,TAU);c.fill();break;
    case 5:stick(0,42,6,'#c4352e');c.strokeStyle=dark;c.lineWidth=9;c.beginPath();c.arc(48,0,9,Math.PI*.2,Math.PI*1.8);c.stroke();c.strokeStyle='#d6dde0';c.lineWidth=6;c.beginPath();c.arc(48,0,9,Math.PI*.2,Math.PI*1.8);c.stroke();break;
    case 6:stick(0,16,6,'#2a2f33');poly([14,-8,18,-8,18,8,14,8],'#c9a24a');poly([18,-3,70,-1,74,0,70,1,18,3],'#e8eef0');break;
    case 7:stick(0,48,6,'#6b4a2a');poly([40,-15,58,-15,58,15,40,15],'#7d878c');poly([42,-12,56,-12,56,12,42,12],'#9aa5aa');break;
    case 8:stick(0,84,4,'#8a5a32');poly([82,-6,100,0,82,6],'#d6dde0');break;
    case 9:stick(0,70,4,'#6b4a2a');c.strokeStyle=dark;c.lineWidth=9;c.beginPath();c.arc(68,-22,24,Math.PI*.5,Math.PI*1.1);c.stroke();c.strokeStyle='#cfd8dc';c.lineWidth=6;c.beginPath();c.arc(68,-22,24,Math.PI*.5,Math.PI*1.1);c.stroke();break;
    case 10:c.shadowColor='#5cc8ff';c.shadowBlur=12;stick(0,12,7,'#2a2f33');stick(12,56,5,'#9be8ff');c.shadowBlur=0;break;
    case 11:stick(0,14,6,'#7a4e2d');poly([14,-12,18,-12,18,12,14,12],'#ffb02e');poly([18,-6,66,-2,72,0,66,2,18,6],'#ffd166');break;
  }
  c.restore();
}
function paintMelee(canvas,idx,w,h){
  const d=Math.min(2,window.devicePixelRatio||1),m=MELEES[idx]||MELEES[0];
  canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);canvas.style.width=w+'px';canvas.style.height=h+'px';
  const c=canvas.getContext('2d');if(!c)return;
  c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,w,h);
  const L=Math.max(m.len,idx===0?30:m.len)+(idx===9?10:0),s=Math.min((w*.86)/L,(h*.8)/40);
  c.translate(w/2-L*s/2+(idx===0?-8*s:0),h/2);c.rotate(-.35);drawMelee(c,idx,s);
}
function paintChute(canvas,idx,px,sk){
  const d=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(px*d);canvas.height=Math.round(px*d);canvas.style.width=px+'px';canvas.style.height=px+'px';
  const c=canvas.getContext('2d');if(!c)return;
  c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,px,px);c.translate(px/2,px/2);
  const r=px*.17,cs=chuteSkin(sk,idx);
  drawChute(c,cs,px*.47);drawRopes(c,px*.47,r,cs);c.rotate(-Math.PI/2);drawChar(c,sk,r,{pv:1});
}
function paintPack(canvas,idx,px,sk){
  const d=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(px*d);canvas.height=Math.round(px*d);canvas.style.width=px+'px';canvas.style.height=px+'px';
  const c=canvas.getContext('2d');if(!c)return;
  c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,px,px);c.translate(px/2,px*.4);
  const r=px*.19;c.rotate(-Math.PI/2);drawPack(c,idx,r);drawChar(c,sk,r,{pv:1});
}
function drawEmoteBubble(c,x,y,g,t){
  const k=Math.min(1,(2.6-t)*6),a=Math.min(1,t*3),sc=.6+.4*Math.min(1,k)+Math.sin(Math.min(2.6,t)*9)*.03;
  c.save();c.translate(x,y);c.scale(sc,sc);c.globalAlpha=a;
  c.fillStyle='rgba(8,20,23,.9)';c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=2.5;
  c.beginPath();c.arc(0,0,23,0,TAU);c.fill();c.stroke();
  c.beginPath();c.moveTo(-6,21);c.lineTo(0,31);c.lineTo(6,21);c.closePath();c.fill();c.stroke();
  c.font='28px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#fff';
  c.fillText(g,0,2);
  c.restore();
}

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
  {name:'Wonder Sniper',cls:'sniper',dmg:90,rate:1.3,spd:2800,spread:0,pellets:1,mag:5,rng:2600,len:78,x0:-14,f:80,wt:0,slow:.92,fix:1,view:.56,tag:'90 dmg, huge view'},
  {name:'Midas M4',cls:'rifle',dmg:44,rate:.115,spd:3000,spread:.004,pellets:1,mag:40,rng:2000,len:66,x0:-14,f:420,wt:0,fix:1,view:.7,gold:1,tag:'Ultimate rifle'}
];
const GOLDM4=17,GOLDC='#ffc93a';
const wcol=(w,r)=>w===GOLDM4?GOLDC:RAR7C[r];
const wrn=(w,r)=>w===GOLDM4?'Ultimate':RAR7N[r];
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
    len:b.len,x0:b.x0,f:b.f,burst:b.burst||0,gap:b.gap||.06,pierce:!!b.pierce,pj:b.pj||'',boom:b.boom?{r:b.boom.r*(1+.03*k),d:b.boom.d*(1+.07*k)}:null,slow:b.slow||1,col:b.gold?GOLDC:RAR7C[rar]};
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
    if(pref==='air'){const w=R()<.34?GOLDM4:Math.floor(R()*GOLDM4),rar=6;d={type:'gun',w,rar,kind:w,amt:Math.round(WEAP[w].mag*3*(1+.04*rar))}}
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
  const A=(id===GOLDM4?GOLDC:RAR7C[rar])||'#aaa';
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
    case 17:{/* Midas M4: black carbine trimmed in gold */
      const K='#14110c',K2='#272217',Y='#e0a526',Y2='#ffd75e';
      c.shadowColor=Y;c.shadowBlur=4;
      pg([-14,-5,0,-4.5,3,4,-9,7,-14,5],K2);bx(-14,-5,2.6,10,Y);c.strokeStyle='rgba(0,0,0,.6)';
      bx(0,-5.5,24,11,K);bx(2,-3.6,19,1.5,Y);bx(5,0,12,1.2,Y2);
      bx(24,-4.6,22,9.2,K2);c.fillStyle=Y;for(let x=26;x<44;x+=3.2)c.fillRect(x,-5.6,1.7,1.2);for(let x=27;x<43;x+=4.5){c.fillStyle='#050403';c.fillRect(x,-1.4,2.6,2.8)}
      bx(46,-2.2,14,4.4,'#2a251b');bx(58,-3.4,8,6.8,Y);c.fillStyle=Y2;c.fillRect(60,-1,5,2);
      pg([40,-4.6,44,-4.6,44,-11,41,-11],K);pg([4,-5.5,22,-5.5,20,-10.5,6,-10.5],K);bx(8,-9.4,8,1.6,Y);
      pg([8,5.5,17,5.5,20,19,11,19],K2);c.fillStyle=Y;c.fillRect(11,8,5,1.2);
      pg([0,5.5,7,5.5,5,16,-3,16],K);bx(3.5,5.5,1.8,3,Y);break}
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
  if(a==='use'){if(inAir())return;if(NETMODE==='client'){if(player.alive){
      const nd=nearestDoor(player,DOOR_REACH);let ld=1e9;for(const l of loot){const q=dist2(player,l);if(q<ld)ld=q}
      if(nd&&(ld>PICK_R*PICK_R||nd.q<=Math.sqrt(ld)*.8)){toggleDoor(nd.d,true,player);nd.d.pend=performance.now()}
      netAct('use')}return}if(player.alive){
    /* a door you are touching comes first; otherwise pick up what is under you, otherwise open the nearest crate */
    const nd=nearestDoor(player,DOOR_REACH);let ld=1e9;for(const l of loot){const q=dist2(player,l);if(q<ld)ld=q}
    if(nd&&(ld>PICK_R*PICK_R||nd.q<=Math.sqrt(ld)*.8))toggleDoor(nd.d,true,player);
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
/* door looks: painted wood per building, riveted iron for the hard buildings, banded oak for the fort */
const DWOOD={0:['#a47244','#80522b','#5e3a1c'],1:['#8f6a44','#6e4b2b','#4e3320'],4:['#3e9a6a','#2c7a52','#1f5a3b'],5:['#2f9aa0','#237a80','#185a5f'],6:['#3aa9b0','#2a8a90','#1d6a70'],7:['#7a4aa8','#5d3585','#43255f'],8:['#6a4a30','#4e3320','#38241a'],9:['#cfe3f0','#a9c6d9','#86a5ba'],10:['#c9b46a','#a8934a','#826f34'],11:['#8a7a62','#6a5c48','#4c4232'],14:['#c84a3f','#a03228','#7a2119'],15:['#efe6d2','#d3c7aa','#b3a584']};
const DHANDLE={15:'#d9b74a',9:'#7a8a96'};
function doorKind(h){return h===2||h===3||h===13?'iron':h===12?'fort':'wood'}
function drawDoor(d,top){
  const now=performance.now();
  if(!top){
    /* each door animates on its own clock: a very quick swing that starts fast and settles */
    const dt=Math.min(.1,(now-(d.at||now))/1000);d.at=now;
    if(d.pend&&now-d.pend>700){d.pend=0;d.open=!d.open}/* a predicted toggle the server never confirmed */
    const tgt=d.open?1:0;
    if(d.anim<tgt)d.anim=Math.min(tgt,d.anim+dt/.1);else if(d.anim>tgt)d.anim=Math.max(tgt,d.anim-dt/.1);
  }
  const a0=d.anim,a=1-Math.pow(1-a0,3),hz=d.horiz,th=Math.min(hz?d.h:d.w,18),L=hz?d.w:d.h,mr=d.mir?-1:1,kind=doorKind(d.hue);
  ctx.save();
  if(!top){
    ctx.fillStyle=FLOORC[d.hue]||'#a98b5e';ctx.fillRect(d.x,d.y,d.w,d.h);
    /* worn threshold and stone jambs */
    ctx.fillStyle='rgba(255,255,255,.1)';ctx.fillRect(d.x,d.y,d.w,d.h);
    ctx.fillStyle='#37322e';
    if(hz){ctx.fillRect(d.x-5,d.y-3,7,d.h+6);ctx.fillRect(d.x+d.w-2,d.y-3,7,d.h+6);ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(d.x-4,d.y-2,2,d.h+4);ctx.fillRect(d.x+d.w-1,d.y-2,2,d.h+4)}
    else{ctx.fillRect(d.x-3,d.y-5,d.w+6,7);ctx.fillRect(d.x-3,d.y+d.h-2,d.w+6,7);ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(d.x-2,d.y-4,d.w+4,2);ctx.fillRect(d.x-2,d.y+d.h-1,d.w+4,2)}
  }
  /* the door is hinged at one end and swings 90 degrees into the building, so it never disappears */
  const inward=((d.side===0||d.side===3)?1:-1)*(d.dir||1);
  const hx=hz?d.x+(d.mir?d.w:0):d.x+d.w/2,hy=hz?d.y+d.h/2:d.y+(d.mir?d.h:0);
  const ang0=hz?0:Math.PI/2,ang=ang0+a*Math.PI/2*(hz?inward:-inward)*mr;
  if(!top&&a>.03){
    /* the area the door sweeps through darkens, so you can read which way it opens */
    const dir=(an)=>mr<0?an+Math.PI:an,s0=dir(ang0),s1=dir(ang);
    let dl=s1-s0;while(dl>Math.PI)dl-=TAU;while(dl<-Math.PI)dl+=TAU;
    ctx.fillStyle='rgba(0,0,0,.12)';ctx.beginPath();ctx.moveTo(hx,hy);ctx.arc(hx,hy,L,s0,s0+dl,dl<0);ctx.closePath();ctx.fill();
  }
  ctx.translate(hx,hy);ctx.rotate(ang);if(d.mir)ctx.scale(-1,1);
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(2,-th/2+3,L,th);
  const sd=(d.id||0)*7.13;
  let c0,c1,c2;
  if(kind==='iron'){c0='#9aa3a9';c1='#707a81';c2='#4f575d'}
  else if(kind==='fort'){c0='#6a4528';c1='#523420';c2='#3a2415'}
  else{[c0,c1,c2]=DWOOD[d.hue]||DWOOD[0]}
  const g=ctx.createLinearGradient(0,-th/2,0,th/2);g.addColorStop(0,c0);g.addColorStop(.5,c1);g.addColorStop(1,c2);
  ctx.fillStyle=g;ctx.fillRect(0,-th/2,L,th);
  ctx.save();ctx.beginPath();ctx.rect(0,-th/2,L,th);ctx.clip();
  if(kind==='wood'||kind==='fort'){
    ctx.lineWidth=1;
    for(let k=0;k<7;k++){const y=-th/2+(k+.5)*th/7,ph=Math.sin(sd+k*1.7)*2;ctx.strokeStyle=k%2?'rgba(30,15,5,.3)':'rgba(255,230,180,.16)';ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(L*.3,y+ph,L*.6,y-ph,L,y+ph*.5);ctx.stroke()}
  }
  if(kind==='wood'){
    /* raised panels */
    const n=L>96?3:2,pw=(L-26)/n;
    for(let k=0;k<n;k++){const px=12+k*pw+3,w2=pw-6;ctx.fillStyle='rgba(0,0,0,.16)';ctx.fillRect(px,-th/2+3,w2,th-6);ctx.strokeStyle='rgba(255,255,255,.3)';ctx.lineWidth=1.2;ctx.strokeRect(px+1,-th/2+4,w2-2,th-8);ctx.strokeStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.moveTo(px,th/2-3);ctx.lineTo(px+w2,th/2-3);ctx.lineTo(px+w2,-th/2+3);ctx.stroke()}
    if(d.hue===15||d.hue===4){/* glazed door */ctx.fillStyle='rgba(170,225,255,.7)';ctx.fillRect(L*.3,-th/2+4,L*.4,th-8);ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(L*.5,-th/2+4);ctx.lineTo(L*.5,th/2-4);ctx.stroke()}
  }else if(kind==='iron'){
    ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=1.4;for(let x=L/5;x<L-4;x+=L/5){ctx.beginPath();ctx.moveTo(x,-th/2);ctx.lineTo(x,th/2);ctx.stroke()}
    ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(0,-th/2+1,L,2);
    ctx.fillStyle='#c8d0d5';for(let x=10;x<L-8;x+=14){ctx.beginPath();ctx.arc(x,-th/2+4,1.5,0,TAU);ctx.arc(x,th/2-4,1.5,0,TAU);ctx.fill()}
    ctx.fillStyle='#e0b43a';ctx.fillRect(L*.55,-th/2,10,th);ctx.fillStyle='#2a2a2a';for(let k=0;k<3;k++)ctx.fillRect(L*.55+k*3.6,-th/2,1.8,th);
  }else{
    ctx.fillStyle='#24201d';for(const fx of[.18,.5,.82]){ctx.fillRect(L*fx-4,-th/2,8,th)}
    ctx.fillStyle='#8a8f93';for(const fx of[.18,.5,.82]){ctx.beginPath();ctx.arc(L*fx,-th/2+4,1.6,0,TAU);ctx.arc(L*fx,th/2-4,1.6,0,TAU);ctx.fill()}
  }
  if(kind!=='fort'&&kind!=='iron'){ctx.strokeStyle='rgba(30,14,4,.45)';ctx.lineWidth=1.3;for(let x=L/4;x<L-4;x+=L/4){ctx.beginPath();ctx.moveTo(x,-th/2);ctx.lineTo(x,th/2);ctx.stroke()}}
  ctx.restore();
  /* hinges and handle */
  ctx.fillStyle='#2b2724';ctx.fillRect(2,-th/2+1,10,th-2);ctx.fillRect(L-30,-th/2+1,9,th-2);
  ctx.fillStyle='#6a6560';ctx.fillRect(4,-th/2+3,6,2);ctx.fillRect(4,th/2-5,6,2);
  ctx.strokeStyle=top?'#ffd166':'rgba(0,0,0,.65)';ctx.lineWidth=top?3:2;ctx.strokeRect(0,-th/2,L,th);
  if(kind==='iron'){ctx.fillStyle='#d9dee2';ctx.fillRect(L-22,-2.4,16,4.8);ctx.fillStyle='rgba(0,0,0,.4)';ctx.fillRect(L-22,1.2,16,1.4)}
  else{ctx.fillStyle=DHANDLE[d.hue]||'#e0b24a';ctx.beginPath();ctx.arc(L-12,0,4.8,0,TAU);ctx.fill();ctx.strokeStyle='rgba(0,0,0,.4)';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='rgba(255,255,255,.6)';ctx.beginPath();ctx.arc(L-13.3,-1.3,1.7,0,TAU);ctx.fill()}
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
    if(nd&&(ld>PICK_R*PICK_R||nd.q<=Math.sqrt(ld)*.8))toggleDoor(nd.d,true,e);
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
        e.sub=p.sub?1:0;e.so=p.so?1:0;e.ml=p.ml|0;e.bp=p.bp|0;e.cp=p.cp|0;e.st=0;e.pid=p.id;e.inp={ix:0,iy:0,fire:false,mel:false,ap:false};e.mvB=0;e.lastIn=0;e.corr=false;e.jumpReq=false;
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
