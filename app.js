/* ==========================================================================
   app.js — views, study engine, practice engine, settings
   ========================================================================== */

/* ---------- tiny helpers -------------------------------------------------- */
const $  = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const sample = (arr, n) => shuffle(arr).slice(0, n);
const pct = (a, b) => b ? Math.round(100 * a / b) : 0;

const ICONS = {
  check: '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M11 4H4v16h16v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
  spark: '<svg viewBox="0 0 24 24"><path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>',
  empty: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18M8 5V3M16 5V3"/></svg>',
  loader: '<svg viewBox="0 0 24 24" class="spin"><path d="M21 12a9 9 0 1 1-6.2-8.6"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
  finish: '<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>' +
          '<path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
  bulb: '<svg viewBox="0 0 24 24"><path d="M9 18h6"/><path d="M10 22h4"/>' +
        '<path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>'
};

/* ---------- toast ---------------------------------------------------------- */
/* Keep the stack clear of a dialog's buttons: dialogs vary in height, so the
   offset is measured rather than guessed. */
function positionToasts() {
  const wrap = $('#toastWrap');
  if (!wrap) return;
  if ($('#modalHost').classList.contains('hidden')) { wrap.style.bottom = ''; return; }
  const foot = $('#modalFoot');
  const anchor = (foot && foot.offsetHeight) ? foot : $('.modal');
  if (!anchor) { wrap.style.bottom = ''; return; }
  const top = anchor.getBoundingClientRect().top;
  wrap.style.bottom = clamp(Math.round(window.innerHeight - top + 12), 22, window.innerHeight - 130) + 'px';
}

function toast(msg, type) {
  positionToasts();
  const t = document.createElement('div');
  t.className = 'toast ' + (type || 'info');
  t.innerHTML = (type === 'ok' ? ICONS.check : type === 'err' ? ICONS.x : ICONS.info) + '<span>' + esc(msg) + '</span>';
  $('#toastWrap').appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, type === 'err' ? 5200 : 2800);
}

/* ---------- modal ---------------------------------------------------------- */
let modalOnClose = null;
function openModal(opts) {
  $('#modalTitle').textContent = opts.title || '';
  $('#modalBody').innerHTML = opts.body || '';
  $('#modalFoot').innerHTML = opts.foot || '';
  $('.modal').classList.toggle('wide', !!opts.wide);
  $('#modalHost').classList.remove('hidden');
  document.body.classList.add('modal-open');
  modalOnClose = opts.onClose || null;
  if (opts.onMount) opts.onMount($('#modalBody'), $('#modalFoot'));
  positionToasts();
  const first = $('#modalBody input, #modalBody textarea, #modalBody select');
  if (first && !opts.noFocus) setTimeout(() => first.focus(), 60);
}
function closeModal() {
  $('#modalHost').classList.add('hidden');
  document.body.classList.remove('modal-open');
  positionToasts();
  $('#modalBody').innerHTML = '';
  if (modalOnClose) { const f = modalOnClose; modalOnClose = null; f(); }
}
function confirmDialog(title, message, confirmLabel, danger) {
  return new Promise(resolve => {
    openModal({
      title: title,
      body: '<p class="muted" style="line-height:1.65">' + message + '</p>',
      foot: '<button class="ghost-btn" data-act="no">Cancel</button>' +
            '<button class="' + (danger ? 'danger-btn' : 'primary-btn') + '" data-act="yes">' + esc(confirmLabel || 'Confirm') + '</button>',
      onMount: (b, f) => {
        f.querySelector('[data-act="no"]').onclick = () => { closeModal(); resolve(false); };
        f.querySelector('[data-act="yes"]').onclick = () => { closeModal(); resolve(true); };
      }
    });
  });
}

