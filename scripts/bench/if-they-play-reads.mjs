// REPLY-TREE READS — Danya's "if they X, I play Y" branches, read off his own
// games, with one engine read of every legal reply at the board he branched
// from (the read `ifTheyPlay` walks). Feeds `ifTheyPlay.danya.measure.test.ts`.
//
// His words are reference only: this script parses the reply he named (X) and
// the answer he gave (Y) into moves on the board, and writes MOVES, never his
// sentences.
//
//   node scripts/bench/if-they-play-reads.mjs <bankDir> <out.json> [depth=10] [max=400]
//
// Each row: { video, ply, fen, x, y, xGameNext, read: [[uci, cp, mate|null, pv]] }
//   fen  — the board X is played on (the replier to move)
//   cp   — the replier's view (White-POV flipped), mate folded ±(2000+)
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const [BANK, OUT, DEPTH = '10', MAX = '400'] = process.argv.slice(2);
const ENGINE = existsSync('/usr/games/stockfish') ? '/usr/games/stockfish' : 'stockfish';

const PIECE = { knight: 'n', night: 'n', nite: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k', pawn: 'p' };
const SUBJ = /\bif (black|white|he|she|they|you|my opponent|the opponent)\b/gi;
const MENTION = /\b(?:(knight|night|bishop|rook|queen|king|pawn)s?\s+)?(?:(takes|captures|take|capture|x)\s+(?:on\s+|back\s+on\s+)?)?(?:the\s+)?(?:([a-h])\s?([1-8])\b|(knight|bishop|rook|queen|pawn)\b)|\b(castles|castle|castling)\b|\b(takes back|take back|recaptures?|takes with|take with)\b/gi;

function legal(fen) { try { return new Chess(fen).moves({ verbose: true }); } catch { return []; } }

/** Every legal move a spoken mention can mean on `fen`. */
function resolve(m, fen, lastCaptureSq) {
  const moves = legal(fen);
  if (m.castle) return moves.filter((x) => x.san.startsWith('O-O'));
  if (m.back) return lastCaptureSq ? moves.filter((x) => x.captured && x.to === lastCaptureSq) : [];
  let c = moves;
  if (m.sq) c = c.filter((x) => x.to === m.sq);
  if (m.takes) c = c.filter((x) => !!x.captured);
  if (m.target) c = c.filter((x) => x.captured === m.target);
  if (m.piece) c = c.filter((x) => x.piece === m.piece);
  else if (m.sq && !m.takes) { const pawn = c.filter((x) => x.piece === 'p'); if (pawn.length) c = pawn; }
  return c;
}

function mentions(text) {
  const out = [];
  MENTION.lastIndex = 0;
  let r;
  while ((r = MENTION.exec(text))) {
    const [all, pieceW, takesW, file, rank, targetW, castleW, backW] = r;
    const m = { at: r.index, end: r.index + all.length };
    if (castleW) m.castle = true;
    else if (backW) { m.back = true; if (/with/.test(backW)) m.back = true; }
    else {
      if (pieceW) m.piece = PIECE[pieceW.toLowerCase()];
      if (takesW) m.takes = true;
      if (file) m.sq = `${file.toLowerCase()}${rank}`;
      if (targetW) { if (!takesW) continue; m.target = PIECE[targetW.toLowerCase()]; }
      if (!m.sq && !m.target && !m.takes) continue;
    }
    out.push(m);
  }
  return out;
}

const uciOf = (x) => `${x.from}${x.to}${x.promotion ?? ''}`;

function boardsFor(entries, k) {
  const e = entries[k];
  const boards = [{ fen: e.fen, next: entries[k + 1]?.line?.[0] ?? null }];
  const next = entries[k + 1]?.line?.[0];
  if (next) {
    try { const c = new Chess(e.fen); c.move(next); boards.push({ fen: c.fen(), next: entries[k + 1]?.line?.[1] ?? entries[k + 2]?.line?.[0] ?? null }); } catch { /* not legal */ }
  }
  return boards;
}

const rows = [];
let clauses = 0;
for (const f of readdirSync(BANK).sort()) {
  const d = JSON.parse(readFileSync(`${BANK}/${f}`, 'utf8'));
  const entries = d.moves ?? [];
  for (let k = 0; k < entries.length; k++) {
    const said = entries[k].said ?? '';
    SUBJ.lastIndex = 0;
    let s;
    while ((s = SUBJ.exec(said))) {
      clauses += 1;
      const tail = said.slice(s.index + s[0].length, s.index + s[0].length + 160);
      const ms = mentions(tail);
      const xm = ms.find((m) => m.at < 45);
      if (!xm) continue;
      for (const b of boardsFor(entries, k)) {
        const xs = resolve(xm, b.fen, null);
        if (xs.length !== 1) continue;
        const x = xs[0];
        const xUci = uciOf(x);
        let fenX;
        try { const c = new Chess(b.fen); c.move(x.san); fenX = c.fen(); } catch { continue; }
        let y = null;
        for (const ym of ms.filter((m) => m.at >= xm.end && m.at < xm.end + 110)) {
          const ys = resolve(ym, fenX, x.captured ? x.to : null);
          if (ys.length === 1) { y = uciOf(ys[0]); break; }
        }
        let nextUci = null;
        if (b.next) { try { const c = new Chess(b.fen); nextUci = uciOf(c.move(b.next)); } catch { nextUci = null; } }
        rows.push({ video: d.videoId, ply: entries[k].ply, fen: b.fen, x: xUci, y, xGameNext: nextUci === xUci });
        break;
      }
    }
  }
}
const uniq = new Map();
for (const r of rows) { const key = `${r.fen}|${r.x}`; if (!uniq.has(key)) uniq.set(key, r); }
const notNext = [...uniq.values()].filter((r) => !r.xGameNext);
// Branches with an answer he named first (they are what recall is measured on).
const todo = [...notNext.filter((r) => r.y), ...notNext.filter((r) => !r.y)].slice(0, Number(MAX));
console.log(`clauses=${clauses} resolvedX=${rows.length} unique=${uniq.size} notGameNext=${notNext.length} withY=${notNext.filter((r) => r.y).length} reading=${todo.length}`);

// ── the engine: every legal reply, one read ──
const sf = spawn(ENGINE);
let buf = '';
const waiters = [];
sf.stdout.on('data', (d) => {
  buf += d.toString();
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    for (const w of [...waiters]) w(line);
  }
});
const send = (c) => sf.stdin.write(`${c}\n`);
const until = (pred) => new Promise((res) => {
  const lines = [];
  const w = (l) => { lines.push(l); if (pred(l)) { waiters.splice(waiters.indexOf(w), 1); res(lines); } };
  waiters.push(w);
});
send('uci'); await until((l) => l === 'uciok');
send('setoption name Threads value 1');
send('setoption name Hash value 32');
send('isready'); await until((l) => l === 'readyok');

