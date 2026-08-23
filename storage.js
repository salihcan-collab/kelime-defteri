/* ==========================================================================
   storage.js — application state, persistence and selectors

   Everything lives in one JSON object saved to localStorage on every change.
   A full copy can be exported to / imported from a .json backup file.
   ========================================================================== */

const STORAGE_KEY = 'lexio.v1';
const SCHEMA_VERSION = 1;

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const todayKey = (d) => {
  const t = d ? new Date(d) : new Date();
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
};
const startOfDay = (d) => { const t = d ? new Date(d) : new Date(); t.setHours(0, 0, 0, 0); return t.getTime(); };

const Store = {
  state: null,
  memoryOnly: false,

  defaults() {
    return {
      version: SCHEMA_VERSION,
      createdAt: Date.now(),
      settings: {
        theme: 'dark',
        accent: 'indigo',
        font: 'sans',
        size: 'md',
        newPerDay: 15,
        reviewPerDay: 120,
        studyDirection: 'term-first',   // term-first | translation-first | mixed
        showExampleOnFront: false,
        autoSpeak: false,
        quizAffectsSrs: true,
        roundPercent: 20,               // share of the available words used in a practice round
        optionCount: 4,                 // answer choices in a multiple-choice question
        activityWeeks: 13,              // weeks shown in the Progress activity map
        ai: {
          enabled: false,
          provider: 'openai',           // openai | compatible | gemini
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-4o-mini',
          apiKey: '',
          nativeLanguage: 'Turkish'
        }
      },
      decks: [],
      cards: [],
      log: [],                          // { ts, cardId, rating, correct, mode }
      daily: {},                        // 'YYYY-MM-DD': { new:0, reviews:0, correct:0, minutes:0 }
      lastBackup: null
    };
  },

  /* ---------- persistence ---------------------------------------------- */
  load() {
    let raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); }
    catch (e) { this.memoryOnly = true; }

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        this.state = this.migrate(parsed);
      } catch (e) {
        console.error('Could not parse saved data', e);
        this.state = this.defaults();
        this.seed();
      }
    } else {
      this.state = this.defaults();
      this.seed();
    }
    return this.state;
  },

  migrate(data) {
    const base = this.defaults();
    const s = Object.assign(base, data);
    s.settings = Object.assign(base.settings, data.settings || {});
    s.settings.ai = Object.assign(base.settings.ai, (data.settings || {}).ai || {});
    s.decks = data.decks || [];
    s.cards = (data.cards || []).map(c => {
      if (!c.srs) c.srs = SRS.newState();
      if (!c.stats) c.stats = { seen: 0, correct: 0, wrong: 0 };
      return c;
    });
    s.log = data.log || [];
    s.daily = data.daily || {};
    s.version = SCHEMA_VERSION;
    return s;
  },

  save() {
    if (this._t) clearTimeout(this._t);
    this._t = setTimeout(() => this.saveNow(), 250);
  },

  saveNow() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.memoryOnly = false;
    } catch (e) {
      this.memoryOnly = true;
      console.warn('Saving failed — running in memory only.', e);
    }
  },

  /* ---------- seeding ---------------------------------------------------- */
  seed() {
    STARTER_DECKS.forEach(d => {
      const deck = this.addDeck({ name: d.name, emoji: d.emoji, description: d.description }, true);
      d.cards.forEach(c => this.addCard(Object.assign({ deckId: deck.id }, c), true));
    });
    this.saveNow();
  },

  /* ---------- decks ------------------------------------------------------ */
  addDeck(data, quiet) {
    const deck = {
      id: uid(),
      name: data.name || 'Untitled deck',
      emoji: data.emoji || '📘',
      description: data.description || '',
      createdAt: Date.now()
    };
    this.state.decks.push(deck);
    if (!quiet) this.save();
    return deck;
  },

  updateDeck(id, patch) {
    const d = this.state.decks.find(x => x.id === id);
    if (d) { Object.assign(d, patch); this.save(); }
    return d;
  },

  deleteDeck(id, withCards) {
    this.state.decks = this.state.decks.filter(d => d.id !== id);
    if (withCards) this.state.cards = this.state.cards.filter(c => c.deckId !== id);
    else this.state.cards.forEach(c => { if (c.deckId === id) c.deckId = null; });
    this.save();
  },

  deck(id) { return this.state.decks.find(d => d.id === id); },

  /* ---------- cards ------------------------------------------------------ */
  addCard(data, quiet) {
    const card = {
      id: uid(),
      deckId: data.deckId || (this.state.decks[0] && this.state.decks[0].id) || null,
      term: (data.term || '').trim(),
      pos: data.pos || '',
      definition: (data.definition || '').trim(),
      example: (data.example || '').trim(),
      translation: (data.translation || '').trim(),
      category: (data.category || '').trim(),
      notes: data.notes || '',
      srs: data.srs || SRS.newState(),
      stats: { seen: 0, correct: 0, wrong: 0 },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.state.cards.push(card);
    if (!quiet) this.save();
    return card;
  },

  updateCard(id, patch) {
    const c = this.state.cards.find(x => x.id === id);
    if (c) { Object.assign(c, patch, { updatedAt: Date.now() }); this.save(); }
    return c;
  },

  deleteCard(id) {
    this.state.cards = this.state.cards.filter(c => c.id !== id);
    this.save();
  },

  card(id) { return this.state.cards.find(c => c.id === id); },

  /* Cards that already use this term, ignoring case and surrounding spaces. */
  findDuplicates(term, exceptId, deckId) {
    const key = String(term || '').trim().toLowerCase();
    if (!key) return [];
    return this.state.cards.filter(c =>
      c.id !== exceptId &&
      (!deckId || c.deckId === deckId) &&
      String(c.term || '').trim().toLowerCase() === key);
  },

  cardsOf(deckId) {
    return deckId ? this.state.cards.filter(c => c.deckId === deckId) : this.state.cards.slice();
  },

  /* "Start from zero": the cards forget their schedule AND the diary is wiped,
     otherwise today's counters keep eating into the day's new-word allowance
     and the Progress page still reports the runs that were just erased.
     A single-deck reset only drops that deck's entries — the daily activity
     record is about what you did, not about which deck you did it in. */
  resetProgress(deckId) {
    const reset = {};
    this.state.cards.forEach(c => {
      if (!deckId || c.deckId === deckId) {
        reset[c.id] = 1;
        c.srs = SRS.newState();
        c.stats = { seen: 0, correct: 0, wrong: 0 };
      }
    });
    this._undo = null;
    if (deckId) {
      this.state.log = this.state.log.filter(l => !reset[l.cardId]);
    } else {
      this.state.log = [];
      this.state.daily = {};
    }
    this.save();
  },

  /* ---------- reviewing --------------------------------------------------- */
  review(cardId, rating, mode) {
    const card = this.card(cardId);
    if (!card) return null;
    const wasNew = card.srs.state === 'new';
    const before = {
      srs: JSON.parse(JSON.stringify(card.srs)),
      stats: Object.assign({}, card.stats),
      updatedAt: card.updatedAt
    };

    card.srs = SRS.answer(card.srs, rating);
    card.stats.seen++;
    if (rating === 1) card.stats.wrong++; else card.stats.correct++;
    card.updatedAt = Date.now();

    const dayKey = todayKey();
    const d = this.today();
    d.reviews++;
    if (wasNew) d.new++;
    if (rating > 1) d.correct++;

    const entry = { ts: Date.now(), cardId, rating, correct: rating > 1, mode: mode || 'review' };
    this.state.log.push(entry);
    if (this.state.log.length > 8000) this.state.log = this.state.log.slice(-6000);

    /* Everything the answer touched, so undo can put all of it back.
       Kept off this.state so it is never written to storage. */
    this._undo = { cardId: cardId, rating: rating, wasNew: wasNew, dayKey: dayKey, ts: entry.ts, before: before };
    this.save();
    return card;
  },

  canUndo() { return !!this._undo; },

  /* Reverse the last review completely: card schedule, card stats, the daily
     counters (reviews / new / correct) and the log entry. */
  undoReview() {
    const u = this._undo;
    this._undo = null;
    if (!u) return null;
    const card = this.card(u.cardId);
    if (!card) return null;

    card.srs = u.before.srs;
    card.stats = u.before.stats;
    card.updatedAt = u.before.updatedAt;

    const d = this.state.daily[u.dayKey];
    if (d) {
      d.reviews = Math.max(0, d.reviews - 1);
      if (u.wasNew) d.new = Math.max(0, d.new - 1);
      if (u.rating > 1) d.correct = Math.max(0, d.correct - 1);
    }

    const last = this.state.log[this.state.log.length - 1];
    if (last && last.ts === u.ts && last.cardId === u.cardId) this.state.log.pop();

    this.save();
    return { card: card, rating: u.rating, wasNew: u.wasNew };
  },

  /* Quiz answers can optionally nudge the schedule. */
  quizResult(cardId, correct) {
    const card = this.card(cardId);
    if (!card) return;
    this._undo = null;
    card.stats.seen++;
    if (correct) card.stats.correct++; else card.stats.wrong++;
    const d = this.today();
    d.reviews++;
    if (correct) d.correct++;
    this.state.log.push({ ts: Date.now(), cardId, rating: correct ? 3 : 1, correct: !!correct, mode: 'quiz' });

    if (this.state.settings.quizAffectsSrs) {
      if (correct) {
        if (card.srs.state === 'new') card.srs = SRS.answer(card.srs, 3);
        else if (SRS.isDue(card.srs)) card.srs = SRS.answer(card.srs, 3);
      } else {
        card.srs = SRS.answer(card.srs, 1);
      }
    }
    this.save();
  },

  today() {
    const k = todayKey();
    if (!this.state.daily[k]) this.state.daily[k] = { new: 0, reviews: 0, correct: 0 };
    return this.state.daily[k];
  },

  /* ---------- queue ------------------------------------------------------- */
  /* Cards to study now: due reviews + learning cards + a capped number of new ones. */
  /* opts.ahead: study ahead of schedule — take the cards whose turn is
     nearest even though it has not come yet, and ignore the daily caps. */
  queue(deckId, opts) {
    opts = opts || {};
    const ahead = !!opts.ahead;
    const now = Date.now();
    const pool = this.cardsOf(deckId).filter(c => c.term);
    const limitNew = ahead ? Infinity
      : Math.max(0, (this.state.settings.newPerDay || 0) - this.today().new);
    const limitRev = ahead ? Infinity : (this.state.settings.reviewPerDay || 9999);
    const ready = (c) => ahead || c.srs.due <= now;

    const learning = pool.filter(c => (c.srs.state === 'learning' || c.srs.state === 'relearning') && ready(c));
    const due      = pool.filter(c => c.srs.state === 'review' && ready(c))
                         .sort((a, b) => a.srs.due - b.srs.due).slice(0, limitRev);
    const fresh    = pool.filter(c => c.srs.state === 'new')
                         .sort((a, b) => a.createdAt - b.createdAt).slice(0, limitNew);

    /* Interleave new cards among reviews so a session does not feel front-loaded. */
    const mixed = [];
    const revs = learning.concat(due);
    const total = revs.length + fresh.length;
    const every = fresh.length ? Math.max(1, Math.floor(revs.length / fresh.length) || 1) : 0;
    let fi = 0, ri = 0;
    for (let i = 0; i < total; i++) {
      const wantNew = fresh.length && (ri >= revs.length || (every && i % (every + 1) === every));
      if (wantNew && fi < fresh.length) mixed.push(fresh[fi++]);
      else if (ri < revs.length) mixed.push(revs[ri++]);
      else if (fi < fresh.length) mixed.push(fresh[fi++]);
    }
    return mixed;
  },

  /* Two independent things, never mixed:

       knowledge level — new / learning / familiar / mastered.
                         Every card sits in exactly one of these.
       scheduling      — is this card's next review time here yet?
                         Only cards that have been started can be "due".

     A card can be Learning and due, or Learning and not due yet; the same
     goes for Familiar and Mastered. `ready` is what a session would contain
     right now: everything due, plus the new cards today's cap still allows. */
  counts(deckId) {
    const now = Date.now();
    const pool = this.cardsOf(deckId).filter(c => c.term);
    const level = (name) => pool.filter(c => SRS.bucket(c.srs) === name).length;
    const started = pool.filter(c => c.srs.state !== 'new');
    const dueNow = started.filter(c => c.srs.due <= now);
    const newTotal = level('new');
    const newAvailable = Math.min(
      Math.max(0, (this.state.settings.newPerDay || 0) - this.today().new), newTotal);

    return {
      total: pool.length,
      /* knowledge levels */
      new: newTotal,
      learning: level('learning'),
      familiar: level('familiar'),
      mastered: level('mastered'),
      /* scheduling */
      due: dueNow.length,
      dueLearning: dueNow.filter(c => SRS.bucket(c.srs) === 'learning').length,
      later: started.length - dueNow.length,
      newAvailable: newAvailable,
      ready: dueNow.length + newAvailable
    };
  },

  /* ---------- statistics --------------------------------------------------- */
  streak() {
    let cur = 0, longest = 0, run = 0;
    const days = Object.keys(this.state.daily).filter(k => this.state.daily[k].reviews > 0).sort();
    if (!days.length) return { current: 0, longest: 0 };
    let prev = null;
    days.forEach(k => {
      const t = startOfDay(k.replace(/-/g, '/'));
      run = (prev !== null && t - prev === 86400000) ? run + 1 : 1;
      longest = Math.max(longest, run);
      prev = t;
    });
    const last = startOfDay(days[days.length - 1].replace(/-/g, '/'));
    const today = startOfDay();
    if (last === today || today - last === 86400000) cur = run;
    return { current: cur, longest: longest };
  },

  history(days) {
    const out = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = todayKey(d);
      const e = this.state.daily[k] || { new: 0, reviews: 0, correct: 0 };
      out.push({ key: k, date: d, reviews: e.reviews, new: e.new, correct: e.correct });
    }
    return out;
  },

  forecast(days, deckId) {
    const out = [];
    const pool = this.cardsOf(deckId);
    for (let i = 0; i < days; i++) {
      const from = startOfDay() + i * 86400000;
      const to = from + 86400000;
      out.push({
        offset: i,
        count: pool.filter(c => c.srs.state === 'review' && c.srs.due >= from && c.srs.due < to).length
      });
    }
    return out;
  },

  retention(days) {
    const since = Date.now() - days * 86400000;
    const rows = this.state.log.filter(l => l.ts >= since && l.mode !== 'new');
    if (!rows.length) return null;
    return Math.round(100 * rows.filter(r => r.correct).length / rows.length);
  },

  categories() {
    const set = new Set();
    this.state.cards.forEach(c => { if (c.category) set.add(c.category); });
    return Array.from(set).sort();
  },

  /* ---------- import / export ---------------------------------------------- */
  exportJSON() {
    this.state.lastBackup = Date.now();
    this.saveNow();
    return JSON.stringify(this.state, null, 2);
  },

  importJSON(text, mode) {
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.cards)) throw new Error('This file does not look like a Lexio backup.');
    if (mode === 'merge') {
      const known = new Set(this.state.cards.map(c => (c.term + '|' + c.deckId).toLowerCase()));
      const deckMap = {};
      (data.decks || []).forEach(d => {
        const existing = this.state.decks.find(x => x.name === d.name);
        deckMap[d.id] = existing ? existing.id : this.addDeck(d, true).id;
      });
      let added = 0;
      data.cards.forEach(c => {
        const target = deckMap[c.deckId] || (this.state.decks[0] || {}).id;
        if (known.has((c.term + '|' + target).toLowerCase())) return;
        this.addCard(Object.assign({}, c, { id: undefined, deckId: target }), true);
        added++;
      });
      this.saveNow();
      return { added: added, mode: 'merge' };
    }
    this.state = this.migrate(data);
    this.saveNow();
    return { added: this.state.cards.length, mode: 'replace' };
  },

  exportCSV(deckId) {
    const rows = [['term', 'part of speech', 'definition', 'example', 'translation', 'category', 'deck']];
    this.cardsOf(deckId).forEach(c => {
      const d = this.deck(c.deckId);
      rows.push([c.term, c.pos, c.definition, c.example, c.translation, c.category, d ? d.name : '']);
    });
    return rows.map(r => r.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(',')).join('\n');
  },

  importCSV(text, deckId) {
    const rows = parseCSV(text);
    if (!rows.length) return 0;
    let start = 0;
    const head = rows[0].map(h => h.toLowerCase().trim());
    const known = ['term', 'word', 'part of speech', 'pos'];
    if (known.some(k => head.indexOf(k) !== -1)) start = 1;
    const idx = (names, fallback) => {
      for (const n of names) { const i = head.indexOf(n); if (i !== -1) return i; }
      return fallback;
    };
    const iTerm = start ? idx(['term', 'word'], 0) : 0;
    const iPos  = start ? idx(['part of speech', 'pos', 'type'], 1) : 1;
    const iDef  = start ? idx(['definition', 'meaning'], 2) : 2;
    const iEx   = start ? idx(['example', 'sentence', 'example sentence'], 3) : 3;
    const iTr   = start ? idx(['translation', 'turkish', 'çeviri'], 4) : 4;
    const iCat  = start ? idx(['category', 'topic', 'tag'], 5) : 5;

    let added = 0, skipped = 0;
    const seen = {};
    this.cardsOf(deckId).forEach(c => { seen[String(c.term).trim().toLowerCase()] = 1; });
    for (let r = start; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row[iTerm] || !String(row[iTerm]).trim()) continue;
      const key = String(row[iTerm]).trim().toLowerCase();
      if (seen[key]) { skipped++; continue; }
      seen[key] = 1;
      this.addCard({
        deckId: deckId,
        term: row[iTerm], pos: row[iPos] || '', definition: row[iDef] || '',
        example: row[iEx] || '', translation: row[iTr] || '', category: row[iCat] || ''
      }, true);
      added++;
    }
    this.saveNow();
    return { added: added, skipped: skipped };
  },

  wipe() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    this.state = this.defaults();
    this.seed();
  }
};

/* Minimal RFC-4180 CSV reader (handles quotes, embedded commas and newlines). */
function parseCSV(text) {
  const rows = []; let row = []; let val = ''; let q = false;
  text = String(text).replace(/\r\n?/g, '\n');
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { val += '"'; i++; } else q = false; }
      else val += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(val); val = ''; }
    else if (ch === '\n') { row.push(val); rows.push(row); row = []; val = ''; }
    else val += ch;
  }
  if (val !== '' || row.length) { row.push(val); rows.push(row); }
  return rows.filter(r => r.length && !(r.length === 1 && !r[0].trim()));
}
