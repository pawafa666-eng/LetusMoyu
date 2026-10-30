'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {one}=require('../cloudfunctions/letusMoyu/store.cjs');
test('真实云端首次读取返回 null 时视为未建档',()=>assert.equal(one({data:null}),null));
test('数据库空数组与单记录格式都能兼容',()=>{assert.equal(one({data:[]}),null);assert.deepEqual(one({data:[{_id:'a'}]}),{_id:'a'});assert.deepEqual(one({data:{_id:'a'}}),{_id:'a'});});
test('数据库拒绝访问不能被伪装成未建档',()=>{assert.throws(()=>one({code:'DENIED',data:null}));assert.throws(()=>one({status:'unexpected'}));});
