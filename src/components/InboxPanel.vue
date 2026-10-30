<script setup lang="ts">
import {computed,ref} from 'vue'
import {Mail,MailOpen,ArrowRight,Check} from '@lucide/vue'
import type {Player} from '../types'
import content from '../content.json'
const props=defineProps<{player:Player;busy:boolean;now:number}>()
const emit=defineEmits<{act:[action:string,payload:Record<string,unknown>]}>()
const selected=ref('')
const mails=computed(()=>[...(props.player.inbox||[])].reverse())
const current=computed(()=>mails.value.find(m=>m.id===selected.value)||mails.value[0])
const letter=computed(()=>content.research.mailTemplates.find(m=>m.id===current.value?.template))
const waiting=computed(()=>mails.value.filter(m=>!m.repliedAt).length)
function open(id:string){selected.value=id;const m=mails.value.find(x=>x.id===id);if(m&&!m.readAt)emit('act','mail_read',{id})}
const date=(at:number)=>new Date(at).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})
</script>
<template>
 <div class="panel-heading"><div><span class="eyebrow">SOMEONE IS THINKING ABOUT YOUR RESEARCH</span><h1>博士收件箱 <small class="mail-count">{{ waiting }}</small></h1></div><Mail :size="30"/></div>
 <p class="muted">偶尔有同行，偶尔有群发。每 75–105 分钟一封，离线最多补 3 封。没有回复期限。</p>
 <div class="mail-workspace"><div class="mail-list" aria-label="邮件列表"><button v-for="m in mails" :key="m.id" :class="{selected:current?.id===m.id,unread:!m.readAt}" @click="open(m.id)"><component :is="m.repliedAt?Check:m.readAt?MailOpen:Mail" :size="17"/><span><strong>{{ content.research.mailTemplates.find(t=>t.id===m.template)?.subject }}</strong><small>{{ date(m.receivedAt) }} · {{ m.repliedAt?'已回复':m.readAt?'待回复':'新来信' }}</small></span></button></div>
  <article v-if="current&&letter" class="letter"><span class="small-label">不急大学 · 内部虚构来信</span><h2>{{ letter.subject }}</h2><div class="letter-sender"><strong>{{ letter.sender }}</strong><span>{{ letter.address }}</span><time>{{ date(current.receivedAt) }}</time></div><p class="letter-body">{{ letter.body }}</p><div v-if="current.repliedAt" class="reply-receipt"><Check :size="18"/><span>你的回复：{{ current.result }}<small>结果已经记到云端，奖励不会重复领取。</small></span></div><div v-else class="mail-choices"><span class="small-label">回一封，接着去忙。</span><button v-for="(option,i) in letter.choices" :key="i" :disabled="busy" @click="emit('act','mail_reply',{id:current.id,choice:i})">{{ option.text }}<ArrowRight :size="16"/></button></div></article>
 </div><p class="gentle-footer">这些都是游戏里的故事邮件，地址使用 .example，不会向真实邮箱收发邮件。未回复最多保留 8 封。</p>
</template>
