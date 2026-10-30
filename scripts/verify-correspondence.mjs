// Live integration: writes clearly labelled fictional test mail, never spends resources.
// Usage: node scripts/verify-correspondence.mjs <private-account-json>
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID,pbkdf2Sync} from 'node:crypto';
import assert from 'node:assert/strict';
const config=JSON.parse(await readFile(new URL('../src/cloudbase.config.json',import.meta.url),'utf8'));
const accounts=JSON.parse(await readFile(process.argv[2],'utf8')),base='https://'+config.env+'.api.tcloudbasegateway.com';
const origin='https://letus-moyu-yiyi-and-fafa-d6gr7w5e62c4e8565.webapps.tcloudbase.com';
async function post(path,token,body){const r=await fetch(base+path,{method:'POST',signal:AbortSignal.timeout(45000),headers:{'Content-Type':'application/json',Origin:origin,Authorization:'Bearer '+token,'x-device-id':'letus-moyu-integration-check'},body:JSON.stringify(body)});const data=await r.json();assert.ok(r.ok,'HTTP '+r.status);return data}
async function login(a){const key=config.loginKeys[a.username],password='M!7a'+pbkdf2Sync(a.password,Buffer.from(key.salt,'hex'),key.iterations,16,'sha256').toString('hex').slice(0,20);const r=await post('/auth/v1/signin',config.publishableKey,{username:a.username,password});assert.equal(typeof r.access_token,'string');return r.access_token}
const sessions=await Promise.all(accounts.map(login)),token=Object.fromEntries(accounts.map((a,i)=>[a.username,sessions[i]]));
async function api(who,action,payload={},requestId=randomUUID()){return post('/v1/functions/letusMoyu',token[who],{action,payload,requestId})}
const ok=r=>{assert.equal(r.ok,true,r.error);return r};
const f=ok(await api('fafa','state')).state,y=ok(await api('yiyi','state')).state;
const id=randomUUID(),payload={to:'conference',subject:'[联调] 青年学者交流会咨询',body:'老师您好：\n\n我们来自不急大学低空经济课题组，想了解园区青年学者交流会的参加方式。此信用于新版本邮件联调，感谢回复。\n\nYizi'};
const first=ok(await api('yiyi','letter_send',payload,id));assert.equal(first.thread.messages.length,1);
const repeated=ok(await api('yiyi','letter_send',payload,id));assert.equal(repeated.replayed,true);assert.equal(repeated.threadId,first.threadId);
const forbidden=await api('fafa','letter_get',{id:first.threadId});assert.equal(forbidden.ok,false);
assert.equal((await api('yiyi','office_state')).ok,false);
const list=ok(await api('fafa','office_list'));assert.ok(list.threads.some(t=>t.id===first.threadId));
ok(await api('fafa','office_get',{id:first.threadId}));
const reply=ok(await api('fafa','office_reply',{id:first.threadId,body:'Yizi 老师您好：\n\n欢迎贵组报名城市交叉创新青年学者交流会。请在游戏信箱的邀请选项中选择参加或婉拒，也可以安排本组同学参加。\n\n本信是信务室上线的演示邀请；是否参加由您决定。\n\n园区学术交流中心',offer:'conference'}));assert.equal(reply.thread.messages.length,2);
const received=ok(await api('yiyi','letter_get',{id:first.threadId}));assert.equal(received.thread.unread,true);assert.ok(received.thread.offer.choices.length);assert.equal(received.thread.offer.rules,undefined);assert.equal(received.thread.offer.choices[0].outcomes,undefined);
ok(await api('yiyi','letter_read',{id:first.threadId}));
const peer=ok(await api('fafa','letter_send',{to:y.self,subject:'[联调] 园区邮局已通',body:'Yizi，新的园区邮局通了！以后可以在这里约合作、讨论学生任务，或者留一句“论文先放放，奶茶要不要”。此信是功能联调。\n\nfafa'}));
assert.equal(ok(await api('yiyi','letter_get',{id:peer.threadId})).thread.messages[0].body,peer.thread.messages[0].body);
assert.equal((await api('fafa','office_get',{id:peer.threadId})).ok,false);
const ownList=ok(await api('yiyi','letter_list'));assert.ok(ownList.threads.some(t=>t.id===peer.threadId));assert.ok(ownList.threads.some(t=>t.id===first.threadId));
const after=ok(await api('yiyi','state')).state;assert.ok(after.players[after.self].threadSummaries.some(t=>t.id===first.threadId));assert.equal(after.players[f.self].threadSummaries,undefined);
const evidence={at:new Date().toISOString(),passed:['native logins','two-way server-persisted NPC mail','retry receipt prevents duplicate send','NPC administrator enforcement','player private mail protection','peer-to-peer delivery','unread/read persistence','invitation outcome secrecy'],threads:{npc:first.threadId,peer:peer.threadId}};
await mkdir(new URL('../output/',import.meta.url),{recursive:true});await writeFile(new URL('../output/v04-api-validation.json',import.meta.url),JSON.stringify(evidence,null,2));
console.log('PASS',evidence.passed.join('; '));console.log('Two fictional test threads retained for review; no moves, recruitment, invite acceptance or resource spending.');
