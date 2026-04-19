/**
 * coachAgentRunner
 * ----------------
 * Single agent loop for the coach chat. Two entry points:
 *
 *   - `runAgentTurn`   — stateless. Caller passes in the conversation
 *     history; we send to the LLM, parse [[ACTION:...]] tags, dispatch
 *     them, and return the new assistant message. Used by per-game
 *     chats that maintain their own message list (GameChatPanel).
 *
 *   - `runCoachTurn`   — uses `useCoachSessionStore` as the source of
 *     truth for messages; appends user + assistant messages and toggles
 *     the streaming flag. Used by the persistent coach chat page and
 *     the global drawer (one shared conversation across screens).
 *
 * Both wrap the same: snapshot → LLM → parseActions → dispatch →
 * cleaned text.
 */
import { getCoachChatResponse } from './coachApi';
import {
  buildCoachContextSnapshot,
  formatCoachContextSnapshot,
} from './coachContextSnapshot';
import {
  parseActions,
  dispatchActions,
  type ActionContext,
  type ParsedAction,
} from './coachActionDispatcher';
import { AGENT_ACTION_GRAMMAR, COACH_CONVERSATION_RULES } from './coachPrompts';
import { extractAndRememberNotes, buildCoachMemoryBlock } from './coachMemoryService';
import { buildStudentStateBlock } from './studentStateBlock';
import { buildGroundingBlock } from './coachContextEnricher';
import { useCoachSessionStore } from '../stores/coachSessionStore';
import { useAppStore } from '../stores/appStore';
import { voiceService } from './voiceService';
import type { ChatMessage } from '../types';

const HISTORY_LIMIT = 20;

/**
 * Deterministic narration-toggle detector. Runs BEFORE the LLM so
 * "narrate while we play" reliably flips voice on regardless of
 * prompt-following. Returns `{ enable }` on match, null otherwise.
 */
export function detectNarrationToggle(text: string): { enable: boolean } | null {
  const lower = text.toLowerCase();
  const hasNarrationTopic =
    /\b(narrat|commentat|commentar|voice|speak|talk|announc)/i.test(lower);
  // "shut up" stands on its own.
  if (/\bshut\s+up\b/i.test(lower)) return { enable: false };
  const offSignal =
    /\b(stop|turn\s+off|disable|silence|mute|quiet|no\s+more|cease|end)\b/i;
  if (offSignal.test(lower) && hasNarrationTopic) return { enable: false };
  const hasVerb =
    /\b(narrat|commentat|speak|voice|announce|talk\s+through)/i.test(lower);
  const hasPlayContext =
    /\b(game|play|we|move|each\s+move|during|while|turn\s+on)\b/i.test(lower);
  if (hasVerb && hasPlayContext) return { enable: true };
  return null;
}

/**
 * Apply a narration toggle and return the user-facing ack text. Flips
 * both the session-store narrationMode and the appStore coachVoiceOn
 * flag (the existing per-move commentary path reads the latter).
 */
export function applyNarrationToggle(enable: boolean): string {
  useCoachSessionStore.getState().setNarrationMode(enable);
  const voiceOn = useAppStore.getState().coachVoiceOn;
  if (enable && !voiceOn) useAppStore.getState().toggleCoachVoice();
  if (!enable && voiceOn) useAppStore.getState().toggleCoachVoice();
  const ack = enable
    ? "Got it — I'll narrate each move out loud as we play. Starting a game now."
    : "Narration off — I'll stay quiet and let you focus.";
  if (enable) {
    void voiceService.speak(ack).catch((err: unknown) => {
      console.warn('[applyNarrationToggle] TTS failed:', err);
    });
  }
  return ack;
}

/**
 * Speak a short announcement of a move. Used by CoachGamePage after
 * both sides' moves so narration is guaranteed when the session is in
 * narration mode, even if LLM commentary is empty or slow.
 *
 * Precedence: full LLM commentary > short SAN announcement > silence.
 * Gated on useCoachSessionStore.narrationMode so non-narrated games
 * stay silent (narrationMode is only on when the user asked for it).
 */
