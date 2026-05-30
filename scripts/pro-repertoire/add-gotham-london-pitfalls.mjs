#!/usr/bin/env node
// Pitfalls for the GothamChess London (pro-gothamchess-london). Student=WHITE.
// Canonical London teaching mistakes (the …Qb6 response, the c7-raid, the bishop
// retreat, the KID storm). wrongMove = slip, correctMove = principled reply.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/common-mistakes.json';
const KEY = 'pro-gothamchess-london';
const SRC = [
  'book:chess-strategy',
  'https://www.chess.com/openings/London-System',
  'https://en.wikipedia.org/wiki/London_System',
];

const PITFALLS = [
  {
    // After 1.d4 d5 2.Bf4 c5 3.e3 Qb6 — Black hits b2. Passive b3 vs developing.
    setup: 'd4 d5 Bf4 c5 e3 Qb6',
    wrongMove: 'b3',
    correctMove: 'Nc3',
    explanation:
      "When Black hits b2 with …Qb6, the passive b3 weakens the queenside and blunts White's own play. The principled answer is Nc3! — developing and offering the b2-pawn as a gambit: after …Qxb2 Nb5! traps the queen ideas and gives White a huge lead in development. Don't cower with b3; develop and let Black grab the poison if he dares.",
    shortNarration: 'Nc3 — develop, offer the b-pawn',
  },
  {
    // After 1.d4 d5 2.Bf4 Nf6 3.Nc3 (Jobava) ...e6 — White to move, the raid choice.
    setup: 'd4 d5 Bf4 Nf6 Nc3 e6',
    wrongMove: 'Nf3',
    correctMove: 'Nb5',
    explanation:
      "In the Jobava London, the point is the Nb5! raid — hitting the weak c7-square and provoking concessions like …Na6 and an awkward king move. The routine Nf3 throws away the whole idea and transposes to a tame position. When Black plays …e6 in the Jobava, jump the knight into b5 and harass: that's what makes this London hybrid dangerous.",
    shortNarration: 'Nb5 — the c7-raid, not quiet Nf3',
  },
  {
    // After 1.d4 d5 2.Bf4 Nf6 — White to move. The e4 center blunder vs e3.
    setup: 'd4 d5 Bf4 Nf6',
    wrongMove: 'e4',
    correctMove: 'e3',
    explanation:
      "It's tempting to grab the centre with e4, but here it simply drops a pawn: …dxe4 and White has no easy way to regain it. The whole point of the London is the modest e3 — supporting the d4-pawn and the Bf4, building the solid pyramid behind which White develops harmoniously. Resist the e4 lunge; the London is a system of small, solid moves, not a centre grab.",
    shortNarration: 'e3 — the solid London pyramid',
  },
  {
    // After 1.d4 d5 2.Bf4 Nf6 3.e3 g6 4.Nc3 Bg7 5.h4 — the KID storm. Continue or chicken out.
    setup: 'd4 d5 Bf4 Nf6 e3 g6 Nc3 Bg7',
    wrongMove: 'Nf3',
    correctMove: 'h4',
    explanation:
      "Against the …g6 fianchetto, the most testing try is h4! — launching the opposite-side-castling storm before Black is ready. The routine Nf3 commits to a quiet game and lets Black equalise comfortably with …O-O and …c5. When Black fianchettoes, consider the h4-h5 pawn storm: it's the London's most dangerous weapon against the King's Indian setup.",
    shortNarration: 'h4 — launch the KID storm',
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
