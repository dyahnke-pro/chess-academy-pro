#!/usr/bin/env node
import fs from 'node:fs';
import { Chess } from 'chess.js';

const ID = 'pro-aman-reti';
const SRC = ['concept:pos-development', 'book:chess-fundamentals', 'https://www.chess.com/openings/Reti-Opening'];

const PITFALLS = [
  { setup: ['Nf3', 'd5', 'd4', 'Nf6', 'c4', 'e6', 'e3', 'Be7', 'Nc3', 'O-O', 'Bd3', 'b6'], wrong: 'e4', right: 'cxd5',
    explanation: "Lunging e4 here is premature — it opens lines before White is fully coordinated and gives Black …dxe4 with active piece play. The accurate move is cxd5: resolve the centre first, fix a target on d5, and keep the small, durable edge. The Réti rewards patience, not haste.",
    shortNarration: 'cxd5 first; e4 is premature.' },
  { setup: ['Nf3', 'g6', 'd4', 'Bg7', 'e4', 'd6', 'c3', 'Nf6', 'Bd3', 'O-O'], wrong: 'e5', right: 'O-O',
    explanation: "Pushing e5 before castling overextends the centre and walks into …dxe5 and …Nfd7 hitting it, with White's king still in the middle. Castle first with O-O, complete development, and only then think about expanding. Safety before space.",
    shortNarration: 'O-O first; e5 overextends.' },
  { setup: ['Nf3', 'Nf6', 'g3', 'g6', 'Bg2', 'Bg7', 'O-O', 'O-O', 'd3', 'd6', 'Nbd2', 'Nbd7'], wrong: 'c4', right: 'e4',
    explanation: "c4 is a reasonable move but it commits to a slow English-style game; the thematic King's-Indian-Attack break is e4, seizing the centre now that everything is developed behind it. e4 is the move the whole fianchetto setup was building toward.",
    shortNarration: 'e4 — the thematic KIA break.' },
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
console.log(`common-mistakes: wrote ${entries.length} Réti pitfalls (FENs verified)`);
