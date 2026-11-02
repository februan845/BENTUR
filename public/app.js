const API = '/api';
const state = { problems: [], collisions: [] };
const $ = (selector) => document.querySelector(selector);
const problemGrid = $('#problem-grid');
const categoryFilter = $('#category-filter');
const searchInput = $('#search-input');
const problemA = $('#problem-a');
const problemB = $('#problem-b');
const toast = $('#toast');
let toastTimer;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}
function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}
function formatDate(value) {
  try { return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(new Date(value)); }
  catch { return 'baru'; }
}
async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { detail: text }; }
  if (!response.ok) {
    let message = data.detail || `Permintaan gagal (${response.status})`;
    if (Array.isArray(message)) message = message.map((item) => item.msg).join(', ');
    throw new Error(message);
  }
  return data;
}
function filteredProblems() {
  const q = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;
  return state.problems.filter((problem) => {
    const matchesCategory = category === 'Semua' || problem.category === category;
    const matchesSearch = !q || `${problem.title} ${problem.description} ${problem.category}`.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });
}
function renderProblems() {
  const problems = filteredProblems();
  $('#result-count').textContent = `${problems.length} MASALAH`;
  if (!problems.length) {
    problemGrid.innerHTML = '<div class="empty-state">Belum ada masalah yang cocok. Coba kata kunci lain atau tambahkan masalah baru.</div>';
    return;
  }
  problemGrid.innerHTML = problems.map((problem, index) => `
    <article class="problem-card">
      <div class="card-top"><span class="category-chip" data-category="${escapeHtml(problem.category)}">${escapeHtml(problem.category)}</span><span class="card-number">B-${String(problem.id).padStart(3, '0')}</span></div>
      <h3>${escapeHtml(problem.title)}</h3>
      <p>${escapeHtml(problem.description)}</p>
      <div class="card-bottom"><span class="card-date">${formatDate(problem.created_at)}</span><label class="select-problem"><input type="checkbox" class="choose-problem" value="${problem.id}" aria-label="Pilih ${escapeHtml(problem.title)}" /> Pilih untuk Bentur</label></div>
    </article>`).join('');
  problemGrid.querySelectorAll('.choose-problem').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const selected = [...problemGrid.querySelectorAll('.choose-problem:checked')].map((item) => Number(item.value));
      if (selected.length > 2) {
        checkbox.checked = false;
        notify('Pilih maksimal dua masalah dari kartu.');
        return;
      }
      if (selected[0]) problemA.value = String(selected[0]);
      if (selected[1]) problemB.value = String(selected[1]);
      if (selected.length === 1) problemB.focus();
      $('#collision-note').textContent = selected.length === 2 ? 'Dua masalah terpilih. Saatnya benturkan!' : 'Pilih satu masalah lagi untuk membuat kombinasi.';
    });
  });
}
function renderProblemSelects() {
  const previousA = problemA.value;
  const previousB = problemB.value;
  const options = state.problems.map((p) => `<option value="${p.id}">${escapeHtml(p.category)} — ${escapeHtml(p.title)}</option>`).join('');
  const base = '<option value="">Pilih masalah…</option>';
  problemA.innerHTML = base + options;
  problemB.innerHTML = base + options;
  if (state.problems.some((p) => String(p.id) === previousA)) problemA.value = previousA;
  if (state.problems.some((p) => String(p.id) === previousB)) problemB.value = previousB;
  if (!problemA.value && state.problems[0]) problemA.value = String(state.problems[0].id);
  if (!problemB.value && state.problems[1]) problemB.value = String(state.problems[1].id);
}
async function loadStats() {
  try {
    const stats = await api('/stats');
    $('#stat-problems').textContent = stats.problems.toLocaleString('id-ID');
    $('#stat-collisions').textContent = stats.collisions.toLocaleString('id-ID');
  } catch {
    $('#stat-problems').textContent = '—';
    $('#stat-collisions').textContent = '—';
  }
}
async function loadProblems() {
  problemGrid.innerHTML = '<div class="loading-card">Menyiapkan ruang ide<span class="loading-dots">•••</span></div>';
  try {
    state.problems = await api('/problems');
    renderProblems();
    renderProblemSelects();
  } catch (error) {
    problemGrid.innerHTML = `<div class="empty-state">Data belum bisa dimuat. ${escapeHtml(error.message)}<br /><br />Pastikan DATABASE_URL sudah diatur, lalu muat ulang halaman.</div>`;
    problemA.innerHTML = '<option value="">Database belum siap</option>';
    problemB.innerHTML = '<option value="">Database belum siap</option>';
  }
}
async function createCollision() {
  const a = Number(problemA.value);
  const b = Number(problemB.value);
  const note = $('#collision-note');
  if (!a || !b) { note.textContent = 'Pilih dua masalah terlebih dahulu.'; return; }
  if (a === b) { note.textContent = 'Pilih dua masalah yang berbeda.'; return; }
  const button = $('#generate-collision');
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  button.textContent = 'Gemini sedang menyusun…';
  note.textContent = 'Menghubungkan ke Gemini… jawaban akan muncul bertahap.';
  const panel = $('#challenge-result');
  panel.classList.remove('hidden');
  panel.innerHTML = `<div class="result-meta">HASIL TABRAKAN / SEDANG DIBUAT</div><h3>${escapeHtml(problemA.selectedOptions[0].textContent)} <span style="color:var(--orange)">×</span> ${escapeHtml(problemB.selectedOptions[0].textContent)}</h3><div class="challenge-text" id="streamed-challenge" aria-live="polite">Menunggu jawaban pertama dari Gemini…</div>`;
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  try {
    const response = await fetch(`${API}/collisions/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problem_a_id: a, problem_b_id: b }),
    });
    if (!response.ok) {
      const text = await response.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { detail: text }; }
      let message = data.detail || `Permintaan gagal (${response.status})`;
      if (Array.isArray(message)) message = message.map((item) => item.msg).join(', ');
      throw new Error(message);
    }
    if (!response.body) throw new Error('Browser tidak mendukung streaming jawaban.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const challengeOutput = $('#streamed-challenge');
    let buffer = '';
    let challenge = '';
    let result = null;
    let streamError = null;
    let eventName = 'message';
    let dataLines = [];

    const processEvent = () => {
      if (!dataLines.length) return;
      const data = JSON.parse(dataLines.join('\n'));
      if (eventName === 'delta') {
        challenge += data.text;
        challengeOutput.textContent = challenge;
        note.textContent = 'Gemini sedang menulis jawaban…';
      } else if (eventName === 'complete') {
        result = data;
      } else if (eventName === 'error') {
        streamError = new Error(data.message || 'Gemini gagal membuat tantangan.');
      }
      eventName = 'message';
      dataLines = [];
    };

    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, '\n');
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        for (const line of block.split('\n')) {
          if (line.startsWith('event:')) eventName = line.slice(6).trim();
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
        }
        processEvent();
        boundary = buffer.indexOf('\n\n');
      }
      if (done) break;
    }
    if (buffer.trim()) {
      for (const line of buffer.split('\n')) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
      }
      processEvent();
    }
    if (streamError) throw streamError;
    if (!result) throw new Error('Koneksi terputus sebelum jawaban selesai disimpan. Silakan coba lagi.');

    panel.querySelector('.result-meta').textContent = `HASIL TABRAKAN / B-${String(result.id).padStart(3, '0')}`;
    challengeOutput.textContent = result.challenge;
    panel.insertAdjacentHTML('beforeend', '<div class="result-actions"><button class="small-button" id="copy-challenge">Salin tantangan ↗</button><button class="small-button" id="new-collision">Coba kombinasi lain ↻</button></div>');
    $('#copy-challenge').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(`${result.problem_a_title} × ${result.problem_b_title}\n\n${result.challenge}`); notify('Tantangan disalin.'); }
      catch { notify('Clipboard tidak tersedia di browser ini.'); }
    });
    $('#new-collision').addEventListener('click', () => { panel.classList.add('hidden'); $('#collision-lab').scrollIntoView({ behavior: 'smooth' }); });
    note.textContent = 'Tantangan tersimpan. Sekarang waktunya bereksperimen.';
    void loadStats();
  } catch (error) {
    note.textContent = error.message;
    const challengeOutput = $('#streamed-challenge');
    if (challengeOutput && !challengeOutput.textContent.startsWith('Menunggu jawaban')) {
      challengeOutput.textContent += '\n\n' + 'Proses terhenti sebelum jawaban tersimpan.';
    } else if (challengeOutput) {
      challengeOutput.textContent = 'Tantangan belum berhasil dibuat.';
    }
  } finally {
    button.disabled = false;
    button.removeAttribute('aria-busy');
    button.innerHTML = 'Benturkan ide <span aria-hidden="true">↗</span>';
  }
}
$('#generate-collision').addEventListener('click', createCollision);
searchInput.addEventListener('input', renderProblems);
categoryFilter.addEventListener('change', renderProblems);
$('#problem-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = $('#form-message');
  const button = $('#submit-button');
  message.classList.remove('error');
  message.textContent = '';
  button.disabled = true;
  button.innerHTML = 'Menyimpan…';
  const payload = {
    title: $('#title').value.trim(),
    description: $('#description').value.trim(),
    category: $('#category').value,
  };
  try {
    const problem = await api('/problems', { method: 'POST', body: JSON.stringify(payload) });
    $('#problem-form').reset();
    await Promise.all([loadProblems(), loadStats()]);
    message.textContent = 'Masalah berhasil ditambahkan. Siap dipertemukan dengan ide lain!';
    notify('Masalah baru berhasil disimpan.');
    categoryFilter.value = 'Semua';
    searchInput.value = '';
    renderProblems();
    problemA.value = String(problem.id);
    $('#collision-lab').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    message.textContent = error.message;
    message.classList.add('error');
  } finally {
    button.disabled = false;
    button.innerHTML = 'Kirim masalah <span aria-hidden="true">↗</span>';
  }
});

(async function init() {
  await Promise.all([loadProblems(), loadStats()]);
})();
