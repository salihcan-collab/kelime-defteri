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
        '<path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>',
  /* Looking back over a finished round — a marked page, not the hint bulb. */
  review: '<svg viewBox="0 0 24 24"><path d="M5 3h9l5 5v13H5z"/><path d="M14 3v5h5"/>' +
          '<path d="M8.5 13.5l2 2 4-4.5"/></svg>'
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

  /* "Start studying" while you are already studying is a button with nothing
     to do. In that case it stops being a button and says where you are. */
  const busy =
    (currentView === 'study' && session && !session.finished) ? 'Studying' :
    (currentView === 'practice' && quiz && !quiz.finished) ? 'Practising' : '';
  const top = $('#topStudyBtn');
  top.classList.toggle('is-state', !!busy);
  top.disabled = !!busy;
  top.querySelector('span').textContent = busy || 'Start studying';
  document.title = (total ? '(' + total + ') ' : '') + 'Lexio — Vocabulary Trainer';
}

/* ---------- shared bits ------------------------------------------------------ */
/* How well the word is known. Every card has exactly one level, and it says
   nothing about whether a review is due — that is shown separately, because
   a Learning card can be due or not, and so can a Mastered one. The coloured
   dot also keeps the level apart from anything else on the row. */
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
function parseRelations(synValue, antValue, familyValue) {
  return splitList(synValue).map(t => ({ kind: 'syn', text: t }))
    .concat(splitList(antValue).map(t => ({ kind: 'ant', text: t })))
    .concat(splitList(familyValue).map(t => ({ kind: 'family', text: t })));
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

const REL_LABEL = { syn: 'synonym', ant: 'opposite' };
const REL_MARK  = { syn: '\u2248', ant: '\u00d7' };   /* ≈ means like this, × means the opposite */

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
      '<i class="mark">' + (REL_MARK[r.kind] || '') + '</i>' + esc(r.text) +
    '</span>').join('') + '</div>';
}

/* Everything below the answer itself — the phrases the word lives in, the words
   it sits next to, your own note. Given the same weight as the meaning they
   crowd the card, so they share one quieter strip below a hairline and sit side
   by side while there is width for it. */
function cardExtras(card) {
  const rels = Store.relationsFor(card);
  const family = familyList(card);
  const parts = [];
  if ((card.collocations || []).length) parts.push(['Collocations', collocationList(card)]);
  if (rels.length) parts.push(['Related', relationChips(card)]);
  if (family) parts.push(['Word family', family]);
  if (card.notes) parts.push(['Your note', '<p class="fx-note">' + esc(card.notes) + '</p>']);
  if (!parts.length) return '';
  /* One thing on its own gets the full width; two or three share columns.
     The strip is always built, and the switch only hides it — turning it off
     mid-card must not redraw the card you are looking at. */
  return '<div class="fc-extras' + (parts.length === 1 ? ' one' : '') +
    (Store.state.settings.showExtras === false ? ' off' : '') + '">' + parts.map(p =>
    '<div class="fx"><div class="fx-k">' + p[0] + '</div>' + p[1] + '</div>').join('') + '</div>';
}

/* The rest of the family, each with the part of speech that tells it apart —
   seeing analyse, analysis, analytical together is most of the point. */
function familyList(card) {
  const members = Store.familyOf(card);
  if (!members.length) return '';
  return '<div class="fam-row">' + members.map(m =>
    '<span class="fam' + (m.missing ? ' fam-missing' : '') + '">' + esc(m.term) +
      (m.pos ? '<i>' + esc(shortPos(m.pos)) + '</i>' : '') +
    '</span>').join('') + '</div>';
}

const POS_SHORT = { noun: 'n', verb: 'v', adjective: 'adj', adverb: 'adv',
                    'phrasal verb': 'phr v', idiom: 'idiom', preposition: 'prep',
                    conjunction: 'conj', pronoun: 'pron', determiner: 'det',
                    interjection: 'interj', phrase: 'phr' };
function shortPos(pos) { return POS_SHORT[pos] || pos; }

function collocationList(card) {
  const list = card.collocations || [];
  if (!list.length) return '';
  /* No emphasis inside the phrases: the word is the title of the card, and
     bolding it three more times just makes the list noisy. */
  return '<ul class="colloc">' + list.map(c => '<li>' + esc(c) + '</li>').join('') + '</ul>';
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

    wordOfDayHTML() +

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
    if (e.target.closest('[data-act="quick-add"]')) return cardEditor(null);
    if (e.target.closest('[data-act="wotd-new"]')) return fetchWordOfDay(true);
    if (e.target.closest('[data-act="wotd-history"]')) return wordOfDayHistory();
    if (e.target.closest('[data-act="wotd-add"]')) {
      const w = Store.state.wotd;
      /* An id would make this an edit of a card that does not exist; without
         one the editor opens as "Add a word" with the boxes already filled. */
      if (w) cardEditor({ term: w.term, pos: w.pos, definition: w.definition,
                          example: w.example, translation: w.translation, notes: '',
                          collocations: [], related: [] });
      return;
    }
  };
  /* One word a day, fetched the first time the dashboard is opened that day —
     never twice, and never again after it has failed until it is asked for. */
  if (wordOfDayWanted() && !wordOfDayToday() && !wotdState.busy && !wotdState.failed) fetchWordOfDay(false);
}

/* ---------- word of the day ------------------------------------------------ */
let wotdState = { busy: false, failed: '' };

/* The two providers worth pointing one small daily request at: both are free.
   Ollama is an OpenAI-compatible server on the learner's own machine, so it
   carries the address that finds it. */
const WOTD_PROVIDERS = [
  { id: 'gemini', label: 'Google Gemini (free tier)', provider: 'gemini',
    baseUrl: '', model: 'gemini-3.6-flash' },
  { id: 'ollama', label: 'Ollama (on your PC)', provider: 'compatible',
    baseUrl: 'http://localhost:11434/v1', model: 'llama3.1' }
];
function wotdKind(cfg) { return cfg.provider === 'gemini' ? 'gemini' : 'ollama'; }
function wotdProviderHelp(cfg) {
  return wotdKind(cfg) === 'gemini'
    ? 'Google Gemini has a free tier, and one word a day fits well inside it. ' +
      'Get a key at <b>aistudio.google.com/apikey</b>.'
    : 'Ollama runs on your own computer, so it needs no key and costs nothing — ' +
      'start it with <b>ollama serve</b> and pull the model first.';
}

/* Who is answering, in the words the learner chose it by. */
function providerLabel(cfg) {
  if (cfg.provider === 'gemini') return 'Google Gemini';
  if (cfg.provider === 'openai') return 'OpenAI';
  const known = Object.keys(AI_PRESETS).filter(k =>
    AI_PRESETS[k].baseUrl && cfg.baseUrl && cfg.baseUrl.indexOf(AI_PRESETS[k].baseUrl) === 0)[0];
  /* "by Ollama", not "by Ollama (on your PC)" — the bracket is for choosing it,
     not for signing its work. */
  if (known) return AI_PRESETS[known].label.replace(/\s*\(.*\)$/, '');
  try { return new URL(cfg.baseUrl).hostname.replace(/^www\./, ''); }
  catch (e) { return 'your own provider'; }
}

/* The word of the day may have an assistant of its own — a free key for one
   small request a day — and falls back to the one the drills use. */
function wotdAI() {
  const alt = Store.state.settings.wotdAi;
  return alt && alt.separate ? AI.as(Object.assign({ enabled: true }, alt)) : AI;
}
function wordOfDayWanted() {
  return wotdAI().available() && Store.state.settings.wordOfDay !== false;
}
function wordOfDayToday() {
  const w = Store.state.wotd;
  return w && w.day === todayKey() ? w : null;
}

function wordOfDayHTML() {
  if (!wordOfDayWanted()) return '';
  const w = wordOfDayToday();
  const head = (right) =>
    '<div class="card wotd" style="margin-top:16px">' +
      '<div class="section-title" style="margin:0 0 10px">' +
        '<h2>' + ICONS.spark + '<span class="wotd-title">Word of the day</span></h2>' +
        (right || '') + '</div>';

  if (wotdState.busy)
    return head('') + '<div class="ai-thinking">' + ICONS.loader + 'Finding a word for today…</div></div>';
  if (!w)
    return head('<button class="soft-btn tiny" data-act="wotd-new">Try again</button>') +
      '<p class="muted">' + esc(wotdState.failed || 'No word yet today.') + '</p></div>';

  const known = Store.cardByTerm ? Store.cardByTerm(w.term) : null;
  /* One word a day means one replacement too: "another word" is a change of
     mind, not a way to spend the morning shopping for a nicer word. */
  return head('<div class="row" style="gap:8px">' +
      (known ? '' : '<button class="soft-btn tiny" data-act="wotd-add">' + ICONS.plus + 'Add to my words</button>') +
      (w.replaced
        ? '<span class="faint">another one tomorrow</span>'
        : '<button class="soft-btn tiny" data-act="wotd-new">Another word</button>') +
      (Store.state.wotdLog.length > 1
        ? '<button class="soft-btn tiny" data-act="wotd-history">' + ICONS.review + 'History</button>' : '') +
      '</div>') +
    '<div class="row" style="gap:10px;align-items:baseline">' +
      '<b style="font-size:1.35rem;letter-spacing:-.02em">' + esc(w.term) + '</b>' +
      (w.pos ? '<span class="chip pos">' + esc(w.pos) + '</span>' : '') +
      (known ? '<span class="faint">already in your words</span>' : '') +
    '</div>' +
    (w.definition ? '<p class="muted" style="margin-top:7px">' + esc(w.definition) + '</p>' : '') +
    (w.example ? '<p class="fc-example" style="margin-top:9px">' + highlightTerm(w.example, w.term) + '</p>' : '') +
    (w.translation ? '<p style="margin-top:9px;color:var(--accent);font-size:.9rem">' + esc(w.translation) + '</p>' : '') +
    (w.note ? '<p class="faint" style="margin-top:6px">' + esc(w.note) + '</p>' : '') +
    /* Whose answer this is, quietly, in the corner. */
    '<p class="faint" style="margin-top:10px;text-align:right;opacity:.65">by ' +
      esc(providerLabel(wotdAI().cfg)) + '</p>' +
  '</div>';
}

/* The last hundred, newest first. A word that never made it onto a card can
   still be taken from here. */
function wordOfDayHistory() {
  const days = Store.state.wotdLog;
  const when = (d) => {
    if (!d) return '';
    const day = new Date(d + 'T00:00:00');
    return day.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };
  openModal({
    wide: true, noFocus: true,
    title: 'Words of the day',
    body: '<p class="faint" style="margin-bottom:12px">' + days.length + ' word' +
        (days.length === 1 ? '' : 's') + ', newest first. The last hundred are kept.</p>' +
      '<div class="review-list">' + days.map((w, i) =>
        '<div class="review-row">' +
          '<div class="row between" style="gap:12px;align-items:baseline">' +
            '<div style="min-width:0">' +
              '<b>' + esc(w.term) + '</b>' +
              (w.pos ? ' <span class="chip pos">' + esc(w.pos) + '</span>' : '') +
              (w.translation ? ' <span class="faint">· ' + esc(w.translation) + '</span>' : '') +
            '</div>' +
            '<div class="row" style="gap:10px;flex:none">' +
              '<span class="faint">' + esc(when(w.day)) + '</span>' +
              (Store.cardByTerm(w.term) ? '<span class="faint">saved</span>'
                : '<button class="soft-btn tiny" data-keep="' + i + '">' + ICONS.plus + 'Add</button>') +
            '</div>' +
          '</div>' +
          (w.definition ? '<div class="muted" style="margin-top:4px">' + esc(w.definition) + '</div>' : '') +
        '</div>').join('') + '</div>',
    foot: '<button class="primary-btn" data-act="close">Done</button>',
    onMount: (b, f) => {
      f.querySelector('[data-act="close"]').onclick = closeModal;
      b.onclick = (e) => {
        const keep = e.target.closest('[data-keep]');
        if (!keep) return;
        const w = days[+keep.dataset.keep];
        closeModal();
        cardEditor({ term: w.term, pos: w.pos || '', definition: w.definition || '',
                     example: w.example || '', translation: w.translation || '', notes: '',
                     collocations: [], related: [] });
      };
    }
  });
}

