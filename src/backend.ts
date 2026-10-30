import cloudbase from '@cloudbase/js-sdk'
import type {ApiResult} from './types'
import config from './cloudbase.config.json'
const env=import.meta.env.VITE_CLOUDBASE_ENV_ID||config.env
const accessKey=import.meta.env.VITE_CLOUDBASE_PUBLISHABLE_KEY||config.publishableKey
if(!env||!accessKey)throw new Error('请配置 .env.local 中的云开发环境与公开 Publishable Key，详见 README。')
export const cloud=cloudbase.init({env,region:'ap-shanghai',accessKey,auth:{detectSessionInUrl:true}})
export const auth=cloud.auth
export const preview=import.meta.env.DEV&&new URLSearchParams(location.search).get('preview')==='1'
export const pinLoginReady=Boolean((config as typeof config&{pinLoginReady?:boolean}).pinLoginReady)
export async function signIn(alias:string,pin:string){
 if(!pinLoginReady||pin.length!==4){
  if(pin.length===4)throw new Error('四位登录码正在等待平台凭证核对，请先使用原账号和原密码。')
  const {data,error}=await auth.signInWithPassword({username:alias,password:pin})
  if(error)throw new Error(error.message||'账号或密码不正确')
  if(!data.session||data.session.user?.is_anonymous)throw new Error('登录未建立有效会话，请重试')
  return data.session.user.id
 }
 const response=await fetch('https://'+env+'.api.tcloudbasegateway.com/v1/functions/letusMoyuLogin',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+accessKey},body:JSON.stringify({alias,pin})})
 const body=await response.json()
 const raw=typeof body.result==='string'?JSON.parse(body.result):body.result||body
 if(!response.ok||!raw.ok||!raw.session)throw new Error(raw.error||'登录服务暂时没有连上')
 const {data,error}=await auth.setSession(raw.session)
 if(error)throw new Error(error.message||'登录会话没有建立')
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
