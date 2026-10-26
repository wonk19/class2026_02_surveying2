(() => {
'use strict';
const roles = ['조장','연구배경 조사','세부분석(코딩포함)','자료조사','회의준비(연락포함)','보고서 작성','발표'];
const published = document.querySelector('#published-team');
if (!published) return;
const initial = Array.from(published.rows).map(row => ({name: row.querySelector('.member-name').textContent, ratings: Array.from(row.querySelectorAll('td')).map(td => td.dataset.rating || '')}));
const form = document.querySelector('#team-form');
const fields = document.querySelector('#team-fields');
const status = document.querySelector('#team-status');
const key = 'team-participation-v3:' + location.pathname.replace(/[^/]*$/, '');
const valid = members => Array.isArray(members) && members.length === 5 && members.every(m => m && typeof m.name === 'string' && m.name.length <= 60 && Array.isArray(m.ratings) && m.ratings.length === 7 && m.ratings.every(r => ['', '주도', '조력', '미참'].includes(r)));
if (!valid(initial)) { status.textContent = '게시 데이터 형식을 확인하세요. 5명과 각 7개 평가가 필요합니다.'; form.hidden = true; return; }
Array.from(published.rows).forEach((row,i) => { if (!initial[i].name) row.querySelector('.member-name').textContent = `팀원 ${i+1}`; });
initial.forEach((member,i) => {
 const row = document.createElement('tr');
 const nameCell = document.createElement('th'); nameCell.scope = 'row';
 const input = document.createElement('input'); input.type = 'text'; input.id = `team-name-${i}`; input.maxLength = 60; input.required = true; input.autocomplete = 'off'; input.placeholder = `팀원 ${i+1}`; input.setAttribute('aria-label', `팀원 ${i+1} 이름`); nameCell.append(input); row.append(nameCell);
 roles.forEach((role,j) => {
  const cell = document.createElement('td'); const select = document.createElement('select'); select.id = `team-rating-${i}-${j}`; select.setAttribute('aria-label', `팀원 ${i+1} ${role} 평가`);
  ['', '주도', '조력', '미참'].forEach(value => { const option = document.createElement('option'); option.value = value; option.textContent = value || '미평가'; select.append(option); });
  cell.append(select); row.append(cell);
 }); fields.append(row);
});
function read() { return initial.map((_,i) => ({name: document.querySelector(`#team-name-${i}`).value.trim(), ratings: roles.map((_,j) => document.querySelector(`#team-rating-${i}-${j}`).value)})); }
function fill(members) { members.forEach((m,i) => { document.querySelector(`#team-name-${i}`).value = m.name; m.ratings.forEach((r,j) => { const select = document.querySelector(`#team-rating-${i}-${j}`); select.value = r; select.dataset.level = r; }); }); }
fill(initial);
try { const stored = localStorage.getItem(key); if (stored) { const draft = JSON.parse(stored); if (valid(draft)) { fill(draft); status.textContent = '이 브라우저의 평가 초안을 불러왔습니다. 공개된 평가와는 별개입니다.'; } else status.textContent = '임시 저장 형식이 맞지 않아 게시본을 불러왔습니다.'; } } catch { status.textContent = '임시 저장을 읽을 수 없습니다. 입력과 다운로드는 가능합니다.'; }
form.addEventListener('input', event => { if (event.target.tagName === 'SELECT') event.target.dataset.level = event.target.value; status.textContent = '수정 중 · 아직 저장하거나 공개하지 않았습니다.'; });
document.querySelector('#team-save').addEventListener('click', () => { try { localStorage.setItem(key, JSON.stringify(read())); status.textContent = '이 브라우저에 임시 저장했습니다. 공개되지는 않습니다.'; } catch { status.textContent = '임시 저장이 차단되었습니다. 파일 다운로드를 이용하세요.'; } });
document.querySelector('#team-reset').addEventListener('click', () => { if (!window.confirm('현재 평가 초안을 지우고 게시본을 불러올까요?')) return; fill(initial); try { localStorage.removeItem(key); status.textContent = '임시 입력을 지우고 게시본을 불러왔습니다.'; } catch { status.textContent = '게시본을 불러왔으나 임시 저장 삭제는 실패했습니다.'; } });
form.addEventListener('submit', event => {
 event.preventDefault(); const members = read();
 if (!valid(members) || members.some(m => !m.name)) { status.textContent = '5명의 이름을 모두 입력하세요.'; return; }
 const url = URL.createObjectURL(new Blob([JSON.stringify({members}, null, 2) + '\n'], {type:'application/json'}));
 const link = document.createElement('a'); link.href = url; link.download = 'team.json'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
 const pending = members.reduce((sum,m) => sum + m.ratings.filter(r => !r).length, 0);
 status.textContent = `파일 다운로드를 요청했습니다. 미평가 ${pending}칸 포함. 저장소 파일을 교체·커밋해야 공개됩니다.`;
});
})();
