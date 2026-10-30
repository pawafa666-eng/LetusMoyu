<script setup lang="ts">
import {Clock3,Users} from '@lucide/vue'
import type {RoomState} from '../types'
const props=defineProps<{state:RoomState;now:number}>()
const label:Record<string,string>={procurement:'采购流程',economy:'课题组收支',career:'职称晋升',equipment:'科研资产',contract:'横向任务',students:'学生培养',correspondence:'园区邮件',mail:'科研来信',paper:'论文',patent:'专利',project:'项目',income:'项目收益',interaction:'搭子互动',lab:'联合建设',research:'科研日常'}
function color(id:string){return props.state.players[id]?.discipline==='air'?'yizi':'fafa'}
function relative(at:number){const min=Math.max(0,Math.floor((props.now-at)/60000));return min===0?'刚刚':min<60?min+' 分钟前':min<1440?Math.floor(min/60)+' 小时前':new Date(at).toLocaleDateString('zh-CN')}
</script>
<template><div class="feed-people-legend"><span class="fafa">fafa · 蓝色</span><span class="yizi">Yizi · 粉色</span></div><ol class="feed-list campus-news"><li v-for="item in state.feed.slice(0,18)" :key="item.id" :class="item.actorIds?.length===2?'feed-duo':item.actorIds?.length?'feed-'+color(item.actorIds[0]!):'feed-campus'"><div class="news-meta"><span v-for="id in item.actorIds||[]" :key="id" class="news-person" :class="color(id)">{{ state.players[id]?.profile.name||state.players[id]?.name||'园区' }}</span><span v-if="!item.actorIds?.length" class="news-person campus"><Users :size="11"/>园区</span><span class="news-kind">{{ label[item.kind]||'园区日常' }}</span></div><p>{{ item.text }}</p><time><Clock3 :size="10"/>{{ relative(item.at) }}</time></li></ol></template>
