/* Lexio regression suite.

   Every check here exists because something was once wrong. The comment above
   each block says what broke, so a future change that reintroduces the bug
   fails loudly instead of quietly.

   Run:  node tests/regression.js
   Needs Playwright with a Chromium build. Nothing else — the app itself has
   no dependencies and is loaded straight from disk over file://.            */

const path = require('path');
const fs = require('fs');

function loadChromium() {
  const tries = ['playwright', 'playwright-core', '/opt/node22/lib/node_modules/playwright'];
  for (const t of tries) {
    try { return require(t).chromium; } catch (e) {}
  }
  console.error('Playwright not found. Install it with:  npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');

let failures = 0, checks = 0;
const ok   = (s) => { checks++; console.log('  ✓ ' + s); };
const bad  = (s) => { checks++; failures++; console.log('  ✗ ' + s); };
const is   = (cond, s) => cond ? ok(s) : bad(s);
const head = (s) => console.log('\n— ' + s + ' —');

(async () => {
  if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
    console.error('index.html not found next to tests/ — run this from the app folder.');
    process.exit(2);
  }

  const chromium = loadChromium();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });

  const noise = [];
  page.on('pageerror', e => noise.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') noise.push('CONSOLE: ' + m.text()); });

  await page.goto(URL);
  await page.waitForTimeout(500);

  /* Every test starts from the seeded state, never from whatever the last
     run left in localStorage. */
  const fresh = async () => {
    await page.evaluate(() => { Store.wipe(); Store.saveNow(); go('dashboard', {}); });
    await page.waitForTimeout(250);
  };
  await fresh();
  const seedSize = await page.evaluate(() => STARTER_DECKS.reduce((n, d) => n + d.cards.length, 0));

  /* ------------------------------------------------------------------ *
     1. It boots, and every view renders without throwing.
   * ------------------------------------------------------------------ */
  head('boot and navigation');
  const views = ['dashboard', 'decks', 'study', 'practice', 'browse', 'stats', 'settings'];
  for (const v of views) {
    await page.evaluate(n => go(n, {}), v);
    await page.waitForTimeout(180);
    const shown = await page.evaluate(n => {
      const el = document.getElementById('view-' + n);
      return !!el && !el.classList.contains('hidden') && el.innerHTML.trim().length > 50;
    }, v);
    is(shown, `${v} renders`);
  }
  await page.evaluate(() => go('dashboard', {}));

  /* ------------------------------------------------------------------ *
     2. Scheduling.

     The bug: intervals were multiplied by the ease factor no matter how
     little time had actually passed, so six taps in one sitting pushed a
     card to 50 days and it showed as "Mastered" on day two. Growth is now
     proportional to the elapsed share of the previous interval.
   * ------------------------------------------------------------------ */
  head('spaced repetition');

  const rush = await page.evaluate(() => {
    /* Answer "Good" ten times in a row, all in the same minute. */
    let s = SRS.newState();
    const now = Date.now();
    for (let i = 0; i < 10; i++) s = SRS.answer(s, 3, now);
    return { interval: s.interval, bucket: SRS.bucket(s) };
  });
  is(rush.interval < 21 && rush.bucket !== 'mastered',
     `ten same-minute reviews stay short (${rush.interval.toFixed(1)}d, ${rush.bucket})`);

  const paced = await page.evaluate(() => {
    /* The same ten reviews, each one taken when the card was actually due. */
    let s = SRS.newState();
    let t = Date.now();
    for (let i = 0; i < 10; i++) { s = SRS.answer(s, 3, t); t = s.due; }
    return { interval: s.interval, bucket: SRS.bucket(s) };
  });
  is(paced.interval > rush.interval, `reviewing on schedule grows faster (${paced.interval.toFixed(0)}d vs ${rush.interval.toFixed(1)}d)`);
  is(paced.bucket === 'mastered', 'ten on-schedule reviews do reach Mastered');

  const buckets = await page.evaluate(() => ({
    fresh:    SRS.bucket({ state: 'new', interval: 0 }),
    learn:    SRS.bucket({ state: 'learning', interval: 0 }),
    relearn:  SRS.bucket({ state: 'relearning', interval: 0 }),
    just:     SRS.bucket({ state: 'review', interval: 20.9 }),
    over:     SRS.bucket({ state: 'review', interval: 21 })
  }));
  is(buckets.fresh === 'new' && buckets.learn === 'learning' && buckets.relearn === 'learning',
     'new / learning / relearning map to the right levels');
  is(buckets.just === 'familiar' && buckets.over === 'mastered', 'Mastered begins at 21 days, not before');

  const again = await page.evaluate(() => {
    let s = SRS.newState(); let t = Date.now();
    for (let i = 0; i < 8; i++) { s = SRS.answer(s, 3, t); t = s.due; }
    const before = s.interval;
    const after = SRS.answer(s, 1, t);
    return { before: before, interval: after.interval, state: after.state, lapses: after.lapses };
  });
  is(again.state === 'relearning' && again.lapses === 1 && again.interval < again.before,
     'a lapse sends the card back to relearning and shortens it');

  /* Reading intervals: "in 1.4mo" was unreadable in the word list. */
  const wording = await page.evaluate(() => ({
    days: SRS.humanDays(42 * 86400000),
    one:  SRS.humanDays(86400000),
    soon: SRS.humanDays(-1),
    short: SRS.humanDelay(10 * 60000)
  }));
  is(/^in 42 days$/.test(wording.days) && wording.one === 'in 1 day',
     'the word list says "in 42 days", never a fraction of a month');
  is(wording.soon === 'due now' && wording.short === '10m', 'short delays keep the compact form');

  /* ------------------------------------------------------------------ *
     3. Knowledge level and scheduling are two different things.

     The bug: Study said "3 learning, 0 due" while the dashboard said
     "3 due now". They are separate dimensions and must be counted apart.
   * ------------------------------------------------------------------ */
  head('levels versus scheduling');
  await fresh();
  const dims = await page.evaluate(() => {
    const now = Date.now();
    const cards = Store.state.cards;
    /* one Familiar card due now, one Familiar card due later */
    cards[0].srs = Object.assign(SRS.newState(), { state: 'review', interval: 5, ease: 2.5, due: now - 1000, reps: 3 });
    cards[1].srs = Object.assign(SRS.newState(), { state: 'review', interval: 5, ease: 2.5, due: now + 5 * 86400000, reps: 3 });
    /* one Learning card not due for another ten minutes */
    cards[2].srs = Object.assign(SRS.newState(), { state: 'learning', step: 1, interval: 0, due: now + 600000, reps: 1 });
    Store.saveNow();
    return Store.counts(null);
  });
  is(dims.familiar === 2, 'both Familiar cards count as Familiar whether or not they are due');
  is(dims.due === 1, 'only the card whose time has come is due');
  is(dims.learning === 1 && dims.dueLearning === 0, 'a Learning card that is not due yet is Learning but not due');
  is(dims.later === 2, 'the rest are scheduled for later');
  is(dims.ready === dims.due + dims.newAvailable, 'a session offers what is due plus today\'s new allowance');

  /* ------------------------------------------------------------------ *
     4. Study ahead.

     The bug: "Study ahead anyway" answered "No cards to study in this deck".
     Ahead must ignore both the due date and the daily caps.
   * ------------------------------------------------------------------ */
  head('study ahead');
  const ahead = await page.evaluate(() => {
    const now = Date.now();
    Store.state.cards.forEach(c => {
      c.srs = Object.assign(SRS.newState(), { state: 'review', interval: 9, ease: 2.5, due: now + 9 * 86400000, reps: 2 });
    });
    Store.state.settings.newPerDay = 0;
    Store.saveNow();
    return { normal: Store.queue(null, {}).length, ahead: Store.queue(null, { ahead: true }).length,
             total: Store.state.cards.length };
  });
  is(ahead.normal === 0, 'nothing is due, so a normal session is empty');
  is(ahead.ahead === ahead.total, `study ahead offers every card (${ahead.ahead})`);

  /* ------------------------------------------------------------------ *
     5. Undo.

     The bug: a session summary read "105% — 20 of 19 correct", because undo
     put back the answer count but not the correct count. Undo must reverse
     the card, its stats, the daily counters and the log together.
   * ------------------------------------------------------------------ */
  head('undo');
  await fresh();
  const undo = await page.evaluate(() => {
    const id = Store.state.cards[0].id;
    const snap = () => {
      const c = Store.card(id), d = Store.today();
      return { state: c.srs.state, interval: c.srs.interval, reps: c.srs.reps, due: c.srs.due,
               seen: c.stats.seen, correct: c.stats.correct, wrong: c.stats.wrong,
               dayReviews: d.reviews, dayCorrect: d.correct, dayNew: d.new, log: Store.state.log.length };
    };
    const before = snap();
    Store.review(id, 3, 'review');
    const mid = snap();
    const could = Store.canUndo();
    Store.undoReview();
    return { before: before, mid: mid, after: snap(), could: could, canAgain: Store.canUndo() };
  });
  is(undo.mid.dayReviews === undo.before.dayReviews + 1 && undo.mid.seen === undo.before.seen + 1,
     'answering a card is recorded once');
  is(JSON.stringify(undo.after) === JSON.stringify(undo.before), 'undo restores every counter exactly');
  is(undo.could && !undo.canAgain, 'undo is offered once and only once');

  /* The same thing through the real UI, since the summary is what the user
     reads: correct answers can never exceed answers given. */
  const summary = await page.evaluate(async () => {
    Store.wipe(); Store.saveNow();
    startSession(null, false);
    for (let i = 0; i < 6; i++) { if (!currentCard()) break; revealCard(); rateCard(3); }
    undoAnswer();
    if (currentCard()) { revealCard(); rateCard(2); }
    return { done: session.done, good: session.good };
  });
  is(summary.good <= summary.done, `session tally stays sane after undo (${summary.good} of ${summary.done})`);
  await page.evaluate(() => { if (typeof session !== 'undefined' && session) endSession(); });

  /* ------------------------------------------------------------------ *
     6. Reset all progress.

     Two bugs at once: the daily diary survived a reset, so the new-card
     allowance stayed one short forever, and the Progress page still showed
     the old history.
   * ------------------------------------------------------------------ */
  head('reset progress');
  const reset = await page.evaluate(() => {
    Store.wipe();
    const now = Date.now();
    for (let i = 0; i < 30; i++) {
      const t = new Date(); t.setDate(t.getDate() - i);
      const k = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
      Store.state.daily[k] = { new: 3, reviews: 20, correct: 18 };
    }
    Store.state.cards.forEach((c, i) => {
      if (i % 2 === 0) {
        c.srs = Object.assign(SRS.newState(), { state: 'review', interval: 40, ease: 2.6, due: now + 40 * 86400000, reps: 6 });
        c.stats = { seen: 9, correct: 8, wrong: 1 };
      }
    });
    for (let i = 0; i < 50; i++) Store.state.log.push({ ts: now - i * 60000, cardId: Store.state.cards[0].id, rating: 3, correct: true, mode: 'review' });
    Store.state.settings.newPerDay = 15;
    Store.saveNow();
    Store.resetProgress(null);
    /* Read these before today() lazily opens a row for today. */
    const logAfter = Store.state.log.length;
    const diaryAfter = Object.keys(Store.state.daily).length;
    const c = Store.counts(null);
    return {
      words: Store.state.cards.length,
      allNew: Store.state.cards.every(x => x.srs.state === 'new'),
      statsZero: Store.state.cards.every(x => x.stats.seen === 0),
      log: logAfter,
      diary: diaryAfter,
      todayNew: Store.today().new,
      streak: Store.streak().current,
      newAvailable: c.newAvailable
    };
  });
  is(reset.words === seedSize && reset.allNew && reset.statsZero, 'the words survive, their progress does not');
  is(reset.log === 0 && reset.diary === 0 && reset.streak === 0, 'the review history and the streak are cleared');
  is(reset.newAvailable === 15, `the whole daily allowance is available again (${reset.newAvailable} of 15)`);

  /* The cap really drives the number — it used to land one short of it. */
  for (const cap of [10, 25, 40]) {
    const n = await page.evaluate(v => {
      Store.state.settings.newPerDay = v; Store.saveNow(); return Store.counts(null).newAvailable;
    }, cap);
    is(n === cap, `a cap of ${cap} offers ${cap} new cards`);
  }
  await page.evaluate(() => { Store.state.settings.newPerDay = 15; Store.saveNow(); });

  /* A per-deck reset must leave the other decks alone. */
  const perDeck = await page.evaluate(() => {
    Store.wipe();
    Store.state.cards.forEach(c => { c.srs.state = 'review'; c.srs.interval = 12; c.stats = { seen: 4, correct: 3, wrong: 1 }; });
    Store.saveNow();
    const d = Store.state.decks[0].id;
    Store.resetProgress(d);
    const inDeck = Store.cardsOf(d);
    const outside = Store.state.cards.filter(c => c.deckId !== d);
    return { inside: inDeck.every(c => c.srs.state === 'new'), outside: outside.every(c => c.srs.state === 'review') };
  });
  is(perDeck.inside && perDeck.outside, 'resetting one deck leaves the other decks untouched');

  /* ------------------------------------------------------------------ *
     7. Example sentences.

     The bug: "a piece of cake" highlighted nothing sensible and
     "get the hang of" highlighted only "get". Matching is whole-phrase,
     with room for inflection on the first and last word.
   * ------------------------------------------------------------------ */
  head('phrase matching in examples');
  const phrases = await page.evaluate(() => {
    Store.wipe();
    const misses = [];
    Store.state.cards.forEach(c => {
      if (!c.example) return;
      const html = highlightTerm(c.example, c.term);
      if (html.indexOf('<b>') === -1) misses.push(c.term);
    });
    return { total: Store.state.cards.length, misses: misses };
  });
  is(phrases.misses.length === 0,
     phrases.misses.length ? `unhighlighted: ${phrases.misses.join(', ')}` : `all ${phrases.total} seed examples highlight their term`);

  const tricky = await page.evaluate(() => {
    const t = (sentence, term) => {
      const at = termMatch(sentence, term);
      return at ? sentence.slice(at[0], at[1]) : null;
    };
    return {
      idiom:   t('The exam was a piece of cake for her.', 'a piece of cake'),
      hang:    t('It took a week to get the hang of the new software.', 'get the hang of'),
      inflect: t('She quickly grasped the concept.', 'grasp'),
      plural:  t('Their arguments were unconvincing.', 'argument'),
      absent:  t('Nothing here at all.', 'elsewhere')
    };
  });
  is(tricky.idiom === 'a piece of cake', 'a multi-word idiom matches as one phrase');
  is(tricky.hang === 'get the hang of', 'a phrasal verb matches in full, not just its first word');
  is(!!tricky.inflect && /grasp/i.test(tricky.inflect), 'an inflected verb still matches');
  is(!!tricky.plural && /argument/i.test(tricky.plural), 'a plural noun still matches');
  is(tricky.absent === null, 'a word that is not there matches nothing');

  /* A fill-in-the-blank must actually remove the answer from the sentence. */
  const blanked = await page.evaluate(() => {
    const b = blankOut('The exam was a piece of cake for her.', 'a piece of cake');
    return { text: b.text, surface: b.surface };
  });
  is(blanked.text.indexOf('piece of cake') === -1 && /_/.test(blanked.text),
     'the blank hides the answer instead of showing it');

  /* ------------------------------------------------------------------ *
     8. Adding words.

     Two bugs: the same word could be saved twice, and a word could be saved
     with no meaning and no part of speech.
   * ------------------------------------------------------------------ */
  head('card validation');
  const dup = await page.evaluate(() => {
    Store.wipe();
    const first = Store.state.cards[0];
    return {
      same:  Store.sensesOf(first.term, null, first.deckId).length,
      cased: Store.sensesOf(first.term.toUpperCase(), null, first.deckId).length,
      self:  Store.sensesOf(first.term, first.id, first.deckId).length,
      novel: Store.sensesOf('zzzsomethingnew', null, first.deckId).length
    };
  });
  is(dup.same === 1 && dup.cased === 1, 'an existing word is found again, whatever its case');
  is(dup.self === 0, 'editing a word does not report the word as its own duplicate');
  is(dup.novel === 0, 'a genuinely new word reports no duplicate');

  await page.evaluate(() => { Store.wipe(); Store.saveNow(); go('browse', {}); });
  await page.waitForTimeout(250);
  await page.click('#view-browse [data-act="add"]');
  await page.waitForTimeout(250);
  await page.fill('#cTerm', 'zzzplaceholder');
  await page.click('.modal-foot [data-act="save"]');
  await page.waitForTimeout(250);
  const blocked = await page.evaluate(() => ({
    open: !!document.querySelector('#cTerm'),
    saved: Store.state.cards.some(c => c.term === 'zzzplaceholder'),
    flagged: ['cPos', 'cDef'].filter(id => {
      const el = document.getElementById(id); return el && el.classList.contains('invalid');
    }).length,
    said: (document.querySelectorAll('.toast')[document.querySelectorAll('.toast').length - 1] || {}).textContent || ''
  }));
  is(blocked.open && !blocked.saved, 'a word with no meaning and no part of speech is refused');
  is(blocked.flagged === 2, 'the two missing fields are marked in place, not in a second dialog');
  is(/needs/i.test(blocked.said), `the editor says what is missing: "${blocked.said.trim()}"`);
  await page.evaluate(() => closeModal());
  await page.waitForTimeout(200);

  /* Saving a word that already exists warns first and saves only on a second,
     deliberate click — and the warning must not destroy what was typed. */
  const existing = await page.evaluate(() => Store.state.cards[0].term);
  await page.click('#view-browse [data-act="add"]');
  await page.waitForTimeout(250);
  await page.fill('#cTerm', existing);
  await page.selectOption('#cPos', { index: 1 });
  await page.fill('#cDef', 'a deliberate second copy');
  const countBefore = await page.evaluate(() => Store.state.cards.length);
  await page.click('.modal-foot [data-act="save"]');
  await page.waitForTimeout(300);
  const warned = await page.evaluate(() => ({
    warning: !!document.querySelector('#dupWarn .feedback'),
    stillOpen: !!document.getElementById('cTerm'),
    typed: (document.getElementById('cDef') || {}).value,
    label: (document.querySelector('.modal-foot [data-act="save"]') || {}).textContent,
    count: Store.state.cards.length
  }));
  is(warned.warning && warned.count === countBefore, 'saving a word you already have stops to ask first');
  is(warned.stillOpen && warned.typed === 'a deliberate second copy',
     'the notice appears inside the editor and keeps what was typed');
  is(/sense/i.test(warned.label || ''), `the button now reads "${(warned.label || '').trim()}"`);
  await page.click('.modal-foot [data-act="save"]');
  await page.waitForTimeout(300);
  const forced = await page.evaluate(() => Store.state.cards.length);
  is(forced === countBefore + 1, 'a second, deliberate click saves it as another sense');

  /* ------------------------------------------------------------------ *
     8b. Senses of one word.

     object is a noun and a verb; work out means three different things. Each
     sense stays its own card with its own schedule, but the app has to know
     they are one word — otherwise a multiple-choice question can offer two
     meanings that are both true.
   * ------------------------------------------------------------------ */
  head('words with more than one sense');
  const senses = await page.evaluate(() => {
    Store.wipe();
    const groups = {};
    Store.state.cards.forEach(c => {
      const k = Store.headKey(c.term);
      (groups[k] = groups[k] || []).push(c);
    });
    const multi = Object.keys(groups).filter(k => groups[k].length > 1);
    const object = groups['object'] || [];
    return {
      multi: multi.length,
      allLabelled: multi.every(k => groups[k].every(c => (c.sense || '').trim())),
      objectSenses: object.length,
      objectParts: Array.from(new Set(object.map(c => c.pos))).sort(),
      separateSchedules: object.length > 1 &&
        new Set(object.map(c => c.id)).size === object.length,
      siblingCount: object.length ? Store.siblings(object[0]).length : -1,
      caseInsensitive: Store.sensesOf('OBJECT').length
    };
  });
  is(senses.multi >= 4, `${senses.multi} seed words carry more than one sense`);
  is(senses.allLabelled, 'every sense of a repeated word has a label to tell it apart');
  is(senses.objectSenses === 3 && senses.objectParts.join(',') === 'noun,verb',
     `object is kept as ${senses.objectSenses} senses across ${senses.objectParts.join(' and ')}`);
  is(senses.separateSchedules && senses.siblingCount === senses.objectSenses - 1,
     'each sense is its own card, and each one knows its siblings');
  is(senses.caseInsensitive === 3, 'senses are found whatever the capitalisation');

  /* The bug this prevents: "What does object mean?" offering both "a thing"
     and "to protest" — two correct answers, one of them marked wrong. */
  const noSiblingOptions = await page.evaluate(() => {
    quizSetup.scope = 'all'; quizSetup.deckId = '';
    const pool = practicePool(null, 'all');
    const object = pool.filter(c => Store.headKey(c.term) === 'object');
    let clashes = 0, asked = 0;
    ['mc-meaning', 'mc-word'].forEach(mode => {
      const qs = buildQuestions(mode, pool, object.length, { cards: object });
      qs.forEach(q => {
        asked++;
        const wrong = q.options.filter(o => o !== q.answer);
        const siblingMeanings = Store.siblings(q.card)
          .map(sb => mode === 'mc-meaning' ? (sb.definition || sb.translation) : sb.term);
        if (wrong.some(o => siblingMeanings.indexOf(o) !== -1)) clashes++;
      });
    });
    return { asked: asked, clashes: clashes };
  });
  is(noSiblingOptions.asked > 0 && noSiblingOptions.clashes === 0,
     `no question offers another sense of the same word as a wrong answer (${noSiblingOptions.asked} checked)`);

  /* ------------------------------------------------------------------ *
     8c. Collocations and relations.
   * ------------------------------------------------------------------ */
  head('collocations, synonyms and opposites');
  const links = await page.evaluate(() => {
    Store.wipe();
    const withColl = Store.state.cards.filter(c => (c.collocations || []).length);
    const withRel = Store.state.cards.filter(c => (c.related || []).length);
    /* every collocation should contain its own word, or the drills cannot use it */
    const orphan = [];
    withColl.forEach(c => (c.collocations || []).forEach(p => {
      if (!termMatch(p, c.term)) orphan.push(c.term + ' / ' + p);
    }));
    const undermine = Store.state.cards.find(c => c.term === 'undermine');
    const rels = Store.relationsFor(undermine);
    /* a relation written on one word is true of the other one too */
    const weaken = Store.state.cards.find(c => Store.headKey(c.term) === 'weaken');
    return {
      coll: withColl.length, rel: withRel.length, orphan: orphan,
      undermineRels: rels.map(r => r.kind + ':' + r.text).sort(),
      resolvesToCards: rels.filter(r => r.card).length,
      backLink: weaken ? Store.relationsFor(weaken).some(r => r.text === 'undermine') : 'no such card'
    };
  });
  is(links.coll >= 10 && links.rel >= 5,
     `${links.coll} words carry collocations and ${links.rel} carry synonyms or opposites`);
  is(links.orphan.length === 0,
     links.orphan.length ? `collocation without its word: ${links.orphan[0]}` : 'every collocation contains its own word');
  is(links.undermineRels.join(' ') === 'ant:strengthen syn:weaken',
     `undermine knows its synonym and its opposite (${links.undermineRels.join(', ')})`);

  const twoWay = await page.evaluate(() => {
    Store.wipe();
    const deck = Store.state.decks[0].id;
    const a = Store.addCard({ term: 'zzzfirst', pos: 'noun', definition: 'one', deckId: deck,
                              related: [{ kind: 'syn', text: 'zzzsecond' }] }, true);
    const b = Store.addCard({ term: 'zzzsecond', pos: 'noun', definition: 'two', deckId: deck }, true);
    const forward = Store.relationsFor(a);
    const backward = Store.relationsFor(b);
    Store.deleteCard(b.id);
    const afterDelete = Store.relationsFor(a);
    return {
      forwardLinked: forward.some(r => r.text === 'zzzsecond' && r.card && r.card.id === b.id),
      backLinked: backward.some(r => r.text === 'zzzfirst' && r.card && r.card.id === a.id),
      survives: afterDelete.some(r => r.text === 'zzzsecond' && !r.card)
    };
  });
  is(twoWay.forwardLinked, 'a synonym you already have becomes a link');
  is(twoWay.backLinked, 'the other word shows the same link back, without storing it twice');
  is(twoWay.survives, 'deleting the other word leaves plain text, never a broken link');

  /* ------------------------------------------------------------------ *
     8d. Bringing an older collection up to date.

     The bug: starter decks are only ever dealt to an empty collection, so a
     learner who had been using the app since schema 1 got the new fields but
     none of the new content — 66 words, no object, one muddled "work out".
   * ------------------------------------------------------------------ */
  head('upgrading a collection made before the change');
  const built = await page.evaluate(() => {
    const OLD = {
      'turn down': 'To refuse an offer, or to reduce volume.',
      'work out':  'To end well, or to exercise, or to calculate.',
      'bring up':  'To mention a subject, or to raise a child.',
      'catch up':  'To reach the same level, or to exchange news.'
    };
    Store.wipe();
    const st = Store.state;
    const seen = {};
    st.cards = st.cards.filter(c => {
      if (c.term === 'object') return false;
      const k = c.term.toLowerCase();
      if (seen[k]) return false; seen[k] = 1; return true;
    });
    st.cards.forEach(c => {
      if (OLD[c.term]) c.definition = OLD[c.term];
      delete c.sense; delete c.collocations; delete c.related;
    });
    const wo = st.cards.find(c => c.term === 'work out');
    wo.srs = Object.assign(SRS.newState(), { state: 'review', interval: 12, ease: 2.4,
                                             due: Date.now() + 12 * 86400000, reps: 5 });
    wo.stats = { seen: 7, correct: 6, wrong: 1 };
    const edited = st.cards.find(c => c.term === 'bring up');
    edited.definition = 'My own wording for this one.';
    /* Exactly what an old save looks like: stamped by a release that knew
       nothing about starter revisions. */
    st.version = 1;
    delete st.starterRevision;
    localStorage.setItem('lexio.v1', JSON.stringify(st));
    return { words: st.cards.length, workOutId: wo.id };
  });
  is(built.words === 66, `a schema-1 collection has ${built.words} words and no object`);

  await page.reload();
  await page.waitForTimeout(900);
  const upgraded = await page.evaluate(() => ({
    version: Store.state.version,
    objects: Store.sensesOf('object').length,
    workOut: Store.sensesOf('work out').map(c => c.sense).sort(),
    turnDown: Store.sensesOf('turn down').length,
    catchUp: Store.sensesOf('catch up').length,
    bringUp: Store.sensesOf('bring up').map(c => c.definition),
    undermine: (Store.state.cards.find(c => c.term === 'undermine') || {}).collocations || [],
    told: [...document.querySelectorAll('.toast')].some(t => /updated|added/i.test(t.textContent))
  }));
  is(upgraded.version === 2 && upgraded.objects === 3, 'reopening it adds object with its three senses');
  is(upgraded.workOut.length === 3 && upgraded.turnDown === 2 && upgraded.catchUp === 2,
     `the words that held several meanings are split apart (${upgraded.workOut.join(', ')})`);
  is(upgraded.undermine.length === 3, 'words that only gained collocations get them');
  is(upgraded.bringUp.length === 1 && upgraded.bringUp[0] === 'My own wording for this one.',
     'a word the learner had edited is left exactly as they wrote it');
  is(upgraded.told, 'the learner is told that starter words changed');

  const repairedCard = await page.evaluate(id => {
    const c = Store.card(id);
    return c && { sense: c.sense, interval: c.srs.interval, reps: c.srs.reps, seen: c.stats.seen };
  }, built.workOutId);
  is(repairedCard && repairedCard.interval === 12 && repairedCard.reps === 5 && repairedCard.seen === 7,
     'a repaired card keeps its id, its schedule and its statistics');
  is(repairedCard && repairedCard.sense === 'to turn out well',
     'and becomes the sense its own example sentence was already showing');

  const secondOpen = await page.evaluate(() => Store.state.cards.length);
  await page.reload();
  await page.waitForTimeout(900);
  const thirdOpen = await page.evaluate(() => ({ words: Store.state.cards.length, ran: !!Store._starterUpgrade }));
  is(thirdOpen.words === secondOpen && !thirdOpen.ran, 'opening it again changes nothing');

  /* The case that actually stranded a real collection: a release bumped the
     schema without changing any content, so the collection was already
     stamped with the new schema when the content fix was written. Gating the
     content upgrade on the schema version locks that collection out forever. */
  await page.evaluate(() => {
    Store.wipe();
    const st = Store.state;
    const seen = {};
    st.cards = st.cards.filter(c => {
      if (c.term === 'object') return false;
      const k = c.term.toLowerCase();
      if (seen[k]) return false; seen[k] = 1; return true;
    });
    st.cards.forEach(c => { if (c.term === 'work out') c.definition = 'To end well, or to exercise, or to calculate.'; });
    st.version = SCHEMA_VERSION;      /* already on the current schema */
    delete st.starterRevision;        /* but never offered the content */
    localStorage.setItem('lexio.v1', JSON.stringify(st));
  });
  await page.reload();
  await page.waitForTimeout(900);
  const stranded = await page.evaluate(() => ({
    objects: Store.sensesOf('object').length,
    workOut: Store.sensesOf('work out').length,
    revision: Store.state.starterRevision
  }));
  is(stranded.objects === 3 && stranded.workOut === 3,
     'a collection already stamped with the current schema still receives the content');
  is(stranded.revision === 1, 'and is marked so it is not upgraded twice');

  /* And the button that exists so no collection can ever be stranded again. */
  const manual = await page.evaluate(() => {
    Store.wipe();
    Store.state.cards = Store.state.cards.filter(c => c.term !== 'object');
    Store.saveNow();
    const missing = Store.sensesOf('object').length;
    const first = Store.refreshStarters();
    const second = Store.refreshStarters();
    return { missing: missing, restored: Store.sensesOf('object').length, first: first, second: second };
  });
  is(manual.missing === 0 && manual.restored === 3,
     `"Restore starter words" brings back what is missing (${manual.first.added} added)`);
  is(manual.second.added === 0 && manual.second.repaired === 0,
     'pressing it a second time does nothing');
  await page.evaluate(() => { Store.wipe(); Store.saveNow(); });

  /* ------------------------------------------------------------------ *
     9. Practice.

     The bug: "practice the 3 I missed" built questions with three choices,
     because the choice count came from the pool size rather than the setting.
     Matching always dealt six pairs whatever the round size said, and the
     last pair was free because there were no spare tiles.
   * ------------------------------------------------------------------ */
  head('practice rounds');
  const practice = await page.evaluate(() => {
    Store.wipe();
    Store.state.settings.optionCount = 5;
    Store.state.settings.roundPercent = 50;
    Store.saveNow();
    quizSetup.scope = 'all'; quizSetup.deckId = '';
    const pool = practicePool(null, 'all');
    const missed = pool.slice(0, 3);           /* the "practice the 3 I missed" case */
    const big = buildQuestions('mc-word', pool, roundLength(pool.length), {});
    const small = buildQuestions('mc-word', pool, 3, { cards: missed, prefer: missed });
    return {
      pool: pool.length,
      roundLength: roundLength(pool.length),
      bigCount: big.length,
      bigChoices: big[0] ? big[0].options.length : 0,
      smallCount: small.length,
      smallChoices: small.map(q => q.options.length),
      /* the other missed words should turn up as decoys */
      crossFed: small.some(q => q.options.some(o =>
        missed.some(m => m.term === o && m.term !== q.answer)))
    };
  });
  is(practice.roundLength === Math.round(practice.pool * 0.5),
     `a 50% round of ${practice.pool} words asks ${practice.roundLength}`);
  is(practice.bigCount === practice.roundLength, 'the round really contains that many questions');
  is(practice.bigChoices === 5, 'the answer-choice setting decides the number of choices');
  is(practice.smallCount === 3 && practice.smallChoices.every(n => n === 5),
     `re-practising 3 missed words still offers 5 choices (${practice.smallChoices.join(',')})`);
  is(practice.crossFed, 'the other words you just missed are used as the decoys');

  const optCounts = await page.evaluate(() => {
    const out = {};
    const pool = practicePool(null, 'all');
    [4, 5].forEach(n => {
      Store.state.settings.optionCount = n;
      out[n] = ['mc-word', 'mc-meaning'].every(mode =>
        buildQuestions(mode, pool, 5, {}).every(q => q.options.length === n));
    });
    Store.state.settings.optionCount = 4; Store.saveNow();
    return out;
  });
  is(optCounts[4] && optCounts[5], 'both 4 and 5 choices are honoured, in both multiple-choice drills');

  /* Matching splits the round into boards and deals one spare tile per board,
     so the final word still has to be chosen. */
  const match = await page.evaluate(() => {
    Store.wipe();
    quizSetup.scope = 'all'; quizSetup.deckId = '';
    const pool = practicePool(null, 'all');
    const out = {};
    [4, 10, 20].forEach(n => {
      const boards = buildQuestions('matching', pool, n, {});
      out[n] = {
        boards: boards.length,
        dealt: boards.reduce((t, b) => t + b.cards.length, 0),
        allHaveSpare: boards.every(b => !!b.decoy),
        spareIsOutside: boards.every(b => b.decoy && b.cards.every(c => c.id !== b.decoy.id))
      };
    });
    return out;
  });
  for (const n of [4, 10, 20]) {
    is(match[n].dealt === n, `a round of ${n} deals ${match[n].dealt} words, not a fixed six`);
  }
  is([4, 10, 20].every(n => match[n].allHaveSpare && match[n].spareIsOutside),
     'every matching board carries one spare meaning, so the last pair is not free');

  /* ------------------------------------------------------------------ *
     10. Appearance.

     The bugs: theme attributes leaked onto inner elements, the four text
     sizes were too close together, and Sans and Rounded rendered identically.
   * ------------------------------------------------------------------ */
  head('themes, fonts and sizes');
  const appearance = await page.evaluate(() => {
    const sizes = {};
    ['sm', 'md', 'lg', 'xl'].forEach(s => {
      document.documentElement.setAttribute('data-size', s);
      sizes[s] = parseFloat(getComputedStyle(document.documentElement).fontSize);
    });
    document.documentElement.setAttribute('data-size', Store.state.settings.size || 'md');
    const fonts = {};
    ['sans', 'rounded', 'serif', 'mono', 'humanist'].forEach(f => {
      document.documentElement.setAttribute('data-font', f);
      fonts[f] = getComputedStyle(document.body).fontFamily;
    });
    document.documentElement.setAttribute('data-font', Store.state.settings.font || 'sans');
    const strays = document.querySelectorAll('body [data-theme], body [data-accent], body [data-font], body [data-size]').length;
    return { sizes: sizes, fonts: fonts, strays: strays,
             themes: THEMES.length, accents: ACCENTS.length, fontCount: FONTS.length };
  });
  is(appearance.sizes.sm === 14.5 && appearance.sizes.md === 16 &&
     appearance.sizes.lg === 17.5 && appearance.sizes.xl === 19,
     `four distinct text sizes (${Object.values(appearance.sizes).join(' / ')} px)`);
  is(appearance.fonts.sans !== appearance.fonts.rounded, 'Sans and Rounded are genuinely different stacks');
  is(new Set(Object.values(appearance.fonts)).size === 5, 'all five font choices differ from one another');
  is(appearance.strays === 0, 'appearance attributes live on :root only');
  is(appearance.themes >= 8 && appearance.accents >= 8, `${appearance.themes} themes and ${appearance.accents} accents on offer`);

  /* Each theme has to repaint the page — a theme that changes nothing is a
     theme that is silently broken. */
  const painted = await page.evaluate(() => {
    const seen = new Set();
    THEMES.forEach(t => {
      document.documentElement.setAttribute('data-theme', t.id);
      seen.add(getComputedStyle(document.body).backgroundColor);
    });
    document.documentElement.setAttribute('data-theme', Store.state.settings.theme || 'graphite');
    return seen.size;
  });
  is(painted >= 6, `themes produce ${painted} distinct page backgrounds`);

  /* ------------------------------------------------------------------ *
     11. Scrolling.

     The bug: the page could not be scrolled at all. Browse was 6457px tall
     with everything past the fold unreachable, because the flex chain
     defaulted to min-height:auto.
   * ------------------------------------------------------------------ */
  head('scroll architecture');
  await page.evaluate(() => go('browse', {}));
  await page.waitForTimeout(300);
  const scroll = await page.evaluate(() => {
    const sa = document.getElementById('scrollArea');
    sa.scrollTop = 0;
    const before = sa.scrollTop;
    sa.scrollTop = 99999;
    const after = sa.scrollTop;
    return {
      exists: !!sa,
      scrollable: sa.scrollHeight > sa.clientHeight,
      moved: after > before,
      reachedEnd: Math.abs(sa.scrollHeight - sa.clientHeight - after) < 4,
      bodyOverflowX: document.documentElement.scrollWidth <= window.innerWidth + 1
    };
  });
  is(scroll.exists && scroll.scrollable, 'the long list overflows its container');
  is(scroll.moved && scroll.reachedEnd, 'the bottom of the list can actually be reached');
  is(scroll.bodyOverflowX, 'the page itself never scrolls sideways at 1400px');

  /* The back-to-top button was dead because focusing the region cancelled
     the smooth scroll. */
  await page.evaluate(() => { document.getElementById('scrollArea').scrollTop = 3000; });
  await page.waitForTimeout(250);
  const topBtn = await page.$('#toTop');
  if (topBtn) {
    await topBtn.click();
    await page.waitForTimeout(700);
    const back = await page.evaluate(() => document.getElementById('scrollArea').scrollTop);
    is(back < 40, `back-to-top returns to the top (${Math.round(back)}px)`);
  } else {
    bad('back-to-top button is missing');
  }

  /* ------------------------------------------------------------------ *
     12. Hints.

     The bug: revealing a hint grew the box and shunted the page downwards.
     Both states occupy the same grid cell, so the height never changes.
   * ------------------------------------------------------------------ */
  head('hints hold their height');
  await page.evaluate(() => {
    Store.wipe(); Store.state.settings.optionCount = 4; Store.saveNow();
    quizSetup.mode = 'mc-word'; quizSetup.scope = 'all'; quizSetup.deckId = '';
    go('practice', {});
  });
  await page.waitForTimeout(300);
  const hint = await page.evaluate(async () => {
    const pool = practicePool(null, 'all').filter(c => c.definition && c.translation);
    quiz = newQuiz('mc-word', buildQuestions('mc-word', pool, 5, { cards: pool.slice(0, 5) }));
    render('practice');
    await new Promise(r => setTimeout(r, 250));
    const slot = document.getElementById('hintSlot');
    if (!slot) return { missing: true };
    const before = slot.getBoundingClientRect().height;
    const hidden = getComputedStyle(slot.querySelector('.hint-text')).opacity;
    slot.querySelector('.hint-btn').click();
    await new Promise(r => setTimeout(r, 250));
    const after = document.getElementById('hintSlot');
    return {
      before: before,
      afterH: after ? after.getBoundingClientRect().height : -1,
      hiddenFirst: hidden !== '1',
      revealed: !!after && after.classList.contains('revealed'),
      shows: !!after && getComputedStyle(after.querySelector('.hint-text')).opacity === '1'
    };
  });
  if (hint.missing) {
    bad('no hint slot rendered in the practice question');
  } else {
    is(hint.hiddenFirst && hint.revealed && hint.shows, 'the hint is hidden until asked for, then shown');
    is(Math.abs(hint.afterH - hint.before) < 2,
       `the hint box keeps its height, so the page does not jump (${hint.before.toFixed(0)} -> ${hint.afterH.toFixed(0)}px)`);
  }
  await page.evaluate(() => { quiz = null; go('dashboard', {}); });
  await page.waitForTimeout(200);

  /* ------------------------------------------------------------------ *
     13. Saving and restoring.
   * ------------------------------------------------------------------ */
  head('persistence, backup and CSV');
  const persist = await page.evaluate(() => {
    Store.wipe();
    Store.addCard({ term: 'zzzroundtrip', pos: 'noun', definition: 'a test word',
                    translation: 'deneme', example: 'This is a zzzroundtrip check.',
                    category: 'testing', deckId: Store.state.decks[0].id }, true);
    Store.state.settings.theme = 'midnight';
    Store.saveNow();
    return { json: Store.exportJSON().length, cards: Store.state.cards.length };
  });
  is(persist.json > 100, 'a backup file can be written');

  await page.reload();
  await page.waitForTimeout(500);
  const survived = await page.evaluate(() => ({
    card: Store.state.cards.some(c => c.term === 'zzzroundtrip'),
    theme: Store.state.settings.theme,
    onRoot: document.documentElement.getAttribute('data-theme')
  }));
  is(survived.card, 'a word added before a reload is still there afterwards');
  is(survived.theme === 'midnight' && survived.onRoot === 'midnight', 'the chosen theme survives a reload too');

  const csv = await page.evaluate(() => {
    Store.wipe();
    const deck = Store.state.decks[0].id;
    const text = 'term,part of speech,definition,example,translation,category\n' +
                 'zzzalpha,noun,first test word,A zzzalpha appears here.,birinci,testing\n' +
                 'zzzbeta,verb,second test word,They zzzbeta every day.,ikinci,testing\n' +
                 'zzzalpha,noun,first test word,A zzzalpha appears here.,birinci,testing\n' +
                 'zzzalpha,verb,to zzzalpha something,They zzzalpha it daily.,ikinci anlam,testing\n';
    const res = Store.importCSV(text, deck);
    const out = Store.exportCSV(deck);
    return { added: res.added, skipped: res.skipped,
             hasAlpha: Store.state.cards.filter(c => c.term === 'zzzalpha').length,
             keptFields: (Store.state.cards.find(c => c.term === 'zzzbeta') || {}).translation,
             exported: out.split('\n').length };
  });
  is(csv.added === 3 && csv.skipped === 1, `CSV import adds 3 and skips the identical row (${csv.added}/${csv.skipped})`);
  is(csv.hasAlpha === 2, 'a repeated word imports as a second sense, not as a duplicate');
  is(csv.keptFields === 'ikinci', 'the columns land in the right fields');
  is(csv.exported > 2, 'export writes a header plus rows');

  const restore = await page.evaluate(() => {
    Store.wipe();
    const backup = Store.exportJSON();
    const wordsBefore = Store.state.cards.length;
    Store.state.cards = Store.state.cards.slice(0, 3);
    Store.saveNow();
    Store.importJSON(backup, 'replace');
    return { before: wordsBefore, after: Store.state.cards.length };
  });
  is(restore.after === restore.before, `restoring a backup brings all ${restore.before} words back`);

  /* ------------------------------------------------------------------ *
     14. Nothing threw along the way.
   * ------------------------------------------------------------------ */
  head('console');
  if (noise.length) {
    noise.slice(0, 10).forEach(n => console.log('    ' + n));
    bad(`${noise.length} console error(s) during the run`);
  } else {
    ok('no console or page errors');
  }

  /* Leave the browser with the seeded state, not the test leftovers. */
  await page.evaluate(() => { Store.wipe(); Store.saveNow(); });
  await browser.close();

  console.log(`\n${checks - failures}/${checks} checks passed`);
  if (failures) console.log(`${failures} FAILED`);
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
