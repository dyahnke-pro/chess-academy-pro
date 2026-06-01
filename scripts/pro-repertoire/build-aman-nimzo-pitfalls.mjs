#!/usr/bin/env node
import fs from 'node:fs';
import { Chess } from 'chess.js';

const ID = 'pro-aman-nimzo-indian';
const SRC = ['concept:pos-development', 'book:chess-fundamentals', 'https://www.chess.com/openings/Nimzo-Indian-Defense'];

const PITFALLS = [
  { setup: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'O-O', 'Bd3', 'd5', 'Nf3'], wrong: 'Nbd7', right: 'dxc4',
    explanation: "A routine …Nbd7 lets White play cxd5 and untangle comfortably with the tension resolved in his favour. The accurate move is …dxc4 — capture FIRST, dragging the bishop to c4 with tempo, and only then strike with …c5. Timing the capture is what gives the Nimzo its bite.",
    shortNarration: '…dxc4 first, then …c5.' },
  { setup: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Qc2'], wrong: 'Bxc3+', right: 'O-O',
    explanation: "Trading …Bxc3+ immediately is exactly what the Qc2 move was designed for: White recaptures with the queen, suffers NO doubled pawns, and keeps the bishop pair. Don't hand White the trade for free — castle first with …O-O, keep the pin, and trade only when it damages the pawns.",
    shortNarration: '…O-O first; keep the pin.' },
  { setup: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'Bb4+', 'Bd2'], wrong: 'Bxd2+', right: 'Be7',
    explanation: "In the Bogo, …Bxd2+ trades off your good bishop and helps White develop the queen or knight to d2 with a free tempo. Retreat …Be7 instead: White's bishop sits passively on d2 where it was provoked, and Black keeps a sound structure with the bishop pair.",
    shortNarration: '…Be7 — keep the bishop.' },
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
console.log(`common-mistakes: wrote ${entries.length} Nimzo pitfalls (FENs verified)`);
