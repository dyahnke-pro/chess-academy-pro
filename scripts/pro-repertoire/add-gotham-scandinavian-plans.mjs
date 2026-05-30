#!/usr/bin/env node
// GothamChess Scandinavian Defense (pro-gothamchess-scandinavian) — plans.
// Student = BLACK (his main weapon, 1176 games / 715 wins). 4 data-anchored
// plans; the theme gate requires a BLACK move on a declared goal square.
// Replaces legacy overview-only plans. chess.js-validated.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/middlegame-plans.json';
const OPENING_ID = 'pro-gothamchess-scandinavian';
const STUDENT = 'b';
const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Scandinavian-Defense',
  'https://api.chess.com/pub/player/gothamchess/games/archives',
  'https://en.wikipedia.org/wiki/Scandinavian_Defense',
];
const ORANGE = 'rgba(255, 165, 0, 0.55)';

const data0 = JSON.parse(readFileSync(PATH, 'utf8'));
const LEGACY = data0
  .filter((p) => p.openingId === OPENING_ID && !(p.playableLines && p.playableLines[0] && p.playableLines[0].moves))
  .map((p) => p.id);
const DELETE_IDS = new Set(LEGACY);

const PLANS = [
  {
    id: 'mp-progothamchess-scand-qa5-bxc3',
    title: 'Scandinavian Qa5: …Bxc3 Doubling + …Qb6 Pressure',
    overview:
      "His main Scandinavian plan across 297 games. After the …Qa5 and the …Bf5/…e6 development, Black plays …Bb4 and trades …Bxc3 to saddle White with doubled c-pawns, then redeploys the queen to b6 to pressure the d4-pawn and the doubled structure. With a rock-solid setup and a clear target, Black plays a comfortable, low-risk game against White's compromised pawns.",
    pawnBreaks: ['…Bxc3 doubling the c-pawns', '…c5 hitting the centre later'],
    pieceManeuvers: ['…Bf8-b4xc3 the structural trade', '…Qa5-b6 pressuring d4', '…Bf5 the active bishop'],
    strategicThemes: ['Double White’s c-pawns with …Bxc3', 'Pressure d4 with …Qb6', 'Play against the compromised structure'],
    endgameTransitions: ['The doubled c-pawns are a long-term endgame target'],
    anchor: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bc4 e6 Bd2 Bb4 a3',
    cont: ['Bxc3', 'Bxc3', 'Qb6'],
    ann: [
      '…Bxc3 — Black trades to saddle White with doubled c-pawns, a permanent structural weakness.',
      'Bxc3 — White recaptures, accepting the damaged structure.',
      '…Qb6 — the queen swings to b6, pressuring the d4-pawn and the doubled c-pawns at once. Black has a rock-solid position with a clear long-term target — exactly the comfortable, risk-free game the Scandinavian aims for.',
    ],
    cues: ['Bxc3 — double the c-pawns', 'Bxc3 — White recaptures', 'Qb6 — pressure d4 and the doubled pawns'],
  },
  {
    id: 'mp-progothamchess-scand-nf6bg4-oooattack',
    title: 'Modern Scandinavian: …Bg4 Trade + …O-O-O Attack',
    overview:
      "The aggressive 2…Nf6 modern Scandinavian across 208 games. Black develops …Bg4 to pin and trade the white knight, recaptures the d5-pawn with the queen, then castles queenside with …O-O-O. From there Black launches a kingside pawn storm with …g5-g4 and the …Rg8 rook lift — an opposite-side-castling race where Black's attack is the more dangerous.",
    pawnBreaks: ['…g5-g4 the kingside storm'],
    pieceManeuvers: ['…Bc8-g4 the pin and trade', '…O-O-O queenside castling', '…Rd8-g8 the rook lift'],
    strategicThemes: ['Trade the bishop with …Bg4', 'Castle queenside with …O-O-O', 'Storm the kingside with …g5 and …Rg8'],
    endgameTransitions: ['Keep attacking — opposite castling is a race'],
    anchor: 'e4 d5 exd5 Nf6 d4 Bg4 Be2 Bxe2 Qxe2 Qxd5 Nf3 Nc6 Be3',
    cont: ['O-O-O', 'O-O', 'Rg8'],
    ann: [
      '…O-O-O — Black castles queenside, connecting the rooks and committing to the kingside attack.',
      'O-O — White castles into the storm zone, opposite Black’s king.',
      '…Rg8 — the rook lifts to support the …g5-g4 pawn storm against White’s king. With opposite-side castling, it becomes a race — and Black’s attack down the g-file is the more dangerous. The modern Scandinavian generates real winning chances.',
    ],
    cues: ['O-O-O — castle queenside', 'O-O — White castles opposite', 'Rg8 — lift the rook, prep …g5'],
  },
  {
    id: 'mp-progothamchess-scand-nf6nc3-bg4pin',
    title: 'Scandinavian vs Nc3: …Bg4 Pin + …Nb6 Rerouting',
    overview:
      "Against the 3.Nc3 line, his 110-game plan recaptures …Nxd5, develops solidly with …c6 and …Nf6, and reroutes the knight to b6 to hit the white bishop. The …Bg4 pin trades off a piece and eases Black's position, reaching a harmonious setup with no weaknesses. A clean, solid handling of the Nc3 Scandinavian where Black equalizes comfortably.",
    pawnBreaks: ['…c6 supporting the centre', '…e6 freeing the position'],
    pieceManeuvers: ['…Bc8-g4 the pin', '…Nd5-b6 hitting the bishop', '…Bg4xe2 trading a piece'],
    strategicThemes: ['Recapture with …Nxd5', 'Pin with …Bg4', 'Reroute …Nb6 and trade pieces'],
    endgameTransitions: ['The solid structure equalizes into the ending'],
    anchor: 'e4 d5 exd5 Nf6 Nc3 Nxd5 Bc4 c6 Qf3 Nf6 Nge2 Nbd7 d4 Nb6 Bb3',
    cont: ['Bg4', 'Qg3', 'Bxe2'],
    ann: [
      '…Bg4 — Black develops the bishop with a pin, pressuring the white pieces and preparing to trade.',
      'Qg3 — White sidesteps, keeping the queen active.',
      '…Bxe2 — Black trades off a piece, easing the position and reaching a harmonious, solid setup with no weaknesses. The Nc3 Scandinavian is comfortably equalized — Black has the structure and the easier plan.',
    ],
    cues: ['Bg4 — develop with a pin', 'Qg3 — White sidesteps', 'Bxe2 — trade, ease the position'],
  },
  {
    id: 'mp-progothamchess-scand-bb5-ne5',
    title: 'Scandinavian vs Bb5+: …b5 Expansion + …Ne5 Centralization',
    overview:
      "Against the 3.Bb5+ check, his 69-game plan blocks with …Nbd7, then expands on the queenside with …a6 and …b5, fianchettoes with …Bb7, and centralizes a knight on e5. The bishop pair and the queenside space give Black a dynamic, comfortable game — the Bb5+ check has only helped Black gain space and the two bishops.",
    pawnBreaks: ['…b5 the queenside expansion', '…a6 supporting …b5'],
    pieceManeuvers: ['…Nb8-d7-e5 the central knight', '…Bc8-b7 the fianchetto', 'the bishop pair after the trade'],
    strategicThemes: ['Block the check with …Nbd7', 'Expand with …a6 and …b5', 'Centralize a knight on e5'],
    endgameTransitions: ['The bishop pair and space favour Black'],
    anchor: 'e4 d5 exd5 Nf6 Bb5+ Nbd7 Nc3 a6 Be2 b5 a3',
    cont: ['Bb7', 'Bf3', 'Ne5'],
    ann: [
      '…Bb7 — Black fianchettoes, training the bishop on the long diagonal toward White’s king.',
      'Bf3 — White challenges the long diagonal.',
      '…Ne5 — Black centralizes the knight on the dominant e5-square, hitting the f3-bishop. With queenside space from …b5, the bishop on the long diagonal, and an active knight, Black has a dynamic, comfortable game — the Bb5+ check helped Black gain space and the initiative.',
    ],
    cues: ['Bb7 — fianchetto the long diagonal', 'Bf3 — White challenges', 'Ne5 — centralize the knight'],
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
  const COND = /\b(only|if|else|avoid|keep|restrain|passed|once|when|unless|never|don'?t|patient|flawless|sound|respect|balance|small|long-term|matters|later)\b/i;
  const goals = new Set();
  for (const pb of p.pawnBreaks) if (!COND.test(pb)) (pb.match(SQ) || []).forEach((q) => goals.add(q));
  for (const pm of p.pieceManeuvers) (pm.match(SQ) || []).forEach((q) => goals.add(q));
  const demo = moveInfo.some((mi) => mi.color === STUDENT && goals.has(mi.to));
  if (!demo) { console.error(`THEME-EMPTY ${p.id}: goals {${[...goals].join(',')}}; ${STUDENT} tos=${moveInfo.filter((m) => m.color === STUDENT).map((m) => m.to).join(',')}`); failed++; continue; }
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
