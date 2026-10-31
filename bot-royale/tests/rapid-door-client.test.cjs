'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const C=require('../island/world.js'),{Session}=require('../island/session.cjs'),B=require('../island/buildings.js'),rules=require('../island/combat-rules.json');
// Test the actual generated client with a deliberately delayed network response.
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8'),script=html.match(/<script>([\s\S]*)<\/script>/)[1],elements={};
const element=s=>elements[s]||={style:{},value:'',innerHTML:'',textContent:'',addEventListener(){},setAttribute(){},getContext(){return new Proxy({},{get:()=>()=>{}})}};
let clock=10000,requests=[];
const context={document:{querySelector:element,addEventListener(){},body:{classList:{toggle(){}}}},localStorage:{getItem(){return null},setItem(){}},Image:class{},Math,Date,console,devicePixelRatio:1,innerWidth:1920,innerHeight:1080,requestAnimationFrame(){},setTimeout(){},clearTimeout(){},performance:{now:()=>clock},fetch:async(url,options)=>({ok:true,json:()=>new Promise(resolve=>requests.push({body:JSON.parse(options.body),resolve}))})};
vm.createContext(context);const run=s=>vm.runInContext(s,context),flush=()=>new Promise(resolve=>setImmediate(resolve));run(script);
run("newGame();initializeIsland(901);finishLanding();running=true;bots=[];const room=islandState.buildings.find(b=>b.style==='hall'),e=room.entryPoints[0];var walkingDoor=islandState.doors.find(d=>d.id===e.door);Object.assign(player,{x:walkingDoor.x+walkingDoor.w/2,y:walkingDoor.y-70,hp:100,phase:'ground'});dropPhase='ground';keys[bindings.down]=true;walkingDoor.open=false;interact()");
for(let i=0;i<48;i++){run('islandState.time+=1/60;Island.moveActor(islandState,player,0,1,1/60);');context.onkeydown({key:run('bindings.interact'),preventDefault(){},repeat:false});context.onkeyup({key:run('bindings.interact')});assert(!run('Island.blocked(islandState,player.x,player.y,26)'))}
assert(run('player.y-(walkingDoor.y+walkingDoor.h/2)>40'),'Actual E handler bounced walking player backwards');assert(run('keys[bindings.down]'));console.log(JSON.stringify({status:'passed',checks:['Actual client E key handler while holding movement','48 presses during walking','Doorway crossed without embedding or backward bounce']}));
