// Supplied shotgun artwork: source pixels are retained; only connected backdrop is hidden at load time.
let islandWeaponArtRevision=0,islandShotgunLootReady=false,islandShotgunHeldReady=false;
function islandExtractShotgun(img){
 const source=document.createElement('canvas'),w=source.width=img.naturalWidth||img.width,h=source.height=img.naturalHeight||img.height,z=source.getContext('2d',{willReadFrequently:true});z.drawImage(img,0,0);const pixels=z.getImageData(0,0,w,h),v=pixels.data,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
 function add(i){if(seen[i])return;seen[i]=1;const k=i*4,max=Math.max(v[k],v[k+1],v[k+2]),min=Math.min(v[k],v[k+1],v[k+2]);if(v[k+3]<8||min>=14&&max<=70&&max-min<=12)queue[tail++]=i}
 for(let xx=0;xx<w;xx++){add(xx);add((h-1)*w+xx)}for(let yy=0;yy<h;yy++){add(yy*w);add(yy*w+w-1)}
 while(head<tail){const i=queue[head++],xx=i%w;v[i*4+3]=0;if(xx>0)add(i-1);if(xx<w-1)add(i+1);if(i>=w)add(i-w);if(i<w*(h-1))add(i+w)}z.putImageData(pixels,0,0);
 let left=w,right=-1,top=h,bottom=-1;for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)if(v[(yy*w+xx)*4+3]>8){left=Math.min(left,xx);right=Math.max(right,xx);top=Math.min(top,yy);bottom=Math.max(bottom,yy)}if(right<left)throw Error('Shotgun artwork is empty');
 const out=document.createElement('canvas');out.width=right-left+1;out.height=bottom-top+1;out.getContext('2d').drawImage(source,left,top,out.width,out.height,0,0,out.width,out.height);return out
}
const islandShotgunLootImage=new Image();islandShotgunLootImage.onload=()=>{weaponSprites[2]=islandExtractShotgun(islandShotgunLootImage);islandShotgunLootReady=true;islandWeaponArtRevision++;inventorySignature='';refreshWeaponGallery();if(player)updateHUD()};islandShotgunLootImage.src='__SHOTGUN_LOOT_IMAGE__';
const islandShotgunHeldImage=new Image();islandShotgunHeldImage.onload=()=>{heldWeaponSprites[2]=islandExtractShotgun(islandShotgunHeldImage);islandShotgunHeldReady=true};islandShotgunHeldImage.src='__SHOTGUN_HELD_IMAGE__';
const islandPreviousHeldWeapon=drawHeldWeapon;
drawHeldWeapon=function(type,mouth,rarity=0,shotAge=Infinity){if(type!==2||!islandShotgunHeldReady)return islandPreviousHeldWeapon(type,mouth);const art=heldWeaponSprites[2],length=64,width=length*art.width/art.height;x.save();x.translate(mouth-8,0);x.rotate(Math.PI/2);x.drawImage(art,-width/2,-length,width,length);if(shotAge<45){x.globalAlpha=1-shotAge/45;x.fillStyle='#e9ae55';x.beginPath();x.moveTo(-5,-length);x.lineTo(0,-length-13);x.lineTo(5,-length);x.closePath();x.fill()}x.restore()};
