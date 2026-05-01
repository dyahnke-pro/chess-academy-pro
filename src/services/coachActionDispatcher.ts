/**
 * coachActionDispatcher
 * ---------------------
 * Provider-agnostic action protocol for the agent coach. The LLM
 * (DeepSeek or Anthropic — same grammar both) emits structured
 * action tags inline with its prose:
 *
 *   [[ACTION:start_play {"opening":"King's Indian Attack","side":"black","narrate":true}]]
 *   [[ACTION:analyze_game {"id":"game-482"}]]
 *   [[ACTION:narrate {"text":"Watch the e-file."}]]
 *
 * Tags are stripped from the rendered text and passed to the action
 * registry which executes the side effects (navigation, narration,
 * focus changes). Each result is recorded on the session store so the
 * next LLM turn can see what happened.
 */
import { useCoachSessionStore, type CoachActionRecord } from '../stores/coachSessionStore';
import { useAppStore } from '../stores/appStore';
import { findLastMatchingGame } from './gameContextService';
import { searchOpenings } from './openingService';
import { voiceService } from './voiceService';
import { db } from '../db/schema';
import type { GameRecord } from '../types';

export interface ParsedAction {
  name: string;
  args: Record<string, unknown>;
  /** Where in the original text the tag appeared (for ordering). */
  index: number;
}

export interface ParsedActionsResult {
  cleanText: string;
  actions: ParsedAction[];
}

export interface ActionContext {
  /** React Router navigate. Required for navigation actions. */
  navigate: (path: string) => void;
  /**
   * Live-game callbacks, provided only when the chat is rendered
   * alongside an active play session (e.g. CoachGamePage's in-game
   * chat panel). When absent, any action that needs to mutate the
   * board returns an error result gracefully rather than crashing.
   */
  game?: {
    /** Apply a variation: undo the last N half-moves, then play
     *  SAN moves forward. Returns true on success, false if any
     *  move failed to apply (invalid SAN, nothing to undo, etc.). */
    playVariation: (args: { undo: number; moves: string[] }) => boolean;
    /** Snap the board back to the position it was in the first time
     *  a variation was applied. Returns true if there was a saved
     *  pre-variation state to restore, false if the board is already
     *  on the real line (no variation in progress). */
    returnToGame: () => boolean;
    /** Return the current FEN — useful for logging in the action
     *  result so the next LLM turn sees where the board landed. */
    getCurrentFen: () => string;
  };
}

export interface ActionResult {
  status: 'ok' | 'error';
  /** Short message recorded on the session store and shown to the LLM
   *  on the next turn so it can react to what just happened. */
  message: string;
}

type ActionHandler = (
  args: Record<string, unknown>,
  ctx: ActionContext,
) => ActionResult | Promise<ActionResult>;

// ─── Tag parser ─────────────────────────────────────────────────────────────

// Matches `[[ACTION:name {jsonArgs}]]` markers. The args group uses a
// non-greedy `[\s\S]*?` body and a closing-context lookahead `(?=\]\])`
// instead of the older `[^\]]*` pattern — that previous pattern silently
// dropped any tool call whose JSON args contained `]` (e.g. arrays like
// `{"speeds":["blitz","rapid"]}` for lichess_opening_lookup or
// `{"themes":["fork","pin"]}` for record_blunder), since the regex
// would fail to find the closing `}`. The new shape stops at the first
// `}` followed by `]]`, which correctly handles arrays AND nested
// objects in args.
const ACTION_TAG_RE = /\[\[ACTION:([a-z_]+)(?:\s*(\{[\s\S]*?\}))?\s*(?=\]\])\]\]/gi;

/**
 * Extract action tags from coach output and return the cleaned prose
 * (with tags removed) plus the parsed action list. Malformed JSON args
 * are dropped silently — better to skip a bad tag than crash chat.
 */
export function parseActions(text: string): ParsedActionsResult {
  const actions: ParsedAction[] = [];
  const cleanText = text.replace(ACTION_TAG_RE, (_match, name: string, jsonArgs: string | undefined, offset: number) => {
    let args: Record<string, unknown> = {};
    if (jsonArgs) {
      try {
        const parsed = JSON.parse(jsonArgs) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          args = parsed as Record<string, unknown>;
        }
      } catch {
        // Malformed args — execute with empty args. Handlers validate
        // their own required keys.
      }
    }
    actions.push({ name: name.toLowerCase(), args, index: offset });
    return '';
  }).replace(/\n{3,}/g, '\n\n').trim();
  return { cleanText, actions };
}

