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
 run("newGame();initializeIsland(901);finishLanding();const room=islandState.buildings[0];Object.assign(player,{x:room.x+room.w/2,y:room.y+room.h/2});cameraX=player.x;cameraY=player.y;cameraZoom=1;bots=[];progression.selected.skins=14;progression.selected.backpacks=10;progression.selected.melees=10;player.inventory[1]=gun(1);slot=1;player.angle=0;islandLastDt=1/60;");
 for(let i=0;i<40;i++)run('draw()');
 assert(run('IslandCore.buildingAt(islandState,player).roofAlpha<.05'),'Cutaway interior was obscured');
 fs.writeFileSync(path.join(__dirname,'../island-interior.png'),game.toBuffer('image/png'));
 run("Object.assign(player,{x:room.x+room.w/2,y:room.y-130});cameraX=player.x;cameraY=player.y;islandState.doors.find(d=>d.building===room.id).open=true;");
 for(let i=0;i<35;i++)run('draw()');
 assert(run('room.roofAlpha===1'),'Outside view exposed the interior');
 fs.writeFileSync(path.join(__dirname,'../island-gameplay.png'),game.toBuffer('image/png'));
 const overview=createCanvas(1400,1400);context.islandOverviewCanvas=overview;run('IslandRender.map(islandOverviewCanvas.getContext("2d"),islandState,1400,1400,player,islandMarker,planeRoute,planeRoute.start,world)');
 fs.writeFileSync(path.join(__dirname,'../island-overview.png'),overview.toBuffer('image/png'));
 run('islandState.zone.current={x:player.x+500,y:player.y,r:350};islandState.zone.next={x:player.x+500,y:player.y,r:230};islandState.time=5;IslandCore.advanceZone(islandState,1,[player]);draw()');fs.writeFileSync(path.join(__dirname,'../island-gas.png'),game.toBuffer('image/png'));
 game.width=1040;game.height=720;context.innerWidth=1040;context.innerHeight=720;run('resize();x.setTransform(1,0,0,1,0,0);x.fillStyle="#17332f";x.fillRect(0,0,1040,720);slot=0;selectedItem="weapon";progression.selected.backpacks=-1;player.meleeSwing=0;player.angle=-Math.PI/2;player.x=0;player.y=0;');
 const gallery=game.getContext('2d');gallery.fillStyle='#e7f5e9';gallery.font='900 22px sans-serif';gallery.textAlign='center';gallery.fillText('MELEE CARRY · AIMING UP',520,35);
 const choices=[0,1,3,10,13,16,17,21];for(let i=0;i<choices.length;i++){const index=choices[i],cx=130+i%4*260,cy=220+Math.floor(i/4)*325;run('progression.selected.melees='+index+';x.save();x.translate('+cx+','+cy+');x.scale(2.25,2.25);drawCharacter(player);x.restore()');gallery.fillStyle='#e7f5e9';gallery.font='bold 14px sans-serif';gallery.textAlign='center';gallery.fillText(run('cosmetics.melees['+index+'][0]'),cx,cy+110);gallery.fillStyle='#8dbcb0';gallery.font='11px sans-serif';gallery.fillText('HANDLE ←   HEAD / BLADE →',cx,cy+130)}
 fs.writeFileSync(path.join(__dirname,'../melee-hold-preview.png'),game.toBuffer('image/png'));
 run('x.setTransform(1,0,0,1,0,0);x.fillStyle="#17332f";x.fillRect(0,0,1040,720)');
gallery.fillStyle='#e7f5e9';gallery.font='900 22px sans-serif';gallery.fillText('PROPORTIONAL EQUIPMENT',520,35);
for(let i=0;i<8;i++){const pack=[0,3,7,10,12,15,18,21][i],cx=130+i%4*260,cy=220+Math.floor(i/4)*325;run('progression.selected.backpacks='+pack+';progression.selected.melees='+[10,13,16,17,0,1,3,21][i]+';x.save();x.translate('+cx+','+cy+');x.scale(1.6,1.6);drawCharacter(player);x.restore()');gallery.fillStyle='#e7f5e9';gallery.font='bold 14px sans-serif';gallery.textAlign='center';gallery.fillText(run('cosmetics.backpacks['+pack+'][0]'),cx,cy+125)}
fs.writeFileSync(path.join(__dirname,'../gear-size-preview.png'),game.toBuffer('image/png'));
run('progression.selected.backpacks=10');
game.width=1440;game.height=900;context.innerWidth=1440;context.innerHeight=900;run('resize();Object.assign(player,{x:room.x+room.w/2,y:room.y-130});cameraX=player.x;cameraY=player.y;cameraZoom=1;progression.selected.melees=10;islandState.zone=IslandCore.buildWorld(901).zone;draw()');fs.writeFileSync(path.join(__dirname,'../island-melee.png'),game.toBuffer('image/png'));
 const frames=80,start=performance.now();for(let i=0;i<frames;i++)run('draw()');const average=(performance.now()-start)/frames,count=run('islandRenderCount'),total=run('islandState.objects.length');
 assert(count<total*.4,'World culling is ineffective');
 const results={status:'passed',pictures:75,roofEnter:'transparent',roofExit:'opaque',visibleObjects:count,totalObjects:total,nativeCanvasAverageMs:Number(average.toFixed(2)),note:'Native Canvas benchmark; browser frame-rate target requires measurement in an active desktop browser.'};
 console.log(JSON.stringify(results,null,2));fs.writeFileSync(path.join(__dirname,'../island-render-test-results.json'),JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
