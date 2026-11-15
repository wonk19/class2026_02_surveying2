(() => {
'use strict';
const $=id=>document.getElementById(id),BASE=`https://github.com/${CourseState.REPO}`;
let token='',saving=false;
const PENDING_KEY='survey2-pending-grade';
let pending=null;
try{pending=JSON.parse(sessionStorage.getItem(PENDING_KEY)||'null');}catch{}
let roster=[],rubric=[],state=null,busy=false,valid=false,editing=null,base=null;
const el=(tag,value='',cls='')=>{const n=document.createElement(tag);n.textContent=value;if(cls)n.className=cls;return n;};
const link=(label,url)=>{const n=el('a',label);n.href=url;n.target='_blank';n.rel='noopener noreferrer';return n;};
const formatDate=value=>{if(!value||Number.isNaN(Date.parse(value)))return '시각 확인 불가';return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value))+' KST';};
function summary(scores){const count=scores.filter(v=>v!==null).length;const sum=Math.round(scores.reduce((a,v)=>a+(v??0),0)*100)/100;return count===6?`${sum} / 100`:(count?`입력합 ${sum} · ${count}/6`:'미평가');}
function render(){
 const host=$('grade-table');host.replaceChildren();const table=el('table','','team-table grade-table');const cap=el('caption','8개 조 · 항목명을 누르면 평가 주안점으로 이동합니다. 모든 항목 입력 시 총점을 표시합니다.');table.append(cap);
 const head=el('thead'),tr=el('tr');for(const label of ['조',...rubric.map(x=>`${x.label} (${x.max})`),'총점 / 입력합','평가 의견','최종 수정 · 기록','교수 입력']){const th=el('th',label);th.scope='col';tr.append(th);}rubric.forEach((x,i)=>{tr.children[i+1].textContent='';const a=el('a',`${x.label} (${x.max})`);a.href=`#rubric-${i}`;tr.children[i+1].append(a);});head.append(tr);table.append(head);
 const body=el('tbody');for(const t of Object.values(state.teams)){
  const row=el('tr'),th=el('th',`${t.id}조`);th.scope='row';row.append(th);const grade=t.grade,scores=grade?.scores??Array(6).fill(null);
  scores.forEach((score,i)=>{
   const cell=el('td','','score-cell');
   cell.append(el('strong',score===null?'—':String(score)),el('small',grade?.presenters?.[i]||'발표자 미지정','grade-presenter'));
   const button=el('button',grade?.comments?.[i]?'코멘트 보기':'코멘트 작성','quiet grade-comment-button');
   button.type='button';button.setAttribute('aria-label',`${t.id}조 ${rubric[i].label} 코멘트`);button.onclick=()=>showComment(t,i);cell.append(button);row.append(cell);
  });
  row.append(el('td',summary(scores),'grade-total'));
  const noteCell=el('td','','grade-note'),noteButton=el('button',grade?.note?'조 코멘트 보기':'조 코멘트 작성','quiet');
  noteButton.type='button';noteButton.onclick=()=>showComment(t,null);noteCell.append(noteButton);row.append(noteCell);
  const stamp=el('td');if(grade){const time=el('time',formatDate(grade.updatedAt));if(grade.updatedAt)time.dateTime=grade.updatedAt;stamp.append(time,link(`#${grade.issue} ↗`,`${BASE}/issues/${grade.issue}`));}else stamp.textContent='미등록';row.append(stamp);
  const action=el('td'),button=el('button','평가 입력','quiet');button.type='button';button.onclick=()=>open(t);action.append(button);row.append(action);body.append(row);
 }table.append(body);host.append(table);
 const results=$('grade-results');results.replaceChildren();const entries=Object.entries(state.results).filter(([n])=>gradeIssues.has(+n)).reverse();for(const [n,v] of entries){const p=el('p',`#${n} · ${v.reason} `,v.accepted?'fine':'grade-error');p.append(link('요청 보기',`${BASE}/issues/${n}`));results.append(p);}if(!entries.length)results.append(el('p','평가 등록 기록이 없습니다.','fine'));
}
function showComment(t,index){
 const dialog=$('grade-comment-dialog');
 $('grade-comment-heading').textContent=`${t.id}조 · ${index===null?'종합 의견':rubric[index].label}`;
 $('grade-comment-text').textContent=(index===null?t.grade?.note:t.grade?.comments?.[index])||'등록된 코멘트가 없습니다.';
 $('grade-comment-edit').onclick=()=>{dialog.close();open(t,index===null?'note':`comment${index}`);};
 dialog.showModal();
}
function open(t,focusName){
 if(saving)return;
 if(!valid){alert('평가 새로고침으로 공통 자료를 먼저 확인하세요.');return;}
 if(editing!==null&&!confirm('작성 중인 입력을 닫고 저장된 평가를 여시겠습니까?'))return;
 editing=t.id;base=t.grade?.issue??null;$('grade-editor-heading').textContent=`${t.id}조 · 교수 평가 입력`;
 const host=$('grade-inputs');host.replaceChildren();
 rubric.forEach((item,i)=>{
  const section=el('fieldset','','grade-item-editor');section.append(el('legend',`${item.label} / ${item.max}점`));
  const scoreLabel=el('label','점수'),input=document.createElement('input');
  input.type='number';input.name=`score${i}`;input.min='0';input.max=String(item.max);input.step='any';input.placeholder='미평가';input.value=t.grade?.scores[i]??'';scoreLabel.append(input);
  const presenterLabel=el('label','발표자'),select=document.createElement('select');select.name=`presenter${i}`;
  for(const name of ['',...t.members]){const option=el('option',name||'미지정');option.value=name;select.append(option);}
  select.value=t.grade?.presenters?.[i]??'';presenterLabel.append(select);
  const commentLabel=el('label','항목 코멘트 (공개)'),textarea=document.createElement('textarea');textarea.name=`comment${i}`;textarea.maxLength=1500;textarea.rows=3;textarea.value=t.grade?.comments?.[i]??'';commentLabel.append(textarea);
  section.append(scoreLabel,presenterLabel,commentLabel);host.append(section);
 });
 $('grade-form').elements.note.value=t.grade?.note??'';$('grade-editor').hidden=false;$('grade-request').hidden=true;preview();
 if(focusName){$('grade-form').elements[focusName].focus();$('grade-form').elements[focusName].scrollIntoView({behavior:'smooth',block:'center'});}
 else $('grade-editor').scrollIntoView({behavior:'smooth',block:'center'});
}

