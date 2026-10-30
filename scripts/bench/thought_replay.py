#!/usr/bin/env python3
"""THE DANYA BENCH, REPLAYED (WO-ONE-COACH-01 Build 5).

The bench (`src/services/danyaBench.measure.test.ts`, run with
DANYA_BENCH_DUMP=<file>) writes every fact the lesson composer had on each of
Danya's 7,477 position notes, with its words. This module re-tags those words
with the bench's own idea tagger (ported here; it reproduces the bench's
tagging exactly) and replays the composer's selection
(`thoughtComposer.composeThought`), so a selection policy is scored in a
second instead of a 25-minute bench run. `fit-thought-policy.py` fits the
policy the composer ships (`src/data/thought-policy.json`).
"""
import json, re


LEXICON = {
    'develop': r"\b(develop(s|ed|ing|ment)?|bring(s|ing)? (out|into play))\b",
    'castle': r"\b(castl(e|es|ed|ing)|o-o)\b",
    'center': r"\b(cent(re|er|ral|res|ers))\b",
    'space': r"\b(space|clamp|gain(s|ing)? ground|cramp(s|ed)?)\b",
    'break': r"\b(break|strike(s|ing)? at|undermin\w*|lever)\b",
    'attack': r"\b(attack(s|ing|ed)?|hit(s|ting)?|pressure|eye(s|ing)?|target(s|ing)?|threat\w*|go(es)? after)\b",
    'defend': r"\b(defen(d|ds|ded|ding|ce|se|der)|protect\w*|guard\w*|support\w*|shield\w*)\b",
    'pin': r"\b(pin(s|ned|ning)?)\b",
    'fork': r"\bfork\w*",
    'skewer': r"\bskewer\w*",
    'discovered': r"\bdiscover\w*",
    'trade': r"\b(trad(e|es|ed|ing)|exchang\w*|swap\w*)\b",
    'capture': r"\b(captur\w*|take(s)? (back|on)|recaptur\w*|win(s|ning)? (a|the) (pawn|piece|knight|bishop|rook|queen|exchange)|grab\w*)\b",
    'prevent': r"\b(prevent\w*|stop(s|ping)?|deny|denies|denying|take(s)? away|keep(s|ing)? \w+ (\w+ )?(off|out)|prophyla\w*|rule(s)? out|so that \w+ (can't|cannot)|restrain\w*|restrict\w*|blockad\w*)\b",
    'prepare': r"\b(prepar\w*|make(s)? room|clear(s|ing)? the way|open(s|ing)? the way|ready to|so that|in order to|paving)\b",
    'tempo': r"\b(tempo|tempi|kick(s|ing)?|chase(s|d)?|gain(s|ing)? (a )?time)\b",
    'king-safety': r"\b(king safety|safe king|exposed|luft|shelter|escape square|attack(ing)? the king|king('s)? (is )?(safe|exposed|stuck))\b",
    'weakness': r"\b(weak(ness|nesses|en|ens|ened|ening)?|isolat\w*|doubled|backward|hole(s)?)\b",
    'structure': r"\b(pawn structure|pawn chain|structure)\b",
    'outpost': r"\boutpost\w*",
    'file': r"\b(open file|half-open|semi-open|[a-h]-file|the file)\b",
    'diagonal': r"\bdiagonal\w*",
    'activity': r"\b(activ(e|ity|ate|ates|ating)|improv(e|es|ing)|rerout\w*|manoeuv\w*|maneuv\w*|redeploy\w*|worst piece)\b",
    'plan': r"\b(plan(s)?|the idea|idea is|aim(s|ing)?|goal|want(s)? to|looking to|intend\w*)\b",
    'alternative': r"\b(instead|rather than|would be|too (passive|slow|early|risky|committal)|the problem with|doesn't work|does not work|fails?|failed|why not|not good|wrong)\b",
    'order': r"\b(first|before|not yet|move order|only then|after that|premature|too early|wait(s)?)\b",
    'line': r"\bif\b[^.]{0,120}(\bthen\b|,)",
    'habit': r"\b(always|whenever|never|rule of thumb|principle|remember|habit|ask yourself|get used to|in general|typical(ly)?)\b",
    'theory': r"\b(main ?line|theory|theoretical|book|popular|most common|the masters|classical|standard|mainstream)\b",
    'mate': r"\b(mate|checkmate|mating)\b",
    'material': r"\b(material|pawn up|piece up|up a (pawn|piece)|down a (pawn|piece)|extra pawn|exchange up)\b",
    'endgame': r"\b(endgame|ending|promot\w*|passed pawn|passer|opposition|queening)\b",
    'trap': r"\btrap(s|ped|ping)?\b",
}
KINDS = list(LEXICON.keys())
TARGETED = {'break', 'attack', 'defend', 'pin', 'fork', 'skewer', 'discovered', 'capture', 'prevent', 'outpost', 'file', 'diagonal', 'weakness'}
SQUARE = re.compile(r"\b[a-h][1-8]\b")
SAN = re.compile(r"\b(?:[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8])")
SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z…\"“])")

