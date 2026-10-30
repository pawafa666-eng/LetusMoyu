// Only registered by Vite configureServer. Not shipped or deployed as an API.
const G=require('../cloudfunctions/letusMoyu/game.cjs');
const {randomUUID}=require('node:crypto');
module.exports=function previewServer(){
 const now=Date.now(),uid='preview-civil',s=G.createRoom('PREVIEW001',uid,'fafa','civil',now-24*G.HOUR);
 G.join(s,'preview-air','yiyi',now-24*G.HOUR);
 const p=s.players[uid];p.funds=1800;p.papers=1;p.rep=5;p.credits=1;p.position=1;p.paper.progress=64;p.patent.progress=48;
 s.players['preview-air'].position=17;
 s.projects[0]={def:0,owner:uid,lastAt:now,elapsed:0,value:0,stock:[]};
 G.execute(s,uid,'student_hire',{id:p.admissions.candidates[0].id},now);
 p.students[0].progress=42;p.students[0].wellbeing=63;p.students[0].lastCareAt=0;
 p.inbox.push({id:randomUUID(),template:'bridge',receivedAt:now-12*G.MIN,readAt:0,repliedAt:0,choice:null,result:''});
 p.inbox.push({id:randomUUID(),template:'conference-spam',receivedAt:now-3*G.MIN,readAt:0,repliedAt:0,choice:null,result:''});
 p.nextMailAt=now+90*G.MIN;
 const receipts=new Map();
 return {name:'isolated-game-preview',configureServer(server){server.middlewares.use('/__preview/action',async(req,res)=>{
  if(req.method!=='POST'){res.statusCode=405;res.end();return}
  res.setHeader('Content-Type','application/json');
  try{let body='';for await(const chunk of req){body+=chunk;if(body.length>4096)throw new Error('请求过长')}
   const {action,payload={},requestId}=JSON.parse(body);
   if(receipts.has(requestId)){res.end(JSON.stringify({...receipts.get(requestId),replayed:true}));return}
   const copy=structuredClone(s);G.execute(copy,uid,action,payload,Date.now(),()=>.55);copy.version++;Object.assign(s,copy);
   const data={ok:true,state:G.view(s,uid,Date.now()),savedAt:Date.now()};receipts.set(requestId,data);res.end(JSON.stringify(data));
  }catch(error){res.end(JSON.stringify({ok:false,error:error.message}))}
 })}}
}
