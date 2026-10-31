'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const names=['Pumpkin King','Violet Ghost','Vampire','Moon Witch','Mummy','Zombie','Skeleton','Midnight Cat','Scarecrow','Inferno Demon','Plague Doctor','Spectral Knight'];
const pool=['skins','melees'].flatMap(category=>names.map((name,i)=>({id:category+':halloween:'+i,category,index:i,name:name+(category==='melees'?' Relic':''),weight:1,rarity:null})));
class CosmeticStore{
 constructor(file){this.file=file;this.accounts={};if(fs.existsSync(file))this.accounts=JSON.parse(fs.readFileSync(file,'utf8'))}
 save(){fs.mkdirSync(path.dirname(this.file),{recursive:true});fs.writeFileSync(this.file+'.tmp',JSON.stringify(this.accounts));fs.renameSync(this.file+'.tmp',this.file)}
 account(token){const key=token&&crypto.createHash('sha256').update(token).digest('hex');if(!key||!this.accounts[key])throw Error('Invalid device account');return this.accounts[key]}
 create(){const token=crypto.randomBytes(32).toString('hex'),key=crypto.createHash('sha256').update(token).digest('hex');this.accounts[key]={owned:[],transactions:{}};this.save();return{token,...this.view(token)}}
 view(token){const a=this.account(token),eligible=pool.filter(q=>!a.owned.includes(q.id)),total=eligible.reduce((n,q)=>n+q.weight,0);return{owned:a.owned,pool:pool.map(q=>({...q,owned:a.owned.includes(q.id),probability:eligible.includes(q)?q.weight/total:0})),cost:0,available:eligible.length>0}}
 open(token,id){if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(id))throw Error('Invalid transaction');const a=this.account(token);if(a.transactions[id])return a.transactions[id];const eligible=pool.filter(q=>!a.owned.includes(q.id));if(!eligible.length)throw Error('Collection complete');const reward=eligible[crypto.randomInt(eligible.length)],result={transactionId:id,reward,owned:[...a.owned,reward.id]};a.owned=result.owned;a.transactions[id]=result;this.save();return result}
}
module.exports={CosmeticStore,pool};
