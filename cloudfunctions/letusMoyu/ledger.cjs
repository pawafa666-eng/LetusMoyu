'use strict';
const W=require('./wallet.cjs');
async function query(db,read,uid,payload={}){
 const member=await read(db,'letus_moyu_members',uid);if(!member)throw Error('你还没有加入园区');
 const room=await read(db,'letus_moyu_rooms',member.roomId);if(!room)throw Error('园区记录不存在');
 const s=JSON.parse(room.state),p=s.players[uid];if(!p)throw Error('你不在这个园区里');
 const before=payload.before===undefined?Number.MAX_SAFE_INTEGER:Number(payload.before);if(!Number.isSafeInteger(before)||before<1)throw Error('请输入有效的明细游标');
 const category=String(payload.category||'all'),direction=String(payload.direction||'all');
 if(category!=='all'&&!W.categories[category])throw Error('请选择有效的收支分类');if(!['all','income','expense'].includes(direction))throw Error('请选择收入或支出');
 const from=Number(payload.from||0),to=Number(payload.to||8640000000000000);if(!Number.isFinite(from)||!Number.isFinite(to)||from<0||to<from)throw Error('请输入有效日期范围');
 const upper=Math.min(before,(p.ledger?.sequence||0)+1);
 const filter={roomId:member.roomId,ownerId:uid,seq:db.command.lt(upper)};if(category!=='all')filter.category=category;if(direction!=='all')filter.direction=direction;
 const result=await db.collection('letus_moyu_ledger').where(filter).orderBy('seq','desc').limit(100).get(),rows=result.data||[];
 return {ledger:{entries:rows.filter(x=>x.at>=from&&x.at<=to).map(({ownerId,roomId,_id,...row})=>row),next:rows.length===100?rows.at(-1).seq:null,summary:p.ledger||null,categories:W.categories}};
}
module.exports={query};
