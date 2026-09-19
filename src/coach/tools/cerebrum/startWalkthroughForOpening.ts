/**
 * start_walkthrough_for_opening — REAL (WO-COACH-LICHESS-OPENINGS).
 *
 * On /coach/teach, when the requested opening has a curated tree
 * registered in `data/openingWalkthroughs/`, the surface starts an
 * IN-PLACE walkthrough: the board takes over with the line's first
 * move, voice narrates each idea, and at branches the student picks
 * which sub-line to explore via tap targets — all without leaving
 * the chat panel. For openings with no curated tree, the surface
 * GENERATES one in-place via the canonical DB-narration pipeline
 * (same surface, same chat/voice) — it never leaves /coach/teach.
 * The legacy /coach/session/walkthrough page no longer exists.
 *
 * Integrates with the routing surface — the coach doesn't navigate
 * directly; it asks the surface to do it via the
 * `onStartWalkthroughForOpening` callback.
 */
import type { Tool } from '../../types';
import { logAppAudit } from '../../../services/appAuditor';
import { listAvailableWalkthroughs } from '../../../data/openingWalkthroughs';
import { useCoachMemoryStore } from '../../../stores/coachMemoryStore';

export const startWalkthroughForOpeningTool: Tool = {
  name: 'start_walkthrough_for_opening',
  category: 'cerebrum',
  kind: 'write',
  description:
    "FIRST CHOICE for any 'teach me [opening]' / 'walk me through [line]' / 'show me the [opening] traps' ask. On /coach/teach the surface drives an IN-PLACE walkthrough when the opening has a curated tree (currently: " +
    listAvailableWalkthroughs().map((w) => `${w.name} (${w.eco})`).join(', ') +
    ") — the board animates each move with voice narration and pauses at branches with tap targets so the student picks which sub-line to explore. The chat panel stays available the whole time, so a question like 'why is that bad for white?' just pauses the walkthrough and resumes after the answer. For openings with no curated tree the surface GENERATES one in-place via the DB-narration pipeline — it never leaves /coach/teach (there is no separate walkthrough page). Reach for THIS tool the moment the student names an opening they want to learn — don't try to walk through the line via play_move sequences (production audit, build 42fb9a0, caught 9-rejection cascades) or chained set_board_position calls (only the last position renders). After calling this, you can stop generating moves on the board — the walkthrough runtime owns the board until the student exits or finishes a leaf. Optional `orientation` controls which color the student plays.",
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
      // 🔒 NO FAKE SUCCESS (David 2026-09-08) — AND NO DROPPED HAND-OFF
      // (prod, week of 2026-09-11).
      //
      // Refusing here is right: this surface cannot run a walkthrough and
      // claiming otherwise would be a lie. But refusing was ALL this did, and a
      // real user paid for the missing half — they asked for an Italian lesson
      // SEVEN TIMES from home chat over two days. Each time this refused, the
      // coach navigated to Learn, and nothing ever re-fired the walkthrough on
      // arrival. Twelve tool errors, zero lessons.
      //
      // So the ask is QUEUED before we refuse. `navigate_to_route` still does
      // the moving; the Teach surface drains the queue on mount and starts the
      // lesson the student actually asked for. The refusal text below is the
      // COMPUTED sentence the phrasing pass must voice — it says what will
      // happen, so the model has no room to invent a success that did not occur.
      useCoachMemoryStore.getState().queueWalkthrough({
        opening,
        requestedFromSurface: null, // the tool ctx carries no surface — see the type
        ...(variation ? { variation } : {}),
        ...(orientation ? { orientation } : {}),
        ...(pgn ? { pgn } : {}),
      });
      void logAppAudit({
        kind: 'coach-brain-tool-called',
        category: 'subsystem',
        source: 'startWalkthroughForOpeningTool.execute',
        summary: `start_walkthrough_for_opening opening=${opening} QUEUED — no host here, handed to Learn on arrival`,
      });
      return {
        ok: false,
        error:
          `Not started yet — this surface cannot host a walkthrough. The ${opening} lesson is QUEUED and will start by itself the moment you reach Learn with Coach. ` +
          `Call navigate_to_route to /coach/teach now. Tell the student you are taking them there and the lesson will begin on arrival — do NOT tell them the board is already set up, because it is not.`,
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
