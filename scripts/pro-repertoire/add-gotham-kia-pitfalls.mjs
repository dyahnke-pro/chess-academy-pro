#!/usr/bin/env node
// Pitfalls for the GothamChess King's Indian Attack. Student = WHITE.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/common-mistakes.json';
const KEY = 'pro-gothamchess-kia';
const SRC = [
  'book:chess-strategy',
  'https://www.chess.com/openings/Kings-Indian-Attack',
  'https://en.wikipedia.org/wiki/King%27s_Indian_Attack',
];

const PITFALLS = [
  {
    // After the KIA setup vs ...d5/...e6, White to move: e4 (the thematic break) vs slow.
    setup: 'Nf3 d5 g3 c5 Bg2 Nc6 O-O e6 d3 Nf6 Nbd2 Be7',
    wrongMove: 'c3',
    correctMove: 'e4',
    explanation:
      "The whole point of the King's Indian Attack is the e4 break! — striking the centre and preparing the e5 wedge and the kingside attack. The passive c3 drifts without a plan and lets Black seize the initiative with …d4 or queenside expansion. When your pieces are set (Nf3, g3, Bg2, d3, Nbd2), play e4 and follow with e5 and the Nf1-h2-g4 reroute. The KIA is an attacking system — commit to e4.",
    shortNarration: 'e4 — the KIA central break',
  },
  {
    // After 1.Nf3 d5 2.g3 — the KIA. Bg2 (fianchetto) vs the wrong.
    setup: 'Nf3 d5 g3 c5 Bg2 Nc6 O-O e6 d3 Nf6 Nbd2 Be7 e4 O-O Re1 b5',
    wrongMove: 'a4',
    correctMove: 'e5',
    explanation:
      "When Black expands with …b5 against the KIA, the key is e5! — grabbing the kingside space wedge that defines the King's Indian Attack and starting the attack. Reacting on the queenside with a4 plays into Black's hands, where he is faster. Ignore the queenside and play on YOUR side: e5 cramps Black, the knight reroutes Nf1-h2-g4, and White's attack on the king outruns Black's counterplay.",
    shortNarration: 'e5 — grab kingside space, attack',
  },
  {
    // After 1.Nf3 (KIA) ...c5 2.g3 Nc6 3.Bg2 g6 — vs the Sicilian g6. d3 (KIA) vs d4.
    setup: 'Nf3 c5 g3 Nc6 Bg2 g6 O-O Bg7',
    wrongMove: 'd4',
    correctMove: 'd3',
    explanation:
      "Against the …c5/…g6 Sicilian setup, the KIA way is the modest d3! — keeping the centre closed for the slow kingside attack with e4, Re1, and Nf1-h2-g4. Lunging d4 opens the centre and transposes into an Open-Sicilian-like position where Black is comfortable. Stay true to the King's Indian Attack: play d3, build the kingside, and attack the king behind the closed centre.",
    shortNarration: 'd3 — keep it closed for the KIA',
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
