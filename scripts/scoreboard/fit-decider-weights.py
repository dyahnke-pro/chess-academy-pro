"""THE DECIDER'S WEIGHTS, FITTED ON HIS GAMES (David 2026-11-05: "we train it
... by feeding these games and positions").

For every position of his with engine reads, the training rows
(src/services/danyaBench.measure.test.ts, DANYA_TRAIN) list each fact our one
composer computed there and the teaching moves its kind makes. His own tags
(the teaching moves HE made at that board, from his cleaned words) say which of
those he chose. The weight of a teaching move in a kind of moment is how often
he makes it when we have it to say:

    w(code | moment) = said / available, smoothed toward the coarser moment
                       (seat + phase), then toward the code over all moments.

A teaching move no lesson fact makes falls back to how often he makes it in
that kind of moment at all (his tags alone), scaled to the same range.

Held out: the 54 full games (his-games.json, >= 40 legal plies). They are the
test the replays judge; the weights never see them.

    python3 scripts/scoreboard/fit-decider-weights.py ROWS... --tags TAGS \
        --bank BANKDIR --games HISGAMES --out src/data/decider-weights.json

No word of his is read here: tags are codes, the bank is read for its boards.
"""
import argparse, collections, glob, json, os

ap = argparse.ArgumentParser()
ap.add_argument('rows', nargs='+')
ap.add_argument('--tags', required=True)
ap.add_argument('--bank', required=True)
ap.add_argument('--games', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--alpha', type=float, default=8.0)
a = ap.parse_args()

held = {g['id'] for g in json.load(open(a.games)) if not g['bad'] and g['plies'] >= 40}
tags = json.load(open(a.tags))

# His codes at each board: (video, board key) -> set of codes, live game only.
def board_key(fen):
    return ' '.join(fen.split(' ')[:4])

his = collections.defaultdict(set)
moment_of = {}
for f in glob.glob(os.path.join(a.bank, '*.json')):
    if f.endswith('_report.json'):
        continue
    b = json.load(open(f))
    vid = b['videoId']
    for idx, m in enumerate(b['moves']):
        t = tags.get(f'{vid}:{idx}')
        if not t or not m.get('fen'):
            continue
        codes = {c for c in t['codes'] if not c.startswith('X-')}
        his[(vid, board_key(m['fen']))] |= codes

def moment_kind(r):
    return 'capture' if r['capture'] else 'check' if r['check'] else 'castle' if r['castle'] else 'quiet'

def buckets(r):
    seat = 'own' if r['own'] else 'theirs'
    return [f"{seat}|{r['phase']}|{moment_kind(r)}", f"{seat}|{r['phase']}", '*']

avail = collections.Counter(); said = collections.Counter()
# Their tags alone: how often he makes a code in a kind of moment.
moments = collections.Counter(); made = collections.Counter()
train_rows = 0; test_rows = []
for path in a.rows:
    for line in open(path):
        line = line.strip()
        if not line:
            continue
        r = json.loads(line)
        if r['vid'] in held:
            test_rows.append(r)
            continue
        key = (r['vid'], r['board'])
        if key not in his:
            continue
        train_rows += 1
        mine = his[key]
        for bk in buckets(r):
            moments[bk] += 1
            for c in mine:
                made[(bk, c)] += 1
        seen = set()
        for fct in r['facts']:
            for c in fct['codes']:
                if c in seen:
                    continue
                seen.add(c)
                for bk in buckets(r):
                    avail[(bk, c)] += 1
                    if c in mine:
                        said[(bk, c)] += 1

codes = sorted({c for (_, c) in avail} | {c for (_, c) in made})
bucket_names = sorted({bk for (bk, _) in avail} | {bk for (bk, _) in made})

def rate(bk, c):
    """Said when available, smoothed to the coarser bucket, then the code."""
    parts = bk.split('|')
    parent = '*' if len(parts) <= 2 else '|'.join(parts[:2])
    if bk == '*':
        n, k = avail[('*', c)], said[('*', c)]
        base = made[('*', c)] / max(1, moments['*'])
        return (k + a.alpha * base) / (n + a.alpha) if n else base
    p = rate(parent, c)
    n, k = avail[(bk, c)], said[(bk, c)]
    if n == 0:
        # Never available here: how often he makes it in this moment at all,
        # relative to the coarser moment, carried on the parent's rate.
        m_here = made[(bk, c)] / max(1, moments[bk])
        m_parent = made[(parent, c)] / max(1, moments[parent])
        return p if m_parent == 0 else min(1.0, p * (m_here / m_parent if m_parent else 1.0))
    return (k + a.alpha * p) / (n + a.alpha)

weights = {bk: {c: round(rate(bk, c), 4) for c in codes} for bk in bucket_names}
out = {
    'about': 'How often Danya makes each teaching move when the coach has it to say, by kind of moment (seat|phase|move). Fitted by scripts/scoreboard/fit-decider-weights.py on his live games; the 54 full games held out.',
    'trainPositions': train_rows,
    'heldOutVideos': len(held),
    'weights': weights,
}
json.dump(out, open(a.out, 'w'), indent=1, sort_keys=True)

# Held-out check: at each test position, does the learned order put one of
# his teaching moves first more often than the decider as it stands?
def first_hit(r, order):
    key = (r['vid'], r['board'])
    mine = his.get(key)
    if not mine:
        return None
    facts = [f for f in r['facts'] if f['codes']]
    if not facts:
        return None
    best = order(r, facts)
    return 1 if any(c in mine for c in best['codes']) else 0

def learned(r, facts):
    bk = buckets(r)[0]
    w = weights.get(bk) or weights['*']
    return max(facts, key=lambda f: (f['stake'] or 0) if (f['stake'] or 0) > 0 and f['step'] == 'danger' else max(w.get(c, 0) for c in f['codes']))

def current(r, facts):
    kept = [f for f in facts if f['kept']]
    return kept[0] if kept else facts[0]

h_l = [x for x in (first_hit(r, learned) for r in test_rows) if x is not None]
h_c = [x for x in (first_hit(r, current) for r in test_rows) if x is not None]
print(f'train positions {train_rows}; held-out positions scored {len(h_l)}')
print(f'his teaching move said first — current decider {sum(h_c)/max(1,len(h_c)):.1%}, learned weights {sum(h_l)/max(1,len(h_l)):.1%}')
top = sorted(((weights['*'][c], c) for c in codes), reverse=True)[:12]
print('highest overall:', ', '.join(f'{c} {w:.2f}' for w, c in top))
