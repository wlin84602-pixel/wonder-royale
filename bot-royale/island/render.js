(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./world.js'):root.IslandCore,typeof module==='object'&&module.exports?require('./map-theme.js'):root.IslandMapTheme);if(typeof module==='object'&&module.exports)module.exports=api;else root.IslandRender=api})(typeof globalThis!=='undefined'?globalThis:this,function(Core,Theme){
'use strict';
function poly(z,points){z.beginPath();points.forEach((p,i)=>i?z.lineTo(p[0],p[1]):z.moveTo(p[0],p[1]));z.closePath()}
function round(z,x,y,w,h,r=8){z.beginPath();z.roundRect(x,y,w,h,r)}
function cloud(z,x,y,r,lobes=8){z.beginPath();for(let i=0;i<=96;i++){const a=i/96*Math.PI*2,d=r*(.88+.10*Math.cos(a*lobes));i?z.lineTo(x+Math.cos(a)*d,y+Math.sin(a)*d):z.moveTo(x+Math.cos(a)*d,y+Math.sin(a)*d)}z.closePath()}
function terrain(z,s,view={x:0,y:0,w:s.size,h:s.size},map=false){
 z.fillStyle='#1978a6';z.fillRect(view.x,view.y,view.w,view.h);z.lineJoin='round';poly(z,s.coast);z.strokeStyle='#214d58';z.lineWidth=64;z.stroke();z.strokeStyle='#e7cb82';z.lineWidth=52;z.stroke();z.fillStyle=Theme.themes.grass.ground;z.fill();
 z.save();poly(z,s.coast);z.clip();
 for(const region of Theme.regions){poly(z,region.renderPoints.map(([xx,yy])=>[xx*s.size,yy*s.size]));z.fillStyle=Theme.themes[region.id].ground;z.strokeStyle=z.fillStyle;z.lineJoin='round';z.lineWidth=s.size*.018;z.stroke();z.fill()}
 {const pitch=map?260:180;for(let gy=Math.floor(view.y/pitch);gy<Math.ceil((view.y+view.h)/pitch);gy++)for(let gx=Math.floor(view.x/pitch);gx<Math.ceil((view.x+view.w)/pitch);gx++){const n=Theme.noise(gx,gy),xx=gx*pitch+n*100,yy=gy*pitch+Theme.noise(gy,gx)*100,t=Theme.at(xx,yy,s.size);z.fillStyle=t.fleck+'55';if(t===Theme.themes.snow){poly(z,[[xx,yy],[xx+26,yy-8],[xx+44,yy+7],[xx+28,yy+19],[xx+3,yy+14]]);z.fill()}else{z.beginPath();z.ellipse(xx,yy,9+n*11,5+n*4,.3,0,7);z.fill();if(n>.65){z.strokeStyle=t.fleck+'88';z.lineWidth=2;z.beginPath();z.moveTo(xx-5,yy);z.lineTo(xx-9,yy-9);z.moveTo(xx,yy);z.lineTo(xx+2,yy-13);z.moveTo(xx+4,yy);z.lineTo(xx+10,yy-7);z.stroke()}}}}

 if(!map){z.strokeStyle='#2547380a';z.lineWidth=1;for(let xx=Math.floor(view.x/80)*80;xx<view.x+view.w;xx+=80){z.beginPath();z.moveTo(xx,view.y);z.lineTo(xx,view.y+view.h);z.stroke()}for(let yy=Math.floor(view.y/80)*80;yy<view.y+view.h;yy+=80){z.beginPath();z.moveTo(view.x,yy);z.lineTo(view.x+view.w,yy);z.stroke()}}
 for(const f of s.fields){if(f.x+f.w<view.x||f.y+f.h<view.y||f.x>view.x+view.w||f.y>view.y+view.h)continue;z.fillStyle='#cab85d';z.fillRect(f.x,f.y,f.w,f.h);z.strokeStyle='#a78e40';z.lineWidth=7;for(let xx=f.x+13;xx<f.x+f.w;xx+=23){z.beginPath();z.moveTo(xx,f.y+7);z.lineTo(xx,f.y+f.h-7);z.stroke()}}
 for(const road of s.roads){z.lineCap='round';z.beginPath();road.points.forEach((p,i)=>i?z.lineTo(...p):z.moveTo(...p));z.strokeStyle=road.paved?'#364a51':'#927d52';z.lineWidth=road.width+12;z.stroke();z.strokeStyle=road.paved?'#637275':'#bca06b';z.lineWidth=road.width;z.stroke();if(road.paved){z.setLineDash([24,22]);z.strokeStyle='#dcc17b99';z.lineWidth=3;z.stroke();z.setLineDash([])}}
 for(const w of s.water){z.beginPath();if(w.kind==='lake')z.ellipse(w.x,w.y,w.rx,w.ry,0,0,7);else{z.moveTo(w.ax,w.ay);z.lineTo(w.bx,w.by)}z.lineCap='round';z.strokeStyle='#d9d19c';z.lineWidth=w.kind==='lake'?27:w.r*2+27;z.stroke();if(w.kind==='lake'){z.fillStyle='#28acd4';z.fill();z.strokeStyle='#227692';z.lineWidth=7;z.stroke()}else{z.strokeStyle='#227692';z.lineWidth=w.r*2+7;z.stroke();z.strokeStyle='#28acd4';z.lineWidth=w.r*2;z.stroke()}}
 for(const b of s.bridges){const a=Math.atan2(b.by-b.ay,b.bx-b.ax),length=Math.hypot(b.bx-b.ax,b.by-b.ay);z.save();z.translate(b.ax,b.ay);z.rotate(a);z.fillStyle='#624b39';z.fillRect(-14,-b.width/2-7,length+28,b.width+14);z.fillStyle='#b69b67';z.fillRect(-8,-b.width/2,length+16,b.width);if(!map){z.strokeStyle='#826e4f';z.lineWidth=3;for(let d=0;d<length;d+=25){z.beginPath();z.moveTo(d,-b.width/2);z.lineTo(d,b.width/2);z.stroke()}z.fillStyle='#e4c994';z.fillRect(-8,-b.width/2, length+16,6);z.fillRect(-8,b.width/2-6,length+16,6)}z.restore()}
 z.restore();
}
function floors(z,s,visible){
 function floor(x,y,w,h,type,t){z.fillStyle=type==='wood'?t.floor:type==='sand'?(t===Theme.themes.beach?'#e4d2a1':'#c8c3a5'):t.tile;z.fillRect(x,y,w,h);z.lineWidth=1;z.strokeStyle=type==='wood'?'#41352235':'#34475335';const pitch=type==='wood'?20:30;for(let yy=y+pitch;yy<y+h;yy+=pitch){z.beginPath();z.moveTo(x,yy);z.lineTo(x+w,yy);z.stroke()}if(type!=='wood')for(let xx=x+pitch;xx<x+w;xx+=pitch){z.beginPath();z.moveTo(xx,y);z.lineTo(xx,y+h);z.stroke()}else{z.strokeStyle='#efd2a323';for(let yy=y+7;yy<h+y;yy+=20){z.beginPath();z.moveTo(x+7,yy);z.lineTo(x+w-7,yy);z.stroke()}}}
 for(const b of s.buildings)if(visible(b)){const t=Theme.at(b.x+b.w/2,b.y+b.h/2,s.size);z.save();poly(z,b.outline||[[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.h],[b.x,b.y+b.h]]);z.clip();floor(b.x,b.y,b.w,b.h,b.floor||'wood',t);for(const room of b.rooms||[])floor(room.x,room.y,room.w,room.h,room.floor,t);z.restore()}
}
function architectureObject(z,o,time){
 if(o.kind==='door'&&o.hingeX!==undefined){
  const pose=Core.doorPose(o,time),angle=pose.angle-o.closedAngle;
  z.save();z.translate(o.hingeX,o.hingeY);z.rotate(o.closedAngle);
  z.strokeStyle='#142b34';z.lineWidth=4;z.fillStyle='#344f5b';for(const xx of [-8,o.length-8]){round(z,xx,-17,16,34,3);z.fill();z.stroke()}
  z.rotate(angle);z.fillStyle='#ffc963';round(z,1,-7,o.length-2,14,2);z.fill();z.stroke();z.fillStyle='#ffe6a0';z.fillRect(5,-5,o.length-12,3);
  z.fillStyle='#1e3d4b';z.beginPath();z.moveTo(o.length-20,-4);z.lineTo(o.length-10,0);z.lineTo(o.length-20,4);z.closePath();z.fill();z.fillStyle='#8c6932';z.fillRect(o.length-5,-2,3,4);z.restore();return true;
 }
 if(o.shape==='segment'){
  const theme=Theme.at((o.ax+o.bx)/2,(o.ay+o.by)/2,Core.SIZE),angle=Math.atan2(o.by-o.ay,o.bx-o.ax),len=Math.hypot(o.bx-o.ax,o.by-o.ay);z.save();z.translate(o.ax,o.ay);z.rotate(angle);z.lineCap='square';
  z.strokeStyle=theme.edge;z.lineWidth=24;z.beginPath();z.moveTo(0,0);z.lineTo(len,0);z.stroke();
  z.strokeStyle=o.kind==='window'?'#215b71':o.paint==='barn'&&theme!==Theme.themes.snow?'#8d4540':theme.wall;z.lineWidth=16;z.stroke();
  if(o.kind==='window'){z.fillStyle='#16c8f6';z.fillRect(2,-5,Math.max(0,len-4),10);z.fillStyle='#7ceaff';z.fillRect(3,-5,Math.max(0,len-6),2);z.strokeStyle='#d7faff';z.lineWidth=2;for(const p of [.26,.67]){z.beginPath();z.moveTo(len*p-8,4);z.lineTo(len*p+5,-4);z.stroke()}}
  else{z.strokeStyle=o.paint==='barn'&&theme!==Theme.themes.snow?'#ba6e52':theme.light;z.lineWidth=4;z.beginPath();z.moveTo(2,-4);z.lineTo(len-2,-4);z.stroke();if(len>60){z.strokeStyle=theme.edge+'aa';z.lineWidth=2;for(let xx=40;xx<len-15;xx+=48){z.beginPath();z.moveTo(xx,-6);z.lineTo(xx,6);z.stroke()}}}
 if(len>28){z.fillStyle=theme.wall;z.strokeStyle=theme.edge;z.lineWidth=3;for(const xx of [-7,len-7]){round(z,xx,-10,14,20,2);z.fill();z.stroke();z.fillStyle=theme.light;z.fillRect(xx+2,-8,10,3);z.fillStyle=theme.wall}}
  z.restore();return true;
 }
 if(!['shelf','car','tractor','pool','toilet','sink','desk','workbench','woodcrate','mat','bed','counter','table','sofa','hay'].includes(o.kind))return false;
 z.save();z.translate(o.x,o.y);const w=o.w,h=o.h;z.lineWidth=3;z.strokeStyle='#273f46';
 const box=(x,y,ww,hh,color,r=3)=>{z.fillStyle=color;round(z,x,y,ww,hh,r);z.fill();z.stroke()};
 if(o.kind==='pool'){
  box(0,0,w,h,'#e3e7df',5);box(10,10,w-20,h-20,'#078fc8',2);z.fillStyle='#0bb6e3';z.fillRect(16,16,w-32,h-32);z.strokeStyle='#8cdded45';z.lineWidth=1;
  for(let yy=22;yy<h-16;yy+=17)for(let xx=20;xx<w-20;xx+=21){z.beginPath();z.arc(xx,yy,3,0,Math.PI);z.stroke()}
 }else if(o.kind==='shelf'){
  box(0,0,w,h,'#5c6d77',2);z.fillStyle='#cbb587';z.fillRect(4,4,w-8,h-8);for(let yy=8;yy<h-7;yy+=16){for(let xx=6;xx<w-5;xx+=8){z.fillStyle=['#e88049','#74c8d6','#efe1a0'][Math.floor((yy+xx)/8)%3];z.fillRect(xx,yy,5,9)}z.strokeStyle='#4e626c';z.lineWidth=2;z.beginPath();z.moveTo(2,yy+12);z.lineTo(w-2,yy+12);z.stroke()}
 }else if(o.kind==='car'||o.kind==='tractor'){
  const car=o.kind==='car';z.fillStyle='#172f35';for(const yy of [h*.19,h*.70]){round(z,-5,yy,17,h*.18,3);z.fill();round(z,w-12,yy,17,h*.18,3);z.fill()}
  box(7,3,w-14,h-6,car?'#156eaf':'#af373b',8);box(15,h*.25,w-30,h*.45,car?'#224d64':'#3d5260',6);z.fillStyle=car?'#48b1d6':'#dd6561';z.fillRect(18,h*.27,w-36,h*.1);box(17,h*.39,w-34,h*.22,car?'#0d609c':'#bd4144',4);z.fillStyle='#f4db8e';z.fillRect(12,8,12,5);z.fillRect(w-24,8,12,5);z.fillStyle='#a52e3c';z.fillRect(12,h-14,12,5);z.fillRect(w-24,h-14,12,5);
 }else if(o.kind==='toilet'){
  box(2,0,w-4,h*.36,'#f6f6ed',4);z.fillStyle='#e5f0ee';z.beginPath();z.ellipse(w/2,h*.67,w*.38,h*.31,0,0,7);z.fill();z.stroke();z.fillStyle='#bed9e0';z.beginPath();z.ellipse(w/2,h*.64,w*.19,h*.16,0,0,7);z.fill();
 }else if(o.kind==='sink'){
  box(0,0,w,h,'#e5e8df');box(5,5,w-10,h-9,'#b8d1d5',3);z.fillStyle='#506b76';z.fillRect(w/2-2,1,4,8);
 }else if(o.kind==='bed'){
  box(0,0,w,h,'#775641');box(4,4,w-8,h-8,'#327fa7');box(8,7,w-16,17,'#e8ebe2');z.strokeStyle='#55afcf';z.beginPath();z.moveTo(6,h-16);z.lineTo(w-6,h-16);z.stroke();
 }else if(o.kind==='sofa'){
  box(0,0,w,h,o.color||'#4389af',5);z.strokeStyle='#273f46';z.beginPath();if(w>h){z.moveTo(w/2,5);z.lineTo(w/2,h-5);z.moveTo(6,9);z.lineTo(w-6,9)}else{z.moveTo(5,h/2);z.lineTo(w-5,h/2);z.moveTo(9,5);z.lineTo(9,h-5)}z.stroke();z.fillStyle='#ffffff20';z.fillRect(7,4,w-14,3);
 }else if(o.kind==='table'){
  box(0,0,w,h,'#625542');box(5,5,w-10,h-10,'#9f936c');if(w>90){box(w*.28,12,w*.44,13,'#6bb3cc',1)}else{z.fillStyle='#c5cebc';z.fillRect(w*.5,h*.35,9,8);z.fillStyle='#8b5e36';z.fillRect(10,11,12,9)}
 }else if(o.kind==='counter'||o.kind==='desk'||o.kind==='workbench'){
  box(0,0,w,h,'#7a8177');z.fillStyle='#424f48';z.fillRect(4,h-8,w-8,4);for(let xx=8;xx<w-12;xx+=32){z.strokeStyle='#364c4e';z.strokeRect(xx,5,23,Math.min(21,h-14));z.fillStyle='#9cc2c6';z.fillRect(xx+3,8,17,Math.min(13,h-20));z.fillStyle='#445e66';z.fillRect(xx+6,9,10,3)}
 }else if(o.kind==='woodcrate'){
  box(0,0,w,h,'#a98247',2);z.strokeStyle='#e0ba74';z.lineWidth=2;z.strokeRect(5,5,w-10,h-10);z.beginPath();z.moveTo(7,7);z.lineTo(w-7,h-7);z.moveTo(w-7,7);z.lineTo(7,h-7);z.stroke();
 }else if(o.kind==='hay'){
  box(0,0,w,h,'#e0b54e',3);z.strokeStyle='#f4cf6e';z.lineWidth=1;for(let yy=5;yy<h;yy+=7){z.beginPath();z.moveTo(4,yy);z.lineTo(w-4,yy-3);z.stroke()}z.strokeStyle='#9d7b37';z.lineWidth=2;z.beginPath();z.moveTo(w/2,1);z.lineTo(w/2,h-1);z.stroke();
 }else if(o.kind==='mat'){box(0,0,w,h,'#8c9d76',1);box(5,5,w-10,h-10,'#497b80',1)}
 z.restore();return true;
}

function object(z,o,time){
 if(o.destroyed||o.lootContainer||o.kind==='bush')return;if(architectureObject(z,o,time))return;z.lineWidth=4;z.strokeStyle='#28473f';z.lineJoin='round';
 if(o.kind==='tree'){z.fillStyle='#7a6841';z.beginPath();z.arc(o.x,o.y,o.trunkRadius||o.r,0,7);z.fill();z.stroke();return}
 if(o.kind==='door'){
  const target=o.open?Math.PI/2:0;o.angle+=(target-(o.angle||0))*.2;z.save();z.translate(o.x,o.y+o.h/2);z.rotate(o.angle||0);z.fillStyle='#9c754c';z.strokeStyle='#4d4935';z.fillRect(0,-o.h/2,o.w,o.h);z.strokeRect(0,-o.h/2,o.w,o.h);z.fillStyle='#f0d782';z.fillRect(o.w-15,-3,5,6);z.restore();return;
 }
 if(o.shape==='circle'){
  if(o.kind==='rock'){z.beginPath();for(let i=0;i<7;i++){const a=i/7*Math.PI*2,r=o.r*(i%2?.91:1);i?z.lineTo(o.x+Math.cos(a)*r,o.y+Math.sin(a)*r):z.moveTo(o.x+Math.cos(a)*r,o.y+Math.sin(a)*r)}z.closePath();const theme=Theme.at(o.x,o.y,Core.SIZE);z.fillStyle=theme===Theme.themes.haunted?'#8a679c':theme===Theme.themes.snow?'#9bb5c7':'#8a958b';z.fill();z.stroke();z.fillStyle=theme===Theme.themes.haunted?'#b38dd1':theme===Theme.themes.snow?'#e3f0f4':'#b6c1ac';z.beginPath();z.arc(o.x-o.r*.2,o.y-o.r*.2,o.r*.44,0,7);z.fill()}
  else{z.fillStyle='#c47149';z.beginPath();z.arc(o.x,o.y,o.r,0,7);z.fill();z.stroke();z.strokeStyle='#794e39';z.lineWidth=5;z.beginPath();z.moveTo(o.x-o.r*.75,o.y-6);z.lineTo(o.x+o.r*.75,o.y-6);z.moveTo(o.x-o.r*.75,o.y+7);z.lineTo(o.x+o.r*.75,o.y+7);z.stroke()}return;
 }
 const colors={wall:'#d3ded0',sofa:'#6aafa1',table:'#ae8253',bed:'#a2bbd0',counter:'#b1bcb4',pallet:'#a18858',hay:'#dac358',container:o.color||'#728e9d',fence:'#b8aa7b',planter:'#a67d57',machine:'#d0aa52'};
 z.fillStyle=colors[o.kind]||'#b5a77f';z.strokeStyle=o.kind==='wall'?'#526356':o.kind==='container'?'#3c5961':'#4e5941';z.lineWidth=o.kind==='wall'?3:4;
 round(z,o.x,o.y,o.w,o.h,o.kind==='wall'?1:5);z.fill();z.stroke();
 if(o.kind==='container'||o.kind==='pallet'||o.kind==='hay'){z.strokeStyle='#2f473a50';z.lineWidth=3;for(let xx=o.x+13;xx<o.x+o.w;xx+=17){z.beginPath();z.moveTo(xx,o.y+6);z.lineTo(xx,o.y+o.h-6);z.stroke()}}
 if(o.kind==='machine'){z.fillStyle='#365967';z.fillRect(o.x+10,o.y+12,o.w-20,22);z.fillStyle='#8fe0da';z.fillRect(o.x+16,o.y+16,12,9);z.strokeStyle='#705e38';z.lineWidth=4;z.beginPath();z.moveTo(o.x+5,o.y+o.h-11);z.lineTo(o.x+o.w-5,o.y+o.h-11);z.stroke()}if(o.kind==='planter'){z.fillStyle='#3a6950';z.fillRect(o.x+5,o.y+5,o.w-10,o.h-10);for(let i=0;i<4;i++){z.fillStyle=['#e6bd62','#d88d82','#dcd29d'][i%3];z.beginPath();z.arc(o.x+12+i*13,o.y+o.h/2,4,0,7);z.fill()}}if(o.kind==='bed'){z.fillStyle='#ece6d2';round(z,o.x+5,o.y+5,o.w-10,13,3);z.fill()}
 if(o.kind==='sofa'){z.strokeStyle='#407d75';z.beginPath();z.moveTo(o.x+o.w/2,o.y);z.lineTo(o.x+o.w/2,o.y+o.h);z.stroke()}
}
function bushes(z,s,visible,local=null){for(const b of s.bushes)if(visible({x:b.x-b.r,y:b.y-b.r,w:b.r*2,h:b.r*2})){const t=Theme.themes[b.visualBiome]||Theme.at(b.x,b.y,Core.SIZE);z.save();if(local&&Math.hypot(local.x-b.x,local.y-b.y)<(b.hideRadius??b.r*.83))z.globalAlpha=.55;z.strokeStyle=t.treeEdge;z.lineWidth=3;z.fillStyle=t.tree[0];cloud(z,b.x,b.y,b.r,7);z.fill();z.stroke();z.fillStyle=t.leaf;for(const [dx,dy,angle]of [[-.3,-.3,-.5],[.25,-.2,.5],[-.1,.3,.2]]){z.beginPath();z.ellipse(b.x+dx*b.r,b.y+dy*b.r,b.r*.25,b.r*.13,angle,0,7);z.fill()}z.restore()}}
function canopies(z,objects,local){for(const tree of objects)if(tree.kind==='tree'&&!tree.destroyed){const t=Theme.themes[tree.visualBiome]||Theme.at(tree.x,tree.y,Core.SIZE),r=tree.canopy;z.save();z.fillStyle=t.tree[(tree.tint||0)%3];z.strokeStyle=t.treeEdge;z.lineWidth=5;cloud(z,tree.x,tree.y,r,8);z.fill();z.stroke();z.fillStyle=t.leaf;cloud(z,tree.x-r*.13,tree.y-r*.17,r*.68,7);z.fill();z.fillStyle=t===Theme.themes.snow?'#ffffff99':'#ffffff10';z.beginPath();z.ellipse(tree.x-r*.25,tree.y-r*.30,r*.23,r*.13,-.4,0,7);z.fill();if(t===Theme.themes.haunted){z.strokeStyle=t.treeEdge;z.lineWidth=3;z.beginPath();z.moveTo(tree.x,tree.y+r*.7);z.lineTo(tree.x-r*.08,tree.y-r*.25);z.moveTo(tree.x-r*.05,tree.y+r*.2);z.lineTo(tree.x+r*.38,tree.y-r*.1);z.stroke()}z.restore()}}
function crate(z,c){
 if(c.destroyed||c.open)return;z.save();z.translate(c.x,c.y);const gold=c.kind==='gold',ultimate=c.kind==='ultimate',ammo=c.kind==='ammo',size=ultimate?24:21,edge=ultimate?'#10141d':gold?'#5e3b13':'#372c22';
 if(ammo){z.fillStyle='#698e58';z.strokeStyle='#263e2d';z.lineWidth=2;round(z,-12,-9,24,18,2);z.fill();z.stroke();z.fillStyle='#d9dda4';for(const xx of [-6,0,6]){round(z,xx-1.5,-5,3,10,1);z.fill()}z.restore();return}
 if(ultimate){z.save();z.globalAlpha=.15;z.fillStyle='#ffc443';z.beginPath();z.arc(0,0,32,0,7);z.fill();z.restore()}
 z.lineWidth=3;z.strokeStyle=edge;z.fillStyle=ultimate?'#272c38':gold?'#f7b42b':ammo?'#648f63':'#b77b42';round(z,-size,-size,size*2,size*2,3);z.fill();z.stroke();
 z.save();round(z,-size+3,-size+3,size*2-6,size*2-6,1);z.clip();z.strokeStyle=ultimate?'#414651':gold?'#ffdb56':'#7d4d2a';z.lineWidth=2;for(let yy=-size+10;yy<size;yy+=10){z.beginPath();z.moveTo(-size+3,yy);z.lineTo(size-3,yy);z.stroke()}z.restore();
 z.strokeStyle=edge;z.fillStyle=gold?'#ffe16b':ultimate?'#ffd14e':'#d89c62';z.lineWidth=2;
 for(const [xx,yy]of [[-size,-size],[size-10,-size],[-size,size-10],[size-10,size-10]]){round(z,xx,yy,10,10,2);z.fill();z.stroke();z.fillStyle=ultimate?'#202633':'#5d4936';z.fillRect(xx+4,yy+4,3,3);z.fillStyle=gold?'#ffe16b':ultimate?'#ffd14e':'#d89c62'}
 if(gold){z.fillStyle='#ffe66e';z.strokeStyle='#805014';z.lineWidth=2;poly(z,[[-10,-5],[-5,-1],[0,-9],[5,-1],[10,-5],[7,8],[-7,8]]);z.fill();z.stroke();z.fillStyle='#fff2a6';z.fillRect(-6,5,12,2)}
 else if(ultimate){z.fillStyle='#ffdc51';z.strokeStyle='#0d121a';z.lineWidth=2;poly(z,[[0,-13],[4,-4],[12,0],[4,4],[0,13],[-4,4],[-12,0],[-4,-4]]);z.fill();z.stroke();z.fillStyle='#fff2b2';poly(z,[[0,-10],[1,-1],[8,0],[1,1],[0,10],[-1,1],[-8,0],[-1,-1]]);z.fill()}
 else if(ammo){z.fillStyle='#dae4b5';for(let i=-7;i<=7;i+=7)z.fillRect(i-2,-8,4,16)}
 else{z.strokeStyle='#e7ba82';z.lineWidth=3;z.beginPath();z.moveTo(-12,-size+10);z.lineTo(-12,size-10);z.moveTo(12,-size+10);z.lineTo(12,size-10);z.stroke();z.strokeStyle='#8d5a31';z.lineWidth=1;z.beginPath();z.moveTo(-7,-8);z.lineTo(6,-6);z.moveTo(-6,9);z.lineTo(8,10);z.stroke()}
 z.restore();
}
function loot(z,q,art,tiers,near=false,key='E',weaponName=''){
 if(q.taken)return;if(q.type==='gun'){const color=tiers[q.rarity||0][1];z.save();z.fillStyle=color;z.globalAlpha=.24;z.beginPath();z.arc(q.x,q.y,37,0,7);z.fill();z.globalAlpha=1;z.strokeStyle=color;z.lineWidth=3;z.stroke();if(art){const iw=art.width||art.naturalWidth,ih=art.height||art.naturalHeight,f=Math.min(64/iw,44/ih);z.drawImage(art,q.x-iw*f/2,q.y-ih*f/2,iw*f,ih*f)}else{z.fillStyle='#243e37';z.fillRect(q.x-20,q.y-4,40,8)}z.restore();if(near){z.font='bold 11px sans-serif';z.textAlign='center';z.fillStyle='#132c2cf0';round(z,q.x-64,q.y-68,128,23,5);z.fill();z.fillStyle=color;z.fillText(tiers[q.rarity||0][0]+' · '+(weaponName||key),q.x,q.y-52,116);z.textAlign='start'}}
 else{z.fillStyle=q.type==='med'?'#f2eee0':q.type==='shield'?'#82dbf0':'#c8b66c';z.strokeStyle='#385b48';z.lineWidth=3;round(z,q.x-13,q.y-13,26,26,5);z.fill();z.stroke();z.fillStyle=q.type==='med'?'#b44d4c':'#3e6550';if(q.type==='ammo'){for(let i=-7;i<=7;i+=7)z.fillRect(q.x+i-2,q.y-7,4,14)}else{z.font='bold 21px sans-serif';z.fillText(q.type==='med'?'+':'◆',q.x-7,q.y+7)}}
}
function roofAppearance(z,b,t,detail=true){
 const cx=b.x+b.w/2,cy=b.y+b.h/2,points=(b.outline||[[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.h],[b.x,b.y+b.h]]).map(([xx,yy])=>[cx+(xx-cx)*(1-18/b.w),cy+(yy-cy)*(1-18/b.h)]);
 z.save();poly(z,points);z.fillStyle=b.style==='barn'&&t!==Theme.themes.snow?'#995449':t.roof;z.strokeStyle=t.edge;z.lineWidth=12;z.fill();z.stroke();z.clip();z.strokeStyle=t.light;z.lineWidth=4;z.stroke();
 const panel=(px,py,pw,ph,color='#d2e1ec12')=>{const xx=b.x+b.w*px,yy=b.y+b.h*py,ww=b.w*pw,hh=b.h*ph;z.fillStyle='#101d2735';round(z,xx+5,yy+7,ww,hh,4);z.fill();z.fillStyle=t.roof;round(z,xx,yy,ww,hh,4);z.fill();z.fillStyle=color;z.fill();z.strokeStyle=t.edge;z.lineWidth=5;z.stroke();z.strokeStyle=t.light;z.lineWidth=3;z.beginPath();z.moveTo(xx+3,yy+hh-4);z.lineTo(xx+3,yy+3);z.lineTo(xx+ww-4,yy+3);z.stroke()};
 if(b.style==='barn'){z.strokeStyle='#e0b49a55';z.lineWidth=3;for(let xx=b.x+b.w*.1;xx<b.x+b.w*.94;xx+=b.w*.13){z.beginPath();z.moveTo(xx,b.y+18);z.lineTo(xx,b.y+b.h-18);z.stroke()}z.fillStyle='#613d3e';round(z,cx-7,b.y+16,14,b.h-32,3);z.fill();z.fillStyle='#c0805b';z.fillRect(cx-4,b.y+18,4,b.h-36)}
 else if(['house','bedroom','kitchen','lounge','hall'].includes(b.style)){panel(.09,.12,.49,.37);panel(.36,.49,.55,.36);if(b.variant%2===0)panel(.66,.14,.21,.21,'#abc9df22')}
 else if(b.style==='poolhouse'){panel(.16,.18,.68,.63,'#8bd4ef36');z.strokeStyle=t.light;z.lineWidth=6;for(let j=1;j<4;j++){z.beginPath();z.moveTo(b.x+b.w*(.16+.17*j),b.y+b.h*.19);z.lineTo(b.x+b.w*(.16+.17*j),b.y+b.h*.80);z.stroke()}}
 else if(['warehouse','garage'].includes(b.style)){panel(.12,.14,.31,.70);panel(.57,.14,.31,.70);if(detail){z.strokeStyle=t.light+'66';z.lineWidth=2;for(let yy=b.y+b.h*.20;yy<b.y+b.h*.8;yy+=20)for(const xx of [.13,.58]){z.beginPath();z.moveTo(b.x+b.w*xx,yy);z.lineTo(b.x+b.w*(xx+.29),yy);z.stroke()}}}
 else if(b.style==='octagon'){panel(.24,.18,.52,.64);panel(.37,.30,.26,.40,'#adc9df22')}
 else{panel(.12,.12,.72,.27);panel(.12,.52,.40,.28);panel(.65,.55,.20,.23,'#adcadc22')}
 if(detail){z.strokeStyle='#1c253329';z.lineWidth=2;const pitch=t===Theme.themes.citadel?44:32;for(let yy=b.y+25;yy<b.y+b.h;yy+=pitch){z.beginPath();z.moveTo(b.x+12,yy);z.lineTo(b.x+b.w-12,yy);z.stroke();if(t===Theme.themes.citadel)for(let xx=b.x+22+(Math.floor(yy/pitch)%2)*42;xx<b.x+b.w;xx+=84){z.beginPath();z.moveTo(xx,yy);z.lineTo(xx,yy+pitch);z.stroke()}}
 z.strokeStyle=t.edge+'88';z.lineWidth=11;z.strokeRect(b.x+24,b.y+24,b.w-48,b.h-48);z.strokeStyle=t.light+'88';z.lineWidth=3;z.strokeRect(b.x+29,b.y+29,b.w-58,b.h-58);
 if(t===Theme.themes.citadel){for(const [xx,yy]of [[b.x+22,b.y+22],[b.x+b.w-58,b.y+22],[b.x+22,b.y+b.h-58],[b.x+b.w-58,b.y+b.h-58]]){z.fillStyle='#676c78';z.strokeStyle=t.edge;z.lineWidth=4;round(z,xx,yy,36,36,3);z.fill();z.stroke();z.fillStyle=t.accent;z.beginPath();z.arc(xx+18,yy+18,5,0,7);z.fill()}z.strokeStyle=t.accent;z.lineWidth=4;poly(z,[[cx,cy-29],[cx+25,cy],[cx,cy+29],[cx-25,cy]]);z.stroke()}
 else if(t===Theme.themes.industrial||b.style==='warehouse'||b.style==='garage'){z.strokeStyle=t.edge;z.lineWidth=4;z.fillStyle='#96a6ae';round(z,b.x+45,b.y+43,88,52,4);z.fill();z.stroke();for(let yy=b.y+52;yy<b.y+88;yy+=7){z.strokeStyle='#4a6273';z.lineWidth=3;z.beginPath();z.moveTo(b.x+53,yy);z.lineTo(b.x+125,yy);z.stroke()}z.strokeStyle=t.accent;z.lineWidth=4;z.beginPath();z.moveTo(b.x+133,b.y+70);z.lineTo(cx,b.y+70);z.lineTo(cx,cy);z.stroke()}
 else{const ww=Math.min(92,b.w*.2),hh=55;z.fillStyle=t.edge;round(z,cx-ww/2,cy-hh/2,ww,hh,4);z.fill();z.fillStyle=t===Theme.themes.haunted?'#9d6fca':'#81b7c8';round(z,cx-ww/2+8,cy-hh/2+7,ww-16,hh-14,2);z.fill();z.strokeStyle=t===Theme.themes.haunted?'#d5a0f5':'#d4f3f5';z.lineWidth=3;z.beginPath();z.moveTo(cx-ww/2+13,cy+10);z.lineTo(cx+ww/2-13,cy-10);z.stroke()}
 if(t===Theme.themes.snow){z.fillStyle='#e3f3f6';for(const [xx,yy,ww]of [[b.x+19,b.y+15,b.w*.35],[b.x+b.w*.65,b.y+b.h-30,b.w*.30]]){round(z,xx,yy,ww,16,8);z.fill()}z.fillStyle='#b9dce9';round(z,b.x+23,b.y+b.h*.55,15,b.h*.25,6);z.fill()}
 }z.restore();
}
function roofs(z,s,local,visible,dt=.016){for(const b of s.buildings)if(visible(b)){const revealed=Core.canViewInterior(s,b,local);b.roofAlpha=revealed?0:1;if(!revealed)roofAppearance(z,b,Theme.at(b.x+b.w/2,b.y+b.h/2,s.size))}}
function gas(z,s,view){
 const c=s.zone.current;z.save();z.fillStyle='#409cf04a';z.beginPath();z.rect(view.x,view.y,view.w,view.h);z.arc(c.x,c.y,c.r,0,Math.PI*2,true);z.fill('evenodd');z.lineWidth=6;z.strokeStyle='#64caff';z.beginPath();z.arc(c.x,c.y,c.r,0,7);z.stroke();const next=s.zone.next;z.setLineDash([14,13]);z.strokeStyle='#f2fbef';z.lineWidth=3;z.beginPath();z.arc(next.x,next.y,next.r,0,7);z.stroke();z.restore();
}
function mapBase(z,s,view){terrain(z,s,view,true);
 for(const o of s.index.query(view.x,view.y,view.w,view.h)){if(o.destroyed||o.lootContainer)continue;if(o.kind==='tree'||o.kind==='bush'||o.kind==='rock'){const t=Theme.at(o.x,o.y,s.size);z.fillStyle=o.kind==='tree'?(t===Theme.themes.snow?t.leaf:t.tree[(o.tint||0)%3]):o.kind==='bush'?t.tree[0]:t===Theme.themes.haunted?'#9573b0':'#93a99e';z.strokeStyle=o.kind==='rock'?'#45615b':'#295a43';z.lineWidth=5;z.beginPath();z.arc(o.x,o.y,o.kind==='tree'?o.canopy*.7:o.r*.8,0,7);z.fill();z.stroke()}else if(['container','fence','machine','planter'].includes(o.kind)){z.fillStyle=o.kind==='container'?(o.color||'#81999a'):o.kind==='machine'?'#c5a04f':'#9a9462';z.fillRect(o.x,o.y,o.w,o.h)}}
 for(const b of s.buildings)roofAppearance(z,b,Theme.at(b.x+b.w/2,b.y+b.h/2,s.size),false)
}
function cachedMapBase(z,s,left,top,span,w,h){const resolution=Math.max(1024,Math.ceil(Math.max(w,h)/256)*256),revision=s.mapRevision||0;let cache=s.mapCache;if(typeof document!=='undefined'&&typeof document.createElement==='function'){if(!cache||cache.revision!==revision||cache.resolution<resolution){const canvas=document.createElement('canvas');canvas.width=resolution;canvas.height=resolution;const context=canvas.getContext('2d');context.scale(resolution/s.size,resolution/s.size);mapBase(context,s,{x:0,y:0,w:s.size,h:s.size});cache=s.mapCache={canvas,resolution,revision}}const factor=cache.resolution/s.size;z.drawImage(cache.canvas,left*factor,top*factor,span*factor,span*factor,left,top,span,span)}else mapBase(z,s,{x:left,y:top,w:span,h:span})}
function map(z,s,w,h,player,marker,route,plane,span=s.size){
 z.save();z.clearRect(0,0,w,h);const scale=Math.min(w,h)/span,cx=span===s.size?s.size/2:Math.max(span/2,Math.min(s.size-span/2,player.x)),cy=span===s.size?s.size/2:Math.max(span/2,Math.min(s.size-span/2,player.y)),left=cx-span/2,top=cy-span/2;
 z.scale(scale,scale);z.translate(-left,-top);cachedMapBase(z,s,left,top,span,w,h);
 gas(z,s,{x:left,y:top,w:span,h:span});
 if(span===s.size)for(const loc of s.locations){z.textAlign='center';z.font='900 '+(94*s.size/6000)+'px sans-serif';z.lineWidth=23;z.strokeStyle='#183831';z.strokeText(loc.name,loc.x,loc.y-55);z.fillStyle='#f3f3cd';z.fillText(loc.name,loc.x,loc.y-55)}z.textAlign='start';
 if(route&&plane){z.save();z.setLineDash([55,40]);z.lineWidth=11;z.strokeStyle='#fff6b9';z.beginPath();z.moveTo(route.start.x,route.start.y);z.lineTo(route.end.x,route.end.y);z.stroke();z.setLineDash([]);z.translate(plane.x,plane.y);z.rotate(route.angle);z.fillStyle='#fff8da';z.strokeStyle='#153b4c';z.lineWidth=10;z.beginPath();z.moveTo(80,0);z.lineTo(-50,-50);z.lineTo(-26,0);z.lineTo(-50,50);z.closePath();z.fill();z.stroke();z.restore()}
 if(marker){z.fillStyle='#ffdf58';z.strokeStyle='#573d1a';z.lineWidth=span/600;z.beginPath();z.arc(marker.x,marker.y,span/75,0,7);z.fill();z.stroke();z.beginPath();z.moveTo(marker.x,marker.y+span/65);z.lineTo(marker.x,marker.y-span/45);z.stroke()}
 z.fillStyle='#fff';z.strokeStyle='#1f5b64';z.lineWidth=span/500;z.beginPath();z.arc(player.x,player.y,span/90,0,7);z.fill();z.stroke();z.restore();return{left,top,scale};
}
return{terrain,floors,object,bushes,canopies,crate,loot,roofs,gas,map};
});
