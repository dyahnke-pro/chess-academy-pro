#!/usr/bin/env node
// GothamChess Trompowsky (pro-gothamchess-trompowsky) — middlegame plans.
// Student = WHITE. Each plan anchors at a variation's data-derived position and
// PLAYS his most-played cluster continuation (the real plan, from
// middlegame-past-spine.mjs). Every move chess.js-validated; theme gate needs a
// WHITE move landing on a declared goal square — self-checked before write.
// Stats from the 1,827-game Trompowsky corpus (61.6%).
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/middlegame-plans.json';
const OPENING_ID = 'pro-gothamchess-trompowsky';
const SRC = [
  'book:queens-gambit',
  'https://www.chess.com/openings/Trompowsky-Attack',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
  'https://www.chess.com/member/gothamchess',
];
const ORANGE = 'rgba(255, 165, 0, 0.55)';

const PLANS = [
  {
    id: 'mp-progothamchess-tromp-e6-bishoppair',
    title: 'Trompowsky vs …e6: Bishop-Pair + f4 Pawn Storm',
    overview:
      "His main-line plan against the solid …e6 setup, across 464 games. White trades the dark bishop for the f6-knight to claim the bishop pair, then rolls the kingside with f4 and lines the queen up behind the d3-bishop. Black's light-squared bishop gets traded off, leaving White with a space edge and the easier attacking plan. Classic Trompowsky: trade, then push.",
    pawnBreaks: ['f2-f4 storming the kingside', 'c3-c4 challenging the d5-centre later'],
    pieceManeuvers: ['Bg5xf6 grabbing the bishop pair', 'Bd3 + Qe2 battery toward h7', 'Ba6/Bxd3 trade-down'],
    strategicThemes: ['Trade for the bishop pair on f6', 'Storm with f4 on the kingside', 'A space edge and the easier game'],
    endgameTransitions: ['The bishop pair tells in the simplified ending'],
    anchor: 'd4 Nf6 Bg5 e6 Nd2 h6 Bh4 d5 e3 Be7 Bd3 b6 c3 O-O',
    cont: ['Bxf6', 'Bxf6', 'f4', 'Ba6', 'Qe2'],
    ann: [
      'Bxf6 — White cashes in the dark bishop for the knight, taking the bishop pair before Black can untangle.',
      '…Bxf6 recaptures; Black’s remaining bishop is the passive one.',
      'f4 — the pawn storm begins. White grabs kingside space and prepares f5 to crack open Black’s king.',
      '…Ba6 — Black offers to trade the bad light bishop off via a6.',
      'Qe2 — White lines the queen up behind the d3-bishop and guards the trade square, keeping the attacking bishop. The space edge and the f-pawn roller give White the easier game.',
    ],
    cues: ['Bxf6 — grab the bishop pair', 'Bxf6 — Black recaptures', 'f4 — storm the kingside', 'Ba6 — Black offers a trade', 'Qe2 — keep the attacking bishop'],
  },
  {
    id: 'mp-progothamchess-tromp-d5-squeeze',
    title: 'Trompowsky vs …d5: the e3/c3 Squeeze + e4 Break',
    overview:
      "Against the solid …d5, his 439-game plan is a patient squeeze: e3 and c3 build a small, solid centre, Nd2 and Qb3 pressure the queenside, and then White uncorks the e4 break to open the position for the bishop pair. Black's …c5 and …Qb6 try for counterplay, but White's e4 at the right moment seizes the centre.",
    pawnBreaks: ['e3-e4 the central break that opens the game'],
    pieceManeuvers: ['Bg5xf6 doubling Black’s pawns', 'Nb1-d2 supporting e4', 'Qd1-b3 hitting the queenside'],
    strategicThemes: ['Build a solid c3/e3 centre', 'Pressure the queenside with Qb3', 'Open with e4 for the bishops'],
    endgameTransitions: ['Black’s doubled f-pawns are a long-term endgame target'],
    anchor: 'd4 Nf6 Bg5 d5 e3 c5 c3 Nc6 Nd2 Qb6 Qb3 c4 Qc2',
    cont: ['g6', 'Bxf6', 'exf6', 'e4', 'dxe4'],
    ann: [
      '…g6 — Black prepares to fianchetto, but loosens the kingside dark squares.',
      'Bxf6 — White trades off to double Black’s pawns and damage the structure.',
      '…exf6 recaptures, accepting the doubled f-pawns.',
      'e4 — the break. White strikes the centre, opening lines for the bishop pair exactly when Black’s structure is compromised.',
      '…dxe4 — Black takes, but now the position is open and White’s pieces are the better-placed ones, pressing the weakened pawns.',
    ],
    cues: ['g6 — Black loosens dark squares', 'Bxf6 — double the pawns', 'exf6 — Black recaptures', 'e4 — the central break', 'dxe4 — open for the bishops'],
  },
  {
    id: 'mp-progothamchess-tromp-g6-doubled',
    title: 'Trompowsky vs …g6: Double the Pawns, Fianchetto, Press f5',
    overview:
      "Against the …g6 fianchetto, his 241-game plan: trade on f6 immediately to saddle Black with doubled f-pawns, then build the mirror fianchetto with g3 and Bg2 to pressure Black's loosened light squares and the d5-break. Black's …f5 grabs space but creates holes; White's bishop on g2 and the e3/Ne2 setup target them.",
    pawnBreaks: ['e3-e4 hitting Black’s …f5 advance'],
    pieceManeuvers: ['Bg5xf6 forcing doubled f-pawns', 'g3 + Bf1-g2 the long-diagonal fianchetto', 'Ng1-e2 eyeing the holes'],
    strategicThemes: ['Double the f-pawns with Bxf6', 'Fianchetto to press the light squares', 'Exploit the holes from …f5'],
    endgameTransitions: ['The healthier pawn structure wins the long game'],
    anchor: 'd4 Nf6 Bg5 g6 Bxf6 exf6 e3 Bg7 g3 O-O Bg2 f5',
    cont: ['Ne2', 'Nc6', 'O-O', 'd6', 'c4'],
    ann: [
      'Ne2 — White develops the knight toward the holes Black created on the light squares.',
      '…Nc6 develops; Black hopes the bishop pair compensates for the doubled pawns.',
      'O-O — White castles, completing the harmonious fianchetto setup.',
      '…d6 — Black props the centre.',
      'c4 — White claims queenside space, clamps the d5-square, and presses Black’s damaged structure. The healthier pawns favour White.',
    ],
    cues: ['Ne2 — toward the holes', 'Nc6 — Black develops', 'O-O — complete the setup', 'd6 — Black props the centre', 'c4 — claim queenside space'],
  },
  {
    id: 'mp-progothamchess-tromp-c5-gambit',
    title: 'Trompowsky vs …c5: the b2-Gambit Big Centre',
    overview:
      "Against the sharp …c5, his 226-game gambit plan: push d5, let Black grab the b2-pawn with …Qxb2, and in return build a massive e4/f4 centre with a huge development lead. The queen on b2 gets chased with Rb1 and Bd2, costing Black tempo after tempo while White's centre rolls forward. Pure Trompowsky aggression: a pawn for a raging initiative.",
    pawnBreaks: ['e4-e5 the big centre surging forward', 'f2-f4 supporting the centre roller'],
    pieceManeuvers: ['Ra1-b1 chasing the b2-queen', 'Bc1-d2 gaining tempo on the queen', 'Nb1-c3 hitting b2 and supporting e4'],
    strategicThemes: ['Sacrifice b2 for a development lead', 'Build the e4/f4 big centre', 'Chase the queen, win tempo'],
    endgameTransitions: ['If Black survives, the extra pawn matters — so keep attacking'],
    anchor: 'd4 Nf6 Bg5 c5 d5 Qb6 Nc3 Qxb2 Bd2 Qb6 e4 d6 f4 g6 Rb1',
    cont: ['Qd8', 'e5', 'dxe5', 'fxe5'],
    ann: [
      '…Qd8 — the queen finally scuttles home, having cost Black four tempi; White’s lead in development is enormous.',
      'e5 — the big centre advances, striking at the d6-pawn and ripping open lines.',
      '…dxe5 — Black must take.',
      'fxe5 — White recaptures on e5; the pawn roller stays intact, the f-file is half-open toward Black’s king, and Black is still stuck in the centre. The gambit pawn bought a winning initiative.',
    ],
    cues: ['Qd8 — queen limps home', 'e5 — the centre rolls', 'dxe5 — Black must take', 'fxe5 — open f-file, big initiative'],
  },
  {
    id: 'mp-progothamchess-tromp-vaganian-gambit',
    title: 'Trompowsky Vaganian: the h4 Gambit Attack',
    overview:
      "Against the critical …Ne4, his 432-game plan is the razor-sharp h4 gambit. White ignores the knight, plays h4 to support the bishop, and after the …Nxg5/hxg5 trade lets Black grab b2 — then opens the h-file with g6 and builds a big centre with e4. Black wins a pawn but faces a raging attack down the h-file against an uncastled king. The sharpest line in the whole repertoire.",
    pawnBreaks: ['e4 building the centre', 'g6 ripping open the h-file'],
    pieceManeuvers: ['h4 supporting the bishop and opening the rook’s file', 'Ng1-f3 developing toward the centre', 'Nb1-d2 hitting e4'],
    strategicThemes: ['Gambit b2 for an open h-file', 'Build the e4 centre with tempo', 'Attack the uncastled king'],
    endgameTransitions: ['Keep attacking — the open king is the target, not the pawn count'],
    anchor: 'd4 Nf6 Bg5 Ne4 h4 c5 d5 Qb6 Nd2 Nxg5 hxg5 Qxb2',
    cont: ['g6', 'fxg6', 'Ngf3', 'd6', 'e4'],
    ann: [
      'g6 — White cracks open the h-file at once, offering the g6-pawn to expose Black’s king side.',
      '…fxg6 — Black takes, but now the h-file is wide open with White’s rook already on h1.',
      'Ngf3 — White develops with tempo, eyeing the e5- and g5-squares and the dark holes around Black’s king.',
      '…d6 — Black tries to free the position.',
      'e4 — the centre surges forward; White has a roaring initiative, an open h-file, and Black’s king stuck in the middle. The b2-pawn was a cheap price.',
    ],
    cues: ['g6 — rip the h-file open', 'fxg6 — Black takes', 'Ngf3 — develop with tempo', 'd6 — Black tries to free up', 'e4 — the centre surges'],
  },
];

