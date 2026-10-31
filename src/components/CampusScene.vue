<script setup lang="ts">
import {onMounted,onBeforeUnmount,watch,ref} from 'vue'
import * as T from 'three'
import {OrbitControls} from 'three/addons/controls/OrbitControls.js'
import {box,colors,makeTileAsset,makeCenter,makeDrone,makeScholar,tilePosition} from '../three/models'
import type {Scholar} from '../three/models'
import type {CampusDisplay,Motion} from '../types'
import content from '../content.json'
const props=defineProps<{state:CampusDisplay;paused?:boolean;region?:string}>()
const region=props.region||'campus'
const isCampus=region==='campus'
const mapTiles=isCampus?content.tiles:(content.world.locations as Record<string,{id:number;name:string;type:string}[]>)[region]||[]
const count=mapTiles.length
function position(i:number){if(isCampus)return tilePosition(i);i=((i%12)+12)%12;const x=i<4?i-1.5:i<7?1.5:i<10?7.5-i:-1.5,z=i<4?-1.5:i<7?i-4.5:i<10?1.5:10.5-i;return new T.Vector3(x*2.5,0,z*2.5)}
function centerModel(level:number){if(isCampus)return makeCenter(level);const g=new T.Group();if(region==='enterprise'){for(const [x,h,c] of [[-1,1.5,0x7dabb9],[.1,2,0x91bac7],[1.15,1.1,0xc59c7d]]){box(g,.7,h,1,x,h/2,0,c);for(let y=.3;y<h;y+=.35)box(g,.72,.12,.025,x,y,.52,0xd8eaf1)}}else{box(g,3,.035,1.5,0,.02,0,0xa9c9ce);box(g,1,.1,.6,0,.08,0,0xe9d2af);box(g,.12,.9,.12,.6,.5,.3,0x987c67);box(g,1.1,.12,1.1,.6,1,.3,0xc88799)}return g}
const emit=defineEmits<{select:[index:number];unavailable:[]}>()
const host=ref<HTMLDivElement>(),canvas=ref<HTMLCanvasElement>()
const labels=ref<{x:number;y:number;name:string}[]>([])
let scene:T.Scene,camera:T.OrthographicCamera,renderer:T.WebGLRenderer,controls:OrbitControls,resize:ResizeObserver,frame=0,resizeFrame=0,last=0,lastWidth=0,lastHeight=0,center:T.Group
let drone:T.Group,rover:T.Group,dead=false,ready=false,level=0
const pawns=new Map<string,Scholar>(),animated=new Map<string,string>(),tiles:T.Object3D[]=[],owners:T.Mesh[]=[]
type Walk={motion:Motion;start:number;resolve:()=>void}
const walks=new Map<string,Walk>()
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches
const offset=(id:string)=>id===props.state.self?-.21:.21
function place(id:string,i:number){const v=position(i);v.x+=offset(id);v.z+=.36;v.y=.13;return v}
function clearObject(o:T.Object3D){o.traverse(obj=>{if(obj instanceof T.Mesh){obj.geometry.dispose();for(const m of Array.isArray(obj.material)?obj.material:[obj.material])m.dispose()}})}
function sync(){
 if(!ready)return
 if(level!==props.state.lab.level){if(center){scene.remove(center);clearObject(center)}level=props.state.lab.level;center=centerModel(level);center.position.y=.1;scene.add(center)}
 for(const p of Object.values(props.state.players)){
  const here=(p.scene||'campus')===region,at=isCampus?p.position:p.world?.positions[region]||0;
  if(pawns.has(p.id))pawns.get(p.id)!.group.visible=here;
  if(!here)continue
  if(!pawns.has(p.id)){const actor=makeScholar(p.discipline);actor.group.scale.setScalar(1.45);actor.group.position.copy(place(p.id,at));pawns.set(p.id,actor);scene.add(actor.group);actor.group.visible=here;animated.set(p.id,p.lastMove?.id||'')}
  const actor=pawns.get(p.id)!
  if(!walks.has(p.id)){
   if(p.id!==props.state.self&&p.lastMove&&(p.lastMove.scene||'campus')===region&&!p.lastMove.pendingRoute&&animated.get(p.id)!==p.lastMove.id)void playMove(p.lastMove,p.id)
   else actor.group.position.copy(place(p.id,at))
  }
 }
 if(isCampus)for(let i=0;i<count;i++){const tile=content.tiles[i]!,project=tile.project===null?null:props.state.projects[tile.project];owners[i]!.visible=!!project;if(project)(owners[i]!.material as T.MeshLambertMaterial).color.setHex(props.state.players[project.owner]?.discipline==='civil'?colors.orange:colors.blue)}
}
function playMove(motion:Motion,id=props.state.self):Promise<void>{
 if((motion.scene||'campus')!==region||!ready||reduced||motion.pendingRoute||!pawns.has(id))return Promise.resolve()
 walks.get(id)?.resolve();animated.set(id,motion.id)
 return new Promise(resolve=>{walks.set(id,{motion,start:performance.now(),resolve})})
}
function draw(time:number){
 if(dead)return
 frame=requestAnimationFrame(draw)
 if(document.hidden||props.paused||time-last<32)return;last=time
 for(const [id,walk] of walks){
  const actor=pawns.get(id)!,m=walk.motion,steps=m.kind==='teleport'?1:Math.max(1,m.steps),t=Math.min(steps,(time-walk.start)/180),step=Math.min(steps-1,Math.floor(t)),fraction=t-step
  const from=m.kind==='teleport'?m.from:(m.from+step)%count,to=m.kind==='teleport'?m.to:(m.from+step+1)%count
  const a=place(id,from),b=place(id,to);actor.group.position.copy(a).lerp(b,fraction)
  actor.group.position.y+=Math.sin(fraction*Math.PI)*(m.kind==='teleport'?.65:.07)
  actor.group.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);actor.legs.forEach((leg,j)=>leg.rotation.x=Math.sin(t*Math.PI*2+j*Math.PI)*.48)
  if(t>=steps){actor.group.position.copy(place(id,m.to));actor.legs.forEach(leg=>leg.rotation.x=0);walks.delete(id);walk.resolve()}
 }
 if(!reduced){const phase=time*.00018;drone.position.set(Math.sin(phase)*3.4,2.3+Math.sin(phase*3)*.1,Math.cos(phase)*1.65);drone.rotation.y=phase;rover.position.x=Math.sin(phase*.8)*2.2}
 controls.update()
 const rect=host.value?.getBoundingClientRect();if(rect)labels.value=mapTiles.map(tile=>{const v=position(tile.id);v.y=1.18;v.project(camera);return {x:(v.x*.5+.5)*rect.width,y:(-.5*v.y+.5)*rect.height,name:props.state.lab.level>=2?tile.name.replaceAll('导师','研究所领导'):tile.name}})
 renderer.render(scene,camera)
}
function fit(){
 if(!host.value||!ready)return
 const width=Math.max(1,host.value.clientWidth),height=Math.max(1,host.value.clientHeight)
 if(width===lastWidth&&height===lastHeight)return
 lastWidth=width;lastHeight=height
 const ratio=width/height,h=Math.max(13.5,19/ratio)
 camera.left=-h*ratio/2;camera.right=h*ratio/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();renderer.setSize(width,height,false)
}
const down={x:0,y:0}
function pointerDown(e:PointerEvent){down.x=e.clientX;down.y=e.clientY}
function select(e:PointerEvent){
 if(!ready||Math.hypot(e.clientX-down.x,e.clientY-down.y)>7)return
 const r=canvas.value!.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera)
 const hit=ray.intersectObjects(tiles,true)[0];let node:T.Object3D|null=hit?.object||null
 while(node&&node.userData.tile===undefined)node=node.parent
 if(node)emit('select',node.userData.tile)
}
function zoom(amount:number){if(!ready)return;camera.zoom=T.MathUtils.clamp(camera.zoom*amount,.7,2);camera.updateProjectionMatrix()}
onMounted(()=>{
 try{
  renderer=new T.WebGLRenderer({canvas:canvas.value,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(colors.grass);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15
  scene=new T.Scene();scene.add(new T.HemisphereLight(0xfff9e9,0x9ba78e,2));const sun=new T.DirectionalLight(0xfff3d5,2);sun.position.set(-3,10,6);scene.add(sun)
  camera=new T.OrthographicCamera(-10,10,7,-7,.1,100);camera.position.set(8,17,15);camera.lookAt(0,0,0)
  controls=new OrbitControls(camera,canvas.value);controls.target.set(0,0,0);controls.enablePan=false;controls.enableDamping=true;controls.minPolarAngle=.45;controls.maxPolarAngle=1.03;controls.minZoom=.7;controls.maxZoom=2;controls.minAzimuthAngle=-.65;controls.maxAzimuthAngle=.9
  box(scene,16,.18,12,0,-.12,0,colors.grass);box(scene,10,.025,5.2,0,-.01,0,0xe8dfc2)
  for(const tile of mapTiles){
   const group=new T.Group();group.userData.tile=tile.id;group.position.copy(position(tile.id));group.position.y=0
   box(group,1.29,.12,1.29,0,.03,0,tile.type==='project'?0xe5dac0:0xf0e7d0)
   const project='project'in tile?tile.project:null;const modelType=isCampus?tile.type:({rest:'rest',team:'coffee',gate:'start',competition:'equipment',air:'project',civil:'project'} as Record<string,string>)[tile.type]||'library';const modelId=isCampus?tile.id:tile.type==='civil'?3:tile.type==='air'?17:tile.type==='competition'?12:40+tile.id
   const model=makeTileAsset(modelType,modelId,isCampus&&project!==null?content.projects[project as number]?.domain:tile.type==='air'?'air':tile.type==='cross'?'cross':undefined);model.position.set(0,.1,-.1);model.scale.setScalar(.83);group.add(model)
   const flag=box(group,.25,.07,.12,.4,.17,.44,colors.orange);flag.visible=false;owners.push(flag);scene.add(group);tiles.push(group)
  }
  drone=makeDrone();scene.add(drone);rover=new T.Group();box(rover,.28,.17,.22,0,.2,2,colors.cream);for(const x of [-.17,.17])box(rover,.06,.09,.25,x,.11,2,colors.dark);box(rover,.17,.02,.09,0,.31,2,colors.blue);scene.add(rover)
  ready=true;sync();fit();resize=new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(fit)});resize.observe(host.value!);frame=requestAnimationFrame(draw)
 }catch{emit('unavailable')}
})
watch(()=>props.state.version,sync)
onBeforeUnmount(()=>{dead=true;ready=false;cancelAnimationFrame(frame);cancelAnimationFrame(resizeFrame);resize?.disconnect();controls?.dispose();for(const walk of walks.values())walk.resolve();walks.clear();if(scene)clearObject(scene);renderer?.dispose()})
defineExpose({playMove})
</script>
<template>
 <div ref="host" class="scene-host"><canvas ref="canvas" aria-label="可以拖动旋转的三维科研园区，格子详情可在下方地点选择器查看" @pointerdown="pointerDown" @pointerup="select"/>
  <div class="scene-title"><span class="eyebrow">BUJI UNIVERSITY · 3D CAMPUS</span><strong>{{ content.world.regions.find(r=>r.id===region)?.name }}</strong><small>{{ content.lab[state.lab.level-1]?.name }} · Lv.{{ state.lab.level }}</small></div>
  <div class="scene-labels" aria-hidden="true"><span v-for="(label,i) in labels" :key="i" :style="{left:label.x+'px',top:label.y+'px'}"><b>{{ String(i+1).padStart(2,'0') }}</b><small>{{ label.name }}</small></span></div>
  <div class="scene-toolbar"><span>拖动转一转 · 点建筑看详情</span><button type="button" aria-label="缩小地图" @click="zoom(.85)">−</button><button type="button" aria-label="放大地图" @click="zoom(1.18)">+</button></div>
 </div>
</template>