def compile_lexicon(extra=None):
    lex = dict(LEXICON)
    for k, pat in (extra or {}).items():
        lex[k] = f"(?:{lex[k]})|(?:{pat})" if k in lex else pat
    return {k: re.compile(v) for k, v in lex.items()}

DEFAULT = compile_lexicon()

def sentences_of(text):
    t = re.sub(r"\s+", " ", text)
    return [s.strip() for s in SPLIT.split(t) if s.strip()]

def ideas_of(text, move_to, lex=DEFAULT):
    out = []
    for s in sentences_of(text or ''):
        low = s.lower()
        named = set(SQUARE.findall(low))
        squares = sorted(named) if named else [move_to]
        san_moves = len(SAN.findall(s))
        for k in KINDS:
            if k in lex and lex[k].search(low):
                out.append({'kind': k, 'squares': squares})
        if san_moves >= 2 and not any(i['kind'] == 'line' for i in out):
            out.append({'kind': 'line', 'squares': squares})
    return out

def distinct_ideas(ideas):
    seen = set(); out = []
    for i in ideas:
        key = f"{i['kind']}:{','.join(sorted(i['squares']))}" if i['kind'] in TARGETED else i['kind']
        if key in seen:
            continue
        seen.add(key); out.append(i)
    return out

# ── the tagger fixes (Build 5), folded into the bench too ──


RESCUE = r"\b(retreat\w*|step(s|ping)? (back|away|out of)|drops? back|goes back|out of (the )?(attack|danger|reach|check)|get(s|ting)? (\w+ )?(\w+ )?out of|escap\w*|sav(e|es|ed|ing) (the|your|their|its|a)\b)"
EXTRA = {
    'prepare': r"\bset(s|ting)? up\b",
    'activity': r"\b(head(s|ing)? (for|to|toward)|on (its|the) way to|by way of|transit|send(s|ing)? the (knight|bishop|rook|queen|king) (on )?to|then (the )?(knight|bishop|rook|queen|king) (to|on to|goes|heads|comes))\b",
    'defend': r"\bcover(s|ed|ing)?\b",
    'attack': r"\baim(s|ed|ing)? at\b",
}

def extended():
    if 'rescue' not in KINDS:
        KINDS.append('rescue')
        LEXICON['rescue'] = RESCUE
    return compile_lexicon(EXTRA)

# ── the composer, replayed ──


STEP_ORDER = {'danger': 0, 'name': 1, 'yours': 2, 'theirs': 3, 'choices': 4, 'notYet': 5, 'line': 6, 'board': 7, 'verdict': 8, 'habit': 9}
SOURCE_RANK = {'moveWhy': 1, 'briefing': 2, 'fundamental': 3, 'boardTeacher': 4, 'moveJob': 5, 'refuted': 7, 'alternatives': 8,
               'prophylaxis': 10, 'notYet': 9, 'deepFact': 11, 'binding': 12, 'pieceRoute': 13}
MOVE_STEPS = {'yours', 'theirs'}
TARGETED = {'break', 'attack', 'defend', 'pin', 'fork', 'skewer', 'discovered', 'capture', 'prevent', 'outpost', 'file', 'diagonal', 'weakness'}

def train_half(video):
    h = 0
    for ch in video:
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    return h % 2 == 0

