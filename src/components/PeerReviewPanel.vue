<script setup lang="ts">
import {computed,reactive} from 'vue'
import {MailCheck,Send,Check,FileCheck,Coins} from '@lucide/vue'
import type {ApiResult,Paper,StudentTask} from '../types'
import content from '../content.json'
const props=defineProps<{manuscript:Paper|StudentTask;studentId?:string;funds:number;busy:boolean;perform:(action:string,payload?:Record<string,unknown>)=>Promise<ApiResult|undefined>}>()
const history=computed(()=>props.manuscript.reviewHistory||[]),phase=computed(()=>'phase'in props.manuscript?props.manuscript.phase:props.manuscript.status),latest=computed(()=>history.value.at(-1))
const drafts=reactive<Record<string,string>>({}),approaches=reactive<Record<string,string>>({})
const journal=computed(()=>content.journals.find(j=>j.id===props.manuscript.journal)||content.journals[0]!)
const defaultReply='感谢审稿人的建议。已补充相关材料，并在返修稿中澄清适用条件与结果。'
function reply(id:string){return drafts[id]??defaultReply}
function cost(id:string){return approaches[id]==='rerun'?20:approaches[id]==='analyse'?10:0}
</script>
<template>
 <section class="peer-panel"><header><MailCheck :size="25"/><div><span class="small-label">EDITORIAL DESK · 来信与返修</span><h2>{{ studentId?'这篇学生论文的审稿记录':'编辑部来信' }}</h2></div></header>
  <label v-if="!studentId&&phase==='draft'" class="journal-select">投稿交流窗口<select :value="manuscript.journal" :disabled="busy" @change="perform('paper_journal',{journal:($event.target as HTMLSelectElement).value})"><option v-for="j in content.journals" :key="j.id" :value="j.id">{{ j.name }} · 通过后版面费 {{ j.fee }}</option></select></label>
  <p v-if="!history.length" class="muted">{{ phase==='review'?'编辑部正在组织审稿。下一封来信会包含具体意见，暂时不用催它。':'投稿后先等真实审稿意见，再一点点处理返修。' }} {{ journal.name }}，通过后版面费 {{ journal.fee }}。</p>
  <details v-for="(letter,i) in history" :key="letter.id" :open="i===history.length-1" class="review-letter"><summary>{{ letter.title }}<small>第 {{ letter.round+1 }} 轮 · {{ new Date(letter.at).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) }}</small></summary><p class="editor-letter-body">{{ letter.body }}</p>
   <article v-for="c in letter.comments" :key="c.id" class="review-comment"><span class="small-label">{{ c.reviewer }}</span><p>{{ c.text }}</p><div v-if="c.handledAt" class="review-reply"><b><Check :size="14"/>已回应</b><p>{{ c.response }}</p></div>
    <form v-else-if="!studentId&&i===history.length-1&&['major','minor'].includes(phase)" @submit.prevent="perform('paper_response',{id:c.id,approach:approaches[c.id]||'explain',response:reply(c.id)})"><label>怎么处理<select :value="approaches[c.id]||'explain'" @change="approaches[c.id]=($event.target as HTMLSelectElement).value"><option value="explain">澄清边界与已有证据 · 免费</option><option value="analyse">补充分析 · 10 经费</option><option value="rerun">重新验证 · 20 经费</option></select></label><label>给审稿人的回复<textarea :value="reply(c.id)" rows="3" minlength="8" maxlength="600" @input="drafts[c.id]=($event.target as HTMLTextAreaElement).value"/></label><button class="secondary" :disabled="busy||funds<cost(c.id)"><Send :size="14"/>提交这条回复</button></form>
    <p v-else-if="studentId" class="muted">同学会随返修推进整理回应，老师也可以协助补充验证。</p>
   </article>
  </details>
  <div v-if="studentId&&phase==='revision'" class="review-assist"><p>同学正在根据意见返修，适合的工作与良好的交流会帮助推进。</p><button class="secondary" :disabled="busy||funds<20||!!latest?.helpedAt" @click="perform('student_review_help',{id:studentId})">{{ latest?.helpedAt?'本轮已协助':'协助补充验证 · 20 经费' }}</button></div>
  <div v-if="phase==='proof'" class="paper-proof"><FileCheck :size="29"/><div><h3>学术审查通过，最后核对一次校样。</h3><p>版面费 {{ manuscript.fee||journal.fee }}，支付后才计入已发表论文与代表作。</p></div><button class="primary" :disabled="busy||funds<(manuscript.fee||journal.fee)" @click="perform(studentId?'student_publish':'paper_publish',studentId?{id:studentId}:{})"><Coins :size="16"/>核对并缴费发表</button></div>
  <p v-if="['major','minor','revision'].includes(phase)" class="gentle-footer">返修没有期限。意见回应和材料进度都完成后，再提交下一轮。</p>
 </section>
</template>
