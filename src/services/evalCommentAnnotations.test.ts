import { describe, it, expect, vi } from 'vitest';

vi.mock('./openingDetectionService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./openingDetectionService')>()),
  // Only the first two plies count as theory for this fixture.
  isBookLine: (moves: readonly string[]) => moves.length <= 2,
}));

import { annotationsFromEvalComments, EVAL_COMMENT_ANALYSIS_DEPTH } from './gameImportUtils';

// A lichess PGN with server analysis carries one [%eval] after EVERY move.
const FULL = `[Event "Rated Blitz game"]
[Site "https://lichess.org/abc"]

1. e4 { [%eval 0.3] } e5 { [%eval 0.2] } 2. Nf3 { [%eval 0.3] } Nc6 { [%eval 0.2] } 3. Bb5 { [%eval -3.0] } a6 { [%eval -3.1] } 1-0`;

describe('annotationsFromEvalComments — lichess server evals become the full curve', () => {
  it('produces one annotation per ply, with the eval after and before each move', () => {
    const anns = annotationsFromEvalComments(FULL);
    expect(anns).not.toBeNull();
    expect(anns).toHaveLength(6);
    expect(anns![0]).toMatchObject({ moveNumber: 1, color: 'white', san: 'e4', evaluation: 30, bestMoveEval: 0 });
    expect(anns![3]).toMatchObject({ moveNumber: 2, color: 'black', san: 'Nc6', evaluation: 20, bestMoveEval: 30 });
  });

  it('grades with the review thresholds — 3.Bb5 drops 330cp and is a blunder', () => {
    const anns = annotationsFromEvalComments(FULL)!;
    expect(anns[4].classification).toBe('blunder');
    expect(anns[5].classification).toBe('good');
  });

  it('keeps the book exemption for theory moves', () => {
    const anns = annotationsFromEvalComments(FULL)!;
    expect(anns[0].classification).toBe('book');
    expect(anns[1].classification).toBe('book');
  });

  it('never carries a best move (the comments have none) — the review dive fills it', () => {
    const anns = annotationsFromEvalComments(FULL)!;
    expect(anns.every((a) => a.bestMove === null)).toBe(true);
    // …which is why the stamped depth stays below the review's ceiling.
    expect(EVAL_COMMENT_ANALYSIS_DEPTH).toBeLessThan(16);
  });

  it('returns null when the evals do not cover every ply — a partial curve would lie', () => {
    const partial = '1. e4 { [%eval 0.3] } e5 2. Nf3 { [%eval 0.3] } Nc6 1-0';
    expect(annotationsFromEvalComments(partial)).toBeNull();
    expect(annotationsFromEvalComments('1. e4 e5 2. Nf3 Nc6 1-0')).toBeNull();
  });
});
