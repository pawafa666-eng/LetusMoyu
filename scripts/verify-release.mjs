import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const sites=[
 {name:'game',origin:'https://letus-moyu-yiyi-and-fafa-d6gr7w5e62c4e8565.webapps.tcloudbase.com',dir:'dist',words:['我的简历','课题组成果','博士邮箱','学生规划','新手演练园区','横向科研合同']},
 {name:'mailroom',origin:'https://yiyi-and-fafa-d6gr7w5e62c4e8565-1330587953.tcloudbaseapp.com/mailroom/',dir:'dist-mailroom',words:['园区信务室','以 NPC 身份发信','投递回复','STAFF ACCESS']}
];
for(const site of sites){
 const r=await fetch(new URL('?release=v04',site.origin),{signal:AbortSignal.timeout(30000)}),html=await r.text(),local=await fs.readFile(new URL('../'+site.dir+'/index.html',import.meta.url),'utf8'),asset=html.match(/src="([^"]+\.js)"/)?.[1];
 assert.equal(r.status,200);assert.ok(asset&&local.includes(asset),'Published asset differs from local '+site.name+' build');
 const js=await(await fetch(new URL(asset,site.origin),{signal:AbortSignal.timeout(30000)})).text();assert.ok(!js.includes('/__preview/action'),'Development API must not be shipped');for(const word of site.words)assert.ok(js.includes(word),'Missing '+word);
 console.log('PASS',site.name,'production HTTP 200; v0.4 matches local build; expected features present; development API absent:',asset);
}
