<script setup lang="ts">
import {Gift} from '@lucide/vue'
defineProps<{modelValue:{f:number;r:number;p:number}}>()
const emit=defineEmits<{ 'update:modelValue':[value:{f:number;r:number;p:number}] }>()
function change(key:'f'|'r'|'p',event:Event,model:{f:number;r:number;p:number}){emit('update:modelValue',{...model,[key]:Number((event.target as HTMLInputElement).value||0)})}
</script>
<template><fieldset class="resource-composer"><legend><Gift :size="16"/>给收件人的资源附件（可选）</legend><div><label>科研经费<input :value="modelValue.f" type="number" min="0" max="5000" step="1" @input="change('f',$event,modelValue)"/></label><label>科研声望<input :value="modelValue.r" type="number" min="0" max="50" step="1" @input="change('r',$event,modelValue)"/></label><label>论文进度<input :value="modelValue.p" type="number" min="0" max="100" step="1" @input="change('p',$event,modelValue)"/></label></div><p>填 0 表示不附送。玩家领取后才到账，每份附件只结算一次；活动邀请另外处理。</p></fieldset></template>
