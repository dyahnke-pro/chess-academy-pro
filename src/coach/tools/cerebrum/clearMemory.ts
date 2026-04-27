/**
 * clear_memory — drop a memory scope at the user's request.
 * Fully implemented.
 */
import type { Tool } from '../../types';
import { memoryClear, type ClearMemoryScope } from '../../sources/memory';

export const clearMemoryTool: Tool = {
  name: 'clear_memory',
  category: 'cerebrum',
  kind: 'read',
  description: 'Clear a scope of coach memory. Use when the user says things like "forget that" or "play anything." Scopes: intended-opening (drops the active opening commitment), conversation (clears recent chat), all (everything).',
  parameters: {
    type: 'object',
    properties: {
      scope: { type: 'string', description: 'Memory scope to clear.', enum: ['intended-opening', 'conversation', 'all'] },
    },
    required: ['scope'],
  },
  // eslint-disable-next-line @typescript-eslint/require-await
  async execute(args) {
    const scope = typeof args.scope === 'string' ? args.scope : '' as ClearMemoryScope;
    if (scope !== 'intended-opening' && scope !== 'conversation' && scope !== 'all') {
      return { ok: false, error: 'scope must be one of "intended-opening", "conversation", "all"' };
    }
    try {
      memoryClear(scope);
      return { ok: true, result: { scope } };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
