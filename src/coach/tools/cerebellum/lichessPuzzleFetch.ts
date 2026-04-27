/**
 * lichess_puzzle_fetch — fetch a puzzle by theme and rating.
 *
 * PUNT (BRAIN-01-PUNT-LICHESS-PUZZLES): the existing app has no
 * theme-based Lichess puzzle fetch. It has a daily-puzzle endpoint
 * (`fetchLichessDailyPuzzle`) and a personal-activity dashboard,
 * but no `/api/puzzle/themes` proxy. Building one requires either
 * a server proxy or scraping the puzzle catalogue, both out of scope
 * for the spine WO.
 *
 * For BRAIN-01 the tool returns a synthetic "no puzzle available"
 * result with a clear `unavailable` flag so the LLM can route around
 * it. A follow-up WO wires the real fetch.
 */
import type { Tool } from '../../types';
import { logAppAudit } from '../../../services/appAuditor';

export const lichessPuzzleFetchTool: Tool = {
  name: 'lichess_puzzle_fetch',
  category: 'cerebellum',
  kind: 'read',
  description: 'Fetch a Lichess puzzle by theme (fork, pin, skewer, mate-in-2, etc.) and student rating. Returns puzzle FEN + best move + theme tags.',
  parameters: {
    type: 'object',
    properties: {
      theme: { type: 'string', description: 'Tactical theme name, e.g. "fork", "pin", "back-rank-mate".' },
      rating: { type: 'number', description: 'Target puzzle rating (defaults to student\'s current rating).' },
    },
    required: ['theme'],
  },
  // eslint-disable-next-line @typescript-eslint/require-await
  async execute(args) {
    const theme = typeof args.theme === 'string' ? args.theme : '';
    void logAppAudit({
      kind: 'coach-brain-tool-called',
      category: 'subsystem',
      source: 'lichessPuzzleFetchTool',
      summary: `lichess_puzzle_fetch unavailable (theme=${theme})`,
      details: 'PUNT: theme-based puzzle fetch not yet implemented. Returns unavailable flag.',
    });
    return {
      ok: true,
      result: {
        unavailable: true,
        reason: 'Theme-based Lichess puzzle fetch is not yet wired in the spine. The app has only daily-puzzle and personal-dashboard fetches today.',
        theme,
      },
    };
  },
};
