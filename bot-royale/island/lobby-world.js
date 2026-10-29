(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./world.js'):root.IslandCore);if(typeof module==='object'&&module.exports)module.exports=api;else root.IslandLobby=api})(typeof globalThis!=='undefined'?globalThis:this,function(C){
'use strict';
const SIZE=1400;
function create(seed){const trees=[[210,210,42],[1180,230,46],[210,1160,46],[1180,1180,42],[160,700,38],[1240,710,38]],rocks=[[480,250,27],[940,1160,27]],objects=[...trees.map(([x,y,r],i)=>({id:'lobby-tree-'+i,kind:'tree',shape:'circle',x,y,r,canopy:r+10,solid:true,blocksShots:true,tint:i%3})),...rocks.map(([x,y,r],i)=>({id:'lobby-rock-'+i,kind:'rock',shape:'circle',x,y,r,solid:true,blocksShots:true}))];return{seed,size:SIZE,time:0,coast:[[65,65],[1335,65],[1335,1335],[65,1335]],water:[],bridges:[],objects,index:new C.SpatialIndex(objects),buildings:[],doors:[],containers:[],bushes:[],roads:[],fields:[],loot:[],events:[],nextId:0}}
function spawn(index){const ring=Math.floor(index/10),a=index%10*Math.PI/5;return{x:700+Math.cos(a)*(140+ring*90),y:700+Math.sin(a)*(140+ring*90)}}
return{SIZE,create,spawn};
});
