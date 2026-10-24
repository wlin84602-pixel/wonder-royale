/* ---------- profile: XP, coins, battle pass, skins, stats and switches (saved in this browser) ---------- */
const PKEY='wonderRoyale.v3',XPT=150,MAXTIER=50,PREM_PRICE=1200;
const DEF_SET={sound:1,shake:1,minimap:1,names:1,autoPick:0,aim:0,fps:0,map:1,storm:1,loot:1,minP:2,cd:1,bots:1,crate:1,gold:1,rarity:1,startGun:0,healSpd:1};
const SET_RANGE={sound:[0,1],shake:[0,1],minimap:[0,1],names:[0,1],autoPick:[0,1],aim:[0,1],fps:[0,1],map:[0,2],storm:[0,2],loot:[0,2],minP:[2,6],cd:[0,2],bots:[0,2],crate:[0,2],gold:[0,1],rarity:[0,2],startGun:[0,1],healSpd:[0,2]};
const BIND_DEFS=[
 ['Movement',[['up','Move up',['K:KeyW','K:ArrowUp']],['down','Move down',['K:KeyS','K:ArrowDown']],['left','Move left',['K:KeyA','K:ArrowLeft']],['right','Move right',['K:KeyD','K:ArrowRight']]]],
 ['Combat',[['fire','Shoot (also punches with empty hands)',['M:0']],['melee','Extra melee button (left click already punches)',[]],['use','Open door or crate / pick up / swap / jump',['K:KeyE']],['reload','Reload your gun (1 second)',['K:KeyR']],['alt','Toggle slot 2 / 3 (unbound by default)',[]],['next','Next slot',['W:down']],['prev','Previous slot',['W:up']]]],
 ['Inventory slots',[['s1','Slot 1 (melee only)',['M:2','K:Digit1']],['s2','Slot 2',['M:1','K:Digit2']],['s3','Slot 3',['M:4','K:Digit3']],['s4','Slot 4',['K:Space','K:Digit4']],['s5','Slot 5',['K:KeyF','K:Digit5']],['s6','Slot 6',['K:CapsLock','K:Digit6']]]],
 ['Emotes',[1,2,3,4,5,6].map((n,i)=>['e'+n,'Emote '+n,['K:Key'+'ZXCVBN'[i]]])],
 ['Game',[['pause','Menu / leave match',['K:Escape','K:KeyP']],['admin','Admin panel (owner mode, solo)',['K:Backquote']]]]];
