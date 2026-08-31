"""Reconstruct the Cambridge B1 Preliminary vocabulary list from the PDF.

The list is set in two columns, and a plain text dump interleaves them: a
'camera' turns up in the D section and fragments of example sentences are read
as headwords. The PDF's own text coordinates keep the columns apart. Words are
laid down one chunk at a time, so a line is rebuilt by putting a space between
chunks and collapsing the runs, and a headword whose brackets are still open is
joined to the line that finishes it.
"""
import re, json
from pypdf import PdfReader

PDF = 'preliminary-vocabulary-list.pdf'   # Cambridge's list; not in this repo
FIRST, LAST = 4, 40      # the alphabetical list, 1-based and inclusive
GUTTER = 302             # points; the left column ends by 290, the right starts at 318
TOP, BOTTOM = 800, 70    # inside this band is the list; the footer sits at 58 and below
FULL = 60                # points; a line ending this near the margin has wrapped

def page_lines(page):
    """The page's lines: column one from the top down, then column two.

    Each line comes with a flag saying whether it ran to the column's right
    edge. A line that did was cut off in mid-sentence and continues below; a
    short one had said all it had to say. Nothing else tells the two apart —
    plenty of examples end on an ordinary noun.
    """
    chunks = []
    def visit(text, cm, tm, font, size):
        if text.strip(): chunks.append((round(tm[4], 2), round(tm[5], 1), text, size))
    page.extract_text(visitor_text=visit)
    rows = {}
    for x, y, t, size in chunks:
        if BOTTOM < y < TOP: rows.setdefault(round(y), []).append((x, t, size))
    out = []
    for col in (0, 1):
        got = []
        for y in sorted(rows, reverse=True):
            items = [i for i in sorted(rows[y]) if (i[0] < GUTTER) == (col == 0)]
            if not items: continue
            line = re.sub(r'\s+', ' ', ' '.join(t for _, t, _s in items)).strip()
            if not line: continue
            last = items[-1]
            got.append((line, last[0] + len(last[1]) * last[2] * 0.5))
        for line, right in got:
            out.append((col, line, right))
    return out

MARGIN = {0: 1e9, 1: 1e9}   # the right-hand edge of each column; measured below

def measure(reader):
    """Where each column's text stops. Taken over the whole list rather than a
    page at a time: a page whose lines all happen to be short would otherwise
    set its own margin and read every one of them as having run out of room."""
    edges = {0: [], 1: []}
    for pno in range(FIRST - 1, LAST):
        for col, line, right in page_lines(reader.pages[pno]):
            edges[col].append(right)
    for col in (0, 1):
        e = sorted(edges[col])
        MARGIN[col] = e[int(len(e) * 0.98)]


POS = {'n','v','adj','adv','ad','prep','conj','det','pron','exclam','number',
       'phr v','mv','av','aux v','modal v','phr','pl','n pl','pl n','prep phr',
       'interj','abbr','art','quantifier','determiner','phr prep'}
POS_KEYS = {p.replace(' ', '') for p in POS}

def is_pos(inside):
    """'n', 'n & v', 'phr v' — and 'ad v', which is how one page prints 'adv'."""
    parts = [p.replace(' ', '') for p in re.split(r'[&,]', inside) if p.strip()]
    return bool(parts) and all(p in POS_KEYS for p in parts)

NOISE = re.compile(r'CUPA|Page \d+ of|B1 Preliminary|^(List|for Schools Vocabulary)$')
WRAPPED = '\u00ac'      # marks a line that ran to the column's right edge
TOKEN = re.compile(r'•|\([^()]*\)|\n|¬|[^\s•()¬]+|[()]')
ENDS  = re.compile(r'[.!?]$')
HANGING = {'a','an','the','is','are','was','were','has','have','had','been','be',
           'to','of','in','on','at','for','and','or','but','with','by','from',
           'my','your','his','her','its','our','their','this','that','these',
           'those','so','as','than','it','you','he','she','they','we','i',
           'about','into','over','under','after','before','no','not','some','any'}

