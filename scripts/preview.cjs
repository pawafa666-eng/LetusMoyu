// Isolated, in-memory fixtures. This plugin is only registered for Vite serve.
const G=require('../cloudfunctions/letusMoyu/game.cjs');
const Correspondence=require('../cloudfunctions/letusMoyu/correspondence.cjs');
const {randomUUID}=require('node:crypto');
module.exports=function previewServer(){
 const now=Date.now(),uid='preview-civil',s=G.createRoom('PREVIEW001',uid,'fafa','civil',now-24*G.HOUR);G.join(s,'preview-air','起飞博士',now-24*G.HOUR);
 const p=s.players[uid];p.funds=1800;p.rep=5;p.credits=1;p.position=1;p.paper.progress=64;p.patent.progress=48;s.players['preview-air'].position=17;
 s.projects[0]={def:0,owner:uid,lastAt:now,signedAt:now,elapsed:0,value:0,stock:[],finance:{model:'contract',totalFunding:1500,advance:0,allocatedFunding:0,receivedFunding:0,initialInvestment:0,operatingIncome:0}};
 for(const c of [p.admissions.candidates[0],p.admissions.candidates.find(x=>x.degree==='phds')])G.execute(s,uid,'student_hire',{id:c.id},now);
 for(const [i,st] of p.students.entries()){st.progress=42+i*8;st.wellbeing=63+i*10;st.lastCareAt=0;st.plan=i?'参加低空基础设施交叉课题，先完成点云数据融合实验。':'整理桥梁巡检数据，写好论文，也给自己留出休息时间。';}
 G.execute(s,uid,'student_task',{id:p.students[0].id,type:'paper',title:'无人机桥梁巡检的空地协同数据融合',partner:true},now);p.students[0].task.progress=p.students[0].paper.progress=36;
 G.Research.Portfolio.activity(p,p.students[0],{type:'conference',title:'城市交叉创新青年学者报告',venue:'不急大学学术交流中心',status:'completed',summary:'完成了十分钟报告，和低空交通团队交流了数据融合方法。'},now-3*G.HOUR);
 for(let i=0;i<6;i++)G.Research.Portfolio.recordPaper(s,p,now-i*G.HOUR,{studentIds:[p.students[0].id],partner:i===2});
 G.Research.Portfolio.recordPatent(s,p,now,{studentIds:[p.students[0].id]});p.representatives=p.portfolio.papers.slice(0,3).map(w=>w.id);
 p.inbox.push({id:randomUUID(),template:'bridge',receivedAt:now-12*G.MIN,readAt:0,repliedAt:0,choice:null,result:''});p.inbox.push({id:randomUUID(),template:'conference-spam',receivedAt:now-3*G.MIN,readAt:0,repliedAt:0,choice:null,result:''});p.nextMailAt=now+90*G.MIN;
 for(const [def,owner]of [[5,uid],[3,'preview-air']])s.projects[def]={def,owner,lastAt:now,signedAt:now,elapsed:0,value:0,stock:[],finance:{model:'contract',totalFunding:G.C.projects[def].totalFunding,advance:0,allocatedFunding:0,receivedFunding:0,operatingIncome:0,initialInvestment:0}};
 G.Contracts.migrate(s);G.execute(s,uid,'contract_start',{project:5,stageId:G.Contracts.current(s.projects[5]).id,mode:'outsource'},now-3*G.HOUR);G.settle(s,now);
 G.execute(s,'preview-air','contract_start',{project:3,stageId:G.Contracts.current(s.projects[3]).id,mode:'coop',share:30},now);
 const receipts=new Map(),rows=new Map(),read=async(tx,col,id)=>col==='letus_moyu_members'?{roomId:s.id}:col==='letus_moyu_rooms'?{state:JSON.stringify(s)}:rows.get(col+':'+id)||null;
 const db={collection(col){let filter={},offset=0,size=40;const q={doc(id){return{async set(v){rows.set(col+':'+id,v)}}},where(w){filter=w;return q},orderBy(){return q},skip(n){offset=n;return q},limit(n){size=n;return q},async get(){return{data:[...rows.entries()].filter(([k,v])=>k.startsWith(col+':')&&Object.entries(filter).every(([f,x])=>v[f]===x)).map(x=>x[1]).sort((a,b)=>b.updatedAt-a.updatedAt).slice(offset,offset+size)}}};return q}};
 const mail=Correspondence.createMailService({Game:G,db,read,adminUids:new Set([uid])});
 return{name:'isolated-game-preview',configureServer(server){server.middlewares.use('/__preview/action',async(req,res)=>{
  if(req.method!=='POST'){res.statusCode=405;res.end();return}res.setHeader('Content-Type','application/json');
  try{let body='';for await(const chunk of req){body+=chunk;if(body.length>16000)throw Error('请求过长')}const{action,payload={},requestId,previewPlayer}=JSON.parse(body),actor=previewPlayer==='air'?'preview-air':uid;
   if(receipts.has(requestId)){res.end(JSON.stringify({...receipts.get(requestId),replayed:true}));return}
   if(Correspondence.queries.has(action)){res.end(JSON.stringify({ok:true,...await mail.query(actor,action,payload,Date.now())}));return}
   const copy=structuredClone(s);let extra={};if(Correspondence.actions.has(action)){G.settle(copy,Date.now());extra=await mail.apply(db,copy,actor,action,payload,Date.now())}else G.execute(copy,actor,action,payload,Date.now(),()=>.55);copy.version++;Object.assign(s,copy);
   const data={ok:true,state:G.view(s,actor,Date.now()),savedAt:Date.now(),...extra};receipts.set(requestId,data);res.end(JSON.stringify(data));
  }catch(error){res.end(JSON.stringify({ok:false,error:error.message}))}
 })}}
}
