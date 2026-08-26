// fuse-engine.mjs — the "board computer facts" half of the DNA fusion.
// For a voiced file's REAL forward main line, run Stockfish per ply and print,
// beside each video-teaching beat, the deterministic engine facts:
//   mover, played SAN, eval(mover POV) after, engine best SAN + short PV,
//   cpLoss vs best, and a label (book/best/good/inaccuracy/mistake/blunder).
// Nothing here writes prose. The agent fuses these facts with the voiced note
// into DNA-voice narration; every board claim then traces to code, not memory.
import { readFileSync, existsSync } from 'node:fs';
import { spawn, execSync } from 'node:child_process';
import { Chess } from 'chess.js';

const ID = process.argv[2];
const DEPTH = parseInt(process.env.SF_DEPTH || '18', 10);
if (!ID) { console.error('usage: node fuse-engine.mjs <videoId>'); process.exit(1); }

function resolveSF() {
  const c = [process.env.STOCKFISH_PATH, '/usr/games/stockfish', '/usr/bin/stockfish', '/usr/local/bin/stockfish'].filter(Boolean);
  for (const p of c) if (existsSync(p)) return p;
  try { return execSync('which stockfish', { encoding: 'utf8' }).trim() || null; } catch { return null; }
}
const BIN = resolveSF();
if (!BIN) { console.error('no stockfish'); process.exit(1); }

// Persistent engine: returns { cp (mover POV, mate=+/-100000), best (uci), pv (uci[]) }.
function engine(bin) {
  const sf = spawn(bin);
  let buf = '', cp = null, pv = [], resolver = null;
  sf.stdout.on('data', (d) => {
    buf += d.toString(); const lines = buf.split('\n'); buf = lines.pop() ?? '';
    for (const l of lines) {
      const mcp = l.match(/score cp (-?\d+)/), mmate = l.match(/score mate (-?\d+)/);
      if (mmate) cp = parseInt(mmate[1], 10) > 0 ? 100000 : -100000;
      else if (mcp) cp = parseInt(mcp[1], 10);
      const mpv = l.match(/ pv (.+)$/); if (mpv) pv = mpv[1].trim().split(/\s+/);
      const bm = l.match(/^bestmove (\S+)/);
      if (bm && resolver) { const r = resolver; resolver = null; r({ cp, best: bm[1] === '(none)' ? null : bm[1], pv: pv.slice() }); }
    }
  });
  sf.stdin.write('uci\nisready\nsetoption name Threads value 1\n');
  return {
    go(fen) {
      return new Promise((res) => { cp = null; pv = []; resolver = res;
        sf.stdin.write(`position fen ${fen}\ngo depth ${DEPTH}\n`);
        setTimeout(() => { if (resolver === res) { resolver = null; res({ cp, best: null, pv: [] }); } }, 30000); });
    },
    quit() { try { sf.stdin.write('quit\n'); sf.kill(); } catch { /* */ } },
  };
}

function uciToSan(fen, uci) { const c = new Chess(fen); const m = c.move({ from: uci.slice(0,2), to: uci.slice(2,4), promotion: uci[4] }); return m ? m.san : uci; }
function pvSans(fen, pv, n = 3) { const c = new Chess(fen); const out = []; for (const u of pv.slice(0, n)) { const m = c.move({ from: u.slice(0,2), to: u.slice(2,4), promotion: u[4] }); if (!m) break; out.push(m.san); } return out; }
function label(cpLoss, mate) {
  if (mate) return 'forcing';
  if (cpLoss <= 15) return 'best';
  if (cpLoss <= 50) return 'good';
  if (cpLoss <= 100) return 'inaccuracy';
  if (cpLoss <= 250) return 'mistake';
  return 'blunder';
}

const voiced = JSON.parse(readFileSync(`data/video-narration-voiced/${ID}.json`, 'utf8'));
// Reconstruct the forward main line: walk beats, keep ply-monotonic (drop rewinds).
const beats = [];
let maxPly = 0;
for (const m of voiced.moves) {
  if (!m.line || !m.line.length) continue;
  if (m.ply <= maxPly) continue;           // rewind / analysis tangent — skip for the spine
  maxPly = m.ply;
  beats.push(m);
}

const sf = engine(BIN);
const chess = new Chess();
console.log(`# ${ID} — ${voiced.openingName} (student=${voiced.studentSide}) — SF depth ${DEPTH}\n`);
for (const beat of beats) {
  for (const san of beat.line) {
    const fenBefore = chess.fen();
    const mover = chess.turn() === 'w' ? 'White' : 'Black';
    const before = await sf.go(fenBefore);
    const bestSan = before.best ? uciToSan(fenBefore, before.best) : '?';
    const pv = pvSans(fenBefore, before.pv, 3);
    const mv = chess.move(san);
    if (!mv) { console.log(`!! illegal ${san} at ${fenBefore}`); continue; }
    const after = await sf.go(chess.fen());
    const playedCp = after.cp == null ? null : -after.cp;         // flip opp POV → mover POV
    const bestCp = before.cp;
    const cpLoss = (bestCp != null && playedCp != null) ? bestCp - playedCp : null;
    const isBest = before.best && (mv.from + mv.to + (mv.promotion || '')) === before.best;
    const mate = Math.abs(bestCp || 0) >= 100000 || Math.abs(playedCp || 0) >= 100000;
    const lab = cpLoss == null ? '?' : (isBest ? 'best' : label(cpLoss, mate));
    console.log(`ply ${mv.color === 'w' ? mv.before?.split(' ')[5] : ''}${beat.ply}  ${mover} ${san}`);
    console.log(`   eval(after, ${mover} POV): ${playedCp != null ? (playedCp/100).toFixed(2) : '?'}   best: ${bestSan}  pv: ${pv.join(' ')}   cpLoss: ${cpLoss ?? '?'}  [${lab}]`);
    console.log(`   NOTE: ${beat.spoken || '(silent)'}\n`);
  }
}
sf.quit();
