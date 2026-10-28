/* Authenticated GitHub issue ledger: no user-supplied author fields are trusted. */
(function(root){
'use strict';
const OWNER_ID=40270480, REPO='wonk19/class2026_02_surveying2';
const str=(v,max)=>typeof v==='string'&&v.length<=max;
function https(v){try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}}
function repoUrl(v){return !v||/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(v);}
async function digest(v){const bytes=new TextEncoder().encode(JSON.stringify(v));const result=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(result),x=>x.toString(16).padStart(2,'0')).join('');}
function decode(issue){if(issue.pull_request||!issue.user||!Number.isSafeInteger(issue.user.id))return null;const m=/<!-- survey2-action-v2\n([^]*?)\n-->/.exec(issue.body||'');if(!m)return null;try{const d=JSON.parse(m[1]);return d&&typeof d==='object'&&!Array.isArray(d)?d:null;}catch{return null;}}
async function reduce(roster,records,comments=[]){
 const teams=Object.fromEntries(roster.map(t=>[t.id,{...t,accounts:{},settings:{leader:'',report:'',repository:''},plan:null,approval:null}]));
 const claims={},feedback=[],results={},events=[...records].filter(i=>!i.pull_request).sort((a,b)=>a.number-b.number);
 const member=(team,id)=>Object.values(team.accounts).some(v=>v.id===id);
 const ready=team=>team.members.every(n=>team.accounts[n]);
 for(const issue of events){
  const actor=issue.user?.id,owner=actor===OWNER_ID,d=decode(issue);let reason='';
  if(!d){
   // Retain the instructor's existing team settings, never accept anonymous legacy writes.
   if(owner){const m=/<!-- survey2-team-v1\s*\n([^]*?)\n-->/.exec(issue.body||'');try{if(m){const v=JSON.parse(m[1]),t=teams[v.group];if(t&&str(v.leader,100)&&(!v.leader||t.members.includes(v.leader))&&str(v.report,500)&&(!v.report||https(v.report))&&str(v.repository,200)&&repoUrl(v.repository))t.settings={leader:v.leader,report:v.report,repository:v.repository};}}catch{}}
   continue;
  }
  const t=teams[d.group];const validGroup=Number.isInteger(d.group)&&!!t;
  const reject=msg=>{results[issue.number]={accepted:false,reason:msg};};
  const accept=()=>{results[issue.number]={accepted:true,reason:'반영 완료'};};
  if(d.kind==='claim'){
   if(!validGroup||!t.members.includes(d.member)||owner){reject('조원 이름과 신청 계정을 확인하세요.');continue;}
   const content={group:d.group,member:d.member,userId:actor,login:issue.user.login};
   claims[issue.number]={...content,issue:issue.number,hash:await digest(content),url:issue.html_url};accept();continue;
  }
  if(d.kind==='verify'){
   const c=claims[d.claim];if(!owner||!c||d.hash!==c.hash){reject('교수님만 본인 신청의 정확한 내용을 확인할 수 있습니다.');continue;}
   const other=Object.values(teams).some(x=>Object.entries(x.accounts).some(([name,v])=>v.id===c.userId&&!(x.id===c.group&&name===c.member)));
   if(other){reject('이미 다른 조원에게 연결된 GitHub 계정입니다.');continue;}
   teams[c.group].approval=null;teams[c.group].accounts[c.member]={id:c.userId,login:c.login,claim:c.issue,verifiedBy:OWNER_ID,source:issue.html_url};accept();continue;
  }
  if(d.kind==='revoke'){
   if(!owner||!validGroup||!t.members.includes(d.member)){reject('교수님만 계정 연결을 해제할 수 있습니다.');continue;}
   delete t.accounts[d.member];t.approval=null;accept();continue;
  }
  if(d.kind==='feedback'){
   if(!owner||!(d.group===0||validGroup)||!str(d.title,100)||!d.title.trim()||!str(d.body,3000)||!d.body.trim()){reject('교수님 계정의 유효한 코멘트만 게시됩니다.');continue;}
   feedback.push({group:d.group,title:d.title,body:d.body,issue:issue.number,url:issue.html_url,created:issue.created_at});accept();continue;
  }
  if(!validGroup){reject('올바른 조 번호가 필요합니다.');continue;}
  if(d.kind==='approve'){
   if(!owner||!ready(t)||!t.plan||d.proposal!==t.plan.issue||d.hash!==t.plan.hash){reject('교수님만 현재 연구계획을 확인 후 확정할 수 있습니다.');continue;}
   t.approval={issue:issue.number,proposal:d.proposal,hash:d.hash,url:issue.html_url};accept();continue;
  }
  if(!owner&&(!ready(t)||!member(t,actor))){reject('5명 계정 확인을 마친 해당 조원만 수정할 수 있습니다.');continue;}
  if(d.kind==='settings'){
   if(!str(d.leader,100)||d.leader&&!t.members.includes(d.leader)||!str(d.report,500)||d.report&&!https(d.report)||!str(d.repository,200)||!repoUrl(d.repository)){reject('조장 또는 링크 형식을 확인하세요.');continue;}
   t.settings={leader:d.leader,report:d.report,repository:d.repository};accept();continue;
  }
  if(d.kind==='plan'){
   if(!ready(t)){reject('조원 5명의 계정 확인이 먼저 필요합니다.');continue;}
   if(!str(d.topic,150)||!d.topic.trim()||/[\r\n]/.test(d.topic)||!Array.isArray(d.objectives)||d.objectives.length!==3||!d.objectives.every(x=>str(x,220)&&x.trim()&&!/[\r\n]/.test(x))){reject('분석 주제와 세부 연구목적 3개를 각 한 줄로 입력하세요.');continue;}
   if((d.base??null)!==(t.plan?.issue??null)){reject('다른 조원이 먼저 수정했습니다. 새로고침 후 다시 제출하세요.');continue;}
   const content={group:d.group,topic:d.topic,objectives:d.objectives};
   t.plan={...content,hash:await digest(content),issue:issue.number,url:issue.html_url,author:issue.user.login};t.approval=null;accept();continue;
  }
  reject('지원하지 않는 요청입니다.');
 }
 // Display replies only from the instructor or currently verified members of the relevant team.
 for(const post of feedback){post.replies=comments.filter(c=>Number((c.issue_url||'').split('/').pop())===post.issue&&str(c.body,10000)&&(c.user?.id===OWNER_ID||Object.values(teams).some(t=>(post.group===0||post.group===t.id)&&member(t,c.user?.id)))).map(c=>({body:c.body,login:c.user.login,url:c.html_url,id:c.id}));}
 return {teams,claims,feedback:feedback.reverse(),results};
}
const api={OWNER_ID,REPO,decode,digest,reduce};if(typeof module!=='undefined')module.exports=api;else root.CourseState=api;
})(typeof window!=='undefined'?window:globalThis);
