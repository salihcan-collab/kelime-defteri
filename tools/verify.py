"""Check the extraction against the same PDF read the ordinary way."""
import json, re
from plan import parse, FULLNAME

R = json.load(open('pv-records.json'))
raw = open('pv-raw.txt').read()
flat = re.sub(r'\s+', ' ', raw)

def candidates():
    """Headwords the plain reading can see. It mangles the columns, so this is
    not the truth — but anything it finds and we do not is worth looking at."""
    lines = []
    for p in raw.split('===== PAGE ')[1:]:
        n = int(p.split(' ')[0])
        if 4 <= n <= 40: lines.extend(p.split('\n')[1:])
    pat = re.compile(r'^\s*([a-zA-Z][^()•]*?)\s*\(([^()]*)\)\s*$')
    out = set()
    for l in lines:
        m = pat.match(l.rstrip())
        if not m: continue
        parts = [x.replace(' ', '') for x in re.split(r'[&,]', m.group(2)) if x.strip()]
        if parts and all(x in FULLNAME for x in parts): out.add(m.group(1).strip().lower())
    return out

mine = {parse(r['head'])[0].lower() for r in R}
missing = sorted(c for c in candidates() - mine if not re.search(r'[.!?]$', c))
heads = [r['head'] for r in R]
terms = [parse(r['head'])[0] for r in R]
key = lambda s: re.sub(r'[^a-z]', '', s.lower())
disorder = [(terms[i-1], terms[i]) for i in range(1, len(terms)) if key(terms[i]) < key(terms[i-1])]
# Cambridge's own list is not perfectly sorted, so a pair out of order here is
# only a fault if the PDF has it the other way round. The full entry text is
# what gets looked up: a bare word like 'go' turns up everywhere.
pos = {}
for h in heads: pos[h] = flat.find(re.sub(r'\s*\(', ' (', h)[:40])
pairs = [(heads[i-1], heads[i]) for i in range(1, len(heads)) if key(terms[i]) < key(terms[i-1])]
kept = [p for p in pairs if pos.get(p[0], -1) >= 0 and pos.get(p[1], -1) >= 0
        and pos[p[0]] > pos[p[1]]]

print('records          %d' % len(R))
print('examples         %d' % sum(len(r['ex']) for r in R))
print('no part of speech %d' % sum(1 for r in R if not parse(r['head'])[1]))
print('empty headword    %d' % sum(1 for t in terms if not t))
print('missing headwords %d  %s' % (len(missing), missing))
print('out of order      %d, of which the PDF itself has %d that way'
      % (len(disorder), len(disorder) - len(kept)))
if kept: print('   genuinely wrong:', kept)
