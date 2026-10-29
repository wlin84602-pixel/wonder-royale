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
const server=new Session(901,rules,{bots:0}),p=server.join('Inventory tester'),other=server.join('Other');Object.assign(p,C.findValid(server.world,{x:8000,y:8000},26),{phase:'ground',slot:1});p.inventory[2]=server.gun(2);p.inventory[1].nextFireAtMs=1000;server.tick=1;run('newGame();initializeIsland(901);finishLanding();running=true;islandNetwork.ready=true;islandNetwork.enabled=true;islandNetwork.token="test";islandNetwork.actionSeq=0');context.snap=server.snapshot(p.id);run('islandApplySnapshot(snap)');
run('islandLoadoutCommand("inventory-move",{from:1,to:2})');assert.equal(run('slot'),2);assert.equal(run('player.inventory[2].type'),0);server.tick++;context.snap=server.snapshot(p.id);run('islandApplySnapshot(snap)');assert.equal(run('player.inventory[2].type'),0,'Unacknowledged snapshot undid prediction');
await flush();let q=requests.shift();assert.equal(q.body.kind,'inventory-move');q.resolve(JSON.parse(JSON.stringify(server.action(p.id,q.body))));await flush();assert.equal(run('slot'),2);assert.equal(p.slot,2);assert.equal(run('player.inventory[2].nextFireAtMs'),1000);
// Discard input transport requests; apply actual server snapshot before rapid actions.
requests=[];server.tick++;context.snap=server.snapshot(p.id);run('islandApplySnapshot(snap)');run('islandLoadoutCommand("inventory-move",{from:2,to:4});islandLoadoutCommand("inventory-move",{from:4,to:5})');assert.equal(run('slot'),5);
for(let i=0;i<2;i++){await flush();q=requests.find(q=>q.body.kind==='inventory-move');assert(q);requests=requests.filter(o=>o!==q);q.resolve(JSON.parse(JSON.stringify(server.action(p.id,q.body))));await flush();server.tick++;context.snap=server.snapshot(p.id);run('islandApplySnapshot(snap)');assert.equal(run('slot'),5,'Old acknowledgement reverted latest drag')}
assert.equal(p.slot,5);assert.equal(p.inventory[5].type,0);assert.equal(run('player.inventory[5].type'),0);
// Ammo box grants both packs once, with no E presses for individual ammo drops.
const box=server.world.containers.find(c=>c.kind==='ammo');Object.assign(p,C.findValid(server.world,{x:box.x+40,y:box.y},26));const before=Object.values(require('../island/inventory.js').totals(p)).reduce((a,b)=>a+b,0),response=server.interact(p);assert(response.ok);assert(box.open);assert(server.world.loot.filter(q=>q.container===box.id).every(q=>q.taken));const after=Object.values(require('../island/inventory.js').totals(p)).reduce((a,b)=>a+b,0);assert(after>before);
console.log('PASS delayed online snapshots: optimistic swaps, consecutive drags, selected item, original cooldown, automatic ammo-box pickup');
})().catch(e=>{console.error(e);process.exitCode=1});