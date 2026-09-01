/* What a card has to be — asked for and enforced from the same place.

   The prompt below is what a model is told; checkCard is what happens to what
   it sends back. Keeping them in one file is the point: a rule that is asked
   for but not checked is a wish, and a rule that is checked but never asked
   for is a trap.                                                            */

const POS = ['noun', 'verb', 'adjective', 'adverb', 'phrasal verb', 'phrase',
             'exclamation', 'plural noun'];

/* The instructions a model writing these cards is given. Written for a small
   local model: short sentences, one rule per line, an example of the shape. */
const PROMPT = `You write vocabulary cards for a Turkish speaker learning English at B1 level.

For each word you are given, return one card. Follow every rule.

"definition": a plain English definition, at most 25 words.
  Start with a capital, end with a full stop.
  NEVER use the word itself, or any form of it, inside the definition.
  No abbreviations: write "something", not "sth".

"example": ONE natural English sentence, 5 to 14 words.
  It MUST contain the word itself. This is the most important rule.
  Use the plain form of the word where you can. Avoid irregular past forms.
  Start with a capital, end with a full stop, question mark or exclamation mark.

"translation": what the word means in Turkish.
  Give 2 or 3 Turkish words separated by ", " — the renderings a Turk would
  really use. One word only if Turkish truly offers only one.
  Turkish only. No English, no brackets, no explanation.

"collocations": fixed English phrases that CONTAIN the word.
  At most 3, and an empty list is normal. Most words have one or two.
  Every phrase must contain the word. Do not invent phrases to fill the list.

"synonyms": English words that mean the same. At most 3, often none.
"antonyms": English words that mean the opposite. At most 2, usually none.
"family": other dictionary words built on the same root. At most 4, often none.
  NEVER an ending on the same word: for "achieve" write "achievement",
  never "achieved", "achieves" or "achieving".

Answer with JSON only, in this shape:
{"cards":[{"term":"reliable","definition":"Able to be trusted to do what is expected.","example":"She is the most reliable person on the team.","translation":"güvenilir, sağlam","collocations":["a reliable source"],"synonyms":["dependable"],"antonyms":["unreliable"],"family":["reliability","rely"]}]}`;

/* Turkish uses these; a "translation" made only of English letters is a
   suspicious but not impossible thing, so it is judged with other signals. */
const TURKISH = /[çğıöşüÇĞİÖŞÜ]/;
const ENGLISH_ONLY = /^[a-zA-Z ,'-]+$/;

/* `match` is the app's own findTerm: whether a word can be found in a
   sentence is a question only the drills' own code can answer. */
function checkCard(card, ctx) {
  const bad = [];
  const say = (s) => bad.push(s);
  const term = String(card.term || '').trim();
  const match = ctx.findTerm;

  if (!term) return ['no term'];
  if (POS.indexOf(card.pos) === -1) say('part of speech "' + card.pos + '" is not one the app knows');

  const def = String(card.definition || '').trim();
  if (!def) say('no definition');
  else {
    const n = def.split(/\s+/).length;
    if (n > 30) say('definition runs to ' + n + ' words');
    if (!/^[A-Z]/.test(def)) say('definition does not start with a capital');
    if (!/[.!?]$/.test(def)) say('definition does not end with a full stop');
    if (/\b(sth|sb|etc|e\.g|i\.e)\b/i.test(def)) say('definition uses an abbreviation');
    if (match(def, term, 0)) say('definition contains the word it defines');
  }

  const ex = String(card.example || '').trim();
  if (!ex) say('no example');
  else {
    if (!match(ex, term, 0)) say('the example does not contain the term: ' + JSON.stringify(ex));
    if (!/[.!?]$/.test(ex)) say('example does not end with a full stop');
    const n = ex.split(/\s+/).length;
    if (n < 4) say('example is too short to show anything');
    if (n > 20) say('example runs to ' + n + ' words');
  }

  const tr = String(card.translation || '').trim();
  if (!tr) say('no translation');
  else {
    if (/[a-z]\(/.test(tr)) say('translation needs a space before its bracket');
    if (tr.split(',').length > 4) say('translation offers more than four renderings');
    /* A translation that could pass for English, with none of the letters only
       Turkish has, is usually the model answering in the wrong language. */
    if (!TURKISH.test(tr) && ENGLISH_ONLY.test(tr) && match(tr, term, 0))
      say('the translation is the English word again: ' + JSON.stringify(tr));
  }

  (card.collocations || []).forEach(p => {
    if (!match(String(p), term, 0)) say('collocation without the word in it: ' + JSON.stringify(p));
  });
  if ((card.collocations || []).length > 4) say('more than four collocations');

  (card.related || []).forEach(r => {
    if (['syn', 'ant', 'family'].indexOf(r.kind) === -1) say('related kind "' + r.kind + '"');
    if (!r.text) say('related entry with no word');
    else if (r.kind === 'family' && ctx.isInflectionOf(r.text, term))
      say('"' + r.text + '" is an ending on the word, not a family member');
    else if (ctx.normalize(r.text) === ctx.normalize(term)) say('listed as related to itself: ' + r.text);
  });
  const of = (k) => (card.related || []).filter(r => r.kind === k).length;
  if (of('syn') > 4) say('more than four synonyms');
  if (of('ant') > 2) say('more than two opposites');
  if (of('family') > 6) say('more than six family members');

  return bad;
}

/* The shape a model answers in, turned into the shape a card is stored in. */
function toCard(raw, word) {
  const list = (v) => (Array.isArray(v) ? v : []).map(x => String(x || '').trim()).filter(Boolean);
  const related = [];
  list(raw.synonyms).slice(0, 4).forEach(t => related.push({ kind: 'syn', text: t }));
  list(raw.antonyms).slice(0, 2).forEach(t => related.push({ kind: 'ant', text: t }));
  list(raw.family).slice(0, 6).forEach(t => related.push({ kind: 'family', text: t }));
  const card = {
    term: word.term, pos: word.pos,
    definition: String(raw.definition || '').trim(),
    example: String(raw.example || '').trim(),
    translation: String(raw.translation || '').trim(),
    collocations: list(raw.collocations).slice(0, 4),
    related: related
  };
  if (word.sense) card.sense = word.sense;
  if (word.notes) card.notes = word.notes;
  return card;
}

/* Read from a page as well as from Node: the checks belong to the deck, not to
   whichever of the two happens to be running them. */
const CardRules = { POS, PROMPT, checkCard, toCard };
if (typeof module !== 'undefined' && module.exports) module.exports = CardRules;
