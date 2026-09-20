// 🔒 THE FUNDAMENTAL THE COMPUTER PROVED REACHES THE RANKER (A-NEW, 2026-09-19).
//
// Two defects, one root, both measured on 47 real games before this landed:
//   1. batch analysis writes every misconception row `counted: false` AND a
//      `mistakePuzzle` twin at the same position; the spine excluded the twin
//      as "coach-owned" and the row as "not counted" — the slip vanished from
//      the unified profile on BOTH sides. 79 attributed fundamentals, 0 read.
//   2. `fundamentalId` lives only on those rows, so no consumer of the spine
//      could ever see a fundamental at all.
// Each test here is a real Dexie round trip through getUnifiedWeaknessProfile,
// with negative controls so the gate cannot pass on an empty store.
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { logMisconception } from './misconceptionService';
import {
  getUnifiedWeaknessProfile,
  aggregateFundamentals,
  fundamentalClusterId,
  FUNDAMENTAL_CLUSTER_PREFIX,
} from './weaknessSpine';
import { buildWeaknessSignals, matchClauseKind, matchFundamental, matchTag } from './weaknessSignal';
import { FUNDAMENTAL_TAG } from './principleAttribution';
import { getMisconceptionTag } from '../data/misconceptionTags';
import { buildMistakePuzzle } from '../test/factories';

// Two real positions (fen BEFORE the move) — distinct so posKey never collides.
const FEN_A = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
const FEN_B = 'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 1 2';

async function reset(): Promise<void> {
  await db.mistakePuzzles.clear();
  await db.misconceptionTags.clear();
  await db.openingWeakSpots.clear();
  await db.classifiedTactics.clear();
  await db.games.clear();
  await db.findSquareAttempts.clear();
  await db.table('meta').clear();
}

describe('weaknessSpine — a batch-analyzed slip is not lost on both sides', () => {
  beforeEach(reset);

  it('a counted:false row plus its mistakePuzzle twin → the slip appears ONCE, on the analysis side', async () => {
    // The exact shape autoAnalyzeGame writes: display-only misconception + drillable twin.
    await logMisconception({ tag: 'hung-material', source: 'auto-analysis', fen: FEN_A, playedSan: 'Nc3', counted: false, sourceGameId: 'g1' });
    await db.mistakePuzzles.add(buildMistakePuzzle({ fen: FEN_A, playerMoveSan: 'Nc3', tacticType: 'fork', sourceGameId: 'g1' }));

    const profile = await getUnifiedWeaknessProfile();
    const tags = profile.map((p) => p.tag);
    // The twin is NOT excluded any more — the coach half never showed this row.
    expect(tags).toContain('analysis:tactic:fork');
    // And the tag row is still left alone: counted:false never becomes a coach row.
    expect(tags).not.toContain('hung-material');
    // Exactly one row carries the position.
    const carriers = profile.filter((p) => p.positions.some((x) => x.fen === FEN_A && x.playedSan === 'Nc3'));
    expect(carriers.map((c) => c.tag)).toEqual(['analysis:tactic:fork']);
  });

  it('negative control: a COUNTED coach row still owns its position and the twin is deduped away', async () => {
    await logMisconception({ tag: 'missed-tactic', source: 'game-review', fen: FEN_A, playedSan: 'Nc3' });
    await db.mistakePuzzles.add(buildMistakePuzzle({ fen: FEN_A, playerMoveSan: 'Nc3', tacticType: 'fork' }));
    const profile = await getUnifiedWeaknessProfile();
    expect(profile.map((p) => p.tag)).toContain('missed-tactic');
    expect(profile.map((p) => p.tag)).not.toContain('analysis:tactic:fork');
  });
});

