import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { logMisconception } from './misconceptionService';
import { getUnifiedWeaknessProfile, aggregateMistakePuzzles } from './weaknessSpine';
import { buildMistakePuzzle } from '../test/factories';
import type { MistakePuzzle } from '../types';

async function reset(): Promise<void> {
  await db.mistakePuzzles.clear();
  await db.misconceptionTags.clear();
}

beforeEach(reset);

const FEN_A = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
const FEN_B = 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';

describe('aggregateMistakePuzzles', () => {
  it('clusters tactic-typed mistakes by motif with a puzzle theme', () => {
    const rows: MistakePuzzle[] = [
      buildMistakePuzzle({ fen: FEN_A, playerMoveSan: 'Nf6', tacticType: 'fork', status: 'unsolved' }),
      buildMistakePuzzle({ fen: FEN_B, playerMoveSan: 'd3', tacticType: 'fork', status: 'solved' }),
    ];
    const out = aggregateMistakePuzzles(rows);
    expect(out).toHaveLength(1);
    expect(out[0].tag).toBe('analysis:tactic:fork');
    expect(out[0].total).toBe(2);
    expect(out[0].openCount).toBe(1); // only the unsolved one is "open"
    expect(out[0].puzzleThemes).toContain('fork');
    expect(out[0].sources).toEqual(['analysis']);
  });

  it('clusters non-tactic mistakes by game phase', () => {
    const rows: MistakePuzzle[] = [
      buildMistakePuzzle({ fen: FEN_A, playerMoveSan: 'h3', tacticType: null, gamePhase: 'opening' }),
      buildMistakePuzzle({ fen: FEN_B, playerMoveSan: 'a4', tacticType: null, gamePhase: 'endgame' }),
    ];
    const out = aggregateMistakePuzzles(rows);
    const tags = out.map((o) => o.tag).sort();
    expect(tags).toEqual(['analysis:phase:endgame', 'analysis:phase:opening']);
  });

  it('excludes positions already represented in the coach pipeline', () => {
    const rows: MistakePuzzle[] = [
      buildMistakePuzzle({ fen: FEN_A, playerMoveSan: 'Nf6', tacticType: 'fork' }),
    ];
    // Same position+move key as the mistake above → should be excluded.
    const core = FEN_A.split(' ').slice(0, 4).join(' ');
    const exclude = new Set([`${core}|Nf6`]);
    expect(aggregateMistakePuzzles(rows, exclude)).toHaveLength(0);
  });
});

describe('getUnifiedWeaknessProfile', () => {
  it('merges both pipelines into one ranked list', async () => {
    await logMisconception({ tag: 'hung-material', source: 'game-review', fen: FEN_B, playedSan: 'Qh5' });
    await db.mistakePuzzles.add(buildMistakePuzzle({ fen: FEN_A, playerMoveSan: 'Nf6', tacticType: 'fork', status: 'unsolved' }));

    const profile = await getUnifiedWeaknessProfile();
    const tags = profile.map((p) => p.tag);
    expect(tags).toContain('hung-material'); // coach pipeline
    expect(tags).toContain('analysis:tactic:fork'); // Analyze pipeline
    expect(profile.every((p) => p.openCount > 0)).toBe(true);
  });

  it('counts a mistake caught by BOTH pipelines once (dedup by position)', async () => {
    // Coach captured this exact position+move...
    await logMisconception({ tag: 'missed-tactic', source: 'game-review', fen: FEN_A, playedSan: 'Nf6' });
    // ...and so did the Analyze pass.
    await db.mistakePuzzles.add(buildMistakePuzzle({ fen: FEN_A, playerMoveSan: 'Nf6', tacticType: 'fork' }));

    const profile = await getUnifiedWeaknessProfile();
    // The Analyze fork row must NOT appear — its only position is the
    // one the coach already owns.
    expect(profile.map((p) => p.tag)).not.toContain('analysis:tactic:fork');
    expect(profile.map((p) => p.tag)).toContain('missed-tactic');
  });

  it('returns empty when there are no mistakes anywhere', async () => {
    expect(await getUnifiedWeaknessProfile()).toEqual([]);
  });
});
