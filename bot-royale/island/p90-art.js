// Original supplied P90 images, shared across held, ground and inventory rendering.
const islandP90Art={};
function loadP90(src,key){const img=new Image();img.onload=()=>{const loot=islandExtractShotgun(img,false);islandP90Art[key]||={};islandP90Art[key].loot=loot;if(key==='standard')weaponSprites[4]=loot;islandWeaponArtRevision++;inventorySignature='';if(player)updateHUD()};img.src=src}
function loadP90Overhead(src,key){const img=new Image();img.onload=()=>{const held=islandExtractShotgun(img,false);islandP90Art[key]||={};islandP90Art[key].held=held;if(key==='standard')heldWeaponSprites[4]=held};img.src=src}
loadP90Overhead('__P90_HELD_STANDARD__','standard');loadP90Overhead('__P90_HELD_ULTIMATE__','ultimate');
loadP90('__P90_STANDARD__','standard');loadP90('__P90_ULTIMATE__','ultimate');
const p90OldSprite=islandWeaponSprite;islandWeaponSprite=function(type,rarity=0){return type===4?islandP90Art[rarity===4?'ultimate':'standard']?.loot||weaponSprites[4]:p90OldSprite(type,rarity)};
const p90OldURL=spriteURL;spriteURL=function(type,rarity=0){const art=type===4&&islandP90Art[rarity===4?'ultimate':'standard']?.loot;return art?art.toDataURL():p90OldURL(type,rarity)};
const p90OldHeld=drawHeldWeapon;drawHeldWeapon=function(type,mouth,rarity=0,age=Infinity){if(type!==4)return p90OldHeld(type,mouth,rarity,age);const art=islandP90Art[rarity===4?'ultimate':'standard']?.held;if(!art)return;const length=58,width=length*art.width/art.height;x.save();x.translate(mouth-8,0);x.rotate(Math.PI/2);x.drawImage(art,-width/2,-length,width,length);islandMuzzleFlash(x,length,age,type,rarity);x.restore()};