def flow():
    """The whole list as one stream of tokens, in reading order.

    Entries are not one to a line: where a line has room left the next entry
    simply starts on it ('dinner (n) dinosaur', with '(n) diploma (n)' below),
    and an entry can be cut in half by a column or a page break. Reading the
    list as a stream and cutting it on the labels handles both.
    """
    reader = PdfReader(PDF)
    measure(reader)
    for pno in range(FIRST - 1, LAST):
        rows = page_lines(reader.pages[pno])
        for col in (0, 1):
            keep = [(l, right > MARGIN[col] - FULL) for c, l, right in rows if c == col
                    and not NOISE.search(l) and not (len(l) == 1 and l.isupper())]
            # Rows are joined by a marker, not dropped: where a row ends
            # matters, and whether it ended because it ran out of room. A
            # bracket left open at the end of one row still closes on the next,
            # since a group may hold the marker inside it.
            joined = '\n'.join(l + (WRAPPED if full else '') for l, full in keep)
            for tok in TOKEN.findall(joined):
                yield pno + 1, tok
            yield pno + 1, '\n'      # the foot of a column is a line break too

def headword_ahead(stream, i):
    """The next entry's headword, if what follows is an entry and not more of
    this example.

    A bare collocation — '• to be fond of something/someone' — can fill its
    line to the margin and so look as though it were cut off, when in fact the
    next entry follows. What settles it is the shape of what comes next: a
    headword is a word or three with a label right behind it and no full stop
    in between, which no continued sentence looks like.
    """
    run = []
    for _, t in stream[i + 1:]:
        if t in ('\n', WRAPPED): continue
        if t.startswith('(') and t.endswith(')') and len(t) > 2:
            if run and is_pos(re.sub(r'\s+', ' ', t[1:-1]).strip()):
                return ' '.join(run)
            return None
        if ENDS.search(t) or len(run) == 3: return None
        run.append(t)
    return None

KEY = lambda s: re.sub(r'[^a-z]', '', s.lower())
GROUP_FREE = re.compile(r'\s*\([^()]*\)')
TAIL = re.compile(r'\(([^()]*)\)$')

def rejoin(recs):
    """Put back a headword that was split across two entries.

    Where a line had room to spare, the next entry could start on it and be cut
    in half by the line ending: 'digital (adj) digital' with 'camera (n)' below
    is the entry 'digital camera (n)' wearing the word 'digital' as an example.
    """
    out, skip = [], False
    for n, r in enumerate(recs):
        if skip: skip = False; continue
        # The tell is that the leftover word repeats the headword itself, which
        # no example of it ever does.
        loose = r['ex'][0] if len(r['ex']) == 1 else None
        if loose and n + 2 < len(recs) and loose == GROUP_FREE.sub('', r['head']).strip():
            head = loose + ' ' + recs[n + 1]['head']
            here = KEY(GROUP_FREE.sub('', r['head']))
            after = KEY(GROUP_FREE.sub('', recs[n + 2]['head']))
            if here < KEY(GROUP_FREE.sub('', head)) < after:
                r = dict(r, ex=[])
                out.extend([r, {'head': head, 'ex': recs[n + 1]['ex'], 'page': r['page']}])
                skip = True
                continue
        out.append(r)
    return out

