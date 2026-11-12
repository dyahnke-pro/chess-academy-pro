#!/usr/bin/env python3
"""FIT THE COMPOSER'S ORDER (WO-COMPOSER-ORDER, David 2026-11-12: "We need to
figure out which important facts to speak, which facts sound like Danya, and in
which order to speak them").

The composer says every verified find (`thoughtComposer.composeThought`); what is
fitted is the ORDER inside each step — one prior per idea and per computer on top
of the fact's depth band (`factDepth`: hidden and why first, obvious last). Fitted
JOINTLY on two benches, each split in two and scored on the half never tuned on:

  * Danya's notes — the bench dump (`danyaBench.measure.test.ts` with
    DANYA_BENCH_DUMP=<file>): every fact the composer had on each note; scored by
    his ideas said and his lead idea said, with the bench's tagger
    (`thought_replay.extended`), split by video;
  * the hand-written Watch beats — `<course>.computers.json` from
    lessonWriter.measure.test.ts, labelled per beat with which facts the writer
    used and led with (label-c2.mjs); scored by the writer's facts said, the lead
    matched and 0.5 x the share said that the writer used, split by course.

A hidden idea or computer is never fitted below zero (David: "second and third
order consequences weighted heavily", "Prophylaxis needs to be weighted highly").

  python3 scripts/bench/fit-composer-order.py <dump.jsonl> <writer-dir> <labels.json> <beats.json> [--write]
"""
import copy, json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import thought_replay as T

DUMP, WDIR, LABELS, BEATS = sys.argv[1:5]
DANYA = T.load(DUMP, T.extended())
labels = json.load(open(LABELS))
beats = {b['id']: b for b in json.load(open(BEATS))}
words = lambda t: len((t or '').split())
comp, NOTES = {}, []
for bid, lab in labels.items():
    b = beats.get(bid)
    if not b:
        continue
    c = b['course']
    if c not in comp:
        p = f'{WDIR}/{c}.computers.json'
        comp[c] = json.load(open(p)) if os.path.exists(p) else {}
    rec = comp[c].get(b['ckey'])
    if not rec or not rec['facts'] or 'step' not in rec['facts'][0]:
        continue
    facts = [{**f, 'i': i, 'words': words(f['text']), 'alsoWords': words(f.get('alsoText') or f['text'])} for i, f in enumerate(rec['facts'])]
    idx = lambda s: int(s[1:]) if isinstance(s, str) and s[1:].isdigit() else None
    used = {u for u in ({idx(u) for u in lab.get('used') or []} - {None}) if u < len(facts)}
    lead = idx(lab.get('lead'))
    NOTES.append({'course': c, 'facts': facts, 'used': used, 'lead': lead if lead is not None and lead < len(facts) else None})

def writers(P, half):
    n = cov = led = said = hit = w = 0
    for nt in NOTES:
        if half != 'all' and T.train_half(nt['course']) != (half == 'train'):
            continue
        if not nt['used']:
            continue
        ch = T.compose(nt['facts'], P)
        chosen = [f['i'] for f, _ in ch]
        n += 1
        cov += len(set(chosen) & nt['used']) / len(nt['used'])
        led += 1 if nt['lead'] is not None and chosen and chosen[0] == nt['lead'] else 0
        said += len(chosen); hit += len(set(chosen) & nt['used'])
        w += sum(f['alsoWords'] if a else f['words'] for f, a in ch)
    return {'beats': n, 'used': 100 * cov / max(1, n), 'lead': 100 * led / max(1, n), 'precision': 100 * hit / max(1, said), 'words': w / max(1, n)}

def danya(P, half):
    s = T.score(DANYA, P, half)
    return {'notes': s['n'], 'any': s['any'], 'lead': s['lead'], 'words': s['words']}

def objective(P):
    d, w = danya(P, 'train'), writers(P, 'train')
    return d['any'] + d['lead'] + w['used'] + w['lead'] + 0.5 * w['precision']

def floor_of(kind, key):
    hidden = key in T.HIDDEN_IDEAS if kind == 'ideaPrior' else key in T.HIDDEN_SOURCES
    return 0 if hidden else -60

P0 = copy.deepcopy(T.BASE)
P, best = copy.deepcopy(P0), objective(P0)
ideas = sorted({f['idea'] for n in DANYA for f in n['facts']} | {f['idea'] for n in NOTES for f in n['facts']})
sources = sorted({f['source'] for n in DANYA for f in n['facts']} | {f['source'] for n in NOTES for f in n['facts']})
for rnd in range(6):
    improved = False
    for kind, keys in (('ideaPrior', ideas), ('sourcePrior', sources)):
        for k in keys:
            cur = P[kind].get(k, 0)
            for d in (-40, -20, -10, 10, 20, 40):
                Q = copy.deepcopy(P)
                Q[kind][k] = max(floor_of(kind, k), min(60, cur + d))
                o = objective(Q)
                if o > best + 0.05:
                    best, P, improved = o, Q, True
    print('round', rnd, round(best, 2), flush=True)
    if not improved:
        break
r = lambda s: {k: round(v, 1) if isinstance(v, float) else v for k, v in s.items()}
print('held out, depth only:', r(danya(P0, 'test')), r(writers(P0, 'test')))
print('held out, fitted:    ', r(danya(P, 'test')), r(writers(P, 'test')))
if '--write' in sys.argv:
    path = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'data', 'thought-policy.json')
    doc = json.load(open(path))
    doc['ideaPrior'] = {k: v for k, v in sorted(P['ideaPrior'].items(), key=lambda kv: -kv[1]) if v}
    doc['sourcePrior'] = {k: v for k, v in sorted(P['sourcePrior'].items(), key=lambda kv: -kv[1]) if v}
    doc['heldOut']['fitted'] = {'danya': r(danya(P, 'test')), 'writers': r(writers(P, 'test'))}
    json.dump(doc, open(path, 'w'), indent=2)
    print('wrote', os.path.normpath(path))
