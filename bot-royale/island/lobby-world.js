(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./world.js'):root.IslandCore);if(typeof module==='object'&&module.exports)module.exports=api;else root.IslandLobby=api})(typeof globalThis!=='undefined'?globalThis:this,function(C){
'use strict';
const SCALE=Math.sqrt(10),SIZE=1400*SCALE,CENTER=SIZE/2;
const AREAS=[
{id:'plaza',name:'Arrival Plaza',subtitle:'Fountain & shuttles',x:CENTER,y:CENTER,color:'#efc36b',spawn:{x:CENTER+150,y:CENTER+80}},
{id:'race',name:'Coastal Circuit',subtitle:'Timed checkpoint laps',x:1220,y:1250,color:'#fdad73',spawn:{x:1000,y:1050}},
{id:'range',name:'Target Arcade',subtitle:'Aim, click & score',x:3300,y:1180,color:'#6be5d1',spawn:{x:3300,y:1360}},
{id:'pitch',name:'Seaside Football',subtitle:'Kick with friends',x:3300,y:3250,color:'#8ebcff',spawn:{x:3300,y:3420}},
{id:'disco',name:'Sunset Social',subtitle:'Dance floor & bounce pad',x:1180,y:3270,color:'#dc9fff',spawn:{x:1220,y:3290}}
];
const RACE=[[1000,1050],[1520,1050],[1520,1530],[1000,1530]],FIELD={x:2820,y:2910,w:960,h:680},BOUNCE={x:1610,y:3270,r:70},DANCE={x:1110,y:3300,r:200};
function area(id){return AREAS.find(a=>a.id===id)}
function create(seed){
 const objects=[],random=C.rng(seed^0x1a99);let n=0;
 function tree(x,y,r){objects.push({id:'lobby-tree-'+n++,kind:'tree',shape:'circle',x,y,r,canopy:r+18,solid:true,blocksShots:true,tint:n%3})}
 for(let i=0;i<100;i++){const x=350+random()*(SIZE-700),y=350+random()*(SIZE-700);if(AREAS.some(a=>Math.hypot(a.x-x,a.y-y)<760)||Math.abs(x-CENTER)<160||Math.abs(y-CENTER)<160)continue;tree(x,y,34+random()*18)}
 for(const [x,y]of [[700,700],[1710,720],[2680,720],[3890,760],[680,3900],[1850,3880],[2750,3900],[3910,3860],[730,2600],[3910,2250]])tree(x,y,52);
 for(const a of AREAS)if(a.id!=='plaza')for(const dx of [-600,600])tree(a.x+dx,a.y+520,42);
 objects.push({id:'lobby-fountain',kind:'lobby-fixture',shape:'circle',x:CENTER,y:CENTER,r:68,solid:true,blocksShots:true});
 const m=65*SCALE,r=180,coast=[[m+r,m],[SIZE-m-r,m],[SIZE-m,m+r],[SIZE-m,SIZE-m-r],[SIZE-m-r,SIZE-m],[m+r,SIZE-m],[m,SIZE-m-r],[m,m+r]];
 return{seed,size:SIZE,time:0,coast,water:[],bridges:[],objects,index:new C.SpatialIndex(objects),buildings:[],doors:[],containers:[],bushes:[],roads:[],fields:[],loot:[],events:[],nextId:0,ball:{x:3300,y:3250,vx:0,vy:0,blue:0,orange:0},targets:[0,1,2,3,4].map(i=>({id:i,x:2980+i*160,y:910+(i%2)*80,hitAt:-10})),shots:[],confettiUntil:0}
}
function spawn(index){const ring=Math.floor(index/10),a=index%10*Math.PI/5;return{x:CENTER+Math.cos(a)*(175+ring*95),y:CENTER+Math.sin(a)*(175+ring*95)}}
function inRange(p){return p.x>2760&&p.x<3860&&p.y>1060&&p.y<1590}
function nearest(p){if(C.hyp(p,BOUNCE)<110)return'bounce';if(C.hyp(p,DANCE)<220)return'dance';if(C.hyp(p,{x:RACE[0][0],y:RACE[0][1]})<100)return'race';if(C.hyp(p,{x:CENTER,y:CENTER})<125)return'fountain';return null}
function action(s,p,kind,m={}){
 if(kind==='lobby-travel'){const a=area(m.area);if(!a)return{ok:false};p.raceStart=null;p.raceNext=null;Object.assign(p,C.findValid(s,a.spawn,26));return{ok:true}}
 if(kind==='lobby-shot'){if(!inRange(p)||!Number.isFinite(m.aim)||s.time<(p.arcadeReadyAt||0))return{ok:false};p.arcadeReadyAt=s.time+.18;p.angle=m.aim;let target=null,best=800;for(const t of s.targets){const dx=t.x-p.x,dy=t.y-p.y,along=dx*Math.cos(m.aim)+dy*Math.sin(m.aim),off=Math.abs(dx*Math.sin(m.aim)-dy*Math.cos(m.aim));if(along>0&&along<best&&off<38){target=t;best=along}}
  const shot={x:p.x,y:p.y,ex:p.x+Math.cos(m.aim)*best,ey:p.y+Math.sin(m.aim)*best,time:s.time,hit:!!target};s.shots.push(shot);if(target){target.hitAt=s.time;p.arcadeHits=(p.arcadeHits||0)+1}return{ok:true,hit:!!target}}
 if(kind!=='lobby-use')return{ok:false};
 if(Number.isFinite(m.aim))p.angle=m.aim;
 if(C.hyp(p,s.ball)<95){if(s.time<(p.kickReadyAt||0))return{ok:false};p.kickReadyAt=s.time+.2;s.ball.vx=Math.cos(p.angle||0)*740;s.ball.vy=Math.sin(p.angle||0)*740;return{ok:true}}
 const at=nearest(p);
 if(at==='race'){p.raceStart=s.time;p.raceNext=1;return{ok:true}}
 if(at==='dance'){p.dancingUntil=s.time+8;s.discoUntil=s.time+8;return{ok:true}}
 if(at==='bounce'){p.bounceUntil=s.time+1.1;return{ok:true}}
 if(at==='fountain'){s.confettiUntil=s.time+5;return{ok:true}}
 return{ok:false};
}
function step(s,players,inputs,dt){
 const b=s.ball,F=FIELD;s.time+=dt;
 for(const p of players){
  if(p.raceStart!=null){const q=RACE[p.raceNext];if(Math.hypot(p.x-q[0],p.y-q[1])<75){if(p.raceNext===0){p.lastLap=s.time-p.raceStart;p.raceBest=Math.min(p.raceBest||Infinity,p.lastLap);p.raceStart=null;p.raceNext=null;p.lapFinishedAt=s.time}else p.raceNext=(p.raceNext+1)%RACE.length}}
  const input=inputs.get(p.id);if(input&&s.time-(p.lastLobbyInputAt??-10)<.35&&Math.hypot(input.dx,input.dy)>.05&&C.hyp(p,b)<55&&p.x>F.x&&p.x<F.x+F.w&&p.y>F.y&&p.y<F.y+F.h){const a=Math.atan2(b.y-p.y,b.x-p.x);b.vx=Math.cos(a)*330+input.dx*90;b.vy=Math.sin(a)*330+input.dy*90}
 }
 b.x+=b.vx*dt;b.y+=b.vy*dt;const friction=Math.exp(-1.65*dt);b.vx*=friction;b.vy*=friction;
 const goal=Math.abs(b.y-(F.y+F.h/2))<112;
 if((b.x<F.x||b.x>F.x+F.w)&&goal){if(b.x<F.x)b.orange++;else b.blue++;b.x=F.x+F.w/2;b.y=F.y+F.h/2;b.vx=b.vy=0;s.goalAt=s.time}
 else{if(!goal&&(b.x<F.x+18||b.x>F.x+F.w-18)){b.x=C.clamp(b.x,F.x+18,F.x+F.w-18);b.vx*=-.7}if(b.y<F.y+18||b.y>F.y+F.h-18){b.y=C.clamp(b.y,F.y+18,F.y+F.h-18);b.vy*=-.7}}
 s.shots=s.shots.filter(q=>s.time-q.time<.24).slice(-40);
}
function snapshot(s){return{size:SIZE,time:s.time,ball:{...s.ball},targets:s.targets.map(t=>({...t})),shots:s.shots.map(q=>({...q})),discoUntil:s.discoUntil||0,confettiUntil:s.confettiUntil||0,goalAt:s.goalAt??-10}}
return{SIZE,SCALE,CENTER,AREAS,RACE,FIELD,BOUNCE,DANCE,create,spawn,area,inRange,nearest,action,step,snapshot};
});
