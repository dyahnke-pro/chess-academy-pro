#!/usr/bin/env node
import fs from 'node:fs';
import { Chess } from 'chess.js';

const ID = 'pro-aman-rossolimo';
const SRC = ['concept:pos-development', 'book:sicilian-rossolimo', 'https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation'];

const PITFALLS = [
  { setup: ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5', 'g6'], wrong: 'Ba4', right: 'Bxc6',
    explanation: "Keeping the bishop with Ba4 here misses the whole point: against the …g6 fianchetto, Bxc6 is right — it doubles Black's pawns and damages the structure behind the Dragon bishop. The structural gain is worth the bishop pair. Trade now, then clamp the centre.",
    shortNarration: 'Bxc6 — take the doubled pawns.' },
  { setup: ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5', 'g6', 'Bxc6', 'bxc6', 'O-O', 'Bg7', 'Re1', 'Nf6'], wrong: 'd3', right: 'e5',
    explanation: "A passive d3 lets Black untangle with …d6 and …O-O, and the doubled pawns stop hurting. The thematic e5 is the move: gain space, kick the knight, and use the pawn majority to cramp Black and blunt the g7-bishop. Push, don't sit.",
    shortNarration: 'e5 — clamp, don’t sit on d3.' },
  { setup: ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5', 'e6', 'O-O', 'Nge7', 'Re1', 'a6'], wrong: 'Bxc6', right: 'Bf1',
    explanation: "Against the …e6 setup, trading …Bxc6 here just helps Black — the doubled pawns aren't weak with the bishop still home, and Black gets the bishop pair for free. Retreat Bf1 instead: keep the bishop pair and reroute it to a better diagonal. The Rossolimo Bxc6 trade is for the …g6 lines, not this one.",
    shortNarration: 'Bf1 — keep the bishop here.' },
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
console.log(`common-mistakes: wrote ${entries.length} Rossolimo pitfalls (FENs verified)`);
