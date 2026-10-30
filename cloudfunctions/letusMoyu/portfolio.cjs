'use strict';
const {randomUUID,createHash}=require('node:crypto');
const Data=require('./research-data-v4.cjs');
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const safe=(s,max=120)=>String(s||'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,max);
function createPortfolio({C,log,progress,check,HOUR}){
 function name(p){return p.profile?.name||p.name;}
 function title(p,kind,n,student,collaborative=false){
  const topics=collaborative?['无人机桥梁巡检','空地协同城市感知','低空基础设施数字孪生']:p.discipline==='civil'?['隧道多源点云配准','机器人结构巡检','地下空间三维重建','智慧桥梁监测']:['城市低空物流调度','低空通信与导航','无人机三维建模','起降场协同感知'];
  const topic=student?.topic||topics[(n-1)%topics.length];
  return kind==='paper'?['面向复杂场景的'+topic+'方法研究',topic+'的数据融合与验证',topic+'的协同建模及应用'][Math.floor((n-1)/topics.length)%3]:'一种用于'+topic+'的方法与系统';
 }
 function authorList(s,p,studentIds=[],partner=false){
  const authors=[{id:p.id,name:name(p),role:'teacher'}];
  for(const id of studentIds){const st=p.students.find(x=>x.id===id);if(st)authors.push({id:st.id,name:st.name,role:'student'});}
  const q=partner&&Object.values(s.players).find(x=>x.id!==p.id);if(q)authors.push({id:q.id,name:name(q),role:'partner'});
  return authors;
 }
 function trim(p){const selected=new Set(p.representatives);if(p.portfolio.papers.length>200)p.portfolio.papers=p.portfolio.papers.filter(w=>selected.has(w.id)).concat(p.portfolio.papers.filter(w=>!selected.has(w.id)).slice(-195));p.portfolio.patents=p.portfolio.patents.slice(-200);p.portfolio.activities=p.portfolio.activities.slice(-100);}
 function initStudent(st){st.avatarSeed??=st.id;st.plan??='先做一个可完成的小目标，再逐步整理成论文。';st.paper??={progress:0,total:0};st.patent??={progress:0,total:0};st.activities??=[];st.task??=null;st.taskHistory??=[];}
 function migrate(s,p,now){
  if(!p.portfolio){
   p.profile={name:p.discipline==='air'?'Yizi':p.name==='点云博士'?'fafa':p.name,school:'不急大学',research:p.discipline==='air'?'低空经济、无人机、低空交通与空地协同':'土木工程、智能建造、三维重建与基础设施监测',bio:'在不急大学开展研究，也和搭子一起经营一个小小的科研园区。'};
   if(p.discipline==='air'&&p.name==='起飞博士')p.name='Yizi';
   if(p.discipline==='civil'&&p.name==='点云博士')p.name='fafa';
   p.portfolio={papers:[],patents:[],activities:[]};p.representatives=[];p.threadSummaries=[];
   for(let i=0;i<p.papers;i++)p.portfolio.papers.push({id:'legacy-paper-'+p.id+'-'+i,title:title(p,'paper',i+1),authors:authorList(s,p),journal:'不急大学研究通讯',publishedAt:0,source:'legacy',status:'published'});
   for(let i=0;i<p.patent.total;i++)p.portfolio.patents.push({id:'legacy-patent-'+p.id+'-'+i,title:title(p,'patent',i+1),authors:authorList(s,p),number:'MOYU-LEGACY-'+(i+1),publishedAt:0,source:'legacy',status:'granted'});
  }
  for(const st of p.students){initStudent(st);st.paper.total=Math.max(st.paper.total,p.portfolio.papers.filter(w=>w.authors.some(a=>a.id===st.id)).length);st.patent.total=Math.max(st.patent.total,p.portfolio.patents.filter(w=>w.authors.some(a=>a.id===st.id)).length);}
  p.archiveVersion=4;
 }
 function recordPaper(s,p,now,meta={},counted=false){
  const ids=meta.studentIds||(meta.student?[meta.student.id]:[]),authors=authorList(s,p,ids,meta.partner);
  const work={id:randomUUID(),title:safe(meta.title)||title(p,'paper',p.papers+(counted?0:1),meta.student,meta.partner),authors,journal:['不急大学研究通讯','Future Campus Systems','城市智能与空地协同'][p.portfolio.papers.length%3],publishedAt:now,source:meta.student?'student':'self',status:'published'};
  p.portfolio.papers.push(work);if(!counted)p.papers++;for(const id of new Set(ids)){const st=p.students.find(x=>x.id===id);if(st){initStudent(st);st.paper.total++;}}
  if(meta.partner){const q=Object.values(s.players).find(x=>x.id!==p.id);if(q){q.portfolio.papers.push(structuredClone(work));q.papers++;q.rep++;trim(q);}}
  trim(p);return work;
 }
 function recordPatent(s,p,now,meta={},counted=false){
  const work={id:randomUUID(),title:safe(meta.title)||title(p,'patent',p.patent.total+(counted?0:1),meta.student),authors:authorList(s,p,meta.student?[meta.student.id]:[],false),number:'MOYU-'+new Date(now).getUTCFullYear()+'-'+randomUUID().slice(0,8).toUpperCase(),publishedAt:now,source:meta.student?'student':'self',status:'granted'};
  p.portfolio.patents.push(work);if(!counted)p.patent.total++;if(meta.student)meta.student.patent.total++;trim(p);return work;
 }
 function activity(p,st,record,now){const a={id:randomUUID(),at:now,status:'completed',...record};if(st){initStudent(st);st.activities.push(a);st.activities=st.activities.slice(-40);}else{p.portfolio.activities.push(a);trim(p);}return a;}
 function finishTask(s,p,st,now){
  const task=st.task;if(!task||task.status==='completed')return;task.status='completed';task.completedAt=now;
  if(task.type==='paper'){const w=recordPaper(s,p,now,{title:task.title,student:st,partner:task.partner});task.workId=w.id;st.paper.progress=0;p.credits++;p.rep+=3;p.funds+=80;progress(p,8);log(s,st.name+' 的论文「'+w.title+'」发表，'+name(p)+' 与学生进入作者名单。',now,'paper');}
  else if(task.type==='patent'){const w=recordPatent(s,p,now,{title:task.title,student:st});task.workId=w.id;st.patent.progress=0;p.rep+=2;p.funds+=80;log(s,st.name+' 完成的专利「'+w.title+'」已授权，收入课题组成果。',now,'patent');}
  else{
   const visit=task.type==='visit',conference=task.type==='conference';
   st.progress=Math.min(st.target,st.progress+(visit?20:conference?12:10));st.wellbeing=clamp(st.wellbeing+(visit?8:5),0,100);progress(p,visit?8:conference?5:12);p.rep+=visit?2:1;
   activity(p,st,{type:task.type,title:task.title,venue:visit?'云杉理工大学':conference?'不急大学学术交流中心':'不急大学',summary:visit?'完成短期境外访学与方法交流。':conference?'参加学术报告并整理交流笔记。':'完成研究小目标并整理结果。'},now);
   log(s,st.name+' 完成了「'+task.title+'」，经历已写入学生履历。',now,'students');
  }
  st.taskHistory.push(structuredClone(task));st.taskHistory=st.taskHistory.slice(-24);
 }
 function settle(s,p,now){
  for(const st of p.students.filter(x=>!x.graduatedAt)){
   initStudent(st);const t=st.task;if(!t||t.status==='completed')continue;
   if(['conference','visit'].includes(t.type)){t.progress=Math.min(t.target,Math.floor((now-t.createdAt)/(t.dueAt-t.createdAt)*t.target));if(now>=t.dueAt)finishTask(s,p,st,now);}
   else if(t.status==='review'&&now>=t.dueAt)finishTask(s,p,st,now);
  }
 }
 function advance(s,p,st,ticks,now,care=false){
  initStudent(st);const t=st.task;
  if(!t||t.status==='completed'){if(!care)st.paper.progress=Math.min(100,Math.round((st.paper.progress+ticks*2)*10)/10);return;}
  if(t.status!=='working'||['conference','visit'].includes(t.type))return;
  const raw=care?4:t.type==='paper'?(st.degree==='phds'?12:10):12,per=st.wellbeing<45?Math.ceil(raw/2):raw;
  t.progress=Math.min(t.target,Math.round((t.progress+ticks*per)*10)/10);
  if(t.type==='paper')st.paper.progress=t.progress;if(t.type==='patent')st.patent.progress=t.progress;
  if(t.progress>=t.target){if(t.type==='research')finishTask(s,p,st,now);else{t.status='review';t.dueAt=now+(t.type==='paper'?2:1)*HOUR;log(s,st.name+' 的「'+t.title+'」已提交，等待'+(t.type==='paper'?'游戏审稿':'游戏授权')+'。',now,'students');}}
 }
 function assign(s,p,st,type,rawTitle,partner,now,paid=false){
  initStudent(st);const def=Data.tasks.find(x=>x.id===type);check(def,'请选择有效的学生任务');check(!st.graduatedAt,'这位同学已毕业');
  check(!st.task||st.task.status==='completed','这位同学已有进行中的任务，请先完成或取消');if(!paid){check(p.funds>=def.cost,'科研经费不足');p.funds-=def.cost;}
  const initial=type==='paper'?st.paper.progress:type==='patent'?st.patent.progress:0;
  if(['visit','conference'].includes(type))check(!st.contractWork,'这位同学正在做横向，请完成后再安排出行');
  st.task={id:randomUUID(),type,title:safe(rawTitle)||(['paper','patent'].includes(type)?title(p,type,p.portfolio[type==='paper'?'papers':'patents'].length+1,st,partner):type==='visit'?'云杉理工大学城市智能系统短期访学':type==='conference'?'城市智能与低空交叉学术报告':'多源研究数据分析小目标'),progress:initial,target:def.target||100,status:'working',createdAt:now,dueAt:def.hours?now+def.hours*HOUR:0,partner:!!partner};
  log(s,name(p)+' 给'+st.name+'安排了「'+st.task.title+'」。',now,'students');if(initial>=st.task.target)advance(s,p,st,0,now);
 }
 function configure(s,p,payload){
  check(p.paper.phase!=='review','论文已投稿，作者信息需在下一份稿件准备时设置');
  const ids=payload.studentIds??[];check(Array.isArray(ids)&&ids.length<=2&&new Set(ids).size===ids.length&&ids.every(id=>p.students.some(st=>st.id===id)),'请选择本组至多两位学生作者');
  const partner=!!payload.partner;check(!partner||Object.keys(s.players).length===2,'搭子尚未加入');
  p.paper.title=safe(payload.title)||title(p,'paper',p.papers+1,ids.length?p.students.find(x=>x.id===ids[0]):undefined,partner);p.paper.collaborators={studentIds:ids,partner};
 }
 function dispatch(s,p,action,payload,now){
  if(action==='paper_configure')configure(s,p,payload);
  else if(action==='profile_update'){p.profile={name:safe(payload.name,24)||name(p),school:'不急大学',research:safe(payload.research,200)||p.profile.research,bio:safe(payload.bio,500)};p.name=p.profile.name;}
  else if(action==='representatives'){const ids=payload.ids;check(Array.isArray(ids)&&ids.length<=5&&new Set(ids).size===ids.length&&ids.every(id=>p.portfolio.papers.some(w=>w.id===id)),'代表作最多五篇，且必须来自已发表论文');p.representatives=[...ids];}
  else if(['student_task','student_plan','student_cancel'].includes(action)){
   const st=p.students.find(x=>x.id===payload.id&&!x.graduatedAt);check(st,'这位同学不在当前课题组');
   if(action==='student_plan')st.plan=safe(payload.plan,400);
   else if(action==='student_cancel'){check(st.task&&st.task.status==='working','当前任务不能取消');st.task.status='cancelled';st.task.completedAt=now;st.taskHistory.push(structuredClone(st.task));st.taskHistory=st.taskHistory.slice(-24);st.task=null;log(s,name(p)+' 与'+st.name+' 调整了任务，已支付的活动支持费不退。',now,'students');}
   else assign(s,p,st,payload.type,payload.title,payload.partner,now);
  }else return false;
  return true;
 }
 return {migrate,initStudent,recordPaper,recordPatent,activity,settle,advance,assign,dispatch,name,title};
}
module.exports={createPortfolio};
