#!/usr/bin/env node
// Build common-mistakes entries for remaining Naroditsky openings.
// Each entry's FEN + wrongMove + correctMove are chess.js-validated.

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
  // ===== KID =====
  {
    openingId: 'pro-naroditsky-kid',
    setupSans: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','Nf3','O-O','Be2'],
    wrongMove: 'Nbd7',
    correctMove: 'e5',
    explanation: "After 6.Be2 the natural move is 6...e5! striking the centre immediately — the move that defines the KID. Playing 6...Nbd7 first delays the central strike and lets White complete development with Be3 + O-O, blunting our middlegame plans. The Mar del Plata mainline starts with e5 right now.",
    shortNarration: '...e5 — strike the centre now',
    sources: SRC_KID,
  },
  {
    openingId: 'pro-naroditsky-kid',
    setupSans: ['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','Nf3','O-O','Be2','e5','O-O','exd4','Nxd4','Re8','f3','Nc6','Be3'],
    wrongMove: 'c5',
    correctMove: 'Nh5',
    explanation: "After 10.Be3, the tempting 10...c5? trying to kick the knight actually weakens the d5-square permanently AND gives White a target. The correct move is 10...Nh5 starting the kingside reroute — the knight heads to f4 and the Mar del Plata attack begins. Save the ...c5 push for AFTER the kingside is set up.",
    shortNarration: '...Nh5 — kingside reroute first',
    sources: SRC_KID,
  },
  {
    openingId: 'pro-naroditsky-kid',
    setupSans: ['d4','Nf6','c4','g6','g3','Bg7','Bg2','O-O','Nc3','d6','Nf3','Nbd7','O-O','e5','e4'],
    wrongMove: 'exd4',
    correctMove: 'c6',
    explanation: "After 8.e4 in the Fianchetto, taking with 8...exd4 prematurely opens the position favouring White's Bg2 on the long diagonal. The correct move is 8...c6 supporting d5 and preparing the queenside expansion plan with ...Qa5 + ...b5. Wait for White to commit before opening lines.",
    shortNarration: '...c6 — support, wait to open',
    sources: SRC_KID,
  },

  // ===== KIA =====
  {
    openingId: 'pro-naroditsky-kia',
    setupSans: ['Nf3','d5','g3','Nf6','Bg2','c5','O-O','Nc6','d3','e6','Nbd2'],
    wrongMove: 'e4',
    correctMove: 'Bd6',
    explanation: "After 6.Nbd2 the natural development is 6...Bd6 placing the bishop on an active diagonal aiming at h2. Playing 6...e4? attacking our knight is premature — it weakens the d4-square AND closes the centre too early, denying Black the active piece play that ...Bd6 provides. Complete development before striking.",
    shortNarration: '...Bd6 — develop before striking',
    sources: SRC_KIA,
  },
  {
    openingId: 'pro-naroditsky-kia',
    setupSans: ['Nf3','g6','g3','Bg7','Bg2','d6','O-O','Nf6','d3','O-O','Nbd2','e5','e4'],
    wrongMove: 'Nc6',
    correctMove: 'Nbd7',
    explanation: "After 7.e4 the natural-looking 7...Nc6? actually blocks the c-pawn AND commits the knight to a less flexible square. The correct move is 7...Nbd7 keeping the c-pawn free for ...c6 + ...c5 expansion plans. The Nbd7 also reroutes to Nf8-Ne6 in some structures, giving Black more flexibility.",
    shortNarration: '...Nbd7 — keep the c-pawn flexible',
    sources: SRC_KIA,
  },

  // ===== NAJDORF =====
  {
    openingId: 'pro-naroditsky-najdorf',
    setupSans: ['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','Be3','e5','Nb3','Be6','f3','Nbd7','Qd2'],
    wrongMove: 'O-O',
    correctMove: 'b5',
    explanation: "After 8.Qd2 in the English Attack, Black's natural ...O-O? walks the king into White's queenside attack zone (the …b5 + …O-O-O race means whoever castles AWAY from the attacker wins). The correct move is 8...b5! starting the queenside counter-attack immediately. Castle queenside (O-O-O) later if needed.",
    shortNarration: '...b5! — counter-attack first',
    sources: SRC_NAJ,
  },
  {
    openingId: 'pro-naroditsky-najdorf',
    setupSans: ['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','Bg5','e6','f4','Be7','Qf3'],
    wrongMove: 'O-O',
    correctMove: 'Qc7',
    explanation: "After 7.Qf3 in the English Attack with Bg5, Black's natural-looking ...O-O? lets White play O-O-O + g4-g5 with a coming kingside crash. The correct move is 7...Qc7 loading the c-file AND preparing the …b5 push. The queen on c7 has multiple roles: defends, attacks, and stays flexible.",
    shortNarration: '...Qc7 — load the c-file',
    sources: SRC_NAJ,
  },

  // ===== ROSSOLIMO =====
  {
    openingId: 'pro-naroditsky-rossolimo',
    setupSans: ['e4','c5','Nf3','d6','Bb5+'],
    wrongMove: 'Nbd7',
    correctMove: 'Bd7',
    explanation: "After 3.Bb5+ Black's …Nbd7 blockade is passive — the knight on d7 is awkward, blocking the bishop's development AND limiting later …c5 push ideas. The cleanest response is 3...Bd7 offering the immediate trade. Bxd7+ Qxd7 simplifies and Black gets a comfortable game without the bishop pair handicap.",
    shortNarration: '...Bd7 — trade immediately',
    sources: SRC_ROSS,
  },

  // ===== ALEKHINE =====
  {
    openingId: 'pro-naroditsky-alekhine',
    setupSans: ['e4','Nf6','e5','Nd5','d4'],
    wrongMove: 'Nb6',
    correctMove: 'd6',
    explanation: "After 3.d4 the natural-looking …Nb6 retreats too early — White answers c4 chasing the knight to a4 with serious cramping. The correct move is 3...d6 hitting the e5 pawn and forcing White to declare. After exd6 we recapture; after Nf3 we get classical Modern Alekhine development.",
    shortNarration: '...d6 — hit the wedge first',
    sources: SRC_ALEK,
  },

  // ===== RUY LOPEZ =====
  {
    openingId: 'pro-naroditsky-ruy-lopez',
    setupSans: ['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7','Re1','b5','Bb3','O-O','c3'],
    wrongMove: 'Bc5',
    correctMove: 'd6',
    explanation: "After 8.c3 in the Closed Spanish, Black's …Bc5? exposes the bishop to White's d4 push winning a tempo. The correct move is 8...d6 supporting e5 AND preparing the standard Ruy maneuvering ...Na5-Nc4 or …Nb8-Nbd7. Don't volunteer the bishop to be kicked.",
    shortNarration: '...d6 — support, don\'t expose',
    sources: SRC_RUY,
  },

  // ===== JOBAVA LONDON =====
  {
    openingId: 'pro-naroditsky-jobava-london',
    setupSans: ['d4','d5','Nc3','Nf6','Bf4'],
    wrongMove: 'Nbd7',
    correctMove: 'c5',
    explanation: "After 3.Bf4 in the Jobava, Black's careless 3...Nbd7? walks into 4.Nb5! threatening Nc7+ winning material. The correct move is 3...c5 challenging the centre AND denying the Nb5 square. The Bf4 setup is positional but contains tactics; ignore them and you lose.",
    shortNarration: '...c5 — deny Nb5',
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
