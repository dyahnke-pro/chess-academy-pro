// THE TWO INDEPENDENT INSTRUMENTS a king-and-pawn scenario is verified with
// (Campaign lane KP), beside the exact tables it was chosen by:
//
//   Stockfish — node_modules/stockfish (one process, one thread). Every read
//               is BOUNDED: a depth, a node budget, and a wall-clock watchdog
//               that sends `stop` and, failing that, replaces the engine.
//   Syzygy    — the Lichess tablebase (tablebase.lichess.ovh): the exact
//               result of any position with up to 7 pieces. Sequential,
//               cached on disk, retried politely on 429.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export function startEngine({ hashMb = 32, cachePath = null } = {}) {
  let proc = null;
  let buf = '';
  let waiter = null;
  let last = null;
  const onData = (d) => {
    buf += d.toString();
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      const m = line.match(/^info .*\bdepth (\d+).*\bscore (mate|cp) (-?\d+)/);
      if (m) last = { depth: Number(m[1]), kind: m[2], value: Number(m[3]) };
      if (waiter && waiter.re.test(line)) { const w = waiter; waiter = null; w.resolve(line); }
    }
  };
  const until = (re, write, ms) => new Promise((res) => {
    const w = { re, resolve: (line) => { clearTimeout(timer); res(line); } };
    const timer = setTimeout(() => { if (waiter === w) waiter = null; res(null); }, ms);
    waiter = w;
    proc.stdin.write(write);
  });
  const kill = () => { try { proc.stdin.write('quit\n'); proc.kill('SIGKILL'); } catch { /* gone */ } };
  const boot = async () => {
    if (proc) kill();
    proc = spawn(process.execPath, ['node_modules/stockfish/bin/stockfish.js'], { stdio: ['pipe', 'pipe', 'ignore'] });
    buf = ''; waiter = null;
    proc.stdout.on('data', onData);
    const ok = await until(/^readyok/, `uci\nsetoption name Threads value 1\nsetoption name Hash value ${hashMb}\nisready\n`, 60_000);
    if (ok === null) throw new Error('Stockfish did not start');
  };
  // Answers are cached by (position, depth, nodes) so a re-run of a build
  // does not re-read what one-thread, node-bounded search already answered
  // (deterministic in one thread).
  const cache = cachePath && existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {};
  let dirty = 0;
  const save = () => { if (cachePath && dirty) { writeFileSync(cachePath, JSON.stringify(cache)); dirty = 0; } };
  return {
    ready: boot,
    /** The score for the side to move: { kind: 'cp'|'mate', value, depth } or null. */
    async score(fen, { depth = 32, nodes = 2_500_000, ms = 30_000 } = {}) {
      const key = `${fen.split(' ').slice(0, 2).join(' ')}|${depth}|${nodes}`;
      if (cache[key]) return cache[key];
      if ((await until(/^readyok/, 'ucinewgame\nisready\n', 30_000)) === null) await boot();
      last = null;
      const done = await until(/^bestmove /, `position fen ${fen}\ngo depth ${depth} nodes ${nodes}\n`, ms);
      if (done !== null) {
        if (last) { cache[key] = last; dirty++; if (dirty >= 10) save(); }
        return last;
      }
      if ((await until(/^bestmove /, 'stop\n', 10_000)) === null) await boot();
      return null;
    },
    quit: () => { save(); kill(); },
  };
}

/** Centipawns for the side to move, mates folded to ±100000. */
export function cpOf(score) {
  if (!score) return null;
  if (score.kind === 'mate') return score.value > 0 ? 100000 : -100000;
  return score.value;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The Lichess tablebase, one request at a time, at most one per `gapMs`,
 * every answer cached on disk ({ c: category, z: dtz } per position). A 429
 * is logged and waited out (a minute, then longer); a request that does not
 * answer in 15 s is retried. Throws after 8 failed tries — never guesses.
 */
export function syzygy(cachePaths, { gapMs = 1100 } = {}) {
  // One cache file is written; any others (comma-separated) are only read —
  // two builds running at once each write their own file.
  const [cachePath, ...readOnly] = String(cachePaths).split(',');
  const raw = {};
  for (const p of [...readOnly, cachePath]) if (existsSync(p)) Object.assign(raw, JSON.parse(readFileSync(p, 'utf8')));
  // Older cache rows hold only the category string.
  const cache = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, typeof v === 'string' ? { c: v, z: null } : v]));
  let dirty = 0;
  let lastAt = 0;
  let asked = 0;
  const save = () => { if (dirty) { writeFileSync(cachePath, JSON.stringify(cache)); dirty = 0; } };
  async function probe(fen) {
    const key = fen.split(' ').slice(0, 2).join(' ');
    if (cache[key]) return cache[key];
    for (let attempt = 0; attempt < 8; attempt++) {
      const wait = lastAt + gapMs - Date.now();
      if (wait > 0) await sleep(wait);
      lastAt = Date.now();
      let res;
      try {
        res = await fetch(`https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(fen)}`, { signal: AbortSignal.timeout(15_000) });
      } catch (e) { console.log(`[syzygy] fetch failed (${e?.name ?? e}), retry ${attempt + 1}`); await sleep(3000 * (attempt + 1)); continue; }
      if (res.status === 429) { console.log(`[syzygy] 429 after ${asked} requests — waiting ${60 * (attempt + 1)} s`); await sleep(60_000 * (attempt + 1)); continue; }
      if (!res.ok) { console.log(`[syzygy] HTTP ${res.status}, retry ${attempt + 1}`); await sleep(3000 * (attempt + 1)); continue; }
      const j = await res.json();
      const c = j.category === 'win' ? 'win' : j.category === 'loss' ? 'loss' : (j.category === 'draw' || j.category === 'cursed-win' || j.category === 'blessed-loss') ? 'draw' : null;
      if (!c) throw new Error(`Syzygy: no result for ${fen} (${j.category})`);
      cache[key] = { c, z: typeof j.dtz === 'number' ? j.dtz : null };
      dirty++; asked++;
      if (dirty >= 20) save();
      if (asked % 100 === 0) console.log(`[syzygy] ${asked} answered`);
      return cache[key];
    }
    throw new Error(`Syzygy unreachable for ${fen}`);
  }
  return {
    /** 'win' | 'draw' | 'loss' for the side to move (cursed / blessed results
     *  count as draws — the fifty-move rule holds them). */
    async category(fen) { return (await probe(fen)).c; },
    /** { c, z }: the category and Syzygy's DTZ (plies to a capture or pawn move). */
    probe,
    save,
  };
}
