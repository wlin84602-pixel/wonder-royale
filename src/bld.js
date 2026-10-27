/* ---------- building looks: roofs, floors, walls, paths and lamps (drawing only, no collision) ---------- */
const mixC=(c,white,a)=>{const T=white?255:0;return 'rgb('+hexRGB(c).map(v=>Math.round(v+(T-v)*a)).join(',')+')'};
const ROOFL=ROOF.map(c=>mixC(c,1,.24)),ROOFLL=ROOF.map(c=>mixC(c,1,.34)),ROOFD=ROOF.map(c=>mixC(c,0,.16)),ROOFDD=ROOF.map(c=>mixC(c,0,.4));
const hsh=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s)};
const RSTYLE={cabin:'gable',farmhouse:'gable',barn:'gable',lodge:'gable',villa:'hip',tower:'hip',stilt:'thatch',shack:'thatch',warehouse:'saw',bazaar:'tent',icehut:'dome',shop:'flat',bunker:'flat',mine:'flat',fort:'flat',adobe:'flat'};
const FSTYLE={cabin:'plank',farmhouse:'plank',lodge:'plank',stilt:'plank',shack:'plank',barn:'plank',shop:'tile',villa:'tile',bazaar:'tile',tower:'tile',warehouse:'slab',bunker:'slab',mine:'slab',fort:'slab',adobe:'plain',icehut:'ice'};

