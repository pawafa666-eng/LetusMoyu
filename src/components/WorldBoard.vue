<script setup lang="ts">
import {computed,defineAsyncComponent,ref,watch} from 'vue'
import type {Component} from 'vue'
import content from '../content.json'
import type {RoomState,Motion} from '../types'
import LegacyBoard from './CampusBoard.vue'
const props=defineProps<{state:RoomState;paused?:boolean}>()
const region=computed(()=>props.state.players[props.state.self]?.scene||'campus')
const mapTiles=computed(()=>region.value==='campus'?content.tiles:(content.world.locations as Record<string,{id:number;name:string;type:string}[]>)[region.value]||[])
const placeName=(name:string)=>props.state.lab.level>=2?name.replaceAll('导师','研究所领导'):name
watch(region,()=>selected.value=null)
const fallback=ref(false),selected=ref<number|null>(null),scene=ref<{playMove:(motion:Motion)=>Promise<void>}>()
const Scene=defineAsyncComponent<Component>(async()=>{try{return (await import('./CampusScene.vue')).default}catch{fallback.value=true;return LegacyBoard;}})
const world=ref<HTMLDivElement>()
const tileProject=computed(()=>{const t=tile.value;return t&&'project'in t&&typeof t.project==='number'?content.projects[t.project]:null})
const tile=computed(()=>selected.value===null?null:mapTiles.value[selected.value])
async function playMove(motion:Motion){if((motion.scene||'campus')===region.value&&!fallback.value)await scene.value?.playMove(motion)}
function focusMap(){world.value?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'})}
defineExpose({playMove,focusMap})
</script>
<template>
 <div ref="world">
 <template v-if="fallback&&region==='campus'"><p class="muted">当前设备使用轻量地图，科研进度照常保存。</p><LegacyBoard :state="state"/></template>
 <template v-else><div v-if="fallback" class="district-fallback"><button v-for="t in mapTiles" :key="t.id" @click="selected=t.id">{{ t.id+1 }} · {{ t.name }}</button></div><Scene v-else :key="region" :region="region" ref="scene" :state="state" :paused="paused" @select="selected=$event" @unavailable="fallback=true"/>
  <div class="map-legend"><span><i class="legend-civil"/>智能建造博士</span><span><i class="legend-air"/>低空经济博士</span><label>查看地点<select :value="selected??''" aria-label="查看地图地点" @change="selected=Number(($event.target as HTMLSelectElement).value)"><option value="" disabled>选择一个建筑</option><option v-for="t in mapTiles" :key="t.id" :value="t.id">{{ String(t.id+1).padStart(2,'0') }} · {{ placeName(t.name) }}</option></select></label></div>
  <div v-if="tile" class="tile-inspector"><span><b>{{ placeName(tile.name) }}</b><small v-if="tileProject">{{ tileProject.kind==='contract'?'合同总额 '+tileProject.totalFunding+' · 四阶段任务验收拨款':'基础收益 '+tileProject.income+' 经费 / 2 小时 · 设施投入 '+tileProject.cost }}</small><small v-else>走到这里会遇见一件小事，点击建筑只查看信息。</small></span><button class="text-button" @click="selected=null">收起</button></div>
 </template></div>
</template>
