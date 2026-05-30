#!/usr/bin/env node
// Pitfalls for the GothamChess Fantasy Variation vs Caro. Student = WHITE.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/common-mistakes.json';
const KEY = 'pro-gothamchess-fantasy-caro';
const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation',
  'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence',
];

const PITFALLS = [
  {
    // After 1.e4 c6 2.d4 d5 3.f3 — the Fantasy. Then 3...dxe4 4.fxe4 is the point.
    setup: 'e4 c6 d4 d5 f3 dxe4',
    wrongMove: 'Bc4',
    correctMove: 'fxe4',
    explanation:
      "The whole point of 3.f3 is to recapture with fxe4! — building a broad e4/d4 pawn centre, the Fantasy's entire idea. Developing with Bc4 first lets Black hold onto the extra e4-pawn with …exf3 or …f5, throwing away the centre that justifies the slightly weakening f3. Take with the f-pawn immediately: the imposing centre and the open f-file are the compensation for the committal third move.",
    shortNarration: 'fxe4 — build the big centre',
  },
  {
    // After 3...g6 4.Nc3 Bg7 5.Be3 Qb6 — the poison pawn. Qd2 (offer b2) vs defending.
    setup: 'e4 c6 d4 d5 f3 g6 Nc3 Bg7 Be3 Qb6',
    wrongMove: 'Rb1',
    correctMove: 'Qd2',
    explanation:
      "When Black plays …Qb6 eyeing b2 against the …g6 line, the principled move is Qd2! — calmly developing and DARING Black to grab the poison pawn. After …Qxb2 Rb1 chases the queen to a3, and White has a huge lead in development for the pawn. The passive Rb1 immediately just defends and surrenders the initiative. Offer b2 with Qd2 and play the gambit.",
    shortNarration: 'Qd2 — offer the b2 poison pawn',
  },
  {
    // After 3...e6 4.Nc3 Bb4 — the pin. a3 (challenge) vs allowing it.
    setup: 'e4 c6 d4 d5 f3 e6 Nc3 Bb4',
    wrongMove: 'Bd2',
    correctMove: 'a3',
    explanation:
      "When Black pins with …Bb4 in the …e6 line, the active a3! questions the bishop immediately. After …Bxc3+ bxc3, White gets the bishop pair and a powerful pawn centre with attacking chances on the kingside (the Qg4-Qxg7 raid). The passive Bd2 lets Black keep the tension and equalise comfortably. Challenge the pin with a3 and take the bishop pair.",
    shortNarration: 'a3 — question the pin, win the pair',
  },
];

const data = JSON.parse(fs.readFileSync(PATH, 'utf8'));
let failed = 0;
const entries = [];

for (const p of PITFALLS) {
  const c = new Chess();
  let ok = true;
  for (const san of p.setup.trim().split(/\s+/)) {
    try { c.move(san); } catch { console.error(`SETUP ILLEGAL: ${san}`); ok = false; break; }
  }
  if (!ok) { failed++; continue; }
  const fen = c.fen();
  for (const mv of [p.wrongMove, p.correctMove]) {
    const probe = new Chess(fen);
    try { probe.move(mv); } catch { console.error(`MOVE ILLEGAL: ${mv} @ ${fen}`); failed++; ok = false; }
  }
  if (!ok) continue;
  const words = p.shortNarration.replace(/[—–-]/g, ' ').split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length;
  if (words > 8) { console.error(`CUE too long (${words}w): ${p.shortNarration}`); failed++; continue; }
  entries.push({ fen, wrongMove: p.wrongMove, correctMove: p.correctMove, explanation: p.explanation, shortNarration: p.shortNarration, sources: SRC });
}

if (failed > 0) { console.error(`\n${failed} pitfall(s) failed — NOT writing.`); process.exit(1); }
data[KEY] = entries;
fs.writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`wrote ${entries.length} pitfalls under "${KEY}".`);
