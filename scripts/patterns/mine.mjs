// THE PATTERN MINER (WO-CAMPAIGN-MASTER, Lane D) — runs every pattern in
// src/missions/patterns/ over real games and writes src/data/patterns/<id>.json:
// how often it arises, in which openings (named by the app's own lookup over
// openings-lichess.json), at what ply, for which colour, real examples, and 20
// fail twins (real boards one condition short).
//
// Run (tsx loads the TypeScript the checks are written in):
//   npx tsx scripts/patterns/mine.mjs \
//     --david audit-reports/.fixtures/david-games.json \
//     --lichess <lichess_db_standard_rated_2013-01.pgn.zst> --lichess-games 2000 \
//     --checkpoint /tmp/mine.ckpt > /tmp/mine.log 2>&1
//
// Sources, always in this order (the order is part of the input, so it is part
// of the bytes):
//   model-games   src/data/model-games.json            (bare SAN)
//   pro-games     public/data/pro-game-references.json (bare SAN)
//   david         --david, `stores.games[].pgn`, master games excluded
//   lichess       --lichess, the first N games of a database.lichess.org dump
//                 (.pgn or .pgn.zst — a dump is immutable, so the first N games
//                 are a fixed input)
// A source that is not given or not on disk is skipped and said so. Deterministic:
// the same sources give byte-identical files (mineCore.test.ts).
import { spawn } from 'node:child_process';
import { appendFileSync, createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { createInterface } from 'node:readline';
import { basename, join } from 'node:path';
import { Worker } from 'node:worker_threads';
import { PATTERN_IDS } from '../../src/missions/patterns/index.ts';
import { aggregate, gameFromPgn, serializeReport, splitPgnGames } from './mineCore.ts';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

const log = (s) => process.stderr.write(`${s}\n`);

function bareSanGames(source, file) {
  const rows = JSON.parse(readFileSync(file, 'utf8'));
  return rows.map((g) => ({ source, id: g.id, sans: String(g.pgn).split(/\s+/).filter(Boolean) }));
}

function davidGames(file) {
  const rows = JSON.parse(readFileSync(file, 'utf8')).stores.games;
  const out = [];
  for (const g of rows) {
    if (g.isMasterGame) continue;
    const game = gameFromPgn('david', g.id, g.pgn);
    if (game) out.push(game);
  }
  return out;
}

/** The first `limit` standard-start games of a Lichess dump. A .zst is read
 *  through the `zstd` CLI (node's built-in zstd refuses the dump's frames). */
async function lichessGames(file, limit) {
  const child = file.endsWith('.zst') ? spawn('zstd', ['-dc', file], { stdio: ['ignore', 'pipe', 'ignore'] }) : null;
  const input = child ? child.stdout : createReadStream(file);
  const rl = createInterface({ input, crlfDelay: Infinity });
  const out = [];
  let lines = [];
  let inMoves = false;
  const flush = () => {
    for (const pgn of splitPgnGames(lines.join('\n'))) {
      const site = /\[Site "https?:\/\/lichess\.org\/(\w+)"\]/.exec(pgn);
      const game = gameFromPgn('lichess', site ? site[1] : `game-${out.length + 1}`, pgn);
      if (game && game.sans.length > 0 && out.length < limit) out.push(game);
    }
    lines = [];
    inMoves = false;
  };
  for await (const line of rl) {
    const isTag = line.startsWith('[');
    if (isTag && inMoves) { flush(); if (out.length >= limit) break; }
    if (!isTag && line.trim()) inMoves = true;
    lines.push(line);
  }
  if (out.length < limit) flush();
  rl.close();
  child?.kill();
  return out;
}

/** Scan every game on `threads` workers; the scans come back in game order.
 *  Each scan is appended to `checkpoint` as it lands (one JSON line), and a
 *  rerun with the same games and patterns reads them back and scans only the
 *  rest — a killed run loses minutes, never the run. */
function scanAll(games, ids, threads, checkpoint) {
  const key = JSON.stringify({ n: games.length, first: games[0]?.id, last: games[games.length - 1]?.id, ids });
  const scans = new Array(games.length);
  let resumed = 0;
  if (checkpoint && existsSync(checkpoint)) {
    const lines = readFileSync(checkpoint, 'utf8').split('\n').filter(Boolean);
    if (lines[0] === key) {
      for (const line of lines.slice(1)) {
        try { const { index, scan } = JSON.parse(line); scans[index] = scan; resumed += 1; } catch { /* a torn last line */ }
      }
    }
  }
  if (checkpoint && resumed === 0) writeFileSync(checkpoint, `${key}\n`);
  if (resumed > 0) log(`[mine] resumed ${resumed} scans from ${checkpoint}`);
  const todo = games.map((game, index) => ({ index, game })).filter(({ index }) => !scans[index]);
  const shards = Array.from({ length: Math.min(threads, Math.max(1, todo.length)) }, () => []);
  todo.forEach((item, i) => shards[i % shards.length].push(item));
  const started = Date.now();
  let done = 0;
  let lastLog = 0;
  return Promise.all(shards.map((shard, w) => new Promise((resolve, reject) => {
    if (shard.length === 0) { resolve(); return; }
    const worker = new Worker(new URL('./mineWorker.mjs', import.meta.url), { workerData: { games: shard, ids } });
    worker.on('message', (msg) => {
      if (msg.type === 'scans') {
        for (const { index, scan } of msg.scans) scans[index] = scan;
        if (checkpoint && msg.scans.length) appendFileSync(checkpoint, msg.scans.map((s) => JSON.stringify(s)).join('\n') + '\n');
        done += msg.scans.length;
        const now = Date.now();
        if (now - lastLog > 15000 || done === todo.length) {
          lastLog = now;
          const rate = done / Math.max(1, (now - started) / 1000);
          log(`[mine] ${resumed + done}/${games.length} games  ${rate.toFixed(2)} games/s  eta ${Math.round((todo.length - done) / Math.max(rate, 0.01))}s`);
        }
      } else if (msg.type === 'done') resolve();
    });
    worker.on('error', reject);
    worker.on('exit', (code) => { if (code !== 0) reject(new Error(`worker ${w} exited ${code}`)); });
  }))).then(() => scans);
}

async function main() {
  const outDir = arg('out', 'src/data/patterns');
  const only = arg('only') ? arg('only').split(',') : undefined;
  const games = [];
  const sources = [];
  const take = (name, list, detail) => { games.push(...list); sources.push({ source: name, games: list.length, ...detail }); log(`[mine] ${name}: ${list.length} games`); };

  take('model-games', bareSanGames('model-games', 'src/data/model-games.json'), { file: 'src/data/model-games.json' });
  take('pro-games', bareSanGames('pro-games', 'public/data/pro-game-references.json'), { file: 'public/data/pro-game-references.json' });

  const david = arg('david', 'audit-reports/.fixtures/david-games.json');
  if (existsSync(david)) take('david', davidGames(david), { file: 'audit-reports/.fixtures/david-games.json (stores.games, master games excluded)' });
  else log(`[mine] david: SKIPPED — ${david} not on disk`);

  const lichess = arg('lichess');
  const lichessLimit = Number(arg('lichess-games', '2000'));
  if (lichess && existsSync(lichess)) {
    take('lichess', await lichessGames(lichess, lichessLimit), { file: `https://database.lichess.org/standard/${basename(lichess)} (first ${lichessLimit} standard-start games)` });
  } else log('[mine] lichess: SKIPPED — no --lichess dump given');

  const ids = only ? PATTERN_IDS.filter((id) => only.includes(id)) : PATTERN_IDS;
  const threads = Math.max(1, Math.min(Number(arg('threads', String(Math.max(1, availableParallelism() - 2)))), games.length));
  log(`[mine] scanning ${games.length} games for ${ids.length} patterns on ${threads} threads`);
  const started = Date.now();
  const scans = await scanAll(games, ids, threads, arg('checkpoint'));
  const reports = aggregate(scans, ids);

  mkdirSync(outDir, { recursive: true });
  for (const r of reports) {
    const file = join(outDir, `${r.id}.json`);
    writeFileSync(file, serializeReport({ ...r, sources }));
    log(`[mine] ${r.id}: ${r.positionsFound} positions, ${r.gamesWithPattern}/${r.gamesScanned} games, top ${r.openings.slice(0, 3).map((o) => `${o.opening} (${o.gamesWithPattern})`).join(' · ')}, ${r.failTwins.length} twins → ${file}`);
  }
  log(`[mine] done in ${Math.round((Date.now() - started) / 1000)}s`);
}

main().catch((e) => { log(`[mine] FAILED: ${e?.stack ?? e}`); process.exit(1); });
