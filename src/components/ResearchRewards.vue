<script setup lang="ts">
import {Award,FileBadge,ArrowRight} from '@lucide/vue'
import type {Player} from '../types'
defineProps<{player:Player;busy:boolean;now:number;labLevel:number}>()
const emit=defineEmits<{act:[action:string,payload?:Record<string,unknown>]}>()
const minutes=(at:number,now:number)=>Math.max(0,Math.ceil((at-now)/60000))
</script>
<template>
 <div class="benefit-banner"><Award :size="23"/><span><b>你的成果，真的会养活科研小摊。</b><small>每篇论文、每项授权专利各让项目经费 +2%；每位毕业生 +1%。当前成果加成 <strong>+{{ Math.round(player.benefits.achievementBonus*100) }}%</strong>，上限 12%，另与设备、专业、实验室加成叠加。</small></span></div>
 <div class="reward-grid"><div><span>发表一篇论文</span><b>100 经费 · 5 声望 · 1 成果点</b><small>另送 1 张科研卡、12 专利灵感，解锁同行来信。</small></div><div><span>授权一项专利</span><b>120 经费 · 3 声望 · 8 心情</b><small>解锁技术合作来信，项目经费长期 +2%。</small></div></div>
 <article class="patent-feature"><div class="section-title"><h2><FileBadge :size="21"/>我的专利小本本</h2><span>已授权 {{ player.patent.total }} 项</span></div><p>{{ player.patent.phase==='review'?'技术交底已寄出，坐等游戏审查员上班。':'论文和科研事件会积攒灵感；每次移动后，也能整理一次技术交底。' }}</p><div class="progress-track"><i :style="{width:(player.patent.phase==='review'?100:player.patent.progress/60*100)+'%'}"/></div><div class="patent-actions"><span>{{ player.patent.phase==='review'?'审查中 · 约 '+minutes(player.patent.dueAt,now)+' 分钟后授权':player.patent.progress+' / 60 专利灵感' }}</span><template v-if="player.patent.phase==='draft'"><button class="secondary" :disabled="busy||!!player.pending||player.funds<40||player.patent.progress>=60||!player.actionCount||player.patent.lastWorkAction===player.actionCount" @click="emit('act','patent_work')">整理交底 · 40 经费</button><button class="primary" :disabled="busy||!!player.pending||player.patent.progress<60||player.funds<80" @click="emit('act','patent_submit')">申请 · 80 经费<ArrowRight :size="16"/></button></template></div><small class="muted">整理交底 +15 灵感；申请后 {{ labLevel>=4?1:2 }} 小时自动授权。这里的专利是游戏成果，不是真实申请流程。</small></article>
</template>
