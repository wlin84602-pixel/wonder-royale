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
