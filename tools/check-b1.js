/* Every rule the B1 deck is written to, checked mechanically.
   Run from the app folder:  node tools/check-b1.js                          */
const { deck, rules, app } = require('./app-context');

const cards = deck().cards;
const bad = [];
cards.forEach(c => {
  rules.checkCard(c, app).forEach(p => bad.push(c.term + ' (' + c.pos + ') — ' + p));
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

const seen = {};
cards.forEach(c => {
  const key = (c.term + '|' + c.pos + '|' + (c.sense || '')).toLowerCase();
  if (seen[key]) bad.push(c.term + ' (' + c.pos + ') — appears twice'); else seen[key] = 1;
});

console.log('B1 deck: ' + cards.length + ' cards');
if (bad.length) {
  console.log('\n' + bad.length + ' problem' + (bad.length === 1 ? '' : 's') + ':');
  bad.forEach(b => console.log('  ✗ ' + b));
  process.exit(1);
}
console.log('every card holds up');
