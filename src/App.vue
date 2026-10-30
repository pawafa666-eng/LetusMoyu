<script setup lang="ts">
import {computed,onMounted,onBeforeUnmount,ref,watch,nextTick} from 'vue'
import {FlaskConical,Dice5,Coins,Zap,Heart,BookOpen,ArrowRight,ArrowUpRight,Users,Leaf,Map,Backpack,Building2,Plane,Download,LogOut,RefreshCw,Check,Copy,Satellite,Plus,Clock3,Mail,GraduationCap,Trophy} from '@lucide/vue'
import {auth,request,signIn,preview,pinLoginReady} from './backend'
import type {ApiResult,Player,RoomState} from './types'
import content from './content.json'
import CampusArt from './components/CampusArt.vue'
import CampusBoard from './components/WorldBoard.vue'
import EncounterDialog from './components/EncounterDialog.vue'
import DiceRoll from './components/DiceRoll.vue'
import InboxPanel from './components/MailboxPanel.vue'
import StudentsPanel from './components/TeamPanel.vue'
import ResearchHub from './components/ResearchHub.vue'
import CampusFeed from './components/CampusFeed.vue'
import TutorialDialog from './components/TutorialDialog.vue'
const board=ref<InstanceType<typeof CampusBoard>>(),dice=ref<InstanceType<typeof DiceRoll>>()
const state=ref<RoomState|null>(null),loading=ref(true),signedIn=ref(false),busy=ref(false),online=ref(true),uid=ref('')
const username=ref(''),password=ref(''),name=ref(''),discipline=ref<'civil'|'air'>('civil'),roomCode=ref('')
const error=ref(''),notice=ref(''),savedAt=ref(0),clock=ref(Date.now()),offset=ref(0)
const tab=ref<'map'|'research'|'bag'|'lab'|'mail'|'students'>('map'),showEncounter=ref(true),copied=ref(false),showRules=ref(false)
const navItems=[{id:'map' as const,name:'园区转转',short:'园区',icon:Map},{id:'research' as const,name:'我的科研',short:'科研',icon:BookOpen},{id:'mail' as const,name:'博士信箱',short:'信箱',icon:Mail},{id:'students' as const,name:'小课题组',short:'学生',icon:GraduationCap},{id:'bag' as const,name:'科研背包',short:'背包',icon:Backpack},{id:'lab' as const,name:'联合实验室',short:'共建',icon:FlaskConical}]
const unread=computed(()=>(me.value?.inbox?.filter(m=>!m.readAt&&!m.repliedAt).length||0)+(me.value?.threadSummaries?.filter(t=>t.unread).length||0))
watch(tab,async()=>{await nextTick();if(window.innerWidth<=800)document.querySelector('.main-panel')?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})})
const showTutorial=ref(false)
function closeTutorial(){showTutorial.value=false;localStorage.setItem('letusMoyu.tutorial.v3','seen')}
watch(()=>state.value?.self,id=>{if(id&&!localStorage.getItem('letusMoyu.tutorial.v3'))showTutorial.value=true})
const contribution=ref(100),donateKind=ref<'funds'|'credits'|'rep'>('funds')
let pollTimer:ReturnType<typeof setInterval>,clockTimer:ReturnType<typeof setInterval>
const me=computed(()=>state.value?.players[state.value.self])
const partner=computed(()=>state.value?Object.values(state.value.players).find(p=>p.id!==state.value?.self):undefined)
const myProjects=computed(()=>state.value?Object.values(state.value.projects).filter(p=>p.owner===state.value?.self):[])
const hand=computed(()=>[...new Set(me.value?.hand||[])])
const nextLab=computed(()=>state.value?content.lab[state.value.lab.level]:null)
const pendingKey=(p:Player|undefined)=>p?.pending?[p.pending.type,p.pending.expires,p.pending.event,p.pending.project].join(':'):''
const paperTarget=computed(()=>me.value&&['major','minor'].includes(me.value.paper.phase)?me.value.paper.required:100)
const paperLabel=computed(()=>{
 const p=me.value?.paper;if(!p)return '准备第一篇论文'
 if(p.phase==='review')return 'Under Review · 审稿人正在路上'
 if(p.phase==='major')return 'Major Revision · 大修也会过去'
 if(p.phase==='minor')return 'Minor Revision · 终点就在前面'
 return ['数据采集','数据处理','实验进行中','绘图与整理','写论文','可以投稿了'][Math.min(5,Math.floor(p.progress/20))]
})
const canSubmit=computed(()=>!!me.value&&me.value.paper.phase!=='review'&&me.value.paper.progress>=paperTarget.value)
const effects=computed(()=>state.value?.effects.filter(e=>e.target===state.value?.self&&e.expires>clock.value&&!e.done)||[])
const effectName:Record<string,string>={mentor:'被导师催稿',server:'服务器被占用',borrow:'设备暂借',meeting:'会议室被抢',pause:'项目短暂停产',steal:'外协单被惦记',shield:'导师出差保护',bus:'摆渡车待用',coupon:'设备报销券',extension:'合理延期',inspiration:'灵感便签待用'}
function duration(ms:number){const n=Math.max(0,Math.ceil(ms/60000));return n>=60?Math.floor(n/60)+'小时 '+n%60+'分':n+'分钟'}
const energyLabel=computed(()=>!me.value?'':me.value.energy>=5?'行动力满了，慢慢玩':duration(me.value.energyAt+30*60000-clock.value)+'后恢复 1 点')
function relative(at:number){const min=Math.max(0,Math.floor((clock.value-at)/60000));return min===0?'刚刚':min<60?min+' 分钟前':min<1440?Math.floor(min/60)+' 小时前':new Date(at).toLocaleDateString('zh-CN')}
function update(r:ApiResult){
 if(!r.ok)throw new Error(r.error||'未能完成操作')
 const previous=pendingKey(me.value)
 if(r.state&&(!state.value||r.state.id!==state.value.id||r.state.version>=state.value.version)){
  state.value=r.state;uid.value=r.state.self;offset.value=r.state.serverNow-Date.now()
 }else if(!r.state&&r.uid){uid.value=r.uid;state.value=null}
 savedAt.value=r.savedAt||Date.now();online.value=true
 if(pendingKey(me.value)!==previous)showEncounter.value=true
}
async function refresh(){
 if(!signedIn.value||busy.value||document.hidden)return
 try{update(await request('state'));error.value=''}catch(e){online.value=false;error.value=e instanceof Error?e.message:'暂时无法连接园区'}
}
async function login(){
 busy.value=true;error.value=''
 try{
  uid.value=await signIn(username.value.trim(),password.value)
  signedIn.value=true;password.value=''
  update(await request('state'))
 }catch(e){error.value=e instanceof Error?e.message:'登录未完成'}finally{busy.value=false}
}
const pendingStorageKey=()=> 'letusMoyu.pending.'+uid.value
async function act(action:string,payload:Record<string,unknown>={},reuseId?:string){
 if(busy.value||!navigator.onLine)return
 busy.value=true;error.value='';notice.value=''
 const requestId=reuseId||crypto.randomUUID(),key=pendingStorageKey()
 const intent={action,payload,requestId}
 localStorage.setItem(key,JSON.stringify(intent))
 if(action==='move'&&tab.value==='map'){board.value?.focusMap();dice.value?.begin()}
 try{
  const r=await request(action,payload,requestId)
  if(!r.ok){localStorage.removeItem(key);throw new Error(r.error||'操作未完成')}
  const motion=r.state?.players[r.state.self]?.lastMove,oldMotion=me.value?.lastMove
  try{
   if(motion&&!motion.pendingRoute&&(action==='move'||oldMotion?.pendingRoute))showEncounter.value=false
   if(action==='move'&&motion?.dice)await dice.value?.finish(motion.dice)
   else dice.value?.cancel()
   if(motion&&!motion.pendingRoute&&r.state!.version>=(state.value?.version||0)&&(!r.replayed||motion.id!==oldMotion?.id)&&(action==='move'||action==='resolve'&&oldMotion?.pendingRoute))await board.value?.playMove(motion)
  }catch{notice.value='动作已保存，动画将在下次打开时恢复到正确位置。'}
  update(r);localStorage.removeItem(key)
  notice.value=r.replayed?'已确认上次操作成功，没有重复扣款。':action==='move'?'脚步到位，云端也记下了。':'已保存到云端，可以放心去忙了。'
  return r
 }catch(e){error.value=e instanceof Error?e.message:'连接中断，请用原请求重试';online.value=navigator.onLine}
 finally{dice.value?.cancel();busy.value=false}
}
const hasRetry=computed(()=>{savedAt.value;error.value;return !!uid.value&&!!localStorage.getItem(pendingStorageKey())})
async function retry(){
 try{
  const raw:unknown=JSON.parse(localStorage.getItem(pendingStorageKey())||'null')
  if(!raw||typeof raw!=='object'||!('action'in raw)||!('payload'in raw)||!('requestId'in raw)||typeof raw.action!=='string'||typeof raw.requestId!=='string'||!raw.payload||typeof raw.payload!=='object'||Array.isArray(raw.payload))throw new Error('请求缓存无效，请刷新状态')
  await act(raw.action,raw.payload as Record<string,unknown>,raw.requestId)
 }catch(e){error.value=e instanceof Error?e.message:'无法重试'}
}
async function logout(){
 try{
  await auth.signOut()
  const {data,error:sessionError}=await auth.getSession()
  if(sessionError||data.session)throw new Error('退出尚未完成，请重试')
  signedIn.value=false;state.value=null;uid.value='';error.value='';notice.value=''
 }catch(e){error.value=e instanceof Error?e.message:'退出未完成，请重试'}
}
function isPaused(def:number){return state.value?.effects.some(e=>e.type==='pause'&&e.project===def&&e.target===state.value?.self)}
async function copyInvite(){if(!state.value)return;try{await navigator.clipboard.writeText(state.value.id);copied.value=true;setTimeout(()=>copied.value=false,2000)}catch{notice.value='邀请码：'+state.value.id+'，可长按复制'}}
function exportSave(){
 if(!state.value)return
 const exportData={format:'LetusMoyu-readable-backup-v1',exportedAt:new Date().toISOString(),note:'个人可读副本；服务器存档仍是权威记录，不通过上传覆盖余额。对方手牌与隐藏结果已移除。',state:state.value}
 const url=URL.createObjectURL(new Blob([JSON.stringify(exportData,null,2)],{type:'application/json'}))
 const a=document.createElement('a');a.href=url;a.download='LetusMoyu-'+state.value.id+'-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
function toggleEquip(id:string){const current=me.value?.active||[];if(!current.includes(id)&&current.length>=2){error.value='先停用一件设备，最多启用两件';return}void act('equip',{items:current.includes(id)?current.filter(x=>x!==id):[...current,id]})}
function onVisible(){if(!document.hidden)void refresh()}
function onNetwork(){online.value=navigator.onLine;if(online.value)void refresh()}
onMounted(async()=>{
 try{if(preview){signedIn.value=true;await refresh()}else{const {data,error:sessionError}=await auth.getSession();if(sessionError)throw sessionError;if(data.session&&!data.session.user?.is_anonymous){signedIn.value=true;uid.value=data.session.user.id;await refresh()}}}
 catch(e){error.value=e instanceof Error?e.message:'暂时无法读取登录状态'}finally{loading.value=false}
 clockTimer=setInterval(()=>clock.value=Date.now()+offset.value,1000)
 pollTimer=setInterval(()=>void refresh(),30000)
 document.addEventListener('visibilitychange',onVisible);window.addEventListener('online',onNetwork);window.addEventListener('offline',onNetwork)
})
onBeforeUnmount(()=>{clearInterval(pollTimer);clearInterval(clockTimer);document.removeEventListener('visibilitychange',onVisible);window.removeEventListener('online',onNetwork);window.removeEventListener('offline',onNetwork)})
</script>
<template>
 <div v-if="loading" class="loading-screen"><FlaskConical :size="34"/><h1>正在打开联合实验室</h1><p>科研进展可能很慢，存档不用。</p></div>
 <main v-else-if="!signedIn" class="login-layout">
  <section class="login-world"><a class="brand" href="#"><span class="brand-symbol"><FlaskConical :size="24"/></span><span>摸鱼联合实验室<small>LETUS MOYU · TWO PHDs, ONE LITTLE WORLD</small></span></a><div class="login-story"><span class="eyebrow">科研间隙，出来转一圈。</span><h1>两位博士的<br/><span>不急科研计划。</span></h1><p>你上午配准了点云。<br/>下午，发现搭子偷偷接走了你的无人机外协单。</p><CampusArt/><span class="world-caption"><Leaf :size="15"/> 30 格园区 · 异步互动 · 每次一小会儿</span></div><p class="login-footnote">论文慢慢写，实验室一起建。今天也算在科研。</p></section>
  <section class="login-form-area"><div class="login-form"><span class="section-index">01 / RETURN TO CAMPUS</span><h2>博士，欢迎回来。</h2><p class="muted">不用同时在线，也能一起拥有一个科研小世界。</p>
   <form @submit.prevent="login"><label>科研账号<input v-model="username" autocomplete="username" :placeholder="pinLoginReady?'fafa / yiyi':'moyu_civil / moyu_air'" required maxlength="40"/></label><label>密码<input v-model="password" type="password" autocomplete="current-password" :placeholder="pinLoginReady?'输入四位游戏登录码':'输入原账号密码'" :inputmode="pinLoginReady?'numeric':'text'" required minlength="4" :maxlength="pinLoginReady?4:64"/></label><button class="primary wide" :disabled="busy">{{ busy?'正在打开园区…':'进入联合实验室' }}<ArrowRight :size="18"/></button></form>
   <button type="button" class="secondary wide tutorial-entry" @click="showTutorial=true"><BookOpen :size="17"/>先玩一遍动画教程</button><p v-if="!pinLoginReady" class="muted">四位登录码待平台核对后开通；目前可继续使用原账号和原密码。</p><p v-if="error" class="error-text" role="alert">{{ error }}</p><div class="save-promise"><Check :size="17"/><span>每次操作自动存档，换设备也能接着玩。<small>账号由园区主人邀请开通；密码不保存在代码仓库。</small></span></div>
  </div><span class="form-footer">不用打卡，没有连续在线奖励。先休息一下也很好。</span></section>
 </main>
 <div v-else class="game-shell">
  <div v-if="preview" class="preview-banner">独立演示园区 · 所有操作仅影响测试数据，不会修改正式存档</div><header class="app-header"><a class="brand" href="#" @click.prevent="tab='map'"><span class="brand-symbol"><FlaskConical :size="22"/></span><span>摸鱼联合实验室<small>LETUS MOYU</small></span></a><div class="header-meta"><span class="connection" :class="{offline:!online}"><i/>{{ online?'园区已连接':'离线，等待连接' }}</span><button class="icon-button" aria-label="刷新存档" :disabled="busy" @click="refresh"><RefreshCw :size="17"/></button><button class="text-button" @click="showTutorial=true">新手教程</button><button class="icon-button" aria-label="退出账号" @click="logout"><LogOut :size="18"/></button></div></header>
  <div v-if="error" class="status-banner error-banner" role="alert"><span>{{ error }}</span><button v-if="hasRetry" :disabled="busy" @click="retry">重试上次操作</button><button v-else :disabled="busy" @click="refresh">重新同步</button></div>
  <div v-if="notice" class="status-banner success-banner" role="status"><Check :size="16"/>{{ notice }}</div>
  <section v-if="!state" class="onboarding"><CampusArt/><div><span class="eyebrow">TWO DESKS, ONE NEW BEGINNING</span><h1>给你们的摸鱼计划<br/>找个地方落脚。</h1><p>创建一个园区，再把邀请码给搭子。两个人不用同时到场。</p><label>博士昵称<input v-model="name" placeholder="例如：点云博士" maxlength="16"/></label><div class="discipline-choice"><button :class="{active:discipline==='civil'}" @click="discipline='civil'"><Building2 :size="20"/>智能建造</button><button :class="{active:discipline==='air'}" @click="discipline='air'"><Plane :size="20"/>低空经济</button></div><button class="primary wide" :disabled="busy" @click="act('create',{name:name||'点云博士',discipline})">创建两人园区<Plus :size="18"/></button><div class="join-room"><span>搭子已经建好了？</span><input v-model="roomCode" placeholder="十位邀请码" maxlength="10"/><button :disabled="busy||roomCode.length!==10" @click="act('join',{name:name||'起飞博士',code:roomCode})">加入<ArrowRight :size="16"/></button></div></div></section>
  <template v-else-if="me">
   <div v-if="state.lab.level>=5" class="victory-banner"><Trophy :size="31"/><span><b>联合胜利！未来城市科研中心落成。</b><small>两位博士共同通关，仍然可以继续日常科研、经营与互动。</small></span><button class="secondary" @click="tab='lab'">看看共建成果</button></div><div class="resource-strip"><div><Coins/><span>科研经费<strong>{{ Math.floor(me.funds).toLocaleString() }}<small>元气经费</small></strong></span></div><div><Zap/><span>行动力<strong>{{ me.energy }}<small>/ 5</small></strong></span><span class="resource-hint">{{ energyLabel }}</span></div><div><BookOpen/><span>论文进度<strong>{{ me.paper.progress }}<small>/ {{ paperTarget }}</small></strong></span></div><div><Heart/><span>今日心情<strong>{{ me.mood }}<small>/ 100</small></strong></span></div></div>
   <div class="workspace">
    <aside class="personal-panel"><span class="eyebrow">MY LITTLE RESEARCH LIFE</span><div class="profile"><div class="avatar" :class="me.discipline"><i/><span>{{ me.name.slice(0,1) }}</span></div><h2>{{ me.name }}</h2><span class="profession">{{ me.discipline==='civil'?'土木工程 / 智能建造':'低空经济 / 空地协同' }}</span><span class="state-pill">{{ effects[0]?effectName[effects[0].type]||'科研中':'正常科研，偶尔摸鱼' }}</span></div>
     <nav class="desktop-nav"><button v-for="item in navItems" :key="item.id" :class="{active:tab===item.id}" @click="tab=item.id"><component :is="item.icon" :size="19"/>{{ item.name }}<b v-if="item.id==='mail'&&unread" class="unread-badge">{{ unread }}</b><ArrowUpRight :size="14"/></button></nav>
     <div class="mini-paper"><span>正在推进的那篇论文</span><b>{{ paperLabel.split(' · ')[0] }}</b><div class="progress-track"><i :style="{width:Math.min(100,me.paper.progress/paperTarget*100)+'%'}"/></div><small>{{ me.paper.phase==='review'?duration(me.paper.reviewAt-clock)+'后收到意见':me.paper.progress+' / '+paperTarget+'，一点点也算进度' }}</small></div>
     <div class="mini-stats"><span>累计论文<b>{{ me.papers }} 篇</b></span><span>科研声望<b>{{ me.rep }}</b></span><span>导师好感<b>{{ me.tutor }} / 100</b></span><span>经营项目<b>{{ myProjects.length }} / 3</b></span></div>
     <button class="export-button" @click="exportSave"><Download :size="15"/>下载一份存档副本</button>
    </aside>
    <section class="main-panel">
     <template v-if="tab==='map'"><div class="panel-heading"><div><span class="eyebrow">A LITTLE BREAK, A LITTLE PROGRESS</span><h1>今天，去哪里摸鱼？</h1></div><span class="map-weather"><Leaf :size="17"/>适合科研，也适合散步</span></div><CampusBoard ref="board" :state="state" :paused="showTutorial"/>
      <div class="action-dock"><div class="dice-cube" :class="{rolling:busy}"><Dice5 :size="31" :stroke-width="1.7"/></div><div class="action-copy"><h3>{{ me.pending?'你还有一个小决定没做完':'实验放一放，出去转一圈。' }}</h3><p>{{ me.pending?'骰子和事件都已经存好了，接着选就行。':'消耗 1 点行动力，遇到一个地点、一件小事。' }}</p></div><button v-if="me.pending" class="primary" :disabled="busy||!online" @click="showEncounter=true">继续当前事件<ArrowRight :size="18"/></button><button v-else class="primary" :disabled="busy||!online||me.energy<1" @click="act('move')">{{ busy?'正在走进园区…':me.energy<1?'先歇一会儿':'出去转一圈' }}<ArrowRight :size="18"/></button></div><p class="gentle-footer"><Clock3 :size="13"/>玩一回就能走。项目会继续工作，搭子也会记得惦记你。</p>
     </template>
     <ResearchHub v-else-if="tab==='research'" :player="me" :state="state" :busy="busy" :now="clock" :perform="act" @map="tab='map'"/>
     <template v-else-if="tab==='bag'"><div class="panel-heading"><div><span class="eyebrow">A LITTLE KINDNESS, A LITTLE MISCHIEF</span><h1>科研背包</h1></div><span class="tiny-tag">{{ me.hand?.length||0 }} / 6 张卡</span></div><p class="intro">{{ me.cardUsed?'下一次移动结束后，又可以出一张牌。':'本次还有一次出牌机会。给搭子留一点科研善意，或者节目效果。' }}</p><div class="card-grid"><article v-for="id in hand" :key="id" class="research-card" :class="content.cards[id]?.type"><div class="card-label">{{ {attack:'适度互坑',coop:'一起搞科研',self:'照顾自己'}[content.cards[id]?.type||'self'] }}<span>×{{ me.hand?.filter(x=>x===id).length }}</span></div><FlaskConical :size="25" :stroke-width="1.4"/><h3>{{ content.cards[id]?.name }}</h3><p>{{ content.cards[id]?.description }}</p><button :disabled="busy||me.cardUsed||!!me.pending||(!partner&&content.cards[id]?.type!=='self')" @click="act('card',{card:id})">使用这张牌<ArrowUpRight :size="16"/></button></article></div><p v-if="!hand.length" class="empty-state">手里暂时没有卡。每三次移动有机会获得一张。</p>
      <div class="section-title"><h2>我的设备</h2><span>最多启用两件</span></div><div v-if="!me.equipment.length" class="equipment-empty"><Satellite :size="24"/><p>现在是基础采集包，走到仪器共享站可以买设备。</p></div><div v-for="id in me.equipment" :key="id" class="project-row"><Satellite :size="24"/><div><h3>{{ content.equipment.find(e=>e.id===id)?.name }}</h3><p>{{ content.equipment.find(e=>e.id===id)?.description }}</p></div><button :disabled="busy" class="secondary" @click="toggleEquip(id)">{{ me.active.includes(id)?'已启用 · 停用':'启用设备' }}</button></div>
     </template>
     <InboxPanel v-else-if="tab==='mail'" :player="me" :partner="partner" :busy="busy" :now="clock" :perform="act"/>
     <StudentsPanel v-else-if="tab==='students'" :player="me" :state="state" :busy="busy" :now="clock" @act="act"/>
     <template v-else><div class="panel-heading"><div><span class="eyebrow">BUILT BY BOTH OF US</span><h1>我们的联合实验室</h1></div><span class="level-stamp">Lv.{{ state.lab.level }}</span></div><div class="lab-feature"><CampusArt/><div><span class="small-label">两张桌子，慢慢变成一个未来。</span><h2>{{ content.lab[state.lab.level-1]?.name }}</h2><p>{{ state.lab.level===5?'未来城市科研中心落成了。两位博士，合作愉快。':'经费可以少投一点，论文可以慢一点。这个地方，是你们一起建起来的。' }}</p></div></div>
      <template v-if="nextLab"><div class="section-title"><h2>下一站：{{ nextLab.name }}</h2></div><div class="lab-progress"><div v-for="row in [{key:'funds' as const,label:'科研经费',goal:nextLab.funds},{key:'credits' as const,label:'成果点',goal:nextLab.credits},{key:'rep' as const,label:'登记声望',goal:nextLab.rep}]" :key="row.key"><span>{{ row.label }}<b>{{ state.lab[row.key] }} / {{ row.goal }}</b></span><div class="progress-track"><i :style="{width:Math.min(100,state.lab[row.key]/Math.max(1,row.goal)*100)+'%'}"/></div></div></div><p class="muted">门槛为累计值。首次升级需两人各投入至少 100 经费；捐成果点不会减少累计论文。</p><div class="contribute-form"><select v-model="donateKind"><option value="funds">投入经费</option><option value="credits">贡献成果点</option><option value="rep">登记声望</option></select><input v-model.number="contribution" type="number" min="1" max="100000" step="1" aria-label="投入数量"/><button class="primary" :disabled="busy" @click="act('contribute',{kind:donateKind,amount:contribution})">一起添块砖<Plus :size="17"/></button></div><p class="muted">你可用：经费 {{ Math.floor(me.funds) }} · 成果点 {{ me.credits }} · 未登记声望 {{ me.rep-me.registeredRep }}</p></template>
      <div class="lab-benefits"><h3>升级带来的小变化</h3><p v-for="benefit in content.research.benefits" :key="benefit.level" :class="{unlocked:state.lab.level>=benefit.level}"><b>Lv.{{ benefit.level }} {{ state.lab.level>=benefit.level?'已解锁':'待共建' }}</b>{{ benefit.text }}</p><small>每次升级另送双方心情 +8、专利灵感 +5；经费按新等级 ×40 发放。</small></div><div class="lab-milestones"><span v-for="(level,i) in content.lab" :key="i" :class="{complete:i<state.lab.level}"><i>{{ i+1 }}</i>{{ level.name }}</span></div>
     </template>
    </section>
    <aside class="social-panel"><div class="partner-card"><span class="eyebrow">YOUR RESEARCH PARTNER</span><div class="partner-heading"><div class="avatar small" :class="partner?.discipline||'air'"><i/><span>{{ partner?.name.slice(0,1)||'?' }}</span></div><div><h3>{{ partner?.name||'搭子的桌子还空着' }}</h3><p>{{ partner?(partner.discipline==='air'?'低空经济研究中':'智能建造研究中'):'邀请 TA，未来的热闹就有了。' }}</p></div></div><div v-if="partner" class="partner-stats"><span>论文<b>{{ partner.papers }}</b></span><span>声望<b>{{ partner.rep }}</b></span><span>心情<b>{{ partner.mood }}</b></span></div><button class="invite-code" @click="copyInvite"><span>园区邀请码<b>{{ state.id }}</b></span><component :is="copied?Check:Copy" :size="16"/></button></div>
     <div class="feed-heading"><h2>园区小道消息</h2><span class="live-dot"/></div><p class="feed-caption">你不在线的时候，也有故事发生。</p><CampusFeed :state="state" :now="clock"/><p class="saved-note"><Check :size="13"/>{{ savedAt?'已保存 · '+new Date(savedAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):'正在同步' }}</p>
    </aside>
   </div>
   <nav class="mobile-nav"><button v-for="item in navItems" :key="item.id" :class="{active:tab===item.id}" @click="tab=item.id"><component :is="item.icon" :size="20"/>{{ item.short }}<i v-if="item.id==='mail'&&unread" class="mobile-mail-dot"/></button></nav>
   <DiceRoll ref="dice"/><EncounterDialog v-if="me.pending&&showEncounter" :key="pendingKey(me)" :player="me" :state="state" :busy="busy" @choose="choice=>act('resolve',{choice})" @close="showEncounter=false"/>
  </template>
  <div v-if="showRules" class="rules-panel"><button class="text-button" @click="showRules=false">收起说明</button><h2>一回合摸鱼指南</h2><ol><li>每 30 分钟恢复 1 行动力，最多 5。点“出去转一圈”开始。</li><li>走到项目格可承接；项目每 2 小时产出，最多存 6 份，本人上线自动领取。</li><li>每次移动后可用一张卡。攻击同一人三小时最多一次，每人一天最多坑两次。</li><li>论文 100 进度即可投稿。返修没有期限，大修也一定有尽头。</li><li>一起投入经费、成果点和声望，升级联合实验室。</li><li>每次操作都由服务器保存。网络异常时重试原请求，不会重复扣款。</li><li>信箱每 75–105 分钟来信，可随时回复；未回复最多 8 封。</li><li>学生每 6 小时反馈一次，最多积攒 4 轮。交流后可休息 4 小时。</li><li>论文、专利、毕业生会增加项目经费，具体奖励见“我的科研”。</li></ol><p>不用等搭子上线，也不必连续签到。完成一个小决定，就可以关掉页面。</p></div>
 </div>
 <TutorialDialog v-if="showTutorial" @close="closeTutorial" @rules="closeTutorial();showRules=true"/>
</template>
