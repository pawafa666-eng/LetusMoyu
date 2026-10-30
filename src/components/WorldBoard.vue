<script setup lang="ts">
import {computed,defineAsyncComponent,ref} from 'vue'
import content from '../content.json'
import type {RoomState,Motion} from '../types'
import LegacyBoard from './CampusBoard.vue'
const Scene=defineAsyncComponent(()=>import('./CampusScene.vue'))
defineProps<{state:RoomState;paused?:boolean}>()
const fallback=ref(false),selected=ref<number|null>(null),scene=ref<{playMove:(motion:Motion)=>Promise<void>}>()
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
  <div class="map-legend"><span><i class="legend-civil"/>智能建造博士</span><span><i class="legend-air"/>低空经济博士</span><label>查看地点<select :value="selected??''" aria-label="查看地图地点" @change="selected=Number(($event.target as HTMLSelectElement).value)"><option value="" disabled>选择一个建筑</option><option v-for="t in content.tiles" :key="t.id" :value="t.id">{{ String(t.id+1).padStart(2,'0') }} · {{ t.name }}</option></select></label></div>
  <div v-if="tile" class="tile-inspector"><span><b>{{ tile.name }}</b><small v-if="tile.project!==null">基础收益 {{ content.projects[tile.project]?.income }} 经费 / 2 小时 · 基础承接价 {{ content.projects[tile.project]?.cost }}</small><small v-else>走到这里会遇见一件小事，点击建筑只查看信息。</small></span><button class="text-button" @click="selected=null">收起</button></div>
 </template></div>
</template>
