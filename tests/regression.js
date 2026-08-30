/* Lexio regression suite.

   Every check here exists because something was once wrong. The comment above
   each block says what broke, so a future change that reintroduces the bug
   fails loudly instead of quietly.

   Run:  node tests/regression.js
   See also tests/no-dead-code.js, a static sweep for leftovers that needs no
   browser and runs in seconds.
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
    return { words: st.cards.length, workOutId: wo.id,
             objects: st.cards.filter(c => c.term === 'object').length };
  });
  is(built.words < seedSize && built.objects === 0,
     `a schema-1 collection has ${built.words} words of today's ${seedSize}, and no object`);

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
    revision: Store.state.starterRevision,
    expected: STARTER_REVISION
  }));
  is(stranded.objects === 3 && stranded.workOut === 3,
     'a collection already stamped with the current schema still receives the content');
  is(stranded.revision === stranded.expected, 'and is marked so it is not upgraded twice');

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
     8e. Keeping the word editor and the card back readable.

     Senses, collocations and relations added five more things to a form that
     already had eight, and five stacked blocks to a card that had three.
   * ------------------------------------------------------------------ */
  head('the editor and the card stay compact');
  await page.evaluate(() => { Store.wipe(); Store.saveNow(); go('browse', {}); });
  await page.waitForTimeout(250);
  await page.click('#view-browse [data-act="add"]');
  await page.waitForTimeout(300);
  const blank = await page.evaluate(() => {
    const d = document.querySelector('.more-fields');
    return {
      exists: !!d, open: d && d.open,
      inputsExist: ['cColl', 'cSyn', 'cAnt', 'cNote'].every(id => !!document.getElementById(id)),
      /* A closed <details> is laid out but not rendered in Chrome, so client
         rects and offsetParent both lie about it — checkVisibility does not. */
      collocationsVisible: document.getElementById('cColl')
        .checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true })
    };
  });
  is(blank.exists && !blank.open, 'a new word opens with the extra fields folded away');
  is(!blank.collocationsVisible, 'the folded fields are genuinely out of sight');
  is(blank.inputsExist, 'but still in the form, so nothing typed can be lost');

  await page.click('.more-fields > summary');
  await page.waitForTimeout(200);
  await page.fill('#cTerm', 'zzzcompact');
  await page.selectOption('#cPos', 'noun');
  await page.fill('#cDef', 'A word used to test the folded fields.');
  await page.fill('#cColl', 'a zzzcompact form\nkeep it zzzcompact');
  await page.fill('#cSyn', 'reliable');
  await page.fill('#cAnt', 'crowded');
  await page.fill('#cNote', 'a note of my own');
  await page.click('.modal-foot [data-act="save"]');
  await page.waitForTimeout(300);
  const storedExtras = await page.evaluate(() => {
    const c = Store.state.cards.find(x => x.term === 'zzzcompact');
    return c && { coll: c.collocations.length, rel: c.related.length, note: c.notes };
  });
  is(storedExtras && storedExtras.coll === 2 && storedExtras.rel === 2 && storedExtras.note === 'a note of my own',
     'everything typed in the folded section is saved');

  await page.evaluate(() => cardEditor(Store.state.cards.find(c => c.term === 'zzzcompact')));
  await page.waitForTimeout(300);
  const reopened = await page.evaluate(() => {
    const d = document.querySelector('.more-fields');
    return { open: d.open, count: (d.querySelector('.more-count') || {}).textContent };
  });
  is(reopened.open, 'a word that already uses those fields opens with them showing');
  const statusPlace = await page.evaluate(() => {
    const note = document.querySelector('.modal-foot .foot-note');
    const body = document.getElementById('modalBody');
    const foot = document.querySelector('.modal-foot');
    /* The note is tucked up under the rule, so its centre is deliberately not
       the buttons'. What must hold is that it costs the footer no height: the
       content box is still exactly one button tall. */
    const cs = getComputedStyle(foot);
    const inner = foot.getBoundingClientRect().height -
      parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const btn = foot.querySelector('button').getBoundingClientRect().height;
    const extra = inner - btn;      /* px the note adds to the row, if any */
    /* and it sits above the buttons rather than beside them */
    const noteTop = note ? note.getBoundingClientRect().top : 0;
    const btnTop = foot.querySelector('button').getBoundingClientRect().top;
    const kids = [...foot.children];
    const iNote = kids.indexOf(note);
    const iDel = kids.findIndex(el => el.dataset && el.dataset.act === 'del');
    const iSave = kids.findIndex(el => el.dataset && el.dataset.act === 'save');
    return { inFoot: !!note && /^Status:/.test(note.textContent),
             inBody: /Status:/.test(body.textContent),
             visibleWithoutScrolling: !!note &&
               note.getBoundingClientRect().bottom <= window.innerHeight + 1,
             oneRow: extra <= 2, extra: Math.round(extra * 10) / 10,
             tuckedUp: noteTop < btnTop,
             between: iDel > -1 && iNote > iDel && iNote < iSave };
  });
  is(statusPlace.inFoot && !statusPlace.inBody,
     'the card\'s status moved out of the scrolling form into the footer');
  is(statusPlace.visibleWithoutScrolling, 'so it is on screen without scrolling to the bottom');
  is(statusPlace.oneRow,
     `and costs the footer no extra height (${statusPlace.extra}px added to the row)`);
  is(statusPlace.between, 'sitting between Delete and the Cancel/Save pair');
  is(statusPlace.tuckedUp, 'tucked up under the rule rather than on the buttons\' line');
  is(reopened.count === '4 filled in',
     `and the summary counts boxes, not the lines in them (${reopened.count})`);
  await page.evaluate(() => closeModal());
  await page.waitForTimeout(200);

  /* The card back: the answer stays the answer, the rest goes quiet. */
  const backShape = await page.evaluate(() => {
    session = null;
    Store.wipe();
    const c = Store.state.cards.find(x => x.term === 'significant');
    c.notes = 'a note';
    Store.state.cards = [c];
    Store.saveNow();
    go('study', {});
    startSession(null, false);
    revealCard();
    const v = document.getElementById('view-study');
    const ex = v.querySelector('.fc-extras');
    return {
      main: [...v.querySelectorAll('.fc-block .k')].map(x => x.textContent),
      extras: [...v.querySelectorAll('.fx-k')].map(x => x.textContent),
      columns: ex ? getComputedStyle(ex).gridTemplateColumns.split(' ').length : 0,
      separated: ex ? getComputedStyle(ex).borderTopWidth : '0px'
    };
  });
  is(backShape.main.join(',') === 'Meaning,Example,Translation',
     `the answer is still three blocks (${backShape.main.join(', ')})`);
  is(backShape.extras.join(',') === 'Collocations,Related,Your note',
     `everything else moves below into one strip (${backShape.extras.join(', ')})`);
  is(backShape.columns === 2, 'that strip uses two columns rather than stacking');
  is(backShape.separated !== '0px', 'and is separated from the answer by a rule');

  const headingGaps = await page.evaluate(() => {
    session = null;
    Store.wipe();
    const c = Store.state.cards.find(x => x.term === 'reliable');
    c.collocations = ['a reliable friend'];
    Store.state.cards = [c].concat(Store.familyOf(c).filter(m => m.id).map(m => Store.card(m.id)));
    Store.saveNow();
    go('study', {});
    startSession(null, false);
    revealCard();
    return [...document.querySelectorAll('#view-study .fx')].map(fx => {
      const k = fx.querySelector('.fx-k');
      const body = k.nextElementSibling;
      const line = body.querySelector('li, .fam, .chip') || body;
      return { heading: k.textContent,
               gap: Math.round((line.getBoundingClientRect().top - k.getBoundingClientRect().bottom) * 10) / 10 };
    });
  });
  is(headingGaps.length >= 2 && new Set(headingGaps.map(g => g.gap)).size === 1,
     `every heading sits the same distance above its first line (${headingGaps.map(g => g.heading + ' ' + g.gap + 'px').join(', ')})`);
  await page.evaluate(() => { session = null; Store.wipe(); Store.saveNow(); });
  await page.evaluate(() => { session = null; Store.wipe(); Store.saveNow(); });

  /* ------------------------------------------------------------------ *
     8f. Word families.

     analyse / analysis / analytical / analytically are one word in four
     shapes. No member is the head: the family is whatever set the family
     links join up, followed in both directions and through as many hops as
     it takes, so linking a new word to any one member is enough.
   * ------------------------------------------------------------------ */
  head('word families');
  const fam = await page.evaluate(() => {
    Store.wipe();
    const of = (t) => {
      const c = Store.state.cards.find(x => Store.headKey(x.term) === t);
      return c ? Store.familyOf(c).map(m => m.term).sort() : null;
    };
    return {
      analyse: of('analyse'),
      analytically: of('analytically'),      /* two hops from analysis */
      reliable: of('reliable'),              /* never links out itself */
      significant: of('significant'),
      lonely: of('borrow')
    };
  });
  is(fam.analyse.join(',') === 'analysis,analytical,analytically',
     `analyse sees its whole family (${fam.analyse.join(', ')})`);
  is(fam.analytically.join(',') === 'analyse,analysis,analytical',
     'and every member sees the same family, whichever one you look at');
  is(fam.reliable.join(',') === 'reliability,reliably,rely',
     `a word that declares nothing still has its family (${fam.reliable.join(', ')})`);
  is(fam.significant.join(',') === 'significance,significantly', 'significant has its two forms');
  is(fam.lonely.length === 0, 'a word with no family has none');

  /* Senses of one word are not family, and a family link survives a member
     being deleted the same way a synonym does. */
  const famEdges = await page.evaluate(() => {
    Store.wipe();
    const obj = Store.state.cards.find(c => c.term === 'object');
    const sensesAsFamily = Store.familyOf(obj).length;
    const analysis = Store.state.cards.find(c => c.term === 'analysis');
    Store.deleteCard(analysis.id);
    const analyse = Store.state.cards.find(c => c.term === 'analyse');
    const after = Store.familyOf(analyse);
    return {
      sensesAsFamily: sensesAsFamily,
      stillWhole: after.map(m => m.term).sort(),
      missingMarked: after.filter(m => m.missing).map(m => m.term)
    };
  });
  is(famEdges.sensesAsFamily === 0, 'two senses of one word are senses, not a family');
  is(famEdges.stillWhole.join(',') === 'analysis,analytical,analytically',
     'deleting a member does not break the family apart');
  is(famEdges.missingMarked.join(',') === 'analysis',
     'the deleted member is shown as one you no longer have');

  /* ------------------------------------------------------------------ *
     8g. What the card shows, and when.
   * ------------------------------------------------------------------ */
  head('the flashcard says what it should, when it should');
  const cardStates = await page.evaluate(async () => {
    session = null;
    Store.wipe();
    Store.state.settings.studyDirection = 'term-first';
    Store.state.settings.showExampleOnFront = false;
    Store.state.settings.showExtras = true;
    /* work out: three senses that share a part of speech, so only the
       sentence can say which one is being asked. */
    Store.state.cards = Store.sensesOf('work out');
    Store.saveNow();
    go('study', {});
    startSession(null, false);
    /* The card fades in. Measuring visibility while that is still running can
       catch an element at opacity 0 and call it hidden, so let it land. */
    await new Promise(r => setTimeout(r, 320));
    const v = document.getElementById('view-study');
    /* Both sides live in the DOM now, so what matters is what is on show. */
    const seen = (el) => !!el && el.checkVisibility({ contentVisibilityAuto: true,
                                                     opacityProperty: true, visibilityProperty: true });
    const front = {
      sense: seen(v.querySelector('.fc-sense')),
      example: [...v.querySelectorAll('.fc-example')].some(seen),
      posChips: v.querySelectorAll('.fc-top .chip.pos').length
    };
    revealCard();
    await new Promise(r => setTimeout(r, 320));   /* the back fades in too */
    const back = {
      sense: (v.querySelector('.fc-sense') || {}).textContent,
      senseShown: seen(v.querySelector('.fc-sense')),
      posChips: v.querySelectorAll('.chip.pos').length
    };
    return { front: front, back: back };
  });
  is(!cardStates.front.sense, 'the sense label is not on the front — it would be the answer');
  is(!cardStates.front.example, 'and the front is left as it was, with no sentence forced onto it');
  is(cardStates.back.senseShown && /^\(.+\)$/.test(cardStates.back.sense || ''),
     `turning the card puts the sense beside the word ${cardStates.back.sense}`);
  is(cardStates.back.posChips === 1, 'and the part of speech appears once, not twice');

  const backBlocks = await page.evaluate(() => {
    const v = document.getElementById('view-study');
    return { blocks: [...v.querySelectorAll('.fc-block .k')].map(x => x.textContent),
             sentences: v.querySelectorAll('.fc-example').length };
  });
  is(backBlocks.blocks.indexOf('Example') !== -1 && backBlocks.sentences === 1,
     `the sentence stays where it always was, in the Example block (${backBlocks.blocks.join(', ')})`);

  const symbols = await page.evaluate(() => {
    Store.wipe();
    const c = Store.state.cards.find(x => x.term === 'significant');
    const html = relationChips(c);
    return { syn: html.indexOf('\u2248') !== -1, ant: html.indexOf('\u00d7') !== -1,
             oldMarks: /[\u2194\u2260\u2715]/.test(html) };
  });
  is(symbols.syn && symbols.ant && !symbols.oldMarks, 'a synonym is ≈ and an opposite is ×');

  const chipMetrics = await page.evaluate(() => {
    Store.wipe();
    const host = document.createElement('div');
    host.innerHTML = relationChips(Store.state.cards.find(c => c.term === 'undermine'));
    document.getElementById('view-study').appendChild(host);
    const read = [...host.querySelectorAll('.chip.rel')].map(c => {
      const cs = getComputedStyle(c);
      const mark = c.querySelector('.mark');
      const ms = getComputedStyle(mark);
      return { size: cs.fontSize, weight: cs.fontWeight,
               markSize: ms.fontSize, markWidth: ms.width, h: c.getBoundingClientRect().height };
    });
    host.remove();
    return read;
  });
  is(chipMetrics.length === 2 &&
     chipMetrics[0].size === chipMetrics[1].size &&
     chipMetrics[0].weight === chipMetrics[1].weight,
     `a synonym and an opposite are set in the same type (${chipMetrics[0].size}, ${chipMetrics[0].weight})`);
  is(chipMetrics[0].markSize === chipMetrics[1].markSize &&
     chipMetrics[0].markWidth === chipMetrics[1].markWidth,
     `and their marks occupy the same box (${chipMetrics[0].markWidth})`);
  is(Math.abs(chipMetrics[0].h - chipMetrics[1].h) < 0.5, 'so the two chips are the same height');

  const plain = await page.evaluate(() => {
    Store.wipe();
    const c = Store.state.cards.find(x => x.term === 'significant');
    return collocationList(c).indexOf('<b>') === -1;
  });
  is(plain, 'the collocations are listed without emphasis');

  /* The switch that turns the whole strip off, reachable during a session. */
  const toggled = await page.evaluate(async () => {
    session = null;
    Store.wipe();
    const c = Store.state.cards.find(x => x.term === 'significant');
    Store.state.cards = [c];
    Store.state.settings.showExtras = true;
    Store.saveNow();
    go('study', {});
    startSession(null, false);
    revealCard();
    /* The back fades in; measure once it has arrived, or opacity 0 reads as
       hidden. */
    await new Promise(r => setTimeout(r, 320));
    const v = document.getElementById('view-study');
    const seen = (el) => !!el && el.checkVisibility({ contentVisibilityAuto: true,
                                                      opacityProperty: true, visibilityProperty: true });
    const strip = v.querySelector('.fc-extras');
    const withExtras = seen(strip);
    const btn = v.querySelector('[data-act="extras"]');
    const onBefore = btn.classList.contains('on');
    /* Hold on to the node itself: if the switch redraws the view, this one is
       thrown away and the check below notices. */
    btn.click();
    await new Promise(r => setTimeout(r, 150));
    const v2 = document.getElementById('view-study');
    return {
      withExtras: withExtras, onBefore: onBefore,
      withoutExtras: seen(v2.querySelector('.fc-extras')),
      sameNode: v2.querySelector('.fc-extras') === strip,
      onAfter: v2.querySelector('[data-act="extras"]').classList.contains('on'),
      stillRevealed: !!v2.querySelector('.fc-block'),
      saved: Store.state.settings.showExtras
    };
  });
  is(toggled.withExtras && toggled.onBefore, 'the extras strip is on to begin with');
  is(!toggled.withoutExtras && !toggled.onAfter, 'the switch turns it off mid-session');
  is(toggled.sameNode, 'without redrawing the card — the same elements are still there');
  is(toggled.stillRevealed, 'and does not take you off the card you were on');
  is(toggled.saved === false, 'the choice is remembered');

  const headOrder = await page.evaluate(async () => {
    session = null;
    Store.wipe();
    Store.state.settings.showExtras = true;
    Store.saveNow();
    go('study', {});
    startSession(null, false);
    const read = () => [...document.querySelectorAll('#view-study .study-head > *')]
      .map(el => el.dataset.act || el.className.split(' ')[0]);
    const before = read();
    revealCard(); rateCard(3);
    await new Promise(r => setTimeout(r, 150));
    return { before: before, after: read() };
  });
  is(headOrder.before.indexOf('extras') < headOrder.before.indexOf('bar'),
     'the Extras switch sits before the progress bar');
  is(headOrder.after[headOrder.after.length - 1] === 'undo',
     `and Undo keeps the far end to itself once there is something to undo (${headOrder.after.join(' ')})`);
  await page.evaluate(() => { Store.state.settings.showExtras = true; Store.saveNow(); session = null; });

  /* A key must never answer a card for you: Space turns it over and stops. */
  const keys = await page.evaluate(async () => {
    session = null;
    Store.wipe();
    go('study', {});
    startSession(null, false);
    const id = currentCard().id;
    const press = (key) => document.dispatchEvent(new KeyboardEvent('keydown', { key: key, bubbles: true }));
    press(' ');
    await new Promise(r => setTimeout(r, 120));
    const revealed = session.revealed;
    press(' '); press('Enter');
    await new Promise(r => setTimeout(r, 120));
    const v = document.getElementById('view-study');
    return {
      revealed: revealed,
      answered: session.done,
      sameCard: currentCard() && currentCard().id === id,
      reps: Store.card(id).srs.reps,
      allButtonsAlike: [...v.querySelectorAll('.rate')].every(btn =>
        !/space|enter/i.test(btn.textContent) && !btn.classList.contains('is-default'))
    };
  });
  is(keys.revealed, 'Space still turns the card over');
  is(keys.answered === 0 && keys.reps === 0 && keys.sameCard,
     'but pressing it again answers nothing — the card is still waiting for you');
  is(keys.allButtonsAlike, 'and no rating button is singled out as a default');

  /* The number keys are still how you answer. */
  const numberKey = await page.evaluate(async () => {
    const id = currentCard().id;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }));
    await new Promise(r => setTimeout(r, 150));
    return { answered: session.done, reps: Store.card(id).srs.reps };
  });
  is(numberKey.answered === 1 && numberKey.reps === 1, 'the number keys still rate the card');
  await page.evaluate(() => { session = null; Store.wipe(); Store.saveNow(); });

  /* ------------------------------------------------------------------ *
     8h. Category is gone.
   * ------------------------------------------------------------------ */
  head('category removed');
  await page.evaluate(() => { Store.wipe(); Store.saveNow(); go('browse', {}); });
  await page.waitForTimeout(300);
  const noCat = await page.evaluate(() => ({
    filter: !document.getElementById('bCat'),
    column: [...document.querySelectorAll('#view-browse .table th')].map(t => t.textContent),
    editorField: null
  }));
  is(noCat.filter, 'the browse filter is gone');
  is(noCat.column.indexOf('Category') === -1,
     `the word list no longer has a Category column (${noCat.column.filter(Boolean).join(', ')})`);
  await page.click('#view-browse [data-act="add"]');
  await page.waitForTimeout(250);
  const editorHasCat = await page.evaluate(() => !!document.getElementById('cCat'));
  is(!editorHasCat, 'and the editor no longer asks for one');
  await page.evaluate(() => closeModal());
  await page.waitForTimeout(150);
  await page.evaluate(() => go('stats', {}));
  await page.waitForTimeout(350);
  const statsPanel = await page.evaluate(() =>
    [...document.querySelectorAll('#view-stats h2')].map(h => h.textContent));
  is(statsPanel.indexOf('By category') === -1 && statsPanel.indexOf('By part of speech') !== -1,
     'Progress groups by part of speech instead');

  const purged = await page.evaluate(() => {
    Store.wipe();
    const fresh = Store.state.cards.every(c => !('category' in c));
    /* an old collection that still had them */
    const st = Store.state;
    st.cards.forEach(c => { c.category = 'Work'; });
    delete st.starterRevision;
    localStorage.setItem('lexio.v1', JSON.stringify(st));
    return { fresh: fresh, csvHeader: Store.exportCSV().split('\n')[0] };
  });
  is(purged.fresh, 'a new collection carries no category at all');
  is(purged.csvHeader.indexOf('category') === -1, 'and CSV no longer has the column');
  await page.reload();
  await page.waitForTimeout(900);
  const cleaned = await page.evaluate(() =>
    Store.state.cards.filter(c => 'category' in c).length);
  is(cleaned === 0, 'opening an older collection clears the ones it had stored');
  await page.evaluate(() => { Store.wipe(); Store.saveNow(); });
  await page.evaluate(() => go('dashboard', {}));

  /* ------------------------------------------------------------------ *
     8i. The listening hint spells the word out.

     A translation is no help when you already know the meaning and are trying
     to catch the sound. Letters are: the first one, then one more, and never
     enough of them to finish the word for you.
   * ------------------------------------------------------------------ */
  head('the listening hint gives letters, never the word');
  const caps = await page.evaluate(() => ({
    long: maxLetterHints('reliable'),
    four: maxLetterHints('word'),
    three: maxLetterHints('run'),
    two: maxLetterHints('go'),
    one: maxLetterHints('a'),
    phrase: maxLetterHints('work out'),
    prefixes: [1, 2, 3].map(n => letterPrefix('work out', n))
  }));
  is(caps.long === 3 && caps.four === 3, 'a long word gives at most three letters');
  is(caps.three === 2 && caps.two === 1 && caps.one === 0,
     `a short word gives one fewer than it has (${caps.three}, ${caps.two}, ${caps.one})`);
  is(caps.phrase === 3 && caps.prefixes.join('|') === 'w|wo|wor',
     'letters are counted, so a space in a phrase costs nothing');

  const listening = await page.evaluate(async () => {
    Store.wipe();
    quizSetup.scope = 'all'; quizSetup.deckId = '';
    go('practice', {});
    const pool = practicePool(null, 'all').filter(c => c.term.length > 4);
    quiz = newQuiz('listening', buildQuestions('listening', pool, 3, { cards: pool.slice(0, 3) }));
    render('practice');
    await new Promise(r => setTimeout(r, 250));
    const item = quiz.items[0];
    const seen = (el) => !!el && el.checkVisibility({ contentVisibilityAuto: true,
                                                      opacityProperty: true, visibilityProperty: true });
    const read = () => {
      const el = document.getElementById('hintLetters');
      const btn = document.getElementById('hintBtn');
      return { letters: el ? el.textContent : null,
               label: btn ? btn.textContent.trim() : null,
               spent: btn ? btn.disabled : null,
               /* the button used to vanish the moment the pill appeared */
               buttonVisible: seen(btn) };
    };
    const steps = [read()];
    const slot = document.getElementById('hintSlot');
    const height = slot.getBoundingClientRect().height;
    for (let i = 0; i < 4; i++) {
      document.getElementById('hintBtn').click();
      await new Promise(r => setTimeout(r, 60));
      steps.push(read());
    }
    const kids = [...slot.children];
    const btn = document.getElementById('hintBtn');
    const quiet = getComputedStyle(btn).borderStyle === 'dashed' && btn.disabled;
    return { answer: item.answer, steps: steps, translationOffered: !!item.hint,
             heightBefore: height, heightAfter: slot.getBoundingClientRect().height,
             buttonLeadsAsElsewhere: kids.indexOf(btn) === 0,
             spentButtonStaysQuiet: quiet };
  });
  is(!listening.translationOffered, 'the translation is no longer what the hint offers');
  is(listening.steps[0].letters === '' && /first letter/i.test(listening.steps[0].label || ''),
     'it starts with nothing shown and offers the first letter');
  is(listening.steps[1].letters === listening.answer.slice(0, 1) &&
     listening.steps[2].letters === listening.answer.slice(0, 2) &&
     listening.steps[3].letters === listening.answer.slice(0, 3),
     `each press adds one letter (${listening.steps.slice(1, 4).map(x => x.letters).join(' → ')})`);
  is(listening.steps.slice(0, 4).every(x => x.buttonVisible),
     'the button stays put after the first letter, so you can ask for another');
  is(listening.buttonLeadsAsElsewhere,
     'and it leads the row, in the place every other drill puts its hint button');
  is(listening.spentButtonStaysQuiet, 'a spent button no longer lights up under the pointer');
  is(listening.steps[3].spent && listening.steps[4].letters === listening.steps[3].letters,
     'and it stops at three — pressing again gives nothing more');
  is(listening.steps[4].letters.length < listening.answer.length,
     'the word is never spelled out in full');
  is(Math.abs(listening.heightAfter - listening.heightBefore) < 2,
     'revealing letters does not move the page');

  /* A word too short to hint keeps the slot out of the way entirely. */
  const tiny = await page.evaluate(() => {
    quiz.hintLetters = 0;
    return letterHintHTML({ letterHint: true, answer: 'a' }) === '';
  });
  is(tiny, 'a word with no letters to spare offers no hint button at all');

  /* The question header used to print the part of speech twice. */
  const header = await page.evaluate(() => {
    Store.wipe();
    quizSetup.scope = 'all'; quizSetup.deckId = '';
    const pool = practicePool(null, 'all');
    quiz = newQuiz('mc-meaning', buildQuestions('mc-meaning', pool, 1, { cards: pool.slice(0, 1) }));
    render('practice');
    const top = document.querySelector('#view-practice .fc-top');
    return { texts: [...top.children].map(e => e.textContent.trim()).filter(Boolean),
             pos: quiz.items[0].pos };
  });
  is(header.texts.filter(t => t === header.pos).length === 1,
     `the question header names the part of speech once (${header.texts.join(' · ')})`);
  await page.evaluate(() => { quiz = null; go('dashboard', {}); });

  /* ------------------------------------------------------------------ *
     8j. The top-right button while a session is already running.
   * ------------------------------------------------------------------ */
  head('the top button says where you are');
  const topLabel = await page.evaluate(async () => {
    const read = () => {
      const b = document.getElementById('topStudyBtn');
      return { text: b.querySelector('span').textContent, disabled: b.disabled,
               plain: b.classList.contains('is-state') };
    };
    session = null; quiz = null;
    Store.wipe(); Store.saveNow();
    go('dashboard', {});
    const idle = read();

    go('study', {});
    const beforeStart = read();
    startSession(null, false);         /* no refreshChrome of our own here */
    const studying = read();
    revealCard(); rateCard(3);
    const afterAnswering = read();

    /* leaving the session behind puts the button back to work */
    go('browse', {});
    const away = read();

    go('practice', {});
    quizSetup.scope = 'all'; quizSetup.deckId = '';
    const pool = practicePool(null, 'all');
    quizSetup.mode = 'mc-meaning';
    startQuiz();                       /* the real entry point, as the button uses it */
    const practising = read();
    answerMC(quiz.items[0], quiz.items[0].options[0]);
    const practisingAfter = read();

    quiz = null; session = null; go('dashboard', {}); refreshChrome();
    return { idle: idle, beforeStart: beforeStart, studying: studying,
             afterAnswering: afterAnswering, away: away,
             practising: practising, practisingAfter: practisingAfter, back: read() };
  });
  is(topLabel.idle.text === 'Start studying' && !topLabel.idle.disabled,
     'with nothing running it offers to start');
  is(topLabel.beforeStart.text === 'Start studying',
     'the study screen on its own does not change it');
  is(topLabel.studying.text === 'Studying' && topLabel.studying.disabled && topLabel.studying.plain,
     'it says "Studying" the moment the session starts, not after the first answer');
  is(topLabel.afterAnswering.text === 'Studying', 'and stays that way once you answer one');
  is(topLabel.practising.text === 'Practising' && topLabel.practising.disabled,
     'starting a practice round says "Practising" straight away');
  is(topLabel.practisingAfter.text === 'Practising', 'and stays that way through the round');
  is(topLabel.away.text === 'Start studying' && !topLabel.away.disabled,
     'on another screen it goes back to being the way in');
  is(topLabel.back.text === 'Start studying' && !topLabel.back.disabled,
     'and once the session is over it works again');

  /* ------------------------------------------------------------------ *
     8k. A small selection still asks a proper question.

     The bug: wrong answers came only from the words being practised, so a deck
     of two gave two options and a deck of one could not start at all.
   * ------------------------------------------------------------------ */
  head('wrong answers come from the whole collection');
  const small = await page.evaluate(() => {
    Store.wipe();
    Store.state.settings.optionCount = 4;
    quizSetup.scope = 'all';
    /* a deck holding a single word */
    const deck = Store.addDeck({ name: 'zzztiny', emoji: '🔹', description: 'one word' }, true);
    const only = Store.addCard({ term: 'zzzlonely', pos: 'noun', definition: 'the only word in its deck',
                                 translation: 'tek', deckId: deck.id }, true);
    Store.saveNow();
    quizSetup.deckId = deck.id;
    const pool = practicePool(deck.id, 'all');
    const out = { pool: pool.length, blocked: startBlocker(pool, 'mc-meaning'),
                  matchBlocked: startBlocker(pool, 'matching') };
    ['mc-meaning', 'mc-word'].forEach(mode => {
      const q = buildQuestions(mode, pool, 1, { cards: [only] });
      out[mode] = q[0] ? q[0].options.length : 0;
      out[mode + 'HasAnswer'] = q[0] ? q[0].options.indexOf(q[0].answer) !== -1 : false;
      out[mode + 'Unique'] = q[0] ? new Set(q[0].options).size === q[0].options.length : false;
    });
    return out;
  });
  is(small.pool === 1 && !small.blocked,
     'a deck of one word can start a multiple-choice drill');
  is(small.matchBlocked !== '', `matching still needs two of them (${small.matchBlocked})`);
  is(small['mc-meaning'] === 4 && small['mc-word'] === 4,
     `it still gets four options (${small['mc-meaning']}, ${small['mc-word']})`);
  is(small['mc-meaningHasAnswer'] && small['mc-wordHasAnswer'], 'with the right answer among them');
  is(small['mc-meaningUnique'] && small['mc-wordUnique'], 'and no option repeated');

  const twoWords = await page.evaluate(() => {
    Store.state.settings.optionCount = 5;
    const deck = Store.state.decks.find(d => d.name === 'zzztiny');
    Store.addCard({ term: 'zzzsecond', pos: 'noun', definition: 'the second word in that deck',
                    translation: 'ikinci', deckId: deck.id }, true);
    Store.saveNow();
    const pool = practicePool(deck.id, 'all');
    const q = buildQuestions('mc-meaning', pool, 2, { cards: pool });
    const outside = q.map(x => x.options.filter(o =>
      !pool.some(c => (c.definition || c.translation) === o)).length);
    return { pool: pool.length, counts: q.map(x => x.options.length), outside: outside,
             matchOk: startBlocker(pool, 'matching') === '' };
  });
  is(twoWords.counts.every(n => n === 5),
     `a deck of two gives five options, not two (${twoWords.counts.join(', ')})`);
  is(twoWords.outside.every(n => n > 0),
     'the extra options are borrowed from outside the selection');
  is(twoWords.matchOk, 'and two words is enough for matching');
  await page.evaluate(() => {
    Store.state.settings.optionCount = 4;
    quizSetup.deckId = ''; Store.wipe(); Store.saveNow();
  });

  /* ------------------------------------------------------------------ *
     8l. Telling the two sides of a matching board apart.
   * ------------------------------------------------------------------ */
  head('a matching board says which column is which');
  const board = await page.evaluate(() => {
    Store.wipe();
    quizSetup.scope = 'all'; quizSetup.deckId = '';
    go('practice', {});
    const pool = practicePool(null, 'all');
    quiz = newQuiz('matching', buildQuestions('matching', pool, 6, {}));
    render('practice');
    const cols = [...document.querySelectorAll('#view-practice .match-col')];
    const read = (c) => {
      const item = c.querySelector('.match-item');
      const cs = getComputedStyle(item);
      return { side: c.className.replace('match-col', '').trim(),
               heading: (c.querySelector('.match-head') || {}).textContent,
               colour: cs.color, padding: cs.paddingLeft + '/' + cs.paddingRight,
               tab: getComputedStyle(item, '::after').content,
               notch: getComputedStyle(item, '::before').content };
    };
    return cols.map(read);
  });
  is(board.length === 2 && board[0].heading === 'Word' && board[1].heading === 'Translation',
     `each column is labelled (${board.map(c => c.heading).join(' / ')})`);
  is(board[0].side === 'words' && board[1].side === 'meanings', 'and knows which side it is');
  is(board[0].colour !== board[1].colour,
     'the answers are the quieter half of the board');
  is(board.every(c => c.tab === 'none' && c.notch === 'none'),
     'the tiles are plain — nothing is drawn on their edges');
  is(board[0].padding === board[1].padding,
     `and both columns are padded alike (${board[0].padding})`);
  const forms = await page.evaluate(() => {
    Store.wipe();
    quizSetup.scope = 'all'; quizSetup.deckId = '';
    const pool = practicePool(null, 'all');
    const read = (mode) => {
      quiz = newQuiz(mode, buildQuestions(mode, pool, 6, {}));
      render('practice');
      const item = quiz.items[0];
      const right = quiz.match.right.map(r => r.text);
      const card = item.cards[0];
      return { heading: [...document.querySelectorAll('.match-head')].map(h => h.textContent).join('/'),
               matchesTranslation: right.indexOf(card.translation) !== -1,
               matchesDefinition: right.indexOf(card.definition) !== -1,
               prompt: document.querySelector('#view-practice .muted').textContent };
    };
    const byTranslation = read('matching');
    quiz = null;
    const byDefinition = read('matching-def');
    quiz = null;
    return { byTranslation: byTranslation, byDefinition: byDefinition,
             offered: MODES.filter(m => m.id.indexOf('matching') === 0).map(m => m.id) };
  });
  is(forms.offered.join(',') === 'matching,matching-def',
     'both forms of the drill are on offer');
  is(forms.byTranslation.matchesTranslation && !forms.byTranslation.matchesDefinition,
     `the first pairs against the translation (${forms.byTranslation.heading})`);
  is(forms.byDefinition.matchesDefinition && !forms.byDefinition.matchesTranslation,
     `the second pairs against the English meaning (${forms.byDefinition.heading})`);
  is(/translation$/.test(forms.byTranslation.prompt) && /meaning$/.test(forms.byDefinition.prompt),
     'and each says which it is asking for');
  await page.evaluate(() => { quiz = null; Store.wipe(); Store.saveNow(); go('dashboard', {}); });

  /* ------------------------------------------------------------------ *
     8m. Finishing is not the same as stopping.
   * ------------------------------------------------------------------ */
  head('a finished session gets a burst, an abandoned one does not');
  const cheered = await page.evaluate(async () => {
    const canvases = () => document.querySelectorAll('canvas.confetti').length;
    const settle = () => new Promise(r => setTimeout(r, 400));

    /* walked away from */
    session = null;
    Store.wipe();
    Store.state.cards = Store.state.cards.slice(0, 3);
    Store.saveNow();
    go('study', {});
    startSession(null, false);
    revealCard(); rateCard(3);
    endSession();
    await settle();
    const afterQuitting = canvases();

    /* carried to the end */
    session = null;
    go('study', {});
    startSession(null, false);
    let guard = 0;
    while (session && !session.finished && guard++ < 60) { revealCard(); rateCard(4); }
    const completedFlag = session && session.completed;
    await settle();
    const afterFinishing = canvases();

    /* re-rendering the same summary must not set it off again */
    render('study');
    render('study');
    await settle();
    const afterRerender = canvases();
    return { afterQuitting: afterQuitting, afterFinishing: afterFinishing,
             afterRerender: afterRerender, completedFlag: completedFlag };
  });
  is(cheered.afterQuitting === 0, 'ending a session early passes without ceremony');
  is(cheered.completedFlag === true && cheered.afterFinishing === 1,
     'reaching the last card sets off the confetti');
  is(cheered.afterRerender === 1, 'and redrawing the summary does not set it off again');

  const quizCheer = await page.evaluate(async () => {
    const canvases = () => document.querySelectorAll('canvas.confetti').length;
    const settle = () => new Promise(r => setTimeout(r, 400));
    /* the study burst is still in the air; it is not this test's business */
    document.querySelectorAll('canvas.confetti').forEach(c => c.remove());
    session = null; quiz = null;
    Store.wipe();
    quizSetup.scope = 'all'; quizSetup.deckId = '';
    go('practice', {});
    const pool = practicePool(null, 'all');

    quiz = newQuiz('mc-meaning', buildQuestions('mc-meaning', pool, 3, {}));
    render('practice');
    finishQuiz(false);                     /* End practice */
    await settle();
    const afterQuitting = canvases();

    document.querySelectorAll('canvas.confetti').forEach(c => c.remove());
    quiz = newQuiz('mc-meaning', buildQuestions('mc-meaning', pool, 2, {}));
    render('practice');
    quiz.i = quiz.items.length - 1;
    nextQuizItem();                        /* the last question answered */
    await settle();
    return { afterQuitting: afterQuitting, afterFinishing: canvases(),
             completedFlag: quiz.completed };
  });
  is(quizCheer.afterQuitting === 0, 'the same holds for a practice round left early');
  is(quizCheer.completedFlag === true && quizCheer.afterFinishing === 1,
     'and a round played to its last question is cheered');

  /* Nothing is left behind on screen, and nothing is clickable through it. */
  const cleanup = await page.evaluate(async () => {
    const cv = document.querySelector('canvas.confetti');
    const pointer = cv ? getComputedStyle(cv).pointerEvents : 'none';
    await new Promise(r => setTimeout(r, 5200));
    return { pointer: pointer, left: document.querySelectorAll('canvas.confetti').length };
  });
  is(cleanup.pointer === 'none', 'the canvas never swallows a click');

  /* Slower, tighter and more colourful than the first attempt. */
  const burst = await page.evaluate(async () => {
    document.querySelectorAll('canvas.confetti').forEach(c => c.remove());
    confetti();
    await new Promise(r => setTimeout(r, 900));
    const cv = document.querySelector('canvas.confetti');
    if (!cv) return { missing: true };
    const ctx = cv.getContext('2d');
    const img = ctx.getImageData(0, 0, cv.width, cv.height);
    const seen = {};
    let minX = cv.width, maxX = 0, lit = 0;
    for (let y = 0; y < cv.height; y += 3) {
      for (let x = 0; x < cv.width; x += 3) {
        const i = (y * cv.width + x) * 4;
        if (img.data[i + 3] < 200) continue;
        lit++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        seen[img.data[i] + ',' + img.data[i + 1] + ',' + img.data[i + 2]] = 1;
      }
    }
    return { lit: lit, colours: Object.keys(seen).length,
             spread: lit ? (maxX - minX) / cv.width : 0 };
  });
  is(!burst.missing && burst.lit > 0, 'the pieces are actually painted');
  is(burst.colours >= 8, `and come in a spread of colours (${burst.colours} distinct)`);
  is(burst.spread < 0.75,
     `thrown from the middle rather than across the page (${Math.round(burst.spread * 100)}% of the width)`);

  const stillUp = await page.evaluate(async () => {
    await new Promise(r => setTimeout(r, 1800));
    return document.querySelectorAll('canvas.confetti').length;
  });
  is(stillUp === 1, 'and are still falling well after the old burst had finished');
  await page.evaluate(async () => {
    await new Promise(r => setTimeout(r, 3200));
    document.querySelectorAll('canvas.confetti').forEach(c => c.remove());
  });
  is(cleanup.left === 0, 'and takes itself off the page when it settles');
  await page.evaluate(() => { quiz = null; session = null; Store.wipe(); Store.saveNow(); go('dashboard', {}); });

  /* ------------------------------------------------------------------ *
     8n. Answering opens the card rather than redrawing the screen.
   * ------------------------------------------------------------------ */
  head('turning a card and answering a question happen in place');
  const inPlace = await page.evaluate(async () => {
    session = null; quiz = null;
    Store.wipe(); Store.saveNow();
    go('study', {});
    startSession(null, false);
    /* the card fades in; measure once it has arrived, or opacity 0 reads as
       hidden for everything on it */
    await new Promise(r => setTimeout(r, 320));
    const v = document.getElementById('view-study');
    const card = v.querySelector('.flashcard');
    const top = v.querySelector('.fc-top');
    const seen = (el) => !!el && el.checkVisibility({ contentVisibilityAuto: true,
                                                     opacityProperty: true, visibilityProperty: true });
    const before = {
      body: seen(v.querySelector('.fc-body')),
      hint: seen(v.querySelector('.fc-hint')),
      rates: seen(v.querySelector('.rate-row')),
      button: seen(v.querySelector('[data-act="reveal"]'))
    };
    revealCard();
    await new Promise(r => setTimeout(r, 80));
    const v2 = document.getElementById('view-study');
    return {
      before: before,
      after: {
        body: seen(v2.querySelector('.fc-body')),
        hint: seen(v2.querySelector('.fc-hint')),
        rates: seen(v2.querySelector('.rate-row')),
        button: seen(v2.querySelector('[data-act="reveal"]'))
      },
      sameCard: v2.querySelector('.flashcard') === card,
      sameTop: v2.querySelector('.fc-top') === top
    };
  });
  is(!inPlace.before.body && inPlace.before.hint && !inPlace.before.rates && inPlace.before.button,
     'a fresh card shows its front, the prompt and the Show answer button');
  is(inPlace.after.body && !inPlace.after.hint && inPlace.after.rates && !inPlace.after.button,
     'revealing swaps all four of those over');
  is(inPlace.sameCard && inPlace.sameTop,
     'and the card itself is never rebuilt — the same elements are still there');

  const answeredInPlace = await page.evaluate(async () => {
    session = null; quiz = null;
    Store.wipe();
    quizSetup.scope = 'all'; quizSetup.deckId = ''; quizSetup.mode = 'mc-meaning';
    go('practice', {});
    const pool = practicePool(null, 'all');
    quiz = newQuiz('mc-meaning', buildQuestions('mc-meaning', pool, 4, {}));
    render('practice');
    const host = document.getElementById('view-practice');
    const item = quiz.items[0];
    const opts = [...host.querySelectorAll('.opt')];
    const chosen = opts.find(b => b.dataset.opt !== item.answer) || opts[0];
    const card = host.querySelector('.flashcard');
    const bar = host.querySelector('#qBar');
    const widthBefore = bar.style.width;
    const feedbackBefore = host.querySelector('#qFeedback').innerHTML.length;

    answerMC(item, chosen.dataset.opt);
    await new Promise(r => setTimeout(r, 80));

    const host2 = document.getElementById('view-practice');
    const marked = [...host2.querySelectorAll('.opt')];
    return {
      sameCard: host2.querySelector('.flashcard') === card,
      sameOptions: marked[0] === opts[0] && marked.length === opts.length,
      sameBar: host2.querySelector('#qBar') === bar,
      allDisabled: marked.every(b => b.disabled),
      oneCorrect: marked.filter(b => b.classList.contains('correct')).length === 1,
      oneWrong: marked.filter(b => b.classList.contains('wrong')).length === 1,
      feedbackGrew: host2.querySelector('#qFeedback').innerHTML.length > feedbackBefore,
      barMoved: bar.style.width !== widthBefore,
      counter: host2.querySelector('#qCount').textContent
    };
  });
  is(answeredInPlace.sameCard && answeredInPlace.sameOptions && answeredInPlace.sameBar,
     'answering a question leaves the question, its options and the bar in place');
  is(answeredInPlace.allDisabled && answeredInPlace.oneCorrect && answeredInPlace.oneWrong,
     'the right answer and the one you picked are marked, and none can be clicked again');
  is(answeredInPlace.feedbackGrew, 'the feedback appears below them');
  is(answeredInPlace.barMoved, `and the progress bar keeps up (${answeredInPlace.counter})`);

  /* Typing works the same way. */
  const typedInPlace = await page.evaluate(async () => {
    quiz = null;
    const pool = practicePool(null, 'all');
    quiz = newQuiz('typing', buildQuestions('typing', pool, 3, {}));
    render('practice');
    const host = document.getElementById('view-practice');
    const input = host.querySelector('#qInput');
    const note = host.querySelector('#qTypeNote');
    const check = host.querySelector('[data-act="check"]');
    const seen = (el) => !!el && el.checkVisibility({ contentVisibilityAuto: true,
                                                     opacityProperty: true, visibilityProperty: true });
    input.value = 'zzzdefinitelywrong';
    checkAnswer(quiz.items[0]);
    await new Promise(r => setTimeout(r, 80));
    const host2 = document.getElementById('view-practice');
    return { sameInput: host2.querySelector('#qInput') === input,
             disabled: input.disabled, noteHidden: !seen(note), checkHidden: !seen(check),
             feedback: host2.querySelector('#qFeedback').textContent.indexOf('Not quite') !== -1 };
  });
  is(typedInPlace.sameInput && typedInPlace.disabled,
     'the box you typed into is the same box, now locked');
  is(typedInPlace.noteHidden && typedInPlace.checkHidden,
     'the Check button and the spelling note step aside');
  is(typedInPlace.feedback, 'and the answer is shown where the note was');
  await page.evaluate(() => { quiz = null; session = null; Store.wipe(); Store.saveNow(); go('dashboard', {}); });

  /* The burst is centred on the page you are reading, not on the window. */
  const centred = await page.evaluate(async () => {
    document.querySelectorAll('canvas.confetti').forEach(c => c.remove());
    confetti();
    await new Promise(r => setTimeout(r, 260));
    const cv = document.querySelector('canvas.confetti');
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let sum = 0, n = 0;
    for (let y = 0; y < cv.height; y += 3) {
      for (let x = 0; x < cv.width; x += 3) {
        if (d[(y * cv.width + x) * 4 + 3] > 200) { sum += x; n++; }
      }
    }
    const area = document.getElementById('scrollArea').getBoundingClientRect();
    const dpr = cv.width / window.innerWidth;
    const centre = n ? (sum / n) / dpr : 0;
    document.querySelectorAll('canvas.confetti').forEach(c => c.remove());
    return { centre: Math.round(centre),
             areaCentre: Math.round(area.left + area.width / 2),
             windowCentre: Math.round(window.innerWidth / 2) };
  });
  is(Math.abs(centred.centre - centred.areaCentre) < 60,
     `the burst is centred on the reading area (${centred.centre} against ${centred.areaCentre})`);
  is(centred.areaCentre !== centred.windowCentre &&
     Math.abs(centred.centre - centred.areaCentre) < Math.abs(centred.centre - centred.windowCentre),
     `which is not where the window's centre is (${centred.windowCentre})`);

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
    /* Every font the app offers, not a list that has to be kept in step with
       one — an option added to data.js and forgotten in the CSS would simply
       inherit the last stack. */
    FONTS.forEach(f => {
      document.documentElement.setAttribute('data-font', f.id);
      fonts[f.id] = getComputedStyle(document.body).fontFamily;
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
  is(new Set(Object.values(appearance.fonts)).size === appearance.fontCount,
     `all ${appearance.fontCount} font choices differ from one another`);
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
  is(painted === appearance.themes, `all ${appearance.themes} themes paint their own background`);

  /* Same for the accents: one missing rule and the swatch would quietly wear
     the colour of the option before it. */
  const accents = await page.evaluate(() => {
    const seen = new Set();
    ACCENTS.forEach(a => {
      document.documentElement.setAttribute('data-accent', a.id);
      seen.add(getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
    });
    document.documentElement.setAttribute('data-accent', Store.state.settings.accent || 'indigo');
    return seen.size;
  });
  is(accents === appearance.accents, `all ${appearance.accents} accents paint their own colour`);

  /* ------------------------------------------------------------------ *
     A collection saved by an older version has to open in this one.

     The bug: migrate() merged the saved data over the defaults object
     itself, so the defaults' own `settings` was replaced by the saved one
     — and the next line, reaching into a group of settings that older
     save had never heard of, threw. load() answered a thrown migration by
     starting the collection again from scratch.
   * ------------------------------------------------------------------ */
  head('an older save still opens');
  const older = await page.evaluate(() => {
    const now = JSON.parse(JSON.stringify(Store.state));
    /* strip everything added since, the way a save from an older copy looks */
    const old = { version: 2, starterRevision: now.starterRevision, createdAt: now.createdAt,
                  settings: { theme: 'nord', newPerDay: 7, ai: { enabled: true, apiKey: 'zz' } },
                  decks: now.decks, cards: now.cards, log: [{ ts: Date.now(), cardId: now.cards[0].id,
                    rating: 3, correct: true, mode: 'quiz' }], daily: {}, wotdSeen: ['alpha', 'beta'] };
    let thrown = '';
    let out = null;
    try { out = Store.migrate(JSON.parse(JSON.stringify(old))); } catch (e) { thrown = e.message; }
    return { thrown: thrown,
             cards: out ? out.cards.length : 0, log: out ? out.log.length : 0,
             kept: out ? out.settings.theme + '/' + out.settings.newPerDay : '',
             key: out ? out.settings.ai.apiKey : '',
             /* and the settings that did not exist then arrive with their defaults */
             level: out ? out.settings.ai.level : '', wotdAi: !!(out && out.settings.wotdAi),
             cw: out ? out.settings.cwClues : '', practice: !!(out && out.practice),
             history: out ? out.wotdLog.map(w => w.term).join() : '' };
  });
  is(!older.thrown, older.thrown ? 'migration threw: ' + older.thrown : 'an older save migrates without throwing');
  is(older.cards === 83 && older.log === 1, `its ${older.cards} words and its review history survive`);
  is(older.kept === 'nord/7' && older.key === 'zz', 'the settings it had are kept');
  is(older.level === 'B1-B2' && older.wotdAi && older.cw === 'side' && older.practice,
     'and the ones added since arrive with their defaults');
  is(older.history === 'beta,alpha', 'the words it had already been shown become history');

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
