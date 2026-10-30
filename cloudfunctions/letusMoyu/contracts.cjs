'use strict';
const {randomUUID}=require('node:crypto');
const Rules=require('./contract-content.cjs');
const round=n=>Math.round(n*1e6)/1e6;
function createContracts({C,check,log,progress,rate,HOUR,procurementBonus=()=>0}){
 function initialize(pr){if(pr.finance?.model!=='contract'||pr.contract)return;const remaining=Math.max(0,round(pr.finance.totalFunding-pr.finance.allocatedFunding));const names=Rules.stages[pr.def]||['确认研究需求','开展现场验证','整理研究结果','交付验收成果'];const amount=Math.floor(remaining/4);pr.finance.workCosts??=0;pr.finance.partnerPaid??=0;pr.contract={version:1,steps:remaining>0?names.map((title,i)=>({id:randomUUID(),title,payment:i===3?round(remaining-amount*3):amount,status:'available',job:null,completedAt:0,payouts:[]})):[]};if(remaining<=0)pr.completedAt=pr.completedAt||pr.lastAt;}
 function migrate(s){for(const p of Object.values(s.players)){p.contractWork??=null;p.contractIncome??=0;p.contractHistory??=[];for(const st of p.students){st.contractWork??=null;st.contractLoads??=[];st.studyWeights??=Array(st.studyBuffer||0).fill(1);}}for(const pr of Object.values(s.projects))initialize(pr);}
 function current(pr){return pr.contract?.steps.find(st=>st.status!=='done');}
 function quote(s,pr,mode,now){const def=Rules.modes.find(m=>m.id===mode);check(def,'请选择有效的横向执行方式');const efficiency=Math.max(0,Math.min(.75,rate(s,pr,now)/C.projects[pr.def].income-1+procurementBonus(s,pr)));const step=current(pr);return{cost:Math.ceil(step.payment*def.costRate),duration:Math.ceil(def.hours*HOUR/(1+efficiency)/60000)*60000};}
 function workRef(pr,step,job){return{project:pr.def,stageId:step.id,jobId:job.id};}
 function release(s,pr,step,doneAt){const job=step.job;
  if(job.mode==='student'){const st=s.players[pr.owner].students.find(x=>x.id===job.studentId);if(st){if(st.contractWork?.jobId===job.id)st.contractWork=null;const load=st.contractLoads.find(x=>x.jobId===job.id);if(load)load.end=doneAt;st.wellbeing=Math.max(0,st.wellbeing-3);}}
  for(const id of job.participants)if(s.players[id]?.contractWork?.jobId===job.id)s.players[id].contractWork=null;
 }
 function settle(s,now){migrate(s);for(const pr of Object.values(s.projects)){if(!pr.contract)continue;const step=current(pr);if(!step)continue;const job=step.job;
  if(step.status==='invited'){if(job.expiresAt<=now){step.status='available';step.job=null;log(s,'「'+C.projects[pr.def].name+'」的合作邀请已到期，双方都没有扣费。',now,'contract',[pr.owner,job.partnerId]);}continue;}
  if(step.status!=='working')continue;
  const pauses=s.effects.filter(e=>e.type==='pause'&&e.project===pr.def&&e.target===pr.owner&&!e.done&&e.expires>job.lastAt),boundaries=[job.lastAt,...pauses.map(e=>e.expires).filter(t=>t<now),now].sort((a,b)=>a-b);
  let doneAt=0;for(let i=0;i<boundaries.length-1;i++){const start=boundaries[i],end=boundaries[i+1];if(pauses.some(e=>e.expires>start))continue;const dt=Math.min(end-start,job.duration-job.elapsed);job.elapsed+=Math.max(0,dt);if(job.elapsed>=job.duration){doneAt=start+dt;break;}}
  job.lastAt=Math.max(job.lastAt,now);const pausedUntil=Math.max(now,...pauses.map(e=>e.expires));job.dueAt=doneAt||pausedUntil+job.duration-job.elapsed;
  if(job.mode==='student'){const st=s.players[pr.owner].students.find(x=>x.id===job.studentId),load=st?.contractLoads.find(x=>x.jobId===job.id);if(load)load.end=job.dueAt;}
  if(doneAt){step.status='ready';job.finishedAt=doneAt;release(s,pr,step,doneAt);log(s,'「'+C.projects[pr.def].name+'」完成阶段「'+step.title+'」，等待提交验收后拨款。',now,'contract',job.participants);}
 }}
 function start(s,pr,step,mode,studentId,partnerId,share,now,prepared){
  const owner=s.players[pr.owner],q=prepared||quote(s,pr,mode,now);check(owner.funds>=q.cost,'科研经费不足，阶段材料或外协需要 '+q.cost);
  let student=null;if(mode==='student'){student=owner.students.find(st=>st.id===studentId&&!st.graduatedAt);check(student,'请选择本组在读学生');check(!student.contractWork,'这位同学正在做其他横向');check(!student.procurementWork,'这位同学正在办理采购');check(student.wellbeing>=35,'这位同学心情偏低，先聊聊近况再安排横向');check(!student.task||!['conference','visit'].includes(student.task.type)||student.task.status==='completed','这位同学正在参加活动或访学');}
  const participants=mode==='coop'?[owner.id,partnerId]:[owner.id];if(mode==='self'||mode==='coop')for(const id of participants)check(s.players[id]&&!s.players[id].contractWork,(id===owner.id?'你':'搭子')+'正在处理另一份横向任务');
  const job={id:randomUUID(),mode,studentId:student?.id||null,studentName:student?.name||'',partnerId:partnerId||null,share:mode==='coop'?share:0,participants,cost:q.cost,duration:q.duration,elapsed:0,lastAt:now,startedAt:now,dueAt:now+q.duration+Math.max(0,...s.effects.filter(e=>e.type==='pause'&&e.project===pr.def&&e.target===pr.owner&&!e.done).map(e=>e.expires-now))};
  owner.funds=round(owner.funds-q.cost);pr.finance.workCosts=round((pr.finance.workCosts||0)+q.cost);step.status='working';step.job=job;
  if(student){student.wellbeing=Math.max(0,student.wellbeing-6);student.contractWork=workRef(pr,step,job);student.contractLoads.push({jobId:job.id,start:now,end:job.dueAt});student.contractLoads=student.contractLoads.slice(-40);}
  if(mode==='self'||mode==='coop')for(const id of participants)s.players[id].contractWork=workRef(pr,step,job);
  log(s,owner.name+' 启动「'+step.title+'」：'+Rules.modes.find(m=>m.id===mode).name+(student?'（'+student.name+'）':'')+'，支出 '+q.cost+' 经费。',now,'contract',participants);
 }
 function dispatch(s,p,action,payload,now){
  if(!['contract_start','contract_respond','contract_cancel','contract_claim'].includes(action))return false;
  const def=Number(payload.project),pr=s.projects[def];check(Number.isInteger(def)&&pr?.contract,'这份横向合同不存在');const step=current(pr);check(step&&step.id===payload.stageId,'这份横向的当前阶段已变化，请刷新');const owner=s.players[pr.owner];
  if(action==='contract_start'){
   check(pr.owner===p.id,'只有承接人能安排横向任务');check(step.status==='available','这个阶段已经安排，请先完成当前任务');
   if(payload.mode==='coop'){const partner=Object.values(s.players).find(x=>x.id!==p.id);check(partner,'搭子尚未加入园区');check(!p.contractWork,'你正在处理另一份横向任务');const share=Number(payload.share??30);check(Number.isInteger(share)&&share>=10&&share<=50,'搭子分账比例应为 10 到 50 的整数');const q=quote(s,pr,'coop',now);check(p.funds>=q.cost,'科研经费不足');step.status='invited';step.job={id:randomUUID(),mode:'coop',partnerId:partner.id,share,quote:q,participants:[p.id,partner.id],expiresAt:now+12*HOUR,proposedAt:now};log(s,p.name+' 邀请 '+partner.name+' 合作「'+step.title+'」，完成后分给搭子 '+share+'% 的阶段款。',now,'contract',[p.id,partner.id]);}
   else start(s,pr,step,payload.mode,payload.studentId,null,0,now);
  }else if(action==='contract_respond'){
   check(step.status==='invited'&&step.job.partnerId===p.id,'这不是发给你的有效合作邀请');check(typeof payload.accept==='boolean','请选择接受或婉拒');
   if(!payload.accept){step.status='available';step.job=null;log(s,p.name+' 婉拒了「'+step.title+'」的合作，承接人可换一种方式安排。',now,'contract',p.id);}
   else{const offer=step.job;start(s,pr,step,'coop',null,p.id,offer.share,now,offer.quote);}
  }else if(action==='contract_cancel'){
   check(pr.owner===p.id&&step.status==='invited','只有承接人可以撤回未接受的邀请');step.status='available';step.job=null;log(s,p.name+' 撤回了合作邀请，双方未扣费。',now,'contract',p.id);
  }else{
   check(step.status==='ready','这项任务尚未完成，还不能验收领款');check(step.job.participants.includes(p.id),'只有这项任务的参与者可以提交验收');
   const job=step.job,partnerPay=job.mode==='coop'?Math.floor(step.payment*job.share/100):0,hostPay=round(step.payment-partnerPay);check(pr.finance.allocatedFunding+step.payment<=pr.finance.totalFunding+.000001,'合同预算校验失败，请联系园区主人');
   const payouts=[{id:owner.id,name:owner.name,amount:hostPay}];owner.funds=round(owner.funds+hostPay);pr.finance.allocatedFunding=round(pr.finance.allocatedFunding+step.payment);pr.finance.receivedFunding=round(pr.finance.receivedFunding+hostPay);pr.finance.operatingIncome=round(pr.finance.operatingIncome+hostPay);
   if(job.mode==='coop'){const partner=s.players[job.partnerId];partner.funds=round(partner.funds+partnerPay);partner.contractIncome=round(partner.contractIncome+partnerPay);pr.finance.partnerPaid=round((pr.finance.partnerPaid||0)+partnerPay);payouts.push({id:partner.id,name:partner.name,amount:partnerPay});}
   step.status='done';step.completedAt=now;step.payouts=payouts;
   for(const pay of payouts){const person=s.players[pay.id];person.rep++;person.contractHistory.push({project:pr.def,title:C.projects[pr.def].name,stage:step.title,owner:owner.id,amount:pay.amount,at:now,role:pay.id===owner.id?'host':'partner'});person.contractHistory=person.contractHistory.slice(-80);progress(person,5);}
   log(s,'「'+step.title+'」验收通过：'+payouts.map(pay=>pay.name+' 收到 '+pay.amount+' 经费').join('；')+'。',now,'contract',job.participants);
   if(!current(pr)){pr.completedAt=now;log(s,'横向「'+C.projects[pr.def].name+'」四个阶段全部完成，合同结项。',now,'contract',job.participants);}
  }
  return true;
 }
 function researchWeight(st,start,end){const segments=(st.contractLoads||[]).map(x=>[Math.max(start,x.start),Math.min(end,x.end)]).filter(x=>x[1]>x[0]).sort((a,b)=>a[0]-b[0]);let busy=0,cursor=start;for(const [lo,hi] of segments){const from=Math.max(cursor,lo);busy+=Math.max(0,hi-from);cursor=Math.max(cursor,hi);}return Math.max(.5,round(1-busy/(end-start)*.5));}
 return{initialize,migrate,settle,dispatch,current,quote,researchWeight};
}
module.exports={createContracts};
