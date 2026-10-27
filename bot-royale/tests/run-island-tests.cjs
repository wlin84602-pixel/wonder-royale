'use strict';
const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const files=['island-world.test.cjs','island-client.test.cjs','island-network.test.cjs','weapon-cooldowns.test.cjs',],results=[];
for(const file of files){const r=spawnSync(process.execPath,[path.join(__dirname,file),'--report'],{encoding:'utf8',timeout:120000});console.log('\n'+file+': '+(r.status===0?'PASS':'FAIL'));if(r.stdout)console.log(r.stdout.trim());if(r.stderr)console.error(r.stderr.trim());results.push({file,status:r.status===0?'passed':'failed'});if(r.status!==0)break}
fs.writeFileSync(path.join(__dirname,'../island-checks-summary.json'),JSON.stringify({status:results.every(r=>r.status==='passed')?'passed':'failed',suites:results},null,2));process.exitCode=results.some(r=>r.status!=='passed')?1:0;
