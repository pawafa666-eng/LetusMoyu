import cloudbase from '@cloudbase/js-sdk'
import type {ApiResult} from './types'
import config from './cloudbase.config.json'
import {deriveCredential} from './login'
import type {LoginKey} from './login'
const env=import.meta.env.VITE_CLOUDBASE_ENV_ID||config.env
const accessKey=import.meta.env.VITE_CLOUDBASE_PUBLISHABLE_KEY||config.publishableKey
if(!env||!accessKey)throw new Error('请配置 .env.local 中的云开发环境与公开 Publishable Key，详见 README。')
export const cloud=cloudbase.init({env,region:'ap-shanghai',accessKey,auth:{detectSessionInUrl:true}})
export const auth=cloud.auth
export const preview=import.meta.env.DEV&&new URLSearchParams(location.search).get('preview')==='1'
export const pinLoginReady=Boolean((config as typeof config&{pinLoginReady?:boolean}).pinLoginReady)
export async function signIn(alias:string,pin:string){
 if(!pinLoginReady){
  const {data,error}=await auth.signInWithPassword({username:alias,password:pin})
  if(error)throw new Error(error.message||'账号或密码不正确')
  if(!data.session||data.session.user?.is_anonymous)throw new Error('登录未建立有效会话，请重试')
  return data.session.user.id
 }
 const username=alias.trim().toLowerCase()
 const keys=(config as typeof config&{loginKeys?:Record<string,LoginKey>}).loginKeys
 const key=keys?.[username]
 if(!key)throw new Error('游戏用户名为 fafa 或 yiyi')
 const password=await deriveCredential(pin,key)
 const {data,error}=await auth.signInWithPassword({username,password})
 if(error)throw new Error(error.message||'用户名或四位游戏密码不正确')
 if(!data.session||data.session.user?.is_anonymous)throw new Error('登录未建立有效会话，请重试')
 return data.session.user.id
}
export async function request(action:string,payload:Record<string,unknown>={},requestId:string=crypto.randomUUID()):Promise<ApiResult>{
 if(preview){const r=await fetch('/__preview/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,payload,requestId})});return await r.json()}
 const response=await cloud.callFunction({name:'letusMoyu',data:{action,payload,requestId}})
 const raw:unknown=typeof response.result==='string'?JSON.parse(response.result):response.result
 if(!raw||typeof raw!=='object'||!('ok' in raw)||typeof raw.ok!=='boolean')throw new Error('云端返回格式异常，操作状态待确认，请使用原请求重试。')
 return raw as ApiResult
}
