// All loose ammo uses the supplied compact cartridge artwork.
let islandAmmoPickupArt=null,islandMediumAmmoArt=null,islandShotgunAmmoArt=null,islandSniperAmmoArt=null;
const islandAmmoPickupImage=new Image();islandAmmoPickupImage.onload=()=>{islandAmmoPickupArt=islandExtractShotgun(islandAmmoPickupImage)};islandAmmoPickupImage.src='__AMMO_PICKUP_IMAGE__';
const islandMediumAmmoImage=new Image();islandMediumAmmoImage.onload=()=>{islandMediumAmmoArt=islandExtractShotgun(islandMediumAmmoImage)};islandMediumAmmoImage.src='__MEDIUM_AMMO_IMAGE__';
const islandShotgunAmmoImage=new Image();islandShotgunAmmoImage.onload=()=>{islandShotgunAmmoArt=islandExtractShotgun(islandShotgunAmmoImage)};islandShotgunAmmoImage.src='__SHOTGUN_AMMO_IMAGE__';
const islandSniperAmmoImage=new Image();islandSniperAmmoImage.onload=()=>{islandSniperAmmoArt=islandExtractShotgun(islandSniperAmmoImage)};islandSniperAmmoImage.src='__SNIPER_AMMO_IMAGE__';
const islandPreviousLootDraw=IslandDraw.loot;
IslandDraw.loot=function(ctx,q,...args){if(q.type!=='ammo')return islandPreviousLootDraw(ctx,q,...args);if(q.taken)return;const art=q.ammoFamily==='sniper'?islandSniperAmmoArt:q.ammoFamily==='shotgun'?islandShotgunAmmoArt:q.ammoFamily==='p90'||q.ammoFamily==='medium'?islandMediumAmmoArt:islandAmmoPickupArt;if(!art)return islandPreviousLootDraw(ctx,q,...args);const factor=30/Math.max(art.width,art.height);ctx.save();ctx.drawImage(art,q.x-art.width*factor/2,q.y-art.height*factor/2,art.width*factor,art.height*factor);ctx.restore()};