export function narrateMove(opts: {
  san: string;
  mover: 'w' | 'b';
  playerColor: 'w' | 'b';
  commentary?: string | null;
}): void {
  if (!useCoachSessionStore.getState().narrationMode) return;
  const text = opts.commentary?.trim()
    ? opts.commentary.trim()
    : opts.mover === opts.playerColor
      ? `You played ${opts.san}.`
      : `I played ${opts.san}.`;
  // Log TTS failures so silent regressions are detectable. Don't
  // surface to UI here — narrateMove is invoked on every move and a
  // toast storm on a Polly outage would be worse than silence.
  // CoachGamePage + GameChatPanel handle their own user-initiated
  // TTS errors where a toast is appropriate.
  void voiceService.speak(text).catch((err: unknown) => {
    console.warn('[narrateMove] TTS failed:', err);
  });
}

export interface RunAgentTurnOptions {
  /** Conversation so far INCLUDING the new user message. */
  history: ChatMessage[];
  /** React Router navigate. Required for navigation actions. */
  navigate: (path: string) => void;
  /** Per-screen system additions (game context, board annotation
   *  grammar, etc.). Appended to the agent grammar + snapshot block. */
  extraSystemPrompt?: string;
  /** Streaming chunk callback for prose. Tag stripping happens
   *  post-stream — chunks include action tag fragments. */
  onChunk?: (chunk: string) => void;
  /** Optional game-mutation hooks. Only set when the chat is rendered
   *  alongside an active play session so the coach can emit
   *  play_variation actions. */
  game?: {
    playVariation: (args: { undo: number; moves: string[] }) => boolean;
    returnToGame: () => boolean;
    getCurrentFen: () => string;
  };
}

export interface RunAgentTurnResult {
  /** Cleaned assistant message — action tags stripped. */
  assistantMessage: ChatMessage;
  /** Raw streamed response, tags included. Useful for callers that
   *  need to parse other tag families (board annotations, etc.). */
  rawResponse: string;
  /** Actions parsed and dispatched this turn. */
  actions: ParsedAction[];
}

/**
 * Run one agent turn against the supplied history. Stateless: does not
 * mutate any store. Caller is responsible for persisting the returned
 * assistant message.
 */
