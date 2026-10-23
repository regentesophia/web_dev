const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'activity01_bento:v1';

// ---------- helpers ----------
const makeId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const daysUntil = (iso) => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((fromISO(iso) - start) / 86400000);
};
const whenText = (n) => {
  if (n < 0) return `${-n} day(s) overdue`;
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  return `in ${n} days`;
};

// ---------- storage ----------
function sampleState() {
  const soon = new Date(); soon.setDate(soon.getDate() + 3);
  const later = new Date(); later.setDate(later.getDate() + 7);
  return {
    tasks: [
      { id: makeId(), text: 'Finish the bento page', done: false },
      { id: makeId(), text: 'Review for the quiz', done: false },
      { id: makeId(), text: 'Push project to GitHub', done: true },
    ],
    deadlines: [
      { id: makeId(), text: 'Web Dev activity', date: toISO(soon) },
      { id: makeId(), text: 'Quiz', date: toISO(later) },
    ],
    note: '',
    mood: '',
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      return {
        tasks: Array.isArray(s.tasks) ? s.tasks : [],
        deadlines: Array.isArray(s.deadlines) ? s.deadlines : [],
        note: typeof s.note === 'string' ? s.note : '',
        mood: typeof s.mood === 'string' ? s.mood : '',
      };
    }
  } catch (err) { /* storage blocked or corrupted: fall through to sample data */ }
  return sampleState();
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (err) { /* ignore */ }
}

const state = loadState();

// ---------- render ----------
function renderToday() {
  const now = new Date();
  $('today-weekday').textContent = now.toLocaleDateString([], { weekday: 'long' });
  $('today-date').textContent = now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderStats() {
  const done = state.tasks.filter((t) => t.done).length;
  const total = state.tasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  $('count-todo').textContent = total - done;
  $('count-done').textContent = done;
  $('progress-fill').style.width = pct + '%';
  $('progress').setAttribute('aria-valuenow', pct);
  $('progress-label').textContent = total ? `${done}/${total} done (${pct}%)` : 'No tasks yet';
  $('bin-count').textContent = `${done} finished task(s)`;
  $('bin-empty').disabled = done === 0;
}

function makeDeleteButton(id, label) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'retro-x';
  btn.dataset.delete = id;
  btn.setAttribute('aria-label', 'Delete ' + label);
  btn.textContent = 'x';
  return btn;
}

function renderTasks() {
  const list = $('task-list');
  list.replaceChildren();
  state.tasks.forEach((t) => {
    const li = document.createElement('li');
    li.className = 'todo-item d-flex align-items-center gap-2' + (t.done ? ' is-done' : '');
    const label = document.createElement('label');
    label.className = 'd-flex align-items-center gap-2 flex-grow-1';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'retro-check';
    cb.checked = t.done;
    cb.dataset.id = t.id;
    const text = document.createElement('span');
    text.className = 'text-break';
    text.textContent = t.text;
    label.append(cb, text);
    li.append(label, makeDeleteButton(t.id, t.text));
    list.append(li);
  });
  $('task-empty').hidden = state.tasks.length > 0;
}

function sortedDeadlines() {
  return [...state.deadlines].sort((a, b) => a.date.localeCompare(b.date));
}

function renderDeadlines() {
  const list = $('deadline-list');
  list.replaceChildren();
  const sorted = sortedDeadlines();
  sorted.forEach((d) => {
    const n = daysUntil(d.date);
    const li = document.createElement('li');
    li.className = 'todo-item d-flex align-items-start gap-2' + (n < 0 ? ' is-overdue' : '');
    const body = document.createElement('div');
    body.className = 'flex-grow-1';
    const title = document.createElement('div');
    title.className = 'text-break';
    title.textContent = d.text;
    const meta = document.createElement('small');
    meta.textContent = `${fromISO(d.date).toLocaleDateString([], { month: 'short', day: 'numeric' })} - ${whenText(n)}`;
    body.append(title, meta);
    li.append(body, makeDeleteButton(d.id, d.text));
    list.append(li);
  });
  $('deadline-empty').hidden = sorted.length > 0;

  const next = sorted.find((d) => daysUntil(d.date) >= 0);
  $('next-title').textContent = next ? next.text : 'None';
  $('next-when').textContent = next ? whenText(daysUntil(next.date)) : 'No upcoming deadlines';
}

