#!/usr/bin/env node
// GothamChess Vienna Game (pro-gothamchess-vienna) — middlegame plans.
// Student = WHITE. Each plan anchors at a variation's data-derived position and
// plays his most-played cluster continuation from middlegame-past-spine.mjs.
// Every move chess.js-validated; theme gate self-checked. Stats from his
// 649-game Vienna corpus (67.8%). The Vienna Gambit (f4) is his sharp 1.e4 try.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/middlegame-plans.json';
const OPENING_ID = 'pro-gothamchess-vienna';
const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Vienna-Game',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
  'https://en.wikipedia.org/wiki/Vienna_Game',
];
const ORANGE = 'rgba(255, 165, 0, 0.55)';

const PLANS = [
  {
    id: 'mp-progothamchess-vie-gambit-main-attack',
    title: 'Vienna Gambit Main: Rb1 + Bb5 Queenside Attack',
    overview:
      "His main Vienna Gambit plan across 265 games. After the f4 gambit and the …d5 central clash, White recaptures the structure with the half-open b-file. The plan: Rb1 to pressure b7, Bb5 to pin and trade Black's defender of d5, then d4 to blast open the centre while Black's king is caught between castling long into the b-file and staying in the centre. The Vienna at its most aggressive: a pawn for a raging initiative.",
    pawnBreaks: ['d2-d4 blasting open the centre', 'e5 the cramping gambit pawn'],
    pieceManeuvers: ['Ra1-b1 pressuring b7 down the half-open file', 'Bf1-b5 pinning the c6-knight', 'Qg3 eyeing g7 and the kingside'],
    strategicThemes: ['Pressure b7 down the half-open b-file', 'Pin with Bb5 to win the d5-pawn', 'Open the centre with d4'],
    endgameTransitions: ['The bishop pair and the centre carry the initiative'],
    anchor: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 Nxc3 bxc3 c5 Qg3 Nc6 Nf3 Be6 Rb1',
    cont: ['Qd7', 'Bb5', 'O-O-O', 'O-O', 'Be7', 'd4'],
    ann: [
      '…Qd7 — Black connects the queen to the defence and prepares to castle long.',
      'Bb5 — the pin. White ties down the c6-knight, the key defender of d5 and e5, and prepares to trade it off.',
      '…O-O-O — Black castles long, but walks the king straight onto White’s half-open b-file.',
      'O-O — White tucks the king away, ready to throw the whole army at the queenside.',
      '…Be7 — Black develops, hoping to consolidate the extra pawn.',
      'd4 — the centre erupts. White strikes at c5, opens lines toward Black’s king on c8, and the Rb1/Bb5/Qg3 battery springs to life. The gambit pawn has bought a winning attack.',
    ],
    cues: ['Qd7 — Black prepares to castle long', 'Bb5 — pin the knight', 'O-O-O — Black’s king walks into it', 'O-O — tuck the king away', 'Be7 — Black develops', 'd4 — the centre erupts'],
  },
  {
    id: 'mp-progothamchess-vie-quiet-bc4-na4',
    title: 'Vienna Quiet Bc4: the Na4xc5 + f4 Plan',
    overview:
      "His 238-game plan in the quiet Bc4 system. Against Black's …Nc6/…Bc5 setup, White develops Bc4 and d3, then plays f4 for kingside space and reroutes the knight with Na4 to trade off Black's good bishop on c5. After the trade, White has the bishop pair, a half-open f-file, and the f4-f5 lever. A more positional Vienna, but still pointed at the king.",
    pawnBreaks: ['f2-f4 the kingside space-gaining lever', 'f4xe5 opening the f-file'],
    pieceManeuvers: ['Nc3-a4xc5 trading Black’s good bishop', 'Bc4 + d3 the quiet build', 'Qd1-f3 after …Bxf3'],
    strategicThemes: ['Trade the c5-bishop with Na4', 'Grab kingside space with f4', 'Use the bishop pair and the f-file'],
    endgameTransitions: ['The bishop pair tells once the position opens'],
    anchor: 'e4 e5 Nc3 Nc6 Bc4 Nf6 d3 Bc5 f4 d6 Nf3 Bg4 Na4 O-O Nxc5 dxc5',
    cont: ['h3', 'Bxf3', 'Qxf3', 'Nd4', 'Qf2', 'exf4'],
    ann: [
      'h3 — White questions the g4-bishop, forcing it to declare its intentions.',
      '…Bxf3 — Black trades, conceding the bishop pair to damage nothing — White recaptures cleanly.',
      'Qxf3 — the queen recaptures, eyeing the f-file and the kingside.',
      '…Nd4 — Black jumps the knight to the strong central square, hitting the queen.',
      'Qf2 — White sidesteps, keeping the pressure and defending f4.',
      '…exf4 — Black resolves the tension; after Bxf4 White has the two bishops, the half-open f-file, and the easier game. The quiet Vienna delivers a pleasant, lasting edge.',
    ],
    cues: ['h3 — question the bishop', 'Bxf3 — Black concedes the pair', 'Qxf3 — eye the f-file', 'Nd4 — Black centralizes', 'Qf2 — sidestep, hold f4', 'exf4 — open for the bishops'],
  },
  {
    id: 'mp-progothamchess-vie-nc6-forcing',
    title: 'Vienna Gambit …Nc6: the Bb5 Forcing Sequence',
    overview:
      "Against the …Nc6 defence in the gambit, his 61-game plan is a forcing tactical sequence. Bb5 pins, dxc3 rebuilds the centre, and after the checks on h4 and e4 White consolidates with Be3 and O-O-O. Then the combination Bxd7+/Rxd5 nets material and trades into a better ending — the engine-precise refutation of Black's active queen sorties. Sharp, concrete, and winning.",
    pawnBreaks: ['e5 the wedge', 'd-file pressure after O-O-O'],
    pieceManeuvers: ['Bf1-b5 the pin', 'Be3 consolidating', 'Bb5xd7+ then Rd1xd5 winning material'],
    strategicThemes: ['Pin with Bb5', 'Consolidate the centre with Be3/O-O-O', 'Win material with Bxd7+/Rxd5'],
    endgameTransitions: ['The forcing line trades into a clean material edge'],
    anchor: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 Nc6 Bb5 Nxc3 dxc3 Qh4+ g3 Qe4+ Be3 Bd7 O-O-O Nxe5',
    cont: ['Bxd7+', 'Nxd7', 'Rxd5', 'Qxf3', 'Nxf3', 'Bd6'],
    ann: [
      'Bxd7+ — White starts the forcing sequence, removing a defender with check.',
      '…Nxd7 recaptures; Black has no choice.',
      'Rxd5 — the point. The rook grabs the central pawn, hitting the queen and seizing the open file.',
      '…Qxf3 — Black trades queens, the only way to avoid worse.',
      'Nxf3 — White recaptures with tempo, eyeing e5 and the centre.',
      '…Bd6 — Black tries to hold, but White emerges from the forcing line a clean pawn up with the bishop pair and the better structure. The …Nc6 defence is refuted.',
    ],
    cues: ['Bxd7+ — remove the defender', 'Nxd7 — Black recaptures', 'Rxd5 — grab the pawn, hit the queen', 'Qxf3 — Black trades queens', 'Nxf3 — recapture with tempo', 'Bd6 — White is a clean pawn up'],
  },
  {
    id: 'mp-progothamchess-vie-f5-buildup',
    title: 'Vienna Gambit …f5: the Bf3/Ne2 Light-Square Squeeze',
    overview:
      "Against the …f5 defence, his 57-game plan targets the light squares Black weakened. After d3 and the …Nxc3/d4 exchanges, White redeploys with Be2-f3 to pressure the d5/b7 diagonal and Ne2 to reroute toward the d4-pawn and the f4-square. With Black's king stuck deciding where to hide, White's pieces converge on the holes around e6 and the loose f5-pawn.",
    pawnBreaks: ['d3-d4 challenging Black’s centre', 'c3-c4 undermining d5 later'],
    pieceManeuvers: ['Be2-f3 onto the long diagonal', 'Ng1-e2 rerouting to d4/f4', 'Qf3-g3 pressuring g7 and e5'],
    strategicThemes: ['Pressure the long light diagonal with Bf3', 'Reroute Ne2 toward the holes', 'Target the weak f5-pawn and e6'],
    endgameTransitions: ['Black’s loose pawns are long-term targets'],
    anchor: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 f5 d3 Nxc3 bxc3 d4 Qg3 Nc6 Be2 Be6 Bf3',
    cont: ['Qd7', 'Ne2', 'O-O-O'],
    ann: [
      '…Qd7 — Black connects pieces and prepares to castle queenside.',
      'Ne2 — the reroute. The knight heads toward d4 and f4, eyeing the holes Black created with …f5 and the weak e6-square.',
      '…O-O-O — Black castles long. White’s Bf3 rakes the diagonal toward b7 and d5, the knight is coming to strong squares, and the loose f5-pawn is a permanent target. White has a comfortable, pressing position for the pawn.',
    ],
    cues: ['Qd7 — Black readies to castle', 'Ne2 — reroute to the holes', 'O-O-O — press the diagonal and f5'],
  },
  {
    id: 'mp-progothamchess-vie-accepted-space',
    title: 'Vienna Gambit Accepted: the e5 Space Wedge',
    overview:
      "When Black grabs the gambit with …exf4 (his opponents do this 94% of the time at this branch), his 17-game plan stakes out space with e5, kicking the f6-knight back to g8 and cramping Black. Nf3 and d4 build a big pawn centre, and after …d6/dxe5 White has a lead in development and open lines for the pawn. The classic gambit trade: a pawn for time and the initiative.",
    pawnBreaks: ['e4-e5 the cramping wedge', 'd2-d4 building the big centre'],
    pieceManeuvers: ['Ng1-f3 rapid development', 'the e5/d4 pawn duo cramping Black', 'Bf1 toward c4 for the attack'],
    strategicThemes: ['Cramp Black with the e5 wedge', 'Build the d4 centre', 'Lead in development for the pawn'],
    endgameTransitions: ['Keep attacking — the development lead is the compensation'],
    anchor: 'e4 e5 Nc3 Nf6 f4 exf4 e5 Ng8 Nf3 d6',
    cont: ['d4', 'dxe5'],
    ann: [
      'd4 — White builds the big pawn centre, the e5/d4 duo cramping Black while every White piece has an open path to develop.',
      '…dxe5 — Black strikes back at the centre, the principled freeing try. After dxe5 White stands clearly better: a big lead in development, open lines, and Black’s knight still on its home square. The gambit pawn bought a powerful initiative.',
    ],
    cues: ['d4 — build the big centre', 'dxe5 — Black strikes back, White leads'],
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
  if (p.cont.length !== p.ann.length || p.cont.length !== p.cues.length) { console.error(`LENGTH ${p.id}`); failed++; continue; }

  const SQ = /([a-h][1-8])/g;
  const COND = /\b(only|if|else|avoid|keep|restrain|passed|once|when|unless|never|don'?t|patient|flawless|sound|respect|balance|small|long-term|matters|later)\b/i;
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
console.log(`added ${added.length} Vienna plans. total now ${data.length}.`);
