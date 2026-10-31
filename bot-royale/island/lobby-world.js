(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./world.js'):root.IslandCore);if(typeof module==='object'&&module.exports)module.exports=api;else root.IslandLobby=api})(typeof globalThis!=='undefined'?globalThis:this,function(C){
'use strict';
const SIZE=1600,SCALE=1,CENTER=800,AREAS=[{id:'range',name:'Target Arcade',subtitle:'30 seconds. Aim for a new best.',x:800,y:730,color:'#6be5d1',spawn:{x:800,y:1050}}];
function create(seed){const objects=[];for(const [x,y] of [[180,230],[1420,230],[180,1350],[1420,1350],[180,800],[1420,800]])objects.push({id:'tree-'+x+'-'+y,kind:'tree',shape:'circle',x,y,r:35,canopy:58,solid:true,blocksShots:true,tint:0});return{seed,size:SIZE,time:0,coast:[[100,100],[1500,100],[1500,1500],[100,1500]],water:[],bridges:[],objects,index:new C.SpatialIndex(objects),buildings:[],doors:[],containers:[],bushes:[],roads:[],fields:[],loot:[],events:[],nextId:0,targets:[0,1,2,3,4].map(i=>({id:i,x:480+i*160,y:460+(i%2)*70,hitAt:-10})),shots:[],leaders:[]}}
function spawn(i){return{x:560+(i%7)*80,y:1120+Math.floor(i/7)*70}}
function inRange(p){return p.x>330&&p.x<1270&&p.y>620&&p.y<1120}
function area(id){return AREAS.find(a=>a.id===id)}
function nearest(p){return inRange(p)?'range':null}
function action(s,p,kind,m={}){
 if(kind==='lobby-chat'){if(typeof m.text!=='string'||s.time<(p.chatReadyAt||0))return{ok:false};const text=Array.from(m.text.replace(/[\u0000-\u001f\u007f]/g,' ').trim()).slice(0,120).join('');if(!text)return{ok:false};p.chatText=text;p.chatUntil=s.time+6;p.chatReadyAt=s.time+.8;return{ok:true}}
 if(kind==='lobby-travel'&&m.area==='range'){Object.assign(p,AREAS[0].spawn);return{ok:true}}
 if(kind==='lobby-use'){if(!inRange(p)||p.arcadeRoundEnd>s.time)return{ok:false};p.arcadeScore=0;p.arcadeCombo=0;p.arcadeRoundEnd=s.time+30;return{ok:true}}
 if(kind!=='lobby-shot'||!inRange(p)||!Number.isFinite(m.aim)||s.time<(p.arcadeReadyAt||0)||!(p.arcadeRoundEnd>s.time))return{ok:false};
 p.arcadeReadyAt=s.time+.18;p.angle=m.aim;let target=null,best=850;for(const t of s.targets){const dx=t.x-p.x,dy=t.y-p.y,along=dx*Math.cos(m.aim)+dy*Math.sin(m.aim),off=Math.abs(dx*Math.sin(m.aim)-dy*Math.cos(m.aim));if(s.time-t.hitAt>.3&&along>0&&along<best&&off<38){target=t;best=along}}
 s.shots.push({x:p.x,y:p.y,ex:p.x+Math.cos(m.aim)*best,ey:p.y+Math.sin(m.aim)*best,time:s.time,hit:!!target});if(target){target.hitAt=s.time;p.arcadeHits=(p.arcadeHits||0)+1;p.arcadeCombo=Math.min(5,(p.arcadeCombo||0)+1);p.arcadeScore+=(10*p.arcadeCombo);p.arcadeBest=Math.max(p.arcadeBest||0,p.arcadeScore)}else p.arcadeCombo=0;return{ok:true,hit:!!target}
}
function step(s,players,inputs,dt){s.time+=dt;s.shots=s.shots.filter(q=>s.time-q.time<.2).slice(-40);s.leaders=players.map(p=>({name:p.name||'Player',score:p.arcadeBest||0})).sort((a,b)=>b.score-a.score).slice(0,3)}
function snapshot(s){return{size:SIZE,time:s.time,targets:s.targets.map(t=>({...t})),shots:s.shots.map(q=>({...q})),leaders:s.leaders}}
return{SIZE,SCALE,CENTER,AREAS,create,spawn,area,inRange,nearest,action,step,snapshot};
});