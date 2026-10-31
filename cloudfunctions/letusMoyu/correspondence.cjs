'use strict';
const {randomUUID}=require('node:crypto');
const {contacts,templates,publicMail}=require('./mail-content.cjs');
const COLLECTION='letus_moyu_correspondence';
const safe=(s,max)=>String(s||'').replace(/\u0000/g,'').trim().slice(0,max);
const check=(ok,message)=>{if(!ok)throw new Error(message)};
const queries=new Set(['letter_list','letter_get','office_state','office_list','office_get']);
const actions=new Set(['letter_send','letter_reply','letter_read','letter_offer','letter_reward','office_send','office_reply','office_read']);
function createMailService({Game,db,read,adminUids}){
 const isAdmin=uid=>adminUids.has(uid);
 function contact(s,id){const p=s.players?.[id];if(p)return {id:p.id,name:p.profile?.name||p.name,address:(p.discipline==='civil'?'fafa':'yizi')+'@buji.example',role:'科研搭子',kind:'peer'};const npc=contacts.find(c=>c.id===id);return npc?{...npc,kind:'npc'}:null;}
 function assertAccess(t,s,uid,office){check(t&&t.roomId===s.id,'这封邮件不属于当前园区');if(office){check(isAdmin(uid),'只有园区信务管理员可以处理 NPC 邮件');check(t.kind==='npc','信务室只处理发给 NPC 的邮件');}else check(t.participants.includes(uid),'你不能查看这封邮件');}
 function publicThread(t,uid,office=false){
  const out=structuredClone(t);if(out.offer)out.offer=publicMail(out.offer);
  out.unread=office?t.messages.at(-1)?.role==='player'&&t.messages.at(-1).at>(t.staffReadAt||0):t.messages.some(m=>(m.role==='npc'||m.authorUid!==uid)&&m.at>(t.readAt[uid]||0));
  return out;
 }
 function summary(t,p){
  const last=t.messages.at(-1),peer=t.kind==='peer'?t.participants.find(id=>id!==p.id):t.npcId;
  return {id:t.id,kind:t.kind,subject:t.subject,contactId:peer,contactName:t.kind==='peer'?t.peerNames[peer]:contact({},t.npcId)?.name,lastText:last.body.slice(0,100),lastSender:last.fromName,updatedAt:t.updatedAt,unread:t.messages.some(m=>(m.role==='npc'||m.authorUid!==p.id)&&m.at>(t.readAt[p.id]||0)),awaitingStaff:t.awaitingStaff};
 }
 function updateSummaries(s,t){for(const id of t.participants){const p=s.players[id];if(!p)continue;p.threadSummaries=p.threadSummaries.filter(x=>x.id!==t.id);p.threadSummaries.unshift(summary(t,p));p.threadSummaries=p.threadSummaries.slice(0,80);}}
 async function save(tx,t){await tx.collection(COLLECTION).doc(t.id).set({roomId:t.roomId,scopeCivil:t.scopeCivil,scopeAir:t.scopeAir,kind:t.kind,updatedAt:t.updatedAt,awaitingStaff:t.awaitingStaff,thread:JSON.stringify(t)});}
 function resourceGrant(input){if(input===undefined||input===null)return;check(typeof input==='object'&&!Array.isArray(input),'资源附件格式无效');const limits={f:5000,r:50,p:100},grant={id:randomUUID(),claimedAt:0};for(const [key,max]of Object.entries(limits)){const value=input[key]??0;check(Number.isSafeInteger(value)&&value>=0&&value<=max,'资源附件必须是有效整数：经费 0–5000、声望 0–50、进度 0–100');grant[key]=value;}return grant.f||grant.r||grant.p?grant:undefined;}
 function message(s,p,body,now,npc,resources){const who=npc?contact(s,npc):contact(s,p.id),out={id:randomUUID(),authorUid:p.id,role:npc?'npc':'player',fromName:who.name,fromAddress:who.address,body,at:now};if(npc){const grant=resourceGrant(resources);if(grant)out.grant=grant;}return out;}
 function addOffer(t,profile,body,now){
  if(!profile||profile==='none')return;
  check(!t.offer||t.offer.repliedAt,'这段会话还有未处理的邀请，请先发送普通正文');
  const template=templates.find(x=>x.id===(profile==='visit'?'visiting':'conference-spam'));
  check(['conference','visit'].includes(profile),'请选择有效的邀请类型');
  t.offer={id:randomUUID(),template:template.id,rules:{...structuredClone(template),body,subject:t.subject,sender:contact({},t.npcId).name,address:contact({},t.npcId).address},receivedAt:now,readAt:0,repliedAt:0,choice:null,result:''};
 }
 async function apply(tx,s,uid,action,payload,now){
  const office=action.startsWith('office_');if(office)check(isAdmin(uid),'只有园区信务管理员可以处理 NPC 邮件');
  const p=s.players[uid];check(p,'你不在当前园区');let t;
  if(action==='letter_send'||action==='office_send'){
   const body=safe(payload.body,4000),subject=safe(payload.subject,120);check(body&&subject,'邮件标题和正文不能为空');check(String(payload.body||'').length<=4000,'邮件正文最多 4000 字');
   if(!office){p.mailSent=p.mailSent||[];p.mailSent=p.mailSent.filter(at=>now-at<24*3600000);check(p.mailSent.length<24,'今天已发了不少新邮件，明天再写一封吧');}
   const recipient=contact(s,payload.to),npc=office?contact(s,payload.npcId):recipient;
   if(office){check(recipient?.kind==='peer','请选择园区里的收件玩家');check(npc?.kind==='npc','请选择一个 NPC 发件人');}
   else{check(recipient&&recipient.id!==uid,'请选择通讯录中的收件人');}
   const participants=office?[recipient.id]:recipient.kind==='peer'?[uid,recipient.id]:[uid],kind=office?'npc':recipient.kind;
   const studentOwner=office?s.players[recipient.id]:p,student=payload.studentId?studentOwner.students.find(st=>st.id===payload.studentId):null;if(payload.studentId)check(student,'只能附上收件人或本组学生的资料');
   t={id:randomUUID(),roomId:s.id,kind,npcId:kind==='npc'?npc.id:null,participants,peerNames:Object.fromEntries(Object.values(s.players).map(x=>[x.id,contact(s,x.id).name])),subject,createdAt:now,updatedAt:now,messages:[message(s,p,body,now,office?npc.id:null,office?payload.resources:undefined)],readAt:office?{}:{[uid]:now},staffReadAt:office?now:0,awaitingStaff:kind==='npc'&&!office,scopeCivil:participants.some(id=>s.players[id].discipline==='civil'),scopeAir:participants.some(id=>s.players[id].discipline==='air'),attachedStudent:student?{id:student.id,name:student.name,topic:student.topic,teacherId:studentOwner.id}:null};
   if(office)addOffer(t,payload.offer,body,now);else p.mailSent.push(now);
  }else{
   check(typeof payload.id==='string'&&/^[a-f0-9-]{36}$/i.test(payload.id),'邮件编号无效');
   const doc=await read(tx,COLLECTION,payload.id);t=doc?JSON.parse(doc.thread):null;assertAccess(t,s,uid,office);
   if(action==='letter_read')t.readAt[uid]=now;
   else if(action==='office_read')t.staffReadAt=now;
   else if(action==='letter_reward'){
    const m=t.messages.find(m=>m.id===payload.messageId);check(t.kind==='npc'&&m?.role==='npc'&&m.grant,'这封邮件没有可领取的资源附件');check(!m.grant.claimedAt,'这份资源附件已经领取过了');
    const before={f:p.funds,r:p.rep,p:p.paper.progress+p.paper.bank};Game.reward(s,p,{note:'来信附件：'+t.subject,category:'mail',f:m.grant.f,r:m.grant.r,p:m.grant.p},now);const after={f:p.funds,r:p.rep,p:p.paper.progress+p.paper.bank};
    m.grant.claimedAt=now;m.grant.claimedBy=uid;m.grant.actual=Object.fromEntries(Object.keys(before).map(k=>[k,Math.round((after[k]-before[k])*1e6)/1e6]));t.readAt[uid]=now;t.updatedAt=now;
    t.messages.push({id:randomUUID(),authorUid:uid,role:'receipt',fromName:'资源附件领取回执',fromAddress:'receipt@buji.example',body:p.name+' 已领取：经费 +'+m.grant.actual.f+'、声望 +'+m.grant.actual.r+'、论文进度 +'+m.grant.actual.p+'。',at:now});
    Game.log(s,p.name+' 领取了 '+m.fromName+' 的资源附件：经费 +'+m.grant.actual.f+'、声望 +'+m.grant.actual.r+'、进度 +'+m.grant.actual.p+'。',now,'mail',uid);
   }
   else if(action==='letter_offer'){
    check(t.offer,'这封邮件没有邀请选项');
    Game.Research.chooseMail(s,p,t.offer,payload,now);
    t.messages.push({id:randomUUID(),authorUid:uid,role:'receipt',fromName:'活动处理回执',fromAddress:'receipt@buji.example',body:(t.offer.attendee?.name||p.profile.name)+'：'+t.offer.result,at:now});t.readAt[uid]=now;t.updatedAt=now;
   }else{
    const body=safe(payload.body,4000);check(body&&String(payload.body||'').length<=4000,'邮件正文不能为空，且最多 4000 字');check(t.messages.length<80,'这段会话已有 80 封邮件，请另开新会话继续');
    t.messages.push(message(s,p,body,now,office?t.npcId:null,office?payload.resources:undefined));t.updatedAt=now;
    if(office){t.staffReadAt=now;t.awaitingStaff=false;addOffer(t,payload.offer,body,now);}
    else{t.readAt[uid]=now;if(t.kind==='npc')t.awaitingStaff=true;}
   }
  }
  updateSummaries(s,t);await save(tx,t);
  if(!action.endsWith('_read')&&action!=='letter_reward')Game.log(s,office?'园区信务室已向 '+t.participants.map(id=>s.players[id].name).join('、')+' 投递一封邮件。':p.name+(action==='letter_offer'?' 处理了一封活动邀请。':' 发出了一封园区邮件。'),now,'correspondence',office?t.participants:[uid]);
  s.feed=s.feed.slice(0,160);
  return {thread:publicThread(t,uid,office),threadId:t.id};
 }
 async function query(uid,action,payload,now){
  const office=action.startsWith('office_');if(office)check(isAdmin(uid),'只有园区信务管理员可以处理 NPC 邮件');
  const member=await read(db,'letus_moyu_members',uid);check(member,'你尚未加入园区');const room=await read(db,'letus_moyu_rooms',member.roomId);check(room,'园区不存在');
  const s=JSON.parse(room.state);Game.Research.migrate(s,now);const p=s.players[uid];check(p,'你不在当前园区');
  if(action==='office_state')return {office:{roomId:s.id,contacts,players:Object.values(s.players).map(x=>({id:x.id,name:x.profile.name,discipline:x.discipline,research:x.profile.research,students:x.students.filter(st=>!st.graduatedAt).map(st=>({id:st.id,name:st.name,topic:st.topic,plan:st.plan,avatarSeed:st.avatarSeed}))}))}};
  if(action.endsWith('_get')){check(typeof payload.id==='string'&&/^[a-f0-9-]{36}$/i.test(payload.id),'邮件编号无效');const doc=await read(db,COLLECTION,payload.id);const t=doc?JSON.parse(doc.thread):null;assertAccess(t,s,uid,office);return {thread:publicThread(t,uid,office)};}
  const offset=Number(payload.offset||0);check(Number.isInteger(offset)&&offset>=0&&offset<=100000,'邮件分页无效');
  const where=office?{roomId:s.id,kind:'npc'}:{roomId:s.id,[p.discipline==='civil'?'scopeCivil':'scopeAir']:true};
  const result=await db.collection(COLLECTION).where(where).orderBy('updatedAt','desc').skip(offset).limit(40).get();
  if((result.code&&result.code!=='SUCCESS')||result.errCode)throw new Error('邮件暂时未能读取，请稍后重试');
  const rows=Array.isArray(result.data)?result.data:[];
  const threads=rows.map(doc=>JSON.parse(doc.thread));for(const t of threads)assertAccess(t,s,uid,office);
  return {threads:threads.map(t=>{const pub=publicThread(t,uid,office);return {id:t.id,kind:t.kind,subject:t.subject,npcId:t.npcId,participants:t.participants,peerNames:t.peerNames,updatedAt:t.updatedAt,awaitingStaff:t.awaitingStaff,unread:pub.unread,last:pub.messages.at(-1),attachedStudent:t.attachedStudent,sentByMe:t.messages.some(m=>m.role==='player'&&m.authorUid===uid)};}),nextOffset:rows.length===40?offset+40:null};
 }
 return {apply,query,isAdmin,publicThread,assertAccess};
}
module.exports={createMailService,COLLECTION,queries,actions};
