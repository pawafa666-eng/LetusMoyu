<script setup lang="ts">
import {computed,defineAsyncComponent,onMounted,onBeforeUnmount,ref} from 'vue'
import {X,ArrowLeft,ArrowRight,Dice5,Coins,Zap,BookOpen,Heart,Users,Mail,GraduationCap,FlaskConical,Trophy,Check,Play,FileBadge,Clock3} from '@lucide/vue'
import type {CampusDisplay,Motion} from '../types'
import content from '../content.json'
import DiceRoll from './DiceRoll.vue'
import CampusArt from './CampusArt.vue'
const Scene=defineAsyncComponent(()=>import('./CampusScene.vue'))
const emit=defineEmits<{close:[completed:boolean];rules:[]}>()
const dialog=ref<HTMLDialogElement>(),scene=ref<{playMove:(m:Motion)=>Promise<void>}>(),dice=ref<InstanceType<typeof DiceRoll>>()
const step=ref(0),busy=ref(false),fallback=ref(false),feedback=ref('这里的按钮都可以放心试，不会扣正式经费。'),done=ref<boolean[]>(Array(9).fill(false))
const funds=ref(700),energy=ref(5),paper=ref(80),partnerPaper=ref(30),mood=ref(65),studentMood=ref(60)
const paperStage=ref('draft')
const bought=ref(false),collected=ref(false),accepted=ref(false),mailReplied=ref(false),cared=ref(false),card=ref(''),myGift=ref(false),partnerGift=ref(false),won=ref(false)
const campus=ref<CampusDisplay>({version:0,self:'tutorial-fafa',lab:{level:1},players:{'tutorial-fafa':{id:'tutorial-fafa',discipline:'civil',position:29},'tutorial-yiyi':{id:'tutorial-yiyi',discipline:'air',position:17}},projects:{}})
const chapters=[
 {name:'先认识世界',title:'两个博士，一个不急的小世界。',tag:'01 / A LITTLE WORLD FOR TWO',body:'fafa 研究智能建造，Yizi 研究低空经济。可以互相帮忙，也能轻轻互坑。你上午来，TA 晚上来，园区都接得上。'},
 {name:'出去转一圈',title:'点一下骰子，小博士就出发。',tag:'02 / ONE SMALL RESEARCH BREAK',body:'每次移动消耗 1 点行动力，骰子决定前进几格。到了地点，再做一个简单选择。没选完也不用慌，下次回来继续。'},
 {name:'经营项目',title:'把科研项目，变成会工作的科研小摊。',tag:'03 / LET THE PROJECT DO SOME WORK',body:'横向签约不直接发钱。四阶段各安排一次执行，完成后提交验收；能自己做、让学生做、外协或与搭子合作分账。建设设施则先投入、持续经营。'},
 {name:'论文与专利',title:'Accept 不只是一个好听的单词。',tag:'04 / SMALL RESULTS, REAL REWARDS',body:'论文达到 100 进度即可投稿。先收到具体意见，回复并补充材料，审查通过后再支付版面费。演练把等待缩短成几秒，返修没有期限。'},
 {name:'和搭子互动',title:'给搭子留点故事，TA 晚点也能收到。',tag:'05 / LEAVE SOMETHING FOR YOUR PARTNER',body:'每次移动后可以用一张科研卡。不需要两人同时在线，对方再打开时就能看到效果和园区动态。合作与互坑都来一点。'},
 {name:'来信与学生',title:'地图以外，也有人惦记着你的科研。',tag:'06 / SOMETHING HAPPENS WHILE YOU ARE AWAY',body:'邮箱每 75–105 分钟来一封虚构邮件，合作邀约和离谱广告都有。还能招学生，看看研究进展，也听听同学最近顺不顺。'},
 {name:'一起获胜',title:'共同建成未来城市院士课题组，两个人都赢。',tag:'07 / TWO RESEARCHERS, ONE SHARED VICTORY',body:'经费、论文成果点、科研声望，一起投入联合实验室。达到五级，就完成本局共同目标。个人声望可以比较，胜利由两个人共享。'}
]
chapters.push(
 {name:'实验室生活',title:'他们也有自己的想法，实验室也会长大。',tag:'08 / A LIVING LABORATORY',body:'在“实验室生活”回复学生的主动请求。跨组采集先等双方老师确认，再由发起方支付 40 支持费；联合课题则有智能建造、低空两条独立工序。故事、毕业校友、成果转化和桌边礼物也在这里。'},
 {name:'经费明细',title:'工资和劳务，各记一笔，心里有底。',tag:'09 / EVERY LITTLE FUND',body:'打开“我的科研 → 经费明细”，按来源、收入支出与日期筛选，也可以导出全部结果。工资、每位学生劳务、采购、论文版面费与奖励分别记账。更新前的现有余额只作为期初，不编造以前的流水。'}
)
const livingStarted=ref(false),livingFinished=ref(false),demoOpening=ref(0),demoRows=ref<{title:string;amount:number;balance:number}[]>([])
async function demoCross(){if(!livingStarted.value){livingStarted.value=true;say('邀请已经放到搭子的桌上。尚未开工，也没有扣费。');return}if(livingFinished.value||busy.value)return;busy.value=true;funds.value-=40;say('切换搭子视角，第二位老师同意。现在才支付 40 支持费。');try{await wait(700);if(disposed)return;livingFinished.value=true;partnerPaper.value+=12;done.value[7]=true;say('演练把四小时缩成片刻：双方保留采集材料与学生履历。正式园区可以下线等待。')}finally{busy.value=false}}
function demoLedger(){if(done.value[8])return;demoOpening.value=funds.value;demoRows.value=[{title:'学校工资',amount:20,balance:funds.value+20},{title:'学生劳务',amount:-5,balance:funds.value+15}];funds.value+=15;done.value[8]=true;say('收入 +20、支出 −5，分别保留来源、时间和余额。净增加 15，但两笔都看得见。')}
const chapter=computed(()=>chapters[step.value]!),finalGoal=content.lab[4]!
const percent=computed(()=>won.value?100:myGift.value||partnerGift.value?50:0)
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches
let disposed=false
const sleepers=new Map<ReturnType<typeof setTimeout>,()=>void>()
function wait(ms:number){return new Promise<void>(resolve=>{const timer=setTimeout(()=>{sleepers.delete(timer);resolve()},reduced?0:ms);sleepers.set(timer,resolve)})}
function say(text:string){feedback.value=text}
function change(n:number){if(busy.value)return;if(step.value===0)done.value[0]=true;step.value=Math.max(0,Math.min(chapters.length-1,n));say('这一节可以亲手试一试，所有结果只属于演练园区。')}
function showWorld(){if(window.innerWidth<=760)dialog.value?.querySelector('.tutorial-visual')?.scrollIntoView({block:'start',behavior:reduced?'instant':'smooth'})}
async function roll(){
 if(busy.value||done.value[1])return;busy.value=true;showWorld()
 try{
  dice.value?.begin();await wait(280);await dice.value?.finish(4);if(disposed)return
  const motion:Motion={id:crypto.randomUUID(),from:29,to:3,dice:4,steps:4,pendingRoute:false,at:Date.now(),kind:'walk'}
  await scene.value?.playMove(motion);if(disposed)return
  campus.value.players['tutorial-fafa']!.position=3;campus.value.version++;energy.value=4;done.value[1]=true
  say('前进 4 格，到达隧道试验基地。行动力 5 → 4，下一节来承接课题。')
 }finally{dice.value?.cancel();busy.value=false}
}
function buy(){if(bought.value)return;bought.value=true;funds.value-=38;campus.value.projects[0]={owner:'tutorial-fafa'};campus.value.version++;say('签订预算 1500 的横向并安排首阶段：支出 38 材料费，工作完成后才能验收领款。')}
async function collect(){
 if(!bought.value||collected.value||busy.value)return;busy.value=true
 await wait(700);if(disposed)return
 collected.value=true;funds.value+=375;done.value[2]=true;busy.value=false;say('演练快进四小时并提交首阶段验收：+375 经费。后面还有三个阶段，先安排工作再收款。')
}
function preparePaper(){paper.value=100;say('论文进度 80 → 100，现在可以模拟投稿。')}
async function submit(){if(busy.value)return;busy.value=true;say('Under Review… 先等编辑部的来信。');await wait(700);if(disposed)return;paperStage.value='revision';busy.value=false;say('Minor Revision：请说明桥梁点云在遮挡条件下的适用边界。先回复这条意见。')}
async function respond(){if(busy.value)return;busy.value=true;say('已回复：感谢建议，已补充遮挡条件下的验证与适用范围。');await wait(700);if(disposed)return;paperStage.value='proof';busy.value=false;say('学术审查通过。请核对校样，版面费 80 经费，确认后才正式发表。')}
function publish(){if(accepted.value)return;funds.value=funds.value-80+100;accepted.value=true;done.value[3]=true;say('版面费 −80，发表奖励 +100、5 声望、1 成果点。具体意见与回应一起进入档案。')}
function useCard(kind:string){
 if(card.value)return;card.value=kind;done.value[4]=true
 if(kind==='data'){paper.value+=8;partnerPaper.value+=8;say('共享数据：双方论文进度 +8。搭子晚点登录，也会收到这份好处。')}
 else if(kind==='tea'){mood.value+=10;say('请喝奶茶：双方心情 +10。友谊和科研都可以续一杯。')}
 else{campus.value.players['tutorial-yiyi']!.position=4;campus.value.version++;say('导师召唤：搭子下一次行动去办公室。演练直接预览落点；正式互坑有冷却和每日上限。')}
}
function reply(choice:number){if(mailReplied.value)return;mailReplied.value=true;if(choice===0){paper.value+=7;partnerPaper.value+=7;say('已回复合作邀请：双方论文进度 +7，写进动态。')}else{mood.value+=6;say('礼貌婉拒：心情 +6。回复不是义务，晚些看也没有期限。')}done.value[5]=cared.value}
function care(){if(cared.value)return;cared.value=true;studentMood.value+=15;say('这次没有催结果，同学愿意说说最近的困难。交流会慢慢影响信任与研究节奏。');done.value[5]=mailReplied.value}
async function contribute(who:'me'|'partner'){
 if(busy.value||won.value||who==='me'&&myGift.value||who==='partner'&&partnerGift.value)return
 if(who==='me')myGift.value=true;else partnerGift.value=true
 if(!myGift.value||!partnerGift.value){say('一半材料到位，等搭子补上另一半。不必同时在线。');return}
 busy.value=true;showWorld()
 for(let level=2;level<=5;level++){await wait(500);if(disposed)return;campus.value.lab.level=level;campus.value.version++;say('联合实验室升级：'+content.lab[level-1]!.name)}
 won.value=true;done.value[6]=true;busy.value=false;say('联合胜利！未来城市院士课题组落成。通关以后，仍然可以接项目、发表论文和给搭子留故事。')
}
onMounted(()=>dialog.value?.showModal())
onBeforeUnmount(()=>{disposed=true;for(const [timer,resolve] of sleepers){clearTimeout(timer);resolve()}sleepers.clear();dice.value?.cancel()})
</script>
<template>
 <dialog ref="dialog" class="tutorial-dialog" aria-labelledby="tutorial-title" @cancel.prevent="emit('close',won)">
  <div class="tutorial-top"><span><FlaskConical :size="19"/><b>新手演练园区</b><small>可交互动画 · 不消耗正式资源</small></span><button class="icon-button" aria-label="关闭新手教程" @click="emit('close',won)"><X :size="19"/></button></div>
  <nav class="tutorial-chapters" aria-label="教程章节"><button v-for="(item,i) in chapters" :key="i" :class="{active:step===i,complete:done[i]}" :disabled="busy" @click="change(i)"><i><Check v-if="done[i]" :size="12"/><template v-else>{{ i+1 }}</template></i><span>{{ item.name }}</span></button></nav>
  <div class="tutorial-layout"><section class="tutorial-visual"><div class="tutorial-world"><Scene v-if="!fallback" ref="scene" :state="campus" @unavailable="fallback=true"/><CampusArt v-else/><div v-if="won" class="demo-win"><Trophy :size="36"/><strong>两位博士，联合胜利。</strong><small>未来城市院士课题组 · Lv.5</small></div></div><div class="demo-resources"><span :key="'f'+funds"><Coins :size="15"/>{{ funds }}<small>演练经费</small></span><span :key="'e'+energy"><Zap :size="15"/>{{ energy }} / 5<small>行动力</small></span><span :key="'m'+mood"><Heart :size="15"/>{{ mood }}<small>心情</small></span></div><div :key="feedback" class="demo-feedback" role="status"><span class="note-dot"/>{{ feedback }}</div></section>
   <section class="tutorial-content"><span class="eyebrow">{{ chapter.tag }}</span><h1 id="tutorial-title">{{ chapter.title }}</h1><p class="tutorial-intro">{{ chapter.body }}</p>
    <div v-if="step===0" class="tutorial-actions"><div class="tutorial-role civil"><span class="tutorial-scholar">f</span><div><b>fafa · 智能建造</b><small>隧道、桥梁、点云、巡检机器人</small></div></div><div class="tutorial-role air"><span class="tutorial-scholar">y</span><div><b>Yizi · 低空经济</b><small>无人机、物流、低空通信、空地协同</small></div></div><div class="tutorial-tip"><Clock3 :size="16"/>每次花 30 秒到 3 分钟。没有签到奖励，不用保持在线。</div><button class="primary wide" @click="change(1)">亲手玩一回<Play :size="17"/></button></div>
    <div v-else-if="step===1" class="tutorial-actions"><div class="tutorial-tip">行动力每现实 30 分钟恢复 1 点，最多存 5 点。骰子结果先保存，再播放动画。</div><button class="primary wide" :disabled="busy||done[1]" @click="roll"><Dice5 :size="20"/>{{ busy?'小博士正在出发…':done[1]?'已到达 · 行动力剩 4 点':'掷一次骰子' }}</button><div v-if="done[1]" class="demo-result"><Check :size="17"/>到达第 4 格：隧道试验基地。<small>退出页面再来，位置和未完成的选择都还在。</small></div></div>
    <div v-else-if="step===2" class="tutorial-actions"><article class="demo-project"><span class="small-label">智能建造课题</span><h2>隧道智能巡检</h2><p>合同预算 1500 · 首阶段验收拨款 375</p><button class="primary wide" :disabled="bought" @click="buy">{{ bought?'项目已承接':'签约并安排首阶段 · 支出 38' }}</button></article><button class="secondary wide" :disabled="!bought||collected||busy" @click="collect"><Play :size="15"/>{{ busy?'时钟快进中…':collected?'首阶段验收 · 已收款 375':'演练快进 4 小时并提交验收' }}</button><small class="tutorial-note">演练使用基础收益。正式收益还受方向、设备、实验室和成果加成影响。</small></div>
    <div v-else-if="step===3" class="tutorial-actions"><div class="demo-paper" :class="{accepted}"><span><BookOpen :size="17"/>{{ accepted?'Accept！':busy?'Under Review':paperStage==='revision'?'Minor Revision':paperStage==='proof'?'待校样与版面费':'手头的论文' }}<b>{{ Math.min(100,paper) }} / 100</b></span><div class="progress-track"><i :style="{width:Math.min(100,paper)+'%'}"/></div></div><button v-if="paper<100&&!accepted" class="secondary wide" @click="preparePaper">整理最后一点素材 · 进度 +20</button><button v-else-if="!accepted&&paperStage==='draft'" class="primary wide" :disabled="busy" @click="submit">模拟投稿，先读审稿意见<ArrowRight :size="16"/></button><div v-else-if="!accepted&&paperStage==='revision'" class="demo-mail"><p>Reviewer 1：请说明桥梁点云在遮挡条件下的适用边界。</p><button class="primary wide" :disabled="busy" @click="respond">补充验证并回复审稿人</button></div><button v-else-if="!accepted" class="primary wide" @click="publish">核对校样并支付 80 经费</button><div v-else class="demo-result"><Check :size="17"/>论文带来经费、声望、成果点和长期收益。</div><div class="tutorial-patent"><FileBadge :size="19"/><span><b>专利也有用</b><small>60 灵感可申请，80 经费、等待 2 小时；授权 +120 经费、3 声望，项目收益 +2%。每次移动后可花 40 经费整理交底，获得 15 灵感。</small></span></div></div>
    <div v-else-if="step===4" class="tutorial-actions"><button class="demo-card" :disabled="!!card" @click="useCard('data')"><Users :size="22"/><span><b>共享数据</b><small>双方论文进度 +8</small></span><ArrowRight :size="16"/></button><button class="demo-card" :disabled="!!card" @click="useCard('tea')"><Heart :size="22"/><span><b>请你喝奶茶</b><small>双方心情 +10</small></span><ArrowRight :size="16"/></button><button class="demo-card" :disabled="!!card" @click="useCard('mentor')"><GraduationCap :size="22"/><span><b>导师召唤</b><small>搭子下次行动去导师办公室</small></span><ArrowRight :size="16"/></button><small class="tutorial-note">正式卡牌在“科研背包”使用；对方手牌和收件箱由 TA 自己保管，互动结果会写进共享动态。</small></div>
    <div v-else-if="step===5" class="tutorial-actions"><article class="demo-mail"><span><Mail :size="17"/>桥梁巡检能不能空地联动？</span><p>点云同学想邀请无人机同学一起合作。</p><div v-if="!mailReplied" class="demo-mail-choices"><button @click="reply(0)">一起做 · 双方进度 +7</button><button @click="reply(1)">下次一定 · 心情 +6</button></div><small v-else><Check :size="13"/>已回复，结果会等搭子上线再看到。</small></article><article class="demo-student"><span><GraduationCap :size="18"/><b>温知序 · 硕士生</b><small>{{ cared?'愿意多聊几句':'最近还有点紧绷' }}</small></span><button class="secondary wide" :disabled="cared" @click="care">{{ cared?'已经聊过近况了':'听听近况，了解彼此的节奏' }}</button></article><small class="tutorial-note">现实 7 天为一学年，初始每人 2 硕 1 博，在组上限 4 人。学生持续研究；简历、面谈和相处中的观察可以帮助了解彼此。交流后冷却 4 小时。</small></div>
    <div v-else-if="step===6" class="tutorial-actions"><div class="demo-lab-levels"><span v-for="level in 5" :key="level" :class="{complete:campus.lab.level>=level}">{{ level }}<Check v-if="campus.lab.level>=level" :size="10"/></span></div><div class="demo-lab-goal"><b>五级累计建设目标</b><span>{{ finalGoal.funds }} 经费 · {{ finalGoal.credits }} 成果点 · {{ finalGoal.rep }} 登记声望</span><div class="progress-track"><i :style="{width:percent+'%'}"/></div></div><div class="demo-contributions"><button class="secondary" :disabled="busy||myGift" @click="contribute('me')">{{ myGift?'我的一半已到位':'我贡献一半' }}</button><button class="primary" :disabled="busy||partnerGift" @click="contribute('partner')">{{ partnerGift?'搭子的一半已到位':'搭子晚些补上另一半' }}</button></div><small class="tutorial-note">演练直接补齐五级材料。正式游戏逐级建设，首次升级还要求双方各投入至少 100 经费；成果点来自论文，登记声望不会减少原声望。</small><div v-if="won" class="demo-result win"><Trophy :size="24"/><b>共同通关，两个人都赢！</b><small>没有清空资源和强制结束，通关后仍可继续经营。</small></div></div>
    <div v-else-if="step===7" class="tutorial-actions"><div class="tutorial-tip"><Users :size="17"/>先由发起组支持，再等另一位老师晚些上线。</div><button class="primary wide" :disabled="busy||livingFinished" @click="demoCross">{{ livingFinished?'两组材料与经历已记录':livingStarted?'替搭子上线确认 · 演练支付 40':'发起学生跨组采集 · 暂不扣费' }}</button><div class="tutorial-tip">三级：招聘教师并带来两名同学；四级：成立方向团队；五级：院士工作站与城市级研究。日常培养和版面费预算由你授权，默认等待你决定。</div><div class="tutorial-tip">论文或专利还可开源、许可或建校园示范；自己的三维实验室会摆进设备、学生、教师与共同纪念。</div></div>
    <div v-else-if="step===8" class="tutorial-actions"><button class="primary wide" :disabled="done[8]" @click="demoLedger"><Coins :size="17"/>{{ done[8]?'两笔实际收支已分别记录':'演练：领工资，再付学生劳务' }}</button><ol class="tutorial-ledger"><li v-for="r in demoRows" :key="r.title"><b>{{ r.title }}</b><span>{{ r.amount>0?'+':'' }}{{ r.amount }}</span><small>结算后 {{ r.balance }}</small></li></ol><div v-if="done[8]" class="demo-result">期初 {{ demoOpening }} + 收入 20 − 支出 5 = {{ funds }}。<small>待领收益、未支出的预算不会混进实际余额。</small></div><div class="tutorial-tip">账本只供本人查看。只缓存最近 100 条用于展示，云端保留全部新流水，向下翻页和导出都能找到更早记录。</div></div>
   </section></div>
  <footer class="tutorial-footer"><button class="text-button" :disabled="step===0||busy" @click="change(step-1)"><ArrowLeft :size="14"/>上一节</button><span>{{ step+1 }} / {{ chapters.length }}<button class="text-button" @click="emit('rules')">规则速查</button></span><button v-if="step<chapters.length-1" class="primary" :disabled="busy" @click="change(step+1)">{{ done[step]?'下一节':'继续看看' }}<ArrowRight :size="15"/></button><button v-else class="primary" :disabled="busy" @click="emit('close',won)">{{ won?'正式开摸':'返回园区' }}<ArrowRight :size="15"/></button></footer>
  <DiceRoll ref="dice" demo/>
 </dialog>
</template>
