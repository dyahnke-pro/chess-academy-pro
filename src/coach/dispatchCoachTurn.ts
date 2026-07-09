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
 * Composed in a SEPARATE module on purpose: importing `routeChatIntent` INTO
 * `coachService` would cycle (coachService ← trainingAidRouter ← coachSessionRouter).
 * This wrapper depends on both; neither depends on it.
 *
 * Migration: surfaces that today call `routeChatIntent` + `coachService.ask`
 * separately (CoachChatPage, GameChatPanel) collapse to this; surfaces that
 * bypass the router entirely (VoiceChatMic, MasterclassCoachChat, CoachAnalyse,
 * ExplainPosition) gain the full action set by adopting it.
 */
import { coachService, type CoachServiceOptions } from './coachService';
import type { CoachAskInput, CoachAnswer, ProviderName } from './types';
import { routeChatIntent } from '../services/coachSessionRouter';

export interface DispatchCoachTurnOptions extends CoachServiceOptions {
  /** The prior assistant message — lets the action router catch the
   *  "coach proposed a game → user said yes" affirmation flow. */
  lastAssistantMessage?: string;
  /** Skip the deterministic action router (rare — a surface that must never
   *  navigate/route away, e.g. a locked in-lesson board). Default false. */
  skipActionRouter?: boolean;
}

export async function dispatchCoachTurn(
  input: CoachAskInput,
  options: DispatchCoachTurnOptions = {},
): Promise<CoachAnswer> {
  if (!options.skipActionRouter) {
    try {
      const routed = await routeChatIntent(input.ask, {
        currentFen: input.liveState.fen,
        lastAssistantMessage: options.lastAssistantMessage,
      });
      if (routed) {
        // Navigate only when the surface wired a handler — otherwise the ack
        // still returns (the coach TELLS the user), so no capability silently
        // dies; the surface just didn't opt into moving the user.
        if (routed.path && options.onNavigate) options.onNavigate(routed.path);
        return {
          text: routed.ackMessage,
          toolCallIds: [],
          dispatchedToolNames: routed.path ? ['navigate_to_route'] : [],
          provider: (options.provider ?? 'deepseek') as ProviderName,
          ...(routed.path ? { actionOffer: [{ type: 'navigate', id: routed.path }] } : {}),
        };
      }
    } catch (err) {
      // The router must never break a turn — fall through to the brain.
      console.warn('[dispatchCoachTurn] action router failed:', err);
    }
  }
  return coachService.ask(input, options);
}
