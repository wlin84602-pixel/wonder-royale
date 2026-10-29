'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8'),source=html.match(/<script>([\s\S]*)<\/script>/)[1];
function createEnv(saved={},script=source){
 const elements={},context={};function el(s){return elements[s]||={style:{},value:'',innerHTML:'',textContent:'',handlers:{},setAttribute(k,v){this[k]=v},addEventListener(k,v){this.handlers[k]=v},getBoundingClientRect(){return{left:20,top:10,width:500,height:500}},getContext(){return new Proxy({},{get:()=>()=>{}})}}}
 Object.assign(context,{URL,URLSearchParams,performance:{now:()=>10000},document:{querySelector:el,addEventListener(){},body:{classList:{toggle(){}}}},localStorage:{getItem(k){return saved[k]||null},setItem(k,v){saved[k]=v}},Image:class{},Math,Date,console,devicePixelRatio:1,innerWidth:1440,innerHeight:900,requestAnimationFrame(){},setTimeout(){},clearTimeout(){}});
 vm.createContext(context);vm.runInContext(script,context);return{context,elements,run:s=>vm.runInContext(s,context)};
}


const {LobbySession}=require('../island/lobby-session.cjs'),rules=require('../island/combat-rules.json'),env=createEnv(),{run,context,elements}=env,room=new LobbySession(901,rules,{bots:0}),p=room.join('Host');
context.commands=[];run('newGame();initializeIsland(901);running=true;islandNetwork.enabled=true;islandNetwork.ready=true;islandSendAction=(kind,data={})=>{commands.push({kind,...data});return Promise.resolve({ok:true})};islandSendInput=()=>{}');
context.snap=room.snapshot(p.id);run('islandApplySnapshot(snap);draw()');assert(run('cameraZoom>=.7'));assert(run('Math.abs(cameraX-player.x)<1'));
elements['#lobby-travel-range'].onclick();assert.equal(context.commands.at(-1).area,'range');
room.action(p.id,{kind:'lobby-travel',seq:1,area:'range'});room.tick++;context.snap=room.snapshot(p.id);run('islandApplySnapshot(snap)');context.onmousedown({target:run('c'),button:0,preventDefault(){}});assert.equal(context.commands.at(-1).kind,'lobby-shot');assert(Number.isFinite(context.commands.at(-1).aim));
elements['#lobby-map-toggle'].onclick();run('draw()');assert.equal(run('islandNetwork.lobbyOverview'),true);assert(run('cameraZoom<.3'));assert.equal(elements['#lobby-map-toggle'].textContent,'FOLLOW PLAYER');
context.onkeydown({key:run('bindings.map'),repeat:false,preventDefault(){}});assert.equal(run('islandNetwork.lobbyOverview'),false);context.onkeydown({key:run('bindings.interact'),repeat:false,preventDefault(){}});assert.equal(context.commands.at(-1).kind,'lobby-use');
run('draw()');assert(elements['#lobby-activity-hint'].textContent.includes('Shoot targets'));assert(elements['#lobby-personal-stats'].textContent.includes('BEST LAP'));assert.equal(elements['#lobby-current-area'].textContent,'Target Arcade');
assert.equal(run('player.hp'),100);assert.equal(run('bullets.length'),0);console.log('PASS actual client: attraction travel, target firing, configured interaction key, follow camera, minimap/overview and activity scores');
