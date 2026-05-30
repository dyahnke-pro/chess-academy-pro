#!/usr/bin/env node
// GothamChess Anti-Sicilian Rossolimo (pro-gothamchess-anti-sicilian) — plans.
// Student = WHITE. Thin Bb5 corpus (his anti-Sicilian is mainly the Wing Gambit),
// so 3 plans anchored on the entry's theory-validated variation PGNs + his Bxc6
// games (Bxc6 doubling appears in every one of his Rossolimo wins). Replaces the
// 2 legacy overview-only plans. Every move chess.js-validated; theme self-checked.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/middlegame-plans.json';
const OPENING_ID = 'pro-gothamchess-anti-sicilian';
const DELETE_IDS = new Set(['mp-pro-gothamchess-antisicilian-Bg5', 'mp-pro-gothamchess-antisicilian-d4']);
const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
  'https://en.wikipedia.org/wiki/Rossolimo_Variation',
];
const ORANGE = 'rgba(255, 165, 0, 0.55)';

const PLANS = [
  {
    id: 'mp-progothamchess-antisic-g6-d4break',
    title: 'Rossolimo vs …g6: Bxc6 Doubling + the d4 Break',
    overview:
      "His core Rossolimo method, seen in every one of his Bb5 wins. Against the …g6 fianchetto, White trades Bxc6 to saddle Black with doubled c-pawns, then builds with c3 and strikes d4 to open the centre while Black's structure is compromised. The two healthy pawn-islands versus Black's three, plus the central break, give White the lasting structural edge.",
    pawnBreaks: ['c3-d4 the central break', 'd4 opening the centre'],
    pieceManeuvers: ['Bb5xc6 doubling the c-pawns', 'the c3/d4 pawn duo', 'Nf3 supporting d4'],
    strategicThemes: ['Double the c-pawns with Bxc6', 'Build c3 then strike d4', 'Play against the doubled pawns'],
    endgameTransitions: ['The healthier structure wins the long game'],
    anchor: 'e4 c5 Nf3 Nc6 Bb5 g6 Bxc6 bxc6 O-O Bg7 c3',
    cont: ['Nh6', 'd4', 'cxd4', 'cxd4'],
    ann: [
      '…Nh6 — Black develops the knight toward f5, eyeing the centre.',
      'd4 — the break. With Black’s queenside pawns doubled, White opens the centre to exploit the superior structure.',
      '…cxd4 — Black takes; declining leaves White a big centre.',
      'cxd4 — White recaptures, leaving a healthy d4-pawn against Black’s doubled c-pawns. The structural edge is permanent — White has the easier game with the better pawns.',
    ],
    cues: ['Nh6 — Black eyes f5', 'd4 — the central break', 'cxd4 — Black must take', 'cxd4 — superior structure'],
  },
  {
    id: 'mp-progothamchess-antisic-accel-storm',
    title: 'Rossolimo Accelerated: the e5 Space Wedge',
    overview:
      "The Carlsen-inspired accelerated pawn storm. After Bxc6 and d3, White rams e5 to grab a central space wedge, cramping Black's position and gaining kingside attacking chances. With Black's structure already doubled from Bxc6, the e5-wedge and the resulting space give White a pleasant, aggressive game — the modern, ambitious way to handle the Rossolimo.",
    pawnBreaks: ['e4-e5 the central space wedge', 'd3 supporting the centre'],
    pieceManeuvers: ['Bb5xc6 the structural trade', 'Nb1-d2 supporting e4 and rerouting', 'Nf3 eyeing e5/d4'],
    strategicThemes: ['Grab space with the e5 wedge', 'Cramp Black after the Bxc6 trade', 'Build a kingside initiative'],
    endgameTransitions: ['The space and structure edge carry into the ending'],
    anchor: 'e4 c5 Nf3 Nc6 Bb5 e6 Bxc6 bxc6 d3 d5',
    cont: ['e5', 'Bd7', 'Nbd2'],
    ann: [
      'e5 — the space wedge. White rams the pawn forward, cramping Black and clamping the kingside dark squares.',
      '…Bd7 — Black develops the bishop, trying to activate the light-squared piece behind the doubled pawns.',
      'Nbd2 — White develops the knight toward the kingside and the e4/c4 squares, building the initiative behind the e5-wedge. The space and the doubled pawns give White the comfortable, ambitious game.',
    ],
    cues: ['e5 — the space wedge', 'Bd7 — Black develops', 'Nbd2 — build behind the wedge'],
  },
  {
    id: 'mp-progothamchess-antisic-e6-open',
    title: 'Rossolimo vs …e6: the Open d4 Centre',
    overview:
      "The main …e6 line where White keeps the bishop with Bf1 and breaks with d4. After the central exchanges, White's queen recaptures on d4 with a centralised, harmonious position and a lead in development against Black's slightly loose setup. A cleaner, more classical Rossolimo treatment that plays for piece activity in an open centre.",
    pawnBreaks: ['d2-d4 opening the centre'],
    pieceManeuvers: ['Bb5-f1 keeping the bishop', 'Nb1-c3 developing with tempo', 'Qd4 the centralised queen'],
    strategicThemes: ['Keep the bishop with Bf1', 'Open the centre with d4', 'Lead in development'],
    endgameTransitions: ['The active pieces favour White in simplification'],
    anchor: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1 d5 exd5 Nxd5 d4 cxd4 Nxd4 Nxd4 Qxd4',
    cont: ['Qd7', 'Nc3'],
    ann: [
      '…Qd7 — Black connects pieces and prepares to develop the queenside.',
      'Nc3 — White develops with tempo, hitting the d5-knight and seizing the initiative. The queen is centralised on d4, the pieces flow out harmoniously, and White has the easier, more active game in the open centre.',
    ],
    cues: ['Qd7 — Black connects up', 'Nc3 — develop with tempo, hit d5'],
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
  const COND = /\b(only|if|else|avoid|keep|restrain|passed|once|when|unless|never|don'?t|patient|flawless|sound|respect|balance|small|long-term|matters|later)\b/i;
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
