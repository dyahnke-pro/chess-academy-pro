// THE GEM CALCULATOR (WO-ALL-OPENINGS-01 O2; David 2026-10-28: "There has to
// be a way for the gem calculator to work" · "the sexy, juicy traps that
// attract beginners"). Run offline over the club tree (`build-club-tree.mjs`):
// EVERY position club players reached in 20+ games is examined — never a walk
// that follows popular moves only, which is how the old hand scan missed
// 2…Bc5 3.Qh5 Nc6?? 4.Qxf7#. At each one, every move the side to move played in
// 1%+ and 20+ of the games under 1600 is a candidate slip; Stockfish keeps a
// slip only when:
//   1. the position before it was not already lost for the mover (the slip is
//      the fault);
//   2. after it, the other side's best play wins AT LEAST A PIECE or mates,
//      played out to a quiet board (the trap bar, `TRAP_BAR_CP`);
//   3. a second, deeper read of the board after the slip agrees.
// The merge pass (`--merge`) drops slips masters play (theory, not a trap),
// keeps one per board (transpositions), ranks them by JUICE and writes the
// lookup index the app reads.
//
//   node scripts/all-openings/mine-club-gems.mjs --month 2016-01            (spawns 4 shards)
//   node scripts/all-openings/mine-club-gems.mjs --month 2016-01 --shard 0/4 (one shard)
//   node scripts/all-openings/mine-club-gems.mjs --month 2016-01 --merge
// Shards checkpoint every node to data/sources/club-gems/<month>/shard-i.jsonl
// (gitignored) and resume where they stopped.
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';

const root = new URL('../..', import.meta.url).pathname;
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const has = (n) => process.argv.includes(`--${n}`);
const MONTH = arg('month', '2016-01');
const SHARD = arg('shard', null);
const WORKERS = Number(arg('workers', 4));
const OUT_DIR = `${root}data/sources/club-gems/${MONTH}/`;
const TREE = `${root}data/sources/club-tree/${MONTH}.json`;
const STOCKFISH = process.env.STOCKFISH ?? '/usr/games/stockfish';
mkdirSync(OUT_DIR, { recursive: true });

const MIN_GAMES = 20;          // games under 1600 that played the slip
const MIN_SHARE = 0.01;        // of the position's games under 1600
const NOT_LOST_CP = -150;      // the mover's eval before the slip
const QUICK_CP = 200;          // the punisher's eval after the slip, quick read
const SWING_CP = 250;          // what the slip cost, quick read
const TRAP_BAR_CP = 300;       // a piece (src/data/lessons/punishGems.ts)
const MATE = 100000;
const QUICK_DEPTH = 12;
const PLAY_DEPTH = 16;
const END_DEPTH = 18;
const SECOND_DEPTH = 22;

const log = (s) => console.log(`${new Date().toISOString().slice(11, 19)} ${s}`);
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
function material(c) {
  let w = 0; let b = 0;
  for (const row of c.board()) for (const p of row) if (p) { if (p.color === 'w') w += VAL[p.type]; else b += VAL[p.type]; }
  return w - b;
}
const boardKey = (fen) => fen.split(' ').slice(0, 4).join(' ');

// ── one Stockfish per shard ────────────────────────────────────────────────
function engine() {
  const sf = spawn(STOCKFISH, [], { stdio: ['pipe', 'pipe', 'ignore'] });
  let buf = ''; let waiter = null;
  sf.stdout.on('data', (d) => {
    buf += d.toString();
    if (waiter && buf.includes(waiter.until)) { const b = buf; buf = ''; const w = waiter; waiter = null; w.ok(b); }
  });
  const send = (s) => sf.stdin.write(`${s}\n`);
  const wait = (until) => new Promise((ok) => { waiter = { until, ok }; if (buf.includes(until)) { const b = buf; buf = ''; waiter = null; ok(b); } });
  return {
    async init() { send('uci'); await wait('uciok'); send('setoption name Threads value 1'); send('setoption name Hash value 64'); send('isready'); await wait('readyok'); },
    /** White-POV centipawns (mate as ±MATE), and the best move. */
    async search(fen, depth) {
      send(`position fen ${fen}`); send(`go depth ${depth}`);
      const out = await wait('bestmove');
      const lines = out.split('\n').filter((l) => l.startsWith('info') && / score /.test(l));
      const last = lines[lines.length - 1] ?? '';
      const m = / score (cp|mate) (-?\d+)/.exec(last);
      let cp = 0;
      if (m) cp = m[1] === 'mate' ? (Number(m[2]) > 0 ? MATE - Number(m[2]) : -MATE - Number(m[2])) : Number(m[2]);
      if (fen.split(' ')[1] === 'b') cp = -cp;
      return { cp, best: /bestmove (\S+)/.exec(out)?.[1] ?? null };
    },
    quit() { send('quit'); },
  };
}

