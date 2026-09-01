/* Draft the plain cards on your own computer, with Ollama.
   ==========================================================================

     node tools/generate.js --calibrate          20 mixed words, printed
     node tools/generate.js --calibrate --model qwen2.5:14b
     node tools/generate.js                      the whole run, resumable
     node tools/generate.js --limit 200          just the next 200
     node tools/generate.js --merge              passing drafts into the deck

   Nothing is trusted. Every card the model sends back goes through the same
   checks the deck itself is held to, and a card that fails is asked for again
   with the reason attached. A word that fails three times is left out, listed
   at the end, and written by hand instead.

   The run writes tools/drafts.json after every batch, so it can be stopped
   with ctrl-C and picked up again where it left off.                        */

const fs = require('fs');
const path = require('path');
const { app, rules, deck, root } = require('./app-context');

const args = process.argv.slice(2);
const has = (f) => args.indexOf(f) !== -1;
const val = (f, d) => { const i = args.indexOf(f); return i === -1 ? d : args[i + 1]; };

const HOST = val('--host', process.env.OLLAMA_HOST || 'http://127.0.0.1:11434');
const MODEL = val('--model', 'qwen2.5:14b');
const BATCH = parseInt(val('--batch', '6'), 10);
const TRIES = 3;
const DRAFTS = path.join(__dirname, 'drafts.json');
const WORDS = path.join(__dirname, 'words.json');

const load = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };

/* ---------- talking to Ollama ------------------------------------------- */

async function ask(words, note) {
  const list = words.map(w => {
    const bits = ['- ' + w.term + ' (' + w.pos + ')'];
    if (w.sense) bits.push('  this card is the sense: ' + w.sense);
    if (w.shares) bits.push('  the word has other meanings; write only the ' + w.pos + ' one');
    if (w.cambridge && w.cambridge.length)
      bits.push('  Cambridge shows it used like this: ' + w.cambridge.join(' / '));
    return bits.join('\n');
  }).join('\n');

  const body = {
    model: MODEL,
    format: 'json',
    stream: false,
    options: { temperature: 0.3, num_predict: 340 * words.length },
    messages: [
      { role: 'system', content: rules.PROMPT },
      { role: 'user', content: 'Write a card for each of these ' + words.length +
          ' words.\n\n' + list + (note ? '\n\n' + note : '') }
    ]
  };

  const res = await fetch(HOST + '/api/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('Ollama answered ' + res.status + ' ' + (await res.text()).slice(0, 200));
  const out = await res.json();
  const text = (out.message && out.message.content) || '';
  let parsed;
  try { parsed = JSON.parse(text); }
  catch (e) {
    const a = text.indexOf('{'), b = text.lastIndexOf('}');
    if (a === -1 || b <= a) throw new Error('the answer was not JSON');
    parsed = JSON.parse(text.slice(a, b + 1));
  }
  const cards = parsed.cards || (Array.isArray(parsed) ? parsed : [parsed]);
  return Array.isArray(cards) ? cards : [];
}

/* Line a batch's answers up with the words that were asked for: a model may
   drop one, add one, or put them in a different order. */
function lineUp(words, answers) {
  const norm = (s) => app.normalize(String(s || ''));
  const left = answers.slice();
  return words.map(w => {
    let i = left.findIndex(a => norm(a.term) === norm(w.term));
    if (i === -1) i = left.findIndex(a => a.term && app.AI.sameWord(a.term, w.term));
    return i === -1 ? null : left.splice(i, 1)[0];
  });
}

/* ---------- the run ------------------------------------------------------ */

async function run(words, keep) {
  const drafts = keep ? load(DRAFTS, {}) : {};
  const key = (w) => w.term + '|' + w.pos + '|' + (w.sense || '');
  const todo = words.filter(w => !drafts[key(w)]);
  const failed = [];
  let done = 0, tried = 0;
  const started = Date.now();

  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    let want = batch, note = '';
    for (let attempt = 1; attempt <= TRIES && want.length; attempt++) {
      let answers = [];
      try { answers = await ask(want, note); }
      catch (e) { console.log('  ! ' + e.message); }
      tried++;
      const lined = lineUp(want, answers);
      const again = [], reasons = [];
      want.forEach((w, n) => {
        if (!lined[n]) { again.push(w); reasons.push(w.term + ': you did not write a card for it'); return; }
        const card = rules.toCard(lined[n], w);
        const problems = rules.checkCard(card, app);
        if (problems.length) { again.push(w); reasons.push(w.term + ': ' + problems[0]); return; }
        drafts[key(w)] = card; done++;
      });
      want = again;
      note = again.length ? 'Your last answer had these faults. Write these words again and fix them:\n' +
        reasons.map(r => '- ' + r).join('\n') : '';
    }
    want.forEach(w => failed.push(w.term + ' (' + w.pos + ')'));
    fs.writeFileSync(DRAFTS, JSON.stringify(drafts, null, 0));
    const per = (Date.now() - started) / 1000 / Math.max(1, done);
    const left = Math.round(per * (todo.length - done) / 60);
    process.stdout.write('\r  ' + done + '/' + todo.length + ' written, ' + failed.length +
      ' left out, ' + tried + ' requests, about ' + left + ' min to go        ');
  }
  console.log('');
  return { drafts, failed };
}

