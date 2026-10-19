// ENGINE AT A POSITION: the top 4 lines at depth 18 for the board after a SAN
// list — the check every walk claim needs before it is called true or false.
//   node scripts/audit-lib/engine-at.mjs "e4 c5 d4 …" [depth]
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';

const sans = process.argv[2].trim().split(/\s+/);
const depth = Number(process.argv[3]) || 18;
const c = new Chess(); for (const s of sans) c.move(s);
const fen = c.fen();
const sf = spawn('/usr/games/stockfish');
let buf = '';
const last = {};
sf.stdout.on('data', (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const l = buf.slice(0, i); buf = buf.slice(i + 1);
    const m = new RegExp(` depth ${depth} .* multipv (\\d+) score (cp|mate) (-?\\d+) .* pv (.*)$`).exec(l);
    if (m) last[m[1]] = m;
    if (l.startsWith('bestmove')) {
      console.log(fen, `(${c.turn() === 'w' ? 'White' : 'Black'} to move, side-to-move POV)`);
      for (const k of Object.keys(last).sort()) {
        const [, , kind, score, pv] = last[k];
        const b = new Chess(fen); const s = [];
        for (const u of pv.split(' ').slice(0, 8)) { try { s.push(b.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san); } catch { break; } }
        console.log(`${k}. ${kind === 'mate' ? `mate ${score}` : (Number(score) / 100).toFixed(2)}  ${s.join(' ')}`);
      }
      sf.kill();
    }
  }
});
sf.stdin.write(`setoption name MultiPV value 4\nposition fen ${fen}\ngo depth ${depth}\n`);
