/**
 * speak — STUB. Becomes real in Phase 5 (WO-BRAIN-05, narration
 * migration). For BRAIN-01 it logs the speech intent.
 */
import type { Tool } from '../../types';
import { logAppAudit } from '../../../services/appAuditor';

export const speakTool: Tool = {
  name: 'speak',
  category: 'cerebrum',
  description: 'Speak text aloud to the student. Stub today — lands in WO-BRAIN-05 when narration migrates through the brain.',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Text to speak.' },
      urgency: { type: 'string', description: 'Speech urgency: barge-in, queued, soft.', enum: ['barge-in', 'queued', 'soft'] },
    },
    required: ['text'],
  },
  // eslint-disable-next-line @typescript-eslint/require-await
  async execute(args) {
    const text = typeof args.text === 'string' ? args.text : '';
    if (!text) return { ok: false, error: 'text is required' };
    void logAppAudit({
      kind: 'coach-brain-tool-called',
      category: 'subsystem',
      source: 'speakTool',
      summary: `STUB speak (${text.length} chars)`,
      details: 'BRAIN-01 stub — actual speak dispatch lands in WO-BRAIN-05.',
    });
    return { ok: true, result: { spoken: false, stub: true, length: text.length } };
  },
};
