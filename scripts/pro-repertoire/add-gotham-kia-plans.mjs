#!/usr/bin/env node
// GothamChess King's Indian Attack (pro-gothamchess-kia) — plans. Student=WHITE.
// KIA is transpositional, so plans anchor on the entry's theory-validated
// variation PGNs + the consensus KIA strategic plans (e5 wedge + Nf1-h2-g4
// reroute) — "right ideas elegantly taught". chess.js-validated.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/middlegame-plans.json';
const OPENING_ID = 'pro-gothamchess-kia';
const SRC = [
  'book:chess-strategy',
  'https://www.chess.com/openings/Kings-Indian-Attack',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
  'https://en.wikipedia.org/wiki/King%27s_Indian_Attack',
];
const ORANGE = 'rgba(255, 165, 0, 0.55)';

const data0 = JSON.parse(readFileSync(PATH, 'utf8'));
const LEGACY = data0
  .filter((p) => p.openingId === OPENING_ID && !(p.playableLines && p.playableLines[0] && p.playableLines[0].moves))
  .map((p) => p.id);
const DELETE_IDS = new Set(LEGACY);

const PLANS = [
  {
    id: 'mp-progothamchess-kia-e5-kingside',
    title: 'KIA vs …d5/…e6: the e5 Wedge + Nf1-h2-g4 Attack',
    overview:
      "The signature King's Indian Attack plan against the French-like …d5/…e6 setup. White plays e4-e5 to grab a space wedge that cramps Black's kingside, then reroutes the knight Nd2-f1-h2-g4 to pile onto the kingside. Combined with Qe2, h4, and the Bg2 on the long diagonal, White builds a slow but deadly attack against Black's king — the classic KIA kingside avalanche.",
    pawnBreaks: ['e4-e5 the cramping space wedge', 'h4 supporting the attack'],
    pieceManeuvers: ['Nd2-f1-h2-g4 the kingside reroute', 'Qd1-e2 supporting the push', 'the Bg2 on the long diagonal'],
    strategicThemes: ['Grab space with the e5 wedge', 'Reroute Nf1-h2-g4 to the kingside', 'Build a slow kingside attack'],
    endgameTransitions: ['Keep attacking — the KIA is built for the middlegame assault'],
    anchor: 'Nf3 d5 g3 c5 Bg2 Nc6 O-O e6 d3 Nf6 Nbd2 Be7 e4 O-O Re1',
    cont: ['b5', 'e5', 'Nd4', 'Nf1'],
    ann: [
      '…b5 — Black expands on the queenside, the standard plan against the KIA.',
      'e5 — the wedge. White rams the pawn forward, kicking the f6-knight and grabbing a cramping space advantage on the kingside.',
      '…Nd4 — Black centralises the knight, seeking counterplay.',
      'Nf1 — the signature KIA reroute begins. The knight heads for h2 and g4, joining the kingside attack while the Bg2 rakes the long diagonal. White’s slow-building assault is exactly what the King’s Indian Attack is designed for.',
    ],
    cues: ['b5 — Black expands queenside', 'e5 — the space wedge', 'Nd4 — Black centralises', 'Nf1 — the kingside reroute'],
  },
  {
    id: 'mp-progothamchess-kia-sicilian-reroute',
    title: 'KIA vs the …g6 Sicilian: Re1 + Nf1 Kingside Reroute',
    overview:
      "Against Black's …c5/…g6 Sicilian setup, White plays the closed King's Indian Attack: e4 stakes the centre, Re1 supports the coming e5 push and frees f1, and the knight reroutes Nf1-h2-g4 toward the kingside. While Black expands with …b5 on the queenside, White's pieces converge on the king — a race where the KIA's kingside attack is usually faster.",
    pawnBreaks: ['e4 the central stake', 'a future e5 push'],
    pieceManeuvers: ['Rf1-e1 freeing f1 for the knight', 'Nd2-f1-h2-g4 the kingside reroute', 'the Bg2 long-diagonal bishop'],
    strategicThemes: ['Stake the centre with e4', 'Reroute the knight via f1', 'Attack the king on the wing'],
    endgameTransitions: ['Keep attacking — win the wing race'],
    anchor: 'Nf3 c5 g3 Nc6 Bg2 g6 O-O Bg7 d3 Nf6 Nbd2 d6 e4',
    cont: ['O-O', 'Re1', 'b5', 'Nf1'],
    ann: [
      '…O-O — Black castles into the position White intends to attack.',
      'Re1 — White supports the centre and, crucially, frees the f1-square for the knight reroute.',
      '…b5 — Black launches the standard queenside expansion.',
      'Nf1 — the reroute begins, heading for h2 and g4. With the Bg2 on the long diagonal and the knight joining the kingside, White’s attack races against Black’s queenside play — and in the King’s Indian Attack, White’s wing usually wins the race.',
    ],
    cues: ['O-O — Black castles in', 'Re1 — free f1 for the knight', 'b5 — Black expands queenside', 'Nf1 — the kingside reroute'],
  },
];

