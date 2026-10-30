const {test}=require('node:test');const assert=require('node:assert/strict');const {scryptSync}=require('node:crypto');
const {verify,nextWindow}=require('../cloudfunctions/letusMoyuLogin/pin.cjs');
test('四位登录码仅与服务器保存的盐化哈希比对',()=>{const salt='test-only-salt';const account={salt,hash:scryptSync('1357',salt,32).toString('hex')};assert.equal(verify(account,'1357'),true);assert.equal(verify(account,'0000'),false);assert.equal(verify(null,'1357'),false);assert.equal(verify(account,'13570'),false);});
test('限流窗口不会被错误尝试提前重置',()=>{const now=1_800_000_000_000;let r=null;for(let i=0;i<5;i++)r=nextWindow(r,now+i,5);assert.equal(nextWindow(r,now+100,5),null);assert.equal(nextWindow(r,now+15*60_000,5).attempts,1);});
