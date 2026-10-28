(() => {
'use strict';
const $=id=>document.getElementById(id),BASE=`https://github.com/${CourseState.REPO}`;
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
  for(const score of scores)row.append(el('td',score===null?'—':String(score),'score-cell'));
  row.append(el('td',summary(scores),'grade-total'),el('td',grade?.note||'—','grade-note'));
  const stamp=el('td');if(grade){const time=el('time',formatDate(grade.updatedAt));if(grade.updatedAt)time.dateTime=grade.updatedAt;stamp.append(time,link(`#${grade.issue} ↗`,`${BASE}/issues/${grade.issue}`));}else stamp.textContent='미등록';row.append(stamp);
  const action=el('td'),button=el('button','평가 입력','quiet');button.type='button';button.onclick=()=>open(t);action.append(button);row.append(action);body.append(row);
 }table.append(body);host.append(table);
 const results=$('grade-results');results.replaceChildren();const entries=Object.entries(state.results).filter(([n])=>gradeIssues.has(+n)).reverse();for(const [n,v] of entries){const p=el('p',`#${n} · ${v.reason} `,v.accepted?'fine':'grade-error');p.append(link('요청 보기',`${BASE}/issues/${n}`));results.append(p);}if(!entries.length)results.append(el('p','평가 등록 기록이 없습니다.','fine'));
}
function open(t){if(!valid){alert('평가 새로고침으로 공통 자료를 먼저 확인하세요.');return;}editing=t.id;base=t.grade?.issue??null;$('grade-editor-heading').textContent=`${t.id}조 · 교수 평가 입력`;
 const host=$('grade-inputs');host.replaceChildren();rubric.forEach((item,i)=>{const label=el('label',`${item.label} / ${item.max}점`),input=document.createElement('input');input.type='number';input.name=`score${i}`;input.min='0';input.max=String(item.max);input.step='any';input.placeholder='미평가';input.value=t.grade?.scores[i]??'';label.append(input);host.append(label);});$('grade-form').elements.note.value=t.grade?.note??'';$('grade-editor').hidden=false;$('grade-request').hidden=true;preview();$('grade-editor').scrollIntoView({behavior:'smooth',block:'center'});
}
function values(){return rubric.map((_,i)=>{const v=$('grade-form').elements[`score${i}`].value;return v===''?null:Number(v);});}
function preview(){$('grade-preview').textContent=summary(values())+' · 빈칸은 미평가로 저장합니다.';}
let gradeIssues=new Set();
async function records(){const out=[];for(let page=1;;page++){const response=await fetch(`https://api.github.com/repos/${CourseState.REPO}/issues?state=all&sort=created&direction=asc&per_page=100&page=${page}`,{headers:{Accept:'application/vnd.github+json'},cache:'no-store'});if(!response.ok)throw Error(`평가 조회 실패 (${response.status}). 잠시 후 다시 시도하세요.`);const data=await response.json();if(!Array.isArray(data))throw Error('올바르지 않은 GitHub 응답입니다.');out.push(...data);if(!(response.headers.get('Link')||'').includes('rel="next"'))return out;}}
async function load(){if(busy)return;busy=true;valid=false;$('grade-refresh').disabled=true;$('grade-state').textContent='공개 평가 기록 확인 중…';try{if(!roster.length){const responses=await Promise.all([fetch('assets/board-teams.json'),fetch('assets/evaluation-rubric.json')]);if(responses.some(r=>!r.ok))throw Error('명단·평가 기준 조회 실패');[roster,rubric]=await Promise.all(responses.map(r=>r.json()));if(rubric.length!==6||rubric.some((r,i)=>r.max!==CourseState.GRADING_MAX[i]))throw Error('평가 배점 설정 불일치');}const issues=await records();gradeIssues=new Set(issues.filter(i=>CourseState.decode(i)?.kind==='grade').map(i=>i.number));state=await CourseState.reduce(roster,issues);valid=true;render();$('grade-state').textContent='평가 기록 확인 완료 · GitHub 등록 후 새로고침하세요.';}catch(error){$('grade-state').textContent=error.message+' 표시된 정보는 최신이 아닐 수 있으며 저장 요청을 중단합니다.';}finally{busy=false;$('grade-refresh').disabled=false;}}
$('grade-form').oninput=preview;
$('grade-form').onsubmit=e=>{e.preventDefault();const form=e.currentTarget;if(!valid||editing===null){alert('평가 새로고침을 먼저 누르세요.');return;}if(!form.reportValidity())return;const scores=values();if(!scores.every((v,i)=>v===null||(Number.isFinite(v)&&v>=0&&v<=rubric[i].max))){alert('배점 범위 안의 점수를 입력하세요.');return;}const note=form.elements.note.value.trim();const action={kind:'grade',group:editing,base,scores,note};const title=`[${editing}조][교수 평가] ${summary(scores)}`;
 const body=`${editing}조 프로젝트 평가\n\n${rubric.map((r,i)=>`${r.label}: ${scores[i]===null?'미평가':scores[i]} / ${r.max}`).join('\n')}\n${summary(scores)}\n\n평가 의견: ${note||'없음'}\n\n공개 평가입니다. wonk19 계정의 기록만 반영합니다.\n<!-- survey2-action-v2\n${JSON.stringify(action)}\n-->`;
 const url=`${BASE}/issues/new?${new URLSearchParams({title,body})}`;$('grade-request').hidden=false;$('grade-request-body').hidden=url.length<=7500;$('grade-request-body').value=body;$('grade-request-message').textContent=url.length>7500?'아직 저장되지 않았습니다. 아래 본문을 복사하여 GitHub 본문에 붙여넣고 wonk19 계정으로 Create issue를 누르세요.':'아직 저장되지 않았습니다. wonk19 계정으로 Create issue를 누른 후 평가 새로고침을 누르세요.';$('grade-request-link').href=url.length>7500?`${BASE}/issues/new?${new URLSearchParams({title})}`:url;$('grade-request').scrollIntoView({behavior:'smooth',block:'center'});
};
$('grade-close').onclick=()=>{$('grade-editor').hidden=true;$('grade-request').hidden=true;editing=null;};$('grade-refresh').onclick=load;load();
})();
