'use strict';
const {randomUUID,createHash,randomInt}=require('node:crypto');
const Data=require('./research-data-v4.cjs');
const seed=s=>createHash('sha256').update(s).digest().readUInt32LE(0)/0x100000000;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
function createSystems({C,log,progress,reward,draw,check,HOUR}){
 const Portfolio=require('./portfolio.cjs').createPortfolio({C,log,progress,check,HOUR});
 function year(s,now){
  if(s.academicYearDays===0)return new Date(now+8*HOUR).getUTCFullYear();
  return 1+Math.max(0,Math.floor((now-s.createdAt)/(s.academicYearDays*24*HOUR)));
 }
 function quota(s){return {masters:s.lab.level>=3?3:2,phds:s.lab.level>=4?2:1,capacity:s.lab.level>=5?6:s.lab.level>=4?5:4};}
 function candidates(p,currentYear){
  const names=['小林','小周','小鹿','小许','小程','小陈','小季','小苏','小岳','小乔'];
  const topics=p.discipline==='civil'?['隧道点云配准','机器人巡检','无人机桥梁建模','结构传感监测','城市数字孪生']:['低空物流航线','起降场规划','空地协同感知','低空通信链路','无人机三维重建'];
  const shift=Math.floor(seed(p.id+':names:'+currentYear)*names.length);
  return Array.from({length:5},(_,i)=>({id:p.id+'-'+currentYear+'-'+i,name:names[(i+shift)%names.length],degree:i<3?'masters':'phds',topic:topics[i],trait:['稳稳推进','擅长整理数据','跨学科好奇心','喜欢做实验','计划很清楚'][i],hired:false}));
 }
 function syncYear(s,p,now){
  const current=year(s,now);
  if(!p.admissions||p.admissions.year!==current)p.admissions={year:current,masters:0,phds:0,candidates:candidates(p,current)};
 }
 function mailInterval(p){return (75+Math.floor(seed(p.id+':interval:'+p.mailSequence)*31))*60_000;}
 function newMail(p,template,at){const rules=Data.mailTemplates.find(t=>t.id===template);return {id:randomUUID(),template,receivedAt:at,readAt:0,repliedAt:0,choice:null,result:'',rules:structuredClone(rules)};}
 function migrate(s,now){
  s.academicYearDays??=Data.yearDays;
  for(const p of Object.values(s.players)){
   if(!p.researchVersion){
    p.patent={phase:'draft',progress:Math.min(36,p.papers*12),total:0,dueAt:0,lastWorkAction:-1};
    p.students=[];p.graduates=0;p.mailSequence=0;p.inbox=[newMail(p,'welcome',now)];
    p.nextMailAt=now+mailInterval(p);p.researchVersion=2;
   }
   syncYear(s,p,now);Portfolio.migrate(s,p,now);
   for(const m of p.inbox)if(!m.rules&&Data.mailTemplates.some(t=>t.id===m.template))m.rules=structuredClone(Data.mailTemplates.find(t=>t.id===m.template));
  }
  s.rulesVersion=4;
 }
 function addIdeas(p,amount){if(p.patent?.phase==='draft')p.patent.progress=clamp(p.patent.progress+amount,0,60);}
 function bonus(p){return p.researchVersion?Math.min(.12,p.papers*.02+p.patent.total*.02+p.graduates*.01):0;}
 function settle(s,now){
  for(const p of Object.values(s.players)){
   syncYear(s,p,now);
   if(p.patent.phase==='review'&&p.patent.dueAt<=now){
    const patentMeta={title:p.patent.title};p.patent.phase='draft';p.patent.progress=0;p.patent.total++;p.funds+=120;p.rep+=3;p.mood=clamp(p.mood+8,0,100);
    Portfolio.recordPatent(s,p,now,patentMeta,true);p.patent.title='';
    log(s,p.name+' 的游戏专利授权了：+120 经费、+3 声望，成果收益增加，技术合作来信已解锁。',now,'patent');
   }
   let generated=0;
   while(p.nextMailAt<=now&&generated<3){
    if(p.inbox.filter(m=>!m.repliedAt).length>=8)break;
    const recent=p.inbox.slice(-3).map(m=>m.template);
    let pool=Data.mailTemplates.filter(m=>m.id!=='welcome'&&(!m.minPapers||p.papers>=m.minPapers)&&(!m.minPatents||p.patent.total>=m.minPatents)&&(!m.minRep||p.rep>=m.minRep)&&!recent.includes(m.id));
    if(!pool.length)pool=Data.mailTemplates.filter(m=>!m.minPapers&&!m.minPatents&&!m.minRep&&m.id!=='welcome');
    const template=pool[Math.floor(seed(p.id+':mail:'+p.mailSequence)*pool.length)];
    p.inbox.push(newMail(p,template.id,p.nextMailAt));p.mailSequence++;p.nextMailAt+=mailInterval(p);generated++;
   }
   if(p.nextMailAt<=now)p.nextMailAt=now+mailInterval(p);
   const replied=p.inbox.filter(m=>m.repliedAt).slice(-24),open=p.inbox.filter(m=>!m.repliedAt);
   p.inbox=[...replied,...open].sort((a,b)=>a.receivedAt-b.receivedAt);
   Portfolio.settle(s,p,now);
   for(const student of p.students.filter(x=>!x.graduatedAt)){
    const ticks=Math.max(0,Math.floor((now-student.lastStudyAt)/(6*HOUR)));
    if(ticks){student.studyBuffer=Math.min(4,student.studyBuffer+ticks);student.lastStudyAt+=ticks*6*HOUR;student.wellbeing=Math.min(80,student.wellbeing+Math.min(ticks,4)*2);}
   }
  }
 }
 function claim(s,p,now){
  let gained=0;
  for(const student of p.students.filter(x=>!x.graduatedAt)){
   const ticks=student.studyBuffer;student.studyBuffer=0;
   const per=student.degree==='masters'?6:5;
   const amount=student.wellbeing<45?Math.ceil(per/2):per;
   const effective=Math.min(ticks,Math.ceil(Math.max(0,student.target-student.progress)/amount));
   Portfolio.advance(s,p,student,ticks,now);
   if(!effective)continue;
   student.progress=Math.min(student.target,student.progress+effective*amount);
   gained+=effective*((student.degree==='masters'?2:3)+(s.lab.level>=5?1:0));
  }
  if(gained){progress(p,gained);log(s,p.name+' 收到学生的研究反馈，论文进度 +'+gained+'。',now,'students');}
 }
 function paperAccepted(s,p,now,manuscript={}){addIdeas(p,12);draw(p);Portfolio.recordPaper(s,p,now,{title:manuscript.title,...manuscript.collaborators},true);}
 function labUpgraded(s,level,now){for(const p of Object.values(s.players)){p.funds+=level*40;p.mood=clamp(p.mood+8,0,100);addIdeas(p,5);}log(s,'升级福利：双方各得 '+level*40+' 经费、8 心情、5 专利灵感；新能力已生效。',now,'lab');}
 function chooseMail(s,p,mail,payload,now,rng=()=>randomInt(0,0x100000000)/0x100000000){
  check(mail,'这封邮件不存在');check(!mail.repliedAt,'这封邮件已经回复过了');
  const template=mail.rules||Data.mailTemplates.find(m=>m.id===mail.template),index=Number(payload.choice),option=template?.choices[index];check(Number.isInteger(index)&&option,'请选择有效的回复');
  const student=payload.studentId?p.students.find(st=>st.id===payload.studentId&&!st.graduatedAt):null;
  if(payload.studentId)check(student,'请选择本组在读学生');
  if(student)check(template.delegate,'这封邮件不能委派学生');
  if(option.assignVisit){check(student,'请为访学选择一位学生');check(!student.task||student.task.status==='completed','这位同学已有进行中的任务');}
  const candidates=option.outcomes||[option],cost=Math.max(option.cost||0,...candidates.map(x=>Math.max(0,-(x.delta?.f||0))));check(p.funds>=cost,'科研经费不足，本次需要 '+cost+' 经费');
  let selected=option;if(option.outcomes){let roll=rng()*option.outcomes.reduce((a,x)=>a+x.weight,0);selected=option.outcomes.at(-1);for(const candidate of option.outcomes){roll-=candidate.weight;if(roll<0){selected=candidate;break;}}}
  const delta=structuredClone(selected.delta||{}),studentBefore=student?{paper:student.paper.progress,mood:student.wellbeing}:null;
  const before={f:p.funds,p:p.paper.progress+p.paper.bank,m:p.mood,r:p.rep,t:p.tutor,idea:p.patent.progress};
  if(student){student.paper.progress=clamp(student.paper.progress+Math.max(0,delta.p||0),0,100);if(student.task?.type==='paper'&&student.task.status==='working'){student.task.progress=student.paper.progress;Portfolio.advance(s,p,student,0,now);}student.wellbeing=clamp(student.wellbeing+(delta.m||0),0,100);delta.p=Math.floor((delta.p||0)/3);delta.m=Math.ceil((delta.m||0)/2);}
  reward(s,p,delta,now);if(delta.idea)addIdeas(p,delta.idea);
  if(Number.isInteger(delta.card)){if(p.hand.length<6)p.hand.push(delta.card);else p.funds+=20;}
  if(delta.studentMood)for(const st of p.students.filter(x=>!x.graduatedAt))st.wellbeing=clamp(st.wellbeing+delta.studentMood,0,100);
  if(option.assignVisit)Portfolio.assign(s,p,student,'visit','云杉理工大学城市智能系统短期访学',false,now,true);
  if((selected.activity||template.activity)==='conference'&&index===0)Portfolio.activity(p,student,{type:'conference',title:template.subject,venue:'城市交叉创新学术交流会',status:selected.kind==='tricked'?'withdrawn':'completed',summary:selected.result},now);
  const after={f:p.funds,p:p.paper.progress+p.paper.bank,m:p.mood,r:p.rep,t:p.tutor,idea:p.patent.progress};
  mail.repliedAt=now;mail.readAt=mail.readAt||now;mail.choice=index;mail.result=selected.result||option.result||'回复已送达。';mail.outcomeKind=selected.kind||'normal';mail.actual=Object.fromEntries(Object.keys(before).map(k=>[k,Math.round((after[k]-before[k])*1e6)/1e6]));
  if(student){mail.attendee={id:student.id,name:student.name};mail.studentActual={paper:student.paper.progress-studentBefore.paper,mood:student.wellbeing-studentBefore.mood};}
  log(s,p.name+' 处理了「'+template.subject+'」：'+option.text+'。'+mail.result,now,'mail');
 }
 function reply(s,p,payload,now,rng){chooseMail(s,p,p.inbox.find(m=>m.id===payload.id),payload,now,rng);}
 function hire(s,p,payload,now){
  const candidate=p.admissions.candidates.find(c=>c.id===payload.id);check(candidate&&!candidate.hired,'这位同学已入组或不在本学年招生册里');
  const limits=quota(s),degree=candidate.degree;check(p.admissions[degree]<limits[degree],'本学年的'+(degree==='masters'?'硕士':'博士')+'指标已用完');
  check(p.students.filter(st=>!st.graduatedAt).length<limits.capacity,'课题组已满，先陪现在的学生完成研究');
  const cost=degree==='masters'?100:160;check(p.funds>=cost,'科研经费不足，入组支持需要 '+cost+' 经费');
  p.funds-=cost;p.admissions[degree]++;candidate.hired=true;
  p.students.push({id:randomUUID(),name:candidate.name,avatarSeed:candidate.id,degree,topic:candidate.topic,trait:candidate.trait,progress:0,target:degree==='masters'?100:150,wellbeing:75,lastStudyAt:now,studyBuffer:0,lastCareAt:0,joinedAt:now,graduatedAt:0});
  Portfolio.initStudent(p.students.at(-1));
  log(s,p.name+' 招收了'+(degree==='masters'?'硕士生':'博士生')+candidate.name+'，方向：'+candidate.topic+'。研究要关心，休息也要关心。',now,'students');
 }
 function care(s,p,payload,now){
  const st=p.students.find(x=>x.id===payload.id&&!x.graduatedAt);check(st,'这位同学不在当前课题组');
  check(!st.lastCareAt||now-st.lastCareAt>=4*HOUR,'刚刚交流过了，让同学自己消化一下，四小时后再来');
  const modes={guide:{p:10,m:3,text:'讨论了下一小步'},listen:{p:3,m:15,text:'聊了聊最近的状态'},sprint:{p:16,m:-12,text:'共同冲刺了一个小目标'}};
  check(Object.hasOwn(modes,payload.mode),'请选择有效的培养方式');const mode=modes[payload.mode];
  if(payload.mode==='sprint'){check(p.funds>=20,'这次小实验需要 20 经费');p.funds-=20;}
  st.progress=Math.min(st.target,st.progress+mode.p);st.wellbeing=clamp(st.wellbeing+mode.m,0,100);st.lastCareAt=now;progress(p,payload.mode==='guide'?3:1);
  Portfolio.advance(s,p,st,1,now,true);
  log(s,p.name+' 和'+st.name+mode.text+'：学生进度 +'+mode.p+'，心情 '+(mode.m>0?'+':'')+mode.m+'。',now,'students');
 }
 function graduate(s,p,payload,now){
  const st=p.students.find(x=>x.id===payload.id&&!x.graduatedAt);check(st,'这位同学已经毕业或不在课题组');check(st.progress>=st.target,'研究还没到终点，继续陪同学一点点做');check(st.wellbeing>=40,'先关心一下同学的状态，再准备毕业');
  check(!st.task||st.task.status==='completed','先处理同学当前的任务，再安排毕业');st.graduatedAt=now;p.graduates++;const phd=st.degree==='phds';p.funds+=phd?200:120;p.rep+=phd?4:2;progress(p,phd?15:8);addIdeas(p,phd?12:8);
  log(s,st.name+' 顺利毕业！'+p.name+' 获得经费、声望和研究灵感，培养成果计入长期收益。',now,'students');
  if(p.students.length>36)p.students=p.students.filter(x=>!x.graduatedAt).concat(p.students.filter(x=>x.graduatedAt).slice(-24));
 }
 function patent(s,p,action,now){
  check(!p.pending,'先完成当前地点的选择');check(p.patent.phase==='draft','专利正在审查，先做别的研究也可以');
  if(action==='patent_work'){
   check(p.actionCount>0&&p.patent.lastWorkAction!==p.actionCount,'每次移动后可以整理一次交底');check(p.patent.progress<60,'交底已经齐了，可以申请');check(p.funds>=40,'整理技术交底需要 40 经费');
   p.funds-=40;addIdeas(p,15);p.patent.lastWorkAction=p.actionCount;
   log(s,p.name+' 整理了技术交底：专利灵感 +15，经费 -40。',now,'patent');
  }else{
   check(p.patent.progress>=60,'专利灵感达到 60 才能申请');check(p.funds>=80,'申请需要 80 经费');p.funds-=80;p.patent.phase='review';p.patent.dueAt=now+(s.lab.level>=4?HOUR:2*HOUR);
   log(s,p.name+' 申请了一项游戏专利，服务器会替你等审查结果。',now,'patent');
  }
 }
 function dispatch(s,p,action,payload,now,rng){
  if(action==='mail_read'){const m=p.inbox.find(x=>x.id===payload.id);check(m,'这封邮件不存在');m.readAt=m.readAt||now;}
  else if(action==='mail_reply')reply(s,p,payload,now,rng);
  else if(action==='student_hire')hire(s,p,payload,now);
  else if(action==='student_care')care(s,p,payload,now);
  else if(action==='student_graduate')graduate(s,p,payload,now);
  else if(action==='patent_work'||action==='patent_submit')patent(s,p,action,now);
  else return Portfolio.dispatch(s,p,action,payload,now);
  return true;
 }
 return {migrate,settle,claim,addIdeas,bonus,quota,paperAccepted,labUpgraded,dispatch,chooseMail,Portfolio};
}
module.exports={createSystems};