def load(path, lex=None):
    """Read the dump; with `lex` (tagger.compile_lexicon(...)), re-tag his
    note and every fact's words from the dumped texts."""
    with open(path) as f:
        notes = [json.loads(l) for l in f if l.strip()]
    if lex is not None:
        for n in notes:
            n['danya'] = distinct_ideas(ideas_of(n['danyaText'], n['to'], lex))
            for f in n['facts']:
                f['ideas'] = ideas_of(f['text'], n['to'], lex)
                f['alsoIdeas'] = ideas_of(f['alsoText'], n['to'], lex)
    return notes

def covers(coach, d):
    for c in coach:
        if c['kind'] != d['kind']:
            continue
        if d['kind'] not in TARGETED:
            return True
        if set(c['squares']) & set(d['squares']):
            return True
    return False

def same_idea(a, b):
    if a['idea'] != b['idea']:
        return False
    if not a['squares'] or not b['squares']:
        return True
    return bool(set(a['squares']) & set(b['squares']))

def compose(facts, P):
    """P: floor, gap, w (dict 'source|idea' or 'source' -> weight override/offset), rank (source -> rank)."""
    def weight(f):
        k = f"{f['source']}|{f['idea']}"
        if k in P.get('wset', {}):
            return P['wset'][k]
        return f['weight'] + P.get('woff', {}).get(f['source'], 0) + P.get('woff', {}).get(k, 0)
    rank = {**SOURCE_RANK, **P.get('rank', {})}
    idx = list(range(len(facts)))
    order = sorted(idx, key=lambda i: (STEP_ORDER[facts[i]['step']], int(facts[i]['restates']), -weight(facts[i]), rank[facts[i]['source']], i))
    picked = []  # (fact, also)
    lead_of = {}
    for i in order:
        f = facts[i]
        if f.get('words', 1) == 0:
            continue
        if any(p['step'] == f['step'] and same_idea(p, f) for p, _ in picked):
            continue
        lead = lead_of.get(f['step'])
        if lead is None:
            lead_of[f['step']] = f
            picked.append((f, False))
            continue
        if f['step'] in MOVE_STEPS:
            def same_sq(x, y):
                if P.get('sameSquares') == 'jaccard':
                    a_, b_ = set(x), set(y)
                    if not a_ or not b_:
                        return False
                    return len(a_ & b_) / len(a_ | b_) >= 0.6
                return bool(set(x) & set(y))
            if any(p['step'] == f['step'] and same_sq(f['squares'], p['squares']) for p, _ in picked):
                continue
            floor = P.get('floorTheirs', P['floor']) if f['step'] == 'theirs' else P['floor']
            gap = P.get('gapTheirs', P['gap']) if f['step'] == 'theirs' else P['gap']
            second = (not f['restates']) and weight(f) >= floor and weight(f) >= weight(lead) - gap
            if second:
                picked.append((f, True))
            continue
        support = bool(set(f['squares']) & set(lead['squares']))
        if support:
            picked.append((f, True))
    # quiet-move rule
    steps = {}
    for f, also in picked:
        steps.setdefault(f['step'], []).append(f)
    keep = []
    for f, also in picked:
        if all(x['restates'] for x in steps[f['step']]):
            continue
        keep.append((f, also))
    return keep

def score(notes, P, half='all'):
    n = any_c = lead_c = 0
    w = 0
    own = [0, 0, 0]; their = [0, 0, 0]
    for note in notes:
        if half != 'all' and (train_half(note['video']) != (half == 'train')):
            continue
        if not note['danya']:
            continue
        chosen = compose(note['facts'], P)
        ideas = [i for f, also in chosen for i in (f['alsoIdeas'] if also else f['ideas'])]
        a = any(covers(ideas, d) for d in note['danya'])
        l = covers(ideas, note['danya'][0])
        n += 1; any_c += a; lead_c += l
        w += sum(f['alsoWords'] if also else f['words'] for f, also in chosen)
        t = own if note['own'] else their
        t[0] += 1; t[1] += a; t[2] += l
    return {'n': n, 'any': 100 * any_c / max(1, n), 'lead': 100 * lead_c / max(1, n), 'words': w / max(1, n),
            'own': (100 * own[1] / max(1, own[0]), 100 * own[2] / max(1, own[0])),
            'their': (100 * their[1] / max(1, their[0]), 100 * their[2] / max(1, their[0]))}

BASE = {'floor': 50, 'gap': 15, 'woff': {}, 'wset': {}, 'rank': {}}

