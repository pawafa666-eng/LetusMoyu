<script setup lang="ts">
import {computed} from 'vue'
import {GraduationCap,Coins,Building2,LockKeyhole} from '@lucide/vue'
import type {Player,RoomState} from '../types'
import content from '../content.json'
import StudentWage from './StudentWage.vue'
const props=defineProps<{player:Player;state:RoomState;busy:boolean}>(),emit=defineEmits<{act:[action:string,payload:Record<string,unknown>]}>()
const students=computed(()=>props.player.students.filter(s=>!s.graduatedAt))
const hourly=computed(()=>students.value.reduce((n,s)=>n+s.wage.rate,0))
const rent=computed(()=>props.player.assets.filter(a=>a.mode==='rental').reduce((n,a)=>n+(content.operations.catalog.find(x=>x.id===a.sku)?.rent||0),0))
const money=(n:number)=>Math.floor(n).toLocaleString()
</script>
<template>
 <div class="career-banner"><GraduationCap :size="35"/><div><span class="small-label">不急大学 · {{ player.profile.research }}</span><h2>{{ player.profile.name }} · {{ player.career.title }}</h2><p>{{ player.career.faculty?'头顶的导师已经变成研究所领导，课题组的故事才刚刚展开。':'再把联合实验室升一级，两个人一起成为副教授。' }}</p></div></div>
 <div class="ops-ledger"><article><Coins :size="21"/><span>学校工资</span><b>{{ player.career.salaryRate }} / 小时</b><small>累计领取 {{ money(player.economy.salary.total) }} · 待领 {{ money(player.economy.salary.buffer) }} / 500</small></article><article><Building2 :size="21"/><span>校内设备租赁</span><b>{{ rent }} / 小时</b><small>每台离线最多累计 1000，自己回来才领取</small></article><article><GraduationCap :size="21"/><span>全组学生劳务</span><b>−{{ hourly }} / 小时</b><small>累计已发 {{ money(player.economy.totalWagesPaid) }} · 每名待发上限 100</small></article></div>
 <p v-if="player.economy.lastStatement" class="ops-statement">本小时收支合计：工资 +{{ player.economy.lastStatement.salary }}，校内租费 +{{ player.economy.lastStatement.rental }}，劳务 −{{ player.economy.lastStatement.wages }}，净变化 {{ player.economy.lastStatement.net>=0?'+':'' }}{{ player.economy.lastStatement.net }}。</p>
 <div class="section-title"><h2>老师定标准，学校看账单。</h2><span>{{ students.length }} 位在读学生</span></div>
 <StudentWage v-for="st in students" :key="st.id" :student="st" :busy="busy" @act="(a,p)=>emit('act',a,p)"/><p v-if="!students.length" class="empty-note">还没有在读学生，暂时没有劳务支出。</p>
 <div class="section-title"><h2>从两张桌子，到院士课题组</h2></div><ol class="career-path"><li v-for="(level,i) in content.lab" :key="i" :class="{unlocked:state.lab.level>i}"><i>{{ i+1 }}</i><div><b>{{ content.operations.careers[i] }}</b><h3>{{ level.name }}</h3><p>累计建设 {{ money(level.funds) }} 经费 · {{ level.credits }} 成果点 · {{ level.rep }} 登记声望</p><small v-if="i">升级时双方各获 {{ money(content.operations.grants[i]!) }} 启动经费；工资 20/小时，离线最多 500。</small></div><span>{{ state.lab.level>i?'已解锁':'待共建' }}</span></li></ol>
 <aside class="future-group"><LockKeyhole :size="23"/><div><h3>教授也会带自己的学生。</h3><p>三级可以引进教师并委托培养，四级组建方向团队，五级成立城市院士工作站。完整入口在“实验室生活 → 教师与研究所”，师生劳务和启动支出分别记账。</p></div></aside>
</template>
