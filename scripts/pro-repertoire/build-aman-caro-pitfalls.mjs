#!/usr/bin/env node
import fs from 'node:fs';
import { Chess } from 'chess.js';

const ID = 'pro-aman-caro-kann';
const SRC = ['concept:pos-development', 'book:chess-fundamentals', 'https://www.chess.com/openings/Caro-Kann-Defense'];

const PITFALLS = [
  { setup: ['e4', 'c6', 'd4', 'd5', 'e5'], wrong: 'e6', right: 'Bf5',
    explanation: "The cardinal Caro error: …e6 before …Bf5 locks the light-squared bishop inside the pawn chain — turning the Caro into a bad French and throwing away its whole point. Always play …Bf5 FIRST, getting the bishop OUTSIDE the chain, and only then …e6.",
    shortNarration: '…Bf5 first; …e6 traps the bishop.' },
  { setup: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nf3', 'e6', 'Be2', 'Nd7', 'O-O', 'Ne7', 'Nh4'], wrong: 'Be4', right: 'Bg6',
    explanation: "When White attacks the bishop with Nh4, …Be4 walks into f3 hitting the bishop and gaining time, and the bishop can get awkward. …Bg6 is the calm retreat — it keeps the good bishop on a safe diagonal where Nxg6 only opens the h-file for Black.",
    shortNarration: '…Bg6 — safe retreat, keep it.' },
  { setup: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nf3', 'e6', 'Be2', 'Nd7', 'O-O'], wrong: 'Bd6', right: 'Ne7',
    explanation: "…Bd6 looks natural but it bumps into White's e5-pawn and blocks the d-file the …c5 break wants to open. The knight reroute …Ne7-g6 is the plan — it pressures e5 and keeps the dark bishop free for a better square.",
    shortNarration: '…Ne7 reroute, not …Bd6.' },
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
console.log(`common-mistakes: wrote ${entries.length} Caro pitfalls (FENs verified)`);
