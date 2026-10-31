<script setup lang="ts">
import {computed,ref} from 'vue'
import {Package,Monitor,ShoppingBag,Check,Clock3,ArrowRight,Database,Zap,Building2} from '@lucide/vue'
import type {ApiResult,Player,RoomState} from '../types'
import content from '../content.json'
const props=defineProps<{player:Player;state:RoomState;busy:boolean;now:number;perform:(action:string,payload?:Record<string,unknown>)=>Promise<ApiResult|undefined>}>()
const D=content.operations,mode=ref('self'),supplier=ref('standard'),studentId=ref(''),category=ref('all')
const current=computed(()=>props.player.procurement.orders.find(o=>!['completed','cancelled'].includes(o.status)))
const sku=(id:string)=>D.catalog.find(x=>x.id===id)!
const students=computed(()=>props.player.students.filter(st=>!st.graduatedAt&&st.availability.canWork))
const goods=computed(()=>D.catalog.filter(x=>category.value==='all'||x.kind===category.value))
const time=(at:number)=>{const m=Math.max(0,Math.ceil((at-props.now)/60000));return m>=60?Math.floor(m/60)+' 小时 '+m%60+' 分钟':m+' 分钟'}
const money=(n:number)=>Math.floor(n).toLocaleString()
const data=computed(()=>Math.max(0,...props.player.assets.filter(a=>a.mode==='research').map(a=>sku(a.sku).data)))
const dataAt=computed(()=>props.player.economy.lastDataAt?props.player.economy.lastDataAt+2*3600000:0)
const fullPaper=computed(()=>props.player.paper.phase==='review'?props.player.paper.bank>=60:['major','minor'].includes(props.player.paper.phase)?props.player.paper.progress>=props.player.paper.required&&props.player.paper.bank>=60:props.player.paper.progress>=100)
async function start(){const o=current.value;if(o)await props.perform('procure_start',{id:o.id,stage:o.stage,mode:mode.value,studentId:studentId.value,supplier:supplier.value})}
</script>
<template>
 <div class="ops-intro"><ShoppingBag :size="26"/><div><h2>设备可以很贵，流程也不能少。</h2><p>先找供应商，再招标签约；最后验收、建账，资产才开始工作。全部为园区内游戏流程。</p></div></div>
 <article v-if="current" class="proc-order"><header><div><span class="small-label">正在办理 · {{ current.stage+1 }} / 7</span><h2>{{ sku(current.sku).name }}</h2></div><span class="ops-chip">{{ current.paid?'已付 '+money(current.paid):current.price?'合同报价 '+money(current.price):'尚未确定报价' }}</span></header>
  <ol class="proc-stages"><li v-for="(name,i) in D.stages" :key="name" :class="{done:i<current.stage||current.status==='completed',current:i===current.stage}"><i><Check v-if="i<current.stage" :size="12"/><template v-else>{{ i+1 }}</template></i><span>{{ name }}</span></li></ol>
  <div class="proc-current"><span class="small-label">这一站办理</span><h3>{{ D.stages[current.stage] }}</h3>
   <template v-if="current.status==='available'">
    <label v-if="current.stage===0">找哪家供应商？<select v-model="supplier"><option v-for="sup in D.suppliers" :key="sup.id" :value="sup.id">{{ sup.name }} · 报价 {{ money(Math.ceil(Math.round(sku(current.sku).price*sup.multiplier*1e6)/1e6)) }}</option></select><small>{{ D.suppliers.find(x=>x.id===supplier)?.note }}</small></label>
    <div class="proc-modes"><button :class="{selected:mode==='self'}" :aria-pressed="mode==='self'" @click="mode='self'"><Building2 :size="19"/><b>我自己办理</b><small>基准 2 小时 / 步<br/>不消耗行动力</small></button><button :class="{selected:mode==='student'}" :aria-pressed="mode==='student'" @click="mode='student'"><Package :size="19"/><b>请学生去办理</b><small>按研究节奏推进<br/>会分走精力与心情</small></button></div>
    <label v-if="mode==='student'">安排哪位同学？<select v-model="studentId"><option value="">选择在读且空闲的同学</option><option v-for="st in students" :key="st.id" :value="st.id">{{ st.name }} · {{ st.moodText }} · 时薪 {{ st.wage.rate }}</option></select><small>横向、参会、访学和其他采购占用中的同学不能代办。劳务费另按已设置时薪累计。</small></label>
    <p v-if="current.stage===2" class="ops-warning">签合同将支付全款 {{ money(current.price) }} 经费。付款后需继续验收建账。</p>
    <p v-else class="muted">供应商服务影响每步工期，进入下一步前需要确认完成。</p>
    <button class="primary" :disabled="busy||mode==='student'&&!students.some(st=>st.id===studentId)||current.stage===2&&player.funds<current.price" @click="start">安排{{ current.stage===2?'并支付合同款':'这一流程' }}<ArrowRight :size="15"/></button>
   </template>
   <div v-else-if="current.status==='working'" class="ops-wait"><Clock3 :size="24"/><b>{{ current.job!.stalled?'还在等同学提交进展':'预计 '+time(current.job!.dueAt)+'后办好' }}</b><p>{{ current.job!.studentName||'自己' }}正在处理，离线也推进。</p><button v-if="current.job!.studentId" class="secondary" :disabled="busy" @click="perform('procure_takeover',{id:current.id,stage:current.stage})">由我继续办理，保留进度</button></div>
   <div v-else class="ops-ready"><Check :size="27"/><b>这一流程办好了。</b><button class="primary" :disabled="busy" @click="perform('procure_confirm',{id:current.id,stage:current.stage})">{{ current.stage===6?'完成建账，加入资产台账':'确认完成，进入下一步' }}<ArrowRight :size="15"/></button></div>
  </div><button v-if="!current.paid&&current.status!=='working'" class="text-button" :disabled="busy" @click="perform('procure_cancel',{id:current.id,stage:current.stage})">取消这份未付款采购</button>
 </article>
 <div class="section-title"><h2>科研资产台账</h2><span>{{ player.assets.length }} 项已建账</span></div>
 <div v-if="!player.assets.length" class="ops-empty"><Database :size="28"/><p>先完成采购流程，再把设备和软件放进台账。</p><small>原来的随身设备继续保留在“科研背包”，不受采购升级影响。</small></div>
 <article v-for="a in player.assets" :key="a.id" class="asset-row"><div class="asset-head"><component :is="sku(a.sku).kind==='hardware'?Package:Monitor" :size="25"/><div><h3>{{ sku(a.sku).name }}</h3><small>建账价 {{ money(a.price) }} · 累计校内租费 {{ money(a.rental.total) }}</small></div><span class="ops-chip">{{ a.mode==='research'?'科研使用':'租给学校' }}</span></div><p>项目提速 +{{ Math.round(sku(a.sku).speed*100) }}% · 论文数据 +{{ sku(a.sku).data }} / 次 · 校内租费 {{ sku(a.sku).rent }} / 小时</p><div class="asset-actions"><button class="secondary" :disabled="busy||a.mode==='research'" @click="perform('asset_mode',{id:a.id,mode:'research'})">用于科研</button><button class="secondary" :disabled="busy||a.mode==='rental'||!sku(a.sku).rent" @click="perform('asset_mode',{id:a.id,mode:'rental'})">租给学校</button></div></article>
 <div v-if="data" class="ops-data"><Zap :size="24"/><div><h3>把设备数据写进论文</h3><p>每两小时一次，取科研资产中最高的数据能力，实际到账按稿件容量计算。</p></div><button class="primary" :disabled="busy||now<dataAt||fullPaper" @click="perform('asset_data')">{{ now<dataAt?time(dataAt)+'后可采集':'整理研究数据 · +'+data }}</button></div>
 <p class="gentle-footer">科研与出租互斥；科研提速取适配资产最高值，只影响后续新安排的横向、企业合作与比赛准备。校内租费每台离线最多累计 1000，回到园区自动领取。</p>
 <div class="section-title"><h2>软硬件采购目录</h2><select v-model="category" aria-label="采购目录类型"><option value="all">全部软硬件</option><option value="hardware">硬件</option><option value="software">软件</option></select></div>
 <div class="proc-catalog"><article v-for="g in goods" :key="g.id"><component :is="g.kind==='hardware'?Package:Monitor" :size="27"/><span class="small-label">{{ g.kind==='hardware'?'科研硬件':'科研软件' }} · Lv.{{ g.level }}</span><h3>{{ g.name }}</h3><b class="catalog-price">{{ money(g.price) }} <small>基准经费</small></b><p>{{ g.description }}</p><ul><li v-if="g.speed">适配横向提速 +{{ Math.round(g.speed*100) }}%</li><li v-if="g.data">每次论文数据 +{{ g.data }}</li><li v-if="g.rent">出租给学校 {{ g.rent }} / 小时</li></ul><button class="secondary wide" :disabled="busy||!!current||state.lab.level<g.level||player.assets.some(a=>a.sku===g.id)" @click="perform('procure_create',{sku:g.id})">{{ player.assets.some(a=>a.sku===g.id)?'已建账':state.lab.level<g.level?'实验室 Lv.'+g.level+' 解锁':'发起采购流程' }}</button></article></div>
</template>
