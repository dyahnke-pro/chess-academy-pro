#!/usr/bin/env node
import fs from 'node:fs';
import { Chess } from 'chess.js';

const ID = 'pro-aman-ruy-lopez';
const SRC = ['concept:pos-development', 'book:ruy-lopez', 'https://www.chess.com/openings/Ruy-Lopez-Opening'];

const PITFALLS = [
  { setup: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'], wrong: 'Bxc6', right: 'Ba4',
    explanation: "Capturing …Bxc6 this early (the Exchange) hands Black the bishop pair and a solid structure for free, throwing away the Ruy's whole long-term pressure. Retreat Ba4 instead: keep the bishop, keep the pin-pressure on the e5-defender, and play for the slow squeeze.",
    shortNarration: 'Ba4 — keep the bishop’s pressure.' },
  { setup: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'O-O'], wrong: 'd4', right: 'h3',
    explanation: "Rushing d4 before h3 walks into …Bg4 pinning the f3-knight, and the pressure on d4 becomes awkward. Play h3 first — it stops the pin and makes luft — and only then build the centre with c3 and d4. The Closed Ruy is about preparation, not haste.",
    shortNarration: 'h3 first — stop …Bg4.' },
  { setup: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6'], wrong: 'Nxe5', right: 'd3',
    explanation: "Grabbing Nxe5 looks like a free pawn, but Black hits back with …Qe7 or …Nxe5 and regains it with fully active pieces — the pawn-snatch only helps Black develop. The clean modern choice is d3: sidestep the heavy Berlin theory, keep the queens on, and squeeze slowly with a sound structure.",
    shortNarration: 'd3 — squeeze, don’t grab e5.' },
];

const entries = PITFALLS.map((p) => {
  const c = new Chess();
  for (const m of p.setup) c.move(m);
  const fen = c.fen();
  new Chess(fen).move(p.wrong); new Chess(fen).move(p.right);
  return { fen, wrongMove: p.wrong, correctMove: p.right, explanation: p.explanation, shortNarration: p.shortNarration, sources: SRC };
});

const path = 'src/data/common-mistakes.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
data[ID] = entries;
fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log(`common-mistakes: wrote ${entries.length} Ruy pitfalls (FENs verified)`);
