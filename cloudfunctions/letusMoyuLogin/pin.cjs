'use strict';
const {scryptSync,timingSafeEqual}=require('node:crypto');
function verify(account,pin){
 if(!account||typeof pin!=='string'||!/^\d{4}$/.test(pin))return false;
 const expected=Buffer.from(account.hash,'hex');
 const actual=scryptSync(pin,account.salt,32);
 return expected.length===actual.length&&timingSafeEqual(expected,actual);
}
function nextWindow(previous,now,limit){
 const row=!previous||now-previous.windowAt>=15*60_000?{windowAt:now,attempts:0}:previous;
 if(row.attempts>=limit)return null;
 return {windowAt:row.windowAt,attempts:row.attempts+1};
}
module.exports={verify,nextWindow};
