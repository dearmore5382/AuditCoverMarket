import {createAccount,createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {TransactionStatus} from 'genlayer-js/types';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash,randomBytes} from 'node:crypto';
import {canonical,execution} from '../src/protocol.ts';

const scenario=process.argv[2]||'happy';
if(!['happy','guards','recovery'].includes(scenario))throw Error('Use happy, guards, or recovery');
const address=process.env.AUDITCOVER_ADDRESS;
if(!/^0x[0-9a-fA-F]{40}$/.test(address||''))throw Error('Set AUDITCOVER_ADDRESS after deployment');
for(const name of ['AUDITCOVER_SPONSOR_KEY','AUDITCOVER_CURATOR_KEY'])if(!/^0x[0-9a-fA-F]{64}$/.test(process.env[name]||''))throw Error('Provide auxiliary signer environment variables; no generated-account fallback');
const accounts=[createAccount(process.env.AUDITCOVER_SPONSOR_KEY),createAccount(process.env.AUDITCOVER_CURATOR_KEY)];
if(accounts[0].address===accounts[1].address)throw Error('Two distinct auxiliary wallets required');
const clients=accounts.map(account=>createClient({chain:studionet,account}));
const reader=createClient({chain:studionet});
const path=`verification/LIVE_${scenario.toUpperCase()}.json`;
const record=existsSync(path)?JSON.parse(readFileSync(path)):{network:'studionet',address,scenario,roles:{sponsor:accounts[0].address,curator:accounts[1].address,deployer_used:false},transactions:[],checks:[],plan_created_at:new Date().toISOString()};
if(record.address!==address||record.roles.sponsor!==accounts[0].address||record.roles.curator!==accounts[1].address)throw Error('Checkpoint identity mismatch');
const save=()=>writeFileSync(path,JSON.stringify(record,(_,v)=>typeof v==='bigint'?v.toString():v,2)+'\n');
const hash=v=>createHash('sha256').update(v).digest('hex');
const read=(functionName,args=[])=>reader.readContract({address,functionName,args});
const assert=(name,condition,detail={})=>{record.checks.push({name,pass:Boolean(condition),detail});save();if(!condition)throw Error(name)};
async function tx(actor,label,functionName,args,value,expected,unchanged=false){
 let row=record.transactions.find(x=>x.label===label);
 if(row?.verified)return row.result;
 if(row&&!row.hash)throw Error('Unknown send outcome. Reconcile chain before retrying '+label);
 if(!row){row={label,actor:accounts[actor].address,functionName,args,value:String(value),before:record.round_id===undefined?await read('get_config'):await read('get_round',[record.round_id])};record.transactions.push(row);save();const sent=await clients[actor].writeContract({address,functionName,args,value});row.hash=typeof sent==='string'?sent:sent.txId;save();console.log(label,row.hash)}
 await reader.waitForTransactionReceipt({hash:row.hash,status:TransactionStatus.FINALIZED,interval:5000,retries:240});
 row.receipt=await reader.getTransaction({hash:row.hash});save();
 if(unchanged){let rejected=false;try{execution(row.receipt)}catch(e){row.error=String(e);rejected=true}row.after=await read('get_round',[record.round_id]);assert(label+' execution rejected',rejected);assert(label+' no mutation',canonical(row.before)===canonical(row.after));row.verified=true;save();return}
 row.result=execution(row.receipt);assert(label+' exact return',row.result===expected||expected==='RETURNED_ROUND_ID'&&typeof row.result==='number',{actual:row.result,expected});
 if(expected==='RETURNED_ROUND_ID')record.round_id=Number(row.result);
 row.after=await read('get_round',[record.round_id]);row.verified=true;save();return row.result;
}
async function waitUntil(seconds,label){if(Date.now()/1000>=seconds)return;record.waiting_for={label,unix_seconds:seconds,iso:new Date(seconds*1000).toISOString()};save();console.log('WAIT',label,record.waiting_for.iso);while(Date.now()/1000<seconds)await new Promise(r=>setTimeout(r,Math.min(15000,seconds*1000-Date.now())));delete record.waiting_for;save()}
async function payout(actor,label){const recipient=accounts[actor].address.toLowerCase();const state=await read('get_round',[record.round_id]);const amount=BigInt(state.credits[recipient].amount);record.balances??={};record.balances[label]??={recipient_before:String(await reader.getBalance({address:accounts[actor].address})),contract_before:String(await reader.getBalance({address}))};save();await tx(actor,label,'request_payout',[record.round_id],0n,'TRANSFER_PENDING');const row=record.transactions.find(x=>x.label===label);const parent=await reader.getTransaction({hash:row.hash});const children=parent.triggered_transactions;if(!Array.isArray(children)||children.length!==1)throw Error('Expected exactly one transfer child');await reader.waitForTransactionReceipt({hash:children[0],status:TransactionStatus.FINALIZED,interval:5000,retries:120});row.child_receipt=await reader.getTransaction({hash:children[0]});save();await tx(actor,label+' confirmation','confirm_payout',[record.round_id,recipient,row.hash,children[0]],0n,state.credits[recipient].kind==='REFUND'?'REFUNDED':'PAID');const after=await read('get_round',[record.round_id]);assert(label+' confirmed credit',after.credits[recipient].status==='PAID');record.balances[label].recipient_after=String(await reader.getBalance({address:accounts[actor].address}));record.balances[label].contract_after=String(await reader.getBalance({address}));assert(label+' exact contract outflow',BigInt(record.balances[label].contract_before)-BigInt(record.balances[label].contract_after)===amount);assert(label+' recipient delta',BigInt(record.balances[label].recipient_after)-BigInt(record.balances[label].recipient_before)===amount);save()}
try{
 const source=readFileSync('contracts/AuditCoverMarket.py');const deployed=Buffer.from(await reader.request({method:'gen_getContractCode',params:[address]}),'base64');assert('exact deployed source',source.equals(deployed));record.source_sha256=hash(source);save();
 if(!record.terms){const resources=JSON.parse(readFileSync('samples/resources.json'));const now=Math.floor(Date.now()/1000);record.terms={title:`AuditCover ${scenario} ${record.plan_created_at}`,questions:JSON.parse(readFileSync('samples/questions.json')),sources:{'oz-bravo':resources[0].expected_digest},budget:1000000000000000,commit_end:now+900,reveal_end:now+1800,expires:now+2700};record.bids=[{source_id:'oz-bravo',finding:'L02',price:200000000000000},{source_id:'oz-bravo',finding:'M01',price:300000000000000}].map(payload=>({payload,salt:randomBytes(32).toString('hex')}));save()}
 await tx(0,'create brief','create_round',[canonical(record.terms)],0n,'RETURNED_ROUND_ID');
 if(scenario==='guards')await tx(1,'wrong wallet fund','fund_round',[record.round_id],BigInt(record.terms.budget),null,true);
 await tx(0,'fund exact budget','fund_round',[record.round_id],BigInt(record.terms.budget),'FUNDED');
 if(scenario==='recovery'){await waitUntil(record.terms.expires+5,'expiry');await tx(1,'permissionless recovery','recover_round',[record.round_id],0n,'REFUND_AVAILABLE');await payout(0,'expired sponsor refund')}
 else{
 const round=await read('get_round',[record.round_id]);
 for(let i=0;i<record.bids.length;i++){const b=record.bids[i];b.commitment=hash(canonical(['auditcover-bid-v1',round.terms_digest,accounts[1].address.toLowerCase(),b.payload,b.salt]));save();await tx(1,'commit '+i,'commit_bid',[record.round_id,b.commitment],0n,i)}
 await waitUntil(record.terms.commit_end+5,'reveal window');
 for(let i=0;i<record.bids.length;i++){const b=record.bids[i];await tx(1,'reveal '+i,'reveal_bid',[record.round_id,i,canonical(b.payload),b.salt],0n,'REVEALED')}
 await waitUntil(record.terms.reveal_end+5,'clearing window');
 await tx(1,'semantic coverage and clearing','clear_round',[record.round_id],0n,'CLEARED');
 const cleared=await read('get_round',[record.round_id]);assert('expected semantic mapping',canonical(cleared.matrix.map(r=>r.coverage))==='[[0],[1]]');assert('expected chosen bids',canonical(cleared.selected)==='[0,1]');
 await payout(1,'curator reward');await payout(0,'unused sponsor budget');
 await tx(1,'double payout blocked','request_payout',[record.round_id],0n,null,true);
 }
 record.final=await read('get_round',[record.round_id]);assert('value conservation',BigInt(record.final.held)+BigInt(record.final.pending)+BigInt(record.final.paid)+BigInt(record.final.refunded)===BigInt(record.terms.budget));record.finished=new Date().toISOString();delete record.error;save();console.log('LIVE VERIFIED',scenario);
}catch(error){record.error=String(error);save();throw error}
