<script setup lang="ts">
import {computed,defineAsyncComponent,ref} from 'vue'
import type {Component} from 'vue'
import content from '../content.json'
import type {RoomState,Motion} from '../types'
import LegacyBoard from './CampusBoard.vue'
const props=defineProps<{state:RoomState;paused?:boolean}>()
const placeName=(name:string)=>props.state.lab.level>=2?name.replaceAll('导师','研究所领导'):name
const fallback=ref(false),selected=ref<number|null>(null),scene=ref<{playMove:(motion:Motion)=>Promise<void>}>()
const Scene=defineAsyncComponent<Component>(async()=>{try{return (await import('./CampusScene.vue')).default}catch{fallback.value=true;return LegacyBoard;}})
const world=ref<HTMLDivElement>()
const tile=computed(()=>selected.value===null?null:content.tiles[selected.value])
async function playMove(motion:Motion){if(!fallback.value)await scene.value?.playMove(motion)}
function focusMap(){world.value?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'})}
defineExpose({playMove,focusMap})
</script>
<template>
 <div ref="world">
 <template v-if="fallback"><p class="muted">当前设备使用轻量地图，科研进度照常保存。</p><LegacyBoard :state="state"/></template>
 <template v-else><Scene ref="scene" :state="state" :paused="paused" @select="selected=$event" @unavailable="fallback=true"/>
  <div class="map-legend"><span><i class="legend-civil"/>智能建造博士</span><span><i class="legend-air"/>低空经济博士</span><label>查看地点<select :value="selected??''" aria-label="查看地图地点" @change="selected=Number(($event.target as HTMLSelectElement).value)"><option value="" disabled>选择一个建筑</option><option v-for="t in content.tiles" :key="t.id" :value="t.id">{{ String(t.id+1).padStart(2,'0') }} · {{ placeName(t.name) }}</option></select></label></div>
  <div v-if="tile" class="tile-inspector"><span><b>{{ placeName(tile.name) }}</b><small v-if="tile.project!==null">{{ content.projects[tile.project]?.kind==='contract'?'合同总额 '+content.projects[tile.project]?.totalFunding+' · 四阶段任务验收拨款':'基础收益 '+content.projects[tile.project]?.income+' 经费 / 2 小时 · 设施投入 '+content.projects[tile.project]?.cost }}</small><small v-else>走到这里会遇见一件小事，点击建筑只查看信息。</small></span><button class="text-button" @click="selected=null">收起</button></div>
 </template></div>
</template>
