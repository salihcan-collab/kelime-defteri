/* ==========================================================================
   storage.js — application state, persistence and selectors

   Everything lives in one JSON object saved to localStorage on every change.
   A full copy can be exported to / imported from a .json backup file.
   ========================================================================== */

const STORAGE_KEY = 'lexio.v1';
/* Where a save that could not be read is kept, rather than being written over. */
const RESCUE_KEY = 'lexio.v1.rescued';
/* And where the app keeps its own copies: one a day, plus one before anything
   destructive. They live under their own key, so wiping the collection — or an
   update going wrong — does not take them with it. */
const SNAPSHOT_KEY = 'lexio.v1.snapshots';
const SNAPSHOT_MAX = 3;
const SCHEMA_VERSION = 2;
/* Rounds kept in the practice history. They carry their own questions so a
   repeat costs nothing, which is also why the list has an end. */
const PRACTICE_MAX = 12;
/* Words of the day kept: a hundred is a season's worth to look back over. */
const WOTD_HISTORY = 100;

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const todayKey = (d) => {
  const t = d ? new Date(d) : new Date();
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
};
const startOfDay = (d) => { const t = d ? new Date(d) : new Date(); t.setHours(0, 0, 0, 0); return t.getTime(); };

const Store = {
  state: null,
  memoryOnly: false,
  rescued: null,                        // a save that could not be read, kept aside

  defaults() {
    return {
      version: SCHEMA_VERSION,
      starterRevision: (typeof STARTER_REVISION === 'undefined' ? 0 : STARTER_REVISION),
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
        showExtras: true,               // collocations, relations and notes on the card back
        autoSpeak: false,
        quizAffectsSrs: true,
        roundPercent: 20,               // share of the available words used in a practice round
        optionCount: 4,                 // answer choices in a multiple-choice question
        cwClues: 'side',                // crossword clues beside the grid, or below it
        wordOfDay: true,                // one AI request a day for a word to meet
        activityWeeks: 13,              // weeks shown in the Progress activity map
        ai: {
          enabled: false,
          provider: 'openai',           // openai | compatible | gemini
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-4o-mini',
          apiKey: '',
          nativeLanguage: 'Turkish',
          level: 'B1-B2',             // CEFR band the AI writes and marks at
          roomFor: ''                 // a model that needs a wide output budget

        },
        /* The word of the day can be sent somewhere else — a free key for the
           one small daily request, while the drills use whatever they use. */
        wotdAi: {
          separate: false,
          provider: 'gemini',
          baseUrl: '',
          model: 'gemini-3.6-flash',
          apiKey: '',
          roomFor: ''
        }
      },
      decks: [],
      cards: [],
      log: [],                          // { ts, cardId, rating, correct, mode }
      daily: {},                        // 'YYYY-MM-DD': { new:0, reviews:0, correct:0, minutes:0 }
      aiUsage: { day: '', count: 0 },   // requests this app sent today, for the free allowance
      practice: [],                     // finished rounds, newest first — see addRound
      wotd: null,                       // { day, term, pos, definition, example, translation }
      wotdLog: [],                      // the last hundred, newest first — history, and the avoid list
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
        /* A copy of the collection as it was found, before this session touches
           it. Once a day is enough to undo a bad day. */
        if (this.state.cards.length) this.snapshot(raw);
      } catch (e) {
        /* Whatever went wrong, the one thing that must not happen is quietly
           replacing a collection with a fresh one. The unreadable save is put
           aside under its own key, and the app says so. */
        console.error('Could not read the saved collection', e);
        this.rescued = { at: Date.now(), why: e.message, raw: raw };
        try { localStorage.setItem(RESCUE_KEY, raw); } catch (e2) {}
        this.state = this.defaults();
        this.seed();
      }
    } else {
      this.state = this.defaults();
      this.seed();
    }
    return this.state;
  },

  /* Bringing a saved collection up to date. Every merge writes into a fresh
     object: `Object.assign(base, data)` replaced the defaults' own `settings`
     with the saved one, so the next line asking for `base.settings.wotdAi` —
     a group of settings the save was made before — got undefined and threw,
     and load() answered a thrown migration by starting the collection again.
     Two people's worth of practice went that way. */
  migrate(data) {
    const base = this.defaults();
    const d = data || {};
    const ds = d.settings || {};
    const s = Object.assign({}, base, d);
    s.settings = Object.assign({}, base.settings, ds);
    s.settings.ai = Object.assign({}, base.settings.ai, ds.ai || {});
    s.settings.wotdAi = Object.assign({}, base.settings.wotdAi, ds.wotdAi || {});
    s.decks = d.decks || [];
    s.cards = (d.cards || []).map(c => {
      if (!c.srs) c.srs = SRS.newState();
      if (!c.stats) c.stats = { seen: 0, correct: 0, wrong: 0 };
      /* Added in schema 2. Older backups simply have none of these. */
      if (typeof c.sense !== 'string') c.sense = '';
      /* Categories were dropped: word families and decks do that job now. */
      if ('category' in c) delete c.category;
      if (!Array.isArray(c.collocations)) c.collocations = [];
      if (!Array.isArray(c.related)) c.related = [];
      return c;
    });
    s.aiUsage = d.aiUsage || { day: '', count: 0 };
    s.practice = (d.practice || []).slice(0, PRACTICE_MAX);
    s.wotd = d.wotd || null;
    /* Older collections kept only the words' names; they become history with
       nothing but a name, which is better than losing them. */
    s.wotdLog = (d.wotdLog || (d.wotdSeen || []).slice().reverse().map(t => ({ term: t })))
      .slice(0, WOTD_HISTORY);
    s.log = d.log || [];
    s.daily = d.daily || {};
    /* Starter content that has been corrected or added since this collection
       was created. Gated on its own counter, never on the schema version —
       a release that only bumps the schema would otherwise lock the collection
       out of every content fix written after it. */
    s.starterRevision = d.starterRevision || 0;
    if (s.starterRevision < STARTER_REVISION) {
      this.upgradeStarters(s);
      s.starterRevision = STARTER_REVISION;
    }
    s.version = SCHEMA_VERSION;
    return s;
  },

  /* Bring an existing collection up to date with starter content that changed,
     touching only cards that are still exactly as they shipped. Anything the
     learner edited, renamed or deleted is left alone, and a repaired card keeps
     its id, its schedule and its statistics — only its wording is corrected. */
  upgradeStarters(state) {
    if (typeof STARTER_UPGRADES === 'undefined' || typeof STARTER_DECKS === 'undefined') return;
    const key = (v) => String(v == null ? '' : v).trim().toLowerCase();

    /* Every card the starter decks ship today, with the deck it belongs to. */
    const shipped = [];
    STARTER_DECKS.forEach(d => d.cards.forEach(c => shipped.push({ deckName: d.name, card: c })));
    const shippedSenses = (term) => shipped.filter(s => key(s.card.term) === key(term));

    /* Fields that carry content. A repaired card keeps everything else. */
    const contentOf = (src) => ({
      sense: src.sense || '', definition: src.definition || '',
      translation: src.translation || '',
      collocations: (src.collocations || []).slice(),
      related: (src.related || []).slice()
    });

    let repaired = 0, added = 0;

    STARTER_UPGRADES.splits.forEach(rule => {
      const old = state.cards.find(c =>
        key(c.term) === key(rule.term) && key(c.definition) === key(rule.oldDefinition));
      if (!old) return;                       /* edited, renamed or deleted — leave it */
      const senses = shippedSenses(rule.term);
      const keep = senses.find(s => s.card.sense === rule.becomes);
      if (!keep) return;
      Object.assign(old, contentOf(keep.card), { updatedAt: Date.now() });
      repaired++;
      senses.forEach(s => {
        if (s.card.sense === rule.becomes) return;
        if (state.cards.some(c => key(c.term) === key(rule.term) && key(c.sense) === key(s.card.sense))) return;
        state.cards.push(this._makeCard(Object.assign({}, s.card, { deckId: old.deckId })));
        added++;
      });
    });

    STARTER_UPGRADES.enrich.forEach(term => {
      const src = shippedSenses(term)[0];
      if (!src) return;
      const card = state.cards.find(c =>
        key(c.term) === key(term) && key(c.definition) === key(src.card.definition));
      if (!card) return;
      let touched = false;
      if (!(card.collocations || []).length && (src.card.collocations || []).length) {
        card.collocations = src.card.collocations.slice(); touched = true;
      }
      if (!(card.related || []).length && (src.card.related || []).length) {
        card.related = src.card.related.slice(); touched = true;
      }
      if (touched) { card.updatedAt = Date.now(); repaired++; }
    });

    STARTER_UPGRADES.additions.forEach(rule => {
      const deck = state.decks.find(d => key(d.name) === key(rule.deck));
      if (!deck) return;                                  /* deck renamed or deleted */
      if (state.cards.some(c => key(c.term) === key(rule.term))) return;   /* already there */
      shippedSenses(rule.term).forEach(s => {
        state.cards.push(this._makeCard(Object.assign({}, s.card, { deckId: deck.id })));
        added++;
      });
    });

    /* Read once by the app so it can say what happened; never saved. */
    if (repaired || added) this._starterUpgrade = { repaired: repaired, added: added };
  },

  /* The same thing on demand, from Settings. Safe to press at any time: it
     only ever fills in what is missing, so pressing it twice does nothing the
     second time. It exists because an automatic upgrade that fails to reach a
     collection leaves the learner with no way to ask for it. */
  refreshStarters() {
    this._starterUpgrade = null;
    this.upgradeStarters(this.state);
    this.state.starterRevision = STARTER_REVISION;
    this.saveNow();
    const result = this._starterUpgrade || { repaired: 0, added: 0 };
    this._starterUpgrade = null;
    return result;
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

  /* A deck that ships with the app, put into a collection that is already in
     use. Nothing there is disturbed: a word the deck already holds is left
     exactly as it is, edits and review history included, so pressing this
     twice does nothing the second time. */
  installDeck(src) {
    const key = (v) => String(v == null ? '' : v).trim().toLowerCase();
    const sig = (c) => key(c.term) + '|' + key(c.pos) + '|' + key(c.sense);
    let deck = this.state.decks.filter(d => key(d.name) === key(src.name))[0];
    if (!deck) deck = this.addDeck({ name: src.name, emoji: src.emoji, description: src.description }, true);
    const have = {};
    this.cardsOf(deck.id).forEach(c => { have[sig(c)] = 1; });
    let added = 0;
    src.cards.forEach(c => {
      if (have[sig(c)]) return;
      this.addCard(Object.assign({ deckId: deck.id }, c), true);
      added++;
    });
    this.saveNow();
    return { deck: deck, added: added };
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
    const card = this._makeCard(data);
    this.state.cards.push(card);
    if (!quiet) this.save();
    return card;
  },

  _makeCard(data) {
    return {
      id: uid(),
      deckId: data.deckId || (this.state && this.state.decks[0] && this.state.decks[0].id) || null,
      term: (data.term || '').trim(),
      pos: data.pos || '',
      /* A short label that tells this sense apart from the word's other
         senses — "to protest" next to "a thing". Empty for most words. */
      sense: (data.sense || '').trim(),
      definition: (data.definition || '').trim(),
      example: (data.example || '').trim(),
      translation: (data.translation || '').trim(),
      collocations: (data.collocations || []).slice(),
      related: (data.related || []).slice(),
      notes: data.notes || '',
      srs: data.srs || SRS.newState(),
      stats: { seen: 0, correct: 0, wrong: 0 },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
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

  /* Words that share a spelling are senses of one headword: object the noun
     and object the verb, work out "exercise" and work out "turn out well".
     Each sense stays its own card with its own schedule, because you learn
     them separately — this is only how they find each other. */
  headKey(term) { return String(term || '').trim().toLowerCase(); },

  sensesOf(term, exceptId, deckId) {
    const key = this.headKey(term);
    if (!key) return [];
    return this.state.cards.filter(c =>
      c.id !== exceptId &&
      (!deckId || c.deckId === deckId) &&
      this.headKey(c.term) === key);
  },

  siblings(card) { return card ? this.sensesOf(card.term, card.id) : []; },

  /* The card you would land on if you followed a written word — used to turn
     "scarce" typed into a synonym box into a link, without storing an id that
     could later point at a deleted card. */
  cardByTerm(term, exceptId) {
    const key = this.headKey(term);
    if (!key) return null;
    return this.state.cards.find(c => c.id !== exceptId && this.headKey(c.term) === key) || null;
  },

  /* Relations are written on one word but true of both, so a word shows the
     links it declares and the links other words declare about it. Nothing is
     stored twice, and deleting a word cannot leave a broken reference. */
  relationsFor(card) {
    if (!card) return [];
    const out = [];
    const seen = {};
    const push = (kind, text, from) => {
      const key = kind + '|' + this.headKey(text);
      if (!text || seen[key] || this.headKey(text) === this.headKey(card.term)) return;
      seen[key] = 1;
      out.push({ kind: kind, text: text, card: this.cardByTerm(text, card.id), via: from || null });
    };
    /* Family links are followed separately, by familyOf — a family is a whole
       set, not a list of one-to-one links. */
    (card.related || []).forEach(r => { if (r.kind !== 'family') push(r.kind, r.text, null); });
    this.state.cards.forEach(other => {
      if (other.id === card.id) return;
      (other.related || []).forEach(r => {
        if (r.kind === 'family') return;
        if (this.headKey(r.text) === this.headKey(card.term)) push(r.kind, other.term, other.id);
      });
    });
    return out;
  },

  /* A word family — analyse, analysis, analytical, analytically — is the set of
     words joined by family links, followed in every direction and through as
     many hops as it takes. Nothing is a "head": whichever member you look at,
     you see the same family, and adding a member reorders nothing. Because it
     is the connected set that counts, linking each new word to any one member
     is enough.

     Cards that merely share a spelling are senses of one word, not family, so
     they are left out. */
  familyOf(card) {
    if (!card) return [];
    const key = (t) => this.headKey(t);
    const self = key(card.term);
    const byTerm = {};
    this.state.cards.forEach(c => { (byTerm[key(c.term)] = byTerm[key(c.term)] || []).push(c); });

    const reached = {}; reached[self] = 1;
    const queue = [self];
    while (queue.length) {
      const term = queue.shift();
      const step = (t) => { const k = key(t); if (t && !reached[k]) { reached[k] = 1; queue.push(k); } };
      (byTerm[term] || []).forEach(c =>
        (c.related || []).forEach(r => { if (r.kind === 'family') step(r.text); }));
      this.state.cards.forEach(other =>
        (other.related || []).forEach(r => {
          if (r.kind === 'family' && key(r.text) === term) step(other.term);
        }));
    }

    /* One entry per word, the senses of a member collapsed into it. */
    const out = [];
    Object.keys(reached).forEach(k => {
      if (k === self) return;
      const cards = byTerm[k];
      if (cards && cards.length) out.push(cards[0]);
      else out.push({ id: null, term: k, pos: '', missing: true });
    });
    return out.sort((a, b) => a.term.localeCompare(b.term));
  },

  /* One deck, several, or all of them. Everything that works from a deck —
     the queue, the counts, the practice pool — comes through here, so taking a
     list of ids is all it costs to let a session span decks. An empty list
     means every deck, the same as no deck at all: that is what a picker with
     nothing turned on has always meant. */
  cardsOf(deckId) {
    if (Array.isArray(deckId)) {
      if (!deckId.length) return this.state.cards.slice();
      const want = {};
      deckId.forEach(id => { want[id] = 1; });
      return this.state.cards.filter(c => want[c.deckId]);
    }
    return deckId ? this.state.cards.filter(c => c.deckId === deckId) : this.state.cards.slice();
  },

  /* "Start from zero": the cards forget their schedule AND the diary is wiped,
     otherwise today's counters keep eating into the day's new-word allowance
     and the Progress page still reports the runs that were just erased.
     A single-deck reset only drops that deck's entries — the daily activity
     record is about what you did, not about which deck you did it in. */
  resetProgress(deckId) {
    /* Schedules and statistics are about to go; a copy of them first. */
    if (this.state.cards.length) this.snapshot(JSON.stringify(this.state), 'before resetting progress');
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

  /* Free allowances are counted in requests, so it helps to see how many this
     app has sent. It is what we sent, not what the provider counted — a retry
     shows up here as the two requests it really is. */
  countAIRequest() {
    const key = todayKey();
    if (!this.state.aiUsage || this.state.aiUsage.day !== key) this.state.aiUsage = { day: key, count: 0 };
    this.state.aiUsage.count++;
    this.save();
    return this.state.aiUsage.count;
  },

  aiRequestsToday() {
    const u = this.state.aiUsage;
    return (u && u.day === todayKey()) ? u.count : 0;
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


  /* ---------- import / export ---------------------------------------------- */
  exportJSON() {
    this.state.lastBackup = Date.now();
    this.saveNow();
    return JSON.stringify(this.state, null, 2);
  },

  importJSON(text, mode) {
    const backup = JSON.parse(text);
    if (!backup || !Array.isArray(backup.cards)) throw new Error('This file does not look like a Lexio backup.');
    if (mode === 'merge') {
      const known = new Set(this.state.cards.map(c => (c.term + '|' + c.deckId).toLowerCase()));
      const deckMap = {};
      (backup.decks || []).forEach(d => {
        const existing = this.state.decks.find(x => x.name === d.name);
        deckMap[d.id] = existing ? existing.id : this.addDeck(d, true).id;
      });
      let added = 0;
      backup.cards.forEach(c => {
        const target = deckMap[c.deckId] || (this.state.decks[0] || {}).id;
        if (known.has((c.term + '|' + target).toLowerCase())) return;
        this.addCard(Object.assign({}, c, { id: undefined, deckId: target }), true);
        added++;
      });
      this.saveNow();
      return { added: added, mode: 'merge' };
    }
    this.state = this.migrate(backup);
    this.saveNow();
    return { added: this.state.cards.length, mode: 'replace' };
  },

  exportCSV(deckId) {
    const rows = [['term', 'part of speech', 'sense', 'definition', 'example', 'translation',
                   'collocations', 'synonyms', 'antonyms', 'deck']];
    const rel = (c, kind) => (c.related || []).filter(r => r.kind === kind).map(r => r.text).join('; ');
    this.cardsOf(deckId).forEach(c => {
      const d = this.deck(c.deckId);
      rows.push([c.term, c.pos, c.sense, c.definition, c.example, c.translation,
                 (c.collocations || []).join('; '), rel(c, 'syn'), rel(c, 'ant'), d ? d.name : '']);
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
    /* Columns added in schema 2 — only picked up when the file names them, so
       old headerless exports keep importing exactly as they used to. */
    const named = (names) => { for (const n of names) { const i = head.indexOf(n); if (i !== -1) return i; } return -1; };
    const iSense = start ? named(['sense', 'meaning label']) : -1;
    const iColl  = start ? named(['collocations', 'collocation']) : -1;
    const iSyn   = start ? named(['synonyms', 'synonym']) : -1;
    const iAnt   = start ? named(['antonyms', 'antonym']) : -1;
    const list = (v) => String(v == null ? '' : v).split(/[;|]/).map(x => x.trim()).filter(Boolean);
    const at = (row, i) => (i === -1 ? '' : (row[i] || ''));

    let added = 0, skipped = 0;
    /* Two rows for the same word are two senses of it, not a mistake — only a
       row that repeats the same word, part of speech AND meaning is skipped. */
    const seen = {};
    const rowKey = (term, pos, def) =>
      [term, pos, def].map(v => String(v || '').trim().toLowerCase()).join('|');
    this.cardsOf(deckId).forEach(c => { seen[rowKey(c.term, c.pos, c.definition)] = 1; });
    for (let r = start; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row[iTerm] || !String(row[iTerm]).trim()) continue;
      const key = rowKey(row[iTerm], row[iPos], row[iDef]);
      if (seen[key]) { skipped++; continue; }
      seen[key] = 1;
      this.addCard({
        deckId: deckId,
        term: row[iTerm], pos: row[iPos] || '', definition: row[iDef] || '',
        example: row[iEx] || '', translation: row[iTr] || '',
        sense: at(row, iSense),
        collocations: list(at(row, iColl)),
        related: list(at(row, iSyn)).map(t => ({ kind: 'syn', text: t }))
          .concat(list(at(row, iAnt)).map(t => ({ kind: 'ant', text: t })))
      }, true);
      added++;
    }
    this.saveNow();
    return { added: added, skipped: skipped };
  },

  /* ---------- the app's own copies -------------------------------------- */
  snapshots() {
    try { return JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '[]'); }
    catch (e) { return []; }
  },

  /* Keep the collection as it stands. One a day unless something is about to
     destroy it, in which case one now. Storage can be full, so the list is
     shortened until it fits rather than failing outright. */
  snapshot(raw, force) {
    if (!raw) return null;
    const list = this.snapshots();
    const day = todayKey();
    if (!force && list.some(sn => sn.day === day)) return null;
    const entry = { at: Date.now(), day: day, why: force || 'daily',
                    cards: this.state.cards.length, decks: this.state.decks.length, raw: raw };
    const all = [entry].concat(list).slice(0, SNAPSHOT_MAX);
    for (let n = all.length; n > 0; n--) {
      try { localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(all.slice(0, n))); return entry; }
      catch (e) { /* no room — keep one fewer and try again */ }
    }
    return null;
  },

  /* Put one back. The copy that is being replaced is kept first, so restoring
     the wrong one is not the end of the story either. */
  restoreSnapshot(at) {
    const sn = this.snapshots().filter(x => x.at === at)[0];
    if (!sn) return false;
    this.snapshot(JSON.stringify(this.state), 'before restoring');
    this.state = this.migrate(JSON.parse(sn.raw));
    this.saveNow();
    return true;
  },

  /* A finished round, kept so it can be done again. An AI round brings its
     questions with it: repeating one is then free, which is the whole point of
     being able to. */
  addRound(round) {
    const entry = Object.assign({ id: uid(), at: Date.now() }, round);
    this.state.practice.unshift(entry);
    this.state.practice = this.state.practice.slice(0, PRACTICE_MAX);
    this.save();
    return entry;
  },

  clearPractice() { this.state.practice = []; this.save(); },

  /* Today's word, and a memory of the ones before it so the same word is not
     offered twice. */
  setWordOfDay(word, replacing) {
    const day = todayKey();
    /* Asking for another word replaces today's entry in the history rather than
       adding a second one for the same day. */
    if (replacing) this.state.wotdLog = this.state.wotdLog.filter(w => w.day !== day);
    this.state.wotd = Object.assign({ day: day, replaced: !!replacing }, word);
    this.state.wotdLog = [this.state.wotd].concat(this.state.wotdLog).slice(0, WOTD_HISTORY);
    this.save();
    return this.state.wotd;
  },

  wipe() {
    /* The copies live under their own key and are deliberately left alone: the
       one moment a copy is worth most is just after everything is deleted. */
    if (this.state && this.state.cards && this.state.cards.length)
      this.snapshot(JSON.stringify(this.state), 'before deleting everything');
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
