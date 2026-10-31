'use strict';
const W=require('./wallet.cjs');
const {randomUUID}=require('node:crypto'),D=require('./operations-content.cjs');
const round=n=>Math.round(n*1e6)/1e6;
function createOperations({check,log,progress,HOUR,getPeople=()=>null}){
 const account=now=>({lastAt:now,buffer:0,total:0});
 const current=p=>p.procurement.orders.find(o=>!['completed','cancelled'].includes(o.status));
 const item=id=>D.catalog.find(x=>x.id===id);
 function migrate(s,now){
  for(const p of Object.values(s.players)){
   p.economy??={version:1,salary:account(now),salaryStartAt:s.lab.level>=2?now:0,lastDataAt:0,totalWagesPaid:0,lastStatement:null};
   p.procurement??={orders:[]};p.assets??=[];
   p.career={title:D.careers[Math.min(4,s.lab.level-1)],faculty:s.lab.level>=2,salaryRate:s.lab.level>=2?D.salaryRate:0,leader:s.lab.level>=2?'研究所领导':'导师'};
   for(const st of p.students){st.wage??={...account(now),rate:st.degree==='phds'?2:1};st.procurementWork??=null;}
  }
 }
 function accrue(a,now,rate,cap){if(now<=a.lastAt)return;a.buffer=Math.min(cap,round(a.buffer+(now-a.lastAt)*rate/HOUR));a.lastAt=now;}
 function settle(s,now){
  migrate(s,now);
  for(const p of Object.values(s.players)){
   accrue(p.economy.salary,now,p.career.salaryRate,D.salaryCap);
   for(const st of p.students)accrue(st.wage,now,st.graduatedAt?0:st.wage.rate,D.wageCap);
   for(const a of p.assets)accrue(a.rental,now,a.mode==='rental'?item(a.sku).rent:0,D.rentCap);
   const o=current(p);let finished=0;if(o?.status==='working'){if(o.job._labor){const st=p.students.find(st=>st.id===o.job.studentId);finished=getPeople().advanceWork(p,st,o.job,o.job._labor.lastAt,now);}else if(o.job.dueAt<=now)finished=o.job.dueAt;}if(finished){
    o.status='ready';o.job.finishedAt=finished;
    if(o.job.studentId){const st=p.students.find(x=>x.id===o.job.studentId);if(st){if(st.procurementWork?.jobId===o.job.id)st.procurementWork=null;st.wellbeing=Math.max(0,st.wellbeing-2);if(o.job._labor)getPeople().finishWork(st,o.job._labor,finished);}}
    log(s,p.name+' 的采购「'+item(o.sku).name+'」已完成 '+D.stages[o.stage]+'，等待确认。',now,'procurement',p.id);
   }
  }
 }
 function withdraw(a){const value=Math.floor(a.buffer+1e-7);a.buffer=round(a.buffer-value);a.total+=value;return value;}
 function claim(s,p,now){
  const salary=withdraw(p.economy.salary);W.change(p,salary,'学校副教授及以上职称工资','salary',now);let rental=0;for(const a of p.assets){const n=withdraw(a.rental);rental+=n;W.change(p,n,'校内出租：'+item(a.sku).name,'rental',now,a.id);}

  const students=p.students.filter(st=>Math.floor(st.wage.buffer+1e-7)>0),dues=students.map(st=>Math.floor(st.wage.buffer+1e-7)),due=dues.reduce((a,b)=>a+b,0),budget=Math.min(due,Math.floor(p.funds));
  const paid=dues.map(n=>due?Math.floor(budget*n/due):0);let remainder=budget-paid.reduce((a,b)=>a+b,0);
  for(let i=0;remainder>0&&i<paid.length;i++)if(paid[i]<dues[i]){paid[i]++;remainder--;}
  let wages=0;for(let i=0;i<students.length;i++){const st=students[i],n=paid[i];st.wage.buffer=round(st.wage.buffer-n);st.wage.total+=n;getPeople()?.paid(st,n,dues[i]);W.change(p,-n,'助研劳务：'+st.name+'（'+st.wage.rate+'/小时）','wages',now,st.id);wages+=n;}
  p.economy.totalWagesPaid+=wages;
  if(salary||rental||wages){
   const period=Math.floor(now/HOUR),previous=p.economy.lastStatement;
   const statement=previous?.period===period?previous:{period,at:now,salary:0,rental:0,wages:0,net:0,feedId:null};
   statement.at=now;statement.salary+=salary;statement.rental+=rental;statement.wages+=wages;statement.net+=salary+rental-wages;
   const text=p.name+' 本小时收支：学校工资 +'+statement.salary+'，校内租赁 +'+statement.rental+'，学生劳务 −'+statement.wages+'。';
   const entry=s.feed.find(e=>e.id===statement.feedId);
   if(entry)entry.text=text;else{log(s,text,now,'economy',p.id);statement.feedId=s.feed[0].id;}
   p.economy.lastStatement=statement;
  }
 }
 function promote(s,level,now){
  migrate(s,now);
  for(const p of Object.values(s.players)){if(level===2){p.economy.salary.lastAt=now;p.economy.salaryStartAt=now;}W.change(p,D.grants[level-1],'晋升启动经费：'+D.careers[level-1],'lab',now);}
  log(s,'双方晋升「'+D.careers[level-1]+'」，各获 '+D.grants[level-1]+' 启动经费'+(level===2?'；从此由研究所领导对接，学校工资开始按每小时 20 累计。':'。'),now,'career',Object.keys(s.players));
 }
 function bonus(p,domain){return (p.institute?.teams.some(t=>t.domain===domain||t.domain==='cross')?.12:0)+Math.max(0,...p.assets.filter(a=>a.mode==='research'&&item(a.sku).domain.includes(domain)).map(a=>item(a.sku).speed));}
 function dispatch(s,p,action,payload,now){
  if(action==='student_wage'){
   const st=p.students.find(x=>x.id===payload.id&&!x.graduatedAt);check(st,'请选择本组在读学生');const rate=payload.rate,min=st.degree==='phds'?2:1;
   check(Number.isSafeInteger(rate)&&rate>=min&&rate<=1000,'劳务时薪必须是 '+min+' 到 1000 的整数');st.wage.rate=rate;st.wage.lastAt=now;
   log(s,p.name+' 将'+st.name+'的劳务费设为 '+rate+' 经费/小时，不追溯旧时段。',now,'students',p.id);return true;
  }
  if(action==='asset_mode'){
   const a=p.assets.find(x=>x.id===payload.id);check(a,'这件资产不在你的台账里');check(payload.mode!=='rental'||!s.livingCross?.some(c=>c.assetId===a.id&&c.status==='working'),'资产正在支持两组学生联合采集，完成后再出租');check(['research','rental'].includes(payload.mode),'请选择科研或校内租赁');check(payload.mode!=='rental'||item(a.sku).rent>0,'这项软件不提供校内出租能力');a.mode=payload.mode;
   log(s,p.name+' 将「'+item(a.sku).name+'」设为'+(a.mode==='rental'?'出租给学校。':'科研使用。'),now,'equipment',p.id);return true;
  }
  if(action==='asset_data'){
   check(!p.economy.lastDataAt||now-p.economy.lastDataAt>=2*HOUR,'设备数据采集每两小时一次');const data=Math.max(0,...p.assets.filter(a=>a.mode==='research').map(a=>item(a.sku).data));check(data>0,'请先将有数据能力的已建账资产设为科研模式');
   const before=p.paper.progress+p.paper.bank;progress(p,data);const gained=round(p.paper.progress+p.paper.bank-before);check(gained>0,'论文素材已满，先推进投稿或返修');p.economy.lastDataAt=now;log(s,p.name+' 用采购资产整理了研究数据：论文进度 +'+gained+'。',now,'equipment',p.id);return true;
  }
  if(action==='procure_create'){
   const sku=item(payload.sku);check(sku,'请选择有效的软硬件');check(s.lab.level>=sku.level,'实验室等级还未达到该资产的采购条件');check(!current(p),'先办完或取消当前采购，再立新单');check(!p.assets.some(a=>a.sku===sku.id),'这项资产已经建账，不需要重复采购');
   p.procurement.orders=p.procurement.orders.slice(-23);p.procurement.orders.push({id:randomUUID(),sku:sku.id,stage:0,status:'available',supplier:null,price:0,paid:0,createdAt:now,history:[],job:null});
   log(s,p.name+' 发起了「'+sku.name+'」采购，先找供应商，再走招标与合同流程。',now,'procurement',p.id);return true;
  }
  if(!['procure_start','procure_confirm','procure_cancel','procure_takeover'].includes(action))return false;
  const o=current(p);check(o&&o.id===payload.id,'这份在办采购不存在，请刷新');check(o.stage===payload.stage,'采购阶段已经变化，请刷新');
  if(action==='procure_takeover'){check(o.status==='working'&&o.job.studentId,'只能收回学生正在代办的流程');const st=p.students.find(st=>st.id===o.job.studentId),w=o.job._labor,remaining=w?Math.max(0,1-w.progress/w.target):1,sup=D.suppliers.find(x=>x.id===o.supplier);if(w)getPeople().finishWork(st,w,now);st.procurementWork=null;st.wellbeing=Math.min(100,st.wellbeing+3);o.job={id:randomUUID(),mode:'self',studentId:null,studentName:'',startedAt:now,dueAt:now+Math.max(60000,Math.ceil(120*sup.time*remaining)*60000)};log(s,p.name+' 收回学生代办，自己继续「'+D.stages[o.stage]+'」。',now,'procurement',p.id);return true;}
  if(action==='procure_cancel'){check(!o.paid,'已经付款的采购需要继续完成验收和建账');check(o.status!=='working','先等当前流程完成，再取消未付款采购');o.status='cancelled';log(s,p.name+' 取消了未付款采购，未扣设备款。',now,'procurement',p.id);return true;}
  if(action==='procure_start'){
   check(o.status==='available','当前流程已经安排，请勿重复办理');check(['self','student'].includes(payload.mode),'请选择本人或学生办理');
   let st=null;if(payload.mode==='student'){st=p.students.find(x=>x.id===payload.studentId&&!x.graduatedAt);check(st,'请选择本组在读学生');check(!st.contractWork&&!st.procurementWork&&!st.worldWork,'这位同学正在处理横向或采购');check(st.wellbeing>=35,'这位同学心情偏低，先关心一下再安排采购');check(!st.task||!['conference','visit'].includes(st.task.type)||st.task.status==='completed','这位同学正在参会或访学');}
   if(o.stage===0){const sup=D.suppliers.find(x=>x.id===payload.supplier);check(sup,'请选择供应商');o.supplier=sup.id;o.price=Math.ceil(round(item(o.sku).price*sup.multiplier));}
   if(o.stage===2){check(p.funds>=o.price,'科研经费不足，采购合同需要 '+o.price);W.change(p,-o.price,'签订采购合同：'+item(o.sku).name,'procurement',now,o.id);o.paid=o.price;}
   const sup=D.suppliers.find(x=>x.id===o.supplier),duration=Math.ceil((st?40:120)*sup.time)*60000;o.status='working';o.job={id:randomUUID(),mode:payload.mode,studentId:st?.id||null,studentName:st?.name||'',startedAt:now,dueAt:now+duration};
   if(st){st.procurementWork={orderId:o.id,jobId:o.job.id};st.wellbeing=Math.max(0,st.wellbeing-4);o.job._labor=getPeople().createWork(p,st,'procurement',duration,now,payload.pace);getPeople().advanceWork(p,st,o.job,now,now);}
   log(s,p.name+' 安排'+(st?st.name:'自己')+'办理「'+D.stages[o.stage]+'」'+(o.stage===2?'，合同支付 '+o.paid+' 经费':'')+'。',now,'procurement',p.id);
  }else{
   check(o.status==='ready','当前流程还没办完，暂时不能确认');o.history.push({stage:o.stage,title:D.stages[o.stage],at:now,job:o.job});o.job=null;
   if(o.stage===D.stages.length-1){check(o.paid===o.price&&o.paid>0,'采购合同尚未付款');check(!p.assets.some(a=>a.sku===o.sku),'这项资产已经建账');o.status='completed';o.completedAt=now;p.assets.push({id:randomUUID(),sku:o.sku,mode:'research',price:o.paid,orderId:o.id,registeredAt:now,rental:account(now)});log(s,p.name+' 的「'+item(o.sku).name+'」验收建账完成，已加入科研资产台账。',now,'equipment',p.id);}
   else{o.stage++;o.status='available';}
  }
  return true;
 }
 return{migrate,settle,claim,promote,bonus,dispatch,current};
}
module.exports={createOperations};
