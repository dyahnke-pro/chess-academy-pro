#!/usr/bin/env node
// Pitfalls for the GothamChess Vienna (pro-gothamchess-vienna). Student = WHITE.
// wrongMove = natural-looking slip, correctMove = principled reply. Canonical
// Vienna Gambit teaching mistakes (wrong recapture, missing the gambit, etc.).
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/common-mistakes.json';
const KEY = 'pro-gothamchess-vienna';
const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Vienna-Game',
  'https://en.wikipedia.org/wiki/Vienna_Game',
];

const PITFALLS = [
  {
    // After 1.e4 e5 2.Nc3 Nf6 — the Vienna Gambit moment. f4 vs slow Bc4.
    setup: 'e4 e5 Nc3 Nf6',
    wrongMove: 'g3',
    correctMove: 'f4',
    explanation:
      "The whole point of the Vienna against …Nf6 is the gambit f4! — striking at the e5-pawn and opening the f-file for a kingside attack. The quiet g3 fianchetto is playable but throws away the Vienna's sting and lets Black equalise easily. When Black allows it, play the gambit: f4 is the move that makes the Vienna dangerous.",
    shortNarration: 'f4 — the Vienna Gambit punch',
  },
  {
    // After 1.e4 e5 2.Nc3 Nf6 3.f4 d5 — the key recapture. fxe5 vs exd5.
    setup: 'e4 e5 Nc3 Nf6 f4 d5',
    wrongMove: 'exd5',
    correctMove: 'fxe5',
    explanation:
      "After the central clash with …d5, the principled capture is fxe5! — hitting the f6-knight and keeping the f-file open for the attack. The natural-looking exd5 instead opens the centre for Black's pieces and surrenders the whole point of the gambit. Take toward the centre with the f-pawn, chase the knight, and keep the initiative.",
    shortNarration: 'fxe5 — chase the knight, keep the f-file',
  },
  {
    // After 1.e4 e5 2.Nc3 Nf6 3.f4 d5 4.fxe5 Nxe4 5.Qf3 — the key move. Qf3 vs Nxe4.
    setup: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4',
    wrongMove: 'Nxe4',
    correctMove: 'Qf3',
    explanation:
      "When Black grabs on e4, the strong move is Qf3! — double-attacking the e4-knight and the f7-square, forcing favourable simplification. Recapturing immediately with Nxe4 lets Black play …dxe4 hitting nothing and equalising the structure. The Qf3 zwischenzug is the engine-approved heart of the Vienna Gambit main line — pressure first, recapture later.",
    shortNarration: 'Qf3 — double-attack e4 and f7',
  },
  {
    // After the gambit accepted 3...exf4 — the right follow-up. e5 vs Nf3.
    setup: 'e4 e5 Nc3 Nf6 f4 exf4',
    wrongMove: 'Bc4',
    correctMove: 'e5',
    explanation:
      "When Black accepts the gambit with …exf4, the most testing reply is e5! — kicking the f6-knight back to g8 and grabbing a big space advantage while Black is undeveloped. The quiet Bc4 lets Black consolidate the extra pawn with …d5. Stake the centre at once: e5 cramps Black and gives White the lead in development that justifies the gambit.",
    shortNarration: 'e5 — kick the knight, grab space',
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
