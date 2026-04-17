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
import { AGENT_ACTION_GRAMMAR } from './coachPrompts';
import { useCoachSessionStore } from '../stores/coachSessionStore';
import type { ChatMessage } from '../types';

const HISTORY_LIMIT = 20;

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
  const { history, navigate, extraSystemPrompt, onChunk } = options;

  const snapshot = await buildCoachContextSnapshot();
  const snapshotText = formatCoachContextSnapshot(snapshot);

  const additions = [AGENT_ACTION_GRAMMAR, snapshotText];
  if (extraSystemPrompt) additions.push(extraSystemPrompt);
  const systemAddition = additions.join('\n\n');

  const trimmed = history.slice(-HISTORY_LIMIT).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const raw = await getCoachChatResponse(trimmed, systemAddition, onChunk);

  const { cleanText, actions } = parseActions(raw);

  if (actions.length > 0) {
    const ctx: ActionContext = { navigate };
    await dispatchActions(actions, ctx);
  }

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
  const { userText, navigate, extraSystemPrompt, onChunk } = options;

  const userMessage: ChatMessage = {
    id: `msg-${Date.now()}-u`,
    role: 'user',
    content: userText,
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
    useCoachSessionStore.getState().appendMessage(result.assistantMessage);
    return result;
  } finally {
    useCoachSessionStore.getState().setStreaming(false);
  }
}
