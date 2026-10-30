<script setup lang="ts">
import {ref,watch} from 'vue'
import {Coins,Save} from '@lucide/vue'
import type {Student} from '../types'
const props=defineProps<{student:Student;busy:boolean}>(),emit=defineEmits<{act:[action:string,payload:Record<string,unknown>]}>()
const rate=ref(props.student.wage.rate)
watch(()=>props.student.wage.rate,value=>rate.value=value)
</script>
<template><form class="wage-editor" @submit.prevent="emit('act','student_wage',{id:student.id,rate})"><div><Coins :size="19"/><span><b>{{ student.name }}的助研劳务</b><small>累计到账 {{ student.wage.total }} · 待发 {{ Math.floor(student.wage.buffer) }} / 100</small></span></div><label>经费 / 小时<input v-model.number="rate" type="number" :min="student.degree==='phds'?2:1" max="1000" step="1" required :disabled="!!student.graduatedAt"/></label><button class="secondary" :disabled="busy||!!student.graduatedAt||rate===student.wage.rate"><Save :size="14"/>保存时薪</button><p>硕士最低 1、博士最低 2。按服务器时间累计，老师同步时自动发放；不足的经费保留待发，不扣负数。</p></form></template>
