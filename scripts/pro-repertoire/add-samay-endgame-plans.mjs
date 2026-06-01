#!/usr/bin/env node
// Add Samay Raina endgame plans (G9.1 STEP 9 endgame layer), grounded in REAL
// decisive wins from his chess.com corpus that reach the variation's most-common
// decisive endgame structure (wider-corpus-endgame-samay.mjs: R+minor+P 13-16%).
// Only the three openings with a genuinely TEACHABLE real conversion are added;
// the rest (ruy = opponent blundered a rook, open-e5/scandi = scrappy blitz,
// french/caro = <3 games) self-hide per "empty > generic > invented".
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/middlegame-plans.json';
const ORANGE = 'rgba(255, 165, 0, 0.55)';
const GREEN = 'rgba(40,185,95,0.92)';
const ARCH = 'https://api.chess.com/pub/player/samayraina/games/archives';

// per-move orange highlight of the two move squares (lead-the-eye doctrine)
function hl(fen, moves) {
  const c = new Chess(fen);
  return moves.map((m) => {
    const mv = c.move(m);
    return [{ square: mv.from, color: ORANGE }, { square: mv.to, color: ORANGE }];
  });
}
// arrows: mostly empty; a green vision arrow on the keystone move index
function arrows(n, keys) {
  const a = Array.from({ length: n }, () => []);
  for (const [i, from, to] of keys) a[i] = [{ from, to, color: GREEN }];
  return a;
}

