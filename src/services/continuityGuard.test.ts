import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkLineContinuity, reportLineContinuity } from './continuityGuard';
import type { ContinuityLine } from './continuityGuard';

vi.mock('./appAuditor', () => ({ logAppAudit: vi.fn(() => Promise.resolve()) }));
import { logAppAudit } from './appAuditor';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function line(overrides: Partial<ContinuityLine> = {}): ContinuityLine {
  return { fen: START, moves: ['e4', 'e5', 'Nf3'], title: 'test line', ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('checkLineContinuity — clean lines', () => {
  it('a legal line with aligned arrays has no violations', () => {
    const l = line({
      annotations: ['a', 'b', 'c'],
      learnCues: ['x', 'y', 'z'],
      arrows: [
        [{ from: 'e2', to: 'e4' }],
        [{ from: 'e7', to: 'e5' }],
        [{ from: 'g1', to: 'f3' }],
      ],
    });
    expect(checkLineContinuity(l)).toEqual([]);
  });
});

describe('checkLineContinuity — board jumps (the swallowed class)', () => {
  it('flags an illegal move from the prior FEN', () => {
    const v = checkLineContinuity(line({ moves: ['e4', 'e5', 'Qh6'] })); // Qh6 illegal here
    expect(v).toHaveLength(1);
    expect(v[0].code).toBe('illegal-move');
    expect(v[0].moveIndex).toBe(2);
  });

  it('flags an unparseable start FEN and stops', () => {
    const v = checkLineContinuity(line({ fen: 'not-a-fen' }));
    expect(v).toHaveLength(1);
    expect(v[0].code).toBe('illegal-move');
    expect(v[0].moveIndex).toBe(-1);
  });

  it('stops at the first illegal move (no cascade noise)', () => {
    const v = checkLineContinuity(line({ moves: ['e4', 'Ke2??' as string, 'Nf3'] }));
    expect(v.filter((x) => x.code === 'illegal-move')).toHaveLength(1);
  });
});

describe('checkLineContinuity — narration/marker alignment', () => {
  it('flags annotations that slid off the moves', () => {
    const v = checkLineContinuity(line({ annotations: ['only-one'] }));
    expect(v.some((x) => x.code === 'narration-misaligned')).toBe(true);
  });

  it('flags learnCues misalignment', () => {
    const v = checkLineContinuity(line({ learnCues: ['a', 'b'] })); // 2 ≠ 3
    expect(v.some((x) => x.code === 'narration-misaligned')).toBe(true);
  });

  it('flags a lead arrow that does not match its move', () => {
    const v = checkLineContinuity(
      line({ arrows: [[{ from: 'e2', to: 'e4' }], [{ from: 'd7', to: 'd5' }], [{ from: 'g1', to: 'f3' }]] }),
    );
    // move[1] is e5 (e7-e5) but the lead arrow says d7-d5
    expect(v.some((x) => x.code === 'arrow-misaligned' && x.moveIndex === 1)).toBe(true);
  });
});

describe('reportLineContinuity — emits the audit', () => {
  it('emits a continuity-error audit when violations exist', () => {
    reportLineContinuity(line({ moves: ['e4', 'Qh6'] }), { source: 'PlayableLinePlayer', openingId: 'caro-kann' });
    expect(logAppAudit).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(logAppAudit).mock.calls[0][0];
    expect(arg.kind).toBe('continuity-error');
    expect(arg.source).toBe('PlayableLinePlayer');
    expect(arg.context).toBe('caro-kann');
  });

  it('emits nothing for a clean line', () => {
    reportLineContinuity(line(), { source: 'PlayableLinePlayer' });
    expect(logAppAudit).not.toHaveBeenCalled();
  });

  it('never throws even on garbage input', () => {
    expect(() =>
      reportLineContinuity({ fen: '', moves: ['x', 'y'] }, { source: 'test' }),
    ).not.toThrow();
  });
});
