(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./lobby-world.js'):root.IslandLobby);if(typeof module==='object'&&module.exports)module.exports=api;else root.IslandLobbyRender=api})(typeof globalThis!=='undefined'?globalThis:this,function(L){
 function plaza(z){
  const edge=100,side=L.SIZE-edge*2,center=L.CENTER;
  z.fillStyle='#0e4058';z.fillRect(0,0,L.SIZE,L.SIZE);
  z.fillStyle='#318496';z.fillRect(edge-22,edge-22,side+44,side+44);
  z.fillStyle='#dcc590';z.fillRect(edge,edge,side,side);
  z.fillStyle='#608b71';z.fillRect(edge+24,edge+24,side-48,side-48);
  z.fillStyle='#4d7464';z.fillRect(270,270,1060,1060);
  z.fillStyle='#b9c9b5';z.fillRect(320,320,960,960);
  z.strokeStyle='#728d783f';z.lineWidth=2;z.beginPath();
  for(let line=400;line<1280;line+=80){z.moveTo(line,320);z.lineTo(line,1280);z.moveTo(320,line);z.lineTo(1280,line)}z.stroke();
  z.strokeStyle='#eee2b0';z.lineWidth=5;z.strokeRect(340,340,920,920);
  for(const [radius,color] of [[218,'#9daf9f'],[184,'#e5dbb4'],[174,'#407a77'],[151,'#55918a']]){
   z.fillStyle=color;z.beginPath();z.arc(center,center,radius,0,Math.PI*2);z.fill();
  }
  z.fillStyle='#efe3b4';z.beginPath();z.moveTo(center,center-112);z.lineTo(center+43,center+68);z.lineTo(center,center+40);z.lineTo(center-43,center+68);z.closePath();z.fill();
  z.fillStyle='#d9ead9';z.font='bold 30px system-ui';z.textAlign='center';z.fillText('HARBOR PLAZA',center,220);
 }
 let background;
 function draw(z,s,v){
  z.save();z.fillStyle='#0e4058';z.fillRect(v.x,v.y,v.w,v.h);
  if(!background&&typeof OffscreenCanvas!=='undefined'){
   const canvas=new OffscreenCanvas(L.SIZE,L.SIZE),context=canvas.getContext('2d');
   if(context){plaza(context);background=canvas}
  }
  if(background)z.drawImage(background,0,0);else plaza(z);
  z.restore();
 }
 function mini(z,s,players){
  z.save();z.scale(180/L.SIZE,180/L.SIZE);draw(z,s,{x:0,y:0,w:L.SIZE,h:L.SIZE});
  for(const p of players){z.beginPath();z.arc(p.x,p.y,p.local?28:20,0,7);z.fillStyle=p.local?'#ffdc88':'#f5ffff';z.fill()}
  z.restore();
 }
 return{draw,mini};
});
