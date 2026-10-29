// Keep HUD work off the animation hot path. Gameplay/input clocks are unchanged.
function islandSetText(selector,value){const node=$(selector),text=String(value);if(node.textContent!==text)node.textContent=text}
function islandSyncWorldSnapshot(s,snapshot){
 let state=s._renderSync;if(!state){state=s._renderSync={objects:new Map(s.objects.map(o=>[o.id,o])),broken:new Set(),opened:new Set(),signature:null};for(const o of s.objects)o.destroyed=false;for(const c of s.containers){c.open=false;c.destroyed=false;c.solid=true;c.blocksShots=true}}
 const signature=snapshot.destroyed.join('|')+';'+snapshot.containers.join('|');if(state.signature===signature)return;
 const broken=new Set(snapshot.destroyed),opened=new Set(snapshot.containers);
 for(const id of new Set([...state.broken,...broken]))if(state.broken.has(id)!==broken.has(id)){const o=state.objects.get(id);if(o)o.destroyed=broken.has(id)}
 for(const id of new Set([...state.opened,...opened]))if(state.opened.has(id)!==opened.has(id)){const c=state.objects.get(id);if(c){c.open=opened.has(id);c.destroyed=c.open||broken.has(id);c.solid=!c.destroyed;c.blocksShots=!c.destroyed}}
 s.mapRevision=(s.mapRevision||0)+1;
 state.signature=signature;state.broken=broken;state.opened=opened;s.mapDestroyedCount=broken.size;
}
(function(){
 const previousHUD=updateHUD,previousInventory=renderInventory,previousMaps=islandDrawMaps;
 let hudKey='',hudAt=-1000,structure='',tiles=null,mapKey='',mapAt=-1000,mapState=null;
 renderInventory=function(){
  const holder=$('#weapon-slots');if(typeof holder.querySelectorAll!=='function')return previousInventory();
  const key=player.inventory.map(g=>g?g.kind==='med'?'med':g.type+':'+g.rarity:'empty').join('|')+';'+Object.values(bindings).join(',')+';'+selectedCosmetic('melees')+';'+(cosmeticSprite('melees',selectedCosmetic('melees'))?.width||0)+';'+weaponSprites.length+';'+(typeof islandWeaponArtRevision==='number'?islandWeaponArtRevision:0);
  if(key!==structure||!tiles||tiles.length!==6){structure=key;inventorySignature='';previousInventory();tiles=[...holder.querySelectorAll('[data-slot]')];return}
  for(let i=0;i<tiles.length;i++){const node=tiles[i],active=slot===i,g=player.inventory[i];node.classList.toggle('active',active);const pressed=String(active);if(node.getAttribute('aria-pressed')!==pressed)node.setAttribute('aria-pressed',pressed);
   const label=node.querySelector('.slot-ammo');if(label){const value=i===0?'MELEE':IslandInventory.isMed(g)?'× '+g.count:IslandInventory.isGun(g)?g.reload>0?'↻':String(g.ammo):'';if(label.textContent!==value)label.textContent=value}
  }
 };
 updateHUD=function(){
  if(!player)return previousHUD();const now=typeof performance!=='undefined'?performance.now():Date.now();
  const key=[running,dropPhase,slot,selectedItem,player.hp,player.shield,kills,bots?.length,...player.inventory.map(g=>g?[g.kind,g.type,g.rarity,g.ammo,g.reserve,g.reload>0,g.count].join(':'):''),...Object.values(player.ammoWallet||{}),...Object.values(bindings),selectedCosmetic('melees'),weaponSprites.length,cosmeticSprite('melees',selectedCosmetic('melees'))?.width].join('|');
  if(key===hudKey&&now-hudAt<250)return;hudKey=key;hudAt=now;previousHUD()
 };
 islandDrawMaps=function(){
  if(!islandState)return previousMaps();const now=typeof performance!=='undefined'?performance.now():Date.now(),key=[running,dropPhase,islandMapOpen,islandState.mapRevision||0,islandMarker?.x,islandMarker?.y,innerWidth,innerHeight].join('|');
  if(mapState===islandState&&key===mapKey&&now-mapAt<80)return;mapState=islandState;mapKey=key;mapAt=now;previousMaps()
 };
 const previousMini=IslandLobbyRender.mini,miniFrames=new WeakMap();
 IslandLobbyRender.mini=function(ctx,s,players,camera){const now=typeof performance!=='undefined'?performance.now():Date.now(),local=players.find(p=>p.local),old=miniFrames.get(ctx);if(old&&now-old.time<80&&Math.hypot((local?.x||0)-old.x,(local?.y||0)-old.y)<100&&camera?.w===old.w&&camera?.h===old.h)return;miniFrames.set(ctx,{time:now,x:local?.x||0,y:local?.y||0,w:camera?.w,h:camera?.h});return previousMini(ctx,s,players,camera)};
})();
