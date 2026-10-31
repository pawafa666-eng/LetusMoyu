import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const sites=[
 {name:'game',origin:'https://letus-moyu-yiyi-and-fafa-d6gr7w5e62c4e8565.webapps.tcloudbase.com',dir:'dist',words:['个人简历','本科生与比赛','课题组团建','核对并缴费发表','查看简历与面谈','我的简历','采购与设备','职称与收支','科研资产台账','完成建账，加入资产台账','保存时薪','院士课题组带头人','来信资源附件','fafa · 蓝色','Yizi · 粉色']},
 {name:'mailroom',origin:'https://yiyi-and-fafa-d6gr7w5e62c4e8565-1330587953.tcloudbaseapp.com/mailroom/',dir:'dist-mailroom',words:['园区信务室','以 NPC 身份发信','投递回复','给收件人的资源附件','科研声望','STAFF ACCESS']}
];
for(const site of sites){
 const r=await fetch(new URL('?release=v07',site.origin),{signal:AbortSignal.timeout(30000)}),html=await r.text(),local=await fs.readFile(new URL('../'+site.dir+'/index.html',import.meta.url),'utf8'),asset=html.match(/src="([^"]+\.js)"/)?.[1];
 assert.equal(r.status,200);assert.ok(asset&&local.includes(asset),'Published asset differs from local '+site.name+' build');
 const script=await fetch(new URL(asset,site.origin),{signal:AbortSignal.timeout(30000)});assert.equal(script.status,200);assert.match(script.headers.get('content-type'),/javascript/);const js=await script.text();assert.ok(!js.includes('/__preview/action'),'Development API must not be shipped');for(const word of site.words)assert.ok(js.includes(word),'Missing '+word);
 for(const css of html.matchAll(/href="([^"]+\.css)"/g)){const style=await fetch(new URL(css[1],site.origin),{signal:AbortSignal.timeout(30000)});assert.equal(style.status,200);assert.match(style.headers.get('content-type'),/text\/css/);}
 console.log('PASS',site.name,'production HTTP 200; v0.7 matches local build; expected features present; development API absent:',asset);
}
