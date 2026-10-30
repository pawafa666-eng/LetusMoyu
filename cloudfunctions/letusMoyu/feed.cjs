'use strict';
const {randomUUID}=require('node:crypto');
function inferActors(s,text){
 for(const p of Object.values(s.players)){const aliases=[p.name,p.profile?.name,...(p.discipline==='civil'?['fafa','点云博士']:['Yizi','yiyi','起飞博士'])].filter(Boolean);if(aliases.some(n=>text.startsWith(n+' ')||text.startsWith(n+'：')||text.startsWith(n+' 的')))return[p.id];}
 for(const p of Object.values(s.players))if(p.students?.some(st=>text.startsWith(st.name+' ')||text.startsWith(st.name+' 的')))return[p.id];
 return[];
}
function push(s,text,at,kind='research',actors){s.feed.unshift({id:randomUUID(),text,at,kind,actorIds:actors===undefined?inferActors(s,text):Array.isArray(actors)?actors:[actors]});s.feed=s.feed.slice(0,160);}
function migrate(s){for(const item of s.feed)if(!Array.isArray(item.actorIds))item.actorIds=inferActors(s,item.text);}
module.exports={push,migrate,inferActors};
