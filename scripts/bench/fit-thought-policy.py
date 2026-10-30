#!/usr/bin/env python3
"""FIT HOW OFTEN EACH COMPUTER IS CHOSEN (WO-ONE-COACH-01 Build 5, David
2026-10-30: "adjust how often they get chosen, to get us as close to Danya's
teaching as possible. Do this over and over").

  DANYA_BENCH=1 DANYA_BENCH_READS=<reads> DANYA_BENCH_SOURCES=lesson \\
    DANYA_BENCH_DUMP=<dump.jsonl> npx vitest run src/services/danyaBench.measure.test.ts
  python3 scripts/bench/fit-thought-policy.py <dump.jsonl> [--write]

Coordinate descent on the TRAINING half of his videos over the second job's
floor and gap and one offset per computer, STARTING FROM THE SHIPPED POLICY
(src/data/thought-policy.json) so each run improves on the last; a step is
taken only when it gains more than MIN_GAIN on the training objective (below
that the half-split's noise decides). The TEST half is scored, never tuned on.
Objective: his ideas said + his lead idea said + 0.5 x the share of spoken
facts that match one of his ideas, at most 25 words a note (his average). The
small policy generalised better than a fit per computer-and-idea (42.2% / 31.8%
held out against 41.1% / 31.1%), and the precision term keeps it from buying
coverage with filler (without it: 43.2% of his ideas, but 25.5 words and only
26.8% of what is said matching him). --write updates src/data/thought-policy.json.
"""
import copy, json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from thought_replay import load, compose, covers, train_half, extended, BASE

LAMBDA, WMAX, MIN_GAIN = 0.5, 25.0, 0.02
notes = load(sys.argv[1], extended())

def evaluate(P, half):
    n = a = l = w = hit = tot = 0
    for note in notes:
        if not note['danya'] or (half != 'all' and train_half(note['video']) != (half == 'train')):
            continue
        chosen = compose(note['facts'], P)
        ideas = [i for f, also in chosen for i in (f['alsoIdeas'] if also else f['ideas'])]
        n += 1; a += any(covers(ideas, d) for d in note['danya']); l += covers(ideas, note['danya'][0])
        w += sum(f['alsoWords'] if also else f['words'] for f, also in chosen)
        for f, also in chosen:
            tot += 1; hit += any(covers(f['alsoIdeas'] if also else f['ideas'], d) for d in note['danya'])
    return {'notes': n, 'any': 100 * a / n, 'lead': 100 * l / n, 'words': w / n, 'precision': 100 * hit / max(1, tot)}

def objective(P):
    s = evaluate(P, 'train')
    return s['any'] + s['lead'] + LAMBDA * s['precision'] - max(0.0, s['words'] - WMAX) * 2.0

sources = sorted({f['source'] for n in notes for f in n['facts']})
POLICY_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'data', 'thought-policy.json')
shipped = json.load(open(POLICY_PATH))
P = {**copy.deepcopy(BASE), 'floor': shipped['floor'], 'gap': shipped['gap'], 'woff': dict(shipped['offsets'])}
best = objective(P)
for _ in range(6):
    improved = False
    for lever, values in (('floor', [10, 20, 30, 40, 50, 60, 70]), ('gap', [5, 10, 15, 20, 30, 40, 60])):
        for v in values:
            Q = copy.deepcopy(P); Q[lever] = v; o = objective(Q)
            if o > best + MIN_GAIN:
                best, P, improved = o, Q, True
    for src in sources:
        cur = P['woff'].get(src, 0)
        for d in (-30, -25, -20, -10, -5, 5, 10, 20, 30):
            Q = copy.deepcopy(P); Q['woff'][src] = cur + d; o = objective(Q)
            if o > best + MIN_GAIN:
                best, P, improved = o, Q, True
    if not improved:
        break
before, after = evaluate(BASE, 'test'), evaluate(P, 'test')
r = lambda s: {k: round(v, 2) if isinstance(v, float) else v for k, v in s.items()}
print('held out, before:', r(before))
print('held out, after: ', r(after))
print('policy:', json.dumps({'floor': P['floor'], 'gap': P['gap'], 'offsets': P['woff']}))
if '--write' in sys.argv:
    path = POLICY_PATH
    doc = json.load(open(path))
    doc.update({'floor': P['floor'], 'gap': P['gap'], 'offsets': dict(sorted(P['woff'].items(), key=lambda kv: -kv[1])),
                'heldOut': {'notes': after['notes'],
                            'before': {k: round(before[k], 2) for k in ('any', 'lead', 'words', 'precision')},
                            'after': {k: round(after[k], 2) for k in ('any', 'lead', 'words', 'precision')}}})
    json.dump(doc, open(path, 'w'), indent=2)
    print('wrote', os.path.normpath(path))
