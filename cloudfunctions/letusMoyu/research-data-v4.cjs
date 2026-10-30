'use strict';
const {templates,contacts}=require('./mail-content.cjs');
const benefits=[
 {level:1,text:'每学年 2 硕 + 1 博；最多培养 4 人'},
 {level:2,text:'双方晋升副教授；各获 1000 启动经费；学校工资 20/小时，离线上限 500；改为研究所领导认可'},
 {level:3,text:'晋升教授，各获 12000 启动经费；在组上限 6，硕士指标 +1；教授招聘待解锁'},
 {level:4,text:'研究所负责人，各获 30000 启动经费；在组上限 8、博士指标 +1；研究所分支与新园区待解锁'},
 {level:5,text:'院士课题组带头人，各获 80000 启动经费；在组上限 12；教授下设学生待解锁'}
];
const tasks=[
 {id:'paper',name:'写一篇论文',description:'积累论文进度，完成后送审并记录标题与师生作者。',cost:0,target:100},
 {id:'patent',name:'写一项专利',description:'整理技术方案，授权后进入课题组专利档案。',cost:0,target:60},
 {id:'research',name:'完成一个研究小目标',description:'做一个可完成的小实验或数据分析。',cost:0,target:60},
 {id:'conference',name:'参加学术交流',description:'6 小时后形成学术经历和研究笔记。',cost:30,hours:6},
 {id:'visit',name:'安排境外访学',description:'前往虚构的云杉理工大学，12 小时后记入履历。',cost:120,hours:12}
];
module.exports={mailTemplates:templates,contacts,tasks,benefits,yearDays:7,studyHours:6,mailIntervalMinutes:[75,105]};
