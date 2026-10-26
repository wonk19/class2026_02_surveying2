(() => {
  'use strict';
  const published = document.querySelector('#published-team');
  if (!published) return;
  const initial = Array.from(published.children).map(li => ({
    name: li.querySelector('.member-name').textContent,
    role: li.querySelector('.member-role').textContent,
    leader: li.dataset.leader === 'true'
  }));
  const key = 'team-draft-v1:' + location.pathname.replace(/[^/]*$/, '');
  const status = document.querySelector('#team-status');
  const form = document.querySelector('#team-form');
  const fields = document.querySelector('#team-fields');
  const preview = document.querySelector('#team-preview');
  const valid = members => Array.isArray(members) && members.length === 5 &&
    members.every(m => m && typeof m.name === 'string' && m.name.length <= 60 &&
      typeof m.role === 'string' && m.role.length <= 240 && typeof m.leader === 'boolean') &&
    members.filter(m => m.leader).length === 1;
  function render(list, members) {
    list.replaceChildren();
    members.forEach((m, i) => {
      const li = document.createElement('li');
      const name = document.createElement('strong');
      name.textContent = m.name.trim() || `팀원 ${i + 1} · 이름 미입력`;
      const role = document.createElement('span');
      role.textContent = m.role.trim() || '역할 미입력';
      li.append(name, role);
      if (m.leader) {
        const badge = document.createElement('span');
        badge.className = 'leader-badge'; badge.textContent = '조장'; li.append(badge);
      }
      list.append(li);
    });
  }
  if (!valid(initial)) {
    status.textContent = '게시 자료 형식이 올바르지 않습니다. team.json에 5명과 조장 1명을 지정하세요.';
    form.hidden = true; return;
  }
  render(published, initial);
  initial.forEach((_, i) => {
    const group = document.createElement('fieldset');
    const legend = document.createElement('legend'); legend.textContent = `팀원 ${i + 1}`;
    group.append(legend);
    for (const [field, title, max] of [['name', '이름', 60], ['role', '담당 역할', 240]]) {
      const label = document.createElement('label'); label.htmlFor = `team-${field}-${i}`;
      label.textContent = title;
      const input = document.createElement(field === 'role' ? 'textarea' : 'input');
      input.id = label.htmlFor; input.name = `${field}-${i}`; input.maxLength = max;
      input.required = true;
      if (field === 'role') { input.rows = 2; input.placeholder = '예: 세부목적 1 분석, 코드 검증 및 결과 작성'; }
      else { input.type = 'text'; input.autocomplete = 'off'; }
      group.append(label, input);
    }
    const label = document.createElement('label'); label.className = 'leader-choice';
    const radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'leader';
    radio.value = String(i); radio.required = true;
    label.append(radio, document.createTextNode('이 팀원이 조장')); group.append(label);
    fields.append(group);
  });
  function read() {
    return initial.map((_, i) => ({
      name: form.elements[`name-${i}`].value.trim(),
      role: form.elements[`role-${i}`].value.trim(),
      leader: form.elements.leader.value === String(i)
    }));
  }
  function fill(members) {
    members.forEach((m, i) => {
      form.elements[`name-${i}`].value = m.name;
      form.elements[`role-${i}`].value = m.role;
      form.querySelector(`input[name="leader"][value="${i}"]`).checked = m.leader;
    });
    render(preview, members);
  }
  fill(initial);
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const draft = JSON.parse(stored);
      if (valid(draft)) { fill(draft); status.textContent = '이 브라우저의 임시 입력을 불러왔습니다. 게시본은 변경되지 않았습니다.'; }
      else status.textContent = '저장된 임시 입력 형식이 맞지 않아 게시본을 불러왔습니다.';
    }
  } catch { status.textContent = '임시 저장을 읽을 수 없습니다. 입력과 파일 다운로드는 사용할 수 있습니다.'; }
  form.addEventListener('input', () => {
    render(preview, read()); status.textContent = '입력 중 · 아직 저장하거나 공개하지 않았습니다.';
  });
  document.querySelector('#team-save').addEventListener('click', () => {
    try { localStorage.setItem(key, JSON.stringify(read())); status.textContent = '이 브라우저에 임시 저장했습니다. 다른 기기와 공유되거나 공개되지는 않습니다.'; }
    catch { status.textContent = '브라우저 저장이 차단되었습니다. 입력을 완료하고 파일을 다운로드하세요.'; }
  });
  document.querySelector('#team-reset').addEventListener('click', () => {
    if (!window.confirm('현재 입력과 이 브라우저의 임시 저장을 지우고 게시본으로 돌아갈까요?')) return;
    try { localStorage.removeItem(key); fill(initial); status.textContent = '임시 입력을 지우고 게시본을 불러왔습니다.'; }
    catch { fill(initial); status.textContent = '게시본을 불러왔으나 브라우저 임시 저장 삭제에 실패했습니다.'; }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const members = read();
    if (!valid(members) || members.some(m => !m.name || !m.role)) {
      status.textContent = '팀원 5명의 이름과 역할을 모두 입력하고 조장 1명을 선택하세요.'; return;
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify({members}, null, 2) + '\n'], {type: 'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = 'team.json';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = '파일 다운로드를 요청했습니다. docs/_data/team.json을 교체하고 커밋해야 모두에게 공개됩니다.';
  });
})();
