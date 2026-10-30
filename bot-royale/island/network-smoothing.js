// Smooth presentation only; server snapshots and collision coordinates stay authoritative.
(function(){
 const apply=islandApplySnapshot,onlineUpdate=islandOnlineUpdate,paint=draw,aim=updatePlayerAim,disconnect=islandDisconnect;
 const now=()=>performance.now(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 islandApplySnapshot=function(snapshot){
  const net=islandNetwork;if(!snapshot||net.last&&snapshot.seed===net.last.seed&&snapshot.tick<=net.last.tick)return;
  const same=net.last&&net.last.seed===snapshot.seed&&net.last.matchState===snapshot.matchState&&player?.phase===snapshot.self.phase;
  const offset=net.visualOffset||{x:0,y:0},before=player?{x:player.x+offset.x,y:player.y+offset.y}:null;
  const actors=new Map((bots||[]).map(a=>[a.id,{x:a.x,y:a.y,angle:a.angle||0}]));
  const shots=new Map((bullets||[]).map(b=>[b.id,{x:b.x,y:b.y}]));
  const oldTime=net.inLobby?net.lobbyWorld?.time:islandState?.time,received=net.receivedAt;
  apply(snapshot);
  const dx=before?before.x-player.x:0,dy=before?before.y-player.y:0;
  net.visualOffset=same&&player.phase!=='plane'&&Math.hypot(dx,dy)<200?{x:dx,y:dy}:{x:0,y:0};
  net.poseDuration=same?clamp((net.receivedAt-received)/1000,.03,.15):.07;
  net.remoteFrom=actors;net.projectileFrom=shots;
  if(same&&Number.isFinite(oldTime)){if(net.inLobby)net.lobbyWorld.time=Math.max(oldTime,net.lobbyWorld.time);else islandState.time=Math.max(oldTime,islandState.time)}
 };
 islandOnlineUpdate=function(dt){
  const net=islandNetwork,previousTime=net.inLobby?net.lobbyWorld?.time:islandState?.time;
  if(net.visualOffset){const decay=Math.exp(-Math.max(0,dt)/.10);net.visualOffset.x*=decay;net.visualOffset.y*=decay}
  onlineUpdate(dt);if(!net.ready||!net.last)return;
  if(Number.isFinite(previousTime)){if(net.inLobby)net.lobbyWorld.time=Math.max(previousTime,net.lobbyWorld.time);else islandState.time=Math.max(previousTime,islandState.time)}
  const age=Math.max(0,(now()-net.receivedAt)/1000),f=clamp(age/(net.poseDuration||.07),0,1);
  if(net.smoothActorsFor!==net.last){net.smoothActorsFor=net.last;net.smoothActors=net.last.actors.map(a=>({...a}))}
  bots=net.smoothActors;
  for(let i=0;i<bots.length;i++){const target=net.last.actors[i],from=net.remoteFrom?.get(target.id),a=bots[i];if(!from)continue;
   if(Math.hypot(target.x-from.x,target.y-from.y)>300){a.x=target.x;a.y=target.y;continue}
   a.x=from.x+(target.x-from.x)*f;a.y=from.y+(target.y-from.y)*f;
   const turn=Math.atan2(Math.sin((target.angle||0)-from.angle),Math.cos((target.angle||0)-from.angle));a.angle=from.angle+turn*f;
  }
  if(!net.inLobby)for(let i=0;i<bullets.length;i++){const target=net.last.bullets[i],from=net.projectileFrom?.get(target.id);if(!from)continue;const blend=Math.max(0,1-age/.05);bullets[i].x+=(from.x-target.x)*blend;bullets[i].y+=(from.y-target.y)*blend}
 };
 function withVisualPosition(fn,args){const net=islandNetwork,o=net.ready&&net.visualOffset;if(!o||!player)return fn(...args);const px=player.x,py=player.y;player.x+=o.x;player.y+=o.y;try{return fn(...args)}finally{player.x=px;player.y=py}}
 draw=function(...args){return withVisualPosition(paint,args)};
 updatePlayerAim=function(...args){return withVisualPosition(aim,args)};
 islandDisconnect=function(...args){islandNetwork.visualOffset=null;islandNetwork.remoteFrom=null;islandNetwork.projectileFrom=null;islandNetwork.smoothActorsFor=null;return disconnect(...args)};
})();
