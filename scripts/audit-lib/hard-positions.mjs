/**
 * Hard positions for the 2000-level chat walk (WO-CHAT-01): real Lichess
 * puzzles (CC0) at ~1900+, each with the ENGINE'S truth computed here by the
 * local Stockfish so the coach's answers are checked, not just read.
 *
 *   node scripts/audit-lib/hard-positions.mjs > audit-reports/.hard-positions.json
 */
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';
import fs from 'node:fs';

const IDS = ['0Cjqs', '0GomC', '09frX', '0MOZp', '00zOQ', '0Fs8O'];
const all = JSON.parse(fs.readFileSync('src/data/puzzles.json', 'utf8'));
const list = Array.isArray(all) ? all : all.puzzles;

const sf = spawn(process.execPath, ['node_modules/stockfish/scripts/cli.js']);
let buf = '';
sf.stdout.on('data', (b) => { buf += b; });
const send = (c) => sf.stdin.write(`${c}\n`);
const until = async (re) => { for (;;) { const m = buf.match(re); if (m) { buf = ''; return m; } await new Promise((r) => setTimeout(r, 30)); } };
send('uci'); await until(/uciok/);
send('setoption name MultiPV value 3');

async function analyse(fen, depth = 22) {
  buf = '';
  send(`position fen ${fen}`); send(`go depth ${depth}`);
  const out = (await until(/bestmove (\S+)[^\n]*\n/)).input ?? '';
  const lines = {};
  for (const l of out.split('\n')) {
    const m = l.match(/ depth (\d+) .*multipv (\d+) score (cp|mate) (-?\d+).* pv (.+)$/);
    if (m && Number(m[1]) === depth) lines[m[2]] = { kind: m[3], val: Number(m[4]), pv: m[5].trim().split(' ') };
  }
  return Object.values(lines);
}
const sanLine = (fen, uci) => { const c = new Chess(fen); return uci.map((u) => c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })?.san); };

const out = [];
for (const id of IDS) {
  const p = list.find((x) => x.id === id);
  const c = new Chess(p.fen);
  const [first] = p.moves.split(' ');
  const last = c.move({ from: first.slice(0, 2), to: first.slice(2, 4), promotion: first[4] }).san;
  const fen = c.fen();
  const lines = await analyse(fen);
  const best = lines[0];
  const bestSan = sanLine(fen, best.pv.slice(0, 7));
  // A tempting wrong move: a capture or check the engine rates far worse.
  let wrong = null;
  for (const m of c.moves({ verbose: true }).filter((m) => (m.captured || m.san.includes('+')) && m.san !== bestSan[0])) {
    const c2 = new Chess(fen); c2.move(m.san);
    if (c2.isGameOver()) continue;
    const r = (await analyse(c2.fen(), 16))[0];
    if (!r) continue;
    const forMover = r.kind === 'mate' ? (r.val > 0 ? -10000 : 10000) : -r.val;
    const bestFor = best.kind === 'mate' ? (best.val > 0 ? 10000 : -10000) : best.val;
    if (bestFor - forMover >= 250) { wrong = { san: m.san, refutation: sanLine(c2.fen(), r.pv.slice(0, 5)), evalForMover: forMover }; break; }
  }
  out.push({ id, rating: p.rating, themes: p.themes, fen, side: c.turn() === 'w' ? 'white' : 'black', lastMove: last,
    best: { san: bestSan[0], line: bestSan, mate: best.kind === 'mate' ? best.val : null, cp: best.kind === 'cp' ? best.val : null },
    alternatives: lines.slice(1).map((l) => ({ san: sanLine(fen, [l.pv[0]])[0], mate: l.kind === 'mate' ? l.val : null, cp: l.kind === 'cp' ? l.val : null })),
    wrong });
}
console.log(JSON.stringify(out, null, 1));
sf.kill();
