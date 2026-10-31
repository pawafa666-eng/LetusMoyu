'use strict';
const regions=[
 {id:'campus',name:'不急大学校园',short:'校园',level:1,description:'熟悉的科研起点，也有新的同伴慢慢加入。'},
 {id:'enterprise',name:'企业合作园',short:'企业合作园',level:2,description:'让点云、机器人和无人机离开 PPT，去生产现场看看。'},
 {id:'community',name:'创客生活区',short:'创客生活区',level:2,description:'带本科生做点有趣的事，也和同学一起放松一下。'}
];
const locations={
 enterprise:[['园区接待站','gate'],['产学研合作大厅','company'],['桥隧智造公司','civil'],['云际低空物流','air'],['空地协同研发车间','cross'],['技术转移中心','transfer'],['客户方案会议室','meeting'],['无人机演示场','air'],['项目比选中心','company'],['城市验证试验场','cross'],['行业交流茶室','social'],['企业食堂','rest']].map(([name,type],id)=>({id,name,type})),
 community:[['学生发展中心','undergrad'],['本科生创新工坊','competition'],['赛题发布台','competition'],['低空挑战场','air'],['桥隧创客赛场','civil'],['答辩交流中心','meeting'],['团建草坪','team'],['桌游咖啡','team'],['湖畔野餐点','team'],['成果海报展','poster'],['校友交流角','social'],['城市运动场','rest']].map(([name,type],id)=>({id,name,type}))
};
const companies=[{name:'临江桥隧智造',domain:'civil',topic:'桥隧多源巡检验证'},{name:'云际低空物流',domain:'air',topic:'园区无人机物流航线验证'},{name:'见微城市科技',domain:'cross',topic:'空地一体数字孪生试点'},{name:'方圆机器人',domain:'civil',topic:'地下空间机器人巡检联调'},{name:'星港空域服务',domain:'air',topic:'低空基础设施通信评估'}];
const teams=[{id:'picnic',name:'湖畔野餐',base:60,perStudent:25,hours:1.5,mood:15,rep:1},{id:'boardgames',name:'桌游与奶茶',base:50,perStudent:20,hours:1,mood:12,rep:1},{id:'fieldtrip',name:'城市观察团建',base:100,perStudent:35,hours:2,mood:18,rep:3}];
const contests=[{id:'bridge',name:'桥隧智能建造创客赛',domain:'civil',cost:180,hours:6,prize:900},{id:'uav',name:'低空物流创新挑战赛',domain:'air',cost:220,hours:6,prize:1100},{id:'city',name:'未来城市空地协同竞赛',domain:'cross',cost:300,hours:8,prize:1500}];
module.exports={regions,locations,companies,teams,contests};
