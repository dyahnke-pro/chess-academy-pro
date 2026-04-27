/**
 * draw_arrows — visual annotation cerebrum tool. WO-COACH-ARROWS.
 *
 * The brain calls this to render arrows on the active board while
 * explaining a plan, threat, or candidate move. Replaces the legacy
 * `[ARROW:from:to]` text-tag protocol that leaked into chat bubbles
 * and was spoken aloud by Polly.
 *
 * Validation:
 *   - `arrows` array required, 1..4 entries
 *   - Each entry: `from` and `to` match /^[a-h][1-8]$/, `color` is
 *     'green' or 'red'
 *
 * Graceful no-op: when no `onDrawArrows` callback is wired (the
 * surface didn't pass one to coachService.ask), returns ok=true with
 * stub=true so the LLM continues the turn naturally. Mirrors the
 * navigateToRoute / playMove / etc. pattern from
 * WO-CEREBRUM-GRACEFUL-NOOP.
 */
import type { ArrowSpec, Tool } from '../../types';
import { logAppAudit } from '../../../services/appAuditor';

const SQUARE_RE = /^[a-h][1-8]$/;
const MAX_ARROWS = 4;

export const drawArrowsTool: Tool = {
  name: 'draw_arrows',
  category: 'cerebrum',
  kind: 'read',
  description:
    "Draw visual arrows on the chess board to highlight a plan, threat, or candidate move while explaining. Use green arrows for moves you recommend or plans you're describing positively. Use red arrows for threats, blunders, or moves to avoid. Maximum 4 arrows per call. Arrows persist until the user makes a move on the board, then automatically clear. Call this tool whenever you reference a specific move or threat in your explanation — it makes coaching dramatically clearer than words alone.",
  parameters: {
    type: 'object',
    properties: {
      arrows: {
        type: 'array',
        description:
          'Array of arrow specs. Each spec is { from: square, to: square, color: "green" | "red" }. Both squares are algebraic notation, e.g. "e2" or "g7". Maximum 4 arrows per call.',
      },
    },
    required: ['arrows'],
  },
  async execute(args, ctx) {
    const raw = Array.isArray(args.arrows) ? args.arrows : null;
    if (!raw) return { ok: false, error: 'arrows must be an array' };
    if (raw.length === 0) return { ok: false, error: 'arrows array is empty — draw at least 1 arrow or skip the call' };
    if (raw.length > MAX_ARROWS) {
      return {
        ok: false,
        error: `too many arrows (got ${raw.length}, max ${MAX_ARROWS}) — pick the most important ones`,
      };
    }

    // Validate each spec. Bail on the first malformed entry so the
    // LLM gets a precise error to react to.
    const validated: ArrowSpec[] = [];
    for (let i = 0; i < raw.length; i++) {
      const entry = raw[i] as Record<string, unknown> | null;
      if (!entry || typeof entry !== 'object') {
        return { ok: false, error: `arrows[${i}] must be an object` };
      }
      const from = typeof entry.from === 'string' ? entry.from : '';
      const to = typeof entry.to === 'string' ? entry.to : '';
      const color = entry.color;
      if (!SQUARE_RE.test(from)) {
        return {
          ok: false,
          error: `arrows[${i}].from "${from}" must match /^[a-h][1-8]$/`,
        };
      }
      if (!SQUARE_RE.test(to)) {
        return {
          ok: false,
          error: `arrows[${i}].to "${to}" must match /^[a-h][1-8]$/`,
        };
      }
      if (color !== 'green' && color !== 'red') {
        return {
          ok: false,
          error: `arrows[${i}].color "${String(color)}" must be "green" or "red"`,
        };
      }
      validated.push({ from, to, color });
    }

    if (!ctx?.onDrawArrows) {
      void logAppAudit({
        kind: 'coach-brain-tool-called',
        category: 'subsystem',
        source: 'drawArrowsTool.execute',
        summary: `STUB draw_arrows (no onDrawArrows callback) count=${validated.length}`,
      });
      return {
        ok: true,
        result: {
          stub: true,
          requested: { arrowCount: validated.length },
          reason: 'no onDrawArrows callback on this surface',
        },
      };
    }

    try {
      ctx.onDrawArrows(validated);
      void logAppAudit({
        kind: 'coach-brain-tool-called',
        category: 'subsystem',
        source: 'drawArrowsTool',
        summary: `draw_arrows count=${validated.length}`,
        details: JSON.stringify(validated),
      });
      return { ok: true, result: { drawn: validated.length, arrows: validated } };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `onDrawArrows threw: ${message}` };
    }
  },
};
