#!/usr/bin/env node
import fs from 'node:fs';
import { Chess } from 'chess.js';

const ID = 'pro-aman-open-sicilian';
const SRC = ['concept:pos-development', 'book:sicilian', 'https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation'];

const PITFALLS = [
  { setup: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'], wrong: 'Nf5', right: 'Be2',
    explanation: "Hopping Nf5 looks aggressive but the knight is simply chased back by …e6 or …g6 with tempo, and White falls behind in development. The solid Be2 is the move — castle fast, keep a healthy position, and play for the d5-square. Don't chase shadows; develop.",
    shortNarration: 'Be2 — develop, not Nf5.' },
  { setup: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be2', 'e5'], wrong: 'Nf3', right: 'Nb3',
    explanation: "Retreating Nf3 blocks the f-pawn and bumps into …e4 ideas later, and the knight does nothing useful. Nb3 is correct: the knight stays active, eyes c5 and a5, and — crucially — White's whole plan now targets the d5-hole that …e5 created.",
    shortNarration: 'Nb3 — keep the knight active.' },
  { setup: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'Nc6', 'Bg5', 'e6', 'Qd2', 'a6'], wrong: 'f4', right: 'O-O-O',
    explanation: "Lashing out with f4 before castling leaves White's king in the centre just as the position opens — a recipe for disaster against the Sicilian. Castle queenside first with O-O-O: connect the rooks, get the king safe, and only then launch the kingside pawn storm.",
    shortNarration: 'O-O-O first; then attack.' },
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
console.log(`common-mistakes: wrote ${entries.length} Open Sicilian pitfalls (FENs verified)`);
