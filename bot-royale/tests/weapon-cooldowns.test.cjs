'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const gamePath=path.resolve(__dirname,'../public/index.html');
const html=fs.readFileSync(gamePath,'utf8'),source=html.match(/<script>([\s\S]*)<\/script>/)[1];
const elements={},documentHandlers={};
function el(selector){return elements[selector]||={style:{},value:'',innerHTML:'',textContent:'',handlers:{},setAttribute(k,v){this[k]=v},addEventListener(k,v){this.handlers[k]=v},getContext(){return new Proxy({},{get:()=>()=>{}})}}}
const context={document:{querySelector:el,addEventListener(k,v){documentHandlers[k]=v}},localStorage:{getItem(){return null},setItem(){}},Image:class{},devicePixelRatio:1,innerWidth:1440,innerHeight:900,Math,Date,console,requestAnimationFrame(){},setTimeout(){},clearTimeout(){},testWallMs:0};
context.performance={now:()=>context.testWallMs};
vm.createContext(context);vm.runInContext(source,context);const run=s=>vm.runInContext(s,context);
run("let testShots=[];const originalTestShoot=shoot;shoot=function(a,angle,enemy=false,atMs=combatInputTimeMs()){const result=originalTestShoot(a,angle,enemy,atMs);if(result&&!enemy)testShots.push({atMs,ammo:player.inventory[slot].ammo,profile:player.inventory[slot].fireProfile});return result}");
// Combat assertions use a flat copy of one seeded world. Full map generation and
// collision are tested separately; rebuilding 340 buildings per trigger adds no coverage.
run('const combatWorldTemplate=IslandCore.buildWorld(901);IslandCore.buildWorld=function(){return {...combatWorldTemplate,time:0,zone:JSON.parse(JSON.stringify(combatWorldTemplate.zone)),objects:[],buildings:[],doors:[],bushes:[],containers:[],loot:[],water:[],index:new IslandCore.SpatialIndex(),random:IslandCore.rng(901)}}');
function prepare(profile='M4 Assault Rifle',type=1){
 context.testWallMs=0;
 run('newGame();finishLanding();player.x=1500;player.y=1500;cameraX=1500;cameraY=1500;cameraZoom=1;mouse.x=2200;mouse.y=450;player.hp=100000;bots=[{x:100,y:100,hp:100000,r:26,skin:0,cd:100000,turn:100000,angle:0}];chests=[];loot=[];bullets=[];player.inventory=[null,gun('+type+',0,'+JSON.stringify(profile)+'),null,null,null,null];selectSlot(1);testShots=[];if(typeof islandState!=="undefined"&&islandState){islandState.objects=[];islandState.index=new IslandCore.SpatialIndex();islandState.water=[];islandState.buildings=[];islandState.bushes=[];islandState.containers=[];islandState.loot=[];chests=[];loot=[];}');
}
function tick(toMs){const delta=(toMs-run('combatTimeMs'))/1000;assert(delta>=-1e-9);context.testWallMs=toMs;run('update('+Math.max(0,delta)+')')}
function press(){context.onmousedown({button:0,target:elements.canvas,preventDefault(){}})}
function release(){context.onmouseup({button:0,target:elements.canvas,preventDefault(){}})}
function shots(){return JSON.parse(run('JSON.stringify(testShots)'))}
function approx(a,b,msg){assert(Math.abs(a-b)<1e-6,(msg||'Time mismatch')+': '+a+' vs '+b)}
const expectedProfiles={'Pump Shotgun':1000,'Assault Shotgun':333,'Bolt-Action Sniper':1000,'Semi-Auto Sniper':500,'Desert Eagle':500,'M4 Assault Rifle':100,'SCAR Assault Rifle':100,'AK-Style Rifle':167,MP5:67,P90:45,Vector:42};
for(const [name,ms] of Object.entries(expectedProfiles))assert.equal(run('WEAPON_FIRE_COOLDOWNS_MS['+JSON.stringify(name)+']'),ms);
assert.equal(run('WEAPON_RELOAD_MS'),1150);
assert.deepEqual(JSON.parse(run('JSON.stringify(PLAYER_WEAPON_FIRE_PROFILE)')),['Pistol','M4 Assault Rifle','Pump Shotgun','Bolt-Action Sniper']);
assert.equal(run('WEAPON_FIRE_COOLDOWNS_MS.Pistol'),280);
const fpsRows=[];
function expectedTimeline(cooldown,clip,end){
 const out=[];let at=0,ammo=clip,reserve=clip*4;
 while(at<=end+1e-7){out.push(at);ammo--;let next=at+cooldown;
  if(ammo===0){if(reserve<=0)break;next=Math.max(next,at+1150);const add=Math.min(clip,reserve);ammo+=add;reserve-=add}at=next
 }return out;
}
for(const [name,ms] of Object.entries(expectedProfiles)){
 const type=/Shotgun/.test(name)?2:/Sniper/.test(name)?3:name==='Desert Eagle'?0:1;
 const expected=expectedTimeline(ms,run('types['+type+'].clip'),6000),counts=[];
 for(const fps of [30,60,120,144]){
  prepare(name,type);
  // These two profiles are semi-auto. Use hold only in this cadence fixture;
  // separate trigger tests below verify that their normal press mode does not repeat.
  run("player.inventory[1].triggerMode='hold'");press();
  assert.equal(shots().length,1,'First shot must happen inside the input event: '+name);
  const frames=6*fps;
  for(let frame=1;frame<=frames;frame++)tick(frame*1000/fps);
  const actual=shots().map(s=>s.atMs);assert.equal(actual.length,expected.length,name+' at '+fps+' FPS');
  actual.forEach((at,i)=>{approx(at,expected[i],name+' at '+fps+' FPS shot '+i);if(i)assert(at-actual[i-1]>=ms-1e-6,'Fired too soon')});
  assert.equal(run('player.inventory[1].ammo+player.inventory[1].reserve'),run('types['+type+'].clip*5')-actual.length,'Ammo is not synchronized');
  counts.push(actual.length);
 }
 fpsRows.push({weapon:name,cooldownMs:ms,shotsIn6Seconds:counts[0],fps30:counts[0],fps60:counts[1],fps120:counts[2],fps144:counts[3]});
}
// Exact early/late reload-completion examples. These use synthetic completion times;
// production reload duration remains 1150 ms.
for(const [finishAt,expectedShotAt] of [[800,1000],[1500,1500]]){
 prepare('Pump Shotgun',2);press();tick(200);
 const deadline=run('player.inventory[1].nextFireAtMs');assert.equal(deadline,1000);
 run('reload();player.inventory[1].reloadEndsAtMs='+finishAt);
 assert.equal(run('player.inventory[1].nextFireAtMs'),deadline);
 tick(expectedShotAt-.001);assert.equal(shots().length,1,'Overlapping timers allowed an early shot');
 tick(expectedShotAt);assert.equal(shots().length,2);approx(shots()[1].atMs,expectedShotAt);
}
// Real unchanged reload duration: begin 200 -> complete 1350, later than cooldown 1000.
prepare('Pump Shotgun',2);press();tick(200);run('reload()');assert.equal(run('player.inventory[1].reloadEndsAtMs'),1350);
tick(600);const reloadEnds=run('player.inventory[1].reloadEndsAtMs');run('reload();reload()');assert.equal(run('player.inventory[1].reloadEndsAtMs'),reloadEnds);
assert.equal(run('player.inventory[1].nextFireAtMs'),1000);tick(1349.999);assert.equal(shots().length,1);tick(1350);approx(shots()[1].atMs,1350);
// A new Fire press cancels reload; repeated Reload presses do not.
prepare('Pump Shotgun',2);press();release();tick(200);run('reload()');const cancelAmmo=run('player.inventory[1].ammo'),cancelReserve=run('player.inventory[1].reserve');tick(400);press();assert.equal(run('player.inventory[1].reloading'),false);assert.equal(run('islandReloadProgress()'),null);assert.equal(run('player.inventory[1].ammo'),cancelAmmo);assert.equal(run('player.inventory[1].reserve'),cancelReserve);assert.equal(run('player.inventory[1].nextFireAtMs'),1000);assert.equal(shots().length,1);tick(1000);assert.equal(shots().length,2);approx(shots()[1].atMs,1000);
// No new press is needed for held automatic fire after a reload.
prepare();press();tick(200);run('reload()');tick(1349.999);assert.equal(shots().length,3);tick(1350);approx(shots().at(-1).atMs,1350);
// Independent weapon instances, including copies of the same weapon.
prepare('Pump Shotgun',2);run('player.inventory[2]=gun(2)');press();tick(100);run('selectSlot(2)');assert.equal(shots().length,2);
assert.equal(run('player.inventory[1].nextFireAtMs'),1000);assert.equal(run('player.inventory[2].nextFireAtMs'),1100);
for(let ms=200;ms<=900;ms+=100){tick(ms);run('selectSlot(1);selectSlot(2);selectSlot(1)')}
assert.equal(shots().length,2,'Switch spam bypassed a cooldown');tick(1000);assert.equal(shots().length,3);approx(shots()[2].atMs,1000);
tick(1050);run('selectSlot(2)');assert.equal(shots().length,3);tick(1100);assert.equal(shots().length,4);approx(shots()[3].atMs,1100);
// Reload continues while holstered and does not block a different weapon.
prepare('Pump Shotgun',2);press();release();tick(200);run('reload();player.inventory[2]=gun(1);selectSlot(2)');press();
assert.equal(shots().length,2);release();tick(1350);assert.equal(run('player.inventory[1].reloading'),false);assert.equal(run('player.inventory[1].ammo'),5);
assert.equal(run('player.inventory[1].nextFireAtMs'),1000);run('selectSlot(1)');press();approx(shots().at(-1).atMs,1350);
// Rapid mouse clicks and direct firing calls cannot beat cooldown.
prepare();press();release();
for(let ms=1;ms<100;ms++){tick(ms);press();release();run('shoot(player,0);shoot(player,0)')}
assert.equal(shots().length,1);tick(100);press();assert.equal(shots().length,2);
// Input between rendered frames starts a shot immediately with a real sub-frame timestamp.
prepare();context.testWallMs=5;press();approx(shots()[0].atMs,5);release();
tick(33);tick(66);tick(99);context.testWallMs=104;press();assert.equal(shots().length,1);release();context.testWallMs=105;press();assert.equal(shots().length,2);approx(shots()[1].atMs,105);
// A semi-auto press interrupts reload and fires once; holding never repeats.
for(const [name,type]of [['Semi-Auto Sniper',3],['Desert Eagle',0]]){
 prepare(name,type);assert.equal(run('player.inventory[1].triggerMode'),'press');press();tick(1000);assert.equal(shots().length,1,'Semi-auto repeated while held');release();
 run('reload()');tick(1100);press();assert.equal(run('player.inventory[1].reloading'),false);assert.equal(shots().length,2);approx(shots()[1].atMs,1100);tick(2150);assert.equal(shots().length,2,'Semi-auto repeated after reload cancellation');release();press();assert.equal(shots().length,3);approx(shots()[2].atMs,2150);
}
// Empty gun cannot fire, and reloading on last round never clears its cooldown.
prepare('Pump Shotgun',2);run('player.inventory[1].ammo=1;player.inventory[1].reserve=0');press();tick(2000);assert.equal(shots().length,1);assert.equal(run('player.inventory[1].ammo'),0);assert.equal(run('reload()'),false);
prepare('Pump Shotgun',2);run('player.inventory[1].ammo=1');press();assert.equal(run('player.inventory[1].nextFireAtMs'),1000);assert.equal(run('player.inventory[1].reloadEndsAtMs'),1150);tick(1149.999);assert.equal(shots().length,1);tick(1150);approx(shots()[1].atMs,1150);
// Pause freezes the active simulation and blocks direct firing/reload requests.
prepare();press();release();tick(50);run('openMatchMenu()');const pauseClock=run('combatTimeMs');context.testWallMs=2000;run('last=2000;loop(2016)');
approx(run('combatTimeMs'),pauseClock);assert.equal(run('shoot(player,0)'),false);assert.equal(run('reload()'),false);run('stayInMatch()');context.testWallMs=2016;press();assert.equal(shots().length,1);tick(100);assert.equal(shots().length,2);
// Projectiles use elapsed time since their own scheduled shot, rather than a whole extra frame.
prepare();press();release();tick(10);const projectile=JSON.parse(run('JSON.stringify({x:bullets[0].x,y:bullets[0].y,vx:bullets[0].vx,vy:bullets[0].vy})'));
approx(Math.hypot(projectile.x-1500,projectile.y-1500),25+Math.hypot(projectile.vx,projectile.vy)*.01,'Projectile travel');
// Exercise the actual RAF loop with variable callback work after each frame timestamp.
for(const fps of [30,60,120,144]){
 prepare();run('last=0');press();
 for(let frame=1;frame<=fps*3;frame++){const rafTime=frame*1000/fps;context.testWallMs=rafTime+(frame%4);run('loop('+rafTime+')')}
 const actual=shots().map(s=>s.atMs),expected=expectedTimeline(100,30,3000);
 assert.equal(actual.length,expected.length);actual.forEach((at,i)=>approx(at,expected[i],'RAF cadence at '+fps));
}
// Semi-auto does not treat switching while held as another trigger press.
prepare('Desert Eagle',0);press();tick(600);run("player.inventory[2]=gun(0,0,'Desert Eagle');selectSlot(2)");tick(700);assert.equal(shots().length,1);release();press();assert.equal(shots().length,2);

