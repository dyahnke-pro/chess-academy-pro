"""THE READ DECIDER, FITTED ON HIS READS OF POSITIONS (David 2026-11-18: "get the
decider working" → "feed danya's reads of the positions into the decider to
train it").

Two kinds of his reads train it:
  - ARTICLES: his written read of a board, labelled fact by fact (`bestOrder`,
    labels-*.json — indices into the app's facts, never his words);
  - VIDEOS: what he says at a board in his games and their analysis, tagged
    with teaching codes (his-bank-tags-clean.json). A fact the app computes is
    in his read when its codes meet his; his order is the order of his codes.

Every fact the app computes on each board comes from scripts/board-facts-dump.ts.
The table: how often each kind of fact (by where it came from, its depth, its
stakes band) is in his read when the app has it, and the mean place each kind
takes in his order. Read by src/services/readDecider.ts. The proof is the
articles held out (every other one): their hand labels are the cleanest read.

    python3 scripts/scoreboard/fit-read-decider.py --articles FACTS LABELS... \
        --videos TAGS VFACTS... --out src/data/read-decider.json
"""
import argparse, collections, json

ap = argparse.ArgumentParser()
ap.add_argument('--articles', nargs='+', required=True)
ap.add_argument('--videos', nargs='*', default=[])
ap.add_argument('--video-weight', type=float, default=None)
ap.add_argument('--out')
a = ap.parse_args()

def load_facts(paths):
    out = {}
    for p in paths:
        for l in open(p):
            r = json.loads(l); out[r['id']] = r['facts']
    return out

art_facts = load_facts([a.articles[0]])
articles = [dict(id=b['id'], group=b['id'].split('#')[0], facts=art_facts[b['id']], best=[i for i in b['bestOrder'] if i < len(art_facts[b['id']])], false=set(b['false']), pointless=set(b['pointless']))
            for f in a.articles[1:] for b in json.load(open(f))['boards'] if b.get('boardRead') and b['id'] in art_facts]
articles.sort(key=lambda b: b['id'])

videos = []
if a.videos:
    tags = json.load(open(a.videos[0]))
    his = collections.defaultdict(list)
    for k in sorted(tags, key=lambda k: (k.rsplit(':', 1)[0], int(k.rsplit(':', 1)[1]))):
        v = tags[k]; his[f"{k.rsplit(':', 1)[0]}@{v['ply']}"] += [c for c in v['codes'] if c != 'X-NARRATION']
    for vid, fs in sorted(load_facts(a.videos[1:]).items()):
        codes = his.get(vid)
        if not codes or not fs: continue
        place = {}
        for i, f in enumerate(fs):
            hits = [codes.index(c) for c in (f.get('codes') or []) if c in codes]
            if hits: place[i] = min(hits)
        videos.append(dict(id=vid, group=vid.split('@')[0], facts=fs, best=sorted(place, key=lambda i: (place[i], i))))

MIN_N, KEEP = 6, 0.3
def band(s): return 'none' if s is None else ('hi' if s >= 2000 else 'mid' if s >= 1200 else 'lo')
def feats(f): return [f"k|{f['from']}|{f['kind']}", f"kd|{f['kind']}|{f.get('depth')}", f"ks|{f['kind']}|{band(f.get('stake'))}", f"k1|{f['kind']}"]

def fit(sets):
    cnt = collections.defaultdict(lambda: [0.0, 0.0]); pos = collections.defaultdict(lambda: [0.0, 0.0]); said = total = 0.0
    for boards, w in sets:
        for b in boards:
            B = set(b['best'])
            for i, f in enumerate(b['facts']):
                for k in feats(f): cnt[k][0] += w * (i in B); cnt[k][1] += w
            for r, i in enumerate(b['best']):
                x = pos[b['facts'][i]['kind']]; x[0] += w * (r / (len(b['best']) - 1) if len(b['best']) > 1 else 0.0); x[1] += w
            said += w * len(B); total += w * len(b['facts'])
    return {'prior': said / max(1, total), 'minN': MIN_N, 'keep': KEEP, 'rates': {k: [round(v[0], 3), round(v[1], 3)] for k, v in cnt.items()},
            'order': {k: round(v[0] / v[1], 4) for k, v in pos.items() if v[1]}}

