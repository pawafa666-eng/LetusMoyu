<script setup lang="ts">
import {ref,onBeforeUnmount} from 'vue'
const props=defineProps<{demo?:boolean}>()
const active=ref(false),spinning=ref(false),result=ref<number|null>(null),angle=ref('rotateX(-18deg) rotateY(-25deg)'),status=ref('骰子在路上…')
const spots:Record<number,number[]>={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]}
const turns:Record<number,string>={1:'rotateX(0deg) rotateY(0deg)',2:'rotateX(0deg) rotateY(-90deg)',3:'rotateX(-90deg) rotateY(0deg)',4:'rotateX(90deg) rotateY(0deg)',5:'rotateX(0deg) rotateY(90deg)',6:'rotateX(0deg) rotateY(180deg)'}
let pending:()=>void=()=>{},timer:ReturnType<typeof setTimeout>|undefined
function begin(){active.value=true;spinning.value=true;result.value=null;status.value=props.demo?'演练骰子转起来…':'骰子在路上…'}
function finish(n:number):Promise<void>{
 result.value=n;spinning.value=false;angle.value=turns[n]||turns[1]!;status.value='这次走 '+n+' 步'
 return new Promise(resolve=>{pending=resolve;timer=setTimeout(()=>{active.value=false;resolve()},window.matchMedia('(prefers-reduced-motion: reduce)').matches?250:1050)})
}
function cancel(){clearTimeout(timer);active.value=false;spinning.value=false;pending()}
onBeforeUnmount(cancel);defineExpose({begin,finish,cancel})
</script>
<template><div v-if="active" class="dice-overlay" role="status" aria-live="polite"><div class="dice-stage"><span class="eyebrow">TAKE A LITTLE RESEARCH BREAK</span><div class="dice-space"><div class="real-dice" :class="{spinning}" :style="{transform:angle}"><div v-for="n in [1,2,3,4,5,6]" :key="n" class="dice-face" :class="'face-'+n"><i v-for="s in 9" :key="s" :class="{pip:spots[n]?.includes(s)}"/></div></div></div><h2>{{ status }}</h2><p>{{ demo?'演练点数不会影响正式存档。':result?'点数已存好，小博士准备出发。':'云端正在摇骰，今天会遇见什么？' }}</p></div></div></template>
