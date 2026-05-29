#!/usr/bin/env node
// 4 Fantasy Caro pitfalls authored as common Black mistakes that lose
// the structural battle. Each FEN chess.js-legal, wrongMove/correctMove
// validated. Sources cite chess.com's Fantasy Caro page.

import { Chess } from 'chess.js';

const SRC = ['https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation', 'https://api.chess.com/pub/player/danielnaroditsky/games/archives'];

const PITFALLS = [
  // After 1.e4 c6 2.d4 d5 3.f3 — wrong move ...e5 (premature break)
  {
    setup: ['e4','c6','d4','d5','f3'],
    wrong: 'e5',
    correct: 'dxe4',
    explanation: "After 3.f3 the principled reply is ...dxe4 4.fxe4 e5 — Black trades pawns AND breaks centrally. The premature ...e5 (without taking on e4 first) lets White play 4.exd5 cxd5 5.dxe5 winning a clean pawn AND keeping a structural edge. Always trade on e4 before playing ...e5.",
    short: '...dxe4 first — then e5',
  },
  // After 1.e4 c6 2.d4 d5 3.f3 dxe4 4.fxe4 — wrong move ...Nf6 (premature development)
  {
    setup: ['e4','c6','d4','d5','f3','dxe4','fxe4'],
    wrong: 'Nf6',
    correct: 'e5',
    explanation: "After 4.fxe4 the correct break is ...e5 IMMEDIATELY to challenge White's strong central pawn duo. The natural ...Nf6 develops a piece but lets White play 5.e5! locking up the centre AND gaining a permanent space advantage. The Nf6-Nfd7 retreat then drops the bishop. Always play ...e5 first.",
    short: '...e5 immediate — not Nf6',
  },
  // After 1.e4 c6 2.d4 d5 3.f3 dxe4 4.fxe4 e5 5.Nf3 — wrong move ...Bg4 (premature pin)
  {
    setup: ['e4','c6','d4','d5','f3','dxe4','fxe4','e5','Nf3'],
    wrong: 'Bg4',
    correct: 'Bd6',
    explanation: "After 5.Nf3 the pin attempt ...Bg4 is premature — White plays 6.dxe5 trading AND if 6...Bxf3 7.Qxf3 Qxd1+ 8.Kxd1 Black has given up the bishop pair for nothing. The correct move is ...Bd6 supporting the e5-pawn AND preparing castling. The Italian-style setup with ...Bd6 is the main line.",
    short: '...Bd6 supports e5',
  },
  // After 1.e4 c6 2.d4 d5 3.f3 dxe4 4.fxe4 e5 5.Nf3 Bd6 6.Bc4 — wrong move ...Bg4 (premature pin again, now with bishops out)
  {
    setup: ['e4','c6','d4','d5','f3','dxe4','fxe4','e5','Nf3','Bd6','Bc4'],
    wrong: 'Bg4',
    correct: 'Nf6',
    explanation: "After 6.Bc4 the natural-looking pin ...Bg4 runs into 7.Bxf7+ Kxf7 8.Ng5+ — discovered attack winning the bishop on g4 AND material. The correct development is ...Nf6 challenging White's e4-pawn AND supporting kingside structure. Always complete development before pinning.",
    short: '...Nf6 develop first',
  },
];

const out = [];
for (const p of PITFALLS) {
  const c = new Chess();
  let ok = true;
  for (const san of p.setup) {
    try { c.move(san); } catch { console.error('SKIP setup: ' + san); ok = false; break; }
  }
  if (!ok) continue;
  const fen = c.fen();
  // Validate wrongMove
  const test1 = new Chess(fen);
  try { test1.move(p.wrong); } catch (e) { console.error(`SKIP: illegal wrongMove ${p.wrong} from ${fen}`); continue; }
  // Validate correctMove
  const test2 = new Chess(fen);
  try { test2.move(p.correct); } catch (e) { console.error(`SKIP: illegal correctMove ${p.correct} from ${fen}`); continue; }
  out.push({
    fen,
    wrongMove: p.wrong,
    correctMove: p.correct,
    explanation: p.explanation,
    shortNarration: p.short,
    sources: SRC,
  });
}
console.error(`Built ${out.length} / ${PITFALLS.length} Fantasy Caro pitfalls`);
console.log(JSON.stringify(out, null, 2));
