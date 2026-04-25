/**
 * set_intended_opening — write opening intent to coach memory.
 * Fully implemented (memory is foundational — no stubs allowed).
 */
import type { Tool } from '../../types';
import { memorySetIntendedOpening } from '../../sources/memory';

export const setIntendedOpeningTool: Tool = {
  name: 'set_intended_opening',
  category: 'cerebrum',
  description: 'Commit the coach to playing a named opening. Persists across games and sessions until cleared. Use when the user asks the coach to play a specific opening.',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Canonical opening name as it appears in the openings database (e.g. "Caro-Kann Defense", "Sicilian Defense", "London System").' },
      color: { type: 'string', description: 'The coach\'s color in the upcoming game.', enum: ['white', 'black'] },
      surface: { type: 'string', description: 'Which surface captured this intent (home-chat, in-game-chat, etc.). For audit traceability.' },
    },
    required: ['name', 'color'],
  },
  // eslint-disable-next-line @typescript-eslint/require-await
  async execute(args) {
    const name = typeof args.name === 'string' ? args.name : ''.trim();
    const colorRaw = typeof args.color === 'string' ? args.color : ''.toLowerCase();
    const surface = String(args.surface ?? 'coach-brain');
    if (!name) return { ok: false, error: 'name is required' };
    if (colorRaw !== 'white' && colorRaw !== 'black') {
      return { ok: false, error: 'color must be "white" or "black"' };
    }
    try {
      const stored = memorySetIntendedOpening({
        name,
        color: colorRaw,
        capturedFromSurface: surface,
      });
      return { ok: true, result: stored };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
