'use strict';
const tcb=require('@cloudbase/node-sdk');
const {createHash,randomBytes}=require('node:crypto');
const Game=require('./game.cjs');
const {read}=require('./store.cjs');
const Correspondence=require('./correspondence.cjs');
const app=tcb.init({env:process.env.CLOUDBASE_ENV_ID||'yiyi-and-fafa-d6gr7w5e62c4e8565'});
const db=app.database();
const allowed=new Set((process.env.ALLOWED_UIDS||'').split(',').filter(Boolean));
const adminUids=new Set((process.env.MAIL_ADMIN_UIDS||'2115994901674020865').split(',').filter(Boolean));
const Mail=Correspondence.createMailService({Game,db,read,adminUids});
const COLLECTIONS={rooms:'letus_moyu_rooms',members:'letus_moyu_members',receipts:'letus_moyu_receipts',snapshots:'letus_moyu_snapshots'};
const hash=value=>createHash('sha256').update(value).digest('hex');
const decode=doc=>JSON.parse(doc.state);
const cleanError=error=>{
 const message=error instanceof Error?error.message:'操作未完成';
 return /^(你|这|先|对方|搭子|科研|设备|行动|每|今天|同名|最多|论文|进度|已经|可用|请选择|请输入|贡献|路线|未知|请求|服务|只|园区|邀请码|本学年|课题组|刚刚|专利|研究|邮件|会话|收件|发件|当前|代表作|资源|横向|合同|阶段|经费|劳务|采购|资产|已经)/.test(message)?message:'网络或云服务暂时未能保存，请重试；已成功的操作不会重复扣款。';
};
exports.main=async(event)=>{
 const identity=app.auth().getUserInfo();
 if(!identity.uid||identity.isAnonymous||!allowed.has(identity.uid))return {ok:false,error:'只有已授权的两位博士可以进入这个园区'};
 const uid=identity.uid;
 try{
  if(!event||typeof event!=='object'||Array.isArray(event))throw new Error('请求格式无效');
  const action=String(event.action||'state');
  const actions=['state','export','create','join','move','resolve','card','submit','contribute','equip','mail_read','mail_reply','student_hire','student_care','student_graduate','patent_work','patent_submit','paper_configure','profile_update','representatives','student_task','student_plan','student_cancel','contract_start','contract_respond','contract_cancel','contract_claim','procure_create','procure_start','procure_confirm','procure_cancel','asset_mode','asset_data','student_wage','candidate_interview','paper_journal','paper_response','paper_publish','student_publish','student_review_help','contract_takeover','procure_takeover','world_travel','world_undergrad_accept','world_company_start','world_respond','world_team_start','world_competition_start','world_claim','world_takeover','world_cancel_invite',...Correspondence.queries,...Correspondence.actions];
  if(!actions.includes(action))throw new Error('未知操作');
  const payload=event.payload&&typeof event.payload==='object'&&!Array.isArray(event.payload)?event.payload:{};
  const requestId=String(event.requestId||'');
  if(!/^[a-f0-9-]{36}$/i.test(requestId))throw new Error('请求编号无效，请重新打开页面');
  if(Correspondence.queries.has(action))return {ok:true,...await Mail.query(uid,action,payload,Date.now())};
  const writing=!['state','export'].includes(action),now=Date.now();
  const receiptId=hash(uid+':'+requestId),payloadHash=hash(JSON.stringify({action,payload}));
  const result=await db.runTransaction(async tx=>{
   const member=await read(tx,COLLECTIONS.members,uid);
   const receipt=writing?await read(tx,COLLECTIONS.receipts,receiptId):null;
   if(receipt&&receipt.payloadHash!==payloadHash)throw new Error('请求编号重复，请刷新后再试');
   if(receipt){
    const room=await read(tx,COLLECTIONS.rooms,receipt.room);
    if(!room)throw new Error('园区记录不存在，请联系管理员');
    const state=decode(room);if(!state.players[uid])throw new Error('你不在这个园区里');Game.Research.migrate(state,now);
    return {state:Game.view(state,uid,now),replayed:true,savedAt:receipt.createdAt,threadId:receipt.threadId};
   }
   let state,roomId=member?.roomId,extra={};
   if(action==='create'){
    if(member)throw new Error('你已经加入了园区');
    roomId=randomBytes(5).toString('hex').toUpperCase();
    const existing=await read(tx,COLLECTIONS.rooms,roomId);
    if(existing)throw new Error('邀请码暂时冲突，请重试');
    state=Game.createRoom(roomId,uid,String(payload.name||'点云博士'),payload.discipline,now);
    await tx.collection(COLLECTIONS.members).doc(uid).set({roomId,joinedAt:now});
   }else if(action==='join'){
    if(member)throw new Error('你已经加入了园区');
    roomId=String(payload.code||'').trim().toUpperCase();
    if(!/^[A-F0-9]{10}$/.test(roomId))throw new Error('邀请码是十位字母和数字');
    const room=await read(tx,COLLECTIONS.rooms,roomId);
    if(!room)throw new Error('邀请码不存在');
    state=decode(room);Game.settle(state,now);Game.join(state,uid,String(payload.name||'起飞博士'),now);
    await tx.collection(COLLECTIONS.members).doc(uid).set({roomId,joinedAt:now});
   }else{
    if(!member)return {state:null,uid,savedAt:now};
    const room=await read(tx,COLLECTIONS.rooms,roomId);
    if(!room)throw new Error('园区记录不存在，请联系管理员');
    state=decode(room);
    if(Correspondence.actions.has(action)){Game.settle(state,now);extra=await Mail.apply(tx,state,uid,action,payload,now);}
    else Game.execute(state,uid,action,payload,now);
   }
   state.version++;
   if(writing)state.snapshotSeq=(state.snapshotSeq||0)+1;
   await tx.collection(COLLECTIONS.rooms).doc(roomId).set({state:JSON.stringify(state),version:state.version,updatedAt:now});
   if(writing){
    await tx.collection(COLLECTIONS.receipts).doc(receiptId).set({room:roomId,actor:uid,payloadHash,action,createdAt:now,threadId:extra.threadId||null});
    await tx.collection(COLLECTIONS.snapshots).doc(roomId+'-'+(state.snapshotSeq%12)).set({roomId,state:JSON.stringify(state),version:state.version,createdAt:now});
   }
   return {state:Game.view(state,uid,now),savedAt:now,...extra};
  },3);
  return {ok:true,...result};
 }catch(error){
  console.error('LetusMoyu action failed',{action:event?.action,message:error instanceof Error?error.message:'unknown'});
  return {ok:false,error:cleanError(error),supportCode:error.code||error.errCode||'INTERNAL'};
 }
};
