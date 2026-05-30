#!/usr/bin/env node
// GothamChess Milner-Barry Gambit (pro-gothamchess-milner-barry) — plans.
// Student = WHITE. Sharp gambit (sac the d4-pawn for attack). 3 plans anchored
// on the entry's theory-validated variation PGNs, replacing 2 legacy
// overview-only plans. Every move chess.js-validated; theme self-checked.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/middlegame-plans.json';
const OPENING_ID = 'pro-gothamchess-milner-barry';
const DELETE_IDS = new Set(['mp-pro-gothamchess-milner-barry-attack', 'mp-pro-gothamchess-milner-barry-Bg5']);
const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/French-Defense-Advance-Variation-Milner-Barry-Gambit',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
  'https://en.wikipedia.org/wiki/French_Defence',
];
const ORANGE = 'rgba(255, 165, 0, 0.55)';

const PLANS = [
  {
    id: 'mp-progothamchess-mb-main-fstorm',
    title: 'Milner-Barry Gambit: the f4-f5 Kingside Storm',
    overview:
      "The heart of the Milner-Barry: White sacrifices the d4-pawn for a lead in development and a kingside attack. With Black's queen offside and the e5-wedge cramping, White rolls the f-pawn — f4 and f5 pry open the king's position while the Bd3, Qe2, and Nc3 all point at the kingside. A pawn for a raging initiative against the French.",
    pawnBreaks: ['f4-f5 the kingside storm', 'e5 the cramping wedge'],
    pieceManeuvers: ['Bd3 the h7-battery bishop', 'Qe2 supporting the attack', 'Nc3 the developed knight'],
    strategicThemes: ['Sacrifice d4 for the initiative', 'Storm with f4-f5', 'Attack the French king'],
    endgameTransitions: ['Keep attacking — the gambit is for the initiative, not the ending'],
    anchor: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 cxd4 cxd4 Bd7 O-O Nxd4 Nxd4 Qxd4 Nc3 a6 Qe2 Ne7 Kh1',
    cont: ['Rc8', 'f4'],
    ann: [
      '…Rc8 — Black develops the rook, trying to use the open c-file.',
      'f4 — the storm begins. White grabs kingside space and prepares f5 to crack open Black’s king, the pieces all converging on the kingside. The gambit pawn has bought a powerful attacking initiative.',
    ],
    cues: ['Rc8 — Black eyes the c-file', 'f4 — the kingside storm'],
  },
  {
    id: 'mp-progothamchess-mb-declines-na4',
    title: 'Milner-Barry Declined: Na4 Harasses the Queen',
    overview:
      "When Black declines the gambit and keeps the queen on b6, White exploits the exposed queen with Na4! — hitting the queen and rerouting toward c5 and the queenside dark squares. After the queen shuffles, Bd2 develops with tempo and White keeps the initiative with the better-coordinated pieces, the e5-wedge still cramping Black's French structure.",
    pawnBreaks: ['e5 the cramping wedge'],
    pieceManeuvers: ['Nc3-a4 harassing the b6-queen', 'Bc1-d2 developing with tempo', 'Na4-c5 the outpost route'],
    strategicThemes: ['Harass the queen with Na4', 'Develop with tempo', 'Keep the e5 space bind'],
    endgameTransitions: ['The better structure favours White in simplification'],
    anchor: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 Bd7 O-O cxd4 cxd4 Nxd4 Nxd4 Qxd4 Nc3 Qb6',
    cont: ['Na4', 'Qa5', 'Bd2'],
    ann: [
      'Na4 — White harasses the exposed b6-queen, gaining time and heading toward the c5-outpost.',
      '…Qa5 — the queen slides away, still awkwardly placed.',
      'Bd2 — White develops with tempo, hitting the a5-queen again. The pieces flow out with gain of time while Black’s queen wanders; White keeps a pleasant initiative and the e5-space bind.',
    ],
    cues: ['Na4 — harass the queen', 'Qa5 — the queen wanders', 'Bd2 — develop with tempo'],
  },
  {
    id: 'mp-progothamchess-mb-advance-battery',
    title: 'French Advance vs …Nh6: the Bxf5 Doubling + Qd3 Battery',
    overview:
      "Against the …Nh6-f5 setup, White trades Bxf5 to saddle Black with a doubled, weak f5-pawn, then develops and builds the Qd3 battery toward the kingside. With Black's structure damaged and the e5-wedge cramping, White completes development with Re1 and pressures the weak f5-pawn and the kingside light squares, the classic French Advance squeeze.",
    pawnBreaks: ['e5 the cramping wedge', 'the weak doubled f5-pawn as a target'],
    pieceManeuvers: ['Bd3xf5 doubling the f-pawns', 'Qd1-d3 the kingside battery', 'Rf1-e1 completing development'],
    strategicThemes: ['Double the f-pawns with Bxf5', 'Build the Qd3 battery', 'Press the weak f5-pawn'],
    endgameTransitions: ['The doubled f-pawn is a long-term endgame target'],
    anchor: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Nh6 Bd3 cxd4 cxd4 Nf5 Bxf5 exf5 Nc3 Be6 O-O Be7',
    cont: ['Re1', 'O-O', 'Qd3'],
    ann: [
      'Re1 — White completes development, the rook supporting the e5-wedge and eyeing the e-file.',
      '…O-O — Black castles into the position White intends to attack.',
      'Qd3 — the battery. The queen lines up toward h7 and the weak f5-pawn, pressuring Black’s damaged kingside. With the doubled f-pawn a permanent weakness and the e5-wedge cramping, White has the lasting structural edge and the attacking chances.',
    ],
    cues: ['Re1 — support the wedge', 'O-O — Black castles in', 'Qd3 — the kingside battery'],
  },
];

const data = JSON.parse(readFileSync(PATH, 'utf8'));
const before = data.length;
const kept = data.filter((p) => !DELETE_IDS.has(p.id));
const deleted = before - kept.length;
const existing = new Set(kept.map((p) => p.id));
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
  const COND = /\b(only|if|else|avoid|keep|restrain|passed|once|when|unless|never|don'?t|patient|flawless|sound|respect|balance|small|long-term|matters|later|weak|target)\b/i;
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
kept.push(...added);
writeFileSync(PATH, JSON.stringify(kept, null, 2) + '\n');
console.log(`deleted ${deleted} legacy, added ${added.length} new. total now ${kept.length}.`);
