'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const G=require('../cloudfunctions/letusMoyu/game.cjs');
const NOW=1_800_000_000_000;
function setup(){const s=G.createRoom('ABC','a','点云','civil',NOW);G.join(s,'b','起飞',NOW);return s;}
function project(s,def=0){s.projects[def]={def,owner:'a',lastAt:NOW,elapsed:0,value:0,stock:[]};return s.projects[def];}
test('完整内容数量',()=>{assert.equal(G.C.tiles.length,30);assert.equal(G.C.events.length,36);assert.equal(G.C.cards.length,18);assert.equal(G.C.projects.length,10);});
test('房间最多两人，专业互补',()=>{const s=setup();assert.equal(s.players.b.discipline,'air');assert.throws(()=>G.join(s,'c','第三人',NOW));});
test('行动力保留不足一个周期的恢复量',()=>{const s=setup(),p=s.players.a;p.energy=2;G.settle(s,NOW+20*G.MIN);G.execute(s,'a','move',{},NOW+20*G.MIN,()=>0);G.settle(s,NOW+30*G.MIN);assert.equal(p.energy,2);});
test('满行动力不会暗中积攒恢复量',()=>{const s=setup();G.execute(s,'a','move',{},NOW+24*G.HOUR,()=>0);G.settle(s,NOW+24*G.HOUR+G.MIN);assert.equal(s.players.a.energy,4);});
test('待选择事件阻止重掷，刷新保留相同骰子',()=>{const s=setup();G.execute(s,'a','move',{},NOW,()=>0);const p=s.players.a;assert.equal(p.position,1);assert.throws(()=>G.execute(s,'a','move',{},NOW,()=>.9));assert.equal(p.energy,4);});
test('一个落地只结算一次',()=>{const s=setup();G.execute(s,'a','move',{},NOW,()=>0);G.execute(s,'a','resolve',{choice:'0'},NOW);assert.throws(()=>G.execute(s,'a','resolve',{choice:'0'},NOW));});
test('十二小时仓储上限，对方读取不能代领',()=>{const s=setup(),pr=project(s);G.execute(s,'b','state',{},NOW+30*G.HOUR);assert.equal(pr.stock.length,6);assert.equal(s.players.a.funds,700);G.execute(s,'b','state',{},NOW+60*G.HOUR);assert.equal(pr.stock.length,6);G.execute(s,'a','state',{},NOW+60*G.HOUR);assert.equal(pr.stock.length,0);assert.ok(Math.abs(s.players.a.funds-(700+24*1.1*6))<1e-7);});
test('暂停只扣未来生产时间，不追扣仓库',()=>{const s=setup(),pr=project(s);G.settle(s,NOW+G.CYCLE);s.effects.push({type:'pause',target:'a',project:0,expires:NOW+G.CYCLE+30*G.MIN});G.settle(s,NOW+2*G.CYCLE);assert.equal(pr.stock.length,1);assert.equal(pr.elapsed,90*G.MIN);});
test('截胡只抢新产出并补偿论文进度',()=>{const s=setup(),pr=project(s);G.settle(s,NOW+G.CYCLE);s.effects.push({type:'steal',source:'b',target:'a',project:0,expires:NOW+8*G.HOUR});G.settle(s,NOW+2*G.CYCLE);assert.equal(pr.stock[0].funds,26.4);assert.ok(pr.stock[1].funds<10);assert.equal(s.players.b.funds,720);assert.equal(s.players.a.paper.progress,8);});
test('设备加成不追溯历史生产',()=>{const s=setup(),pr=project(s);G.settle(s,NOW+G.HOUR);const before=pr.value;s.players.a.active=['lidar'];G.settle(s,NOW+2*G.HOUR);assert.ok(Math.abs(pr.stock[0].funds-(before+24*1.25/2))<1e-6);});
test('论文在审时储存下一篇灵感，接收后正常继承',()=>{const s=setup(),p=s.players.a;p.paper.progress=100;G.execute(s,'a','submit',{},NOW,()=>0);G.progress(p,25);G.settle(s,NOW+2*G.HOUR);assert.equal(p.papers,1);assert.equal(p.credits,1);assert.equal(p.paper.progress,25);});
test('大修最终最多转小修，不会再次拒稿',()=>{const s=setup(),p=s.players.a;p.paper.progress=100;G.execute(s,'a','submit',{},NOW,()=>.7);G.settle(s,NOW+2*G.HOUR);assert.equal(p.paper.phase,'major');G.progress(p,30);G.execute(s,'a','submit',{},NOW+2*G.HOUR,()=>.9);G.settle(s,NOW+3*G.HOUR);assert.equal(p.paper.phase,'minor');G.progress(p,15);G.execute(s,'a','submit',{},NOW+3*G.HOUR,()=>.99);G.settle(s,NOW+3.5*G.HOUR);assert.equal(p.papers,1);});
test('贡献成果点不删除累计论文',()=>{const s=setup(),p=s.players.a;p.papers=2;p.credits=2;G.execute(s,'a','contribute',{kind:'credits',amount:1},NOW);assert.equal(p.papers,2);assert.equal(p.credits,1);});
test('同一点声望不能反复登记',()=>{const s=setup();s.players.a.rep=5;G.execute(s,'a','contribute',{kind:'rep',amount:5},NOW);assert.throws(()=>G.execute(s,'a','contribute',{kind:'rep',amount:1},NOW));assert.equal(s.lab.rep,5);});
test('对方手牌与隐藏审稿结果不外泄',()=>{const s=setup();s.players.b.paper.reviewRoll=.73;const v=G.view(s,'a',NOW);assert.equal(v.players.b.hand,undefined);assert.equal(v.players.b.paper.reviewRoll,undefined);assert.equal(v.players.a.paper.reviewRoll,undefined);});
test('无目标攻击不会消耗卡片或名额',()=>{const s=setup(),p=s.players.a;p.hand=[5];p.cardUsed=false;assert.throws(()=>G.execute(s,'a','card',{card:5},NOW));assert.deepEqual(p.hand,[5]);assert.equal(p.cardUsed,false);});
test('互坑冷却与防御生效',()=>{const s=setup(),p=s.players.a;p.hand=[0,1];p.cardUsed=false;G.execute(s,'a','card',{card:0},NOW);p.cardUsed=false;assert.throws(()=>G.execute(s,'a','card',{card:1},NOW+G.HOUR));assert.equal(p.hand.length,1);});
