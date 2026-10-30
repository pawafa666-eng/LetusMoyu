import * as T from 'three'
export const colors={grass:0xe5e7de,path:0xf1e7d0,cream:0xf2e3bd,green:0x829ca5,blue:0x7dabb9,orange:0xc98361,dark:0x586974,glass:0x91c6cf}
export function box(parent:T.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,color:number){
 const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshLambertMaterial({color}));mesh.position.set(x,y,z);parent.add(mesh);return mesh
}
function cylinder(parent:T.Object3D,top:number,bottom:number,h:number,x:number,y:number,z:number,color:number,sides=8){
 const mesh=new T.Mesh(new T.CylinderGeometry(top,bottom,h,sides),new T.MeshLambertMaterial({color}));mesh.position.set(x,y,z);parent.add(mesh);return mesh
}
function sphere(parent:T.Object3D,r:number,x:number,y:number,z:number,color:number){
 const mesh=new T.Mesh(new T.SphereGeometry(r,8,6),new T.MeshLambertMaterial({color}));mesh.position.set(x,y,z);parent.add(mesh);return mesh
}
export function tree(scale=1){
 const g=new T.Group();cylinder(g,.055,.075,.4,0,.2,0,0x9a8664,5);cylinder(g,0,.28,.55,0,.58,0,0x83a17b,6);cylinder(g,0,.21,.43,0,.85,0,0x91ad83,6);g.scale.setScalar(scale);return g
}
function building(color:number,height=.6){
 const g=new T.Group();box(g,.75,height,.65,0,height/2,0,colors.cream);
 const roof=cylinder(g,0,.65,.3,0,height+.12,0,color,4);roof.rotation.y=Math.PI/4;
 for(const x of [-.23,.18])box(g,.17,.19,.016,x,height*.58,.333,colors.glass);
 box(g,.14,.3,.025,0,.15,.335,0xa18463);box(g,.025,height*.82,.18,.383,height*.48,.12,colors.glass);return g
}
function bridge(){
 const g=new T.Group();box(g,1,.09,.4,0,.47,0,0xcab28b);
 for(const x of [-.34,.34]){box(g,.13,.42,.35,x,.22,0,0xaab7a3);box(g,.055,.35,.055,x,.67,-.22,colors.cream);box(g,.055,.35,.055,x,.67,.22,colors.cream)}
 box(g,1,.05,.04,0,.8,-.22,colors.cream);box(g,1,.05,.04,0,.8,.22,colors.cream);box(g,1.1,.025,.7,0,.015,0,0x9cc7c5);return g
}
function tunnel(){
 const g=new T.Group();box(g,1.05,.1,.8,0,.04,0,0x9ba38b);box(g,.94,.54,.4,0,.3,-.16,0xa9ad94);
 const arch=new T.Mesh(new T.TorusGeometry(.31,.13,5,14,Math.PI),new T.MeshLambertMaterial({color:0xc4c5a9}));arch.position.set(0,.13,.17);g.add(arch);
 box(g,.61,.31,.025,0,.16,.155,0x526b60);box(g,.35,.02,.75,0,.11,.22,0xc8c4a7);return g
}
function tower(){
 const g=new T.Group();box(g,.5,.15,.5,0,.075,0,0xc8cdb3);cylinder(g,.055,.12,1.18,0,.72,0,0x8ba49b,6);
 for(const h of [.66,.9,1.13])box(g,.38,.035,.08,0,h,0,colors.cream);
 sphere(g,.09,0,1.37,0,colors.orange);box(g,.12,.27,.04,.17,1.03,0,colors.blue);return g
}
function airport(){
 const g=new T.Group();cylinder(g,.52,.55,.08,0,.05,0,0x9db8aa,12);
 box(g,.3,.025,.06,0,.1,0,0xf6f1d9);box(g,.06,.025,.32,-.13,.1,0,0xf6f1d9);box(g,.06,.025,.32,.13,.1,0,0xf6f1d9);
 const drone=makeDrone();drone.scale.setScalar(.8);drone.position.y=.28;g.add(drone);return g
}
function servers(){
 const g=new T.Group();for(const x of [-.24,.23]){box(g,.32,.82,.42,x,.42,0,0x6d8d84);for(let i=0;i<4;i++){box(g,.26,.1,.025,x,.18+i*.17,.22,0xabc3b0);sphere(g,.018,x+.08,.18+i*.17,.245,0xd9c789)}}return g
}
function robot(){
 const g=new T.Group();box(g,.65,.12,.55,0,.06,0,0xb8bba0);cylinder(g,.16,.21,.22,0,.22,0,colors.orange);
 const arm=box(g,.11,.55,.12,-.1,.55,0,0xe2b76c);arm.rotation.z=-.4;const tip=box(g,.38,.1,.12,.13,.81,0,colors.orange);tip.rotation.z=.4;
 box(g,.13,.18,.12,.34,.76,0,colors.dark);return g
}
export function makeDrone(){
 const g=new T.Group();box(g,.24,.09,.19,0,0,0,colors.blue);
 for(const x of [-1,1])for(const z of [-1,1]){
  const arm=box(g,.37,.035,.04,x*.14,0,z*.13,colors.dark);arm.rotation.y=x*z*Math.PI/4;
  const rotor=cylinder(g,.135,.135,.018,x*.29,.04,z*.27,0xb3c6b7,10);rotor.userData.rotor=true;
  cylinder(g,.035,.035,.06,x*.29,0,z*.27,colors.dark,6);
 }
 sphere(g,.025,0,-.065,.1,colors.orange);return g
}
export function makeTileAsset(type:string,id:number,domain?:string){
 let g:T.Group
 if(id===3)g=tunnel()
 else if(id===15)g=bridge()
 else if(type==='equipment'||id===22)g=tower()
 else if(id===17||id===8)g=airport()
 else if(id===16)g=servers()
 else if(id===12||id===23)g=robot()
 else if(type==='rest'||id===9||id===27){g=new T.Group();g.add(tree(.9));box(g,.55,.12,.18,.3,.12,.32,0xc4a477);box(g,.55,.2,.06,.3,.27,.4,0xc4a477)}
 else if(type==='start'){g=new T.Group();box(g,.9,.12,.13,0,.65,0,colors.green);for(const x of [-.35,.35])box(g,.14,.65,.16,x,.33,0,colors.cream);box(g,.6,.16,.13,0,.8,0,colors.cream)}
 else if(type==='coffee'||id===7){g=building(colors.orange,.35);for(let i=0;i<5;i++)box(g,.15,.04,.3,-.3+i*.15,.43,.42,i%2?colors.cream:colors.orange)}
 else g=building(domain==='air'?colors.blue:domain==='cross'?0x8fa99e:colors.green,type==='library'?.8:.58)
 return g
}
export interface Scholar {group:T.Group;legs:T.Group[]}
export function makeScholar(domain:string):Scholar{
 const group=new T.Group(),shirt=domain==='civil'?colors.orange:colors.blue
 cylinder(group,.12,.16,.24,0,.28,0,shirt,6);sphere(group,.125,0,.49,0,0xefcd9d)
 const hat=cylinder(group,.13,.15,.06,0,.6,0,domain==='civil'?0xd9b55e:colors.blue,8)
 if(domain==='air')box(group,.23,.025,.13,0,.6,.12,colors.blue)
 else{hat.scale.y=1.5;box(group,.04,.035,.25,0,.65,0,0xe9c577)}
 const legs:T.Group[]=[]
 for(const x of [-.075,.075]){const leg=new T.Group();leg.position.set(x,.17,0);box(leg,.08,.16,.09,0,-.08,0,colors.dark);box(leg,.09,.045,.14,0,-.16,.025,0x506253);group.add(leg);legs.push(leg)}
 for(const x of [-.18,.18]){const arm=box(group,.065,.22,.075,x,.28,0,shirt);arm.rotation.z=x>0?-.18:.18}
 box(group,.17,.2,.07,0,.3,-.15,0xb4a283);return {group,legs}
}
export function makeCenter(level:number){
 const g=new T.Group();const main=building(colors.green,.85);main.scale.setScalar(2);g.add(main);
 const wing=building(colors.blue,.65);wing.scale.setScalar(1.6);wing.position.set(1.7,0,-.8);g.add(wing);
 box(g,1.7,.12,.5,.8,.5,-.5,0xd8c9a7);
 for(const [x,z] of [[-2,1.2],[-1.7,-1.3],[2,1.3]]){const t=tree(1.1);t.position.set(x,0,z);g.add(t)}
 if(level>=2){const r=robot();r.position.set(-1.7,0,.4);g.add(r)}
 if(level>=3){box(g,1.2,.35,.8,0,.17,1.5,colors.glass);for(let i=0;i<3;i++)box(g,.18,.2+i*.1,.18,-.3+i*.3,.45,1.5,colors.cream)}
 if(level>=4){const pad=airport();pad.position.set(1.7,1.3,-.8);g.add(pad)}
 if(level>=5){const t=tower();t.position.set(-1.3,1.3,0);g.add(t)}
 return g
}
export function tilePosition(i:number){
 const col=i<10?i:i<15?9:i<25?24-i:0
 const row=i<10?0:i<15?i-9:i<25?6:30-i
 return new T.Vector3((col-4.5)*1.4,.1,(row-3)*1.4)
}
