/* Every rule the B1 deck is written to, checked mechanically.
   Run from the app folder:  node tools/check-b1.js                          */
const { deck, rules, app } = require('./app-context');

const cards = deck().cards;

/* A verb whose past tense shares no letters with it cannot be found in a
   sentence unless the table names it. Rather than discover that one card at a
   time, every irregular verb the list holds is checked against the table. */
const IRREGULAR_IN_LIST = ('awake bear become begin bite break bring build buy catch choose come cost ' +
  'cut deal do draw drink drive eat fall feed feel fight find fly forget forgive freeze get give go ' +
  'grow hang have hear hide hit hold hurt keep knit know lay lead learn leave lend let lie lose make ' +
  'mean meet mistake pay prove put quit read ride ring rise run say see sell send set shake shine ' +
  'shoot show shut sing sink sit sleep speak speed spell spend spill split spoil spread stand steal ' +
  'stick sting strike swear swim take teach tear tell think throw understand wake wear win wind ' +
  'write').split(' ');
const words = JSON.parse(require('fs').readFileSync(
  require('path').join(__dirname, 'words.json'), 'utf8'));
const inList = {};
words.forEach(w => { inList[w.term.toLowerCase()] = 1; });
const unknown = IRREGULAR_IN_LIST.filter(v => inList[v] && !app.AI.formsOf(v).length);
if (unknown.length) bad.push('the matcher does not know the odd forms of: ' + unknown.join(', '));
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