def unswallow(recs):
    """Recover an entry that an example swallowed.

    Where a bare collocation fills its line to the margin, the entry that
    follows can be read as more of the example: '• to get on with your work'
    and 'get rid of (phr v)' come out as one, and sometimes the entry lands as
    a whole example of its own. The list is alphabetical, so the test is
    whether the tail would sit where an entry belongs — after the word it was
    attached to and before the one that comes next. An example's own sense
    label ("I doubt that I'll get the job (v)") fails that test, since 'get the
    job' does not belong between 'doubt' and 'down'.
    """
    out = []
    for n, r in enumerate(recs):
        here = KEY(GROUP_FREE.sub('', r['head']))
        nxt = KEY(GROUP_FREE.sub('', recs[n + 1]['head'])) if n + 1 < len(recs) else 'zzzzz'
        out.append(r)
        cut = None
        for j, ex in enumerate(r['ex']):
            m = TAIL.search(ex)
            if not m or not is_pos(m.group(1)): continue
            words = ex[:m.start()].split()
            # Try the shortest headword first: in 'a good firm to work for
            # first (adj & adv)' only 'first' belongs between 'firm' and
            # 'first name', while 'work for first' plainly does not.
            for k in (1, 2, 3):
                if k > len(words): break
                word = ' '.join(words[-k:])
                rest = ' '.join(words[:-k]).strip()
                # What is left has to still read as an example. 'to study
                # physics (v)' would otherwise leave the word 'to' behind and
                # invent an entry called 'study physics'.
                if here < KEY(word) < nxt and (not rest or len(rest.split()) > 1):
                    cut = (j, rest, word + ' (' + m.group(1) + ')')
                    break
            if cut: break
        if not cut: continue
        j, rest, head = cut
        kept = r['ex'][:j] + ([rest] if rest else [])
        moved = r['ex'][j + 1:]
        r['ex'] = kept
        out.append({'head': head, 'ex': moved, 'page': r['page']})
    return out

def records():
    """One record per headword, with the examples Cambridge printed under it."""
    recs, buf, kind, cur, labelled, page = [], [], 'head', None, False, FIRST
    wrapped = False

    def take():
        text = re.sub(r'\s+', ' ', ' '.join(buf)).strip()
        del buf[:]
        return text

    stream = list(flow())
    for i, (pno, tok) in enumerate(stream):
        if not buf: page = pno
        group = tok.startswith('(') and tok.endswith(')') and len(tok) > 1
        if group: tok = re.sub(r'\s+', ' ', tok).replace('( ', '(').replace(' )', ')')

        if tok == WRAPPED:
            wrapped = True                        # this line ran to the margin
            continue

        if tok == '\n':
            # A row ends the example under way — unless what follows is the
            # label Cambridge hangs on the example itself ('Would you mind…?'
            # then '(v)'), or unless the line stopped in mid-sentence at the
            # margin. Neither signal is enough alone: '• I always use fresh
            # ingredients.' and '• There were no lemons so I got' end at
            # much the same place, and only the full stop tells them apart.
            nxt = next((t for _, t in stream[i + 1:] if t not in ('\n', WRAPPED)), '')
            # Whatever stands in brackets on the next line belongs to this
            # example — the label '(v)' or the gloss '(clear)' alike.
            tagged = nxt.startswith('(') and nxt.endswith(')') and len(nxt) > 2
            # A bracket closes an example as surely as a full stop does:
            # '• to go by jet (plane)' has said all it means to say.
            last = buf[-1] if buf else ''
            done = bool(ENDS.search(last)) or (last.startswith('(') and last.endswith(')'))
            # A line ending on a word that cannot end a sentence is still going,
            # however much room was left: 'My email address is' broke early
            # only because the address that follows it is one long word.
            if last.lower().strip(',') in HANGING: done, wrapped = False, True
            elif headword_ahead(stream, i): done = True
            if kind == 'ex' and buf and not tagged and (done or not wrapped):
                if cur: cur['ex'].append(take())
                kind, labelled = 'head', False
            # Two of Cambridge's examples lost their bullet in the PDF. A
            # headword never ends in a full stop without carrying its label
            # first, so a line that does is an example wearing no bullet.
            elif kind == 'head' and cur and buf and done and not labelled and not tagged:
                cur['ex'].append(take())
            wrapped = False
            continue

        if tok == '•':
            if buf:
                text = take()
                if kind == 'head':
                    cur = {'head': text, 'ex': [], 'page': page}; recs.append(cur)
                elif cur: cur['ex'].append(text)
            labelled, kind = False, 'ex'
            continue

        if group and is_pos(tok[1:-1]):
            buf.append(tok)
            labelled = True      # an entry has its label; an example, its own tag
            continue

        if labelled and group:
            buf.append(tok)                       # (Br Eng), (Am Eng: autumn) belong here
            continue

        if labelled:                              # a plain word: the next item has begun
            text = take()
            if kind == 'head':
                cur = {'head': text, 'ex': [], 'page': page}; recs.append(cur)
            elif cur: cur['ex'].append(text)
            labelled, kind, page = False, 'head', pno

        # Mid-row, a full stop only ends the example if what follows is a
        # headword rather than a second sentence: Cambridge sets its headwords
        # in lower case, so 'Do you give in? Shall I…' runs on while
        # 'Please leave comments below. common' does not. A gloss in brackets —
        # 'It's plain to me. (clear)' — belongs to the example either way.
        if kind == 'ex' and buf and ENDS.search(buf[-1]) and not group and tok[:1].islower():
            if cur: cur['ex'].append(take())
            kind, page = 'head', pno

        buf.append(tok)

    if buf:
        text = take()
        if kind == 'head': recs.append({'head': text, 'ex': [], 'page': page})
        elif cur: cur['ex'].append(text)
    return recs

