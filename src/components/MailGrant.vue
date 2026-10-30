<script setup lang="ts">
import {Gift,Coins,Award,BookOpen,Check} from '@lucide/vue'
import type {ResourceGrant} from '../types'
defineProps<{grant:ResourceGrant;busy?:boolean;inspect?:boolean}>()
defineEmits<{claim:[]}>()
</script>
<template><aside class="mail-resource-grant"><div class="grant-heading"><Gift :size="18"/><b>来信资源附件</b><span v-if="grant.claimedAt"><Check :size="13"/>已领取</span></div><div class="grant-resources"><span v-if="grant.f"><Coins :size="15"/>经费 +{{ grant.f }}</span><span v-if="grant.r"><Award :size="15"/>声望 +{{ grant.r }}</span><span v-if="grant.p"><BookOpen :size="15"/>论文进度 +{{ grant.p }}</span></div><p v-if="grant.claimedAt">实际到账：经费 +{{ grant.actual?.f||0 }} · 声望 +{{ grant.actual?.r||0 }} · 论文进度 +{{ grant.actual?.p||0 }}。</p><p v-else-if="inspect">附件已保存，等待收件玩家领取。</p><template v-else><p>领取后由服务器入账，已有满额进度按实际容量计算。</p><button class="primary" :disabled="busy" @click="$emit('claim')"><Gift :size="15"/>领取来信附件</button></template></aside></template>
