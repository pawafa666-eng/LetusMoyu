'use strict';
const {randomUUID,randomInt}=require('node:crypto');
const journals=[{id:'campus',name:'不急大学开放研究',fee:80},{id:'city',name:'城市智能工程学报',fee:140},{id:'future',name:'空地协同前沿',fee:240}];
const roll=()=>randomInt(0,1000000)/1000000;
function createPeerReview({check,log,HOUR,accept,finishStudent,advanceStudent,onHelp}){
 function letter(decision,discipline,now,round){
  const major=decision==='major',name={major:'Major Revision · 大修',minor:'Minor Revision · 小修',reject:'Reject · 建议换个更合适的交流窗口',proof:'有条件接收 · 等待校样与版面费'}[decision];
  const pool=discipline==='civil'?['请补充点云配准误差的分布，说明复杂现场下的稳定性。','请交代桥隧监测或重建方法的适用边界，并增加一组对比。']:['请补充遮挡条件下的低空通信或航线验证结果。','请说明空地协同方案在不同测试条件下的稳定性。'];
  const comments=decision==='proof'||decision==='reject'?[]:[...pool.slice(0,major?2:1),major?'请增加一次独立验证，并说明数据筛选标准。':'图例与字号请统一，Reviewer 2 终于没有要求换颜色。'];
  return{id:randomUUID(),round,decision,title:name,at:now,body:decision==='proof'?'各位作者：稿件已完成本轮学术审查。请核对校样并支付本刊明示版面费，完成后正式发表。':decision==='reject'?'各位作者：本稿与当前专题范围仍有距离。建议保留已有工作，补充说明后选择更合适的窗口再次投稿。':'各位作者：感谢投稿。请根据下列意见逐条回复，并在完成返修后提交。返修没有倒计时，请按自己的节奏推进。',comments:comments.map((text,i)=>({id:randomUUID(),reviewer:'Reviewer '+(i===0?1:2),text,response:'',approach:'',handledAt:0}))};
 }
 function migrate(s,now){
  for(const p of Object.values(s.players)){const m=p.paper;m.reviewHistory??=[];m.journal??='campus';m.reviewVersion=1;
   if(['major','minor'].includes(m.phase)&&!m.reviewHistory.length)m.reviewHistory.push(letter(m.phase,p.discipline,now,m.round||0));
   for(const st of p.students){const t=st.task;if(t?.type==='paper'&&t.status==='review'&&!t.reviewVersion){t.reviewVersion=1;t.reviewHistory=[];t.round=0;t.journal='campus';t.fee=80;t._reviewRoll=roll();}}
  }
 }
 function decision(m,r){if(!m.reviewHistory.length||m.round===0)return r<.48?'major':r<.92?'minor':'reject';return m.reviewHistory.at(-1)?.decision==='major'&&r<.55?'minor':'proof';}
 function settleMentor(s,p,now){
  const m=p.paper;if(m.phase!=='review'||m.reviewAt>now)return;const d=decision(m,m.reviewRoll);m.reviewHistory.push(letter(d,p.discipline,now,m.round||0));m.reviewHistory=m.reviewHistory.slice(-8);
  if(d==='reject'){m.phase='draft';m.progress=Math.min(100,60+m.bank);m.bank=0;m.required=0;}
  else if(d==='proof'){m.phase='proof';m.progress=100;m.required=100;m.fee=journals.find(j=>j.id===m.journal).fee;}
  else{m.phase=d;m.required=d==='major'?30:15;m.progress=0;}
  log(s,p.name+' 收到编辑来信：'+m.reviewHistory.at(-1).title+(d==='proof'?'，版面费 '+m.fee+'，付款后正式发表。':'。'),now,'paper',p.id);
 }
 function submit(s,p,now,rng=roll){
  const m=p.paper;check(!['review','proof'].includes(m.phase),'论文正在审稿或等待发表，请先处理当前稿件');const revision=['major','minor'].includes(m.phase);
  check(m.progress>=(revision?m.required:100),'进度还没有完成');
  if(revision)check(m.reviewHistory.at(-1)?.comments.every(c=>c.handledAt),'请先逐条处理当前审稿意见，再提交返修');
  const old=m.phase;m.phase='review';m.reviewAt=now+(old==='minor'?.5:old==='major'?1:2)*HOUR;m.round=revision?(m.round||0)+1:0;m.reviewRoll=rng();m.fee=journals.find(j=>j.id===m.journal).fee;
  log(s,p.name+(revision?' 提交了逐条回复与返修稿。':' 投稿了论文；收到意见后再慢慢处理。'),now,'paper',p.id);
 }
 function submitStudent(t,now,revision=false){t.status='review';t.reviewVersion=1;t.reviewHistory??=[];t.round=revision?(t.round||0)+1:0;t.journal??='campus';t.fee=journals.find(j=>j.id===t.journal).fee;t._reviewRoll=roll();t.dueAt=now+(revision?1:2)*HOUR;}
 function settleStudent(s,p,st,now){
  const t=st.task;if(!t||t.type!=='paper'||t.status!=='review'||t.dueAt>now)return;
  const d=decision(t,t._reviewRoll??roll());t.reviewHistory.push(letter(d,p.discipline,now,t.round||0));t.reviewHistory=t.reviewHistory.slice(-8);
  if(d==='reject'){t.status='working';t.progress=60;t.target=100;st.paper.progress=60;}
  else if(d==='proof'){t.status='proof';t.progress=t.target=100;t.dueAt=0;}
  else{t.status='revision';t.progress=0;t.target=d==='major'?30:15;t.dueAt=0;}
  log(s,st.name+' 的论文收到 '+t.reviewHistory.at(-1).title+(d==='proof'?'，等待老师核对并支付 '+t.fee+' 版面费。':'，意见已保存在学生任务中。'),now,'paper',p.id);
 }
 function finishStudentRevision(t,now){for(const c of t.reviewHistory.at(-1).comments){c.response=c.response||'已补充相应材料，并在返修稿中说明处理结果。';c.handledAt=c.handledAt||now;}submitStudent(t,now,true);}
 function dispatch(s,p,action,payload,now){
  if(action==='paper_journal'){check(p.paper.phase==='draft','当前稿件已进入审稿，请在下一次投稿前选期刊');check(journals.some(j=>j.id===payload.journal),'请选择有效的虚构期刊');p.paper.journal=payload.journal;return true;}
  if(action==='paper_response'){
   const m=p.paper;check(['major','minor'].includes(m.phase),'当前没有需要处理的返修意见');const c=m.reviewHistory.at(-1).comments.find(c=>c.id===payload.id);check(c,'这条意见不属于当前返修轮次');
   const options={analyse:{cost:10,progress:3,text:'补充分析并交代结果'},rerun:{cost:20,progress:5,text:'重新验证并补充说明'},explain:{cost:0,progress:1,text:'澄清边界与现有证据'}};check(options[payload.approach],'请选择处理方式');const option=options[payload.approach];
   const response=String(payload.response||'').trim().slice(0,600);check(response.length>=8,'请填写至少八个字的回复说明');check(!c.handledAt,'这条意见已处理，不能重复领取返修进度');check(p.funds>=option.cost,'科研经费不足，本次处理需要 '+option.cost);
   p.funds-=option.cost;m.progress=Math.min(m.required,m.progress+option.progress);c.response=response;c.approach=payload.approach;c.handledAt=now;return true;
  }
  if(action==='paper_publish'){const m=p.paper;check(m.phase==='proof','论文还没有完成审稿与返修');check(p.funds>=m.fee,'科研经费不足，版面费需要 '+m.fee);p.funds-=m.fee;m.paidFee=m.fee;accept(s,p,now);return true;}
  if(!['student_publish','student_review_help'].includes(action))return false;
  const st=p.students.find(x=>x.id===payload.id&&!x.graduatedAt),t=st?.task;check(t?.type==='paper','请选择本组正在处理论文的学生');
  if(action==='student_publish'){check(t.status==='proof','学生论文尚未进入待发表阶段');check(p.funds>=t.fee,'科研经费不足，学生论文版面费需要 '+t.fee);p.funds-=t.fee;t.paidFee=t.fee;finishStudent(s,p,st,now);}
  else{check(t.status==='revision','当前不在返修阶段');const latest=t.reviewHistory.at(-1);check(!latest.helpedAt,'这一轮已经协助过返修');check(p.funds>=20,'协助补充验证需要 20 经费');p.funds-=20;latest.helpedAt=now;onHelp(p,st,now);advanceStudent(s,p,st,8,now);}
  return true;
 }
 return{migrate,settleMentor,submit,submitStudent,settleStudent,finishStudentRevision,dispatch,journals};
}
module.exports={createPeerReview,journals};
