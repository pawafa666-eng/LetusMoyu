const {test}=require('node:test'),assert=require('node:assert/strict'),G=require('../cloudfunctions/letusMoyu/game.cjs'),Ledger=require('../cloudfunctions/letusMoyu/ledger.cjs');
test('查询房间汇总与流水之间发生新提交时，不把未来记录混进旧余额',async()=>{
 const now=1800000000000,s=G.createRoom('SNAPSHOT','a','fafa','civil',now),p=s.players.a;
 G.Wallet.change(p,5,'读取房间前已到账','project',now);
 const room={state:JSON.stringify(s)};
 // Simulate another atomic action completing after the room read.
 G.Wallet.change(p,10,'读取房间后才到账','project',now+1);
 const db={command:{lt:n=>n},collection(){return{where(filter){return{orderBy(){return this},limit(){return this},async get(){return{data:p.ledger.entries.filter(x=>x.seq<filter.seq).slice().reverse()}}}}}}};
 const read=async(_db,c)=>c==='letus_moyu_members'?{roomId:s.id}:room;
 const r=await Ledger.query(db,read,'a',{});
 assert.equal(r.ledger.entries.length,1);assert.equal(r.ledger.entries[0].title,'读取房间前已到账');
 assert.equal(r.ledger.entries[0].balance,r.ledger.summary.balance);assert.equal(r.ledger.summary.sequence,1);
});
