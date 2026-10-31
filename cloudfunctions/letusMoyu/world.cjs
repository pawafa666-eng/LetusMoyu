'use strict';
const {randomUUID,randomInt}=require('node:crypto'),D=require('./world-content.cjs'),{fullName}=require('./people.cjs');
const random=()=>randomInt(0,1000000)/1000000,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function cadence(rep,kind,HOUR){return Math.max(kind==='company'?2:1,(kind==='company'?9:6)/(1+Math.max(0,rep)/(kind==='company'?15:12)))*HOUR;}
function waveSize(rep){return Math.min(6,2+Math.floor(Math.max(0,rep)/15));}
function createWorld({check,log,reward,progress,HOUR,getPeople,getOperations,recordActivity}){
 function migrate(s,now){
  for(const p of Object.values(s.players)){p.scene??='campus';p.world??={version:1,positions:{enterprise:0,community:0},offers:[],applicants:[],undergraduates:[],jobs:[],nextCompanyAt:0,nextUndergradAt:0,contacts:0};p.worldWork??=null;
   if(s.lab.level>=2&&!p.world.unlockedAt){p.world.unlockedAt=now;p.world.nextCompanyAt=now+HOUR;p.world.nextUndergradAt=now+HOUR;}
  }
 }
 function companyOffer(s,p,now){
  const c=D.companies[randomInt(D.companies.length)],funding=1000+Math.min(2200,Math.floor(p.rep/5)*100),o={id:randomUUID(),company:c.name,domain:c.domain,title:c.topic,total:funding,cost:Math.ceil(funding*.18),hours:6,createdAt:now,status:'open'};
  p.world.offers.push(o);p.world.offers=p.world.offers.slice(-20);p.world.contacts++;p.world.lastCompanyAt=now;p.world.nextCompanyAt=now+cadence(p.rep,'company',HOUR);log(s,p.name+' 收到 '+c.name+' 的主动合作邀请：「'+o.title+'」。',now,'company',p.id);return o;
 }
 function applicants(s,p,now){
  p.world.lastUndergradAt=now;p.world.nextUndergradAt=now+cadence(p.rep,'undergrad',HOUR);const n=waveSize(p.rep),used=new Set([...p.world.undergraduates,...p.world.applicants].map(x=>x.name));
  for(let i=0;i<n;i++){const id=randomUUID(),domain=['civil','air','cross'][randomInt(3)],name=fullName(id,used);used.add(name);p.world.applicants.push({id,name,domain,createdAt:now,accepted:false,year:['大二','大三','大四'][randomInt(3)],resume:{university:'不急大学',major:domain==='civil'?'智能建造':domain==='air'?'低空交通':'城市智能系统',education:'本科在读',experience:['参加过一项课程设计，负责'+(domain==='civil'?'结构建模与传感验证':domain==='air'?'无人机控制与航线规划':'多源数据融合')+'。','希望加入一支能定期讨论的小队，先完成一项可交付作品。'],achievements:['课程创新展示'],workSample:'附有课程项目记录与一页分工说明。',recommendation:'愿意在实践中学习，也需要老师帮助把目标拆小。',strengths:domain==='civil'?'结构建模、图像与传感':domain==='air'?'电控、航线与低空物流':'编程、数据融合与表达',statement:'希望和同伴把想法做出来。'},_skill:.35+random()*.4});}
  p.world.applicants=p.world.applicants.filter(x=>!x.accepted).slice(-18);
  log(s,p.name+' 的公开成果吸引了 '+n+' 位本科生来报名，请先看看他们的经历。',now,'undergrad',p.id);
 }
 function working(p,kind){return p.world.jobs.some(j=>j.kind===kind&&['working','invited','ready'].includes(j.status));}
 function settle(s,now){
  migrate(s,now);
  for(const p of Object.values(s.players)){
   if(s.lab.level>=2){
    p.world.nextCompanyAt=Math.min(p.world.nextCompanyAt,(p.world.lastCompanyAt||p.world.unlockedAt)+cadence(p.rep,'company',HOUR));let contacts=0;while(p.world.nextCompanyAt<=now&&contacts<2&&p.world.offers.filter(o=>o.status==='open').length<4){companyOffer(s,p,p.world.nextCompanyAt);contacts++;}if(p.world.nextCompanyAt<=now)p.world.nextCompanyAt=now+cadence(p.rep,'company',HOUR);
    p.world.nextUndergradAt=Math.min(p.world.nextUndergradAt,(p.world.lastUndergradAt||p.world.unlockedAt)+cadence(p.rep,'undergrad',HOUR));let waves=0;while(p.world.nextUndergradAt<=now&&waves<2&&p.world.applicants.length<12){applicants(s,p,p.world.nextUndergradAt);waves++;}if(p.world.nextUndergradAt<=now)p.world.nextUndergradAt=now+cadence(p.rep,'undergrad',HOUR);
   }
   for(const j of p.world.jobs){
    if(j.status==='invited'){if(j.expiresAt<=now){j.status='cancelled';const o=p.world.offers.find(o=>o.id===j.offerId);if(o)o.status='open';log(s,'「'+j.title+'」的合作邀请到期，双方未扣费。',now,'company',[p.id,j.partnerId]);}continue;}
    if(j.status!=='working')continue;let finished=0;
    if(j._labor){const st=p.students.find(x=>x.id===j.studentId);finished=getPeople().advanceWork(p,st,j,j._labor.lastAt,now);}
    else if(j.dueAt<=now)finished=j.dueAt;
    if(finished){j.status='ready';j.finishedAt=finished;j.progressPercent=100;release(s,p,j,finished);log(s,'「'+j.title+'」已完成准备，等待'+(j.kind==='competition'?'查看比赛结果':j.kind==='team'?'记录这次团建':'验收交付')+'。',now,j.kind,p.id);}
   }
  }
 }
 function release(s,p,j,at){
  for(const id of j.participants||[])if(s.players[id]?.worldWork?.id===j.id)s.players[id].worldWork=null;
  for(const id of [j.studentId,...(j.studentIds||[])].filter(Boolean)){const st=p.students.find(x=>x.id===id);if(st?.worldWork?.id===j.id){st.worldWork=null;if(j._labor)getPeople().finishWork(st,j._labor,at);const load=st._mind.loads.find(x=>x.jobId===j.id);if(load)load.end=at;}}
 }
 function energy(p,now){check(p.energy>=1,'行动力还在恢复，稍后再来');if(p.energy===5)p.energyAt=now;p.energy--;}
 function availableStudent(p,id){const st=p.students.find(x=>x.id===id&&!x.graduatedAt);check(st,'请选择本组在读学生');check(!st.contractWork&&!st.procurementWork&&!st.worldWork,'这位同学已有外部安排');check(st.wellbeing>=35,'这位同学最近有些疲惫，先聊聊');check(!st.task||!['conference','visit'].includes(st.task.type)||st.task.status==='completed','这位同学正在外出');return st;}
 function start(s,p,j,now,mode,studentId,pace){
  const cost=mode==='outsource'?Math.ceil(j.total*.4):j.cost;check(p.funds>=cost,'科研经费不足，需要 '+cost);
  const participants=mode==='coop'?[p.id,j.partnerId]:[p.id];
  if(['self','coop'].includes(mode))for(const id of participants)check(!s.players[id].worldWork&&!s.players[id].contractWork,(id===p.id?'你':'搭子')+'正在处理另一份工作');
  let st=null;if(mode==='student')st=availableStudent(p,studentId);
  p.funds-=cost;j.paid=cost;j.mode=mode;j.status='working';j.startedAt=now;j.participants=participants;j.studentId=st?.id||null;j.studentName=st?.name||'';
  const speed=j.domain?getOperations().bonus(p,j.domain):0,duration=(mode==='outsource'?2:mode==='coop'?4:j.hours)*HOUR/(1+speed);j.dueAt=now+duration;j.progressPercent=0;
  if(st){st.wellbeing=Math.max(0,st.wellbeing-4);j._labor=getPeople().createWork(p,st,j.kind==='competition'?'research':'contract',duration,now,pace);st.worldWork={id:j.id};getPeople().advanceWork(p,st,j,now,now);}
  if(['self','coop'].includes(mode))for(const id of participants)s.players[id].worldWork={id:j.id,title:j.title};
  log(s,p.name+' 安排「'+j.title+'」：支出 '+cost+' 经费'+(st?'，由'+st.name+'参与准备':'')+'。',now,j.kind,participants);
 }
 function travel(s,p,scene,now){check(D.regions.some(r=>r.id===scene),'请选择有效场景');check(scene==='campus'||s.lab.level>=2,'联合实验室二级后开放新的园区');check(!p.pending,'先完成当前地点的选择');p.scene=scene;log(s,p.name+' 来到「'+D.regions.find(r=>r.id===scene).name+'」。',now,'travel',p.id);}
 function move(s,p,now,rng=random){
  const scene=p.scene,tiles=D.locations[scene],from=p.world.positions[scene],dice=1+Math.floor(rng()*6),to=(from+dice)%tiles.length;p.world.positions[scene]=to;p.lastMove={id:randomUUID(),from,to,dice,steps:dice,at:now,kind:'walk',pendingRoute:false,scene};
  const tile=tiles[to],social=['social','meeting','poster'].includes(tile.type),rest=['team','rest'].includes(tile.type),type=scene==='enterprise'?'company':'undergrad';
  p.pending={type:'world',scene,location:to,title:tile.name,body:scene==='enterprise'?'合作伙伴把现场问题和已有资料放在桌上，邀请你一起看看。':'同学们带着课程作品和新点子来交流，也有人提议一起出去放松。',choices:[{id:'connect',text:type==='company'?'交流需求，看看合作邀请':'聊聊项目，看看本科生报名',cost:0},{id:'visit',text:rest?'安排一段轻松交流 · 20 经费':social?'交流并展示已有工作 · 30 经费':'参加现场小验证 · 40 经费',cost:rest?20:social?30:40},{id:'skip',text:'今天先看看，慢慢来',cost:0}],_roll:rng(),expires:now+12*HOUR};
  log(s,p.name+' 在'+D.regions.find(r=>r.id===scene).name+'前进 '+dice+' 格，到了 '+tile.name+'。',now,'travel',p.id);
 }
 function resolve(s,p,choice,now){
  const m=p.pending,option=m.choices.find(x=>x.id===choice);check(option,'请选择有效的园区回复');check(p.funds>=option.cost,'科研经费不足，本次需要 '+option.cost);p.funds-=option.cost;
  if(choice==='connect'){if(m.scene==='enterprise'){if(p.world.offers.filter(o=>o.status==='open').length<4)companyOffer(s,p,now);else reward(s,p,{r:1},now);}else if(p.world.applicants.length<12)applicants(s,p,now);else reward(s,p,{m:4},now);}
  else if(choice==='visit'){const rest=['team','rest'].includes(D.locations[m.scene][m.location].type);reward(s,p,rest?{m:10,r:1}:m._roll<.25?{p:4,m:3}:{p:12,r:3,m:4},now);}
  else reward(s,p,{m:2},now);log(s,p.name+' 完成了「'+m.title+'」的小交流。',now,'travel',p.id);
 }
 function claim(s,p,j,now){
  check(j.status==='ready','这项活动还没有完成');j.status='completed';j.claimedAt=now;
  if(j.kind==='company'){
   const other=j.mode==='coop'?s.players[j.partnerId]:null,share=other?Math.floor(j.total*j.share/100):0;p.funds+=j.total-share;reward(s,p,{r:4,p:12,m:4},now);j.result='验收通过：'+p.name+' 获得 '+(j.total-share)+' 经费'+(other?'，'+other.name+' 获得 '+share+' 经费':'')+'。';if(other){other.funds+=share;reward(s,other,{r:4,p:10,m:4},now);}
   if(j.studentId){const st=p.students.find(x=>x.id===j.studentId);st.progress=Math.min(st.target,st.progress+8);st.paper.progress=Math.min(100,st.paper.progress+6);st.wellbeing=Math.max(0,st.wellbeing-2);}
  }else if(j.kind==='team'){
   const def=D.teams.find(t=>t.id===j.option);reward(s,p,{m:12,r:def.rep},now);for(const id of j.studentIds){const st=p.students.find(st=>st.id===id);st.wellbeing=Math.min(100,st.wellbeing+def.mood);getPeople().interact(p,st,'listen',now);getPeople().note(st,'参加了「'+def.name+'」，聊了研究之外的事。',now);}j.result='这次团建让大家轻松了一些，经历和交流便笺已保留。';
  }else{
   const def=D.contests.find(c=>c.id===j.option),team=p.world.undergraduates.filter(u=>j.undergradIds.includes(u.id)),skill=team.reduce((v,u)=>v+u._skill*(u.domain===def.domain||def.domain==='cross'?1.2:.85),0)/team.length;
   const chance=clamp(.25+Math.min(.2,p.rep/200)+skill*.35+(j.studentId?.length ? .03 : 0),.25,.85),win=j._roll<chance,top=win&&j._roll<chance*.35,funds=win?(top?def.prize:Math.floor(def.prize*.55)):0,rep=win?(top?15:8):3;reward(s,p,{f:funds,r:rep,m:win?10:3,p:win?15:6},now);
   j.result=top?'获得区域展示奖':win?'获得校级创新奖':'完成参赛与作品展示';j.result+='：经费 +'+funds+'，声望 +'+rep+'。';for(const u of team){u.experiences??=[];u.experiences.push({title:def.name,result:j.result,at:now});}if(j.studentId){const st=p.students.find(st=>st.id===j.studentId);getPeople().note(st,'协助本科生参加「'+def.name+'」，一起完成作品展示。',now);}
  }
  recordActivity(p,null,{type:j.kind,title:j.title,venue:j.kind==='company'?'企业合作园':'创客生活区',summary:j.result},now);for(const id of [j.studentId,...(j.studentIds||[])].filter(Boolean)){const st=p.students.find(st=>st.id===id);recordActivity(p,st,{type:j.kind,title:j.title,venue:j.kind==='company'?'企业合作园':'创客生活区',summary:j.result},now);}p.world.jobs=p.world.jobs.filter(x=>!['completed','cancelled'].includes(x.status)).concat(p.world.jobs.filter(x=>['completed','cancelled'].includes(x.status)).slice(-60));log(s,p.name+' 的「'+j.title+'」：'+j.result,now,j.kind,j.participants||[p.id]);
 }
 function dispatch(s,p,action,payload,now){
  if(!action.startsWith('world_'))return false;
  if(action==='world_travel'){travel(s,p,payload.scene,now);return true;}
  check(s.lab.level>=2,'联合实验室二级后开放园区合作');
  if(action==='world_undergrad_accept'){const u=p.world.applicants.find(u=>u.id===payload.id&&!u.accepted);check(u,'这位本科生已加入或不在报名册');check(p.world.undergraduates.length<12,'本科生小队已满，先陪现有同学完成作品');u.accepted=true;p.world.undergraduates.push(structuredClone(u));log(s,u.name+' 加入了'+p.name+'指导的本科生小队。',now,'undergrad',p.id);return true;}
  if(action==='world_company_start'){
   check(!working(p,'company'),'先完成现有企业合作');const o=p.world.offers.find(o=>o.id===payload.id&&o.status==='open');check(o,'这份企业邀请已被处理');check(['self','student','coop','outsource'].includes(payload.mode),'请选择有效执行方式');const j={id:randomUUID(),kind:'company',offerId:o.id,title:o.company+' · '+o.title,domain:o.domain,total:o.total,cost:o.cost,hours:o.hours,createdAt:now,status:'available'};p.world.jobs.push(j);o.status='accepted';
   if(payload.mode==='coop'){const partner=Object.values(s.players).find(x=>x.id!==p.id),share=Number(payload.share??30);check(partner,'搭子尚未加入');check(Number.isInteger(share)&&share>=10&&share<=50,'合作分账应为 10 到 50');check(p.funds>=j.cost,'科研经费不足');j.partnerId=partner.id;j.share=share;j.status='invited';j.expiresAt=now+12*HOUR;log(s,p.name+' 邀请 '+partner.name+' 合作「'+j.title+'」，约定分账 '+share+'%。',now,'company',[p.id,partner.id]);}
   else{energy(p,now);start(s,p,j,now,payload.mode,payload.studentId,payload.pace);}return true;
  }
  if(action==='world_respond'){let owner=null,j=null;for(const candidate of Object.values(s.players)){const found=candidate.world.jobs.find(j=>j.id===payload.id&&j.status==='invited'&&j.partnerId===p.id);if(found){owner=candidate;j=found;break;}}check(j,'这不是发给你的有效合作邀请');check(typeof payload.accept==='boolean','请选择接受或婉拒');if(payload.accept){energy(owner,now);start(s,owner,j,now,'coop');}else{j.status='cancelled';owner.world.offers.find(o=>o.id===j.offerId).status='open';}return true;}
  if(action==='world_team_start'){
   check(!working(p,'team'),'这次团建还没结束');const def=D.teams.find(x=>x.id===payload.option);check(def,'请选择团建方式');const ids=payload.studentIds;check(Array.isArray(ids)&&ids.length>0&&ids.length<=8&&new Set(ids).size===ids.length,'请选择一至八位本组学生');const students=ids.map(id=>availableStudent(p,id)),cost=def.base+def.perStudent*students.length;check(p.funds>=cost,'科研经费不足，团建需要 '+cost);energy(p,now);p.funds-=cost;const j={id:randomUUID(),kind:'team',title:def.name,option:def.id,status:'working',studentIds:ids,participants:[p.id],paid:cost,startedAt:now,dueAt:now+def.hours*HOUR,createdAt:now};p.world.jobs.push(j);for(const st of students){st.worldWork={id:j.id};st._mind.loads.push({jobId:j.id,start:now,end:j.dueAt,kind:'social',share:1});}log(s,p.name+' 带 '+students.map(st=>st.name).join('、')+' 去「'+def.name+'」，支出 '+cost+' 经费。',now,'team',p.id);return true;
  }
  if(action==='world_competition_start'){
   check(!working(p,'competition'),'先完成当前比赛准备');const def=D.contests.find(x=>x.id===payload.option);check(def,'请选择有效比赛');const ids=payload.undergradIds;check(Array.isArray(ids)&&ids.length>0&&ids.length<=4&&new Set(ids).size===ids.length&&ids.every(id=>p.world.undergraduates.some(u=>u.id===id)),'请选择一至四位已加入的本科生');const j={id:randomUUID(),kind:'competition',title:def.name,option:def.id,undergradIds:ids,total:0,cost:def.cost,hours:def.hours,domain:def.domain,createdAt:now,_roll:random()};energy(p,now);start(s,p,j,now,payload.studentId?'student':'self',payload.studentId,payload.pace);p.world.jobs.push(j);return true;
  }
  const found=Object.values(s.players).flatMap(owner=>owner.world.jobs.map(j=>({owner,j}))).find(x=>x.j.id===payload.id);check(found,'这项园区活动不存在');const{owner,j}=found;
  if(action==='world_claim'){check(owner.id===p.id||j.partnerId===p.id,'你不是这项活动的参与者');claim(s,owner,j,now);return true;}
  if(action==='world_takeover'){check(owner.id===p.id&&j.status==='working'&&j._labor,'只能接手本组学生的在办任务');check(!p.worldWork&&!p.contractWork,'你的工作位正忙');const st=p.students.find(st=>st.id===j.studentId),remaining=Math.max(0,1-j._labor.progress/j._labor.target);getPeople().finishWork(st,j._labor,now);st.worldWork=null;st.wellbeing=Math.min(100,st.wellbeing+3);delete j._labor;j.mode='self';j.studentId=null;j.studentName='';j.dueAt=now+Math.max(60000,j.hours*HOUR*remaining);p.worldWork={id:j.id,title:j.title};return true;}
  if(action==='world_cancel_invite'){check(owner.id===p.id&&j.status==='invited','只能撤回未接受的企业合作');j.status='cancelled';p.world.offers.find(o=>o.id===j.offerId).status='open';return true;}
  check(false,'未知园区操作');
 }
 return{migrate,settle,dispatch,move,resolve,companyOffer,applicants,cadence:(rep,kind)=>cadence(rep,kind,HOUR),waveSize};
}
module.exports={createWorld,cadence,waveSize};
