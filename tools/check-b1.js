/* Every rule the B1 deck is written to, checked mechanically.
   Run from the app folder:  node tools/check-b1.js                          */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

/* The app's own matcher decides whether an example contains its word: a drill
   that cannot find the term in the sentence is a drill that cannot be built,
   so this has to be the same code the drills use, not a second opinion. */
/* readyState 'loading' means the app hangs its boot on DOMContentLoaded, which
   never fires here — so its functions are defined and nothing runs. */
const stub = 'const document={readyState:"loading",addEventListener(){},' +
  'querySelector(){return null},querySelectorAll(){return []},documentElement:{}};' +
  'const window={addEventListener(){},matchMedia(){return{matches:false,addEventListener(){}}}};' +
  'const localStorage={getItem(){return null},setItem(){},removeItem(){}};' +
  'const navigator={language:"en"};const speechSynthesis=null;';
const app = new Function(stub + read('ai.js') + read('app.js') +
  '; return { findTerm, normalize, isInflectionOf, AI };')();

const deck = new Function(read('deck-b1.js') + '; return B1_DECK;')();
const cards = deck.cards;

const POS = ['noun', 'verb', 'adjective', 'adverb', 'phrasal verb', 'phrase',
             'exclamation', 'plural noun'];
const bad = [];
const fail = (card, what) => bad.push(card.term + ' (' + card.pos + ') — ' + what);

const seen = {};
cards.forEach(c => {
  const key = (c.term + '|' + c.pos + '|' + (c.sense || '')).toLowerCase();
  if (seen[key]) fail(c, 'appears twice'); else seen[key] = 1;

  if (!c.term || !c.term.trim()) fail(c, 'no term');
  if (POS.indexOf(c.pos) === -1) fail(c, 'part of speech "' + c.pos + '" is not one the app knows');

  if (!c.definition) fail(c, 'no definition');
  else {
    const n = c.definition.trim().split(/\s+/).length;
    if (n > 30) fail(c, 'definition runs to ' + n + ' words');
    if (!/^[A-Z]/.test(c.definition)) fail(c, 'definition does not start with a capital');
    if (!/[.!?]$/.test(c.definition)) fail(c, 'definition does not end with a full stop');
    if (/\b(sth|sb|etc|e\.g|i\.e)\b/i.test(c.definition)) fail(c, 'definition uses an abbreviation');
    if (new RegExp('\\b' + c.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(c.definition))
      fail(c, 'definition contains the word itself');
  }

  if (!c.example) fail(c, 'no example');
  else {
    if (!app.findTerm(c.example, c.term, 0))
      fail(c, 'the example does not contain the term: ' + JSON.stringify(c.example));
    if (!/[.!?]$/.test(c.example)) fail(c, 'example does not end with a full stop');
    if (c.example.trim().split(/\s+/).length < 4) fail(c, 'example is too short to show anything');
  }

  if (!c.translation) fail(c, 'no translation');
  else if (/[a-z]\(/.test(c.translation)) fail(c, 'translation needs a space before its bracket');

  (c.collocations || []).forEach(p => {
    if (!app.findTerm(p, c.term, 0)) fail(c, 'collocation without the word in it: ' + JSON.stringify(p));
  });
  if ((c.collocations || []).length > 4) fail(c, 'more than four collocations');

  (c.related || []).forEach(r => {
    if (['syn', 'ant', 'family'].indexOf(r.kind) === -1) fail(c, 'related kind "' + r.kind + '"');
    if (!r.text) fail(c, 'related entry with no word');
    if (r.kind === 'family' && app.isInflectionOf(r.text, c.term))
      fail(c, '"' + r.text + '" is an inflection of the word, not a family member');
    if (app.normalize(r.text) === app.normalize(c.term))
      fail(c, 'listed as related to itself: ' + r.text);
  });
  if ((c.related || []).filter(r => r.kind === 'syn').length > 4) fail(c, 'more than four synonyms');
  if ((c.related || []).filter(r => r.kind === 'ant').length > 2) fail(c, 'more than two opposites');
  if ((c.related || []).filter(r => r.kind === 'family').length > 6) fail(c, 'more than six family members');
});

/* Senses of one word have to be told apart, or the learner meets the same
   front twice and cannot know which answer is wanted. */
const byTerm = {};
cards.forEach(c => { (byTerm[c.term.toLowerCase()] = byTerm[c.term.toLowerCase()] || []).push(c); });
Object.keys(byTerm).forEach(t => {
  const group = byTerm[t];
  if (group.length < 2) return;
  const labels = group.map(c => (c.pos + '/' + (c.sense || '')).toLowerCase());
  if (new Set(labels).size !== labels.length)
    bad.push(t + ' — ' + group.length + ' cards that do not say which sense is which');
});

console.log('B1 deck: ' + cards.length + ' cards');
if (bad.length) {
  console.log('\n' + bad.length + ' problem' + (bad.length === 1 ? '' : 's') + ':');
  bad.forEach(b => console.log('  ✗ ' + b));
  process.exit(1);
}
console.log('every card holds up');
