/* ═══════════════════════ SESSION & STATE ═══════════════════════ */
const SESSION_KEY = 'ca_session';

function getSession() {
  let s = localStorage.getItem(SESSION_KEY);
  if (!s) {
    s = 'sess_' + Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem(SESSION_KEY, s);
  }
  return s;
}

const SESSION = getSession();

const state = {
  levels: [],
  currentLevel: null,
  questions: [],
  currentIndex: 0,
  score: 0,
  progressId: null,
  watchedVideo: false,
  codeEditor: null,
  tryitEditor: null,
  answered: false,
};

/* ═══════════════════════ API HELPERS ═══════════════════════════ */
const api = {
  async get(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async post(url, body) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async patch(url, body) {
    const r = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
};

/* ═══════════════════════ SCREEN ROUTER ════════════════════════ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  el.classList.add('active');
  window.scrollTo(0, 0);
}

/* ═══════════════════════ HOME SCREEN ══════════════════════════ */
async function loadHome() {
  showScreen('screen-home');
  const grid = document.getElementById('levels-grid');
  grid.innerHTML = '<div class="skeleton" style="height:180px;border-radius:16px"></div>'.repeat(6);

  const levels = await api.get(`/api/levels?session=${SESSION}`);
  state.levels = levels;

  grid.innerHTML = '';
  levels.forEach((lvl, i) => {
    const pct = lvl.total > 0 ? Math.round((lvl.score / lvl.total) * 100) : 0;
    const isLocked = i > 0 && !levels[i - 1].completed;
    const card = document.createElement('div');
    card.className = `level-card${lvl.completed ? ' completed' : ''}${isLocked ? ' locked' : ''}`;
    card.style.animationDelay = `${i * 0.06}s`;
    card.innerHTML = `
      <div class="level-card-header">
        <div class="level-icon-wrap">
          ${lvl.icon}
          ${lvl.completed ? '<div class="level-badge">✓</div>' : ''}
        </div>
        <span class="level-num">Level ${lvl.order_num}</span>
      </div>
      <h3>${isLocked ? '🔒 ' : ''}${lvl.title}</h3>
      <p>${lvl.description}</p>
      <div class="level-progress-bar">
        <div class="level-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="level-card-footer">
        <span>${isLocked ? 'Complete previous level first' : lvl.completed ? 'Completed' : 'Start learning'}</span>
        ${lvl.score > 0 ? `<span class="level-score">⭐ ${lvl.score}/${lvl.total}</span>` : ''}
      </div>
    `;
    if (!isLocked) card.addEventListener('click', () => openLevel(lvl));
    grid.appendChild(card);
  });

  // Streak badge (simple: just show session count)
  const streak = parseInt(localStorage.getItem('ca_streak') || '0');
  document.getElementById('streak-count').textContent = streak;
}

/* ═══════════════════════ CHOICE SCREEN ════════════════════════ */
function openLevel(lvl) {
  state.currentLevel = lvl;
  document.getElementById('choice-icon').textContent  = lvl.icon;
  document.getElementById('choice-title').textContent = lvl.title;
  document.getElementById('choice-desc').textContent  = lvl.description;
  showScreen('screen-choice');
}

document.getElementById('choice-back').addEventListener('click', loadHome);

document.getElementById('btn-watch-video').addEventListener('click', () => {
  state.watchedVideo = true;
  showVideoScreen();
});

document.getElementById('btn-skip-video').addEventListener('click', async () => {
  state.watchedVideo = false;
  await startQuiz();
});

/* ═══════════════════════ VIDEO SCREEN ═════════════════════════ */
function showVideoScreen() {
  const lvl = state.currentLevel;
  document.getElementById('video-title').textContent = `${lvl.icon} ${lvl.title}`;
  document.getElementById('video-frame').src = lvl.video_url + '?autoplay=1';
  showScreen('screen-video');
}

document.getElementById('video-back').addEventListener('click', () => {
  document.getElementById('video-frame').src = '';
  showScreen('screen-choice');
});

document.getElementById('btn-start-quiz').addEventListener('click', async () => {
  document.getElementById('video-frame').src = '';
  await startQuiz();
});

/* ═══════════════════════ QUIZ SETUP ════════════════════════════ */
async function startQuiz() {
  const lvl = state.currentLevel;

  // Create progress record
  const { id } = await api.post('/api/progress', {
    session_id: SESSION,
    level_id: lvl.id,
    watched_video: state.watchedVideo,
  });
  state.progressId = id;

  // Load questions
  const qs = await api.get(`/api/questions/level/${lvl.id}?count=12`);
  state.questions = qs;
  state.currentIndex = 0;
  state.score = 0;
  state.answered = false;

  showScreen('screen-quiz');
  renderQuestion();
}

/* ═══════════════════════ RENDER QUESTION ═══════════════════════ */
function renderQuestion() {
  const q = state.questions[state.currentIndex];
  const total = state.questions.length;
  state.answered = false;

  // Progress bar
  document.getElementById('quiz-progress-fill').style.width =
    `${((state.currentIndex) / total) * 100}%`;
  document.getElementById('quiz-progress-label').textContent =
    `${state.currentIndex + 1} / ${total}`;
  document.getElementById('quiz-score-badge').textContent = `⭐ ${state.score}`;

  // Type badge
  const badge = document.getElementById('q-type-badge');
  const typeLabels = { mcq: 'Multiple Choice', wh: 'Open Question', code: 'Code Editor', identify: 'Identify', fill: 'Fill in Blank' };
  const typeClass  = { mcq: 'badge-mcq', wh: 'badge-wh', code: 'badge-code', identify: 'badge-identify', fill: 'badge-fill' };
  badge.textContent = typeLabels[q.type] || q.type;
  badge.className = `question-type-badge ${typeClass[q.type] || ''}`;

  // Code snippet
  const snippetBox  = document.getElementById('code-snippet-box');
  const snippetText = document.getElementById('code-snippet-text');
  if (q.code_snippet) {
    snippetText.textContent = q.code_snippet;
    snippetBox.style.display = 'block';
  } else {
    snippetBox.style.display = 'none';
  }

  // Question text
  document.getElementById('question-text').textContent = q.question;

  // Hide all input zones
  hide('choices-grid');
  hide('text-answer-wrap');
  hide('code-editor-wrap');
  hide('feedback-zone');
  hide('tryit-zone');
  hide('btn-submit');
  hide('btn-next');

  // Destroy old editors
  if (state.codeEditor) { state.codeEditor.toTextArea(); state.codeEditor = null; }
  if (state.tryitEditor) { state.tryitEditor.toTextArea(); state.tryitEditor = null; }

  // Render input based on type
  if (q.type === 'mcq' || q.type === 'identify') {
    renderMCQ(q);
  } else if (q.type === 'wh' || q.type === 'fill') {
    renderTextInput(q);
  } else if (q.type === 'code') {
    renderCodeEditor(q);
  }
}

/* ─── MCQ ─── */
function renderMCQ(q) {
  const grid = document.getElementById('choices-grid');
  grid.innerHTML = '';
  grid.style.display = 'flex';
  const letters = ['A', 'B', 'C', 'D'];
  q.choices.forEach((ch, i) => {
    const item = document.createElement('div');
    item.className = 'choice-item';
    item.dataset.text = ch.text;
    item.innerHTML = `
      <span class="choice-letter">${letters[i]}</span>
      <span>${ch.text}</span>
    `;
    item.addEventListener('click', () => selectMCQChoice(item, q));
    grid.appendChild(item);
  });
}

function selectMCQChoice(item, q) {
  if (state.answered) return;
  document.querySelectorAll('.choice-item').forEach(c => c.classList.remove('selected'));
  item.classList.add('selected');
  show('btn-submit');
  document.getElementById('btn-submit').onclick = () => submitMCQ(item, q);
}

async function submitMCQ(item, q) {
  if (state.answered) return;
  state.answered = true;
  const answer = item.dataset.text;
  const result = await api.post(`/api/questions/${q.id}/answer`, { answer });

  document.querySelectorAll('.choice-item').forEach(c => {
    c.classList.add('disabled');
    if (c.dataset.text === result.correct_answer) c.classList.add('correct');
  });
  if (!result.correct) item.classList.add('wrong');

  showFeedback(result);
  if (result.correct) state.score++;
  showPostAnswerActions(q);
}

/* ─── Text input (WH / Fill) ─── */
function renderTextInput(q) {
  const wrap  = document.getElementById('text-answer-wrap');
  const input = document.getElementById('text-answer-input');
  input.value = '';
  input.className = 'text-answer-input';
  input.placeholder = q.type === 'fill' ? 'Type the missing word(s)…' : 'Type your answer…';
  wrap.style.display = 'flex';
  show('btn-submit');
  input.focus();

  const submit = () => submitText(q);
  input.onkeydown = e => { if (e.key === 'Enter') submit(); };
  document.getElementById('btn-submit').onclick = submit;
}

async function submitText(q) {
  if (state.answered) return;
  const input = document.getElementById('text-answer-input');
  const answer = input.value.trim();
  if (!answer) { input.style.animation = 'shake 0.4s ease'; setTimeout(() => (input.style.animation = ''), 400); return; }

  state.answered = true;
  const result = await api.post(`/api/questions/${q.id}/answer`, { answer });

  input.classList.add(result.correct ? 'correct' : 'wrong');
  if (!result.correct) {
    input.value = `✗  ${input.value}  →  ${result.correct_answer.replace(/[\[\]"]/g, '')}`;
  }

  showFeedback(result);
  if (result.correct) state.score++;
  showPostAnswerActions(q);
}

/* ─── Code Editor ─── */
function renderCodeEditor(q) {
  const wrap = document.getElementById('code-editor-wrap');
  wrap.style.display = 'block';
  show('btn-submit');
  hide('editor-preview');

  const ta = document.getElementById('code-editor-textarea');
  ta.value = '';

  state.codeEditor = CodeMirror.fromTextArea(ta, {
    mode: q.question.toLowerCase().includes('html') ? 'htmlmixed' : 'css',
    theme: 'dracula',
    lineNumbers: true,
    indentUnit: 2,
    tabSize: 2,
    lineWrapping: true,
    autofocus: true,
  });

  document.getElementById('btn-run-code').onclick = () => {
    const code = state.codeEditor.getValue();
    const preview = document.getElementById('editor-preview');
    const iframe  = document.getElementById('preview-iframe');
    preview.style.display = 'block';
    iframe.srcdoc = code.includes('<') ? code : `<style>${code}</style><div class="box" style="width:100px;height:100px;background:#ccc">Preview</div>`;
  };

  document.getElementById('btn-submit').onclick = () => submitCode(q);
}

async function submitCode(q) {
  if (state.answered) return;
  const answer = state.codeEditor.getValue().trim();
  if (!answer) return;
  state.answered = true;

  const result = await api.post(`/api/questions/${q.id}/answer`, { answer });
  showFeedback(result);
  if (result.correct) state.score++;
  showPostAnswerActions(q);
}

/* ─── Feedback ─── */
function showFeedback(result) {
  hide('btn-submit');
  const zone = document.getElementById('feedback-zone');
  const icon = document.getElementById('feedback-icon');
  const text = document.getElementById('feedback-text');
  const expl = document.getElementById('feedback-explanation');

  zone.className = `feedback-zone ${result.correct ? 'correct-zone' : 'wrong-zone'}`;
  icon.textContent = result.correct ? '✅' : '❌';
  text.className   = `feedback-text ${result.correct ? 'correct-text' : 'wrong-text'}`;
  text.textContent = result.correct ? 'Correct! Well done!' : 'Not quite — here\'s why:';
  expl.textContent = result.explanation;

  zone.style.display = 'flex';
}

/* ─── Post-answer: Try-it + Next ─── */
function showPostAnswerActions(q) {
  show('btn-next');

  // Show try-it playground
  const tryitZone   = document.getElementById('tryit-zone');
  const tryitToggle = document.getElementById('tryit-toggle');
  const tryitEditor = document.getElementById('tryit-editor');
  tryitZone.style.display = 'block';

  tryitToggle.onclick = () => {
    const open = tryitEditor.style.display === 'none' || tryitEditor.style.display === '';
    tryitEditor.style.display = open ? 'flex' : 'none';
    if (open && !state.tryitEditor) {
      const ta = document.getElementById('tryit-textarea');
      ta.value = '';
      state.tryitEditor = CodeMirror.fromTextArea(ta, {
        mode: 'htmlmixed',
        theme: 'dracula',
        lineNumbers: true,
        indentUnit: 2,
        lineWrapping: true,
      });
    }
  };

  document.getElementById('btn-tryit-run').onclick = () => {
    if (!state.tryitEditor) return;
    const code = state.tryitEditor.getValue();
    const iframe = document.getElementById('tryit-iframe');
    iframe.srcdoc = code.includes('<') ? code
      : `<style>${code}</style><div class="box" style="width:120px;height:120px;background:#ddd;display:flex;align-items:center;justify-content:center">Box</div>`;
  };

  document.getElementById('btn-next').onclick = nextQuestion;
}

/* ═══════════════════════ NEXT QUESTION ════════════════════════ */
function nextQuestion() {
  state.currentIndex++;
  if (state.currentIndex >= state.questions.length) {
    finishQuiz();
  } else {
    renderQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/* ═══════════════════════ FINISH QUIZ ══════════════════════════ */
async function finishQuiz() {
  const total = state.questions.length;
  const score = state.score;
  const pct   = Math.round((score / total) * 100);

  // Save to DB
  await api.patch(`/api/progress/${state.progressId}`, {
    score, total, completed: 1,
  });

  // Update streak
  const today = new Date().toDateString();
  const lastDay = localStorage.getItem('ca_last_day');
  if (lastDay !== today) {
    const streak = parseInt(localStorage.getItem('ca_streak') || '0');
    localStorage.setItem('ca_streak', streak + 1);
    localStorage.setItem('ca_last_day', today);
  }

  // Results screen
  showScreen('screen-results');

  const emoji = pct === 100 ? '🏆' : pct >= 80 ? '🎉' : pct >= 60 ? '😊' : '💪';
  document.getElementById('results-emoji').textContent = emoji;
  document.getElementById('results-title').textContent =
    pct === 100 ? 'Perfect Score!' : pct >= 80 ? 'Level Complete!' : pct >= 60 ? 'Good Effort!' : 'Keep Practicing!';
  document.getElementById('ring-score').textContent = score;
  document.getElementById('ring-total').textContent  = `/${total}`;
  document.getElementById('results-percent').textContent =
    `${pct}% correct · ${score} out of ${total} questions`;

  // Animate the ring (circumference of r=52 circle ≈ 327)
  const circum = 2 * Math.PI * 52;
  setTimeout(() => {
    const color = pct >= 80 ? '#48c78e' : pct >= 60 ? '#6c63ff' : '#f14668';
    const fill  = document.getElementById('ring-fill');
    fill.style.stroke = color;
    fill.setAttribute('stroke-dasharray', `${(pct / 100) * circum} ${circum}`);
  }, 100);

  // Confetti for great scores
  if (pct >= 80) spawnConfetti();

  // Wire retry / next level
  document.getElementById('btn-retry').onclick = () => {
    startQuizForLevel(state.currentLevel);
  };

  const currentIndex = state.levels.findIndex(l => l.id === state.currentLevel.id);
  const nextLevel = state.levels[currentIndex + 1];
  const btnNext = document.getElementById('btn-next-level');
  if (nextLevel) {
    btnNext.textContent = `Next Level →`;
    btnNext.onclick = () => openLevel(nextLevel);
    btnNext.style.display = '';
  } else {
    btnNext.textContent = '🏠 Home';
    btnNext.onclick = loadHome;
  }
}

async function startQuizForLevel(lvl) {
  state.currentLevel = lvl;
  state.watchedVideo = false;
  await startQuiz();
}

/* ═══════════════════════ CONFETTI ══════════════════════════════ */
function spawnConfetti() {
  const container = document.getElementById('confetti-container');
  container.innerHTML = '';
  const colors = ['#6c63ff','#48c78e','#f14668','#ffd700','#60a5fa','#fb923c','#a78bfa'];
  for (let i = 0; i < 80; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left        = `${Math.random() * 100}%`;
    p.style.background  = colors[Math.floor(Math.random() * colors.length)];
    p.style.width       = `${6 + Math.random() * 8}px`;
    p.style.height      = `${6 + Math.random() * 8}px`;
    p.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    p.style.animationDuration  = `${2 + Math.random() * 2.5}s`;
    p.style.animationDelay     = `${Math.random() * 0.8}s`;
    container.appendChild(p);
  }
  setTimeout(() => (container.innerHTML = ''), 5000);
}

/* ═══════════════════════ QUIZ BACK BUTTON ══════════════════════ */
document.getElementById('quiz-back').addEventListener('click', () => {
  if (confirm('Leave the quiz? Your progress for this attempt will be lost.')) {
    loadHome();
  }
});

/* ═══════════════════════ UTIL ══════════════════════════════════ */
function show(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = '';
}
function hide(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

/* ═══════════════════════ BOOT ══════════════════════════════════ */
loadHome();
