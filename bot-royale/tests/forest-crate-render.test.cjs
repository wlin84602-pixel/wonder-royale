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
 run("newGame();initializeIsland(901);finishLanding();bots=[];slot=0;selectedItem='weapon';islandState.time=20;");
 const R=context.IslandRender,preview=createCanvas(1200,430),z=preview.getContext('2d');z.fillStyle='#111b24';z.fillRect(0,0,1200,430);
 for(const [i,kind]of ['basic','gold','ultimate'].entries()){z.save();z.translate(200+i*400,180);z.scale(5,5);R.crate(z,{kind,x:0,y:0,open:false,destroyed:false});z.restore();z.fillStyle='#f4f2df';z.font='bold 26px sans-serif';z.textAlign='center';z.fillText(['WOODEN','GOLD','ULTIMATE'][i],200+i*400,330);z.font='18px sans-serif';z.fillStyle='#bad2d2';z.fillText(['1 heal or any gun','3 items','Legendary gun + heals'][i],200+i*400,363);if(kind==='ultimate'){z.fillStyle='#f7cd67';z.fillText('Only 3 per island',200+i*400,394)}}
 fs.writeFileSync(path.join(__dirname,'../crate-tier-preview.png'),preview.toBuffer('image/png'));
 run("const hidingBush=islandState.bushes.find(b=>b.id.startsWith('hide-bush-')&&islandState.objects.some(o=>o.kind==='tree'&&Math.hypot(o.x-b.x,o.y-b.y)<600));Object.assign(player,{x:hidingBush.x,y:hidingBush.y,phase:'ground',angle:-Math.PI/2,revealedUntil:0});dropPhase='ground';cameraX=player.x;cameraY=player.y;cameraZoom=ISLAND_GROUND_ZOOM;running=true;draw()");
 assert.equal(run('islandNearestHint()'),'HIDDEN IN BUSH');assert(run('Island.bushAt(islandState,player)'));assert(!run('Island.blocked(islandState,player.x,player.y,26)'));fs.writeFileSync(path.join(__dirname,'../hiding-bush-gameplay.png'),game.toBuffer('image/png'));
 console.log(JSON.stringify({status:'passed',crateStyles:['wooden planks','gold crown','black/gold ultimate star'],bush:'Actual client/render shows player concealed in accessible foliage with hidden status'}));
})().catch(e=>{console.error(e);process.exitCode=1});
