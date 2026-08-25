#!/usr/bin/env node
/**
 * recover-bank — restore gitignored bank transcripts for a shard.
 * The raw video bank (data/video-narration/<id>.json) is gitignored, so a fresh
 * clone has none. They live in commit 09120f6. This recovers a shard's ids.
 *   node scripts/voiced-authoring/recover-bank.mjs docs/wo/voiced-shards/shard-A.txt
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const BANK = 'data/video-narration';
const SRC_COMMIT = '09120f6';
const file = process.argv[2];
if (!file) { console.error('usage: recover-bank.mjs <ids-file>'); process.exit(1); }
if (!existsSync(BANK)) mkdirSync(BANK, { recursive: true });

const ids = readFileSync(file, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
let ok = 0, have = 0, miss = 0;
for (const id of ids) {
  const dest = `${BANK}/${id}.json`;
  if (existsSync(dest)) { have += 1; continue; }
  try {
    const buf = execFileSync('git', ['show', `${SRC_COMMIT}:${BANK}/${id}.json`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    writeFileSync(dest, buf);
    ok += 1;
  } catch { console.warn(`[recover] MISSING in ${SRC_COMMIT}: ${id}`); miss += 1; }
}
console.log(`[recover] ${ok} recovered, ${have} already present, ${miss} missing / ${ids.length}`);
