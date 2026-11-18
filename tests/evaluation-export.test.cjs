const assert=require('node:assert/strict');
const {collect}=require('../01_공통코드/export-evaluation-records.cjs');
const {OWNER_ID}=require('../docs/assets/course-state.js');
const issue=n=>({number:n,user:{id:OWNER_ID,login:'wonk19'},body:'<!-- survey2-action-v2\n'+JSON.stringify({kind:'grade',group:1,base:null,scores:[0,null,null,null,null,null],note:''})+'\n-->',html_url:`https://example.invalid/${n}`});
(async()=>{
 let requests=0;
 const data=await collect(async(url,options)=>{requests++;assert.match(url,new RegExp('page='+requests+'$'));assert.equal(options.headers.Authorization,'Bearer fixture-only');return new Response(JSON.stringify(requests===1?[issue(1),{...issue(2),pull_request:{}}]:[issue(3)]),{headers:requests===1?{link:'<next>; rel="next"'}:{}});},'fixture-only');
 assert.deepEqual(data.issues.map(i=>i.number),[1,3]);assert.equal(requests,2);assert(!JSON.stringify(data).includes('fixture-only'));assert.equal(data.schema,1);
 await assert.rejects(collect(async()=>new Response('{}',{status:403})),/403/);
 await assert.rejects(collect(async()=>new Response('{}')),/Invalid issue list/);
 console.log('PASS: complete paginated export, PR exclusion, no token output, fail closed on failed/invalid response');
})().catch(e=>{console.error(e);process.exitCode=1;});
