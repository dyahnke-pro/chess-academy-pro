/**
 * REQUEST STEPS — what a student asked the app to DO, as typed data
 * (WO-CHAT-01 P1, live walk 2026-10-09).
 *
 * Requests were decided by where words sat in the sentence: "I want to
 * practice the Italian opening, teach me" captured "me" as the opening (the
 * router's `teach\s+(?:me\s+)?(.+)`), a translated Thai request came back as
 * "did you mean the Ware Opening?", and "reset the board and teach me the
 * Italian" did only the first half. The reader now fills the request as a
 * list of steps — each an action with its own opening, side and account —
 * and code resolves every opening through the ONE resolver
 * (`resolveOpeningEntry`). Nothing here reads the student's words.
 *
 * PURE: no Dexie, no network, no model.
 */
import { resolveOpeningEntry } from '../services/openingDetectionService';

/** The things a student asks the app to do that a reading carries as steps.
 *  Settings, navigation and "stop" keep their own commands (they answer
 *  right today); these are the requests the walk saw fail. */
export const REQUEST_ACTIONS = [
  'teach-opening', 'play-game', 'reset-board', 'take-back', 'flip-board',
  'training-plan', 'import-games', 'review-game', 'start-now', 'show-line',
] as const;
export type RequestAction = typeof REQUEST_ACTIONS[number];

/** The reader's gloss for each action — `Record`, so a new action fails to
 *  compile until it says what it means. */
export const REQUEST_ACTION_GLOSS: Record<RequestAction, string> = {
  'teach-opening': 'teach / show / walk through / practise an opening (put its name in `opening`)',
  'play-game': 'play a game against the coach (put the side in `side`, an opening in `opening` if named)',
  'reset-board': 'reset / clear the board, start over',
  'take-back': 'take back / undo a move',
  'flip-board': 'flip / turn the board around',
  'training-plan': 'make a training plan / a study plan / a schedule',
  'import-games': 'import their games, or they gave a chess.com / lichess username (put it in `account`)',
  'review-game': 'review / go over a game they played',
  'start-now': 'start what was just offered ("go ahead", "let\'s go", "can I start now?")',
  'show-line': 'play out on the board the line the coach just gave ("show me", "play it out", "walk me through it")',
};

export interface RequestStep {
  action: RequestAction;
  /** The opening the step names, in English as said ("the Italian"). */
  opening: string | null;
  side: 'white' | 'black' | null;
  /** A chess.com / lichess username the student gave. */
  account: string | null;
}

/** A step whose opening code has resolved to one DB name. */
export interface ResolvedStep extends RequestStep {
  openingName: string | null;
}

export type StepsResult =
  | { ok: true; steps: ResolvedStep[] }
  | { ok: false; reason: 'unknown-opening'; clarify: string };

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** Whatever the reader returned under `steps`, closed: an unknown action is
 *  dropped, nothing is invented to fill a gap. */
export function coerceSteps(raw: unknown): RequestStep[] {
  if (!Array.isArray(raw)) return [];
  const out: RequestStep[] = [];
  for (const r of raw) {
    if (!isRecord(r) || typeof r.action !== 'string') continue;
    if (!(REQUEST_ACTIONS as readonly string[]).includes(r.action)) continue;
    const side = r.side === 'white' || r.side === 'black' ? r.side : null;
    out.push({ action: r.action as RequestAction, opening: str(r.opening), side, account: str(r.account) });
  }
  return out;
}

/**
 * Resolve every step's opening through the one resolver. A named opening
 * that resolves to nothing is a question back — never a guess at a near name
 * (that is how "Italian Opening" became the Ware Opening).
 */
export function resolveSteps(steps: readonly RequestStep[]): StepsResult {
  const out: ResolvedStep[] = [];
  for (const s of steps) {
    if (!s.opening) { out.push({ ...s, openingName: null }); continue; }
    const hit = resolveOpeningEntry(s.opening);
    if (!hit) {
      return { ok: false, reason: 'unknown-opening', clarify: `There's no opening called "${s.opening}" — which one did you mean?` };
    }
    out.push({ ...s, openingName: hit.canonicalName });
  }
  return { ok: true, steps: out };
}

/** The JSON schema the reader fills for `steps` (an array of these). */
export const REQUEST_STEP_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: [...REQUEST_ACTIONS] },
    opening: { type: 'string', description: 'the opening the student named for this step, in English, as said; empty if none' },
    side: { type: 'string', enum: ['white', 'black', 'none'] },
    account: { type: 'string', description: 'a chess.com / lichess username the student gave; empty if none' },
  },
  required: ['action'],
};

/** The reader's instruction for steps, from the action table. */
export function requestStepsPrompt(): string {
  const lines = REQUEST_ACTIONS.map((a) => `  - ${a}: ${REQUEST_ACTION_GLOSS[a]}`).join('\n');
  return [
    'If the student asks the app to DO something, list each thing in `steps`, IN THE ORDER ASKED (two requests in one message are two steps). Actions:',
    lines,
    'A question is never a step. "What about e4?" asks; it does not ask you to play.',
  ].join('\n');
}

/** A move or a square in any case ("D5", "Nxe5", "O-O", "e2e4") — never a
 *  username. */
const MOVE_SHAPED = /^(?:[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=?[QRBN])?[+#]?|O-O(?:-O)?|[a-h][1-8][a-h][1-8][qrbn]?)$/i;

/**
 * A message that is ONLY a username ("Knight_mare_01", a real App Store turn)
 * is a request to bring in their games: one token, starts with a letter, and
 * carries an underscore or a digit — the shape of a handle, not a word — and
 * is not shaped like a move. Read by code: a model given no context reads it
 * as "unclear", and there is nothing to understand, only a shape to see.
 */
export function readAccountName(text: string): ChatTurnLike | null {
  const t = text.trim();
  if (!/^[A-Za-z][A-Za-z0-9_-]{2,24}$/.test(t)) return null;
  if (!/[_0-9]/.test(t)) return null;
  if (MOVE_SHAPED.test(t)) return null;
  return { kind: 'command', referents: [], seat: null, topic: null, steps: [{ action: 'import-games', opening: null, side: null, account: t }] };
}

/** The ChatTurn shape, without importing chatTurn (it imports this module). */
interface ChatTurnLike {
  kind: 'command';
  referents: [];
  seat: null;
  topic: null;
  steps: RequestStep[];
}
