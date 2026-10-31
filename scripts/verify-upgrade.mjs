// Native account verification using state sync only. Normal passive settlement
// may occur; does not actively move, reply, purchase, recruit or reset.
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
 assert.equal(s.self,ids[i]);assert.equal(s.id,'62D133EFFA');assert.equal(s.rulesVersion,8);
 assert.ok(Array.isArray(p.world.jobs));assert.ok(['campus','enterprise','community'].includes(p.scene));assert.ok(Array.isArray(p.paper.reviewHistory));assert.doesNotMatch(JSON.stringify(s),/"_mind"|"_labor"|"_skill"|"_difficulty"|"_reviewRoll"|"reviewRoll"|"initiative"|"payTrust"/);for(const c of p.admissions.candidates){assert.ok(c.resume.workSample);assert.doesNotMatch(c.name,/^小/)}for(const st of p.students){assert.ok(st.personality&&st.resume&&st.moodText);assert.equal(st.wellbeing,undefined)}assert.equal(other.world.offers,undefined);assert.equal(other.world.applicants,undefined);assert.ok(Array.isArray(p.assets));assert.ok(Array.isArray(p.procurement.orders));assert.equal(p.career.faculty,s.lab.level>=2);assert.equal(p.career.salaryRate,s.lab.level>=2?20:0);assert.ok(p.economy.salary.buffer<=500);
 for(const st of p.students){assert.ok(st.wage.rate>=(st.degree==='phds'?2:1));assert.ok(st.wage.buffer<=100);}
 assert.ok(Array.isArray(p.inbox));assert.ok(Array.isArray(p.admissions.candidates));assert.equal(p.patent.total>=0,true);assert.equal(other.inbox,undefined);assert.equal(other.admissions.candidates,undefined);assert.equal(other.hand,undefined);
 assert.ok(p.ledger&&p.living&&p.institute&&s.jointResearch&&s.livingCross);
 assert.equal(other.ledger,undefined);assert.equal(other.living.requests,undefined);assert.equal(other.living.story,undefined);assert.equal(other.institute.candidates,undefined);
 assert.ok(Math.abs(p.ledger.openingBalance+p.ledger.income-p.ledger.expense-p.funds)<.00001);
 for(const filter of [{},{category:'project'},{direction:'income'},{category:'project',direction:'income'}]){
  const r=await post('/v1/functions/letusMoyu',session.access_token,{action:'ledger_list',payload:{ownerId:other.id,...filter},requestId:randomUUID()});assert.equal(r.ok,true,r.error);assert.ok(Array.isArray(r.ledger.entries));assert.equal(r.ledger.summary.balance,p.funds);for(const row of r.ledger.entries){assert.ok(p.ledger.entries.some(x=>x.id===row.id));assert.equal(row.ownerId,undefined);if(filter.category)assert.equal(row.category,filter.category);if(filter.direction)assert.equal(row.direction,filter.direction);}
 }
 console.log('PASS',a.username,'original identity + room preserved; v8 living lab, joint research, faculty, story, alumni, transfers and private durable ledger ready; partner private data hidden.');
 console.log('Snapshot',{version:s.version,position:p.position,actionCount:p.actionCount,projects:Object.keys(s.projects).length,pending:p.pending?.type||null,year:s.academicYearDays});
}
