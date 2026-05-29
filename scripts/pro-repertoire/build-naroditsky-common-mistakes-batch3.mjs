#!/usr/bin/env node
// Round 3 of Naroditsky common-mistakes — bring all openings to 5
// Pitfall entries. Hand-authored from existing spine PGNs in
// pro-repertoires.json, chess.js-validated, no archive scanning.

import { Chess } from 'chess.js';

const fenAfter = (sans) => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
function validate(setupSans, wrong, correct, label) {
  const fen = fenAfter(setupSans);
  const cw = new Chess(fen); const cc = new Chess(fen);
  try { cw.move(wrong); } catch (e) { console.error('FAIL ' + label + ' wrongMove: ' + wrong + ' — ' + e.message); return null; }
  try { cc.move(correct); } catch (e) { console.error('FAIL ' + label + ' correctMove: ' + correct + ' — ' + e.message); return null; }
  return fen;
}

const SRC_KID = ['https://www.chess.com/openings/Kings-Indian-Defense'];
const SRC_KIA = ['https://www.chess.com/openings/Kings-Indian-Attack'];
const SRC_NAJ = ['https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation'];
const SRC_ROSS = ['https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation'];
const SRC_RUY = ['book:ruy-lopez', 'https://www.chess.com/openings/Ruy-Lopez-Opening'];
const SRC_ALEK = ['https://www.chess.com/openings/Alekhines-Defense'];
const SRC_JOB = ['https://www.chess.com/openings/Jobava-London-System'];
const SRC_CARO = ['https://www.chess.com/openings/Caro-Kann-Defense'];
const SRC_ALAPIN = ['https://www.chess.com/openings/Alapin-Sicilian-Defense'];