const data = data0.filter((p) => !DELETE_IDS.has(p.id));
const deleted = data0.length - data.length;
const existing = new Set(data.map((p) => p.id));
let failed = 0;
const added = [];

for (const p of PLANS) {
  const c = new Chess();
  let ok = true;
  for (const san of p.anchor.trim().split(/\s+/)) {
    try { c.move(san); } catch { console.error(`ANCHOR ILLEGAL ${p.id}: ${san}`); ok = false; break; }
  }
  if (!ok) { failed++; continue; }
  const critFen = c.fen();
  const probe = new Chess(critFen);
  const moveInfo = [];
  for (const san of p.cont) {
    let mv;
    try { mv = probe.move(san); } catch { console.error(`CONT ILLEGAL ${p.id}: ${san} @ ${probe.fen()}`); ok = false; break; }
    moveInfo.push({ to: mv.to, color: mv.color });
  }
  if (!ok) { failed++; continue; }
  if (p.cont.length !== p.ann.length || p.cont.length !== p.cues.length) { console.error(`LENGTH ${p.id}`); failed++; continue; }

  const SQ = /([a-h][1-8])/g;
  const COND = /\b(only|if|else|avoid|keep|restrain|passed|once|when|unless|never|don'?t|patient|flawless|sound|respect|balance|small|long-term|matters|later|future)\b/i;
  const goals = new Set();
  for (const pb of p.pawnBreaks) if (!COND.test(pb)) (pb.match(SQ) || []).forEach((q) => goals.add(q));
  for (const pm of p.pieceManeuvers) (pm.match(SQ) || []).forEach((q) => goals.add(q));
  const demo = moveInfo.some((mi) => mi.color === 'w' && goals.has(mi.to));
  if (!demo) { console.error(`THEME-EMPTY ${p.id}: goals {${[...goals].join(',')}}; white tos=${moveInfo.filter((m) => m.color === 'w').map((m) => m.to).join(',')}`); failed++; continue; }
  const PROMISE = /\b(ready for|ready to|prepares? to|preparing to|will follow|is ready|planning to|intends? to|swinging to|aims? to|looking to|poised|about to|coming next|next comes|to follow)\b/i;
  if (PROMISE.test(p.ann[p.ann.length - 1])) { console.error(`PROMISE-ENDING ${p.id}`); failed++; continue; }
  if (existing.has(p.id)) { console.log(`skip existing ${p.id}`); continue; }

  added.push({
    id: p.id, openingId: OPENING_ID, criticalPositionFen: critFen,
    title: p.title, overview: p.overview,
    pawnBreaks: p.pawnBreaks, pieceManeuvers: p.pieceManeuvers,
    strategicThemes: p.strategicThemes, endgameTransitions: p.endgameTransitions,
    playableLines: [{
      fen: critFen, moves: p.cont, annotations: p.ann,
      arrows: p.cont.map(() => []),
      highlights: moveInfo.map((mi) => [{ square: mi.to, color: ORANGE }]),
      learnCues: p.cues, title: p.title, intro: p.overview, sources: SRC,
    }],
  });
}

if (failed > 0) { console.error(`\n${failed} plan(s) failed — NOT writing.`); process.exit(1); }
data.push(...added);
writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`deleted ${deleted} legacy, added ${added.length} new. total now ${data.length}.`);
