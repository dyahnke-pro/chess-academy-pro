/**
 * THE REQUEST EXECUTOR — resolved steps in, what the surface does and the
 * words that report it out (WO-CHAT-01 P1). Actions happen before words, and
 * the words are built from what was done, so they can never claim something
 * the app did not do (ONE-CHAT rule 2).
 *
 * PURE: no navigation happens here. It returns the path, the chip and the
 * text; the door hands the path to the surface's `onNavigate`.
 *
 * Board steps (reset, take back, flip) belong to a surface that HAS a board,
 * which acts on them with its own controls; this returns null for those so
 * the surface keeps them. On a surface WITHOUT a board they are dropped when
 * another step opens a lesson or game — that starts on a fresh board anyway.
 */
import type { RequestAction, ResolvedStep } from './requestSteps';

export interface RequestOutcome {
  text: string;
  /** Where the surface should go (undefined: stay). */
  path?: string;
  /** A chip the answer carries (the existing ChatMessage action types). */
  actionOffer?: Array<{ type: string; id: string }>;
  /** What is left to do — becomes the conversation's pending offer. */
  pending: ResolvedStep[] | null;
  /** For the chat-turn row: which steps were done. */
  servedIntent: string;
}

const BOARD_ACTIONS: ReadonlySet<RequestAction> = new Set<RequestAction>(['reset-board', 'take-back', 'flip-board']);

/** One navigating step → where it goes and how it is said. */
function stepOutcome(s: ResolvedStep): { path?: string; text: string; actionOffer?: RequestOutcome['actionOffer'] } | null {
  switch (s.action) {
    case 'teach-opening':
      if (!s.openingName) return { text: 'Which opening would you like to learn?' };
      return { path: `/coach/teach?opening=${encodeURIComponent(s.openingName)}`, text: `Opening the ${s.openingName} lesson.` };
    case 'play-game': {
      const q = new URLSearchParams();
      if (s.openingName) q.set('subject', s.openingName);
      if (s.side) q.set('side', s.side);
      const qs = q.toString();
      const who = s.side ? ` — you're ${s.side === 'white' ? 'White' : 'Black'}` : '';
      return { path: `/coach/session/play-against${qs ? `?${qs}` : ''}`, text: `Setting up a game${s.openingName ? ` in the ${s.openingName}` : ''}${who}.` };
    }
    case 'training-plan':
      return { path: '/coach/plan', text: 'Opening your training plan.' };
    case 'review-game':
      return { path: '/coach/review', text: 'Opening your games for review.' };
    case 'import-games':
      return {
        text: s.account
          ? `Is ${s.account} your Chess.com or Lichess username? Import those games to find the patterns costing you points.`
          : "Import your Chess.com or Lichess games to find the patterns costing you points.",
        actionOffer: [{ type: 'import_games', id: 'connect' }],
      };
    default:
      return null;
  }
}

/**
 * Turn a request into what happens. `pending` is the conversation's stored
 * offer, run by a `start-now` step. Returns null when the surface should act
 * itself (board steps on a board surface) or there is nothing to do.
 */
export function executeSteps(
  steps: readonly ResolvedStep[],
  ctx: { hasBoard: boolean; pending: ResolvedStep[] | null },
): RequestOutcome | null {
  if (steps.length === 0) return null;
  // "go ahead" / "can I start now?" runs what was offered.
  if (steps.length === 1 && steps[0].action === 'start-now') {
    if (!ctx.pending || ctx.pending.length === 0) {
      return { text: 'Start what? Say "teach me" an opening, or "let\'s play" for a game.', pending: null, servedIntent: 'request:start-now:none' };
    }
    const run = executeSteps(ctx.pending, { hasBoard: ctx.hasBoard, pending: null });
    return run ? { ...run, servedIntent: `request:start-now:${run.servedIntent}` } : null;
  }
  const live = steps.filter((s) => s.action !== 'start-now');
  if (ctx.hasBoard && live.some((s) => BOARD_ACTIONS.has(s.action))) return null;
  const doable = live.filter((s) => !BOARD_ACTIONS.has(s.action));
  if (doable.length === 0) return null;
  const [first, ...rest] = doable;
  const done = stepOutcome(first);
  if (!done) return null;
  // Only one place can be opened now; the rest is the offer "go" runs next.
  const later = rest.length > 0 ? rest : null;
  const nextLine = later ? ` After that, say "go" and we'll ${describe(later[0])}.` : '';
  return {
    text: `${done.text}${nextLine}`,
    ...(done.path ? { path: done.path } : {}),
    ...(done.actionOffer ? { actionOffer: done.actionOffer } : {}),
    pending: later,
    servedIntent: `request:${doable.map((s) => s.action).join('+')}`,
  };
}

function describe(s: ResolvedStep): string {
  switch (s.action) {
    case 'teach-opening': return `go through the ${s.openingName ?? 'opening'}`;
    case 'play-game': return `play${s.openingName ? ` the ${s.openingName}` : ' a game'}`;
    case 'training-plan': return 'open your training plan';
    case 'review-game': return 'review your game';
    case 'import-games': return 'import your games';
    default: return 'do that';
  }
}
