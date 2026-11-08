'use strict';
const assert=require('assert'),collection=require('../island/cosmetic-collection.json'),{LobbySession}=require('../island/lobby-session.cjs'),rules=require('../island/combat-rules.json');
assert.equal(collection.parachutes.length,12);assert.equal(new Set(collection.parachutes.map(p=>p.id)).size,12);
const s=new LobbySession(407,rules,{bots:0}),people=collection.parachutes.map((item,index)=>s.join('Parachute '+index,{parachuteId:item.id}));
for(let i=0;i<12;i++){assert.equal(people[i].parachute,i);assert.equal(s.snapshot(people[i].id).self.parachuteId,collection.parachutes[i].id)}
const indexSelection=s.join('Index eleven',{parachute:11});assert.equal(indexSelection.parachute,11);
const none=s.join('None',{parachuteId:null});assert.equal(none.parachute,-1);
const invalid=s.join('Invalid',{parachute:5000});assert.equal(invalid.parachute,-1);
assert(s.action(people[0].id,{seq:1,kind:'start-match'}).ok);
for(const p of people)assert(s.action(p.id,{seq:p===people[0]?2:1,kind:'jump'}).ok);
s.step(.1);
for(let i=0;i<12;i++){const self=s.snapshot(people[i].id).self,other=s.snapshot(indexSelection.id).actors.find(a=>a.id===people[i].id);assert.equal(self.phase,'parachute');assert.equal(self.parachute,i);assert.equal(other.parachute,i);assert.equal(other.parachuteId,collection.parachutes[i].id);assert(Math.abs(self.dropRemaining-9.9)<1e-8)}
console.log('PASS all 12 IDs and indices validated, independent player selections synchronized after plane exit, invalid choices rejected, and 10-second drop timing preserved');
