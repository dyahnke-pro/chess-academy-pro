/**
 * request_hint_tier — STUB. Becomes real in Phase 5 (hint-system
 * migration). For BRAIN-01 it just logs which tier was requested.
 */
import type { Tool } from '../../types';
import { logAppAudit } from '../../../services/appAuditor';

export const requestHintTierTool: Tool = {
  name: 'request_hint_tier',
  category: 'cerebrum',
  kind: 'read',
  description: 'Escalate the hint tier on the live game. Stub today — lands in WO-BRAIN-05 when the hint system migrates through the brain.',
  parameters: {
    type: 'object',
    properties: {
      tier: { type: 'number', description: 'Hint tier to display (1, 2, or 3).' },
    },
    required: ['tier'],
  },
  // eslint-disable-next-line @typescript-eslint/require-await
  async execute(args) {
    const tier = Number(args.tier);
    if (tier !== 1 && tier !== 2 && tier !== 3) {
      return { ok: false, error: 'tier must be 1, 2, or 3' };
    }
    void logAppAudit({
      kind: 'coach-brain-tool-called',
      category: 'subsystem',
      source: 'requestHintTierTool',
      summary: `STUB request hint tier ${tier}`,
      details: 'BRAIN-01 stub — actual hint dispatch lands in WO-BRAIN-05.',
    });
    return { ok: true, result: { tier, stub: true } };
  },
};
