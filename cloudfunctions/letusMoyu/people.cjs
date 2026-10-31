'use strict';
const {randomUUID,randomInt,createHash}=require('node:crypto');
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),round=n=>Math.round(n*1e6)/1e6;
const surnames=['程','温','姜','许','周','林','陆','沈','何','苏','孟','秦','韩','夏','陈','魏','宋','方','叶','唐','顾','江','季','徐'];
const given=['见山','知序','予宁','有数','亦航','见微','图南','不急','问渠','知遥','未迟','知行','方圆','听澜','予成','星野','以安','时序','向晚','怀川','景明','嘉树','清和','望舒'];
const kinds=['paper','patent','contract','procurement','research','social'];
const schools=['云杉理工大学','南溪交通大学','海岚科技大学','临江工程大学','星港航空学院','青原大学'];
const profiles=[
 {kind:'paper',claim:'沉静的写作型',skill:'文献梳理、实验表达与论文写作',sample:'提供了本科课题的图表修改记录和一页方法说明。',ref:'会把讨论记成清楚的文字，遇到不确定结论时愿意追问。'},
 {kind:'patent',claim:'点子很多的发明型',skill:'方案设计、专利检索与技术交底',sample:'展示过一套低成本巡检支架，附有迭代草图和测试照片。',ref:'喜欢把问题拆成可以制造的部件，长篇写作还在练习。'},
 {kind:'contract',claim:'愿意下现场的实干型',skill:'现场采集、联调与项目交付',sample:'给出了两次外业日志、设备清单和异常数据核查表。',ref:'愿意把现场问题带回来讨论，交付前通常会再检查一次。'},
 {kind:'procurement',claim:'条理清楚的协调型',skill:'材料归档、对接协调与办事流程',sample:'提供了竞赛物资表、报价比选表与版本整齐的活动材料。',ref:'材料一般找得到原件，也会主动确认下一位需要什么。'},
 {kind:'research',claim:'好奇的探索型',skill:'数据分析、复现实验与跨方向探索',sample:'附有一段可运行的分析脚本、失败实验记录和复现说明。',ref:'愿意从小问题试起，思路常常来自不同领域的碰撞。'},
 {kind:'social',claim:'温和的团队型',skill:'团队沟通、报告表达与共同推进',sample:'提交了竞赛分工记录、公开汇报页及同伴反馈。',ref:'遇到卡点通常愿意说出来，也会关心同伴的节奏。'}
];
const rand=()=>randomInt(0,1000000)/1000000;
function fullName(id,used=new Set()){const seed=createHash('sha256').update(id).digest().readUInt32LE(0);for(let i=0;i<576;i++){const n=surnames[(seed+i)%24]+given[(Math.floor(seed/24)+Math.floor(i/24))%24];if(!used.has(n))return n;}return surnames[seed%24]+given[seed%24]+'安';}
function mind(degree,allowTrap=true){
 const def=profiles[randomInt(profiles.length)],trap=allowTrap&&rand()<.14,affinities=Object.fromEntries(kinds.map(k=>[k,.83+rand()*.22]));affinities[def.kind]=1.35+rand()*.2;
 return {version:1,key:randomUUID(),kind:def.kind,trap,capacity:(degree==='phds'?29:25)+rand()*7,ethic:trap?.08:1,initiative:.7,energy:78,relation:60,payTrust:1,drive:rand()*.12,affinities,traits:{focus:45+rand()*25,openness:45+rand()*25,social:def.kind==='social'?80:35+rand()*35},naturalDifficulty:1.8+rand()*.5,lastAt:0,lastNoteAt:0,loads:[],label:def.claim};
}
function resume(p,c,m){
 const def=profiles.find(x=>x.kind===m.kind),university=schools[randomInt(schools.length)],major=p.discipline==='civil'?'土木工程与智能建造':'飞行器与低空交通';
 return {university,major,education:c.degree==='phds'?'本科及硕士研究经历':'本科研究经历',experience:m.trap?['参与多个课题申报，主要负责讨论与汇报。','在团队中协助协调，具体实现材料暂未附上。']:[major+'方向本科毕业设计，承担数据整理与一项独立验证。','参加校级创新项目，负责'+def.skill.split('、')[0]+'。'],achievements:m.trap?['简历列有多次团队获奖，未说明个人承担部分。']:['校级创新实践优秀展示','完成一份可以复查的研究作品'],workSample:m.trap?'作品链接暂不可访问，表示入组后可以补充。':def.sample,recommendation:m.trap?'表达积极，参与讨论较多；建议进一步确认独立交付经历。':def.ref,statement:m.trap?'希望加入一个方向明确、分工完善的团队，等安排齐全后再集中投入。':'希望先把一个小问题做完整，也愿意逐步练习不熟悉的工作。',strengths:def.skill,impression:def.claim,interview:[]};
}
function makeCandidates(p,year){const used=new Set(p.students?.map(st=>st.name)||[]);const topics=p.discipline==='civil'?['隧道点云配准','机器人巡检','无人机桥梁建模','结构传感监测','城市数字孪生']:['低空物流航线','起降场规划','空地协同感知','低空通信链路','无人机三维重建'];return Array.from({length:5},(_,i)=>{const c={id:p.id+'-'+year+'-'+i,degree:i<3?'masters':'phds',topic:topics[i],hired:false};c.name=fullName(c.id,used);used.add(c.name);c._mind=mind(c.degree);c.resume=resume(p,c,c._mind);c.trait=c.resume.impression;return c;});}
function createPeople({check,log,HOUR,advanceTask,teacherProgress}){
 function note(st,text,at){st.observations??=[];st.observations.push({id:randomUUID(),text,at});st.observations=st.observations.slice(-12);}
 function initStudent(p,st,now,candidate){
  if(!st._mind){st._mind=candidate?structuredClone(candidate._mind):mind(st.degree,false);st._mind.lastAt=now;st._mind.loads=[];st.resume=candidate?structuredClone(candidate.resume):resume(p,st,st._mind);st.observations=[];st.personality=st.resume.impression;st._mind.label=st.personality;st._mind.lastNoteAt=now;}
  st.worldWork??=null;st.researchPace??='还在熟悉新的研究节奏。';
 }
 function migrate(s,now){
  const used=new Set(Object.values(s.players).flatMap(p=>p.students.map(st=>st.name)).filter(n=>!/^小./.test(n))),renames=new Map();
  for(const p of Object.values(s.players))for(const st of p.students){if(/^小./.test(st.name)){const old=st.name;st.name=fullName(st.id,used);used.add(st.name);renames.set(st.id,{old,name:st.name});}initStudent(p,st,now);}
  for(const p of Object.values(s.players)){
   for(const c of p.admissions.candidates){if(!c._mind){c._mind=mind(c.degree);c.resume=resume(p,c,c._mind);c.trait=c.resume.impression;}if(/^小./.test(c.name)){const student=p.students.find(st=>renames.get(st.id)?.old===c.name&&c.hired);c.name=student?.name||fullName(c.id,used);used.add(c.name);}}
   for(const w of [...p.portfolio.papers,...p.portfolio.patents])for(const author of w.authors){if(renames.has(author.id))author.name=renames.get(author.id).name;}
  }
  for(const p of Object.values(s.players)){const o=p.procurement?.orders.find(o=>o.status==='working'&&o.job?.studentId);if(o&&!o.job._labor&&o.job.dueAt>now){const st=p.students.find(st=>st.id===o.job.studentId);o.job._labor=createWork(p,st,'procurement',o.job.dueAt-now,now);}}
  for(const pr of Object.values(s.projects)){const step=pr.contract?.steps.find(x=>x.status==='working'&&x.job?.mode==='student'),job=step?.job;if(job&&!job._labor&&job.dueAt>now){const p=s.players[pr.owner],st=p.students.find(st=>st.id===job.studentId);job._labor=createWork(p,st,'contract',job.dueAt-now,now);}}
  s.peopleVersion=1;
 }
 function motivation(st){const m=st._mind,min=st.degree==='phds'?2:1,rate=st.wage?.rate||min;return clamp(.2+st.wellbeing/100*.23+m.relation/100*.22+Math.min(3,rate/min)/3*.2+m.payTrust*.1+m.drive,.03,1);}
 function labor(st){const m=st._mind;return m.capacity*(.35+.65*m.initiative)*(.55+.45*m.energy/100)*(.65+st.wellbeing/200)*m.ethic;}
 function fraction(pace='balanced'){return {gentle:.45,balanced:.62,focused:.78}[pace]||.62;}
 function rate(st,kind,difficulty,share){return Math.max(0,labor(st)*share*(st._mind.affinities[kind]||1)-difficulty);}
 function createWork(p,st,kind,duration,now,pace='balanced'){
  initStudent(p,st,now);const work={id:randomUUID(),kind,difficulty:kind==='procurement'?4.2:5.1,target:Math.max(.05,duration/HOUR*1.3),progress:0,pace:['gentle','balanced','focused'].includes(pace)?pace:'balanced',lastAt:now};
  st._mind.loads.push({jobId:work.id,start:now,end:Number.MAX_SAFE_INTEGER,kind,share:fraction(work.pace)});st._mind.loads=st._mind.loads.slice(-60);
  st._mind.energy=clamp(st._mind.energy-(work.pace==='focused'?5:2),0,100);if(work.pace==='gentle')st._mind.relation=Math.min(100,st._mind.relation+1);
  st._mind.traits.focus=clamp(st._mind.traits.focus+1,0,100);note(st,'接下了新的'+({contract:'横向工作',procurement:'办事流程',competition:'比赛支持'}[kind]||'合作任务')+'，自己的研究需要重新安排节奏。',now);
  return work;
 }
 function finishWork(st,work,at){if(!work)return;const load=st._mind.loads.find(x=>x.jobId===work.id);if(load)load.end=at;st._mind.affinities[work.kind]=clamp((st._mind.affinities[work.kind]||1)+.025,.5,1.8);}
 function advanceWork(p,st,job,start,end){
  const w=job._labor;if(!w||end<start)return 0;const speed=rate(st,w.kind,w.difficulty,fraction(w.pace)),perMs=speed/(6*HOUR),left=w.target-w.progress;
  const finish=perMs>0&&left<=perMs*(end-start)?start+left/perMs:0;w.progress=Math.min(w.target,w.progress+Math.max(0,end-start)*perMs);w.lastAt=end;job.progressPercent=round(w.progress/w.target*100);job.stalled=speed<=0;job.dueAt=finish|| (speed>0?end+(w.target-w.progress)/perMs:0);
  return finish;
 }
 function settle(s,now){
  for(const p of Object.values(s.players))for(const st of p.students.filter(x=>!x.graduatedAt)){
   const m=st._mind;if(!m||now<=m.lastAt)continue;const from=m.lastAt,boundaries=[from,now,...m.loads.flatMap(l=>[l.start,l.end]).filter(t=>t>from&&t<now)].sort((a,b)=>a-b);let own=0,task=0,busyHours=0;
   for(let i=0;i<boundaries.length-1;i++){const a=boundaries[i],b=boundaries[i+1],load=m.loads.filter(l=>l.start<=a&&l.end>a).reduce((v,l)=>Math.max(v,l.share),0),hours=(b-a)/HOUR,remaining=1-load;busyHours+=hours*load;
    const ownShare=(st.task&&!['completed','proof'].includes(st.task.status)?.45:.7)*remaining;own+=rate(st,'research',m.naturalDifficulty,ownShare)*hours/6;
    const t=st.task;if(t&&!['completed','proof'].includes(t.status)&&!['visit','conference'].includes(t.type)){const diff=t._difficulty??(t._difficulty= t.type==='paper'?6+rand()*1.5:t.type==='patent'?4.5+rand():4+rand());const gain=rate(st,t.type,diff,.55*remaining)*hours/6;task+=gain;advanceTask(s,p,st,gain,b,a);}
   }
   const previous=st.progress;st.progress=Math.min(st.target,round(st.progress+own));if(!st.task||st.task.status==='completed')st.paper.progress=Math.min(100,round(st.paper.progress+own*.3));
   const hrs=(now-from)/HOUR;m.energy=clamp(m.energy+Math.min(hrs,48)*.65-Math.min(busyHours,48)*1.2,25,100);m.initiative=motivation(st);m.lastAt=now;
   st.researchPace=st.progress>previous?busyHours>0?'外部工作占了一部分时间，个人研究仍在慢慢推进。':'最近的研究在持续积累。':'近期还没有交出新的研究材料，可以聊聊卡在哪里。';
   if(now-m.lastNoteAt>=6*HOUR){note(st,st.researchPace,now);m.lastNoteAt=now;}
   if(st.progress>previous)teacherProgress(p,Math.min(8,(st.progress-previous)*.18));
   refreshPersonality(st);
  }
 }
 function refreshPersonality(st){const m=st._mind,top=kinds.reduce((a,b)=>m.affinities[a]>=m.affinities[b]?a:b),core={paper:'写作型',patent:'发明型',contract:'实干型',procurement:'协调型',research:'探索型',social:'团队型'}[top];const tone=m.energy<42?'有点紧绷的':m.relation>76?'逐渐自信的':m.traits.social>65?'乐于交流的':'沉静的';st.personality=tone+core;}
 function interact(p,st,mode,now){
  const m=st._mind;check(m,'学生档案还在整理');const change={guide:{mood:3,relation:5,energy:2,ethic:.025},listen:{mood:15,relation:9,energy:6,ethic:.04},sprint:{mood:-12,relation:-3,energy:-8,ethic:0}}[mode];check(change,'请选择有效的交流方式');
  st.wellbeing=clamp(st.wellbeing+change.mood,0,100);m.relation=clamp(m.relation+change.relation,0,100);m.energy=clamp(m.energy+change.energy,0,100);m.ethic=clamp(m.ethic+change.ethic,.08,1);m.traits.focus=clamp(m.traits.focus+(mode==='sprint'?5:1),0,100);m.traits.social=clamp(m.traits.social+(mode==='listen'?3:0),0,100);m.initiative=motivation(st);refreshPersonality(st);note(st,mode==='listen'?'这次交流没有急着催结果，愿意多说一点最近的感受。':mode==='guide'?'一起把下一小步说清楚了，愿意重新试试看。':'同意集中推进，但也希望之后留些恢复时间。',now);
 }
 function assigned(p,st,type,now,pace='balanced'){const m=st._mind;m.affinities[type]=clamp((m.affinities[type]||1)+.015,.5,1.8);m.traits.focus=clamp(m.traits.focus+2,0,100);if(pace==='focused'){m.energy=Math.max(25,m.energy-4);m.relation=Math.max(0,m.relation-1);}if(pace==='gentle')m.relation=Math.min(100,m.relation+2);refreshPersonality(st);note(st,'开始尝试'+({paper:'把结果整理成论文',patent:'把点子写成技术交底',research:'一个新的研究小目标'}[type]||'新的学术安排')+'。',now);}
 function paid(st,amount,due){if(!st._mind||due<=0)return;st._mind.payTrust=clamp(st._mind.payTrust*.9+.1*amount/due,0,1);st._mind.initiative=motivation(st);}
 function publicStudent(st){
  st.moodText=st.wellbeing>=75?'状态舒展':st.wellbeing>=55?'平稳推进':st.wellbeing>=40?'有些疲惫':'需要关心';
  for(const key of ['progress'])st[key]=Math.floor(st[key]*10+1e-7)/10;st.paper.progress=Math.floor(st.paper.progress*10+1e-7)/10;st.patent.progress=Math.floor(st.patent.progress*10+1e-7)/10;if(st.task)st.task.progress=Math.floor(st.task.progress*10+1e-7)/10;
  st.relationshipText=st._mind?.relation>=75?'交流很自然':st._mind?.relation<40?'还有些距离':'正在建立信任';
  const away=st.task&&['conference','visit'].includes(st.task.type)&&st.task.status!=='completed';st.availability={canWork:st.wellbeing>=35&&!st.contractWork&&!st.procurementWork&&!st.worldWork&&!away,canGraduate:!st.graduatedAt&&st.progress>=st.target&&st.wellbeing>=40&&!st.contractWork&&!st.procurementWork&&!st.worldWork&&(!st.task||st.task.status==='completed'),canTravel:!st.contractWork&&!st.procurementWork&&!st.worldWork&&!away};delete st.wellbeing;
 }
 function dispatch(s,p,action,payload,now){
  if(action!=='candidate_interview')return false;const c=p.admissions.candidates.find(x=>x.id===payload.id&&!x.hired);check(c,'这份招生简历已不在当前册中');check(['sample','collaboration','routine'].includes(payload.topic),'请选择有效的面谈话题');check(!c.resume.interview.some(x=>x.topic===payload.topic),'这个话题已经聊过了');
  const replies=c._mind.trap?{sample:'以前团队材料由同伴统一保管，我可以等入组后再联系他们补一份。',collaboration:'我参与的方向比较多，通常先等大家把分工完全确定下来。',routine:'如果没有特别明确的安排，我习惯先把整体背景了解透彻。'}:{sample:c.resume.workSample,collaboration:'之前负责'+c.resume.strengths.split('、')[0]+'，卡住时会先记录问题，再请同伴一起核对。',routine:'通常把任务拆成一个能交付的小结果，每周保留一次复盘，也给自己留出休息。'};
  c.resume.interview.push({topic:payload.topic,text:replies[payload.topic],at:now});return true;
 }
 return{migrate,initStudent,motivation,labor,rate,createWork,advanceWork,finishWork,settle,interact,assigned,paid,publicStudent,dispatch,note};
}
function stripHidden(value){if(!value||typeof value!=='object')return value;for(const key of Object.keys(value)){if(key.startsWith('_'))delete value[key];else stripHidden(value[key]);}return value;}
module.exports={createPeople,makeCandidates,fullName,stripHidden};
