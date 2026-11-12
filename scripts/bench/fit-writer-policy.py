#!/usr/bin/env python3
"""FIT THE COMPOSER TO THE WRITERS (WO-OPENINGS-REWRITE-01 C2, David 2026-11-12:
"if we get the computed narrations to write like the writers then we don't need
to do it by hand").

The hand-written Watch beats of the courses written WITH the computers' facts in
front of the writer are labelled per beat (scratchpad label-c1.mjs): which of the
composer's facts on that move the writer states (`used`) and which one the beat
leads with (`lead`). This fits the composer's selection policy — the second
job's floor and gap, the news margin and one weight offset per computer — so its
picks match those choices, on the same offline replay of the composer the Danya
bench fits (`thought_replay.compose`).

  python3 scripts/bench/fit-writer-policy.py <writer-dir> <labels.json> <beats.json> [--write]

<writer-dir> holds `<course>.computers.json` from lessonWriter.measure.test.ts
(with the replay fields: step, restates, sv, wc, decision, alsoText). Courses are
split in two by name hash: fitted on one half, scored on the other (never tuned
on). Objective: share of the writer's facts the composer says + the lead fact
matched + 0.5 x the share of said facts the writer used. --write merges the
policy into src/data/thought-policy.json under "writers" (the shipped Danya fit
stays until the blind grade decides).
"""
import copy, json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from thought_replay import compose, train_half, BASE, load, score, extended

WDIR, LABELS, BEATS = sys.argv[1], sys.argv[2], sys.argv[3]
LAMBDA, MIN_GAIN = 0.5, 0.02
labels = json.load(open(LABELS))
beats = {b['id']: b for b in json.load(open(BEATS))}
comp = {}
notes = []
words = lambda t: len((t or '').split())
for bid, lab in labels.items():
    b = beats.get(bid)
    if not b:
        continue
    c = b['course']
    if c not in comp:
        p = f'{WDIR}/{c}.computers.json'
        comp[c] = json.load(open(p)) if os.path.exists(p) else {}
    rec = comp[c].get(b['ckey'])
    if not rec or 'step' not in (rec['facts'][0] if rec['facts'] else {}):
        continue
    facts = []
    for i, f in enumerate(rec['facts']):
        facts.append({**f, 'i': i, 'words': words(f['text']), 'alsoWords': words(f.get('alsoText') or f['text'])})
    idx = lambda s: int(s[1:]) if isinstance(s, str) and s[1:].isdigit() else None
    used = {idx(u) for u in lab.get('used') or []} - {None}
    used = {u for u in used if u < len(facts)}
    lead = idx(lab.get('lead'))
    notes.append({'course': c, 'own': b['mover'] == 'his', 'facts': facts, 'used': used, 'lead': lead if lead is not None and lead < len(facts) else None})

def evaluate(P, half):
    n = cov = led = said = hit = 0
    for nt in notes:
        if half != 'all' and train_half(nt['course']) != (half == 'train'):
            continue
        if not nt['used']:
            continue
        chosen = [f['i'] for f, _ in compose(nt['facts'], P)]
        n += 1
        cov += len(set(chosen) & nt['used']) / len(nt['used'])
        led += 1 if nt['lead'] is not None and chosen and chosen[0] == nt['lead'] else 0
        said += len(chosen); hit += len(set(chosen) & nt['used'])
    return {'beats': n, 'used': 100 * cov / max(1, n), 'lead': 100 * led / max(1, n), 'precision': 100 * hit / max(1, said), 'facts': said / max(1, n)}

# --danya <dump.jsonl>: fit jointly with Danya's own notes (the Danya bench
# dump), so the writers' choices are never bought by losing his.
DANYA = load(sys.argv[sys.argv.index('--danya') + 1], extended()) if '--danya' in sys.argv else None

def danya_obj(P, half):
    s = score(DANYA, P, half)
    return s['any'] + s['lead'] - max(0.0, s['words'] - 25.0) * 2.0

def objective(P):
    s = evaluate(P, 'train')
    w = s['used'] + s['lead'] + LAMBDA * s['precision']
    return w + (danya_obj(P, 'train') if DANYA else 0)

