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
 const rig=context.CosmeticRig,oldEnv={document:context.document};vm.createContext(oldEnv);vm.runInContext(fs.readFileSync(path.join(__dirname,'fixtures/cosmetics-before-melee.js'),'utf8'),oldEnv);const before=oldEnv.CosmeticRig;
 for(const name of ['bounds','body','pack','sprite','drawPack','drawBody'])if(rig[name])assert.equal(rig[name].toString(),before[name].toString(),'Non-melee renderer changed: '+name);
 assert.equal(JSON.stringify(rig.packProfiles),JSON.stringify(before.packProfiles));assert.equal(JSON.stringify(rig.bodyProfiles),JSON.stringify(before.bodyProfiles));
 run("newGame();finishLanding();islandNetwork.ready=true;slot=0;selectedItem='weapon';player.meleeSwing=0;");
 game.width=320;game.height=320;const z=game.getContext('2d'),drawImage=z.drawImage,rows=[];let pending=null,record=null,checks=0,maxCoverage=0,maxDrift=0;
 z.drawImage=function(...args){if(pending&&args[0]===pending.art){const m=this.getTransform(),dx=args[5]+args[7]*pending.grip[0],dy=args[6]+args[8]*pending.grip[1];record={x:m.a*dx+m.c*dy+m.e,y:m.b*dx+m.d*dy+m.f}}return drawImage.apply(this,args)};
 function clear(){z.setTransform(1,0,0,1,0,0);z.clearRect(0,0,320,320)}
 function pose(index,angle,swing,xp=160,yp=160){run('progression.selected.skins=16;progression.selected.backpacks=12;progression.selected.melees='+index+';slot=0;Object.assign(player,{x:'+xp+',y:'+yp+',angle:'+angle+',meleeSwing:'+swing+'});')}
 const fistGallery=createCanvas(1440,760),fg=fistGallery.getContext('2d');fg.fillStyle='#254c3e';fg.fillRect(0,0,1440,760);
 for(let row=0;row<2;row++)for(let col=0;col<4;col++){
  const skin=[16,0][row],state=col;clear();run('progression.selected.skins='+skin+';progression.selected.backpacks=-1;progression.selected.melees='+(state===3?12:-1)+';selectedItem="weapon";slot='+(state===1||state===2?1:0)+';player.inventory[1]=gun('+(state===1?0:1)+');Object.assign(player,{x:0,y:0,angle:-Math.PI/2,meleeSwing:0});x.save();x.translate(160,195);x.scale(2,2);drawCharacter(player);x.restore()');fg.drawImage(game,col*360+20,row*380+15);fg.fillStyle='#f2e8cc';fg.font='bold 16px sans-serif';fg.textAlign='center';fg.fillText(['ROUND FISTS','PISTOL GRIP','RIFLE GRIP','TWO-HANDED MELEE'][col],col*360+180,row*380+340);
 }fs.writeFileSync(path.join(__dirname,'../round-fists-preview.png'),fistGallery.toBuffer('image/png'));
 for(let skin=0;skin<26;skin++){clear();run('progression.selected.skins='+skin+';progression.selected.backpacks=-1;progression.selected.melees=-1;slot=0;Object.assign(player,{x:160,y:160,angle:0,meleeSwing:0});drawCharacter(player)');for(const yy of [137,183]){const pixel=z.getImageData(185,yy,1,1).data;assert(Math.abs(pixel[0]-212)<=1&&Math.abs(pixel[1]-164)<=1&&Math.abs(pixel[2]-99)<=1,'Fists changed color or disappeared on skin '+skin)}}
 for(let i=0;i<22;i++){
  const art=run('cosmeticSprite("melees",'+i+')'),b=rig.bounds(art),body=rig.body(run('cosmeticSprite("skins",16)'),16),now=rig.melee(art,i,body),old=before.melee(art,i,body),factor=Math.max(now.width,now.height)/Math.max(old.width,old.height);
  assert(factor>=1.25&&factor<=1.4,'Enlargement outside requested interval for '+i);assert(Math.abs(now.width/now.height-b.w/b.h)<1e-10);
  const gripPixel=art.getContext('2d').getImageData(Math.round(b.x+b.w*now.grip[0]),Math.round(b.y+b.h*now.grip[1]),1,1).data;assert(gripPixel[3]>32,'Grip misses visible handle artwork: '+i+' alpha '+gripPixel[3]);if(now.supportGrip){const secondary=art.getContext('2d').getImageData(Math.round(b.x+b.w*now.supportGrip[0]),Math.round(b.y+b.h*now.supportGrip[1]),1,1).data;assert(secondary[3]>32,'Support grip misses handle');}
  for(let j=0;j<16;j++){
   const angle=j*Math.PI/8,xp=155+j%3*3,yp=155+j%5*2;pose(i,angle,0,xp,yp);clear();run('slot=5;drawCharacter(player);slot=0');const noMelee=Buffer.from(z.getImageData(0,0,320,320).data);
   for(const swing of [0,.18,.135,.09,.045]){
    pose(i,angle,swing,xp,yp);clear();pending=rig.melee(art,i,body,swing);record=null;run('drawCharacter(player)');assert(record,'Melee not rendered');
    const expected={x:xp+Math.cos(angle)*now.x-Math.sin(angle)*now.y,y:yp+Math.sin(angle)*now.x+Math.cos(angle)*now.y};
    maxDrift=Math.max(maxDrift,Math.hypot(record.x-expected.x,record.y-expected.y));assert(Math.hypot(record.x-expected.x,record.y-expected.y)<.001,'Grip drift '+JSON.stringify({i,j,swing,record,expected,error:Math.hypot(record.x-expected.x,record.y-expected.y)}));
    const local=Buffer.from(z.getImageData(0,0,320,320).data);let total=0,covered=0;for(let yy=yp-14;yy<=yp+14;yy++)for(let xx=xp-14;xx<=xp+14;xx++)if(Math.hypot(xx-xp,yy-yp)<=14){const p=(yy*320+xx)*4;if(noMelee[p+3]>240){total++;if(Math.abs(noMelee[p]-local[p])+Math.abs(noMelee[p+1]-local[p+1])+Math.abs(noMelee[p+2]-local[p+2])>15)covered++}}
    maxCoverage=Math.max(maxCoverage,total?covered/total:0);assert(total&&covered/total<.05,'Melee overlaps central face: '+i+' '+swing+' '+covered+'/'+total);
    clear();run('islandDrawRemote({phase:"ground",x:player.x,y:player.y,angle:player.angle,skin:16,backpack:12,melee:'+i+',meleeSwing:player.meleeSwing,slot:0})');assert(local.equals(Buffer.from(z.getImageData(0,0,320,320).data)),'Local/remote melee mismatch');checks++;
   }
  }
  rows.push({index:i,name:run('cosmetics.melees['+i+'][0]'),sizeMultiplier:+factor.toFixed(3),visibleBounds:[+now.width.toFixed(2),+now.height.toFixed(2)],grip:now.grip,attachment:[now.x,now.y]});
 }
 pending=null;z.drawImage=drawImage;
 const gallery=createCanvas(1500,1000),g=gallery.getContext('2d');g.fillStyle='#454545';g.fillRect(0,0,1500,1000);
 const examples=[12,18,6,0,13,3];
 for(let cell=0;cell<examples.length;cell++){
  const i=examples[cell],sx=cell%3*500,sy=Math.floor(cell/3)*500;
  for(let version=0;version<2;version++){
   context.CosmeticRig=version?rig:before;pose(i,-Math.PI/2,0,0,0);clear();run('x.save();x.translate(100,170);x.scale(2.2,2.2);drawCharacter(player);x.restore()');
   g.drawImage(game,0,0,320,320,sx+(version?250:0),sy+50,250,250);
   g.fillStyle=version?'#b7ee8c':'#ddd6c9';g.font='bold 14px sans-serif';g.textAlign='center';g.fillText(version?'AFTER':'BEFORE',sx+(version?375:125),sy+370);
  }
  g.fillStyle='#f5f5ed';g.font='bold 19px sans-serif';g.fillText(rows[i].name+'  ·  '+rows[i].sizeMultiplier+'×',sx+250,sy+420);
 }
 context.CosmeticRig=rig;fs.writeFileSync(path.join(__dirname,'../melee-before-after.png'),gallery.toBuffer('image/png'));
 const poses=createCanvas(1600,600),pg=poses.getContext('2d');pg.fillStyle='#454545';pg.fillRect(0,0,1600,600);
 for(let row=0;row<2;row++)for(let col=0;col<8;col++){
  const angle=-Math.PI/2+col*Math.PI/4;pose(row?18:12,angle,row?.09:0,0,0);clear();run('x.save();x.translate(160,160);x.scale(1.6,1.6);drawCharacter(player);x.restore()');pg.drawImage(game,0,0,320,320,col*200,row*300+20,200,200);pg.fillStyle='#ecece1';pg.font='12px sans-serif';pg.textAlign='center';pg.fillText((row?'SPINNER · MID SWING':'SCYTHE · REST')+' '+(col*45)+'°',col*200+100,row*300+260);
 }
 fs.writeFileSync(path.join(__dirname,'../melee-rotation-attack.png'),poses.toBuffer('image/png'));
 const result={status:'passed',weaponCount:22,poseComparisons:checks,allAxesAndAttackPoses:true,gripDriftMaxPx:maxDrift,maxCentralFaceCoveragePercent:+(maxCoverage*100).toFixed(2),skinAndBackpack:'Identical functions, profiles, dimensions, and offsets',rows};
 fs.writeFileSync(path.join(__dirname,'../melee-test-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});


