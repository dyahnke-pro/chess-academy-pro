// Reusable persistent-engine eval helper (spawn + wait-for-bestmove; the
// one-shot `printf | stockfish` pipe aborts the search on stdin EOF and returns
// a depth-0 bestmove with no score). Import makeEval() → { eval(fen), best(fen), quit() }.
import { spawn } from 'node:child_process';
const SF = process.env.SF || '/usr/games/stockfish';

export function makeEval(ms = 1000) {
  const p = spawn(SF);
  let resolver = null, buf = '', cp = null, mate = null, best = null;
  p.stdout.on('data', (d) => {
    buf += d; let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      let m = line.match(/score cp (-?\d+)/); if (m) { cp = +m[1]; mate = null; }
      m = line.match(/score mate (-?\d+)/); if (m) { mate = +m[1]; cp = null; }
      m = line.match(/^bestmove (\S+)/);
      if (m) { best = m[1] === '(none)' ? null : m[1]; if (resolver) { const r = resolver; resolver = null; r({ cp, mate, best }); } }
    }
  });
  p.stdin.write('uci\nisready\nucinewgame\n');
  const evalFen = (fen) => new Promise((res) => {
    cp = null; mate = null; best = null;
    const t = setTimeout(() => { if (resolver) { resolver = null; res({ cp, mate, best }); } }, ms + 4000);
    resolver = (v) => { clearTimeout(t); res(v); };
    p.stdin.write(`position fen ${fen}\ngo movetime ${ms}\n`);
  });
  return { eval: evalFen, best: evalFen, quit() { try { p.stdin.write('quit\n'); p.kill(); } catch { /* noop */ } } };
}
