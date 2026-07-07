// Engine-verified hanging-piece sweep for course sublines (David 2026-07-07:
// "noticed a hanging queen in a subline — sweep those for accuracy. Can you
// hand check each subline yourself?"). Two stages:
//   1. FAST chess.js SEE-1 candidate filter — at every interior ply, can the
//      side to move win >= a minor by a single capture the prior move left
//      hanging (net of the exchange just initiated)?
//   2. ENGINE CONFIRM — eval each candidate with Stockfish. If the side to move
//      is winning by >= CONFIRM pawns the hang is REAL; else the SEE-1 flag was
//      a shallow false positive (defended deeper / pinned / compensated) → drop.
// Emits JSON per confirmed hang with FEN + full line for hand-checking.
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname + '/';
const data = JSON.parse(readFileSync(ROOT + 'src/data/course-sublines.json', 'utf8'));
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const THRESH = Number(process.env.THRESH || 3);
const CONFIRM = Number(process.env.CONFIRM || 2.5);
const MS = Number(process.env.MS || 350);
const CONCURRENCY = Number(process.env.CONCURRENCY || 4);
const SF = '/usr/games/stockfish';
const only = process.env.OPENINGS ? new Set(process.env.OPENINGS.split(',')) : null;

function bestHang(chess, mDest, mGain) {
  let best = null;
  for (const m of chess.moves({ verbose: true })) {
    if (!m.captured) continue;
    const gained = VAL[m.captured] ?? 0;
    if (gained < THRESH) continue;
    chess.move({ from: m.from, to: m.to, promotion: m.promotion });
    const recap = chess.moves({ verbose: true }).some((r) => r.to === m.to && r.captured);
    chess.undo();
    let net = recap ? gained - (VAL[m.piece] ?? 0) : gained;
    if (m.to === mDest) net -= mGain;
    if (net >= THRESH && (!best || net > best.net)) {
      best = { net, san: m.san, captured: m.captured, square: m.to };
    }
  }
  return best;
}

// Stage 1 — candidates. A line only "ignores" free material if the side to
// move's ACTUAL next authored move does NOT grab (or otherwise resolve) the
// hanging piece. A capture-recapture midpoint where the next move takes back is
// NOT a bug — the material is winnable but the line wins it. So we require the
// authored reply (sl.moves[i+1]) to be a non-capture of the hanging square.
const candidates = [];
for (const [opening, group] of Object.entries(data)) {
  if (only && !only.has(opening)) continue;
  for (const [k, list] of Object.entries(group)) {
    const arr = Array.isArray(list) ? list : [list];
    for (const sl of arr) {
      if (!sl || !Array.isArray(sl.moves)) continue;
      const chess = new Chess();
      for (let i = 0; i < sl.moves.length; i++) {
        let mv; try { mv = chess.move(sl.moves[i]); } catch { mv = null; }
        if (!mv) { candidates.push({ opening, key: k, name: sl.name, ply: i + 1, illegal: sl.moves[i], moves: sl.moves }); break; }
        const hang = bestHang(chess, mv.to, VAL[mv.captured] ?? 0);
        if (hang) {
          // Does the authored next move resolve the hang (capture the hanging
          // piece, or capture something of >= equal value in reply)?
          const next = sl.moves[i + 1];
          let resolved = false;
          if (next) {
            const legal = chess.moves({ verbose: true });
            const nm = legal.find((m) => m.san === next);
            // grabbed the hanging piece itself, or made an equal-or-better capture
            if (nm && nm.captured) {
              if (nm.to === hang.square) resolved = true;
              else if ((VAL[nm.captured] ?? 0) >= hang.net) resolved = true;
            }
          }
          if (!resolved) {
            candidates.push({ opening, key: k, name: sl.name, ply: i + 1, san: sl.moves[i],
              nextMove: next ?? '(terminus)',
              hangSan: hang.san, hangPiece: NAME[hang.captured], hangSquare: hang.square,
              net: hang.net, fen: chess.fen(), turn: chess.turn(), moves: sl.moves });
            break;
          }
        }
      }
    }
  }
}
process.stderr.write(`Stage 1: ${candidates.length} SEE-1 candidates\n`);

// Stage 2 — concurrent persistent engines
function makeEngine() {
  const p = spawn(SF);
  let resolver = null, buf = '', cp = null, mate = null;
  p.stdout.on('data', (d) => {
    buf += d; let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      let m = line.match(/score cp (-?\d+)/); if (m) { cp = +m[1]; }
      m = line.match(/score mate (-?\d+)/); if (m) { mate = +m[1]; cp = null; }
      if (/^bestmove/.test(line) && resolver) { const r = resolver; resolver = null; r({ cp, mate }); }
    }
  });
  p.stdin.write('uci\nisready\nucinewgame\n');
  return {
    eval(fen) {
      return new Promise((res) => {
        cp = null; mate = null;
        const t = setTimeout(() => { if (resolver) { resolver = null; res({ cp: null, mate: null }); } }, MS + 3000);
        resolver = (v) => { clearTimeout(t); res(v); };
        p.stdin.write(`position fen ${fen}\ngo movetime ${MS}\n`);
      });
    },
    quit() { try { p.stdin.write('quit\n'); p.kill(); } catch { /* noop */ } },
  };
}

const queue = candidates.slice();
const confirmed = [];
let done = 0;
async function worker() {
  const eng = makeEngine();
  while (queue.length) {
    const c = queue.pop();
    done++;
    if (c.illegal) { confirmed.push({ opening: c.opening, key: c.key, name: c.name, ply: c.ply, verdict: 'ILLEGAL', illegal: c.illegal, line: c.moves.join(' ') }); continue; }
    const { cp, mate } = await eng.eval(c.fen);
    let stm; if (mate != null) stm = mate > 0 ? 100 : -100; else if (cp != null) stm = cp / 100; else stm = null;
    if (stm != null && stm >= CONFIRM) {
      confirmed.push({ opening: c.opening, key: c.key, name: c.name, ply: c.ply, san: c.san,
        declined: c.nextMove,
        hang: `after ${c.san}, ${c.turn === 'w' ? 'White' : 'Black'} could play ${c.hangSan} (wins the ${c.hangPiece} on ${c.hangSquare}) but the line plays ${c.nextMove}`,
        net: c.net, engineStmPawns: Number(stm.toFixed(2)), fen: c.fen, line: c.moves.join(' ') });
    }
    if (done % 50 === 0) process.stderr.write(`  ${done}/${candidates.length} (confirmed ${confirmed.length})\n`);
  }
  eng.quit();
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

confirmed.sort((a, b) => (b.net ?? 0) - (a.net ?? 0) || (b.engineStmPawns ?? 0) - (a.engineStmPawns ?? 0));
console.log(JSON.stringify(confirmed, null, 2));
process.stderr.write(`\nDONE — ${confirmed.length} engine-confirmed hangs (of ${candidates.length} candidates)\n`);
