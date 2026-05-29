#!/usr/bin/env node
// Plans for the newly-added variations across KIA, Rossolimo, Caro,
// and Fantasy Caro. Each plan anchors at the variation's spine end
// (where the opening lesson terminates) and walks 4-6 moves of
// middlegame play teaching STRUCTURAL ideas per doctrine STEP 9
// (key squares, pawn breaks, center vs wing attack, piece routes).

import { Chess } from 'chess.js';

const ORANGE = 'rgba(255, 165, 0, 0.55)';

function fenAfter(sans) { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); }
function highlightsFromMoves(setupSans, moves) {
  const c = new Chess();
  for (const s of setupSans) c.move(s);
  const out = [];
  for (const san of moves) {
    const m = c.move(san);
    out.push([{ square: m.from, color: ORANGE }, { square: m.to, color: ORANGE }]);
  }
  return out;
}

const SRC_BY = {
  'pro-naroditsky-kia': ['https://www.chess.com/openings/Kings-Indian-Attack', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives'],
  'pro-naroditsky-rossolimo': ['https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives'],
  'pro-naroditsky-caro-kann': ['https://www.chess.com/openings/Caro-Kann-Defense', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives'],
  'pro-naroditsky-fantasy-caro': ['https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives'],
};

const PLANS = [
  // ============ KIA new variations ============
  {
    id: 'mp-pronaroKIA-vs-e5-conversion', openingId: 'pro-naroditsky-kia',
    title: 'KIA vs ...e5 — pawn-up conversion',
    overview: "Past the early gambit-accept (1.Nf3 e5 2.Nxe5), White has a clean extra pawn. The plan: complete development AND consolidate. KEY SQUARES: c4 (Nbd2 outpost), d4 (central pawn), e3 (bishop diagonal). PAWN BREAK: c4 expanding queenside. The conversion runs structurally — Black has no compensation.",
    setupSans: ['Nf3','e5','Nxe5','Nc6','Nf3','d5','d4','Bd6','e3','Nf6','Be2','O-O','O-O'],
    moves: ['Bg4','c4','dxc4','Bxc4'],
    annotations: [
      "...Bg4 — Black tries an active pin on the f3-knight hoping for compensation.",
      "c4! — White's pawn break. We expand queenside AND challenge Black's d5-pawn directly. KEY SQUARE: c4 — the break that unlocks the position.",
      "...dxc4 — Black is forced to trade (otherwise loses the d5-pawn).",
      "Bxc4 — recapture with the bishop, now active on the kingside diagonal. Black's compensation is gone, White is up a clean pawn with active pieces.",
    ],
    learnCues: ['...Bg4 — pin attempt', 'c4! — queenside break', '...dxc4 forced', 'Bxc4 — active bishop'],
    pawnBreaks: ['c4 queenside break — unlocks d5 + opens c-file'],
    pieceManeuvers: ['Nbd2 + Re1 + Bc4 development', 'Bxc4 active diagonal'],
    strategicThemes: ['Pawn-up technical conversion', 'Black has no compensation'],
    endgameTransitions: ['R+B+N pawn-up endgame'],
  },
  {
    id: 'mp-pronaroKIA-vs-c6-attack', openingId: 'pro-naroditsky-kia',
    title: 'KIA vs ...c6 — Nf1-Ng3 kingside attack',
    overview: "Past the symmetric c6/Bg2 setup, both castled, White's middlegame plan is the classical KIA Italian reroute. KEY SQUARES: f5 (knight outpost via Nh4), h5 (further attack square). PAWN BREAK: e4 (already played) AND f4 supporting the attack. PIECE ROUTE: Nbd2-Nf1-Ng3-Nh5 — the canonical KIA attack stack.",
    setupSans: ['Nf3','c6','g3','d5','Bg2','Nf6','O-O','Bg4','d3','Nbd7','Nbd2','e6','e4','Be7','Re1','O-O'],
    moves: ['Qe2','dxe4','dxe4','Bh5'],
    annotations: [
      "Qe2 — White's queen prepares the Nf1-Ng3 reroute AND supports the central squares.",
      "...dxe4 — Black trades central pawns hoping to simplify the attack.",
      "dxe4 — wait, recapture. KEY SQUARE: e4 — White's central pawn dominates the long diagonal for Bg2 + supports the future Nh4-Nf5 jump. The structural transformation favors White's pieces.",
      "...Bh5 — Black redirects the bishop to defend the kingside, but the KIA attack is set: next move Nf1 then Ng3 toward Nh5/Nf5 outposts.",
    ],
    learnCues: ['Qe2 — prep reroute', '...dxe4 — simplification try', 'dxe4 — central pawn', '...Bh5 — defend'],
    pawnBreaks: ['e4 central + f4 kingside support'],
    pieceManeuvers: ['Nbd2 → Nf1 → Ng3 KIA Italian reroute', 'Nh4 → Nf5 outpost jump'],
    strategicThemes: ['Kingside attack via piece reroute', 'Bg2 long-diagonal pressure'],
    endgameTransitions: ['R+B+N with structural kingside dominance'],
  },
  {
    id: 'mp-pronaroKIA-vs-b6-expand', openingId: 'pro-naroditsky-kia',
    title: 'KIA vs ...b6 — Reversed-Slav expansion',
    overview: "Past the b6-Bb7 fianchetto setup, both castled, White has the full c4-d4 centre. The plan is Reversed-Slav queenside expansion. KEY SQUARES: e5 (potential central outpost), c5 (advanced pawn lock). PAWN BREAK: e4 attacking d5 OR e5 wedge cramping Black. STRUCTURAL TARGET: undermining Black's c5+d5 cluster.",
    setupSans: ['Nf3','b6','g3','Bb7','Bg2','Nf6','O-O','e6','d4','Be7','c4','O-O','Nc3','d5','cxd5'],
    moves: ['exd5','Bf4','c5','b4'],
    annotations: [
      "...exd5 — Black recaptures with the e-pawn keeping the central pawn. Black's structure: isolated d5-pawn supported by c5 push.",
      "Bf4 — White develops the dark-square bishop actively. KEY SQUARE: c7 (Bf4 + Nc3 both eye this for future tactics).",
      "...c5 — Black's central counter-strike. Now the structure: hanging pawns (c5+d5) for Black, central pieces for White.",
      "b4 — White's queenside break attacking the c5-pawn. PAWN BREAK: b4 forces Black to trade or push, opening lines for our pieces.",
    ],
    learnCues: ['...exd5', 'Bf4 — active', '...c5 — hanging pawns', 'b4 — break the chain'],
    pawnBreaks: ['b4 queenside break attacking c5', 'e4 central push (alternative)'],
    pieceManeuvers: ['Bf4 dark-square pressure', 'Nc3 + Nb5 outpost ideas'],
    strategicThemes: ['Reversed-Slav structure', 'Attack hanging pawns'],
    endgameTransitions: ['R+B+N with central squares'],
  },
  {
    id: 'mp-pronaroKIA-vs-e6-attack', openingId: 'pro-naroditsky-kia',
    title: 'KIA vs ...e6 — kingside attack with f5 break',
    overview: "Past the KIA-vs-French setup with both castled and the e4 break played, White's plan is the textbook kingside attack. KEY SQUARES: f5 (Nf5 outpost), h5 (knight transit). PAWN BREAK: e5 wedge + f5 storming. STRUCTURE: closed centre = wing attack. CLASSICAL KIA-vs-French CONVERSION.",
    setupSans: ['Nf3','e6','g3','d5','Bg2','Nf6','O-O','Be7','d3','O-O','Nbd2','c5','e4','Nc6','Re1','b5'],
    moves: ['e5','Nd7','Nf1','a5'],
    annotations: [
      "e5! — the central pawn wedge cramps Black's kingside. KEY SQUARE: e5 (anchor for the kingside attack). The pawn structure is now locked, signaling a wing attack.",
      "...Nd7 — Black's f6-knight retreats to defensive duties (the e5 wedge denied the natural f6 square).",
      "Nf1 — the canonical KIA reroute begins. Nf1 → Ng3 → Nh5/Nf5 — the structural attack pattern.",
      "...a5 — Black tries the queenside counter, but White's attack is faster. CONVERSION: Ng3 + Nh5 → kingside attack while Black's queenside push is slow.",
    ],
    learnCues: ['e5! wedge', '...Nd7 retreat', 'Nf1 — KIA reroute', '...a5 too slow'],
    pawnBreaks: ['e5 central wedge', 'f5 kingside storm'],
    pieceManeuvers: ['Nbd2 → Nf1 → Ng3 → Nh5/Nf5 KIA reroute'],
    strategicThemes: ['Closed centre + kingside attack', 'Bg2 long-diagonal pressure'],
    endgameTransitions: ['R+B+N with kingside dominance'],
  },

  // ============ ROSSOLIMO new variations ============
  {
    id: 'mp-pronaroRoss-c3-spanish', openingId: 'pro-naroditsky-rossolimo',
    title: 'Rossolimo c3 sideline — Spanish-style squeeze',
    overview: "Past the c3 setup with both castled, White's plan is the Spanish kingside attack pattern. PIECE ROUTE: Nf1-Ng3 toward Nh5 outpost. KEY SQUARES: h5 (knight outpost), f5 (alternative knight square). PAWN BREAK: d4 (Black) or e4 (already done) — the structural fight is on the kingside.",
    setupSans: ['e4','c5','Nf3','d6','c3','Nf6','Bd3','Nc6','Bc2','Bg4','d3','e6','O-O','Be7','Nbd2','O-O','Re1'],
    moves: ['d5','Nf1','c4','Bb1'],
    annotations: [
      "...d5 — Black plays the central counter-strike. The d5 challenges e4 and tries to gain space.",
      "Nf1 — White's reroute begins. KEY SQUARE: h5 (target). PIECE ROUTE: Nf1-Ng3-Nh5 Italian-style.",
      "...c4 — Black continues the queenside expansion, locking the queenside permanently.",
      "Bb1 — White's bishop retreats to b1 (matching the Spanish dance). Now the dark-square diagonal stays alive for the kingside attack. STRUCTURE: closed queenside + open kingside = wing attack.",
    ],
    learnCues: ['...d5 — counter', 'Nf1 — KIA reroute', '...c4 lock', 'Bb1 — diagonal stays'],
    pawnBreaks: ['e4-e5 future wedge', 'f4 kingside storm'],
    pieceManeuvers: ['Nbd2 → Nf1 → Ng3 → Nh5 attack stack', 'Spanish bishop dance Bc2-Bb1'],
    strategicThemes: ['Spanish kingside attack pattern', 'Closed queenside + open kingside'],
    endgameTransitions: ['R+B+N attacking pieces'],
  },
  {
    id: 'mp-pronaroRoss-bc4-italian', openingId: 'pro-naroditsky-rossolimo',
    title: 'Rossolimo Bc4 vs ...d6 — Italian-style attack',
    overview: "Past the Italian-Bc4-Bb3 setup with both castled, White's plan is the classical Italian middlegame. KEY SQUARES: d5 (central outpost), f5 (kingside attack), c4 (bishop diagonal). PAWN BREAK: d4 supporting central expansion. PIECE COORDINATION: Nbd2 + Bg5 + Qf3 + Nh4 attack stack.",
    setupSans: ['e4','c5','Nf3','d6','Bc4','Nf6','d3','Nc6','c3','e6','Bb3','Be7','O-O','O-O','Re1','b5','Nbd2'],
    moves: ['a6','Nf1','Bb7','Ng3'],
    annotations: [
      "...a6 — Black supports the queenside expansion AND prevents Nb5 outposts.",
      "Nf1 — White's reroute toward kingside attack. KEY SQUARE: g3 (transit to h5/f5).",
      "...Bb7 — Black completes the queenside structure with the bishop on the long diagonal.",
      "Ng3 — the knight reaches the attacking position. PIECE ROUTE complete: Nbd2 → Nf1 → Ng3 → next move Nh5 OR Nf5 depending on Black's setup. KINGSIDE ATTACK is set.",
    ],
    learnCues: ['...a6 — solid', 'Nf1 reroute', '...Bb7 develop', 'Ng3 — attack ready'],
    pawnBreaks: ['d4 central + f4 kingside support'],
    pieceManeuvers: ['Nbd2 → Nf1 → Ng3 → Nh5/Nf5 Italian reroute'],
    strategicThemes: ['Italian Game kingside attack', 'Bb3 diagonal pressure on f7'],
    endgameTransitions: ['R+B+N with kingside attacking pieces'],
  },
  {
    id: 'mp-pronaroRoss-g6-maroczy', openingId: 'pro-naroditsky-rossolimo',
    title: 'Rossolimo vs ...g6 — Maroczy Bind conversion',
    overview: "Past the Maroczy-like c3+d4 setup with both castled and the queen on c5, White's plan is the classical Maroczy Bind squeeze. KEY SQUARES: d5 (central outpost), c5 (queen exposed). PAWN BREAK: c4 locking queenside, b4 chasing the queen. PIECE COORDINATION: Bd3-Bf4 attack stack + Nc3 central pressure.",
    setupSans: ['e4','c5','Nf3','g6','c3','d5','exd5','Qxd5','d4','Bg7','Nbd2','Nf6','dxc5','Qxc5','Bc4','O-O','O-O'],
    moves: ['Nc6','Nb3','Qb6','Bf4'],
    annotations: [
      "...Nc6 — Black develops the queen knight, attacking the d4-pawn (already gone) and supporting c5/e5 squares.",
      "Nb3 — White's knight attacks Black's exposed queen on c5. KEY SQUARE: c5 (queen retreat needed).",
      "...Qb6 — Black's queen retreats to safety.",
      "Bf4 — White completes development with the dark-square bishop active. STRUCTURAL EDGE: Maroczy Bind pattern with extra tempo + active pieces vs Black's exposed queen.",
    ],
    learnCues: ['...Nc6 — develop', 'Nb3 — attack queen', '...Qb6 retreat', 'Bf4 — active'],
    pawnBreaks: ['c4 queenside lock'],
    pieceManeuvers: ['Nbd2 → Nb3 queen attack', 'Bf4 dark-square pressure'],
    strategicThemes: ['Maroczy Bind squeeze', 'Exposed Black queen'],
    endgameTransitions: ['R+B+N positional pressure'],
  },

  // ============ FANTASY CARO additional plan ============
  {
    id: 'mp-pronaroFantasy-kingside-attack', openingId: 'pro-naroditsky-fantasy-caro',
    title: 'Fantasy Caro — Bxf6 + O-O-O kingside attack',
    overview: "Past the Bg5 pin + Bxf6 trade, White has the structural advantage. The plan is the textbook opposite-side-castled attack. KEY SQUARES: f6 (Black's weakened structure), g7 (target for g4-g5 storm). PAWN BREAK: g4-g5 kingside storm. PIECE COORDINATION: Qd2 + O-O-O + Bd3 + Rdg1 attack stack.",
    setupSans: ['e4','c6','d4','d5','f3','dxe4','fxe4','e5','d5','Bc5','Nf3','Nf6','Nc3','O-O','Bg5','h6','Bxf6','Qxf6'],
    moves: ['Qd2','Nd7','O-O-O','a5','g4'],
    annotations: [
      "Qd2 — connect the rooks, prepare O-O-O. KEY SQUARE: d2 — central coordination piece, then heading to the kingside via h6 once O-O-O is in.",
      "...Nd7 — Black develops the knight, eyes e5 and b6 outposts. PIECE ROUTE: Nd7 → Nb6 hits the c4-pawn and queenside.",
      "O-O-O! — White castles long. The race is ON: White's pawn storm against Black's king vs Black's pawn storm against White's. PAWN BREAK to come: g4-g5 ripping open the h-file.",
      "...a5! — Black throws the queenside pawn forward. Opposite-side-castling race: whoever's pawn storm lands first wins. KEY SQUARES: a4/b4 for Black's storm, g4/h4 for White's.",
      "g4! — KEY SQUARE g4. White's pawn break launches the kingside storm. Next g5 ripping open the h-file against Black's castled king. White's storm arrives first.",
    ],
    learnCues: ['Qd2 — connect', '...Nd7 — develop', 'O-O-O — race on', '...a5 — counter-storm', 'g4! — storm break'],
    pawnBreaks: ['g4-g5 kingside storm'],
    pieceManeuvers: ['O-O-O setup + Rdg1 attack rook lift'],
    strategicThemes: ['Opposite-side castling race', 'Bxf6 structural conversion'],
    endgameTransitions: ['Sharp middlegame conversion'],
  },
];

const out = [];
const skipped = [];
for (const p of PLANS) {
  let fen; try { fen = fenAfter(p.setupSans); } catch (e) { console.error('SKIP ' + p.id + ': setup ' + e.message); skipped.push(p.id); continue; }
  const c = new Chess(fen);
  let ok = true;
  for (const san of p.moves) {
    try { c.move(san); }
    catch (e) { console.error('SKIP ' + p.id + ': illegal ' + san + ' (' + e.message + ')'); skipped.push(p.id); ok = false; break; }
  }
  if (!ok) continue;
  if (p.annotations.length !== p.moves.length || p.learnCues.length !== p.moves.length) { console.error('SKIP ' + p.id + ': arr mismatch'); skipped.push(p.id); continue; }
  const highlights = highlightsFromMoves(p.setupSans, p.moves);
  const arrows = p.moves.map(() => []);
  const SRC = SRC_BY[p.openingId];
  out.push({
    id: p.id, openingId: p.openingId, criticalPositionFen: fen,
    title: p.title, overview: p.overview,
    pawnBreaks: p.pawnBreaks, pieceManeuvers: p.pieceManeuvers,
    strategicThemes: p.strategicThemes, endgameTransitions: p.endgameTransitions,
    playableLines: [{ fen, moves: p.moves, annotations: p.annotations, arrows, highlights, learnCues: p.learnCues, title: p.title, intro: p.overview, sources: SRC }],
  });
}
console.error('Built ' + out.length + ' plans, skipped ' + skipped.length);
console.log(JSON.stringify(out, null, 2));
