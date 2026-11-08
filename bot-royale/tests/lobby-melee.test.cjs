'use strict';
const assert=require('assert'),{LobbySession}=require('../island/lobby-session.cjs'),rules=require('../island/combat-rules.json');
const s=new LobbySession(304,rules,{bots:0}),host=s.join('Host',{melee:2}),guest=s.join('Guest',{melee:4});
assert.deepEqual([host.x,host.y],[560,1120]);
assert(host.inventory.every(g=>g===null));
assert(s.action(host.id,{seq:1,kind:'lobby-chat',text:'Hello lobby'}).ok);
assert(s.action(host.id,{seq:2,kind:'emote',index:host.emotes.find(i=>i>=0)}).ok);
assert(s.action(host.id,{seq:3,kind:'melee'}).ok);
const firstHand=host.punchHand;
assert(!s.action(host.id,{seq:4,kind:'melee'}).ok,'Rapid clicks bypassed melee cooldown');
for(let i=0;i<14;i++)s.step();
assert.equal(host.meleeSwing,0);
assert(s.action(host.id,{seq:5,kind:'melee'}).ok);
assert.notEqual(host.punchHand,firstHand);
let seq=0,sawRemoteSwing=false;const start=host.x;
for(let i=0;i<35;i++){assert(s.input(host.id,{seq:++seq,dx:1,dy:0,aim:0,fire:true,slot:5}));s.step();sawRemoteSwing||=s.snapshot(guest.id).actors.find(a=>a.id===host.id).meleeSwing>0}
assert(host.x>start+200,'Lobby punching stopped movement');
assert.equal(host.slot,5);assert(sawRemoteSwing,'Remote lobby player lost melee pose');
assert.equal(host.hp,100);assert.equal(guest.hp,100);assert.equal(s.bullets.length,0);
assert(s.snapshot(guest.id).actors.find(a=>a.id===host.id).chatText==='Hello lobby');
assert(s.action(host.id,{seq:6,kind:'start-match'}).ok);
host.phase=guest.phase='ground';Object.assign(host,{x:500,y:500,angle:0});Object.assign(guest,{x:550,y:500});
for(const slot of [0,2,3,4,5]){
 host.slot=slot;host.meleeReadyAt=0;guest.hp=100;guest.shield=0;
 assert(s.melee(host),'Empty slot '+slot+' did not punch');assert.equal(guest.hp,72);
 assert(!s.melee(host),'Empty slot switch bypassed cooldown');
 assert.equal(s.snapshot(guest.id).actors.find(a=>a.id===host.id).itemKind,'melee');
}
host.slot=1;host.meleeReadyAt=0;assert(!s.melee(host),'Gun slot allowed melee damage');
host.inventory[4]={kind:'med',count:1};host.slot=4;assert(!s.melee(host),'Consumable slot allowed melee damage');
host.slot=3;host.meleeReadyAt=0;guest.hp=100;guest.shield=0;s.input(host.id,{seq:1,dx:0,dy:0,aim:0,fire:true,slot:3});s.step();assert.equal(guest.hp,72,'Held fire in empty slot did not attack on server');
console.log('PASS lobby movement + chat + emotes + held melee, alternating fists, remote poses, safe lobby, all empty slots, cooldown enforcement and gun/consumable exclusion');
