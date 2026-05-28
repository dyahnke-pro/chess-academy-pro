#!/usr/bin/env node
// Pull every monthly archive for a chess.com player and write one
// JSONL line per game to data/sources/<player>-chesscom.jsonl.
// Public API, no auth needed. Idempotent: skips months already on disk.

import fs from 'node:fs';
import path from 'node:path';

const PLAYER = process.argv[2] || 'danielnaroditsky';
const OUT_DIR = path.join('data', 'sources', `${PLAYER}-chesscom`);
const SUMMARY_PATH = path.join(OUT_DIR, '_summary.json');
const UA = 'chess-academy-pro pro-repertoire builder (dyahnke@gmail.com)';
const CONCURRENCY = 4;
const RETRIES = 5;

fs.mkdirSync(OUT_DIR, { recursive: true });

async function fetchJson(url, attempt = 1) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    if (attempt >= RETRIES) throw e;
    const wait = 2 ** attempt * 500;
    console.error(`  retry ${attempt}/${RETRIES} in ${wait}ms — ${e.message}`);
    await new Promise((r) => setTimeout(r, wait));
    return fetchJson(url, attempt + 1);
  }
}

async function main() {
  const t0 = Date.now();
  console.log(`[fetch] player=${PLAYER}`);
  const archives = await fetchJson(`https://api.chess.com/pub/player/${PLAYER}/games/archives`);
  console.log(`[fetch] ${archives.archives.length} monthly archives`);

  const months = archives.archives.map((url) => {
    const m = url.match(/(\d{4})\/(\d{2})$/);
    return { url, ym: `${m[1]}-${m[2]}` };
  });

  let totalGames = 0;
  let totalNew = 0;
  let totalSkipped = 0;
  const errors = [];

  // Worker pool
  let idx = 0;
  async function worker(id) {
    while (idx < months.length) {
      const i = idx++;
      const { url, ym } = months[i];
      const outFile = path.join(OUT_DIR, `${ym}.jsonl`);
      if (fs.existsSync(outFile)) {
        const lines = fs.readFileSync(outFile, 'utf8').split('\n').filter(Boolean).length;
        totalGames += lines;
        totalSkipped++;
        if (i % 20 === 0) console.log(`  [w${id}] (${i+1}/${months.length}) ${ym} - cached (${lines})`);
        continue;
      }
      try {
        const data = await fetchJson(url);
        const lines = (data.games || []).map((g) => JSON.stringify(g)).join('\n');
        fs.writeFileSync(outFile, lines + (lines ? '\n' : ''));
        totalGames += data.games?.length || 0;
        totalNew++;
        console.log(`  [w${id}] (${i+1}/${months.length}) ${ym} - ${data.games?.length || 0} games`);
      } catch (e) {
        console.error(`  [w${id}] FAIL ${ym}: ${e.message}`);
        errors.push({ ym, error: e.message });
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)));

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const summary = {
    player: PLAYER,
    fetchedAt: new Date().toISOString(),
    elapsedSec: Number(elapsed),
    archivesTotal: months.length,
    monthsNew: totalNew,
    monthsCached: totalSkipped,
    monthsFailed: errors.length,
    gamesTotal: totalGames,
    errors,
  };
  fs.writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2));
  console.log(`\n[fetch] done in ${elapsed}s | ${totalGames} games | new:${totalNew} cached:${totalSkipped} failed:${errors.length}`);
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
