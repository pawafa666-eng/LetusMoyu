// Uses the documented CloudBase HTTP API. Credentials stay in memory and are
// loaded from an explicitly supplied local file, never from tracked source.
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const path=process.argv[2];
if(!path)throw new Error('Usage: node scripts/smoke-cloud.mjs <private-account-file> [--exercise]');
const accounts=JSON.parse(await readFile(path,'utf8'));
const config=JSON.parse(await readFile(new URL('../src/cloudbase.config.json',import.meta.url),'utf8'));
const base='https://'+config.env+'.api.tcloudbasegateway.com';
const origin='https://letus-moyu-yiyi-and-fafa-d6gr7w5e62c4e8565.webapps.tcloudbase.com';
async function post(path,token,body){
 const r=await fetch(base+path,{method:'POST',signal:AbortSignal.timeout(45000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,Origin:origin,'x-device-id':'letus-moyu-integration-check'},body:JSON.stringify(body)});
 const data=await r.json();
 if(!r.ok)throw new Error(path+' failed: '+r.status+' '+(data.error_description||data.message||data.error||data.code));
 return data;
}
const sessions=[];
for(const account of accounts){
 const session=await post('/auth/v1/signin',config.publishableKey,{username:account.username,password:account.password});
 assert.equal(typeof session.access_token,'string');
 sessions.push(session);
 console.log('PASS login:',account.username);
}
async function call(index,action,payload={},requestId=randomUUID()){
 const data=await post('/v1/functions/letusMoyu',sessions[index].access_token,{action,payload,requestId});
 assert.equal(data.ok,true,(data.error||'Game response unsuccessful')+(data.diagnostic?' '+JSON.stringify(data.diagnostic):''));
 return data;
}
let a=await call(0,'state'),b=await call(1,'state');
console.log('PASS authenticated state for both accounts');
if(process.argv.includes('--exercise')){
 if(!a.state)a=await call(0,'create',{name:'点云博士',discipline:'civil'});
 if(!b.state)b=await call(1,'join',{name:'起飞博士',code:a.state.id});
 assert.equal(a.state.id,b.state.id);
 a=await call(0,'state');assert.equal(Object.keys(a.state.players).length,2);
 assert.equal(a.state.players[b.state.self].hand,undefined);
 console.log('PASS shared two-person room; opponent hand stays private');
 const self=a.state.self;
 if(a.state.players[self].pending){a=await call(0,'resolve',{choice:'skip'});if(a.state.players[self].pending)a=await call(0,'resolve',{choice:'skip'});}
 const energy=a.state.players[self].energy;
 if(energy>0){
  const id=randomUUID();
  const [first,second]=await Promise.all([call(0,'move',{},id),call(0,'move',{},id)]);
  assert.ok(first.replayed||second.replayed);
  a=await call(0,'state');assert.equal(a.state.players[self].energy,energy-1);
  console.log('PASS concurrent duplicate move consumed energy exactly once');
  const position=a.state.players[self].position,pending=a.state.players[self].pending;
  const again=await call(0,'state');
  assert.equal(again.state.players[self].position,position);
  assert.deepEqual(again.state.players[self].pending,pending);
  console.log('PASS reconnect preserves position and pending choice');
  if(pending){a=await call(0,'resolve',{choice:'skip'});if(a.state.players[self].pending)a=await call(0,'resolve',{choice:'skip'});}
  if(a.state.players[self].hand.includes(3)&&!a.state.players[self].cardUsed){
   const before=(await call(1,'state')).state.players[b.state.self].paper.progress;
   await call(0,'card',{card:3});
   const after=await call(1,'state');
   assert.ok(after.state.players[b.state.self].paper.progress>=before+8);
   assert.ok(after.state.feed.some(item=>item.kind==='interaction'));
   console.log('PASS offline cooperative card reaches other account and shared feed');
  }
 }
 console.log('Room ready:',a.state.id);
}
console.log('Cloud API verification complete; browser UI validation is separate.');
