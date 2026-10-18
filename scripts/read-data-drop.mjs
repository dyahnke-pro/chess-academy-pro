#!/usr/bin/env node
// Read a "Send my data to Claude" drop (api/data-drop.ts) by the code the
// student pasted. Needs BLOB_READ_WRITE_TOKEN (Vercel project env — pull it
// with the Vercel API the same way as every other server credential).
//   BLOB_READ_WRITE_TOKEN=… node scripts/read-data-drop.mjs data-drop/<…>.json.gz [out.json]
import { list } from '@vercel/blob';
import { gunzipSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const code = process.argv[2];
const out = process.argv[3] ?? 'audit-reports/.fixtures/data-drop.json';
if (!code) { console.error('usage: read-data-drop.mjs <code> [out.json]'); process.exit(1); }
const { blobs } = await list({ prefix: code, limit: 1 });
if (!blobs.length) { console.error(`no drop at ${code}`); process.exit(1); }
const buf = Buffer.from(await (await fetch(blobs[0].url)).arrayBuffer());
const text = (buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf) : buf).toString('utf8');
writeFileSync(out, text);
const data = JSON.parse(text);
for (const [name, rows] of Object.entries(data.stores ?? {})) console.log(`${name}: ${Array.isArray(rows) ? rows.length : 0}`);
console.log(`→ ${out} (exported ${data.exportedAt}, build ${data.build})`);
