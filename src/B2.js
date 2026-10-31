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
  if(Date.now()-d.ts<90)return;
  d.open=!d.open;d.ts=Date.now();
  if(d.open&&who){
    /* swing away from whoever opens it: outwards when they stand inside, inwards when they are outside */
    const iv=d.side===0?[0,1]:d.side===2?[0,-1]:d.side===3?[1,0]:[-1,0];
    d.dir=((who.x-d.cx)*iv[0]+(who.y-d.cy)*iv[1])>0?-1:1;
  }
  if(!player||Math.hypot(player.x-d.x,player.y-d.y)<900)sfx(d.open?300:210,.07,'square',.03,.8);
  if(NETHOOK)NETHOOK('door',d);
}
const DOOR_REACH=58;
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
