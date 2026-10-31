'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),C=require('../island/world.js'),rules=require('../island/combat-rules.json'),{Session}=require('../island/session.cjs'),{createServer}=require('../island-server.cjs');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,message,timeout=3500){const started=Date.now();while(!fn()){if(Date.now()-started>timeout)throw Error(message);await delay(15)}}
(async()=>{
 const app=createServer({bots:0,lobby:false});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port,streams=[];
 async function post(endpoint,data,token){const res=await fetch(base+'/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});return{status:res.status,body:await res.json()}}
 async function stream(token){const ctrl=new AbortController(),res=await fetch(base+'/api/events?token='+token,{signal:ctrl.signal}),reader=res.body.getReader(),info={ctrl,last:null,byTick:new Map()};streams.push(info);(async()=>{let text='';const decoder=new TextDecoder();try{for(;;){const{value,done}=await reader.read();if(done)break;text+=decoder.decode(value,{stream:true});let n;while((n=text.indexOf('\n\n'))>=0){const block=text.slice(0,n);text=text.slice(n+2);if(block.startsWith('data: ')){const snapshot=JSON.parse(block.slice(6));info.last=snapshot;info.byTick.set(snapshot.tick,snapshot)}}}}catch{}})();return info}
 try{
  assert.equal((await(await fetch(base+'/api/meta')).json()).online,true);
  assert.equal((await post('input',{seq:1,dx:0,dy:0,aim:0})).status,401);
  const one=(await post('join',{room:'test',name:'Player One'})).body,two=(await post('join',{room:'test',name:'Player Two'})).body;
  assert.equal(one.seed,two.seed);assert.deepEqual(one.route,two.route);
  const a=await stream(one.token),b=await stream(two.token);await until(()=>a.last&&b.last,'Snapshots did not stream');
  const session=app.sessions.get('test'),p1=session.actors.get(one.id),p2=session.actors.get(two.id),w=session.world,door=w.doors.find(d=>{const approach={x:d.x+d.w/2,y:d.y-26.1,phase:'ground'};return !C.blocked(w,approach.x,d.y-55,26)&&C.interactionTarget(w,approach)?.object.id===d.id});assert(door,'No unobstructed door interaction fixture');
  Object.assign(p1,{x:door.x+door.w/2,y:door.y-55,phase:'ground'});Object.assign(p2,{x:p1.x+100,y:p1.y-10,phase:'ground'});
  let input1=0,input2=0,action1=0,action2=0;
  const send1=(data)=>post('input',{seq:++input1,dx:0,dy:0,aim:0,fire:false,slot:1,...data},one.token);
  const send2=(data)=>post('input',{seq:++input2,dx:0,dy:0,aim:0,fire:false,slot:1,...data},two.token);
  const act1=(kind,extra={})=>post('action',{kind,seq:++action1,...extra},one.token);
  const act2=(kind,extra={})=>post('action',{kind,seq:++action2,...extra},two.token);
  const originalHp=p1.hp;await send1({dy:100000,x:999999,y:999999,hp:999999,ammo:999999});await delay(480);
  assert(p1.y<=door.y-25,'Server allowed wall/door clipping');assert.equal(p1.hp,originalHp);assert(p1.x<C.SIZE);
  assert.equal((await act1('interact')).body.ok,true);await until(()=>a.last.doors.find(d=>d.id===door.id)?.open&&b.last.doors.find(d=>d.id===door.id)?.open,'Door state mismatch');
  assert.equal((await post('action',{kind:'interact',seq:action1},one.token)).body.ok,false,'Replay accepted');
  assert.equal((await act1('interact')).body.ok,true,'Second press did not close');assert.equal(door.open,false);assert.equal((await act1('interact')).body.ok,true,'Third press did not reopen');
  await delay(400);Object.assign(p2,{x:door.x+door.w/2,y:door.y+7});assert.equal((await act1('interact')).body.ok,true,'Door refused hinge-side close');assert(!C.blocked(w,p2.x,p2.y,26),'Door trapped another player');
  Object.assign(p2,{x:p1.x+100,y:p1.y-10});assert.equal((await act1('interact')).body.ok,true);
  // Exercise every exterior orientation from both sides through real HTTP/SSE clients.
  await send1({dx:0,dy:0});await send2({dx:0,dy:0});
  const orientationHouse=w.buildings.find(q=>q.style==='hall');
  for(const entry of orientationHouse.entryPoints){
   const d=w.doors.find(q=>q.id===entry.door),hinge=[d.hingeX,d.hingeY];d.open=false;d.turnFrom=0;d.changedAt=-100;
   for(const side of [-1,1]){
    Object.assign(p1,{x:d.x+d.w/2+entry.dx*70*side,y:d.y+d.h/2+entry.dy*70*side,phase:'ground'});Object.assign(p2,{x:p1.x+400,y:p1.y+400});
    const expected=C.doorSwingAway(d,p1);assert.equal((await act1('interact',{doorId:d.id,open:true})).body.ok,true);assert.equal(d.swing,expected);
    await until(()=>a.last.actionSeq>=action1&&a.last.doors.find(q=>q.id===d.id)?.open&&b.last.doors.find(q=>q.id===d.id)?.open,'Oriented opening did not synchronize');
    const da=a.last.doors.find(q=>q.id===d.id),db=b.last.doors.find(q=>q.id===d.id);for(const key of ['open','swing','turnFrom','changedAt'])assert.equal(da[key],db[key],'Door animation state differs: '+key);
    const pose=C.doorPose(d,d.changedAt+.06),tx=Math.cos(d.closedAngle),ty=Math.sin(d.closedAngle),openerSide=tx*(p1.y-d.hingeY)-ty*(p1.x-d.hingeX),leafSide=tx*(pose.tipY-d.hingeY)-ty*(pose.tipX-d.hingeX);assert(openerSide*leafSide<0,'Door swung toward opener');assert.deepEqual([pose.hingeX,pose.hingeY],hinge);
    assert.equal((await act1('interact',{doorId:d.id,open:false})).body.ok,true);await until(()=>a.last.actionSeq>=action1&&!a.last.doors.find(q=>q.id===d.id)?.open&&!b.last.doors.find(q=>q.id===d.id)?.open,'Oriented closing did not synchronize');
   }
  }
  let crate,approach;for(const c of w.containers.filter(c=>(!c.building||c.exterior)&&c.kind==='basic')){for(let k=0;k<16;k++){const a=k*Math.PI/8,p={x:c.x+Math.cos(a)*62,y:c.y+Math.sin(a)*62,phase:'ground'};if(!C.blocked(w,p.x,p.y,26)&&C.interactionTarget(w,p)?.object.id===c.id){crate=c;approach=p;break}}if(crate)break}assert(crate,'No valid crate approach');
  Object.assign(p1,approach);Object.assign(p2,approach);const before=w.loot.length;
  await Promise.all([act1('interact'),act2('interact')]);assert(crate.open);assert.equal(w.loot.length,before+1,'Wooden crate did not produce exactly one item');assert.equal(new Set(w.loot.map(l=>l.id)).size,w.loot.length);
  await until(()=>a.last.containers.includes(crate.id)&&b.last.containers.includes(crate.id),'Container state mismatch');
  const remote=w.containers.find(c=>!c.open&&C.hyp(c,p1)>500);await act1('interact',{target:remote.id,x:remote.x,y:remote.y});assert(!remote.open,'Forged distant interaction accepted');
  assert.equal((await act1('damage',{amount:99999,target:p2.id})).body.ok,false);
  const bush=w.bushes.find(q=>!C.raycast(w,q.x-110,q.y,q.x,q.y,0)&&C.playable(w,q.x-110,q.y,26));assert(bush);
  Object.assign(p1,{x:bush.x-110,y:bush.y,phase:'ground'});Object.assign(p2,{x:bush.x,y:bush.y,phase:'ground',revealedUntil:0});
  await send1({});await send2({});await until(()=>a.last.actors.every(p=>p.id!==p2.id),'Hidden player leaked into opponent snapshot');
  await send2({fire:true});await until(()=>a.last.actors.some(p=>p.id===p2.id),'Firing did not reveal concealed player');await send2({fire:false});
  await delay(1650);await until(()=>a.last.actors.every(p=>p.id!==p2.id),'Reveal did not expire');
  const common=[...a.byTick.keys()].filter(t=>b.byTick.has(t)).at(-1);assert(common);assert.deepEqual(a.byTick.get(common).zone,b.byTick.get(common).zone);const sharedB=new Map(b.byTick.get(common).doors.map(d=>[d.id,d]));const sharedA=a.byTick.get(common).doors.filter(d=>sharedB.has(d.id));assert(sharedA.length>0,'No shared nearby doors');for(const d of sharedA)assert.deepEqual(d,sharedB.get(d.id),'Nearby door state disagrees');
  const source=w.loot.find(l=>!l.taken);Object.assign(p1,{x:source.x+45,y:source.y});await act1('interact');const taken=w.loot.filter(q=>q.taken).length;await act1('interact');assert(w.loot.filter(q=>q.taken).length>=taken);
  // One unique item can be collected by only one client.
  const pickupSpot=C.findValid(w,{x:1800,y:3000},26,true);Object.assign(p1,pickupSpot);Object.assign(p2,pickupSpot);
  w.loot=[{id:'unique-ammo-fixture',...pickupSpot,type:'ammo',amount:30,taken:false}];
  const reserves=()=>[p1,p2].reduce((sum,p)=>sum+p.inventory.filter(Boolean).reduce((s,g)=>s+g.reserve,0),0),oldReserve=reserves();
  await Promise.all([act1('interact'),act2('interact')]);assert.equal(reserves(),oldReserve+30,'Concurrent pickup duplicated ammo');assert(w.loot[0].taken);
  // Destruction is caused by validated projectiles and agrees across both streams.
  let barrel,fireSpot;for(const o of w.objects.filter(o=>o.kind==='barrel'&&!o.destroyed)){const p=C.findValid(w,{x:o.x-110,y:o.y},26,true),hit=C.raycast(w,p.x,p.y,o.x,o.y);if(hit?.object.id===o.id){barrel=o;fireSpot=p;break}}assert(barrel);
  Object.assign(p1,fireSpot);Object.assign(p2,{x:fireSpot.x,y:fireSpot.y+180});
  await send1({fire:true,aim:Math.atan2(barrel.y-p1.y,barrel.x-p1.x)});
  const refresh=setInterval(()=>send1({fire:true,aim:Math.atan2(barrel.y-p1.y,barrel.x-p1.x)}).catch(()=>{}),120);
  try{await until(()=>barrel.destroyed,'Authoritative projectiles did not destroy cover')}finally{clearInterval(refresh);await send1({fire:false})}
  await until(()=>a.last.destroyed.includes(barrel.id)&&b.last.destroyed.includes(barrel.id),'Destruction state mismatch');
  const priorZone=w.zone;w.zone={...w.zone,current:{x:5800,y:5800,r:50},damageTick:0};const hp=p1.hp;await send1({hp:999999,inSafeZone:true});await until(()=>p1.hp<hp,'Forged safe-zone claim bypassed gas');w.zone=priorZone;

  const result={status:'passed',clients:2,transport:'Real HTTP inputs and SSE snapshots',checks:['Same seed and plane route','Server-owned movement, health and inventory','Closed-door clipping rejected','Door states agree on both clients','All four orientations push away from outside/inside; hinge and animation agree across clients','Rapid open/close and safe doorway clearance','Action replay rejected','Concurrent crate open creates one loot batch','Distant forged interactions rejected','Unauthorized damage rejected','Hidden player omitted from network payload','Firing reveal and expiry','Safe zone agrees at matching snapshot ticks','Concurrent pickup cannot duplicate ammunition','Projectile destruction agrees across clients','Forged safe-zone claims cannot bypass gas damage']};
  console.log(JSON.stringify(result,null,2));if(process.argv.includes('--report'))fs.writeFileSync(path.join(__dirname,'../island-network-test-results.json'),JSON.stringify(result,null,2));
 }finally{for(const stream of streams)stream.ctrl.abort();await app.close()}
 // Server cooldown/reload authority uses the unchanged shared weapon rules.
 const session=new Session(44,rules,{bots:0}),p=session.join('Fire test');Object.assign(p,{...C.findValid(session.world,{x:1800,y:3000},26,true),phase:'ground',slot:1});p.inventory[1]=session.gun(1);const fired=[],baseFire=session.fire.bind(session);
 session.fire=(actor,at,enemy)=>{const ok=baseFire(actor,at,enemy);if(ok&&!enemy)fired.push(at);return ok};
 for(let tick=0;tick<30;tick++){session.input(p.id,{seq:tick,dx:0,dy:0,aim:0,fire:true,slot:1,clientTime:999999999});session.step(1/30)}
 assert.equal(fired.length,11);fired.forEach((at,i)=>assert(Math.abs(at-i*100)<1e-6));
 p.inventory[1]=session.gun(2);const gun=p.inventory[1];gun.ammo=4;gun.nextFireAtMs=2000;session.reload(gun,1000);assert.equal(gun.nextFireAtMs,2000);assert.equal(gun.reloadEndsAtMs,2150);assert(!session.fire(p,1999));assert(!session.fire(p,2149));assert(session.fire(p,2150));
 const deadline=gun.nextFireAtMs;p.slot=2;p.inventory[2]=session.gun(2);p.slot=1;assert.equal(gun.nextFireAtMs,deadline);assert(!session.fire(p,2151));
 // Server-owned deployment and diagonal speed normalization.
 const flight=new Session(55,rules,{bots:0}),jumper=flight.join('Drop test');assert.equal(jumper.phase,'plane');
 assert(flight.action(jumper.id,{kind:'jump',seq:0}).ok);assert.equal(jumper.phase,'parachute');assert(flight.action(jumper.id,{kind:'jump',seq:1}).ok);assert(!jumper.dropFast);
 Object.assign(jumper,{x:3000,y:3000});flight.input(jumper.id,{seq:0,dx:1,dy:1,aim:0,fire:false,slot:0});flight.step(1);assert(Math.abs(Math.hypot(jumper.x-3000,jumper.y-3000)-C.PARACHUTE_SPEED)<1e-6);
 for(let i=0;i<18;i++){flight.input(jumper.id,{seq:i+1,dx:0,dy:0,aim:0,fire:false,dive:true,slot:0});flight.step(.25)}assert.equal(jumper.phase,'ground');assert(!C.blocked(flight.world,jumper.x,jumper.y,26));assert(!C.buildingAt(flight.world,jumper));assert(!flight.action(jumper.id,{kind:'jump',seq:2}).ok);
 console.log('PASS: authoritative jump, fast descent, normalized gliding and valid landing.');

 console.log('PASS: server timestamps, separate reload/fire deadlines, and switching guards.');
})().catch(error=>{console.error(error);process.exitCode=1});