def p(t, f):
    for k in feats(f):
        y, n = t['rates'].get(k, (0, 0))
        if n >= t['minN']: return (y + 2 * t['prior']) / (n + 2)
    y, n = t['rates'].get(f"k1|{f['kind']}", (0, 0)); return (y + 2 * t['prior']) / (n + 2)

def pick(t, fs):
    keep = [i for i, f in enumerate(fs) if p(t, f) >= t['keep']]
    keep.sort(key=lambda i: (t['order'].get(fs[i]['kind'], 0.5), -p(t, fs[i])))
    seen, out = set(), []
    for i in keep:
        k = (fs[i]['kind'], fs[i]['text'][:40])
        if k in seen: continue
        seen.add(k); out.append(i)
    return out

def score(sel, chooser):
    pk = hit = fal = pt = best = lead = 0
    for b in sel:
        S = chooser(b['facts']); B = set(b['best'])
        pk += len(S); best += len(B); hit += sum(i in B for i in S)
        fal += sum(i in b.get('false', ()) for i in S); pt += sum(i in b.get('pointless', ()) for i in S)
        lead += bool(S and b['best'] and S[0] == b['best'][0])
    r = dict(boards=len(sel), perBoard=round(pk / max(1, len(sel)), 1), inHisRead=round(100 * hit / max(1, pk)), foundOfHis=round(100 * hit / max(1, best)), sameLead=round(100 * lead / max(1, len(sel))))
    if sel and 'false' in sel[0]: r.update(false=round(100 * fal / max(1, pk)), pointless=round(100 * pt / max(1, pk)))
    return r

def split(boards):
    g = sorted({b['group'] for b in boards}); test = set(g[1::2])
    return [b for b in boards if b['group'] not in test], [b for b in boards if b['group'] in test]
a_tr, a_te = split(articles); v_tr, v_te = split(videos)
today = lambda fs: [i for i, f in enumerate(fs) if f.get('keptToday')]
print(f'articles {len(articles)}  video boards {len(videos)}')
print('ARTICLES held out (hand labels)')
print('  today            ', score(a_te, today))
runs = [('articles only', [(a_tr, 1.0)])]
weights = [a.video_weight] if a.video_weight is not None else [0.05, 0.2, 1.0]
if videos:
    runs += [('videos only', [(v_tr + v_te, 1.0)])] + [(f'both, video x{w}', [(a_tr, 1.0), (v_tr + v_te, w)]) for w in weights]
for name, sets in runs:
    t = fit(sets); print(f'  {name:17}', score(a_te, lambda fs: pick(t, fs)))
if videos:
    print('VIDEOS held out (his codes)')
    print('  today            ', score(v_te, today))
    for name, sets in [('articles only', [(a_tr, 1.0)]), ('videos', [(v_tr, 1.0)])] + [(f'both, video x{w}', [(a_tr, 1.0), (v_tr, w)]) for w in weights]:
        t = fit(sets); print(f'  {name:17}', score(v_te, lambda fs: pick(t, fs)))
if a.out:
    w = weights[0] if videos else 0
    table = fit([(articles, 1.0)] + ([(videos, w)] if videos else []))
    table['about'] = "How often his reads of positions (his written articles, and his games and their analysis in his videos) say each kind of fact the app computes on a board, and where in his order. Fitted by scripts/scoreboard/fit-read-decider.py; read by src/services/readDecider.ts."
    table['trainedOn'] = {'articleBoards': len(articles), 'videoBoards': len(videos), 'videoWeight': w}
    json.dump(table, open(a.out, 'w'), indent=1, sort_keys=True)
    print('wrote', a.out, len(table['rates']), 'rates')