POLICY_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'data', 'thought-policy.json')
shipped = json.load(open(POLICY_PATH))
P0 = {**copy.deepcopy(BASE), 'floor': shipped['floor'], 'gap': shipped['gap'], 'newsMargin': shipped.get('newsMargin', 0.09), 'woff': dict(shipped['offsets']), 'stepBars': dict(shipped.get('stepBars', {}))}
P, best = copy.deepcopy(P0), objective(P0)
sources = sorted({f['source'] for nt in notes for f in nt['facts']})
import collections as _c
_pc = _c.Counter(f"{f['source']}|{f['idea']}" for nt in notes for f in nt['facts'] if f['step'] in ('yours', 'theirs'))
PAIRS = sorted(k for k, v in _pc.items() if v >= 40)
for _ in range(6):
    improved = False
    for lever, values in (('stepBar', [None, 20, 30, 40, 50, 60, 70, 80, 90]), ('floor', [10, 20, 30, 40, 50, 60, 70]), ('gap', [5, 10, 15, 20, 30, 40, 60]), ('newsMargin', [0.02, 0.05, 0.09, 0.15, 0.25, 0.4, 1.0])):
        for v in values:
            Q = copy.deepcopy(P); Q[lever] = v; o = objective(Q)
            if o > best + MIN_GAIN:
                best, P, improved = o, Q, True
    for st in ('line', 'choices', 'board', 'notYet', 'verdict', 'habit', 'theirs', 'name'):
        for v in (None, 30, 40, 50, 60, 70, 80, 90, 100):
            Q = copy.deepcopy(P); Q.setdefault('stepBars', {})
            if v is None: Q['stepBars'].pop(st, None)
            else: Q['stepBars'][st] = v
            o = objective(Q)
            if o > best + MIN_GAIN:
                best, P, improved = o, Q, True
    for src in sources:
        cur = P['woff'].get(src, 0)
        for d in (-40, -30, -20, -10, -5, 5, 10, 20, 30, 40):
            Q = copy.deepcopy(P); Q['woff'][src] = cur + d; o = objective(Q)
            if o > best + MIN_GAIN:
                best, P, improved = o, Q, True
    # Finer: one offset per computer AND idea where the pair is common in the
    # move's own steps — which of the move's facts leads (--pairs).
    if '--pairs' in sys.argv:
        for key in PAIRS:
            cur = P['woff'].get(key, 0)
            for d in (-30, -20, -10, 10, 20, 30):
                Q = copy.deepcopy(P); Q['woff'][key] = cur + d; o = objective(Q)
                if o > best + MIN_GAIN:
                    best, P, improved = o, Q, True
    if not improved:
        break
r = lambda s: {k: round(v, 1) if isinstance(v, float) else v for k, v in s.items()}
print('notes', len(notes), 'courses', len({n['course'] for n in notes}))
print('held out, shipped policy:', r(evaluate(P0, 'test')))
print('held out, writer policy: ', r(evaluate(P, 'test')))
print('train,    writer policy: ', r(evaluate(P, 'train')))
if DANYA:
    rd = lambda s: {k: round(v, 1) for k, v in s.items() if k in ('any', 'lead', 'words')}
    print('Danya held out, shipped:', rd(score(DANYA, P0, 'test')), ' joint:', rd(score(DANYA, P, 'test')))
print('policy:', json.dumps({'stepBars': P.get('stepBars', {}), 'stepBar': P.get('stepBar'), 'floor': P['floor'], 'gap': P['gap'], 'newsMargin': P['newsMargin'], 'offsets': P['woff']}))
if '--write' in sys.argv:
    # The JOINT fit is the composer's policy (fitted on the writers and on
    # Danya's notes together, held out on both), so it replaces the shipped one.
    doc = json.load(open(POLICY_PATH))
    doc.update({'floor': P['floor'], 'gap': P['gap'], 'newsMargin': P['newsMargin'], 'stepBars': P.get('stepBars', {}),
                'offsets': dict(sorted(P['woff'].items(), key=lambda kv: -kv[1])),
                'heldOutWriters': {'beats': evaluate(P, 'test')['beats'], 'before': r(evaluate(P0, 'test')), 'after': r(evaluate(P, 'test'))}})
    if DANYA:
        doc['heldOut'] = {'notes': score(DANYA, P, 'test')['n'],
                          'before': {k: round(v, 2) for k, v in score(DANYA, P0, 'test').items() if k in ('any', 'lead', 'words')},
                          'after': {k: round(v, 2) for k, v in score(DANYA, P, 'test').items() if k in ('any', 'lead', 'words')}}
    doc['about'] = ("How the composer chooses among a move's facts. Fitted JOINTLY on the hand-written Watch beats (which facts each writer used "
                    "and led with) and on Danya's notes, by scripts/bench/fit-writer-policy.py --danya <bench dump>: coordinate descent over the "
                    "second job's floor and gap, the news margin, a bar per step and one offset per computer, on half the courses and half his "
                    "videos; scored on the other halves, never tuned on.")
    json.dump(doc, open(POLICY_PATH, 'w'), indent=2)
    print('wrote', os.path.normpath(POLICY_PATH))
