/**
 * play_move — STUB. Becomes real in Phase 4 (WO-BRAIN-04, move
 * selector migration). For BRAIN-01 it logs the requested move and
 * returns synthetic success.
 */
import type { Tool } from '../../types';
import { logAppAudit } from '../../../services/appAuditor';

export const playMoveTool: Tool = {
  name: 'play_move',
  category: 'cerebrum',
  description: "Make a move in the live game on the coach's behalf. Stub today; lands in WO-BRAIN-04 when the move selector migrates through the brain.",
  parameters: {
    type: 'object',
    properties: {
      san: { type: 'string', description: 'Move in SAN.' },
    },
    required: ['san'],
  },
  // eslint-disable-next-line @typescript-eslint/require-await
  async execute(args) {
    const san = typeof args.san === 'string' ? args.san : '';
    if (!san) return { ok: false, error: 'san is required' };
    void logAppAudit({
      kind: 'coach-brain-tool-called',
      category: 'subsystem',
      source: 'playMoveTool',
      summary: `STUB play move ${san}`,
      details: 'BRAIN-01 stub — actual move dispatch lands in WO-BRAIN-04.',
    });
    return { ok: true, result: { san, stub: true } };
  },
};
