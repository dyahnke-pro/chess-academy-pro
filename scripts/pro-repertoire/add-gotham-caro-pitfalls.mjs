#!/usr/bin/env node
// Pitfalls (common mistakes) for the GothamChess Caro (pro-gothamchess-caro-kann).
// Classic, well-known Caro errors the student must avoid — each is a real,
// chess.js-legal position where wrongMove is the natural-looking slip and
// correctMove is the principled reply. explanation = full Watch prose;
// shortNarration = ≤8-word Learn cue. Sources recorded for verification.
// These are the canonical teaching mistakes (the …e6-too-early bishop trap,
// the premature …Bg4 vs Réti, grabbing on b2, etc.) — the IDEAS are
// mainstream Caro understanding; the LEGALITY is gated here.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/common-mistakes.json';
const KEY = 'pro-gothamchess-caro-kann';
const SRC = [
  'book:caro-kann',
  'https://www.chess.com/openings/Caro-Kann-Defense',
  'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence',
];

// Each: setup = SAN line to reach the position BEFORE the mistake; wrongMove +
// correctMove are both legal from that position (Black to move — the student).
const PITFALLS = [
  {
    setup: 'e4 c6 d4 d5 e5',
    wrongMove: 'e6',
    correctMove: 'Bf5',
    explanation:
      "This is the cardinal Caro-Kann error and the very thing the opening exists to avoid. Playing …e6 here buries the light-squared bishop behind its own pawn chain — turning the Caro into a bad French. The whole point of 1…c6 (instead of 1…e6) is that the bishop comes OUT to f5 or g4 FIRST, and only then does …e6 support the centre. Develop the bishop, then close the centre.",
    shortNarration: 'Bf5 first — never bury the bishop',
  },
  {
    // Position after 9.O-O, Black to move (the …Bg4 trade is the mistake).
    setup: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 Nd7 O-O',
    wrongMove: 'Bg4',
    correctMove: 'Ne7',
    explanation:
      "Dropping the bishop back to g4 to trade it for the f3-knight throws away Black's best piece. In the Advance, the light-squared bishop — already developed outside the chain on f5 — is the pride of the whole Caro setup. Trading it concedes the bishop pair and leaves Black passive on the light squares. Instead, complete the plan: …Ne7 (heading for g6 or f5) keeps every piece working. Treasure that bishop; don't volunteer it.",
    shortNarration: 'Keep the bishop — play Ne7',
  },
  {
    // Position after 3.Nc3, Black to move (the …d4 lunge is the mistake here).
    setup: 'e4 c6 Nf3 d5 Nc3',
    wrongMove: 'd4',
    correctMove: 'Bg4',
    explanation:
      "Lunging with …d4 to kick the c3-knight throws away Black's central tension far too early. The pawn on d4 becomes overextended — White rerouts with Ne2 and later c3 to undermine it, and Black has nothing behind it. Against the Réti/KIA move-order, the right plan is to finish development: …Bg4 pins the f3-knight, then …e6 and …Nbd7 build the solid Caro structure. Don't chase pieces with pawns before you're developed.",
    shortNarration: 'Develop with Bg4 — don’t lunge d4',
  },
  {
    // Position after 4.Nxe4, Black to move (…Nf6 vs …Bf5 choice).
    setup: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4',
    wrongMove: 'Nf6',
    correctMove: 'Bf5',
    explanation:
      "Playing …Nf6 immediately invites Nxf6+, and after …exf6 (or …gxf6) Black accepts a damaged pawn structure with no compensation prepared. In the Classical, move-order matters: …Bf5 FIRST develops the bishop outside the chain, hits the e4-knight, and only THEN does Black sort out the knights. The …Nf6 / doubled-f-pawn structure can be a deliberate weapon (a wall that controls e5), but as a reflex it just concedes structure — …Bf5 is the cleaner, more flexible route.",
    shortNarration: 'Bf5 first — hit the knight, develop',
  },
];

const data = JSON.parse(fs.readFileSync(PATH, 'utf8'));
let failed = 0;
const entries = [];

for (const p of PITFALLS) {
  const c = new Chess();
  let ok = true;
  for (const san of p.setup.trim().split(/\s+/)) {
    try { c.move(san); } catch { console.error(`SETUP ILLEGAL: ${san} in "${p.setup}"`); ok = false; break; }
  }
  if (!ok) { failed++; continue; }
  const fen = c.fen();
  // both moves must be legal from the position
  for (const mv of [p.wrongMove, p.correctMove]) {
    const probe = new Chess(fen);
    try { probe.move(mv); } catch { console.error(`MOVE ILLEGAL: ${mv} @ ${fen}`); failed++; ok = false; }
  }
  if (!ok) continue;
  // shortNarration ≤8 words
  const words = p.shortNarration.replace(/[—–-]/g, ' ').split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length;
  if (words > 8) { console.error(`CUE too long (${words}w): ${p.shortNarration}`); failed++; continue; }
  entries.push({ fen, wrongMove: p.wrongMove, correctMove: p.correctMove, explanation: p.explanation, shortNarration: p.shortNarration, sources: SRC });
}

if (failed > 0) { console.error(`\n${failed} pitfall(s) failed — NOT writing.`); process.exit(1); }
data[KEY] = entries;
fs.writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`wrote ${entries.length} pitfalls under "${KEY}".`);