function drawRoofBody(hs){
  const x=hs.x-6,y=hs.y-6,w=hs.w+12,h=hs.h+12,hu=hs.hue,B=ROOF[hu],L=ROOFL[hu],LL=ROOFLL[hu],D=ROOFD[hu],DD=ROOFDD[hu],st=RSTYLE[hs.type]||'flat',sd=hs.x*.013+hs.y*.007;
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
  const hz=w>=h;
  if(st==='gable'){
    const m=hz?y+h/2:x+w/2;
    if(hz){ctx.fillStyle=L;ctx.fillRect(x,y,w,h/2);ctx.fillStyle=D;ctx.fillRect(x,m,w,h/2)}
    else{ctx.fillStyle=L;ctx.fillRect(x,y,w/2,h);ctx.fillStyle=D;ctx.fillRect(m,y,w/2,h)}
    ctx.strokeStyle='rgba(0,0,0,.17)';ctx.lineWidth=1.5;ctx.beginPath();
    if(hz){for(let r=0,yy=y+16;yy<y+h+16;yy+=16,r++){const y0=Math.max(y,yy-16),y1=Math.min(y+h,yy);if(Math.abs(yy-m)<8)continue;ctx.moveTo(x,y1);ctx.lineTo(x+w,y1);for(let xx=x+(r%2)*14+14;xx<x+w;xx+=28){ctx.moveTo(xx,y0);ctx.lineTo(xx,y1)}}}
    else{for(let r=0,xx=x+16;xx<x+w+16;xx+=16,r++){const x0=Math.max(x,xx-16),x1=Math.min(x+w,xx);if(Math.abs(xx-m)<8)continue;ctx.moveTo(x1,y);ctx.lineTo(x1,y+h);for(let yy=y+(r%2)*14+14;yy<y+h;yy+=28){ctx.moveTo(x0,yy);ctx.lineTo(x1,yy)}}}
    ctx.stroke();
    ctx.fillStyle=LL;if(hz)ctx.fillRect(x,m-3,w,6);else ctx.fillRect(m-3,y,6,h);
    ctx.fillStyle='rgba(0,0,0,.25)';if(hz)ctx.fillRect(x,m+3,w,2);else ctx.fillRect(m+3,y,2,h);
  }else if(st==='hip'){
    const cx=x+w/2,cy=y+h/2;
    const tri=(ax,ay,bx,by,f)=>{ctx.fillStyle=f;ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.lineTo(cx,cy);ctx.closePath();ctx.fill()};
    tri(x,y,x+w,y,LL);tri(x,y,x,y+h,L);tri(x+w,y,x+w,y+h,D);tri(x,y+h,x+w,y+h,DD);
    ctx.strokeStyle='rgba(0,0,0,.14)';ctx.lineWidth=1.5;for(let i=1;i<9;i++){const k=i*14;if(k*2>=Math.min(w,h))break;ctx.strokeRect(x+k,y+k,w-2*k,h-2*k)}
    ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(cx,cy);ctx.moveTo(x+w,y);ctx.lineTo(cx,cy);ctx.moveTo(x,y+h);ctx.lineTo(cx,cy);ctx.moveTo(x+w,y+h);ctx.lineTo(cx,cy);ctx.stroke();
    ctx.fillStyle=hs.type==='tower'?'#c9d3da':'#d9b74a';ctx.beginPath();ctx.arc(cx,cy,hs.type==='tower'?12:7,0,TAU);ctx.fill();ctx.strokeStyle='rgba(0,0,0,.5)';ctx.lineWidth=2;ctx.stroke();
  }else if(st==='tent'){
    const cx=x+w/2,cy=y+h/2,pts=[],step=Math.max(26,Math.round(Math.min(w,h)/7));
    for(let xx=x;xx<x+w;xx+=step)pts.push([xx,y]);pts.push([x+w,y]);
    for(let yy=y+step;yy<y+h;yy+=step)pts.push([x+w,yy]);pts.push([x+w,y+h]);
    for(let xx=x+w-step;xx>x;xx-=step)pts.push([xx,y+h]);pts.push([x,y+h]);
    for(let yy=y+h-step;yy>y;yy-=step)pts.push([x,yy]);pts.push([x,y]);
    for(let i=0;i<pts.length-1;i++){ctx.fillStyle=i%2?'#f1e9d8':(hu===7?'#b9473f':B);ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(pts[i][0],pts[i][1]);ctx.lineTo(pts[i+1][0],pts[i+1][1]);ctx.closePath();ctx.fill()}
    ctx.fillStyle='rgba(0,0,0,.1)';ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(x+w,y);ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);ctx.closePath();ctx.fill();
    ctx.fillStyle='#ffd166';ctx.beginPath();ctx.arc(cx,cy,9,0,TAU);ctx.fill();ctx.strokeStyle='rgba(0,0,0,.5)';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#e0a33a';for(let i=0;i<pts.length-1;i+=2){ctx.beginPath();ctx.arc((pts[i][0]+pts[i+1][0])/2,(pts[i][1]+pts[i+1][1])/2,3.2,0,TAU);ctx.fill()}
  }else if(st==='saw'){
    ctx.fillStyle=B;ctx.fillRect(x,y,w,h);
    if(hz){for(let yy=y;yy<y+h;yy+=46){ctx.fillStyle=L;ctx.fillRect(x,yy,w,26);ctx.fillStyle=D;ctx.fillRect(x,yy+26,w,Math.min(20,y+h-yy-26));ctx.fillStyle='rgba(190,230,255,.35)';ctx.fillRect(x,yy+26,w,3)}}
    else{for(let xx=x;xx<x+w;xx+=46){ctx.fillStyle=L;ctx.fillRect(xx,y,26,h);ctx.fillStyle=D;ctx.fillRect(xx+26,y,Math.min(20,x+w-xx-26),h);ctx.fillStyle='rgba(190,230,255,.35)';ctx.fillRect(xx+26,y,3,h)}}
  }else if(st==='thatch'){
    ctx.fillStyle=hs.type==='stilt'?'#7c6a3a':B;ctx.fillRect(x,y,w,h);
    for(let i=0;i<Math.min(260,w*h/260);i++){const px=x+hsh(sd+i)*w,py=y+hsh(sd+i*3.1)*h,l=10+hsh(i*7+sd)*14;ctx.strokeStyle=hsh(i+sd*2)>.5?'rgba(255,230,150,.28)':'rgba(40,25,5,.3)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+l*.3,py+l);ctx.stroke()}
    ctx.fillStyle=D;ctx.fillRect(x,y+h-12,w,12);
  }else if(st==='dome'){
    ctx.fillStyle=D;ctx.fillRect(x,y,w,h);const cx=x+w/2,cy=y+h/2,R=Math.min(w,h)/2;
    for(let i=0;i<7;i++){ctx.fillStyle=i%2?LL:L;ctx.beginPath();ctx.arc(cx-i*1.6,cy-i*1.6,R*(1-i*.13),0,TAU);ctx.fill()}
    ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.arc(cx-R*.25,cy-R*.3,R*.14,0,TAU);ctx.fill();
  }else{/* flat roof with a parapet and gravel */
    ctx.fillStyle=B;ctx.fillRect(x,y,w,h);
    for(let i=0;i<Math.min(90,w*h/1700);i++){ctx.fillStyle=hsh(i+sd)>.5?'rgba(255,255,255,.1)':'rgba(0,0,0,.12)';ctx.fillRect(x+12+hsh(i*2.3+sd)*(w-24),y+12+hsh(i*5.7+sd)*(h-24),3,3)}
    ctx.fillStyle=L;ctx.fillRect(x,y,w,9);ctx.fillRect(x,y,9,h);ctx.fillStyle=DD;ctx.fillRect(x,y+h-9,w,9);ctx.fillRect(x+w-9,y,9,h);
    ctx.strokeStyle='rgba(0,0,0,.3)';ctx.lineWidth=2;ctx.strokeRect(x+9,y+9,w-18,h-18);
    if(hs.type==='shop'){const n=Math.round(w/44);for(let i=0;i<n;i++){ctx.fillStyle=i%2?'#f1e9d8':'#d64f4f';ctx.beginPath();ctx.moveTo(x+i*w/n,y+h-9);ctx.lineTo(x+(i+1)*w/n,y+h-9);ctx.lineTo(x+(i+.5)*w/n,y+h+1);ctx.closePath();ctx.fill()}}
    if(hs.type==='fort'){ctx.fillStyle=ROOFD[hu];for(let i=0;i<w;i+=40){ctx.fillRect(x+i,y,22,16);ctx.fillRect(x+i,y+h-16,22,16)}for(let j=0;j<h;j+=40){ctx.fillRect(x,y+j,16,22);ctx.fillRect(x+w-16,y+j,16,22)}}
    if(hs.type==='adobe'){ctx.fillStyle='#7a4a2a';for(let i=16;i<w-10;i+=26){ctx.beginPath();ctx.arc(x+i,y+4,5,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(x+i,y+h-4,5,0,TAU);ctx.fill()}}
    if(hs.type==='mine'){ctx.strokeStyle='#2a2a30';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x+w*.3,y+h*.8);ctx.lineTo(x+w*.7,y+h*.8);ctx.moveTo(x+w*.3,y+h*.86);ctx.lineTo(x+w*.7,y+h*.86);ctx.stroke()}
  }
  ctx.restore();
  /* eaves: bright top-left edge, dark bottom-right edge, and an outline */
  ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y+h);ctx.lineTo(x,y);ctx.lineTo(x+w,y);ctx.stroke();
  ctx.strokeStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.moveTo(x+w,y);ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);ctx.stroke();
  ctx.strokeStyle='rgba(0,0,0,.55)';ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);
}
function drawChimney(hs){
  if(!(hs.type==='cabin'||hs.type==='farmhouse'||hs.type==='lodge')||hs.w<220)return;
  const x=hs.x+hs.w*.78,y=hs.y+hs.h*.2,t=performance.now()/1000;
  ctx.save();ctx.fillStyle='rgba(0,0,0,.28)';ctx.fillRect(x+5,y+6,28,28);
  ctx.fillStyle='#8a4a3c';ctx.fillRect(x,y,28,28);ctx.strokeStyle='rgba(0,0,0,.55)';ctx.lineWidth=2.5;ctx.strokeRect(x,y,28,28);
  ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,y+9);ctx.lineTo(x+28,y+9);ctx.moveTo(x,y+19);ctx.lineTo(x+28,y+19);ctx.moveTo(x+14,y);ctx.lineTo(x+14,y+9);ctx.moveTo(x+7,y+9);ctx.lineTo(x+7,y+19);ctx.moveTo(x+21,y+9);ctx.lineTo(x+21,y+19);ctx.stroke();
  ctx.fillStyle='#1e1512';ctx.fillRect(x+6,y+6,16,16);
  for(let i=0;i<3;i++){const k=(t*.35+i/3+hsh(hs.x))%1;ctx.globalAlpha=.4*(1-k);ctx.fillStyle='#f0f0f0';ctx.beginPath();ctx.arc(x+14+k*34,y+14-k*44,6+k*12,0,TAU);ctx.fill()}
  ctx.restore();
}
function drawFloorPattern(hs){
  const st=FSTYLE[hs.type]||'plank',sd=hs.x*.017+hs.y*.011;
  ctx.save();ctx.beginPath();ctx.rect(hs.x,hs.y,hs.w,hs.h);ctx.clip();
  if(st==='plank'){
    ctx.strokeStyle='rgba(35,22,10,.24)';ctx.lineWidth=1.6;ctx.beginPath();
    for(let r=0,y=hs.y;y<hs.y+hs.h;y+=28,r++){if(r%2){ctx.fillStyle='rgba(255,235,200,.06)';ctx.fillRect(hs.x,y,hs.w,28)}ctx.moveTo(hs.x,y);ctx.lineTo(hs.x+hs.w,y);for(let x=hs.x+hsh(r+sd)*120;x<hs.x+hs.w;x+=150+hsh(r*3+sd)*90){ctx.moveTo(x,y);ctx.lineTo(x,y+28)}}
    ctx.stroke();
  }else if(st==='tile'){
    const s=hs.type==='tower'?40:52;
    for(let i=0;i*s<hs.w;i++)for(let j=0;j*s<hs.h;j++)if((i+j)%2===0){ctx.fillStyle='rgba(255,255,255,.17)';ctx.fillRect(hs.x+i*s,hs.y+j*s,s,s)}
    ctx.strokeStyle='rgba(0,0,0,.13)';ctx.lineWidth=1.2;ctx.beginPath();for(let x=hs.x+s;x<hs.x+hs.w;x+=s){ctx.moveTo(x,hs.y);ctx.lineTo(x,hs.y+hs.h)}for(let y=hs.y+s;y<hs.y+hs.h;y+=s){ctx.moveTo(hs.x,y);ctx.lineTo(hs.x+hs.w,y)}ctx.stroke();
  }else if(st==='slab'){
    ctx.strokeStyle='rgba(0,0,0,.22)';ctx.lineWidth=2;ctx.beginPath();for(let x=hs.x+110;x<hs.x+hs.w;x+=110){ctx.moveTo(x,hs.y);ctx.lineTo(x,hs.y+hs.h)}for(let y=hs.y+90;y<hs.y+hs.h;y+=90){ctx.moveTo(hs.x,y);ctx.lineTo(hs.x+hs.w,y)}ctx.stroke();
    for(let i=0;i<10;i++){ctx.fillStyle='rgba(0,0,0,.06)';ctx.beginPath();ctx.arc(hs.x+hsh(i+sd)*hs.w,hs.y+hsh(i*4.3+sd)*hs.h,14+hsh(i*9)*26,0,TAU);ctx.fill()}
    ctx.fillStyle='rgba(240,200,40,.3)';for(let x=hs.x+8;x<hs.x+hs.w-30;x+=40){ctx.save();ctx.translate(x,hs.y+hs.h-14);ctx.rotate(-.5);ctx.fillRect(0,-4,22,8);ctx.restore()}
  }else if(st==='ice'){
    ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=2;for(let k=0;k<6;k++){ctx.beginPath();let px=hs.x+hsh(k+sd)*hs.w,py=hs.y+hsh(k*2.7+sd)*hs.h;ctx.moveTo(px,py);for(let s=0;s<4;s++){px+=(hsh(k*5+s+sd)-.5)*90;py+=(hsh(k*3+s*2+sd)-.5)*90;ctx.lineTo(px,py)}ctx.stroke()}
  }else{
    for(let i=0;i<60;i++){ctx.fillStyle=hsh(i+sd)>.5?'rgba(255,255,255,.1)':'rgba(0,0,0,.08)';ctx.fillRect(hs.x+hsh(i*3.3+sd)*hs.w,hs.y+hsh(i*7.7+sd)*hs.h,5,3)}
  }
  ctx.restore();
}
/* a worn stone path and a lamp outside every door */
function drawDoorYard(hs){
  const t=performance.now()/1000;
  for(const q of hs.doors){
    const d=q.d,sd=d.side,out=sd===0?[0,-1]:sd===2?[0,1]:sd===3?[-1,0]:[1,0],hz=d.horiz;
    ctx.save();
    for(let i=0;i<6;i++){
      const o=34+i*24,cx=d.cx+out[0]*(o+d.h*0+(hz?0:d.w/2)*0),cy=d.cy+out[1]*o;
      const wv=(hz?d.w:d.h)*(.62+hsh(i*3+d.cx*.01)*.2),sh=16+hsh(i+d.cy*.01)*6;
      ctx.fillStyle=i%2?'rgba(186,176,156,.85)':'rgba(166,156,138,.85)';ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=1.5;
      ctx.beginPath();if(hz)ctx.roundRect(cx-wv/2+(hsh(i)-.5)*10,cy-sh/2,wv,sh,5);else ctx.roundRect(cx-sh/2,cy-wv/2+(hsh(i)-.5)*10,sh,wv,5);ctx.fill();ctx.stroke();
    }
    const lx=d.cx+(hz?(d.w/2+34):0)+out[0]*30,ly=d.cy+(hz?0:(d.h/2+34))+out[1]*30;
    ctx.globalAlpha=.16+.04*Math.sin(t*3+lx);ctx.fillStyle='#ffd98a';ctx.beginPath();ctx.arc(lx,ly,26,0,TAU);ctx.fill();ctx.globalAlpha=1;
    ctx.fillStyle='#2b2b30';ctx.beginPath();ctx.arc(lx,ly,5,0,TAU);ctx.fill();ctx.fillStyle='#ffe9a8';ctx.beginPath();ctx.arc(lx,ly,2.8,0,TAU);ctx.fill();
    ctx.restore();
  }
}
/* wall faces: plank grain or stone courses, a lit top edge and a shaded base */
function drawWallFace(b){
  const stone=b.hue===12||b.hue===3||b.hue===13||b.hue===1,hz=b.w>=b.h;
  ctx.fillStyle='#2f2e2e';ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle=ROOF[b.hue];ctx.fillRect(b.x+2,b.y+2,b.w-4,b.h-4);
  ctx.save();ctx.beginPath();ctx.rect(b.x+2,b.y+2,b.w-4,b.h-4);ctx.clip();
  ctx.strokeStyle='rgba(0,0,0,.2)';ctx.lineWidth=1.3;ctx.beginPath();
  if(stone){if(hz){const m=b.h/2;ctx.moveTo(b.x,b.y+m);ctx.lineTo(b.x+b.w,b.y+m);for(let r=0;r<2;r++)for(let x=b.x+(r?10:22);x<b.x+b.w;x+=24){ctx.moveTo(x,b.y+r*m);ctx.lineTo(x,b.y+r*m+m)}}else{const m=b.w/2;ctx.moveTo(b.x+m,b.y);ctx.lineTo(b.x+m,b.y+b.h);for(let r=0;r<2;r++)for(let y=b.y+(r?10:22);y<b.y+b.h;y+=24){ctx.moveTo(b.x+r*m,y);ctx.lineTo(b.x+r*m+m,y)}}}
  else{if(hz){for(let y=b.y+b.h/3;y<b.y+b.h-1;y+=b.h/3){ctx.moveTo(b.x,y);ctx.lineTo(b.x+b.w,y)}}else{for(let x=b.x+b.w/3;x<b.x+b.w-1;x+=b.w/3){ctx.moveTo(x,b.y);ctx.lineTo(x,b.y+b.h)}}}
  ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.2)';if(hz)ctx.fillRect(b.x,b.y+2,b.w,2.5);else ctx.fillRect(b.x+2,b.y,2.5,b.h);
  ctx.fillStyle='rgba(0,0,0,.22)';if(hz)ctx.fillRect(b.x,b.y+b.h-5,b.w,3);else ctx.fillRect(b.x+b.w-5,b.y,3,b.h);
  ctx.restore();
}
function drawWindowFace(b){
  const hz=b.w>b.h;ctx.fillStyle='#2f2e2e';ctx.fillRect(b.x,b.y,b.w,b.h);
  ctx.fillStyle=ROOFL[b.hue];ctx.fillRect(b.x+1,b.y+1,b.w-2,b.h-2);
  ctx.fillStyle='rgba(150,215,255,.82)';ctx.fillRect(b.x+4,b.y+4,b.w-8,b.h-8);
  ctx.fillStyle='rgba(255,255,255,.42)';if(hz){ctx.beginPath();ctx.moveTo(b.x+6,b.y+b.h-5);ctx.lineTo(b.x+20,b.y+4);ctx.lineTo(b.x+30,b.y+4);ctx.lineTo(b.x+16,b.y+b.h-5);ctx.fill()}else{ctx.beginPath();ctx.moveTo(b.x+4,b.y+8);ctx.lineTo(b.x+b.w-4,b.y+8);ctx.lineTo(b.x+b.w-4,b.y+16);ctx.lineTo(b.x+4,b.y+16);ctx.fill()}
  ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=2;ctx.beginPath();if(hz){ctx.moveTo(b.x+b.w/2,b.y+4);ctx.lineTo(b.x+b.w/2,b.y+b.h-4)}else{ctx.moveTo(b.x+4,b.y+b.h/2);ctx.lineTo(b.x+b.w-4,b.y+b.h/2)}ctx.stroke();
  ctx.strokeStyle='rgba(0,0,0,.55)';ctx.lineWidth=2;ctx.strokeRect(b.x,b.y,b.w,b.h);
}
