/* Load and equip the supplied collection by stable, independent IDs. */
(function(){
 const data=COSMETIC_COLLECTION_DATA,groups=['skins','melees','backpacks'];
 const idFields={skins:'skinId',melees:'meleeId',backpacks:'backpackId'};
 for(const group of groups){
  cosmetics[group]=data[group].map(item=>[item.name,'#d4ecdf',0,item.id]);
  cosmeticSprites[group]=[];
 }
 for(const group of groups){
  const field=idFields[group],saved=progression.collectionVersion===data.version?progression[field]:undefined;
  progression.selected[group]=saved===null?-1:Math.max(0,data[group].findIndex(item=>item.id===saved));
 }
 progression.collectionVersion=data.version;
 const oldSave=saveProgress;
 saveProgress=function(){
  for(const group of groups)progression[idFields[group]]=data[group][selectedCosmetic(group)]?.id||null;
  oldSave();
 };
 saveProgress();
 cosmeticSprite=function(group,index){return index<0?null:cosmeticSprites[group]?.[index]||null};
 const oldPreview=cosmeticPreview;
 cosmeticPreview=function(group,index){
  if(!groups.includes(group))return oldPreview(group,index);
  const look={skin:selectedCosmetic('skins'),melee:selectedCosmetic('melees'),backpack:selectedCosmetic('backpacks')};
  look[{skins:'skin',melees:'melee',backpacks:'backpack'}[group]]=index;
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=210;
  const ctx=canvas.getContext('2d');ctx.translate(128,116);ctx.scale(1.65,1.65);ctx.rotate(-Math.PI/2);
  CosmeticRig.drawAssembly(ctx,look,cosmeticSprite);
  return canvas.toDataURL();
 };
 equipLobbySet=function(){
  for(const group of groups)progression.selected[group]=0;
  saveProgress();refreshHomePreview();toastLobby('Candy set equipped');
 };
 renderLobbyShop=function(){
  const featured=[['skins',0],['melees',0],['backpacks',0]];
  $('#shop-featured-art').innerHTML=menuImage('skins',selectedCosmetic('skins'));
  for(const group of ['skins','melees'])$('#shop-row-'+group).innerHTML=data[group].slice(0,4).map((item,index)=>'<button class="store-item" data-menu-equip="'+group+'" data-index="'+index+'"><strong>'+htmlText(item.name)+'</strong>'+menuImage(group,index)+'<span class="equip-strip">Equip · Unlocked</span></button>').join('');
  $('#shop-picks').innerHTML=featured.map(([group,index])=>'<button class="store-item" data-menu-equip="'+group+'" data-index="'+index+'"><strong>'+htmlText(cosmetics[group][index][0])+'</strong>'+menuImage(group,index)+'<small>'+cosmeticLabels[group]+'</small><span class="equip-strip">Equip · Unlocked</span></button>').join('');
 };
 function refresh(){inventorySignature='';refreshHomePreview();renderArmory();renderCosmeticHub()}
 function image(source){return new Promise((resolve,reject)=>{
  const art=new Image();art.onload=()=>resolve(art);art.onerror=()=>reject(new Error('Could not load supplied cosmetic'));
  art.src=source;
 })}
 const pending=[];
 for(const group of groups)for(const [index,item] of data[group].entries()){
  pending.push((async()=>{
   if(item.kind==='gloves'){
    const parts=await Promise.all(item.parts.map(part=>image(part.source)));
    const pair=document.createElement('canvas');pair.width=parts[0].width+parts[1].width;pair.height=Math.max(...parts.map(part=>part.height));pair.gloves=parts;
    cosmeticSprites[group][index]=pair;
   }else cosmeticSprites[group][index]=await image(item.source);
  })());
 }
 globalThis.cosmeticCollectionReady=Promise.all(pending).then(()=>{refresh();return true}).catch(error=>{console.error(error);return false});
 refresh();
})();
