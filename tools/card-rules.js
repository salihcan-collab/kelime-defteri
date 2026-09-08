/* What a card has to be. Every rule the B1 deck is written to, in one place,
   so that check-b1.js can hold all 3,353 of them to the same standard —
   whether the card was written by hand or drafted and then corrected.

   These once had a matching prompt beside them, written for the model that
   drafted the deck. The deck is written; the generator has gone, and the
   prompt with it. What is left is the half that outlives the drafting: a rule
   that is checked. */

/* Turkish uses these; a "translation" made only of English letters is a
   suspicious but not impossible thing, so it is judged with other signals. */
const TURKISH = /[çğıöşüÇĞİÖŞÜ]/;
const ENGLISH_ONLY = /^[a-zA-Z ,'-]+$/;

/* Is `a` simply `b` made plural? Nothing else counts: an -ing or an -ed can be
   a word of its own, an -s never is. */
function plural(a, b) {
  const x = String(a || '').toLowerCase(), y = String(b || '').toLowerCase();
  if (!x || !y || x === y) return false;
  return x === y + 's' || x === y + 'es' ||
         (/[^aeiou]y$/.test(y) && x === y.slice(0, -1) + 'ies');
}

/* `match` is the app's own findTerm: whether a word can be found in a
   sentence is a question only the drills' own code can answer. */
/* A card is checked twice in its life: as a draft, with the Turkish still to
   come, and again once it is finished. Everything else is judged the same way
   both times — a draft that would not pass as a card is not worth keeping. */
function checkCard(card, ctx, draft) {
  /* The context is the app itself, handed in rather than reached for, so this
     file runs in a page and in Node alike. Missing a piece of it is a mistake
     in the caller, and should say so rather than fail somewhere further down. */
  ['findTerm', 'normalize', 'isInflectionOf', 'AI', 'PARTS_OF_SPEECH']
    .forEach(k => { if (!ctx || !ctx[k]) throw new Error('checkCard needs ' + k + ' from the app'); });
  const bad = [];
  const say = (s) => bad.push(s);
  const term = String(card.term || '').trim();
  const match = ctx.findTerm;

  if (!term) return ['no term'];
  /* The app's own list, not a copy of it: a checker that keeps its own drifts,
     and a card can end up with a label no editor will offer back. */
  if (ctx.PARTS_OF_SPEECH.indexOf(card.pos) === -1)
    say('part of speech "' + card.pos + '" is not one the app knows');

  /* Whether this word is something you do decides two rules that sit far
     apart: how the English definition opens, and how the Turkish ends. */
  const doing = card.pos === 'verb' || card.pos === 'phrasal verb';

  const def = String(card.definition || '').trim();
  if (!def) say('no definition');
  else {
    const n = def.split(/\s+/).length;
    if (n > 30) say('definition runs to ' + n + ' words');
    if (!/^[A-Z]/.test(def)) say('definition does not start with a capital');
    if (!/[.!?]$/.test(def)) say('definition does not end with a full stop');
    if (/\b(sth|sb|etc|e\.g|i\.e)\b/i.test(def)) say('definition uses an abbreviation');
    if (match(def, term, 0)) say('definition contains the word it defines');
    /* A verb is defined as a verb. It reads better, and it is what keeps the
       noun and the verb of one word from coming back as the same card. */
    if (doing && !/^To /.test(def)) say('a verb\'s meaning begins with "To "');
    if (!doing && /^To /.test(def)) say('only a verb\'s meaning begins with "To "');
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

  /* Fields the app stores as text, so a list arriving in one is caught here
     rather than turning into "[object Object]" on a card. */
  ['definition', 'example', 'translation', 'notes', 'sense', 'term', 'pos'].forEach(f => {
    if (card[f] != null && typeof card[f] !== 'string') say(f + ' is not text: ' + JSON.stringify(card[f]));
  });
  if (card.tags && !Array.isArray(card.tags)) say('tags is not a list: ' + JSON.stringify(card.tags));
  (card.tags || []).forEach(t => { if (!String(t || '').trim()) say('an empty tag'); });

  const tr = String(card.translation || '').trim();
  if (!tr) { if (!draft) say('no translation'); }
  else {
    if (/[a-z]\(/.test(tr)) say('translation needs a space before its bracket');
    if (tr.split(',').length > 4) say('translation offers more than four renderings');
    /* A gloss, not a sentence: the field sits on one line of a card. */
    if (/[.!?]/.test(tr)) say('the translation is written as a sentence: ' + JSON.stringify(tr));
    if (tr.length > 60) say('the translation runs to ' + tr.length + ' characters');
    /* Every Turkish verb, given the way a dictionary gives it, ends in -mak or
       -mek. Nothing else does reliably — yemek and ekmek are nouns — so this
       is asked of verbs only, never of the rest. */
    if (doing) tr.split(',').map(x => x.trim()).filter(Boolean).forEach(one => {
      if (!/(mak|mek)$/i.test(one))
        say('a verb\'s Turkish is the infinitive, which ends in -mak or -mek: ' + JSON.stringify(one));
    });
    /* A translation that could pass for English, with none of the letters only
       Turkish has, is usually the model answering in the wrong language. Some
       words really are the same in both — gram, hey, video — so a card may say
       so, and only a card: the field is not one a model's answer can carry,
       because toCard builds the card and never copies it. */
    if (card.sameInTurkish != null && typeof card.sameInTurkish !== 'boolean')
      say('sameInTurkish is not a yes or no: ' + JSON.stringify(card.sameInTurkish));
    /* Loosening this to judge each rendering on its own would let "quickly,
       fast" through — two English words, neither of them Turkish — to save
       "film, sinema filmi", where the Turkish half happens to use no letter
       Turkish alone has. Nothing mechanical separates those two, and a card
       whose Turkish is English is the failure this whole exercise was built to
       catch. So it stays strict, and the dozen loanwords whose Turkish really
       is the English word are written by hand and say so. */
    if (!card.sameInTurkish && !TURKISH.test(tr) && ENGLISH_ONLY.test(tr) && match(tr, term, 0))
      say('the translation is the English word again: ' + JSON.stringify(tr));
  }

  (card.collocations || []).forEach(p => {
    if (!match(String(p), term, 0)) say('collocation without the word in it: ' + JSON.stringify(p));
  });
  if ((card.collocations || []).length > 4) say('more than four collocations');

  const family = (card.related || []).filter(r => r.kind === 'family').map(r => r.text);
  (card.related || []).forEach(r => {
    if (['syn', 'ant', 'family'].indexOf(r.kind) === -1) say('related kind "' + r.kind + '"');
    if (!r.text) say('related entry with no word');
    else if (r.kind === 'family' && ctx.isInflectionOf(r.text, term))
      say('"' + r.text + '" is an ending on the word, not a family member');
    else if (ctx.normalize(r.text) === ctx.normalize(term)) say('listed as related to itself: ' + r.text);
    /* A family that lists both "grandmother" and "grandmothers" has padded
       itself with a plural. Only plurals: "annoying" beside "annoy" is a word
       in its own right, and so is "clothing" beside "cloth". */
    else if (r.kind === 'family' && family.some(f => f !== r.text && plural(r.text, f)))
      say('"' + r.text + '" is the plural of "' +
          family.filter(f => f !== r.text && plural(r.text, f))[0] + '", already in the family');
  });
  const of = (k) => (card.related || []).filter(r => r.kind === k).length;
  if (of('syn') > 4) say('more than four synonyms');
  if (of('ant') > 2) say('more than two opposites');
  if (of('family') > 6) say('more than six family members');

  return bad;
}

/* Two cards of one word have to be two cards. The app keeps them apart by
   their part of speech and their sense label, but a learner is kept apart by
   what they say — meeting "guess" twice with the same meaning under it teaches
   nothing and cannot be answered. */
function clashes(card, sibling, ctx) {
  const same = (a, b) => ctx.normalize(String(a || '')) === ctx.normalize(String(b || ''));
  if (!same(card.term, sibling.term)) return null;
  if (same(card.pos, sibling.pos) && same(card.sense, sibling.sense))
    return 'is the same card as another already written for "' + sibling.term + '"';
  if (same(card.definition, sibling.definition))
    return 'means the same as the ' + sibling.pos + ' card for "' + sibling.term + '"';
  if (same(card.example, sibling.example))
    return 'uses the same example as the ' + sibling.pos + ' card for "' + sibling.term + '"';
  return null;
}

/* Read from a page as well as from Node: the checks belong to the deck, not to
   whichever of the two happens to be running them. */
const CardRules = { checkCard, clashes };
if (typeof module !== 'undefined' && module.exports) module.exports = CardRules;
