#!/usr/bin/env node
// Author 7 endgame plans (one per new variation) from real extracted
// data. Each plan anchors at the FEN where Naroditsky's actual
// game crossed into R+min+P territory; the moves[] are pulled verbatim
// from his game continuation. Annotations are hand-written, NOT
// templated (per STEP 9 Rule 2). The build script chess.js-validates
// + emits JSON.

import { Chess } from 'chess.js';

const KEY = 'rgba(255, 165, 0, 0.55)';

// Each PLAN is keyed off real-game extraction output:
// extract-endgame-positions-new-variations.mjs

const PLANS = [
  // ============ KIA vs ...e5 endgame ============
  // Game: Naroditsky 1-0 penguingm1 (3291). R+min+P entry move 30.
  // Continuation: fxe6 Rh8 Rf7 Ng6 Bg5 Nf8 Raf1 Nxe6
  {
    id: 'mp-pronaroKIA-vs-e5-endgame', openingId: 'pro-naroditsky-kia',
    fen: '2k5/ppp1n1p1/1b2p3/4PP1r/3P4/2P4P/PP4B1/R1B2RK1 w - - 0 30',
    title: 'KIA vs ...e5 — R+min+P conversion (vs penguingm1 3291)',
    overview: "R+min+P endgame from his win over penguingm1 (3291) in the Reti-gambit-accepted line. KEY SQUARES: e6 (Black's weak pawn cluster), f7 (rook infiltration). PIECE ROUTE: Rf1-Rf7 — the rook infiltrates the 7th rank. The conversion theme: trade off Black's defenders + cash in the pawn-up structure.",
    moves: ['fxe6','Rh8','Rf7','Ng6','Bg5','Nf8','Raf1','Nxe6'],
    annotations: [
      "fxe6 — White cashes in on the central pawn cluster, opening the f-file for the rook.",
      "...Rh8 — Black retreats the rook back to defend the kingside; pieces are now pinned to passive defense.",
      "Rf7! — KEY SQUARE f7. The rook lands on the 7th rank with check threats and immobilizes Black's coordination.",
      "...Ng6 — Black tries to bring the knight to a defensive square via g6.",
      "Bg5 — White's bishop joins the attack, hitting the knight and eyeing the back rank.",
      "...Nf8 — Black defends with the knight; pieces are passive.",
      "Raf1! — PIECE ROUTE Ra1-Rf1. Both rooks on the f-file, doubling on the 7th rank threat.",
      "...Nxe6 — Black plays the desperate trade. White is still up material with an unstoppable structure.",
    ],
    learnCues: ['fxe6 — cash in', '...Rh8 — passive', 'Rf7! — 7th rank', '...Ng6 — defend', 'Bg5 — attack joins', '...Nf8 — defend', 'Raf1 — double up', '...Nxe6 — desperate'],
    pawnBreaks: ['fxe6 central cash-in'],
    pieceManeuvers: ['Rf1 → Rf7 7th-rank infiltration', 'Raf1 doubling'],
    strategicThemes: ['R+min+P conversion', '7th-rank infiltration'],
    endgameTransitions: ['R+B+N → won R+P endgame'],
    sourceGame: 'https://www.chess.com/game/live/12208619821',
  },

  // ============ KIA vs ...c6 endgame ============
  // Game: Naroditsky 1-0 wonderfultime (3218). R+min+P entry move 24.
  // Continuation: Bxe4 Bxe4 g6 Bxa7 Ra8 Bc5 Ra4 Bd6
  {
    id: 'mp-pronaroKIA-vs-c6-endgame', openingId: 'pro-naroditsky-kia',
    fen: '3rr1k1/pp3ppp/2p5/4Pb2/4NP2/4B1P1/P3R1B1/7K b - - 0 24',
    title: 'KIA vs ...c6 — bishop pair conversion (vs wonderfultime 3218)',
    overview: "Two bishops vs rook-and-bishop endgame from his win over wonderfultime (3218) in the Slav-like setup. KEY SQUARES: a7 (Black's queenside weakness), c5 (bishop outpost on dark squares). PIECE COORDINATION: Be3-Bc5-Bd6 dark-square dominance. The two-bishop pair grinds the queenside down move by move.",
    moves: ['Bxe4','Bxe4','g6','Bxa7','Ra8','Bc5','Ra4','Bd6'],
    annotations: [
      "...Bxe4 — Black trades a bishop hoping to simplify.",
      "Bxe4 — White recaptures with the long-diagonal bishop, retaining the bishop pair advantage.",
      "...g6 — Black plays a kingside structural move, conceding the queenside.",
      "Bxa7! — KEY SQUARE a7. White cashes in on the weak queenside pawn, ahead in material.",
      "...Ra8 — Black tries to chase the bishop off.",
      "Bc5 — KEY SQUARE c5. The dark-squared bishop lands on a strong outpost, dominating the queenside.",
      "...Ra4 — Black's rook tries to gain activity.",
      "Bd6! — PIECE ROUTE Bc5-Bd6. The bishop continues its dark-square infiltration; Black's pieces are gradually overwhelmed.",
    ],
    learnCues: ['...Bxe4 — trade', 'Bxe4 — pair kept', '...g6 — concede', 'Bxa7! — pawn grab', '...Ra8 — chase', 'Bc5 — outpost', '...Ra4 — activate', 'Bd6 — dark-square reign'],
    pawnBreaks: ['Bxa7 queenside cash-in'],
    pieceManeuvers: ['Be3 → Bc5 → Bd6 dark-square reroute'],
    strategicThemes: ['Two-bishop conversion', 'Dark-square domination'],
    endgameTransitions: ['B+B+P grinding win'],
    sourceGame: 'https://www.chess.com/game/live/6077652201',
  },

  // ============ KIA vs ...b6 endgame ============
  // Game: Naroditsky 1-0 penguingm1 (3301). R+min+P entry move 44.
  // Continuation: Bh4+ Kf5 Bxe7 Kg4 Bxc5 Kf3 Be3 Kg4
  {
    id: 'mp-pronaroKIA-vs-b6-endgame', openingId: 'pro-naroditsky-kia',
    fen: '8/2p1n3/5k2/p1p4p/8/2P3B1/PP3P2/4R1K1 w - - 0 44',
    title: 'KIA vs ...b6 — bishop end (vs penguingm1 3301)',
    overview: "Bishop endgame from his win over penguingm1 (3301) in the Owen setup. KEY SQUARES: e7 (Black knight target), c5 (Black pawn target). PIECE ROUTE: Bg3-Bh4-Be7-Bxc5 — a winding diagonal mop-up. The conversion idea: collect Black's pieces one by one while the king walk-up wins.",
    moves: ['Bh4+','Kf5','Bxe7','Kg4','Bxc5','Kf3','Be3','Kg4'],
    annotations: [
      "Bh4+! — checks the Black king AND clears the diagonal toward the knight on e7.",
      "...Kf5 — the king is forced into the centre, exposing more weaknesses.",
      "Bxe7! — KEY SQUARE e7. White wins the knight; material balance now decisively favors White.",
      "...Kg4 — Black's king tries to chase the bishop but it's just running.",
      "Bxc5! — KEY SQUARE c5. Another pawn falls. White converts the material AND positional edge.",
      "...Kf3 — Black tries activity but is too far behind.",
      "Be3 — PIECE ROUTE: the bishop steps back to defensive coordination with the rook.",
      "...Kg4 — Black's king has nowhere productive to go; White's technique wins.",
    ],
    learnCues: ['Bh4+! — check + open', '...Kf5 — exposed', 'Bxe7! — win knight', '...Kg4 — chase', 'Bxc5! — win pawn', '...Kf3 — activity', 'Be3 — coordinate', '...Kg4 — nowhere'],
    pawnBreaks: ['Bxc5 mop-up'],
    pieceManeuvers: ['Bg3 → Bh4 → Be7 → Bxc5 collection route'],
    strategicThemes: ['Bishop collecting weakness', 'King + bishop conversion'],
    endgameTransitions: ['B+P → K+P winning endgame'],
    sourceGame: 'https://www.chess.com/game/live/12207998661',
  },

  // ============ KIA vs ...e6 endgame ============
  // Game: Naroditsky 1-0 wonderfultime (3254). R+min+P entry move 24.
  // Continuation: Nxe5 Nxe5 Rxe5 Bf7 Bf4 b6 d4 cxd4
  {
    id: 'mp-pronaroKIA-vs-e6-endgame', openingId: 'pro-naroditsky-kia',
    fen: '3rr1k1/pp1n4/4b1p1/2pppn2/6N1/2PP2PP/PP3PB1/R1B1R1K1 w - - 0 24',
    title: 'KIA vs ...e6 — trade-down crush (vs wonderfultime 3254)',
    overview: "R+min+P endgame from his win over wonderfultime (3254) in the French-style setup. KEY SQUARES: e5 (central pawn target), d4 (pawn break). PIECE COORDINATION: Nxe5 + Rxe5 — trade knight + recapture to anchor the rook in the centre. PAWN BREAK: d4 opens the position when Black is uncoordinated.",
    moves: ['Nxe5','Nxe5','Rxe5','Bf7','Bf4','b6','d4','cxd4'],
    annotations: [
      "Nxe5! — White starts the trade-down. The knight grabs the central pawn AND offers the trade.",
      "...Nxe5 — Black is forced to recapture or lose a clear pawn.",
      "Rxe5! — KEY SQUARE e5. The rook lands on a powerful central square, dominating the e-file.",
      "...Bf7 — Black retreats the bishop to a defensive post.",
      "Bf4 — PIECE ROUTE Bc1-Bf4. The dark-squared bishop activates, eyeing both flanks.",
      "...b6 — Black makes a structural concession on the queenside.",
      "d4! — KEY SQUARE d4. PAWN BREAK opening the centre when Black has weak pieces.",
      "...cxd4 — Black is forced to trade; the position opens AND White's pieces dominate.",
    ],
    learnCues: ['Nxe5! — start trade', '...Nxe5 — forced', 'Rxe5 — central', '...Bf7 — retreat', 'Bf4 — activate', '...b6 — concede', 'd4! — break', '...cxd4 — opens'],
    pawnBreaks: ['d4 central break'],
    pieceManeuvers: ['Bc1 → Bf4 activation', 'Re1 → Rxe5 central anchor'],
    strategicThemes: ['Trade-down conversion', 'Centre-file domination'],
    endgameTransitions: ['R+B+P winning conversion'],
    sourceGame: 'https://www.chess.com/game/live/6193715955',
  },

  // ============ Rossolimo c3 sideline endgame ============
  // Game: Naroditsky 1-0 lachesisQ (3069). R+min+P entry move 35.
  // Continuation: Rcd8 Nc5 f6 Nxb7 Rd7 Nc5 Rdd8 Bf4
  {
    id: 'mp-pronaroRoss-c3-endgame', openingId: 'pro-naroditsky-rossolimo',
    fen: '2r1r2k/1p1N1p1p/3P2pB/p7/8/7P/1P1R1PPK/8 b - - 0 35',
    title: 'Rossolimo c3 — N + B + passed-d-pawn conversion (vs lachesisQ 3069)',
    overview: "Knight+Bishop+passed-pawn endgame from his win over lachesisQ (3069) in the c3 Sideline. KEY SQUARES: b7 (Black queenside weakness), c5 (knight outpost). PIECE ROUTE: Nd7-Nc5-Nxb7 — the knight wins a queenside pawn. The conversion theme: passed d6-pawn + knight raid combine to crush.",
    moves: ['Rcd8','Nc5','f6','Nxb7','Rd7','Nc5','Rdd8','Bf4'],
    annotations: [
      "...Rcd8 — Black tries to blockade the passed d-pawn.",
      "Nc5! — KEY SQUARE c5. The knight lands on an outpost, eyeing both b7 AND e6.",
      "...f6 — Black tries to chase the bishop with a structural concession.",
      "Nxb7! — PIECE ROUTE Nd7-Nc5-Nxb7. The knight wins the queenside pawn; material advantage grows.",
      "...Rd7 — Black tries to defend the back rank from the d-file.",
      "Nc5 — the knight retreats to the outpost, ready to redeploy.",
      "...Rdd8 — Black tries to coordinate the rooks.",
      "Bf4! — KEY ROUTE: the bishop activates on the f4-c1 diagonal, threatening to support the passed d-pawn's advance.",
    ],
    learnCues: ['...Rcd8 — blockade', 'Nc5! — outpost', '...f6 — concede', 'Nxb7! — pawn raid', '...Rd7 — defend', 'Nc5 — return', '...Rdd8 — coordinate', 'Bf4! — activate'],
    pawnBreaks: ['Nxb7 queenside raid'],
    pieceManeuvers: ['Nd7 → Nc5 → Nxb7 raiding route', 'Bh6 → Bf4 diagonal activation'],
    strategicThemes: ['Passed-pawn + knight raid', 'Outpost domination'],
    endgameTransitions: ['N+B+P winning conversion'],
    sourceGame: 'https://www.chess.com/game/live/5305046990',
  },

  // ============ Rossolimo Bc4 vs ...d6 endgame ============
  // Game: Naroditsky 1-0 artooon (3092). R+min+P entry move 36.
  // Continuation: Kxg6 Re6+ Kh5 Rf5+ Kg4 Rf7 Bxb2 Rg6+
  {
    id: 'mp-pronaroRoss-bc4-endgame', openingId: 'pro-naroditsky-rossolimo',
    fen: '5R2/6bk/3p2Bp/p2P4/P7/8/1P3PP1/4R1K1 b - - 0 36',
    title: 'Rossolimo Bc4 vs ...d6 — rook + bishop mating attack (vs artooon 3092)',
    overview: "Rook+Bishop endgame mating attack from his win over artooon (3092) in the Bc4 Italian-style line. KEY SQUARES: f5, g6, h5 (mating net squares). PIECE COORDINATION: Rf8 + Re1 → Re6+ + Rf5+ — the rook batteries shepherd the king into a mating net. The conversion theme: two rooks + bishop ruthless king hunt.",
    moves: ['Kxg6','Re6+','Kh5','Rf5+','Kg4','Rf7','Bxb2','Rg6+'],
    annotations: [
      "...Kxg6 — Black grabs the bishop hoping to consolidate.",
      "Re6+! — KEY SQUARE e6. The rook check forces the king toward the edge.",
      "...Kh5 — Black's king is pushed further toward the corner.",
      "Rf5+! — DOUBLE-CHECK COORDINATION: the second rook joins the attack.",
      "...Kg4 — Black's king has nowhere to escape.",
      "Rf7 — PIECE ROUTE: the rook lifts to threaten mate AND keeps Black's king on the run.",
      "...Bxb2 — Black tries to create counterplay by grabbing material.",
      "Rg6+! — KEY SQUARE g6. The mate net closes; Black's king is hunted.",
    ],
    learnCues: ['...Kxg6 — grab', 'Re6+! — push edge', '...Kh5 — corner', 'Rf5+! — battery', '...Kg4 — nowhere', 'Rf7 — lift', '...Bxb2 — desperate', 'Rg6+ — net closes'],
    pawnBreaks: ['Re6+ + Rg6+ king-hunt sequence'],
    pieceManeuvers: ['Re1 → Re6 + Rf8 → Rf5 → Rf7 rook-battery'],
    strategicThemes: ['King-hunt with two rooks', 'Active-rook mating attack'],
    endgameTransitions: ['R+R+B → mate'],
    sourceGame: 'https://www.chess.com/game/live/122456059241',
  },

  // ============ Rossolimo vs ...g6 endgame ============
  // Game: Naroditsky 1-0 wonderfultime (3212). R+min+P entry move 32.
  // Continuation: Kxf7 Bf6 Nc2 Bxc2 Rxc2 Rac1 Rec8 Rxc2
  {
    id: 'mp-pronaroRoss-g6-endgame', openingId: 'pro-naroditsky-rossolimo',
    fen: '2r1rk2/pp3NB1/4p3/3bP2P/3n4/P7/1P3PP1/RB2R1K1 b - - 0 32',
    title: 'Rossolimo vs ...g6 — trade-down to R+P (vs wonderfultime 3212)',
    overview: "R+min+P trade-down endgame from his win over wonderfultime (3212) in the Hyper-Accelerated Dragon. KEY SQUARES: c2 (queenside trade), f6 (bishop infiltration). PIECE ROUTE: Bg7-Bf6 + the trade sequence simplifies into a winning rook endgame. The conversion theme: forced trades + technique.",
    moves: ['Kxf7','Bf6','Nc2','Bxc2','Rxc2','Rac1','Rec8','Rxc2'],
    annotations: [
      "...Kxf7 — Black is forced to capture the knight to avoid bigger losses.",
      "Bf6! — KEY SQUARE f6. The bishop lands on a strong dark-square outpost, supporting the e5-pawn AND eyeing the king.",
      "...Nc2 — Black tries to win the bishop, creating counterplay.",
      "Bxc2! — White trades the bishop for the knight, maintaining material balance.",
      "Rxc2 — KEY SQUARE c2. The rook recaptures, coordinating with the rest.",
      "...Rac1 — Black's rook joins the c-file battery.",
      "Rec8 — PIECE ROUTE: Black tries to load the c-file.",
      "Rxc2 — the trade-down completes; White has the structurally winning rook endgame.",
    ],
    learnCues: ['...Kxf7 — forced', 'Bf6! — outpost', '...Nc2 — counter', 'Bxc2! — trade', 'Rxc2 — recapture', '...Rac1 — battery', 'Rec8 — load', 'Rxc2 — simplify'],
    pawnBreaks: ['Bxc2 + Rxc2 trade-down'],
    pieceManeuvers: ['Bg7 → Bf6 dark-square outpost', 'Re1 → Rxc2 simplification'],
    strategicThemes: ['Trade-down to R+P', 'Dark-square bishop activity'],
    endgameTransitions: ['R+B+N → won R+P'],
    sourceGame: 'https://www.chess.com/game/live/52033215551',
  },
];