function renderMood() {
  document.querySelectorAll('.mood-btn').forEach((b) => {
    const on = b.dataset.mood === state.mood;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on);
  });
}

const QUOTES = [
  'Small steps still count.',
  'Done is better than perfect.',
  'One task at a time.',
  'Future you says thanks.',
  'Start now, polish later.',
  'Rest is part of the plan.',
];
function renderQuote() {
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  $('quote').textContent = QUOTES[dayOfYear % QUOTES.length];
}

function renderAll() {
  renderToday();
  renderStats();
  renderTasks();
  renderDeadlines();
  renderMood();
  renderQuote();
  $('note').value = state.note;
}

// ---------- tasks ----------
$('task-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = $('task-input').value.trim();
  if (!text) return;
  state.tasks.push({ id: makeId(), text, done: false });
  $('task-input').value = '';
  saveState();
  renderTasks();
  renderStats();
});

$('task-list').addEventListener('change', (e) => {
  if (!e.target.matches('input[type="checkbox"]')) return;
  const task = state.tasks.find((t) => t.id === e.target.dataset.id);
  if (!task) return;
  task.done = e.target.checked;
  saveState();
  renderTasks();
  renderStats();
});

$('task-list').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-delete]');
  if (!btn) return;
  state.tasks = state.tasks.filter((t) => t.id !== btn.dataset.delete);
  saveState();
  renderTasks();
  renderStats();
});

$('bin-empty').addEventListener('click', () => {
  state.tasks = state.tasks.filter((t) => !t.done);
  saveState();
  renderTasks();
  renderStats();
});

// ---------- deadlines ----------
$('dl-date').value = toISO(new Date());

$('deadline-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = $('dl-text').value.trim();
  const date = $('dl-date').value;
  if (!text || !date) return;
  state.deadlines.push({ id: makeId(), text, date });
  $('dl-text').value = '';
  saveState();
  renderDeadlines();
});

$('deadline-list').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-delete]');
  if (!btn) return;
  state.deadlines = state.deadlines.filter((d) => d.id !== btn.dataset.delete);
  saveState();
  renderDeadlines();
});

// ---------- note and mood ----------
$('note').addEventListener('input', (e) => {
  state.note = e.target.value;
  saveState();
});

$('mood-group').addEventListener('click', (e) => {
  const btn = e.target.closest('.mood-btn');
  if (!btn) return;
  state.mood = state.mood === btn.dataset.mood ? '' : btn.dataset.mood;
  saveState();
  renderMood();
});

// ---------- focus timer (25 minutes) ----------
const FOCUS_SECONDS = 25 * 60;
let timerLeft = FOCUS_SECONDS;
let timerId = null;

function showTimer() {
  $('timer-display').textContent = `${pad(Math.floor(timerLeft / 60))}:${pad(timerLeft % 60)}`;
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
  $('timer-toggle').textContent = 'Start';
}

$('timer-toggle').addEventListener('click', () => {
  if (timerId) { stopTimer(); return; }
  if (timerLeft === 0) timerLeft = FOCUS_SECONDS;
  $('timer-toggle').textContent = 'Pause';
  timerId = setInterval(() => {
    timerLeft -= 1;
    showTimer();
    if (timerLeft <= 0) stopTimer();
  }, 1000);
  showTimer();
});

$('timer-reset').addEventListener('click', () => {
  stopTimer();
  timerLeft = FOCUS_SECONDS;
  showTimer();
});

// ---------- taskbar clock ----------
const clock = $('clock');
let lastDay = toISO(new Date());
const tick = () => {
  const now = new Date();
  clock.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (toISO(now) !== lastDay) { // midnight rollover
    lastDay = toISO(now);
    renderToday();
    renderDeadlines();
    renderQuote();
  }
};

renderAll();
saveState();
tick();
setInterval(tick, 30000);
