import {spawnSync} from 'node:child_process';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const commands=[['python',['-m','pytest','tests','-q']],['genvm-lint',['check','contracts/AuditCoverMarket.py']],['npm',['test']],['npm',['run','build']]];
const record={date:new Date().toISOString(),node:process.version,source_sha256:createHash('sha256').update(readFileSync('contracts/AuditCoverMarket.py')).digest('hex'),steps:[]};
for(const[command,args]of commands){const result=spawnSync(command,args,{encoding:'utf8',shell:process.platform==='win32',env:{...process.env,PYTHONUTF8:'1'}});process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');record.steps.push({command:[command,...args].join(' '),exit_code:result.status,stdout:result.stdout,stderr:result.stderr});writeFileSync('verification/LOCAL_VERIFICATION.json',JSON.stringify(record,null,2)+'\n');if(result.status!==0)process.exit(result.status||1)}
console.log('All local verification gates passed. Live deployment and browser-wallet gates are separate.');
