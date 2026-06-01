#!/usr/bin/env node
import fs from 'node:fs';
import { Chess } from 'chess.js';

const ID = 'pro-aman-anti-caro';
const SRC = ['concept:pos-development', 'book:caro-kann', 'https://www.chess.com/openings/Caro-Kann-Defense-Two-Knights-Attack'];

const PITFALLS = [
  { setup: ['e4', 'c6', 'Nc3', 'd5', 'Nf3', 'Bg4'], wrong: 'Be2', right: 'h3',
    explanation: "Passively allowing the pin with Be2 lets Black keep the …Bg4 bishop comfortably. Play h3 first — question the bishop immediately. After …Bxf3 you recapture with the queen and pocket the bishop pair; if Black retreats, you've gained a free tempo. Always put the question.",
    shortNarration: 'h3 — question the bishop.' },
  { setup: ['e4', 'c6', 'Nc3', 'd5', 'Nf3', 'dxe4', 'Nxe4', 'Nf6'], wrong: 'Nxf6+', right: 'Qe2',
    explanation: "Trading Nxf6+ helps Black develop — after …exf6 or …gxf6 Black solves all problems. The accurate Qe2 keeps the tension and the initiative: the centralised knight stays, and White retains the more active, flexible position. Don't release the pressure for free.",
    shortNarration: 'Qe2 — keep the tension.' },
  { setup: ['e4', 'c6', 'Nc3', 'd5', 'Nf3', 'Bg4', 'h3', 'Bxf3', 'Qxf3', 'e6', 'd4', 'dxe4'], wrong: 'Qxf7+', right: 'Qxe4',
    explanation: "The flashy Qxf7+ is a blunder — after …Kxf7 White has simply given away the queen for a pawn. Recapture calmly with Qxe4, centralising on a strong square with the bishop pair and a comfortable edge. The Two Knights wins by quiet quality, not desperate sacrifices.",
    shortNarration: 'Qxe4 — centralise, don’t blunder.' },
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
console.log(`common-mistakes: wrote ${entries.length} Anti-Caro pitfalls (FENs verified)`);
