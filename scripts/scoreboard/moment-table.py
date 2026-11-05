# L2 (PLAN.md § PHASE 2 REDESIGN): THE MOMENT TABLE, learned from his own words.
#
# For every move of his games (the bank of his transcripts, tagged with the
# teaching moves he makes — `his-bank-tags.json`), the kind of moment it is:
#   whose move (his / theirs) · what kind of move (capture, check, castle,
#   promotion, quiet) · the phase · a slip (what the move cost, from the engine
#   reads of the Danya bench, mover's view: >= 100 a mistake, >= 300 a blunder)
#   · forced (one move the engine keeps, the next 200 worse)
# and, per kind of moment, which teaching moves he makes and how many.
#
#   python3 scripts/scoreboard/moment-table.py <bank dir> <danya-bench reads dir> [segment=game] [out.json]
# Reads are joined by (video, ply); a move with no read has no slip/forced
# answer and is counted under 'unread'.
import json, sys, glob, os, collections

BANK, READS = sys.argv[1], sys.argv[2]
SEG = sys.argv[3] if len(sys.argv) > 3 else 'game'
OUT = sys.argv[4] if len(sys.argv) > 4 else None
here = os.path.dirname(os.path.abspath(__file__))
tags = json.load(open(os.path.join(here, 'his-bank-tags.json')))

reads = {}
for f in glob.glob(os.path.join(READS, 'reads-*.jsonl')):
    for line in open(f):
        r = json.loads(line)
        vid, ply = r['id'][3:].rsplit('-', 1)
        reads[(vid, int(ply))] = r

def cp(e):
    if e is None: return None
    if e.get('mate') is not None: return 10000 if e['mate'] > 0 else -10000
    return e.get('cp')

def phase(fen, ply):
    board = fen.split()[0]
    q = board.count('q') + board.count('Q')
    minors_rooks = sum(board.count(c) for c in 'nbrNBR')
    if q == 0 and minors_rooks <= 6 or minors_rooks + 2 * q <= 6: return 'endgame'
    return 'opening' if ply <= 20 else 'middlegame'

def kind(san):
    if san.startswith('O-O'): return 'castle'
    if '=' in san: return 'promotion'
    if '#' in san or '+' in san: return 'check'
    if 'x' in san: return 'capture'
    return 'quiet'

moments = collections.defaultdict(lambda: {'n': 0, 'narration': 0, 'moves': 0, 'codes': collections.Counter()})
for f in glob.glob(os.path.join(BANK, '*.json')):
    b = json.load(open(f)); vid = b['videoId']
    for idx, m in enumerate(b['moves']):
        t = tags.get(f'{vid}:{idx}')
        if not t or t['segment'] != SEG: continue
        san = t.get('move') or ''
        if not san: continue
        r = reads.get((vid, m['ply']))
        slip = 'unread'; forced = False
        if r and r.get('before') and r.get('after'):
            best, played = cp(r['before'][0]), cp(r['after'][0])
            white = m['ply'] % 2 == 1
            if best is not None and played is not None:
                loss = (best - played) if white else (played - best)
                slip = 'blunder' if loss >= 300 else 'mistake' if loss >= 100 else 'sound'
            if len(r['before']) >= 2:
                a, b2 = cp(r['before'][0]), cp(r['before'][1])
                if a is not None and b2 is not None: forced = abs(a - b2) >= 200
            else:
                forced = True
        codes = [c for c in t['codes'] if c != 'X-NARRATION']
        keys = [
            ('all',),
            ('mover', t['mover']),
            ('mover×kind', t['mover'], kind(san)),
            ('mover×phase', t['mover'], phase(m['fen'], m['ply'])),
            ('mover×slip', t['mover'], slip),
            ('mover×forced', t['mover'], 'forced' if forced else 'free'),
        ]
        for k in keys:
            row = moments[k]
            row['n'] += 1; row['narration'] += not codes; row['moves'] += len(codes)
            row['codes'].update(codes)

table = {}
for k, row in sorted(moments.items()):
    n = row['n']
    table[' · '.join(k)] = {'n': n, 'teachingMovesPerTurn': round(row['moves'] / n, 2), 'narrationOnly': round(row['narration'] / n, 3),
                            'share': {c: round(v / n, 3) for c, v in row['codes'].most_common()}}
    print(f"\n== {' · '.join(k)} — {n} moves, {row['moves']/n:.2f} teaching moves a turn, {100*row['narration']/n:.0f}% narration only")
    print('   ' + ' | '.join(f'{c} {100*v/n:.0f}%' for c, v in row['codes'].most_common(14)))
if OUT:
    json.dump(table, open(OUT, 'w'), indent=1)
    print(f'\n→ {OUT}')
