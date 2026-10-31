'use strict';
const jointProjects=[
 {id:'city-emergency',level:5,name:'城市空地应急联合科研',funds:36000,civil:'城市生命线结构评估与应急数字底图',air:'低空应急航线与通信调度验证',hours:14,cost:1800},
 {id:'bridge-twin',name:'无人机桥梁巡检联合示范',funds:2400,civil:'结构病害底图与点云模型',air:'安全航线、通信验证与飞行日志',hours:6,cost:120},
 {id:'underground',name:'地下空间空地协同巡检',funds:3200,civil:'隧道机器人地图与障碍记录',air:'空地接力链路与起降策略',hours:8,cost:180},
 {id:'city-observe',name:'未来城市低空数字孪生',funds:4200,civil:'基础设施数字底座',air:'城市低空交通与监测航线',hours:10,cost:240}
];
const decor=[
 {id:'plant',name:'窗边小植物',price:80,kind:'plant'},
 {id:'lamp',name:'不催稿台灯',price:120,kind:'lamp'},
 {id:'coffee',name:'奶茶与咖啡角',price:300,kind:'coffee'},
 {id:'sofa',name:'讨论与放空沙发',price:600,kind:'sofa'},
 {id:'blue-desk',name:'晴空蓝工位',price:240,kind:'desk'},
 {id:'pink-desk',name:'落日粉工位',price:240,kind:'desk'},
 {id:'display',name:'成果与奖杯展柜',price:800,kind:'display'}
];
const gifts=[{id:'tea',name:'请你喝奶茶',cost:20,mood:8},{id:'plant',name:'送一盆桌边小植物',cost:80,mood:6,decor:'plant'},{id:'postcard',name:'留一张校园明信片',cost:10,mood:4}];
const faculty=[{id:'writer',name:'温知序',rank:'青年教师',specialty:'论文表达与多源数据',kind:'paper',cost:3000,rate:8},{id:'inventor',name:'程见山',rank:'副教授',specialty:'机器人装备与技术转化',kind:'patent',cost:6000,rate:12},{id:'field',name:'陆亦航',rank:'教授',specialty:'空地协同与工程验证',kind:'contract',cost:10000,rate:20}];
const routes=[{id:'opensource',name:'开源研究工具',cost:200,hours:6,description:'增加声望，并吸引同行合作与本科生报名。'},{id:'license',name:'企业许可授权',cost:500,hours:12,rate:18,description:'获得许可首款，之后每小时 18 经费，离线待领最多 600。'},{id:'demo',name:'建设校园示范点',cost:1000,hours:18,description:'形成可见的示范成果，增加共同实验室建设经费与学术声望。'}];
const careers=[{id:'enterprise',name:'进入企业研发',description:'未来可能带来真实需要交付的企业项目。'},{id:'study',name:'继续读博或访学',description:'未来可能引荐本科生、分享研究笔记。'},{id:'campus',name:'留校科研',description:'未来可以回流应聘教师，并带来自己的学生。'},{id:'startup',name:'尝试技术创业',description:'未来可能寻找专利许可和联合示范机会。'}];
const stories=[
 {title:'青年论坛的一封邀请',sender:'周予宁 · 城市联合研究论坛',body:'我们正在组织一场小型青年论坛，想请您带一份近期工作来交流。可作十分钟报告，也可以先分享一页研究资料。',options:[{id:'attend',text:'带着学生和材料去交流 · 30 经费',cost:30,rep:3,memory:'attended'},{id:'share',text:'分享研究资料，留个联系方式',cost:0,rep:1,memory:'shared'},{id:'later',text:'这次先婉拒，保持联系',cost:0,mood:3,memory:'declined'}]},
 {title:'工程师把问题带来了',sender:'许见微 · 临江工程研发',body:'上次交流后，我们发现现场数据还有些卡点。想请您看看，也欢迎低空方向的同事一起来。',options:[{id:'help',text:'花点时间整理一份建议 · 20 经费',cost:20,progress:10,memory:'helped'},{id:'together',text:'把问题分享给搭子，约一次跨方向交流',cost:0,progress:5,partnerProgress:5,memory:'connected'},{id:'boundary',text:'说明目前的研究边界，推荐其他团队',cost:0,rep:2,memory:'honest'}]},
 {title:'试验场里遇到的小麻烦',sender:'许见微 · 现场验证组',body:'新样本和上次的条件不太一样。我们保留了原始记录，希望先把差异说明白，再讨论下一步。',options:[{id:'verify',text:'安排独立验证 · 80 经费',cost:80,progress:15,rep:3,memory:'verified'},{id:'scope',text:'澄清适用范围，保留异常记录',cost:0,progress:7,rep:2,memory:'scoped'},{id:'ask',text:'请搭子帮忙核对空地协同条件',cost:20,progress:8,partnerProgress:8,memory:'joint'}]},
 {title:'一份正式合作意向',sender:'许见微 · 临江工程研发',body:'前几次交流让我们了解了团队的工作方式。这里有一份试点需求，希望能形成一个有边界、有交付的合作。',options:[{id:'contract',text:'看看需求，生成一份企业合作邀请',cost:0,memory:'contract'},{id:'open',text:'先公开一份方法说明，再谈合作',cost:30,rep:6,memory:'open'},{id:'defer',text:'手头还有工作，先把资料存好',cost:0,mood:4,memory:'deferred'}]},
 {title:'这个小试点，有了一个名字',sender:'周予宁 · 联合研究论坛',body:'我们想把这段从交流到验证的经历整理成园区展板。请您选一个最值得留下的重点，给后来者一点启发。',options:[{id:'people',text:'写下学生和合作伙伴的名字',cost:0,rep:5,memory:'people'},{id:'method',text:'展示方法边界和复现记录',cost:0,progress:15,rep:3,memory:'method'},{id:'city',text:'把试点留成一个小型城市示范',cost:100,rep:8,memory:'city'}]}
];
module.exports={jointProjects,decor,gifts,faculty,routes,careers,stories};
