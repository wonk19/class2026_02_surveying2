(() => {
'use strict';
const $=id=>document.getElementById(id),BASE=`https://github.com/${CourseState.REPO}`;
let roster=[],rubric=[],state=null,busy=false,valid=false,editing=null,base=null;
const el=(tag,value='',cls='')=>{const n=document.createElement(tag);n.textContent=value;if(cls)n.className=cls;return n;};
const link=(label,url)=>{const n=el('a',label);n.href=url;n.target='_blank';n.rel='noopener noreferrer';return n;};
const formatDate=value=>{if(!value||Number.isNaN(Date.parse(value)))return '시각 확인 불가';return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value))+' KST';};
function summary(scores){const count=scores.filter(v=>v!==null).length;const sum=Math.round(scores.reduce((a,v)=>a+(v??0),0)*100)/100;const assessedMax=scores.reduce((a,v,i)=>a+(v===null?0:CourseState.GRADING_MAX[i]),0);return count===6?`총점 ${sum} / 100`:(count?`현재 ${sum} / ${assessedMax}점 · ${count}/6항목 평가`:'아직 평가한 항목 없음');}
function render(){
 const host=$('grade-table');host.replaceChildren();const table=el('table','','team-table grade-table');const cap=el('caption','날짜를 달리해 항목별로 평가할 수 있습니다. 미평가 항목은 0점으로 계산하지 않으며, 6항목 평가 후 총점을 표시합니다.');table.append(cap);
 const head=el('thead'),tr=el('tr');for(const label of ['조',...rubric.map(x=>`${x.label} (${x.max})`),'평가 진행 / 현재 점수','평가 의견','최종 수정 · 기록','교수 입력']){const th=el('th',label);th.scope='col';tr.append(th);}rubric.forEach((x,i)=>{tr.children[i+1].textContent='';const a=el('a',`${x.label} (${x.max})`);a.href=`#rubric-${i}`;tr.children[i+1].append(a);});head.append(tr);table.append(head);
 const body=el('tbody');for(const t of Object.values(state.teams)){
  const row=el('tr'),th=el('th',`${t.id}조`);th.scope='row';row.append(th);const grade=t.grade,scores=grade?.scores??Array(6).fill(null);
  scores.forEach((score,i)=>{
   const cell=el('td','','score-cell');
   cell.append(el('strong',score===null?'미평가':String(score)),el('small',grade?.presenters?.[i]||'발표자 미지정','grade-presenter'));
   const scoreButton=el('button',score===null?'점수 입력':'점수 수정','quiet');scoreButton.type='button';scoreButton.setAttribute('aria-label',`${t.id}조 ${rubric[i].label} 점수`);scoreButton.onclick=()=>open(t,`score${i}`);cell.append(scoreButton);
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
function preview(){$('grade-preview').textContent=summary(values())+' · 이번에 평가할 항목만 입력하세요. 불러온 기존 점수는 유지하고, 아직 평가하지 않은 항목은 빈칸으로 두세요.';}
let gradeIssues=new Set();
async function records(){
 const sources=[{url:`https://raw.githubusercontent.com/${CourseState.REPO}/main/docs/assets/evaluation-records.json`,fallback:false},{url:'assets/evaluation-records.json',fallback:true}];
 for(const source of sources){
  try{
   const response=await fetch(source.url,{cache:'no-store'});if(!response.ok)continue;
   const data=await response.json();
   if(data.schema!==1||data.repository!==CourseState.REPO||!Array.isArray(data.issues)||!Number.isFinite(Date.parse(data.generatedAt)))continue;
   if(data.issues.some(i=>!Number.isSafeInteger(i.number)||!Number.isSafeInteger(i.user?.id)||typeof i.body!=='string'))continue;
   return {...data,fallback:source.fallback};
  }catch{}
 }
 throw Error('게시된 평가 데이터를 불러오지 못했습니다. 네트워크 연결을 확인한 뒤 다시 조회하세요.');
}
async function load(){if(busy)return;busy=true;valid=false;$('grade-refresh').disabled=true;$('grade-state').textContent='공개 평가 기록 확인 중…';try{if(!roster.length){const responses=await Promise.all([fetch('assets/board-teams.json'),fetch('assets/evaluation-rubric.json')]);if(responses.some(r=>!r.ok))throw Error('명단·평가 기준 조회 실패');[roster,rubric]=await Promise.all(responses.map(r=>r.json()));if(rubric.length!==6||rubric.some((r,i)=>r.max!==CourseState.GRADING_MAX[i]))throw Error('평가 배점 설정 불일치');}const snapshot=await records();const issues=snapshot.issues;gradeIssues=new Set(issues.filter(i=>CourseState.decode(i)?.kind==='grade').map(i=>i.number));state=await CourseState.reduce(roster,issues);valid=!snapshot.fallback;render();$('grade-state').textContent=`평가 자료 갱신: ${formatDate(snapshot.generatedAt)} · `+(snapshot.fallback?'연결 문제로 사이트 배포 당시 자료를 표시합니다. 최신 확인 전에는 입력을 중단합니다.':'GitHub 등록 후 자동 반영까지 몇 분 걸릴 수 있습니다. 반영되지 않았으면 잠시 후 평가 새로고침을 누르세요.');}catch(error){$('grade-state').textContent=error.message+' 표시된 정보는 최신이 아닐 수 있으며 저장 요청을 중단합니다.';}finally{busy=false;$('grade-refresh').disabled=false;}}
$('grade-form').oninput=()=>{preview();$('grade-request').hidden=true;};
$('grade-comment-close').onclick=()=>$('grade-comment-dialog').close();
$('grade-form').onsubmit=e=>{e.preventDefault();const form=e.currentTarget;if(!valid||editing===null){alert('평가 새로고침을 먼저 누르세요.');return;}if(!form.reportValidity())return;const scores=values();if(!scores.every((v,i)=>v===null||(Number.isFinite(v)&&v>=0&&v<=rubric[i].max))){alert('배점 범위 안의 점수를 입력하세요.');return;}const note=form.elements.note.value.trim();const presenters=rubric.map((_,i)=>form.elements[`presenter${i}`].value);const comments=rubric.map((_,i)=>form.elements[`comment${i}`].value.trim());const action={kind:'grade',group:editing,base,scores,note,presenters,comments};const title=`[${editing}조][교수 평가] ${summary(scores)}`;
 const body=`${editing}조 프로젝트 평가\n\n${rubric.map((r,i)=>`${r.label}: ${scores[i]===null?'미평가':scores[i]} / ${r.max} | 발표자: ${presenters[i]||'미지정'}\n코멘트: ${comments[i]||'없음'}`).join('\n')}\n${summary(scores)}\n\n평가 의견: ${note||'없음'}\n\n공개 평가입니다. wonk19 계정의 기록만 반영합니다.\n<!-- survey2-action-v2\n${JSON.stringify(action)}\n-->`;
 const url=`${BASE}/issues/new?${new URLSearchParams({title,body})}`;
 const needsCopy=url.length>6000;
 $('grade-request').hidden=false;$('grade-request-body').hidden=!needsCopy;$('grade-request-body').value=body;
 $('grade-copy').hidden=!needsCopy;
 $('grade-request-link').dataset.needsCopy=String(needsCopy);
 $('grade-request-link').textContent=needsCopy?'본문 복사 후 GitHub 열기 ↗':'GitHub에서 평가 등록 ↗';
 $('grade-request-message').textContent=needsCopy?'내용이 길어 자동 채움 주소의 길이 기준을 넘었습니다. GitHub 열기를 누르면 본문 전체를 복사합니다. GitHub 본문(Description)에 붙여넣고 Create issue를 누르세요. 아직 저장되지 않았습니다.':'GitHub 화면에 제목과 평가 본문이 자동으로 채워집니다. wonk19 계정으로 Create issue를 누른 뒤 평가 새로고침을 누르세요. 아직 저장되지 않았습니다.';
 $('grade-request-link').href=needsCopy?`${BASE}/issues/new?${new URLSearchParams({title})}`:url;
 $('grade-request').scrollIntoView({behavior:'smooth',block:'center'});
};
async function copyGradeBody(){
 const body=$('grade-request-body');
 try{await navigator.clipboard.writeText(body.value);$('grade-request-message').textContent='평가 본문을 복사했습니다. GitHub를 열어 본문(Description)에 붙여넣고 Create issue를 누르세요. 아직 저장되지 않았습니다.';}
 catch{body.focus();body.select();$('grade-request-message').textContent='자동 복사가 허용되지 않아 본문을 선택했습니다. Ctrl+C(맥: ⌘C)로 복사한 뒤 GitHub 본문에 붙여넣으세요. 아직 저장되지 않았습니다.';}
}
$('grade-copy').onclick=copyGradeBody;
$('grade-request-link').onclick=()=>{if($('grade-request-link').dataset.needsCopy==='true')void copyGradeBody();};
$('grade-close').onclick=()=>{$('grade-editor').hidden=true;$('grade-request').hidden=true;editing=null;};$('grade-refresh').onclick=load;load();
})();
