"""Cambridge's Appendix 2 topic lists, matched to the words already extracted.

The lists are set four columns wide, and a topic occupies a band of rows across
all four: its heading runs along the top, its words fill the band beneath. The
entries wrap, glue themselves to hyphens and carry part-of-speech labels — none
of which has to be parsed exactly, because the vocabulary is already known from
the alphabetical list. The lines are read loosely and matched against it.
"""
import json, re
from pypdf import PdfReader
import extract as E

FIRST, LAST = 42, 53           # Appendix 2, 1-based and inclusive
TOP, BOTTOM = 800, 70
WIDE = 60                      # points; less than this apart is one column indented

TOPICS = ['Clothes and Accessories', 'Colours', 'Communications and Technology',
          'Education', 'Entertainment and Media', 'Environment', 'Food and Drink',
          'Health, Medicine and Exercise', 'Hobbies and Leisure', 'House and Home',
          'Language', 'Places: Buildings', 'Places: Countryside',
          'Places: Town and City', 'Services', 'Shopping', 'Sport',
          'The Natural World', 'Time', 'Travel and Transport', 'Weather',
          'Work and Jobs']

NOISE = re.compile(r'CUPA|Page \d+ of|B1 Preliminary|^(List|for Schools Vocabulary|'
                   r'Appendix \d+|Topic Lists)$')

def columns_of(rows):
    """Where this page's columns begin. They move about — 90 on one page, 72 on
    the next — and a fixed guess merges two columns into one line, which reads
    as the entry 'athlete contest'."""
    starts = {}
    for xs in rows.values():
        for x, _ in xs: starts[round(x)] = starts.get(round(x), 0) + 1
    popular = sorted(x for x, n in starts.items() if n >= 8)
    bands = []
    for x in popular:
        if bands and x - bands[-1] < WIDE: continue     # an indent, not a column
        bands.append(x)
    return bands

def page_rows(page, fallback):
    """Every row of the page as {y: {column: text}}."""
    chunks = []
    def visit(text, cm, tm, font, size):
        if text.strip(): chunks.append((round(tm[4], 1), round(tm[5], 1), text))
    page.extract_text(visitor_text=visit)
    rows = {}
    for x, y, t in chunks:
        if BOTTOM < y < TOP: rows.setdefault(round(y), []).append((x, t))
    cols = columns_of(rows) or fallback
    at = lambda x: max([i for i, c in enumerate(cols) if x >= c - 12] or [0])
    out = {}
    for y, items in rows.items():
        by = {}
        for x, t in sorted(items): by.setdefault(at(x), []).append(t)
        line = {c: re.sub(r'\s+', ' ', ' '.join(v)).strip() for c, v in by.items()}
        out[y] = {c: t for c, t in line.items() if t and not NOISE.search(t)}
    return out, cols

def heading_at(row):
    """A heading sits in the first column, and long ones run into the second."""
    if 0 not in row: return None
    for joined in (row[0], ' '.join(row[c] for c in sorted(row))):
        for t in TOPICS:
            if joined == t or t.startswith(joined) and len(joined) > len(t) - 4:
                return t
    return None

def read():
    """Each topic and every line printed beneath its heading."""
    reader = PdfReader(E.PDF)
    found, topic, cols = {}, None, [90, 214, 338, 462]
    for pno in range(FIRST - 1, LAST):
        rows, cols = page_rows(reader.pages[pno], cols)
        for y in sorted(rows, reverse=True):
            head = heading_at(rows[y])
            if head:
                topic = head
                found.setdefault(topic, [])
                continue
            if topic:
                found[topic].extend(rows[y].values())
    return found

def key(s):
    """What a line and a headword have in common once the labels are gone."""
    s = re.sub(r'\([^()]*\)', ' ', s).replace('’', "'").lower()
    s = re.sub(r'\s*[-–]\s*', '-', s)               # 'T - shirt' -> 't-shirt'
    s = re.sub(r'[^a-z\'/ -]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()

if __name__ == '__main__':
    found = read()
    print('topics found:', len(found), 'of', len(TOPICS))
    for t in TOPICS:
        print('  %-34s %4d lines' % (t, len(found.get(t, []))))
    missing = [t for t in TOPICS if t not in found]
    if missing: print('\nnot found:', missing)
    json.dump(found, open('pv-topics-raw.json', 'w'), ensure_ascii=False, indent=0)

def variants(s):
    """The forms one entry might be written in on either side of the match.

    The topic lists and the alphabetical list do not always agree with each
    other: 'chat room' against 'chatroom', 'socks' against 'sock',
    'doctor / Dr' against plain 'doctor'.
    """
    out = set()
    for part in re.split(r'\s*/\s*', key(s)):
        part = part.strip()
        if not part: continue
        out.add(part)
        out.add(part.replace(' ', ''))
        if part.endswith('es'): out.add(part[:-2])
        if part.endswith('s'): out.add(part[:-1])
        out.add(part + 's')
    return {v for v in out if len(v) > 1}

def assign(cards):
    """Which topics each card belongs to.

    A word can appear under several — 'ticket' is Entertainment and Travel both
    — so all of them are recorded and the card takes the first. Entries wrap
    over as many as three lines ('tourist' / 'information' / 'centre'), so
    neighbouring lines are tried joined as well as apart.
    """
    found = read()
    where = {}
    for topic in TOPICS:
        lines = [E.respace(l) for l in found.get(topic, [])]
        for i, line in enumerate(lines):
            for n in (1, 2, 3):
                if i + n > len(lines): break
                for v in variants(' '.join(lines[i:i + n])):
                    where.setdefault(v, set()).add(topic)

    out = {}
    for c in cards:
        hit = set()
        for v in variants(c['term']):
            hit |= where.get(v, set())
        if hit: out[c['term']] = [t for t in TOPICS if t in hit]
    return out, found
