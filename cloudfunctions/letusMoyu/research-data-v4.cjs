'use strict';
const {templates,contacts}=require('./mail-content.cjs');
const benefits=[
 {level:1,text:'每学年 2 硕 + 1 博；最多培养 4 人'},
 {level:2,text:'项目经费 +5%；升级时双方各得 80 经费'},
 {level:3,text:'主要科研进度 +1；每学年硕士名额增加 1'},
 {level:4,text:'交叉项目再 +5%；博士名额增加 1；培养上限 5；专利审查缩至 1 小时'},
 {level:5,text:'培养上限 6；学生研究反馈额外进度 +1'}
];
const tasks=[
 {id:'paper',name:'写一篇论文',description:'积累论文进度，完成后送审并记录标题与师生作者。',cost:0,target:100},
 {id:'patent',name:'写一项专利',description:'整理技术方案，授权后进入课题组专利档案。',cost:0,target:60},
 {id:'research',name:'完成一个研究小目标',description:'做一个可完成的小实验或数据分析。',cost:0,target:60},
 {id:'conference',name:'参加学术交流',description:'6 小时后形成学术经历和研究笔记。',cost:30,hours:6},
 {id:'visit',name:'安排境外访学',description:'前往虚构的云杉理工大学，12 小时后记入履历。',cost:120,hours:12}
];
module.exports={mailTemplates:templates,contacts,tasks,benefits,yearDays:7,studyHours:6,mailIntervalMinutes:[75,105]};