async function fetchWordOfDay(asked) {
  if (wotdState.busy) return;
  wotdState.busy = true; wotdState.failed = '';
  if (currentView === 'dashboard') render('dashboard');
  try {
    const w = await wotdAI().wordOfTheDay(Store.state.wotdLog.map(x => x.term));
    Store.setWordOfDay(w, asked);
  } catch (err) {
    /* A failed fetch is not retried by itself: the next dashboard would spend
       another request on the same problem. */
    wotdState.failed = err.message;
    if (asked) toast(err.message, 'err');
  }
  wotdState.busy = false;
  if (currentView === 'dashboard') render('dashboard');
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
    '<th class="col-level">Level</th>' +
    '<th class="col-next">Next review</th><th class="col-actions"></th>' +
    '</tr></thead><tbody>' +
    cards.map(c =>
      '<tr data-card="' + c.id + '">' +
        '<td class="term col-word">' + esc(c.term) + senseSub(c) + '</td>' +
        '<td class="col-type">' + (c.pos ? '<span class="chip pos">' + esc(c.pos) + '</span>' : '') + '</td>' +
        '<td class="muted col-meaning"><span class="clamp2">' + esc(c.definition || '') + '</span></td>' +
        '<td class="col-translation"><span class="clamp2">' + esc(c.translation) + '</span></td>' +
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
  const has = (kind) => (card.related || []).some(r => r.kind === kind);
  /* Fields, not entries — three collocations still fill one box. */
  return ((card.collocations || []).length ? 1 : 0) +
         (has('syn') ? 1 : 0) + (has('ant') ? 1 : 0) + (has('family') ? 1 : 0) +
         (card.notes ? 1 : 0);
}

/* `card` without an id is a filled-in blank rather than a card being edited —
   the word of the day arrives that way. */
function cardEditor(card, presetDeck) {
  const isNew = !(card && card.id);
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
        : '<p class="help" style="margin:-8px 0 14px">Tip: connect an AI assistant in Settings to fill these fields automatically.</p>') +
      '<div class="field"><label>Meaning (English definition) <em class="req">required</em></label>' +
        '<textarea id="cDef" placeholder="A clear, short definition">' + esc(card ? card.definition : '') + '</textarea></div>' +
      '<div class="field"><label>Example sentence</label>' +
        '<textarea id="cEx" placeholder="A natural sentence that contains the word">' + esc(card ? card.example : '') + '</textarea>' +
        '<span class="help">Used for fill-in-the-blank practice, so keep the word inside the sentence.</span></div>' +
      '<div class="inline-fields">' +
        '<div class="field"><label>Translation</label>' +
          '<input type="text" id="cTr" value="' + esc(card ? card.translation : '') + '" placeholder="Turkish meaning"></div>' +
        '<div class="field"><label>Deck</label><select id="cDeck">' +
          deckOptions(card ? card.deckId : (presetDeck || (Store.state.decks[0] || {}).id)) + '</select></div>' +
      '</div>' +
      /* Everything a word can have but most words do not. Folded away so the
         form stays the five fields you actually fill in, and opened on its own
         for a card that already carries something down here. */
      '<details class="more-fields"' + (extrasFilled(card) ? ' open' : '') + '>' +
        '<summary>More fields' +
          (extrasFilled(card)
            ? '<span class="more-count">' + extrasFilled(card) + ' filled in</span>' : '') +
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
          '<div class="field"><label>Word family</label>' +
            '<input type="text" id="cFam" value="' + esc(card ? relText(card, 'family') : '') + '" placeholder="analysis, analytical">' +
            '<span class="help">Other forms of the same word. Naming one member is enough — ' +
              'the whole family finds itself.</span></div>' +
          '<div class="field"><label>Personal note</label>' +
            '<input type="text" id="cNote" value="' + esc(card ? card.notes : '') + '" placeholder="A memory hook, a false friend…"></div>' +
        '</div>' +
      '</details>' +
      '<div id="dupWarn"></div>',
    foot:
      (isNew ? '' : '<button class="danger-btn" data-act="del">Delete</button>') +
      /* In the gap the spacer used to hold: on the buttons' own row, so it
         costs the dialog no height at all. */
      /* Only a card with a history has a status to show; a filled-in blank has
         none, and asking one for its schedule is how it breaks. */
      (isNew
        ? '<div class="spacer"></div>'
        : '<div class="foot-note" title="' + esc('Status: ' + card.srs.state + ' · seen ' +
            card.stats.seen + ' times · ' + card.stats.correct + ' correct / ' + card.stats.wrong +
            ' wrong · next ' + dueText(card)) + '">' +
            'Status: ' + card.srs.state + ' · seen ' + card.stats.seen + ' times · ' +
            card.stats.correct + ' correct / ' + card.stats.wrong + ' wrong · next ' +
            dueText(card) +
          '</div>') +
      '<button class="ghost-btn" data-act="cancel">Cancel</button>' +
      (isNew ? '<button class="ghost-btn" data-act="save-more">Save &amp; add another</button>' : '') +
      '<button class="primary-btn" data-act="save">Save</button>',
    onMount: (b, f) => {
      const read = () => ({
        term: $('#cTerm').value.trim(), pos: $('#cPos').value, definition: $('#cDef').value.trim(),
        example: $('#cEx').value.trim(), translation: $('#cTr').value.trim(),
        deckId: $('#cDeck').value, notes: $('#cNote').value.trim(),
        sense: $('#cSense').value.trim(),
        collocations: splitLines($('#cColl').value),
        related: parseRelations($('#cSyn').value, $('#cAnt').value, $('#cFam').value)
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
          const before = {
            pos: $('#cPos').value, definition: $('#cDef').value.trim(), example: $('#cEx').value.trim(),
            translation: $('#cTr').value.trim(), collocations: splitLines($('#cColl').value),
            synonyms: splitList($('#cSyn').value), antonyms: splitList($('#cAnt').value),
            family: splitList($('#cFam').value)
          };
          const r = await AI.enrich(term, before);

          /* Only empty boxes are written to. The prompt asks for this as well,
             but what the learner typed is not left to a model's good manners. */
          const putText = (id, value) => {
            const el = $('#' + id);
            if (el && !el.value.trim() && value) { el.value = value; return 1; }
            return 0;
          };
          const putList = (id, list, joiner) => {
            const el = $('#' + id);
            if (el && !el.value.trim() && list && list.length) { el.value = list.join(joiner); return 1; }
            return 0;
          };

          let filled = 0;
          if (!$('#cPos').value && PARTS_OF_SPEECH.indexOf(r.pos) !== -1) { $('#cPos').value = r.pos; filled++; }
          filled += putText('cDef', r.definition);
          filled += putText('cEx', r.example);
          filled += putText('cTr', r.translation);
          filled += putList('cColl', r.collocations, '\n');
          filled += putList('cSyn', r.synonyms, ', ');
          filled += putList('cAnt', r.antonyms, ', ');
          filled += putList('cFam', r.family, ', ');

          /* Anything that landed in the folded half should be visible, or it
             looks as though nothing happened. */
          const more = f.querySelector('.more-fields') || document.querySelector('.more-fields');
          if (more && ['cColl', 'cSyn', 'cAnt'].some(id => $('#' + id).value.trim())) more.open = true;
          checkSenses(); showLinks();

          toast(filled
            ? 'Filled ' + filled + ' empty field' + (filled === 1 ? '' : 's') + ' — check before saving'
            : 'Everything was already filled in', filled ? 'ok' : 'err');
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
          { term: $('#cTerm').value.trim(), related: parseRelations($('#cSyn').value, $('#cAnt').value, $('#cFam').value) });
        const rels = Store.relationsFor(draft);
        const linked = rels.filter(r => r.card);
        $('#relLinks').innerHTML = rels.length
          ? '<p class="help" style="margin:-8px 0 14px">' +
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
      ['cSyn', 'cAnt', 'cFam'].forEach(id => { const el = $('#' + id); if (el) el.addEventListener('input', showLinks); });
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
          levelOptions(Store.state.settings.ai.level) + '</select></div>' +
        '<div class="field"><label>How many words</label><select id="gCount">' +
          [10, 15, 20, 30, 40, 50].map(n => '<option' + (n === 15 ? ' selected' : '') + '>' + n + '</option>').join('') +
        '</select></div>' +
      '</div>' +
      /* The extra fields roughly double what comes back per word, so a big deck
         and full detail together are the expensive corner — worth being a
         choice rather than a default. */
      '<label class="switch" style="padding:2px 0 10px"><input type="checkbox" id="gDetail">' +
        '<span class="track"></span><span class="txt">Fill in the detail too' +
        '<small>Collocations, relations and word family. Slower.</small></span></label>' +
      '<p class="faint">Every word gets its part of speech, meaning, example sentence and ' +
      'translation. You can edit anything afterwards.</p>' +
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
        $('#gOut').innerHTML = '<div class="ai-thinking">' + ICONS.loader +
          ($('#gDetail').checked && parseInt($('#gCount').value, 10) > 20
            ? 'A long one — this can take a minute…'
            : 'This usually takes 10–30 seconds…') + '</div>';
        try {
          const detail = $('#gDetail').checked;
          /* The band chosen here is the one the drills use next time too — the
             level is the learner's, not the deck's. */
          Store.state.settings.ai.level = $('#gLevel').value; Store.save();
          const cards = await AI.suggestCards(topic, $('#gLevel').value, parseInt($('#gCount').value, 10), detail);
          if (!cards.length) throw new Error('The AI did not return any cards.');
          const deck = Store.addDeck({ name: cap(topic), emoji: '✨', description: 'Generated with AI · ' + $('#gLevel').value });
          cards.forEach(c => Store.addCard({
            deckId: deck.id, term: c.term, pos: c.pos, definition: c.definition,
            example: c.example, translation: c.translation,
            collocations: c.collocations,
            related: (c.synonyms || []).map(t => ({ kind: 'syn', text: t }))
              .concat((c.antonyms || []).map(t => ({ kind: 'ant', text: t })))
              .concat((c.family || []).map(t => ({ kind: 'family', text: t })))
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
  refreshChrome();          /* the top-right button reports the session at once */
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
  /* The sense label is a gloss — "to refuse" is most of the answer — so it
     waits until the card is turned, and then sits beside the word rather than
     on a line of its own. Before that, the part of speech in the chip row is
     what narrows a word with several meanings. */
  /* Both states are in the DOM from the start; turning the card is a matter of
     unhiding, not of drawing the screen again. */
  const termWithSense = (show) =>
    esc(card.term) + (senseLabel(card)
      ? '<em class="fc-sense"' + (show ? '' : ' hidden') + '>(' + esc(senseLabel(card)) + ')</em>' : '');

  const front = !askTerm
    ? '<div class="row" style="gap:12px;align-items:center">' +
        '<div class="fc-term">' + termWithSense(session.revealed) + '</div>' +
        (TTS.ok ? '<button class="icon-btn tts-btn" data-act="say" title="Pronounce">' + ICONS.sound + '</button>' : '') +
      '</div>' + frontExample
    : dir === 'translation-first'
      ? '<div class="fc-term">' + esc(card.translation) + '</div>' + frontExample
      : '<div class="fc-prompt">' + esc(card.definition) + '</div>' + frontExample;

  const back =
    '<div class="fc-body"' + (session.revealed ? '' : ' hidden') + '>' +
      (askTerm
        ? '<div class="fc-block"><div class="k">Word</div><div class="row" style="gap:10px">' +
            '<span class="fc-term" style="font-size:1.7rem">' + termWithSense(true) + '</span>' +
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
        '<button class="soft-btn tiny toggle-btn' + (s.showExtras === false ? '' : ' on') + '" data-act="extras" ' +
          'title="Collocations, related words, word family and your notes on the back of the card">' +
          '<span class="dot"></span>Extras</button>' +
        '<div class="bar" style="flex:1"><i style="width:' + progress + '%"></i></div>' +
        '<div class="counts"><span class="c-due">' + remaining + ' left</span>' +
          (session.ahead ? '<span class="c-new">ahead of schedule</span>' : '') + '</div>' +
        (session.undo && Store.canUndo() ? '<button class="soft-btn tiny" data-act="undo">Undo</button>' : '') +
      '</div>' +

      '<div class="flashcard">' +
        '<div class="fc-top">' +
          levelChip(card) +
          (card.pos ? '<span class="chip pos">' + esc(card.pos) + '</span>' : '') +
          '<div class="spacer"></div>' +
          (deck ? '<span class="faint">' + esc(deck.emoji + ' ' + deck.name) + '</span>' : '') +
        '</div>' +
        front + back +
        '<div class="fc-hint"' + (session.revealed ? ' hidden' : '') + '>' +
          'Press <kbd>Space</kbd> or tap the button below</div>' +
      '</div>' +

      '<div class="rate-row"' + (session.revealed ? '' : ' hidden') + '>' +
        rateBtn(1, 'Again', prev[1], 'again') + rateBtn(2, 'Hard', prev[2], 'hard') +
        rateBtn(3, 'Good', prev[3], 'good') + rateBtn(4, 'Easy', prev[4], 'easy') +
      '</div>' +
      '<button class="primary-btn" style="width:100%;padding:14px" data-act="reveal"' +
        (session.revealed ? ' hidden' : '') + '>Show answer</button>' +

      '<div class="row between faint">' +
        '<span>' + session.done + ' answered · ' + Math.round((Date.now() - session.startedAt) / 60000) + ' min</span>' +
        '<button class="soft-btn tiny" data-act="edit">Edit this card</button>' +
      '</div>' +
    '</div>';

  if (s.autoSpeak && !askTerm && !session.spoke) { TTS.speak(card.term); session.spoke = true; }

  host.onclick = (e) => {
    if (e.target.closest('[data-act="say"]')) return TTS.speak(card.term);
    if (e.target.closest('[data-act="reveal"]')) return revealCard();
    const extrasBtn = e.target.closest('[data-act="extras"]');
    if (extrasBtn) {
      const on = Store.state.settings.showExtras === false;
      Store.state.settings.showExtras = on;
      Store.saveNow();
      /* Class flips only: the card, the answer and the scroll position stay. */
      extrasBtn.classList.toggle('on', on);
      const strip = host.querySelector('.fc-extras');
      if (strip) strip.classList.toggle('off', !on);
      return;
    }
    if (e.target.closest('[data-act="quit"]')) return endSession();
    if (e.target.closest('[data-act="undo"]')) return undoAnswer();
    if (e.target.closest('[data-act="edit"]')) return cardEditor(card);
    const r = e.target.closest('[data-rate]');
    if (r) rateCard(parseInt(r.dataset.rate, 10));
  };
}

/* A short burst for a session carried to the end. Reaching the last card is
   the thing worth marking — walking away with End session is not — so it fires
   on completion only, and once: a re-render of the same summary must not set
   it off again.

   Canvas, no library, removed the moment the last piece is off the bottom. */
function confetti() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = document.createElement('canvas');
  cv.className = 'confetti';
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = cv.width = Math.floor(window.innerWidth * dpr);
  const h = cv.height = Math.floor(window.innerHeight * dpr);
  cv.style.width = window.innerWidth + 'px';
  cv.style.height = window.innerHeight + 'px';
  document.body.appendChild(cv);

  /* Centre it on the reading area rather than the window: the sidebar is not
     part of the page you are looking at, and a burst centred on the window
     lands noticeably to its left. */
  const area = document.getElementById('scrollArea');
  const box = area ? area.getBoundingClientRect() : { left: 0, width: window.innerWidth };
  const cx = (box.left + box.width / 2) * dpr;

  const ctx = cv.getContext('2d');
  /* A spread of hues rather than the interface palette — the point of confetti
     is that it does not match anything. The theme's own accent joins in so it
     still belongs to the app. */
  const root = getComputedStyle(document.documentElement);
  const accent = (root.getPropertyValue('--accent') || '').trim();
  const colours = ['#f43f5e', '#f59e0b', '#facc15', '#22c55e', '#14b8a6',
                   '#38bdf8', '#6366f1', '#a855f7', '#ec4899', '#fb923c'];
  if (accent) colours.push(accent, accent);

  const bits = [];
  for (let i = 0; i < 130; i++) {
    bits.push({
      /* thrown from a narrow band in the middle, not across the whole page */
      x: cx + (Math.random() - 0.5) * w * 0.24,
      y: h * (0.46 + Math.random() * 0.05),
      vx: (Math.random() - 0.5) * 5.3 * dpr,
      vy: (-6.6 - Math.random() * 5.5) * dpr,
      w: (4 + Math.random() * 5) * dpr,
      h: (7 + Math.random() * 7) * dpr,
      a: Math.random() * Math.PI, va: (Math.random() - 0.5) * 0.16,
      c: colours[Math.floor(Math.random() * colours.length)]
    });
  }

  /* Light gravity and light drag: the pieces hang in the air on the way down
     rather than being flicked off the screen. */
  const gravity = 0.13 * dpr;
  const start = performance.now();
  const frame = (now) => {
    const life = now - start;
    ctx.clearRect(0, 0, w, h);
    let alive = 0;
    for (const b of bits) {
      b.vy += gravity; b.vx *= 0.992; b.vy *= 0.995;
      b.x += b.vx; b.y += b.vy; b.a += b.va;
      if (b.y < h + 40) alive++;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.a);
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, life - 3200) / 1300);
      ctx.fillStyle = b.c;
      /* the height wobbles with the spin, so each piece reads as a flat flake */
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * (0.35 + 0.65 * Math.abs(Math.cos(b.a))));
      ctx.restore();
    }
    if (alive && life < 4600) requestAnimationFrame(frame);
    else cv.remove();
  };
  requestAnimationFrame(frame);
}

/* Fire once per finished session. The flag lives on the session itself, so
   leaving the summary and coming back does not repeat it. */
function cheer(state) {
  if (!state || !state.completed || state.cheered) return;
  state.cheered = true;
  setTimeout(confetti, 150);
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

  /* Unhide what was already there. Redrawing the view would rebuild the card
     under the pointer and throw away the scroll position for no gain. */
  const host = $('#view-study');
  const open = host && host.querySelector('.fc-body');
  if (!open) return render('study');
  const show = (sel, on) => {
    const el = host.querySelector(sel);
    if (el) el.hidden = !on;
  };
  show('.fc-body', true);
  show('.fc-sense', true);
  show('.fc-hint', false);
  show('[data-act="reveal"]', false);
  show('.rate-row', true);
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
  if (!session.queue.length) { session.completed = true; return endSession(); }
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
  cheer(session);
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
  { id:'matching', name:'Matching translations', desc:'Pair words with their translations on small boards.',
    icon:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="7" height="7" rx="1"/><rect x="14" y="4" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>' },
  { id:'matching-def', name:'Matching meanings', desc:'Pair words with their English definitions — the harder board.',
    icon:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="7" height="7" rx="1"/><path d="M14 6h7M14 9h5"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 16h7M14 19h5"/></svg>' },
  { id:'listening', name:'Listening', desc:'Hear the word spoken, then type what you heard.',
    icon:'<svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>', needsTTS:true },
  { id:'ai-quiz', name:'AI quiz', desc:'Fresh context questions written for you, with explanations.',
    icon:'<svg viewBox="0 0 24 24"><path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/></svg>', ai:true },
  { id:'ai-passage', name:'Fill the passage', desc:'A short text with gaps, and a word bank holding one word too many.',
    icon:'<svg viewBox="0 0 24 24"><path d="M4 6h16M4 10h16M4 18h16M4 14h4M18 14h2"/><rect x="9.5" y="12" width="6.5" height="4" rx="1"/></svg>', ai:true },
  { id:'ai-crossword', name:'Crossword', desc:'A grid built from your words, a clue for each, and the translation as a hint.',
    icon:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/>' +
         '<path d="M9 3v18M3 9h18M15 9v12M9 15h12"/></svg>', ai:true },
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
/* The CEFR bands the AI works to, worded for a learner rather than a syllabus.
   One list, so the practice screen and the deck generator cannot drift apart. */
const LEVEL_NAMES = [['A1-A2', 'Beginner (A1–A2)'], ['B1-B2', 'Intermediate (B1–B2)'], ['C1-C2', 'Advanced (C1–C2)']];
function levelOptions(sel) {
  return LEVEL_NAMES.map(l =>
    '<option value="' + l[0] + '"' + (l[0] === sel ? ' selected' : '') + '>' + l[1] + '</option>').join('');
}

/* Pairs shown on one matching board — more than this stops being playable. */
const MATCH_BOARD_MAX = 6;
/* Texts in one gap-fill round. The whole round is a single request, so this is
   what one answer can hold before the writing thins out. */
const PASSAGE_MAX_TEXTS = 3;
/* A crossword needs enough words to cross, and stops being a grid past twenty. */
const CROSSWORD_MIN = 4;
const CROSSWORD_MAX = 20;
/* How wide the finished grid may grow before it stops fitting a screen. */
const CROSSWORD_SPAN = 20;
/* How far one direction may run ahead of the other, in words. */
const CROSSWORD_LEAN = 2;

/* Words are used in whole texts of four or five, so a round is the largest such
   arrangement the chosen words allow, and null below four. */
function passagePlan(n) {
  let best = null;
  [4, 5].forEach(per => {
    for (let texts = 1; texts <= PASSAGE_MAX_TEXTS; texts++) {
      const total = per * texts;
      if (total <= n && (!best || total > best.total)) best = { per: per, texts: texts, total: total };
    }
  });
  return best;
}

function renderPractice(host) {
  /* A grid is the one thing here that wants more than the reading width the
     rest of the app is built around. */
  const item = quiz && !quiz.finished && quiz.items[quiz.i];
  host.classList.toggle('view-wide', !!(item && item.type === 'crossword'));
  if (quiz && quiz.finished) return drawQuizResults(host);
  if (quiz) return drawQuizItem(host);
  drawPracticeSetup(host);
}

function drawPracticeSetup(host) {
  const pool = practicePool(quizSetup.deckId, quizSetup.scope);
  const aiOn = AI.available();
  const blocked = startBlocker(pool, quizSetup.mode);
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
      /* Start belongs beside the settings it uses, not below two grids of
         cards: choosing a drill should not mean scrolling back for the button. */
      '<div>' +
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
      '<div class="row end" style="margin-top:14px">' +
        '<button class="primary-btn" data-act="start"' + (blocked ? ' disabled' : '') + '>' +
          ICONS.play + 'Start practice</button>' +
      '</div>' +
      (blocked ? '<p class="faint" style="text-align:right;margin-top:8px">' + esc(blocked) + '</p>' : '') +
      '</div>' +
    '</div>' +

    '<div class="section-title"><h2>Choose a drill</h2></div>' +
    '<div class="mode-grid">' + modeCards(m => !m.ai) + '</div>' +

    /* The AI drills answer to a setting of their own, so they sit under their
       own heading with it rather than being four cards among nine. */
    '<div class="section-title" style="margin-top:26px"><h2>AI drills</h2>' +
      (aiOn
        ? '<div class="row level-pick"><label for="pLevel">Level</label>' +
            '<select id="pLevel">' + levelOptions(Store.state.settings.ai.level) + '</select></div>'
        : '<span class="hint">AI drills need a key — see Settings</span>') + '</div>' +
    '<div class="mode-grid">' + modeCards(m => m.ai) + '</div>' +
    (aiOn ? '<p class="faint" style="margin-top:9px">The level sets the English written and marked ' +
      'around your words — the words themselves are used whatever their level.</p>' : '') +
    historyHTML();

  host.onclick = async (e) => {
    const m = e.target.closest('[data-mode]');
    if (m) { quizSetup.mode = m.dataset.mode; return render('practice'); }
    if (e.target.closest('[data-act="start"]')) return startQuiz();
    if (e.target.closest('[data-act="clear-history"]')) {
      const n = Store.state.practice.length;
      const ok = await confirmDialog('Clear practice history?',
        'The ' + n + ' round' + (n === 1 ? '' : 's') + ' kept here will go. Your words are not touched.',
        'Clear history', true);
      if (ok) { Store.clearPractice(); render('practice'); }
      return;
    }
    const back = e.target.closest('[data-review]');
    if (back) {
      const entry = Store.state.practice.filter(r => r.id === back.dataset.review)[0];
      if (entry) return reviewRound(entry);
    }
  };
  $('#pDeck').onchange = (e) => { quizSetup.deckId = e.target.value; render('practice'); };
  $('#pScope').onchange = (e) => { quizSetup.scope = e.target.value; render('practice'); };
  const level = $('#pLevel');   /* absent while there is no AI to set a level for */
  if (level) level.onchange = (e) => { Store.state.settings.ai.level = e.target.value; Store.save(); };
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

/* One drill card, whichever grid it lands on. */
function modeCards(wanted) {
  const aiOn = AI.available();
  return MODES.filter(m => !(m.needsTTS && !TTS.ok)).filter(wanted).map(m =>
    '<button class="mode-card' + (quizSetup.mode === m.id ? ' sel' : '') + '" data-mode="' + m.id + '"' +
      (m.ai && !aiOn ? ' disabled title="Connect an AI assistant in Settings"' : '') + '>' +
      '<span class="mi-row"><span class="mi">' + m.icon + '</span>' +
        (m.ai ? '<span class="ai-tag">AI</span>' : '') + '</span>' +
      '<strong>' + esc(m.name) + '</strong><span>' + esc(m.desc) + '</span>' +
    '</button>').join('');
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
  /* A deck of two words would otherwise ask a two-option question. The wrong
     answers do not have to be words you are practising — only plausible — so
     the rest of the collection fills the gap. */
  if (picked.length < n) {
    const inPool = new Set(pool.map(c => c.id));
    const rest = Store.state.cards.filter(c => !inPool.has(c.id));
    take(rest.filter(c => c.pos && c.pos === card.pos));
    take(rest);
  }
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

  /* Matching is split into playable boards so the round length still applies.
     Two forms: against the translation, or against the English definition. */
  if (mode === 'matching' || mode === 'matching-def') {
    const byDefinition = mode === 'matching-def';
    const pairText = (c) => byDefinition ? c.definition : c.translation;
    const cards = chosen.filter(c => pairText(c));
    if (!cards.length) return [];
    const boards = Math.max(1, Math.ceil(cards.length / MATCH_BOARD_MAX));
    const per = Math.ceil(cards.length / boards);
    const out = [];
    for (let i = 0; i < cards.length; i += per)
      out.push({ type: 'matching', byDefinition: byDefinition, cards: cards.slice(i, i + per) });
    if (out.length > 1 && out[out.length - 1].cards.length < 2) {
      const tail = out.pop();
      out[out.length - 1].cards = out[out.length - 1].cards.concat(tail.cards);
    }
    /* One spare meaning per board, so the final word still has to be chosen
       rather than being whatever is left over. */
    out.forEach(board => {
      const used = {};
      board.cards.forEach(c => { used[c.id] = 1; used[String(pairText(c)).toLowerCase()] = 1; });
      const spare = (list) => list.filter(c =>
        !used[c.id] && pairText(c) && !used[String(pairText(c)).toLowerCase()]);
      const spares = spare(pool).length ? spare(pool) : spare(Store.state.cards);
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
      /* A translation would give the whole word away here — you already know
         what it means, you are trying to catch how it sounds. Letters are the
         help that fits: the first one, then one more, up to three. */
      return { type: 'type', card: card, prompt: '', speak: card.term, pos: card.pos,
               letterHint: true, answer: card.term,
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

/* A text as it is read: escaped, with its line breaks kept, so a dialogue is a
   dialogue rather than one long run of turns. */
function passageProse(t) { return esc(t).replace(/\n/g, '<br>'); }

/* Where a word actually stands in a text. The loose match that finds
   "diagnosed" for "diagnose" also finds "objective" for "object", so every hit
   is weighed against the word it claims to be before it counts. */
function findTerm(text, term, from) {
  let base = from || 0;
  while (base < text.length) {
    const at = termMatch(text.slice(base), term);
    if (!at) return null;
    const hit = [base + at[0], base + at[1]];
    if (AI.sameWord(text.slice(hit[0], hit[1]), term)) return hit;
    base = hit[1];
  }
  return null;
}

/* The gaps are cut here rather than taken from the model. Asking for a text
   with the holes already in it and a list of the words that fill them means
   trusting two things to line up, and when they do not the drill marks a right
   answer wrong — which is worse than no drill at all. Prose cannot come apart
   that way: whatever is cut out of the sentence is what belongs in it. */
function buildPassageItem(p, cards, pool) {
  /* Spaces collapse, line breaks do not: a conversation is written a turn to a
     line and has to stay that way. */
  const text = String(p.text || '').replace(/\r/g, '')
    .replace(/[^\S\n]+/g, ' ').replace(/\n[\s]*/g, '\n').trim();
  if (!text) return null;

  /* A word standing where a sentence begins wears a capital, and a capital in
     the bank says which gap it came from. A turn of a conversation begins the
     same way, speaker's name and all. */
  const opensSentence = (i) => i === 0 ||
    /(?:^|[.!?]|\n)\s*(?:[A-Z][A-Za-z]{1,11}:\s*)?$/.test(text.slice(0, i));

  /* Longest terms first, and a word never claims a place another target has
     already taken: "cake" would otherwise settle inside "a piece of cake" and
     leave the phrase itself homeless — and then look like a word used twice. */
  const claimed = [];
  const free = (term, from) => {
    let at = findTerm(text, term, from);
    while (at && claimed.some(c => at[0] < c[1] && at[1] > c[0])) at = findTerm(text, term, at[1]);
    return at;
  };
  const hits = [];
  cards.slice().sort((a, b) => b.term.length - a.term.length).forEach(card => {
    const at = free(card.term, 0);
    if (!at || opensSentence(at[0])) return;
    /* A word that genuinely turns up twice gives its own gap away, so it stays
       as prose and simply is not asked about. */
    if (free(card.term, at[1])) return;
    claimed.push(at);
    hits.push({ card: card, start: at[0], end: at[1] });
  });
  hits.sort((a, b) => a.start - b.start);

  const parts = [], answers = [], owners = [];
  let at = 0;
  hits.forEach(h => {
    if (h.start < at) return;                    /* one word inside another */
    parts.push(text.slice(at, h.start));
    answers.push(text.slice(h.start, h.end));
    owners.push(h.card);
    at = h.end;
  });
  if (answers.length < 3) return null;           /* too little left to be a round */
  parts.push(text.slice(at));

  /* One word too many, so the last gap is still a choice rather than whatever
     is left over. The AI picks it; a word from the pool stands in if it did
     not, named one of the answers again, or named something already in the
     text. */
  const spent = {};
  owners.forEach(c => { spent[c.id] = 1; });
  const clash = (w) => !w || answers.some(a => normalize(a) === normalize(w)) || !!findTerm(text, w, 0);
  let extra = String(p.extra || '').trim();
  if (clash(extra)) {
    const spare = pool.filter(c => !spent[c.id] && c.term && !clash(c.term));
    extra = spare.length ? sample(spare, 1)[0].term : '';
  }
  return { type: 'passage', parts: parts, answers: answers, cards: owners,
           bank: shuffle(answers.concat(clash(extra) ? [] : [extra])),
           question: 'Fill the passage' };
}

/* ---------- crossword ------------------------------------------------------ *
   The grid is laid out here rather than asked for: a model cannot be trusted
   to keep two words agreeing on a shared letter, and a crossword that does not
   is not a crossword. The AI writes the clues, which is the part worth writing.
   ------------------------------------------------------------------------- */

/* What goes into the grid: letters only, so "work out" becomes WORKOUT — the
   spaces are what the clue's "(2 words)" is for. */
function crosswordText(term) {
  return String(term || '').toUpperCase().replace(/[^A-Z]/g, '');
}

function buildCrossword(entries) {
  /* One greedy pass is a guess: whether a crossword interlocks or falls into a
     ladder depends on which word went down first. So the layout is tried from
     several starting orders and the best grid kept — cheap at twenty words,
     and the difference between a puzzle and a comb. */
  let best = null;
  const byLength = entries.slice().sort((a, b) => b.text.length - a.text.length);
  for (let attempt = 0; attempt < 12; attempt++) {
    const order = attempt === 0 ? byLength
      : [byLength[0]].concat(shuffle(byLength.slice(1)));
    const tried = crosswordLayout(order);
    if (tried && (!best || tried.score > best.score)) best = tried;
  }
  if (!best || best.placed.length < 2) return null;

  /* Crop to what was used, then number the squares a word starts on, reading
     the grid the way the clues will be read. */
  const b = best.bounds;
  const rows = b.r1 - b.r0 + 1, cols = b.c1 - b.c0 + 1;
  const cells = new Array(rows * cols).fill(null);
  best.placed.forEach(w => w.cells.forEach(([r, c], i) => {
    cells[(r - b.r0) * cols + (c - b.c0)] = { letter: w.entry.text[i] };
  }));

  let n = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const cell = cells[r * cols + c];
    if (!cell) continue;
    const startsAcross = c === 0 || !cells[r * cols + c - 1];
    const startsDown = r === 0 || !cells[(r - 1) * cols + c];
    const runAcross = startsAcross && c + 1 < cols && cells[r * cols + c + 1];
    const runDown = startsDown && r + 1 < rows && cells[(r + 1) * cols + c];
    if (runAcross || runDown) cell.num = ++n;
  }

  const words = best.placed.map(w => ({
    card: w.entry.card, text: w.entry.text, clue: w.entry.clue,
    translation: w.entry.card.translation || '', words: w.entry.words,
    num: cells[(w.r - b.r0) * cols + (w.c - b.c0)].num, dir: w.dir,
    cells: w.cells.map(([rr, cc]) => (rr - b.r0) * cols + (cc - b.c0))
  }));
  words.sort((a, b2) => (a.dir === b2.dir ? a.num - b2.num : a.dir === 'across' ? -1 : 1));

  return { type: 'crossword', rows: rows, cols: cols, cells: cells, words: words,
           cards: words.map(w => w.card), left: best.left.length, question: 'Crossword' };
}

/* One pass: take the words in the order given and put each one where it crosses
   the most of what is already down, without letting either direction run away
   with the grid. */
function crosswordLayout(order) {
  const SIZE = 64, mid = SIZE >> 1;
  const grid = new Array(SIZE * SIZE).fill('');
  const at = (r, c) => (r >= 0 && r < SIZE && c >= 0 && c < SIZE) ? grid[r * SIZE + c] : null;
  const placed = [], left = [];
  const counts = { across: 0, down: 0 };
  const bounds = { r0: SIZE, r1: 0, c0: SIZE, c1: 0 };
  let crossings = 0;

  /* -1 when the word cannot stand here; otherwise how many letters it shares
     with what is already down. A word may only touch another where it crosses
     it, or two words end up reading as one. */
  const fits = (text, r, c, dir) => {
    const dr = dir === 'down' ? 1 : 0, dc = dir === 'across' ? 1 : 0;
    if (at(r - dr, c - dc) || at(r + dr * text.length, c + dc * text.length)) return -1;
    let hits = 0;
    for (let i = 0; i < text.length; i++) {
      const rr = r + dr * i, cc = c + dc * i;
      const cur = at(rr, cc);
      if (cur === null) return -1;
      if (cur) { if (cur !== text[i]) return -1; hits++; continue; }
      if (dir === 'across' ? (at(rr - 1, cc) || at(rr + 1, cc)) : (at(rr, cc - 1) || at(rr, cc + 1))) return -1;
    }
    /* A word that lands on nothing but letters already written is not in the
       grid at all — it is lying on top of another word. */
    if (hits === text.length) return -1;
    /* and it has to leave a grid that still fits a screen */
    const span = (lo, hi, a, b) => Math.max(hi, b) - Math.min(lo, a) + 1;
    if (span(bounds.r0, bounds.r1, r, r + dr * (text.length - 1)) > CROSSWORD_SPAN ||
        span(bounds.c0, bounds.c1, c, c + dc * (text.length - 1)) > CROSSWORD_SPAN) return -1;
    return hits;
  };

  const put = (entry, r, c, dir, hits) => {
    const cells = [];
    for (let i = 0; i < entry.text.length; i++) {
      const rr = r + (dir === 'down' ? i : 0), cc = c + (dir === 'across' ? i : 0);
      grid[rr * SIZE + cc] = entry.text[i];
      cells.push([rr, cc]);
    }
    bounds.r0 = Math.min(bounds.r0, r); bounds.c0 = Math.min(bounds.c0, c);
    bounds.r1 = Math.max(bounds.r1, cells[cells.length - 1][0]);
    bounds.c1 = Math.max(bounds.c1, cells[cells.length - 1][1]);
    counts[dir]++;
    crossings += hits || 0;
    placed.push({ entry: entry, r: r, c: c, dir: dir, cells: cells });
  };

  put(order[0], mid, mid - (order[0].text.length >> 1), 'across', 0);

  order.slice(1).forEach(entry => {
    let pick = null, lopsided = null;
    placed.forEach(w => w.cells.forEach(([wr, wc]) => {
      const letter = grid[wr * SIZE + wc];
      for (let j = 0; j < entry.text.length; j++) {
        if (entry.text[j] !== letter) continue;
        const dir = w.dir === 'across' ? 'down' : 'across';
        const r = dir === 'down' ? wr - j : wr;
        const c = dir === 'across' ? wc - j : wc;
        const hits = fits(entry.text, r, c, dir);
        if (hits < 1) continue;
        /* Crossings first and heavily — a word meeting three others is worth
           more than one sitting neatly in the middle — then whatever keeps the
           grid small, because a tight grid is what gives the next word
           somewhere to cross. */
        const dr = dir === 'down' ? 1 : 0, dc = dir === 'across' ? 1 : 0;
        const grow = (lo, hi, a, b) =>
          Math.max(0, Math.max(a, b) - hi) + Math.max(0, lo - Math.min(a, b));
        const growth = grow(bounds.r0, bounds.r1, r, r + dr * (entry.text.length - 1)) +
                       grow(bounds.c0, bounds.c1, c, c + dc * (entry.text.length - 1));
        const cand = { r: r, c: c, dir: dir, hits: hits,
                       score: hits * 300 - growth * 25 - (Math.abs(r - mid) + Math.abs(c - mid)) / 2 };
        const other = dir === 'across' ? 'down' : 'across';
        if (counts[dir] + 1 - counts[other] > CROSSWORD_LEAN) {
          if (!lopsided || cand.score > lopsided.score) lopsided = cand;
        } else if (!pick || cand.score > pick.score) pick = cand;
      }
    }));
    /* An unbalanced home beats no home at all. */
    const chosen = pick || lopsided;
    if (chosen) put(entry, chosen.r, chosen.c, chosen.dir, chosen.hits);
    else left.push(entry);
  });

  /* What makes one grid better than another, in order: words that found a home,
     how much they interlock, and how far the two directions have drifted apart.
     A drift past the allowance costs about a word, so a balanced grid with one
     word left over wins over a lopsided one that took it. */
  const lean = Math.abs(counts.across - counts.down);
  const over = Math.max(0, lean - CROSSWORD_LEAN);
  return { placed: placed, left: left, bounds: bounds, counts: counts, crossings: crossings,
           score: placed.length * 10000 + crossings * 200 - over * 9000 - lean * 60 -
                  (bounds.r1 - bounds.r0 + bounds.c1 - bounds.c0) * 3 };
}

/* Multiple-choice drills need other words to build plausible options from —
   but those words can come from anywhere in the collection, so one word in the
   selection is enough. Matching is the exception: it pairs the words you chose
   against each other, so it needs two of them. */
const NEEDS_OPTIONS = ['mc-meaning', 'mc-word', 'matching', 'matching-def', 'ai-quiz'];
function isMatching(mode) { return mode === 'matching' || mode === 'matching-def'; }
function minWordsFor(mode) {
  return mode === 'ai-passage' || mode === 'ai-crossword' ? 4 : isMatching(mode) ? 2 : 1;
}
function minCollectionFor(mode) { return NEEDS_OPTIONS.indexOf(mode) !== -1 ? 2 : 1; }

/* Why the drill cannot start, in words, or '' when it can. */
function startBlocker(pool, mode) {
  if (!pool.length) return 'No words match these filters yet.';
  if (pool.length < minWordsFor(mode))
    return mode === 'ai-passage' ? 'A text is written around four words — this selection has fewer.'
      : mode === 'ai-crossword' ? 'A crossword needs at least four words to cross.'
      : 'Matching needs at least two words in this selection.';
  if (Store.state.cards.length < minCollectionFor(mode))
    return 'This drill needs other words to build wrong answers from — add a second word.';
  return '';
}

/* One place that knows how to set up a round, so matching's pair totals are
   never forgotten. */
function newQuiz(mode, items) {
  const q = { mode: mode, i: 0, items: items, results: [], correct: 0,
              startedAt: Date.now(), state: 'idle', match: null };
  q.pairsTotal = items.reduce((n, it) =>
    n + (it.type === 'matching' ? it.cards.length
       : it.type === 'passage' ? it.answers.length
       : it.type === 'crossword' ? it.words.length : 0), 0);
  q.pairsDone = 0;
  return q;
}

async function startQuiz() {
  const pool = practicePool(quizSetup.deckId, quizSetup.scope);
  const mode = quizSetup.mode;
  const blocked = startBlocker(pool, mode);
  if (blocked) return toast(blocked, 'err');
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
        /* The same option listed twice would mean two right answers, and no wording
           of the prompt can promise that away — so the duplicates go here. */
        const seen = {};
        const opts = q.options.filter(o => {
          const k = normalize(o);
          return k && !seen[k] && (seen[k] = true);
        }).slice(0, optionCount());
        if (!opts.some(o => normalize(o) === normalize(q.answer))) opts[0] = q.answer;
        /* No part-of-speech chip: the options are all one part of speech by now,
           so naming it says nothing, and on a gap-fill it hands over the answer. */
        return { type: 'mc', card: card, prompt: q.prompt, options: shuffle(opts),
                 answer: q.answer, explanation: q.explanation, question: 'AI question' };
      });
      if (!quiz.items.length) throw new Error('No questions came back.');
      quiz = Object.assign(newQuiz(mode, quiz.items), { startedAt: quiz.startedAt });
    } catch (err) {
      quiz = null; toast(err.message, 'err'); return render('practice');
    }
  } else if (mode === 'ai-crossword') {
    /* Only words that can be written into squares: letters, and neither too
       short to cross nor too long to fit a line of the grid. */
    /* One entry per set of letters: two senses of "object" are two cards, but
       they are the same word in a grid — and the second would sit exactly on
       top of the first, sharing its squares and its number. */
    const seen = {};
    const usable = pool.filter(c => {
      const t = crosswordText(c.term);
      if (t.length < 3 || t.length > 14 || seen[t]) return false;
      return (seen[t] = true);
    });
    if (usable.length < CROSSWORD_MIN)
      return toast('A crossword needs at least four words of three letters or more', 'err');
    const chosen = sample(usable, clamp(count, CROSSWORD_MIN, Math.min(CROSSWORD_MAX, usable.length)));
    $('#view-practice').innerHTML = '<div class="quiz-wrap"><div class="card"><div class="ai-thinking">' +
      ICONS.loader + 'The AI is writing ' + chosen.length + ' clues…</div></div></div>';
    try {
      const written = await AI.crosswordClues(chosen);
      const entries = chosen.map(card => {
        const found = written.filter(c => normalize(c.term) === normalize(card.term))[0];
        /* A clue with its own answer inside it is no clue: the card's own
           meaning does the job instead. */
        const clue = found && !findTerm(String(found.clue), card.term, 0) ? String(found.clue).trim() : '';
        return { card: card, text: crosswordText(card.term),
                 words: String(card.term).trim().split(/\s+/).length,
                 clue: clue || card.definition || card.translation || 'No clue for this one' };
      });
      const grid = buildCrossword(entries);
      if (!grid) throw new Error('These words share too few letters to make a grid. Try another selection.');
      quiz.items = [grid];
      quiz = Object.assign(newQuiz(mode, quiz.items), { startedAt: quiz.startedAt });
    } catch (err) {
      quiz = null; toast(err.message, 'err'); return render('practice');
    }
  } else if (mode === 'ai-passage') {
    const plan = passagePlan(Math.min(pool.length, Math.max(4, count), PASSAGE_MAX_TEXTS * 5));
    const chosen = sample(pool, plan.total);
    const groups = [];
    for (let i = 0; i < chosen.length; i += plan.per) groups.push(chosen.slice(i, i + plan.per));
    $('#view-practice').innerHTML = '<div class="quiz-wrap"><div class="card"><div class="ai-thinking">' +
      ICONS.loader + 'The AI is writing ' + groups.length + ' text' + (groups.length === 1 ? '' : 's') + '…</div></div></div>';
    try {
      const out = await AI.makePassages(groups);
      quiz.items = out.slice(0, groups.length)
        .map((p, i) => buildPassageItem(p, groups[i], pool)).filter(Boolean);
      if (!quiz.items.length) throw new Error('The text that came back did not line up with the words. Try again.');
      /* A word the AI left out, used twice or put at the start of a sentence
         cannot be asked about. Losing it is right; losing it quietly is not,
         because the round then practises fewer words than the slider promised. */
      const asked = quiz.items.reduce((n, it) => n + it.answers.length, 0);
      if (asked < plan.total)
        toast(asked + ' of the ' + plan.total + ' words fitted the texts the AI wrote', 'info');
      quiz = Object.assign(newQuiz(mode, quiz.items), { startedAt: quiz.startedAt });
    } catch (err) {
      quiz = null; toast(err.message, 'err'); return render('practice');
    }
  } else {
    quiz = newQuiz(mode, buildQuestions(mode, pool, count));
  }
  if (!quiz.items.length) { quiz = null; toast('Could not build questions from these words', 'err'); return render('practice'); }
  render('practice');
  refreshChrome();
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
  const p = quizProgress();
  const head =
    '<div class="study-head">' +
      '<button class="soft-btn tiny end-btn" data-act="quit">' + ICONS.finish +
        '<span>End practice</span></button>' +
      '<div class="bar" style="flex:1"><i id="qBar" style="width:' + pct(p.done, p.total) + '%"></i></div>' +
      '<div class="counts"><span class="c-due" id="qCount">' + p.text + '</span>' +
        '<span class="c-new" id="qCorrect">' + quiz.correct + ' correct</span></div>' +
    '</div>';

  let body = '';
  if (item.type === 'matching') body = matchingHTML(item);
  else if (item.type === 'mc') body = mcHTML(item);
  else if (item.type === 'type') body = typeHTML(item);
  else if (item.type === 'write') body = writeHTML(item);
  else if (item.type === 'passage') body = passageHTML(item);
  else if (item.type === 'crossword') body = crosswordHTML(item);

  /* A grid needs the width a question does not. */
  host.innerHTML = '<div class="quiz-wrap' + (item.type === 'crossword' ? ' wide' : '') + '">' +
    head + body + '</div>';

  if (item.speak && quiz.state === 'idle') TTS.speak(item.speak);
  bindQuizEvents(host, item);
}

function deckLabel(card) {
  const d = card && Store.deck(card.deckId);
  return d ? d.emoji + ' ' + d.name : '';
}

function questionCard(inner, item) {
  const c = item.card;
  return '<div class="flashcard" style="min-height:auto;padding:28px 26px">' +
    '<div class="fc-top">' +
      '<span class="chip">' + esc(item.question) + '</span>' +
      (item.pos ? '<span class="chip pos">' + esc(item.pos) + '</span>' : '') +
      '<div class="spacer"></div>' +
      /* The deck, as on a study card — the part of speech is already a chip
         on the left, and printing it twice says nothing new. */
      (deckLabel(c) ? '<span class="faint">' + esc(deckLabel(c)) + '</span>' : '') +
    '</div>' + inner + hintHTML(item) + '</div>';
}

/* The translation (or the meaning, for a gap-fill) sits under the question and
   stays hidden until asked for, so it is a way out rather than a giveaway.
   Both states are always in the DOM: revealing one is a class toggle, which
   keeps the typed answer untouched and costs no layout shift. */
function hintHTML(item) {
  if (item.letterHint) return letterHintHTML(item);
  if (!item.hint) return '';
  return '<div class="hint-slot' + (quiz.hintShown ? ' revealed' : '') + '" id="hintSlot">' +
    '<div class="hint-text">' + ICONS.bulb + '<span>' + esc(item.hint) + '</span></div>' +
    '<button class="hint-btn" data-act="hint">' + ICONS.bulb + 'Show hint</button>' +
  '</div>';
}

/* Never the whole word: one letter short of it at most, and never more than
   three. A two-letter word gets one letter, a three-letter word gets two. */
function maxLetterHints(answer) {
  const letters = String(answer || '').replace(/[^\p{L}]/gu, '').length;
  return Math.max(0, Math.min(3, letters - 1));
}

/* How much of the answer the letters given so far spell out — counted in
   letters, so a space in "work out" costs nothing. */
function letterPrefix(answer, n) {
  let out = '', seen = 0;
  for (let i = 0; i < answer.length && seen < n; i++) {
    out += answer[i];
    if (/\p{L}/u.test(answer[i])) seen++;
  }
  return out;
}

function letterHintHTML(item) {
  const max = maxLetterHints(item.answer);
  if (!max) return '';
  const shown = Math.min(quiz.hintLetters || 0, max);
  const spent = shown >= max;
  /* The button first, where every other drill puts it; the letters appear
     beside it rather than in its place. */
  return '<div class="hint-slot letters' + (shown ? ' revealed' : '') + '" id="hintSlot">' +
    '<button class="hint-btn" data-act="hint" id="hintBtn"' + (spent ? ' disabled' : '') + '>' +
      ICONS.bulb + (shown ? 'One more letter' : 'Show the first letter') +
    '</button>' +
    '<div class="hint-text">' + ICONS.bulb +
      '<span>Starts with <b id="hintLetters">' + esc(letterPrefix(item.answer, shown)) + '</b></span>' +
    '</div>' +
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
    '</div><div id="qFeedback">' + (answered ? feedbackHTML(item) : '') + '</div>';
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
      '<button class="primary-btn" data-act="check"' + (answered ? ' hidden' : '') + '>Check</button>' +
    '</div>' +
    '<div id="qFeedback">' + (answered ? feedbackHTML(item) : '') + '</div>' +
    '<p class="faint" id="qTypeNote"' + (answered ? ' hidden' : '') + '>' +
      'Spelling is checked, but a single typo is forgiven.</p>';
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
    '<div id="qFeedback">' + (answered ? feedbackHTML(item) : '') + '</div>';
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
    const pairText = (c) => item.byDefinition ? c.definition : c.translation;
    quiz.match = {
      left: shuffle(item.cards.map(c => ({ id: c.id, text: c.term }))),
      right: shuffle(rightCards.map(c => ({ id: c.id, text: pairText(c) }))),
      sel: null, done: [], misses: 0, flash: null
    };
  }
  const m = quiz.match;
  const boards = quiz.items.length;
  /* Flashes are keyed by side + id: on a miss the two tiles are different
     words, and the same id also exists in the opposite column. */
  const flashed = (side, id) => (m.flash && m.flash.keys.indexOf(side + id) !== -1) ? ' ' + m.flash.kind : '';
  /* The two columns hold different kinds of thing and used to be told apart
     only by where they sat. A heading names each one and the right-hand column
     is the quieter of the two. */
  const col = (rows, side, heading) =>
    '<div class="match-col ' + (side === 'l' ? 'words' : 'meanings') + '">' +
      '<div class="match-head">' + heading + '</div>' +
      rows.map(r =>
        '<button class="match-item' + (m.done.indexOf(r.id) !== -1 ? ' done' : '') +
          (m.sel && m.sel.side === side && m.sel.id === r.id ? ' sel' : '') + flashed(side, r.id) +
          '" data-side="' + side + '" data-id="' + r.id + '">' + esc(r.text) + '</button>').join('') +
    '</div>';
  return '<div class="card">' +
    '<div class="row between" style="margin-bottom:14px">' +
      '<p class="muted">Match each word with its ' +
        (item.byDefinition ? 'meaning' : 'translation') + '</p>' +
      '<span class="faint">' + m.done.length + ' / ' + item.cards.length + ' on this board' +
        (boards > 1 ? ' · board ' + (quiz.i + 1) + ' of ' + boards : '') +
        (m.misses ? ' · ' + m.misses + ' miss' + (m.misses === 1 ? '' : 'es') : '') + '</span>' +
    '</div>' +
    '<div class="match-grid">' + col(m.left, 'l', 'Word') +
      col(m.right, 'r', item.byDefinition ? 'Meaning' : 'Translation') + '</div></div>';
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
      const slot = $('#hintSlot');
      if (item.letterHint) {
        const max = maxLetterHints(item.answer);
        quiz.hintLetters = Math.min((quiz.hintLetters || 0) + 1, max);
        const out = $('#hintLetters');
        if (out) out.textContent = letterPrefix(item.answer, quiz.hintLetters);
        const btn = $('#hintBtn');
        if (btn) {
          btn.innerHTML = ICONS.bulb + 'One more letter';
          btn.disabled = quiz.hintLetters >= max;
        }
      } else {
        quiz.hintShown = true;
      }
      if (slot) slot.classList.add('revealed');   /* no re-render: nothing else moves */
      const typed = $('#qInput');
      if (typed) typed.focus();
      return;
    }
    const opt = e.target.closest('[data-opt]');
    if (opt && quiz.state !== 'answered') return answerMC(item, opt.dataset.opt);
    const mi = e.target.closest('[data-side]');
    if (mi) return matchClick(item, mi.dataset.side, mi.dataset.id);
    const hint = e.target.closest('[data-hint]');
    if (hint) {
      const k = +hint.dataset.hint;
      const on = !quiz.cw.hints[k];
      quiz.cw.hints[k] = on;
      hint.closest('.cw-clue').classList.toggle('shown', on);
      return;
    }
    const clue = e.target.closest('[data-clue]');
    if (clue) return crosswordSelect(item, +clue.dataset.clue);
    const swap = e.target.closest('[data-act="cw-layout"]');
    if (swap) {
      const stacked = Store.state.settings.cwClues !== 'below';
      Store.state.settings.cwClues = stacked ? 'below' : 'side';
      Store.save();
      $('#cwWrap').classList.toggle('stack', stacked);
      swap.textContent = stacked ? 'Clues beside' : 'Clues below';
      return;
    }
    const g = e.target.closest('[data-gap]');
    if (g) return passageGapClick(item, parseInt(g.dataset.gap, 10));
    const bw = e.target.closest('[data-word]');
    if (bw) return passageWordClick(item, parseInt(bw.dataset.word, 10));
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
  if (item.type === 'crossword' && !quiz.cw.checked) bindCrossword(host, item);
}

/* Marking the question you just answered, without rebuilding it. Redrawing
   would swap out the very button under the pointer and lose the caret, the
   scroll position and the focus ring for nothing. */
function showAnswerInPlace(item) {
  const host = $('#view-practice');
  const slot = host && host.querySelector('#qFeedback');
  if (!slot) return render('practice');

  if (item.type === 'mc') {
    host.querySelectorAll('.opt').forEach(btn => {
      const o = btn.dataset.opt;
      btn.disabled = true;
      if (normalize(o) === normalize(item.answer)) btn.classList.add('correct');
      else if (o === quiz.given) btn.classList.add('wrong');
    });
  } else {
    const typed = host.querySelector('#qInput') || host.querySelector('#qWrite');
    if (typed) typed.disabled = true;
    ['[data-act="check"]', '#qTypeNote', '.ai-thinking'].forEach(sel => {
      const el = host.querySelector(sel);
      if (el) el.hidden = true;
    });
  }
  slot.innerHTML = feedbackHTML(item);
  refreshQuizHead();
}

/* What the bar is measuring. Matching boards and gap-filled texts hold several
   answers each, so a round of three texts is not a third done once the first
   one is on screen — those count in pairs and gaps. Everywhere else it is
   questions answered, so arriving at the last one does not already read 100 %. */
function quizProgress() {
  const item = quiz.items[quiz.i];
  const kind = item && item.type;
  if (kind === 'matching' || kind === 'passage' || kind === 'crossword')
    return { done: quiz.pairsDone, total: quiz.pairsTotal,
             text: quiz.pairsDone + ' / ' + quiz.pairsTotal +
               (kind === 'matching' ? ' matched' : kind === 'crossword' ? ' solved' : ' filled') };
  return { done: quiz.i + (quiz.state === 'answered' ? 1 : 0), total: quiz.items.length,
           text: (quiz.i + 1) + ' / ' + quiz.items.length };
}

/* The counters and the bar move on an answer, so they are the one part of the
   head that has to be told. */
function refreshQuizHead() {
  const host = $('#view-practice');
  if (!host || !quiz) return;
  const p = quizProgress();
  const bar = host.querySelector('#qBar');
  const count = host.querySelector('#qCount');
  const correct = host.querySelector('#qCorrect');
  if (bar) bar.style.width = pct(p.done, p.total) + '%';
  if (count) count.textContent = p.text;
  if (correct) correct.textContent = quiz.correct + ' correct';
}

function answerMC(item, given) {
  quiz.given = given;
  const ok = normalize(given) === normalize(item.answer);
  recordAnswer(item, ok, given);
  showAnswerInPlace(item);
}

function checkAnswer(item) {
  if (item.type === 'write') return gradeWriting(item);
  if (item.type === 'passage') return checkPassage(item);
  if (item.type === 'crossword') return checkCrossword(item);
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
  showAnswerInPlace(item);
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
    return render('practice');
  }
  showAnswerInPlace(item);
}

function recordAnswer(item, ok, given, close, extra) {
  quiz.state = 'answered';
  item.given = given; item.ok = ok;      /* kept for the review afterwards */
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
    /* Only the feedback block gains a paragraph — the question above it is
       already answered and has no reason to be redrawn. */
    const slot = $('#qFeedback');
    if (slot) slot.innerHTML = feedbackHTML(item); else render('practice');
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

/* The text, its gaps and the bank underneath. Only the body is ever redrawn:
   placing a word must not move the passage the learner is reading. */
function passageHTML(item) {
  if (!quiz.fill) quiz.fill = { placed: item.answers.map(() => null), sel: null };
  return '<div class="card" id="passageBody">' + passageBody(item) + '</div>';
}

function passageBody(item) {
  const f = quiz.fill;
  const done = quiz.state === 'answered';
  const word = (i) => f.placed[i] == null ? '' : item.bank[f.placed[i]];
  const right = item.answers.filter((a, i) => normalize(word(i)) === normalize(a)).length;
  const filled = f.placed.filter(b => b != null).length;
  const texts = quiz.items.length;

  const gap = (i) => {
    if (done) {
      const ok = normalize(word(i)) === normalize(item.answers[i]);
      return '<span class="gap ' + (ok ? 'correct' : 'wrong') + '">' +
        (ok ? '' : '<s>' + esc(word(i)) + '</s>') + esc(item.answers[i]) + '</span>';
    }
    /* An empty gap still needs a line's worth of height, or the box collapses
       into a stripe between the words. */
    return '<button class="gap' + (f.placed[i] != null ? ' filled' : '') +
      (f.sel === i ? ' sel' : '') + '" data-gap="' + i + '">' +
      (f.placed[i] == null ? '&nbsp;' : esc(word(i))) + '</button>';
  };

  return '<div class="row between" style="margin-bottom:14px">' +
      '<p class="muted">' + (done ? 'The words in their places'
        : f.sel == null ? 'Choose a gap, then the word that belongs in it'
        : 'Now choose the word that belongs in it') + '</p>' +
      '<span class="faint">' + (texts > 1 ? 'Text ' + (quiz.i + 1) + ' of ' + texts + ' · ' : '') +
        (done ? right + ' of ' + item.answers.length + ' right'
              : filled + ' / ' + item.answers.length + ' filled') + '</span>' +
    '</div>' +
    '<p class="passage">' +
      item.parts.map((t, i) => passageProse(t) + (i < item.answers.length ? gap(i) : '')).join('') + '</p>' +
    (done ? '' : '<div class="bank">' + item.bank.map((w, i) =>
      '<button class="bank-word' + (f.placed.indexOf(i) === -1 ? '' : ' used') +
        '" data-word="' + i + '">' + esc(w) + '</button>').join('') + '</div>') +
    '<div class="row end" style="margin-top:18px">' +
      (done
        ? '<button class="primary-btn" data-act="next">' +
            (quiz.i + 1 >= quiz.items.length ? 'See results' : 'Next text') + '</button>'
        : '<button class="primary-btn" data-act="check"' + (filled < item.answers.length ? ' disabled' : '') +
            '>Check</button>') +
    '</div>';
}

function repaintPassage(item) {
  const body = $('#passageBody');
  if (body) body.innerHTML = passageBody(item); else render('practice');
}

/* A gap: empty, it becomes the one being filled; filled, its word goes back to
   the bank and the gap stays selected, so a change of mind is two taps. */
function passageGapClick(item, i) {
  const f = quiz.fill;
  if (quiz.state === 'answered') return;
  if (f.placed[i] != null) f.placed[i] = null;
  f.sel = i;
  repaintPassage(item);
}

function passageWordClick(item, b) {
  const f = quiz.fill;
  if (quiz.state === 'answered') return;
  const was = f.placed.indexOf(b);
  if (was !== -1) f.placed[was] = null;          /* moving it, not copying it */
  const target = f.sel != null && f.placed[f.sel] == null
    ? f.sel : f.placed.indexOf(null);
  if (target === -1) return;
  f.placed[target] = b;
  /* Move on to the next hole by itself: filling five gaps otherwise takes ten
     taps for no reason. */
  const next = f.placed.indexOf(null);
  f.sel = next === -1 ? null : next;
  repaintPassage(item);
}

/* Every gap is marked at once, and each one counts for its own card. */
function checkPassage(item) {
  const f = quiz.fill;
  if (f.placed.some(b => b == null)) return toast('Fill every gap first', 'err');
  quiz.state = 'answered';
  item.given = f.placed.map(b => item.bank[b]);
  item.answers.forEach((answer, i) => {
    const given = item.bank[f.placed[i]];
    const ok = normalize(given) === normalize(answer);
    if (ok) quiz.correct++;
    quiz.pairsDone++;
    const card = item.cards[i];
    if (card) Store.quizResult(card.id, ok);
    quiz.results.push({ card: card, ok: ok, given: given, answer: answer });
  });
  repaintPassage(item);
  refreshQuizHead();
  refreshChrome();
}

/* The grid and its clues. Drawn once: every keystroke after that touches the
   square it belongs to and nothing else, so the caret stays where the learner
   put it. */
function crosswordHTML(item) {
  if (!quiz.cw) quiz.cw = { input: {}, sel: 0, hints: {}, checked: false };
  const cw = quiz.cw;
  const cell = (c, i) => {
    if (!c) return '<div class="cw-block"></div>';
    return '<div class="cw-cell" data-cell="' + i + '">' +
      (c.num ? '<i>' + c.num + '</i>' : '') +
      '<input class="cw-in" data-i="' + i + '" maxlength="1" autocomplete="off" ' +
        'autocapitalize="characters" spellcheck="false" value="' + esc(cw.input[i] || '') + '"></div>';
  };
  const clueList = (dir) =>
    '<div class="cw-side"><h4>' + (dir === 'across' ? 'Across' : 'Down') + '</h4><ul>' +
      item.words.map((w, k) => w.dir !== dir ? '' :
        '<li class="cw-clue' + (cw.sel === k ? ' sel' : '') + (cw.hints[k] ? ' shown' : '') +
          '" data-clue="' + k + '">' +
          '<b>' + w.num + '</b>' +
          '<span><span class="cw-text">' + esc(w.clue) +
            (w.words > 1 ? ' <span class="faint">(' + w.words + ' words)</span>' : '') + '</span>' +
            '<span class="cw-tr">' + esc(w.translation) + '</span></span>' +
          (w.translation ? '<button class="cw-hint" data-hint="' + k + '" title="Show the translation">' +
            ICONS.bulb + '</button>' : '') +
        '</li>').join('') +
    '</ul></div>';

  const stacked = Store.state.settings.cwClues === 'below';
  return '<div class="card">' +
    '<div class="row between" style="margin-bottom:14px">' +
      '<p class="muted">Click a clue, then type the word into the grid</p>' +
      '<span class="faint" id="cwLeft">' + (item.left
        ? item.left + ' word' + (item.left === 1 ? '' : 's') + ' would not fit the grid' : '') + '</span>' +
      /* Where the clues sit is a matter of how wide the screen is, which only
         the person in front of it knows. */
      '<button class="soft-btn tiny" data-act="cw-layout">' +
        (stacked ? 'Clues beside' : 'Clues below') + '</button>' +
    '</div>' +
    '<div class="cw-wrap' + (stacked ? ' stack' : '') + '" id="cwWrap">' +
      '<div class="cw-grid" id="cwGrid" style="--cw-cols:' + item.cols + '">' +
        item.cells.map(cell).join('') + '</div>' +
      '<div class="cw-clues">' + clueList('across') + clueList('down') + '</div>' +
    '</div>' +
    '<div class="row end" style="margin-top:18px" id="cwFoot">' +
      '<button class="primary-btn" data-act="check">Check</button>' +
    '</div></div>';
}

/* Which word a square belongs to, preferring the one already being written. */
function crosswordWordAt(item, cellIndex, prefer) {
  const all = item.words.filter(w => w.cells.indexOf(cellIndex) !== -1);
  if (!all.length) return -1;
  const want = all.filter(w => w.dir === prefer);
  return item.words.indexOf(want.length ? want[0] : all[0]);
}

function crosswordSelect(item, k, focusCell) {
  const cw = quiz.cw;
  if (k < 0 || k === undefined) return;
  cw.sel = k;
  const word = item.words[k];
  const host = $('#view-practice');
  if (!host) return;
  host.querySelectorAll('.cw-cell').forEach(el => el.classList.remove('sel'));
  word.cells.forEach(i => {
    const el = host.querySelector('.cw-cell[data-cell="' + i + '"]');
    if (el) el.classList.add('sel');
  });
  host.querySelectorAll('.cw-clue').forEach(el =>
    el.classList.toggle('sel', +el.dataset.clue === k));
  const target = focusCell != null ? focusCell
    : word.cells.filter(i => !quiz.cw.input[i])[0];
  const input = host.querySelector('.cw-in[data-i="' + (target == null ? word.cells[0] : target) + '"]');
  if (input) { input.focus(); input.select(); }
}

/* Typing moves along the word being written, and stops at its end rather than
   wandering into whatever square comes next in the grid. */
function crosswordStep(item, from, delta) {
  const word = item.words[quiz.cw.sel];
  if (!word) return;
  const at = word.cells.indexOf(from);
  const next = word.cells[at + delta];
  if (next == null) return;
  crosswordFocus(next);
}

function crosswordFocus(cellIndex) {
  const input = $('.cw-in[data-i="' + cellIndex + '"]');
  if (input) { input.focus(); input.select(); }
}

/* An arrow key belongs to the grid rather than to the word: a down word can be
   left by pressing right, which is the whole point of a crossword. Blank
   squares in the way are stepped over, and landing somewhere takes up the word
   that runs the way you were going. */
function crosswordArrow(item, from, dr, dc) {
  let r = Math.floor(from / item.cols), c = from % item.cols;
  for (;;) {
    r += dr; c += dc;
    if (r < 0 || c < 0 || r >= item.rows || c >= item.cols) return;
    const i = r * item.cols + c;
    if (!item.cells[i]) continue;
    const k = crosswordWordAt(item, i, dc ? 'across' : 'down');
    if (k >= 0 && k !== quiz.cw.sel) crosswordSelect(item, k, i); else crosswordFocus(i);
    return;
  }
}

function bindCrossword(host, item) {
  const grid = host.querySelector('#cwGrid');
  if (!grid) return;
  grid.oninput = (e) => {
    const el = e.target.closest('.cw-in');
    if (!el || quiz.cw.checked) return;
    const ch = (el.value.slice(-1) || '').toUpperCase().replace(/[^A-ZÇĞİÖŞÜ]/g, '');
    el.value = ch;
    const i = +el.dataset.i;
    if (ch) { quiz.cw.input[i] = ch; crosswordStep(item, i, 1); }
    else delete quiz.cw.input[i];
  };
  grid.onkeydown = (e) => {
    const el = e.target.closest('.cw-in');
    if (!el || quiz.cw.checked) return;
    const i = +el.dataset.i;
    if (e.key === 'Backspace' && !el.value) { e.preventDefault(); crosswordStep(item, i, -1); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); return crosswordArrow(item, i, 0, 1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); return crosswordArrow(item, i, 0, -1); }
    if (e.key === 'ArrowDown')  { e.preventDefault(); return crosswordArrow(item, i, 1, 0); }
    if (e.key === 'ArrowUp')    { e.preventDefault(); return crosswordArrow(item, i, -1, 0); }
    /* Enter moves on rather than ending the puzzle: a key pressed out of habit
       should not mark a grid the learner is still filling in. */
    if (e.key === 'Enter') {
      e.preventDefault();
      const order = item.words.map((w, k) => k);
      const next = order[(quiz.cw.sel + 1) % order.length];
      return crosswordSelect(item, next);
    }
  };
  /* Clicking a square that two words share turns the corner. */
  grid.onclick = (e) => {
    const el = e.target.closest('.cw-in');
    if (!el || quiz.cw.checked) return;
    const i = +el.dataset.i;
    const cur = item.words[quiz.cw.sel];
    const mine = cur && cur.cells.indexOf(i) !== -1;
    const k = crosswordWordAt(item, i, mine ? (cur.dir === 'across' ? 'down' : 'across') : (cur ? cur.dir : 'across'));
    crosswordSelect(item, k, i);
  };
  crosswordSelect(item, quiz.cw.sel);
}

/* Every word is marked at once, each against its own card. A square shared by
   two words is judged by its letter, so it can be right for one and wrong for
   the other only if the letter itself is wrong. */
function checkCrossword(item) {
  const cw = quiz.cw;
  if (cw.checked) return;
  if (!Object.keys(cw.input).length) return toast('Fill in a word first', 'err');
  cw.checked = true;
  quiz.state = 'answered';
  /* The letters as they were left, kept on the item: by the time the round is
     written down the grid's own state is gone. */
  item.filled = Object.assign({}, cw.input);
  item.words.forEach(w => {
    const given = w.cells.map(i => cw.input[i] || '·').join('');
    const ok = given === w.text;
    w.given = given;
    if (ok) quiz.correct++;
    quiz.pairsDone++;
    Store.quizResult(w.card.id, ok);
    quiz.results.push({ card: w.card, ok: ok, given: given.replace(/·/g, '_').toLowerCase(),
                        answer: w.card.term });
  });

  const host = $('#view-practice');
  item.cells.forEach((c, i) => {
    if (!c) return;
    const input = host.querySelector('.cw-in[data-i="' + i + '"]');
    if (!input) return;
    const right = (cw.input[i] || '') === c.letter;
    input.value = c.letter;
    input.disabled = true;
    input.parentElement.classList.add(right ? 'correct' : 'wrong');
  });
  host.querySelectorAll('.cw-clue').forEach(el => {
    const w = item.words[+el.dataset.clue];
    el.classList.add(w.given === w.text ? 'got' : 'missed');
  });
  const foot = host.querySelector('#cwFoot');
  if (foot) foot.innerHTML = '<span class="faint" style="margin-right:auto">' +
    quiz.correct + ' of ' + item.words.length + ' right</span>' +
    '<button class="primary-btn" data-act="next">See results</button>';
  refreshQuizHead();
  refreshChrome();
}

function nextQuizItem() {
  quiz.i++;
  quiz.state = 'idle'; quiz.given = ''; quiz.lastResult = null;
  quiz.hintShown = false; quiz.hintLetters = 0;
  quiz.match = null;                 /* the next matching board starts fresh */
  quiz.fill = null;                  /* and so does the next text */
  quiz.cw = null;
  if (quiz.i >= quiz.items.length) return finishQuiz(true);
  render('practice');
}

function finishQuiz(completed) {
  quiz.finished = true;
  quiz.completed = !!completed;
  recordRound();
  render('practice'); refreshChrome();
}

/* A round is kept so it can be read back afterwards: what was asked, what the
   answer was, and what was given. Repeating a round would only ask the same
   questions of someone who now knows them; going over them is the part that
   teaches. */
function recordRound() {
  if (!quiz || quiz.saved || !quiz.results.length) return;
  quiz.saved = true;
  const ids = [];
  quiz.results.forEach(r => { if (r.card && ids.indexOf(r.card.id) === -1) ids.push(r.card.id); });
  Store.addRound({
    mode: quiz.mode, deckId: quizSetup.deckId, scope: quizSetup.scope,
    level: Store.state.settings.ai.level,
    answers: quiz.results.length, correct: quiz.results.filter(r => r.ok).length,
    cardIds: ids, review: packReview()
  });
  quiz.savedId = Store.state.practice[0].id;
}

function isAIMode(mode) { return String(mode).indexOf('ai-') === 0; }

/* Every drill flattened to the same three things, because a review that reads
   differently for each one is a review nobody reads. An item that was never
   reached has no answer of its own and says so by leaving it out. */
function packReview() {
  const out = [];
  quiz.items.forEach(it => {
    const term = it.card ? it.card.term : '';
    if (it.type === 'crossword') {
      /* The grid itself, and then the clues. The answer to "look forward to"
         was typed LOOKFORWARDTO, so whether it was right is settled here — the
         review must not compare a grid answer with the spaces put back. */
      out.push({ kind: 'grid', cols: it.cols, rows: it.rows,
                 cells: it.cells.map(c => c ? { letter: c.letter, num: c.num } : null),
                 input: Object.assign({}, it.filled || {}) });
      it.words.forEach(w => out.push({ kind: 'q', term: w.card.term,
        q: w.num + ' ' + w.dir + ' — ' + w.clue, answer: w.card.term,
        ok: w.given === w.text,
        given: w.given == null ? null : w.given.replace(/·/g, '_').toLowerCase() }));
    } else if (it.type === 'passage') {
      out.push({ kind: 'passage', parts: it.parts, answers: it.answers, given: it.given || [] });
    } else if (it.type === 'matching') {
      it.cards.forEach(c => out.push({ kind: 'q', term: c.term, q: c.term,
        answer: it.byDefinition ? c.definition : c.translation }));
    } else if (it.type === 'write') {
      out.push({ kind: 'q', term: term, q: 'Write a sentence using "' + term + '"',
                 answer: '', given: it.given == null ? null : String(it.given), ok: !!it.ok });
    } else {
      out.push({ kind: 'q', term: term, q: it.cloze || it.prompt || it.question || term,
                 answer: it.answer || term, options: it.options || null,
                 given: it.given == null ? null : String(it.given), ok: !!it.ok });
    }
  });
  return out;
}

/* Reading a round back. Answers are shown to begin with — that is what a review
   is for — and the button takes them away for anyone who would rather think
   first. Both states are in the page, so the toggle moves no other pixel. */
function reviewRound(entry) {
  const modeName = (id) => { const m = MODES.filter(m => m.id === id)[0]; return m ? m.name : id; };
  const deck = Store.deck(entry.deckId);
  const head = '<p class="faint" style="margin-bottom:14px">' +
    esc(deck ? deck.emoji + ' ' + deck.name : 'All decks') + ' · ' + esc(SCOPE_NAMES[entry.scope] || entry.scope) +
    (isAIMode(entry.mode) && entry.level ? ' · ' + esc(entry.level) : '') +
    ' · ' + agoLabel(entry.at) + ' · ' + pct(entry.correct, entry.answers) + '% of ' + entry.answers + '</p>';

  /* A word in its place, next to the one that was put there instead. */
  const word = (answer, given) => {
    if (given == null || given === '') return '<span class="gap filled">' + esc(answer) + '</span>';
    const ok = normalize(given) === normalize(answer);
    return '<span class="gap ' + (ok ? 'correct' : 'wrong') + '">' +
      (ok ? '' : '<s>' + esc(given) + '</s>') + esc(answer) + '</span>';
  };

  /* The options as they were offered, so the question reads as the question:
     the right one, the one taken instead, and the rest standing back. The
     marking is all in the class, never in the markup — hiding the answers has
     to leave four plain words behind, or the question cannot be tried again. */
  const choices = (r) => r.options.map(o => {
    const right = normalize(o) === normalize(r.answer);
    const taken = r.given != null && normalize(o) === normalize(r.given);
    return '<span class="rev-opt' + (right ? ' correct' : taken ? ' wrong' : '') + '">' +
      esc(o) + '</span>';
  }).join('');

  /* Each row hides and shows on its own, behind a button that stays where it
     is: a question is worth trying again one at a time, and a control that
     disappears when used takes the line under it with it. */
  const showBtn = '<button class="hint-btn review-show" data-show>Hide</button>';
  const reveal = (inner) => '<div class="review-reveal">' + showBtn + (inner || '') + '</div>';

  const body = head + '<div class="review-list" id="reviewList">' +
    (entry.review || []).map(r => {
      if (r.kind === 'grid') {
        /* The puzzle again, at reading size: what was typed, and under the
           button, the letters that should have been there. */
        return '<div class="review-row shown cw-row"><div class="cw-grid mini" style="--cw-cols:' + r.cols + '">' +
          r.cells.map((c, i) => {
            if (!c) return '<div class="cw-block"></div>';
            const given = (r.input || {})[i] || '';
            const right = given === c.letter;
            return '<div class="cw-cell' + (right ? ' correct' : given ? ' wrong' : '') + '">' +
              (c.num ? '<i>' + c.num + '</i>' : '') +
              '<span class="cwm-given">' + esc(given) + '</span>' +
              '<span class="cwm-answer">' + esc(c.letter) + '</span></div>';
          }).join('') + '</div>' + reveal('') + '</div>';
      }
      if (r.kind === 'passage')
        return '<div class="review-row shown"><p class="passage">' +
          r.parts.map((t, i) => passageProse(t) + (i < r.answers.length
            ? '<span class="rg-blank"></span><span class="rg-word">' + word(r.answers[i], (r.given || [])[i]) + '</span>'
            : '')).join('') + '</p>' + reveal('') + '</div>';
      /* A drill that knows whether it was right says so; the rest are judged by
         comparing, as they always were. */
      const missed = r.given != null && r.given !== '' &&
        (typeof r.ok === 'boolean' ? !r.ok : normalize(r.given) !== normalize(r.answer));
      const notReached = r.given == null ? '<span class="review-given">not reached</span>' : '';
      /* A question with options keeps them in the open while it is hidden — it
         is the marking that gives the answer away, not the words — and once
         they are marked, printing the answer underneath says it twice. */
      const opts = r.options && r.options.length;
      /* With options there is already a line to put the button on, so it goes
         at the head of it rather than claiming a line of its own. */
      return '<div class="review-row shown">' +
        '<div class="review-q">' + esc(r.q) + '</div>' +
        (opts
          ? '<div class="review-opts">' + showBtn + choices(r) + notReached + '</div>'
          : reveal(notReached + '<span class="review-a">' +
              (missed ? '<s>' + esc(r.given) + '</s>' : '') +
              (r.answer ? '<b>' + esc(r.answer) + '</b>' : esc(r.given || '')) + '</span>')) +
        '</div>';
    }).join('') + '</div>';

  openModal({
    title: modeName(entry.mode), body: body, wide: true, noFocus: true,
    foot: '<button class="ghost-btn" data-act="toggle">Hide answers</button>' +
          '<button class="primary-btn" data-act="close">Done</button>',
    onMount: (b, f) => {
      const rows = () => b.querySelectorAll('.review-row');
      const label = (row) => { const btn = row.querySelector('.review-show');
        if (btn) btn.textContent = row.classList.contains('shown') ? 'Hide' : 'Show'; };
      const foot = f.querySelector('[data-act="toggle"]');
      /* One rule for the button at the foot: it reads as what it will do, and
         with a single row hidden that is showing, not hiding. */
      const anyHidden = () => !!b.querySelector('.review-row:not(.shown)');
      const footLabel = () => { foot.textContent = anyHidden() ? 'Show answers' : 'Hide answers'; };
      f.querySelector('[data-act="close"]').onclick = closeModal;
      foot.onclick = () => {
        const show = anyHidden();
        rows().forEach(row => { row.classList.toggle('shown', show); label(row); });
        footLabel();
      };
      b.onclick = (e) => {
        const btn = e.target.closest('[data-show]');
        if (!btn) return;
        const row = btn.closest('.review-row');
        row.classList.toggle('shown');
        label(row);
        footLabel();
      };
    }
  });
}

/* "3 minutes ago", and coarser the further back it goes. */
function agoLabel(ts) {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + ' min ago';
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours + ' hour' + (hours === 1 ? '' : 's') + ' ago';
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return days + ' days ago';
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const SCOPE_NAMES = { all: 'all words', due: 'due now', weak: 'weakest', new: 'not started', recent: 'recently added' };

/* The last few rounds, each one a click away from being done again. */
function historyHTML() {
  const rounds = Store.state.practice;
  if (!rounds.length) return '';
  const modeName = (id) => { const m = MODES.filter(m => m.id === id)[0]; return m ? m.name : id; };
  return '<div class="section-title" style="margin-top:26px"><h2>Recent practice</h2>' +
      '<button class="ghost-btn tiny" data-act="clear-history">Clear</button></div>' +
    '<div class="card">' + rounds.map(r => {
      const deck = Store.deck(r.deckId);
      return '<div class="row between history-row">' +
        '<div style="min-width:0">' +
          '<b>' + esc(modeName(r.mode)) + '</b>' +
          '<div class="faint">' + esc(deck ? deck.emoji + ' ' + deck.name : 'All decks') +
            ' · ' + esc(SCOPE_NAMES[r.scope] || r.scope) +
            (isAIMode(r.mode) && r.level ? ' · ' + esc(r.level) : '') +
            ' · ' + agoLabel(r.at) + '</div>' +
        '</div>' +
        /* The score belongs with the button that offers another go, not adrift
           in the middle of the line. */
        '<div class="row" style="gap:10px;flex:none">' +
          '<span class="chip">' + pct(r.correct, r.answers) + '% of ' + r.answers + '</span>' +
          (r.review && r.review.length
            ? '<button class="soft-btn" data-review="' + r.id + '">' + ICONS.review + 'Review</button>' : '') +
        '</div>' +
      '</div>';
    }).join('') + '</div>';
}



function drawQuizResults(host) {
  cheer(quiz);
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
          (quiz.savedId ? '<button class="ghost-btn" data-act="review-round">' + ICONS.review +
            'Review this round</button>' : '') +
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

  const saved = quiz.savedId;
  host.onclick = (e) => {
    if (e.target.closest('[data-act="back"]')) { quiz = null; return render('practice'); }
    if (e.target.closest('[data-act="again"]')) { quiz = null; return startQuiz(); }
    if (e.target.closest('[data-act="review-round"]')) {
      const entry = Store.state.practice.filter(r => r.id === saved)[0];
      if (entry) return reviewRound(entry);
    }
    if (e.target.closest('[data-act="retry-wrong"]')) {
      /* Ask only about the missed words, but draw the wrong answers from the
         whole pool — with the other missed words first, since those are the
         ones actually being confused. */
      const seen = {};
      const missed = wrong.map(r => r.card).filter(c => c && !seen[c.id] && (seen[c.id] = 1));
      const wide = practicePool(quizSetup.deckId, quizSetup.scope);
      const pool = wide.length >= 2 ? wide : missed;
      let mode = quizSetup.mode;
      /* An AI drill cannot be rebuilt from the words alone — the questions were
         written for that round — and asking for new ones would spend a request
         on a handful of words. The missed words go into a built-in drill
         instead: spelling for the crossword, meanings for the rest. */
      if (isAIMode(mode)) {
        mode = mode === 'ai-crossword' ? 'typing' : 'mc-meaning';
        toast('The words you missed, as ' + MODES.filter(m => m.id === mode)[0].name.toLowerCase());
      } else if (isMatching(mode) && missed.length < 2) mode = 'mc-meaning';
      quiz = newQuiz(mode, buildQuestions(mode, pool, missed.length, { cards: missed, prefer: missed }));
      if (!quiz.items.length) { quiz = null; toast('Could not rebuild those questions', 'err'); }
      render('practice');
      return refreshChrome();
    }
  };
}

/* ==========================================================================
   Browse
   ========================================================================== */
let browseState = { q: '', deck: '', status: '', sort: 'recent' };

function renderBrowse(host) {
  let rows = Store.state.cards.slice();
  const q = browseState.q.toLowerCase().trim();
  if (q) rows = rows.filter(c =>
    (c.term + ' ' + c.sense + ' ' + c.definition + ' ' + c.translation + ' ' + c.example).toLowerCase().indexOf(q) !== -1);
  if (browseState.deck) rows = rows.filter(c => c.deckId === browseState.deck);
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
  /* Grouped by what kind of word it is — the one grouping every card carries,
     and the one that says something about where the effort is going. */
  const byPos = {};
  all.forEach(c => { const k = c.pos || 'unspecified'; (byPos[k] = byPos[k] || { n: 0, s: 0 }); byPos[k].n++; byPos[k].s += SRS.strength(c.srs); });
  const posKeys = Object.keys(byPos).sort((a, b) => byPos[b].n - byPos[a].n).slice(0, 10);
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
      '<div class="card"><div class="section-title" style="margin:0 0 8px"><h2>By part of speech</h2></div>' +
        (posKeys.length ? posKeys.map(k => {
          const v = byPos[k];
          return '<div style="padding:8px 0">' +
            '<div class="row between" style="margin-bottom:5px"><span style="font-size:.87rem">' + esc(k) + '</span>' +
            '<span class="faint">' + v.n + ' words · ' + Math.round(100 * v.s / v.n) + '% learned</span></div>' +
            '<div class="bar thin"><i style="width:' + Math.round(100 * v.s / v.n) + '%"></i></div></div>';
        }).join('') : '<p class="faint">Add some words to see this breakdown.</p>') +
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
  gemini:     { label:'Google Gemini',       provider:'gemini',     baseUrl:'',                                         model:'gemini-3.6-flash',       keyUrl:'aistudio.google.com/apikey',   note:'Has a free tier — a good place to start.' },
  groq:       { label:'Groq',                provider:'compatible', baseUrl:'https://api.groq.com/openai/v1',           model:'llama-3.3-70b-versatile', keyUrl:'console.groq.com/keys',        note:'Free tier with generous limits and very fast replies.' },
  openrouter: { label:'OpenRouter',          provider:'compatible', baseUrl:'https://openrouter.ai/api/v1',             model:'meta-llama/llama-3.3-70b-instruct:free', keyUrl:'openrouter.ai/keys', note:'Marketplace with several models marked :free.' },
  deepseek:   { label:'DeepSeek',            provider:'compatible', baseUrl:'https://api.deepseek.com/v1',              model:'deepseek-chat',          keyUrl:'platform.deepseek.com',        note:'Paid but extremely cheap.' },
  ollama:     { label:'Ollama (on your PC)', provider:'compatible', baseUrl:'http://localhost:11434/v1',                model:'llama3.1',               keyUrl:'ollama.com',                   note:'Runs offline on your own computer. No key, no cost.' }
};

function renderSettings(host) {
  const s = Store.state.settings;
  const ai = s.ai;
  const wa = s.wotdAi;

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
      '<label class="switch"><input type="checkbox" id="setWotd"' + (s.wordOfDay !== false ? ' checked' : '') + '>' +
        '<span class="track"></span><span class="txt">Word of the day</span></label>' +
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
          '<div class="field"><label>Model</label>' +
            '<input type="text" id="aiModel" list="modelList" value="' + esc(ai.model) + '">' +
            '<datalist id="modelList"></datalist>' +
            /* The link and the message it produces are kept apart: writing the
               message used to replace the link, so it could only be used once. */
            '<span class="help">Names change over time. ' +
              '<a href="#" id="aiModels">Ask the provider what it has</a> once your key is in. ' +
              '<span id="modelHint"></span></span></div>' +
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
        /* One small request a day is exactly what a free key is for, so it can
           be sent somewhere other than the drills. */
        '<label class="switch" style="padding:0 0 10px"><input type="checkbox" id="wotdSep"' +
          (wa.separate ? ' checked' : '') + '>' +
          '<span class="track"></span><span class="txt">Send it to a different provider' +
          '<small>A free key for the daily word, while the drills use the one above.</small></span></label>' +
        '<div id="wotdBox" class="' + (wa.separate ? '' : 'hidden') + '" style="margin:0 0 14px;padding:12px 14px;' +
          'border:1px solid var(--border-soft);border-radius:12px;background:var(--surface-2)">' +
          /* Only the two that cost nothing: one word a day is exactly what a
             free tier is for, and paying twice over for it would be silly. */
          '<div class="inline-fields">' +
            '<div class="field"><label>API type</label><select id="wotdProvider">' +
              WOTD_PROVIDERS.map(o => '<option value="' + o.id + '"' +
                (wotdKind(wa) === o.id ? ' selected' : '') + '>' + o.label + '</option>').join('') +
            '</select></div>' +
            '<div class="field"><label>Model</label>' +
              '<input type="text" id="wotdModel" value="' + esc(wa.model) + '" placeholder="gemini-3.6-flash"></div>' +
          '</div>' +
          '<div class="field" id="wotdKeyRow"' + (wotdKind(wa) === 'ollama' ? ' hidden' : '') + '>' +
            '<label>API key</label>' +
            '<input type="password" id="wotdKey" value="' + esc(wa.apiKey) + '" placeholder="AIza…" autocomplete="off"></div>' +
          '<div class="row"><button class="ghost-btn" id="wotdTest">Test this one</button>' +
            '<span id="wotdTestOut" class="faint"></span></div>' +
          '<span class="help" style="margin-top:10px;display:block" id="wotdHelp">' + wotdProviderHelp(wa) + '</span>' +
        '</div>' +
        '<div class="row"><button class="ghost-btn" id="aiTest">Test the connection</button>' +
          '<span id="aiTestOut" class="faint"></span></div>' +
        '<p class="help" style="margin-top:12px">' +
          '<b>' + Store.aiRequestsToday() + '</b> request' + (Store.aiRequestsToday() === 1 ? '' : 's') +
          ' sent today. Free allowances are counted in requests, not words — so a long ' +
          'answer costs no more than a short one, and generating a whole deck costs one.</p>' +
        '<p class="faint" style="margin-top:14px;line-height:1.6">Free tiers cap how many <b>requests</b> you may send — ' +
          'per minute and per day — so the thing to watch is the count above, not the length of the answers. ' +
          'Paid use is billed by tokens instead: an auto-filled card or a quiz question is about 500–1,500 of them. ' +
          'Ollama runs offline on your own machine, with no limit and no bill.</p>' +
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
  chk('setWotd', 'wordOfDay');
  const sep = $('#wotdSep');
  if (sep) sep.onchange = () => {
    s.wotdAi.separate = sep.checked; Store.save();
    $('#wotdBox').classList.toggle('hidden', !sep.checked);
  };
  const bindWotd = (id, key) => { const el = $('#' + id);
    if (el) el.onchange = () => { s.wotdAi[key] = el.value.trim(); Store.save(); }; };
  bindWotd('wotdModel', 'model'); bindWotd('wotdKey', 'apiKey');
  const kind = $('#wotdProvider');
  /* Choosing between the two fills in what each one needs — an address for
     Ollama, none for Gemini — rather than leaving it to be typed. */
  if (kind) kind.onchange = () => {
    const preset = WOTD_PROVIDERS.filter(o => o.id === kind.value)[0];
    Object.assign(s.wotdAi, { provider: preset.provider, baseUrl: preset.baseUrl, model: preset.model });
    Store.save(); render('settings');
  };
  const wtest = $('#wotdTest');
  if (wtest) wtest.onclick = async () => {
    const out = $('#wotdTestOut');
    wtest.disabled = true; out.textContent = 'Asking…';
    try {
      const said = await AI.as(Object.assign({ enabled: true }, s.wotdAi)).test();
      out.textContent = 'Connected. Reply: "' + said + '"';
    } catch (err) { out.textContent = err.message; }
    wtest.disabled = false;
  };

  const on = $('#aiOn');
  if (on) on.onchange = () => { s.ai.enabled = on.checked; Store.save(); $('#aiBox').classList.toggle('hidden', !on.checked); };
  const bindAI = (id, key) => { const el = $('#' + id); if (el) el.onchange = () => { s.ai[key] = el.value.trim(); Store.save(); }; };
  bindAI('aiProvider', 'provider'); bindAI('aiModel', 'model'); bindAI('aiBase', 'baseUrl');
  bindAI('aiKey', 'apiKey'); bindAI('aiLang', 'nativeLanguage');

  /* The model names written into the presets age out — Google retires one and
     the app stops working with a 404. Rather than keep chasing them, ask the
     endpoint itself and offer what comes back. */
  const models = $('#aiModels');
  if (models) models.onclick = async (e) => {
    e.preventDefault();
    ['aiProvider', 'aiModel', 'aiBase', 'aiKey'].forEach(id => { const el = $('#' + id); if (el) el.onchange(); });
    const hint = $('#modelHint');
    hint.textContent = 'Asking the provider…';
    try {
      const list = await AI.listModels();
      $('#modelList').innerHTML = list.map(m => '<option value="' + esc(m) + '">').join('');
      hint.innerHTML = list.length
        ? list.length + ' models offered — click the box above to choose one.'
        : 'The provider returned no models.';
      const box = $('#aiModel');
      if (list.length && list.indexOf(box.value) === -1) {
        hint.innerHTML += ' <b>' + esc(box.value) + '</b> is not among them.';
      }
    } catch (err) {
      hint.innerHTML = '<span style="color:var(--bad)">' + esc(err.message) + '</span>';
    }
  };

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
        '<b>term, part of speech, sense, definition, example, translation, ' +
        'collocations, synonyms, antonyms</b>. ' +
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
    /* Space turns the card over and nothing more. It used to answer "Good"
       once the card was open, which meant a rating you never chose. */
    if (e.key === ' ' || e.key === 'Enter') {
      if (session.revealed) return;
      e.preventDefault();
      return revealCard();
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
