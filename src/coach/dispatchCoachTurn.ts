/**
 * dispatchCoachTurn — the ONE entry point every coach surface routes a user
 * turn through, so "every interface point gets the same capabilities" (David).
 *
 * It composes the two halves of the spine that were previously bolted together
 * by hand on only some surfaces:
 *   1. the deterministic ACTION router (`routeChatIntent`) — settings toggles,
 *      navigation ("take me to X"), training-aid drills, session starts. If it
 *      matches, we navigate (when the surface threaded `onNavigate`) and return
 *      the confirmation with NO LLM call.
 *   2. otherwise `coachService.ask` — which auto-grounds (buildQuestionGrounding
 *      fires internally) and runs the agentic tool loop.
 *
 * And, beside both, the ONE-CHAT READ in SHADOW (P0a, 2026-10-04): every turn
 * a person typed or spoke is read into the closed `ChatTurn` form IN PARALLEL,
 * validated against the board, compared with the lane today's routing chose,
 * and logged as a `chat-turn` row. Today's answer is what is served; the
 * reading only switches on behind `setServeParsedRoute(true)` once the rows
 * say it agrees often enough (ONE-CHAT FINAL §5, ≥95% on real questions).
 *
 * Composed in a SEPARATE module on purpose: importing `routeChatIntent` INTO
 * `coachService` would cycle (coachService ← trainingAidRouter ← coachSessionRouter).
 * This wrapper depends on both; neither depends on it.
 */
import { coachService, type CoachServiceOptions } from './coachService';
import type { CoachAskInput, CoachAnswer, CoachSurface } from './types';
import { routeChatIntent } from '../services/coachSessionRouter';
import { askSourceFor } from './questionIntents';
import {
  CHAT_KINDS,
  EMPTY_CONVERSATION,
  canonicalAsk,
  fastPathLane,
  kindAgreesWithLane,
  nextConversationState,
  type BoardContext,
  type ConversationState,
  type FastPathLane,
} from './chatTurn';
import { parseChatTurn, type ParseResult, type Reader } from './chatTurnParser';
import { emitChatTurn } from './chatTurnEvents';
import { directAnswer } from './chatTurnAnswers';

export interface DispatchCoachTurnOptions extends CoachServiceOptions {
  /** The prior assistant message — lets the action router catch the
   *  "coach proposed a game → user said yes" affirmation flow. */
  lastAssistantMessage?: string;
  /** Skip the deterministic action router (rare — a surface that must never
   *  navigate/route away, e.g. a locked in-lesson board). Default false. */
  skipActionRouter?: boolean;
}

// ─── THE READ, IN SHADOW ───────────────────────────────────────────────────

/** Conversation memory, ONE per surface, living inside the door. */
const conversations = new Map<CoachSurface, ConversationState>();

/** RUNTIME switch (ONE-CHAT FINAL step 5: a runtime flag, never a build flag —
 *  an OTA dispatch ships whatever `main` holds). Default OFF: the reading is
 *  logged, today's routing answers. */
let serveParsedRoute = false;
export function setServeParsedRoute(on: boolean): void { serveParsedRoute = on; }
export function isServeParsedRouteOn(): boolean { return serveParsedRoute; }

/** Test seam: the model reader the shadow uses (the coachApi chokepoint by
 *  default). */
let readerOverride: Reader | undefined;
export function setChatTurnReaderForTests(reader: Reader | undefined): void { readerOverride = reader; }

/** Test helper — forget every surface's conversation. */
export function resetConversations(): void { conversations.clear(); }

export function conversationFor(surface: CoachSurface): ConversationState {
  return conversations.get(surface) ?? EMPTY_CONVERSATION;
}

function boardOf(input: CoachAskInput): BoardContext {
  const ls = input.liveState;
  return {
    fen: ls.fen,
    history: ls.moveHistory,
    studentColor: ls.studentColor,
    lastStudentAttempt: ls.lastStudentAttempt,
  };
}

/** Is this turn the student's own words (typed or spoken)? Internal prompts
 *  (hint, phase narration) and canned buttons are never read. */
export function isStudentTurn(input: Pick<CoachAskInput, 'surface' | 'origin' | 'ask' | 'liveState'>): boolean {
  const source = askSourceFor(input.liveState.surface, input.origin);
  return (source === 'typed' || source === 'spoken') && input.ask.trim().length > 0;
}

/** Start the read for a student turn. Never rejects. */
export function startChatTurnRead(input: CoachAskInput): Promise<ParseResult | null> {
  return parseChatTurn(input.ask, {
    board: boardOf(input),
    memory: conversationFor(input.liveState.surface),
    reader: readerOverride,
  }).catch(() => null);
}

/**
 * Settle a read and emit its `chat-turn` row. Fire-and-forget: it waits on the
 * read, never the reverse — the student's answer has already been served.
 * Also folds a validated reading into the surface's conversation memory.
 *
 * Exported so a surface that does not route through the door yet (Learn) can
 * still put its student turns under the same measurement.
 */