const DEF_BINDS={};BIND_DEFS.forEach(g=>g[1].forEach(a=>{DEF_BINDS[a[0]]=a[2].slice()}));
const cloneBinds=()=>{const o={};for(const k in DEF_BINDS)o[k]=DEF_BINDS[k].slice();return o};
const BV=7;
const BIND_OK=/^(K:[A-Za-z0-9]{1,20}|M:[0-7]|W:(up|down))$/;
const defStats=()=>({matches:0,wins:0,kills:0,top3:0,shots:0,hits:0,dmg:0,time:0,bestKills:0,bestPlace:0});
const newProfile=()=>({g:null,gcid:'',payUrl:'',name:'',skin:0,melee:0,pack:0,chute:0,emotes:[0,1,2,3,-1,-1],xp:0,coins:200,own:[],ownE:[],ownM:[],ownP:[],ownC:[],claimF:[],claimP:[],prem:0,sub:0,dev:0,set:Object.assign({},DEF_SET),binds:cloneBinds(),bindsV:BV,setV:1,st:defStats(),hist:[]});
let P=newProfile();
const ITEMS={skin:SKINS,emote:EMOTES,melee:MELEES,pack:PACKS,chute:PARAS},OWNK={skin:'own',emote:'ownE',melee:'ownM',pack:'ownP',chute:'ownC'};
const CATN={skin:'Skins',emote:'Emotes',melee:'Melee',pack:'Backpacks',chute:'Parachutes'},CATS1={skin:'skin',emote:'emote',melee:'melee weapon',pack:'backpack',chute:'parachute'};
const curOf=cat=>cat==='skin'?P.skin:cat==='melee'?P.melee:cat==='pack'?P.pack:P.chute;
const setCur=(cat,id)=>{if(cat==='skin')P.skin=id;else if(cat==='melee')P.melee=id;else if(cat==='pack')P.pack=id;else if(cat==='chute')P.chute=id};
const numArr=(a,max)=>Array.isArray(a)?a.filter(x=>Number.isInteger(x)&&x>=0&&x<=max):[];
function loadProfile(){
  try{
    const raw=localStorage.getItem(PKEY);
    if(raw){
      const o=JSON.parse(raw);
      if(o&&typeof o==='object'){
        P.name=typeof o.name==='string'?o.name.slice(0,12):'';
        if(o.g&&typeof o.g==='object')P.g={name:String(o.g.name||'').slice(0,60),email:String(o.g.email||'').slice(0,100),pic:/^https:\/\//.test(o.g.pic||'')?String(o.g.pic).slice(0,400):'',sub:String(o.g.sub||'').slice(0,40)};
        if(typeof o.gcid==='string')P.gcid=o.gcid.trim().slice(0,200);
        if(typeof o.payUrl==='string'&&payHostOK(o.payUrl))P.payUrl=o.payUrl.trim().slice(0,500);
        P.xp=Math.max(0,num(o.xp,0));P.coins=Math.max(0,num(o.coins,200));
        P.own=numArr(o.own,99);P.ownE=numArr(o.ownE,EMOTES.length-1);P.ownM=numArr(o.ownM,MELEES.length-1);P.ownP=numArr(o.ownP,PACKS.length-1);P.ownC=numArr(o.ownC,PARAS.length-1);P.chute=clamp(num(o.chute,0)|0,0,PARAS.length-1);P.claimF=numArr(o.claimF,MAXTIER);P.claimP=numArr(o.claimP,MAXTIER);
        P.prem=o.prem?1:0;P.sub=o.sub?1:0;P.dev=o.dev?1:0;P.skin=clamp(num(o.skin,0)|0,0,99);P.melee=clamp(num(o.melee,0)|0,0,MELEES.length-1);P.pack=clamp(num(o.pack,0)|0,0,PACKS.length-1);
        if(Array.isArray(o.emotes)&&o.emotes.length===6)P.emotes=o.emotes.map(x=>Number.isInteger(x)&&x>=-1&&x<EMOTES.length?x:-1);
        if(o.set)for(const k in DEF_SET){const r=SET_RANGE[k];P.set[k]=clamp(Math.round(num(o.set[k],DEF_SET[k])),r[0],r[1])}
        if(o.bindsV===BV&&o.binds&&typeof o.binds==='object')for(const k in DEF_BINDS){const v=o.binds[k];if(Array.isArray(v))P.binds[k]=v.filter(x=>typeof x==='string'&&BIND_OK.test(x)).slice(0,2)}
        if(o.setV!==1)P.set.autoPick=0;
        if(o.st)for(const k in P.st)P.st[k]=Math.max(0,num(o.st[k],0));
        if(Array.isArray(o.hist))P.hist=o.hist.slice(0,10).filter(h=>h&&typeof h==='object').map(h=>({p:num(h.p,0),t:num(h.t,0),k:num(h.k,0),m:h.m==='Live'?'Live':'Solo',w:h.w?1:0}));
      }
    }
  }catch(e){}
  fixEquipped();
  S=P.set;
}
/* ---------- real payments: the checkout itself is a hosted Stripe or PayPal page, so the game never touches card details ---------- */
function payHostOK(u){
  try{const x=new URL(String(u).trim());const hn=x.hostname.toLowerCase();
    return x.protocol==='https:'&&(hn==='buy.stripe.com'||hn==='donate.stripe.com'||hn==='checkout.stripe.com'||hn==='paypal.com'||hn==='www.paypal.com'||hn==='paypal.me'||hn==='www.paypal.me')}
  catch(e){return false}
}
function paySetupPanel(){
  const a=h('div','panel');a.appendChild(h('div','ptitle','Payments (Pass+)'));
  a.appendChild(h('p','lede','Real card payments go through a Stripe Payment Link (or PayPal link) that you create. Players pay on Stripe\'s secure page, so card details never touch this game.'));
  const ol=h('ol','');ol.style.cssText='margin:0 0 10px 18px;padding:0;font-size:13px;line-height:1.5;opacity:.9';
  ['In the Stripe Dashboard open Payment Links and create one (for example a recurring Wonder Pass+ price).','Copy the link, which starts with https://buy.stripe.com/','Paste it below and save.'].forEach(x=>ol.appendChild(h('li','',x)));
  a.appendChild(ol);
  const lab=h('label','nick','Payment link');lab.setAttribute('for','payurl');
  const inp=h('input');inp.id='payurl';inp.autocomplete='off';inp.spellcheck=false;inp.placeholder='https://buy.stripe.com/...';inp.value=P.payUrl||'';inp.style.width='100%';
  lab.appendChild(inp);a.appendChild(lab);
  const st=h('div','gerr','');const row=h('div','brow2');
  row.appendChild(btn('Save payment link','go alt sm',()=>{
    const v=inp.value.trim();
    if(v&&!payHostOK(v)){st.textContent='Use an https link from Stripe (buy.stripe.com, donate.stripe.com, checkout.stripe.com) or PayPal.';return}
    P.payUrl=v;saveProfile();st.textContent=v?'Saved. The Pass+ tab now shows a real checkout button.':'Payment link removed.';
  }));
  a.appendChild(row);a.appendChild(st);
  a.appendChild(h('p','lede','This page cannot check that a payment went through (that needs a server). After checkout, Pass+ is switched on by the player\'s own confirmation, so treat it as an honor system unless you add a server.'));
  return a;
}
/* ---------- Google sign-in (Google Identity Services). Needs the owner's own OAuth Client ID. ---------- */
let gsiP=null;
function loadGSI(){
  if(gsiP)return gsiP;
  gsiP=new Promise((res,rej)=>{
    if(window.google&&window.google.accounts&&window.google.accounts.id){res();return}
    const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.defer=true;
    const to=setTimeout(()=>{gsiP=null;rej(new Error('timeout'))},9000);
    s.onload=()=>{clearTimeout(to);res()};
    s.onerror=()=>{clearTimeout(to);gsiP=null;rej(new Error('blocked'))};
    document.head.appendChild(s);
  });
  return gsiP;
}
function decodeJwt(t){
  const p=String(t).split('.')[1];if(!p)throw new Error('bad token');
  const b=p.replace(/-/g,'+').replace(/_/g,'/'),pad=b+'='.repeat((4-b.length%4)%4);
  return JSON.parse(decodeURIComponent(escape(atob(pad))));
}
/* called by Google with the signed ID token; we only use it to show who is playing */
function onGoogleCred(resp){
  try{
    const c=decodeJwt(resp&&resp.credential);
    if(!c||c.aud!==P.gcid||!/^(https:\/\/)?accounts\.google\.com$/.test(c.iss||'')||(c.exp&&c.exp*1000<Date.now()-60000))throw new Error('token not for this app');
    P.g={name:String(c.name||c.given_name||'Google player').slice(0,60),email:String(c.email||'').slice(0,100),pic:/^https:\/\//.test(c.picture||'')?String(c.picture).slice(0,400):'',sub:String(c.sub||'').slice(0,40)};
    if(!P.name)P.name=(c.given_name||c.name||'').slice(0,12);
    saveProfile();gMsg='';showHub();
  }catch(e){gMsg='Google sign-in failed: '+(e&&e.message||'unknown error');showHub()}
}
let gMsg='';
function googleSignOut(){
  P.g=null;saveProfile();
  try{if(window.google&&window.google.accounts)window.google.accounts.id.disableAutoSelect()}catch(e){}
  showHub();
}
const gOrigin=()=>{try{return location.origin&&location.origin!=='null'?location.origin:'(this page\'s address)'}catch(e){return '(this page\'s address)'}};
function googleBlock(){
  const box=h('div','gacct');box.style.flexWrap='wrap';
  if(P.g){
    if(P.g.pic){const im=h('img');im.src=P.g.pic;im.alt='';im.referrerPolicy='no-referrer';box.appendChild(im)}
    const t=h('div','');t.style.flex='1';t.appendChild(h('div','sname2','Signed in with Google'));
    t.appendChild(h('div','best',P.g.name+(P.g.email?' · '+P.g.email:'')));box.appendChild(t);
    box.appendChild(btn('Use as my name','go alt sm',()=>{P.name=(P.g.name.split(' ')[0]||P.g.name).slice(0,12);saveProfile();showHub()}));
    box.appendChild(btn('Sign out','go alt sm',googleSignOut));
    return box;
  }
  const t=h('div','');t.style.flex='1';t.style.minWidth='180px';t.appendChild(h('div','sname2','Google account'));
  box.appendChild(t);
  if(!P.gcid){
    t.appendChild(h('div','best','Add your Google Client ID in Settings to turn on Sign in with Google.'));
    box.appendChild(btn('Set up Google sign-in','go alt sm',()=>{tab='set';showHub()}));
    return box;
  }
  const slot=h('div','');slot.style.minHeight='44px';box.appendChild(slot);
  const msg=h('div','gerr',gMsg||'Loading Google sign-in...');msg.style.width='100%';box.appendChild(msg);
  loadGSI().then(()=>{
    const gid=window.google.accounts.id;
    gid.initialize({client_id:P.gcid,callback:onGoogleCred,auto_select:false,cancel_on_tap_outside:true});
    gid.renderButton(slot,{theme:'filled_black',size:'large',shape:'pill',text:'signin_with',width:230});
    msg.textContent=gMsg||'';
  }).catch(()=>{msg.textContent='Google\'s sign-in script could not load here (blocked, offline or the page does not allow it).'});
  return box;
}
function googleSetupPanel(){
  const a=h('div','panel');a.appendChild(h('div','ptitle','Google sign-in'));
  a.appendChild(h('p','lede','Sign in with Google uses Google\'s own login. It needs a free OAuth Client ID that you create once:'));
  const ol=h('ol','');ol.style.cssText='margin:0 0 10px 18px;padding:0;font-size:13px;line-height:1.5;opacity:.9';
  ['Open console.cloud.google.com, then APIs & Services, then Credentials.','Create credentials, then OAuth client ID, then type Web application.','Under Authorized JavaScript origins add the address below.','Create it, copy the Client ID and paste it here.'].forEach(x=>ol.appendChild(h('li','',x)));
  a.appendChild(ol);
  const o=h('div','best','Origin to authorize: '+gOrigin());o.style.wordBreak='break-all';a.appendChild(o);
  const lab=h('label','nick','Client ID');lab.setAttribute('for','gcid');
  const inp=h('input');inp.id='gcid';inp.autocomplete='off';inp.spellcheck=false;inp.placeholder='1234567890-abc...apps.googleusercontent.com';inp.value=P.gcid||'';inp.style.width='100%';
  lab.appendChild(inp);a.appendChild(lab);
  const st=h('div','gerr','');
  const row=h('div','brow2');
  row.appendChild(btn('Save Client ID','go alt sm',()=>{
    const v=inp.value.trim();
    if(v&&!/^[\w.-]+\.apps\.googleusercontent\.com$/.test(v)){st.textContent='That does not look like a Google Client ID (it ends in .apps.googleusercontent.com).';return}
    P.gcid=v;if(!v)P.g=null;saveProfile();gMsg='';st.textContent=v?'Saved. Go to Home to see the Sign in with Google button.':'Client ID removed.';
  }));
  a.appendChild(row);a.appendChild(st);
  a.appendChild(h('p','lede','Google only tells the game your name and picture. Progress, coins and skins are still saved in this browser.'));
  return a;
}
function saveProfile(){try{localStorage.setItem(PKEY,JSON.stringify(P))}catch(e){}}
const tierOf=()=>Math.min(MAXTIER,Math.floor(P.xp/XPT));
const isSub=()=>!!(P.sub||P.dev),isPrem=()=>!!(P.prem||P.dev),effTier=()=>P.dev?MAXTIER:tierOf();
function owned2(cat,i){
  const s=ITEMS[cat][i];if(!s)return false;
  return !!P.dev||s.src==='default'||P[OWNK[cat]].indexOf(i)>=0||(s.src==='sub'&&!!P.sub);
}
const owned=i=>owned2('skin',i);
function fixEquipped(){
  if(!owned2('skin',P.skin))P.skin=0;if(!owned2('melee',P.melee))P.melee=0;if(!owned2('pack',P.pack))P.pack=0;if(!owned2('chute',P.chute))P.chute=0;
  P.emotes=P.emotes.map(x=>x>=0&&owned2('emote',x)?x:-1);
  if(P.emotes.every(x=>x<0))P.emotes[0]=0;
}
const passMap={f:{},p:{}};
Object.keys(ITEMS).forEach(cat=>ITEMS[cat].forEach(s=>{if(s.src==='free')passMap.f[s.tier]={cat,id:s.id};else if(s.src==='prem')passMap.p[s.tier]={cat,id:s.id}}));
const FREE_COINS=60,PREM_COINS=100;
function rewardOf(track,t){const it=passMap[track][t];return it?{item:it}:{coins:track==='p'?PREM_COINS:FREE_COINS}}
function claimTier(track,t){
  const list=track==='p'?P.claimP:P.claimF;
  if(t>effTier()||list.indexOf(t)>=0||(track==='p'&&!isPrem()))return false;
  const r=rewardOf(track,t);
  if(r.item){const a=P[OWNK[r.item.cat]];if(a.indexOf(r.item.id)<0)a.push(r.item.id)}else P.coins+=r.coins;
  list.push(t);saveProfile();return true;
}
function recordMatch(r){
  const tier0=tierOf();
  const base=40+r.kills*30+Math.max(0,r.total-r.place)*10+(r.win?120:0);
  const xp=Math.round(base*(isSub()?1.5:1)),coins=Math.round(xp/3);
  P.xp+=xp;P.coins+=coins;
  const s=P.st;
  s.matches++;if(r.win)s.wins++;if(r.place<=3)s.top3++;
  s.kills+=r.kills;s.shots+=SESS.shots;s.hits+=SESS.hits;s.dmg+=Math.round(SESS.dmg);s.time+=Math.round(r.time);
  s.bestKills=Math.max(s.bestKills,r.kills);s.bestPlace=s.bestPlace?Math.min(s.bestPlace,r.place):r.place;
  P.hist.unshift({p:r.place,t:r.total,k:r.kills,m:r.mode,w:r.win?1:0});P.hist.length=Math.min(P.hist.length,10);
  saveProfile();
  return{xp,coins,tier0,tier:tierOf()};
}

/* ---------- hub UI ---------- */
function h(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e}
function btn(text,cls,fn){const b=h('button',cls,text);b.type='button';if(fn)b.addEventListener('click',fn);return b}
const view=$('view'),tabsEl=$('tabs'),TABS=[['home','Home'],['pass','Battle pass'],['locker','Locker'],['stats','Battle stats'],['plus','Pass+'],['set','Settings']];
let tab='home',lockFilter='all',lockMsg='',passMsg='',plusMsg='',resetArm=false;
let homeBits=null;
function skinCanvas(sk,px,chute){const c=h('canvas','sk');paintSkin(c,sk,px,chute);return c}
function drawHead(){
  const t=effTier();
  $('coins').textContent=P.dev?'∞':P.coins.toLocaleString('en-US');
  $('tierchip').textContent=t>=MAXTIER?'Tier 50 (max)':'Tier '+t;
  $('plusbadge').hidden=!isSub();$('plusbadge').textContent=P.dev?'Owner':'Pass+';
}
function showHub(){
  tabsEl.textContent='';
  TABS.forEach(([k,l])=>{
    const b=btn(l,'tab'+(k===tab?' on':''),()=>{tab=k;resetArm=false;showHub()});
    b.setAttribute('role','tab');b.setAttribute('aria-selected',k===tab?'true':'false');tabsEl.appendChild(b);
  });
  drawHead();view.textContent='';homeBits=null;
  ({home:tabHome,pass:tabPass,locker:tabLocker,stats:tabStats,plus:tabPlus,set:tabSettings})[tab]();
  view.scrollTop=0;
}
function bar(frac,label){
  const b=h('div','xpbar');const i=h('i');i.style.width=Math.round(clamp(frac,0,1)*100)+'%';b.appendChild(i);
  if(label){const s=h('span','',label);b.appendChild(s)}return b;
}
const setSummary=()=>['Small','Medium','Large'][S.map]+' map · '+['Slow','Normal','Fast'][S.storm]+' storm · '+['Sparse','Normal','Plentiful'][S.loot]+' loot';

function tabHome(){
  const wrap=h('div','home');
  const stage=h('div','stage');
  stage.appendChild(skinCanvas(SKINS[P.skin],150,true));
  stage.appendChild(h('div','sname2',SKINS[P.skin].name));
  stage.appendChild(h('div','srar',RNAME[SKINS[P.skin].rarity]+' skin'));
  const sc=stage.lastChild;sc.style.color=RCOL[SKINS[P.skin].rarity];
  stage.appendChild(h('div','best',MELEES[P.melee].name+' · '+PACKS[P.pack].name+' · '+PARAS[P.chute].name+' chute'));
  stage.appendChild(btn('Open locker','go alt sm',()=>{tab='locker';lockCat='skin';lockSelC.skin=P.skin;showHub()}));
  wrap.appendChild(stage);
  const right=h('div','play');
  right.appendChild(googleBlock());
  const lab=h('label','nick','Your name');lab.setAttribute('for','nick');
  const inp=h('input');inp.id='nick';inp.maxLength=12;inp.autocomplete='off';inp.spellcheck=false;inp.placeholder='Player';inp.value=P.name;
  inp.addEventListener('input',()=>{P.name=inp.value.slice(0,12);saveProfile()});
  lab.appendChild(inp);right.appendChild(lab);
  const live=btn('Play online (2 to 6)','go',()=>{if(!live.disabled){P.name=inp.value.slice(0,12);saveProfile();startOnline()}});
  const note=h('div','best');
  right.appendChild(live);right.appendChild(note);
  right.appendChild(btn('Solo vs bots','go alt',()=>{P.name=inp.value.slice(0,12);saveProfile();startGame()}));
  right.appendChild(h('div','best',setSummary()+' · '+(BOTN[S.bots]+1)+' fighters in solo'));
  homeBits={live,note};refreshHome();
  wrap.appendChild(right);
  view.appendChild(wrap);
  const t=effTier(),into=P.xp-tierOf()*XPT;
  const pc=h('div','panel');
  pc.appendChild(h('div','ptitle',t>=MAXTIER?'Battle pass complete':'Battle pass: tier '+t+' of '+MAXTIER));
  pc.appendChild(bar(t>=MAXTIER?1:into/XPT,t>=MAXTIER?'Max':into+' / '+XPT+' XP'));
  const un=[];for(let i=1;i<=t;i++){if(P.claimF.indexOf(i)<0)un.push(i);else if(isPrem()&&P.claimP.indexOf(i)<0)un.push(i)}
  pc.appendChild(btn(un.length?un.length+' reward'+(un.length>1?'s':'')+' ready to claim':'Open the battle pass','go alt sm',()=>{tab='pass';showHub()}));
  view.appendChild(pc);
  const how=h('div','panel');
  how.appendChild(h('div','ptitle','How live matches work'));
  how.appendChild(h('p','lede','Press Play online, then create a room and share its 5 letter code, or enter a friend\'s code to join. Up to 6 players wait in the room lobby and the host presses Start once at least 2 are in. Everyone drops with empty hands from a plane that flies over the island: press Space or Jump to drop, and the parachute opens automatically near the ground. Break crates (gold ones hold the best loot) and grab weapons and heals into your 6 slots. The server runs the match, so everyone sees the same fight. If your connection drops, the game reconnects and puts you back in your match.'));
  view.appendChild(how);
  const ctl=h('div','panel');ctl.appendChild(h('div','ptitle','Controls'));
  ctl.appendChild(h('p','lede','Move: '+['up','left','down','right'].map(a=>actLabel(a)).join(', ')+'. Aim with the mouse. Shoot: '+actLabel('fire')+'. Open doors and crates, pick up loot or jump from the plane: '+actLabel('use')+'. Melee: '+actLabel('melee')+'. Slots 1 to 6: '+[1,2,3,4,5,6].map(n=>actLabel('s'+n)).join(' ')+' (or '+actLabel('next')+' and '+actLabel('prev')+' to cycle). Emotes: '+[1,2,3,4,5,6].map(n=>actLabel('e'+n)).join(' ')+'. Hold shoot to use a heal. Drag a hotbar slot onto another slot to swap them, or drag it out of the bar to drop it. Change any of these in Settings, Controls. On a phone: left thumb moves, right thumb aims and shoots, and the on-screen buttons handle melee, emotes and jumping.'));
  view.appendChild(ctl);
}
function refreshHome(){
  if(!homeBits)return;
  const o=onlineStatus();
  homeBits.live.disabled=!o.ok;homeBits.note.textContent=o.text;
}
setInterval(()=>{if(state==='hub'&&tab==='home'&&!$('hub').hidden)refreshHome()},800);

/* item previews shared by the pass and the locker */
function itemEl(cat,it,px){
  if(cat==='skin')return skinCanvas(it,px,false);
  if(cat==='emote'){const d=h('div','eglyph',it.g);d.style.fontSize=Math.round(px*.7)+'px';d.style.height=px+'px';d.style.lineHeight=px+'px';return d}
  if(cat==='melee'){const c=h('canvas','sk');paintMelee(c,it.id,px*1.5,Math.round(px*.8));return c}
  if(cat==='chute'){const c=h('canvas','sk');paintChute(c,it.id,px,SKINS[P.skin]);return c}
  const c=h('canvas','sk');paintPack(c,it.id,px,SKINS[P.skin]);return c;
}

/* battle pass */
function tabPass(){
  const t=tierOf(),et=effTier(),into=P.xp-t*XPT;
  const top=h('div','panel');
  top.appendChild(h('div','ptitle','Season pass: tier '+et+' of '+MAXTIER+(P.dev?' (owner)':'')));
  top.appendChild(bar(et>=MAXTIER?1:into/XPT,et>=MAXTIER?'Max':into+' / '+XPT+' XP'));
  top.appendChild(h('p','lede','Earn XP in every match: kills, placement and wins. Rewards include skins, emotes, melee weapons and backpacks. '+(isSub()?'Pass+ gives you 1.5x XP.':'Pass+ gives 1.5x XP.')));
  const row=h('div','row');
  if(!isPrem()){
    row.appendChild(btn('Unlock premium track ('+PREM_PRICE.toLocaleString('en-US')+' coins)','go sm',()=>{
      if(P.coins>=PREM_PRICE){P.coins-=PREM_PRICE;P.prem=1;saveProfile();passMsg='Premium track unlocked.'}
      else passMsg='You need '+(PREM_PRICE-P.coins).toLocaleString('en-US')+' more coins.';
      showHub();
    }));
  }else row.appendChild(h('span','tag',P.dev&&!P.prem?'Premium (owner)':'Premium unlocked'));
  const ready=[];
  for(let i=1;i<=et;i++){if(P.claimF.indexOf(i)<0)ready.push(['f',i]);if(isPrem()&&P.claimP.indexOf(i)<0)ready.push(['p',i])}
  const ca=btn('Claim all ('+ready.length+')','go alt sm',()=>{ready.forEach(r=>claimTier(r[0],r[1]));passMsg='Rewards claimed.';showHub()});
  ca.disabled=!ready.length;row.appendChild(ca);
  top.appendChild(row);
  if(passMsg){top.appendChild(h('div','best',passMsg));passMsg=''}
  view.appendChild(top);
  const scroll=h('div','track');const grid=h('div','tgrid');
  grid.appendChild(h('div','tlab free','Free'));
  grid.appendChild(h('div','tlab premium','Premium'));
  scroll.appendChild(grid);
  let cur=null;
  for(let i=1;i<=MAXTIER;i++){
    const col=h('div','tcol'+(i===et?' cur':''));
    col.appendChild(h('div','tnum',String(i)));
    ['f','p'].forEach(tr=>{
      const r=rewardOf(tr,i),list=tr==='p'?P.claimP:P.claimF;
      const done=list.indexOf(i)>=0,can=!done&&i<=et&&(tr==='f'||isPrem());
      const c=h('button','tcell'+(done?' done':'')+(can?' can':'')+(tr==='p'?' prem':''));c.type='button';
      if(r.item){const it=ITEMS[r.item.cat][r.item.id];c.appendChild(itemEl(r.item.cat,it,40));c.appendChild(h('span','tr',it.name));c.style.borderColor=RCOL[it.rarity]}
      else{c.appendChild(h('b','tcoin','+'+r.coins));c.appendChild(h('span','tr','coins'))}
      c.appendChild(h('span','tst',done?'Claimed':can?'Claim':(tr==='p'&&!isPrem())?'Premium':'Tier '+i));
      c.disabled=!can;
      c.addEventListener('click',()=>{if(claimTier(tr,i))showHub()});
      col.appendChild(c);
    });
    if(i===t||(t===0&&i===1))cur=col;
    scroll.appendChild(col);
  }
  view.appendChild(scroll);
  if(cur&&t>3){scroll.scrollLeft=Math.max(0,cur.offsetLeft-150)}
}

/* locker: skins, emotes, melee, backpacks, parachutes */
const FILTERS=[['all','All'],['owned','Owned'],['free','Free pass'],['prem','Premium'],['sub','Pass+'],['shop','Shop']];
let lockCat='skin';const lockSelC={skin:-1,emote:0,melee:-1,pack:-1,chute:-1};
const priceOf=(cat,it)=>Math.round(RPRICE[it.rarity]*(cat==='emote'?.5:1));
function lockInfo(cat,it){
  if(owned2(cat,it.id))return{ok:true};
  if(it.src==='free')return{why:'Free pass, tier '+it.tier,go:'pass'};
  if(it.src==='prem')return{why:'Premium pass, tier '+it.tier,go:'pass'};
  if(it.src==='sub')return{why:'Pass+ member item',go:'plus'};
  return{why:'Shop',price:priceOf(cat,it)};
}
function equipped(cat,id){return cat==='emote'?P.emotes.indexOf(id)>=0:curOf(cat)===id}
function tabLocker(){
  const cat=lockCat,list=ITEMS[cat];
  const cats=h('div','filters cats');
  Object.keys(ITEMS).forEach(k=>cats.appendChild(btn(CATN[k],'chip2 big'+(k===cat?' on':''),()=>{lockCat=k;lockFilter='all';lockMsg='';showHub()})));
  view.appendChild(cats);
  if(lockSelC[cat]<0)lockSelC[cat]=cat==='emote'?0:curOf(cat);
  const sel=list[lockSelC[cat]],info=lockInfo(cat,sel);
  const det=h('div','panel detail');
  const pv=h('div','dpv');
  if(cat==='skin')pv.appendChild(skinCanvas(sel,128,true));
  else if(cat==='emote'){const d=h('div','eglyph big',sel.g);pv.appendChild(d)}
  else if(cat==='melee'){const c=h('canvas','sk');paintMelee(c,sel.id,190,100);pv.appendChild(c)}
  else if(cat==='chute'){const c=h('canvas','sk');paintChute(c,sel.id,150,SKINS[P.skin]);pv.appendChild(c)}
  else{const c=h('canvas','sk');paintPack(c,sel.id,128,SKINS[P.skin]);pv.appendChild(c)}
  det.appendChild(pv);
  const d2=h('div','dtxt');
  d2.appendChild(h('div','sname2',sel.name));
  let desc=RNAME[sel.rarity]+' '+CATS1[cat];
  if(cat==='skin')desc+=' · '+PATN[sel.pat]+' pattern · '+HATN[sel.hat]+' · '+CHUTEN[sel.chute.pat]+' parachute';
  if(cat==='melee')desc+=' · '+sel.dmg+' damage · '+sel.rng+' reach · '+sel.cd+'s per swing';
  if(cat==='emote')desc+=' · press '+[1,2,3,4,5,6].map(n=>actLabel('e'+n)).join(' ')+' in a match';
  if(cat==='pack')desc+=' · cosmetic';
  if(cat==='chute')desc+=sel.id===0?' · uses the parachute of your skin':' · '+CHUTEN[sel.pat]+' pattern';
  const rr=h('div','srar',desc);rr.style.color=RCOL[sel.rarity];d2.appendChild(rr);
  if(info.ok&&cat==='emote'){
    d2.appendChild(h('div','best','Put it in an emote slot:'));
    const sl=h('div','slotrow');
    for(let k=0;k<6;k++){
      const cur=P.emotes[k],b=btn((k+1)+(cur>=0?' '+EMOTES[cur].g:''),'chip2'+(cur===sel.id?' on':''),()=>{P.emotes[k]=sel.id;P.emotes=P.emotes.map((x,q)=>q!==k&&x===sel.id?-1:x);fixEquipped();saveProfile();showHub()});
      b.setAttribute('aria-label','Slot '+(k+1));sl.appendChild(b);
    }
    d2.appendChild(sl);
  }else if(info.ok){
    const on=equipped(cat,sel.id);
    const a=btn(on?'Equipped':'Equip','go sm',()=>{setCur(cat,sel.id);saveProfile();lockMsg='';showHub()});
    a.disabled=on;d2.appendChild(a);
  }else if(info.price){
    d2.appendChild(btn('Buy for '+info.price+' coins','go sm',()=>{
      if(P.coins>=info.price){P.coins-=info.price;P[OWNK[cat]].push(sel.id);setCur(cat,sel.id);saveProfile();lockMsg='Unlocked.'}
      else lockMsg='You need '+(info.price-P.coins)+' more coins.';
      showHub();
    }));
  }else{
    d2.appendChild(btn(info.why,'go alt sm',()=>{tab=info.go;showHub()}));
  }
  if(lockMsg){d2.appendChild(h('div','best',lockMsg));lockMsg=''}
  det.appendChild(d2);view.appendChild(det);
  if(cat==='emote'){
    const es=h('div','best');es.textContent='Emote slots: '+P.emotes.map((x,k)=>(k+1)+' '+(x>=0?EMOTES[x].g:'-')).join('   ');view.appendChild(es);
  }
  const fl=h('div','filters');
  FILTERS.forEach(([k,l])=>fl.appendChild(btn(l,'chip2'+(k===lockFilter?' on':''),()=>{lockFilter=k;showHub()})));
  view.appendChild(fl);
  let n=0,ownedN=0;list.forEach(s=>{if(owned2(cat,s.id))ownedN++});
  const g=h('div','sgrid'+(cat==='skin'?'':' wide'));
  list.forEach(s=>{
    const o=owned2(cat,s.id);
    if(lockFilter==='owned'?!o:lockFilter==='free'?s.src!=='free':lockFilter==='prem'?s.src!=='prem':lockFilter==='sub'?s.src!=='sub':lockFilter==='shop'?s.src!=='shop'&&s.src!=='default':false)return;
    n++;
    const c=h('button','scard'+(s.id===lockSelC[cat]?' sel':'')+(o?'':' lock')+(equipped(cat,s.id)?' eq':''));c.type='button';
    c.style.borderColor=s.id===lockSelC[cat]?'var(--fg)':RCOL[s.rarity];
    c.setAttribute('aria-label',s.name+', '+RNAME[s.rarity]+(o?'':', locked'));
    c.appendChild(itemEl(cat,s,64));
    c.appendChild(h('span','n',s.name));
    c.addEventListener('click',()=>{lockSelC[cat]=s.id;lockMsg='';showHub()});
    g.appendChild(c);
  });
  view.appendChild(h('div','best',ownedN+' of '+list.length+' '+CATN[cat].toLowerCase()+' unlocked · showing '+n));
  view.appendChild(g);
}

/* battle stats */
function tabStats(){
  const s=P.st,deaths=Math.max(1,s.matches-s.wins);
  const cards=[
    ['Matches',s.matches],['Wins',s.wins],['Win rate',s.matches?Math.round(s.wins/s.matches*100)+'%':'-'],
    ['Kills',s.kills],['K/D',(s.kills/deaths).toFixed(2)],['Top 3',s.top3],
    ['Accuracy',s.shots?Math.round(s.hits/s.shots*100)+'%':'-'],['Damage',s.dmg.toLocaleString('en-US')],['Time played',s.time>=3600?Math.floor(s.time/3600)+'h '+Math.floor(s.time%3600/60)+'m':Math.floor(s.time/60)+'m'],
    ['Best kills',s.bestKills],['Best place',s.bestPlace?'#'+s.bestPlace:'-'],['Items',Object.keys(ITEMS).reduce((a,k)=>a+ITEMS[k].filter(x=>owned2(k,x.id)).length,0)+'/'+Object.keys(ITEMS).reduce((a,k)=>a+ITEMS[k].length,0)]
  ];
  const g=h('div','sgrid2');
  cards.forEach(([k,v])=>{const c=h('div','scell');c.appendChild(h('div','sk2',k));c.appendChild(h('div','sv',String(v)));g.appendChild(c)});
  view.appendChild(g);
  const rec=h('div','panel');rec.appendChild(h('div','ptitle','Recent matches'));
  if(!P.hist.length)rec.appendChild(h('p','lede','No matches yet. Drop in and your results show up here.'));
  else{
    const mx=Math.max(3,...P.hist.map(x=>x.k)),list=h('div','hist');
    P.hist.forEach(x=>{
      const r=h('div','hrow'+(x.w?' win':''));
      r.appendChild(h('span','hp','#'+x.p));
      r.appendChild(h('span','hm',x.m+' · '+x.t+' fighters'));
      const b=h('span','hb');const i=h('i');i.style.width=Math.round(x.k/mx*100)+'%';b.appendChild(i);r.appendChild(b);
      r.appendChild(h('span','hk',x.k+' kill'+(x.k===1?'':'s')));
      list.appendChild(r);
    });rec.appendChild(list);
  }
  view.appendChild(rec);
}

/* subscription (demo only, nothing is charged) */
function tabPlus(){
  const p=h('div','panel plus');
  p.appendChild(h('div','ptitle','Wonder Pass+'));
  p.appendChild(h('p','lede',P.payUrl?'Subscribe with a card on a secure Stripe or PayPal page. This game never sees your card details.':'A demo subscription: switching it on costs nothing and no payment details are asked for. It shows how the perks would work.'));
  const ul=h('ul','perks');
  ['1.5x XP and coins from every match','20 member skins with their own parachutes, plus 4 emotes, 3 melee weapons and 3 backpacks','Gold name tag over your character in matches','Member badge in the lobby and menu'].forEach(t=>ul.appendChild(h('li','',t)));
  p.appendChild(ul);
  const mem=SKINS.filter(s=>s.src==='sub'),pr=h('div','prev');
  mem.slice(0,10).forEach(s=>pr.appendChild(skinCanvas(s,52,false)));p.appendChild(pr);
  if(P.sub||P.dev){
    p.appendChild(h('div','tag',P.sub?'Active (demo)':'Active (owner mode)'));
    if(P.sub)p.appendChild(btn('Cancel subscription','go alt',()=>{P.sub=0;fixEquipped();saveProfile();plusMsg='Subscription cancelled. Member skins are locked again.';showHub()}));
  }else if(P.payUrl&&payHostOK(P.payUrl)){
    const a=h('a','go','Subscribe with card');a.href=P.payUrl;a.target='_blank';a.rel='noopener noreferrer';a.style.cssText='display:block;text-align:center;text-decoration:none';
    p.appendChild(a);
    p.appendChild(h('div','best','After you finish paying, come back and confirm below.'));
    p.appendChild(btn('I have paid - turn on Pass+','go alt',()=>{P.sub=1;saveProfile();plusMsg='Pass+ is on. Thank you! Check the Locker for your member skins.';showHub()}));
  }else p.appendChild(btn('Start demo subscription','go',()=>{P.sub=1;saveProfile();plusMsg='Pass+ is on. Check the Locker for your member skins.';showHub()}));
  if(plusMsg){p.appendChild(h('div','best',plusMsg));plusMsg=''}
  view.appendChild(p);
}

/* custom switches */
function toggle(key,label,desc){
  const r=h('div','srow');const t=h('div','stxt');t.appendChild(h('b','',label));if(desc)t.appendChild(h('span','',desc));r.appendChild(t);
  const b=h('button','sw'+(S[key]?' on':''));b.type='button';b.setAttribute('role','switch');b.setAttribute('aria-checked',S[key]?'true':'false');b.setAttribute('aria-label',label);
  b.appendChild(h('i'));
  b.addEventListener('click',()=>{S[key]=S[key]?0:1;saveProfile();b.classList.toggle('on',!!S[key]);b.setAttribute('aria-checked',S[key]?'true':'false')});
  r.appendChild(b);return r;
}
function segRow(key,label,opts,desc,regen){
  const r=h('div','srow col');const t=h('div','stxt');t.appendChild(h('b','',label));if(desc)t.appendChild(h('span','',desc));r.appendChild(t);
  const g=h('div','seg');g.setAttribute('role','radiogroup');g.setAttribute('aria-label',label);
  opts.forEach(([l,v])=>{
    const b=h('button',S[key]===v?'on':'',l);b.type='button';b.setAttribute('role','radio');b.setAttribute('aria-checked',S[key]===v?'true':'false');
    b.addEventListener('click',()=>{S[key]=v;saveProfile();if(regen)setupPreview();[...g.children].forEach(x=>{const on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-checked',on?'true':'false')})});
    g.appendChild(b);
  });
  r.appendChild(g);return r;
}
function ctlPanel(){
  const pn=h('div','panel ctlpanel');
  const note=h('div','best','');
  function render(){
    pn.textContent='';
    pn.appendChild(h('div','ptitle','Controls'));
    pn.appendChild(h('p','lede','Click a box, then press any key or any mouse button (left, middle, right, back, forward) or scroll the wheel. Each action has two boxes. Esc cancels, Delete clears a box. A button already used elsewhere is moved to the new action.'));
    BIND_DEFS.forEach(([g,list])=>{
      pn.appendChild(h('div','bgroup',g));
      list.forEach(([id,label])=>{
        const r=h('div','srow brow');r.appendChild(h('b','',label));
        const bx=h('div','bboxes');
        for(let s=0;s<2;s++){
          const code=P.binds[id][s];
          const b=h('button','bbox'+(code?'':' empty'),bindLabel(code));b.type='button';b.setAttribute('aria-label',label+' binding '+(s+1)+': '+bindLabel(code));
          b.addEventListener('click',()=>{
            if(performance.now()-capEnd<350)return;
            render0(b,id,s);
          });
          bx.appendChild(b);
        }
        r.appendChild(bx);pn.appendChild(r);
      });
    });
    const tb=h('div','best','Input tester: press any key or mouse button, or scroll.');
    inTest=code=>{if(!document.body.contains(tb)){inTest=null;return}const a=actionsOf(code).map(k=>{let n=k;BIND_DEFS.forEach(g=>g[1].forEach(x=>{if(x[0]===k)n=x[1]}));return n});tb.textContent='You pressed '+bindLabel(code)+' → '+(a.length?a.join(', '):'nothing assigned')};
    pn.appendChild(tb);
    pn.appendChild(note);
    pn.appendChild(btn('Reset controls to default','go alt sm',()=>{P.binds=cloneBinds();saveProfile();note.textContent='Controls reset.';render()}));
  }
  function render0(b,id,s){
    pn.querySelectorAll('.bbox.cap').forEach(x=>x.classList.remove('cap'));
    b.classList.add('cap');b.textContent='Press a key or button…';
    capFn=code=>{
      capFn=null;
      if(code===null||code==='K:Escape'){render();return}
      if(code==='K:Delete'||code==='K:Backspace'){P.binds[id].splice(s,1);saveProfile();note.textContent='';render();return}
      let moved='';
      for(const k in P.binds){const i=P.binds[k].indexOf(code);if(i>=0&&!(k===id&&i===s)){P.binds[k].splice(i,1);if(k!==id)moved=k}}
      const arr=P.binds[id];while(arr.length<2)arr.push('');arr[s]=code;
      P.binds[id]=arr.slice(0,2).map(x=>x||'');
      for(const k in P.binds)P.binds[k]=P.binds[k].filter(Boolean);
      P.binds[id]=P.binds[id].slice();
      saveProfile();
      let mv='';BIND_DEFS.forEach(g=>g[1].forEach(a=>{if(a[0]===moved)mv=a[1]}));
      note.textContent=bindLabel(code)+' is now '+BIND_DEFS.flatMap(g=>g[1]).find(a=>a[0]===id)[1]+(mv?' (taken from '+mv+')':'')+'.';
      render();
    };
  }
  render();return pn;
}
function tabSettings(){
  view.appendChild(ctlPanel());
  view.appendChild(googleSetupPanel());
  view.appendChild(paySetupPanel());
  const a=h('div','panel');a.appendChild(h('div','ptitle','Match setup'));
  a.appendChild(h('p','lede','These switches apply to your solo games. In live play the host of the room decides the setup.'));
  a.appendChild(segRow('map','Map size',[['Small',0],['Medium',1],['Large',2]],'Bigger maps mean longer flights and more room to hide.',true));
  a.appendChild(segRow('storm','Storm speed',[['Slow',0],['Normal',1],['Fast',2]],'',true));
  a.appendChild(segRow('loot','Loot amount',[['Sparse',0],['Normal',1],['Plentiful',2]],'',true));
  a.appendChild(segRow('crate','Crates on the map',[['Few',0],['Normal',1],['Many',2]],'Wooden crates hold a weapon plus a heal or ammo.',true));
  a.appendChild(segRow('gold','Gold crates',[['Off',0],['On',1]],'Tougher to break and full of high rarity weapons.',true));
  a.appendChild(segRow('rarity','Weapon rarity',[['Low',0],['Normal',1],['High',2]],'Seven levels from Common to Exotic. High makes the top levels far more common.',true));
  a.appendChild(segRow('startGun','Start with a Sidearm',[['Off',0],['On',1]],'Off means everyone drops with empty hands and has to find a weapon.'));
  a.appendChild(segRow('healSpd','Healing speed',[['Slow',0],['Normal',1],['Fast',2]],'Small pot 1s, big pot 3s, med kit 3s at Normal.'));
  a.appendChild(segRow('bots','Solo fighters',[['8',0],['16',1],['24',2]],'Including you.'));
  view.appendChild(a);
  const b=h('div','panel');b.appendChild(h('div','ptitle','Options'));
  b.appendChild(toggle('sound','Sound effects'));
  b.appendChild(toggle('shake','Screen shake'));
  b.appendChild(toggle('minimap','Minimap'));
  b.appendChild(toggle('names','Player names over characters'));
  b.appendChild(toggle('autoPick','Auto pick up loot','Off (default) means you press E (or tap Swap) to take weapons and items.'));
  b.appendChild(toggle('aim','Aim line','Shows a line in front of your gun.'));
  b.appendChild(toggle('fps','Show FPS'));
  view.appendChild(b);
  const dv=h('div','panel');dv.appendChild(h('div','ptitle','Owner / developer mode'));
  dv.appendChild(h('p','lede','Unlocks every skin, emote, melee weapon, backpack and parachute, the whole battle pass (both tracks, every tier) and all Pass+ perks on this device. Nothing is charged and your real progress is kept underneath.'));
  const dr=h('div','srow');const dt=h('div','stxt');dt.appendChild(h('b','','Unlock everything'));dr.appendChild(dt);
  const ds=h('button','sw'+(P.dev?' on':''));ds.type='button';ds.setAttribute('role','switch');ds.setAttribute('aria-checked',P.dev?'true':'false');ds.setAttribute('aria-label','Owner mode');ds.appendChild(h('i'));
  ds.addEventListener('click',()=>{P.dev=P.dev?0:1;fixEquipped();saveProfile();showHub()});
  dr.appendChild(ds);dv.appendChild(dr);
  dv.appendChild(btn('Add 100,000 coins','go alt sm',()=>{P.coins+=100000;saveProfile();drawHead();coinNote.textContent='You now have '+P.coins.toLocaleString('en-US')+' coins.'}));
  const coinNote=h('div','best','');dv.appendChild(coinNote);view.appendChild(dv);
  const c=h('div','panel');c.appendChild(h('div','ptitle','Progress'));
  c.appendChild(h('p','lede','Your XP, coins, skins and stats are saved in this browser only.'));
  const rb=btn(resetArm?'Press again to erase everything':'Reset progress','go alt sm',()=>{
    if(!resetArm){resetArm=true;rb.textContent='Press again to erase everything';setTimeout(()=>{if(resetArm){resetArm=false;rb.textContent='Reset progress'}},4000);return}
    resetArm=false;try{localStorage.removeItem(PKEY)}catch(e){}
    P=newProfile();
    S=P.set;for(const k in lockSelC)lockSelC[k]=k==='emote'?0:-1;setupPreview();showHub();
  });
  c.appendChild(rb);view.appendChild(c);
}

/* ---------- start ---------- */
loadProfile();
setupPreview();showHub();
requestAnimationFrame(frame);
