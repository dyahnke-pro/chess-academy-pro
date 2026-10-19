#!/usr/bin/env node
// Read a "Send my data to Claude" drop (api/data-drop.ts) by the code the
// student pasted. Needs BLOB_READ_WRITE_TOKEN (Vercel project env — pull it
// with the Vercel API the same way as every other server credential).
//   BLOB_READ_WRITE_TOKEN=… node scripts/read-data-drop.mjs <data-drop/…json.gz | --latest> [out.json]
import { list } from '@vercel/blob';
import { gunzipSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

// `--latest` takes the newest drop, so a fresh session needs no code from David.
const code = process.argv[2];
const out = process.argv[3] ?? 'audit-reports/.fixtures/data-drop-david.json';
if (!code) { console.error('usage: read-data-drop.mjs <code | --latest> [out.json]'); process.exit(1); }
let blobs;
if (code === '--latest') {
  const all = [];
  let cursor;
  do { const page = await list({ prefix: 'data-drop/', cursor, limit: 1000 }); all.push(...page.blobs); cursor = page.cursor; } while (cursor);
  blobs = all.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)).slice(0, 1);
  if (blobs.length) console.log(`latest drop: ${blobs[0].pathname} (${blobs[0].uploadedAt})`);
} else {
  ({ blobs } = await list({ prefix: code, limit: 1 }));
}
if (!blobs.length) { console.error(`no drop at ${code}`); process.exit(1); }
const buf = Buffer.from(await (await fetch(blobs[0].url)).arrayBuffer());
const text = (buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf) : buf).toString('utf8');
writeFileSync(out, text);
const data = JSON.parse(text);
for (const [name, rows] of Object.entries(data.stores ?? {})) console.log(`${name}: ${Array.isArray(rows) ? rows.length : 0}`);
console.log(`→ ${out} (exported ${data.exportedAt}, build ${data.build})`);