export async function settleChatTurnRead(opts: {
  input: CoachAskInput;
  read: Promise<ParseResult | null>;
  fastPathLane: FastPathLane;
  servedIntent: string | null;
  servedParsed: boolean;
}): Promise<void> {
  const { input } = opts;
  const result = await opts.read;
  const surface = input.liveState.surface;
  const turn = result?.turn ?? null;
  const validation = result?.validation ?? null;
  if (validation?.ok) {
    conversations.set(surface, nextConversationState(conversationFor(surface), validation.turn, input.liveState.studentColor ?? null));
  }
  const source = askSourceFor(surface, input.origin);
  emitChatTurn({
    surface,
    askSource: source === 'spoken' ? 'spoken' : 'typed',
    fastPathLane: opts.fastPathLane,
    servedIntent: opts.servedIntent,
    parsedKind: turn?.kind ?? null,
    parseSource: result?.source ?? 'llm-failed',
    valid: validation ? validation.ok : null,
    invalidReason: validation && !validation.ok ? validation.reason : null,
    agreed: turn && opts.fastPathLane !== 'none'
      ? kindAgreesWithLane(turn.kind, opts.fastPathLane)
      : null,
    answererLive: turn ? CHAT_KINDS[turn.kind].answerer !== 'pending' : null,
    servedParsed: opts.servedParsed,
    latencyMs: result?.latencyMs ?? 0,
    askPreview: input.ask.slice(0, 80),
  });
}

// ─── THE DOOR ──────────────────────────────────────────────────────────────

export async function dispatchCoachTurn(
  input: CoachAskInput,
  options: DispatchCoachTurnOptions = {},
): Promise<CoachAnswer> {
  const student = isStudentTurn(input);
  // The read starts NOW, in parallel with today's routing — no added latency.
  const read = student ? startChatTurnRead(input) : null;
  let servedParsed = false;
  let effectiveInput = input;
  if (read && serveParsedRoute) {
    // FLAG ON: wait for the reading and, when it validated and its kind has a
    // live answerer, serve the canonical question that routes to it.
    const r = await read;
    // A kind with no lane today answers with its own computed sentence.
    const turn = r?.validation?.ok ? r.validation.turn : null;
    if (turn && CHAT_KINDS[turn.kind].answerer === 'direct' && input.liveState.fen) {
      const studentWB = input.liveState.studentColor === 'black' ? 'b' : input.liveState.studentColor === 'white' ? 'w' : (input.liveState.fen.split(' ')[1] === 'b' ? 'b' : 'w');
      const text = directAnswer(turn, input.liveState.fen, conversationFor(input.liveState.surface), studentWB);
      if (text) {
        servedParsed = true;
        if (read) {
          void settleChatTurnRead({ input, read, fastPathLane: fastPathLane(input.ask, { fen: input.liveState.fen }), servedIntent: turn.kind, servedParsed })
            .catch(() => { /* telemetry never breaks a turn */ });
        }
        return { text, toolCallIds: [], dispatchedToolNames: [], provider: options.provider ?? 'deepseek', servedIntent: turn.kind };
      }
    }
    const canonical = turn ? canonicalAsk(turn) : null;
    if (canonical) {
      effectiveInput = { ...input, ask: canonical };
      servedParsed = true;
    }
  }

  let routedCommand = false;
  const finish = (answer: CoachAnswer): CoachAnswer => {
    if (read) {
      void settleChatTurnRead({
        input,
        read,
        fastPathLane: fastPathLane(input.ask, { fen: input.liveState.fen, routedCommand }),
        servedIntent: answer.servedIntent ?? null,
        servedParsed,
      }).catch(() => { /* telemetry never breaks a turn */ });
    }
    return answer;
  };

  if (!options.skipActionRouter) {
    try {
      const routed = await routeChatIntent(effectiveInput.ask, {
        currentFen: effectiveInput.liveState.fen,
        lastAssistantMessage: options.lastAssistantMessage,
      });
      if (routed) {
        routedCommand = true;
        // Navigate only when the surface wired a handler — otherwise the ack
        // still returns (the coach TELLS the user), so no capability silently
        // dies; the surface just didn't opt into moving the user.
        if (routed.path && options.onNavigate) options.onNavigate(routed.path);
        return finish({
          text: routed.ackMessage,
          toolCallIds: [],
          dispatchedToolNames: routed.path ? ['navigate_to_route'] : [],
          provider: options.provider ?? 'deepseek',
          ...(routed.path ? { actionOffer: [{ type: 'navigate', id: routed.path }] } : {}),
        });
      }
    } catch (err) {
      // The router must never break a turn — fall through to the brain.
      console.warn('[dispatchCoachTurn] action router failed:', err);
    }
  }
  return finish(await coachService.ask(effectiveInput, options));
}

/**
 * Put a student turn that does NOT go through this door under the same
 * measurement — Learn's handleSubmit runs its own routers before the brain
 * (moving it onto the door is the follow-up, ONE-CHAT FINAL step 7). Reads,
 * compares with the fast-path lane and emits; `servedIntent` is unknown here,
 * so the row says null rather than guessing. Fire-and-forget; never throws.
 */
export function shadowReadTurn(input: CoachAskInput): void {
  if (!isStudentTurn(input)) return;
  void settleChatTurnRead({
    input,
    read: startChatTurnRead(input),
    fastPathLane: fastPathLane(input.ask, { fen: input.liveState.fen }),
    servedIntent: null,
    servedParsed: false,
  }).catch(() => { /* telemetry never breaks a turn */ });
}
