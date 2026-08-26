// Board-computer-facts computer for DNA narration (docs/voiced-narration-from-board.md).
// Given a banked video id, prints, per teaching node, the DETERMINISTIC facts an
// author narrates from: the move + its class, material, checks/captures, and the
// Stockfish eval / bestmove / PV at that position. The FEN is authoritative (G3);
// every claim in the authored `spoken` must trace to a fact printed here or to the
// thin transcript. Nothing is invented.
//
//   node scripts/voiced-authoring/facts.mjs <videoId> [depth]
//
import { spawn } from 'node:child_process';
import { readBank } from './lib.mjs';
import { Chess } from '../../node_modules/chess.js/dist/esm/chess.js';

const SF = '/usr/games/stockfish';
const id = process.argv[2];
const DEPTH = Number(process.argv[3] || 15);
if (!id) { console.error('usage: facts.mjs <videoId> [depth]'); process.exit(1); }

const bank = readBank(id);

// One persistent engine for the whole run.
const sf = spawn(SF);
let buf = '';
const waiters = [];
sf.stdout.on('data', (d) => {
  buf += d;
  let nl;
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
    for (const w of waiters) w(line);
  }
});
function send(s) { sf.stdin.write(s + '\n'); }
function evalFen(fen) {
  return new Promise((resolve) => {
    let best = null, score = null, pv = null, mate = null;
    const onLine = (line) => {
      const m = line.match(/score (cp|mate) (-?\d+)/);
      if (m) { if (m[1] === 'cp') { score = Number(m[2]); mate = null; } else { mate = Number(m[2]); score = null; } const p = line.match(/ pv (.+)$/); if (p) pv = p[1].split(' ').slice(0, 8); }
      if (line.startsWith('bestmove')) { best = line.split(' ')[1]; const i = waiters.indexOf(onLine); if (i >= 0) waiters.splice(i, 1); resolve({ best, score, mate, pv }); }
    };
    waiters.push(onLine);
    send('position fen ' + fen);
    send('go depth ' + DEPTH);
  });
}

// Classify the move(s) in a node's `line` from the board BEFORE the node.
function classify(prevFen, sans) {
  const g = new Chess(prevFen); const tags = [];
  for (const san of sans) {
    let mv; try { mv = g.move(san); } catch { break; } if (!mv) break;
    const t = [];
    if (mv.flags.includes('k') || mv.flags.includes('q')) t.push('castle');
    if (mv.captured) t.push('capture:' + mv.captured + '@' + mv.to);
    if (g.isCheck()) t.push('check');
    if (mv.piece === 'p') { t.push(mv.flags.includes('b') ? 'pawn-double' : (mv.san.includes('=') ? 'promote' : 'pawn')); }
    else if (mv.flags === 'n' || mv.flags === 'b') { t.push('develop/quiet:' + mv.piece + '->' + mv.to); }
    tags.push(mv.san + ' {' + (t.join(',') || 'move') + '}');
  }
  return tags.join('  ');
}
function material(fen) {
  const v = { p: 1, n: 3, b: 3, r: 5, q: 9 }; let w = 0, b = 0;
  for (const c of fen.split(' ')[0]) { const l = c.toLowerCase(); if (v[l]) { if (c === c.toUpperCase()) w += v[l]; else b += v[l]; } }
  return (w - b >= 0 ? '+' : '') + (w - b) + ' (W' + w + '/B' + b + ')';
}

console.log(`# FACTS ${id} | ${bank.title} | ${bank.moves.length} nodes | engine depth ${DEPTH}`);
await new Promise((r) => { send('uci'); const w = (l) => { if (l.startsWith('uciok')) { const i = waiters.indexOf(w); if (i >= 0) waiters.splice(i, 1); r(); } }; waiters.push(w); });

let maxPly = 0; let prevFen = new Chess().fen();
for (let i = 0; i < bank.moves.length; i++) {
  const m = bank.moves[i];
  const sans = Array.isArray(m.line) ? m.line : [];
  const reanchor = typeof m.ply === 'number' && m.ply <= maxPly;
  if (typeof m.ply === 'number' && m.ply > maxPly) maxPly = m.ply;
  const cls = sans.length ? classify(prevFen, sans) : '(no move / reanchor)';
  const side = m.fen.split(' ')[1] === 'w' ? 'Black just moved' : 'White just moved';
  const ev = await evalFen(m.fen);
  const evs = ev.mate != null ? `mate ${ev.mate}` : (ev.score != null ? `${(ev.score / 100).toFixed(2)} (cp, +=side-to-move)` : '?');
  console.log(`\n#${i} p${m.ply}${reanchor ? ' *REANCHOR' : ''} t=${m.t}`);
  console.log(`  move: ${cls}`);
  console.log(`  fen:  ${m.fen}`);
  console.log(`  ${side} | material ${material(m.fen)} | eval ${evs} | best ${ev.best || '-'} | pv ${(ev.pv || []).join(' ')}`);
  if (!reanchor) prevFen = m.fen;
}
send('quit');
