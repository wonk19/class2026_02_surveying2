const assert=require('node:assert/strict');
const {reduce,OWNER_ID,GRADING_MAX}=require('../docs/assets/course-state.js');
const roster=[{id:1,members:['A','B','C','D','E']},{id:2,members:['F','G','H','I','J']}];
let n=0;const event=(data,id=OWNER_ID)=>({number:++n,user:{id,login:'wonk19'},body:`<!-- survey2-action-v2\n${JSON.stringify(data)}\n-->`.replaceAll('\\n','\n'),html_url:`https://github.com/wonk19/class2026_02_surveying2/issues/${n}`,created_at:'2026-10-28T01:00:00Z'});
(async()=>{
 assert.equal(GRADING_MAX.reduce((a,b)=>a+b),100);
 const base={kind:'grade',group:1,base:null,scores:[20,20,15,15,15,15],note:'공개 의견'};
 const fake=event(base,999);let s=await reduce(roster,[fake]);assert.equal(s.teams[1].grade,null);assert.equal(s.results[fake.number].accepted,false);
 for(const scores of [[21,20,15,15,15,15],[-1,0,0,0,0,0],['20',20,15,15,15,15],[20]]){s=await reduce(roster,[event({...base,scores})]);assert.equal(s.teams[1].grade,null);}
 const first=event(base);s=await reduce(roster,[first]);assert.deepEqual(s.teams[1].grade.scores,GRADING_MAX);assert.equal(s.teams[2].grade,null);
 const partial=event({...base,base:first.number,scores:[0,null,12.5,null,null,null]});s=await reduce(roster,[first,partial]);assert.deepEqual(s.teams[1].grade.scores,[0,null,12.5,null,null,null]);
 const stale=event({...base,base:first.number});s=await reduce(roster,[first,partial,stale]);assert.equal(s.teams[1].grade.issue,partial.number);assert.equal(s.results[stale.number].accepted,false);
 const reset=event({...base,base:partial.number,scores:Array(6).fill(null)});s=await reduce(roster,[first,partial,reset]);assert.deepEqual(s.teams[1].grade.scores,Array(6).fill(null));
 const pr={...event(base),pull_request:{}};s=await reduce(roster,[pr]);assert.equal(s.teams[1].grade,null);
 console.log('Grade authorization, bounds, blank/zero, partial grades, stale writes and PR exclusion passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
