/**
 * start_walkthrough_for_opening — REAL (WO-COACH-LICHESS-OPENINGS).
 *
 * On /coach/teach, when the requested opening has a curated tree
 * registered in `data/openingWalkthroughs/`, the surface starts an
 * IN-PLACE walkthrough: the board takes over with the line's first
 * move, voice narrates each idea, and at branches the student picks
 * which sub-line to explore via tap targets — all without leaving
 * the chat panel. For openings with no curated tree, the surface
 * falls back to navigating to the legacy /coach/session/walkthrough
 * route. Either way the brain just calls this tool with an opening
 * name and the surface decides which mode to use.
 *
 * Integrates with the routing surface — the coach doesn't navigate
 * directly; it asks the surface to do it via the
 * `onStartWalkthroughForOpening` callback.
 */
import type { Tool } from '../../types';
import { logAppAudit } from '../../../services/appAuditor';
import { listAvailableWalkthroughs } from '../../../data/openingWalkthroughs';

export const startWalkthroughForOpeningTool: Tool = {
  name: 'start_walkthrough_for_opening',
  category: 'cerebrum',
  kind: 'write',
  description:
    "FIRST CHOICE for any 'teach me [opening]' / 'walk me through [line]' / 'show me the [opening] traps' ask. On /coach/teach the surface drives an IN-PLACE walkthrough when the opening has a curated tree (currently: " +
    listAvailableWalkthroughs().map((w) => `${w.name} (${w.eco})`).join(', ') +
    ") — the board animates each move with voice narration and pauses at branches with tap targets so the student picks which sub-line to explore. The chat panel stays available the whole time, so a question like 'why is that bad for white?' just pauses the walkthrough and resumes after the answer. For openings with no curated tree the surface falls back to navigating to the legacy walkthrough route. Reach for THIS tool the moment the student names an opening they want to learn — don't try to walk through the line via play_move sequences (production audit, build 42fb9a0, caught 9-rejection cascades) or chained set_board_position calls (only the last position renders). After calling this, you can stop generating moves on the board — the walkthrough runtime owns the board until the student exits or finishes a leaf. Optional `pgn` arg seeds the LEGACY walkthrough from a specific master game (ignored when an in-place tree exists). Optional `orientation` controls which color the student plays.",
  parameters: {
    type: 'object',
    properties: {
      opening: {
        type: 'string',
        description: 'Opening name (e.g. "Italian Game", "Caro-Kann Defense", "Sicilian Najdorf").',
      },
      variation: {
        type: 'string',
        description: 'Optional variation name within the opening (e.g. "Two Knights Defense").',
      },
      orientation: {
        type: 'string',
        description: 'Optional: which color the student plays in the walkthrough. Defaults to the current intended-opening color.',
        enum: ['white', 'black'],
      },
      pgn: {
        type: 'string',
        description:
          "Optional: PGN to seed the walkthrough with (e.g. fetched via lichess_game_export). When omitted, the walkthrough loads its built-in line for the named opening.",
      },
    },
    required: ['opening'],
  },
  async execute(args, ctx) {
    const opening = typeof args.opening === 'string' ? args.opening.trim() : '';
    if (!opening) return { ok: false, error: 'opening is required' };
    const variation = typeof args.variation === 'string' && args.variation.trim()
      ? args.variation.trim()
      : undefined;
    const orientationRaw = typeof args.orientation === 'string' ? args.orientation.trim() : '';
    const orientation: 'white' | 'black' | undefined =
      orientationRaw === 'white' ? 'white' : orientationRaw === 'black' ? 'black' : undefined;
    const pgn = typeof args.pgn === 'string' && args.pgn.trim() ? args.pgn.trim() : undefined;

    if (!ctx?.onStartWalkthroughForOpening) {
      // Graceful no-op when the surface didn't wire the callback.
      void logAppAudit({
        kind: 'coach-brain-tool-called',
        category: 'subsystem',
        source: 'startWalkthroughForOpeningTool.execute',
        summary: `STUB start_walkthrough_for_opening opening=${opening} (no onStartWalkthroughForOpening callback)`,
      });
      return {
        ok: true,
        result: {
          stub: true,
          requested: { opening, variation, orientation, pgn: pgn ? `${pgn.length} chars` : undefined },
          reason: 'no onStartWalkthroughForOpening callback on this surface',
        },
      };
    }

    try {
      const result = await Promise.resolve(
        ctx.onStartWalkthroughForOpening({ opening, variation, orientation, pgn }),
      );
      void logAppAudit({
        kind: 'coach-brain-tool-called',
        category: 'subsystem',
        source: 'startWalkthroughForOpeningTool',
        summary: `start_walkthrough_for_opening opening=${opening} ${result.ok ? 'ok' : 'rejected'}`,
        details: result.reason ? `reason=${result.reason}` : undefined,
      });
      return result.ok
        ? { ok: true, result: { opening, variation, orientation } }
        : { ok: false, error: result.reason ?? 'surface rejected' };
    } catch (err) {
      return {
        ok: false,
        error: `onStartWalkthroughForOpening threw: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
