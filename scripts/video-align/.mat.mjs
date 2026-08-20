import { Chess } from 'chess.js';
const V = { p:1, n:3, b:3, r:5, q:9, k:0 };
const mat = (g) => g.board().flat().filter(Boolean).reduce((s,p)=>s+(p.color==='w'?V[p.type]:-V[p.type]),0);
// minimax on material only, depth in plies
function search(g, d) {
  if (d === 0 || g.isGameOver()) return mat(g);
  const ms = g.moves();
  let best = g.turn() === 'w' ? -99 : 99;
  for (const m of ms) { g.move(m); const v = search(g, d-1); g.undo();
    best = g.turn() === 'w' ? Math.max(best, v) : Math.min(best, v); }
  return best;
}
const base = "e4 c5 Nc3 Nc6 Nf3 g6 d4 cxd4 Nxd4 Bg7 Be3 Nf6 a3 O-O Bc4".split(' ');
const g = new Chess(); for (const m of base) g.move(m);
console.log('material at 8.Bc4 (White +ve):', mat(g));
g.move('Nxe4');
console.log('after 9...Nxe4, best material for White within 4 plies:', search(new Chess(g.fen()), 4));
// and the specific line
const h = new Chess(g.fen()); h.move('Nxe4'); h.move('d5');
console.log('after 10.Nxe4 d5 — White to move, material now:', mat(h));
console.log('best material White can hold within 4 plies from there:', search(new Chess(h.fen()), 4));
