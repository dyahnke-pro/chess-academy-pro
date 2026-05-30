#!/usr/bin/env node
// Pitfalls for the GothamChess Milner-Barry Gambit. Student = WHITE.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/common-mistakes.json';
const KEY = 'pro-gothamchess-milner-barry';
const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/French-Defense-Advance-Variation-Milner-Barry-Gambit',
  'https://en.wikipedia.org/wiki/French_Defence',
];

const PITFALLS = [
  {
    // After 1.e4 e6 2.d4 d5 3.e5 c5 4.c3 Nc6 5.Nf3 Qb6 — the gambit moment. Bd3 vs passive.
    setup: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6',
    wrongMove: 'a3',
    correctMove: 'Bd3',
    explanation:
      "When Black hits d4 with …Qb6, the Milner-Barry idea is Bd3! — offering the d4-pawn as a gambit. After …cxd4 cxd4 Nxd4 Nxd4 Qxd4, White gets a huge lead in development and a kingside attack for the pawn. The passive a3 or Be2 defends tamely and surrenders the initiative. Play the gambit: Bd3 is the move that makes the Milner-Barry dangerous.",
    shortNarration: 'Bd3 — offer the gambit pawn',
  },
  {
    // After the gambit ...Qxd4 — White must develop fast, not chase the pawn back.
    setup: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 cxd4 cxd4 Nxd4 Nxd4 Qxd4',
    wrongMove: 'Qa4+',
    correctMove: 'Nc3',
    explanation:
      "After Black grabs the gambit pawn with …Qxd4, the point is rapid development: Nc3! brings a piece out with tempo, eyeing d5 and b5, and prepares Qe2, Kh1, and the f-pawn storm. Chasing with Qa4+ to win the pawn back lets Black consolidate and defeats the gambit's purpose. Develop and attack — the lead in development IS the compensation, not the pawn.",
    shortNarration: 'Nc3 — develop fast, don’t chase the pawn',
  },
  {
    // After 5...Nh6 (instead of Qb6) — the recapture timing. Bxf5 vs allowing it.
    setup: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Nh6 Bd3 cxd4 cxd4 Nf5',
    wrongMove: 'O-O',
    correctMove: 'Bxf5',
    explanation:
      "When Black reroutes the knight to f5 attacking d4, the principled move is Bxf5! — trading to saddle Black with a doubled, weak f5-pawn after …exf5. The casual O-O lets Black keep a strong knight on f5 blockading the position. Cash in the structural damage: Bxf5 gives White a permanent target on f5 and the better long-term game.",
    shortNarration: 'Bxf5 — double the f-pawns',
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