const MISTAKES = [
  // ====== KID (+1 → 5) ======
  {
    openingId: 'pro-naroditsky-kid',
    setupSans: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','f3','O-O','Be3','a6','Qd2','c5','Nge2','Nc6','Rd1'],
    wrongMove: 'cxd4',
    correctMove: 'b5',
    explanation: "After 9.Rd1 in the Sämisch, the natural-looking 9...cxd4? simplifies prematurely — White recaptures with the knight and the trade-down sequence favours White's developed pieces. The correct move is 9...b5! continuing the Bronstein/Panno queenside push BEFORE simplifying. The b5 hits c4 and opens lines while Black still has full development tempo.",
    shortNarration: '...b5! — push, don\'t trade yet',
    sources: SRC_KID,
  },
  // ====== KIA (+2 → 5) ======
  {
    openingId: 'pro-naroditsky-kia',
    setupSans: ['Nf3','d5','g3','Nf6','Bg2','c5','O-O','Nc6','d3','e6','Nbd2','Be7','e4','dxe4','dxe4','O-O'],
    wrongMove: 'Nc4',
    correctMove: 'Re1',
    explanation: "After 8...O-O the over-eager 9.Nc4? puts the knight on a square where Black can kick it with ...b5 (gaining tempo) AND the knight on c4 doesn't have great follow-ups since Black hasn't committed any pieces yet. The correct move is 9.Re1 supporting e4 first, then deciding whether Nc4 or Nh4 is the right reroute based on Black's setup.",
    shortNarration: 'Re1 — support e4 first',
    sources: SRC_KIA,
  },
  {
    openingId: 'pro-naroditsky-kia',
    setupSans: ['Nf3','d6','g3','g6','Bg2','Bg7','O-O','Nf6','d4','O-O','c4','e5'],
    wrongMove: 'dxe5',
    correctMove: 'Nc3',
    explanation: "After 6...e5 in the KIA vs Pirc, the careless 7.dxe5? trades the centre too early and hands Black the open e-file plus equality. The correct move is 7.Nc3 supporting the centre and keeping tension. The d4-pawn is fine where it is — let Black be the one to commit the exchange.",
    shortNarration: 'Nc3 — keep tension',
    sources: SRC_KIA,
  },
  // ====== NAJDORF (+2 → 5) ======
  {
    openingId: 'pro-naroditsky-najdorf',
    setupSans: ['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','Bg5','e6','f4'],
    wrongMove: 'Nbd7',
    correctMove: 'Be7',
    explanation: "After 7.f4 in the English Attack with Bg5, the natural 7...Nbd7? blocks the queen's d-file AND lets White play Bxf6 doubling Black's pawns without compensation. The correct move is 7...Be7 breaking the pin first AND completing kingside development. The Nbd7 reroute comes after the pin is broken.",
    shortNarration: '...Be7 — break the pin first',
    sources: SRC_NAJ,
  },
  {
    openingId: 'pro-naroditsky-najdorf',
    setupSans: ['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','Be2','e5','Nb3','Be7','Be3'],
    wrongMove: 'Ng4',
    correctMove: 'O-O',
    explanation: "After 8.Be3 in the Classical, the tempting 8...Ng4? attacks the bishop but White just retreats Bg5 and Black has wasted tempi. The correct move is 8...O-O completing development first — the position is positional, not tactical, and knight excursions just lose tempo.",
    shortNarration: '...O-O — develop, not chase',
    sources: SRC_NAJ,
  },
  // ====== ROSSOLIMO (+2 → 5) ======
  {
    openingId: 'pro-naroditsky-rossolimo',
    setupSans: ['e4','c5','Nf3','Nc6','Bb5','g6','Bxc6','bxc6','O-O','Bg7'],
    wrongMove: 'e5',
    correctMove: 'Re1',
    explanation: "After 5.O-O in the Rossolimo vs ...g6, the tempting 5.e5? grabs space but Black answers ...Nh6-Nf5 reaching active piece play AND the e5-pawn is loose. The correct move is 5.Re1 supporting e4 AND preparing classical development. The space gain has to come slowly in the Rossolimo, not by force.",
    shortNarration: 'Re1 — patient, not e5 push',
    sources: SRC_ROSS,
  },
  {
    openingId: 'pro-naroditsky-rossolimo',
    setupSans: ['e4','c5','Nf3','Nc6','Bb5','e6','O-O','Nge7','Re1','a6','Bf1'],
    wrongMove: 'b4',
    correctMove: 'd5',
    explanation: "After 6.Bf1 the careless 6...b4? wastes a tempo on a pawn move without addressing the centre — White just continues with d3 + c3 + d4 and the queenside expansion is premature. The correct move is 6...d5 challenging the centre AND opening lines for the developed pieces.",
    shortNarration: '...d5 — challenge centre first',
    sources: SRC_ROSS,
  },
  // ====== RUY LOPEZ (+3 → 5) ======
  {
    openingId: 'pro-naroditsky-ruy-lopez',
    setupSans: ['e4','e5','Nf3','Nc6','Bb5','Nf6','O-O','Nxe4','d4'],
    wrongMove: 'exd4',
    correctMove: 'Nd6',
    explanation: "After 5.d4 in the Berlin Defense, the natural 5...exd4? loses material to 6.Re1 pinning the e4-knight (the Tarrasch Trap setup). The correct move is 5...Nd6 retreating the knight AND triggering the Berlin Endgame transition. The 5...exd4 grab is a classic Berlin trap — don't fall for it.",
    shortNarration: '...Nd6 — retreat, don\'t grab',
    sources: SRC_RUY,
  },
  {
    openingId: 'pro-naroditsky-ruy-lopez',
    setupSans: ['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7','Re1','b5','Bb3','d6','c3','O-O'],
    wrongMove: 'd4',
    correctMove: 'h3',
    explanation: "After 8...O-O the immediate 9.d4? opens the position before White's setup is complete — Black answers ...exd4 cxd4 ...Bg4 with tactical pressure. The correct move is 9.h3 preventing ...Bg4 AND preparing the future d4 push at the right moment. Patience: the Ruy is a slow strangulation.",
    shortNarration: 'h3 — patience first',
    sources: SRC_RUY,
  },
  {
    openingId: 'pro-naroditsky-ruy-lopez',
    setupSans: ['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','d6','c3','Bd7','d4','g6','O-O','Bg7','Nbd2','Nf6'],
    wrongMove: 'Re1',
    correctMove: 'd5',
    explanation: "After 8...Nf6 in the Steinitz Defense Deferred, the developing 9.Re1 is fine but the active 9.d5! gains queenside space AND locks the centre favourably. The Re1 move is slow; d5 is the principled aggressive choice in this specific structure.",
    shortNarration: 'd5 — aggressive space grab',
    sources: SRC_RUY,
  },
  // ====== ALEKHINE (+2 → 5) ======
  {
    openingId: 'pro-naroditsky-alekhine',
    setupSans: ['e4','Nf6','e5','Nd5','d4','d6','Nf3','dxe5','Nxe5','c6','Be2','Bf5','O-O'],
    wrongMove: 'Bg4',
    correctMove: 'Nd7',
    explanation: "After 7.O-O the wrong-bishop development 7...Bg4? exposes the bishop to h3 ideas AND doesn't address Black's central setup. The correct move is 7...Nd7 challenging the centralised White knight on e5 AND preparing classical development. The Bf5 stays put.",
    shortNarration: '...Nd7 — challenge Ne5',
    sources: SRC_ALEK,
  },
  {
    openingId: 'pro-naroditsky-alekhine',
    setupSans: ['e4','Nf6','Nc3','e5','Nf3','Nc6','Bb5','Bb4','O-O','O-O','d3','d6'],
    wrongMove: 'Bg5',
    correctMove: 'Bxc6',
    explanation: "After 6...d6 in the Two Knights Alekhine, the natural-looking 7.Bg5? pins the f6-knight but Black just plays ...h6 and the position is unclear. The correct move is 7.Bxc6 trading immediately — the resulting Spanish-style pawn structure favours White's space advantage AND the bishop pair will compensate Black's doubled c-pawns insufficiently.",
    shortNarration: 'Bxc6 — trade structurally',
    sources: SRC_ALEK,
  },
  // ====== JOBAVA LONDON (+2 → 5) ======
  {
    openingId: 'pro-naroditsky-jobava-london',
    setupSans: ['d4','d5','Nc3','Nf6','Bf4','c5','e3','Nc6','Nf3','a6','Bd3'],
    wrongMove: 'cxd4',
    correctMove: 'h6',
    explanation: "After 6.Bd3 the over-eager 6...cxd4? opens the position too early — White recaptures with the knight (Nxd4) and develops with a clear tempo edge. The correct move is 6...h6 preventing future Bg5 pins AND preparing ...Bd6 development. Patience in the Jobava; Black has to develop before opening lines.",
    shortNarration: '...h6 — prep, don\'t trade yet',
    sources: SRC_JOB,
  },
  {
    openingId: 'pro-naroditsky-jobava-london',
    setupSans: ['d4','d5','Nc3','c6','Bf4','Nf6','e3','Bf5','Nf3'],
    wrongMove: 'Qb6',
    correctMove: 'e6',
    explanation: "After 5.Nf3 the over-active 5...Qb6? attacks b2 but White just plays Qb1 (or Nd2 defending) and Black's queen is exposed AND undeveloped. The correct move is 5...e6 completing classical development first. The queen excursions come later, after pieces are out.",
    shortNarration: '...e6 — develop, not raid',
    sources: SRC_JOB,
  },
  // ====== CARO-KANN (+2 → 5) ======
  {
    openingId: 'pro-naroditsky-caro-kann',
    setupSans: ['e4','c6','d4','d5','Nc3','dxe4','Nxe4','Nf6','Nxf6+'],
    wrongMove: 'exf6',
    correctMove: 'gxf6',
    explanation: "After 5.Nxf6+ in the Classical Caro-Kann, the natural 5...exf6? gives Black doubled f-pawns AND a passive structure. The correct move is 5...gxf6 — counterintuitive but correct: opens the g-file for the rook AND maintains better pawn structure (f-pawns NOT doubled). The opening of the g-file becomes Black's main attacking asset.",
    shortNarration: '...gxf6 — open g-file',
    sources: SRC_CARO,
  },
  {
    openingId: 'pro-naroditsky-caro-kann',
    setupSans: ['e4','c6','d4','d5','e5','Bf5','Nf3','e6'],
    wrongMove: 'Bd3',
    correctMove: 'Be2',
    explanation: "After 4...e6 in the Advance Caro-Kann, the eager 5.Bd3? offers the bishop trade with Bxf5 — but the trade actually helps Black! Black recaptures with ...Bxd3 Qxd3 and Black's Bf5 (problem bishop) is exchanged for our active piece. The correct move is 5.Be2 keeping the bishop pair AND continuing classical development. Don't trade bishops voluntarily in this structure.",
    shortNarration: 'Be2 — keep bishops on',
    sources: SRC_CARO,
  },
  // ====== ALAPIN (+1 → 5) ======
  {
    openingId: 'pro-naroditsky-alapin',
    setupSans: ['e4','c5','c3','d6'],
    wrongMove: 'Nf3',
    correctMove: 'd4',
    explanation: "After 2...d6 in the Alapin, the over-cautious 3.Nf3? wastes the supported d4 push — Black has committed without ...Nf6 or ...d5, so White CAN play d4 immediately and reach the dream Alapin structure. The correct move is 3.d4! claiming the centre. After ...d6, the d4 push is justified (unlike after ...Nc6 where d4 is premature).",
    shortNarration: 'd4 — claim centre after ...d6',
    sources: SRC_ALAPIN,
  },
];

const out = {};
for (const m of MISTAKES) {
  const fen = validate(m.setupSans, m.wrongMove, m.correctMove, m.openingId);
  if (!fen) continue;
  if (!out[m.openingId]) out[m.openingId] = [];
  out[m.openingId].push({
    fen, wrongMove: m.wrongMove, correctMove: m.correctMove,
    explanation: m.explanation, shortNarration: m.shortNarration, sources: m.sources,
  });
}
console.error('Built mistakes for ' + Object.keys(out).length + ' openings');
console.log(JSON.stringify(out, null, 2));
