// Bounded caches for static artwork. Collision and combat state remain live.
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./world.js'):root.IslandCore,typeof module==='object'&&module.exports?require('./render.js'):root.IslandRender);if(typeof module==='object'&&module.exports)module.exports=api;else root.IslandPerformance=api})(typeof globalThis!=='undefined'?globalThis:this,function(C,R){
'use strict';
const raw={...R},MAX_BYTES=32*1024*1024,cache=new Map(),ids=new WeakMap(),farCaches=new WeakMap(),stats={bytes:0,hits:0,misses:0,sceneBuilds:0,terrainBuilds:0,spriteBuilds:0};let nextId=0,stamp=0;
function id(o){if(!ids.has(o))ids.set(o,++nextId);return ids.get(o)}
function surface(w,h){try{const c=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):typeof document!=='undefined'&&document.createElement?document.createElement('canvas'):null;if(!c||typeof c.getContext!=='function')return null;c.width=w;c.height=h;const ctx=c.getContext('2d');return ctx?{canvas:c,ctx}:null}catch{return null}}
function level(z){try{const t=z.getTransform(),s=Math.hypot(t.a,t.b);if(s>0)return Math.min(2,Math.max(.0625,2**Math.ceil(Math.log2(s))))}catch{}return 1}
function get(key){const item=cache.get(key);if(item){item.used=++stamp;stats.hits++;return item}stats.misses++;return null}
function put(key,item){item.used=++stamp;item.bytes=item.canvas.width*item.canvas.height*4;cache.set(key,item);stats.bytes+=item.bytes;while(stats.bytes>MAX_BYTES&&cache.size>1){let oldest=null,k;for(const [key,q]of cache)if(q!==item&&(!oldest||q.used<oldest.used)){oldest=q;k=key}if(!oldest)break;stats.bytes-=oldest.bytes;cache.delete(k);oldest.canvas.width=oldest.canvas.height=1}return item}
function sprite(z,key,b,paint,res=level(z)){
 const k=key+'@'+res;let item=get(k);
 if(!item){const width=Math.max(1,Math.ceil(b.w*res)),height=Math.max(1,Math.ceil(b.h*res));if(width*height>3*1024*1024)return false;const out=surface(width,height);if(!out)return false;out.ctx.scale(res,res);out.ctx.lineJoin='round';out.ctx.translate(-b.x,-b.y);paint(out.ctx);item=put(k,{...out});stats.spriteBuilds++}
 z.drawImage(item.canvas,b.x,b.y,item.canvas.width/res,item.canvas.height/res);return true
}
R.terrain=raw.terrain;
R.object=function(z,o,time){if(o.destroyed||o.lootContainer||o.kind==='bush')return;if(o.kind==='door'||o.shape==='segment'||o.kind==='tree'||o.kind==='rock'||o.kind==='barrel'||o.kind==='fence')return raw.object(z,o,time);const b=C.bounds(o),pad=o.shape==='segment'?18:6,rect={x:b.x-pad,y:b.y-pad,w:b.w+pad*2,h:b.h+pad*2};
 // Normalize the source position, so repeated shelves/windows share one image.
 const key='object:'+JSON.stringify([o.kind,o.shape,o.w,o.h,o.r,o.trunkRadius,o.paint,o.color,o.bx-o.ax,o.by-o.ay]);
 const local={...o,x:o.x-b.x,y:o.y-b.y,ax:o.ax-b.x,bx:o.bx-b.x,ay:o.ay-b.y,by:o.by-b.y};const origin={x:-pad,y:-pad,w:rect.w,h:rect.h};z.save();z.translate(b.x,b.y);if(!sprite(z,key,origin,ctx=>raw.object(ctx,local,time)))raw.object(z,local,time);z.restore()
};
R.canopies=function(z,objects,local){for(const o of objects)if(o.kind==='tree'&&!o.destroyed){const r=o.canopy+6,b={x:-r,y:-r,w:r*2,h:r*2},key='canopy:'+o.canopy+':'+(o.tint||0);z.save();z.translate(o.x,o.y);if(!sprite(z,key,b,ctx=>raw.canopies(ctx,[{...o,x:0,y:0}],local)))raw.canopies(z,[{...o,x:0,y:0}],local);z.restore()}};
R.bushes=function(z,s,visible,local=null){for(const b of s.bushes)if(visible({x:b.x-b.r,y:b.y-b.r,w:b.r*2,h:b.r*2})){const radius=b.r+5,rect={x:-radius,y:-radius,w:radius*2,h:radius*2};z.save();z.translate(b.x,b.y);if(local&&Math.hypot(local.x-b.x,local.y-b.y)<(b.hideRadius??b.r*.83))z.globalAlpha=.55;if(!sprite(z,'bush:'+b.r,rect,ctx=>raw.bushes(ctx,{bushes:[{...b,x:0,y:0}]},()=>true)))raw.bushes(z,{bushes:[{...b,x:0,y:0}]},()=>true);z.restore()}};
R.crate=function(z,c){if(c.open||c.destroyed)return;z.save();z.translate(c.x,c.y);if(!sprite(z,'crate:'+c.kind,{x:-36,y:-36,w:72,h:72},ctx=>raw.crate(ctx,{...c,x:0,y:0})))raw.crate(z,{...c,x:0,y:0});z.restore()};
R.floors=raw.floors;R.roofs=raw.roofs;
function intersects(a,b,pad=0){return a.x+a.w+pad>=b.x&&a.x-pad<=b.x+b.w&&a.y+a.h+pad>=b.y&&a.y-pad<=b.y+b.h}
function paintFar(ctx,s,v){
 ctx.save();ctx.beginPath();ctx.rect(v.x,v.y,v.w,v.h);ctx.clip();raw.terrain(ctx,s,v);
 const visible=b=>intersects(b,v,80),objects=s.index.query(v.x-110,v.y-110,v.w+220,v.h+220);
 raw.floors(ctx,s,visible);for(const o of objects)if(o.kind!=='door')raw.object(ctx,o,s.time);
 for(const c of s.containers)if(intersects({x:c.x-36,y:c.y-36,w:72,h:72},v))raw.crate(ctx,c);
 raw.bushes(ctx,s,visible);raw.canopies(ctx,objects);
 raw.roofs(ctx,s,{phase:'plane',x:0,y:0},visible);
 for(const d of objects)if(d.kind==='door'&&d.exterior)raw.object(ctx,d,s.time);
 ctx.restore()
}
R.farScene=function(z,s,view){
 const size=Math.min(2048,Math.max(1024,Math.ceil((typeof innerWidth==='number'?Math.max(innerWidth,innerHeight):1440)/512)*512));
 // Never enlarge the low-resolution overview into a close flight view.
 try{const transform=z.getTransform(),pixelsPerUnit=Math.hypot(transform.a,transform.b);if(pixelsPerUnit*s.size>size)return false}catch{return false}
 let item=farCaches.get(s),dirty=new Set();const revision=s.mapRevision||0;
 function mark(b){const pad=110;for(let yy=Math.floor((b.y-pad)/512);yy<=Math.floor((b.y+b.h+pad)/512);yy++)for(let xx=Math.floor((b.x-pad)/512);xx<=Math.floor((b.x+b.w+pad)/512);xx++)dirty.add(xx+','+yy)}
 if(!item||item.size!==size){const out=surface(size,size);if(!out)return false;out.ctx.scale(size/s.size,size/s.size);paintFar(out.ctx,s,{x:0,y:0,w:s.size,h:s.size});if(item)item.canvas.width=item.canvas.height=1;item={...out,size,states:new Map(s.objects.map(o=>[o.id,!!o.destroyed])),doors:new Map(s.doors.map(d=>[d.id,C.doorAngleAt(d,s.time)]))};farCaches.set(s,item);stats.sceneBuilds++}
 else{
  if(item.checkedRevision!==revision)for(const o of s.objects){if(item.states.get(o.id)!==!!o.destroyed){mark(C.bounds(o));item.states.set(o.id,!!o.destroyed)}}
  for(const d of s.doors){const angle=C.doorAngleAt(d,s.time);if(item.doors.get(d.id)!==angle){mark({x:d.hingeX-d.length,y:d.hingeY-d.length,w:d.length*2,h:d.length*2});item.doors.set(d.id,angle)}}
  for(const key of dirty){const [xx,yy]=key.split(',').map(Number);paintFar(item.ctx,s,{x:xx*512,y:yy*512,w:512,h:512});stats.scenePatches=(stats.scenePatches||0)+1}
 }
 item.checkedRevision=revision;z.fillStyle='#4a9bb5';z.fillRect(view.x,view.y,view.w,view.h);z.drawImage(item.canvas,0,0,s.size,s.size);return true
};
return{stats,raw,MAX_BYTES,clear(){for(const q of cache.values())q.canvas.width=q.canvas.height=1;cache.clear();stats.bytes=0}};
});
