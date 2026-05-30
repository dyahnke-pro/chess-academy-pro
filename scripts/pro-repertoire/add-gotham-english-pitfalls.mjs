#!/usr/bin/env node
// Pitfalls (common mistakes) for the GothamChess English (pro-gothamchess-english).
// Student = WHITE. wrongMove = natural-looking slip, correctMove = principled
// reply. explanation = full Watch prose; shortNarration = ≤8-word Learn cue.
// Canonical English teaching mistakes (wrong recapture, missing d4/g4, etc.).
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/common-mistakes.json';
const KEY = 'pro-gothamchess-english';
const SRC = [
  'book:chess-strategy',
  'https://www.chess.com/openings/English-Opening',
  'https://en.wikipedia.org/wiki/English_Opening',
];

const PITFALLS = [
  {
    // After 1.c4 e5 2.Nc3 Nf6 3.Nf3?! — allowing ...e4. The slip vs the right move order.
    setup: 'c4 e5 Nc3 Nf6',
    wrongMove: 'Nf3',
    correctMove: 'g3',
    explanation:
      "In the Reversed Sicilian, 3.Nf3 invites …e4! kicking the knight and handing Black easy space — a reversed-Sicilian tempo trick. The cleaner move is g3, preparing Bg2 to fianchetto and hit the e5-pawn and the long diagonal first. Develop the kingside bishop before the knight commits, and Black never gets the …e4 lunge for free. Move order matters in the English.",
    shortNarration: 'g3 — fianchetto first, avoid …e4',
  },
  {
    // After 1.c4 c5 2.Nc3 Nc6 3.Nf3 g6 — choosing the passive plan. d4 vs slow.
    setup: 'c4 c5 Nc3 Nc6 Nf3 g6',
    wrongMove: 'e4',
    correctMove: 'd4',
    explanation:
      "Against the Symmetric …c5, the timid e4 lets Black equalise comfortably with a normal setup. The principled strike is d4! — challenging the centre at once. After …cxd4 Nxd4, White reaches a Maroczy-style bind with the c4-pawn clamping d5 and a clear space edge. Don't drift in the Symmetric; the d4 break is what gives White the pull.",
    shortNarration: 'd4 — strike for the Maroczy bind',
  },
  {
    // After 1.c4 e6 2.Nc3 d5 3.e3 Nf6 4.Nf3 ... Black plays ...f5; White must not be passive.
    setup: 'c4 e6 Nc3 d5 e3 f5',
    wrongMove: 'd4',
    correctMove: 'g4',
    explanation:
      "When Black sets up the Stonewall with …f5, the routine d4 lets Black get the structure he wants — a solid, blocked position. The aggressive answer is g4! — striking at the f5-pawn before Black is ready. It rips open the kingside, exposes Black's weakened light squares, and gives White a dangerous initiative. Against the Stonewall, undermine the f5-pawn, don't play into the block.",
    shortNarration: 'g4 — bust the Stonewall',
  },
  {
    // After 1.c4 g6 2.Nc3 Bg7 3.d4 d6 4.e4 Nd7 5.f4 e5 — recapture choice. fxe5 vs others.
    setup: 'c4 g6 Nc3 Bg7 d4 d6 e4 Nd7 f4 e5',
    wrongMove: 'fxe5',
    correctMove: 'Nf3',
    explanation:
      "In the Botvinnik System, the immediate fxe5 dxe5 d5 is one valid path, but the cleaner Botvinnik handling is Nf3 first — developing, defending d4, and keeping the central tension on White's terms. Premature captures release the tension before White is fully developed. Build the c4/d4/e4/f4 wall, get the pieces out, and only then resolve the centre and storm. Patience powers the avalanche.",
    shortNarration: 'Nf3 — develop before resolving the centre',
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
