'use strict';
// CloudBase can return null for a missing document, including inside a
// transaction. Normalize this boundary once for every collection.
function one(result){
 if(!result||typeof result!=='object'||!('data' in result))throw new Error('DATABASE_RESPONSE_INVALID');
 if(result.code&&result.code!==0)throw new Error('DATABASE_READ_FAILED: '+result.code);
 const data=result.data;
 if(data===null||data===undefined)return null;
 if(Array.isArray(data))return data[0]||null;
 if(typeof data==='object')return data;
 throw new Error('DATABASE_DOCUMENT_INVALID');
}
async function read(tx,collection,id){return one(await tx.collection(collection).doc(id).get());}
module.exports={one,read};