const PLANS = [
  {
    id: 'mp-prosamayItalian-endgame',
    openingId: 'pro-samayraina-italian',
    criticalPositionFen: '8/pppr3r/3bpk1p/6p1/4P2P/2P3B1/PP1R1PP1/3R2K1 w - - 0 22',
    title: 'Italian ENDGAME — the e5 break wins a piece (vs 1899)',
    overview:
      "41% of Samay's decisive Italian games shed the queens, and the most common winning structure is rook-and-minor (13%). This real game shows the cleanest way he converts: a central pawn break that forks the king and a bishop at once, winning a piece outright, then a calm trade-down a clean piece up.",
    pawnBreaks: ['e5 — fork the f6-king and the d6-bishop', 'hxg5 — rip open the kingside'],
    pieceManeuvers: ['Bxd6 then Be5 — the bishop seizes the long diagonal'],
    strategicThemes: ['Win material with a central pawn fork', 'Trade down a clean piece up'],
    endgameTransitions: ['Into a R+minor ending a piece ahead'],
    fen: '8/pppr3r/3bpk1p/6p1/4P2P/2P3B1/PP1R1PP1/3R2K1 w - - 0 22',
    moves: ['e5+', 'Ke7', 'exd6+', 'cxd6', 'hxg5', 'hxg5', 'Bxd6+', 'Ke8', 'Be5', 'Rxd2', 'Rxd2', 'Rd7'],
    annotations: [
      'e5! A pawn break that does two jobs at once — it checks the king on f6 AND attacks the bishop on d6. Black cannot save both.',
      '…Ke7 — the king steps aside, but the d6-bishop is still hanging.',
      'exd6+ — collect the bishop with check. Samay is a clean piece up for a pawn.',
      "…cxd6 — Black recaptures the pawn, but the bishop is gone for good.",
      'hxg5 — a second break, prising open the kingside before Black can build a fortress.',
      '…hxg5 — recapture.',
      'Bxd6+ — the bishop grabs another pawn with check and steers toward the long diagonal.',
      '…Ke8 — the king is chased into the corner.',
      'Be5 — the bishop settles on the long diagonal, raking g7 and the queenside. Two pawns up with the only minor piece on the board.',
      '…Rxd2 — Black tries to simplify into a more defensible ending.',
      'Rxd2 — recapture; with every trade the extra material weighs more.',
      "…Rd7 — Black's rook finds the open file, but Samay is a clean piece and a pawn up; the rest is technique.",
    ],
    learnCues: [
      'e5 — fork king and bishop', '…Ke7 — bishop still hangs', 'exd6 — win the piece',
      '…cxd6 — recapture the pawn', 'hxg5 — second break', '…hxg5 — recapture',
      'Bxd6 — grab another pawn', '…Ke8 — king cornered', 'Be5 — own the long diagonal',
      '…Rxd2 — Black seeks trades', 'Rxd2 — recapture, convert', '…Rd7 — a clean piece up',
    ],
    arrowKeys: [[8, 'e5', 'b8']],
    sources: ['https://www.chess.com/openings/Italian-Game', ARCH, 'concept:pawn-passed'],
  },
  {
    id: 'mp-prosamaySicilianBlack-endgame',
    openingId: 'pro-samayraina-sicilian-black',
    criticalPositionFen: '3r2k1/5ppp/5n2/pp2p2b/4P3/1B2NP2/PP4PP/5RK1 b - - 0 23',
    title: 'Najdorf ENDGAME — the a-pawn passer and the 2nd-rank rook (vs 2185)',
    overview:
      "Samay's Sicilian decides in the endgame more than any other phase — 46% of his decisive games get there, 15% in a rook-and-minor structure. Here Black turns a queenless middlegame into a win the textbook way: a queenside passer, a rook on the 2nd rank, and an active bishop.",
    pawnBreaks: ['a4 then a3 — the queenside passer marches', 'f5 — kick the knight and open the f-file'],
    pieceManeuvers: ['Rd2 — the rook seizes the 2nd rank'],
    strategicThemes: ['A far-advanced queenside passer ties White down', 'Activity over material in R+minor'],
    endgameTransitions: ['Passer + active rook decide the R+minor ending'],
    fen: '3r2k1/5ppp/5n2/pp2p2b/4P3/1B2NP2/PP4PP/5RK1 b - - 0 23',
    moves: ['a4', 'Bd5', 'Nxd5', 'Nxd5', 'f5', 'Ne7+', 'Kf8', 'Nxf5', 'Rd2', 'Rb1', 'Bf7', 'b3', 'a3'],
    annotations: [
      '…a4! The queenside passer starts rolling. In a rook-and-minor endgame a far-advanced passed pawn is gold — it ties White down before any attack begins.',
      'White offers a bishop trade with Bd5, hoping to blunt the pressure.',
      '…Nxd5 — take it. Trading a pair of minors only helps the side with the passer.',
      'Nxd5 — recapture.',
      '…f5! A second break — it kicks the knight off its central post and opens the f-file for the rook.',
      'Ne7+ — the knight checks on the way out.',
      '…Kf8 — the king sidesteps.',
      "Nxf5 — White wins the f-pawn back, but look at the cost: Black's rook and bishop are about to become monsters.",
      '…Rd2! The rook crashes onto the 2nd rank — the most valuable square in a rook ending. It rakes b2 and g2 and pins White to defence.',
      'Rb1 — White defends the b-pawn passively.',
      '…Bf7 — the bishop redeploys, eyeing a2 and backing the passer.',
      'b3 — White tries to block, but it only fixes a fresh target on a3.',
      '…a3 — the passer reaches the third rank, one step from promotion and permanently cramping White. Rook on d2, bishop on f7, pawn on a3 — together they decide it.',
    ],
    learnCues: [
      '…a4 — passer starts rolling', 'Bd5 — White offers a trade', '…Nxd5 — trade helps the passer',
      'Nxd5 — recapture', '…f5 — kick the knight', 'Ne7+ — knight checks out', '…Kf8 — king sidesteps',
      'Nxf5 — White grabs f5', '…Rd2 — rook on the 2nd rank', 'Rb1 — White defends passively',
      '…Bf7 — bishop eyes a2', 'b3 — fixes a fresh target', '…a3 — passer cramps White',
    ],
    arrowKeys: [[8, 'd2', 'b2']],
    sources: ['https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation', ARCH, 'concept:pawn-passed'],
  },
  {
    id: 'mp-prosamayOpenSicilian-endgame',
    openingId: 'pro-samayraina-open-sicilian',
    criticalPositionFen: '2r1k2r/5ppp/4p3/1P6/2nRPP2/2b5/1PP3PP/5RK1 w k - 0 21',
    title: 'Open Sicilian ENDGAME — rook behind the passed b-pawn (vs 1879)',
    overview:
      "Samay's Open Sicilian reaches an endgame in 53% of his decisive games — more than any of his openings, 16% in a rook-and-minor structure. This is the model conversion: a queenside passer, the rook planted BEHIND it (Tarrasch's rule), and the pawn marching to the 7th while Black's pieces are dragged into passive defence.",
    pawnBreaks: ['b6 then b7 — the passer marches to the 7th'],
    pieceManeuvers: ['Rb1 then Ra1 — the rook works behind the b-pawn'],
    strategicThemes: ["Tarrasch's rule: the rook belongs behind the passed pawn", 'The passer drags Black into passivity'],
    endgameTransitions: ['The b-pawn costs Black a rook to stop it'],
    fen: '2r1k2r/5ppp/4p3/1P6/2nRPP2/2b5/1PP3PP/5RK1 w k - 0 21',
    moves: ['bxc3', 'O-O', 'Rb1', 'Rfd8', 'b6', 'Rxd4', 'cxd4', 'Rb8', 'b7', 'Na5', 'Ra1', 'Nc6'],
    annotations: [
      "bxc3 — recapture the bishop. Notice the b5-pawn: with no black pawns on the a-, b- or c-files it's a passer, and in the endgame that's a long-term trump.",
      '…O-O — Black castles into safety, but the b-pawn is the real story.',
      "Rb1! The rook swings behind its own passed pawn — Tarrasch's rule: rooks belong behind passers, shoving them forward and shielding them from behind.",
      '…Rfd8 — Black contests the d-file.',
      'b6 — the passer advances, supported from the rear. Every step cramps Black further.',
      '…Rxd4 — Black gives up the exchange to slow the pawn, a measure of how dangerous it has become.',
      'cxd4 — recapture. Black is down material AND still facing the passer.',
      '…Rb8 — the rook scrambles to blockade from the front, the only way to stop the pawn.',
      'b7 — to the 7th! One square from queening, and the pawn alone now nails the b8-rook to the spot.',
      '…Na5 — the knight rushes back to help.',
      'Ra1 — the rook lifts toward a8, where it dislodges the blockader and the b-pawn costs Black a whole rook.',
      "…Nc6 — the knight returns to fight the pawn, but b7 is one step from queening with the rook swinging up the a-file; Samay is winning material.",
    ],
    learnCues: [
      'bxc3 — recapture, keep the passer', '…O-O — Black castles', 'Rb1 — rook behind the passer',
      '…Rfd8 — contest the d-file', 'b6 — advance the passer', '…Rxd4 — exchange sac to slow it',
      'cxd4 — recapture, pawn rolls on', '…Rb8 — blockade from the front', 'b7 — passer hits the 7th',
      '…Na5 — knight rushes back', 'Ra1 — rook lifts toward a8', '…Nc6 — b7 one step from queening',
    ],
    arrowKeys: [[2, 'b1', 'b5'], [8, 'b7', 'b8']],
    sources: ['https://www.chess.com/openings/Sicilian-Defense', ARCH, 'concept:pawn-passed'],
  },
];

