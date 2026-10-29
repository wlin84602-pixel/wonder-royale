'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8'),source=html.match(/<script>([\s\S]*)<\/script>/)[1];
function createEnv(saved={},script=source){
 const elements={},context={};function el(s){return elements[s]||={style:{},value:'',innerHTML:'',textContent:'',handlers:{},setAttribute(k,v){this[k]=v},addEventListener(k,v){this.handlers[k]=v},getBoundingClientRect(){return{left:20,top:10,width:500,height:500}},getContext(){return new Proxy({},{get:()=>()=>{}})}}}
 Object.assign(context,{URL,URLSearchParams,performance:{now:()=>10000},document:{querySelector:el,addEventListener(){},body:{classList:{toggle(){}}}},localStorage:{getItem(k){return saved[k]||null},setItem(k,v){saved[k]=v}},Image:class{},Math,Date,console,devicePixelRatio:1,innerWidth:1440,innerHeight:900,requestAnimationFrame(){},setTimeout(){},clearTimeout(){}});
 vm.createContext(context);vm.runInContext(script,context);return{context,elements,run:s=>vm.runInContext(s,context)};
}

const {LobbySession}=require('../island/lobby-session.cjs'),rules=require('../island/combat-rules.json'),env=createEnv(),{run,context,elements}=env;
const s=new LobbySession(901,rules,{bots:2}),host=s.join('Host'),guest=s.join('<Guest>');
run('newGame();initializeIsland(901);running=true;islandNetwork.enabled=true;islandNetwork.ready=true');context.snap=s.snapshot(host.id);run('islandApplySnapshot(snap)');
assert.equal(run('dropPhase'),'lobby');assert.equal(run('islandNetwork.inLobby'),true);assert.equal(elements['#lobby-start-match'].disabled,false);assert.equal(elements['#lobby-player-count'].textContent,'2 / 25 PLAYERS');assert(elements['#lobby-roster'].innerHTML.includes('&lt;Guest&gt;'));assert(elements['#lobby-invite-link'].value.includes('room=main'));
const x=run('player.x');run("keys[bindings.right]=true;islandOnlineUpdate(.1)");assert(run('player.x')>x);assert.equal(run('player.hp'),100);run('draw()');
context.snap=s.snapshot(guest.id);s.tick++;context.snap.tick=s.tick;run('islandApplySnapshot(snap)');assert.equal(elements['#lobby-start-match'].disabled,true);assert(elements['#lobby-status'].textContent.includes('Host'));
s.remove(host.id);s.tick++;context.snap=s.snapshot(guest.id);run('islandApplySnapshot(snap)');assert.equal(elements['#lobby-start-match'].disabled,false);
assert(s.action(guest.id,{seq:1,kind:'start-match'}).ok);s.tick++;context.snap=s.snapshot(guest.id);run('islandApplySnapshot(snap)');assert.equal(run('islandNetwork.inLobby'),false);assert.equal(run('dropPhase'),'plane');assert.equal(elements['#waiting-lobby'].style.display,'none');assert.equal(run('player.inventory[1].type'),0);
console.log('PASS actual client: lobby UI, escaped names, invite room, movement, host transfer, synchronized plane transition');
