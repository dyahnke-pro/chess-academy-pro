#!/usr/bin/env node
// Pitfalls for the GothamChess Ponziani (pro-gothamchess-ponziani). White.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/common-mistakes.json';
const KEY = 'pro-gothamchess-ponziani';
const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Ponziani-Opening',
  'https://en.wikipedia.org/wiki/Ponziani_Opening',
];

const PITFALLS = [
  {
    // After 1.e4 e5 2.Nf3 Nc6 3.c3 — White to move next is ...Nf6 then 4.d4. The d4 commitment.
    setup: 'e4 e5 Nf3 Nc6 c3 Nf6',
    wrongMove: 'd3',
    correctMove: 'd4',
    explanation:
      "The whole idea of 3.c3 is to support d4! — striking the centre immediately. The timid d3 wastes the c3-move and leaves White with a passive Italian-like position a tempo down. After 4.d4 exd4 5.e5, White chases the f6-knight and grabs the centre. Commit to d4: that's the Ponziani's reason for being.",
    shortNarration: 'd4 — the central strike c3 prepared',
  },
  {
    // After 3.c3 d5 — the critical counter. White must play the pin, not the passive.
    setup: 'e4 e5 Nf3 Nc6 c3 d5',
    wrongMove: 'exd5',
    correctMove: 'Qa4',
    explanation:
      "Against the principled 3…d5, the routine exd5 Qxd5 just gives Black an easy game with the centralised queen. The critical try is Qa4! — pinning the c6-knight to the e5-pawn, the move that fights for an advantage. After …f6 or …Bd7, White follows with Bb5 and d4 to exploit the pin. Don't trade tamely; the Qa4 pin is the Ponziani's main weapon against …d5.",
    shortNarration: 'Qa4 — pin the knight, fight for an edge',
  },
  {
    // After 3.c3 Nf6 4.d4 exd4 — White to move. The recapture-timing choice.
    setup: 'e4 e5 Nf3 Nc6 c3 Nf6 d4 exd4',
    wrongMove: 'cxd4',
    correctMove: 'e5',
    explanation:
      "Here White has just played e5, chasing the f6-knight before recapturing on d4. The move order matters: by inserting e5 first, White gains a tempo on the knight and keeps the option of Qb3 hitting the loose d5-knight. Rushing cxd4 immediately lets Black equalise. Chase with e5, provoke …Nd5, then Qb3 — the tempo-gaining sequence is the point.",
    shortNarration: 'e5 — chase the knight before recapturing',
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
