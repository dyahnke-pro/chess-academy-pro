#!/usr/bin/env node
// Sicilian Kan pitfalls into common-mistakes.json. FENs computed from setups
// via chess.js (never hand-typed). Each entry's move-order point is board-true.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const ID = 'pro-aman-sicilian-kan';
const SRC = ['concept:pos-development', 'book:sicilian', 'https://www.chess.com/openings/Sicilian-Defense-Kan-Variation'];

const PITFALLS = [
  { setup: ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4'], wrong: 'Qc7', right: 'a6',
    explanation: "The move order matters: playing …Qc7 before …a6 invites Nb5, hitting the queen and clamping the d6-square. In the Kan you almost always slot in …a6 first to take b5 away from the white knights, and only then bring the queen to c7.",
    shortNarration: '…a6 first — stop Nb5.' },
  { setup: ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4', 'a6', 'Nc3', 'Qc7', 'Bd3', 'Nf6', 'O-O'], wrong: 'Bd6', right: 'd6',
    explanation: "…Bd6 looks active but it blocks the d-pawn and runs straight into White's f4-f5 plans, where the bishop becomes a target. The quiet …d6 is right: it builds the small Scheveningen shell, clamps the e5-square, and keeps the bishop's options open for …Be7 or …b5 and …Bb7.",
    shortNarration: '…d6 shell, not …Bd6.' },
  { setup: ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4', 'Nc6', 'Nc3', 'Qc7', 'Be3', 'a6', 'Be2', 'Nf6', 'O-O'], wrong: 'd5', right: 'Bb4',
    explanation: "Striking …d5 too early lets White open the centre with exd5 while Black is still uncastled and behind in development. Play the active …Bb4 first — it pins the c3-knight, keeps the pressure on e4, and saves the …d5 break for when Black is fully ready.",
    shortNarration: '…Bb4 first, …d5 is premature.' },
];

const entries = PITFALLS.map((p) => {
  const c = new Chess();
  for (const m of p.setup) c.move(m);
  const fen = c.fen();
  new Chess(fen).move(p.wrong); // throws if illegal
  new Chess(fen).move(p.right); // throws if illegal
  return { fen, wrongMove: p.wrong, correctMove: p.right, explanation: p.explanation, shortNarration: p.shortNarration, sources: SRC };
});

const path = 'src/data/common-mistakes.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
data[ID] = entries;
fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log(`common-mistakes: wrote ${entries.length} Kan pitfalls (FENs verified)`);