const data = JSON.parse(readFileSync(PATH, 'utf8'));
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
  if (p.cont.length !== p.ann.length || p.cont.length !== p.cues.length) {
    console.error(`LENGTH mismatch ${p.id}`); failed++; continue;
  }

  // THEME-GATE self-check: a WHITE move must land on a declared goal square.
  const SQ = /([a-h][1-8])/g;
  const COND = /\b(only|if|else|avoid|keep|restrain|passed|once|when|unless|never|don'?t|patient|flawless|sound|respect|balance|small|long-term|matters)\b/i;
  const goals = new Set();
  for (const pb of p.pawnBreaks) if (!COND.test(pb)) (pb.match(SQ) || []).forEach((q) => goals.add(q));
  for (const pm of p.pieceManeuvers) (pm.match(SQ) || []).forEach((q) => goals.add(q));
  const demo = moveInfo.some((mi) => mi.color === 'w' && goals.has(mi.to));
  if (!demo) {
    console.error(`THEME-EMPTY ${p.id}: goals {${[...goals].join(',')}}; white tos=${moveInfo.filter((m) => m.color === 'w').map((m) => m.to).join(',')}`);
    failed++; continue;
  }
  const PROMISE = /\b(ready for|ready to|prepares? to|preparing to|will follow|is ready|planning to|intends? to|swinging to|aims? to|looking to|poised|about to|coming next|next comes|to follow)\b/i;
  if (PROMISE.test(p.ann[p.ann.length - 1])) { console.error(`PROMISE-ENDING ${p.id}`); failed++; continue; }

  if (existing.has(p.id)) { console.log(`skip existing ${p.id}`); continue; }

  added.push({
    id: p.id,
    openingId: OPENING_ID,
    criticalPositionFen: critFen,
    title: p.title,
    overview: p.overview,
    pawnBreaks: p.pawnBreaks,
    pieceManeuvers: p.pieceManeuvers,
    strategicThemes: p.strategicThemes,
    endgameTransitions: p.endgameTransitions,
    playableLines: [{
      fen: critFen,
      moves: p.cont,
      annotations: p.ann,
      arrows: p.cont.map(() => []),
      highlights: moveInfo.map((mi) => [{ square: mi.to, color: ORANGE }]),
      learnCues: p.cues,
      title: p.title,
      intro: p.overview,
      sources: SRC,
    }],
  });
}

if (failed > 0) { console.error(`\n${failed} plan(s) failed — NOT writing.`); process.exit(1); }
data.push(...added);
writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`added ${added.length} Trompowsky plans. total now ${data.length}.`);
