// A small UCI wrapper over a native Stockfish for the course-line tools
// (WO-COURSE-01 C). One process, Threads 1, queued requests. Scores are from
// the SIDE TO MOVE's point of view, mates folded into ±(100000 - plies).
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

export const ENGINE_PATH = existsSync('/usr/games/stockfish') ? '/usr/games/stockfish' : 'stockfish';
export const MATE = 100000;

export class Engine {
  constructor() {
    this.sf = spawn(ENGINE_PATH);
    this.buf = '';
    this.queue = Promise.resolve();
    this.listener = null;
    this.sf.stdout.on('data', (d) => {
      this.buf += d.toString();
      let k;
      while ((k = this.buf.indexOf('\n')) >= 0) {
        const line = this.buf.slice(0, k).trim();
        this.buf = this.buf.slice(k + 1);
        this.listener?.(line);
      }
    });
    this.send('uci');
    this.send('setoption name Threads value 1');
    this.send('setoption name Hash value 64');
    this.send('isready');
  }

  send(cmd) {
    this.sf.stdin.write(cmd + '\n');
  }

  /** Search `fen`; with `searchmoves` the score is that move's.
   *
   *  Every search starts from a cleared engine (`ucinewgame`: hash and
   *  history), so a read is a function of the position and the depth, never
   *  of what the engine searched before (2026-10-29, WO-COURSE-01 D). One
   *  process searched hundreds of unrelated boards back to back, root searches
   *  restricted by `searchmoves` among them, and the hash they left decided a
   *  later move: on 1.e4 c6 2.Nf3 d5 3.d4 dxe4 4.Ne5 a fresh depth-12 search
   *  plays …Nd7 (+0.8 for Black); after 505 other lines it played …f6?? (−2.1,
   *  Qh5+ wins the h8 rook) — reproduced by replaying the run, gone with the
   *  clear. A course line must not depend on the order it was built in. */
  analyse(fen, { depth = 12, searchmoves = null } = {}) {
    const run = () =>
      new Promise((resolve) => {
        let score = null;
        this.listener = (line) => {
          const m = /score (cp|mate) (-?\d+)/.exec(line);
          if (m && / pv /.test(line)) {
            const v = Number(m[2]);
            score = m[1] === 'cp' ? v : v > 0 ? MATE - v : -MATE - v;
          }
          if (line.startsWith('bestmove')) {
            this.listener = null;
            const best = line.split(' ')[1];
            resolve({ best: best === '(none)' ? null : best, score });
          }
        };
        this.send('ucinewgame');
        this.send(`position fen ${fen}`);
        this.send(`go depth ${depth}${searchmoves ? ` searchmoves ${searchmoves.join(' ')}` : ''}`);
      });
    const p = this.queue.then(run);
    this.queue = p.catch(() => undefined);
    return p;
  }

  quit() {
    this.send('quit');
  }
}