function values(){return rubric.map((_,i)=>{const v=$('grade-form').elements[`score${i}`].value;return v===''?null:Number(v);});}
function preview(){$('grade-preview').textContent=summary(values())+' · 빈칸은 미평가로 저장합니다.';}
let gradeIssues=new Set();
async function records(){const out=[];for(let page=1;;page++){const response=await fetch(`https://api.github.com/repos/${CourseState.REPO}/issues?state=all&sort=created&direction=asc&per_page=100&page=${page}`,{headers:apiHeaders(),cache:'no-store',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error(`평가 조회 실패 (${response.status}). 잠시 후 다시 시도하세요.`);const data=await response.json();if(!Array.isArray(data))throw Error('올바르지 않은 GitHub 응답입니다.');out.push(...data);if(!(response.headers.get('Link')||'').includes('rel="next"'))return out;}}
async function load(){if(busy||saving)return;busy=true;valid=false;$('grade-refresh').disabled=true;$('grade-state').textContent='공개 평가 기록 확인 중…';try{if(!roster.length){const responses=await Promise.all([fetch('assets/board-teams.json'),fetch('assets/evaluation-rubric.json')]);if(responses.some(r=>!r.ok))throw Error('명단·평가 기준 조회 실패');[roster,rubric]=await Promise.all(responses.map(r=>r.json()));if(rubric.length!==6||rubric.some((r,i)=>r.max!==CourseState.GRADING_MAX[i]))throw Error('평가 배점 설정 불일치');}const issues=await records();gradeIssues=new Set(issues.filter(i=>CourseState.decode(i)?.kind==='grade').map(i=>i.number));state=await CourseState.reduce(roster,issues);valid=true;render();$('grade-state').textContent='평가 기록 확인 완료';}catch(error){$('grade-state').textContent=error.message+' 표시된 정보는 최신이 아닐 수 있으며 저장 요청을 중단합니다.';}finally{busy=false;$('grade-refresh').disabled=false;}}
$('grade-form').oninput=preview;
$('grade-comment-close').onclick=()=>$('grade-comment-dialog').close();
$('grade-form').onsubmit=async e=>{e.preventDefault();if(saving)return;if(!token){$('account-setup').open=true;$('account-token').focus();$('account-status').textContent='먼저 wonk19 계정을 연결하세요.';return;}const form=e.currentTarget;if(!valid||editing===null){alert('평가 새로고침을 먼저 누르세요.');return;}if(!form.reportValidity())return;const scores=values();if(!scores.every((v,i)=>v===null||(Number.isFinite(v)&&v>=0&&v<=rubric[i].max))){alert('배점 범위 안의 점수를 입력하세요.');return;}const note=form.elements.note.value.trim();const presenters=rubric.map((_,i)=>form.elements[`presenter${i}`].value);const comments=rubric.map((_,i)=>form.elements[`comment${i}`].value.trim());const action={kind:'grade',group:editing,base,scores,note,presenters,comments};const title=`[${editing}조][교수 평가] ${summary(scores)}`;
 const body=`${editing}조 프로젝트 평가\n\n${rubric.map((r,i)=>`${r.label}: ${scores[i]===null?'미평가':scores[i]} / ${r.max} | 발표자: ${presenters[i]||'미지정'}\n코멘트: ${comments[i]||'없음'}`).join('\n')}\n${summary(scores)}\n\n평가 의견: ${note||'없음'}\n\n공개 평가입니다. wonk19 계정의 기록만 반영합니다.\n<!-- survey2-action-v2\n${JSON.stringify(action)}\n-->`;

 await saveGrade(action,title,body);
};
function apiHeaders(){
 const headers={Accept:'application/vnd.github+json'};
 if(token)headers.Authorization=`Bearer ${token}`;
 return headers;
}
function forgetToken(){
 token='';
 $('account-disconnect').hidden=true;
 $('account-status').textContent='계정 연결이 해제되었습니다.';
}
async function checkOwner(){
 const response=await fetch('https://api.github.com/user',{headers:apiHeaders(),cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(response.status===401){forgetToken();throw Error('토큰이 만료되었거나 유효하지 않습니다. 다시 연결하세요.');}
 if(!response.ok)throw Error('계정 확인에 실패했습니다. 잠시 후 다시 시도하세요.');
 const user=await response.json();
 if(user.id!==CourseState.OWNER_ID){forgetToken();throw Error('wonk19 계정의 토큰으로 연결하세요.');}
 return user;
}
$('account-form').onsubmit=async e=>{
 e.preventDefault();if(saving)return;$('account-connect').disabled=true;
 token=$('account-token').value.trim();$('account-token').value='';
 try{
  await checkOwner();
  $('account-status').textContent='wonk19 연결됨 · 이 페이지에서 계속 평가를 저장할 수 있습니다.';
  $('account-disconnect').hidden=false;$('account-setup').open=false;
 }catch(error){token='';$('account-status').textContent=error.message;}
 finally{$('account-connect').disabled=false;}
};
$('account-disconnect').onclick=()=>{if(!saving)forgetToken();};
function keepPending(value){
 pending=value;
 // Only a random request identifier and group number are kept, never credentials.
 try{if(value)sessionStorage.setItem(PENDING_KEY,JSON.stringify(value));else sessionStorage.removeItem(PENDING_KEY);}catch{}
 $('grade-check-save').hidden=!value;$('grade-clear-pending').hidden=!value;
}
function savingUI(value){
 saving=value;
 for(const control of $('grade-form').elements)control.disabled=value;
 $('grade-refresh').disabled=value;$('account-connect').disabled=value;$('account-disconnect').disabled=value;
 $('grade-check-save').disabled=value;$('grade-clear-pending').disabled=value;
 $('grade-save').textContent=value?'저장 확인 중…':'평가 저장';
}
async function applyRecords(issues){
 gradeIssues=new Set(issues.filter(i=>CourseState.decode(i)?.kind==='grade').map(i=>i.number));
 state=await CourseState.reduce(roster,issues);valid=true;render();
}
async function finishPending(issues){
 const saved=issues.find(i=>i.user?.id===CourseState.OWNER_ID&&CourseState.decode(i)?.requestId===pending.id);
 if(!saved)return false;
 await applyRecords(issues);
 const result=state.results[saved.number],group=pending.group;
 keepPending(null);
 if(!result?.accepted)throw Error('저장 요청이 반영되지 않았습니다. '+(result?.reason||'평가 기록을 확인하세요.'));
 if(editing===group){base=saved.number;$('grade-editor').hidden=true;editing=null;}
 $('grade-request-message').textContent=`${group}조 평가 저장 완료 · #${saved.number}`;
 $('grade-state').textContent='공개 평가 표에 저장 내용을 반영했습니다.';
 return true;
}
async function saveGrade(action,title,body){
 savingUI(true);$('grade-request').hidden=false;$('grade-request-message').textContent='계정과 최신 평가 확인 중…';
 try{
  await checkOwner();
  const issues=await records();
  if(pending){
   if(await finishPending(issues))return;
   throw Error('이전 저장의 결과가 아직 확인되지 않았습니다. 잠시 후 저장 결과 다시 확인을 누르세요.');
  }
  const latest=await CourseState.reduce(roster,issues);
  if((latest.teams[action.group].grade?.issue??null)!==action.base){
   await applyRecords(issues);
   throw Error('다른 창에서 더 최근 평가를 저장했습니다. 입력 내용은 유지했습니다. 평가 입력을 다시 열어 최신 내용과 비교하세요.');
  }
  const id=crypto.randomUUID(),payload={...action,requestId:id};
  body=body.replace(JSON.stringify(action),JSON.stringify(payload));
  keepPending({id,group:action.group});
  $('grade-request-message').textContent='GitHub에 평가 저장 중…';
  let response;
  try{response=await fetch(`https://api.github.com/repos/${CourseState.REPO}/issues`,{method:'POST',headers:{...apiHeaders(),'Content-Type':'application/json'},body:JSON.stringify({title,body}),signal:AbortSignal.timeout(20000)});}
  catch{throw Error('저장 응답을 받지 못했습니다. 입력 내용은 유지했습니다. 저장 결과 다시 확인을 누르세요.');}
  if(!response.ok){
   if(response.status<500)keepPending(null);
   if(response.status===401){forgetToken();throw Error('토큰이 만료되었습니다. 다시 연결한 뒤 저장하세요.');}
   if(response.status===403||response.status===404)throw Error('저장 권한 또는 GitHub 요청 한도를 확인하세요. 토큰에 이 저장소의 Issues Read and write 권한이 필요합니다.');
   throw Error(`GitHub 저장 오류 (${response.status}). 입력 내용은 유지했습니다.`);
  }
  const created=await response.json();
  // Include the confirmed response if GitHub's listing briefly lags creation.
  let refreshed;
  try{refreshed=await records();}catch{refreshed=issues;}
  const merged=[...refreshed.filter(i=>i.number!==created.number),created];
  if(!await finishPending(merged))throw Error('저장 결과를 확인하지 못했습니다. 저장 결과 다시 확인을 누르세요.');
 }catch(error){$('grade-request-message').textContent=error.message;}
 finally{savingUI(false);}
}
$('grade-check-save').onclick=async()=>{
 if(!pending||saving)return;savingUI(true);
 try{if(!await finishPending(await records()))$('grade-request-message').textContent='아직 저장 기록을 찾지 못했습니다. 잠시 후 다시 확인하세요.';}
 catch(error){$('grade-request-message').textContent=error.message;}
 finally{savingUI(false);}
};
$('grade-clear-pending').onclick=()=>{
 if(saving)return;
 if(confirm('GitHub 평가 기록에서 이전 요청이 저장되지 않은 것을 확인했습니까? 확인한 경우에만 정리하고 다시 저장하세요.')){
  keepPending(null);$('grade-request-message').textContent='미확인 요청을 정리했습니다. 평가 내용을 확인하고 저장하세요.';
 }
};
$('grade-close').onclick=()=>{if(saving)return;$('grade-editor').hidden=true;editing=null;};
$('grade-refresh').onclick=load;
load();
if(pending){keepPending(pending);$('grade-request').hidden=false;$('grade-request-message').textContent='이전 저장 요청의 결과를 확인하세요.';}
})();
