// Read-only API verification. Does not move, reply, spend, recruit or reset.
import {readFile} from 'node:fs/promises';
import {randomUUID,pbkdf2Sync} from 'node:crypto';
import assert from 'node:assert/strict';
const config=JSON.parse(await readFile(new URL('../src/cloudbase.config.json',import.meta.url),'utf8'));
const accounts=JSON.parse(await readFile(process.argv[2],'utf8')),base='https://'+config.env+'.api.tcloudbasegateway.com';
const ids=['2115994901674020865','2115994904038830081'],origin='https://letus-moyu-yiyi-and-fafa-d6gr7w5e62c4e8565.webapps.tcloudbase.com';
async function post(path,token,body){const r=await fetch(base+path,{method:'POST',signal:AbortSignal.timeout(45000),headers:{'Content-Type':'application/json',Origin:origin,Authorization:'Bearer '+token,'x-device-id':'letus-moyu-integration-check'},body:JSON.stringify(body)});const data=await r.json();assert.ok(r.ok,'HTTP '+r.status);return data}
for(const [i,a] of accounts.entries()){
 const key=config.loginKeys?.[a.username];
 const password=process.argv.includes('--pin')?'M!7a'+pbkdf2Sync(a.password,Buffer.from(key.salt,'hex'),key.iterations,16,'sha256').toString('hex').slice(0,20):a.password;
 const session=await post('/auth/v1/signin',config.publishableKey,{username:a.username,password});
 assert.equal(typeof session?.access_token,'string');
 const data=await post('/v1/functions/letusMoyu',session.access_token,{action:'state',payload:{},requestId:randomUUID()});
 assert.equal(data.ok,true,data.error);const s=data.state,p=s.players[s.self],other=Object.values(s.players).find(x=>x.id!==s.self);
 assert.equal(s.self,ids[i]);assert.equal(s.id,'62D133EFFA');assert.equal(s.rulesVersion,2);
 assert.ok(Array.isArray(p.inbox));assert.ok(Array.isArray(p.admissions.candidates));assert.equal(p.patent.total>=0,true);assert.equal(other.inbox,undefined);assert.equal(other.admissions.candidates,undefined);assert.equal(other.hand,undefined);
 console.log('PASS',a.username,'original identity + room preserved; v2 inbox, students and patent ready; partner private data hidden.');
 console.log('Snapshot',{version:s.version,position:p.position,actionCount:p.actionCount,projects:Object.keys(s.projects).length,pending:p.pending?.type||null,year:s.academicYearDays});
}
