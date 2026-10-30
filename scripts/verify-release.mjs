import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const sites=[
 {name:'game',origin:'https://letus-moyu-yiyi-and-fafa-d6gr7w5e62c4e8565.webapps.tcloudbase.com',dir:'dist',words:['我的简历','课题组成果','横向任务','提交验收并收款','来信资源附件','领取来信附件','fafa · 蓝色','Yizi · 粉色']},
 {name:'mailroom',origin:'https://yiyi-and-fafa-d6gr7w5e62c4e8565-1330587953.tcloudbaseapp.com/mailroom/',dir:'dist-mailroom',words:['园区信务室','以 NPC 身份发信','投递回复','给收件人的资源附件','科研声望','STAFF ACCESS']}
];
for(const site of sites){
 const r=await fetch(new URL('?release=v05',site.origin),{signal:AbortSignal.timeout(30000)}),html=await r.text(),local=await fs.readFile(new URL('../'+site.dir+'/index.html',import.meta.url),'utf8'),asset=html.match(/src="([^"]+\.js)"/)?.[1];
 assert.equal(r.status,200);assert.ok(asset&&local.includes(asset),'Published asset differs from local '+site.name+' build');
 const script=await fetch(new URL(asset,site.origin),{signal:AbortSignal.timeout(30000)});assert.equal(script.status,200);assert.match(script.headers.get('content-type'),/javascript/);const js=await script.text();assert.ok(!js.includes('/__preview/action'),'Development API must not be shipped');for(const word of site.words)assert.ok(js.includes(word),'Missing '+word);
 for(const css of html.matchAll(/href="([^"]+\.css)"/g)){const style=await fetch(new URL(css[1],site.origin),{signal:AbortSignal.timeout(30000)});assert.equal(style.status,200);assert.match(style.headers.get('content-type'),/text\/css/);}
 console.log('PASS',site.name,'production HTTP 200; v0.5 matches local build; expected features present; development API absent:',asset);
}
