export interface LoginKey {salt:string;iterations:number}
// A game code derives an account-specific native credential. Only the public
// salt is bundled; neither the game code nor the derived password is stored.
export async function deriveCredential(pin:string,key:LoginKey):Promise<string>{
 if(typeof pin!=='string'||!/^\d{4}$/.test(pin))throw new Error('请输入四位数字游戏密码')
 const salt=Uint8Array.from(key.salt.match(/.{2}/g)!.map(byte=>parseInt(byte,16)))
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits'])
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:key.iterations},material,128)
 const hex=Array.from(new Uint8Array(bits),byte=>byte.toString(16).padStart(2,'0')).join('')
 return 'M!7a'+hex.slice(0,20)
}
