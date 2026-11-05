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
import argparse, collections, glob, json, os, re

# The Learn lanes that lead by what is at stake (learnTurnDoor DANGER_LANES and
# the tactic lane): never weighed by a learned rate.
STAKE_LANES = {'threat', 'dangerLevels', 'threatAnswer', 'tactic'}

ap = argparse.ArgumentParser()
ap.add_argument('rows', nargs='+')
ap.add_argument('--tags', required=True)
ap.add_argument('--bank', required=True)
ap.add_argument('--games', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--alpha', type=float, default=8.0)
# Learn's own kinds (what they're going for, the speedrun read, the plan line…)
# never reach the lesson composer, so the bench never offers them. A Learn
# replay with every line captured (scripts/audit-learn-replay.mjs, EVERYTHING=1)
# lists every line the door weighed at each turn; these measure those kinds.
# The replayed games leave the test set: they are listed in the output.
ap.add_argument('--replays', nargs='*', default=[])
ap.add_argument('--teaching-moves', help='TEACHING_MOVES as JSON (needed with --replays)')
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
# Per KIND of fact (a computer's idea): how often he makes any of its teaching
# moves when that computer has it to say. Codes alone take a multi-code kind's
# best code, which inflates a generic line ("their move is for X" read as a plan).
kavail = collections.Counter(); ksaid = collections.Counter()
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
        kseen = set()
        for fct in r['facts']:
            k = fct['kind']
            if not fct['codes'] or k in kseen:
                continue
            kseen.add(k)
            hit = any(c in mine for c in fct['codes'])
            for bk in buckets(r):
                kavail[(bk, k)] += 1
                if hit:
                    ksaid[(bk, k)] += 1
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

kinds = sorted({k for (_, k) in kavail})
def krate(bk, k):
    parts = bk.split('|')
    if bk == '*':
        n, s_ = kavail[('*', k)], ksaid[('*', k)]
        return s_ / n if n else 0.0
    parent = '*' if len(parts) <= 2 else '|'.join(parts[:2])
    p = krate(parent, k)
    n, s_ = kavail[(bk, k)], ksaid[(bk, k)]
    return (s_ + a.alpha * p) / (n + a.alpha)
kind_weights = {bk: {k: round(krate(bk, k), 4) for k in kinds} for bk in bucket_names}

# Learn's own kinds, from the replays: at each turn he spoke on, every line the
# Learn door weighed (said or held — the capture does not depend on the
# decider), and whether he made one of its kind's teaching moves at that turn.
# Only kinds the bench never offered; smoothed toward the replays' overall
# rate. Measured over all moments ('*'): too few turns to split by seat and
# phase, so these kinds keep their lanes' own phase rule.
replay_vids = []
if a.replays:
    TM = json.load(open(a.teaching_moves))
    by_ply = collections.defaultdict(set)
    for k, t in tags.items():
        if t.get('segment') == 'game':
            by_ply[(k.rsplit(':', 1)[0], t['ply'])] |= {c for c in t['codes'] if not c.startswith('X-')}
    ravail = collections.Counter(); rhit = collections.Counter()
    for path in a.replays:
        vid = os.path.basename(path).split('learn-replay-')[1].rsplit('-2026', 1)[0]
        if vid in replay_vids:
            continue
        replay_vids.append(vid)
        for t in json.load(open(path))['turns']:
            p = int(t['ply'])
            mine = by_ply.get((vid, p), set()) | by_ply.get((vid, p + 1), set())
            if not mine:
                continue
            seen = {}
            for e in t.get('everything') or []:
                if e.get('surface') != 'learn':
                    continue
                for line in e['lines']:
                    # Danger and tactics speak by what is at stake (their lanes
                    # lead the turn); their kinds keep the lanes' numbers.
                    lane = re.search(r'\(([^)]+)\)\s*$', line.get('computer') or '')
                    if lane and lane.group(1) in STAKE_LANES:
                        continue
                    seen[(str(line['kind']), line['text'][:60])] = str(line['kind'])
            for k in seen.values():
                ravail[k] += 1
                rhit[k] += bool(set(TM.get(k, [])) & mine)
    prior = sum(rhit.values()) / max(1, sum(ravail.values()))
    for k in ravail:
        if k in kind_weights['*'] or k == 'None':
            continue
        kind_weights['*'][k] = round((rhit[k] + a.alpha * prior) / (ravail[k] + a.alpha), 4)
        kavail[('*', k)] = ravail[k]
    kinds = sorted(set(kinds) | {k for k in ravail if k != 'None'})
out = {
    'about': 'How often Danya makes each teaching move when the coach has it to say, by kind of moment (seat|phase|move). Fitted by scripts/scoreboard/fit-decider-weights.py on his live games; the 54 full games held out.',
    'trainPositions': train_rows,
    'heldOutVideos': len(held),
    'weights': weights,
    'kindWeights': kind_weights,
    'kindAvailable': {k: kavail[('*', k)] for k in kinds},
    'tunedOnReplays': replay_vids,
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
    bk = '|'.join(buckets(r)[0].split('|')[:2])
    kw = kind_weights.get(bk) or kind_weights['*']
    w = weights.get(bk) or weights['*']
    def worth(f):
        if (f['stake'] or 0) > 0 and f['step'] == 'danger':
            return 10 + f['stake']
        return kw[f['kind']] if f['kind'] in kw else sum(w.get(c, 0) for c in f['codes']) / len(f['codes'])
    return max(facts, key=worth)

def current(r, facts):
    kept = [f for f in facts if f['kept']]
    return kept[0] if kept else facts[0]

h_l = [x for x in (first_hit(r, learned) for r in test_rows) if x is not None]
h_c = [x for x in (first_hit(r, current) for r in test_rows) if x is not None]
print(f'train positions {train_rows}; held-out positions scored {len(h_l)}')
print(f'his teaching move said first — current decider {sum(h_c)/max(1,len(h_c)):.1%}, learned weights {sum(h_l)/max(1,len(h_l)):.1%}')
top = sorted(((weights['*'][c], c) for c in codes), reverse=True)[:12]
print('highest overall:', ', '.join(f'{c} {w:.2f}' for w, c in top))
ktop = sorted(((kind_weights['*'][k], k) for k in kinds), reverse=True)
print('by kind:', ', '.join(f'{k} {w:.2f} (n={kavail[("*", k)]})' for w, k in ktop))
