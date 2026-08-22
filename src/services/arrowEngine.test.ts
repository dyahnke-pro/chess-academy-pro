import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  computeLeadEyeArrows,
  extractMentionedSans,
  resolveSanToArrow,
  colorForRank,
  injectCandidateArrows,
  injectCandidateHighlights,
  extractMentionedSquares,
  stripBoardMarkers,
  MAX_CANDIDATE_ARROWS,
  MAX_CANDIDATE_HIGHLIGHTS,
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
  it('maps engine rank to GREEN/YELLOW only — off-top-3 draws nothing', () => {
    expect(colorForRank(1)).toBe('green');
    expect(colorForRank(2)).toBe('yellow');
    expect(colorForRank(3)).toBe('yellow');
    expect(colorForRank(4)).toBeNull(); // mistake/threat — never drawn
    expect(colorForRank(null)).toBeNull();
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

  it('draws NO arrow for an unranked (off-top-3) mention — never point at a mistake', async () => {
    const analyze = async (): Promise<RankedCandidate[]> => [{ from: 'e2', to: 'e4', rank: 1 }];
    const { text, injected } = await injectCandidateArrows('Avoid the loose Nh3.', start, analyze);
    expect(text).not.toContain('g1-h3'); // the off-top-3 move is dropped
    expect(text).not.toContain(':red');
    expect(injected.some((i) => i.san === 'Nh3')).toBe(false);
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

  it('does NOT arrow the just-played move — excludeSan drops it by geometry (David 2026-07-13)', async () => {
    // The coach just played Nf3 (already on the board) and also names Nc3.
    // Only Nc3 should get an arrow; Nf3 (the played move) is excluded.
    const analyze = async (): Promise<RankedCandidate[]> => [
      { from: 'g1', to: 'f3', rank: 1 },
      { from: 'b1', to: 'c3', rank: 2 },
    ];
    const { text, injected } = await injectCandidateArrows(
      'I played Nf3; you could answer Nc3.',
      start,
      analyze,
      { excludeSan: 'Nf3' },
    );
    expect(text).not.toContain('g1-f3'); // the already-played move — no arrow
    expect(injected.some((i) => i.san === 'Nf3')).toBe(false);
    expect(text).toContain('[BOARD: arrow:b1-c3:yellow]'); // the other move still arrowed
    expect(injected.some((i) => i.san === 'Nc3')).toBe(true);
  });

  it('RED-arrows a FORCING threat the coach says OUT LOUD (spoken, off-top-3) — David 2026-07-13 + 2026-08-07', async () => {
    // After 1.e4 e5 2.Nf3 (Black to move), the spoken warning names White's
    // capture Nxe5 — forcing (a capture), off-top-3 → red threat arrow.
    const afterNf3 = new Chess();
    for (const m of ['e4', 'e5', 'Nf3']) afterNf3.move(m);
    const analyze = async (): Promise<RankedCandidate[]> => [{ from: 'b8', to: 'c6', rank: 1 }];
    const both = await injectCandidateArrows('Careful, Nxe5 is coming.', afterNf3.fen(), analyze, {
      spokenText: 'Careful, Nxe5 is coming.',
    });
    expect(both.text).toContain('[BOARD: arrow:f3-e5:red]');
    expect(both.injected).toContainEqual({ san: 'Nxe5', color: 'red' });
  });

  it('draws NO red arrow for a QUIET spoken mention — a non-forcing move is not a threat (David 2026-08-07)', async () => {
    // His board carried red arrows on quiet pawn pushes (d4/d5) and a
    // hypothetical bishop retreat (Bd6) resolved from past-tense prose.
    // Quiet resolutions must never paint red.
    const analyze = async (): Promise<RankedCandidate[]> => [{ from: 'e2', to: 'e4', rank: 1 }];
    const res = await injectCandidateArrows('The plan revolves around d5 later.', start, analyze, {
      spokenText: 'The plan revolves around d5 later.',
    });
    expect(res.text).not.toContain(':red');
    expect(res.injected.some((i) => i.color === 'red')).toBe(false);
  });

  it('ignores past-tense / directional square mentions ("from d6", "eyeing c5") — David 2026-08-07', () => {
    expect(extractMentionedSans('The bishop went from d6 to b4, eyeing c5.')).toEqual([]);
  });

  it('does NOT arrow a threat that is only WRITTEN, not spoken', async () => {
    const analyze = async (): Promise<RankedCandidate[]> => [{ from: 'e2', to: 'e4', rank: 1 }];
    // Threat in the display text, but NOT in the spoken text → no arrow.
    const res = await injectCandidateArrows('Careful, Nh3 is coming.', start, analyze, {
      spokenText: 'Nice and solid.',
    });
    expect(res.text).not.toContain('g1-h3');
    expect(res.injected.some((i) => i.san === 'Nh3')).toBe(false);
  });

  it('no-ops (no markers) when the prose mentions no moves', async () => {
    const analyze = async (): Promise<RankedCandidate[]> => [];
    const { text, injected } = await injectCandidateArrows('A quiet, solid position.', start, analyze);
    expect(text).not.toContain('[BOARD:');
    expect(injected).toHaveLength(0);
  });

  it('draws NO arrow on engine failure — never an ungrounded/red fallback', async () => {
    const analyze = async (): Promise<RankedCandidate[]> => {
      throw new Error('engine down');
    };
    const { text, injected } = await injectCandidateArrows('Try Nf3.', start, analyze);
    // Without a rank we can't call it green/yellow, so we draw nothing rather
    // than fall back to a red/ungrounded arrow (David 2026-07-06). The primary
    // best-move green arrow comes from the grounded answer path independently.
    expect(text).toBe('Try Nf3.');
    expect(injected).toHaveLength(0);
  });

  it('CAPS the arrows so a chatty answer never floods the board', async () => {
    // Six distinct legal first moves named in one answer — uncapped this
    // would draw six arrows ("arrows all over the place", David 2026-06-16).
    const analyze = async (): Promise<RankedCandidate[]> => [{ from: 'g1', to: 'f3', rank: 1 }];
    const { injected } = await injectCandidateArrows(
      'You could try Nf3, Nc3, e4, d4, c4, or g3 here.',
      start,
      analyze,
    );
    expect(injected.length).toBeLessThanOrEqual(MAX_CANDIDATE_ARROWS);
    // The engine-ranked move (Nf3) survives the cap (ranked-first priority).
    expect(injected.some((i) => i.san === 'Nf3')).toBe(true);
  });
});

describe('extractMentionedSquares', () => {
  it('extracts squares named as squares (outpost / target / pawn)', () => {
    const sqs = extractMentionedSquares('The d5 outpost is yours; the backward c6 pawn is the target.');
    expect(sqs).toContain('d5');
    expect(sqs).toContain('c6');
  });

  it('does NOT highlight a square that is part of a named move', () => {
    // "Nf3" names a move (→ arrow), so f3 must not also become a highlight.
    const sqs = extractMentionedSquares('Play Nf3 to develop.');
    expect(sqs).not.toContain('f3');
  });

  it('ignores [BOARD: ...] markers when scanning', () => {
    expect(extractMentionedSquares('Solid. [BOARD: highlight:d5:yellow]')).toEqual([]);
  });
});

describe('injectCandidateHighlights', () => {
  it('emits one yellow highlight marker for the named squares, capped', () => {
    const { markers, squares } = injectCandidateHighlights(
      'Watch the d5, e6, c6, b5, and a4 squares.',
    );
    expect(squares.length).toBeLessThanOrEqual(MAX_CANDIDATE_HIGHLIGHTS);
    expect(markers).toHaveLength(1);
    expect(markers[0]).toMatch(/^\[BOARD: highlight:/);
    expect(markers[0]).toContain(':yellow');
  });

  it('no-ops when no square is named', () => {
    expect(injectCandidateHighlights('A quiet, solid position.')).toEqual({ markers: [], squares: [] });
  });
});

describe('stripBoardMarkers', () => {
  it('removes all [BOARD: ...] directives', () => {
    expect(stripBoardMarkers('Hi [BOARD: arrow:e2-e4:green] there')).toBe('Hi   there');
  });
});
