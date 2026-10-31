<script setup lang="ts">
import {Building2,ArrowRight,X} from '@lucide/vue'
import type {Player} from '../types'
defineProps<{player:Player;busy:boolean}>()
defineEmits<{choose:[choice:string];close:[]}>()
</script>
<template><div class="resume-overlay" role="dialog" aria-modal="true" @keydown.esc="$emit('close')" :aria-label="player.pending?.title"><section class="resume-dialog world-encounter"><button class="icon-button close-resume" aria-label="稍后决定" @click="$emit('close')"><X :size="20"/></button><Building2 :size="37"/><span class="small-label">园区里的一次偶遇</span><h2>{{ player.pending?.title }}</h2><p>{{ player.pending?.body }}</p><button v-for="c in player.pending?.choices" :key="c.id" class="secondary wide" :disabled="busy||player.funds<c.cost" @click="$emit('choose',c.id)">{{ c.text }}<ArrowRight :size="15"/></button><small class="gentle-footer">做完选择再结算，随时可以回来继续。</small></section></div></template>
