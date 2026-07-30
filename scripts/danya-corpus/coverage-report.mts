// Which openings the app teaches can actually reach teaching notes, and which
// come back empty. Run with tsx so it calls the REAL service — a report that
// re-implements the matcher measures the copy, not what ships:
//
//   npx tsx scripts/danya-corpus/coverage-report.mts [--json]
//
// Reads both corpora through the same seam the coach uses, so "uncovered" here
// means "the coach finds nothing for this opening", not "no tag string matched".

import { readFileSync } from 'node:fs';
import { notesForOpening } from '../../src/services/danyaTeachingService';
import { notesForOpening as chessbrahNotesForOpening } from '../../src/services/chessbrahTeachingService';

interface NamedOpening { id: string; name: string }

function load(path: string): NamedOpening[] {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  const list = Array.isArray(raw)
    ? raw
    : ((raw as { openings?: unknown[]; repertoires?: unknown[] }).openings
      ?? (raw as { repertoires?: unknown[] }).repertoires
      ?? []);
  return (list as NamedOpening[]).filter((o) => typeof o?.name === 'string');
}

const PROBE = 40;

function main(): void {
  const rows: Array<{ src: string; name: string; danya: number; brah: number }> = [];
  const seen = new Set<string>();
  for (const [src, path] of [
    ['masterclass', 'src/data/repertoire.json'],
    ['pro', 'src/data/pro-repertoires.json'],
  ] as const) {
    for (const o of load(path)) {
      const key = `${src}::${o.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        src,
        name: o.name,
        danya: notesForOpening(o.name, PROBE).length,
        brah: chessbrahNotesForOpening(o.name, PROBE).length,
      });
    }
  }

  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
    return;
  }

  const dark = rows.filter((r) => r.danya === 0 && r.brah === 0);
  const rescued = rows.filter((r) => r.danya === 0 && r.brah > 0);
  console.log(`${rows.length} openings · ${rows.filter((r) => r.danya > 0).length} reach Naroditsky notes`
    + ` · ${rescued.length} covered only by the second corpus · ${dark.length} still dark`);
  if (rescued.length > 0) {
    console.log('\n── covered by the second corpus only');
    for (const r of rescued) console.log(`   ${String(r.brah).padStart(3)}  ${r.src.padEnd(11)} ${r.name}`);
  }
  if (dark.length > 0) {
    console.log('\n── no teaching notes from any corpus');
    for (const r of dark) console.log(`        ${r.src.padEnd(11)} ${r.name}`);
  }
}

main();
