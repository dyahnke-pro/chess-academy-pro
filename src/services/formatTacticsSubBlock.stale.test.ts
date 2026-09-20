// The tactics package renderer takes the BOARD fen (2026-09-20). Verifying a
// package against its own fen can never catch staleness — a stale package is
// self-consistent — so the last door before the model is where the check lives.
import { describe, it, expect, vi } from 'vitest';
vi.mock('./appAuditor', () => ({ logAppAudit: vi.fn(async () => undefined) }));
import { formatTacticsSubBlock, buildTacticsLiveContext } from './liveTacticsContext';
import { logAppAudit } from './appAuditor';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

describe('formatTacticsSubBlock — refuses a package for another board', () => {
  it('renders when the package is about the board it is asked to describe', () => {
    const t = buildTacticsLiveContext(START, null, 'w', 1200);
    expect(formatTacticsSubBlock(t, START).length).toBeGreaterThan(0);
  });
  it('renders NOTHING and audits when the fens differ', () => {
    const t = buildTacticsLiveContext(START, null, 'w', 1200);
    expect(formatTacticsSubBlock(t, AFTER_E4)).toBe('');
    expect(logAppAudit).toHaveBeenCalledWith(expect.objectContaining({ kind: 'tactics-context-stale' }));
  });
});
