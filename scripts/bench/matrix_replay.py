#!/usr/bin/env python3
"""THE STORY MATRIX, REPLAYED ON THE DANYA BENCH (WO-STORY-MATRIX-01 Phase 2).

The matrix the plan describes (PLAN.md WO-STORY-MATRIX-01, PHASE 2): the
facts a move earned run a bracket —
  1 qualify (words, a proof that may lead), 2 merge (one claim, one entry),
  3 story (said before: out), 4 region final (score = stakes x story x
  student x proof per region: A story, B threat, C decision, D knowledge,
  E habit), 5 the final (the region champions meet; the top score leads),
  6 the thread (each next seat, in Danya's order, goes to the champion with
  the strongest link to what was said: cause -> effect 3, same line 2, same
  decision 2, same thread 1, square only 0; no link, no seat).
Scored against today's composer (`thought_replay.compose`) on the same dump,
held-out half, so a variant is measured in seconds:

  python3 scripts/bench/matrix_replay.py <dump.jsonl>
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from thought_replay import load, compose, covers, train_half, extended, BASE, STEP_ORDER, same_idea

GROUP_REGION = {
    'story': 'A', 'name': 'A', 'structure': 'A', 'verdict': 'A',
    'danger': 'B', 'theirSide': 'B', 'notYet': 'B',
    'move': 'C', 'choices': 'C', 'line': 'C',
    'tactics': 'D', 'technique': 'D', 'concepts': 'D',
    'habit': 'E',
}

def link(a, b, P):
    """The strongest link between two facts."""
    if set(a.get('causes') or []) & set(b.get('needs') or []) or set(b.get('causes') or []) & set(a.get('needs') or []):
        return 3
    la, lb = a.get('line'), b.get('line')
    if la and lb and (la in lb or lb in la):
        return 2
    if a.get('decision') and a.get('decision') == b.get('decision'):
        return 2
    if a.get('thread') and a.get('thread') != 'local' and a.get('thread') == b.get('thread'):
        return 1
    if set(a['squares']) & set(b['squares']):
        return P.get('squareLink', 0)
    return 0

def score(f, P):
    w = f['weight'] + P.get('woff', {}).get(f['source'], 0)
    stake = f.get('sv') or 0
    base = stake if stake > 0 else w
    story = 1 + P.get('threadBonus', 0.0) if f.get('thread') and f.get('thread') != 'local' else 1.0
    proof = {'exact': 1.0, 'engine': P.get('engineProof', 0.95)}.get(f.get('proof'), P.get('noProof', 0.9))
    return base * story * proof

def compose_matrix(facts, P):
    qual = [f for f in facts if f.get('words', 1) > 0 and not f.get('restates')]
    qual.sort(key=lambda f: -score(f, P))
    # 2 merge — one claim, one entry: same step, same idea.
    merged = []
    for f in qual:
        if any(m['step'] == f['step'] and same_idea(m, f) for m in merged):
            continue
        merged.append(f)
    if not merged:
        return []
    # 4 region final — the best of each region (co-champions within the margin).
    regions = {}
    for f in merged:
        regions.setdefault(GROUP_REGION.get(f.get('group'), 'C'), []).append(f)
    champs = []
    for r, fs in regions.items():
        top = score(fs[0], P)
        champs.extend([f for f in fs if score(f, P) >= top * (1 - P.get('tie', 0.0))][: P.get('perRegion', 1)])
    # 5 the final — the lead.
    champs.sort(key=lambda f: -score(f, P))
    lead = champs[0]
    seated = [lead]
    # 6 the thread — each seat to the champion most linked to what was said.
    rest = sorted(champs[1:], key=lambda f: (STEP_ORDER[f['step']], -score(f, P)))
    for f in rest:
        if max(link(f, s, P) for s in seated) >= P.get('minLink', 1):
            seated.append(f)
    seated.sort(key=lambda f: STEP_ORDER[f['step']])
    return [(f, f is not lead and P.get('also', True)) for f in seated]

def evaluate(notes, fn, P, half):
    n = a = l = w = hit = tot = 0
    for note in notes:
        if not note['danya'] or (half != 'all' and train_half(note['video']) != (half == 'train')):
            continue
        chosen = fn(note['facts'], P)
        ideas = [i for f, also in chosen for i in (f['alsoIdeas'] if also else f['ideas'])]
        n += 1; a += any(covers(ideas, d) for d in note['danya']); l += covers(ideas, note['danya'][0])
        w += sum(f['alsoWords'] if also else f['words'] for f, also in chosen)
        for f, also in chosen:
            tot += 1; hit += any(covers(f['alsoIdeas'] if also else f['ideas'], d) for d in note['danya'])
    return {'notes': n, 'any': round(100 * a / max(1, n), 2), 'lead': round(100 * l / max(1, n), 2), 'words': round(w / max(1, n), 2), 'precision': round(100 * hit / max(1, tot), 2)}

if __name__ == '__main__':
    notes = load(sys.argv[1], extended())
    shipped = json.load(open(os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'data', 'thought-policy.json')))
    P0 = {**BASE, 'floor': shipped['floor'], 'gap': shipped['gap'], 'newsMargin': shipped.get('newsMargin', 0.09), 'woff': dict(shipped['offsets'])}
    print('composer (today):', evaluate(notes, compose, P0, 'test'))
    variants = {
        'matrix: champions, link >= 1': {**P0},
        'matrix: + square link 1': {**P0, 'squareLink': 1},
        'matrix: 2 a region, square 1': {**P0, 'squareLink': 1, 'perRegion': 2},
        'matrix: 2 a region, link any': {**P0, 'squareLink': 1, 'perRegion': 2, 'minLink': 0},
        'matrix: thread bonus .2': {**P0, 'squareLink': 1, 'threadBonus': 0.2},
    }
    for name, P in variants.items():
        print(f'{name}:', evaluate(notes, compose_matrix, P, 'test'))
