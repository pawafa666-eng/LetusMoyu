import cloudbase from '@cloudbase/js-sdk'
import type {ApiResult} from './types'
import config from './cloudbase.config.json'
const env=import.meta.env.VITE_CLOUDBASE_ENV_ID||config.env
const accessKey=import.meta.env.VITE_CLOUDBASE_PUBLISHABLE_KEY||config.publishableKey
if(!env||!accessKey)throw new Error('请配置 .env.local 中的云开发环境与公开 Publishable Key，详见 README。')
export const cloud=cloudbase.init({env,region:'ap-shanghai',accessKey,auth:{detectSessionInUrl:true}})
export const auth=cloud.auth
export async function request(action:string,payload:Record<string,unknown>={},requestId:string=crypto.randomUUID()):Promise<ApiResult>{
 const response=await cloud.callFunction({name:'letusMoyu',data:{action,payload,requestId}})
 const raw:unknown=typeof response.result==='string'?JSON.parse(response.result):response.result
 if(!raw||typeof raw!=='object'||!('ok' in raw)||typeof raw.ok!=='boolean')throw new Error('云端返回格式异常，操作状态待确认，请使用原请求重试。')
 return raw as ApiResult
}
