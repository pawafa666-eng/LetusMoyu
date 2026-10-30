'use strict';
const tcb=require('@cloudbase/node-sdk');
const {createHash}=require('node:crypto');
const {verify,nextWindow}=require('./pin.cjs');
const env=process.env.CLOUDBASE_ENV_ID;
const app=tcb.init({env});
const db=app.database();
const collection='letus_moyu_login_limits';
const accounts=JSON.parse(process.env.GAME_LOGIN_CONFIG||'[]');
const hash=x=>createHash('sha256').update(x).digest('hex');
const one=r=>Array.isArray(r.data)?r.data[0]||null:r.data||null;
exports.main=async event=>{
 if(!event||typeof event.alias!=='string'||typeof event.pin!=='string')return {ok:false,error:'请输入游戏用户名和四位登录码'};
 const alias=event.alias.trim().toLowerCase();
 if(!/^[a-z]{2,12}$/.test(alias)||!/^\d{4}$/.test(event.pin))return {ok:false,error:'游戏用户名或登录码不正确'};
 const account=accounts.find(a=>a.alias===alias);
 if(!account)return {ok:false,error:'游戏用户名或登录码不正确'};
 const ip=app.auth().getClientIP()||'unknown',now=Date.now();
 const ipKey=hash(alias+':'+ip),globalKey=hash(alias+':all');
 try{
  const allowed=await db.runTransaction(async tx=>{
   const ipDoc=one(await tx.collection(collection).doc(ipKey).get());
   const globalDoc=one(await tx.collection(collection).doc(globalKey).get());
   const local=nextWindow(ipDoc,now,5),global=nextWindow(globalDoc,now,12);
   if(!local||!global)return false;
   await tx.collection(collection).doc(ipKey).set(local);await tx.collection(collection).doc(globalKey).set(global);return true;
  },3);
  if(!allowed)return {ok:false,error:'登录尝试有些频繁，请十五分钟后再来'};
  if(!verify(account,event.pin))return {ok:false,error:'游戏用户名或登录码不正确'};
  const response=await fetch('https://'+env+'.api.tcloudbasegateway.com/auth/v1/signin',{method:'POST',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+process.env.CLOUDBASE_PUBLISHABLE_KEY,'x-device-id':'letus-moyu-pin-'+ipKey.slice(0,16)},body:JSON.stringify({username:account.username,password:account.password})});
  const session=await response.json();
  if(!response.ok||session.sub!==account.uid||typeof session.access_token!=='string'||typeof session.refresh_token!=='string')throw new Error('NATIVE_AUTH_FAILED');
  await db.collection(collection).doc(ipKey).update({attempts:0});
  return {ok:true,session:{access_token:session.access_token,refresh_token:session.refresh_token}};
 }catch(error){
  console.error('Game login failed',error.code||error.message||'UNKNOWN');
  return {ok:false,error:'登录服务暂时没有连上，请稍后重试'};
 }
};
