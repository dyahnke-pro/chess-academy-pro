// MEASUREMENT, not a gate (WO-CLOSEOUT-01 item 6, 2026-09-20). How far does the
// corpus REACH the LESSON BACKGROUND block the un-positioned notes feed (the
// phase-transition ritual that was the other tier is deleted) — across the repertoire's openings,
// with the FULL corpus loaded (nothing in vitest fetches it; `loadFullCorpus`
// does). Prints the numbers and writes `audit-reports/corpus-reach.json`. The
// only assertion is non-vacuity: it measured real openings.
import { describe, it, expect, beforeAll } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import repertoire from '../data/repertoire.json';
import { loadFullCorpus, unprimedCorpora } from '../test/loadFullCorpus';
import { buildDanyaTeachingBlock } from './danyaTeachingService';

interface RepEntry { id: string; name: string; pgn: string }
const OPENINGS = (repertoire as unknown as RepEntry[]).filter((r) => typeof r.pgn === 'string' && r.pgn.trim().length > 0).slice(0, 24);

describe('corpus reach — lesson background, full corpus', () => {
  // THE NON-VACUITY FLOOR. `loadFullCorpus` returns EMPTY bundles by design
  // when `public/data/*.json` is missing, and this whole measurement is about
  // what the corpus reaches — so without this assertion a missing file would
  // be reported as "reach measured" over nothing at all. Asserted on the
  // loaded note count, not on the reach numbers, so it fails at the cause.
  beforeAll(async () => {
    const loaded = await Promise.resolve(loadFullCorpus());
    // Derived from the registry, never a count — a hard-coded floor went stale
    // when the anchored farms were retired (see `unprimedCorpora`).
    expect(unprimedCorpora(loaded), `corpora loaded: ${JSON.stringify(loaded)}`).toEqual([]);
  }, 120_000);

  it('measures every repertoire opening (non-vacuous) and records the numbers', () => {
    const rows = OPENINGS.map((o) => {
      const c = new Chess();
      let sans: string[] = [];
      try { c.loadPgn(o.pgn); sans = c.history(); } catch { sans = []; }
      const background = buildDanyaTeachingBlock({ historySans: sans.slice(0, Math.min(12, sans.length)), openingName: o.name, fen: null }).length > 0;
      return { id: o.id, name: o.name, plies: sans.length, background };
    });
    const b = rows.filter((r) => r.background).length;
    const summary = { measuredAt: new Date().toISOString(), openings: rows.length, backgroundReach: b, rows };
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/corpus-reach.json', JSON.stringify(summary, null, 2));
    console.log(`[corpus reach] ${rows.length} openings — lesson background ${b}/${rows.length}`);
    for (const r of rows) console.log(`  ${r.background ? 'B' : '-'}  ${r.name} (${r.plies} plies)`);
    expect(rows.length).toBeGreaterThanOrEqual(10);
  });
});
