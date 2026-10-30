<script setup lang="ts">
import {CheckCircle2,AlertTriangle,GraduationCap} from '@lucide/vue'
import type {Mail} from '../types'
defineProps<{mail:Mail}>()
const labels:Record<string,string>={f:'经费',p:'论文进度',m:'心情',r:'声望',t:'导师好感',idea:'专利灵感'}
</script>
<template><div class="mail-outcome" :class="{tricked:mail.outcomeKind==='tricked'}" role="status"><component :is="mail.outcomeKind==='tricked'?AlertTriangle:CheckCircle2" :size="23"/><div><b>{{ mail.outcomeKind==='tricked'?'这次遇到了不靠谱的邀请':'处理结果' }}</b><p>{{ mail.result }}</p><div class="outcome-chips"><template v-for="(n,key) in mail.actual" :key="key"><span v-if="n" :class="{negative:n<0}">{{ labels[key]||key }} {{ n>0?'+':'' }}{{ n }}</span></template></div><p v-if="mail.attendee" class="delegate-receipt"><GraduationCap :size="15"/>{{ mail.attendee.name }} 参加：论文素材 {{ (mail.studentActual?.paper||0)>=0?'+':'' }}{{ mail.studentActual?.paper||0 }} · 心情 {{ (mail.studentActual?.mood||0)>=0?'+':'' }}{{ mail.studentActual?.mood||0 }}</p><small>选择与实际结果均已保存，不会重复结算。</small></div></div></template>
