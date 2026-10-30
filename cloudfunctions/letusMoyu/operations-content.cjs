'use strict';
const catalog=[
 {id:'sensor-basic',name:'基础结构监测套件',kind:'hardware',price:1200,level:1,domain:['civil'],speed:.05,rent:5,data:0,description:'入门监测，能接学校的基础采集共享单。'},
 {id:'data-lite',name:'研究数据整理软件',kind:'software',price:1800,level:1,domain:['civil','air','cross'],speed:0,rent:0,data:4,description:'先把表格收拾好，每两小时可整理一份论文素材。'},
 {id:'uav-pro',name:'研究级无人机',kind:'hardware',price:5000,level:1,domain:['air','cross'],speed:.12,rent:20,data:6,description:'航线验证、桥梁补拍，也能承接学校航测共享。'},
 {id:'pointcloud-pro',name:'点云处理专业软件',kind:'software',price:8000,level:1,domain:['civil','cross'],speed:.18,rent:0,data:10,description:'配准、重建与缺陷样本整理，给智能建造搭把手。'},
 {id:'lidar-pro',name:'高精度激光雷达',kind:'hardware',price:12000,level:2,domain:['civil','cross'],speed:.24,rent:45,data:12,description:'把复杂现场装进点云，学校共享平台也在排队。'},
 {id:'simulation-suite',name:'低空与结构仿真软件',kind:'software',price:16000,level:2,domain:['civil','air','cross'],speed:.3,rent:0,data:16,description:'多源仿真与验证工具，适配空地交叉课题。'},
 {id:'gpu-cluster',name:'科研 GPU 算力服务器',kind:'hardware',price:22000,level:2,domain:['civil','air','cross'],speed:.34,rent:85,data:18,description:'训练、计算与数据处理；切到学校算力共享可收租。'},
 {id:'inspection-robot',name:'自主巡检机器人',kind:'hardware',price:28000,level:2,domain:['civil','cross'],speed:.4,rent:110,data:20,description:'隧道、地下空间与桥梁的多源巡检搭档。'},
 {id:'twin-platform',name:'空地数字孪生共享平台',kind:'software',price:36000,level:3,domain:['civil','air','cross'],speed:.45,rent:140,data:22,description:'完整共享许可，科研协同或提供校内平台服务。'},
 {id:'uav-lidar',name:'无人机激光雷达一体系统',kind:'hardware',price:48000,level:3,domain:['civil','air','cross'],speed:.5,rent:190,data:26,description:'航测、重建、监测与共享一体化，贵得很有存在感。'}
];
const suppliers=[{id:'budget',name:'慢慢来仪器社',multiplier:.93,time:1.2,note:'报价省 7%，流程时间多 20%；材料慢慢装订。'},{id:'standard',name:'不急科研供应站',multiplier:1,time:1,note:'标准报价，流程稳稳推进。'},{id:'service',name:'今天就办技术服务',multiplier:1.12,time:.75,note:'报价多 12%，流程时间少 25%；专人整理材料。'}];
const stages=['寻找供应商','招标与比选','签订采购合同','研究所领导签字','设备到货与软件交付','验收与测试','资产建账'];
const careers=['博士研究生','副教授','教授','研究所负责人','院士课题组带头人'];
const grants=[0,1000,12000,30000,80000];
module.exports={catalog,suppliers,stages,careers,grants,salaryRate:20,salaryCap:500,wageCap:100,rentCap:1000};