/** Best play both sides from `fen` for `plies`, then on while the last move
 *  captured or checked (never stop mid-recapture); the quiet end. */
async function playout(sf, fen, plies) {
  const c = new Chess(fen); const sans = [];
  for (let i = 0; i < plies + 6 && !c.isGameOver(); i += 1) {
    const s = await sf.search(c.fen(), PLAY_DEPTH);
    if (!s.best || s.best === '(none)') break;
    let mv;
    try { mv = c.move({ from: s.best.slice(0, 2), to: s.best.slice(2, 4), promotion: s.best[4] }); } catch { break; }
    sans.push(mv.san);
    if (i + 1 >= plies && !mv.captured && !c.inCheck()) break;
  }
  if (c.isCheckmate()) return { sans, endCp: c.turn() === 'w' ? -MATE : MATE, mate: true, material: material(c) };
  const end = await sf.search(c.fen(), END_DEPTH);
  return { sans, endCp: end.cp, mate: Math.abs(end.cp) >= MATE / 2, material: material(c) };
}

/** The engine's move as SAN on `fen`, or null. */
function bestSan(fen, uci) {
  if (!uci || uci === '(none)') return null;
  try { return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san; } catch { return null; }
}

function lowBand(arr) { return { n: arr[0] + arr[3], w: arr[1] + arr[4], d: arr[2] + arr[5] }; }

async function runShard(index, of) {
  const tree = JSON.parse(readFileSync(TREE, 'utf8'));
  const file = `${OUT_DIR}shard-${index}.jsonl`;
  const done = new Set();
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (!line) continue;
      try { const r = JSON.parse(line); if (r.done !== undefined) done.add(r.done); } catch { /* a torn last line */ }
    }
  }
  const keys = Object.keys(tree.nodes).sort().filter((_, i) => i % of === index);
  const sf = engine(); await sf.init();
  let seen = 0; let gems = 0; const t0 = Date.now();
  for (const key of keys) {
    seen += 1;
    if (done.has(key)) continue;
    const node = tree.nodes[key];
    const sans = key ? key.split(' ') : [];
    const c = new Chess();
    let legal = true;
    try { for (const s of sans) c.move(s); } catch { legal = false; }
    const total = Object.values(node.m).reduce((a, arr) => a + arr[0] + arr[3], 0);
    const slips = legal && total >= MIN_GAMES
      ? Object.entries(node.m).filter(([, arr]) => { const g = arr[0] + arr[3]; return g >= MIN_GAMES && g / total >= MIN_SHARE; })
      : [];
    if (slips.length > 0) {
      const fen = c.fen();
      const mover = c.turn();
      const pov = (cp) => (mover === 'w' ? cp : -cp); // the mover's view
      const before = await sf.search(fen, QUICK_DEPTH);
      if (pov(before.cp) >= NOT_LOST_CP) {
        for (const [san, arr] of slips) {
          const after = new Chess(fen);
          let mv;
          try { mv = after.move(san); } catch { continue; }
          const quick = await sf.search(after.fen(), QUICK_DEPTH);
          const swing = pov(before.cp) - pov(quick.cp);
          if (-pov(quick.cp) < QUICK_CP || swing < SWING_CP) continue;
          const po = await playout(sf, after.fen(), 8);
          const end = -pov(po.endCp);
          const won = -pov(po.material - material(c));
          if (!(po.mate && end > 0) && !(end >= TRAP_BAR_CP && won >= 3)) continue;
          const second = await sf.search(after.fen(), SECOND_DEPTH);
          if (-pov(second.cp) < TRAP_BAR_CP) continue;
          const low = lowBand(arr);
          const bands = [arr[0], arr[3], arr[6]];
          gems += 1;
          appendFileSync(file, `${JSON.stringify({
            gem: {
              line: sans, slip: mv.san, by: mover === 'w' ? 'white' : 'black', capture: !!mv.captured,
              games: low.n, share: Math.round((low.n / total) * 1000) / 10, bands,
              // the slip's mover's score in those games: low = the trap works in practice
              moverScore: low.n ? Math.round(((mover === 'w' ? low.w : low.n - low.w - low.d) + low.d / 2) / low.n * 100) : null,
              punish: po.sans, mate: po.mate && end > 0, won, endCp: Math.min(end, MATE), secondCp: Math.min(-pov(second.cp), MATE),
              beforeCp: pov(before.cp), swing, best: bestSan(fen, before.best),
            },
          })}\n`);
        }
      }
    }
    appendFileSync(file, `${JSON.stringify({ done: key })}\n`);
    if (seen % 250 === 0) {
      const rate = seen / ((Date.now() - t0) / 1000);
      log(`shard ${index}/${of} ${seen}/${keys.length} nodes, ${gems} gems this run, ${rate.toFixed(1)} nodes/s`);
    }
  }
  sf.quit();
  log(`shard ${index}/${of} DONE ${keys.length} nodes, ${gems} gems this run`);
}

