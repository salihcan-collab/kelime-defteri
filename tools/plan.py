"""Turn the extracted list into the cards the deck will hold.

Two decisions from the brief are applied here: grammar words are left out, and
an entry labelled with more than one part of speech becomes one card per part.
"""
import json, re
from collections import Counter

# The list's own labels, spaces removed so that 'phr v' and 'phrv' are one key.
FULLNAME = {'n': 'noun', 'v': 'verb', 'adj': 'adjective', 'adv': 'adverb',
            'ad': 'adverb', 'prep': 'preposition', 'conj': 'conjunction',
            'det': 'determiner', 'pron': 'pronoun', 'exclam': 'exclamation',
            'interj': 'exclamation', 'number': 'number', 'phrv': 'phrasal verb',
            'mv': 'modal verb', 'av': 'auxiliary verb', 'auxv': 'auxiliary verb',
            'modalv': 'modal verb', 'phr': 'phrase', 'prepphr': 'phrase',
            'phrprep': 'phrase', 'pl': 'plural noun', 'npl': 'plural noun',
            'pln': 'plural noun', 'abbr': 'abbreviation', 'art': 'determiner',
            'quantifier': 'determiner', 'determiner': 'determiner'}

# Words that are grammar rather than vocabulary: nothing is learnt by meeting
# 'the' on a flashcard, and a deck that asks about them wastes the round.
GRAMMAR = {'preposition', 'conjunction', 'determiner', 'pronoun', 'modal verb',
           'auxiliary verb', 'number'}

GROUP = re.compile(r'\s*\(([^()]*)\)')

def parse(head):
    """The headword, its parts of speech, and whatever else was in brackets."""
    groups = GROUP.findall(head)
    term = GROUP.sub('', head).strip()
    pos, notes = [], []
    for g in groups:
        parts = [p.replace(' ', '') for p in re.split(r'[&,]', g) if p.strip()]
        if parts and all(p in FULLNAME for p in parts):
            pos.extend(FULLNAME[p] for p in parts)
        else:
            notes.append(g)
    return term, pos, notes

def cards():
    out = []
    for r in json.load(open('pv-records.json')):
        term, pos, notes = parse(r['head'])
        if not term or not pos: continue
        seen = []
        for p in pos:
            if p not in seen: seen.append(p)
        if all(p in GRAMMAR for p in seen): continue
        for p in seen:
            if p in GRAMMAR and len(seen) > 1: continue   # keep the useful sense only
            out.append({'term': term, 'pos': p, 'head': r['head'],
                        'notes': notes, 'ex': r['ex'], 'page': r['page']})
    return out

if __name__ == '__main__':
    c = cards()
    json.dump(c, open('pv-cards.json', 'w'), ensure_ascii=False, indent=0)
    print('cards:', len(c))
    print('distinct terms:', len({x['term'].lower() for x in c}))
    print()
    for k, v in Counter(x['pos'] for x in c).most_common():
        print('  %-16s %d' % (k, v))
    print()
    print('with a Cambridge example:', sum(1 for x in c if x['ex']))
    print('multi-word terms:', sum(1 for x in c if ' ' in x['term']))
    print('terms carrying a bracket note:', sum(1 for x in c if x['notes']))
