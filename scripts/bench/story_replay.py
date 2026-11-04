#!/usr/bin/env python3
"""THE STORY BENCH — a game read as a story (WO-STORY-MATRIX-01 Phase 2b).

The Danya bench scores one note at a time. The matrix's case was the STORY:
one idea held across a game. This replays the one composer over every note of
a game in order and asks what a per-note score cannot:

  continued  — an idea of his that names the same target (kind + square) as
               an idea he said earlier in the game. Is the coach saying it too?
  new        — an idea of his not said before in the game.
  stale      — an idea the coach says again (it said it earlier in the game)
               that he does not say on this move: the coach holding a thread
               he dropped.
  ceiling    — his continued ideas the composer missed that some computer
               BUILT on the move: the most a thread term could win.

A THREAD TERM is replayed too: a fact whose idea continues one the coach
already said this game gains weight (and stake value), so the composer prefers
the running story. Its two numbers (bonus, sv share) are swept on the train
half of the videos and scored on the other half, never tuned on.

  python3 scripts/bench/story_replay.py <dump.jsonl> [<dump.jsonl> …]
"""
import collections
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from thought_replay import load, extended, compose, covers, BASE, TARGETED, train_half  # noqa: E402


def note_index(n):
    return int(re.search(r'-(\d+)$', n['id']).group(1))


def games_of(notes):
    g = collections.defaultdict(list)
    for n in notes:
        g[n['video']].append(n)
    for v in g:
        g[v].sort(key=note_index)
    return g


def targeted(ideas):
    return [i for i in ideas if i['kind'] in TARGETED]


def continues(i, before):
    """Idea `i` names a target an idea `before` named (kind + a shared square)."""
    return i['kind'] in TARGETED and covers(before, i)


def with_thread(facts, said, P):
    """The thread term: a fact whose idea continues one already said gains
    `thread` weight and `threadSv` of its stake value."""
    bonus, svs, once = P.get('thread', 0), P.get('threadSv', 0), P.get('sayOnce', False)
    if not bonus and not svs and not once:
        return facts
    out = []
    for f in facts:
        if any(continues(i, said) for i in f['ideas']):
            # Say-once by idea: a target already said this game is not said
            # again unless the fact's stake value says it is news (sv > 0).
            if once and not f.get('sv'):
                continue
            f = {**f, 'weight': f['weight'] + bonus, 'sv': max(0, f.get('sv', 0) * (1 + svs))}
        out.append(f)
    return out


def evaluate(games, P, half='test'):
    t = collections.Counter()
    for video, notes in games.items():
        if half != 'all' and train_half(video) != (half == 'train'):
            continue
        his_before, coach_before = [], []
        for n in notes:
            facts = with_thread(n['facts'], targeted(coach_before), P)
            chosen = compose(facts, P)
            spoken = [i for f, also in chosen for i in (f['alsoIdeas'] if also else f['ideas'])]
            built = [i for f in n['facts'] for i in f['ideas'] + f['alsoIdeas']]
            if n['danya']:
                t['notes'] += 1
                t['any'] += any(covers(spoken, d) for d in n['danya'])
                t['lead'] += covers(spoken, n['danya'][0])
                for d in n['danya']:
                    key = 'cont' if continues(d, his_before) else 'new'
                    t[key] += 1
                    hit = covers(spoken, d)
                    t[key + 'Hit'] += hit
                    if not hit and covers(built, d):
                        t[key + 'Built'] += 1
            for c in targeted(spoken):
                if continues(c, targeted(coach_before)):
                    t['coachCont'] += 1
                    if not any(covers([c], d) for d in n['danya']):
                        t['stale'] += 1
                t['coachTargeted'] += 1
            t['words'] += sum(f['alsoWords'] if also else f['words'] for f, also in chosen)
            t['allNotes'] += 1
            his_before += n['danya']
            coach_before += spoken
    pct = lambda a, b: round(100 * t[a] / max(1, t[b]), 2)
    return {
        'notes': t['notes'], 'any': pct('any', 'notes'), 'lead': pct('lead', 'notes'),
        'words': round(t['words'] / max(1, t['allNotes']), 2),
        'hisContinued': round(100 * t['cont'] / max(1, t['cont'] + t['new']), 2),
        'contRecall': pct('contHit', 'cont'), 'newRecall': pct('newHit', 'new'),
        'contCeiling': pct('contBuilt', 'cont'),
        'coachContinued': pct('coachCont', 'coachTargeted'), 'stale': pct('stale', 'coachCont'),
    }


def objective(r):
    """The bench's own objective (fit-thought-policy.py) plus the story:
    his continued ideas said, without the coach holding threads he dropped."""
    return r['any'] + r['lead'] + 0.5 * r['contRecall'] - 0.25 * r['stale']


if __name__ == '__main__':
    lex = extended()
    notes = [n for path in sys.argv[1:] for n in load(path, lex)]
    games = games_of(notes)
    shipped = json.load(open(os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'data', 'thought-policy.json')))
    P0 = {**BASE, 'floor': shipped['floor'], 'gap': shipped['gap'], 'newsMargin': shipped.get('newsMargin', 0.09), 'woff': dict(shipped['offsets'])}
    print(f'{len(notes)} notes, {len(games)} games')
    print('composer today (test):', evaluate(games, P0, 'test'))
    best = (objective(evaluate(games, P0, 'train')), 0, 0)
    for bonus in (-40, -20, -10, 5, 20):
        for svs in (-0.5, -0.25, 0, 0.25):
            r = evaluate(games, {**P0, 'thread': bonus, 'threadSv': svs}, 'train')
            o = objective(r)
            print(f'  train thread={bonus} sv={svs}: obj {o:.2f} any {r["any"]} lead {r["lead"]} cont {r["contRecall"]} stale {r["stale"]}')
            if o > best[0]:
                best = (o, bonus, svs)
    r = evaluate(games, {**P0, 'sayOnce': True}, 'train')
    print(f'  train say-once by idea: obj {objective(r):.2f} any {r["any"]} lead {r["lead"]} cont {r["contRecall"]} stale {r["stale"]}')
    print('  test say-once by idea:', evaluate(games, {**P0, 'sayOnce': True}, 'test'))
    print('best on train:', best)
    print('best on test: ', evaluate(games, {**P0, 'thread': best[1], 'threadSv': best[2]}, 'test'))
