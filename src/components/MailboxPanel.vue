<script setup lang="ts">
import {computed,onMounted,ref,watch} from 'vue'
import {Mail,MailOpen,Send,Users,PenLine,ArrowRight,Pin,Check,Paperclip,RefreshCw,GraduationCap} from '@lucide/vue'
import {request} from '../backend'
import type {ApiResult,Player,LetterThread,ThreadSummary} from '../types'
import content from '../content.json'
import MailOutcome from './MailOutcome.vue'
import MailGrant from './MailGrant.vue'
import ScholarPortrait from './ScholarPortrait.vue'
const props=defineProps<{player:Player;partner?:Player;busy:boolean;now:number;perform:(action:string,payload?:Record<string,unknown>)=>Promise<ApiResult|undefined>}>()
const box=ref<'events'|'threads'|'sent'|'contacts'|'compose'>('events'),selected=ref(''),attendee=ref('')
const threads=ref<ThreadSummary[]>([]),thread=ref<LetterThread|null>(null),nextOffset=ref<number|null>(null),queryBusy=ref(false),error=ref('')
const to=ref(''),subject=ref(''),body=ref(''),studentId=ref(''),replyBody=ref(''),offerStudent=ref('')
const eventMails=computed(()=>[...(props.player.inbox||[])].reverse()),current=computed(()=>eventMails.value.find(m=>m.id===selected.value)||eventMails.value[0])
const unread=computed(()=>eventMails.value.filter(m=>!m.readAt&&!m.repliedAt).length+(props.player.threadSummaries||[]).filter(t=>t.unread).length)
const activeStudents=computed(()=>props.player.students.filter(st=>!st.graduatedAt))
const people=computed(()=>[...(props.partner?[{id:props.partner.id,name:props.partner.profile.name,address:(props.partner.discipline==='air'?'yizi':'fafa')+'@buji.example',role:'置顶 · 科研搭子',kind:'peer',color:'blue'}]:[]),...content.research.contacts.map(c=>({...c,kind:'npc'}))])
const visibleThreads=computed(()=>box.value==='sent'?threads.value.filter(t=>t.sentByMe):threads.value)
const date=(at:number)=>new Date(at).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})
async function load(more=false){
 queryBusy.value=true;error.value=''
 try{const r=await request('letter_list',{offset:more?nextOffset.value||0:0});if(!r.ok)throw Error(r.error);threads.value=more?[...threads.value,...r.threads||[]]:r.threads||[];nextOffset.value=r.nextOffset??null;}
 catch(e){error.value=e instanceof Error?e.message:'邮件暂时未能读取'}finally{queryBusy.value=false}
}
async function openThread(id:string){
 error.value='';try{const changed=thread.value?.id!==id,r=await request('letter_get',{id});if(!r.ok||!r.thread)throw Error(r.error||'会话不存在');thread.value=r.thread;if(changed){offerStudent.value=r.thread.attachedStudent?.id||'';replyBody.value='';}if(r.thread.unread){const saved=await props.perform('letter_read',{id});if(saved?.thread)thread.value=saved.thread;}}
 catch(e){error.value=e instanceof Error?e.message:'会话暂时未能读取'}
}
async function openEvent(id:string){selected.value=id;attendee.value='';const m=eventMails.value.find(x=>x.id===id);if(m&&!m.readAt)await props.perform('mail_read',{id})}
async function switchBox(value:typeof box.value){box.value=value;if(value==='threads'||value==='sent')await load()}
function compose(id=''){to.value=id;box.value='compose';subject.value='';body.value='';studentId.value='';error.value=''}
async function send(){
 const r=await props.perform('letter_send',{to:to.value,subject:subject.value,body:body.value,studentId:studentId.value||undefined});
 if(r?.ok){body.value='';subject.value='';box.value='threads';await load();if(r.threadId)await openThread(r.threadId)}
}
async function reply(){if(!thread.value)return;const r=await props.perform('letter_reply',{id:thread.value.id,body:replyBody.value});if(r?.ok){replyBody.value='';if(r.thread)thread.value=r.thread;await load()}}
async function chooseOffer(choice:number){if(!thread.value?.offer)return;const r=await props.perform('letter_offer',{id:thread.value.id,choice,studentId:offerStudent.value||undefined});if(r?.thread)thread.value=r.thread}
watch(()=>JSON.stringify(props.player.threadSummaries||[]),async()=>{if(box.value==='threads'||box.value==='sent'){await load();if(thread.value)await openThread(thread.value.id)}})
onMounted(()=>{if(!to.value&&props.partner)to.value=props.partner.id})
</script>
<template>
 <div class="panel-heading"><div><span class="eyebrow">BUJI UNIVERSITY · MAIL</span><h1>博士邮箱 <small class="mail-count">{{ unread }}</small></h1></div><button class="primary" :disabled="busy" @click="compose()"><PenLine :size="16"/>写邮件</button></div>
 <div class="research-subnav mail-folders"><button :class="{active:box==='events'}" @click="switchBox('events')"><Mail :size="15"/>来信与邀请</button><button :class="{active:box==='threads'}" @click="switchBox('threads')"><MailOpen :size="15"/>往来会话</button><button :class="{active:box==='sent'}" @click="switchBox('sent')"><Send :size="15"/>已发送</button><button :class="{active:box==='contacts'}" @click="switchBox('contacts')"><Users :size="15"/>通讯录</button></div>
 <p v-if="error" class="error-text" role="alert">{{ error }}</p>
 <div v-if="box==='contacts'" class="contact-directory"><article v-for="(c,i) in people" :key="c.id" class="contact-person" :class="c.color"><ScholarPortrait :seed="c.id" :size="48" :label="c.name+'头像'"/><div><b>{{ c.name }} <Pin v-if="c.kind==='peer'" :size="12"/></b><span>{{ c.address }}</span><small>{{ c.role }}</small></div><button class="secondary" @click="compose(c.id)">写信<ArrowRight :size="14"/></button></article></div>
 <form v-else-if="box==='compose'" class="compose-letter" @submit.prevent="send"><span class="small-label">NEW MESSAGE · 保存到云端园区</span><label>收件人<select v-model="to" required><option value="" disabled>选择通讯录联系人</option><option v-for="c in people" :key="c.id" :value="c.id">{{ c.kind==='peer'?'★ ':'' }}{{ c.name }} · {{ c.address }}</option></select></label><label>主题<input v-model="subject" maxlength="120" required placeholder="写一个让对方看得懂的标题"/></label><label>正文<textarea v-model="body" rows="10" maxlength="4000" required placeholder="老师您好：&#10;&#10;想和您咨询一下……"/></label><label v-if="activeStudents.length"><span><Paperclip :size="14"/>附上一位学生的研究资料（可选）</span><select v-model="studentId"><option value="">不附学生资料</option><option v-for="st in activeStudents" :key="st.id" :value="st.id">{{ st.name }} · {{ st.topic }}</option></select></label><div class="compose-footer"><span>{{ body.length }} / 4000 · NPC 来信由园区主人在独立信务室处理</span><button class="primary" :disabled="busy||!to||!subject.trim()||!body.trim()"><Send :size="16"/>发送邮件</button></div></form>
 <div v-else-if="box==='events'" class="mail-workspace">
  <div class="mail-list" aria-label="科研来信列表"><button v-for="m in eventMails" :key="m.id" :class="{selected:current?.id===m.id,unread:!m.readAt&&!m.repliedAt}" @click="openEvent(m.id)"><component :is="m.repliedAt?Check:m.readAt?MailOpen:Mail" :size="17"/><span><strong>{{ m.subject }}</strong><small>{{ m.sender }} · {{ date(m.receivedAt) }}</small></span></button></div>
  <article v-if="current" class="letter"><span class="small-label">INBOX · 科研来信</span><h2>{{ current.subject }}</h2><div class="letter-sender"><strong>{{ current.sender }}</strong><span>{{ current.address }}</span><time>{{ date(current.receivedAt) }}</time></div><p class="letter-body">{{ current.body }}</p><MailOutcome v-if="current.repliedAt" :mail="current"/><div v-else class="mail-choices"><label v-if="current.delegate" class="delegate-select"><GraduationCap :size="16"/>参加人<select v-model="attendee"><option value="">{{ current.requiresStudent?'请选择一位学生':'我本人' }}</option><option v-for="st in activeStudents" :key="st.id" :value="st.id">{{ st.name }} · {{ st.topic }}</option></select></label><span class="small-label">请选择回复，结果会在选择后揭晓。</span><button v-for="(option,i) in current.choices" :key="i" :disabled="busy||player.funds<option.cost||option.assignVisit&&!attendee" @click="perform('mail_reply',{id:current.id,choice:i,studentId:attendee||undefined})"><span>{{ option.text }}<small v-if="option.cost">需要 {{ option.cost }} 经费</small></span><ArrowRight :size="16"/></button></div></article>
 </div>
 <div v-else class="mail-workspace conversation-workspace"><div class="mail-list" aria-label="邮件会话列表"><button class="thread-refresh" :disabled="queryBusy" @click="load()"><RefreshCw :size="14"/>刷新会话</button><button v-for="t in visibleThreads" :key="t.id" :class="{selected:thread?.id===t.id,unread:t.unread}" @click="openThread(t.id)"><Mail :size="16"/><span><strong>{{ t.subject }}</strong><small>{{ t.last?.fromName }} · {{ date(t.updatedAt) }}</small><small>{{ t.awaitingStaff?'等待 NPC 回复':t.kind==='peer'?'搭子往来':'NPC 往来' }}</small></span></button><p v-if="!visibleThreads.length" class="mail-empty">{{ queryBusy?'正在读取云端邮件…':'还没有这类会话，给搭子或 NPC 写一封吧。' }}</p><button v-if="nextOffset!==null" :disabled="queryBusy" @click="load(true)">加载更早的会话</button></div>
  <article v-if="thread" class="letter conversation"><span class="small-label">{{ thread.kind==='peer'?'RESEARCH PARTNER':'CAMPUS CORRESPONDENCE' }}</span><h2>{{ thread.subject }}</h2><div v-if="thread.attachedStudent" class="student-attachment"><Paperclip :size="14"/>{{ thread.attachedStudent.name }} · {{ thread.attachedStudent.topic }}</div><div class="conversation-messages"><section v-for="message in thread.messages" :key="message.id" :class="{mine:message.role==='player'&&message.authorUid===player.id,receipt:message.role==='receipt'}"><div><b>{{ message.fromName }}</b><time>{{ date(message.at) }}</time></div><small>{{ message.fromAddress }}</small><p>{{ message.body }}</p><MailGrant v-if="message.grant" :grant="message.grant" :busy="busy" @claim="perform('letter_reward',{id:thread!.id,messageId:message.id})"/></section></div>
   <template v-if="thread.offer"><MailOutcome v-if="thread.offer.repliedAt" :mail="thread.offer"/><div v-else class="mail-choices"><label v-if="thread.offer.delegate">安排参加人<select v-model="offerStudent"><option value="">{{ thread.offer.requiresStudent?'请选择学生':'我本人' }}</option><option v-for="st in activeStudents" :key="st.id" :value="st.id">{{ st.name }} · {{ st.topic }}</option></select></label><button v-for="(option,i) in thread.offer.choices" :key="i" :disabled="busy||player.funds<option.cost||option.assignVisit&&!offerStudent" @click="chooseOffer(i)">{{ option.text }}<small v-if="option.cost">需 {{ option.cost }} 经费</small></button></div></template>
   <form class="conversation-reply" @submit.prevent="reply"><label>回复这封邮件<textarea v-model="replyBody" rows="4" maxlength="4000" placeholder="写下回复内容…" required/></label><button class="primary" :disabled="busy||!replyBody.trim()"><Send :size="15"/>发送回复</button></form>
  </article><div v-else class="letter mail-placeholder"><MailOpen :size="38"/><h2>打开一段往来</h2><p>给搭子的信会直接进入 TA 的邮箱。<br/>给 NPC 的信，会等园区主人在独立信务室回复。</p></div>
 </div><p class="gentle-footer">园区虚构邮箱 · 自动邀请每 75–105 分钟一封 · 正文和选择结果分开显示 · 不向现实邮箱发信</p>
</template>
