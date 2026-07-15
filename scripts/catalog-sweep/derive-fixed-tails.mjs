// P0 soundness fixes: for each broken line, play the prefix to the break,
// substitute the engine-better student move, extend with best-play to a
// sound terminus. Emits corrected pgns + final student evals.
import { Chess } from 'chess.js';
import { spawn } from 'child_process';

const SF = '/usr/games/stockfish';
function best(fen, ms = 8000) {
  return new Promise((res) => {
    const sf = spawn(SF);
    let cp = null; let bm = null;
    sf.stdout.on('data', (d) => {
      const s = d.toString();
      const all = s.match(/score (cp|mate) (-?\d+)/g);
      if (all) { const l = all[all.length - 1].match(/(cp|mate) (-?\d+)/); cp = l[1] === 'mate' ? (Number(l[2]) > 0 ? 9999 : -9999) : Number(l[2]); }
      const b = s.match(/bestmove (\S+)/);
      if (b) { bm = b[1]; sf.kill(); res({ cp, bm }); }
    });
    sf.stdin.write(`position fen ${fen}\ngo movetime ${ms}\n`);
    setTimeout(() => { try { sf.kill(); } catch {} res({ cp, bm }); }, 12000);
  });
}
async function extend(c, plies, ms = 7000) {
  const added = [];
  for (let i = 0; i < plies; i++) {
    const { bm } = await best(c.fen(), ms);
    if (!bm || bm === '(none)') break;
    const mv = c.move({ from: bm.slice(0, 2), to: bm.slice(2, 4), promotion: bm.length > 4 ? bm[4] : undefined });
    if (!mv) break;
    added.push(mv.san);
  }
  return added;
}
// [label, prefixSans(with corrected student move as last), extendPlies, student]
const FIXES = [
  ['pirc-150', 'e4 d6 d4 Nf6 Nc3 g6 Be3 Bg7 Qd2 c6 f3 b5', 6, 'b'],
  ['anti-colle-nbd2', 'd4 d5 Nf3 Nf6 e3 c5 Nbd2 cxd4 exd4 Nc6', 8, 'b'],
  ['vienna-nc6', 'e4 e5 Nc3 Nc6 f4 exf4 Nf3 g5 Bc4 Bg7 d4 d6 h4', 6, 'w'],
  ['gotham-english-sym', 'c4 e5 Nc3 Nf6 Nf3 Nc6 e3 Bb4 Qc2 Bxc3 Qxc3 Qe7 b3 d5 d4', 6, 'w'],
  ['old-indian-seirawan', 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 d5 a5', 6, 'b'],
  ['old-indian-main-d5', 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 d5 a5 a3 Nh5', 4, 'b'],
  ['carlsen-modern-classical', 'e4 g6 d4 Bg7 Nf3 d6 Bd3 Nf6 O-O O-O Re1 c5', 6, 'b'],
  ['benoni-b5race', 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 Nf3 g6 e4 Bg7 Be2 O-O O-O Re8 Nd2 Na6 f3 Nc7 a4 b6', 4, 'b'],
  ['caro-advance', 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 Nd7 O-O Ne7 Nbd2 Nc6 c3 cxd4 cxd4 Be7', 4, 'b'],
];
for (const [label, prefix, ext, student] of FIXES) {
  const c = new Chess();
  let bad = null;
  for (const m of prefix.split(/\s+/)) if (!c.move(m)) { bad = m; break; }
  if (bad) { console.log(`${label}: ILLEGAL ${bad}`); continue; }
  const added = await extend(c, ext);
  const fin = await best(c.fen(), 9000);
  const stud = c.turn() === student ? fin.cp : -fin.cp;
  console.log(`\n${label}: student ${stud}cp at terminus`);
  console.log(`  pgn: ${prefix} ${added.join(' ')}`);
}
console.log('\nTAILS DONE');
