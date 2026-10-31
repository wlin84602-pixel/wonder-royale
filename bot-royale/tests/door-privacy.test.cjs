'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const C=require('../island/world.js'),{Session}=require('../island/session.cjs'),B=require('../island/buildings.js'),rules=require('../island/combat-rules.json');
// Test the actual generated client with a deliberately delayed network response.
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8'),script=html.match(/<script>([\s\S]*)<\/script>/)[1],elements={};
const element=s=>elements[s]||={style:{},value:'',innerHTML:'',textContent:'',addEventListener(){},setAttribute(){},getContext(){return new Proxy({},{get:()=>()=>{}})}};
let clock=10000,requests=[];
const context={document:{querySelector:element,addEventListener(){},body:{classList:{toggle(){}}}},localStorage:{getItem(){return null},setItem(){}},Image:class{},Math,Date,console,devicePixelRatio:1,innerWidth:1920,innerHeight:1080,requestAnimationFrame(){},setTimeout(){},clearTimeout(){},performance:{now:()=>clock},fetch:async(url,options)=>({ok:true,json:()=>new Promise(resolve=>requests.push({body:JSON.parse(options.body),resolve}))})};
vm.createContext(context);const run=s=>vm.runInContext(s,context),flush=()=>new Promise(resolve=>setImmediate(resolve));run(script);
(async()=>{
 run('newGame();initializeIsland(901);finishLanding();running=true;bots=[]');
 const s=run('islandState'),b=s.buildings.find(b=>b.style==='hall'),window=s.objects.find(o=>o.building===b.id&&o.kind==='window'&&Math.abs(o.ay-(b.y+b.h))<1&&o.ay===o.by);
 const center={x:(window.ax+window.bx)/2,y:window.ay},dx=window.bx-window.ax,dy=window.by-window.ay,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
 const near={x:center.x-nx*37,y:center.y-ny*37,r:26,hp:100,phase:'ground'},far={...near,x:center.x-nx*120,y:center.y-ny*120},inside={x:center.x+nx*100,y:center.y+ny*100,r:26,hp:100,phase:'ground',id:'inside'};
 assert(!C.blocked(s,near.x,near.y,26));assert(!C.blocked(s,inside.x,inside.y,26));assert(!C.canViewInterior(s,b,far));assert(C.canViewInterior(s,b,near));assert(C.canViewInterior(s,b,inside));assert(!C.canViewInterior(s,b,{...inside,phase:'parachute'}));
 const wall=s.objects.find(o=>o.building===b.id&&o.kind==='wall'&&o.ay===o.by&&Math.abs(o.ay-(b.y+b.h))<1&&Math.abs(o.bx-o.ax)>70);
 assert(!C.canViewInterior(s,b,{...near,x:(wall.ax+wall.bx)/2,y:wall.ay+37}),'Touching an ordinary wall revealed room');
 assert(!C.canSee(s,far,inside));assert(C.canSee(s,near,inside),'Window peeking did not show opponent');assert.equal(C.raycast(s,near.x,near.y,inside.x,inside.y,1)?.object.id,window.id,'Vision exception also allowed bullets through glass');
 const server=new Session(901,rules,{bots:1}),p=server.join('Peek tester'),other=server.join('Inside');Object.assign(p,far);Object.assign(other,inside,{id:other.id});assert(!server.snapshot(p.id).actors.some(a=>a.id===other.id));Object.assign(p,near);assert(server.snapshot(p.id).actors.some(a=>a.id===other.id));
 const entry=b.entryPoints[2],d=s.doors.find(d=>d.id===entry.door),point={x:d.x+d.w/2,y:d.y+d.h/2},outside={...entry,hp:100,phase:'ground',id:p.id,r:26},end={x:point.x+entry.dx*95,y:point.y+entry.dy*95};
 d.open=false;s.time=5;assert.equal(C.raycast(s,outside.x,outside.y,end.x,end.y,1)?.object.id,d.id);assert(C.interactDoor(s,d,outside,[]).ok);assert(C.raycast(s,outside.x,outside.y,end.x,end.y,1)?.object.id!==d.id);s.time+=.015;const angleBefore=C.doorAngleAt(d,s.time);assert(C.interactDoor(s,d,outside,[]).ok);assert(Math.abs(C.doorAngleAt(d,s.time)-angleBefore)<1e-10,'Reversing door animation jumped');assert.equal(C.raycast(s,outside.x,outside.y,end.x,end.y,1)?.object.id,d.id);
 // Four key presses before even one HTTP response must all toggle visually.
 Object.assign(p,outside);server.time=10;server.world.time=10;server.tick=1;const sd=server.world.doors.find(o=>o.id===d.id);sd.open=false;context.snap=server.snapshot(p.id);run("islandNetwork.enabled=true;islandNetwork.ready=true;islandNetwork.token='test';islandNetwork.actionSeq=0;islandNetwork.last=null;running=true;islandApplySnapshot(snap)");
 for(let i=0;i<4;i++){run('interact()');assert.equal(d.open,i%2===0,'A pending request swallowed the next press')}
 for(let i=0;i<4;i++){await flush();assert(requests.length,'Missing queued press');const request=requests.shift();assert.equal(request.body.open,i%2===0);request.resolve(server.action(p.id,request.body));await flush();server.tick++;context.snap=server.snapshot(p.id);run('islandApplySnapshot(snap)');assert.equal(d.open,false,'An old acknowledgement undid the newest press')}
 assert.equal(sd.open,false);assert.equal(run('islandNetwork.doorPredictions.size'),0);
 const result={status:'passed',tests:['Four open/close presses predicted before first HTTP response','All four states applied authoritatively in order','Old acknowledgements preserve newest press','Closed/reclosed doors block swept bullets; open doorway permits them','Reversing a door mid-animation preserves hinge angle','Outside and parachuting viewers cannot see inside','Touching an ordinary wall does not reveal interior','Near-window and indoor viewers can see inside','Window peeking reveals opponent but still blocks bullets','Server omits hidden indoor opponents and reveals them only at the window']};fs.writeFileSync(path.join(__dirname,'../door-privacy-test-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});

