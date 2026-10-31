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
 run('newGame();initializeIsland(901);finishLanding();bots=[];cameraZoom=1;update(.1)');assert(Math.abs(run('cameraZoom')-1/Math.sqrt(5))<1e-12);assert(Math.abs(1/run('cameraZoom')**2-5)<1e-12);
 const s=run('islandState');assert.equal(s.buildings.length,85);let minGap=Infinity;
 for(let i=0;i<s.buildings.length;i++){const b=s.buildings[i];assert(b.w>=480*1.4-1e-7);for(let j=0;j<i;j++){const a=s.buildings[j],dx=Math.max(0,b.x-a.x-a.w,a.x-b.x-b.w),dy=Math.max(0,b.y-a.y-a.h,a.y-b.y-b.h);minGap=Math.min(minGap,Math.hypot(dx,dy));assert(dx>=B.MIN_GAP-1e-7||dy>=B.MIN_GAP-1e-7,'Buildings clustered')}}
 const quadrants=new Set(s.buildings.map(b=>(b.x>s.size/2?1:0)+(b.y>s.size/2?2:0)));assert.equal(quadrants.size,4);
 assert(s.buildings.some(b=>Math.hypot(b.x-s.locations.find(l=>l.id===b.loc).x,b.y-s.locations.find(l=>l.id===b.loc).y)>3000));
 const server=new Session(901,rules,{bots:1}),p=server.join('Door tester'),entry=s.buildings[0].entryPoints[0],door=s.doors.find(d=>d.id===entry.door);Object.assign(p,{...entry,phase:'ground'});server.time=10;server.world.time=10;server.tick=1;
 context.snap=server.snapshot(p.id);run("running=true;islandNetwork.enabled=true;islandNetwork.ready=true;islandNetwork.token='test';islandNetwork.id=snap.self.id;islandNetwork.last=null;islandNetwork.actionSeq=0;islandApplySnapshot(snap)");
 const before=door.open;run('interact()');assert.notEqual(door.open,before,'Door waited for HTTP');assert.equal(requests.length,0,'Expected intentionally delayed transport');await flush();assert.equal(requests.length,1);
 server.tick++;context.snap=server.snapshot(p.id);run('islandApplySnapshot(snap)');assert(door.open,'Old snapshot undid prediction');
 const first=requests.shift(),ack=server.action(p.id,first.body);assert(ack.ok);first.resolve(ack);await flush();server.tick++;context.snap=server.snapshot(p.id);run('islandApplySnapshot(snap)');assert(door.open);assert.equal(run('islandNetwork.doorPredictions.size'),0);
 server.time=10.12;server.world.time=10.12;clock=10120;server.tick++;context.snap=server.snapshot(p.id);run('islandApplySnapshot(snap)');
 const occupant={id:'occupied',x:door.x+door.w/2,y:door.y+door.h/2,hp:100,r:26,phase:'ground'};server.actors.set(occupant.id,occupant);const blockedSide={id:'no-space',x:door.x+door.w/2+entry.dx*70,y:door.y+door.h/2+entry.dy*70,hp:100,r:26,phase:'ground'};server.actors.set(blockedSide.id,blockedSide);
 run('interact()');assert.equal(door.open,false);await flush();const second=requests.shift(),rejected=server.action(p.id,second.body);assert.equal(rejected.reason,'No clear space beside door');second.resolve(rejected);await flush();assert(door.open,'Rejected close did not roll back');
 const far=server.world.doors.find(d=>C.hyp(p,{x:d.x+d.w/2,y:d.y+d.h/2})>1000);assert.equal(server.action(p.id,{seq:99,kind:'interact',doorId:far.id}).ok,false);
 const d=server.world.doors.find(d=>d.id===door.id);server.actors.delete(occupant.id);server.actors.delete(blockedSide.id);for(let i=0;i<24;i++){const before=d.open;assert(C.interactDoor(server.world,d,p,[]).ok);assert.notEqual(d.open,before)}assert.equal(C.interactDoor(server.world,d,{...p,bot:true},[]).ok,false,'Bot overrode manual door');
 const result={status:'passed',buildings:85,floorDimensionsMultiplier:1.4,floorAreaMultiplier:1.96,minimumBuildingGap:+minGap.toFixed(2),placement:'Seeded, scattered across all four island quadrants',viewAreaMultiplier:5,groundCameraZoom:1/Math.sqrt(5),doorCooldownMs:0,doorAnimationMs:15,doorTests:['Immediate prediction before network response','Old snapshots cannot undo pending press','Server acknowledgement reconciles both states','Completely blocked doorway rejection rolls back prediction','Forged distant door rejected','24 consecutive presses toggle without waiting; bots respect manual control']};fs.writeFileSync(path.join(__dirname,'../responsive-map-test-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});


