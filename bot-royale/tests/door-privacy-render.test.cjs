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
 run("newGame();initializeIsland(901);finishLanding();bots=[];slot=0;selectedItem='weapon';islandState.time=10;");
 const s=run('islandState'),R=context.IslandRender,C=context.IslandCore,b=s.buildings.find(b=>b.style==='hall'),w=s.objects.find(o=>o.kind==='window'&&o.building===b.id&&Math.abs(o.ay-b.y)<1&&o.ay===o.by),wx=(w.ax+w.bx)/2;
 const preview=createCanvas(1800,620),z=preview.getContext('2d');z.fillStyle='#102b31';z.fillRect(0,0,1800,620);
 game.width=600;game.height=550;context.innerWidth=600;context.innerHeight=550;
 const poses=[{x:b.x+b.w/2,y:b.y-125},{x:wx,y:b.y-37},{x:b.x+b.w/2,y:b.y+b.h/2}],names=['OUTSIDE · INTERIOR HIDDEN','AT WINDOW · PEEK INSIDE','INSIDE · INTERIOR VISIBLE'];
 for(let i=0;i<3;i++){
  const p=poses[i];run('resize();Object.assign(player,'+JSON.stringify({...p,phase:'ground',angle:Math.PI/2})+');cameraX='+ (b.x+b.w/2)+';cameraY='+(b.y+b.h/2)+';cameraZoom=.65;draw()');
  assert.equal(b.roofAlpha,i===0?1:0);z.drawImage(game,i*600,50);z.fillStyle='#eff6ee';z.font='bold 19px sans-serif';z.textAlign='center';z.fillText(names[i],i*600+300,32);
 }
 fs.writeFileSync(path.join(__dirname,'../door-privacy-comparison.png'),preview.toBuffer('image/png'));console.log(JSON.stringify({status:'passed',frames:3,checks:['Opaque outside roof','Window-proximity reveal','Interior reveal']}));
})().catch(e=>{console.error(e);process.exitCode=1});
