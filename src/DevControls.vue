<script setup lang="ts">
import type {ApiResult} from './types'
defineProps<{busy:boolean;perform:(a:string,p?:Record<string,unknown>)=>Promise<ApiResult|undefined>}>()
</script>
<template><aside class="dev-controls"><b>仅本地演示工具</b><button :disabled="busy" @click="perform('__preview_clock',{hours:6})">演示快进 6 小时</button><button :disabled="busy" @click="perform('__preview_clock',{hours:24})">演示快进 24 小时</button><button v-for="level in [2,3,4,5]" :key="level" :disabled="busy" @click="perform('__preview_level',{level})">演示 Lv.{{ level }}</button><a href="?preview=1">查看 fafa</a><a href="?preview=1&previewPlayer=air">查看 Yizi</a></aside></template>
