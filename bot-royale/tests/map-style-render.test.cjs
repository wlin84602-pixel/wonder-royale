'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),{performance}=require('perf_hooks');
let canvasPath;try{canvasPath=require.resolve('@napi-rs/canvas')}catch{canvasPath=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas')}
const {createCanvas,Image}=require(canvasPath);
(async()=>{
 const game=createCanvas(1440,900),mini=createCanvas(184,184),full=createCanvas(720,720),elements={},stored={};
 function el(s){if(s==='canvas')return game;if(s==='#island-minimap'||s==='#lobby-island-map')return mini;if(s==='#island-full-map')return full;return elements[s]||={style:{},value:'',innerHTML:'',textContent:'',handlers:{},addEventListener(k,f){this.handlers[k]=f},setAttribute(k,v){this[k]=v}}}
 for(const c of [mini,full]){c.style={};c.handlers={};c.addEventListener=(k,f)=>c.handlers[k]=f}
 const context={performance,URL,URLSearchParams,document:{querySelector:el,createElement(type){if(type==='canvas')return createCanvas(300,150);throw Error(type)},addEventListener(){}},localStorage:{getItem(k){return stored[k]||null},setItem(k,v){stored[k]=v}},Image,Math,Date,console,devicePixelRatio:1,innerWidth:1440,innerHeight:900,requestAnimationFrame(){},setTimeout,clearTimeout};
 vm.createContext(context);const run=s=>vm.runInContext(s,context);let gameHtml=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');gameHtml=gameHtml.replace(/\/assets\/([a-f0-9]{20}\.(png|svg))/g,(_,name,type)=>'data:image/'+(type==='svg'?'svg+xml':'png')+';base64,'+fs.readFileSync(path.join(__dirname,'../public/assets',name)).toString('base64'));run(gameHtml.match(/<script>([\s\S]*)<\/script>/)[1]);

 // Current catalogs intentionally retain source-sheet sprite indices after removing generated items.
 // Render the base player without depending on removed catalog entries.
 for(let i=0;i<120&&!run('planeSprites.length===2');i++)await new Promise(r=>setTimeout(r,50));
 run("newGame();initializeIsland(4937);finishLanding();running=true;bots=[];progression.selected.skins=-1;progression.selected.backpacks=-1;progression.selected.melees=-1;slot=0;dropPhase='ground';player.phase='ground';islandState.zone.current.r=world*2;islandState.zone.next.r=world*2;islandState.time=25");
 const state=run('islandState'),T=context.IslandMapTheme,dir=path.join(__dirname,'../previews');fs.mkdirSync(dir,{recursive:true});
 const gallery=createCanvas(2048,1280),g=gallery.getContext('2d'),names=Object.keys(T.themes);g.fillStyle='#13262e';g.fillRect(0,0,2048,1280);
 for(let i=0;i<names.length;i++){const theme=names[i],b=state.buildings.find(b=>T.idAt(b.x+b.w/2,b.y+b.h/2,state.size)===theme);assert(b,'Missing '+theme+' building');context.previewBuilding=b;
 run('Object.assign(player,{x:previewBuilding.x+previewBuilding.w/2,y:previewBuilding.y-210,angle:Math.PI/2});cameraX=previewBuilding.x+previewBuilding.w/2;cameraY=previewBuilding.y+previewBuilding.h/2;cameraZoom=.80;draw()');assert.equal(b.roofAlpha,1,'Exterior roof must conceal interior');
 const xx=(i%4)*512,yy=Math.floor(i/4)*640;g.drawImage(game,0,0,1440,900,xx,yy+30,512,300);
 run('Object.assign(player,{x:previewBuilding.x+previewBuilding.w/2,y:previewBuilding.y+previewBuilding.h/2});draw()');assert.equal(b.roofAlpha,0,'Interior must reveal with previous privacy rules');g.drawImage(game,0,0,1440,900,xx,yy+335,512,300);g.fillStyle='#f2f5ec';g.font='bold 16px sans-serif';g.fillText(T.themes[theme].name+' · exterior / interior',xx+12,yy+22);
 }
 fs.writeFileSync(path.join(dir,'building-theme-comparison.png'),gallery.toBuffer('image/png'));
 const ov=createCanvas(1600,1600);context.mapPreview=ov;run('IslandRender.map(mapPreview.getContext("2d"),islandState,1600,1600,player,null,null,null,world)');fs.writeFileSync(path.join(dir,'reference-map-in-game.png'),ov.toBuffer('image/png'));
 // Compare raw and cached scenery in every region; padding and biome keys must agree.
 const rendered=context.IslandRender,raw=context.IslandPerformance.raw;let maxChanged=0;
 for(const theme of names){const tree=state.objects.find(o=>o.kind==='tree'&&T.idAt(o.x,o.y,state.size)===theme);assert(tree);const a=createCanvas(256,256),b=createCanvas(256,256);for(const c of [a,b])c.getContext('2d').translate(128-tree.x,128-tree.y);rendered.canopies(a.getContext('2d'),[tree],null);raw.canopies(b.getContext('2d'),[tree],null);const aa=a.getContext('2d').getImageData(0,0,256,256).data,bb=b.getContext('2d').getImageData(0,0,256,256).data;let changed=0;for(let k=0;k<aa.length;k+=4)if(Math.abs(aa[k]-bb[k])+Math.abs(aa[k+1]-bb[k+1])+Math.abs(aa[k+2]-bb[k+2])+Math.abs(aa[k+3]-bb[k+3])>75)changed++;maxChanged=Math.max(maxChanged,changed/65536);assert(changed/65536<.02,theme+' cache changes foliage');}
 console.log(JSON.stringify({status:'passed',themes:names.length,buildings:state.buildings.length,roofPrivacy:'8 exterior / interior pairs passed',maxCachedFoliageDifferencePercent:+(maxChanged*100).toFixed(3),screenshots:['building-theme-comparison.png','reference-map-in-game.png']},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
