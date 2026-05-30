#!/usr/bin/env node
// GothamChess English Opening (pro-gothamchess-english) — middlegame plans.
// Student = WHITE. Each plan anchors at a variation's data-derived position and
// plays his most-played cluster continuation from middlegame-past-spine.mjs.
// Every move chess.js-validated; theme gate self-checked (a WHITE move lands on
// a declared goal square). Stats from his 1,599-game English corpus (62.2%).
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/middlegame-plans.json';
const OPENING_ID = 'pro-gothamchess-english';
const SRC = [
  'book:chess-strategy',
  'https://www.chess.com/openings/English-Opening',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
  'https://en.wikipedia.org/wiki/English_Opening',
];
const ORANGE = 'rgba(255, 165, 0, 0.55)';

const PLANS = [
  {
    id: 'mp-progothamchess-eng-e6-doublefianchetto',
    title: 'English vs …e6: the b3/Bb2 Double-Fianchetto Squeeze',
    overview:
      "His main Anti-French plan across 162 games. White declines to enter a French and instead builds the reversed-Hedgehog: e3, Nf3, b3 and Bb2 train the dark bishop on the long diagonal, then d4 challenges the centre. After the …c5/cxd5 exchanges, White gets the isolated-queen-pawn position to play AGAINST, with the Bb2 and pressure down the c-file. Slow, strategic, and deeply his style.",
    pawnBreaks: ['d2-d4 challenging the centre', 'c4xd5 opening the c-file'],
    pieceManeuvers: ['b3 + Bc1-b2 the long-diagonal fianchetto', 'Bf1-e2 calm development', 'Nf3 + Nc3 the natural squares'],
    strategicThemes: ['Build the b3/Bb2 reversed-Hedgehog', 'Play against the isolated d5-pawn', 'Pressure down the half-open c-file'],
    endgameTransitions: ['The isolated d5-pawn is a target into the ending'],
    anchor: 'c4 e6 Nc3 d5 e3 Nf6 Nf3 Be7 b3 O-O Bb2 c5 cxd5 exd5 d4 Nc6',
    cont: ['Be2', 'Ne4', 'O-O'],
    ann: [
      'Be2 — calm development, completing the harmonious setup before resolving the centre tension.',
      '…Ne4 — Black jumps into the outpost, the typical freeing try in the isolated-pawn middlegame.',
      'O-O — White castles into a risk-free position: the Bb2 rakes the long diagonal, the d5-pawn is a fixed target, and the c-file is White’s to press. The reversed-Hedgehog gives White all the long-term trumps.',
    ],
    cues: ['Be2 — calm development', 'Ne4 — Black’s freeing jump', 'O-O — press the isolated pawn'],
  },
  {
    id: 'mp-progothamchess-eng-e5-reversedsicilian',
    title: 'English vs …e5: the Reversed Sicilian Bishop-Pair',
    overview:
      "Against the Symmetric …e5 (a Sicilian a tempo up), his 78-game plan grabs the bishop pair. After …Bb4 pins the knight, Qc2 prepares to recapture on c3 with the queen, keeping the structure clean. Then b3 and Bb2 fianchetto, and White uses the two bishops and the central majority. The extra tempo of the reversed Sicilian means White is the one with the initiative.",
    pawnBreaks: ['d2-d4 the central break', 'b3 supporting the fianchetto'],
    pieceManeuvers: ['Qd1-c2 recapturing on c3 with the queen', 'Bc1-b2 the long-diagonal bishop', 'the bishop pair after …Bxc3'],
    strategicThemes: ['Keep the bishop pair after …Bxc3', 'Fianchetto with b3/Bb2', 'Use the reversed-Sicilian extra tempo'],
    endgameTransitions: ['The bishop pair tells in an open ending'],
    anchor: 'c4 e5 Nc3 Nf6 Nf3 Nc6 e3 Bb4 Qc2 Bxc3 Qxc3 Qe7 b3',
    cont: ['d5', 'Bb2', 'd4'],
    ann: [
      '…d5 — Black grabs central space, the principled try to justify giving up the bishop.',
      'Bb2 — White completes the fianchetto; the bishop eyes the e5-pawn and the long diagonal.',
      '…d4 — Black pushes on, gaining space but locking in the structure. After exd4, White’s bishop pair and queenside play give a comfortable, pleasant edge — the reversed Sicilian with the extra tempo working.',
    ],
    cues: ['d5 — Black grabs the centre', 'Bb2 — eye the long diagonal', 'd4 — Black overextends'],
  },
  {
    id: 'mp-progothamchess-eng-c5-maroczy',
    title: 'English vs …c5: the d4 Break into a Maroczy Bind',
    overview:
      "Against the Symmetric …c5, his 73-game plan strikes with d4. After …cxd4 Nxd4, White reaches a Maroczy-style structure with the c4-pawn clamping d5, a classic positional bind. Black fianchettoes with …g6/…Bg7, but White's space and the c4/e4 pawn duo restrain Black's freeing breaks. The English at its most strategic: bind, restrain, expand.",
    pawnBreaks: ['d2-d4 the central break that defines the structure'],
    pieceManeuvers: ['Nf3xd4 the strong central knight', 'Nc3 supporting the c4/e4 clamp', 'Bf1 toward the kingside'],
    strategicThemes: ['Strike with d4 into a Maroczy bind', 'Clamp the d5-square with c4', 'Restrain Black’s …d5 and …b5 breaks'],
    endgameTransitions: ['The space bind carries into a favourable ending'],
    anchor: 'c4 c5 Nc3 Nc6 Nf3 g6',
    cont: ['d4', 'cxd4', 'Nxd4'],
    ann: [
      'd4 — the central break, challenging Black’s …c5 directly and opening the position for White’s development lead.',
      '…cxd4 — Black takes; declining lets White play dxc5 with a pull.',
      'Nxd4 — the knight recaptures on a dominant central square. White has the c4-pawn clamping d5, a space edge, and the easier game: a textbook Maroczy bind where Black must fight for every freeing break.',
    ],
    cues: ['d4 — the central break', 'cxd4 — Black must take', 'Nxd4 — the Maroczy bind'],
  },
  {
    id: 'mp-progothamchess-eng-c6-slav-g4',
    title: 'English vs …c6: Double-Fianchetto then the g4 Thrust',
    overview:
      "Against the …c6 Slav-like setup, his 101-game plan builds the same b3/Bb2 structure, then surprises with the aggressive g4! thrust. After Bb2, Qc2 and O-O, White expands on the kingside with g4-g5, gaining space and chasing Black's f6-knight while the queenside stays solid. A modern, double-edged way to play the English: solid base, sharp wings.",
    pawnBreaks: ['g2-g4-g5 the kingside expansion', 'e3-e4 a central break later'],
    pieceManeuvers: ['b3 + Bc1-b2 the long-diagonal fianchetto', 'Qd1-c2 supporting e4 and eyeing the kingside', 'g4 chasing the f6-knight'],
    strategicThemes: ['Build the b3/Bb2 base', 'Expand with the g4-g5 thrust', 'Chase the knight, grab kingside space'],
    endgameTransitions: ['The kingside space lingers as a long-term asset'],
    anchor: 'c4 c6 Nc3 d5 e3 Nf6 Nf3 e6 b3 Nbd7 Bb2 Bd6 Qc2 O-O',
    cont: ['g4'],
    ann: [
      'g4 — the thrust. With both kings’ structures set, White grabs kingside space, threatens g5 to chase the f6-knight, and opens lines toward Black’s castled king. The b3/Bb2 base stays rock-solid while the kingside catches fire — the modern, aggressive face of the English.',
    ],
    cues: ['g4 — the kingside thrust'],
  },
  {
    id: 'mp-progothamchess-eng-g6-botvinnik-storm',
    title: 'English vs …g6: the Botvinnik f4 Kingside Storm',
    overview:
      "Against the …g6 KID setup, his 154-game plan is the Botvinnik System turned aggressive: c4/Nc3/d4/e4 build the big centre, then f4 and the …e5/fxe5 exchange lead to d5, locking the centre and freeing White's hands for a kingside pawn storm. With the centre closed, White rolls the f- and g-pawns at Black's king. The English transposing into a King's-Indian-Attack avalanche.",
    pawnBreaks: ['f2-f4 the storming break', 'd4-d5 locking the centre for the wing attack'],
    pieceManeuvers: ['Ng1-f3 supporting the centre', 'Bf1-d3 aiming at the kingside', 'the f4/e4 pawn duo'],
    strategicThemes: ['Build the Botvinnik c4/d4/e4 centre', 'Lock with d5, storm with f4', 'Attack the king behind the closed centre'],
    endgameTransitions: ['Keep attacking — the closed centre means the wing is decisive'],
    anchor: 'c4 g6 Nc3 Bg7 d4 d6 e4 Nd7 f4 e5 fxe5 dxe5 d5',
    cont: ['Ngf6', 'Nf3', 'O-O', 'Bd3'],
    ann: [
      '…Ngf6 — Black develops the knight, hitting the e4-pawn.',
      'Nf3 — White defends e5-square ideas and develops toward the kingside attack.',
      '…O-O — Black castles into what will become the storm zone.',
      'Bd3 — White lines the bishop up toward h7 and completes the attacking setup. With the centre locked by d5, White’s plan is clear: roll the kingside pawns and pieces at Black’s king while the centre stays shut. The Botvinnik avalanche.',
    ],
    cues: ['Ngf6 — Black hits e4', 'Nf3 — develop to attack', 'O-O — Black castles into the storm', 'Bd3 — aim at the king'],
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
console.log(`added ${added.length} English plans. total now ${data.length}.`);
