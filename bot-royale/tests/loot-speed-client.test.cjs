'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const C=require('../island/world.js'),{Session}=require('../island/session.cjs'),B=require('../island/buildings.js'),rules=require('../island/combat-rules.json');
// Test the actual generated client with a deliberately delayed network response.
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8'),script=html.match(/<script>([\s\S]*)<\/script>/)[1],elements={};
const element=s=>elements[s]||={style:{},value:'',innerHTML:'',textContent:'',addEventListener(){},setAttribute(){},getContext(){return new Proxy({},{get:()=>()=>{}})}};
let clock=10000,requests=[];
const context={document:{querySelector:element,addEventListener(){},body:{classList:{toggle(){}}}},localStorage:{getItem(){return null},setItem(){}},Image:class{},Math,Date,console,devicePixelRatio:1,innerWidth:1920,innerHeight:1080,requestAnimationFrame(){},setTimeout(){},clearTimeout(){},performance:{now:()=>clock},fetch:async(url,options)=>({ok:true,json:()=>new Promise(resolve=>requests.push({body:JSON.parse(options.body),resolve}))})};
vm.createContext(context);const run=s=>vm.runInContext(s,context),flush=()=>new Promise(resolve=>setImmediate(resolve));run(script);
run("newGame();initializeIsland(901);finishLanding();running=true;const flightBot={id:'test-bot',x:1000,y:1000,hp:1000,r:26,phase:'plane',jumpAt:100000};bots=[flightBot];islandState.objects=[];islandState.index=new Island.SpatialIndex();islandState.water=[];islandState.bridges=[];islandState.buildings=[];islandState.doors=[];islandState.coast=[[0,0],[world,0],[world,world],[0,world]];Object.assign(player,{x:5000,y:5000,phase:'ground'});dropPhase='ground';keys[bindings.right]=true;update(1)");assert.equal(run('player.speed'),307.5);assert(Math.abs(run('player.x')-5307.5)<1e-6);assert.equal(run('DROP_SECONDS'),10);
run("newGame();startParachuteDrop();Object.assign(player,{x:5000,y:5000});keys[bindings.right]=true;update(.25)");assert(Math.abs(run('player.x')-5123)<1e-6);assert.equal(run('dropRemaining'),9.75);run('dropRemaining=10;keys[" "]=true;update(5)');assert.equal(run('dropPhase'),'ground');console.log(JSON.stringify({status:'passed',clientGroundSpeed:307.5,clientParachuteSpeed:492,dropSeconds:10,boostSeconds:5}));

// The actual client uses the same flight zoom online and offline, across viewport sizes.
for(const [w,h] of [[1920,1080],[1440,900],[900,1440]]){
 context.innerWidth=w;context.innerHeight=h;
 assert(Math.abs(run("innerWidth*innerHeight/(islandFlightZoom('plane')**2*world**2)")-1/54)<1e-9);
 assert(Math.abs(run("islandFlightZoom('parachute')-ISLAND_GROUND_ZOOM/1.5"))<1e-9);
}
run("newGame();planeElapsed=planeRoute.duration*.4;Object.assign(player,Island.planePosition(planeRoute,planeElapsed));cameraX=player.x;cameraY=player.y;cameraZoom=islandFlightZoom();update(.1)");
assert(Math.abs(run('cameraX-player.x'))<1e-6);assert(Math.abs(run('cameraY-player.y'))<1e-6);
assert(Math.abs(run("cameraZoom-islandFlightZoom('plane')"))<1e-9);
run("startParachuteDrop();update(.1)");assert.equal(run('dropPhase'),'parachute');assert(Math.abs(run("cameraZoom-islandFlightZoom('parachute')"))<1e-9);
run("dropRemaining=Island.DROP_SECONDS;dropFast=false;keys={};update(9.9)");assert.equal(run('dropPhase'),'parachute');run('update(.1)');assert.equal(run('dropPhase'),'ground');
console.log('PASS plane view is 3x closer, follows route, chute viewing width is 1.5x normal gameplay, normal landing is 10s and accelerated landing is 5s.');

run("dropPhase='parachute';player.phase='parachute';dropRemaining=10;keys={};update(1)");assert.equal(run('dropRemaining'),9);
context.onkeydown({key:' ',preventDefault(){}});run('update(1)');assert.equal(run('dropRemaining'),7);
context.onkeyup({key:' '});run('update(1)');assert.equal(run('dropRemaining'),6);assert.equal(run('dropFast'),false);
context.onkeydown({key:' ',preventDefault(){}});run('update(1)');assert.equal(run('dropRemaining'),4);
context.onblur();run('update(1)');assert.equal(run('dropRemaining'),3);assert.equal(run('dropFast'),false);
console.log('PASS hold doubles descent, release restores normal descent, and losing focus clears boost.');

run("newGame()");assert(run('player.inventory.length===6&&player.inventory.every(g=>g===null)'));assert(run('Object.values(player.ammoWallet).every(n=>n===0)'));assert.equal(run('player.med'),0);assert.equal(run('slot'),0);
context.onkeydown({key:' ',preventDefault(){}});context.onkeyup({key:' '});run('update(10)');assert.equal(run('dropPhase'),'ground');assert(run('player.inventory.every(g=>g===null)'));assert(run('Object.values(player.ammoWallet).every(n=>n===0)'));console.log('PASS new rounds and parachute landings have no starting gun, ammo, or heals.');
