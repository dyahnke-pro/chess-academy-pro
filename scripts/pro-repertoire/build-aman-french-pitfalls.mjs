#!/usr/bin/env node
import fs from 'node:fs';
import { Chess } from 'chess.js';

const ID = 'pro-aman-french-white';
const SRC = ['concept:pos-development', 'book:french-defence', 'https://www.chess.com/openings/French-Defense'];

const PITFALLS = [
  { setup: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4', 'e5', 'c5'], wrong: 'dxc5', right: 'a3',
    explanation: "Grabbing dxc5 surrenders the proud d4-e5 pawn chain and lets Black equalise easily with …Nc6 and …Bxc5. The Winawer move is a3 — question the b4-bishop, force the …Bxc3 trade, and keep the big centre plus the bishop pair. Hold the chain, don't dissolve it.",
    shortNarration: 'a3 — keep the chain, not dxc5.' },
  { setup: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4', 'e5', 'c5', 'a3', 'Bxc3+', 'bxc3', 'Ne7', 'h4', 'Qc7'], wrong: 'Bd3', right: 'Nf3',
    explanation: "Bd3 looks natural but it leaves the e5-pawn hanging — Black snaps it off with …Qxe5 and the whole centre collapses. Nf3 first: defend the e5-pawn that anchors White's space and attack, and only then bring the other pieces out. The pawn chain is sacred in the Winawer.",
    shortNarration: 'Nf3 — defend e5 first.' },
  { setup: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6', 'Bg5', 'dxe4'], wrong: 'f3', right: 'Nxe4',
    explanation: "Trying to hold the pawn with f3 weakens the king and hands Black active play after …exf3. Just recapture Nxe4 — White keeps a healthy structure, a small space edge, and the Bg5 pin to press Black's kingside. Don't grovel for a pawn; take back cleanly and develop.",
    shortNarration: 'Nxe4 — recapture cleanly.' },
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
console.log(`common-mistakes: wrote ${entries.length} French pitfalls (FENs verified)`);
