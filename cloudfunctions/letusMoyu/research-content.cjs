'use strict';
const choice=(text,delta)=>({text,delta});
const mailTemplates=[
 {id:'welcome',sender:'园区信使',address:'post@buji.example',subject:'你的课题组邮箱，今天开始营业',body:'合作、好消息和偶尔的离谱会务广告，会慢慢来到这里。不必急着回，忙完科研再看也可以。',choices:[choice('给信使回一个收到 · 心情 +5',{m:5}),choice('和搭子分享新邮箱 · 双方心情 +3',{m:3,other:{m:3}})]},
 {id:'bridge',sender:'周工 · 城市试验场',address:'bridge@city-lab.example',subject:'桥梁巡检能不能来一次空地联动？',body:'我们有桥梁监测数据，你们有空中与地面采集能力。把坐标系先说清楚，应该能做点有趣的合作。',choices:[choice('交换样例数据 · 双方进度 +8',{p:8,other:{p:8}}),choice('接一次短期测试 · 经费 +60，进度 +4',{f:60,p:4}),choice('本周先歇歇 · 心情 +5',{m:5})]},
 {id:'paper-reader',sender:'小许 · 联合研究中心',address:'reader@joint-lab.example',subject:'读了你们的文章，想聊聊三维重建',body:'文章里那个数据处理思路很有意思。我们手头刚好有一组低空遥感和城市结构数据，想约一次很短的线上交流。',minPapers:1,choices:[choice('共享处理流程 · 双方进度 +10',{p:10,other:{p:10}}),choice('做个十分钟报告 · 声望 +2，专利灵感 +5',{r:2,idea:5}),choice('礼貌约到下次 · 心情 +4',{m:4})]},
 {id:'special-issue',sender:'三天见刊编辑部',address:'too-fast@not-a-journal.example',subject:'尊敬的杰出学者：三天接收，保证不问实验',body:'这封邮件把你的姓名写错了三次，期刊名里还有一个多余的感叹号。它看起来比你的实验结果更不靠谱。',choices:[choice('扔进虚构垃圾桶 · 心情 +5',{m:5}),choice('当作识别案例分享 · 双方声望 +1',{r:1,other:{r:1}})]},
 {id:'invoice',sender:'报销服务窗口',address:'finance@buji.example',subject:'你的附件终于全部齐了',body:'三张发票、两份截图和一个找不到的审批人，终于在同一个文件夹相遇了。',choices:[choice('按清单提交 · 经费 +70',{f:70}),choice('顺手帮搭子整理 · 自己 +30 经费，搭子 +6 进度',{f:30,other:{p:6}})]},
 {id:'student',sender:'小林 · 意向学生',address:'student@admissions.example',subject:'老师，我想做一点机器人或无人机的研究',body:'我对实验感兴趣，也愿意从整理数据做起。听说你们的组会不会开到凌晨，想了解一下课题组。',choices:[choice('认真介绍方向 · 心情 +4，进度 +5',{m:4,p:5}),choice('推荐搭子的交叉课题 · 双方进度 +5',{p:5,other:{p:5}}),choice('告诉 TA 先看看招生册 · 声望 +1',{r:1})]},
 {id:'equipment',sender:'仪器共享平台',address:'equipment@buji.example',subject:'有一张设备报销券，别忘在打印机旁边',body:'经过核对，这次真的是报销券，不是上次那张过期的食堂优惠券。去仪器共享站时可以用上。',choices:[choice('收下报销券 · 获得一张设备报销卡',{card:11}),choice('先留给更需要的人 · 双方心情 +5',{m:5,other:{m:5}})]},
 {id:'maintenance',sender:'服务器管理员',address:'gpu@buji.example',subject:'今晚维护，GPU 也想下班',body:'模型训练暂时排不开，不过已有的数据还可以整理。管理员友情提醒：关网页不会关掉你的科研项目。',choices:[choice('改做数据整理 · 进度 +10',{p:10}),choice('把空闲时段留给搭子 · 双方进度 +6',{p:6,other:{p:6}})]},
 {id:'mentor-photo',sender:'导师办公室',address:'advisor@buji.example',subject:'帮我找一下那张……就是那张图',body:'没有文件名，没有日期，只有一句“你知道是哪张”。这次的任务可能需要一点文件整理能力。',choices:[choice('整理文件并发图 · 好感 +5，进度 +6',{t:5,p:6}),choice('先问清具体版本 · 进度 +5，心情 +3',{p:5,m:3})]},
 {id:'review',sender:'认真但不着急的编辑',address:'review@fictional-journal.example',subject:'想邀请你看看一篇交叉研究',body:'这次的审稿邀请写明了研究范围，也明确可以拒绝。你可以学一点新方法，也可以先照顾自己的节奏。',minRep:5,choices:[choice('读方法并写建议 · 声望 +2，进度 +5',{r:2,p:5}),choice('礼貌谢绝 · 心情 +6',{m:6})]},
 {id:'patent-transfer',sender:'技术转化小站',address:'ip@buji.example',subject:'有人对你的已授权技术感兴趣',body:'对方想把你们的技术方案用在小型示范场景里。先做一次演示合作，合同里的逗号以后再认真核对。',minPatents:1,choices:[choice('做一次技术演示 · 经费 +120',{f:120}),choice('和搭子共同验证 · 双方经费 +60',{f:60,other:{f:60}}),choice('继续优化方案 · 专利灵感 +12',{idea:12})]},
 {id:'air-logistics',sender:'低空物流测试站',address:'air@city-lab.example',subject:'今天送的是传感器，奶茶只是顺路',body:'一条新航线把实验场和桥梁试验区连了起来。想借你们的采集与通信经验，验证一下路线。',choices:[choice('安排联合试验 · 进度 +8，专利灵感 +5',{p:8,idea:5}),choice('交换测试数据 · 双方进度 +7',{p:7,other:{p:7}})]},
 {id:'tunnel',sender:'隧道试验基地',address:'tunnel@city-lab.example',subject:'点云配准这次真的对上了',body:'隧道、机器人与低空采集的坐标，现在终于愿意坐到同一张桌子上。基地想把这套流程整理成技术说明。',choices:[choice('整理技术交底 · 专利灵感 +12',{idea:12}),choice('共同补一个实验 · 双方进度 +8',{p:8,other:{p:8}})]},
 {id:'conference-spam',sender:'万能学术会务中心',address:'all-topics@conference.example',subject:'土木、低空、甜品与宇宙起源联合大会',body:'会议方向覆盖了一切，唯独没有写清会场。你怀疑这更像一封群发广告，而不是跨学科奇迹。',choices:[choice('不必参加 · 心情 +6',{m:6}),choice('把题目改成组会笑话 · 双方心情 +5',{m:5,other:{m:5}})]},
 {id:'students-care',sender:'研究生生活服务站',address:'care@buji.example',subject:'组会可以短一点，问候可以多一点',body:'这周有个小建议：与学生聊一聊最近顺不顺利。研究进度值得关心，他们的休息和心情也一样。',choices:[choice('给自己和学生安排休息 · 心情 +6，学生心情 +8',{m:6,studentMood:8}),choice('分享一次小困难 · 双方心情 +5',{m:5,other:{m:5}})]},
 {id:'open-data',sender:'城市开放数据台',address:'data@city-lab.example',subject:'一份坐标说明齐全的开放数据',body:'无人机航线、桥梁监测和地下空间模型都标好了说明。这么完整的数据，值得先备份再感动。',choices:[choice('整理成论文素材 · 进度 +12',{p:12}),choice('留给联合课题 · 双方进度 +7，声望 +1',{p:7,r:1,other:{p:7}})]}
];
const benefits=[
 {level:1,text:'两张科研桌；每学年 2 硕 + 1 博；最多培养 4 人'},
 {level:2,text:'项目经费 +5%；升级时双方各得 80 经费'},
 {level:3,text:'主要科研进度 +1；每学年硕士名额增加 1'},
 {level:4,text:'交叉项目再 +5%；博士名额增加 1；培养上限 5；专利审查缩至 1 小时'},
 {level:5,text:'培养上限 6；学生研究反馈额外进度 +1；未来城市落成纪念'}
];
module.exports={mailTemplates,benefits,yearDays:7,studyHours:6,mailIntervalMinutes:[75,105]};
