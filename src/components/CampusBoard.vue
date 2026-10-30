<script setup lang="ts">
import {computed,ref} from 'vue'
import {Building2,Plane,BookOpen,FlaskConical,Coffee,GraduationCap,Satellite,TreePine,Server,TrainFront,Printer,Presentation,Flag,ShoppingBag} from '@lucide/vue'
import content from '../content.json'
import type {RoomState} from '../types'
import CampusArt from './CampusArt.vue'
const props=defineProps<{state:RoomState}>()
const placeName=(name:string)=>props.state.lab.level>=2?name.replaceAll('导师','研究所领导'):name
const selected=ref<number|null>(null)
const tile=computed(()=>selected.value===null?null:content.tiles[selected.value])
const icons:Record<string,typeof Building2>={start:Flag,library:BookOpen,mentor:GraduationCap,equipment:Satellite,rest:Coffee,lab:FlaskConical,coffee:Coffee,paper:BookOpen,commute:TrainFront,poster:Presentation,card:ShoppingBag,boss:GraduationCap}
function icon(t:typeof content.tiles[number]){
 if(t.type==='project')return content.projects[t.project??0]?.domain==='air'?Plane:Building2
 return icons[t.type]||(t.id===16?Server:t.id===2?Printer:TreePine)
}
function placement(i:number){return i<10?{gridRow:1,gridColumn:i+1}:i<15?{gridRow:i-8,gridColumn:10}:i<25?{gridRow:7,gridColumn:25-i}:{gridRow:31-i,gridColumn:1}}
function owner(i:number){const p=content.tiles[i]?.project;return p===null?null:props.state.projects[p??-1]?.owner}
const people=computed(()=>Object.values(props.state.players))
</script>
<template>
 <div class="board-scroll"><div class="campus-board">
  <div class="board-center">
   <div class="map-label"><span class="eyebrow">BUJI UNIVERSITY · CAMPUS 01</span><h2>不急大学科研园区</h2><p>实验会有结果，摸鱼也算生活。</p></div>
   <CampusArt/>
   <div class="lab-map-label"><FlaskConical :size="14"/><span>{{ content.lab[state.lab.level-1]?.name }}</span><b>Lv.{{ state.lab.level }}</b></div>
   <div class="map-note"><span class="note-dot"/>{{ people.length===2?'两位博士，各忙各的，也一起往前走。':'空着的那张桌子，给你的搭子留着。' }}</div>
  </div>
  <button v-for="t in content.tiles" :key="t.id" class="tile" :class="[t.type,{owned:!!owner(t.id),mine:owner(t.id)===state.self,here:people.some(p=>p.position===t.id),selected:selected===t.id}]" :style="placement(t.id)" :aria-label="(t.id+1)+'号，'+t.name" @click="selected=selected===t.id?null:t.id">
   <span class="tile-number">{{ String(t.id+1).padStart(2,'0') }}</span>
   <component :is="icon(t)" :size="22" :stroke-width="1.6"/>
   <span class="tile-title">{{ placeName(t.name) }}</span>
   <span v-if="owner(t.id)" class="owner-ribbon">{{ state.players[owner(t.id)!]?.name }}</span>
   <span class="map-players"><span v-for="p in people.filter(x=>x.position===t.id)" :key="p.id" :class="['pawn',p.discipline]" :title="p.name"><i/></span></span>
  </button>
 </div></div>
 <div v-if="tile" class="tile-inspector">
  <span><b>{{ placeName(tile.name) }}</b><small v-if="tile.project!==null">{{ content.projects[tile.project]?.kind==='contract'?'合同总额 '+content.projects[tile.project]?.totalFunding+' · 四阶段任务验收拨款':'基础收益 '+content.projects[tile.project]?.income+' 经费 / 2 小时 · 设施投入 '+content.projects[tile.project]?.cost }}</small><small v-else>走到这里就能遇见园区的小故事。点击格子只查看信息。</small></span>
  <button class="text-button" @click="selected=null">收起</button>
 </div>
</template>