// Existing damage, magazine/reserve counts, projectile speeds, UI, artwork and controls are invariant.
assert.deepEqual(JSON.parse(run('JSON.stringify(types.map(t=>[t.clip,t.damage,t.speed]))')),[[12,22,700],[30,18,850],[5,12,630],[5,68,1100]]);
const snapshot={status:'passed',frameRates:[30,60,120,144],timingToleranceMs:1e-6,cadence:fpsRows,reloadExamples:[{reloadCompletionMs:800,nextShotMs:1000},{reloadCompletionMs:1500,nextShotMs:1500},{reloadStartMs:200,productionReloadDurationMs:1150,nextShotMs:1350}],coverage:['immediate input','per-instance deadlines','held fire','semi-auto fresh presses','rapid clicks','direct-call guards','switch spam','holstered reload','repeat reload requests','empty ammunition','last-round auto reload','pause/resume','sub-frame timestamps','projectile timing','preserved weapon stats']};
if(process.argv.includes('--report'))fs.writeFileSync(path.join(__dirname,'../weapon-cooldown-test-results.json'),JSON.stringify(snapshot,null,2)+'\n');
console.table(fpsRows);console.log('PASS: all cooldown, reload-overlap, switching, trigger, input-response, ammo, projectile and pause tests.');

for(let rarity=0;rarity<5;rarity++){
 prepare('Pump Shotgun',2);run('player.x=5000;player.y=5000;player.inventory[1].rarity='+rarity+';bots=[{id:"pump-target",x:5100,y:5000,hp:500,shield:0,r:26,phase:"ground"}];player.angle=0;shoot(player,0,false,0)');
 approx(run('bullets.reduce((sum,q)=>sum+q.damage,0)'),90+rarity*5,'Full pump damage');run('combatTimeMs=200;islandStepBullets(.2,0)');approx(run('500-bots[0].hp'),90+rarity*5,'Actual landed full pump');assert(run('bots[0].x>5150'),'Full pump did not knock back');
 prepare('Pump Shotgun',2);run('player.x=5000;player.y=5000;player.inventory[1].rarity='+rarity+';bots=[{id:"partial-target",x:5100,y:5000,hp:500,shield:0,r:26,phase:"ground"}];shoot(player,0,false,0);bullets.pop();combatTimeMs=200;islandStepBullets(.2,0)');approx(run('500-bots[0].hp'),(90+rarity*5)*4/5,'Partial pump damage');approx(run('bots[0].x'),5100,'Partial hit incorrectly knocked back');
}
console.log('PASS full Pump damage 90/95/100/105/110, partial pellet damage, and head-on knockback in actual client.');

prepare('Pump Shotgun',2);run('player.x=5000;player.y=5000;bots=[{id:"shield-target",x:5100,y:5000,hp:500,shield:10,r:26,phase:"ground"}];shoot(player,0,false,0);combatTimeMs=200;islandStepBullets(.2,0)');assert.equal(run('bots[0].shield'),0);approx(run('bots[0].hp'),420);assert.equal(run('islandDamageNumbers.length'),1);approx(run('islandDamageNumbers[0].hp'),80);approx(run('islandDamageNumbers[0].shield'),10);run('newGame()');assert(run('bots.every(b=>b.shield===10)'));console.log('PASS offline bots spawn with 10 shield, shield absorbs damage first, and pump pellets merge into accurate health/shield numbers.');
