#!/usr/bin/env node
// Gate D retro-scan: compare every registered lesson's deepest-beat move
// skeleton against its entry's data line (main pgn / variation pgn).
// Classifications:
//   aligned         — one is a prefix of the other (within 6 plies)
//   SHALLOW-LESSON  — lesson stops >6 plies before the data line's terminus
//   DIVERGES@k      — the skeletons split at ply k (curated-vs-drill split,
//                     or a lesson left on a superseded line)
// NOTE (2026-07-15 verdict): every lesson terminus is engine-cleared by the
// soundness sweep, so DIVERGES rows are mostly the deliberate curated-lesson
// vs drill-line architecture. Treat a row as a DEFECT only when the data line
// was rebuilt for soundness and the lesson still teaches the refuted line.
import { build } from 'esbuild';
import { tmpdir } from 'os';
import { join } from 'path';
import fs from 'fs';

const o = join(tmpdir(), `gated-${Date.now()}.mjs`);
await build({ entryPoints: ['src/data/lessons/index.ts'], bundle: true, format: 'esm', platform: 'node', outfile: o, loader: { '.json': 'json' }, logLevel: 'error' });
const { getAllLessonScripts } = await import(o);

const repertoire = JSON.parse(fs.readFileSync('src/data/repertoire.json', 'utf8'));
const pro = JSON.parse(fs.readFileSync('src/data/pro-repertoires.json', 'utf8')).openings;
const anti = JSON.parse(fs.readFileSync('src/data/anti-openings.json', 'utf8'));
const entries = new Map();
for (const e of [...repertoire, ...pro, ...anti]) entries.set(e.id, e);

function lineOf(key) {
  const [oid, vname] = key.includes('::') ? key.split('::') : [key, null];
  const e = entries.get(oid);
  if (!e) return null;
  if (!vname) return e.pgn ?? null;
  return (e.variations ?? []).find((v) => v.name === vname)?.pgn ?? null;
}

const rows = [];
for (const { key, lesson } of getAllLessonScripts()) {
  const pgn = lineOf(key);
  if (!pgn) continue;
  const dataSans = pgn.trim().split(/\s+/);
  let bt = lesson.beats[0];
  for (const b of lesson.beats) if (b.moves.length > bt.moves.length) bt = b;
  const lessonSans = bt.moves;
  const n = Math.min(dataSans.length, lessonSans.length);
  let k = -1;
  for (let i = 0; i < n; i++) if (dataSans[i] !== lessonSans[i]) { k = i; break; }
  if (k === -1) {
    if (lessonSans.length < dataSans.length - 6) rows.push(`SHALLOW-LESSON ${key} lesson=${lessonSans.length}p data=${dataSans.length}p`);
    continue;
  }
  rows.push(`DIVERGES@${k} ${key} lesson:${lessonSans.slice(Math.max(0, k - 1), k + 2).join(' ')} vs data:${dataSans.slice(Math.max(0, k - 1), k + 2).join(' ')} (lesson ${lessonSans.length}p, data ${dataSans.length}p)`);
}
console.log(`GATE-D rows: ${rows.length}`);
for (const r of rows) console.log('  ' + r);
fs.mkdirSync('audit-reports/masterclass-sweep', { recursive: true });
fs.writeFileSync('audit-reports/masterclass-sweep/gated-skeletons.txt', rows.join('\n') + '\n');