export async function runAgentTurn(
  options: RunAgentTurnOptions,
): Promise<RunAgentTurnResult> {
  const { history, navigate, extraSystemPrompt, onChunk, game } = options;

  const snapshot = await buildCoachContextSnapshot();
  const snapshotText = formatCoachContextSnapshot(snapshot);

  // Pre-emptive grounding: when the user's latest message is about
  // openings / current position / their performance, we fetch
  // Lichess Opening Explorer stats, Stockfish analysis, and the
  // student's own aggregated game insights BEFORE calling the LLM.
  // That way the model answers from real data instead of its priors.
  const latestUserMessage = [...history].reverse().find((m) => m.role === 'user')?.content ?? '';
  const lastBoardFen = useAppStore.getState().lastBoardSnapshot?.fen ?? null;
  const groundingBlock = await buildGroundingBlock({
    userText: latestUserMessage,
    currentFen: lastBoardFen,
  });

  // Persistent cross-session memory. The commentary path already
  // injects this via coachMoveCommentary; the chat path needs its
  // own explicit injection so notes like "student blunders
  // back-rank when short on time" get front-and-centre framing
  // rather than hiding in the snapshot.
  const memoryBlock = await buildCoachMemoryBlock();

  // [StudentState] — trainer feel #2: always-on context awareness.
  // Reads the student's recent rhythm + sentiment so the coach can
  // adapt tone (empathy after frustration, punch when fast, depth
  // when idle).
  //
  // Tempo signal: use the PREVIOUS user message's timestamp as the
  // reference, not the most recent one. The most recent is the
  // message that just arrived — Date.now() - thatTimestamp ≈ 0,
  // which always flags FAST tempo and cancels out Unlimited
  // verbosity. Using the penultimate user message gives the real
  // "how long did they pause between turns" signal. Undefined when
  // there's only one user message (first-ever turn) — builder
  // treats that as no-tempo-signal and omits the block.
  const userMessages = history.filter((m) => m.role === 'user');
  const previousUserMs = userMessages.length >= 2
    ? userMessages[userMessages.length - 2].timestamp
    : undefined;
  const studentStateBlock = buildStudentStateBlock({
    recentChat: history,
    lastUserInteractionMs: previousUserMs,
  });

  const additions = [AGENT_ACTION_GRAMMAR, COACH_CONVERSATION_RULES, snapshotText];
  if (memoryBlock) additions.push(memoryBlock);
  if (studentStateBlock) additions.push(studentStateBlock);
  if (groundingBlock) additions.push(groundingBlock);
  if (extraSystemPrompt) additions.push(extraSystemPrompt);
  const systemAddition = additions.join('\n\n');

  const trimmed = history.slice(-HISTORY_LIMIT).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const raw = await getCoachChatResponse(trimmed, systemAddition, onChunk);

  const { cleanText: afterActions, actions } = parseActions(raw);

  if (actions.length > 0) {
    const ctx: ActionContext = { navigate, ...(game ? { game } : {}) };
    await dispatchActions(actions, ctx);
  }

  // Strip [[REMEMBER:]] tags out of the visible text and persist the
  // extracted notes to the coach's long-term memory. Runs AFTER action
  // parsing so the two tag families don't collide.
  const cleanText = extractAndRememberNotes(afterActions);

  const assistantMessage: ChatMessage = {
    id: `msg-${Date.now()}-a`,
    role: 'assistant',
    content: cleanText,
    timestamp: Date.now(),
    metadata:
      actions.length > 0
        ? {
            actions: actions.map((a) => ({
              type: a.name,
              id: JSON.stringify(a.args),
            })),
          }
        : undefined,
  };

  return { assistantMessage, rawResponse: raw, actions };
}

export interface RunCoachTurnOptions {
  userText: string;
  /** How the user input arrived — 'voice' hides the text reply bubble
   *  in the rendering layer (TTS is the primary output). */
  userModality?: 'voice' | 'text';
  navigate: (path: string) => void;
  extraSystemPrompt?: string;
  onChunk?: (chunk: string) => void;
}

/**
 * Drive one user → assistant turn through the agent loop, persisting
 * messages to the shared session store. Used by the persistent coach
 * chat page (and the drawer when it shares the chat page's history).
 */
export async function runCoachTurn(
  options: RunCoachTurnOptions,
): Promise<RunAgentTurnResult> {
  const { userText, userModality = 'text', navigate, extraSystemPrompt, onChunk } = options;

  const userMessage: ChatMessage = {
    id: `msg-${Date.now()}-u`,
    role: 'user',
    content: userText,
    modality: userModality,
    timestamp: Date.now(),
  };
  useCoachSessionStore.getState().appendMessage(userMessage);
  useCoachSessionStore.getState().setStreaming(true);

  try {
    const history = useCoachSessionStore.getState().messages;
    const result = await runAgentTurn({
      history,
      navigate,
      extraSystemPrompt,
      onChunk,
    });
    // Inherit modality so the renderer can hide the text bubble
    // when the user asked by voice.
    const taggedAssistant: ChatMessage = {
      ...result.assistantMessage,
      modality: userModality,
    };
    useCoachSessionStore.getState().appendMessage(taggedAssistant);
    return { ...result, assistantMessage: taggedAssistant };
  } finally {
    useCoachSessionStore.getState().setStreaming(false);
  }
}
