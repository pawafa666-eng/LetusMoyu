<script setup lang="ts">
import {computed,onMounted,onBeforeUnmount,ref} from 'vue'
import {X,FlaskConical,ArrowRight} from '@lucide/vue'
import content from '../content.json'
import type {Player,RoomState} from '../types'
const props=defineProps<{player:Player;state:RoomState;busy:boolean}>()
const emit=defineEmits<{choose:[string];close:[]}>()
const dialog=ref<HTMLDialogElement>()
const pending=computed(()=>props.player.pending!)
const project=computed(()=>content.projects[pending.value.project??0])
const event=computed(()=>content.events[pending.value.event??0])
const cost=computed(()=>project.value.kind==='contract'?0:Math.round(project.value.cost*(props.player.discipline==='civil'&&project.value.domain==='civil'?.9:1)))
const title=computed(()=>({project:'这项课题，要不要接下来？',equipment:'设备比人先到位',route:'今天，换条科研路线',library:'文献看不完，先看一点',coffee:'咖啡与科研的有效碰撞'}[pending.value.type]||event.value.title))
const routes=computed(()=>pending.value.bus?[1,2,3,4,5,6]:[...new Set([pending.value.dice??1,Math.min(6,(pending.value.dice??1)+1)])])
function maxCost(delta:unknown):number{
 if(!delta||typeof delta!=='object')return 0
 const funds='f' in delta&&typeof delta.f==='number'?Math.max(0,-delta.f):0
 return Math.max(funds,'win' in delta?maxCost(delta.win):0,'lose' in delta?maxCost(delta.lose):0)
}
onMounted(()=>dialog.value?.showModal())
onBeforeUnmount(()=>dialog.value?.close())
</script>
<template>
 <dialog ref="dialog" class="encounter-dialog" @cancel.prevent="emit('close')">
  <div class="dialog-top"><span class="eyebrow">ONE LITTLE SCIENTIFIC ADVENTURE</span><button class="icon-button" aria-label="稍后决定" @click="emit('close')"><X :size="20"/></button></div>
  <div class="event-mark"><FlaskConical :size="28" :stroke-width="1.5"/></div>
  <h2>{{ title }}</h2><p class="muted">{{ content.tiles[player.position]?.name }} · 做一个小决定，然后继续你的生活。</p>
  <div class="event-choices">
   <template v-if="pending.type==='event'"><button v-for="(c,i) in event.choices" :key="i" :disabled="busy||player.funds<maxCost(c.delta)" :title="player.funds<maxCost(c.delta)?'需预留 '+maxCost(c.delta)+' 经费':''" @click="emit('choose',String(i))"><b>{{ i===0?'A':'B' }}</b><span>{{ c.text }}</span><ArrowRight :size="17"/></button></template>
   <template v-else-if="pending.type==='project'">
    <div class="project-offer"><span>{{ {civil:'智能建造',air:'低空经济',cross:'交叉研究'}[project.domain] }}</span><h3>{{ project.name }}</h3><p>{{ project.kind==='contract'?'横向总经费 '+project.totalFunding+'，分阶段到账':'建设后提供长期共享服务' }}。基础阶段收入 {{ project.income }} 经费 / 2 小时{{ project.progress?'，另有 1 论文进度':'' }}。你退出以后，它还会继续工作。</p></div>
    <button :disabled="busy||player.funds<cost||Object.values(state.projects).filter(p=>p.owner===player.id&&!p.completedAt).length>=3||!!state.projects[project.id]" @click="emit('choose','buy')"><b>A</b><span>{{ project.kind==='contract'?'签订横向合同 · 首款 +'+project.advance+' 经费':'建设设施 · 投入 '+cost+' 经费' }}</span><ArrowRight :size="17"/></button>
    <button :disabled="busy" @click="emit('choose','skip')"><b>B</b><span>先留个研究思路 · 论文进度 +4</span><ArrowRight :size="17"/></button>
   </template>
   <template v-else-if="pending.type==='equipment'">
    <button v-for="eq in content.equipment" :key="eq.id" :disabled="busy||player.equipment.includes(eq.id)||player.funds<Math.max(0,eq.price-(state.effects.some(e=>e.type==='coupon'&&e.target===player.id)?60:0))" @click="emit('choose',eq.id)"><span><strong>{{ eq.name }}</strong><small>{{ eq.description }}</small></span><b>{{ eq.price }} 经费</b></button>
    <button :disabled="busy" @click="emit('choose','skip')"><span>先整理设备清单 · 进度 +4</span><ArrowRight :size="17"/></button>
   </template>
   <template v-else-if="pending.type==='route'"><p>骰子是 {{ pending.dice }}。{{ pending.bus?'摆渡车可以任选 1—6 格。':'低空专业的航线优化已就绪，可以多走一格。' }}</p><div class="route-options"><button v-for="n in routes" :key="n" :disabled="busy" @click="emit('choose',String(n))">{{ n }} 格</button></div></template>
   <template v-else-if="pending.type==='library'"><button :disabled="busy" @click="emit('choose','0')"><b>A</b><span>安静看文献 · 进度 +8</span></button><button :disabled="busy" @click="emit('choose','1')"><b>B</b><span>分享一篇好文献 · 双方进度 +4</span></button></template>
   <template v-else><button :disabled="busy||player.funds<20" @click="emit('choose','0')"><b>A</b><span>买杯咖啡 · 经费 -20 / 进度 +10</span></button><button :disabled="busy" @click="emit('choose','1')"><b>B</b><span>免费坐一会儿 · 心情 +6</span></button></template>
  </div>
  <p class="dialog-footer">选择保存在云端 · 现在离开，晚些回来继续也可以</p>
 </dialog>
</template>
