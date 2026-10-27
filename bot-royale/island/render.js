(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.IslandRender=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function poly(z,points){z.beginPath();points.forEach((p,i)=>i?z.lineTo(p[0],p[1]):z.moveTo(p[0],p[1]));z.closePath()}
function round(z,x,y,w,h,r=8){z.beginPath();z.roundRect(x,y,w,h,r)}
function cloud(z,x,y,r,lobes=8){z.beginPath();for(let i=0;i<=96;i++){const a=i/96*Math.PI*2,d=r*(.88+.10*Math.cos(a*lobes));i?z.lineTo(x+Math.cos(a)*d,y+Math.sin(a)*d):z.moveTo(x+Math.cos(a)*d,y+Math.sin(a)*d)}z.closePath()}
function terrain(z,s,view={x:0,y:0,w:6000,h:6000},map=false){
 z.fillStyle='#4a9bb5';z.fillRect(view.x,view.y,view.w,view.h);z.lineJoin='round';poly(z,s.coast);z.strokeStyle='#245e61';z.lineWidth=64;z.stroke();z.strokeStyle='#e7d89a';z.lineWidth=52;z.stroke();z.fillStyle='#8cbd72';z.fill();
 z.save();poly(z,s.coast);z.clip();
 for(const l of s.locations){z.fillStyle=l.color+'70';z.beginPath();z.ellipse(l.x,l.y,740,l.kind==='forest'?810:650,0,0,7);z.fill()}
 if(!map){z.strokeStyle='#467c3b15';z.lineWidth=1;for(let xx=Math.floor(view.x/80)*80;xx<view.x+view.w;xx+=80){z.beginPath();z.moveTo(xx,view.y);z.lineTo(xx,view.y+view.h);z.stroke()}for(let yy=Math.floor(view.y/80)*80;yy<view.y+view.h;yy+=80){z.beginPath();z.moveTo(view.x,yy);z.lineTo(view.x+view.w,yy);z.stroke()}}
 for(const f of s.fields){z.fillStyle='#cab85d';z.fillRect(f.x,f.y,f.w,f.h);z.strokeStyle='#a78e40';z.lineWidth=7;for(let xx=f.x+13;xx<f.x+f.w;xx+=23){z.beginPath();z.moveTo(xx,f.y+7);z.lineTo(xx,f.y+f.h-7);z.stroke()}}
 for(const road of s.roads){z.lineCap='round';z.beginPath();road.points.forEach((p,i)=>i?z.lineTo(...p):z.moveTo(...p));z.strokeStyle=road.paved?'#566e64':'#8e884e';z.lineWidth=road.width+12;z.stroke();z.strokeStyle=road.paved?'#7e8b83':'#c6b875';z.lineWidth=road.width;z.stroke();if(road.paved){z.setLineDash([24,22]);z.strokeStyle='#d8dac18c';z.lineWidth=3;z.stroke();z.setLineDash([])}}
 for(const w of s.water){z.beginPath();if(w.kind==='lake')z.ellipse(w.x,w.y,w.rx,w.ry,0,0,7);else{z.moveTo(w.ax,w.ay);z.lineTo(w.bx,w.by)}z.lineCap='round';z.strokeStyle='#d9d19c';z.lineWidth=w.kind==='lake'?27:w.r*2+27;z.stroke();if(w.kind==='lake'){z.fillStyle='#69c5dc';z.fill();z.strokeStyle='#368eaa';z.lineWidth=7;z.stroke()}else{z.strokeStyle='#368eaa';z.lineWidth=w.r*2+7;z.stroke();z.strokeStyle='#69c5dc';z.lineWidth=w.r*2;z.stroke()}}
 for(const b of s.bridges){const a=Math.atan2(b.by-b.ay,b.bx-b.ax),length=Math.hypot(b.bx-b.ax,b.by-b.ay);z.save();z.translate(b.ax,b.ay);z.rotate(a);z.fillStyle='#624b39';z.fillRect(-14,-b.width/2-7,length+28,b.width+14);z.fillStyle='#b69b67';z.fillRect(-8,-b.width/2,length+16,b.width);if(!map){z.strokeStyle='#826e4f';z.lineWidth=3;for(let d=0;d<length;d+=25){z.beginPath();z.moveTo(d,-b.width/2);z.lineTo(d,b.width/2);z.stroke()}z.fillStyle='#e4c994';z.fillRect(-8,-b.width/2, length+16,6);z.fillRect(-8,b.width/2-6,length+16,6)}z.restore()}
 z.restore();
}
function floors(z,s,visible){
 for(const b of s.buildings)if(visible(b)){z.fillStyle=b.style==='warehouse'?'#bac0b7':b.style==='shop'?'#d1ddd3':'#d4bb8f';z.fillRect(b.x,b.y,b.w,b.h);z.strokeStyle='#b3a17f';z.lineWidth=2;for(let yy=b.y+22;yy<b.y+b.h;yy+=28){z.beginPath();z.moveTo(b.x+12,yy);z.lineTo(b.x+b.w-12,yy);z.stroke()}}
}
function object(z,o,time){
 if(o.destroyed||o.lootContainer||o.kind==='bush')return;z.lineWidth=4;z.strokeStyle='#28473f';z.lineJoin='round';
 if(o.kind==='tree'){z.fillStyle='#7a6841';z.beginPath();z.arc(o.x,o.y,o.r,0,7);z.fill();z.stroke();return}
 if(o.kind==='door'){
  const target=o.open?Math.PI/2:0;o.angle+=(target-(o.angle||0))*.2;z.save();z.translate(o.x,o.y+o.h/2);z.rotate(o.angle||0);z.fillStyle='#9c754c';z.strokeStyle='#4d4935';z.fillRect(0,-o.h/2,o.w,o.h);z.strokeRect(0,-o.h/2,o.w,o.h);z.fillStyle='#f0d782';z.fillRect(o.w-15,-3,5,6);z.restore();return;
 }
 if(o.shape==='circle'){
  if(o.kind==='rock'){z.beginPath();for(let i=0;i<7;i++){const a=i/7*Math.PI*2,r=o.r*(i%2?.91:1);i?z.lineTo(o.x+Math.cos(a)*r,o.y+Math.sin(a)*r):z.moveTo(o.x+Math.cos(a)*r,o.y+Math.sin(a)*r)}z.closePath();z.fillStyle='#9aafa4';z.fill();z.stroke();z.fillStyle='#bdc9b9';z.beginPath();z.arc(o.x-o.r*.2,o.y-o.r*.2,o.r*.44,0,7);z.fill()}
  else{z.fillStyle='#c47149';z.beginPath();z.arc(o.x,o.y,o.r,0,7);z.fill();z.stroke();z.strokeStyle='#794e39';z.lineWidth=5;z.beginPath();z.moveTo(o.x-o.r*.75,o.y-6);z.lineTo(o.x+o.r*.75,o.y-6);z.moveTo(o.x-o.r*.75,o.y+7);z.lineTo(o.x+o.r*.75,o.y+7);z.stroke()}return;
 }
 const colors={wall:'#d3ded0',sofa:'#6aafa1',table:'#ae8253',bed:'#a2bbd0',counter:'#b1bcb4',pallet:'#a18858',hay:'#dac358',container:o.color||'#728e9d',fence:'#b8aa7b',planter:'#a67d57',machine:'#d0aa52'};
 z.fillStyle=colors[o.kind]||'#b5a77f';z.strokeStyle=o.kind==='wall'?'#526356':o.kind==='container'?'#3c5961':'#4e5941';z.lineWidth=o.kind==='wall'?3:4;
 round(z,o.x,o.y,o.w,o.h,o.kind==='wall'?1:5);z.fill();z.stroke();
 if(o.kind==='container'||o.kind==='pallet'||o.kind==='hay'){z.strokeStyle='#2f473a50';z.lineWidth=3;for(let xx=o.x+13;xx<o.x+o.w;xx+=17){z.beginPath();z.moveTo(xx,o.y+6);z.lineTo(xx,o.y+o.h-6);z.stroke()}}
 if(o.kind==='machine'){z.fillStyle='#365967';z.fillRect(o.x+10,o.y+12,o.w-20,22);z.fillStyle='#8fe0da';z.fillRect(o.x+16,o.y+16,12,9);z.strokeStyle='#705e38';z.lineWidth=4;z.beginPath();z.moveTo(o.x+5,o.y+o.h-11);z.lineTo(o.x+o.w-5,o.y+o.h-11);z.stroke()}if(o.kind==='planter'){z.fillStyle='#3a6950';z.fillRect(o.x+5,o.y+5,o.w-10,o.h-10);for(let i=0;i<4;i++){z.fillStyle=['#e6bd62','#d88d82','#dcd29d'][i%3];z.beginPath();z.arc(o.x+12+i*13,o.y+o.h/2,4,0,7);z.fill()}}if(o.kind==='bed'){z.fillStyle='#ece6d2';round(z,o.x+5,o.y+5,o.w-10,13,3);z.fill()}
 if(o.kind==='sofa'){z.strokeStyle='#407d75';z.beginPath();z.moveTo(o.x+o.w/2,o.y);z.lineTo(o.x+o.w/2,o.y+o.h);z.stroke()}
}
function bushes(z,s,visible){for(const b of s.bushes)if(visible({x:b.x-b.r,y:b.y-b.r,w:b.r*2,h:b.r*2})){z.strokeStyle='#275d4b';z.lineWidth=5;z.fillStyle='#43895c';cloud(z,b.x,b.y,b.r,7);z.fill();z.stroke();z.fillStyle='#63a96a';z.beginPath();z.arc(b.x-8,b.y-11,b.r*.43,0,7);z.fill()}}
function canopies(z,objects,local){for(const t of objects)if(t.kind==='tree'&&!t.destroyed){z.save();if(Math.hypot(local.x-t.x,local.y-t.y)<t.canopy+45)z.globalAlpha=.58;z.fillStyle=['#42835a','#3b7c55','#518d57'][t.tint||0];z.strokeStyle='#28583f';z.lineWidth=6;cloud(z,t.x,t.y,t.canopy,8);z.fill();z.stroke();z.fillStyle='#69a363';z.beginPath();z.arc(t.x-12,t.y-14,t.canopy*.48,0,7);z.fill();z.restore()}}
function crate(z,c){
 if(c.destroyed)return;z.save();z.translate(c.x,c.y);z.lineWidth=4;z.strokeStyle='#424b3a';z.fillStyle=c.open?'#7c8d77':c.kind==='gold'?'#e7bd46':c.kind==='ammo'?'#729b69':'#bd9256';round(z,-19,-17,38,34,4);z.fill();z.stroke();
 if(!c.open){z.strokeStyle=c.kind==='gold'?'#f6df86':'#5d6544';z.lineWidth=4;z.beginPath();z.moveTo(-11,-16);z.lineTo(-11,16);z.moveTo(11,-16);z.lineTo(11,16);z.stroke();z.fillStyle='#f6ead0';z.fillRect(-4,-5,8,10)}
 else{z.fillStyle='#273f34';z.fillRect(-12,-9,24,17)}z.restore();
}
function loot(z,q,art,tiers,near=false,key='E'){
 if(q.taken)return;if(q.type==='gun'){const color=tiers[q.rarity||0][1];z.save();z.fillStyle=color;z.globalAlpha=.24;z.beginPath();z.arc(q.x,q.y,37,0,7);z.fill();z.globalAlpha=1;z.strokeStyle=color;z.lineWidth=3;z.stroke();if(art){const iw=art.width||art.naturalWidth,ih=art.height||art.naturalHeight,f=Math.min(64/iw,44/ih);z.drawImage(art,q.x-iw*f/2,q.y-ih*f/2,iw*f,ih*f)}else{z.fillStyle='#243e37';z.fillRect(q.x-20,q.y-4,40,8)}z.restore();if(near){z.font='bold 11px sans-serif';z.textAlign='center';z.fillStyle='#132c2cf0';round(z,q.x-64,q.y-68,128,23,5);z.fill();z.fillStyle=color;z.fillText(tiers[q.rarity||0][0]+' · '+key,q.x,q.y-52);z.textAlign='start'}}
 else{z.fillStyle=q.type==='med'?'#f2eee0':q.type==='shield'?'#82dbf0':'#c8b66c';z.strokeStyle='#385b48';z.lineWidth=3;round(z,q.x-13,q.y-13,26,26,5);z.fill();z.stroke();z.fillStyle=q.type==='med'?'#b44d4c':'#3e6550';if(q.type==='ammo'){for(let i=-7;i<=7;i+=7)z.fillRect(q.x+i-2,q.y-7,4,14)}else{z.font='bold 21px sans-serif';z.fillText(q.type==='med'?'+':'◆',q.x-7,q.y+7)}}
}
function roofs(z,s,local,visible,dt=.016){
 for(const b of s.buildings)if(visible(b)){
  const inside=local.x>b.x&&local.x<b.x+b.w&&local.y>b.y&&local.y<b.y+b.h,target=inside?.035:1;b.roofAlpha=(b.roofAlpha??1)+(target-(b.roofAlpha??1))*Math.min(1,dt*12);
  z.save();z.globalAlpha=b.roofAlpha;z.fillStyle=b.style==='warehouse'?'#7b9da1':b.style==='barn'?'#bc7356':b.style==='shop'?'#7295b5':['#bca471','#94a0b3','#bd9476'][b.variant%3];z.strokeStyle='#364f46';z.lineWidth=6;round(z,b.x-3,b.y-3,b.w+6,b.h+6,5);z.fill();z.stroke();
  z.strokeStyle='#ecedcf35';z.lineWidth=3;for(let yy=b.y+22;yy<b.y+b.h;yy+=25){z.beginPath();z.moveTo(b.x+9,yy);z.lineTo(b.x+b.w-9,yy);z.stroke()}
  z.fillStyle='#435c55';round(z,b.x+25,b.y+23,32,23,3);z.fill();z.restore();
 }
}
function gas(z,s,view){
 const c=s.zone.current;z.save();z.fillStyle='#409cf04a';z.beginPath();z.rect(view.x,view.y,view.w,view.h);z.arc(c.x,c.y,c.r,0,Math.PI*2,true);z.fill('evenodd');z.lineWidth=6;z.strokeStyle='#64caff';z.beginPath();z.arc(c.x,c.y,c.r,0,7);z.stroke();const next=s.zone.next;z.setLineDash([14,13]);z.strokeStyle='#f2fbef';z.lineWidth=3;z.beginPath();z.arc(next.x,next.y,next.r,0,7);z.stroke();z.restore();
}
function mapBase(z,s,view){terrain(z,s,view,true);
 for(const o of s.index.query(view.x,view.y,view.w,view.h)){if(o.destroyed||o.lootContainer)continue;if(o.kind==='tree'||o.kind==='bush'||o.kind==='rock'){z.fillStyle=o.kind==='tree'?'#39774e':o.kind==='bush'?'#609958':'#93a99e';z.strokeStyle=o.kind==='rock'?'#45615b':'#295a43';z.lineWidth=5;z.beginPath();z.arc(o.x,o.y,o.kind==='tree'?o.canopy*.7:o.r*.8,0,7);z.fill();z.stroke()}else if(['container','fence','machine','planter'].includes(o.kind)){z.fillStyle=o.kind==='container'?(o.color||'#81999a'):o.kind==='machine'?'#c5a04f':'#9a9462';z.fillRect(o.x,o.y,o.w,o.h)}}
 for(const b of s.buildings){z.fillStyle='#536c67';z.fillRect(b.x,b.y,b.w,b.h);z.strokeStyle='#244a46';z.lineWidth=6;z.strokeRect(b.x,b.y,b.w,b.h)}
}
function cachedMapBase(z,s,left,top,span,w,h){const resolution=Math.max(1024,Math.ceil(Math.max(w,h)/256)*256),revision=s.mapRevision||0;let cache=s.mapCache;if(typeof document!=='undefined'&&typeof document.createElement==='function'){if(!cache||cache.revision!==revision||cache.resolution<resolution){const canvas=document.createElement('canvas');canvas.width=resolution;canvas.height=resolution;const context=canvas.getContext('2d');context.scale(resolution/6000,resolution/6000);mapBase(context,s,{x:0,y:0,w:6000,h:6000});cache=s.mapCache={canvas,resolution,revision}}const factor=cache.resolution/6000;z.drawImage(cache.canvas,left*factor,top*factor,span*factor,span*factor,left,top,span,span)}else mapBase(z,s,{x:left,y:top,w:span,h:span})}
function map(z,s,w,h,player,marker,route,plane,span=6000){
 z.save();z.clearRect(0,0,w,h);const scale=Math.min(w,h)/span,cx=span===6000?3000:Math.max(span/2,Math.min(6000-span/2,player.x)),cy=span===6000?3000:Math.max(span/2,Math.min(6000-span/2,player.y)),left=cx-span/2,top=cy-span/2;
 z.scale(scale,scale);z.translate(-left,-top);cachedMapBase(z,s,left,top,span,w,h);
 gas(z,s,{x:left,y:top,w:span,h:span});
 if(span===6000)for(const loc of s.locations){z.textAlign='center';z.font='900 94px sans-serif';z.lineWidth=23;z.strokeStyle='#183831';z.strokeText(loc.name,loc.x,loc.y-55);z.fillStyle='#f3f3cd';z.fillText(loc.name,loc.x,loc.y-55)}z.textAlign='start';
 if(route&&plane){z.save();z.setLineDash([55,40]);z.lineWidth=11;z.strokeStyle='#fff6b9';z.beginPath();z.moveTo(route.start.x,route.start.y);z.lineTo(route.end.x,route.end.y);z.stroke();z.setLineDash([]);z.translate(plane.x,plane.y);z.rotate(route.angle);z.fillStyle='#fff8da';z.strokeStyle='#153b4c';z.lineWidth=10;z.beginPath();z.moveTo(80,0);z.lineTo(-50,-50);z.lineTo(-26,0);z.lineTo(-50,50);z.closePath();z.fill();z.stroke();z.restore()}
 if(marker){z.fillStyle='#ffdf58';z.strokeStyle='#573d1a';z.lineWidth=span/600;z.beginPath();z.arc(marker.x,marker.y,span/75,0,7);z.fill();z.stroke();z.beginPath();z.moveTo(marker.x,marker.y+span/65);z.lineTo(marker.x,marker.y-span/45);z.stroke()}
 z.fillStyle='#fff';z.strokeStyle='#1f5b64';z.lineWidth=span/500;z.beginPath();z.arc(player.x,player.y,span/90,0,7);z.fill();z.stroke();z.restore();return{left,top,scale};
}
return{terrain,floors,object,bushes,canopies,crate,loot,roofs,gas,map};
});
