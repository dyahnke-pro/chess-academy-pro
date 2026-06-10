import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  computeLeadEyeArrows,
  extractMentionedSans,
  resolveSanToArrow,
  colorForRank,
  injectCandidateArrows,
  stripBoardMarkers,
  type LineMove,
  type RankedCandidate,
} from './arrowEngine';

/** Replay a SAN line from a FEN into the LineMove shape the vision
 *  computers consume. */
function lineFrom(sans: string[], startFen?: string): LineMove[] {
  const c = startFen ? new Chess(startFen) : new Chess();
  const seq: LineMove[] = [];
  for (const san of sans) {
    const mv = c.move(san);
    seq.push({ from: mv.from, to: mv.to, color: mv.color, fen: c.fen() });
  }
  return seq;
}

describe('computeLeadEyeArrows (VISION)', () => {
  it('draws a threat arrow from a developed piece to what it eyes', () => {
    // Italian: after Bc4 the bishop eyes f7.
    const seq = lineFrom(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']);
    const arrows = computeLeadEyeArrows(seq);
    const bishopPly = arrows[arrows.length - 1]; // Bc4
    expect(bishopPly.some((a) => a.from === 'c4' && a.to === 'f7')).toBe(true);
  });

  it('never draws the move’s own from→to', () => {
    const seq = lineFrom(['e4']);
    for (const a of seq.flatMap((_, i) => computeLeadEyeArrows(seq)[i])) {
      expect(`${a.from}-${a.to}`).not.toBe('e2-e4');
    }
  });

  it('draws a look-ahead arrow when the same piece moves again later', () => {
    // Knight goes f3 then later e5 — f3 ply should look ahead to e5.
    const seq = lineFrom(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6', 'dxc6', 'Nxe5']);
    const nf3Ply = computeLeadEyeArrows(seq)[2]; // Nf3
    expect(nf3Ply.some((a) => a.from === 'f3' && a.to === 'e5')).toBe(true);
  });

  it('returns at most 2 arrows per ply', () => {
    const seq = lineFrom(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']);
    for (const ply of computeLeadEyeArrows(seq)) {
      expect(ply.length).toBeLessThanOrEqual(2);
    }
  });
});

describe('extractMentionedSans', () => {
  it('finds piece + pawn moves in prose', () => {
    expect(extractMentionedSans('White has Nf3 hitting e5, then exd5 opens lines.')).toEqual(
      expect.arrayContaining(['Nf3', 'exd5']),
    );
  });

  it('ignores descriptive square references', () => {
    const sans = extractMentionedSans('The e4 square is weak; the d-file is open.');
    expect(sans).not.toContain('e4');
  });

  it('does not match coordinates inside an arrow marker', () => {
    const sans = extractMentionedSans('Solid. [BOARD: arrow:e2-e4:green]');
    expect(sans).toHaveLength(0);
  });
});

describe('resolveSanToArrow', () => {
  it('resolves a legal move to from→to', () => {
    expect(resolveSanToArrow('Nf3', [new Chess().fen()])).toEqual({ from: 'g1', to: 'f3' });
  });

  it('resolves an opponent/hypothetical move via the turn-flip retry', () => {
    // White to move, but the coach mentions a Black move (...Bc5).
    const fen = new Chess('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2').fen();
    expect(resolveSanToArrow('Bc5', [fen])).toEqual({ from: 'f8', to: 'c5' });
  });

  it('returns null for an illegal move', () => {
    expect(resolveSanToArrow('Qh5xz', [new Chess().fen()])).toBeNull();
  });
});

describe('colorForRank', () => {
  it('maps engine rank to color', () => {
    expect(colorForRank(1)).toBe('green');
    expect(colorForRank(2)).toBe('blue');
    expect(colorForRank(3)).toBe('yellow');
    expect(colorForRank(4)).toBe('red');
    expect(colorForRank(null)).toBe('red');
  });
});

describe('injectCandidateArrows', () => {
  const start = new Chess().fen();

  it('injects a code-derived, engine-colored marker for a mentioned move', async () => {
    const analyze = async (): Promise<RankedCandidate[]> => [{ from: 'g1', to: 'f3', rank: 1 }];
    const { text, injected } = await injectCandidateArrows('Develop with Nf3.', start, analyze);
    expect(text).toContain('[BOARD: arrow:g1-f3:green]');
    expect(injected).toEqual([{ san: 'Nf3', color: 'green' }]);
  });

  it('colors an unranked (off-top-3) mention red', async () => {
    const analyze = async (): Promise<RankedCandidate[]> => [{ from: 'e2', to: 'e4', rank: 1 }];
    const { text } = await injectCandidateArrows('Avoid the loose Nh3.', start, analyze);
    expect(text).toContain('[BOARD: arrow:g1-h3:red]');
  });

  it('strips any LLM-emitted markers and re-derives', async () => {
    const analyze = async (): Promise<RankedCandidate[]> => [{ from: 'g1', to: 'f3', rank: 1 }];
    const { text } = await injectCandidateArrows(
      'Nf3 is best. [BOARD: arrow:a1-a8:red]',
      start,
      analyze,
    );
    expect(text).not.toContain('a1-a8');
    expect(text).toContain('[BOARD: arrow:g1-f3:green]');
  });

  it('no-ops (no markers) when the prose mentions no moves', async () => {
    const analyze = async (): Promise<RankedCandidate[]> => [];
    const { text, injected } = await injectCandidateArrows('A quiet, solid position.', start, analyze);
    expect(text).not.toContain('[BOARD:');
    expect(injected).toHaveLength(0);
  });

  it('survives an engine failure (geometry still resolved, color falls to red)', async () => {
    const analyze = async (): Promise<RankedCandidate[]> => {
      throw new Error('engine down');
    };
    const { text } = await injectCandidateArrows('Try Nf3.', start, analyze);
    expect(text).toContain('[BOARD: arrow:g1-f3:red]');
  });
});

describe('stripBoardMarkers', () => {
  it('removes all [BOARD: ...] directives', () => {
    expect(stripBoardMarkers('Hi [BOARD: arrow:e2-e4:green] there')).toBe('Hi   there');
  });
});
