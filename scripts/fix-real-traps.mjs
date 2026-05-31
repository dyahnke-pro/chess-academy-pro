// Fix the 33 engine-confirmed real traps so they pass the orientation gate
// (David 2026-05-31: remine the real ones). Each is flagged only by the crude
// material/last-mover proxy. From each line's final position, play Stockfish's
// best move for BOTH sides, and after each STUDENT move test the gate's pass
// condition: checkmate-on-opponent, OR material >= +3 with the student having
// just moved. Append the real winning continuation up to a cap. Lines that
// can't reach a material/mate verdict within the cap (purely positional/
// attacking wins the crude proxy can't see) are left allowlisted, reported.
// Writes the updated repertoire.json + reports. Dry-run unless --write.
import fs from 'node:fs';
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';

const WRITE = process.argv.includes('--write');
const SF = '/usr/games/stockfish';
const DEPTH = 18;
const CAP = 10; // max plies to append
const PV = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function bestMove(fen) {
  return new Promise((resolve) => {
    const sf = spawn(SF);
    let bm = null;
    const to = setTimeout(() => { try { sf.kill(); } catch {} resolve(bm); }, 12000);
    sf.stdout.on('data', (b) => {
      const s = b.toString();
      const m = s.match(/bestmove (\S+)/);
      if (m) { bm = m[1]; clearTimeout(to); sf.kill(); resolve(bm); }
    });
    sf.stdin.write(`position fen ${fen}\ngo depth ${DEPTH}\n`);
  });
}
function material(chess, studentChar) {
  let s = 0, o = 0;
  for (const row of chess.board()) for (const sq of row) { if (!sq) continue; const v = PV[sq.type]; if (sq.color === studentChar) s += v; else o += v; }
  return s - o;
}

const decision = JSON.parse(fs.readFileSync('/tmp/decision.json', 'utf8'));
const keepKeys = new Set(decision.keep);
const rep = JSON.parse(fs.readFileSync('src/data/repertoire.json', 'utf8'));
const report = [];

for (const op of rep) {
  const studentChar = op.color === 'white' ? 'w' : 'b';
  for (const line of op.trapLines ?? []) {
    const key = `${op.id}::trap::${line.name}`;
    if (!keepKeys.has(key)) continue;
    const c = new Chess();
    try { c.loadPgn(line.pgn); } catch { report.push(`PARSE ${key}`); continue; }
    // already passing? (mate-on-opp, or material>=3 & student just moved)
    const passes = () => {
      if (c.isCheckmate() && c.turn() !== studentChar) return true;
      const hist = c.history({ verbose: true });
      const last = hist[hist.length - 1];
      return material(c, studentChar) >= 3 && last && last.color === studentChar && !c.isCheckmate();
    };
    if (passes()) { report.push(`ALREADY ${key}`); continue; }
    let appended = [];
    let fixed = false;
    for (let i = 0; i < CAP; i++) {
      if (c.isGameOver()) break;
      const bm = await bestMove(c.fen());
      if (!bm || bm === '(none)') break;
      const mv = c.move({ from: bm.slice(0, 2), to: bm.slice(2, 4), promotion: bm.slice(4) || undefined });
      if (!mv) break;
      appended.push(mv.san);
      if (passes()) { fixed = true; break; }
    }
    if (fixed) {
      line.pgn = `${line.pgn} ${appended.join(' ')}`.trim();
      report.push(`FIXED ${key}  (+${appended.length}: ${appended.join(' ')})`);
    } else {
      report.push(`LEAVE ${key}  (no material/mate verdict within ${CAP}; positional win)`);
    }
  }
}

fs.writeFileSync('/tmp/fix-report.txt', report.join('\n'));
const counts = report.reduce((a, r) => { const k = r.split(' ')[0]; a[k] = (a[k] || 0) + 1; return a; }, {});
console.log(JSON.stringify(counts));
if (WRITE) { fs.writeFileSync('src/data/repertoire.json', JSON.stringify(rep, null, 2) + '\n'); console.log('[written]'); }
else console.log('[dry-run] /tmp/fix-report.txt');
