(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./lobby-world.js'):root.IslandLobby);if(typeof module==='object'&&module.exports)module.exports=api;else root.IslandLobbyRender=api})(typeof globalThis!=='undefined'?globalThis:this,function(L){
'use strict';
function box(z,x,y,w,h,r,fill,stroke){z.beginPath();z.roundRect(x,y,w,h,r);z.fillStyle=fill;z.fill();if(stroke){z.strokeStyle=stroke;z.lineWidth=4;z.stroke()}}
function text(z,t,x,y,size=22,color='#e6eee6'){z.font='800 '+size+'px system-ui';z.textAlign='center';z.fillStyle=color;z.fillText(t,x,y)}
function draw(z,s,v,p){z.save();z.fillStyle='#1a4a58';z.fillRect(v.x,v.y,v.w,v.h);box(z,90,90,1420,1420,140,'#d4c49a');box(z,115,115,1370,1370,125,'#709d79');box(z,300,260,1000,920,50,'#183b41','#9ebda6');box(z,320,280,960,880,36,'#29535a');
 const glow=z.createLinearGradient(350,300,1250,1000);glow.addColorStop(0,'#436969');glow.addColorStop(1,'#244a50');box(z,345,390,910,730,16,glow);
 box(z,390,295,820,76,14,'#102d36','#60cab6');text(z,'TARGET ARCADE',800,335,31);text(z,'A QUICK ROUND BEFORE THE DROP',800,359,12,'#93b7b5');
 z.strokeStyle='#79989144';z.lineWidth=1;for(let y=430;y<1100;y+=50){z.beginPath();z.moveTo(350,y);z.lineTo(1250,y);z.stroke()}
 for(const t of s.targets){const hot=s.time-t.hitAt<.3;z.fillStyle='#132d35';z.fillRect(t.x-7,t.y,14,120);for(const [r,c]of [[40,hot?'#f7d78a':'#e5e7cb'],[29,'#47bca6'],[17,'#f0e8bd'],[7,'#d77a57']]){z.beginPath();z.arc(t.x,t.y,r,0,7);z.fillStyle=c;z.fill()}text(z,String(t.id+1),t.x,t.y+148,16,'#a6c5bf')}
 z.strokeStyle='#7bd8be';z.lineWidth=4;z.setLineDash([18,14]);z.beginPath();z.moveTo(370,700);z.lineTo(1230,700);z.stroke();z.setLineDash([]);
 const active=p?.arcadeRoundEnd>s.time;box(z,510,780,580,100,18,'#163d43','#527f78');text(z,active?'SCORE  '+(p.arcadeScore||0)+'     ·     '+Math.ceil(p.arcadeRoundEnd-s.time)+'s':'PRESS E TO START A 30s ROUND',800,824,23);text(z,active?'COMBO ×'+(p.arcadeCombo||0)+'  ·  BEST '+(p.arcadeBest||0):'Aim with mouse · Fire to score · Build a combo',800,856,16,'#91cdbd');
 for(const q of s.shots){z.globalAlpha=Math.max(0,1-(s.time-q.time)/.2);z.strokeStyle=q.hit?'#ffe7a5':'#9fdfd3';z.lineWidth=4;z.beginPath();z.moveTo(q.x,q.y);z.lineTo(q.ex,q.ey);z.stroke()}z.globalAlpha=1;
 text(z,'WAIT · PLAY · DROP TOGETHER',800,1260,24,'#203f3c');text(z,'ENTER TO CHAT',800,1295,16,'#35594e');
 for(const xx of [220,1380])for(const yy of [540,1040]){box(z,xx-30,yy-70,60,140,10,'#a27d54','#36534a');z.fillStyle='#d1a971';z.fillRect(xx-18,yy-55,8,110);z.fillRect(xx+10,yy-55,8,110)}z.restore()}
function mini(z,s,players){z.save();z.fillStyle='#254e50';z.fillRect(0,0,180,180);z.scale(180/L.SIZE,180/L.SIZE);box(z,110,110,1380,1380,120,'#709d79');box(z,300,260,1000,920,40,'#29535a');for(const p of players){z.beginPath();z.arc(p.x,p.y,p.local?28:20,0,7);z.fillStyle=p.local?'#ffdc88':'#d4ece0';z.fill()}z.restore()}
return{draw,mini};
});