(() => {
'use strict';
const REPO='wonk19/gee-project-report-example', BASE=`https://github.com/${REPO}`, KEY='survey2-board-draft-v1';
const types=['결정사항','교수 보고','결과 링크'];
const $=id=>document.getElementById(id), form=$('post-form');
let teams=[], issues=[], page=1, busy=false, loaded=false, loadError=false;
const text=(tag,value,cls)=>{const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e;};
function safeUrl(s){try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
function link(label,url){const a=text('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
function parse(issue){const m=/^\[([1-8])조\]\[(결정사항|교수 보고|결과 링크)\]\s*(.+)/.exec(issue.title||'');return m&&!issue.pull_request?{...issue,group:+m[1],kind:m[2],heading:m[3]}:null;}
function field(body,key){const lines=(body||'').split('\n');const line=lines.find(v=>v.startsWith(key+': '));return line?safeUrl(line.slice(key.length+2).trim()):null;}
let teamSettings={};
function teamState(team){const saved=teamSettings[team.id];if(saved)return saved;const recent=issues.filter(p=>p.group===team.id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));return {leader:'',report:recent.map(p=>field(p.body,'웹보고서')).find(Boolean)||'',repository:recent.map(p=>field(p.body,'저장소')).find(Boolean)||''};}
function renderTeams(){
 const host=$('teams');host.replaceChildren();const table=text('table','','team-table');table.append(text('caption','8개 조 · 각 5명 / 이름 표기는 수강 명단 기준'));
 const head=text('thead',''),hr=text('tr','');for(const label of ['조','조원 (조장 표시)','조별 Page','GitHub (public)','편집']){const th=text('th',label);th.scope='col';hr.append(th);}head.append(hr);table.append(head);const body=text('tbody','');
 for(const team of teams){const state=teamState(team),row=text('tr','',''+($('group-filter').value===String(team.id)?'selected':''));const group=text('td',''),button=text('button',`${team.id}조`,'group-button');button.type='button';button.setAttribute('aria-label',`${team.id}조 게시글 보기`);button.onclick=()=>{$('group-filter').value=String(team.id);form.elements.group.value=String(team.id);render();};group.append(button);row.append(group);
 const names=text('td',''),members=text('div','','member-list');for(const name of team.members){const item=text('span',name,'member'+(state.leader===name?' leader-member':''));if(state.leader===name)item.append(text('span','조장','leader-badge'));members.append(item);}if(!state.leader)members.append(text('span','조장 미지정','missing'));names.append(members);row.append(names);
 for(const [key,label] of [['report','Page ↗'],['repository','GitHub ↗']]){const cell=text('td','','link-cell');if(safeUrl(state[key]))cell.append(link(label,safeUrl(state[key])));else cell.append(text('span','미등록','missing'));row.append(cell);}
 const edit=text('td',''),editButton=text('button','수정','quiet');editButton.type='button';editButton.setAttribute('aria-label',`${team.id}조 조장과 링크 수정`);editButton.onclick=()=>openTeamEditor(team);edit.append(editButton);row.append(edit);body.append(row);
 }table.append(body);host.append(table);
}
function openTeamEditor(team){
 const box=$('team-editor'),edit=$('team-edit-form'),state=teamState(team);box.hidden=false;$('team-edit-heading').textContent=`${team.id}조 · 조장과 링크 수정`;edit.elements.group.value=team.id;const select=edit.elements.leader;select.replaceChildren();const empty=text('option','조장 미지정');empty.value='';select.append(empty);for(const name of team.members){const option=text('option',name);option.value=name;select.append(option);}select.value=state.leader||'';edit.elements.report.value=state.report||'';edit.elements.repository.value=state.repository||'';$('team-confirm-link').hidden=true;$('team-edit-status').textContent='';box.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function render(){renderTeams();const g=$('group-filter').value,k=$('type-filter').value,q=$('search').value.trim().toLowerCase();const filtered=issues.filter(p=>(!g||p.group===+g)&&(!k||p.kind===k)&&(!q||`${p.heading} ${p.body||''} ${p.user?.login||''}`.toLowerCase().includes(q)));const host=$('posts');host.replaceChildren();for(const p of filtered){const card=text('article','','post'),meta=text('div','','post-meta');meta.append(text('span',`${p.group}조 · ${p.kind}`,'tag'),text('span',p.state==='closed'?'종료':'진행 중'),text('span',`${p.user?.login||''} · ${new Date(p.created_at).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'})}`));card.append(meta,text('h3',p.heading));let summary=(p.body||'').replace(/<!--[^]*?-->/g,'').trim();card.append(text('p',summary.length>400?summary.slice(0,400)+'…':summary));const url=safeUrl(p.html_url);if(url&&new URL(url).hostname==='github.com')card.append(link(`글과 댓글 보기 · ${p.comments||0} ↗`,url));host.append(card);}if(!filtered.length)host.append(text('p',!loaded?'게시글을 확인하고 있습니다.':loadError?'글을 불러오지 못했습니다. 새로고침하거나 상단 GitHub 게시글에서 확인하세요.':issues.length?'조건에 맞는 글이 없습니다.':'아직 등록된 글이 없습니다. 아래에서 첫 소식을 남겨주세요.','empty'));}
function parseTeamSetting(issue){
 const m=/^\[([1-8])조\]\[조 정보\]/.exec(issue.title||'');if(!m||issue.pull_request)return null;
 const block=/<!-- survey2-team-v1\s*\n([^]*?)\n-->/.exec(issue.body||'');if(!block)return null;
 try{const v=JSON.parse(block[1]),team=teams.find(t=>t.id===+m[1]);if(!team||v.group!==team.id||typeof v.leader!=='string'||(v.leader&&!team.members.includes(v.leader)))return null;
 for(const k of ['report','repository'])if(typeof v[k]!=='string'||(v[k]&&!safeUrl(v[k])))return null;
 if(v.repository&&!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(v.repository))return null;
 return {...v,source:issue.html_url,number:issue.number};}catch{return null;}
}
async function load(){
 if(busy)return;busy=true;$('refresh').disabled=true;$('more').hidden=true;$('load-state').textContent='공유된 조 정보와 게시글을 불러오는 중…';$('directory-state').textContent='공통 자료 확인 중…';
 try{let current=1,more=true;const found=[],settings={},seen=new Set();while(more){
 const res=await fetch(`https://api.github.com/repos/${REPO}/issues?state=all&sort=created&direction=desc&per_page=100&page=${current}`,{headers:{Accept:'application/vnd.github+json'},cache:'no-store'});
 if(!res.ok)throw Error(res.status===403||res.status===429?'GitHub 조회 한도에 도달했습니다. 잠시 후 새로고침하거나 GitHub에서 확인하세요.':`조회 실패 (${res.status})`);
 const data=await res.json();if(!Array.isArray(data))throw Error('응답 형식을 확인할 수 없습니다.');for(const raw of data){if(seen.has(raw.number))continue;seen.add(raw.number);const profile=parseTeamSetting(raw);if(profile&&!settings[profile.group])settings[profile.group]=profile;const post=parse(raw);if(post)found.push(post);}
 more=(res.headers.get('Link')||'').includes('rel="next"');current++;
 }
 issues=found;teamSettings=settings;loaded=true;loadError=false;const stamp=new Date().toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul'});$('load-state').textContent=`게시글 ${issues.length}개 · ${stamp} 확인`;$('directory-state').textContent=`공통 자료 · ${stamp} 확인 · 수정 후 GitHub에서 등록하면 모두에게 반영됩니다.`;
 }catch(e){loadError=true;loaded=true;$('load-state').textContent=e.message||'연결에 실패했습니다.';$('directory-state').textContent='공통 자료 조회 실패 · 표시된 정보가 최신이 아닐 수 있습니다. 다시 확인한 뒤 수정하세요.';}
 finally{busy=false;$('refresh').disabled=false;render();}
}
function repositoryPath(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='github.com'&&!u.username&&!u.password&&!u.search&&!u.hash&&/^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(u.pathname)?u.pathname.replace(/\/$/,''):null;}catch{return null;}}
$('team-cancel').onclick=()=>{$('team-editor').hidden=true;};
$('team-edit-form').addEventListener('submit',async e=>{
 e.preventDefault();const edit=$('team-edit-form'),status=$('team-edit-status');if(!edit.reportValidity())return;if(busy||loadError||!loaded){status.textContent='공통 자료를 먼저 새로고침한 뒤 수정하세요.';return;}
 const v=Object.fromEntries(new FormData(edit).entries()),team=teams.find(t=>t.id===+v.group);if(!team||v.leader&&!team.members.includes(v.leader))return;
 v.report=v.report.trim();v.repository=v.repository.trim();if(v.report&&!safeUrl(v.report)){status.textContent='Page는 https:// 주소를 입력하세요.';return;}
 const path=v.repository?repositoryPath(v.repository):null;if(v.repository&&!path){status.textContent='GitHub 저장소는 https://github.com/계정/저장소 형식으로 입력하세요.';return;}
 $('team-save').disabled=true;try{
 if(path){status.textContent='공개 저장소인지 확인 중…';const check=await fetch(`https://api.github.com/repos${path}`,{headers:{Accept:'application/vnd.github+json'}});if(!check.ok)throw Error(check.status===404?'저장소가 없거나 비공개입니다. public 저장소 주소를 확인하세요.':'공개 저장소 여부를 확인하지 못했습니다. 잠시 후 다시 시도하세요.');const repo=await check.json();if(repo.private!==false)throw Error('공개(public) 저장소만 등록할 수 있습니다.');v.repository=repo.html_url;}
 const config={group:team.id,leader:v.leader,report:v.report?safeUrl(v.report):'',repository:v.repository};
 const body=`## ${team.id}조 공통 정보 변경\n\n- 조장: ${config.leader||'미지정'}\n- 조별 Page: ${config.report||'미등록'}\n- 공개 GitHub 저장소: ${config.repository||'미등록'}\n\n이 변경은 wonk19/gee-project-report-example에 저장되며 모든 방문자에게 공유됩니다. 같은 조의 새 변경을 등록하면 이 설정을 대체합니다.\n\n<!-- survey2-team-v1\n${JSON.stringify(config)}\n-->`;
 const url=`${BASE}/issues/new?${new URLSearchParams({title:`[${team.id}조][조 정보] 조장 및 프로젝트 링크`,body})}`;
 $('team-confirm-link').href=url;$('team-confirm-link').hidden=false;status.textContent='입력 확인 완료. 아래 버튼을 눌러 본인 GitHub 계정으로 로그인하고 Create issue를 누르세요. 아직 공유 저장되지 않았습니다.';
 }catch(err){status.textContent=err.message||'확인에 실패했습니다.';}finally{$('team-save').disabled=false;}
});
$('team-edit-form').addEventListener('input',()=>{$('team-confirm-link').hidden=true;$('team-edit-status').textContent='변경한 내용을 다시 확인해주세요.';});

function values(){return Object.fromEntries(new FormData(form).entries());}
function draftSave(){try{localStorage.setItem(KEY,JSON.stringify(values()));$('form-state').textContent='이 브라우저에 초안을 저장했습니다. 아직 게시되지 않았습니다.';}catch{$('form-state').textContent='브라우저 저장이 차단되어 초안을 저장하지 못했습니다.';}}
form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;const v=values();if(!/^[1-8]$/.test(v.group)||!types.includes(v.type))return;for(const key of ['report','repository'])if(v[key]&&!safeUrl(v[key])){$('form-state').textContent='링크는 로그인 정보가 없는 https:// 주소를 입력하세요.';return;}if(v.type==='결과 링크'&&!v.report&&!v.repository){$('form-state').textContent='결과 링크에는 웹보고서 또는 저장소 URL을 하나 이상 입력하세요.';return;}if(!v.title.trim()||!v.summary.trim()){$('form-state').textContent='제목과 진행 내용을 입력하세요.';return;}const title=`[${v.group}조][${v.type}] ${v.title.trim()}`;const body=`<!-- survey2-board-v1 -->\n## 결정·진행 내용\n${v.summary.trim()}\n\n## 교수에게 확인받을 사항\n${v.request.trim()||'없음'}\n\n## 프로젝트 링크\n웹보고서: ${v.report.trim()}\n저장소: ${v.repository.trim()}\n\n## 다음 할 일\n${v.next.trim()||'미정'}`.replace(/\\n/g,'\n');const url=`${BASE}/issues/new?${new URLSearchParams({title,body})}`;draftSave();if(url.length>7500){$('long-body').hidden=false;$('copy-body').value=body;$('manual-link').href=`${BASE}/issues/new?${new URLSearchParams({title})}`;$('manual-link').target='_blank';$('manual-link').rel='noopener noreferrer';$('form-state').textContent='아래 본문을 복사하여 GitHub에서 등록해주세요.';return;}$('long-body').hidden=true;$('form-state').textContent='GitHub에서 Create issue를 눌러야 등록됩니다. 등록 후 이 페이지를 새로고침하세요.';window.open(url,'_blank','noopener,noreferrer');});
$('save-draft').onclick=draftSave;$('clear-draft').onclick=()=>{try{localStorage.removeItem(KEY);}catch{}form.reset();$('long-body').hidden=true;$('form-state').textContent='작성 양식과 이 기기의 초안을 지웠습니다.';};
for(let i=1;i<=8;i++){for(const select of [$('group-filter'),form.elements.group]){const o=text('option',`${i}조`);o.value=i;select.append(o);}}
try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v&&typeof v==='object'){for(const name of ['group','type','title','summary','request','report','repository','next'])if(typeof v[name]==='string')form.elements[name].value=v[name];$('form-state').textContent='이 기기에 저장된 초안을 복원했습니다. 아직 게시되지 않았습니다.';}}catch{}
for(const id of ['group-filter','type-filter','search'])$(id).addEventListener('input',render);$('refresh').onclick=()=>load(true);$('more').onclick=()=>load();
fetch('assets/board-teams.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{teams=data;renderTeams();load();}).catch(()=>{$('teams').textContent='조 구성을 불러오지 못했습니다. 페이지를 새로고침해 주세요.';});
})();