describe('weaknessSpine — attributed fundamentals reach the ranker', () => {
  beforeEach(reset);

  it('rows carrying fundamentalId become fundamental:<id> rows, counted or not; tag rows are untouched', async () => {
    // Two batch rows (counted:false) on the same fundamental, one live row (counted) on another.
    await logMisconception({ tag: FUNDAMENTAL_TAG['loose-piece'], fundamentalId: 'loose-piece', source: 'auto-analysis', fen: FEN_A, playedSan: 'Nc3', counted: false, sourceGameId: 'g1' });
    await logMisconception({ tag: FUNDAMENTAL_TAG['loose-piece'], fundamentalId: 'loose-piece', source: 'auto-analysis', fen: FEN_B, playedSan: 'd5', counted: false, sourceGameId: 'g2' });
    await logMisconception({ tag: FUNDAMENTAL_TAG['tempo-handed'], fundamentalId: 'tempo-handed', source: 'game-review', fen: FEN_B, playedSan: 'a3' });

    const profile = await getUnifiedWeaknessProfile();
    const loose = profile.find((p) => p.key === fundamentalClusterId('loose-piece'));
    expect(loose, `no loose-piece row: ${profile.map((p) => p.key).join(', ')}`).toBeTruthy();
    expect(loose!.total).toBe(2);
    expect(loose!.openCount).toBe(2); // fresh captures are due
    expect(loose!.label).toBe('Loose piece');
    // Bucket + drill themes come from the fundamental's own closed-set tag — one join.
    const def = getMisconceptionTag(FUNDAMENTAL_TAG['loose-piece']);
    expect(loose!.bucket).toBe(def!.bucket);
    expect(loose!.puzzleThemes).toEqual(def!.drill.puzzleThemes ?? []);
    expect(loose!.sources).toEqual(['analysis']);
    // Provenance rides along.
    expect(loose!.positions.map((x) => x.from.gameId).sort()).toEqual(['g1', 'g2']);

    const tempo = profile.find((p) => p.key === fundamentalClusterId('tempo-handed'));
    expect(tempo!.total).toBe(1);
    expect(tempo!.sources).toEqual(['coach']);

    // THE TAG IS LEFT ALONE: the counted:false loose-piece rows do not inflate
    // their tag row (there is none), and the counted tempo row keeps its own.
    expect(profile.some((p) => p.tag === FUNDAMENTAL_TAG['loose-piece'])).toBe(false);
    const tempoTag = profile.find((p) => p.tag === FUNDAMENTAL_TAG['tempo-handed']);
    expect(tempoTag?.total).toBe(1);
  });

  it('an unknown fundamentalId never invents a row', () => {
    const rows = aggregateFundamentals([{
      id: 'x', tag: 'other', customLabel: 'weird', fundamentalId: 'not-a-fundamental', source: 'auto-analysis',
      createdAt: Date.now(), fen: FEN_A, status: 'open', masteryHits: 0, dueAt: Date.now(), counted: false,
    }]);
    expect(rows).toEqual([]);
  });

  it('negative control: no rows → no fundamental rows', async () => {
    expect((await getUnifiedWeaknessProfile()).filter((p) => p.key.startsWith(FUNDAMENTAL_CLUSTER_PREFIX))).toEqual([]);
  });

  it('the ranker can JOIN them: matchFundamental is exact, matchClauseKind(fundamental) reaches them, matchTag by cluster id', async () => {
    await logMisconception({ tag: FUNDAMENTAL_TAG['loose-piece'], fundamentalId: 'loose-piece', source: 'auto-analysis', fen: FEN_A, playedSan: 'Nc3', counted: false });
    const signals = buildWeaknessSignals(await getUnifiedWeaknessProfile(), null);
    expect(matchFundamental('loose-piece', signals)?.clusterId).toBe('fundamental:loose-piece');
    expect(matchFundamental('tempo-handed', signals)).toBeNull(); // grey, never guessed
    expect(matchTag('fundamental:loose-piece', signals)?.label).toBe('Loose piece');
    expect(matchClauseKind('fundamental', signals)?.clusterId).toBe('fundamental:loose-piece');
  });
});
