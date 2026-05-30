#!/usr/bin/env node
// GothamChess London System (pro-gothamchess-london) — middlegame plans.
// Student = WHITE. 5 data-anchored plans from the 327-game corpus, replacing
// the 2 legacy overview-only plans (no playableLines; verified unreferenced).
// Every move chess.js-validated; theme gate self-checked.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/middlegame-plans.json';
const OPENING_ID = 'pro-gothamchess-london';
const DELETE_IDS = new Set(['mp-pro-gothamchess-london-c4', 'mp-pro-gothamchess-london-e4']);
const SRC = [
  'book:chess-strategy',
  'https://www.chess.com/openings/London-System',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
  'https://en.wikipedia.org/wiki/London_System',
];
const ORANGE = 'rgba(255, 165, 0, 0.55)';

const PLANS = [
  {
    id: 'mp-progothamchess-london-standard-ne5',
    title: 'London Standard: the Ne5 Outpost + Kingside Build',
    overview:
      "His main London plan across the 80-game standard line. After the central trades, White plants a knight on e5 — the classic London outpost — supported by the d4-pawn and eyeing f7, g6, and the kingside. The Bf4-g3 bishop, the Bd3 battery, and the e5-knight all point at Black's king, the textbook London attacking setup.",
    pawnBreaks: ['the e5 outpost anchored by d4'],
    pieceManeuvers: ['Nf3-e5 the central outpost', 'Bf4-e3 supporting d4', 'Nd2-f3-e5 the knight route'],
    strategicThemes: ['Plant a knight on e5', 'Train the bishops on the kingside', 'Build a slow kingside attack'],
    endgameTransitions: ['The space edge carries into the ending'],
    anchor: 'd4 d5 Bf4 Nf6 e3 c5 c3 Nc6 Nd2 e6 Ngf3 cxd4 exd4 Nh5 Be3',
    cont: ['Bd6', 'Ne5', 'g6', 'Nd3'],
    ann: [
      '…Bd6 — Black develops the bishop, contesting the kingside diagonal.',
      'Ne5 — the London outpost. The knight lands on the dominant central square, anchored by d4 and eyeing f7 and g6.',
      '…g6 — Black blunts the b1-h7 diagonal, but weakens the dark squares.',
      'Nd3 — White reroutes flexibly, keeping the pressure and eyeing the c5- and e5-squares; the outpost play gives White a comfortable, lasting edge.',
    ],
    cues: ['Bd6 — Black contests the diagonal', 'Ne5 — the London outpost', 'g6 — Black weakens dark squares', 'Nd3 — reroute, keep pressing'],
  },
  {
    id: 'mp-progothamchess-london-jobava-nb5',
    title: 'Jobava-London: the Nb5 Knight Raid',
    overview:
      "The aggressive Jobava hybrid (early Nc3) across his 58-game sample. Instead of the quiet London, White develops the knight to c3 and jumps to b5, hitting the c7-square and forcing concessions. After …Na6 and a3, the knight returns to c3 having provoked weaknesses, and White builds with e3 and a kingside attack. A sharper, more provocative London.",
    pawnBreaks: ['e3 supporting the centre', 'a3 securing the b5-knight'],
    pieceManeuvers: ['Nc3-b5 raiding the c7-square', 'Nb5-c3 the return with tempo gained', 'Bf4 on the active diagonal'],
    strategicThemes: ['Jump Nb5 to provoke weaknesses', 'Develop with tempo', 'Aim for a kingside attack'],
    endgameTransitions: ['The provoked weaknesses are long-term targets'],
    anchor: 'd4 d5 Bf4 Nf6 Nc3 e6 Nb5 Na6 a3 c6 Nc3',
    cont: ['Bd6', 'e3'],
    ann: [
      '…Bd6 — Black challenges the f4-bishop after the knight has been provoked to a6.',
      'e3 — White completes the setup; the Nb5 raid has provoked …Na6 and …c6, leaving Black slightly tangled while White develops harmoniously with the bishop pair pointing kingside. A pleasant, provocative edge.',
    ],
    cues: ['Bd6 — Black challenges the bishop', 'e3 — complete the setup, press'],
  },
  {
    id: 'mp-progothamchess-london-e6-classical',
    title: 'London vs …e6: the Classical Bg3 + c3 Setup',
    overview:
      "Against the solid …e6, his 65-game plan is the pure classical London: Bf4-g3 tucks the bishop safely, Bd3 builds the battery toward h7, Nbd2 and c3 support the centre, and White prepares the e4 break or a kingside expansion. Black's …Bd6 and …Qc7 contest the diagonal, but White's harmonious setup gives an easy, pleasant game.",
    pawnBreaks: ['c3 supporting d4', 'e3-e4 the central break later'],
    pieceManeuvers: ['Bf4-g3 the safe retreat', 'Bf1-d3 the h7-battery', 'Nb1-d2 supporting e4'],
    strategicThemes: ['Tuck the bishop on g3', 'Build the Bd3 battery', 'Prepare e4 or a kingside push'],
    endgameTransitions: ['The solid structure favours the better-placed pieces'],
    anchor: 'd4 d5 Bf4 Nf6 e3 e6 Nf3 Bd6 Bg3 O-O Nbd2 c5 c3',
    cont: ['Qc7', 'Bd3'],
    ann: [
      '…Qc7 — Black lines the queen up against the g3-bishop and prepares to contest the kingside.',
      'Bd3 — White builds the battery toward h7, completing the harmonious London setup. The bishops point at the king, the knights support a future e4, and White has a comfortable, risk-free game with the easier plan.',
    ],
    cues: ['Qc7 — Black contests the diagonal', 'Bd3 — build the h7-battery'],
  },
  {
    id: 'mp-progothamchess-london-c6-c4break',
    title: 'London vs …c6: the c4 Central Break',
    overview:
      "Against the …c6 Slav-like setup, his 39-game plan switches gears: rather than the slow London, White strikes with c4! to challenge Black's centre directly. After …Bg4 developing, c4 opens the position and gives White active central play with the bishop pair. A more dynamic London treatment that exploits Black's passive …c6.",
    pawnBreaks: ['c2-c4 the central break challenging d5'],
    pieceManeuvers: ['Nf3 the natural development', 'Bf4 on the active diagonal', 'the c4 lever vs d5'],
    strategicThemes: ['Strike with c4 against …c6', 'Open the position for the bishops', 'Active central play'],
    endgameTransitions: ['The active pieces favour White in simplification'],
    anchor: 'd4 d5 Bf4 c6 e3 Nf6 Nf3',
    cont: ['Bg4', 'c4'],
    ann: [
      '…Bg4 — Black develops the bishop actively, pinning the f3-knight.',
      'c4 — the break. White challenges Black’s d5-centre directly, opening the position for the bishop pair and seizing active central play. Against the passive …c6, the c4 lever is the dynamic, ambitious choice — White gets the freer game.',
    ],
    cues: ['Bg4 — Black pins the knight', 'c4 — strike the centre'],
  },
  {
    id: 'mp-progothamchess-london-kid-rooksac',
    title: 'London vs KID: the h4-h5 Rook-Sacrifice Attack',
    overview:
      "His named opposite-side-castling weapon against the …g6 King's Indian setup. With Nc3 and Bf4 aimed at the kingside, White storms with h4-h5 and — when Black takes — sacrifices the rook on h5! The classic Greek-gift-style breakthrough: Rxh5 gxh5 Qxh5 rips open the king and the queen and bishop deliver a crushing attack. Pure London aggression.",
    pawnBreaks: ['h4-h5 the storming break', 'h5xg6 ripping open the king'],
    pieceManeuvers: ['Rh1xh5 the rook sacrifice', 'Qd1xh5 the queen joining the attack', 'Bf4 raking the kingside'],
    strategicThemes: ['Storm with h4-h5 vs the fianchetto', 'Sacrifice the rook on h5', 'Crash through to the king'],
    endgameTransitions: ['No endgame — this is a direct mating attack'],
    anchor: 'd4 d5 Bf4 Nf6 e3 g6 Nc3 Bg7 h4',
    cont: ['O-O', 'h5', 'Nxh5', 'Rxh5', 'gxh5', 'Qxh5'],
    ann: [
      '…O-O — Black castles into the danger zone, directly opposite White’s attacking intentions.',
      'h5 — the storm. White rams the h-pawn forward to crack open the fianchetto in front of Black’s king.',
      '…Nxh5 — Black takes the pawn, but this opens the h-file fatally.',
      'Rxh5 — the rook sacrifice! White gives up the exchange to demolish the kingside pawn shield.',
      '…gxh5 — Black must accept, shattering the pawns around the king.',
      'Qxh5 — the queen crashes in. With the king stripped bare, the Bf4 and the heavy pieces deliver a decisive attack. The London’s most violent weapon.',
    ],
    cues: ['O-O — Black castles into it', 'h5 — ram the h-pawn', 'Nxh5 — opens the h-file', 'Rxh5 — the rook sacrifice', 'gxh5 — the king is stripped', 'Qxh5 — crash in, decisive'],
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
  const COND = /\b(only|if|else|avoid|keep|restrain|passed|once|when|unless|never|don'?t|patient|flawless|sound|respect|balance|small|long-term|matters|later|no endgame)\b/i;
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
