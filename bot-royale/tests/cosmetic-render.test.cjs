'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),{performance}=require('perf_hooks');
let canvasPath;try{canvasPath=require.resolve('@napi-rs/canvas')}catch{canvasPath=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas')}
const {createCanvas,Image}=require(canvasPath);
(async()=>{
 const game=createCanvas(1440,900),mini=createCanvas(184,184),full=createCanvas(720,720),elements={},stored={};
 function el(s){if(s==='canvas')return game;if(s==='#island-minimap')return mini;if(s==='#island-full-map')return full;return elements[s]||={style:{},value:'',innerHTML:'',textContent:'',handlers:{},addEventListener(k,f){this.handlers[k]=f},setAttribute(k,v){this[k]=v}}}
 for(const c of [mini,full]){c.style={};c.handlers={};c.addEventListener=(k,f)=>c.handlers[k]=f}
 const context={document:{querySelector:el,createElement(type){if(type==='canvas')return createCanvas(300,150);throw Error(type)},addEventListener(){}},localStorage:{getItem(k){return stored[k]||null},setItem(k,v){stored[k]=v}},Image,Math,Date,console,devicePixelRatio:1,innerWidth:1440,innerHeight:900,requestAnimationFrame(){},setTimeout,clearTimeout};
 vm.createContext(context);const run=s=>vm.runInContext(s,context);let gameHtml=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');gameHtml=gameHtml.replace(/\/assets\/([a-f0-9]{20}\.(png|svg))/g,(_,name,type)=>'data:image/'+(type==='svg'?'svg+xml':'png')+';base64,'+fs.readFileSync(path.join(__dirname,'../public/assets',name)).toString('base64'));run(gameHtml.match(/<script>([\s\S]*)<\/script>/)[1]);
 for(let i=0;i<250;i++){if(run('cosmeticCategories.every(c=>cosmetics[c].length===cosmeticSprites[c].filter(Boolean).length)&&planeSprites.length===2'))break;await new Promise(r=>setTimeout(r,30))}
 assert(run('cosmeticCategories.every(c=>cosmetics[c].length===cosmeticSprites[c].filter(Boolean).length)'),'Artwork load failed');
 const sets=[
  {skin:14,pack:10,melee:10},{skin:15,pack:11,melee:11},{skin:16,pack:12,melee:12},{skin:17,pack:13,melee:13},
  {skin:18,pack:14,melee:14},{skin:19,pack:15,melee:15},{skin:20,pack:16,melee:16},{skin:21,pack:17,melee:17}
 ];
 run("newGame();finishLanding();slot=0;selectedItem='weapon';islandNetwork.ready=true;player.meleeSwing=0;player.x=0;player.y=0;player.angle=-Math.PI/2;");
 const rig=context.CosmeticRig;assert(rig);
 // A padded sprite must produce exactly the same equipment geometry/attachment.
 const sourceArt=createCanvas(100,200),sc=sourceArt.getContext('2d');sc.fillStyle='#ffdd99';sc.fillRect(20,30,60,150);
 const padded=createCanvas(210,330);padded.getContext('2d').drawImage(sourceArt,70,90);
 const b1=rig.bounds(sourceArt),b2=rig.bounds(padded);assert.deepEqual(JSON.parse(JSON.stringify(b1)),{x:20,y:30,w:60,h:150});assert.equal(b2.w,b1.w);assert.equal(b2.h,b1.h);assert.strictEqual(rig.bounds(sourceArt),b1,'Bounds were not cached');
 const referenceBody=rig.body(run('cosmeticSprite("skins",14)'),14);
 for(const index of [0,3,10,12,21]){
  const a=rig.pack(sourceArt,index,referenceBody),b=rig.pack(padded,index,referenceBody);for(const k of ['width','height','angle','x','y'])assert.equal(a[k],b[k],'Padding changed pack '+k);
  const c=rig.melee(sourceArt,index,referenceBody),d=rig.melee(padded,index,referenceBody);for(const k of ['width','height','angle','x','y'])assert.equal(c[k],d[k],'Padding changed melee '+k);
 }
 const drawing=game.getContext('2d'),bodyOnly=createCanvas(180,180),assembled=createCanvas(180,180);
 const gallery=createCanvas(1600,830),gg=gallery.getContext('2d');gg.fillStyle='#454545';gg.fillRect(0,0,1600,830);
 const rows=[];let transforms=0;
 function prepare(s,a=-Math.PI/2,xp=0,yp=0,swing=0){run('progression.selected.skins='+s.skin+';progression.selected.backpacks='+s.pack+';progression.selected.melees='+s.melee+';Object.assign(player,{x:'+xp+',y:'+yp+',angle:'+a+',meleeSwing:'+swing+'});')}
 function clear(){drawing.setTransform(1,0,0,1,0,0);drawing.clearRect(0,0,game.width,game.height)}
 for(let i=0;i<sets.length;i++){
  const s=sets[i];prepare(s);const skin=run('cosmeticSprite("skins",'+s.skin+')'),body=rig.body(skin,s.skin),pack=rig.pack(run('cosmeticSprite("backpacks",'+s.pack+')'),s.pack,body),blade=rig.melee(run('cosmeticSprite("melees",'+s.melee+')'),s.melee,body);
  assert(pack.width<=80,'Backpack overwhelmed body');assert(Math.max(blade.width,blade.height)<=54);assert.equal(run('player.r'),26);
  assert(Math.abs(pack.width/pack.height-pack.b.w/pack.b.h)<1e-10);assert(Math.abs(blade.width/blade.height-blade.b.w/blade.b.h)<1e-10);
  for(const angle of [0,Math.PI/4,Math.PI/2,Math.PI,Math.PI*1.5,-Math.PI/2])for(const swing of [0,.09]){
   prepare(s,angle,230+i*3,180+i*2,swing);clear();run('drawCharacter(player)');const local=Buffer.from(drawing.getImageData(0,0,game.width,game.height).data);
   clear();run('islandDrawRemote({x:player.x,y:player.y,angle:player.angle,phase:"ground",skin:'+s.skin+',backpack:'+s.pack+',melee:'+s.melee+',slot:0,meleeSwing:player.meleeSwing})');const remote=Buffer.from(drawing.getImageData(0,0,game.width,game.height).data);
   assert(local.equals(remote),'Multiplayer pose differed for set '+i+' angle '+angle);transforms++;
  }
  prepare(s);
  // Verify that the final front layer does not conceal the central face.
  const bx=bodyOnly.getContext('2d'),ax=assembled.getContext('2d');bx.setTransform(1,0,0,1,0,0);bx.clearRect(0,0,180,180);bx.translate(90,90);rig.drawBody(bx,body);
  ax.setTransform(1,0,0,1,0,0);ax.clearRect(0,0,180,180);ax.translate(90,90);rig.drawPack(ax,pack);rig.drawBody(ax,body);rig.drawMelee(ax,blade,'#d7dfcb');
  const bp=bx.getImageData(0,0,180,180).data,ap=ax.getImageData(0,0,180,180).data;let occupied=0,covered=0;
  for(let yy=73;yy<=107;yy++)for(let xx=73;xx<=107;xx++)if(Math.hypot(xx-90,yy-90)<=16){const p=(yy*180+xx)*4;if(bp[p+3]>240){occupied++;if(Math.abs(bp[p]-ap[p])+Math.abs(bp[p+1]-ap[p+1])+Math.abs(bp[p+2]-ap[p+2])>15)covered++}}
  assert(occupied>100);assert(covered/occupied<.04,'Melee covers central face for set '+i+': '+covered+'/'+occupied);
  clear();run('x.save();x.translate(210,190);x.scale(2.25,2.25);drawCharacter(player);x.restore()');
  const cx=200+(i%4)*400,cy=225+Math.floor(i/4)*380;gg.drawImage(game,0,0,420,380,cx-210,cy-190,420,380);
  gg.fillStyle='#f5f5ed';gg.font='bold 17px sans-serif';gg.textAlign='center';gg.fillText(run('cosmetics.skins['+s.skin+'][0]'),cx,cy+165);
  rows.push({outfit:run('cosmetics.skins['+s.skin+'][0]'),backpack:run('cosmetics.backpacks['+s.pack+'][0]'),melee:run('cosmetics.melees['+s.melee+'][0]'),bodyVisible:[+body.width.toFixed(2),+body.height.toFixed(2)],backpackVisible:[+pack.width.toFixed(2),+pack.height.toFixed(2)],meleeVisible:[+blade.width.toFixed(2),+blade.height.toFixed(2)],centralFaceCoveragePercent:+(100*covered/occupied).toFixed(2)});
 }
 fs.writeFileSync(path.join(__dirname,'../cosmetic-comparison.png'),gallery.toBuffer('image/png'));
 const rotations=createCanvas(1600,900),rg=rotations.getContext('2d');rg.fillStyle='#454545';rg.fillRect(0,0,1600,900);
 for(let row=0;row<4;row++)for(let col=0;col<8;col++){prepare(sets[col],-Math.PI/2+row*Math.PI/2);clear();run('x.save();x.translate(100,100);x.scale(1.45,1.45);drawCharacter(player);x.restore()');rg.drawImage(game,0,0,200,210,col*200,row*220,200,210);rg.fillStyle='#ecece1';rg.font='12px sans-serif';rg.textAlign='center';rg.fillText(['UP','RIGHT','DOWN','LEFT'][row],col*200+100,row*220+200)}
 fs.writeFileSync(path.join(__dirname,'../cosmetic-rotations.png'),rotations.toBuffer('image/png'));
 // Cover every catalog design and all none / gun combinations with original art.
 let combinations=0;
 for(let index=-1;index<22;index++)for(const skin of [0,9,14,17,25]){
  const s={skin,pack:index,melee:index};prepare(s);clear();run('drawCharacter(player)');run('slot=1;drawCharacter(player);slot=0');combinations++;
 }
 prepare({skin:-1,pack:-1,melee:-1});clear();run('drawCharacter(player)');assert.equal(run('player.r'),26);
 // Use the actual world renderer for an eight-outfit gameplay capture.
 run("initializeIsland(901);finishLanding();islandNetwork.ready=true;cameraX=3000;cameraY=3000;cameraZoom=1;islandState.objects=[];islandState.index.cells.clear();islandState.bushes=[];islandState.water=[];islandState.bridges=[];islandState.roads=[];islandState.fields=[];islandState.buildings=[];islandState.doors=[];islandState.containers=[];chests=[];islandState.loot=[];loot=[];");
 const remoteActors=sets.slice(1).map((s,i)=>({id:'preview-'+i,x:2510+(i+1)%4*330,y:2820+Math.floor((i+1)/4)*340,angle:-Math.PI/2,phase:'ground',skin:s.skin,backpack:s.pack,melee:s.melee,slot:0,hp:100,meleeSwing:0}));
 context.previewActors=remoteActors;prepare(sets[0],-Math.PI/2,2510,2820);run('bots=previewActors;draw()');fs.writeFileSync(path.join(__dirname,'../cosmetics-in-game.png'),game.toBuffer('image/png'));
 const result={status:'passed',reference:'Existing cosmetics matched to supplied eight-set proportions; no new artwork',sets:rows,localRemotePoseChecks:transforms,catalogCombinations:combinations,transparentPadding:'Invariant equipment geometry and cached alpha bounds',aspectRatios:'Preserved',bodyRadius:26,artwork:'Unchanged originals; one backpack layer, one body layer, one equipped melee layer'};
 fs.writeFileSync(path.join(__dirname,'../cosmetic-test-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
