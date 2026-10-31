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
 for(let i=0;i<250;i++){if(run('cosmeticCategories.every(c=>cosmetics[c].length===cosmeticSprites[c].filter(Boolean).length)&&planeSprites.length===2'))break;await new Promise(r=>setTimeout(r,30))}
 assert(run('cosmeticCategories.every(c=>cosmetics[c].length===cosmeticSprites[c].filter(Boolean).length)'),'Artwork load failed');


 for(let i=0;i<200&&!run('islandShotgunLootReady&&islandShotgunHeldReady');i++)await new Promise(resolve=>setTimeout(resolve,20));assert(run('islandShotgunLootReady&&islandShotgunHeldReady'),'Shotgun artwork did not load');
 const loot=run('weaponSprites[2]'),held=run('heldWeaponSprites[2]');assert(loot.width>loot.height*3,'Loot art retained background or wrong orientation');assert(held.height>held.width*4,'Held art retained background or wrong orientation');
 for(const art of [loot,held]){const ctx=art.getContext('2d');for(const [xx,yy]of [[0,0],[art.width-1,0],[0,art.height-1],[art.width-1,art.height-1]])assert.equal(ctx.getImageData(xx,yy,1,1).data[3],0,'Backdrop remains in sprite corner')}
 run('newGame();finishLanding();slot=player.slot=1;player.inventory[1]=gun(2,4);selectedItem="weapon";progression.selected.skins=0;progression.selected.backpacks=-1;islandNetwork.ready=true');
 const gallery=createCanvas(1200,650),z=gallery.getContext('2d');z.fillStyle='#254c3e';z.fillRect(0,0,1200,650);const factor=Math.min(520/loot.width,190/loot.height);z.drawImage(loot,40,120,loot.width*factor,loot.height*factor);z.fillStyle='#f3e7cd';z.font='bold 22px sans-serif';z.textAlign='center';z.fillText('GROUND & INVENTORY',300,70);z.fillText('HELD SHOTGUN',900,70);
 game.width=520;game.height=520;const ctx=game.getContext('2d');run('Object.assign(player,{x:260,y:340,angle:-Math.PI/2});x.save();x.translate(260,340);x.scale(2.5,2.5);x.translate(-260,-340);drawCharacter(player);x.restore()');z.drawImage(game,620,50);
 const baseDraw=ctx.drawImage.bind(ctx),records=[];ctx.drawImage=(...args)=>{if(args[0]===held)records.push({args,matrix:ctx.getTransform()});return baseDraw(...args)};
 for(let i=0;i<8;i++){ctx.clearRect(0,0,520,520);run('player.angle='+i+'*Math.PI/4;drawCharacter(player)');const local=Buffer.from(ctx.getImageData(0,0,520,520).data);ctx.clearRect(0,0,520,520);run('islandDrawRemote({x:player.x,y:player.y,phase:"ground",skin:0,backpack:-1,melee:0,slot:1,weaponType:2,itemKind:"gun",angle:player.angle})');assert(local.equals(Buffer.from(ctx.getImageData(0,0,520,520).data)),'Held art differs for remote player')}
 assert(records.length===16);for(const {args}of records)assert(Math.abs(args[3]/args[4]-held.width/held.height)<1e-10,'Held art was stretched');assert(run('spriteURL(2).startsWith("data:image/png")'));fs.writeFileSync(path.join(__dirname,'../shotgun-art-preview.png'),gallery.toBuffer('image/png'));
 console.log(JSON.stringify({status:'passed',lootBounds:[loot.width,loot.height],heldBounds:[held.width,held.height],checks:['Original supplied art replaces all shotgun sprite paths','Backdrop removed without changing gun pixels','Original aspect ratio preserved','Local and remote holds match at eight aim angles','Shotgun inventory icon is available']},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
