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
  drawChute(c,cs,px*.47);drawRopes(c,px*.47,r,cs);c.rotate(-Math.PI/2);drawChar(c,sk,r,{});
}
function paintPack(canvas,idx,px,sk){
  const d=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(px*d);canvas.height=Math.round(px*d);canvas.style.width=px+'px';canvas.style.height=px+'px';
  const c=canvas.getContext('2d');if(!c)return;
  c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,px,px);c.translate(px/2,px*.4);
  const r=px*.19;c.rotate(-Math.PI/2);drawPack(c,idx,r);drawChar(c,sk,r,{});
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