// ── merge: masters guard, one per board, juice, the lookup index ──────────
function masterBoards() {
  const dir = `${root}public/data/master-tree/`;
  const boards = new Map();
  for (const f of readdirSync(dir)) {
    if (!/^(root|s\d+)\.json$/.test(f)) continue;
    const rows = JSON.parse(readFileSync(dir + f, 'utf8'));
    for (const [k, v] of Object.entries(rows)) if (!boards.has(k)) boards.set(k, v);
  }
  return boards;
}

/** How much a gem is worth showing a beginner. A mate beats a queen beats a
 *  rook beats a piece; a fast punish beats a slow one; bait taken (the slip
 *  captures) is the classic trap; played often at club level, and lost in
 *  practice when it is. Pure. */
export function juice(g) {
  const payoff = g.mate ? 5 : g.won >= 9 ? 4 : g.won >= 5 ? 3 : 2;
  const speed = 1 / (1 + g.punish.length / 4);
  const greed = g.capture ? 1.3 : 1;
  const often = Math.log10(g.games + 1);
  const works = 0.5 + (g.moverScore === null ? 0.5 : 1 - g.moverScore / 100);
  return Math.round(payoff * speed * greed * often * works * 100) / 100;
}

function merge() {
  const masters = masterBoards();
  const gems = [];
  for (const f of readdirSync(OUT_DIR)) {
    if (!f.endsWith('.jsonl')) continue;
    for (const line of readFileSync(OUT_DIR + f, 'utf8').split('\n')) {
      if (!line) continue;
      try { const r = JSON.parse(line); if (r.gem) gems.push(r.gem); } catch { /* torn line */ }
    }
  }
  let theory = 0;
  const byBoard = new Map();
  for (const g of gems) {
    const c = new Chess();
    for (const s of g.line) c.move(s);
    const key = boardKey(c.fen());
    const rows = masters.get(key);
    if (rows) {
      const total = rows.reduce((a, r) => a + r[1], 0);
      const row = rows.find((r) => r[0] === g.slip);
      if (row && total >= 10 && row[1] / total >= 0.03) { theory += 1; continue; }
    }
    const id = `${key}|${g.slip}`;
    const was = byBoard.get(id);
    // One per board: the move order club players reached it by most.
    if (!was || g.games > was.games) byBoard.set(id, { ...g, board: key, juice: juice(g) });
  }
  const out = [...byBoard.values()].sort((a, b) => b.juice - a.juice);
  const index = {};
  for (const g of out) {
    (index[g.board] ??= []).push({
      line: g.line.join(' '), slip: g.slip, by: g.by, best: g.best ?? null, games: g.games, share: g.share, moverScore: g.moverScore,
      punish: g.punish.join(' '), mate: g.mate, won: g.won, endCp: g.endCp, juice: g.juice,
    });
  }
  const dest = `${root}public/data/club-gems.json`;
  writeFileSync(dest, JSON.stringify({ meta: { month: MONTH, gems: out.length, theoryDropped: theory, bar: TRAP_BAR_CP }, boards: index }));
  writeFileSync(`${OUT_DIR}ranked.json`, JSON.stringify(out, null, 1));
  log(`merged ${gems.length} slips → ${out.length} gems (${theory} masters' theory dropped) → ${dest}`);
  for (const g of out.slice(0, 25)) log(`  ${g.juice}  ${g.line.join(' ')} ${g.slip}?? → ${g.punish.join(' ')}  ${g.mate ? 'mate' : `+${g.won}`}  ${g.games}g ${g.share}% mover ${g.moverScore}%`);
}

if (has('merge')) merge();
else if (SHARD) { const [i, of] = SHARD.split('/').map(Number); await runShard(i, of); }
else {
  log(`spawning ${WORKERS} shards over ${TREE}`);
  const kids = Array.from({ length: WORKERS }, (_, i) => new Promise((ok) => {
    const p = spawn(process.execPath, [new URL(import.meta.url).pathname, '--month', MONTH, '--shard', `${i}/${WORKERS}`], { stdio: 'inherit' });
    p.on('exit', (code) => ok(code));
  }));
  const codes = await Promise.all(kids);
  log(`shards exited ${codes.join(',')}`);
  merge();
}
