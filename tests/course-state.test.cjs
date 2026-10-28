const assert=require('node:assert/strict');
const {reduce,digest,OWNER_ID}=require('../docs/assets/course-state.js');
const teams=[{id:1,members:['A','B','C','D','E']},{id:2,members:['F','G','H','I','J']}];
let n=0;const events=[];
function event(d,id=OWNER_ID,login=id===OWNER_ID?'wonk19':`user${id}`){return {number:++n,user:{id,login},body:`<!-- survey2-action-v2\n${JSON.stringify(d)}\n-->`,html_url:`https://github.com/wonk19/class2026_02_surveying2/issues/${n}`,created_at:'2026-10-28T00:00:00Z'};}
const add=(d,id,login)=>{const e=event(d,id,login);events.push(e);return e;};
async function run(){
 const early=add({kind:'plan',group:1,topic:'t',objectives:['a','b','c'],base:null},101);let s=await reduce(teams,events);assert.equal(s.results[early.number].accepted,false);
 for(let i=0;i<5;i++){const name=teams[0].members[i],id=101+i;const c=add({kind:'claim',group:1,member:name},id);const hash=await digest({group:1,member:name,userId:id,login:`user${id}`});if(i===0){const fake=add({kind:'verify',claim:c.number,hash},102,'wonk19');s=await reduce(teams,events);assert.equal(s.results[fake.number].accepted,false);}add({kind:'verify',claim:c.number,hash});}
 s=await reduce(teams,events);assert.equal(Object.keys(s.teams[1].accounts).length,5);
 const outsider=add({kind:'settings',group:1,leader:'A',report:'https://evil.example',repository:''},999);const cross=add({kind:'settings',group:2,leader:'F',report:'',repository:''},101);
 const settings=add({kind:'settings',group:1,leader:'B',report:'https://example.org',repository:''},101);
 const proposal=add({kind:'plan',group:1,topic:'Topic',objectives:['One','Two','Three'],base:null},101);s=await reduce(teams,events);assert.equal(s.results[outsider.number].accepted,false);assert.equal(s.results[cross.number].accepted,false);assert.equal(s.teams[1].settings.leader,'B');assert.equal(s.teams[1].plan.issue,proposal.number);
 const hash=s.teams[1].plan.hash;const forged=add({kind:'approve',group:1,proposal:proposal.number,hash},101,'wonk19');s=await reduce(teams,events);assert.equal(s.results[forged.number].accepted,false);
 const approved=add({kind:'approve',group:1,proposal:proposal.number,hash});s=await reduce(teams,events);assert.equal(s.teams[1].approval.issue,approved.number);
 const edited=events.map(e=>e===proposal?{...e,body:e.body.replace('Topic','Changed after approval')}:e);const tampered=await reduce(teams,edited);assert.equal(tampered.teams[1].approval,null,'editing approved issue invalidates hash');
 const stale=add({kind:'plan',group:1,topic:'Stale',objectives:['a','b','c'],base:null},102);s=await reduce(teams,events);assert.equal(s.results[stale.number].accepted,false);
 const next=add({kind:'plan',group:1,topic:'Revision',objectives:['a','b','c'],base:proposal.number},102);s=await reduce(teams,events);assert.equal(s.teams[1].approval,null);assert.equal(s.teams[1].plan.issue,next.number);
 const fakeFeedback=add({kind:'feedback',group:1,title:'fake',body:'fake'},101);const feedback=add({kind:'feedback',group:1,title:'Review',body:'Please clarify'});
 const comments=[101,999,OWNER_ID].map(id=>({id,user:{id,login:`u${id}`},body:'reply',issue_url:`https://api.github.com/repos/x/y/issues/${feedback.number}`,html_url:'https://github.com/x/y'}));s=await reduce(teams,events,comments);assert.equal(s.results[fakeFeedback.number].accepted,false);assert.equal(s.feedback.length,1);assert.equal(s.feedback[0].replies.length,2);
 const revoke=add({kind:'revoke',group:1,member:'A'});const after=add({kind:'settings',group:1,leader:'A',report:'',repository:''},101);s=await reduce(teams,events);assert(!s.teams[1].accounts.A);assert.equal(s.results[after.number].accepted,false);
 const evilLegacy={number:999,user:{id:999,login:'wonk19'},body:'<!-- survey2-team-v1\n{"group":1,"leader":"A","report":"","repository":""}\n-->'};s=await reduce(teams,[...events,evilLegacy]);assert.equal(s.teams[1].settings.leader,'B');
 console.log('PASS: unverified/outsider/cross-team denial, author-ID verification, five-member gate, proposal revision, instructor-only approval, edited approval invalidation, stale writes, instructor feedback, verified replies, revocation, legacy impersonation.');
}
run().catch(e=>{console.error(e);process.exitCode=1});
