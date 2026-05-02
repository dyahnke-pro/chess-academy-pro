/**
 * save_position — pin the current FEN to coach memory so the student
 * can resume from this exact position later. Bytewise-perfect: stores
 * the FEN verbatim instead of letting the brain reconstruct it from
 * prose on resume (production audit build 95a1785 caught the brain
 * dropping a c6 knight when restoring from chat memory). The label
 * is optional human context ("Vienna Gambit, move 7"). Survives app
 * exit because the memory store persists to Dexie.
 */
import { Chess } from 'chess.js';
import type { Tool } from '../../types';
import { memorySetSavedPosition } from '../../sources/memory';

export const savePositionTool: Tool = {
  name: 'save_position',
  category: 'cerebrum',
  kind: 'write',
  description:
    "Save the current FEN to coach memory so the student can resume here later. Use this whenever the student says \"remember this position,\" \"save this for later,\" \"I want to come back to this,\" or similar. The FEN is stored verbatim and persists across sessions. Pass an optional `label` for human context (\"Vienna Gambit, move 7\"). Overwrites any prior save.",
  parameters: {
    type: 'object',
    properties: {
      fen: { type: 'string', description: 'The exact FEN to save. Must match the current live position.' },
      label: { type: 'string', description: 'Optional human-readable context, e.g. "Vienna Gambit, move 7".' },
    },
    required: ['fen'],
  },
  // eslint-disable-next-line @typescript-eslint/require-await
  async execute(args) {
    const fen = typeof args.fen === 'string' ? args.fen.trim() : '';
    const label = typeof args.label === 'string' ? args.label.trim() : '';
    if (!fen) return { ok: false, error: 'fen is required' };
    try {
      // Validate the FEN before persisting — a bad save is worse than
      // no save because resume will fail silently.
      new Chess(fen);
    } catch (err) {
      return { ok: false, error: `invalid FEN: ${err instanceof Error ? err.message : String(err)}` };
    }
    try {
      memorySetSavedPosition({ fen, label: label || undefined });
      return { ok: true, result: { fen, label: label || null } };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
