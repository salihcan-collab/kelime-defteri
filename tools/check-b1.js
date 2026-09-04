/* Every rule the B1 deck is written to, checked mechanically.
   Run from the app folder:  node tools/check-b1.js                          */
const { deck, rules, app } = require('./app-context');

const cards = deck().cards;
const bad = [];
cards.forEach(c => {
  rules.checkCard(c, app).forEach(p => bad.push(c.term + ' (' + c.pos + ') — ' + p));
});

/* Senses of one word have to be told apart, or the learner meets the same
   front twice and cannot know which answer is wanted — by their labels, and by
   what they actually say. */
const byTerm = {};
cards.forEach(c => { (byTerm[c.term.toLowerCase()] = byTerm[c.term.toLowerCase()] || []).push(c); });
Object.keys(byTerm).forEach(t => {
  const group = byTerm[t];
  if (group.length < 2) return;
  group.forEach((c, i) => group.slice(i + 1).forEach(other => {
    const clash = rules.clashes(c, other, app);
    if (clash) bad.push(c.term + ' (' + c.pos + ') — ' + clash);
  }));
});

console.log('B1 deck: ' + cards.length + ' cards');
if (bad.length) {
  console.log('\n' + bad.length + ' problem' + (bad.length === 1 ? '' : 's') + ':');
  bad.forEach(b => console.log('  ✗ ' + b));
  process.exit(1);
}
console.log('every card holds up');