// ─── Action registry ────────────────────────────────────────────────────────

const handlers: Record<string, ActionHandler> = {
  list_games: handleListGames,
  analyze_game: handleAnalyzeGame,
  start_play: handleStartPlay,
  narrate: handleNarrate,
  navigate: handleNavigate,
  set_focus: handleSetFocus,
  set_narration: handleSetNarration,
  play_variation: handlePlayVariation,
  return_to_game: handleReturnToGame,
};

export function getRegisteredActionNames(): string[] {
  return Object.keys(handlers);
}

/**
 * Execute parsed actions in order. Returns the per-action records that
 * have already been pushed onto the session store, for callers that
 * want to surface them in the UI (e.g., as inline status chips).
 */
export async function dispatchActions(
  actions: ParsedAction[],
  ctx: ActionContext,
): Promise<CoachActionRecord[]> {
  const records: CoachActionRecord[] = [];
  for (const action of actions) {
    const handler: ActionHandler | undefined = Object.prototype.hasOwnProperty.call(handlers, action.name)
      ? handlers[action.name]
      : undefined;
    let result: ActionResult;
    if (!handler) {
      result = { status: 'error', message: `Unknown action: ${action.name}` };
    } else {
      try {
        result = await handler(action.args, ctx);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result = { status: 'error', message: `Action ${action.name} threw: ${msg}` };
      }
    }
    const record: CoachActionRecord = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: action.name,
      args: action.args,
      result: result.status,
      message: result.message,
      ts: Date.now(),
    };
    useCoachSessionStore.getState().recordAction(record);
    records.push(record);
  }
  return records;
}

// ─── Handlers ───────────────────────────────────────────────────────────────

async function handleListGames(
  args: Record<string, unknown>,
): Promise<ActionResult> {
  const limit = clampInt(args.limit, 5, 1, 20);
  const filter = typeof args.filter === 'string' ? args.filter : undefined;
  const source = typeof args.source === 'string' ? args.source : undefined;

  const game = filter || source
    ? await findLastMatchingGame({ subject: filter, source: source as GameRecord['source'] | undefined })
    : null;

  // Always return a small slice from Dexie so the LLM has options
  // beyond "last matching game" to reference.
  const recent = await db.games.orderBy('date').reverse().filter((g) => !g.isMasterGame && g.result !== '*').limit(limit).toArray();
  const summary = recent.map(formatGameOneLiner);
  const filterNote = filter ? ` matching "${filter}"` : source ? ` from ${source}` : '';
  const headLine = game
    ? `Newest match${filterNote}: ${formatGameOneLiner(game)}`
    : `No specific match${filterNote ? filterNote : ''}.`;
  return {
    status: 'ok',
    message: `${headLine} Recent ${recent.length}: ${summary.join(' | ')}`,
  };
}

async function handleAnalyzeGame(
  args: Record<string, unknown>,
  ctx: ActionContext,
): Promise<ActionResult> {
  let game: GameRecord | null = null;
  const id = typeof args.id === 'string' ? args.id : undefined;
  const subject = typeof args.subject === 'string' ? args.subject : undefined;
  const source = typeof args.source === 'string' ? args.source : undefined;

  if (id) {
    const found = await db.games.get(id);
    game = found ?? null;
  }
  if (!game) {
    game = await findLastMatchingGame({
      subject,
      source: source as GameRecord['source'] | undefined,
    });
  }
  if (!game) {
    return { status: 'error', message: `No game found${subject ? ` for "${subject}"` : ''}.` };
  }

  ctx.navigate(`/coach/play?review=${encodeURIComponent(game.id)}`);
  useCoachSessionStore.getState().setFocus({
    kind: 'game',
    value: game.id,
    label: `${game.white} vs ${game.black}`,
  });
  return {
    status: 'ok',
    message: `Opened game review: ${formatGameOneLiner(game)}`,
  };
}

