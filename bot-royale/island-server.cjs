'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {Session}=require('./island/session.cjs');
const ROOT=path.join(__dirname,'public'),RULES=JSON.parse(fs.readFileSync(path.join(__dirname,'island/combat-rules.json'),'utf8'));
function createServer(options={}){
 const sessions=new Map(),clients=new Map(),connections=new Set();
 function getRoom(name){if(!sessions.has(name)&&sessions.size>=16)throw Error('Room limit reached');if(!sessions.has(name))sessions.set(name,new Session(crypto.randomBytes(4).readUInt32LE(),RULES,{bots:options.bots??24}));return sessions.get(name)}
 function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value))}
 async function body(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>4096)throw Error('Request too large')}return JSON.parse(text||'{}')}
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  try{
   if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,game:'Bot Royale'});
   if(req.method==='GET'&&url.pathname==='/api/meta')return json(res,200,{online:true,tickRate:30,maxPlayers:25,version:1});
   if(req.method==='POST'&&url.pathname==='/api/join'){
    const m=await body(req),room=String(m.room||'main');if(!/^[a-zA-Z0-9_-]{1,24}$/.test(room))return json(res,400,{error:'Invalid room'});
    const session=getRoom(room),actor=session.join(m.name,m.look||{}),token=crypto.randomBytes(24).toString('hex');clients.set(token,{room,id:actor.id,lastSeen:Date.now(),lastSecond:0,requests:0});
    return json(res,200,{token,id:actor.id,seed:session.world.seed,route:session.route,snapshot:session.snapshot(actor.id)});
   }
   if(url.pathname.startsWith('/api/')){
    const token=req.headers.authorization?.replace(/^Bearer /,'')||url.searchParams.get('token'),client=clients.get(token);
    if(!client)return json(res,401,{error:'Join the room first'});client.lastSeen=Date.now();
    const session=sessions.get(client.room);
    if(req.method==='GET'&&url.pathname==='/api/events'){if([...connections].filter(c=>c.token===token).length>=2)return json(res,429,{error:'Too many streams'});
     res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write(': connected\n\n');const c={res,token,client};connections.add(c);req.on('close',()=>connections.delete(c));return;
    }
    const now=Math.floor(Date.now()/1000);if(client.lastSecond!==now){client.lastSecond=now;client.requests=0}if(++client.requests>90)return json(res,429,{error:'Too many inputs'});
    if(req.method==='POST'&&url.pathname==='/api/input')return json(res,200,{ok:session.input(client.id,await body(req))});
    if(req.method==='POST'&&url.pathname==='/api/action')return json(res,200,session.action(client.id,await body(req)));
    if(req.method==='POST'&&url.pathname==='/api/leave'){session.remove(client.id);clients.delete(token);return json(res,200,{ok:true})}
    return json(res,404,{error:'Unknown action'});
   }
   if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Unsupported method'});
   let pathname=decodeURIComponent(url.pathname),file=pathname==='/'?path.join(ROOT,'index.html'):path.resolve(ROOT,'.'+pathname);
   if(!file.startsWith(ROOT+path.sep)||!/\.(html|js|css|json|png|svg)$/i.test(file)||!fs.existsSync(file))return json(res,404,{error:'Not found'});
   const ext=path.extname(file),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'}[ext];
   res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store'});if(req.method==='HEAD')return res.end();fs.createReadStream(file).pipe(res);
  }catch(e){json(res,400,{error:e.message})}
 });
 let accumulator=0,last=performance.now(),frames=0,lastBroadcast=-1;
 const timer=setInterval(()=>{
  const now=performance.now();accumulator+=Math.min(250,now-last)/1000;last=now;
  while(accumulator>=1/30){for(const session of sessions.values())session.step(1/30);accumulator-=1/30;frames++}
  if(frames%2===0&&frames!==lastBroadcast)for(const c of connections){const session=sessions.get(c.client.room),snapshot=session?.snapshot(c.client.id);if(snapshot&&!c.res.destroyed){if(c.res.writableLength>524288){c.res.destroy();continue}c.res.write('data: '+JSON.stringify(snapshot)+'\n\n');c.client.lastSeen=Date.now()}}
  lastBroadcast=frames;for(const [token,client]of clients)if(Date.now()-client.lastSeen>30000){sessions.get(client.room)?.remove(client.id);clients.delete(token)}
  for(const [name,s]of sessions)if(![...s.actors.values()].some(p=>!p.bot))sessions.delete(name);
 },1000/60);
 timer.unref();server.on('close',()=>{clearInterval(timer);for(const c of connections)c.res.end()});
 return {server,sessions,clients,close:()=>new Promise(resolve=>{for(const c of connections)c.res.end();server.close(resolve)})};
}
if(require.main===module){const app=createServer(),port=Number(process.env.PORT)||5188,host=process.env.HOST||'0.0.0.0';app.server.listen(port,host,()=>console.log('Bot Royale island: http://'+host+':'+port+'/\nOpen the same address in another browser to join the match.'))}
module.exports={createServer};