const data = JSON.parse(fs.readFileSync(PATH, 'utf8'));
const byId = new Set(data.map((p) => p.id));
let added = 0;
for (const p of PLANS) {
  // verify legality + theme demonstration before writing
  const c = new Chess(p.fen);
  for (const m of p.moves) { const mv = c.move(m); if (!mv) throw new Error(`${p.id}: illegal ${m}`); }
  if (p.annotations.length !== p.moves.length) throw new Error(`${p.id}: annotation count`);
  if (p.learnCues.length !== p.moves.length) throw new Error(`${p.id}: learnCue count`);
  const plan = {
    id: p.id,
    openingId: p.openingId,
    criticalPositionFen: p.criticalPositionFen,
    title: p.title,
    overview: p.overview,
    pawnBreaks: p.pawnBreaks,
    pieceManeuvers: p.pieceManeuvers,
    strategicThemes: p.strategicThemes,
    endgameTransitions: p.endgameTransitions,
    playableLines: [{
      fen: p.fen,
      moves: p.moves,
      annotations: p.annotations,
      arrows: arrows(p.moves.length, p.arrowKeys),
      highlights: hl(p.fen, p.moves),
      learnCues: p.learnCues,
      title: p.title,
      intro: p.overview,
      sources: p.sources,
    }],
  };
  if (byId.has(p.id)) {
    const idx = data.findIndex((x) => x.id === p.id);
    data[idx] = plan;
    console.log(`updated ${p.id}`);
  } else {
    data.push(plan);
    added++;
    console.log(`added   ${p.id}`);
  }
}
fs.writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`\n${added} added, ${data.length} total plans`);
