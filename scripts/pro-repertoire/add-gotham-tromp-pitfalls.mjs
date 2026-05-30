#!/usr/bin/env node
// Pitfalls (common mistakes) for the GothamChess Trompowsky
// (pro-gothamchess-trompowsky). Student = WHITE. Each is a real chess.js-legal
// position where wrongMove is the natural-looking slip and correctMove the
// principled reply. explanation = full Watch prose; shortNarration = ≤8-word
// Learn cue. These are canonical Trompowsky teaching mistakes (mishandling the
// …Ne4 hit, the wrong recapture, missing the b2-gambit idea).
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/common-mistakes.json';
const KEY = 'pro-gothamchess-trompowsky';
const SRC = [
  'book:queens-gambit',
  'https://www.chess.com/openings/Trompowsky-Attack',
  'https://en.wikipedia.org/wiki/Trompowsky_Attack',
];

const PITFALLS = [
  {
    // After 2...Ne4, White to move. Retreating the bishop is the slip.
    setup: 'd4 Nf6 Bg5 Ne4',
    wrongMove: 'Bh4',
    correctMove: 'h4',
    explanation:
      "When Black hits the bishop with …Ne4, the timid Bh4 lets Black off the hook — after …g5 the bishop is awkward and Black equalises comfortably. The principled Trompowsky answer is the aggressive h4! — supporting the bishop on g5 AND opening the rook's file for an attack. If Black grabs with …Nxg5, hxg5 opens the h-file straight at the king. Meet the knight hit with a punch, not a retreat.",
    shortNarration: 'h4 — support the bishop, attack',
  },
  {
    // After 2...d5, White to move. Taking on f6 too early is the slip.
    setup: 'd4 Nf6 Bg5 d5',
    wrongMove: 'Bxf6',
    correctMove: 'e3',
    explanation:
      "Trading on f6 immediately against …d5 is premature — after …exf6 (or …gxf6) Black gets the bishop pair and a solid centre for free, and White has given up the tension with nothing to show for it. The patient e3 keeps options open: build with c3 and Nd2, pressure the queenside with Qb3, and only take on f6 when it damages Black's structure. Don't trade your good bishop without a reason.",
    shortNarration: 'e3 — keep the tension, don’t trade early',
  },
  {
    // After 2...c5 3.d5 Qb6, White to move. Defending b2 passively is the slip.
    setup: 'd4 Nf6 Bg5 c5 d5 Qb6',
    wrongMove: 'b3',
    correctMove: 'Nc3',
    explanation:
      "When Black plays …Qb6 hitting b2, the passive b3 wastes a tempo and blunts White's own queenside. The Trompowsky idea is to GAMBIT the b2-pawn: Nc3 develops, and after …Qxb2 White gets a huge lead in development with Bd2, e4, and f4 building a big centre while the black queen gets chased around. The pawn is a small price for a raging initiative. Develop and let Black grab the poison.",
    shortNarration: 'Nc3 — gambit b2, develop fast',
  },
  {
    // After 2...g6 3.Bxf6 exf6, White to move. The wrong structural choice.
    setup: 'd4 Nf6 Bg5 g6 Bxf6 exf6',
    wrongMove: 'e4',
    correctMove: 'c4',
    explanation:
      "After doubling Black's f-pawns with Bxf6 exf6, lunging e4 gives Black exactly the central break and piece play he wants — the doubled pawns become dynamic. The cleaner plan is c4, claiming queenside space and clamping the d5-square so Black's structure stays static. Combined with g3, Bg2, and Ne2, White presses the long-term weakness of the doubled f-pawns. Keep Black's structure frozen, don't help it become active.",
    shortNarration: 'c4 — clamp d5, keep pawns frozen',
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
