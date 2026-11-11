// Interpolate remote actors on the server timeline and replay local input that has yet to be acknowledged.
(function(){
 const apply=islandApplySnapshot,onlineUpdate=islandOnlineUpdate,paint=draw,aim=updatePlayerAim,disconnect=islandDisconnect;
 const delay=.10;
 const snapshotTime=snapshot=>snapshot.lobby?.time??snapshot.time;
 function sampleActors(net,dt){
  const frames=net.snapshots;
  if(!frames.length)return;
  const newest=frames[frames.length-1],age=Math.max(0,(performance.now()-net.receivedAt)/1000);
  const target=Math.min(newest.time,newest.time+age-delay);
  const clock=net.remoteClock??target;
  const speed=Island.clamp(1+(target-clock)*4,.75,1.25);
  net.remoteClock=Island.clamp(clock+dt*speed,frames[0].time,newest.time);
  let previous=frames[0],next=newest;
  for(const frame of frames){
   if(frame.time<=net.remoteClock)previous=frame;
   else{next=frame;break}
  }
  const fraction=next.time>previous.time?(net.remoteClock-previous.time)/(next.time-previous.time):0;
  bots=net.remoteActors;
  for(let i=0;i<bots.length;i++){
   const actor=bots[i],latest=net.last.actors[i];
   const from=previous.actors.get(actor.id),to=next.actors.get(actor.id);
   if(!from||!to||from.phase!==latest.phase||to.phase!==latest.phase||Island.hyp(from,to)>300){
    actor.x=latest.x;actor.y=latest.y;actor.angle=latest.angle;
    continue;
   }
   actor.x=from.x+(to.x-from.x)*fraction;
   actor.y=from.y+(to.y-from.y)*fraction;
   const start=from.angle||0,turn=(to.angle||0)-start;
   actor.angle=start+Math.atan2(Math.sin(turn),Math.cos(turn))*fraction;
  }
 }
 islandApplySnapshot=function(snapshot){
  const net=islandNetwork;
  if(!snapshot||net.last&&snapshot.seed===net.last.seed&&snapshot.matchState===net.last.matchState&&snapshot.tick<=net.last.tick)return;
  const same=net.last&&net.last.seed===snapshot.seed&&net.last.matchState===snapshot.matchState;
  const phaseUnchanged=same&&player?.phase===snapshot.self.phase;
  const offset=net.visualOffset||{x:0,y:0};
  const before=player?{x:player.x+offset.x,y:player.y+offset.y,angle:player.angle}:null;
  const oldTime=net.inLobby?net.lobbyWorld?.time:islandState?.time;
  apply(snapshot);
  if(net.last!==snapshot)return;

  if(phaseUnchanged&&player.phase==='ground'&&before&&Island.hyp(before,player)<160){
   const pending=(net.predictedMovement||[]).filter(step=>step.seq>snapshot.self.sequence);
   net.predictedMovement=pending;
   for(const step of pending)Island.moveActor(islandState,player,step.dx,step.dy,step.dt,player.speed);
   player.angle=before.angle;
  }else net.predictedMovement=[];
  const dx=before?before.x-player.x:0,dy=before?before.y-player.y:0;
  net.visualOffset=phaseUnchanged&&player.phase!=='plane'&&Math.hypot(dx,dy)<160?{x:dx,y:dy}:{x:0,y:0};

  if(!same){net.snapshots=[];net.remoteClock=null}
  net.snapshots.push({time:snapshotTime(snapshot),actors:new Map(snapshot.actors.map(actor=>[actor.id,actor]))});
  if(net.snapshots.length>8)net.snapshots.shift();
  net.remoteActors=snapshot.actors.map(actor=>({...actor}));
  sampleActors(net,0);
  if(same&&Number.isFinite(oldTime)){
   if(net.inLobby)net.lobbyWorld.time=Math.max(oldTime,net.lobbyWorld.time);
   else islandState.time=Math.max(oldTime,islandState.time);
  }
 };
 islandOnlineUpdate=function(dt){
  const net=islandNetwork,previousTime=net.inLobby?net.lobbyWorld?.time:islandState?.time;
  if(net.visualOffset){
   const decay=Math.exp(-Math.max(0,dt)/.075);
   net.visualOffset.x*=decay;net.visualOffset.y*=decay;
  }
  onlineUpdate(dt);
  if(!net.ready||!net.last)return;
  if(Number.isFinite(previousTime)){
   if(net.inLobby)net.lobbyWorld.time=Math.max(previousTime,net.lobbyWorld.time);
   else islandState.time=Math.max(previousTime,islandState.time);
  }
  sampleActors(net,dt);
 };
 function withVisualPosition(fn,args){
  const offset=islandNetwork.ready&&islandNetwork.visualOffset;
  if(!offset||!player)return fn(...args);
  const px=player.x,py=player.y;
  player.x+=offset.x;player.y+=offset.y;
  try{return fn(...args)}finally{player.x=px;player.y=py}
 }
 draw=function(...args){return withVisualPosition(paint,args)};
 updatePlayerAim=function(...args){return withVisualPosition(aim,args)};
 islandDisconnect=function(...args){
  const net=islandNetwork;
  net.visualOffset=null;net.snapshots=[];net.remoteClock=null;net.remoteActors=[];net.predictedMovement=[];
  return disconnect(...args);
 };
})();
