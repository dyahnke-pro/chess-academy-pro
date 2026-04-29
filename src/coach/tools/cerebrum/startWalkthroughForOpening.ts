/**
 * start_walkthrough_for_opening — REAL (WO-COACH-LICHESS-OPENINGS).
 *
 * Hands off to the existing WalkthroughMode UI seeded by an opening
 * name. The surface navigates the user to /coach/session/walkthrough
 * (or the equivalent route in this app) with the opening name and
 * optional variation / orientation / PGN as query params.
 *
 * Use at the END of an interactive opening tour to drop the student
 * into the dedicated walkthrough player for repetition / drilling.
 *
 * Integrates with the existing routing surface — the coach doesn't
 * navigate directly; it asks the surface to do it via the
 * `onStartWalkthroughForOpening` callback.
 */
import type { Tool } from '../../types';
import { logAppAudit } from '../../../services/appAuditor';

export const startWalkthroughForOpeningTool: Tool = {
  name: 'start_walkthrough_for_opening',
  category: 'cerebrum',
  kind: 'write',
  description:
    "Hand off to the dedicated walkthrough player for an opening. The student is navigated to a guided playback of the opening line. Use after an interactive teaching session to give them a focused drill / repetition surface. Optional `pgn` arg seeds the walkthrough from a specific master game (typically fetched via lichess_game_export). Optional `orientation` controls which color the student plays.",
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
