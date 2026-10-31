'use strict';
const {randomUUID}=require('node:crypto'),round=n=>Math.round(n*1e6)/1e6;
const categories={salary:'学校工资',rental:'校内租赁',wages:'学生劳务',faculty:'教师团队',project:'项目与合作',procurement:'设备采购',paper:'论文与审稿',patent:'专利',students:'培养与招生',lab:'实验室建设',event:'园区事件',mail:'邮件与附件',card:'科研卡牌',living:'实验室生活',transfer:'成果转化',gift:'礼物与布置'};
function init(p,now){p.ledger??={version:1,openedAt:now,openingBalance:p.funds,balance:p.funds,income:0,expense:0,sequence:0,byCategory:{},entries:[]};p._walletNow=now;p._financePending??=[];}
function prepare(s,now){for(const p of Object.values(s.players)){init(p,now);const adjustment=round(p.funds-p.ledger.balance);if(adjustment){p.funds=p.ledger.balance;change(p,adjustment,'管理员余额调整（同步前差额）','event',now);}}}
function change(p,amount,title,category='event',now,related=''){
 amount=round(amount);if(!Number.isFinite(amount))throw Error('经费金额无效');if(!amount)return 0;
 init(p,now??p._walletNow??Date.now());if(p.funds+amount<-.000001)throw Error('科研经费不足');
 if(!categories[category])throw Error('未知经费分类');p.funds=round(Math.max(0,p.funds+amount));
 const l=p.ledger,row={id:randomUUID(),seq:++l.sequence,at:now??p._walletNow,amount,direction:amount>0?'income':'expense',balance:p.funds,title:String(title).slice(0,160),category,related:String(related||'').slice(0,120)};
 l.balance=p.funds;l.income=round(l.income+Math.max(0,amount));l.expense=round(l.expense+Math.max(0,-amount));l.byCategory[category]??={income:0,expense:0};l.byCategory[category][amount>0?'income':'expense']=round(l.byCategory[category][amount>0?'income':'expense']+Math.abs(amount));l.entries.push(row);l.entries=l.entries.slice(-100);p._financePending.push(row);return amount;
}
function assertBalanced(s){for(const p of Object.values(s.players)){const l=p.ledger;if(l&&(Math.abs(l.balance-p.funds)>.00001||Math.abs(l.openingBalance+l.income-l.expense-p.funds)>.00001))throw Error('经费明细与余额不一致，请保留原请求重试');}}
async function flush(tx,s){for(const p of Object.values(s.players)){for(const row of p._financePending||[])await tx.collection('letus_moyu_ledger').doc(s.id+'-'+p.id+'-'+row.seq).set({...row,ownerId:p.id,roomId:s.id});p._financePending=[];}assertBalanced(s);}
module.exports={init,prepare,change,assertBalanced,flush,categories};
