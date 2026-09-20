// MEASUREMENT, not a gate (WO-CLOSEOUT-01 item 6, 2026-09-20). How far does the
// corpus REACH the two tiers the un-positioned notes feed — the phase-transition
// ritual and the LESSON BACKGROUND block — across the repertoire's openings,
// with the FULL corpus loaded (nothing in vitest fetches it; `loadFullCorpus`
// does). Prints the numbers and writes `audit-reports/corpus-reach.json`. The
// only assertion is non-vacuity: it measured real openings.
import { describe, it, expect, beforeAll } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import repertoire from '../data/repertoire.json';
import { loadFullCorpus } from '../test/loadFullCorpus';
import { transitionTeachingForGame, buildDanyaTeachingBlock } from './danyaTeachingService';

interface RepEntry { id: string; name: string; pgn: string }
const OPENINGS = (repertoire as unknown as RepEntry[]).filter((r) => typeof r.pgn === 'string' && r.pgn.trim().length > 0).slice(0, 24);

describe('corpus reach — transition ritual + lesson background, full corpus', () => {
  beforeAll(async () => { await Promise.resolve(loadFullCorpus()); }, 120_000);

  it('measures every repertoire opening (non-vacuous) and records the numbers', () => {
    const rows = OPENINGS.map((o) => {
      const c = new Chess();
      let sans: string[] = [];
      try { c.loadPgn(o.pgn); sans = c.history(); } catch { sans = []; }
      // The transition ritual fires around the opening→middlegame seam: probe
      // at 12, 16 and 20 plies (or the line's end) and count any hit.
      const probes = [12, 16, 20].map((n) => Math.min(n, sans.length)).filter((n) => n > 0);
      let transition = false;
      for (const n of probes) {
        const pos = new Chess(); for (const s of sans.slice(0, n)) pos.move(s);
        if (transitionTeachingForGame({ historySans: sans.slice(0, n), fen: pos.fen(), openingName: o.name })) { transition = true; break; }
      }
      const background = buildDanyaTeachingBlock({ historySans: sans.slice(0, Math.min(12, sans.length)), openingName: o.name, fen: null }).length > 0;
      return { id: o.id, name: o.name, plies: sans.length, transition, background };
    });
    const t = rows.filter((r) => r.transition).length;
    const b = rows.filter((r) => r.background).length;
    const summary = { measuredAt: new Date().toISOString(), openings: rows.length, transitionReach: t, backgroundReach: b, rows };
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/corpus-reach.json', JSON.stringify(summary, null, 2));
    console.log(`[corpus reach] ${rows.length} openings — transition ritual ${t}/${rows.length}, lesson background ${b}/${rows.length}`);
    for (const r of rows) console.log(`  ${r.transition ? 'T' : '-'}${r.background ? 'B' : '-'}  ${r.name} (${r.plies} plies)`);
    expect(rows.length).toBeGreaterThanOrEqual(10);
  });
});
