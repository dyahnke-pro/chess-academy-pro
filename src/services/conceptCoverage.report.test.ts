/**
 * conceptCoverage.report — the P1 validation harness for the computed-concept
 * engine, as an env-gated vitest report (docs/plans/2026-09-14-computed-concept-
 * detectors.md). "The puzzles are the test bench because we already know the
 * solutions" (David 2026-09-14).
 *
 * Runs as a TEST (not a tsx script) so the stockfish-native import chain that
 * conceptForSolution pulls in via pvPlayback resolves under the mocked test env —
 * a plain `tsx` script dies on `capacitor-stockfish-native`.
 *
 * SKIPPED by default (it reads the full puzzle corpus and runs detectTactics over
 * a large sample — too slow for ship-check). Run it on demand:
 *   RUN_CONCEPT_COVERAGE=1 npx vitest run src/services/conceptCoverage.report.test.ts
 * Optional CONCEPT_COVERAGE_SAMPLE=<n>. Writes audit-reports/concept-coverage.json.
 *
 * Reports THREE honest buckets, NOT a single coverage number: agree (a concept
 * fires AND matches a known theme), fires-no-tag (fires, no matching theme —
 * tag-missing OR detector-wrong, sampled for triage), silent (the honest floor).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { conceptForSolution } from './conceptEngine';

const RUN = process.env.RUN_CONCEPT_COVERAGE === '1';

interface Puzzle { id: string; fen: string; moves: string; themes: string[]; }

/** concept id → the Lichess theme(s) that would corroborate it. */
const CONCEPT_THEMES: Record<string, string[]> = {
  fork: ['fork'], pin: ['pin'], skewer: ['skewer'],
  discovery: ['discoveredAttack', 'discoveredCheck'], double_check: ['doubleCheck'],
  back_rank: ['backRankMate'], removal_of_guard: ['capturingDefender'],
  trapped_piece: ['trappedPiece'], overload: ['overloading'],
  mate_threat: ['mate', 'mateIn1', 'mateIn2', 'mateIn3', 'mateIn4', 'mateIn5'],
  opposition: ['pawnEndgame'],
  'rook-endgame': ['rookEndgame'], 'kp-vs-k': ['pawnEndgame'],
  'pawn-endgame': ['pawnEndgame'], 'knight-endgame': ['knightEndgame'],
  'queen-endgame': ['queenEndgame'], 'queen-vs-rook': ['queenRookEndgame'],
  'opposite-bishops': ['bishopEndgame'], 'same-bishops': ['bishopEndgame'],
  'bishop-vs-knight': ['bishopEndgame', 'knightEndgame'],
  'minor-endgame': ['bishopEndgame', 'knightEndgame'],
};

describe('concept coverage report (env-gated)', () => {
  (RUN ? it : it.skip)('reports agree / fires-no-tag / silent over the master corpus', () => {
    const root = process.cwd();
    const master: Puzzle[] = JSON.parse(
      fs.readFileSync(path.join(root, 'public/data/master-puzzles.json'), 'utf8'),
    );
    const sampleSize = Number(process.env.CONCEPT_COVERAGE_SAMPLE ?? master.length);
    const sample = master.slice(0, sampleSize);

    const oldThemeMap = new Set(['fork', 'pin', 'skewer', 'discoveredAttack', 'discoveredCheck', 'backRankMate', 'capturingDefender', 'trappedPiece', 'overloading', 'deflection', 'attraction', 'clearance', 'interference', 'sacrifice']);
    let agree = 0, firesNoTag = 0, silent = 0, oldCovered = 0;
    const leadDist: Record<string, number> = {};
    const triageSample: string[] = [];

    for (const p of sample) {
      if ((p.themes ?? []).some((t) => oldThemeMap.has(t))) oldCovered += 1;
      const concepts = conceptForSolution(p.fen, p.moves.trim().split(/\s+/));
      if (concepts.length === 0) { silent += 1; continue; }
      leadDist[concepts[0].name] = (leadDist[concepts[0].name] ?? 0) + 1;
      const tset = new Set(p.themes ?? []);
      if (concepts.some((c) => (CONCEPT_THEMES[c.id] ?? []).some((t) => tset.has(t)))) {
        agree += 1;
      } else {
        firesNoTag += 1;
        if (triageSample.length < 25) triageSample.push(`${p.id} [${(p.themes ?? []).join(',')}] → ${concepts[0].name}`);
      }
    }

    const n = sample.length;
    const pct = (x: number): string => `${((100 * x) / n).toFixed(1)}%`;
    const report = {
      generatedAt: new Date().toISOString(), sample: n,
      old_theme_map_coverage: { count: oldCovered, pct: pct(oldCovered) },
      agree: { count: agree, pct: pct(agree) },
      fires_no_tag: { count: firesNoTag, pct: pct(firesNoTag) },
      silent: { count: silent, pct: pct(silent) },
      lead_distribution: leadDist, fires_no_tag_sample: triageSample,
    };
    fs.mkdirSync(path.join(root, 'audit-reports'), { recursive: true });
    fs.writeFileSync(path.join(root, 'audit-reports/concept-coverage.json'), JSON.stringify(report, null, 2));

    // eslint-disable-next-line no-console
    console.log(`concept coverage: OLD ${pct(oldCovered)} | AGREE ${pct(agree)} | FIRES-NO-TAG ${pct(firesNoTag)} | SILENT ${pct(silent)} (n=${n})`);
    expect(agree + firesNoTag + silent).toBe(n);
  }, 600_000);
});
