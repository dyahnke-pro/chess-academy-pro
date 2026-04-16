import { describe, it, expect, vi } from 'vitest';
import { buildStepsFromPgn, buildSession } from './walkthroughAdapter';
import type { OpeningMoveAnnotation } from '../types';

describe('buildStepsFromPgn', () => {
  it('produces one step per move with computed SAN and fenAfter', () => {
    const steps = buildStepsFromPgn({ pgn: 'e4 e5 Nf3' });
    expect(steps).toHaveLength(3);
    expect(steps.map(s => s.san)).toEqual(['e4', 'e5', 'Nf3']);
    expect(steps[0].fenAfter).toContain('pppppppp');
    expect(steps[2].fenAfter).toContain('N');
  });

  it('embeds narration from parallel annotations', () => {
    const annotations: OpeningMoveAnnotation[] = [
      { san: 'e4', annotation: 'King pawn opening.' },
      { san: 'e5', annotation: 'Classical reply.' },
    ];
    const steps = buildStepsFromPgn({ pgn: 'e4 e5', annotations });
    expect(steps[0].narration).toBe('King pawn opening.');
    expect(steps[1].narration).toBe('Classical reply.');
  });

  it('returns an empty narration when annotation text is missing', () => {
    // Previously the adapter fell back to `${san}.` which produced
    // the chant-like "Bg2. C6. B7." lesson that users hated. Silent
    // auto-advance is preferable — the board itself tells the student
    // what was played.
    const annotations: OpeningMoveAnnotation[] = [
      { san: 'e4', annotation: '' },
    ];
    const steps = buildStepsFromPgn({ pgn: 'e4', annotations });
    expect(steps[0].narration).toBe('');
  });

  it('carries arrows, highlights, pawnStructure, and first plan as coachHint', () => {
    const annotations: OpeningMoveAnnotation[] = [
      {
        san: 'e4',
        annotation: 'Center pawn.',
        pawnStructure: 'Open center',
        plans: ['Develop knights', 'Castle short'],
        arrows: [{ from: 'e2', to: 'e4' }],
        highlights: [{ square: 'e4' }],
      },
    ];
    const [step] = buildStepsFromPgn({ pgn: 'e4', annotations });
    expect(step.pawnStructure).toBe('Open center');
    expect(step.coachHint).toBe('Develop knights');
    expect(step.arrows).toEqual([{ from: 'e2', to: 'e4' }]);
    expect(step.highlights).toEqual([{ square: 'e4' }]);
  });

  it('warns and aborts when PGN contains an illegal move', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const steps = buildStepsFromPgn({ pgn: 'e4 e9', source: 'test' });
    expect(steps).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('illegal SAN'),
      expect.objectContaining({ source: 'test' }),
    );
    warn.mockRestore();
  });

  it('warns when the annotation SAN mismatches the computed SAN', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const annotations: OpeningMoveAnnotation[] = [
      { san: 'Bd3', annotation: 'pawn to a3' }, // intentional mismatch
    ];
    buildStepsFromPgn({ pgn: 'a3', annotations });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('san mismatch'),
      expect.any(Object),
    );
    warn.mockRestore();
  });

  it('starts from a custom FEN when provided', () => {
    // Black to move in the Italian
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
    const steps = buildStepsFromPgn({ pgn: 'Nf6', startFen: fen });
    expect(steps).toHaveLength(1);
    expect(steps[0].san).toBe('Nf6');
  });

  it('assigns moveNumber with white-black pairing', () => {
    const steps = buildStepsFromPgn({ pgn: 'e4 e5 Nf3 Nc6 Bc4' });
    expect(steps.map(s => s.moveNumber)).toEqual([1, 1, 2, 2, 3]);
  });
});

describe('buildSession', () => {
  it('wraps buildStepsFromPgn in a WalkthroughSession with defaults', () => {
    const session = buildSession({
      title: "King's Gambit",
      pgn: 'e4 e5 f4',
    });
    expect(session.title).toBe("King's Gambit");
    expect(session.orientation).toBe('white');
    expect(session.kind).toBe('opening');
    expect(session.steps).toHaveLength(3);
  });

  it('respects explicit orientation and kind', () => {
    const session = buildSession({
      title: 'Sicilian Najdorf',
      pgn: 'e4 c5',
      orientation: 'black',
      kind: 'middlegame',
    });
    expect(session.orientation).toBe('black');
    expect(session.kind).toBe('middlegame');
  });
});
