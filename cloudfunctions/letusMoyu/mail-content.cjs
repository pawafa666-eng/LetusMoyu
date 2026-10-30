'use strict';
const option=(text,delta,result,extra={})=>({text,delta,result,...extra});
const mail=(id,sender,address,subject,body,choices,extra={})=>({id,sender,address,subject,body,choices,...extra});
const templates=[
 mail('welcome','园区邮政服务','post@buji.example','课题组邮箱开通通知','老师您好：\n\n您的不急大学课题组邮箱已开通，可接收园区通知、学术邀请，也可给通讯录中的同事和服务部门发信。\n\n如需咨询，请直接回复本邮件。\n\n不急大学园区邮政服务',[
  option('回复：收到，谢谢',{m:5},'邮箱开通确认已送达。'),option('和搭子分享新邮箱',{m:3,other:{m:3}},'你们互相保存了邮箱地址。')]),
 mail('bridge','周工 · 城市试验场','bridge@city-lab.example','桥梁巡检联合测试邀请','老师您好：\n\n我们正在筹备桥梁巡检试验，拟结合地面点云、无人机影像与结构传感数据开展空地联合采集。贵组如有兴趣，可交换样例数据或承接一次短期测试。\n\n期待您的回复。\n周工',[
  option('交换样例数据',{p:8,other:{p:8}},'样例数据与坐标说明已交换，双方都获得了可用的研究素材。'),option('承接短期测试',{f:60,p:4},'试验场支付了短期测试服务费，并反馈了一组验证数据。'),option('本周暂不参加',{m:5},'对方表示理解，合作机会保留。')]),
 mail('paper-reader','许老师 · 联合研究中心','reader@joint-lab.example','关于贵组已发表研究的合作咨询','老师您好：\n\n拜读了贵组关于三维重建与城市感知的文章。我们现有一组低空遥感及城市结构数据，希望交流处理方法，探讨联合实验的可能。方便的话，可安排一次线上讨论。\n\n祝好！\n许老师',[
  option('共享处理流程',{p:10,other:{p:10}},'你们完成了一次方法交流，并整理出新的合作实验。'),option('做一个简短报告',{r:2,idea:5},'报告收到积极反馈，听众提出了一个可转为技术交底的新想法。'),option('约到下次交流',{m:4},'交流顺延，没有额外任务。')],{minPapers:1}),
 mail('special-issue','快速成果交流编辑部','editor@fast-results.example','专题征稿邀请：快速通道开放','尊敬的老师：\n\n本刊“未来城市与交叉创新”专题即日起接收稿件。快速通道可优先排期，资料处理费为 20 元气经费。请回复是否参加。\n\n成果交流编辑部',[
  {text:'提交资料并参加',cost:20,outcomes:[
   {weight:.55,delta:{f:-20,m:-12},result:'处理费支付后，对方只发来一张排版很华丽的电子证书。并没有正式审稿，这次遇到了不靠谱的征稿。',kind:'tricked'},
   {weight:.45,delta:{f:-20,p:20,r:1},result:'专题交流中，一位认真研究同领域问题的编辑提出了有用的实验建议。你把建议整理成了研究素材。',kind:'research'}]},
  option('婉拒本次征稿',{m:4},'编辑部收到了谢绝回复，本次没有支出。')]),
 mail('invoice','不急大学财务处','finance@buji.example','实验测试费用报销审核通过','老师您好：\n\n贵组提交的实验测试费用已审核通过。本次可报销 70 元气经费，请确认领取方式。若需后续报销，请在通讯录中给财务处发信并说明用途。\n\n财务处',[
  option('确认领取报销款',{f:70},'报销款已到账。'),option('领取部分并协助搭子整理材料',{f:30,other:{p:6}},'部分报销款到账，你也帮搭子理清了实验材料。')]),
 mail('student','小林 · 不急大学学生','student@buji.example','咨询贵组研究方向与招生安排','老师您好：\n\n我对机器人、无人机和城市感知研究很感兴趣，希望了解贵组的培养方向、课题安排和招生计划。我愿意从文献阅读和数据整理做起。\n\n谢谢老师！\n小林',[
  option('介绍本组研究方向',{m:4,p:5},'交流让研究计划更清晰，也帮助你梳理了现有课题。'),option('介绍双方的交叉研究',{p:5,other:{p:5}},'学生收到了两位导师的方向介绍。'),option('请对方查看招生小册',{r:1},'招生资料已发出，后续可在小课题组页面正式招收学生。')]),
 mail('equipment','仪器共享平台','equipment@buji.example','设备共享报销券领取通知','老师您好：\n\n贵组本期有一张设备共享报销券可领取。领取后可在仪器共享站选购设备时使用。如暂时不需要，可转入园区共享支持计划。\n\n仪器共享平台',[
  option('领取报销券',{card:11},'设备报销卡已放入科研背包；卡牌已满时转为经费。'),option('转入共享支持计划',{m:5,other:{m:5}},'你们都收到了园区的感谢通知。')]),
 mail('maintenance','服务器管理中心','gpu@buji.example','服务器维护与替代研究安排','各课题组老师：\n\n本周服务器将进行例行维护。建议提前备份训练配置，并在维护期间安排数据整理或方法讨论。需要协调时段可直接回信。\n\n服务器管理中心',[
  option('安排数据整理',{p:10},'你完成了部分数据清理，训练任务无需重复准备。'),option('和搭子协调空闲时段',{p:6,other:{p:6}},'双方排好了研究任务，减少了等待。')]),
 mail('mentor-photo','导师办公室','advisor@buji.example','请提供上次组会使用的结果图','同学你好：\n\n请把上次组会汇报中展示的结果图发我一份，附上原始文件和数据版本说明。若有多个版本，请先列出目录。\n\n导师办公室',[
  option('整理原始文件并发送',{t:5,p:6},'原图和版本说明已整理好，导师确认收到了正确版本。'),option('先确认图号和版本',{p:5,m:3},'需求确认后，后续整理更顺利。')]),
 mail('review','《空地协同研究通讯》编辑部','review@journal.example','交叉研究审稿邀请','老师您好：\n\n现有一篇城市感知与空地协同方向稿件拟送外审，诚邀您评阅。若不便接受，请直接谢绝；我们会另邀审稿人。\n\n编辑部',[
  option('接受邀请并阅读方法',{r:2,p:5},'你完成了一份建设性意见，也学到了新的研究方法。'),option('谢绝本次邀请',{m:6},'编辑部已另邀审稿人，本次没有新增任务。')],{minRep:5}),
 mail('patent-transfer','不急大学技术转化中心','ip@buji.example','已授权技术的示范应用咨询','老师您好：\n\n有合作单位希望将贵组已授权技术应用于一个小型示范场景。可先安排技术演示，或联合另一个课题组开展验证。\n\n技术转化中心',[
  option('安排技术演示',{f:120},'演示服务费已到账，合作单位收到了技术说明。'),option('和搭子联合验证',{f:60,other:{f:60}},'联合验证完成，双方分别获得技术服务费。'),option('先完善技术方案',{idea:12},'修改建议已整理为下一份技术交底素材。')],{minPatents:1}),
 mail('air-logistics','低空物流测试站','air@city-lab.example','低空物流航线联合验证邀请','老师您好：\n\n测试站拟验证一条连接实验场与桥梁试验区的低空物流航线，希望借助贵组的采集与通信经验开展联合试验。请告知是否有兴趣参加。\n\n低空物流测试站',[
  option('安排联合试验',{p:8,idea:5},'航线验证形成了一组实验结果和技术交底素材。'),option('交换已有测试数据',{p:7,other:{p:7}},'双方已收到带说明的测试数据。')]),
 mail('tunnel','隧道试验基地','tunnel@city-lab.example','多源采集流程技术说明编写邀请','老师您好：\n\n本次隧道与机器人采集数据已完成配准。基地计划整理一份流程技术说明，邀请贵组补充实施细节或联合开展一次验证实验。\n\n隧道试验基地',[
  option('整理技术交底',{idea:12},'实施流程已转为专利灵感。'),option('和搭子补充验证实验',{p:8,other:{p:8}},'联合验证结果已归档。')]),
 mail('conference-spam','国际交叉创新大会组委会','meetings@cross-research.example','邀请参加交叉创新学术交流会','尊敬的老师：\n\n现诚邀贵组参加“土木、低空与城市创新交叉学术交流会”。会议设研究报告、技术交流及青年学者讨论环节。报名费为 10 元气经费，可由老师本人或一名组内学生参加。\n\n请回复是否参会。\n大会组委会',[
  {text:'报名参加会议',cost:10,outcomes:[
   {weight:.5,delta:{f:-10,m:-15},result:'到了现场才发现，议程上的研究报告都变成了产品推介。报名费不退，也没遇到对口的学者——这次上当了。',kind:'tricked',activity:'conference'},
   {weight:.5,delta:{f:-10,p:28,r:2,m:6},result:'茶歇时与一位资深学者深入交流，对方指出了一个关键方法问题。整理交流笔记后，研究明显推进了一步。',kind:'research',activity:'conference'}]},
  option('不参加本次会议',{},'已婉拒邀请，没有支出。')],{delegate:true,activity:'conference'}),
 mail('students-care','研究生培养办公室','care@buji.example','课题组交流安排建议','各位老师：\n\n建议本周与组内同学交流近期研究计划、困难和休息安排。若需要调整任务，可在学生详情中更新培养规划。\n\n研究生培养办公室',[
  option('安排一次近况交流',{m:6,studentMood:8},'交流已安排，老师和学生都放松了一些。'),option('和搭子讨论培养经验',{m:5,other:{m:5}},'你们交换了一些有用的培养经验。')]),
 mail('open-data','城市开放数据台','data@city-lab.example','开放数据资料交付通知','老师您好：\n\n附件资料包括无人机航线、桥梁监测与地下空间模型的样例说明，坐标和采集条件已注明。请确认接收，并告知是否用于联合课题。\n\n城市开放数据台',[
  option('整理为论文素材',{p:12},'数据说明已核对并归入论文素材。'),option('用于双方联合研究',{p:7,r:1,other:{p:7}},'双方开始整理联合研究的数据基础。')]),
 mail('visiting','云杉理工大学国际合作处','visiting@spruce.example','青年研究人员短期访学邀请','老师您好：\n\n云杉理工大学城市智能系统研究室拟邀请贵组一名学生开展短期访学，主题为城市基础设施与低空协同感知。园区提供压缩时间的访学模拟，支持费为 120 元气经费。\n\n请回复是否安排学生参加。\n国际合作处',[
  option('安排学生访学',{f:-120},'访学计划已经安排，学生将在 12 小时后完成交流并记录到个人履历。',{cost:120,assignVisit:true}),option('暂不安排',{},'已保留后续联系，本次没有支出。')],{delegate:true,requiresStudent:true,activity:'visit'})
];
const contacts=[
 {id:'finance',name:'学校财务处',address:'finance@buji.example',role:'报销、到账与经费咨询',color:'sand'},
 {id:'patents',name:'专利中心',address:'ip@buji.example',role:'技术交底、授权与转化',color:'lavender'},
 {id:'editors',name:'期刊编辑部',address:'editor@journal.example',role:'投稿、返修与合作咨询',color:'blue'},
 {id:'conference',name:'学术交流中心',address:'meetings@buji.example',role:'会议、报告与学生交流',color:'coral'},
 {id:'international',name:'国际合作处',address:'visiting@buji.example',role:'访学与联合研究',color:'blue'},
 {id:'research',name:'科研项目办公室',address:'projects@buji.example',role:'横向合同与项目合作',color:'sand'}
];
function publicDefinition(t){return {id:t.id,sender:t.sender,address:t.address,subject:t.subject,body:t.body,delegate:!!t.delegate,requiresStudent:!!t.requiresStudent,choices:t.choices.map(c=>({text:c.text,cost:Math.max(c.cost||0,-(c.delta?.f||0)),assignVisit:!!c.assignVisit}))};}
function publicMail(m){const rules=m.rules||templates.find(t=>t.id===m.template),clean={...m};delete clean.rules;return rules?{...clean,...publicDefinition(rules),id:m.id,template:m.template}:clean;}
module.exports={templates,contacts,publicDefinition,publicMail};