const out = [];
for (const p of PLANS) {
  const c = new Chess(p.fen);
  let ok = true;
  for (const san of p.moves) {
    try { c.move(san); }
    catch (e) { console.error('SKIP ' + p.id + ': illegal ' + san + ' (' + e.message + ')'); ok = false; break; }
  }
  if (!ok) continue;
  if (p.annotations.length !== p.moves.length || p.learnCues.length !== p.moves.length) {
    console.error('SKIP ' + p.id + ': arr mismatch'); continue;
  }
  // Generate highlights from move target squares + KEY square annotation hints
  const replay = new Chess(p.fen);
  const highlights = p.moves.map(san => {
    const m = replay.move(san);
    const sqs = [{ square: m.from, color: KEY }, { square: m.to, color: KEY }];
    return sqs;
  });
  const arrows = p.moves.map(() => []);
  const SRC = ['https://api.chess.com/pub/player/danielnaroditsky/games/archives', p.sourceGame];
  out.push({
    id: p.id, openingId: p.openingId, criticalPositionFen: p.fen,
    title: p.title, overview: p.overview,
    pawnBreaks: p.pawnBreaks, pieceManeuvers: p.pieceManeuvers,
    strategicThemes: p.strategicThemes, endgameTransitions: p.endgameTransitions,
    playableLines: [{ fen: p.fen, moves: p.moves, annotations: p.annotations, arrows, highlights, learnCues: p.learnCues, title: p.title, intro: p.overview, sources: SRC }],
  });
}
console.error('Built ' + out.length + ' / ' + PLANS.length + ' endgame plans');
console.log(JSON.stringify(out, null, 2));