/* ---------- speech --------------------------------------------------------- */
const TTS = {
  ok: typeof speechSynthesis !== 'undefined',
  speak(text) {
    if (!this.ok || !text) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = 0.92;
      const v = speechSynthesis.getVoices().find(v => /en[-_]/i.test(v.lang));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
};

/* ---------- appearance ------------------------------------------------------ */
function applyAppearance() {
  const s = Store.state.settings;
  const r = document.documentElement;
  r.dataset.theme = s.theme; r.dataset.accent = s.accent;
  r.dataset.font = s.font;   r.dataset.size = s.size;
}

/* ---------- routing ---------------------------------------------------------- */
const VIEW_META = {
  dashboard: ['Dashboard', 'Your learning at a glance'],
  decks:     ['Decks', 'Organise your vocabulary'],
  study:     ['Study', 'Spaced repetition review'],
  practice:  ['Practice', 'Quizzes, typing and writing drills'],
  browse:    ['Browse', 'Every word you have saved'],
  stats:     ['Progress', 'How your memory is doing'],
  settings:  ['Settings', 'Appearance, study rules and AI']
};
let currentView = 'dashboard';
let viewParams = {};

function go(view, params) {
  /* Leaving a finished session behind: start clean next time. */
  if (currentView === 'study' && view !== 'study' && session && session.finished) session = null;
  if (currentView === 'practice' && view !== 'practice' && quiz && quiz.finished) quiz = null;
  currentView = view; viewParams = params || {};
  $$('.nav-item').forEach(b => b.classList.toggle('is-active', b.dataset.view === view));
  $$('.view').forEach(v => v.classList.add('hidden'));
  $('#view-' + view).classList.remove('hidden');
  $('#viewTitle').textContent = VIEW_META[view][0];
  $('#viewSub').textContent = VIEW_META[view][1];
  $('#app').classList.remove('menu-open');
  $('#scrollArea').scrollTop = 0;
  $('#toTop').classList.remove('show');
  render(view);
  refreshChrome();
}

function render(view) {
  const host = $('#view-' + view);
  ({ dashboard: renderDashboard, decks: renderDecks, study: renderStudy, practice: renderPractice,
     browse: renderBrowse, stats: renderStats, settings: renderSettings })[view](host);
}

function refreshChrome() {
  const c = Store.counts();
  const total = c.ready;
  const badge = $('#navDue');
  badge.textContent = total > 999 ? '999+' : total;
  badge.dataset.zero = total === 0 ? '1' : '0';
  const st = Store.streak();
  $('#streakDays').textContent = st.current;
  document.title = (total ? '(' + total + ') ' : '') + 'Lexio — Vocabulary Trainer';
}

/* ---------- shared bits ------------------------------------------------------ */
/* How well the word is known. Every card has exactly one level, and it says
   nothing about whether a review is due — that is shown separately, because
   a Learning card can be due or not, and so can a Mastered one. The coloured
   dot also keeps it apart from a category named "Learning" or "New". */
const LEVELS = {
  new:      { label: 'New',      cls: 'new' },
  learning: { label: 'Learning', cls: 'learning' },
  familiar: { label: 'Familiar', cls: 'familiar' },
  mastered: { label: 'Mastered', cls: 'mastered' }
};
function levelChip(card) {
  const l = LEVELS[SRS.bucket(card.srs)] || LEVELS.new;
  return '<span class="chip ' + l.cls + '"><i class="dot"></i>' + l.label + '</span>';
}

/* When the next review falls — the other half of the picture. */
function isDueNow(card) { return card.srs.state !== 'new' && SRS.isDue(card.srs); }

/* ---------- senses, collocations and relations -------------------------------
   A word with more than one important meaning stays one card per meaning, so
   each meaning keeps its own schedule. These helpers are what make the cards
   look like one word again wherever the learner sees them. */

function splitLines(v) { return String(v || '').split('\n').map(x => x.trim()).filter(Boolean); }
function splitList(v)  { return String(v || '').split(/[,;]/).map(x => x.trim()).filter(Boolean); }

function relText(card, kind) {
  return (card.related || []).filter(r => r.kind === kind).map(r => r.text).join(', ');
}
function parseRelations(synValue, antValue) {
  return splitList(synValue).map(t => ({ kind: 'syn', text: t }))
    .concat(splitList(antValue).map(t => ({ kind: 'ant', text: t })));
}

/* The short label that tells one sense from another. Falls back to the part of
   speech, which is enough whenever the senses are a noun and a verb. */
function senseLabel(card) { return (card.sense || '').trim(); }

function senseChip(card) {
  const label = senseLabel(card);
  return label ? '<span class="chip sense">' + esc(label) + '</span>' : '';
}

/* The same label under the word rather than beside it — in a narrow table
   column a chip alongside wraps unevenly and pulls the rows out of line. */
function senseSub(card) {
  const label = senseLabel(card);
  return label ? '<div class="sense-sub">' + esc(label) + '</div>' : '';
}

/* "object · 2 senses" — shown wherever a word could be mistaken for another
   card with the same spelling. */
function senseCountChip(card) {
  const n = Store.siblings(card).length;
  return n ? '<span class="chip senses" title="This word has more than one meaning">' +
    (n + 1) + ' senses</span>' : '';
}

const REL_LABEL = { syn: 'synonym', ant: 'opposite' };

function relationChips(card) {
  const rels = Store.relationsFor(card);
  if (!rels.length) return '';
  /* A solid chip is a word you have saved; a dashed one is a word you have
     only written down. Neither is clickable — following a link mid-session
     would throw you out of the session you are in. */
  return '<div class="rel-row">' + rels.map(r =>
    '<span class="chip rel ' + r.kind + (r.card ? ' known' : '') + '"' +
      ' title="' + esc(REL_LABEL[r.kind] || r.kind) +
      (r.card ? ' — saved in your collection' : ' — not saved as a word yet') + '">' +
      (r.kind === 'ant' ? '↔ ' : '≈ ') + esc(r.text) +
    '</span>').join('') + '</div>';
}

/* Everything below the answer itself — the phrases the word lives in, the words
   it sits next to, your own note. Given the same weight as the meaning they
   crowd the card, so they share one quieter strip below a hairline and sit side
   by side while there is width for it. */
function cardExtras(card) {
  const rels = Store.relationsFor(card);
  const parts = [];
  if ((card.collocations || []).length) parts.push(['Goes with', collocationList(card)]);
  if (rels.length) parts.push(['Related', relationChips(card)]);
  if (card.notes) parts.push(['Your note', '<p class="fx-note">' + esc(card.notes) + '</p>']);
  if (!parts.length) return '';
  /* One thing on its own gets the full width; two or three share columns. */
  return '<div class="fc-extras' + (parts.length === 1 ? ' one' : '') + '">' + parts.map(p =>
    '<div class="fx"><div class="fx-k">' + p[0] + '</div>' + p[1] + '</div>').join('') + '</div>';
}

function collocationList(card) {
  const list = card.collocations || [];
  if (!list.length) return '';
  return '<ul class="colloc">' + list.map(c =>
    '<li>' + highlightTerm(c, card.term) + '</li>').join('') + '</ul>';
}
function dueText(card) {
  if (card.srs.state === 'new') return 'not started';
  const diff = card.srs.due - Date.now();
  return diff <= 0 ? 'due now' : SRS.humanDays(diff);
}
function dueCell(card) {
  return isDueNow(card)
    ? '<span class="due-now">due now</span>'
    : '<span class="faint">' + dueText(card) + '</span>';
}
function deckOptions(selected, allLabel) {
  return (allLabel ? '<option value="">' + esc(allLabel) + '</option>' : '') +
    Store.state.decks.map(d => '<option value="' + d.id + '"' + (d.id === selected ? ' selected' : '') + '>' +
      esc(d.emoji + ' ' + d.name) + '</option>').join('');
}
/* ---------- finding a term inside its example sentence -------------------
   The term is often a phrase ("a piece of cake") and the sentence often
   inflects it ("put off" -> "putting off", "come up with" -> "came up with").
   Match the whole phrase, allowing a suffix on the first and last words only;
   if that fails on a phrase, allow any single word in first position so
   irregular verbs still line up. Returns [start, end] or null.
   -------------------------------------------------------------------------- */
function reEscape(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function termMatch(sentence, term) {
  if (!sentence || !term) return null;
  const words = String(term).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return null;

  const pattern = (fuzzyFirst) => words.map((w, i) => {
    if (i === 0 && fuzzyFirst) return "[A-Za-z\u00C0-\u024F']+";
    const tail = (i === 0 || i === words.length - 1) ? '\\w*' : '';
    return reEscape(w) + tail;
  }).join('\\s+');

  const attempts = words.length > 1 ? [false, true] : [false];
  for (let i = 0; i < attempts.length; i++) {
    try {
      const m = new RegExp('\\b' + pattern(attempts[i]) + '\\b', 'i').exec(sentence);
      if (m) return [m.index, m.index + m[0].length];
    } catch (e) { return null; }
  }
  return null;
}

function highlightTerm(sentence, term) {
  if (!sentence) return '';
  const at = termMatch(sentence, term);
  if (!at) return esc(sentence);
  return esc(sentence.slice(0, at[0])) +
         '<b>' + esc(sentence.slice(at[0], at[1])) + '</b>' +
         esc(sentence.slice(at[1]));
}

/* Replace the term with a gap. Returns { text, surface } — surface is the
   exact wording that was removed, which is also accepted as an answer. */
function blankOut(sentence, term) {
  const at = termMatch(sentence, term);
  if (!at) return { text: sentence + '  (____)', surface: null };
  return {
    text: sentence.slice(0, at[0]) + '____' + sentence.slice(at[1]),
    surface: sentence.slice(at[0], at[1])
  };
}
function download(filename, text, mime) {
  const blob = new Blob([text], { type: mime || 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function stamp() {
  const d = new Date();
  return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
}

/* ==========================================================================
   Charts
   ========================================================================== */
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function heatmapHTML(weeks, withMonths) {
  const days = weeks * 7;
  const hist = Store.history(days + 7);
  const start = new Date(); start.setDate(start.getDate() - (days - 1));
  while (start.getDay() !== 1) start.setDate(start.getDate() - 1);   // align to Monday
  const map = {}; hist.forEach(h => map[h.key] = h.reviews);
  const max = Math.max(10, ...hist.map(h => h.reviews));
  const today = new Date(); today.setHours(23, 59, 59, 999);

  const columns = [];
  const cur = new Date(start);
  while (cur <= today) {
    /* Midweek decides which month a column belongs to, so a week straddling
       two months is labelled with the one it mostly sits in. */
    const midweek = new Date(cur); midweek.setDate(midweek.getDate() + 3);
    const month = midweek.getMonth();
    let cells = '';
    for (let d = 0; d < 7; d++) {
      const k = cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0') + '-' + String(cur.getDate()).padStart(2, '0');
      const n = map[k] || 0;
      const lvl = n === 0 ? 0 : clamp(Math.ceil(4 * n / max), 1, 4);
      const future = cur > today;
      cells += '<div class="hm-cell" data-lvl="' + (future ? 0 : lvl) + '" title="' + k + ' · ' + n +
               ' review' + (n === 1 ? '' : 's') + '"></div>';
      cur.setDate(cur.getDate() + 1);
    }
    columns.push({ month: month, cells: cells });
  }

  /* A month name above the first column that belongs to it. The leading
     column is skipped — the range rarely starts on the 1st — and labels are
     kept at least three columns apart so they never overlap. */
  let months = '';
  if (withMonths) {
    let prev = columns.length ? columns[0].month : -1;
    let lastLabelAt = -99;
    months = '<div class="hm-months">' + columns.map((col, i) => {
      let label = '';
      if (i > 0 && col.month !== prev && i - lastLabelAt >= 3) {
        label = MONTH_NAMES[col.month]; lastLabelAt = i;
      }
      prev = col.month;
      return '<span>' + label + '</span>';
    }).join('') + '</div>';
  }

  /* Fewer weeks, bigger squares — a one-month map should not sit in a corner. */
  const cell = weeks <= 6 ? 30 : weeks <= 14 ? 20 : weeks <= 30 ? 15 : 12;
  return '<div class="heatmap-wrap" style="--hm-cell:' + cell + 'px">' + months +
    '<div class="heatmap">' + columns.map(c => '<div class="hm-col">' + c.cells + '</div>').join('') + '</div>' +
    '</div>';
}

function barChartHTML(items) {
  const max = Math.max(1, ...items.map(i => i.value));
  /* 74 % of the column is left for the bar; the rest holds the value and the date label. */
  return '<div class="chart">' + items.map(i =>
    '<div class="cbar" title="' + esc(i.title || (i.label + ': ' + i.value)) + '">' +
      (i.value ? '<em>' + i.value + '</em>' : '<em>&nbsp;</em>') +
      '<i style="height:' + (i.value ? Math.max(3, Math.round(74 * i.value / max)) : 0) + '%"></i>' +
      '<span>' + esc(i.label) + '</span>' +
    '</div>').join('') + '</div>';
}

/* How a deck's words are spread across the four levels. The old bar averaged
   SRS.strength(), which nobody could read off the screen. */
function levelBar(c) {
  const total = c.total || 1;
  const w = (n) => (100 * n / total) + '%';
  const seg = (n, colour, label) => n
    ? '<i style="width:' + w(n) + ';background:' + colour + '" title="' + n + ' ' + label + '"></i>' : '';
  return '<div class="stack-bar thin">' +
    seg(c.mastered, 'var(--good)', 'mastered') +
    seg(c.familiar, 'var(--level-familiar)', 'familiar') +
    seg(c.learning, 'var(--warn)', 'in learning') +
    seg(c.new, 'var(--surface-3)', 'not started') +
  '</div>';
}

function deckProgressRow(deck) {
  const cards = Store.cardsOf(deck.id);
  const c = Store.counts(deck.id);
  const strength = cards.length ? cards.reduce((a, x) => a + SRS.strength(x.srs), 0) / cards.length : 0;
  const nw = cards.filter(x => x.srs.state === 'new').length;
  const fam = c.familiar, mas = c.mastered;
  const lr = cards.length - nw - fam - mas;
  const w = (n) => (cards.length ? 100 * n / cards.length : 0) + '%';
  return '<div style="padding:13px 0;border-bottom:1px solid var(--border-soft)">' +
    '<div class="row between" style="margin-bottom:8px">' +
      '<div class="row" style="gap:8px"><span>' + esc(deck.emoji) + '</span><b style="font-size:.9rem">' + esc(deck.name) + '</b>' +
      (c.due ? '<span class="chip due">' + c.due + ' due</span>' : '') + '</div>' +
      '<span class="faint">' + Math.round(strength * 100) + '% learned · ' + cards.length + ' words</span>' +
    '</div>' +
    '<div class="stack-bar">' +
      '<i style="width:' + w(mas) + ';background:var(--good)"></i>' +
      '<i style="width:' + w(fam) + ';background:var(--level-familiar)"></i>' +
      '<i style="width:' + w(lr) + ';background:var(--warn)"></i>' +
      '<i style="width:' + w(nw) + ';background:var(--surface-3)"></i>' +
    '</div></div>';
}

/* ==========================================================================
   Dashboard
   ========================================================================== */
function renderDashboard(host) {
  const c = Store.counts();
  const st = Store.streak();
  const today = Store.today();
  const all = Store.state.cards;
  const known = all.filter(x => SRS.bucket(x.srs) === 'mastered' || SRS.bucket(x.srs) === 'familiar').length;
  const ret = Store.retention(30);
  const pending = c.ready;
  /* Progress through today's queue: what has been answered against what is
     answered plus what is still waiting. The old denominator was a made-up
     daily target and read like a broken ratio next to a long session. */
  const dayTotal = today.reviews + pending;
  const hour = new Date().getHours();
  const greet = hour < 5 ? 'Still up' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  host.innerHTML =
    '<div class="card" style="background:linear-gradient(135deg,var(--accent-soft),transparent 62%);border-color:var(--accent-soft);margin-bottom:18px">' +
      '<div class="row between" style="align-items:flex-start;gap:20px">' +
        '<div style="min-width:0">' +
          '<p class="faint" style="margin-bottom:4px">' + greet + '</p>' +
          '<h2 style="font-size:1.5rem;letter-spacing:-.03em">' +
            (pending ? pending + ' card' + (pending === 1 ? '' : 's') + ' waiting for you' : 'You are all caught up') +
          '</h2>' +
          '<p class="muted" style="margin-top:6px">' +
            (pending
              ? c.due + ' due now · ' + c.newAvailable + ' new word' + (c.newAvailable === 1 ? '' : 's') + ' to start'
              : 'Nothing is due right now. Practice freely or add new words.') +
          '</p>' +
          '<div class="row" style="margin-top:16px">' +
            (pending
              ? '<button class="primary-btn" data-go="study">' + ICONS.play + 'Start review session</button>'
              : '<button class="ghost-btn" data-go="practice">' + ICONS.play + 'Free practice</button>') +
            '<button class="ghost-btn" data-act="quick-add">' + ICONS.plus + 'Add a word</button>' +
          '</div>' +
        '</div>' +
        '<div style="text-align:right;flex:none">' +
          '<div style="font-size:2.6rem;font-weight:750;letter-spacing:-.04em;line-height:1">' + st.current + '</div>' +
          '<div class="faint">day streak</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="grid g4">' +
      statTile('Due now', c.due, c.due ? 'their review time has come' : 'nothing pending', true) +
      statTile('New to start', c.newAvailable, 'of ' + c.new + ' unseen · daily cap ' + Store.state.settings.newPerDay) +
      statTile('Words learned', known, 'of ' + all.length + ' total') +
      statTile('30-day recall', ret == null ? '—' : ret + '%', ret == null ? 'no data yet' : 'answers correct') +
    '</div>' +

    '<div class="grid g2" style="margin-top:16px;align-items:start">' +
      '<div class="card">' +
        '<div class="section-title" style="margin:0 0 12px"><h2>Today</h2>' +
          '<span class="hint">' + (pending
            ? pending + ' still to do'
            : today.reviews ? 'all caught up' : 'nothing due') + '</span></div>' +
        '<div class="bar"><i style="width:' +
          (dayTotal ? clamp(pct(today.reviews, dayTotal), 0, 100) : 0) + '%"></i></div>' +
        '<div class="row" style="margin-top:15px;gap:26px">' +
          '<div><div class="faint">Reviewed</div><b style="font-size:1.15rem">' + today.reviews + '</b></div>' +
          '<div><div class="faint">New seen</div><b style="font-size:1.15rem">' + today.new + '</b></div>' +
          '<div><div class="faint">Accuracy</div><b style="font-size:1.15rem">' +
            (today.reviews ? pct(today.correct, today.reviews) + '%' : '—') + '</b></div>' +
        '</div>' +
        '<div style="margin-top:20px" class="faint">Last 12 weeks</div>' +
        '<div style="margin-top:8px">' + heatmapHTML(12) + '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="section-title" style="margin:0 0 4px"><h2>Decks</h2>' +
          '<button class="soft-btn tiny" data-go="decks">Manage</button></div>' +
        (Store.state.decks.length
          ? Store.state.decks.map(deckProgressRow).join('')
          : '<div class="empty">' + ICONS.empty + '<h3>No decks yet</h3></div>') +
        '<div class="row" style="margin-top:14px;gap:14px;font-size:.72rem;color:var(--text-faint)">' +
          '<span><i class="dot" style="background:var(--good)"></i>Mastered</span>' +
          '<span><i class="dot" style="background:var(--level-familiar)"></i>Familiar</span>' +
          '<span><i class="dot" style="background:var(--warn)"></i>Learning</span>' +
          '<span><i class="dot" style="background:var(--surface-3)"></i>New</span>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="section-title"><h2>Jump back in</h2></div>' +
    '<div class="mode-grid">' +
      quickCard('practice', ICONS.play, 'Practice quiz', 'Multiple choice, typing, cloze and matching drills.') +
      quickCard('browse', '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>', 'Browse words', 'Search, edit and filter everything you have saved.') +
      quickCard('stats', '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>', 'Progress', 'Forecast, retention and your hardest words.') +
      quickCard('settings', ICONS.spark, 'Themes & AI', 'Change the look, or connect an AI assistant.') +
    '</div>';

  host.onclick = (e) => {
    const g = e.target.closest('[data-go]');
    if (g) return go(g.dataset.go);
    if (e.target.closest('[data-act="quick-add"]')) cardEditor(null);
  };
}

function statTile(label, value, sub, accent) {
  return '<div class="stat' + (accent && value ? ' accent' : '') + '">' +
    '<span class="label">' + esc(label) + '</span>' +
    '<span class="value">' + esc(String(value)) + '</span>' +
    '<span class="sub">' + esc(sub) + '</span></div>';
}
function quickCard(view, icon, title, desc) {
  return '<button class="mode-card" data-go="' + view + '">' +
    '<span class="mi">' + icon + '</span><strong>' + esc(title) + '</strong><span>' + esc(desc) + '</span></button>';
}

/* ==========================================================================
   Decks
   ========================================================================== */
function renderDecks(host) {
  if (viewParams.deckId && Store.deck(viewParams.deckId)) return renderDeckDetail(host, Store.deck(viewParams.deckId));

  host.innerHTML =
    '<div class="row between" style="margin-bottom:16px">' +
      '<p class="muted">' + Store.state.decks.length + ' decks · ' + Store.state.cards.length + ' words</p>' +
      '<div class="row">' +
        (AI.available() ? '<button class="ghost-btn" data-act="ai-deck">' + ICONS.spark + 'Generate with AI</button>' : '') +
        '<button class="primary-btn" data-act="new-deck">' + ICONS.plus + 'New deck</button>' +
      '</div>' +
    '</div>' +
    (Store.state.decks.length ?
      '<div class="deck-grid">' + Store.state.decks.map(d => {
        const cards = Store.cardsOf(d.id);
        const c = Store.counts(d.id);
        const known = c.familiar + c.mastered;
        return '<div class="deck-card" data-deck="' + d.id + '">' +
          '<div class="top"><div class="deck-emoji">' + esc(d.emoji) + '</div>' +
            '<div style="min-width:0"><h3>' + esc(d.name) + '</h3>' +
              '<div class="desc">' + esc(d.description || 'No description') + '</div></div></div>' +
          levelBar(c) +
          '<div class="deck-meta">' +
            '<span><b>' + known + '</b> of ' + cards.length + ' known</span>' +
            '<span><b style="color:' + (c.due ? 'var(--bad)' : 'inherit') + '">' + c.due + '</b> due</span>' +
            '<span><b>' + c.new + '</b> new</span>' +
          '</div></div>';
      }).join('') + '</div>'
      : '<div class="card"><div class="empty">' + ICONS.empty +
        '<h3>No decks yet</h3><p class="faint">Create a deck to start collecting words.</p>' +
        '<button class="primary-btn" data-act="new-deck">' + ICONS.plus + 'New deck</button></div></div>');

  host.onclick = (e) => {
    if (e.target.closest('[data-act="new-deck"]')) return deckEditor(null);
    if (e.target.closest('[data-act="ai-deck"]')) return aiDeckDialog();
    const d = e.target.closest('[data-deck]');
    if (d) go('decks', { deckId: d.dataset.deck });
  };
}

function renderDeckDetail(host, deck) {
  const cards = Store.cardsOf(deck.id);
  const c = Store.counts(deck.id);
  $('#viewTitle').textContent = deck.emoji + ' ' + deck.name;
  $('#viewSub').textContent = cards.length + ' words · ' + c.due + ' due now · ' + c.new + ' not started';

  host.innerHTML =
    '<div class="row between" style="margin-bottom:18px">' +
      '<button class="soft-btn" data-act="back">' + ICONS.back + 'All decks</button>' +
      '<div class="row">' +
        '<button class="soft-btn" data-act="edit-deck">' + ICONS.edit + 'Edit</button>' +
        '<button class="ghost-btn" data-act="add-card">' + ICONS.plus + 'Add word</button>' +
        '<button class="primary-btn" data-act="study">' + ICONS.play + 'Study this deck</button>' +
      '</div>' +
    '</div>' +
    '<div class="grid g4" style="margin-bottom:18px">' +
      statTile('Words', cards.length, 'in this deck') +
      statTile('Due now', c.due, 'their review time has come', true) +
      statTile('New', c.new, 'not started yet') +
      statTile('Mastered', c.mastered, 'recalled after 21+ days') +
    '</div>' +
    (deck.description ? '<p class="muted" style="margin-bottom:16px">' + esc(deck.description) + '</p>' : '') +
    (cards.length
      ? '<div class="table-wrap">' + cardTable(cards) + '</div>'
      : '<div class="card"><div class="empty">' + ICONS.empty + '<h3>This deck is empty</h3>' +
        '<button class="primary-btn" data-act="add-card">' + ICONS.plus + 'Add the first word</button></div></div>');

  host.onclick = (e) => {
    if (e.target.closest('[data-act="back"]')) return go('decks', {});
    if (e.target.closest('[data-act="edit-deck"]')) return deckEditor(deck);
    if (e.target.closest('[data-act="add-card"]')) return cardEditor(null, deck.id);
    if (e.target.closest('[data-act="study"]')) return go('study', { deckId: deck.id });
    handleCardRowClick(e);
  };
}

function cardTable(cards) {
  return '<table class="table"><thead><tr>' +
    '<th class="col-word">Word</th><th class="col-type">Type</th>' +
    '<th class="col-meaning">Meaning</th><th class="col-translation">Translation</th>' +
    '<th class="col-category">Category</th><th class="col-level">Level</th>' +
    '<th class="col-next">Next review</th><th class="col-actions"></th>' +
    '</tr></thead><tbody>' +
    cards.map(c =>
      '<tr data-card="' + c.id + '">' +
        '<td class="term col-word">' + esc(c.term) + senseSub(c) + '</td>' +
        '<td class="col-type">' + (c.pos ? '<span class="chip pos">' + esc(c.pos) + '</span>' : '') + '</td>' +
        '<td class="muted col-meaning"><span class="clamp2">' + esc(c.definition || '') + '</span></td>' +
        '<td class="col-translation"><span class="clamp2">' + esc(c.translation) + '</span></td>' +
        '<td class="col-category">' + (c.category ? '<span class="chip cat">' + esc(c.category) + '</span>' : '') + '</td>' +
        '<td class="col-level">' + levelChip(c) + '</td>' +
        '<td class="col-next">' + dueCell(c) + '</td>' +
        '<td class="col-actions"><div class="tr-actions">' +
          '<button class="icon-btn" data-edit="' + c.id + '" title="Edit">' + ICONS.edit + '</button>' +
          '<button class="icon-btn" data-del="' + c.id + '" title="Delete">' + ICONS.trash + '</button>' +
        '</div></td>' +
      '</tr>').join('') +
    '</tbody></table>';
}

function handleCardRowClick(e) {
  const ed = e.target.closest('[data-edit]');
  if (ed) return cardEditor(Store.card(ed.dataset.edit));
  const del = e.target.closest('[data-del]');
  if (del) {
    const card = Store.card(del.dataset.del);
    return confirmDialog('Delete word', 'Remove <b>' + esc(card.term) + '</b> and its review history? This cannot be undone.',
      'Delete', true).then(ok => { if (ok) { Store.deleteCard(card.id); toast('Word deleted', 'ok'); render(currentView); refreshChrome(); } });
  }
  const row = e.target.closest('[data-card]');
  if (row) cardEditor(Store.card(row.dataset.card));
}

/* ==========================================================================
   Editors
   ========================================================================== */
function deckEditor(deck) {
  const isNew = !deck;
  openModal({
    title: isNew ? 'New deck' : 'Edit deck',
    body:
      '<div class="inline-fields">' +
        '<div class="field"><label>Deck name</label><input type="text" id="dName" value="' + esc(deck ? deck.name : '') + '" placeholder="e.g. Business English"></div>' +
        '<div class="field"><label>Icon</label><input type="text" id="dEmoji" maxlength="4" value="' + esc(deck ? deck.emoji : '📘') + '"></div>' +
      '</div>' +
      '<div class="field"><label>Description</label>' +
      '<textarea id="dDesc" placeholder="What is this deck for?">' + esc(deck ? deck.description : '') + '</textarea></div>',
    foot:
      (isNew ? '' : '<button class="danger-btn" data-act="del">Delete deck</button><div class="spacer"></div>') +
      '<button class="ghost-btn" data-act="cancel">Cancel</button>' +
      '<button class="primary-btn" data-act="save">' + (isNew ? 'Create deck' : 'Save') + '</button>',
    onMount: (b, f) => {
      f.querySelector('[data-act="cancel"]').onclick = closeModal;
      f.querySelector('[data-act="save"]').onclick = () => {
        const name = $('#dName').value.trim();
        if (!name) return toast('Give the deck a name', 'err');
        const patch = { name: name, emoji: $('#dEmoji').value.trim() || '📘', description: $('#dDesc').value.trim() };
        if (isNew) Store.addDeck(patch); else Store.updateDeck(deck.id, patch);
        closeModal(); toast(isNew ? 'Deck created' : 'Deck saved', 'ok'); render(currentView); refreshChrome();
      };
      const d = f.querySelector('[data-act="del"]');
      if (d) d.onclick = async () => {
        const n = Store.cardsOf(deck.id).length;
        closeModal();
        const ok = await confirmDialog('Delete deck',
          'Delete <b>' + esc(deck.name) + '</b> and its ' + n + ' word' + (n === 1 ? '' : 's') + '? This cannot be undone.',
          'Delete everything', true);
        if (ok) { Store.deleteDeck(deck.id, true); toast('Deck deleted', 'ok'); go('decks', {}); }
      };
    }
  });
}

/* How many of the folded fields this card already uses — decides whether the
   section opens by itself, and is shown on the summary so nothing is hidden
   without a trace. */
function extrasFilled(card) {
  if (!card) return 0;
  return (card.collocations || []).length + (card.related || []).length + (card.notes ? 1 : 0);
}

function cardEditor(card, presetDeck) {
  const isNew = !card;
  const cats = Store.categories();
  openModal({
    wide: true,
    title: isNew ? 'Add a word' : 'Edit word',
    body:
      '<div class="inline-fields">' +
        '<div class="field"><label>Word or phrase <em class="req">required</em></label>' +
          '<input type="text" id="cTerm" value="' + esc(card ? card.term : '') + '" placeholder="e.g. reliable">' +
          '<span class="help" id="dupHint"></span></div>' +
        '<div class="field"><label>Part of speech <em class="req">required</em></label><select id="cPos">' +
          '<option value="">—</option>' +
          PARTS_OF_SPEECH.map(p => '<option' + (card && card.pos === p ? ' selected' : '') + '>' + p + '</option>').join('') +
        '</select></div>' +
      '</div>' +
      /* Only shown once the word turns out to have more than one sense —
         most words never need it, so it stays out of the way until then. */
      '<div class="field hidden" id="senseRow"><label>Sense label</label>' +
        '<input type="text" id="cSense" value="' + esc(card ? (card.sense || '') : '') + '" placeholder="e.g. to protest">' +
        '<span class="help" id="senseHelp"></span></div>' +
      (AI.available()
        ? '<button class="ghost-btn tiny" id="aiFill" style="margin:-4px 0 14px">' + ICONS.spark + 'Auto-fill the rest with AI</button>'
        : '<p class="faint" style="margin:-4px 0 14px">Tip: connect an AI assistant in Settings to fill these fields automatically.</p>') +
      '<div class="field"><label>Meaning (English definition) <em class="req">required</em></label>' +
        '<textarea id="cDef" placeholder="A clear, short definition">' + esc(card ? card.definition : '') + '</textarea></div>' +
      '<div class="field"><label>Example sentence</label>' +
        '<textarea id="cEx" placeholder="A natural sentence that contains the word">' + esc(card ? card.example : '') + '</textarea>' +
        '<span class="help">Used for fill-in-the-blank practice, so keep the word inside the sentence.</span></div>' +
      '<div class="inline-fields">' +
        '<div class="field"><label>Translation</label>' +
          '<input type="text" id="cTr" value="' + esc(card ? card.translation : '') + '" placeholder="Turkish meaning"></div>' +
        '<div class="field"><label>Category</label>' +
          '<input type="text" id="cCat" list="catList" value="' + esc(card ? card.category : '') + '" placeholder="e.g. Work">' +
          '<datalist id="catList">' + cats.map(c => '<option value="' + esc(c) + '">').join('') + '</datalist></div>' +
      '</div>' +
      '<div class="field deck-field"><label>Deck</label><select id="cDeck">' +
        deckOptions(card ? card.deckId : (presetDeck || (Store.state.decks[0] || {}).id)) + '</select></div>' +
      /* Everything a word can have but most words do not. Folded away so the
         form stays the five fields you actually fill in, and opened on its own
         for a card that already carries something down here. */
      '<details class="more-fields"' + (extrasFilled(card) ? ' open' : '') + '>' +
        '<summary>More fields' +
          (extrasFilled(card) ? '<span class="more-count">' + extrasFilled(card) + '</span>' : '') +
        '</summary>' +
        '<div class="more-body">' +
          '<div class="field"><label>Collocations</label>' +
            '<textarea id="cColl" rows="2" placeholder="make a decision&#10;take a decision">' +
              esc(card ? (card.collocations || []).join('\n') : '') + '</textarea>' +
            '<span class="help">One per line — the word\u2019s usual partners.</span></div>' +
          '<div class="inline-fields">' +
            '<div class="field"><label>Synonyms</label>' +
              '<input type="text" id="cSyn" value="' + esc(card ? relText(card, 'syn') : '') + '" placeholder="reliable, trustworthy"></div>' +
            '<div class="field"><label>Antonyms</label>' +
              '<input type="text" id="cAnt" value="' + esc(card ? relText(card, 'ant') : '') + '" placeholder="unreliable"></div>' +
          '</div>' +
          '<div id="relLinks"></div>' +
          '<div class="field"><label>Personal note</label>' +
            '<input type="text" id="cNote" value="' + esc(card ? card.notes : '') + '" placeholder="A memory hook, a false friend…"></div>' +
        '</div>' +
      '</details>' +
      (card ? '<p class="faint">Status: ' + card.srs.state + ' · seen ' + card.stats.seen + ' times · ' +
        card.stats.correct + ' correct / ' + card.stats.wrong + ' wrong · next ' + dueText(card) + '</p>' : '') +
      '<div id="dupWarn"></div>',
    foot:
      (isNew ? '' : '<button class="danger-btn" data-act="del">Delete</button>') +
      '<div class="spacer"></div>' +
      '<button class="ghost-btn" data-act="cancel">Cancel</button>' +
      (isNew ? '<button class="ghost-btn" data-act="save-more">Save &amp; add another</button>' : '') +
      '<button class="primary-btn" data-act="save">Save</button>',
    onMount: (b, f) => {
      const read = () => ({
        term: $('#cTerm').value.trim(), pos: $('#cPos').value, definition: $('#cDef').value.trim(),
        example: $('#cEx').value.trim(), translation: $('#cTr').value.trim(),
        category: $('#cCat').value.trim(), deckId: $('#cDeck').value, notes: $('#cNote').value.trim(),
        sense: $('#cSense').value.trim(),
        collocations: splitLines($('#cColl').value),
        related: parseRelations($('#cSyn').value, $('#cAnt').value)
      });
      /* A card is only useful if it has the word, what kind of word it is and
         what it means — the drills need all three. */
      const missingFields = (data) => {
        const missing = [];
        if (!data.term) missing.push(['cTerm', 'the word']);
        if (!data.pos) missing.push(['cPos', 'a part of speech']);
        if (!data.definition) missing.push(['cDef', 'a meaning']);
        return missing;
      };

      const markMissing = (missing) => {
        ['cTerm', 'cPos', 'cDef'].forEach(id => {
          const el = $('#' + id);
          if (el) el.classList.toggle('invalid', missing.some(m => m[0] === id));
        });
        if (missing.length) $('#' + missing[0][0]).focus();
      };

      /* The same spelling can be two words — object the noun and object the
         verb — so a repeat is not a mistake to block but a second sense to
         label. The first save shows what is already saved under that spelling
         and asks for a label; a second, deliberate click goes through. */
      let senseAcknowledged = false;

      const senseNotice = (siblings) => {
        const rows = siblings.slice(0, 4).map(d => {
          const deck = Store.deck(d.deckId);
          return '<div class="row between" style="padding:7px 0;border-top:1px solid var(--border-soft)">' +
            '<div style="min-width:0"><b>' + esc(d.term) + '</b>' +
              (d.pos ? ' <span class="chip pos">' + esc(d.pos) + '</span>' : '') +
              senseChip(d) +
              '<div class="faint">' + esc(d.definition || d.translation || 'no meaning saved') + '</div></div>' +
            '<span class="faint">' + esc(deck ? deck.emoji + ' ' + deck.name : 'no deck') + '</span></div>';
        }).join('');
        $('#dupWarn').innerHTML =
          '<div class="feedback no" style="margin-top:4px">' +
            '<b>You already have ' + esc(siblings[0].term) + '.</b> If this is another meaning of the ' +
            'same word, give both a short sense label so you can tell them apart while studying. ' +
            'Each sense keeps its own review schedule.' +
            rows +
            '<div class="row end" style="margin-top:10px">' +
              '<button class="soft-btn tiny" data-act="open-dup">Open the existing word</button>' +
            '</div>' +
          '</div>';
        const open = $('#dupWarn [data-act="open-dup"]');
        if (open) open.onclick = () => { closeModal(); setTimeout(() => cardEditor(siblings[0]), 60); };
        $('#dupWarn').scrollIntoView({ block: 'nearest' });
      };

      const setSaveLabel = (text) => {
        const btn = f.querySelector('[data-act="save"]');
        if (btn) btn.textContent = text;
      };

      /* Returns true when saving may go ahead. */
      const persist = () => {
        const data = read();
        const missing = missingFields(data);
        if (missing.length) {
          markMissing(missing);
          toast('Still needs ' + missing.map(m => m[1]).join(' and '), 'err');
          return false;
        }
        markMissing([]);
        const siblings = Store.sensesOf(data.term, card && card.id);
        if (siblings.length && !senseAcknowledged) {
          senseAcknowledged = true;
          senseNotice(siblings);
          setSaveLabel('Save as another sense');
          toast('"' + data.term + '" is already saved — check below', 'err');
          return false;
        }
        if (isNew) Store.addCard(data); else Store.updateCard(card.id, data);
        return true;
      };
      f.querySelector('[data-act="cancel"]').onclick = closeModal;
      f.querySelector('[data-act="save"]').onclick = () => {
        if (!persist()) return;
        closeModal(); toast(isNew ? 'Word added' : 'Word saved', 'ok'); render(currentView); refreshChrome();
      };
      const more = f.querySelector('[data-act="save-more"]');
      if (more) more.onclick = () => {
        const deckId = $('#cDeck').value;
        if (!persist()) return;
        toast('Word added', 'ok'); refreshChrome();
        closeModal(); cardEditor(null, deckId);
      };
      const del = f.querySelector('[data-act="del"]');
      if (del) del.onclick = async () => {
        closeModal();
        const ok = await confirmDialog('Delete word', 'Remove <b>' + esc(card.term) + '</b>?', 'Delete', true);
        if (ok) { Store.deleteCard(card.id); toast('Word deleted', 'ok'); render(currentView); refreshChrome(); }
      };
      const fill = $('#aiFill');
      if (fill) fill.onclick = async () => {
        const term = $('#cTerm').value.trim();
        if (!term) return toast('Type the word first', 'err');
        const original = fill.innerHTML;
        fill.disabled = true; fill.innerHTML = ICONS.loader + 'Asking the AI…';
        try {
          const r = await AI.enrich(term, $('#cDef').value.trim());
          if (r.pos && !$('#cPos').value) $('#cPos').value = PARTS_OF_SPEECH.indexOf(r.pos) !== -1 ? r.pos : '';
          if (r.definition) $('#cDef').value = r.definition;
          if (r.example) $('#cEx').value = r.example;
          if (r.translation) $('#cTr').value = r.translation;
          if (r.category && !$('#cCat').value) $('#cCat').value = r.category;
          toast('Filled in by AI — check it before saving', 'ok');
        } catch (err) { toast(err.message, 'err'); }
        fill.disabled = false; fill.innerHTML = original;
      };
      /* Reveal the sense label the moment the word turns out to have more than
         one meaning, and say which meanings are already saved. */
      const hint = $('#dupHint');
      const senseRow = $('#senseRow');
      const checkSenses = () => {
        const siblings = Store.sensesOf($('#cTerm').value, card && card.id);
        const has = siblings.length > 0 || !!$('#cSense').value.trim();
        senseRow.classList.toggle('hidden', !has);
        if (!siblings.length) { hint.textContent = ''; hint.classList.remove('warn'); return; }
        const labelled = siblings.filter(d => senseLabel(d)).map(d => senseLabel(d));
        $('#senseHelp').textContent = labelled.length
          ? 'Already saved: ' + labelled.join(', ') + '.'
          : 'Give each meaning a short label so you can tell them apart.';
        hint.textContent = siblings.length === 1
          ? 'One other sense of this word is saved.'
          : siblings.length + ' other senses of this word are saved.';
        hint.classList.add('warn');
      };

      /* Which synonyms and antonyms point at words you actually have. */
      const showLinks = () => {
        const draft = Object.assign({}, card || {},
          { term: $('#cTerm').value.trim(), related: parseRelations($('#cSyn').value, $('#cAnt').value) });
        const rels = Store.relationsFor(draft);
        const linked = rels.filter(r => r.card);
        $('#relLinks').innerHTML = rels.length
          ? '<p class="faint" style="margin:-8px 0 14px">' +
              (linked.length ? linked.length + ' of ' + rels.length + ' linked to words you have. ' : '') +
              'Words you have not added yet are kept as plain text.</p>'
          : '';
      };
      ['cTerm', 'cPos', 'cDef'].forEach(id => {
        const el = $('#' + id);
        if (el) el.addEventListener('input', () => el.classList.remove('invalid'));
        if (el && el.tagName === 'SELECT') el.addEventListener('change', () => el.classList.remove('invalid'));
      });
      const t = $('#cTerm');
      if (t) {
        t.addEventListener('input', () => {
          senseAcknowledged = false;
          $('#dupWarn').innerHTML = '';
          setSaveLabel('Save');
          checkSenses();
          showLinks();
        });
        t.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); const a = $('#aiFill'); if (a) a.click(); } };
      }
      ['cSyn', 'cAnt'].forEach(id => { const el = $('#' + id); if (el) el.addEventListener('input', showLinks); });
      checkSenses();
      showLinks();
    }
  });
}

/* AI: build a whole deck from a topic. */
function aiDeckDialog() {
  openModal({
    title: 'Generate a deck with AI',
    body:
      '<div class="field"><label>Topic</label>' +
        '<input type="text" id="gTopic" placeholder="e.g. job interviews, cooking, medical English"></div>' +
      '<div class="inline-fields">' +
        '<div class="field"><label>Level</label><select id="gLevel">' +
          ['A2', 'B1', 'B2', 'C1'].map(l => '<option' + (l === 'B2' ? ' selected' : '') + '>' + l + '</option>').join('') +
        '</select></div>' +
        '<div class="field"><label>How many words</label><select id="gCount">' +
          [10, 15, 20, 30].map(n => '<option' + (n === 15 ? ' selected' : '') + '>' + n + '</option>').join('') +
        '</select></div>' +
      '</div>' +
      '<p class="faint">The AI writes the definition, example sentence and translation for each word. ' +
      'You can edit anything afterwards.</p>' +
      '<div id="gOut"></div>',
    foot: '<button class="ghost-btn" data-act="cancel">Cancel</button>' +
          '<button class="primary-btn" data-act="go">' + ICONS.spark + 'Generate</button>',
    onMount: (b, f) => {
      f.querySelector('[data-act="cancel"]').onclick = closeModal;
      f.querySelector('[data-act="go"]').onclick = async () => {
        const topic = $('#gTopic').value.trim();
        if (!topic) return toast('Enter a topic', 'err');
        const btn = f.querySelector('[data-act="go"]');
        btn.disabled = true; btn.innerHTML = ICONS.loader + 'Writing cards…';
        $('#gOut').innerHTML = '<div class="ai-thinking">' + ICONS.loader + 'This usually takes 10–30 seconds…</div>';
        try {
          const cards = await AI.suggestCards(topic, $('#gLevel').value, parseInt($('#gCount').value, 10));
          if (!cards.length) throw new Error('The AI did not return any cards.');
          const deck = Store.addDeck({ name: cap(topic), emoji: '✨', description: 'Generated with AI · ' + $('#gLevel').value });
          cards.forEach(c => Store.addCard({
            deckId: deck.id, term: c.term, pos: c.pos, definition: c.definition,
            example: c.example, translation: c.translation, category: c.category || cap(topic)
          }, true));
          Store.saveNow();
          closeModal(); toast('Created "' + deck.name + '" with ' + cards.length + ' words', 'ok');
          go('decks', { deckId: deck.id });
        } catch (err) {
          $('#gOut').innerHTML = '<div class="feedback no">' + esc(err.message) + '</div>';
          btn.disabled = false; btn.innerHTML = ICONS.spark + 'Try again';
        }
      };
    }
  });
}

/* ==========================================================================
   Study — spaced repetition session
   ========================================================================== */
let session = null;

function renderStudy(host) {
  /* finished wins: quitting early leaves cards in the queue but must still
     show the summary rather than redrawing the card. */
  if (session && session.finished) return drawStudySummary(host);
  if (session && session.queue.length) return drawStudyCard(host);
  drawStudySetup(host);
}

function drawStudySetup(host) {
  const deckId = viewParams.deckId || '';
  const c = Store.counts(deckId || null);
  const ready = c.ready;
  const deck = deckId ? Store.deck(deckId) : null;

  host.innerHTML =
    '<div class="study-wrap">' +
      '<div class="card" style="text-align:center;padding:34px 26px">' +
        '<div style="font-size:2.6rem;margin-bottom:6px">' + (ready ? (deck ? deck.emoji : '🧠') : '🎉') + '</div>' +
        '<h2 style="font-size:1.35rem">' + (ready ? 'Ready when you are' : 'Nothing due right now') + '</h2>' +
        '<p class="muted" style="margin-top:8px;max-width:420px;margin-inline:auto">' +
          (ready
            ? 'This session has ' + ready + ' card' + (ready === 1 ? '' : 's') + '. Rate how well you remembered each one and Lexio schedules the next review for you.'
            : 'Every card is scheduled for a later date. Studying ahead brings the next ones forward anyway — useful before an exam, though it does not help your long-term memory as much as waiting.') +
        '</p>' +
        '<div class="counts" style="justify-content:center;margin:20px 0 8px">' +
          '<span class="c-due">' + c.due + ' due now</span>' +
          '<span class="c-new">' + c.newAvailable + ' new</span>' +
        '</div>' +
        (c.dueLearning
          ? '<p class="faint" style="margin-bottom:14px">' + c.dueLearning + ' of them ' +
            (c.dueLearning === 1 ? 'is' : 'are') + ' still in short-term learning steps</p>'
          : '<div style="height:12px"></div>') +
        '<div class="field" style="max-width:320px;margin:0 auto 16px;text-align:left">' +
          '<label>Deck</label><select id="sDeck">' + deckOptions(deckId, 'All decks') + '</select></div>' +
        '<div class="row" style="justify-content:center">' +
          (ready
            ? '<button class="primary-btn" data-act="start">' + ICONS.play + 'Start session</button>'
            : '<button class="ghost-btn" data-act="ahead">Study ahead anyway</button>' +
              '<button class="primary-btn" data-go="practice">' + ICONS.play + 'Practice instead</button>') +
        '</div>' +
      '</div>' +
      '<div class="card pad-sm">' +
        '<div class="faint" style="margin-bottom:8px">Keyboard</div>' +
        '<div class="shortcut-row"><span>Reveal the answer</span><kbd>Space</kbd></div>' +
        '<div class="shortcut-row"><span>Rate: again / hard / good / easy</span><span><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd></span></div>' +
        '<div class="shortcut-row"><span>Hear the word</span><kbd>S</kbd></div>' +
        '<div class="shortcut-row"><span>Undo the last answer</span><kbd>U</kbd></div>' +
      '</div>' +
    '</div>';

  host.onclick = (e) => {
    const g = e.target.closest('[data-go]'); if (g) return go(g.dataset.go);
    if (e.target.closest('[data-act="start"]')) return startSession($('#sDeck').value || null, false);
    if (e.target.closest('[data-act="ahead"]')) return startSession($('#sDeck').value || null, true);
  };
  const sel = $('#sDeck');
  if (sel) sel.onchange = () => go('study', { deckId: sel.value });
}

function startSession(deckId, ahead) {
  const queue = Store.queue(deckId, { ahead: ahead });
  if (!queue.length) {
    return toast(Store.cardsOf(deckId).length
      ? 'Every word in this deck is already scheduled — nothing left to bring forward'
      : 'This deck has no words yet', 'err');
  }
  session = {
    deckId: deckId, ahead: !!ahead, queue: queue.slice(0, ahead ? 60 : queue.length),
    total: 0, done: 0, again: 0, good: 0, revealed: false,
    startedAt: Date.now(), undo: null, counts: {}
  };
  session.total = session.queue.length;
  render('study');
}

function endSession() {
  if (session) session.finished = true;
  render('study'); refreshChrome();
}

function currentCard() { return session && session.queue[0]; }

function drawStudyCard(host) {
  const card = currentCard();
  const s = Store.state.settings;

  /* Which side of the card leads. The two reverse directions both ask for the
     English word, but from different starting points — the translation, or
     the English definition. Fall back when a card lacks one of them. */
  let dir = s.studyDirection;
  if (dir === 'mixed') {
    const options = ['term-first', 'translation-first', 'definition-first'];
    dir = options[(card.id.charCodeAt(0) + session.done) % options.length];
  }
  if (dir === 'translation-first' && !card.translation) dir = card.definition ? 'definition-first' : 'term-first';
  if (dir === 'definition-first' && !card.definition) dir = card.translation ? 'translation-first' : 'term-first';

  const askTerm = dir !== 'term-first';          // the English word is the answer
  const remaining = session.queue.length;
  const progress = pct(session.done, session.done + remaining);
  const prev = SRS.preview(card.srs);
  const deck = Store.deck(card.deckId);

  /* Context on the front. When the word itself is on show, blanking it out of
     its own sentence says nothing — highlight it in place instead. Only when
     the word is what you are being asked to recall does the gap belong. */
  const frontExample = (s.showExampleOnFront && card.example)
    ? '<p class="fc-example" style="margin-top:16px">' +
      (askTerm ? esc(blankOut(card.example, card.term).text) : highlightTerm(card.example, card.term)) +
      '</p>' : '';

  /* A translation is a word, so it gets the same weight as the English word it
     stands in for; a definition is a sentence and reads better one size down. */
  /* Asking "what does object mean?" is unanswerable while the word has three
     meanings — the part of speech and the sense label are what make it a
     question rather than a guess. They give away no meaning of their own. */
  const senseCue = (!askTerm && Store.siblings(card).length)
    ? '<div class="fc-sense">' + (card.pos ? '<span class="chip pos">' + esc(card.pos) + '</span>' : '') +
      senseChip(card) + '</div>' : '';

  const front = !askTerm
    ? '<div class="row" style="gap:12px;align-items:center">' +
        '<div class="fc-term">' + esc(card.term) + '</div>' +
        (TTS.ok ? '<button class="icon-btn tts-btn" data-act="say" title="Pronounce">' + ICONS.sound + '</button>' : '') +
      '</div>' + senseCue + frontExample
    : dir === 'translation-first'
      ? '<div class="fc-term">' + esc(card.translation) + '</div>' + frontExample
      : '<div class="fc-prompt">' + esc(card.definition) + '</div>' + frontExample;

  const back =
    '<div class="fc-body">' +
      (askTerm
        ? '<div class="fc-block"><div class="k">Word</div><div class="row" style="gap:10px">' +
            '<span class="fc-term" style="font-size:1.7rem">' + esc(card.term) + '</span>' +
            (TTS.ok ? '<button class="icon-btn tts-btn" data-act="say">' + ICONS.sound + '</button>' : '') +
          '</div></div>'
        : '') +
      /* Skip whatever was already on the front. */
      (card.definition && dir !== 'definition-first'
        ? '<div class="fc-block"><div class="k">Meaning</div><div class="v big">' + esc(card.definition) + '</div></div>' : '') +
      (card.example ? '<div class="fc-block"><div class="k">Example</div><div class="v fc-example">' + highlightTerm(card.example, card.term) + '</div></div>' : '') +
      (card.translation && dir !== 'translation-first'
        ? '<div class="fc-block"><div class="k">Translation</div><div class="v">' + esc(card.translation) + '</div></div>' : '') +
      cardExtras(card) +
    '</div>';

  host.innerHTML =
    '<div class="study-wrap">' +
      '<div class="study-head">' +
        '<button class="soft-btn tiny end-btn" data-act="quit">' + ICONS.finish +
          '<span>End session</span></button>' +
        '<div class="bar" style="flex:1"><i style="width:' + progress + '%"></i></div>' +
        '<div class="counts"><span class="c-due">' + remaining + ' left</span>' +
          (session.ahead ? '<span class="c-new">ahead of schedule</span>' : '') + '</div>' +
        (session.undo && Store.canUndo() ? '<button class="soft-btn tiny" data-act="undo">Undo</button>' : '') +
      '</div>' +

      '<div class="flashcard">' +
        '<div class="fc-top">' +
          levelChip(card) +
          (card.pos ? '<span class="chip pos">' + esc(card.pos) + '</span>' : '') +
          (card.category ? '<span class="chip cat">' + esc(card.category) + '</span>' : '') +
          '<div class="spacer"></div>' +
          (deck ? '<span class="faint">' + esc(deck.emoji + ' ' + deck.name) + '</span>' : '') +
        '</div>' +
        front +
        (session.revealed ? back : '<div class="fc-hint">Press <kbd>Space</kbd> or tap the button below</div>') +
      '</div>' +

      (session.revealed
        ? '<div class="rate-row">' +
            rateBtn(1, 'Again', prev[1], 'again') + rateBtn(2, 'Hard', prev[2], 'hard') +
            rateBtn(3, 'Good', prev[3], 'good') + rateBtn(4, 'Easy', prev[4], 'easy') +
          '</div>'
        : '<button class="primary-btn" style="width:100%;padding:14px" data-act="reveal">Show answer</button>') +

      '<div class="row between faint">' +
        '<span>' + session.done + ' answered · ' + Math.round((Date.now() - session.startedAt) / 60000) + ' min</span>' +
        '<button class="soft-btn tiny" data-act="edit">Edit this card</button>' +
      '</div>' +
    '</div>';

  if (s.autoSpeak && !askTerm && !session.spoke) { TTS.speak(card.term); session.spoke = true; }

  host.onclick = (e) => {
    if (e.target.closest('[data-act="say"]')) return TTS.speak(card.term);
    if (e.target.closest('[data-act="reveal"]')) return revealCard();
    if (e.target.closest('[data-act="quit"]')) return endSession();
    if (e.target.closest('[data-act="undo"]')) return undoAnswer();
    if (e.target.closest('[data-act="edit"]')) return cardEditor(card);
    const r = e.target.closest('[data-rate]');
    if (r) rateCard(parseInt(r.dataset.rate, 10));
  };
}

function rateBtn(n, label, delay, cls) {
  return '<button class="rate ' + cls + '" data-rate="' + n + '">' +
    '<span>' + label + '</span><small>' + delay + '</small><kbd>' + n + '</kbd></button>';
}

function revealCard() {
  if (!session || session.revealed) return;
  session.revealed = true;
  const card = currentCard();
  if (Store.state.settings.autoSpeak && card) TTS.speak(card.term);
  render('study');
}

function rateCard(rating) {
  if (!session || !session.revealed) return;
  const card = session.queue[0];
  Store.review(card.id, rating, 'review');
  session.undo = { cardId: card.id, rating: rating };
  session.done++;
  session.counts[card.id] = (session.counts[card.id] || 0) + 1;
  if (rating === 1) session.again++; else session.good++;
  session.revealed = false; session.spoke = false;
  session.queue.shift();

  /* A card answered "Again" or still in a learning step comes back this session. */
  const s = card.srs;
  if ((s.state === 'learning' || s.state === 'relearning') && session.queue.length < 40) {
    const pos = rating === 1 ? Math.min(3, session.queue.length) : Math.min(9, session.queue.length);
    session.queue.splice(pos, 0, card);
  }
  if (!session.queue.length) return endSession();
  render('study'); refreshChrome();
}

function undoAnswer() {
  if (!session || !session.undo) return;
  const rating = session.undo.rating;
  const undone = Store.undoReview();
  session.undo = null;
  if (!undone) return;
  const card = undone.card;

  /* Roll back the session tally as well, or the summary reports more
     answers remembered than answers given. */
  session.done = Math.max(0, session.done - 1);
  if (rating === 1) session.again = Math.max(0, session.again - 1);
  else session.good = Math.max(0, session.good - 1);
  session.counts[card.id] = (session.counts[card.id] || 1) - 1;
  if (session.counts[card.id] <= 0) delete session.counts[card.id];

  session.queue = [card].concat(session.queue.filter(c => c.id !== card.id));
  session.revealed = true;
  render('study'); refreshChrome();
  toast('Last answer undone', 'ok');
}

function drawStudySummary(host) {
  const mins = Math.max(1, Math.round((Date.now() - session.startedAt) / 60000));
  const acc = session.done ? clamp(pct(session.good, session.done), 0, 100) : 0;
  const words = Object.keys(session.counts || {}).length;
  const c = Store.counts(session.deckId);
  const left = c.ready;
  host.innerHTML =
    '<div class="study-wrap">' +
      '<div class="card" style="text-align:center;padding:36px 26px">' +
        '<div style="font-size:2.8rem">' + (acc >= 80 ? '🏆' : acc >= 60 ? '👏' : '💪') + '</div>' +
        '<h2 style="font-size:1.4rem;margin-top:6px">Session complete</h2>' +
        '<p class="muted" style="margin-top:6px">' + session.done + ' answer' + (session.done === 1 ? '' : 's') +
          ' across ' + words + ' word' + (words === 1 ? '' : 's') + ' in ' + mins + ' minute' + (mins === 1 ? '' : 's') + '</p>' +
        '<div class="grid g3" style="margin-top:22px">' +
          statTile('Answered', session.done, words + ' different word' + (words === 1 ? '' : 's')) +
          statTile('Remembered', acc + '%', session.good + ' of ' + session.done) +
          statTile('Still due', left, left ? 'in this deck' : 'all clear') +
        '</div>' +
        '<div class="row" style="justify-content:center;margin-top:22px">' +
          '<button class="ghost-btn" data-go="dashboard">Back to dashboard</button>' +
          (left ? '<button class="primary-btn" data-act="again">' + ICONS.play + 'Keep going</button>'
                : '<button class="primary-btn" data-go="practice">' + ICONS.play + 'Practice</button>') +
        '</div>' +
      '</div>' +
    '</div>';
  host.onclick = (e) => {
    const g = e.target.closest('[data-go]');
    if (g) { session = null; return go(g.dataset.go); }
    if (e.target.closest('[data-act="again"]')) { const d = session.deckId; session = null; startSession(d, false); }
  };
}

/* ==========================================================================
   Practice — quizzes, typing, cloze, matching, listening, AI drills
   ========================================================================== */
const MODES = [
  { id:'mc-meaning', name:'Word → Meaning', desc:'See the word, pick the correct meaning.',
    icon:'<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h10M4 18h7"/></svg>' },
  { id:'mc-word', name:'Meaning → Word', desc:'See the meaning, pick the right word.',
    icon:'<svg viewBox="0 0 24 24"><path d="M20 6H4M20 12H10M20 18H13"/></svg>' },
  { id:'typing', name:'Type the word', desc:'Recall and spell it from memory. The hardest, and the most effective.',
    icon:'<svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>' },
  { id:'cloze', name:'Fill in the blank', desc:'Complete the example sentence with the missing word.',
    icon:'<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h5M13 12h7M4 17h16"/></svg>' },
  { id:'matching', name:'Matching pairs', desc:'Pair words with their meanings on small boards.',
    icon:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="7" height="7" rx="1"/><rect x="14" y="4" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>' },
  { id:'listening', name:'Listening', desc:'Hear the word spoken, then type what you heard.',
    icon:'<svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>', needsTTS:true },
  { id:'ai-quiz', name:'AI quiz', desc:'Fresh context questions written for you, with explanations.',
    icon:'<svg viewBox="0 0 24 24"><path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/></svg>', ai:true },
  { id:'ai-writing', name:'Writing coach', desc:'Write your own sentence; the AI marks it and suggests a better one.',
    icon:'<svg viewBox="0 0 24 24"><path d="M11 4H4v16h16v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>', ai:true }
];

let quiz = null;
let quizSetup = { mode: 'mc-meaning', deckId: '', scope: 'all' };
/* Round length is a share of the words the current filters make available,
   so it means the same thing whether a deck holds 20 words or 2,000. */
function roundPercent() { return clamp(Store.state.settings.roundPercent || 20, 10, 100); }
function roundLength(poolSize) {
  if (!poolSize) return 0;
  return Math.max(1, Math.round(poolSize * roundPercent() / 100));
}
/* How many choices a multiple-choice question offers. */
function optionCount() { return clamp(Store.state.settings.optionCount || 4, 2, 5); }
/* Pairs shown on one matching board — more than this stops being playable. */
const MATCH_BOARD_MAX = 6;

function renderPractice(host) {
  if (quiz && quiz.finished) return drawQuizResults(host);
  if (quiz) return drawQuizItem(host);
  drawPracticeSetup(host);
}

function drawPracticeSetup(host) {
  const pool = practicePool(quizSetup.deckId, quizSetup.scope);
  const aiOn = AI.available();
  host.innerHTML =
    '<div class="grid g2" style="margin-bottom:18px;align-items:start">' +
      '<div class="card">' +
        '<div class="field"><label>Deck</label><select id="pDeck">' + deckOptions(quizSetup.deckId, 'All decks') + '</select></div>' +
        '<div class="field" style="margin-bottom:0"><label>Which words</label><select id="pScope">' +
          [['all', 'Everything in the deck'], ['due', 'Only what is due now'], ['weak', 'My weakest words'],
           ['new', 'Words I have not started'], ['recent', 'Recently added']]
            .map(o => '<option value="' + o[0] + '"' + (quizSetup.scope === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') +
        '</select></div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="field" style="margin-bottom:10px">' +
          '<div class="row between"><label style="margin:0">Round length</label>' +
            '<b id="pCountOut" style="font-size:.88rem">' + roundLabel(pool.length) + '</b></div>' +
          '<input type="range" id="pPct" min="10" max="100" step="10" value="' + roundPercent() + '"' +
            ' style="--fill:' + ((roundPercent() - 10) / 90 * 100) + '%">' +
          '<div class="row between"><span class="faint">10%</span><span class="faint">100%</span></div>' +
        '</div>' +
        '<div class="row between" style="margin-top:4px">' +
          '<span class="muted">' + pool.length + ' word' + (pool.length === 1 ? '' : 's') + ' available</span>' +
          '<label class="switch" style="padding:0"><input type="checkbox" id="pSrs"' +
            (Store.state.settings.quizAffectsSrs ? ' checked' : '') + '><span class="track"></span>' +
            '<span class="txt">Count towards scheduling</span></label>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="section-title"><h2>Choose a drill</h2>' +
      (aiOn ? '' : '<span class="hint">AI drills need a key — see Settings</span>') + '</div>' +
    '<div class="mode-grid">' +
      MODES.filter(m => !(m.needsTTS && !TTS.ok)).map(m =>
        '<button class="mode-card' + (quizSetup.mode === m.id ? ' sel' : '') + '" data-mode="' + m.id + '"' +
          (m.ai && !aiOn ? ' disabled title="Connect an AI assistant in Settings"' : '') + '>' +
          '<span class="mi">' + m.icon + '</span>' +
          (m.ai ? '<span class="ai-tag">AI</span>' : '') +
          '<strong>' + esc(m.name) + '</strong><span>' + esc(m.desc) + '</span>' +
        '</button>').join('') +
    '</div>' +
    '<div class="row" style="margin-top:20px;justify-content:flex-end">' +
      '<button class="primary-btn" data-act="start"' + (pool.length < minWordsFor(quizSetup.mode) ? ' disabled' : '') + '>' +
        ICONS.play + 'Start practice</button>' +
    '</div>' +
    (pool.length < minWordsFor(quizSetup.mode)
      ? '<p class="faint" style="text-align:right;margin-top:8px">' +
        (pool.length ? 'This drill builds multiple-choice options from other words — add at least two.'
                     : 'No words match these filters yet.') + '</p>'
      : '');

  host.onclick = (e) => {
    const m = e.target.closest('[data-mode]');
    if (m) { quizSetup.mode = m.dataset.mode; return render('practice'); }
    if (e.target.closest('[data-act="start"]')) return startQuiz();
  };
  $('#pDeck').onchange = (e) => { quizSetup.deckId = e.target.value; render('practice'); };
  $('#pScope').onchange = (e) => { quizSetup.scope = e.target.value; render('practice'); };
  const slider = $('#pPct');
  if (slider) {
    const paint = () => {
      const v = parseInt(slider.value, 10);
      $('#pCountOut').textContent = roundLabel(pool.length, v);
      /* Colour the travelled part of the track (Chrome has no ::-moz-range-progress). */
      slider.style.setProperty('--fill', ((v - 10) / 90 * 100) + '%');
    };
    slider.oninput = paint;
    slider.onchange = () => {
      Store.state.settings.roundPercent = clamp(parseInt(slider.value, 10) || 20, 10, 100);
      Store.save(); paint();
    };
  }
  $('#pSrs').onchange = (e) => { Store.state.settings.quizAffectsSrs = e.target.checked; Store.save(); };
}

/* "40 % · 26 of 66 words" — shows both the share and what it works out to. */
function roundLabel(poolSize, percent) {
  const p = percent == null ? roundPercent() : percent;
  const n = poolSize ? Math.max(1, Math.round(poolSize * p / 100)) : 0;
  return p + '% · ' + n + ' of ' + poolSize + ' word' + (poolSize === 1 ? '' : 's');
}

function practicePool(deckId, scope) {
  let pool = Store.cardsOf(deckId || null).filter(c => c.term && (c.translation || c.definition));
  if (scope === 'due') pool = pool.filter(c => SRS.isDue(c.srs) && c.srs.state !== 'new');
  else if (scope === 'new') pool = pool.filter(c => c.srs.state === 'new');
  else if (scope === 'weak') pool = pool.slice().sort((a, b) =>
    (b.stats.wrong + b.srs.lapses * 2) - (a.stats.wrong + a.srs.lapses * 2) || SRS.strength(a.srs) - SRS.strength(b.srs));
  else if (scope === 'recent') pool = pool.slice().sort((a, b) => b.createdAt - a.createdAt);
  return pool;
}

/* ---------- question generation ------------------------------------------- */
function meaningOf(card) { return card.definition || card.translation; }

/* Wrong answers, in order of usefulness: words the learner just missed (they
   are the ones being confused), then words of the same part of speech, then
   anything else in the pool. */
function distractors(card, pool, key, n, prefer) {
  const picked = [];
  const seen = new Set([String(key(card) || '').toLowerCase()]);
  /* Another sense of the same word is a true meaning of it, so offering it as
     a wrong answer would make the question unanswerable. */
  const head = Store.headKey(card.term);
  const take = (list) => shuffle(list).forEach(c => {
    if (picked.length >= n || !c || c.id === card.id || Store.headKey(c.term) === head) return;
    const v = key(c);
    if (!v || seen.has(v.toLowerCase())) return;
    picked.push(v); seen.add(v.toLowerCase());
  });
  take((prefer || []).filter(c => c.id !== card.id));
  take(pool.filter(c => c.pos && c.pos === card.pos));
  take(pool);
  return picked;
}

function buildQuestions(mode, pool, count, opts) {
  opts = opts || {};
  const chosen = opts.cards ? opts.cards.slice(0, count)
    : (quizSetup.scope === 'all' || quizSetup.scope === 'due'
        ? sample(pool, Math.min(count, pool.length))
        : pool.slice(0, count));
  const prefer = opts.prefer || [];
  const nOpts = optionCount() - 1;

  /* Matching is split into playable boards so the round length still applies. */
  if (mode === 'matching') {
    const cards = chosen.filter(c => c.translation || c.definition);
    if (!cards.length) return [];
    const boards = Math.max(1, Math.ceil(cards.length / MATCH_BOARD_MAX));
    const per = Math.ceil(cards.length / boards);
    const out = [];
    for (let i = 0; i < cards.length; i += per) out.push({ type: 'matching', cards: cards.slice(i, i + per) });
    if (out.length > 1 && out[out.length - 1].cards.length < 2) {
      const tail = out.pop();
      out[out.length - 1].cards = out[out.length - 1].cards.concat(tail.cards);
    }
    /* One spare meaning per board, so the final word still has to be chosen
       rather than being whatever is left over. */
    out.forEach(board => {
      const used = {};
      board.cards.forEach(c => { used[c.id] = 1; used[String(meaningOf(c)).toLowerCase()] = 1; });
      const spares = pool.filter(c =>
        !used[c.id] && meaningOf(c) && !used[String(meaningOf(c)).toLowerCase()]);
      board.decoy = spares.length ? sample(spares, 1)[0] : null;
    });
    return out;
  }

  return chosen.map(card => {
    if (mode === 'mc-meaning') {
      const key = (c) => c.definition || c.translation;
      const choices = shuffle([key(card)].concat(distractors(card, pool, key, nOpts, prefer)));
      /* No hint here: the translation would simply be the answer. */
      return { type: 'mc', card: card, prompt: card.term, pos: card.pos, options: choices, answer: key(card),
               question: 'What does this word mean?' };
    }
    if (mode === 'mc-word') {
      const key = (c) => c.term;
      const choices = shuffle([card.term].concat(distractors(card, pool, key, nOpts, prefer)));
      return { type: 'mc', card: card, prompt: meaningOf(card), pos: card.pos,
               hint: card.definition && card.translation ? card.translation : '',
               options: choices, answer: card.term, question: 'Which word fits this meaning?' };
    }
    if (mode === 'typing') {
      return { type: 'type', card: card, prompt: meaningOf(card), pos: card.pos,
               hint: card.translation !== meaningOf(card) ? card.translation : '',
               answer: card.term, question: 'Type the English word' };
    }
    if (mode === 'listening') {
      return { type: 'type', card: card, prompt: '', speak: card.term, pos: card.pos,
               hint: card.translation || card.definition, answer: card.term,
               question: 'Listen and type what you hear' };
    }
    if (mode === 'cloze') {
      const sentence = card.example || (card.term + ' — ' + meaningOf(card));
      const gap = blankOut(sentence, card.term);
      return { type: 'type', card: card, cloze: gap.text, answer: card.term, pos: card.pos,
               /* the sentence may inflect the word — accept what it actually removed */
               alt: gap.surface, hint: meaningOf(card), question: 'Complete the sentence' };
    }
    if (mode === 'ai-writing') {
      return { type: 'write', card: card, pos: card.pos, question: 'Write a sentence using this word' };
    }
    return null;
  }).filter(Boolean);
}

/* Multiple-choice drills need other words to build plausible options from. */
const NEEDS_OPTIONS = ['mc-meaning', 'mc-word', 'matching', 'ai-quiz'];
function minWordsFor(mode) { return NEEDS_OPTIONS.indexOf(mode) !== -1 ? 2 : 1; }

/* One place that knows how to set up a round, so matching's pair totals are
   never forgotten. */
function newQuiz(mode, items) {
  const q = { mode: mode, i: 0, items: items, results: [], correct: 0,
              startedAt: Date.now(), state: 'idle', match: null };
  q.pairsTotal = items.reduce((n, it) => n + (it.type === 'matching' ? it.cards.length : 0), 0);
  q.pairsDone = 0;
  return q;
}

async function startQuiz() {
  const pool = practicePool(quizSetup.deckId, quizSetup.scope);
  const mode = quizSetup.mode;
  if (pool.length < minWordsFor(mode)) {
    return toast(pool.length ? 'This drill needs at least two words' : 'No words match these filters', 'err');
  }
  const count = roundLength(pool.length);
  quiz = newQuiz(mode, []);

  if (mode === 'ai-quiz') {
    const cards = sample(pool, Math.min(count, pool.length, 12));
    $('#view-practice').innerHTML = '<div class="quiz-wrap"><div class="card"><div class="ai-thinking">' +
      ICONS.loader + 'The AI is writing ' + cards.length + ' questions…</div></div></div>';
    try {
      const qs = await AI.makeQuestions(cards, cards.length, optionCount());
      quiz.items = qs.map(q => {
        const card = cards.find(c => c.term.toLowerCase() === String(q.term || '').toLowerCase()) || cards[0];
        const opts = q.options.slice(0, optionCount());
        if (opts.indexOf(q.answer) === -1) opts[0] = q.answer;
        return { type: 'mc', card: card, prompt: q.prompt, pos: card.pos, options: shuffle(opts),
                 answer: q.answer, explanation: q.explanation, question: 'AI question' };
      });
      if (!quiz.items.length) throw new Error('No questions came back.');
      quiz = Object.assign(newQuiz(mode, quiz.items), { startedAt: quiz.startedAt });
    } catch (err) {
      quiz = null; toast(err.message, 'err'); return render('practice');
    }
  } else {
    quiz = newQuiz(mode, buildQuestions(mode, pool, count));
  }
  if (!quiz.items.length) { quiz = null; toast('Could not build questions from these words', 'err'); return render('practice'); }
  render('practice');
}

/* ---------- answer checking ------------------------------------------------ */
function normalize(s) {
  return String(s || '').toLowerCase().trim()
    .replace(/[’']/g, "'")
    .replace(/[.,!?;:"()\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^(to|a|an|the)\s+/, '');
}
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}
function gradeTyped(input, answer) {
  const a = normalize(input), b = normalize(answer);
  if (!a) return 'empty';
  if (a === b) return 'exact';
  const tol = b.length >= 8 ? 2 : b.length >= 5 ? 1 : 0;
  if (tol && levenshtein(a, b) <= tol) return 'close';
  return 'wrong';
}

/* ---------- item rendering -------------------------------------------------- */
function drawQuizItem(host) {
  const item = quiz.items[quiz.i];
  /* The bar tracks what is finished. For matching that is pairs solved across
     every board; elsewhere it is questions answered, so landing on the last
     question does not already read as 100 %. */
  const matching = item.type === 'matching';
  const doneCount = matching ? quiz.pairsDone : quiz.i + (quiz.state === 'answered' ? 1 : 0);
  const totalCount = matching ? quiz.pairsTotal : quiz.items.length;
  const progress = pct(doneCount, totalCount);
  const head =
    '<div class="study-head">' +
      '<button class="soft-btn tiny end-btn" data-act="quit">' + ICONS.finish +
        '<span>End practice</span></button>' +
      '<div class="bar" style="flex:1"><i style="width:' + progress + '%"></i></div>' +
      '<div class="counts"><span class="c-due">' +
        (matching ? doneCount + ' / ' + totalCount + ' matched'
                  : (quiz.i + 1) + ' / ' + quiz.items.length) + '</span>' +
        '<span class="c-new">' + quiz.correct + ' correct</span></div>' +
    '</div>';

  let body = '';
  if (item.type === 'matching') body = matchingHTML(item);
  else if (item.type === 'mc') body = mcHTML(item);
  else if (item.type === 'type') body = typeHTML(item);
  else if (item.type === 'write') body = writeHTML(item);

  host.innerHTML = '<div class="quiz-wrap">' + head + body + '</div>';

  if (item.speak && quiz.state === 'idle') TTS.speak(item.speak);
  bindQuizEvents(host, item);
}

function questionCard(inner, item) {
  const c = item.card;
  return '<div class="flashcard" style="min-height:auto;padding:28px 26px">' +
    '<div class="fc-top">' +
      '<span class="chip">' + esc(item.question) + '</span>' +
      (item.pos ? '<span class="chip pos">' + esc(item.pos) + '</span>' : '') +
      '<div class="spacer"></div>' +
      (c && c.category ? '<span class="faint">' + esc(c.category) + '</span>' : '') +
    '</div>' + inner + hintHTML(item) + '</div>';
}

/* The translation (or the meaning, for a gap-fill) sits under the question and
   stays hidden until asked for, so it is a way out rather than a giveaway.
   Both states are always in the DOM: revealing one is a class toggle, which
   keeps the typed answer untouched and costs no layout shift. */
function hintHTML(item) {
  if (!item.hint) return '';
  return '<div class="hint-slot' + (quiz.hintShown ? ' revealed' : '') + '" id="hintSlot">' +
    '<div class="hint-text">' + ICONS.bulb + '<span>' + esc(item.hint) + '</span></div>' +
    '<button class="hint-btn" data-act="hint">' + ICONS.bulb + 'Show hint</button>' +
  '</div>';
}

function mcHTML(item) {
  const answered = quiz.state === 'answered';
  const letters = ['A', 'B', 'C', 'D', 'E'];
  return questionCard('<div class="fc-prompt">' + esc(item.prompt) + '</div>', item) +
    '<div class="grid" style="gap:9px">' +
      item.options.map((o, n) => {
        let cls = '';
        if (answered) {
          if (normalize(o) === normalize(item.answer)) cls = ' correct';
          else if (o === quiz.given) cls = ' wrong';
        }
        return '<button class="opt' + cls + '" data-opt="' + esc(o) + '"' + (answered ? ' disabled' : '') + '>' +
          '<span class="key">' + letters[n] + '</span><span>' + esc(o) + '</span></button>';
      }).join('') +
    '</div>' + (answered ? feedbackHTML(item) : '');
}

function typeHTML(item) {
  const answered = quiz.state === 'answered';
  const inner = item.cloze
    ? '<div class="v" style="font-size:1.15rem;line-height:1.75">' +
        esc(item.cloze).replace('____', '<span class="cloze-blank"></span>') + '</div>'
    : item.speak
      ? '<div class="row" style="justify-content:center;padding:8px 0">' +
          '<button class="ghost-btn" data-act="say" style="padding:14px 22px">' + ICONS.sound + 'Play again</button></div>'
      : '<div class="fc-prompt">' + esc(item.prompt) + '</div>';
  return questionCard(inner, item) +
    '<div class="row" style="gap:9px;flex-wrap:nowrap">' +
      '<input type="text" id="qInput" placeholder="Type your answer…" autocomplete="off" autocapitalize="off" ' +
        'spellcheck="false"' + (answered ? ' disabled' : '') + ' value="' + esc(quiz.given || '') + '">' +
      (answered ? '' : '<button class="primary-btn" data-act="check">Check</button>') +
    '</div>' +
    (answered ? feedbackHTML(item) : '<p class="faint">Spelling is checked, but a single typo is forgiven.</p>');
}

function writeHTML(item) {
  const answered = quiz.state === 'answered';
  const c = item.card;
  return questionCard(
    '<div class="fc-term" style="font-size:1.7rem">' + esc(c.term) + '</div>' +
    '<p class="muted" style="margin-top:8px">' + esc(meaningOf(c)) + '</p>', item) +
    '<textarea id="qWrite" rows="3" placeholder="Write your own sentence using this word…"' +
      (quiz.state === 'idle' ? '' : ' disabled') + '>' + esc(quiz.given || '') + '</textarea>' +
    (quiz.state === 'idle'
      ? '<div class="row end"><button class="primary-btn" data-act="check">' + ICONS.spark +
        'Get feedback</button></div>'
      : '') +
    (quiz.state === 'grading' ? '<div class="ai-thinking">' + ICONS.loader + 'The AI is reading your sentence…</div>' : '') +
    (answered ? feedbackHTML(item) : '');
}

function feedbackHTML(item) {
  const r = quiz.lastResult || {};
  const c = item.card;
  let html = '<div class="feedback ' + (r.ok ? 'ok' : 'no') + '">';
  if (r.ok) html += '<b>' + (r.close ? 'Almost — small typo, counted as correct.' : 'Correct.') + '</b>';
  else {
    const ans = String(item.answer || (c && c.term) || '').replace(/[.\s]+$/, '');
    html += '<b>Not quite.</b> The answer is <b>' + esc(ans) + '</b>.';
  }
  if (r.aiFeedback) {
    html += '<div style="margin-top:8px">' + esc(r.aiFeedback) + '</div>';
    if (r.corrected) html += '<div style="margin-top:8px" class="fc-example">' + esc(r.corrected) + '</div>';
    if (r.note) html += '<div style="margin-top:8px" class="faint">' + esc(r.note) + '</div>';
  } else if (item.explanation) {
    html += '<div style="margin-top:8px">' + esc(item.explanation) + '</div>';
  } else if (c) {
    if (c.definition && item.type !== 'mc') html += '<div style="margin-top:8px">' + esc(c.definition) + '</div>';
    if (c.example) html += '<div style="margin-top:8px" class="fc-example">' + highlightTerm(c.example, c.term) + '</div>';
    if (c.translation) html += '<div style="margin-top:6px" class="faint">' + esc(c.translation) + '</div>';
  }
  html += '</div>';
  html += '<div class="row end" style="margin-top:12px">' +
    (r.ok === false && AI.available() && !r.aiFeedback && c
      ? '<button class="soft-btn" data-act="explain">' + ICONS.spark + 'Why?</button>' : '') +
    (c ? '<button class="soft-btn" data-act="edit-card">Edit card</button>' : '') +
    '<button class="primary-btn" data-act="next">' + (quiz.i + 1 >= quiz.items.length ? 'See results' : 'Next question') + '</button>' +
    '</div>';
  return html;
}

function matchingHTML(item) {
  if (!quiz.match) {
    const rightCards = item.decoy ? item.cards.concat([item.decoy]) : item.cards;
    quiz.match = {
      left: shuffle(item.cards.map(c => ({ id: c.id, text: c.term }))),
      right: shuffle(rightCards.map(c => ({ id: c.id, text: c.translation || c.definition }))),
      sel: null, done: [], misses: 0, flash: null
    };
  }
  const m = quiz.match;
  const boards = quiz.items.length;
  /* Flashes are keyed by side + id: on a miss the two tiles are different
     words, and the same id also exists in the opposite column. */
  const flashed = (side, id) => (m.flash && m.flash.keys.indexOf(side + id) !== -1) ? ' ' + m.flash.kind : '';
  const col = (rows, side) => '<div class="match-col">' + rows.map(r =>
    '<button class="match-item' + (m.done.indexOf(r.id) !== -1 ? ' done' : '') +
      (m.sel && m.sel.side === side && m.sel.id === r.id ? ' sel' : '') + flashed(side, r.id) +
      '" data-side="' + side + '" data-id="' + r.id + '">' + esc(r.text) + '</button>').join('') + '</div>';
  return '<div class="card">' +
    '<div class="row between" style="margin-bottom:14px">' +
      '<p class="muted">Match each word with its meaning</p>' +
      '<span class="faint">' + m.done.length + ' / ' + item.cards.length + ' on this board' +
        (boards > 1 ? ' · board ' + (quiz.i + 1) + ' of ' + boards : '') +
        (m.misses ? ' · ' + m.misses + ' miss' + (m.misses === 1 ? '' : 'es') : '') + '</span>' +
    '</div>' +
    '<div class="match-grid">' + col(m.left, 'l') + col(m.right, 'r') + '</div></div>';
}

/* ---------- interaction ------------------------------------------------------ */
function bindQuizEvents(host, item) {
  host.onclick = async (e) => {
    if (e.target.closest('[data-act="quit"]')) { finishQuiz(); return; }
    if (e.target.closest('[data-act="say"]')) return TTS.speak(item.speak || (item.card && item.card.term));
    if (e.target.closest('[data-act="next"]')) return nextQuizItem();
    if (e.target.closest('[data-act="edit-card"]')) return cardEditor(item.card);
    if (e.target.closest('[data-act="explain"]')) return explainWrong(item);
    if (e.target.closest('[data-act="check"]')) return checkAnswer(item);
    if (e.target.closest('[data-act="hint"]')) {
      quiz.hintShown = true;
      const slot = $('#hintSlot');
      if (slot) slot.classList.add('revealed');   /* no re-render: nothing else moves */
      const typed = $('#qInput');
      if (typed) typed.focus();
      return;
    }
    const opt = e.target.closest('[data-opt]');
    if (opt && quiz.state !== 'answered') return answerMC(item, opt.dataset.opt);
    const mi = e.target.closest('[data-side]');
    if (mi) return matchClick(item, mi.dataset.side, mi.dataset.id);
  };
  const input = $('#qInput');
  if (input && quiz.state !== 'answered') {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    input.oninput = () => { quiz.given = input.value; };
    input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); checkAnswer(item); } };
  }
  const wr = $('#qWrite');
  if (wr && quiz.state === 'idle') wr.focus();
}

function answerMC(item, given) {
  quiz.given = given;
  const ok = normalize(given) === normalize(item.answer);
  recordAnswer(item, ok, given);
  render('practice');
}

function checkAnswer(item) {
  if (item.type === 'write') return gradeWriting(item);
  const input = $('#qInput');
  const val = input ? input.value : '';
  let g = gradeTyped(val, item.answer);
  if (g === 'empty') return toast('Type something first', 'err');
  if (g === 'wrong' && item.alt) {
    const alt = gradeTyped(val, item.alt);
    if (alt !== 'wrong') g = alt;
  }
  quiz.given = val;
  recordAnswer(item, g === 'exact' || g === 'close', val, g === 'close');
  render('practice');
}

async function gradeWriting(item) {
  const ta = $('#qWrite');
  const text = ta ? ta.value.trim() : '';
  if (text.length < 4) return toast('Write a full sentence first', 'err');
  quiz.given = text; quiz.state = 'grading';
  render('practice');
  try {
    const r = await AI.gradeSentence(item.card, text);
    const ok = !!r.correct;
    recordAnswer(item, ok, text, false, {
      aiFeedback: r.feedback, corrected: r.corrected, note: r.note, score: r.score
    });
  } catch (err) {
    quiz.state = 'idle';
    toast(err.message, 'err');
  }
  render('practice');
}

function recordAnswer(item, ok, given, close, extra) {
  quiz.state = 'answered';
  quiz.lastResult = Object.assign({ ok: ok, close: close }, extra || {});
  if (ok) quiz.correct++;
  quiz.results.push({ card: item.card, ok: ok, given: given, answer: item.answer || (item.card && item.card.term) });
  if (item.card) Store.quizResult(item.card.id, ok);
  refreshChrome();
}

async function explainWrong(item) {
  const btn = $('[data-act="explain"]');
  if (btn) { btn.disabled = true; btn.innerHTML = ICONS.loader + 'Thinking…'; }
  try {
    const text = await AI.explain(item.card, quiz.given || '');
    quiz.lastResult.aiFeedback = text;
    render('practice');
  } catch (err) { toast(err.message, 'err'); if (btn) { btn.disabled = false; btn.innerHTML = ICONS.spark + 'Why?'; } }
}

function matchClick(item, side, id) {
  const m = quiz.match;
  if (m.done.indexOf(id) !== -1 || m.flash) return;
  if (!m.sel) { m.sel = { side: side, id: id }; return render('practice'); }
  if (m.sel.side === side) { m.sel = { side: side, id: id }; return render('practice'); }

  const picked = m.sel;
  if (picked.id === id) {
    m.done.push(id);
    quiz.pairsDone++;
    const card = item.cards.find(c => c.id === id);
    if (card) Store.quizResult(card.id, true);
    quiz.correct++;
    quiz.results.push({ card: card, ok: true, given: '—', answer: card.term });
    m.flash = { kind: 'hit', keys: ['l' + id, 'r' + id] };
  } else {
    m.misses++;
    const card = item.cards.find(c => c.id === picked.id) || item.cards.find(c => c.id === id);
    if (card) Store.quizResult(card.id, false);
    quiz.results.push({ card: card, ok: false, given: 'mismatched', answer: card ? card.term : '' });
    m.flash = { kind: 'miss', keys: [picked.side + picked.id, side + id] };
  }
  m.sel = null;
  refreshChrome();
  render('practice');

  const done = m.done.length === item.cards.length;
  setTimeout(() => {
    if (!quiz || quiz.match !== m) return;
    m.flash = null;
    if (done) return nextQuizItem();
    render('practice');
  }, m.flash.kind === 'hit' ? 420 : 620);
}

function nextQuizItem() {
  quiz.i++;
  quiz.state = 'idle'; quiz.given = ''; quiz.lastResult = null; quiz.hintShown = false;
  quiz.match = null;                 /* the next matching board starts fresh */
  if (quiz.i >= quiz.items.length) return finishQuiz();
  render('practice');
}

function finishQuiz() {
  quiz.finished = true;
  render('practice'); refreshChrome();
}

function drawQuizResults(host) {
  const answered = quiz.results.length;
  const score = answered ? pct(quiz.results.filter(r => r.ok).length, answered) : 0;
  const secs = Math.round((Date.now() - quiz.startedAt) / 1000);
  const wrong = quiz.results.filter(r => !r.ok && r.card);
  host.innerHTML =
    '<div class="quiz-wrap">' +
      '<div class="card" style="text-align:center;padding:32px 24px">' +
        '<div style="font-size:2.6rem">' + (score >= 90 ? '🌟' : score >= 70 ? '👍' : score >= 40 ? '📚' : '🔁') + '</div>' +
        '<h2 style="font-size:1.4rem;margin-top:4px">' + score + '% correct</h2>' +
        '<p class="muted" style="margin-top:6px">' + quiz.results.filter(r => r.ok).length + ' of ' + answered +
          ' · ' + (secs < 60 ? secs + ' seconds' : Math.round(secs / 60) + ' minutes') + '</p>' +
        '<div class="bar" style="margin:18px 0"><i style="width:' + score + '%"></i></div>' +
        '<div class="row" style="justify-content:center">' +
          '<button class="ghost-btn" data-act="back">Change drill</button>' +
          (wrong.length ? '<button class="ghost-btn" data-act="retry-wrong">Practise the ' + wrong.length + ' I missed</button>' : '') +
          '<button class="primary-btn" data-act="again">' + ICONS.play + 'Another round</button>' +
        '</div>' +
      '</div>' +
      (answered
        ? '<div class="card"><div class="section-title" style="margin:0 0 8px"><h2>Review</h2></div>' +
          quiz.results.map(r =>
            '<div class="row between" style="padding:9px 0;border-bottom:1px solid var(--border-soft)">' +
              '<div style="min-width:0"><b>' + esc(r.card ? r.card.term : r.answer) + '</b>' +
                (r.card && r.card.translation ? ' <span class="faint">· ' + esc(r.card.translation) + '</span>' : '') +
                (!r.ok && r.given && r.given !== '—' ? '<div class="faint">you wrote: ' + esc(r.given) + '</div>' : '') +
              '</div>' +
              '<span class="chip ' + (r.ok ? 'review' : 'due') + '">' + (r.ok ? 'correct' : 'missed') + '</span>' +
            '</div>').join('') + '</div>'
        : '') +
    '</div>';

  host.onclick = (e) => {
    if (e.target.closest('[data-act="back"]')) { quiz = null; return render('practice'); }
    if (e.target.closest('[data-act="again"]')) { quiz = null; return startQuiz(); }
    if (e.target.closest('[data-act="retry-wrong"]')) {
      /* Ask only about the missed words, but draw the wrong answers from the
         whole pool — with the other missed words first, since those are the
         ones actually being confused. */
      const seen = {};
      const missed = wrong.map(r => r.card).filter(c => c && !seen[c.id] && (seen[c.id] = 1));
      const wide = practicePool(quizSetup.deckId, quizSetup.scope);
      const pool = wide.length >= 2 ? wide : missed;
      let mode = quizSetup.mode;
      if (mode === 'matching' && missed.length < 2) mode = 'mc-meaning';
      quiz = newQuiz(mode, buildQuestions(mode, pool, missed.length, { cards: missed, prefer: missed }));
      if (!quiz.items.length) { quiz = null; toast('Could not rebuild those questions', 'err'); }
      return render('practice');
    }
  };
}

/* ==========================================================================
   Browse
   ========================================================================== */
let browseState = { q: '', deck: '', status: '', category: '', sort: 'recent' };

function renderBrowse(host) {
  const cats = Store.categories();
  let rows = Store.state.cards.slice();
  const q = browseState.q.toLowerCase().trim();
  if (q) rows = rows.filter(c =>
    (c.term + ' ' + c.definition + ' ' + c.translation + ' ' + c.example + ' ' + c.category).toLowerCase().indexOf(q) !== -1);
  if (browseState.deck) rows = rows.filter(c => c.deckId === browseState.deck);
  if (browseState.category) rows = rows.filter(c => c.category === browseState.category);
  if (browseState.status) rows = rows.filter(c => {
    if (browseState.status === 'due') return isDueNow(c);
    if (browseState.status === 'later') return c.srs.state !== 'new' && !isDueNow(c);
    return SRS.bucket(c.srs) === browseState.status;   /* a knowledge level */
  });
  const sorters = {
    recent: (a, b) => b.createdAt - a.createdAt,
    alpha:  (a, b) => a.term.localeCompare(b.term),
    due:    (a, b) => (a.srs.due || 0) - (b.srs.due || 0),
    hard:   (a, b) => (b.stats.wrong + b.srs.lapses * 2) - (a.stats.wrong + a.srs.lapses * 2),
    strong: (a, b) => SRS.strength(b.srs) - SRS.strength(a.srs)
  };
  rows.sort(sorters[browseState.sort]);

  host.innerHTML =
    '<div class="toolbar">' +
      '<div class="search">' +
        '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
        '<input type="search" id="bQ" placeholder="Search words, meanings, examples…" value="' + esc(browseState.q) + '">' +
      '</div>' +
      '<select id="bDeck">' + deckOptions(browseState.deck, 'All decks') + '</select>' +
      '<select id="bStatus">' +
        '<option value=""' + (browseState.status === '' ? ' selected' : '') + '>Any word</option>' +
        '<optgroup label="How well I know it">' +
          [['new', 'New'], ['learning', 'Learning'], ['familiar', 'Familiar'], ['mastered', 'Mastered']]
            .map(o => '<option value="' + o[0] + '"' + (browseState.status === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') +
        '</optgroup>' +
        '<optgroup label="When it comes up">' +
          [['due', 'Due now'], ['later', 'Scheduled for later']]
            .map(o => '<option value="' + o[0] + '"' + (browseState.status === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') +
        '</optgroup>' +
      '</select>' +
      '<select id="bCat"><option value="">Any category</option>' +
        cats.map(c => '<option' + (browseState.category === c ? ' selected' : '') + '>' + esc(c) + '</option>').join('') +
      '</select>' +
      '<select id="bSort">' +
        [['recent', 'Newest first'], ['alpha', 'A → Z'], ['due', 'Due date'], ['hard', 'Hardest first'], ['strong', 'Best known']]
          .map(o => '<option value="' + o[0] + '"' + (browseState.sort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') +
      '</select>' +
      '<div class="spacer"></div>' +
      '<button class="soft-btn" data-act="import">Import</button>' +
      '<button class="soft-btn" data-act="export">Export CSV</button>' +
      '<button class="primary-btn" data-act="add">' + ICONS.plus + 'Add word</button>' +
    '</div>' +
    '<p class="faint" style="margin-bottom:10px">' + rows.length + ' of ' + Store.state.cards.length + ' words</p>' +
    (rows.length
      ? '<div class="table-wrap">' + cardTable(rows.slice(0, 500)) + '</div>' +
        (rows.length > 500 ? '<p class="faint" style="margin-top:10px">Showing the first 500 — narrow the search to see more.</p>' : '')
      : '<div class="card"><div class="empty">' + ICONS.empty + '<h3>No words match</h3>' +
        '<p class="faint">Try a different search or filter.</p></div></div>');

  host.onclick = (e) => {
    if (e.target.closest('[data-act="add"]')) return cardEditor(null, browseState.deck || null);
    if (e.target.closest('[data-act="import"]')) return importDialog();
    if (e.target.closest('[data-act="export"]')) {
      download('lexio-words-' + stamp() + '.csv', Store.exportCSV(browseState.deck || null), 'text/csv');
      return toast('CSV exported', 'ok');
    }
    handleCardRowClick(e);
  };
  let t;
  $('#bQ').oninput = (e) => { clearTimeout(t); const v = e.target.value; t = setTimeout(() => { browseState.q = v; render('browse'); const i = $('#bQ'); if (i) { i.focus(); i.setSelectionRange(v.length, v.length); } }, 220); };
  $('#bDeck').onchange   = (e) => { browseState.deck = e.target.value; render('browse'); };
  $('#bStatus').onchange = (e) => { browseState.status = e.target.value; render('browse'); };
  $('#bCat').onchange    = (e) => { browseState.category = e.target.value; render('browse'); };
  $('#bSort').onchange   = (e) => { browseState.sort = e.target.value; render('browse'); };
}

/* ==========================================================================
   Progress / statistics
   ========================================================================== */
function renderStats(host) {
  host.onclick = (e) => {
    const r = e.target.closest('[data-weeks]');
    if (!r) return;
    Store.state.settings.activityWeeks = parseInt(r.dataset.weeks, 10);
    Store.save(); render('stats');
  };
  const all = Store.state.cards;
  const st = Store.streak();
  const hist = Store.history(14);
  const fc = Store.forecast(14);
  const ret7 = Store.retention(7), ret30 = Store.retention(30);
  const buckets = { new: 0, learning: 0, familiar: 0, mastered: 0 };
  all.forEach(c => buckets[SRS.bucket(c.srs)]++);
  const totalReviews = Object.values(Store.state.daily).reduce((a, d) => a + d.reviews, 0);
  const hardest = all.filter(c => c.stats.wrong > 0)
    .sort((a, b) => (b.stats.wrong + b.srs.lapses * 2) - (a.stats.wrong + a.srs.lapses * 2)).slice(0, 8);
  const byCat = {};
  all.forEach(c => { const k = c.category || 'Uncategorised'; (byCat[k] = byCat[k] || { n: 0, s: 0 }); byCat[k].n++; byCat[k].s += SRS.strength(c.srs); });
  const cats = Object.keys(byCat).sort((a, b) => byCat[b].n - byCat[a].n).slice(0, 10);
  const w = (n) => (all.length ? 100 * n / all.length : 0) + '%';

  host.innerHTML =
    '<div class="grid g4">' +
      statTile('Current streak', st.current, 'longest ' + st.longest + ' days') +
      statTile('Total reviews', totalReviews, 'all time') +
      statTile('Recall (7 days)', ret7 == null ? '—' : ret7 + '%', 'answers correct') +
      statTile('Recall (30 days)', ret30 == null ? '—' : ret30 + '%', 'answers correct') +
    '</div>' +

    '<div class="section-title"><h2>Knowledge breakdown</h2><span class="hint">' + all.length + ' words</span></div>' +
    '<div class="card">' +
      '<div class="stack-bar" style="height:14px">' +
        '<i style="width:' + w(buckets.mastered) + ';background:var(--good)"></i>' +
        '<i style="width:' + w(buckets.familiar) + ';background:var(--level-familiar)"></i>' +
        '<i style="width:' + w(buckets.learning) + ';background:var(--warn)"></i>' +
        '<i style="width:' + w(buckets.new) + ';background:var(--surface-3)"></i>' +
      '</div>' +
      '<div class="grid g4" style="margin-top:16px">' +
        miniStat('Mastered', buckets.mastered, 'recalled after 21+ days', 'var(--good)') +
        miniStat('Familiar', buckets.familiar, 'known, still settling in', 'var(--level-familiar)') +
        miniStat('Learning', buckets.learning, 'in short-term repetition', 'var(--warn)') +
        miniStat('New', buckets.new, 'not started yet', 'var(--surface-3)') +
      '</div>' +
      '<p class="faint" style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border-soft);line-height:1.65">' +
        'These four describe <b>how well you know a word</b> — every word is in exactly one of them. ' +
        'Whether a word is <b>due</b> is a separate question: it only means its next review time has arrived. ' +
        'A word can be Familiar and due today, or Familiar and not due for another week.</p>' +
    '</div>' +

    '<div class="grid g2" style="margin-top:16px;align-items:start">' +
      '<div class="card"><div class="section-title" style="margin:0 0 6px"><h2>Reviews, last 14 days</h2></div>' +
        barChartHTML(hist.map(h => ({
          label: h.date.getDate() + '/' + (h.date.getMonth() + 1), value: h.reviews,
          title: h.key + ': ' + h.reviews + ' reviews, ' + h.new + ' new'
        }))) + '</div>' +
      '<div class="card"><div class="section-title" style="margin:0 0 6px"><h2>Coming up, next 14 days</h2></div>' +
        barChartHTML(fc.map(f => {
          const d = new Date(Date.now() + f.offset * 86400000);
          return { label: f.offset === 0 ? 'today' : d.getDate() + '/' + (d.getMonth() + 1), value: f.count,
                   title: f.count + ' cards due' };
        })) + '</div>' +
    '</div>' +

    '<div class="section-title"><h2>Activity</h2>' +
      '<div class="seg">' + ACTIVITY_RANGES.map(r =>
        '<button data-weeks="' + r.weeks + '" class="' + (activityWeeks() === r.weeks ? 'sel' : '') + '">' +
        r.label + '</button>').join('') + '</div>' +
    '</div>' +
    '<div class="card">' +
      '<div class="activity-grid">' +
        '<div style="min-width:0">' + heatmapHTML(activityWeeks(), true) +
          '<div class="hm-legend" style="margin-top:12px">Less' +
            [0, 1, 2, 3, 4].map(l => '<span class="hm-cell" data-lvl="' + l + '"></span>').join('') + 'More</div>' +
        '</div>' +
        activityPanel(activityWeeks()) +
      '</div>' +
    '</div>' +

    '<div class="grid g2" style="margin-top:16px;align-items:start">' +
      '<div class="card"><div class="section-title" style="margin:0 0 8px"><h2>Words that fight back</h2></div>' +
        (hardest.length
          ? hardest.map(c =>
            '<div class="row between" style="padding:8px 0;border-bottom:1px solid var(--border-soft)">' +
              '<div style="min-width:0"><b>' + esc(c.term) + '</b>' +
              '<div class="faint">' + esc(c.translation || c.definition || '') + '</div></div>' +
              '<span class="chip due">' + c.stats.wrong + ' misses</span></div>').join('')
          : '<p class="faint">No mistakes recorded yet — keep going.</p>') +
      '</div>' +
      '<div class="card"><div class="section-title" style="margin:0 0 8px"><h2>By category</h2></div>' +
        (cats.length ? cats.map(k => {
          const v = byCat[k];
          return '<div style="padding:8px 0">' +
            '<div class="row between" style="margin-bottom:5px"><span style="font-size:.87rem">' + esc(k) + '</span>' +
            '<span class="faint">' + v.n + ' words · ' + Math.round(100 * v.s / v.n) + '% learned</span></div>' +
            '<div class="bar thin"><i style="width:' + Math.round(100 * v.s / v.n) + '%"></i></div></div>';
        }).join('') : '<p class="faint">Add categories to your cards to see this breakdown.</p>') +
      '</div>' +
    '</div>';
}

const ACTIVITY_RANGES = [
  { weeks: 5,  label: '1 month' },
  { weeks: 13, label: '3 months' },
  { weeks: 26, label: '6 months' },
  { weeks: 52, label: '1 year' }
];
function activityWeeks() {
  const w = Store.state.settings.activityWeeks;
  return ACTIVITY_RANGES.some(r => r.weeks === w) ? w : 13;
}
/* What the heatmap cannot show at a glance, read off the same period. */
function activityStats(weeks) {
  const hist = Store.history(weeks * 7);
  const reviews = hist.reduce((n, h) => n + h.reviews, 0);
  const started = hist.reduce((n, h) => n + h.new, 0);
  const correct = hist.reduce((n, h) => n + h.correct, 0);
  const active = hist.filter(h => h.reviews > 0);
  let run = 0, longest = 0;
  hist.forEach(h => { if (h.reviews > 0) { run++; longest = Math.max(longest, run); } else run = 0; });
  const best = hist.reduce((a, h) => (h.reviews > (a ? a.reviews : 0) ? h : a), null);
  return {
    days: hist.length, reviews: reviews, started: started,
    active: active.length, longest: longest, best: best,
    accuracy: reviews ? Math.round(100 * correct / reviews) : null,
    perActive: active.length ? Math.round(reviews / active.length) : 0
  };
}

function activityPanel(weeks) {
  const a = activityStats(weeks);
  const day = (d) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const row = (k, v, s) => '<div class="as-row"><span class="k">' + k + '</span>' +
    '<span class="v">' + v + '</span>' + (s ? '<span class="s">' + s + '</span>' : '') + '</div>';

  if (!a.reviews) {
    return '<div class="activity-stats"><p class="faint" style="line-height:1.6">' +
      'Nothing studied in this period yet. Once you start reviewing, the squares fill in ' +
      'and your totals appear here.</p></div>';
  }
  return '<div class="activity-stats">' +
    row('Reviews', a.reviews.toLocaleString(), a.perActive + ' per active day') +
    row('Active days', a.active + ' / ' + a.days, pct(a.active, a.days) + '% of the period') +
    row('Longest streak', a.longest + ' day' + (a.longest === 1 ? '' : 's'), 'without a gap') +
    row('Busiest day', a.best.reviews + ' reviews', day(a.best.date)) +
    row('New words started', a.started.toLocaleString(),
        a.accuracy != null ? a.accuracy + '% answered correctly' : '') +
  '</div>';
}

function miniStat(label, n, sub, color) {
  return '<div><div class="row" style="gap:7px"><i class="dot" style="background:' + color + '"></i>' +
    '<b style="font-size:1.2rem">' + n + '</b></div>' +
    '<div style="font-size:.8rem;font-weight:600">' + label + '</div>' +
    '<div class="faint">' + sub + '</div></div>';
}

/* ==========================================================================
   Settings
   ========================================================================== */
const AI_PRESETS = {
  openai:     { label:'OpenAI',              provider:'openai',     baseUrl:'https://api.openai.com/v1',                model:'gpt-4o-mini',            keyUrl:'platform.openai.com/api-keys', note:'Paid, but a mini model costs a few cents a month at this usage.' },
  gemini:     { label:'Google Gemini',       provider:'gemini',     baseUrl:'',                                         model:'gemini-2.0-flash',       keyUrl:'aistudio.google.com/apikey',   note:'Has a free tier — a good place to start.' },
  groq:       { label:'Groq',                provider:'compatible', baseUrl:'https://api.groq.com/openai/v1',           model:'llama-3.3-70b-versatile', keyUrl:'console.groq.com/keys',        note:'Free tier with generous limits and very fast replies.' },
  openrouter: { label:'OpenRouter',          provider:'compatible', baseUrl:'https://openrouter.ai/api/v1',             model:'meta-llama/llama-3.3-70b-instruct:free', keyUrl:'openrouter.ai/keys', note:'Marketplace with several models marked :free.' },
  deepseek:   { label:'DeepSeek',            provider:'compatible', baseUrl:'https://api.deepseek.com/v1',              model:'deepseek-chat',          keyUrl:'platform.deepseek.com',        note:'Paid but extremely cheap.' },
  ollama:     { label:'Ollama (on your PC)', provider:'compatible', baseUrl:'http://localhost:11434/v1',                model:'llama3.1',               keyUrl:'ollama.com',                   note:'Runs offline on your own computer. No key, no cost.' }
};

function renderSettings(host) {
  const s = Store.state.settings;
  const ai = s.ai;

  host.innerHTML =
    '<div class="section-title" style="margin-top:0"><h2>Appearance</h2><span class="hint">Applies instantly</span></div>' +
    '<div class="card">' +
      '<div class="field"><label>Theme</label><div class="theme-opts">' +
        THEMES.map(t => '<button class="theme-opt' + (s.theme === t.id ? ' sel' : '') + '" data-pick-theme="' + t.id + '">' +
          '<div class="prev" style="background:' + t.colors[0] + '">' +
            '<b style="background:' + t.colors[1] + '"></b><b style="background:' + t.colors[2] + '"></b><b style="background:' + t.colors[1] + '"></b>' +
          '</div><div class="nm">' + t.name + '</div></button>').join('') +
      '</div></div>' +

      '<div class="field"><label>Accent colour</label><div class="swatches">' +
        ACCENTS.map(a => '<button class="swatch' + (s.accent === a.id ? ' sel' : '') + '" data-pick-accent="' + a.id + '" ' +
          'title="' + a.name + '" style="background:' + a.hex + '"><i style="background:rgba(0,0,0,.22)"></i></button>').join('') +
      '</div></div>' +

      '<div class="field"><label>Typeface</label><div class="font-opts">' +
        FONTS.map(f => '<button class="font-opt' + (s.font === f.id ? ' sel' : '') + '" data-pick-font="' + f.id + '">' +
          '<div class="sample" style="font-family:' + fontStack(f.id) + '">Aa</div>' +
          '<div class="nm">' + f.name + '</div></button>').join('') +
      '</div></div>' +

      '<div class="field" style="margin-bottom:0"><label>Text size</label><div class="seg">' +
        [['sm', 'Small'], ['md', 'Medium'], ['lg', 'Large'], ['xl', 'X-large']].map(o =>
          '<button data-pick-size="' + o[0] + '" class="' + (s.size === o[0] ? 'sel' : '') + '">' + o[1] + '</button>').join('') +
      '</div></div>' +
    '</div>' +

    '<div class="section-title"><h2>Study rules</h2></div>' +
    '<div class="card">' +
      '<div class="inline-fields">' +
        '<div class="field"><label>New words per day</label>' +
          '<input type="number" id="setNew" min="0" max="200" value="' + s.newPerDay + '">' +
          '<span class="help">How many unseen cards enter the rotation each day. 10–20 is a sustainable pace.</span></div>' +
        '<div class="field"><label>Maximum reviews per day</label>' +
          '<input type="number" id="setRev" min="10" max="999" value="' + s.reviewPerDay + '">' +
          '<span class="help">A safety cap so a backlog never becomes overwhelming.</span></div>' +
      '</div>' +
      '<div class="field"><label>Question side</label><select id="setDir">' +
        [['term-first', 'Show the English word — recall what it means'],
         ['translation-first', 'Show the translation — recall the English word'],
         ['definition-first', 'Show the English definition — recall the English word'],
         ['mixed', 'Mix all three']].map(o =>
          '<option value="' + o[0] + '"' + (s.studyDirection === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') +
      '</select><span class="help">A card missing the side a direction needs falls back to another one.</span></div>' +
      '<div class="field"><label>Answer choices per question</label><div class="seg">' +
        [4, 5].map(n => '<button data-pick-opts="' + n + '" class="' +
          (optionCount() === n ? 'sel' : '') + '">' + n + ' options</button>').join('') +
      '</div><span class="help">Applies to the multiple-choice drills and AI quizzes. ' +
      'How long a round is set on the Practice screen itself.</span></div>' +
      '<label class="switch"><input type="checkbox" id="setEx"' + (s.showExampleOnFront ? ' checked' : '') + '>' +
        '<span class="track"></span><span class="txt">Show the example sentence on the front' +
        '<small>Seeing the word in context. When the word is what you have to recall, ' +
        'it appears as a gap instead.</small></span></label>' +
      '<label class="switch"><input type="checkbox" id="setSpeak"' + (s.autoSpeak ? ' checked' : '') + '>' +
        '<span class="track"></span><span class="txt">Pronounce words automatically' +
        '<small>Uses the voices already installed on your computer.</small></span></label>' +
      '<label class="switch"><input type="checkbox" id="setQuizSrs"' + (s.quizAffectsSrs ? ' checked' : '') + '>' +
        '<span class="track"></span><span class="txt">Practice results affect scheduling' +
        '<small>A word you miss in a quiz comes back sooner.</small></span></label>' +
    '</div>' +

    '<div class="section-title"><h2>AI assistant</h2><span class="hint">Entirely optional</span></div>' +
    '<div class="card">' +
      '<label class="switch" style="padding-top:0"><input type="checkbox" id="aiOn"' + (ai.enabled ? ' checked' : '') + '>' +
        '<span class="track"></span><span class="txt">Enable AI features' +
        '<small>Auto-fill cards, generate decks, write fresh quiz questions and mark your sentences.</small></span></label>' +
      '<div id="aiBox" class="' + (ai.enabled ? '' : 'hidden') + '">' +
        '<div class="field"><label>Provider</label><div class="row" style="gap:7px">' +
          Object.keys(AI_PRESETS).map(k => '<button class="soft-btn tiny" data-preset="' + k + '">' +
            esc(AI_PRESETS[k].label) + '</button>').join('') +
        '</div><span class="help" id="presetNote">Pick a provider to fill in the settings below, then paste your key.</span></div>' +
        '<div class="inline-fields">' +
          '<div class="field"><label>API type</label><select id="aiProvider">' +
            [['openai', 'OpenAI'], ['compatible', 'OpenAI-compatible'], ['gemini', 'Google Gemini']].map(o =>
              '<option value="' + o[0] + '"' + (ai.provider === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') +
          '</select></div>' +
          '<div class="field"><label>Model</label><input type="text" id="aiModel" value="' + esc(ai.model) + '"></div>' +
        '</div>' +
        '<div class="field"><label>API base URL</label>' +
          '<input type="text" id="aiBase" value="' + esc(ai.baseUrl) + '" placeholder="https://api.openai.com/v1">' +
          '<span class="help">Ignored for Google Gemini.</span></div>' +
        '<div class="field"><label>API key</label>' +
          '<input type="password" id="aiKey" value="' + esc(ai.apiKey) + '" placeholder="sk-…" autocomplete="off">' +
          '<span class="help">Stored only in this browser, on this computer. It is sent to your chosen provider and nowhere else.</span></div>' +
        '<div class="field"><label>Your native language</label>' +
          '<input type="text" id="aiLang" value="' + esc(ai.nativeLanguage) + '">' +
          '<span class="help">Used for translations and short explanations.</span></div>' +
        '<div class="row"><button class="ghost-btn" id="aiTest">Test the connection</button>' +
          '<span id="aiTestOut" class="faint"></span></div>' +
        '<p class="faint" style="margin-top:14px;line-height:1.6">Roughly what it costs: one auto-filled card or one quiz question is ' +
          'about 500–1,500 tokens. With a small model that is a fraction of a cent — heavy daily use lands well under a dollar a month. ' +
          'Gemini, Groq and OpenRouter all have free tiers, and Ollama runs offline on your own machine for nothing.</p>' +
      '</div>' +
    '</div>' +

    '<div class="section-title"><h2>Your data</h2></div>' +
    '<div class="card">' +
      (Store.memoryOnly
        ? '<div class="feedback no" style="margin-bottom:14px"><b>Warning:</b> this browser is blocking local storage, so your ' +
          'progress will disappear when you close the tab. Export a backup, and see the README for how to fix it.</div>'
        : '<p class="muted" style="margin-bottom:14px">Everything is saved automatically in this browser. ' +
          'Nothing is uploaded anywhere. Export a backup file now and then, especially before clearing your browser data.</p>') +
      '<div class="row">' +
        '<button class="primary-btn" data-act="backup">Download backup (.json)</button>' +
        '<button class="ghost-btn" data-act="restore">Restore from backup</button>' +
        '<button class="ghost-btn" data-act="csv">Export as CSV</button>' +
        '<button class="ghost-btn" data-act="import">Import CSV</button>' +
        '<button class="ghost-btn" data-act="starters">Restore starter words</button>' +
      '</div>' +
      '<p class="faint" style="margin-top:10px">' +
        '“Restore starter words” fills in starter content your collection is missing — ' +
        'words added since you started, and starter cards whose meanings have since been ' +
        'separated. It never changes a word you have edited yourself, and never touches ' +
        'your review history.</p>' +
      '<p class="faint" style="margin-top:12px">' +
        Store.state.cards.length + ' words · ' + Store.state.decks.length + ' decks · ' +
        Store.state.log.length + ' reviews recorded · ' +
        /* Printed so a collection that is behind can be spotted at a glance. */
        'starter words rev ' + (Store.state.starterRevision || 0) + '/' + STARTER_REVISION +
        (Store.state.lastBackup ? ' · last backup ' + new Date(Store.state.lastBackup).toLocaleDateString() : ' · never backed up') +
      '</p>' +
      '<div class="row" style="margin-top:18px;padding-top:16px;border-top:1px solid var(--border-soft)">' +
        '<button class="danger-btn" data-act="reset">Reset all progress</button>' +
        '<button class="danger-btn" data-act="wipe">Delete everything</button>' +
      '</div>' +
      '<p class="faint" style="margin-top:8px">Resetting progress keeps your words but forgets the review schedule.</p>' +
    '</div>' +

    '<div class="section-title"><h2>Keyboard shortcuts</h2></div>' +
    '<div class="card">' +
      '<div class="shortcut-row"><span>Reveal answer / continue</span><kbd>Space</kbd></div>' +
      '<div class="shortcut-row"><span>Rate a card</span><span><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd></span></div>' +
      '<div class="shortcut-row"><span>Pick a quiz option</span><span><kbd>1</kbd> … <kbd>4</kbd></span></div>' +
      '<div class="shortcut-row"><span>Pronounce the word</span><kbd>S</kbd></div>' +
      '<div class="shortcut-row"><span>Undo the last answer</span><kbd>U</kbd></div>' +
      '<div class="shortcut-row"><span>Add a new word</span><kbd>N</kbd></div>' +
      '<div class="shortcut-row"><span>Close a dialog</span><kbd>Esc</kbd></div>' +
    '</div>' +
    '<p class="faint" style="margin:18px 0 6px;text-align:center">Lexio · runs entirely on your computer · v1.0</p>';

  bindSettings(host);
}

function fontStack(id) {
  return ({ sans: 'Inter,system-ui,sans-serif', rounded: 'ui-rounded,"SF Pro Rounded",Nunito,system-ui,sans-serif',
    serif: '"Iowan Old Style",Georgia,serif', humanist: 'Optima,Candara,"Trebuchet MS",sans-serif',
    mono: 'ui-monospace,Menlo,Consolas,monospace' })[id];
}

function bindSettings(host) {
  const s = Store.state.settings;
  const set = (patch) => { Object.assign(s, patch); Store.save(); applyAppearance(); render('settings'); };

  host.onclick = async (e) => {
    const t = e.target.closest('[data-pick-theme]');  if (t) return set({ theme: t.dataset.pickTheme });
    const a = e.target.closest('[data-pick-accent]'); if (a) return set({ accent: a.dataset.pickAccent });
    const f = e.target.closest('[data-pick-font]');   if (f) return set({ font: f.dataset.pickFont });
    const z = e.target.closest('[data-pick-size]');   if (z) return set({ size: z.dataset.pickSize });
    const o = e.target.closest('[data-pick-opts]');
    if (o) { s.optionCount = parseInt(o.dataset.pickOpts, 10); Store.save(); return render('settings'); }

    const p = e.target.closest('[data-preset]');
    if (p) {
      const preset = AI_PRESETS[p.dataset.preset];
      Object.assign(s.ai, { provider: preset.provider, baseUrl: preset.baseUrl, model: preset.model });
      Store.save(); render('settings');
      const note = $('#presetNote');
      if (note) note.innerHTML = '<b>' + esc(preset.label) + '</b> — ' + esc(preset.note) +
        ' Get a key at <b>' + esc(preset.keyUrl) + '</b>, then paste it below.';
      return;
    }

    if (e.target.closest('[data-act="backup"]')) {
      download('lexio-backup-' + stamp() + '.json', Store.exportJSON());
      toast('Backup downloaded', 'ok'); return render('settings');
    }
    if (e.target.closest('[data-act="starters"]')) {
      const r = Store.refreshStarters();
      if (!r.repaired && !r.added) toast('Starter words are already up to date', 'ok');
      else {
        const parts = [];
        if (r.repaired) parts.push(r.repaired + ' word' + (r.repaired === 1 ? '' : 's') + ' updated');
        if (r.added) parts.push(r.added + ' added');
        toast(parts.join(' · '), 'ok');
      }
      refreshChrome(); return render('settings');
    }
    if (e.target.closest('[data-act="csv"]')) {
      download('lexio-words-' + stamp() + '.csv', Store.exportCSV(), 'text/csv');
      return toast('CSV exported', 'ok');
    }
    if (e.target.closest('[data-act="restore"]')) return restoreDialog();
    if (e.target.closest('[data-act="import"]')) return importDialog();
    if (e.target.closest('[data-act="reset"]')) {
      const ok = await confirmDialog('Reset progress',
        'Every word stays. Everything else goes: each card returns to <b>New</b>, and the ' +
        'review history behind your streak, totals, recall and activity map is erased. ' +
        'Today\'s counters reset too, so the full daily allowance of new words is available again.',
        'Reset progress', true);
      if (ok) { Store.resetProgress(); toast('Progress reset', 'ok'); render('settings'); refreshChrome(); }
      return;
    }
    if (e.target.closest('[data-act="wipe"]')) {
      const ok = await confirmDialog('Delete everything',
        'This removes every deck, word and statistic, and restores the starter decks. Download a backup first if you are not sure.',
        'Delete everything', true);
      if (ok) { Store.wipe(); applyAppearance(); toast('All data cleared', 'ok'); go('dashboard'); }
      return;
    }
  };

  const num = (id, key, min, max) => {
    const el = $('#' + id);
    if (el) el.onchange = () => { s[key] = clamp(parseInt(el.value, 10) || min, min, max); Store.save(); refreshChrome(); };
  };
  num('setNew', 'newPerDay', 0, 200);
  num('setRev', 'reviewPerDay', 5, 999);
  const dir = $('#setDir'); if (dir) dir.onchange = () => { s.studyDirection = dir.value; Store.save(); };
  const chk = (id, key) => { const el = $('#' + id); if (el) el.onchange = () => { s[key] = el.checked; Store.save(); }; };
  chk('setEx', 'showExampleOnFront'); chk('setSpeak', 'autoSpeak'); chk('setQuizSrs', 'quizAffectsSrs');

  const on = $('#aiOn');
  if (on) on.onchange = () => { s.ai.enabled = on.checked; Store.save(); $('#aiBox').classList.toggle('hidden', !on.checked); };
  const bindAI = (id, key) => { const el = $('#' + id); if (el) el.onchange = () => { s.ai[key] = el.value.trim(); Store.save(); }; };
  bindAI('aiProvider', 'provider'); bindAI('aiModel', 'model'); bindAI('aiBase', 'baseUrl');
  bindAI('aiKey', 'apiKey'); bindAI('aiLang', 'nativeLanguage');

  const test = $('#aiTest');
  if (test) test.onclick = async () => {
    ['aiProvider', 'aiModel', 'aiBase', 'aiKey', 'aiLang'].forEach(id => { const el = $('#' + id); if (el) el.onchange(); });
    const out = $('#aiTestOut');
    test.disabled = true; out.textContent = 'Contacting the provider…';
    try { const r = await AI.test(); out.innerHTML = '<span style="color:var(--good)">Connected. Reply: “' + esc(r) + '”</span>'; }
    catch (err) { out.innerHTML = '<span style="color:var(--bad)">' + esc(err.message) + '</span>'; }
    test.disabled = false;
  };
}

/* ---------- import / restore dialogs ---------------------------------------- */
function importDialog() {
  openModal({
    title: 'Import words from a CSV file',
    body:
      '<p class="muted" style="margin-bottom:14px">Columns, in this order: ' +
        '<b>term, part of speech, definition, example, translation, category</b>. ' +
        'A header row is detected automatically. Files exported from Lexio import cleanly.</p>' +
      '<div class="field"><label>Add the words to</label><select id="impDeck">' + deckOptions('', 'Create a new deck') + '</select></div>' +
      '<div class="field"><label>CSV file</label><input type="file" id="impFile" accept=".csv,.txt,text/csv"></div>' +
      '<div class="field" style="margin-bottom:0"><label>…or paste the rows here</label>' +
        '<textarea id="impText" rows="5" placeholder="serendipity,noun,A happy accident,It was pure serendipity.,tesadüf,Life"></textarea></div>',
    foot: '<button class="ghost-btn" data-act="cancel">Cancel</button><button class="primary-btn" data-act="go">Import</button>',
    onMount: (b, f) => {
      f.querySelector('[data-act="cancel"]').onclick = closeModal;
      f.querySelector('[data-act="go"]').onclick = async () => {
        let text = $('#impText').value.trim();
        const file = $('#impFile').files[0];
        if (file) text = await file.text();
        if (!text) return toast('Choose a file or paste some rows', 'err');
        let deckId = $('#impDeck').value;
        if (!deckId) deckId = Store.addDeck({ name: 'Imported ' + new Date().toLocaleDateString(), emoji: '📥' }).id;
        try {
          const r = Store.importCSV(text, deckId);
          closeModal();
          toast(r.added + ' word' + (r.added === 1 ? '' : 's') + ' imported' +
                (r.skipped ? ' · ' + r.skipped + ' duplicate' + (r.skipped === 1 ? '' : 's') + ' skipped' : ''),
                r.added ? 'ok' : 'info');
          go('decks', { deckId: deckId });
        } catch (err) { toast('Could not read that file: ' + err.message, 'err'); }
      };
    }
  });
}

function restoreDialog() {
  openModal({
    title: 'Restore from a backup file',
    body:
      '<div class="field"><label>Backup file (.json)</label><input type="file" id="resFile" accept=".json,application/json"></div>' +
      '<div class="field" style="margin-bottom:0"><label>How should it be applied?</label><select id="resMode">' +
        '<option value="merge">Merge — add words that are missing, keep my current progress</option>' +
        '<option value="replace">Replace — wipe what is here and use the backup exactly</option>' +
      '</select></div>',
    foot: '<button class="ghost-btn" data-act="cancel">Cancel</button><button class="primary-btn" data-act="go">Restore</button>',
    onMount: (b, f) => {
      f.querySelector('[data-act="cancel"]').onclick = closeModal;
      f.querySelector('[data-act="go"]').onclick = async () => {
        const file = $('#resFile').files[0];
        if (!file) return toast('Choose a backup file', 'err');
        const mode = $('#resMode').value;
        if (mode === 'replace') {
          const ok = await confirmDialog('Replace everything',
            'Your current words and progress will be permanently replaced by the backup.', 'Replace', true);
          if (!ok) return;
        }
        try {
          const r = Store.importJSON(await file.text(), mode);
          applyAppearance();
          closeModal();
          toast(r.mode === 'merge' ? r.added + ' words added' : 'Backup restored', 'ok');
          go('dashboard');
        } catch (err) { toast(err.message, 'err'); }
      };
    }
  });
}

/* ==========================================================================
   Boot
   ========================================================================== */
function boot() {
  Store.load();
  applyAppearance();

  /* An older collection has just had its starter words brought up to date.
     Say so — words appearing on their own would otherwise be alarming. */
  if (Store._starterUpgrade) {
    const u = Store._starterUpgrade;
    const parts = [];
    if (u.repaired) parts.push(u.repaired + ' starter word' + (u.repaired === 1 ? '' : 's') + ' updated');
    if (u.added) parts.push(u.added + ' new sense' + (u.added === 1 ? '' : 's') + ' added');
    setTimeout(() => toast(parts.join(' · ') + ' — see Browse', 'ok'), 700);
    Store.saveNow();
  }

  $('#nav').onclick = (e) => {
    const b = e.target.closest('.nav-item');
    if (b) go(b.dataset.view, {});
  };
  $('#menuToggle').onclick = () => $('#app').classList.toggle('menu-open');
  $('#scrim').onclick = () => $('#app').classList.remove('menu-open');
  $('#topStudyBtn').onclick = () => go('study', {});
  $('#quickBackup').onclick = () => {
    download('lexio-backup-' + stamp() + '.json', Store.exportJSON());
    toast('Backup downloaded', 'ok');
  };
  $('#themeQuick').onclick = () => {
    const s = Store.state.settings;
    const darks = ['dark', 'midnight', 'nord', 'forest', 'mono'];
    s.theme = darks.indexOf(s.theme) !== -1 ? 'light' : 'dark';
    Store.save(); applyAppearance();
    if (currentView === 'settings') render('settings');
  };
  $('#modalHost').onclick = (e) => { if (e.target.closest('[data-close]')) closeModal(); };

  const sa = $('#scrollArea'), toTop = $('#toTop');
  sa.addEventListener('scroll', () => {
    toTop.classList.toggle('show', sa.scrollTop > 420);
  }, { passive: true });
  toTop.onclick = () => {
    /* focus() must come first and skip its own scroll, otherwise it aborts
       the smooth scroll we are about to start. */
    try { sa.focus({ preventScroll: true }); } catch (e) { }
    sa.scrollTo({ top: 0, behavior: 'smooth' });
  };

  document.addEventListener('keydown', onKey);
  window.addEventListener('beforeunload', () => Store.saveNow());

  go('dashboard', {});

  if (Store.memoryOnly) {
    toast('This browser is blocking local storage — your progress will not be saved. See the README.', 'err');
  }
  /* A gentle nudge to keep a backup once there is something worth losing. */
  const age = Store.state.lastBackup ? Date.now() - Store.state.lastBackup : Infinity;
  if (Store.state.log.length > 60 && age > 21 * 86400000) {
    setTimeout(() => toast('It has been a while since your last backup — Settings → Download backup.', 'info'), 3000);
  }
}

/* The scrollable region is a div, so Page Up/Down, Home/End, the arrows and
   the space bar have to be wired up by hand — the browser only does this for
   the document itself. */
function scrollByKey(e) {
  const sa = $('#scrollArea');
  if (!sa || sa.scrollHeight <= sa.clientHeight) return false;
  const page = Math.max(140, sa.clientHeight - 70);
  let delta;
  switch (e.key) {
    case 'PageDown': delta = page; break;
    case 'PageUp': delta = -page; break;
    case 'ArrowDown': delta = 90; break;
    case 'ArrowUp': delta = -90; break;
    case ' ': delta = e.shiftKey ? -page : page; break;
    case 'Home': sa.scrollTop = 0; e.preventDefault(); return true;
    case 'End': sa.scrollTop = sa.scrollHeight; e.preventDefault(); return true;
    default: return false;
  }
  sa.scrollTop += delta;
  e.preventDefault();
  return true;
}

function onKey(e) {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  const modalOpen = !$('#modalHost').classList.contains('hidden');

  if (e.key === 'Escape') {
    if (modalOpen) return closeModal();
    if (currentView === 'study' && session) return endSession();
    if (currentView === 'practice' && quiz) { quiz = null; return render('practice'); }
    return;
  }
  if (modalOpen || typing) return;

  if (currentView === 'study' && session && !session.finished) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      return session.revealed ? rateCard(3) : revealCard();
    }
    if (['1', '2', '3', '4'].indexOf(e.key) !== -1 && session.revealed) {
      e.preventDefault(); return rateCard(parseInt(e.key, 10));
    }
    if (e.key.toLowerCase() === 's') { const c = currentCard(); if (c) TTS.speak(c.term); return; }
    if (e.key.toLowerCase() === 'u') return undoAnswer();
    return;
  }

  if (currentView === 'practice' && quiz && !quiz.finished) {
    const item = quiz.items[quiz.i];
    if (!item) return;
    if (e.key === ' ' || e.key === 'Enter') {
      if (quiz.state === 'answered') { e.preventDefault(); return nextQuizItem(); }
      return;
    }
    if (item.type === 'mc' && quiz.state !== 'answered') {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= item.options.length) { e.preventDefault(); return answerMC(item, item.options[n - 1]); }
    }
    if (e.key.toLowerCase() === 's' && item.card) return TTS.speak(item.speak || item.card.term);
    return;
  }

  if (scrollByKey(e)) return;
  if (e.key.toLowerCase() === 'n') { e.preventDefault(); return cardEditor(null); }
  const jump = { d: 'dashboard', k: 'decks', s: 'study', p: 'practice', b: 'browse', g: 'stats', ',': 'settings' }[e.key.toLowerCase()];
  if (jump) go(jump, {});
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
