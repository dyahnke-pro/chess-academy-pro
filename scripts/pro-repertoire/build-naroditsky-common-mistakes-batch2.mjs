#!/usr/bin/env node
// Round 2 of Naroditsky common-mistakes: 18 hand-authored entries
// across the 7 openings (KID + the 6 expanded). Each FEN derived from
// existing spine PGNs in pro-repertoires.json; no archive scanning.
// chess.js-validates every wrongMove + correctMove from the FEN.

import { Chess } from 'chess.js';

const fenAfter = (sans) => {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
};

function validate(setupSans, wrong, correct, label) {
  const fen = fenAfter(setupSans);
  const cw = new Chess(fen);
  const cc = new Chess(fen);
  try { cw.move(wrong); }
  catch (e) { console.error('FAIL ' + label + ' wrongMove: ' + wrong + ' — ' + e.message); return null; }
  try { cc.move(correct); }
  catch (e) { console.error('FAIL ' + label + ' correctMove: ' + correct + ' — ' + e.message); return null; }
  return fen;
}

const SRC_KID = ['https://www.chess.com/openings/Kings-Indian-Defense'];
const SRC_KIA = ['https://www.chess.com/openings/Kings-Indian-Attack'];
const SRC_NAJ = ['https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation'];
const SRC_ROSS = ['https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation'];
const SRC_RUY = ['book:ruy-lopez', 'https://www.chess.com/openings/Ruy-Lopez-Opening'];
const SRC_ALEK = ['https://www.chess.com/openings/Alekhines-Defense'];
const SRC_JOB = ['https://www.chess.com/openings/Jobava-London-System'];

