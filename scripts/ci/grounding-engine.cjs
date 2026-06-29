#!/usr/bin/env node
/*
 * grounding-engine — a persistent Stockfish 18 (asm build, runs in Node) UCI
 * harness shared by the grounding cache builder. White-POV centipawn eval at a
 * fixed depth. asm.js because it's the only build that runs in plain Node
 * (no SharedArrayBuffer); slower than WASM but accuracy is what matters here.
 */
const path = require('path');
const { spawn } = require('child_process');
const ENGINE = path.join(__dirname, '..', '..', 'node_modules/stockfish/bin/stockfish-18-asm.js');

function makeEngine() {
  const proc = spawn(process.execPath, [ENGINE]);
  let buf = '';
  const waiters = new Set();
  proc.stdout.on('data', (d) => {
    buf += d.toString();
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
      for (const w of waiters) w(line);
    }
  });
  const send = (s) => proc.stdin.write(s + '\n');
  send('uci'); send('setoption name Hash value 128'); send('setoption name Threads value 1');
  // White-POV {cp, mate} at depth. Returns {cp, mate, best}. cp is null only on
  // a position with no legal moves that didn't report a mate (shouldn't happen).
  function evalFen(fen, depth) {
    return new Promise((resolve) => {
      const turn = fen.split(' ')[1];
      let cp = null, mate = null, best = null;
      const w = (line) => {
        let m;
        if ((m = line.match(/score cp (-?\d+)/))) cp = parseInt(m[1], 10);
        if ((m = line.match(/score mate (-?\d+)/))) mate = parseInt(m[1], 10);
        if (line.startsWith('bestmove')) {
          best = line.split(' ')[1];
          waiters.delete(w);
          const sign = turn === 'w' ? 1 : -1;
          // `score mate 0` means the side to move is ALREADY checkmated (it
          // loses). sign*0 silently drops the sign, so a student-delivered mate
          // (Nd6#) would read as the student being mated. Force a signed
          // white-POV sentinel by side-to-move: white-to-move-and-mated → −∞,
          // black-to-move-and-mated → +∞.
          let outMate = mate == null ? null : sign * mate;
          if (mate === 0) outMate = turn === 'w' ? -100000 : 100000;
          resolve({ cp: cp == null ? null : sign * cp, mate: outMate, best });
        }
      };
      waiters.add(w);
      send(`position fen ${fen}`);
      send(`go depth ${depth}`);
    });
  }
  return { evalFen, quit: () => { try { send('quit'); proc.kill(); } catch { /* */ } } };
}
module.exports = { makeEngine };
