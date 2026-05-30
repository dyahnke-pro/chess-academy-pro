#!/usr/bin/env node
// GothamChess Fantasy Variation vs Caro (pro-gothamchess-fantasy-caro) — plans.
// Student = WHITE. 4 data-anchored plans from the 95-game corpus, replacing 2
// legacy overview-only plans. Every move chess.js-validated; theme self-checked.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/middlegame-plans.json';
const OPENING_ID = 'pro-gothamchess-fantasy-caro';
const DELETE_IDS = new Set(['mp-pro-gothamchess-fantasy-caro-attack', 'mp-pro-gothamchess-fantasy-caro-e5']);
const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
  'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence',
];
const ORANGE = 'rgba(255, 165, 0, 0.55)';

const PLANS = [
  {
    id: 'mp-progothamchess-fantasy-dxe4-center',
    title: 'Fantasy 3…dxe4: the Big e4 Centre + Slow Build',
    overview:
      "His main Fantasy plan across the 44-game 3…dxe4 line. White recaptures fxe4 to build a broad pawn centre, develops Bc4 and Nf3, and castles. Then the slow squeeze: c3 supports d4, Be3 and Nbd2 complete development, and the Bd3 + Qc2 battery aims at the kingside. The Fantasy's point — a big centre and the bishop pair — gives White a comfortable space advantage.",
    pawnBreaks: ['the e4/d4 big centre', 'c3 supporting d4'],
    pieceManeuvers: ['Bc1-e3 supporting the centre', 'Nb1-d2 completing development', 'Bd3 + Qc2 the kingside battery'],
    strategicThemes: ['Build the big e4/d4 centre', 'Complete development with Be3/Nbd2', 'Aim the battery at the king'],
    endgameTransitions: ['The space edge carries into the ending'],
    anchor: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 Bg4 Bc4 Nd7 O-O Ngf6 c3 Bd6',
    cont: ['Be3', 'O-O', 'Nbd2'],
    ann: [
      'Be3 — White develops the bishop, reinforcing the d4-pawn and the big centre.',
      '…O-O — Black castles into a slightly cramped but solid position.',
      'Nbd2 — White completes development; the broad centre, the bishop pair, and the harmonious setup give a pleasant, space-gaining edge. The Fantasy has delivered exactly the position White wanted.',
    ],
    cues: ['Be3 — reinforce the centre', 'O-O — Black castles', 'Nbd2 — complete development'],
  },
  {
    id: 'mp-progothamchess-fantasy-e6-qg4attack',
    title: 'Fantasy 3…e6: the Qg4-Qxg7 Kingside Raid',
    overview:
      "Against the solid 3…e6 with …Bb4, White doubles the c-pawns but gets the bishop pair and a direct attacking chance. When Black grabs on e4, the Fantasy's signature shot is Qg4! — hitting g7 and the e4-knight at once. After …Nf6 Qxg7, White snatches the g7-pawn and the rook on the open g-file, a violent raid that exploits Black's missing dark-squared bishop.",
    pawnBreaks: ['the e4 centre', 'the open g-file after Qxg7'],
    pieceManeuvers: ['Qd1-g4 the double attack on g7 and e4', 'Qg4xg7 the raid', 'the bishop pair from …Bxc3'],
    strategicThemes: ['Exploit the missing dark bishop', 'Hit g7 and e4 with Qg4', 'Raid with Qxg7'],
    endgameTransitions: ['The extra material and bishop pair decide'],
    anchor: 'e4 c6 d4 d5 f3 e6 Nc3 Bb4 a3 Bxc3+ bxc3 dxe4 Nh3 Nf6 fxe4',
    cont: ['Nxe4', 'Qg4', 'Nf6', 'Qxg7'],
    ann: [
      '…Nxe4 — Black grabs the e4-pawn, but the knight steps into a tactic.',
      'Qg4 — the double attack! The queen hits the e4-knight and the g7-pawn at the same time.',
      '…Nf6 — Black saves the knight, but g7 falls.',
      'Qxg7 — the raid lands. White snatches the g7-pawn and attacks the h8-rook on the open g-file; with Black’s dark-squared bishop long gone, the kingside is fatally weak. White is winning the material and the attack.',
    ],
    cues: ['Nxe4 — steps into a tactic', 'Qg4 — hit e4 and g7', 'Nf6 — saves the knight', 'Qxg7 — the raid, winning'],
  },
  {
    id: 'mp-progothamchess-fantasy-g6-poisonpawn',
    title: 'Fantasy 3…g6: the b2 Poison-Pawn Lead',
    overview:
      "Against the aggressive 3…g6 fianchetto, White invites the poison: Be3 and Qd2 dare Black to grab b2 with …Qxb2. After Rb1 chases the queen to a3, White has a massive lead in development and open lines for the pawn — Bd3 and Nge2/Nf3 pour out while Black's queen is stuck offside. A gambit-style initiative against the Fantasy's sharpest try.",
    pawnBreaks: ['the e4 centre', 'open lines for the b-pawn'],
    pieceManeuvers: ['Ra1-b1 chasing the offside queen', 'Bf1-d3 rapid development', 'Ng1-f3 developing toward the centre'],
    strategicThemes: ['Offer the b2-pawn for development', 'Chase the queen with Rb1', 'Lead in development for the pawn'],
    endgameTransitions: ['Keep attacking — the lead in development is the compensation'],
    anchor: 'e4 c6 d4 d5 f3 g6 Nc3 Bg7 Be3 Qb6 Qd2 Qxb2 Rb1 Qa3 Bd3',
    cont: ['dxe4', 'fxe4', 'Nf6', 'Nf3'],
    ann: [
      '…dxe4 — Black grabs a central pawn, trying to justify the offside queen.',
      'fxe4 — White recaptures, keeping the big centre intact.',
      '…Nf6 — Black develops, attacking the e4-pawn.',
      'Nf3 — White develops with tempo, defending the centre and completing the harmonious setup. With the queen marooned on a3 and White’s pieces flowing out, the lead in development gives a powerful initiative for the b2-pawn.',
    ],
    cues: ['dxe4 — Black grabs a pawn', 'fxe4 — keep the centre', 'Nf6 — Black develops', 'Nf3 — develop with tempo'],
  },
  {
    id: 'mp-progothamchess-fantasy-qb6-na4',
    title: 'Fantasy 3…Qb6: the Na4 + b4 Queenside Squeeze',
    overview:
      "Against the early 3…Qb6, White develops naturally and, after the central exchanges, harasses the queen. The Na4 hits the c5-bishop and the queen, and after …Qa5+ c3, White plays b4 to gain queenside space with tempo. The Bd3 battery and the central majority give White a comfortable, space-gaining game against this offbeat try.",
    pawnBreaks: ['b2-b4 the queenside space gain', 'c3 supporting the centre'],
    pieceManeuvers: ['Nc3-a4 harassing the bishop and queen', 'Bf1-d3 the kingside battery', 'the central pawn majority'],
    strategicThemes: ['Harass with Na4', 'Gain queenside space with b4', 'Build the Bd3 battery'],
    endgameTransitions: ['The space edge favours White in simplification'],
    anchor: 'e4 c6 d4 d5 f3 Qb6 Nc3 dxe4 fxe4 e5 Nf3 exd4 Nxd4 Bc5 Na4 Qa5+ c3',
    cont: ['Be7', 'b4', 'Qc7', 'Bd3'],
    ann: [
      '…Be7 — Black retreats the bishop after the Na4 harassment.',
      'b4 — White gains queenside space with tempo, clamping down and preparing to expand.',
      '…Qc7 — the queen finally finds a stable square, having been chased around.',
      'Bd3 — White builds the battery toward h7 and completes development; the queenside space, the central majority, and the harmonious setup give White the comfortable, better game.',
    ],
    cues: ['Be7 — the bishop retreats', 'b4 — gain space with tempo', 'Qc7 — the queen settles', 'Bd3 — the kingside battery'],
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
  const COND = /\b(only|if|else|avoid|keep|restrain|passed|once|when|unless|never|don'?t|patient|flawless|sound|respect|balance|small|long-term|matters|later|open lines|missing)\b/i;
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
