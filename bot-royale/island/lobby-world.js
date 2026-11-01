(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./world.js'):root.IslandCore);if(typeof module==='object'&&module.exports)module.exports=api;else root.IslandLobby=api})(typeof globalThis!=='undefined'?globalThis:this,function(C){
'use strict';
const SIZE=1600,SCALE=1,CENTER=800,AREAS=[];
function create(seed){return{seed,size:SIZE,time:0,coast:[[100,100],[1500,100],[1500,1500],[100,1500]],water:[],bridges:[],objects:[],index:new C.SpatialIndex(),buildings:[],doors:[],containers:[],bushes:[],roads:[],fields:[],loot:[],events:[],nextId:0,targets:[],shots:[],leaders:[]}}
function spawn(i){return{x:560+(i%7)*80,y:1120+Math.floor(i/7)*70}}
function inRange(p){return false}
function area(id){return AREAS.find(a=>a.id===id)}
function nearest(p){return inRange(p)?'range':null}
function action(s,p,kind,m={}){
 if(kind==='lobby-chat'){if(typeof m.text!=='string'||s.time<(p.chatReadyAt||0))return{ok:false};const text=Array.from(m.text.replace(/[\u0000-\u001f\u007f]/g,' ').trim()).slice(0,120).join('');if(!text)return{ok:false};p.chatText=text;p.chatUntil=s.time+6;p.chatReadyAt=s.time+.8;return{ok:true}}
 return{ok:false};
}

function step(s,players,inputs,dt){s.time+=dt}
function snapshot(s){return{size:SIZE,time:s.time,targets:s.targets.map(t=>({...t})),shots:s.shots.map(q=>({...q})),leaders:s.leaders}}
return{SIZE,SCALE,CENTER,AREAS,create,spawn,area,inRange,nearest,action,step,snapshot};
});