async function handleStartPlay(
  args: Record<string, unknown>,
  ctx: ActionContext,
): Promise<ActionResult> {
  const opening = typeof args.opening === 'string' ? args.opening.trim() : undefined;
  const side = args.side === 'white' || args.side === 'black' ? args.side : undefined;
  const difficulty = typeof args.difficulty === 'string'
    ? (['easy', 'medium', 'hard', 'auto'].includes(args.difficulty) ? args.difficulty : undefined)
    : undefined;
  const narrate = args.narrate === true;

  // Resolve the opening name to a known opening so the play view can
  // seed forced moves. Fall back to passing the raw subject string —
  // the play view will treat it as a "training focus" for narration.
  let resolvedOpeningName: string | undefined;
  let resolvedOpeningPgn: string | undefined;
  if (opening) {
    const matches = await searchOpenings(opening).catch(() => []);
    if (matches.length > 0) {
      resolvedOpeningName = matches[0].name;
      resolvedOpeningPgn = matches[0].pgn;
    }
  }

  const params = new URLSearchParams();
  if (opening) params.set('subject', opening);
  if (resolvedOpeningName) params.set('opening', resolvedOpeningName);
  if (resolvedOpeningPgn) params.set('openingPgn', resolvedOpeningPgn);
  if (side) params.set('side', side);
  if (difficulty && difficulty !== 'auto') params.set('difficulty', difficulty);
  if (narrate) params.set('narrate', '1');

  ctx.navigate(`/coach/session/play-against?${params.toString()}`);

  if (narrate) {
    useCoachSessionStore.getState().setNarrationMode(true);
    // Per-move commentary in CoachGamePage gates speech on
    // appStore.coachVoiceOn — flip it so "play X with narration" is
    // actually audible without the user toggling it manually.
    if (!useAppStore.getState().coachVoiceOn) {
      useAppStore.getState().toggleCoachVoice();
    }
  }
  if (resolvedOpeningName) {
    useCoachSessionStore.getState().setFocus({
      kind: 'opening',
      value: resolvedOpeningName,
      label: resolvedOpeningName,
    });
  }
  const openingNote = resolvedOpeningName
    ? `as ${resolvedOpeningName}`
    : opening
      ? `(no opening match for "${opening}", starting freestyle)`
      : '';
  const sideNote = side ? `, user plays ${side}` : '';
  const narrNote = narrate ? ', narration on' : '';
  return {
    status: 'ok',
    message: `Started play session ${openingNote}${sideNote}${narrNote}`.trim(),
  };
}

function handleNarrate(
  args: Record<string, unknown>,
): ActionResult {
  const text = typeof args.text === 'string' ? args.text.trim() : '';
  const fen = typeof args.fen === 'string' ? args.fen : undefined;
  if (!text) {
    return { status: 'error', message: 'narrate requires {"text":"..."}' };
  }
  useCoachSessionStore.getState().pushNarration({ text, fen });
  // Speak immediately. View-level subscribers also pick up the queued
  // narration to drive UI state — the speak() here ensures the user
  // hears it even when no view is currently subscribed.
  void voiceService.speak(text).catch(() => {
    /* TTS failures shouldn't block the action loop */
  });
  return { status: 'ok', message: `Narrated: ${truncate(text, 80)}` };
}

/** Paths the LLM is allowed to route the student to via a navigate
 *  action. Prompt-injection hardening from the security audit: a
 *  crafted "[[ACTION:navigate /settings]]" should not be able to
 *  drop the student into their API-key settings, nor should it be
 *  able to escape to arbitrary external URLs.
 *
 *  Matching rule: each prefix matches itself OR itself + "/...".
 *  Leaf paths (e.g. "/coach") match "/coach" and "/coach/play".
 *  Settings / onboarding / legal are deliberately excluded — the
 *  student reaches those via UI affordances only.
 */
const NAVIGATE_ALLOWED_PREFIXES: readonly string[] = [
  '/',
  '/coach',
  '/openings',
  '/tactics',
  '/weaknesses',
  '/games',
  '/puzzles',
  '/dashboard',
  '/play',
];

function isNavigatePathAllowed(path: string): boolean {
  // Reject anything that looks like an absolute URL or a protocol
  // scheme — only in-app routing is permitted.
  if (/^[a-z]+:/i.test(path)) return false;
  if (path.startsWith('//')) return false;
  // Normalise the prefix we compare against (everything up to the
  // first '?' or '#'), and strip a trailing slash so "/coach/" and
  // "/coach" match the same way.
  const base = path.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  return NAVIGATE_ALLOWED_PREFIXES.some(
    (p) => base === p || base.startsWith(p === '/' ? '/' : `${p}/`),
  );
}

function handleNavigate(
  args: Record<string, unknown>,
  ctx: ActionContext,
): ActionResult {
  const path = typeof args.path === 'string' ? args.path : undefined;
  if (!path) {
    return { status: 'error', message: 'navigate requires {"path":"..."}' };
  }
  if (!path.startsWith('/')) {
    return { status: 'error', message: 'navigate path must be relative (start with "/")' };
  }
  if (!isNavigatePathAllowed(path)) {
    return {
      status: 'error',
      message: `navigate path not allowed: ${path} (settings / onboarding / external URLs blocked)`,
    };
  }
  ctx.navigate(path);
  return { status: 'ok', message: `Navigated to ${path}` };
}

