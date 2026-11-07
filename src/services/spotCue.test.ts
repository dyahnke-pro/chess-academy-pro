import { describe, it, expect } from 'vitest';
import { SPOT_CUES } from '../data/spotCues';
import { isResolvableSource } from '../data/narrationSources';
import { SPOT_RULES, pickSpotCue, spotForPuzzle } from './spotCue';
import type { MotifId } from '../data/tacticMotifs';

const MOTIFS = Object.keys(SPOT_CUES) as MotifId[];

describe('every way to spot each motif has one answer', () => {
  it('each cue has a rule and each rule a cue, per motif', () => {
    for (const m of MOTIFS) {
      expect(Object.keys(SPOT_RULES[m]).sort(), m).toEqual(SPOT_CUES[m].map((c) => c.when).sort());
    }
  });

  it('every motif has a habit for the side that has the tactic, so a puzzle always gets a line', () => {
    for (const m of MOTIFS) {
      const choice = pickSpotCue(m, 'yours', null);
      expect(choice, m).not.toBeNull();
    }
  });

  it('a cue nothing can read is never said', () => {
    const boards = [
      { fen: 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', line: ['d5c7'] },
      { fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', line: ['a1a8'] },
      { fen: '4k3/8/2n1b3/8/3P4/8/8/4K3 w - - 0 1', line: ['d4d5'] },
    ];
    for (const m of MOTIFS) {
      for (const seat of ['yours', 'theirs'] as const) {
        for (const b of [...boards, null]) {
          const c = pickSpotCue(m, seat, b);
          if (c) expect(SPOT_RULES[m][c.when], `${m}/${c.when}`).not.toBe('unread');
        }
      }
    }
  });
});

describe('the board picks the cue', () => {
  const pick = (m: MotifId, fen: string, line: string[]): string | undefined => pickSpotCue(m, 'yours', { fen, line })?.when;

  it('a knight fork of king and rook', () => {
    expect(pick('fork', 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', ['d5c7'])).toBe('knight-king-rook');
  });
  it('a fork of king and queen', () => {
    expect(pick('fork', 'q3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', ['b5c7'])).toBe('royal');
  });
  it('a pawn fork of two pieces', () => {
    expect(pick('fork', '4k3/8/2n1b3/8/3P4/8/8/4K3 w - - 0 1', ['d4d5'])).toBe('pawn');
  });
  it('a pin to the king, and a pin to the queen', () => {
    expect(pick('pin', '4k3/8/2n5/8/8/8/8/4KB2 w - - 0 1', ['f1b5'])).toBe('absolute');
    expect(pick('pin', '4k3/3q4/2n5/8/8/8/8/4KB2 w - - 0 1', ['f1b5'])).toBe('relative');
  });
  it('a back-rank mate, and a smothered one', () => {
    expect(pick('mate', '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', ['a1a8'])).toBe('back-rank');
    expect(pick('mate', '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', ['g5f7'])).toBe('smothered');
  });
  it('a discovered check that hits the queen, and a double check', () => {
    expect(pick('discovered-check', 'k7/1q6/8/8/N7/8/8/R3K3 w - - 0 1', ['a4c5'])).toBe('queen-target');
    expect(pick('discovered-check', 'k7/8/8/8/N7/8/8/R3K3 w - - 0 1', ['a4b6'])).toBe('double-check');
  });
  it('an underpromotion is said only when it is the point: a queen there stalemates', () => {
    expect(pick('promotion', '8/k1P5/2K5/8/8/8/8/8 w - - 0 1', ['c7c8r'])).toBe('underpromote-stalemate');
    // His game: the engine makes a rook where a queen does the same job (it is
    // taken at once) — no stalemate, so not the stalemate lesson.
    expect(pick('promotion', '8/8/1k2p3/4P1K1/1P6/2N5/2bp4/8 b - - 1 46', ['d2d1r', 'c3d1', 'c2d1', 'g5f6', 'd1g4', 'f6g5'])).not.toBe('underpromote-stalemate');
  });
  it('a plain free capture is the free-piece cue, not the end-of-a-forcing-line one', () => {
    expect(pick('free-piece', '4k3/8/8/3n4/8/8/8/3QK3 w - - 0 1', ['d1d5', 'e8e7', 'd5d4'])).toBe('general');
  });
  it('their tactic is answered from the defender\'s side', () => {
    expect(pickSpotCue('fork', 'theirs', null)?.when).toBe('defend');
    expect(pickSpotCue('pin', 'theirs', null)?.when).toBe('unpin');
    expect(pickSpotCue('mate', 'theirs', null)?.when).toBe('luft');
  });
  it('a board with no fitting cue gets one of the habits, the same one every time', () => {
    const a = pickSpotCue('pin', 'yours', { fen: '4k3/8/8/8/8/8/8/4K3 w - - 0 1', line: ['e1e2'] });
    const b = pickSpotCue('pin', 'yours', { fen: '4k3/8/8/8/8/8/8/4K3 w - - 0 1', line: ['e1e2'] });
    expect(a?.read).toBe('habit');
    expect(a).toEqual(b);
  });
  it('a puzzle reads its own board and solution', () => {
    expect(spotForPuzzle({ tacticType: 'fork', fen: 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', moves: 'd5c7' }))
      .toBe(SPOT_CUES.fork.find((c) => c.when === 'knight-king-rook')!.line);
    expect(spotForPuzzle({ tacticType: null, fen: '4k3/8/8/8/8/8/8/4K3 w - - 0 1', moves: 'e1e2' })).toBeNull();
  });
});

describe('the cue data', () => {
  it('one sentence, no em dash, no move or square named, at least one resolvable source', () => {
    for (const m of MOTIFS) {
      for (const c of SPOT_CUES[m]) {
        const at = `${m}/${c.when}`;
        expect(c.line, at).not.toMatch(/—/);
        expect(c.line, at).not.toMatch(/\b[a-h][1-8]\b/);
        expect(c.line.replace(/\.$/, ''), at).not.toMatch(/[.!?]\s/);
        expect(c.sources.length, at).toBeGreaterThan(0);
        for (const s of c.sources) expect(isResolvableSource(s), `${at} ${s}`).toBe(true);
      }
    }
  });
});