/* ---------- the modes ---------------------------------------------------- */

function words(which) {
  const all = load(WORDS, []);
  const have = {};
  deck().cards.forEach(c => { have[c.term + '|' + c.pos + '|' + (c.sense || '')] = 1; });
  return all.filter(w => !w.byHand && !have[w.term + '|' + w.pos + '|' + (w.sense || '')])
            .filter(() => true);
}

function sample(list, n) {
  /* A spread rather than the first twenty: the As are not the hard part. */
  const step = Math.max(1, Math.floor(list.length / n));
  const out = [];
  for (let i = 0; i < list.length && out.length < n; i += step) out.push(list[i]);
  return out;
}

async function main() {
  console.log('model ' + MODEL + ' at ' + HOST);
  const pool = words();

  if (has('--merge')) {
    const drafts = load(DRAFTS, {});
    const cards = Object.keys(drafts).map(k => drafts[k]);
    if (!cards.length) return console.log('no drafts to merge — run the generator first');
    const bad = cards.filter(c => rules.checkCard(c, app).length);
    console.log(cards.length + ' drafts, ' + bad.length + ' of them no longer pass');
    fs.writeFileSync(path.join(__dirname, 'drafted-cards.json'),
      JSON.stringify(cards.filter(c => !rules.checkCard(c, app).length), null, 1));
    return console.log('written to tools/drafted-cards.json — hand that to Claude to fold in');
  }

  if (has('--calibrate')) {
    const pick = sample(pool, parseInt(val('--calibrate', '20'), 10) || 20);
    console.log('trying ' + pick.length + ' words spread across the list\n');
    const { drafts, failed } = await run(pick, false);
    const cards = Object.keys(drafts).map(k => drafts[k]);
    console.log('\n' + cards.length + ' of ' + pick.length + ' passed the checks' +
      (failed.length ? ', these did not: ' + failed.join(', ') : ''));
    console.log('\n---- what it wrote ----\n');
    cards.forEach(c => {
      console.log(c.term + ' (' + c.pos + ')');
      console.log('  ' + c.definition);
      console.log('  ' + c.example);
      console.log('  ' + c.translation);
      if (c.collocations.length) console.log('  ' + c.collocations.join(' · '));
      if (c.related.length) console.log('  ' + c.related.map(r => r.kind + ': ' + r.text).join(' · '));
      console.log('');
    });
    console.log('Send this whole output to Claude before running the full pass.');
    return;
  }

  const limit = parseInt(val('--limit', '0'), 10);
  const todo = limit ? pool.slice(0, limit) : pool;
  console.log(todo.length + ' words to write, ' + BATCH + ' at a time\n');
  const { failed } = await run(todo, true);
  if (failed.length) {
    console.log('\nleft out after ' + TRIES + ' tries (' + failed.length + '):');
    console.log('  ' + failed.join(', '));
  }
  console.log('\ndrafts are in tools/drafts.json — run with --merge when you are done');
}

main().catch(e => { console.error('\n' + e.message); process.exit(1); });