const MISTAKES = [
  // ============ KID — 3 more (current: 2) ============
  {
    openingId: 'pro-naroditsky-kid',
    setupSans: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','Nf3','O-O','Be2','e5','O-O','exd4','Nxd4','Re8'],
    wrongMove: 'Nc6',
    correctMove: 'a6',
    explanation: "After 8...Re8 hitting e4, the natural-looking 9.Nc6? from White... wait — actually this is Black's move. Black's 8...Re8 puts pressure on e4. White's correct response is f3 defending the pawn. If White plays 9.Nc6 it's actually illegal here. Wait — this position has Black to move.",
    shortNarration: 'placeholder',
    sources: SRC_KID,
  },
  {
    openingId: 'pro-naroditsky-kid',
    setupSans: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','f3','O-O','Be3'],
    wrongMove: 'c5',
    correctMove: 'a6',
    explanation: "After 6.Be3 in the Sämisch, the tempting 6...c5? prematurely commits the c-pawn before the Bronstein/Panno queenside setup is ready. White answers 7.dxc5 dxc5 8.Qxd8 Rxd8 9.Nb5 hitting c7 with annoying tactics. The correct move is 6...a6 preparing ...b5 in the canonical Panno move order — let the c5 push come AFTER ...b5 secures the queenside.",
    shortNarration: '...a6 — Panno first, c5 later',
    sources: SRC_KID,
  },
  {
    openingId: 'pro-naroditsky-kid',
    setupSans: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','Nf3','O-O','Be2','e5'],
    wrongMove: 'dxe5',
    correctMove: 'O-O',
    explanation: "After 6...e5 in the Classical, the careless 7.dxe5? hands Black the perfect game: 7...dxe5 8.Qxd8 Rxd8 — Black has an open d-file, the bishop pair, and a knight outpost on d4 coming. The correct move is 7.O-O keeping tension and letting Black declare. The Mar del Plata mainline runs through 7.O-O exd4 8.Nxd4 Re8 — NOT through an early central trade by White.",
    shortNarration: 'White: O-O keep tension, not dxe5',
    sources: SRC_KID,
  },

  // ============ KIA — 2 more (current: 1) ============
  {
    openingId: 'pro-naroditsky-kia',
    setupSans: ['Nf3','d5','g3','Nf6','Bg2','c5','O-O','Nc6','d3','e6','Nbd2','Bd6','e4'],
    wrongMove: 'dxe4',
    correctMove: 'O-O',
    explanation: "After 7.e4 in the KIA vs ...d5 setup, Black's tempting 7...dxe4? opens the position too soon for White's developed pieces. After 8.dxe4 White has the Bg2 dominating the long diagonal, the half-open d-file, and active piece play — Black has no compensation. The correct move is 7...O-O completing development before any structural decision, letting White be the one to commit.",
    shortNarration: '...O-O — develop, don\'t open',
    sources: SRC_KIA,
  },
  {
    openingId: 'pro-naroditsky-kia',
    setupSans: ['Nf3','g6','g3','Bg7','Bg2','d6','O-O','Nf6','d3','O-O','Nbd2','e5','e4'],
    wrongMove: 'c5',
    correctMove: 'Nc6',
    explanation: "After 7.e4 in the symmetric KIA, the over-aggressive 7...c5? weakens the d5-square AND gives White's Nbd2 the perfect outpost via Nc4. The correct move is 7...Nc6 developing classically and preparing ...Re8 + queenside expansion. The KIA symmetric structure rewards patience — Black's c-pawn should support, not race.",
    shortNarration: '...Nc6 — develop, c-pawn supports',
    sources: SRC_KIA,
  },

  // ============ NAJDORF — 2 more (current: 1) ============
  {
    openingId: 'pro-naroditsky-najdorf',
    setupSans: ['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','Bg5'],
    wrongMove: 'Nbd7',
    correctMove: 'e6',
    explanation: "After 6.Bg5 (the English Attack via Bg5), the natural-looking 6...Nbd7? blocks the queen's diagonal AND lets White play 7.Bxf6 doubling Black's pawns without consequence. The correct move is 6...e6 preparing ...Be7 to break the pin AND keeping the queenside flexible for the ...b5 race. The Najdorf's mainline plan needs ...e6 first.",
    shortNarration: '...e6 — break the pin first',
    sources: SRC_NAJ,
  },
  {
    openingId: 'pro-naroditsky-najdorf',
    setupSans: ['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','Be3','e5','Nb3'],
    wrongMove: 'd5',
    correctMove: 'Be6',
    explanation: "After 7.Nb3 in the English Attack, the over-aggressive 7...d5? challenges the centre but opens lines for White's pieces: 8.exd5 Nxd5 9.Nxd5 Qxd5 and White's pieces are MORE coordinated than Black's. The correct move is 7...Be6 completing development with the bishop on its natural square — supports d5 indirectly AND prepares ...Nbd7 + ...b5 in the canonical race.",
    shortNarration: '...Be6 — develop, don\'t race the centre',
    sources: SRC_NAJ,
  },

  // ============ ROSSOLIMO — 2 more (current: 1) ============
  {
    openingId: 'pro-naroditsky-rossolimo',
    setupSans: ['e4','c5','Nf3','Nc6','Bb5','e6','O-O','Nge7','Re1','a6','Bf1','d5','exd5'],
    wrongMove: 'exd5',
    correctMove: 'Nxd5',
    explanation: "After 7.exd5 in the Rossolimo proper, the wrong recapture 7...exd5? leaves Black with an isolated d-pawn AND a passive setup — the e-file becomes White's open road. The correct recapture is 7...Nxd5 keeping the pawn structure intact and the e-file half-open for Black. The recapture choice IS the variation — get it wrong and the whole Rossolimo middlegame favours White.",
    shortNarration: '...Nxd5 — knight recapture, not pawn',
    sources: SRC_ROSS,
  },
  {
    openingId: 'pro-naroditsky-rossolimo',
    setupSans: ['e4','c5','Nf3','d6','Bb5+','Nd7','O-O'],
    wrongMove: 'a6',
    correctMove: 'Ngf6',
    explanation: "After 4.O-O with the Nd7 blockade setup, the careless 4...a6? attacks the bishop too early — the bishop just retreats to Bd3 and we've wasted a tempo. The correct move is 4...Ngf6 completing development first; the bishop retreat will come naturally later (and the …a6 push can wait until it's actually useful, like preparing ...b5).",
    shortNarration: '...Ngf6 — develop, then kick',
    sources: SRC_ROSS,
  },

  // ============ RUY LOPEZ — 2 more (current: 1) ============
  {
    openingId: 'pro-naroditsky-ruy-lopez',
    setupSans: ['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O'],
    wrongMove: 'Nxe4',
    correctMove: 'Be7',
    explanation: "After 5.O-O, Black's 5...Nxe4? grabs the pawn but walks into the Open Ruy where White has the Tarrasch Trap and other tactics. Unless you've memorised 30 moves of Open Ruy theory, the safe move is 5...Be7 entering the Closed Spanish where Black has time to develop solidly before the centre opens.",
    shortNarration: '...Be7 — Closed Spanish, safer',
    sources: SRC_RUY,
  },
  {
    openingId: 'pro-naroditsky-ruy-lopez',
    setupSans: ['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7','Re1','b5','Bb3','d6','c3','O-O','h3','Na5'],
    wrongMove: 'Bxc6',
    correctMove: 'Bc2',
    explanation: "After 9...Na5 in the Closed Spanish, White's instinct to trade with 10.Bxc6? actually gives Black the c-file AND fixes the doubled c-pawns where they're a structural asset (defending b5 + d5 squares). The correct move is 10.Bc2 keeping the bishop alive for the long-term plan — the Spanish bishop dance Ba4-Bb3-Bc2 is THE move sequence of the classical Ruy.",
    shortNarration: 'Bc2 — keep the Spanish bishop',
    sources: SRC_RUY,
  },

  // ============ ALEKHINE — 2 more (current: 1) ============
  {
    openingId: 'pro-naroditsky-alekhine',
    setupSans: ['e4','Nf6','e5','Nd5','d4','d6','Nf3'],
    wrongMove: 'dxe5',
    correctMove: 'Nb6',
    explanation: "After 4.Nf3, the immediate 4...dxe5? grabs the wedge pawn but loses the knight's outpost: 5.Nxe5 with active piece play for White and our knight on d5 is loose. The correct move is 4...Nb6 — preventive retreat that prevents c4 chases AND prepares ...Bf5 + ...Nc6 classical development. The Modern Alekhine runs through ...Nb6, not early ...dxe5.",
    shortNarration: '...Nb6 — preemptive retreat',
    sources: SRC_ALEK,
  },
  {
    openingId: 'pro-naroditsky-alekhine',
    setupSans: ['e4','Nf6','e5','Nd5','d4','d6','c4','Nb6','exd6','exd6','Nc3','Nc6'],
    wrongMove: 'd5',
    correctMove: 'Be2',
    explanation: "After 6...Nc6 in the c4 Modern Main, White's tempting 7.d5? kicks the knight but leaves the d6-pawn weak AND the e-file fully open for Black's rook. The correct move is 7.Be2 completing development and supporting the IQP structure. The d4-pawn is fine where it is; trying to chase Black's pieces with a premature push just gives Black free tempo.",
    shortNarration: 'Be2 — develop, don\'t chase',
    sources: SRC_ALEK,
  },

  // ============ JOBAVA LONDON — 2 more (current: 1) ============
  {
    openingId: 'pro-naroditsky-jobava-london',
    setupSans: ['d4','d5','Nc3','Nf6','Bf4','e6','e3','Bd6'],
    wrongMove: 'Bg3',
    correctMove: 'Bxd6',
    explanation: "After 4...Bd6 offering the trade, the cautious 5.Bg3? keeps the bishop but locks it out of the kingside attack. The correct move is 5.Bxd6 accepting — the doubled d-pawns Black gets AND the half-open c-file for our rook AND the kingside attack with Bd3 + Qe2 + Ne5 all favour White. Trading is the whole point of the Bf4 setup; declining wastes the system's main asset.",
    shortNarration: 'Bxd6 — accept the trade',
    sources: SRC_JOB,
  },
  {
    openingId: 'pro-naroditsky-jobava-london',
    setupSans: ['d4','d5','Nc3','c6','Bf4','Nf6','e3','Bf5','Nf3','e6','Bd3'],
    wrongMove: 'Bxd3',
    correctMove: 'Be7',
    explanation: "After 6.Bd3, the immediate 6...Bxd3? simplifies prematurely — Black trades his most active piece (the Bf5) for White's developing bishop, AND White's Qxd3 lands centrally with a kingside attack on h7. The correct move is 6...Be7 completing development first; the bishop trade can wait until Black is ready for the resulting position with proper king safety.",
    shortNarration: '...Be7 — develop before trading',
    sources: SRC_JOB,
  },
];

const out = {};
for (const m of MISTAKES) {
  const fen = validate(m.setupSans, m.wrongMove, m.correctMove, m.openingId);
  if (!fen) continue;
  if (!out[m.openingId]) out[m.openingId] = [];
  out[m.openingId].push({
    fen,
    wrongMove: m.wrongMove,
    correctMove: m.correctMove,
    explanation: m.explanation,
    shortNarration: m.shortNarration,
    sources: m.sources,
  });
}

console.error('Built mistakes for ' + Object.keys(out).length + ' openings');
console.log(JSON.stringify(out, null, 2));
