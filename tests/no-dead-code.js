/* A static sweep for leftovers, so they stop accumulating between rounds of
   changes. No browser needed:

     node tests/no-dead-code.js

   It flags four things, each of which had actually collected something by the
   time it was written: functions nobody calls, CSS classes and ids nothing
   ever puts on an element, custom properties nothing reads, and icons nothing
   draws. Anything it reports is a candidate, not a verdict — read it before
   deleting it. Names built by joining strings ('chip rel ' + kind) are the one
   case it cannot see, so the whole-word search below is deliberately loose
   about where a name appears.                                              */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SOURCES = ['data.js', 'srs.js', 'storage.js', 'ai.js', 'app.js'];

const js = SOURCES.map(read).join('\n');
const html = read('index.html');
const css = read('styles.css');
const app = js + '\n' + html;
const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, '');

let problems = 0;
const report = (title, items, note) => {
  if (!items.length) { console.log('  ✓ ' + title); return; }
  problems += items.length;
  console.log('  ✗ ' + title + (note ? ' — ' + note : ''));
  items.forEach(i => console.log('      ' + i));
};

/* A name counts as used if it appears anywhere outside its own declaration. */
const mentions = (name) =>
  (app.match(new RegExp('(^|[^-\\w$])' + name.replace(/[$]/g, '\\$') + '([^-\\w$]|$)', 'g')) || []).length;

console.log('Dead code sweep\n');

/* ---- functions nobody calls ------------------------------------------- */
const orphanFns = [];
SOURCES.forEach(file => {
  read(file).split('\n').forEach((line, i) => {
    const m = /^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/.exec(line);
    if (m && mentions(m[1]) <= 1) orphanFns.push(file + ':' + (i + 1) + '  ' + m[1] + '()');
  });
});
report('every function is called somewhere', orphanFns, 'declared and never used');

/* ---- selectors nothing ever matches ----------------------------------- */
const classes = new Set(), ids = new Set();
cssNoComments.split('}').forEach(block => {
  const sel = block.split('{')[0];
  if (!sel || sel.trim().startsWith('@')) return;
  (sel.match(/\.[-A-Za-z0-9_]+/g) || []).forEach(c => classes.add(c.slice(1)));
  (sel.match(/#[-A-Za-z0-9_]+/g) || []).forEach(c => ids.add(c.slice(1)));
});
const unmatched = (set) => [...set]
  .filter(n => !new RegExp('(^|[^-\\w])' + n.replace(/-/g, '\\-') + '([^-\\w]|$)').test(app))
  .sort();
report(classes.size + ' CSS classes are all reachable', unmatched(classes), 'styled but never applied');
report(ids.size + ' CSS ids are all reachable', unmatched(ids), 'styled but no such element');

/* ---- custom properties nothing reads ---------------------------------- */
const declared = new Set((css.match(/^\s*--[-\w]+\s*:/gm) || []).map(v => v.trim().replace(/\s*:$/, '')));
const readBack = new Set((css.match(/var\((--[-\w]+)/g) || []).map(v => v.slice(4)));
report(declared.size + ' custom properties are all read',
       [...declared].filter(v => !readBack.has(v) && js.indexOf(v) === -1).sort(),
       'defined but never used');

/* ---- icons nothing draws ---------------------------------------------- */
const iconBlock = /const ICONS\s*=\s*\{([\s\S]*?)\n\};/.exec(read('app.js'));
const icons = iconBlock ? (iconBlock[1].match(/^\s{2}([A-Za-z_$][\w$]*)\s*:/gm) || [])
  .map(k => k.trim().replace(':', '')) : [];
report(icons.length + ' icons are all drawn',
       icons.filter(k => !new RegExp('ICONS\\.' + k + '\\b').test(app)).sort(),
       'never referenced');

/* ---- the same selector written twice ---------------------------------- */
const selectors = (cssNoComments.match(/^[.#][^{\n]*\{/gm) || []).map(s => s.replace(/\s*\{$/, '').trim());
const twice = selectors.filter((s, i) => selectors.indexOf(s) !== i);
report('no selector is declared twice', [...new Set(twice)].sort(), 'split across two rules');

console.log(problems ? '\n' + problems + ' thing(s) to look at' : '\nnothing left behind');
process.exit(problems ? 1 : 0);