RAW = None

def raw_text():
    """The same pages read the ordinary way. Words are laid down a chunk at a
    time, so rebuilding a line from coordinates has to guess where the spaces
    go and sometimes guesses wrong ('check - in', 'grand (d) ad'). This is the
    second opinion: a form is only closed up when the plain reading has it."""
    global RAW
    if RAW is None:
        reader = PdfReader(PDF)
        RAW = re.sub(r'\s+', ' ', ' '.join(
            reader.pages[i].extract_text() or '' for i in range(FIRST - 1, LAST)))
    return RAW

GLUE = ('-', '/', '’', "'")

def vocabulary():
    global VOCAB
    if VOCAB is None:
        VOCAB = set(re.findall(r"[A-Za-z][A-Za-z’']*", raw_text().lower()))
    return VOCAB

VOCAB = None

def respace(text):
    """Close up the spaces the rebuild opened, and only those."""
    raw = raw_text()
    parts = text.split(' ')
    # A stray single letter is never a word of its own: 'I almost dropped m y
    # cup' is one word split in two, and the plain reading has the same break,
    # so it cannot settle this one — the list's own vocabulary can.
    words = vocabulary()
    i = 0
    while i < len(parts):
        p = parts[i]
        if len(p) == 1 and p.isalpha() and p.lower() not in ('a', 'i'):
            if i + 1 < len(parts) and (p + parts[i + 1]).lower().strip('.,!?') in words:
                parts[i:i + 2] = [p + parts[i + 1]]; continue
            if i and (parts[i - 1] + p).lower().strip('.,!?') in words:
                parts[i - 1:i + 1] = [parts[i - 1] + p]; continue
        i += 1
    changed = True
    while changed:
        changed = False
        i = 0
        while i < len(parts) - 1:
            if parts[i] in GLUE and i:                    # 'T - shirt', 'so - so'
                trio = ''.join(parts[i - 1:i + 2])
                if trio in raw and ' '.join(parts[i - 1:i + 2]) not in raw:
                    parts[i - 1:i + 2] = [trio]; changed = True; i = max(0, i - 2); continue
            pair = parts[i] + parts[i + 1]
            if len(pair) >= 3 and pair in raw and (parts[i] + ' ' + parts[i + 1]) not in raw:
                parts[i:i + 2] = [pair]; changed = True; i = max(0, i - 1); continue
            i += 1
    # 'steal/ borrow' broke across two lines and came back with a space in it.
    return re.sub(r'(\w)/ (\w)', r'\1/\2', ' '.join(parts))

if __name__ == '__main__':
    recs = rejoin(unswallow(records()))
    for r in recs:
        r['head'] = respace(r['head'].replace(WRAPPED, ''))
        r['ex'] = [respace(e.replace(WRAPPED, '')) for e in r['ex']]
    print('records:', len(recs))
    bad = [r for r in recs if not any(is_pos(g) for g in re.findall(r'\(([^()]*)\)', r['head']))]
    print('without a part of speech:', len(bad))
    for b in bad[:20]: print('   ?', repr(b['head']), 'p%d' % b['page'])
    json.dump(recs, open('pv-records.json', 'w'), ensure_ascii=False, indent=0)
