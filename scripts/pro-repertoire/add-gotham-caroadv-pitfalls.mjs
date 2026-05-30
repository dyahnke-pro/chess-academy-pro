#!/usr/bin/env node
// Pitfalls for the GothamChess Caro Advance (White). Student = WHITE.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/common-mistakes.json';
const KEY = 'pro-gothamchess-caro-advance-white';
const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Caro-Kann-Defense-Advance-Variation',
  'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence',
];

const PITFALLS = [
  {
    // After 1.e4 c6 2.d4 d5 3.e5 Bf5 — the Advance. h4 vs the slow Nf3.
    setup: 'e4 c6 d4 d5 e5 Bf5',
    wrongMove: 'Nf3',
    correctMove: 'h4',
    explanation:
      "Against …Bf5, his signature is the aggressive h4! — gaining kingside space and threatening h5 to harass the bishop. The routine Nf3 allows Black the comfortable …e6 and …Ne7 setup with an easy game. The h4-thrust is what makes the modern Advance dangerous: it grabs space, restricts the light bishop, and sets up the Bg5 pin. Play h4 and seize the initiative.",
    shortNarration: 'h4 — grab space, harass the bishop',
  },
  {
    // After 3.e5 Bf5 4.h4 h6 — Black questions. g4 (space) vs passive.
    setup: 'e4 c6 d4 d5 e5 Bf5 h4 h6',
    wrongMove: 'Nf3',
    correctMove: 'g4',
    explanation:
      "When Black plays …h6 to prevent Bg5, the maximalist g4! grabs huge kingside space and chases the f5-bishop. The timid Nf3 gives up the chance to bind Black. After g4, the bishop must retreat passively, and White follows with c4 and h5 to dominate both wings. Against …h6, the g4 space-grab is the most testing — don't shy away from it.",
    shortNarration: 'g4 — grab space, chase the bishop',
  },
  {
    // After 3.e5 c5 — the …c5 break. dxc5 vs passive c3.
    setup: 'e4 c6 d4 d5 e5 c5',
    wrongMove: 'c3',
    correctMove: 'dxc5',
    explanation:
      "Against the …c5 break, the ambitious dxc5! grabs the pawn and forces Black to spend time regaining it, giving White a lead in development and the e5-wedge. The passive c3 just defends d4 and lets Black equalise with a comfortable French-style structure. Take the pawn with dxc5 and develop quickly — the extra tempo and the cramping e5-pawn are the point.",
    shortNarration: 'dxc5 — grab the pawn, develop fast',
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