function handleSetFocus(
  args: Record<string, unknown>,
): ActionResult {
  const rawKind = typeof args.kind === 'string' ? args.kind : '';
  const value = typeof args.value === 'string' ? args.value : null;
  const label = typeof args.label === 'string' ? args.label : null;
  const validKinds = ['game', 'opening', 'fen', 'screen'] as const;
  type Kind = typeof validKinds[number];
  if (!(validKinds as readonly string[]).includes(rawKind)) {
    return { status: 'error', message: `set_focus kind must be one of ${validKinds.join(', ')}` };
  }
  const kind = rawKind as Kind;
  useCoachSessionStore.getState().setFocus({ kind, value, label });
  return { status: 'ok', message: `Focus set: ${kind}=${value ?? '(empty)'}` };
}

function handleSetNarration(
  args: Record<string, unknown>,
): ActionResult {
  const enabled = args.enabled === true;
  useCoachSessionStore.getState().setNarrationMode(enabled);
  const voiceOn = useAppStore.getState().coachVoiceOn;
  // Keep coachVoiceOn aligned — the existing per-move commentary
  // in CoachGamePage / CoachPlaySessionView gates speech on it.
  if (enabled && !voiceOn) useAppStore.getState().toggleCoachVoice();
  if (!enabled && voiceOn) useAppStore.getState().toggleCoachVoice();
  return { status: 'ok', message: `Narration mode ${enabled ? 'enabled' : 'disabled'}` };
}

/**
 * Play a what-if variation on the live game: take back the last N
 * half-moves, then play the supplied SAN moves forward. Only works
 * when the chat is rendered alongside an active game (ctx.game is
 * set). When the student asks "what if Black plays Ne4 instead of
 * Bh6?", the coach emits:
 *
 *   [[ACTION:play_variation {"undo": 1, "moves": ["Ne4"]}]]
 *
 * and the board takes the bishop back and plays the knight move.
 */
function handlePlayVariation(
  args: Record<string, unknown>,
  ctx: ActionContext,
): ActionResult {
  if (!ctx.game) {
    return {
      status: 'error',
      message:
        'play_variation requires an active game — only usable from the in-game chat panel, not the global drawer.',
    };
  }
  const undo = typeof args.undo === 'number' ? Math.max(0, Math.round(args.undo)) : 0;
  const movesRaw = Array.isArray(args.moves) ? args.moves : [];
  const moves = movesRaw.filter((m): m is string => typeof m === 'string' && m.trim().length > 0);
  if (undo === 0 && moves.length === 0) {
    return {
      status: 'error',
      message: 'play_variation requires either an "undo" count or "moves" array (or both).',
    };
  }
  const ok = ctx.game.playVariation({ undo, moves });
  if (!ok) {
    return {
      status: 'error',
      message: `play_variation failed — either nothing to undo (${undo}) or a SAN move was illegal (${moves.join(', ')}).`,
    };
  }
  const fen = ctx.game.getCurrentFen();
  const undoNote = undo > 0 ? `took back ${undo} half-move${undo === 1 ? '' : 's'}` : '';
  const playNote = moves.length > 0 ? `played ${moves.join(' ')}` : '';
  const summary = [undoNote, playNote].filter(Boolean).join(', ');
  return {
    status: 'ok',
    message: `Variation applied (${summary}). Board now at: ${fen}`,
  };
}

/**
 * Snap the board back to the position it was in the first time
 * play_variation was invoked this session. Use this when the student
 * says "ok back to the real game", "undo all that", "return to my
 * actual game", etc. — NEVER proactively.
 */
function handleReturnToGame(
  _args: Record<string, unknown>,
  ctx: ActionContext,
): ActionResult {
  if (!ctx.game) {
    return {
      status: 'error',
      message:
        'return_to_game requires an active game — only usable from the in-game chat panel.',
    };
  }
  const ok = ctx.game.returnToGame();
  if (!ok) {
    return {
      status: 'error',
      message: 'No variation to undo — the board is already on the real line.',
    };
  }
  return {
    status: 'ok',
    message: `Snapped back to the real game. Board now at: ${ctx.game.getCurrentFen()}`,
  };
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function formatGameOneLiner(game: GameRecord): string {
  const date = game.date ? `${game.date} ` : '';
  const eco = game.eco ? `[${game.eco}] ` : '';
  return `${eco}${date}${game.white}–${game.black} ${game.result} (id:${game.id})`;
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}
