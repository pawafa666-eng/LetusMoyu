'use strict';
const W=require('./wallet.cjs');
const {randomInt,randomUUID}=require('node:crypto');
const C=require('./content.cjs');
const Feed=require('./feed.cjs');
const MIN=60_000, HOUR=60*MIN, CYCLE=2*HOUR;
const random=()=>randomInt(0,0x100000000)/0x100000000;
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
function check(ok,message){if(!ok)throw new Error(message);}
function log(s,text,now,kind='research',actors){
 if(s.lab.level>=2&&['research','paper','interaction','move','movement'].includes(kind)){const actor=Object.values(s.players).find(p=>text.startsWith(p.name+' ')||text.startsWith(p.name+'：')),prefix=actor?.name||'';text=prefix+text.slice(prefix.length).replaceAll('导师','研究所领导');}
 Feed.push(s,text,now,kind,actors);
}
function other(s,p){return Object.values(s.players).find(x=>x.id!==p.id);}
function player(id,name,discipline,now){
 return {id,name:name.trim().slice(0,16)||'匿名博士',discipline,funds:700,energy:5,energyAt:now,position:0,
 mood:75,tutor:50,rep:0,papers:0,credits:0,actionCount:0,cardUsed:true,hand:[3,7,12],
 equipment:[],active:[],paper:{phase:'draft',progress:0,bank:0,reviewAt:0,reviewRoll:0,round:0,required:0},
 pending:null,donated:0,registeredRep:0,attacks:[],attackedAt:0,coopAt:{},recent:[],cardDraws:[]};
}
function createRoom(id,uid,name,discipline,now){
 check(['civil','air'].includes(discipline),'请选择研究方向');
 const s={id,rulesVersion:1,version:0,createdAt:now,players:{[uid]:player(uid,name,discipline,now)},projects:{},effects:[],feed:[],lab:{level:1,funds:0,credits:0,rep:0}};
 W.prepare(s,now);Research.migrate(s,now);Contracts.migrate(s);Operations.migrate(s,now);People.migrate(s,now);Peer.migrate(s,now);World.migrate(s,now);Living.migrate(s,now);Institute.migrate(s,now);Joint.migrate(s);s.rulesVersion=8;log(s,name+' 租下了两张科研桌，正在等搭子入住。',now);return s;
}
function join(s,uid,name,now){
 check(!s.players[uid],'你已经在园区里了');check(Object.keys(s.players).length<2,'这个园区已经有两位博士了');
 const first=Object.values(s.players)[0];s.players[uid]=player(uid,name,first.discipline==='civil'?'air':'civil',now);
 W.prepare(s,now);Research.migrate(s,now);Contracts.migrate(s);Operations.migrate(s,now);People.migrate(s,now);Peer.migrate(s,now);World.migrate(s,now);Living.migrate(s,now);Institute.migrate(s,now);Joint.migrate(s);s.rulesVersion=8;log(s,s.players[uid].name+' 入住。联合实验室现在真的联合了。',now);
}
function progress(p,amount){
 if(amount<=0)return;
 if(['review','proof'].includes(p.paper.phase)){p.paper.bank=clamp(p.paper.bank+amount,0,60);return;}
 if(['major','minor'].includes(p.paper.phase)){
  const space=p.paper.required-p.paper.progress;
  p.paper.progress=Math.min(p.paper.required,p.paper.progress+amount);
  p.paper.bank=clamp(p.paper.bank+Math.max(0,amount-space),0,60);return;
 }
 p.paper.progress=clamp(p.paper.progress+amount,0,100);
}
function active(s,type,target,now){return s.effects.find(e=>e.type===type&&e.target===target&&e.expires>now&&!e.done);}
function equipmentActive(s,p,id,now){
 const lent=s.effects.some(e=>e.type==='borrow'&&e.target===p.id&&e.item===id&&e.expires>now&&!e.done);
 const borrowed=s.effects.some(e=>e.type==='borrow'&&e.source===p.id&&e.item===id&&e.expires>now&&!e.done);
 return borrowed||(p.active.includes(id)&&!lent);
}
function reward(s,p,d,now,main=false){
 W.change(p,Math.max(-p.funds,d.f||0),d.note||p._moneyReason||'科研事件收支',d.category||p._moneyCategory||'event',now);p.mood=clamp(p.mood+(d.m||0),0,100);
 p.tutor=clamp(p.tutor+(d.t||0),0,100);p.rep=Math.max(0,p.rep+(d.r||0));
 let amount=d.p||0;
 if(main&&amount>0){
  if(p.mood>=80)amount+=2;if(s.lab.level>=3)amount++;
  if(p.discipline==='civil'&&p.actionCount%3===1&&p.actionCount>1)amount+=4;
  const memo=active(s,'inspiration',p.id,now);if(memo){amount+=8;memo.done=true;}
  const busy=active(s,'server',p.id,now);
  if(busy&&p.pending?.type==='event'&&[2,18,19].includes(p.pending.event)){amount=Math.max(4,Math.floor(amount/2));busy.done=true;}
  if(p.tutor>=70&&(p.position===4||p.position===13))amount+=2;
 }
 progress(p,amount);
 if(main&&amount>0)Research.addIdeas(p,Math.min(3,Math.ceil(amount/4)));
 if(d.other){const q=other(s,p);if(q)reward(s,q,d.other,now);}
}
function draw(p,rng=random){if(p.hand.length<6)p.hand.push(Math.floor(rng()*C.cards.length));else W.change(p,20,'手牌已满，科研卡兑换','card');}
function accept(s,p,now){
 const manuscript=structuredClone(p.paper),bank=p.paper.bank;p.papers++;p.credits++;p.rep+=5;W.change(p,100,'论文发表奖励：'+(manuscript.title||'当前稿件'),'paper',now);p.mood=clamp(p.mood+10,0,100);
 p.paper={phase:'draft',progress:bank,bank:0,reviewAt:0,reviewRoll:0,round:0,required:0};
 Research.paperAccepted(s,p,now,manuscript);
 log(s,p.name+' 的论文 Accept！导师在群里发了一个大拇指。',now,'paper');
}
function review(s,p,now){Peer.settleMentor(s,p,now);}
function rate(s,project,now){
 const def=C.projects[project.def],p=s.players[project.owner];
 let bonus=def.domain===p.discipline?.1:0;
 const eligible=def.equipment.filter(id=>equipmentActive(s,p,id,now));
 bonus+=Math.max(0,...eligible.map(id=>C.equipment.find(x=>x.id===id).bonus));
 if(s.lab.level>=2)bonus+=.05;
 const all=Object.values(s.players);
 const both=all.length===2&&all.every(x=>Object.values(s.projects).some(pr=>pr.owner===x.id&&C.projects[pr.def].domain===x.discipline));
 if(def.domain==='cross'){if(both)bonus+=.05;if(s.lab.level>=4)bonus+=.05;}
 return def.income*(1+Math.min(.3,bonus)+Research.bonus(p));
}
function settleProject(s,pr,now){
 if(pr.finance?.model==='contract'){pr.lastAt=Math.max(pr.lastAt,now);return;}
 if(now<=pr.lastAt)return;
 if(pr.completedAt){pr.lastAt=now;return;}
 const boundaries=[pr.lastAt,now];
 for(const e of s.effects)if(!e.done&&e.expires>pr.lastAt&&e.expires<now)boundaries.push(e.expires);
 boundaries.sort((a,b)=>a-b);
 for(let k=0;k<boundaries.length-1;k++){
  let t=boundaries[k],end=boundaries[k+1];if(pr.stock.length>=6||pr.completedAt)break;
  if(s.effects.some(e=>e.type==='pause'&&e.project===pr.def&&e.target===pr.owner&&!e.done&&e.expires>t))continue;
  while(t<end&&pr.stock.length<6){
   const dt=Math.min(end-t,CYCLE-pr.elapsed);pr.value+=rate(s,pr,t)*dt/CYCLE;pr.elapsed+=dt;t+=dt;
   if(pr.elapsed>=CYCLE){
    let funds=Math.round(pr.value*1e6)/1e6;const steal=active(s,'steal',pr.owner,t-1);
    if(pr.finance?.model==='contract'){funds=Math.min(funds,Math.max(0,pr.finance.totalFunding-pr.finance.allocatedFunding));pr.finance.allocatedFunding=Math.round((pr.finance.allocatedFunding+funds)*1e6)/1e6;if(pr.finance.allocatedFunding>=pr.finance.totalFunding)pr.completedAt=t;}
    if(steal&&steal.project===pr.def){const taken=Math.min(20,funds);funds-=taken;W.change(s.players[steal.source],taken,'接走外协单：'+C.projects[pr.def].name,'project',now);progress(s.players[pr.owner],8);steal.done=true;
      log(s,s.players[steal.source].name+' 接走一笔外协单：'+taken+' 经费。项目主人获得 8 进度，设施仍归原主。',now,'interaction');}
    pr.stock.push({funds,progress:C.projects[pr.def].progress});pr.elapsed=0;pr.value=0;
    if(pr.completedAt)break;
   }
  }
 }
 pr.lastAt=now;
}
function settle(s,now){
 W.prepare(s,now);
 if(s.rulesVersion<2)for(const pr of Object.values(s.projects))settleProject(s,pr,now);
 Research.migrate(s,now);
 for(const pr of Object.values(s.projects))if(!pr.finance)pr.finance={model:'facility',initialInvestment:Math.round(C.projects[pr.def].cost*(s.players[pr.owner].discipline==='civil'&&C.projects[pr.def].domain==='civil'?.9:1)),totalFunding:0,advance:0,allocatedFunding:0,receivedFunding:0,operatingIncome:0,legacy:true};
 Operations.migrate(s,now);Contracts.migrate(s);People.migrate(s,now);Peer.migrate(s,now);
 Living.migrate(s,now);Institute.migrate(s,now);Joint.migrate(s);s.rulesVersion=8;Operations.settle(s,now);Contracts.settle(s,now);World.settle(s,now);Joint.settle(s,now);Living.settle(s,now);People.settle(s,now);Institute.settle(s,now);
 for(const p of Object.values(s.players)){
  if(p.energy<5){const ticks=Math.max(0,Math.floor((now-p.energyAt)/(30*MIN)));if(ticks){p.energy=Math.min(5,p.energy+ticks);p.energyAt=p.energy===5?now:p.energyAt+ticks*30*MIN;}}
 }
 for(const pr of Object.values(s.projects))settleProject(s,pr,now);
 for(const p of Object.values(s.players))review(s,p,now);
 Research.settle(s,now);
 for(const p of Object.values(s.players))if(p.pending&&p.pending.expires<=now)resolve(s,p,'skip',now,random,true);
 s.effects=s.effects.filter(e=>e.expires>now&&!e.done);
}
function claim(s,p,now){
 let funds=0,paper=0;
 for(const pr of Object.values(s.projects).filter(x=>x.owner===p.id)){
  let projectFunds=0;for(const b of pr.stock){projectFunds+=b.funds;funds+=b.funds;paper+=b.progress;if(pr.finance){pr.finance.operatingIncome=Math.round((pr.finance.operatingIncome+b.funds)*1e6)/1e6;if(pr.finance.model==='contract')pr.finance.receivedFunding=Math.round((pr.finance.receivedFunding+b.funds)*1e6)/1e6;}}W.change(p,projectFunds,'科研设施产出：'+(C.projects[pr.def]?.name||pr.def),'project',now,pr.def);pr.stock=[];
 }
 if(funds||paper){progress(p,paper);log(s,p.name+' 收到了项目产出：经费 +'+Math.floor(funds)+'，进度 +'+paper+'。',now,'income');}
 Research.claim(s,p,now);Operations.claim(s,p,now);Institute.claim(p,now);
 return {funds,paper};
}
function takeEnergy(p,now,amount=1){check(p.energy>=amount,'行动力还在路上，休息一下再来');if(p.energy===5)p.energyAt=now;p.energy-=amount;}
function encounter(s,p,now,rng){
 const tile=C.tiles[p.position],q=other(s,p);
 if(tile.type==='project'){
  const pr=s.projects[tile.project];
  if(!pr){p.pending={type:'project',project:tile.project,expires:now+12*HOUR};return;}
  if(pr.owner===p.id){reward(s,p,{p:5},now,true);log(s,p.name+' 查看了自己的 '+C.projects[pr.def].name+'，进度 +5。',now);}
  else{const paid=Math.min(20,p.funds);W.change(p,-paid,'借用设备：'+C.projects[pr.def].name,'project',now);W.change(s.players[pr.owner],paid+30,'设备借用与园区报销：'+p.name,'project',now);reward(s,p,{p:5},now,true);log(s,p.name+' 借用了 '+s.players[pr.owner].name+' 的设备，园区报销了一部分费用。',now,'interaction');}
  return;
 }
 if(tile.type==='event'||tile.type==='boss'){
  const pool=C.events.filter(e=>tile.type==='boss'?e.id===29:!p.recent.includes(e.id));
  const weighted=pool.flatMap(e=>Array(e.tag===p.discipline?3:e.tag==='cross'?2:1).fill(e));
  const ev=weighted[Math.floor(rng()*weighted.length)]||C.events[0];
  p.pending={type:'event',event:ev.id,roll:rng(),expires:now+12*HOUR};p.recent=[ev.id,...p.recent].slice(0,3);
  return;
 }
 if(['library','coffee','equipment'].includes(tile.type)){p.pending={type:tile.type,expires:now+12*HOUR};return;}
 if(tile.type==='card'){draw(p,rng);log(s,p.name+' 在科研便利店捡到一张卡片。',now);return;}
 const deltas={start:{m:5},mentor:{t:5,p:6},rest:{m:p.mood<=25?17:12},lab:{m:3,other:{m:3}},paper:{p:8},commute:{p:6,m:4},poster:{r:1,p:4}};
 reward(s,p,deltas[tile.type]||{p:4},now,true);
 log(s,p.name+' 到了 '+tile.name+'，今日也算推进科研了。',now);
 if(tile.type==='lab'&&!q)log(s,'白板上写着：一个人的交叉学科，暂时只能叫叉。',now);
}
function returnBorrowed(s,p){for(const e of s.effects)if(e.type==='borrow'&&e.source===p.id&&!e.done)e.done=true;}
function finishMove(s,p,steps,now,rng){
 const old=p.position;p.position=(old+steps)%30;if(old+steps>=30)W.change(p,80,'绕校园一圈的科研补助','event',now);
 p.lastMove={...(p.lastMove||{id:randomUUID(),dice:steps}),from:old,to:p.position,steps,pendingRoute:false,at:now,kind:'walk',scene:'campus'};
 log(s,p.name+' 前进 '+steps+' 格，到了 '+C.tiles[p.position].name+'。',now,'move');
 encounter(s,p,now,rng);if(!p.pending)returnBorrowed(s,p);
}
function move(s,p,now,rng=random){
 check(!p.pending,'先完成当前地点的选择');takeEnergy(p,now);const before=p.actionCount;p.actionCount++;p.cardUsed=false;
 p.cardDraws=(p.cardDraws||[]).filter(t=>now-t<24*HOUR);
 if(p.actionCount%3===0&&p.cardDraws.length<4){draw(p,rng);p.cardDraws.push(now);}
 const forced=active(s,'mentor',p.id,now);
 if(forced){p.scene='campus';forced.done=true;const from=p.position;p.position=4;p.lastMove={id:randomUUID(),from,to:4,dice:0,steps:0,at:now,kind:'teleport',pendingRoute:false,scene:'campus'};encounter(s,p,now,rng);if(!p.pending)returnBorrowed(s,p);log(s,p.name+' 收到导师召唤，去了办公室。',now,'interaction');return;}
 if(p.scene!=='campus'){World.move(s,p,now,rng);return;}
 const dice=1+Math.floor(rng()*6),bus=active(s,'bus',p.id,now);
 p.lastMove={id:randomUUID(),from:p.position,to:p.position,dice,steps:0,pendingRoute:false,at:now,kind:'walk'};
 if(bus||(p.discipline==='air'&&before>0&&before%3===0)){
  p.pending={type:'route',dice,bus:!!bus,expires:now+12*HOUR};
  p.lastMove.pendingRoute=true;
  if(bus)bus.done=true;return;
 }
 finishMove(s,p,dice,now,rng);
}
function price(p,def){return def.kind==='contract'?0:Math.round(def.cost*(p.discipline==='civil'&&def.domain==='civil'?.9:1));}
function resolve(s,p,choice,now,rng=random,timeout=false){
 const pending=p.pending;check(pending,'这里已经结算过了');
 if(pending.type==='world'){World.resolve(s,p,choice,now);p.pending=null;returnBorrowed(s,p);return;}
 if(pending.type==='route'){
  let steps=Number(choice);if(timeout||choice==='skip')steps=pending.dice;
  check(Number.isInteger(steps)&&(pending.bus?steps>=1&&steps<=6:steps===pending.dice||steps===Math.min(6,pending.dice+1)),'路线选择无效');
  p.pending=null;finishMove(s,p,steps,now,rng);return;
 }
 if(pending.type==='project'){
  if(choice==='buy'){
   const def=C.projects[pending.project];check(!s.projects[def.id],'对方先签下了项目，可免费离开');
   check(Object.values(s.projects).filter(x=>x.owner===p.id&&!x.completedAt).length<3,'每人最多三个进行中的项目或设施');
   const cost=price(p,def);check(p.funds>=cost,'科研经费不足');W.change(p,-cost,'项目启动投入：'+def.name,'project',now,def.id);
   const contract=def.kind==='contract',advance=0;
   s.projects[def.id]={def:def.id,owner:p.id,lastAt:now,signedAt:now,elapsed:0,value:0,stock:[],finance:{model:def.kind,initialInvestment:cost,totalFunding:def.totalFunding,advance,allocatedFunding:advance,receivedFunding:advance,operatingIncome:0}};
   Contracts.initialize(s.projects[def.id]);
   log(s,p.name+(contract?' 签订横向合同「'+def.name+'」，总经费 '+def.totalFunding+'；完成四阶段任务并验收后拨款。':' 建设了「'+def.name+'」，投入 '+cost+' 经费。'),now,'project');
  }else reward(s,p,{p:4},now,true);
 }else if(pending.type==='equipment'){
  if(choice!=='skip'){
   const def=C.equipment.find(e=>e.id===choice);check(def,'设备不存在');check(!p.equipment.includes(def.id),'已经拥有这件设备');
   const coupon=active(s,'coupon',p.id,now);const cost=Math.max(0,def.price-(coupon?60:0));check(p.funds>=cost,'设备经费不足');
   W.change(p,-cost,'随身设备采购：'+def.name,'procurement',now,def.id);p.equipment.push(def.id);if(p.active.length<2)p.active.push(def.id);if(coupon)coupon.done=true;
   log(s,p.name+' 添置了 '+def.name+'，设备看起来比人精神。',now,'project');
  }else reward(s,p,{p:4},now,true);
 }else if(pending.type==='event'){
  const event=C.events[pending.event];const selected=timeout?event.choices.find(c=>(c.delta.f||0)>=0&&!c.delta.chance):event.choices[Number(choice)];
  const opt=selected||event.choices[0];let d=opt.delta;
  const maxCost=Math.max(0,-(d.f||0),-(d.win?.f||0),-(d.lose?.f||0));
  check(p.funds>=maxCost||timeout,'这个选择需要预留 '+maxCost+' 经费');
  if(d.chance){const chance=Math.min(.9,d.chance+(d.gpu&&equipmentActive(s,p,'gpu',now)?.1:0));d=pending.roll<chance?d.win:d.lose;}
  const extension=active(s,'extension',p.id,now);
  if(extension&&((d.f||0)<0||(d.m||0)<0)){d={...d,f:d.f<0?Math.ceil(d.f/2):d.f,m:d.m<0?Math.ceil(d.m/2):d.m};extension.done=true;}
  const before={f:p.funds,p:p.paper.progress+p.paper.bank,m:p.mood,t:p.tutor,r:p.rep};
  reward(s,p,d,now,true);
  const after={f:p.funds,p:p.paper.progress+p.paper.bank,m:p.mood,t:p.tutor,r:p.rep};
  const labels={f:'经费',p:'进度',m:'心情',t:'好感',r:'声望'};
  const summary=Object.keys(labels).filter(key=>after[key]!==before[key]).map(key=>labels[key]+(after[key]>before[key]?'+':'')+Math.round((after[key]-before[key])*1e6)/1e6).join('，')||'平安无事';
  log(s,p.name+'：'+event.title+' → '+opt.text+'。实际结果：'+summary+'。',now,'event');
  const meeting=active(s,'meeting',p.id,now);if(meeting&&p.position===13){p.mood=clamp(p.mood-6,0,100);meeting.done=true;}
 }else if(pending.type==='library'){reward(s,p,choice==='1'?{p:4,other:{p:4}}:{p:8},now,true);}
 else if(pending.type==='coffee'){
  if(choice==='0'){check(p.funds>=20,'咖啡需要 20 经费');reward(s,p,{f:-20,p:10},now,true);}
  else reward(s,p,{m:6},now);
 }
 p.pending=null;returnBorrowed(s,p);
}
function useCard(s,p,id,now,rng=random){
 check(!p.pending,'先完成当前地点的选择');check(!p.cardUsed,'每次移动结束后可以出一张牌');
 check(Number.isInteger(id)&&p.hand.includes(id),'手里没有这张牌');const def=C.cards[id],q=other(s,p);
 if(def.type!=='self')check(q,'先邀请搭子加入园区');
 const add=(type,target,hours,payload={})=>{
  const previous=active(s,type,target,now);
  if(previous&&!payload.negative){previous.expires=now+hours*HOUR;return;}
  s.effects.push({id:randomUUID(),type,source:p.id,target,expires:now+hours*HOUR,...payload});
 };
 if(def.type==='attack'){
  check(!s.effects.some(e=>e.target===q.id&&e.negative&&!e.done&&e.expires>now),'搭子已经有一个小麻烦了');
  check(!q.attackedAt||now-q.attackedAt>=3*HOUR,'搭子三小时内只能被坑一次');
  p.attacks=p.attacks.filter(t=>now-t<24*HOUR);check(p.attacks.length<2,'今天的恶作剧额度已经用完了');
  let pr;
  if([5,6,15].includes(id)){
   const targets=Object.values(s.projects).filter(x=>x.owner===q.id&&!x.completedAt&&(id!==5||C.projects[x.def].domain!=='civil')&&(id!==15||(x.finance?.model!=='contract'&&x.stock.length<6)));
   check(targets.length,'搭子没有可用的目标项目');pr=targets[Math.floor(rng()*targets.length)];
  }
  if(id===2)check(q.active.length,'搭子还没有启用的设备');
  const shield=active(s,'shield',q.id,now);q.attackedAt=now;p.attacks.push(now);
  if(shield){shield.done=true;log(s,q.name+' 用导师出差挡下了 '+p.name+' 的 '+def.name+'。',now,'interaction');}
  else{
   const payload={negative:true};
   if(id===0)add('mentor',q.id,12,payload);
   if(id===1)add('server',q.id,2,payload);
   if(id===2)add('borrow',q.id,2,{...payload,item:q.active[Math.floor(rng()*q.active.length)]});
   if(id===4)add('meeting',q.id,4,payload);
   if(id===5||id===6)add('pause',q.id,.5,{...payload,project:pr.def});
   if(id===15)add('steal',q.id,6,{...payload,project:pr.def});
   log(s,p.name+' 对 '+q.name+' 使用了「'+def.name+'」。设施不会被永久抢走。',now,'interaction');
  }
 }else{
  if(def.type==='coop'){check(!p.coopAt[id]||now-p.coopAt[id]>=2*HOUR,'同名合作效果两小时后可再次使用');p.coopAt[id]=now;q.coopAt[id]=now;}
  if(id===3)reward(s,p,{p:8,other:{p:8}},now);
  if(id===7)reward(s,p,{m:10,other:{m:10}},now);
  if(id===8){takeEnergy(p,now);reward(s,p,{r:1,other:{p:15}},now);}
  if(id===9)add('shield',p.id,12);
  if(id===10)add('bus',p.id,12);
  if(id===11)add('coupon',p.id,24);
  if(id===12)reward(s,p,{f:80},now);
  if(id===13)add('extension',p.id,12);
  if(id===14){reward(s,p,{p:10,other:{p:10}},now);
   const both=Object.values(s.players).every(x=>Object.values(s.projects).some(pr=>pr.owner===x.id&&C.projects[pr.def].domain===x.discipline));
   if(both)reward(s,p,{f:20,other:{f:20}},now);
  }
  if(id===16)reward(s,p,{f:100,other:{p:4}},now);
  if(id===17)add('inspiration',p.id,12);
  log(s,p.name+' 使用了「'+def.name+'」'+(def.type==='coop'?'，搭子收到了一点科研善意。':'。'),now,'interaction');
 }
 p.hand.splice(p.hand.indexOf(id),1);p.cardUsed=true;
}
function submit(s,p,now,rng=random){Peer.submit(s,p,now,rng);}
function contribute(s,p,kind,amount,now){
 check(['funds','credits','rep'].includes(kind),'贡献类型无效');check(Number.isSafeInteger(amount)&&amount>0&&amount<=100000,'请输入有效的正整数');
 if(kind==='funds'){check(p.funds>=amount,'经费不足');W.change(p,-amount,'共同实验室建设投入','lab',now);p.donated+=amount;}
 if(kind==='credits'){check(p.credits>=amount,'可用成果点不足');p.credits-=amount;}
 if(kind==='rep'){check(p.rep-p.registeredRep>=amount,'这些声望已经登记过了');p.registeredRep+=amount;}
 s.lab[kind]+=amount;log(s,p.name+' 向实验室投入 '+amount+' '+({funds:'经费',credits:'成果点',rep:'登记声望'}[kind])+'。',now,'lab');
 while(s.lab.level<5){
  const next=C.lab[s.lab.level];const both=Object.values(s.players).length===2&&Object.values(s.players).every(x=>x.donated>=100);
  if(!both||s.lab.funds<next.funds||s.lab.credits<next.credits||s.lab.rep<next.rep)break;
  s.lab.level++;Research.labUpgraded(s,s.lab.level,now);log(s,'联合实验室升级为「'+next.name+'」！两张桌子居然真的发展起来了。',now,'lab');
 }
}
function execute(s,uid,action,payload,now=Date.now(),rng=random){
 const p=s.players[uid];check(p,'你不在这个园区里');settle(s,now);claim(s,p,now);
 p._moneyCategory=action==='card'?'card':action.startsWith('mail_')?'mail':'event';
 p._moneyReason=action==='resolve'?(p.pending?.type==='event'?'科研事件：'+(C.events[p.pending.event]?.title||C.events[p.pending.event]?.name||'园区偶遇'):'地点选择：'+p.pending?.type):action==='card'?'科研卡：'+C.cards[Number(payload.card)]?.name:action==='mail_reply'?'回复来信：'+(p.inbox.find(m=>m.id===payload.id)?.rules?.subject||'科研来信'):action==='world_claim'?'活动结果：'+(Object.values(s.players).flatMap(p=>p.world.jobs).find(j=>j.id===payload.id)?.title||'园区活动'):'科研活动收支';
 if(action==='move')move(s,p,now,rng);
 else if(action==='resolve')resolve(s,p,String(payload.choice),now,rng);
 else if(action==='card')useCard(s,p,Number(payload.card),now,rng);
 else if(action==='submit')submit(s,p,now,rng);
 else if(action==='contribute')contribute(s,p,payload.kind,Number(payload.amount),now);
 else if(action==='equip'){
  check(Array.isArray(payload.items)&&payload.items.length<=2&&new Set(payload.items).size===payload.items.length&&payload.items.every(x=>p.equipment.includes(x)),'最多启用两件已有设备');p.active=[...payload.items];
 }else if(!Living.dispatch(s,p,action,payload,now)&&!Joint.dispatch(s,p,action,payload,now)&&!Institute.dispatch(s,p,action,payload,now)&&!World.dispatch(s,p,action,payload,now)&&!People.dispatch(s,p,action,payload,now)&&!Peer.dispatch(s,p,action,payload,now)&&!Operations.dispatch(s,p,action,payload,now)&&!Contracts.dispatch(s,p,action,payload,now)&&!Research.dispatch(s,p,action,payload,now,rng))check(action==='state'||action==='export','未知操作');
 W.assertBalanced(s);return view(s,uid,now);
}
function view(s,uid,now){
 Operations.migrate(s,now);People.migrate(s,now);Peer.migrate(s,now);World.migrate(s,now);Living.migrate(s,now);Institute.migrate(s,now);Joint.migrate(s);
 const result=JSON.parse(JSON.stringify(s));result.incomingStudentRequests=Object.values(s.players).flatMap(p=>(p.living?.requests||[]).filter(r=>r.partnerId===uid&&r.status==='invited').map(r=>({...r,ownerId:p.id,ownerName:p.name})));result.self=uid;result.serverNow=now;
 for(const pr of Object.values(result.projects)){const step=Contracts.current(pr);if(step?.status==='available'&&pr.owner===uid)pr.contract.quotes=Object.fromEntries(require('./contract-content.cjs').modes.map(m=>[m.id,Contracts.quote(s,s.projects[pr.def],m.id,now)]));}
 for(const p of Object.values(result.players)){delete p.paper.reviewRoll;W.init(p,now);for(const st of p.students)People.publicStudent(st);
  p.inbox=p.inbox.map(require('./mail-content.cjs').publicMail);
  p.benefits={achievementBonus:Research.bonus(p),quota:Research.quota(s,p)};
  p.paper.progress=Math.floor(p.paper.progress*10+1e-7)/10;p.paper.bank=Math.floor(p.paper.bank*10+1e-7)/10;
  if(p.id!==uid){delete p.ledger;delete p.institute.candidates;delete p.living.requests;delete p.living.story;p.living.notes=p.living.notes.filter(n=>n.from===uid||n.to===uid);delete p.world.applicants;delete p.world.offers;delete p.inbox;delete p.nextMailAt;delete p.mailSequence;delete p.threadSummaries;delete p.mailSent;if(p.admissions)delete p.admissions.candidates;}
  if(p.id!==uid){delete p.hand;delete p.pending;delete p.coopAt;}
  else if(p.pending)delete p.pending.roll;
 }
 return require('./people.cjs').stripHidden(result);
}
const Research=require('./research.cjs').createSystems({C,log,progress,reward,draw,check,HOUR,researchWeight:(st,start,end)=>Contracts.researchWeight(st,start,end),onLabUpgrade:(s,level,now)=>Operations.promote(s,level,now),getPeople:()=>People,getPeer:()=>Peer});
const Contracts=require('./contracts.cjs').createContracts({C,check,log,progress,rate,HOUR,procurementBonus:(s,pr)=>Operations.bonus(s.players[pr.owner],C.projects[pr.def].domain),getPeople:()=>People});
const Operations=require('./operations.cjs').createOperations({check,log,progress,HOUR,getPeople:()=>People});
const People=require('./people.cjs').createPeople({check,log,HOUR,advanceTask:(s,p,st,n,now,from)=>Research.Portfolio.advanceContinuous(s,p,st,n,from,now),teacherProgress:progress});
const Peer=require('./peer-review.cjs').createPeerReview({check,log,HOUR,accept,finishStudent:(s,p,st,now)=>Research.Portfolio.finishTask(s,p,st,now),advanceStudent:(s,p,st,n,now)=>Research.Portfolio.advancePoints(s,p,st,n,now),onHelp:(p,st,now)=>People.interact(p,st,'guide',now)});
const World=require('./world.cjs').createWorld({check,log,reward,progress,HOUR,getPeople:()=>People,getOperations:()=>Operations,recordActivity:(p,st,record,now)=>Research.Portfolio.activity(p,st,record,now)});
const Living=require('./living-lab.cjs').createLiving({check,log,progress,HOUR,getPeople:()=>People,getPortfolio:()=>Research.Portfolio,getWorld:()=>World,activity:(p,st,r,now)=>Research.Portfolio.activity(p,st,r,now)});
const Joint=require('./joint-research.cjs').createJoint({check,log,progress,HOUR,getPeople:()=>People,activity:(p,st,r,now)=>Research.Portfolio.activity(p,st,r,now)});
const Institute=require('./institute.cjs').createInstitute({check,log,HOUR,getPeople:()=>People,getPortfolio:()=>Research.Portfolio,getPeer:()=>Peer,activity:(p,st,r,now)=>Research.Portfolio.activity(p,st,r,now)});
module.exports={Living,Joint,Institute,Wallet:W,C,MIN,HOUR,CYCLE,createRoom,join,settle,claim,execute,view,price,rate,progress,reward,log,Research,Contracts,Operations,People,Peer,World};
