/**
 * validate-concept-coverage — the P1 validation harness for the computed-concept
 * engine (docs/plans/2026-09-14-computed-concept-detectors.md). "The puzzles are
 * the test bench because we already know the solutions" (David 2026-09-14).
 *
 * Runs `conceptForBoard` over the puzzle corpora (replaying each solution the way
 * a puzzle surface will) and reports THREE honest buckets — NOT a single coverage
 * number, because a fired concept is not the same as the RIGHT concept:
 *   • agree        — a concept fires AND matches one of the puzzle's known themes.
 *   • fires-no-tag — a concept fires but matches no theme (tag-missing OR
 *                    detector-wrong; a sample is printed for human triage).
 *   • silent       — nothing fired (the honest floor; empty > invented).
 *
 * Usage: npx tsx scripts/validate-concept-coverage.mts [sampleSize]
 * Writes audit-reports/concept-coverage.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { conceptForSolution, type ComputedConcept } from '../src/services/conceptEngine.ts';

interface Puzzle { id: string; fen: string; moves: string; themes: string[]; }

/** conceptForBoard id → the Lichess theme(s) that would corroborate it. */
const CONCEPT_THEMES: Record<string, string[]> = {
  fork: ['fork'], pin: ['pin'], skewer: ['skewer'],
  discovery: ['discoveredAttack', 'discoveredCheck'], double_check: ['doubleCheck'],
  back_rank: ['backRankMate'], removal_of_guard: ['capturingDefender'],
  trapped_piece: ['trappedPiece'], overload: ['overloading'],
  mate_threat: ['mate', 'mateIn1', 'mateIn2', 'mateIn3', 'mateIn4', 'mateIn5'],
  'rook-endgame': ['rookEndgame'], 'kp-vs-k': ['pawnEndgame'],
  'pawn-endgame': ['pawnEndgame'], 'knight-endgame': ['knightEndgame'],
  'queen-endgame': ['queenEndgame'], 'queen-vs-rook': ['queenRookEndgame'],
  'opposite-bishops': ['bishopEndgame'], 'same-bishops': ['bishopEndgame'],
  'bishop-vs-knight': ['bishopEndgame', 'knightEndgame'],
  'minor-endgame': ['bishopEndgame', 'knightEndgame'],
  // major-piece / rook-vs-minor / rook-and-minor / battery / mating-material have
  // no single corroborating Lichess theme — a fire there is neither agree nor
  // wrong, it's uncorroborated (counted under fires-no-tag, sampled for review).
};

function conceptsForPuzzle(p: Puzzle): ComputedConcept[] {
  // The solution path: find the student move that LANDS the decisive tactic (by
  // computed swing) and teach THAT, plus the endgame matchup principle. This is
  // exactly how a puzzle surface teaches "the concept behind the solution".
  try { return conceptForSolution(p.fen, p.moves.trim().split(/\s+/)); } catch { return []; }
}

function agrees(concepts: ComputedConcept[], themes: string[]): boolean {
  const tset = new Set(themes);
  return concepts.some((c) => (CONCEPT_THEMES[c.id] ?? []).some((t) => tset.has(t)));
}

function main(): void {
  const root = path.resolve(import.meta.dirname, '..');
  const master: Puzzle[] = JSON.parse(fs.readFileSync(path.join(root, 'public/data/master-puzzles.json'), 'utf8'));
  const sampleSize = Number(process.argv[2] ?? master.length);
  const sample = master.slice(0, sampleSize);

  let agree = 0, firesNoTag = 0, silent = 0;
  const oldThemeMap = new Set(['fork', 'pin', 'skewer', 'discoveredAttack', 'discoveredCheck', 'backRankMate', 'capturingDefender', 'trappedPiece', 'overloading', 'deflection', 'attraction', 'clearance', 'interference', 'sacrifice']);
  let oldCovered = 0;
  const leadDist: Record<string, number> = {};
  const triageSample: string[] = [];

  for (const p of sample) {
    if ((p.themes ?? []).some((t) => oldThemeMap.has(t))) oldCovered += 1;
    const concepts = conceptsForPuzzle(p);
    if (concepts.length === 0) { silent += 1; continue; }
    leadDist[concepts[0].name] = (leadDist[concepts[0].name] ?? 0) + 1;
    if (agrees(concepts, p.themes ?? [])) {
      agree += 1;
    } else {
      firesNoTag += 1;
      if (triageSample.length < 25) triageSample.push(`${p.id} [${(p.themes ?? []).join(',')}] → ${concepts[0].name}`);
    }
  }

  const n = sample.length;
  const pct = (x: number): string => `${((100 * x) / n).toFixed(1)}%`;
  const report = {
    generatedAt: new Date().toISOString(),
    sample: n,
    old_theme_map_coverage: { count: oldCovered, pct: pct(oldCovered) },
    agree: { count: agree, pct: pct(agree) },
    fires_no_tag: { count: firesNoTag, pct: pct(firesNoTag) },
    silent: { count: silent, pct: pct(silent) },
    lead_distribution: leadDist,
    fires_no_tag_sample: triageSample,
  };
  const outDir = path.join(root, 'audit-reports');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'concept-coverage.json'), JSON.stringify(report, null, 2));

  console.log(`sample: ${n} master puzzles`);
  console.log(`OLD theme-map coverage:  ${oldCovered} (${pct(oldCovered)})`);
  console.log(`AGREE (concept matches a theme): ${agree} (${pct(agree)})`);
  console.log(`FIRES-NO-TAG (tag-missing or wrong — triage): ${firesNoTag} (${pct(firesNoTag)})`);
  console.log(`SILENT (honest floor): ${silent} (${pct(silent)})`);
  console.log('\nlead-concept distribution:');
  for (const [k, v] of Object.entries(leadDist).sort((a, b) => b[1] - a[1])) console.log('  ' + k.padEnd(28), v);
  console.log('\nfires-no-tag sample (human triage — tag-missing vs detector-wrong):');
  for (const e of triageSample) console.log('  ' + e);
}

main();
