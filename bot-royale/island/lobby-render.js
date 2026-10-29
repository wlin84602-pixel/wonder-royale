(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./lobby-world.js'):root.IslandLobby);if(typeof module==='object'&&module.exports)module.exports=api;else root.IslandLobbyRender=api})(typeof globalThis!=='undefined'?globalThis:this,function(L){
'use strict';
const palette=['#65d9d0','#df9ef3','#ffc870','#7faef4','#f59ca6'];
function box(z,x,y,w,h,r,fill,stroke){z.beginPath();z.roundRect(x,y,w,h,r);if(fill){z.fillStyle=fill;z.fill()}if(stroke){z.strokeStyle=stroke;z.lineWidth=4;z.stroke()}}
function disk(z,x,y,r,fill,stroke){z.beginPath();z.arc(x,y,r,0,Math.PI*2);if(fill){z.fillStyle=fill;z.fill()}if(stroke){z.strokeStyle=stroke;z.lineWidth=4;z.stroke()}}
function text(z,label,x,y,size=24,color='#254f4d'){z.font='800 '+size+'px system-ui';z.textAlign='center';z.fillStyle=color;z.fillText(label,x,y)}
function sign(z,a,width=540){box(z,a.x-width/2,a.y-520,width,100,14,'#123e49','#759b8b');text(z,a.name.toUpperCase(),a.x,a.y-478,30,'#f6f1d9');text(z,a.subtitle,a.x,a.y-447,17,'#9bc4bd')}
function seen(v,x,y,w,h){return !v||x+w>v.x&&x<v.x+v.w&&y+h>v.y&&y<v.y+v.h}
function path(z,points,width=130){z.beginPath();z.moveTo(...points[0]);for(const p of points.slice(1))z.lineTo(...p);z.lineJoin='round';z.lineCap='round';z.strokeStyle='#7e9f72';z.lineWidth=width+18;z.stroke();z.strokeStyle='#d2c69a';z.lineWidth=width;z.stroke();z.strokeStyle='#f0e3b633';z.lineWidth=width-24;z.stroke()}
function shrub(z,x,y){disk(z,x,y,28,'#3c785b');disk(z,x-16,y-6,19,'#548e60');disk(z,x+15,y-10,18,'#639a68')}
function bench(z,x,y,a=0){z.save();z.translate(x,y);z.rotate(a);box(z,-58,-16,116,32,6,'#9e7450','#4e614b');for(let yy=-7;yy<12;yy+=10){z.strokeStyle='#d8ab72';z.lineWidth=3;z.beginPath();z.moveTo(-50,yy);z.lineTo(50,yy);z.stroke()}z.fillStyle='#354e4c';z.fillRect(-42,15,10,13);z.fillRect(32,15,10,13);z.restore()}
function plaza(z,s){const C=L.CENTER;disk(z,C,C,390,'#597f70');disk(z,C,C,375,'#b6bd9d','#456960');for(const r of [345,300,245]){z.beginPath();z.arc(C,C,r,0,Math.PI*2);z.strokeStyle='#7e9b8644';z.lineWidth=3;z.stroke()}disk(z,C,C,95,'#557a78');disk(z,C,C,82,'#c9d8c6','#446d68');disk(z,C,C,68,'#6ab5c1');for(let i=0;i<3;i++){z.beginPath();z.ellipse(C,C,22+((s.time*18+i*19)%45),12+((s.time*12+i*13)%32),0,0,Math.PI*2);z.strokeStyle='#c2f0e077';z.lineWidth=3;z.stroke()}disk(z,C,C,17,'#d5e6cc');text(z,'ARRIVAL PLAZA',C,C-410,38);text(z,'Explore. Play. Drop together.',C,C+430,22);
 for(let i=0;i<6;i++){const a=i*Math.PI/3;bench(z,C+Math.cos(a)*315,C+Math.sin(a)*315,a+Math.PI/2)}
 if(s.confettiUntil>s.time)for(let i=0;i<70;i++){const a=i*2.399,r=80+((s.time*95+i*23)%260);z.save();z.translate(C+Math.cos(a)*r,C+Math.sin(a)*r);z.rotate(a+s.time);z.fillStyle=palette[i%5];z.fillRect(-4,-7,8,14);z.restore()}
}
function race(z,s,p){const a=L.area('race');box(z,770,800,1000,970,65,'#78a778','#4b775a');sign(z,a);
 const points=[...L.RACE,L.RACE[0]];z.beginPath();z.moveTo(...points[0]);for(const q of points.slice(1))z.lineTo(...q);z.lineJoin='round';z.strokeStyle='#d4bf8a';z.lineWidth=188;z.stroke();z.strokeStyle='#415d61';z.lineWidth=170;z.stroke();z.strokeStyle='#6c8280';z.lineWidth=8;z.setLineDash([16,20]);z.stroke();z.setLineDash([]);
 for(let i=0;i<4;i++){const [x,y]=L.RACE[i],next=p?.raceStart!=null&&p.raceNext===i;disk(z,x,y,next?54:38,next?'#f9d777':'#b6c5ad','#304d51');text(z,String(i===0?'GO':i),x,y+8,22);if(next){z.strokeStyle='#ffeb9a';z.lineWidth=4;z.beginPath();z.arc(x,y,68+Math.sin(s.time*5)*5,0,7);z.stroke()}}
 for(let i=0;i<8;i++)for(let j=0;j<2;j++){z.fillStyle=(i+j)%2?'#edf1da':'#243c44';z.fillRect(958+j*20,970+i*20,20,20)}text(z,'E · START A TIMED LAP',1260,1735,20);for(const [x,y]of [[835,860],[1710,860],[835,1710],[1710,1710]]){disk(z,x,y,12,'#ef9b5a','#6d6d50')}
}
function range(z,s){const a=L.area('range');box(z,2720,680,1160,960,45,'#bca886','#667d65');z.save();box(z,2735,695,1130,930,35,null);z.clip();z.strokeStyle='#796a5422';z.lineWidth=2;for(let y=710;y<1640;y+=38){z.beginPath();z.moveTo(2720,y);z.lineTo(3880,y);z.stroke()}z.restore();sign(z,a);box(z,2790,755,1020,80,10,'#3f6264','#25474b');
 for(const t of s.targets){const hit=s.time-t.hitAt<.24;z.fillStyle='#35545a';z.fillRect(t.x-9,t.y,18,130);disk(z,t.x,t.y,hit?51:44,hit?'#ffe294':'#e1e4c7','#2b5055');disk(z,t.x,t.y,31,'#5bb4a5');disk(z,t.x,t.y,19,'#f4f0cf');disk(z,t.x,t.y,9,'#d57c65');text(z,String(t.id+1),t.x,t.y+160,16)}
 z.strokeStyle='#f2e7bc';z.lineWidth=7;z.setLineDash([28,16]);z.beginPath();z.moveTo(2780,1210);z.lineTo(3820,1210);z.stroke();z.setLineDash([]);for(let i=0;i<5;i++){disk(z,2980+i*160,1390,47,'#75968b','#54786e');text(z,'↑',2980+i*160,1398,26,'#cce2c4')}text(z,'AIM WITH MOUSE · FIRE TO SCORE',3300,1585,23);
 for(const q of s.shots){z.strokeStyle=q.hit?'#fff0a7':'#b0f2e5';z.globalAlpha=Math.max(0,1-(s.time-q.time)/.24);z.lineWidth=5;z.beginPath();z.moveTo(q.x,q.y);z.lineTo(q.ex,q.ey);z.stroke();disk(z,q.ex,q.ey,q.hit?12:5,'#fff3bd');z.globalAlpha=1}
}
function pitch(z,s){const F=L.FIELD,a=L.area('pitch');box(z,F.x-80,F.y-80,F.w+160,F.h+160,34,'#517f68','#345e53');sign(z,a);box(z,F.x,F.y,F.w,F.h,4,'#68a87a');for(let i=0;i<10;i++){z.fillStyle=i%2?'#70b080':'#66a479';z.fillRect(F.x+i*F.w/10,F.y,F.w/10,F.h)}
 z.strokeStyle='#e1edcf';z.lineWidth=5;z.strokeRect(F.x,F.y,F.w,F.h);z.beginPath();z.moveTo(F.x+F.w/2,F.y);z.lineTo(F.x+F.w/2,F.y+F.h);z.stroke();disk(z,F.x+F.w/2,F.y+F.h/2,95,null,'#e1edcf');disk(z,F.x+F.w/2,F.y+F.h/2,7,'#e1edcf');
 for(const side of [0,1]){const xx=side?F.x+F.w-150:F.x;z.strokeStyle='#e1edcf';z.lineWidth=5;z.strokeRect(xx,F.y+150,150,F.h-300);const gx=side?F.x+F.w:F.x-55;box(z,gx,F.y+F.h/2-112,55,224,4,side?'#d8a477':'#8bbdd0','#d5e6c7');z.strokeStyle='#dce7d166';z.lineWidth=2;for(let i=1;i<6;i++){z.beginPath();z.moveTo(gx,F.y+F.h/2-112+i*37);z.lineTo(gx+55,F.y+F.h/2-112+i*37);z.stroke()}}
 box(z,3140,2840,320,60,14,'#173f4b','#7eaa9a');text(z,String(s.ball.blue),3220,2883,32,'#9bdbf1');text(z,'—',3300,2880,22,'#bacfbe');text(z,String(s.ball.orange),3380,2883,32,'#ffbc88');text(z,'TOUCH TO DRIBBLE · E TO KICK',3300,3655,22);
 const b=s.ball;disk(z,b.x+4,b.y+6,20,'#305f4b55');disk(z,b.x,b.y,18,'#f1f1dc','#304c4b');z.fillStyle='#415856';z.beginPath();for(let i=0;i<5;i++){const a=i*Math.PI*.4-.4;const px=b.x+Math.cos(a)*8,py=b.y+Math.sin(a)*8;i?z.lineTo(px,py):z.moveTo(px,py)}z.closePath();z.fill();
 if(s.time-(s.goalAt??-10)<2){text(z,'GOAL!',3300,3200,70,'#fff1a9')}
}
function disco(z,s){const a=L.area('disco');box(z,710,2780,1110,1040,55,'#aa9b87','#6e8172');sign(z,a);box(z,770,2895,730,220,18,'#283c53','#6f8e99');box(z,955,2945,350,115,12,'#344e63','#829b9f');
 for(const xx of [840,1430]){box(z,xx-45,2910,90,180,10,'#1d3445','#5e8193');disk(z,xx,2955,23,'#52647f','#7e90ac');disk(z,xx,3033,31,'#446577','#6b8c9c')}
 for(let i=0;i<11;i++){z.fillStyle=palette[i%5];const h=18+(Math.sin(s.time*3+i)*.5+.5)*50;z.fillRect(980+i*28,3030-h,16,h)}
 const hot=s.discoUntil>s.time;for(let row=0;row<6;row++)for(let col=0;col<9;col++){const i=(col+row+Math.floor(s.time*(hot?3:.5)))%5;box(z,805+col*68,3135+row*64,62,58,5,hot?palette[i]:['#596983','#827893','#798a91','#687992','#897c86'][i])}
 text(z,'E · DANCE FOR 8 SECONDS',1110,3590,20,'#eee9cb');
 const b=L.BOUNCE;disk(z,b.x,b.y,91,'#3b5a6b','#9ddbcc');disk(z,b.x,b.y,76,'#567b86');disk(z,b.x,b.y,55,'#283d5a','#bf9de1');text(z,'↑',b.x,b.y+23,70,'#c5f2db');text(z,'E · BOUNCE',b.x,b.y+125,20);
 for(const xx of [940,1310]){bench(z,xx,3735);z.save();z.translate(xx,3650);disk(z,0,0,63,'#ceae73','#836e59');for(let i=0;i<4;i++){z.beginPath();z.moveTo(0,0);z.arc(0,0,62,i*Math.PI/2,(i+1)*Math.PI/2);z.closePath();z.fillStyle=i%2?'#dbe2ba':'#92b7a4';z.fill()}z.restore()}
}
function draw(z,s,v,p){
 const M=65*L.SCALE,S=L.SIZE,C=L.CENTER;z.save();z.fillStyle='#245b70';z.fillRect(v.x,v.y,v.w,v.h);z.strokeStyle='#7bb6bd18';z.lineWidth=3;for(let yy=Math.floor(v.y/130)*130;yy<v.y+v.h;yy+=130){z.beginPath();for(let xx=Math.floor(v.x/120)*120;xx<v.x+v.w+120;xx+=120){const y=yy+Math.sin(xx*.008+s.time*.3)*9;xx===Math.floor(v.x/120)*120?z.moveTo(xx,y):z.lineTo(xx,y)}z.stroke()}
 box(z,M-24,M-24,S-2*M+48,S-2*M+48,240,'#e2cb95');box(z,M+12,M+12,S-2*M-24,S-2*M-24,210,'#77a37b');
 z.save();z.beginPath();z.roundRect(M+12,M+12,S-2*M-24,S-2*M-24,210);z.clip();z.strokeStyle='#567e5b17';z.lineWidth=2;for(let xx=Math.floor(v.x/110)*110;xx<v.x+v.w;xx+=110){z.beginPath();z.moveTo(xx,v.y);z.lineTo(xx,v.y+v.h);z.stroke()}for(let yy=Math.floor(v.y/110)*110;yy<v.y+v.h;yy+=110){z.beginPath();z.moveTo(v.x,yy);z.lineTo(v.x+v.w,yy);z.stroke()}z.restore();
 for(const a of L.AREAS)if(a.id!=='plaza')path(z,[[C,C],[C,a.y],[a.x,a.y]],115);
 if(seen(v,C-500,C-500,1000,1000))plaza(z,s);
 if(seen(v,650,650,1250,1200))race(z,s,p);
 if(seen(v,2660,600,1300,1150))range(z,s);
 if(seen(v,2700,2660,1250,1100))pitch(z,s);
 if(seen(v,650,2670,1300,1300))disco(z,s);
 for(const a of L.AREAS){for(const dx of [-610,610]){const xx=a.x+dx,yy=a.y+540;if(seen(v,xx-40,yy-40,80,80))shrub(z,xx,yy)}}
 z.restore()
}
function mini(z,s,players,camera){const W=180,f=W/L.SIZE;z.clearRect(0,0,W,W);box(z,0,0,W,W,10,'#174759');box(z,8,8,W-16,W-16,15,'#78a482');for(const a of L.AREAS){disk(z,a.x*f,a.y*f,a.id==='plaza'?11:10,a.color);text(z,a.id==='plaza'?'P':a.id==='race'?'R':a.id==='range'?'T':a.id==='pitch'?'F':'D',a.x*f,a.y*f+3,8,'#173f49')}
 if(camera){z.strokeStyle='#ffffff66';z.lineWidth=1;z.strokeRect(camera.x*f,camera.y*f,camera.w*f,camera.h*f)}for(const p of players)disk(z,p.x*f,p.y*f,p.local?3.5:2.5,p.local?'#fffbd7':'#14475a',p.local?'#1d4d57':null)}
return{draw,mini};
});