let n = 0;
for (const r of todo) {
  const nLegal = legal(r.fen).length;
  send('ucinewgame');
  send(`setoption name MultiPV value ${nLegal}`);
  send(`position fen ${r.fen}`);
  send(`go depth ${DEPTH}`);
  const lines = await until((l) => l.startsWith('bestmove'));
  const best = new Map();
  for (const l of lines) {
    if (!l.startsWith('info') || !/ multipv /.test(l)) continue;
    const mv = Number(/ multipv (\d+)/.exec(l)[1]);
    const dep = Number(/ depth (\d+)/.exec(l)[1]);
    const sc = / score (cp|mate) (-?\d+)/.exec(l);
    const pv = / pv (.+)$/.exec(l);
    if (!sc || !pv) continue;
    const prev = best.get(mv);
    if (prev && prev.dep > dep) continue;
    const raw = Number(sc[2]);
    const mate = sc[1] === 'mate' ? raw : null;
    const cp = mate === null ? raw : Math.sign(mate || 1) * (2000 + (100 - Math.min(99, Math.abs(mate))));
    best.set(mv, { dep, cp, mate, pv: pv[1].trim().split(/\s+/).slice(0, 10) });
  }
  const byMove = new Map();
  for (const v of best.values()) if (v.pv[0] && !byMove.has(v.pv[0])) byMove.set(v.pv[0], [v.pv[0], v.cp, v.mate, v.pv]);
  r.read = [...byMove.values()];
  n += 1;
  if (n % 25 === 0) console.log(`read ${n}/${todo.length}`);
}
send('quit');
writeFileSync(OUT, JSON.stringify(todo));
console.log(`wrote ${todo.length} rows to ${OUT}`);
