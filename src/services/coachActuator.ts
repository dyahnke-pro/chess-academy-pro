// coachActuator — the global "hands" of the coach (full control / real Phase 4,
// David 2026-09-08: "coach needs to be able to set up any position, open any tab,
// do all functions within the app when asked. currently it said done but we were
// still on the home screen").
//
// 🔒🔒 2026-09-21 — THE SPINE GETS THE HANDS, AND SO DOES THE USER'S TEXT BOX
// (David: "A. Not even a question." + "The hands need to be controllable by the
// user through the text box." + "this is a unified coach, so all changes get
// made to all surfaces").
//
// THE G0 BREAK THIS CLOSES. 13 of the 15 `cerebrum/` tools had ZERO references
// from `src/services/` — only the LLM could reach them. So the MODEL decided
// when the board jumped, when a move was taken back, when the app navigated,
// when coach memory was cleared. That is the LLM deciding, which G0 forbids
// outright; it was filed as "P4 deferred" and that was wrong — P4 deferred a
// spine-driven TAKEBACK MECHANIC, it never licensed the model to own thirteen
// actuators.
//
// The tell was written into the tool descriptions themselves: `setBoardPosition`
// had to instruct the model "do NOT hand-write an opening FEN from memory",
// backed by a validator that rejects opening-phase FENs. G0 names that exact
// pattern — a prompt begging the model not to hallucinate, plus a claim-stripper,
// exists ONLY because the model is still choosing. Code choosing the position
// deletes both.
//
// THE SHAPE: ONE DOOR, TWO SOURCES OF INTENT.
//
//     USER TYPES  ──► deterministic command parse ──┐
//                                                   ├──► actuate() ──► the hand
//     COACH DECIDES ──► earned by a computed signal ┘
//
// Neither source is the LLM. The model MAY help parse language into a CLOSED
// SET of intent labels (that is language work, its actual job) but it NEVER
// supplies a chess value — not the FEN, not the SAN, not the count, not the
// strength. Code fills every argument from the board, the DB or the record.
//
// WHY THIS MODULE AND NOT A NEW ONE. It was already global, already registered
// once at the app root, and already returned an honest `{ok:false}` instead of
// synthetic success — it was written to kill "the coach said done while nothing
// happened". Adding a second seam beside it is the duplicated-constant rot this
// repo keeps paying for, so the hand set grew HERE.
//
// 🚨 OBEY THE USER (David 2026-09-21: "Always obey"). An explicit command from
// the student is EXECUTED. Refusal is reserved for the genuinely impossible —
// no surface, nothing to undo, an illegal move — and it is always reported with
// a reason, never a silent no-op. The spine's judgement drives what the coach
// does on its OWN initiative; it is not a veto over what the student asked for.

import type { Square } from 'chess.js';
import { memorySetSavedPosition, memoryReadSavedPosition } from '../coach/sources/memory';

/** The play surface that renders an arbitrary coach-set position via `?fen=`. */
const BOARD_ROUTE = '/coach/play';

export interface ActuationResult {
  ok: boolean;
  reason?: string;
}

// ─── the hand set ───────────────────────────────────────────────────────────

/**
 * EVERY hand the coach has. A `Record` over this union (below) forces a new
 * hand to declare who provides it before it compiles, which is the thing this
 * file exists to make impossible to forget.
 */
export type CoachHand =
  // board
  | 'play-move' | 'take-back' | 'set-position' | 'reset-board'
  | 'set-orientation'
  // session
  | 'save-position' | 'restore-position' | 'navigate'
  // teaching
  | 'quiz-move' | 'start-walkthrough' | 'start-drill' | 'set-view-mode'
  // the eyes
  | 'show-squares'
  // the opponent
  | 'set-strength';

/**
 * WHO can perform each hand. The distinction is load-bearing:
 *  • `surface` — needs a live board on screen. Unavailable elsewhere, and that
 *    is an honest `{ok:false}`, never a fake success.
 *  • `global`  — the actuator can do it from anywhere (it owns the navigator).
 *  • `hybrid`  — a surface does it in place when one is mounted; otherwise the
 *    global fallback gets there another way (set-position navigates to
 *    `/coach/play?fen=`).
 *  • `service` — a pure service write with no UI at all, so it works on EVERY
 *    surface including ones with no board. Save/restore are these: they read
 *    and write the coach memory store, exactly as the `save_position` /
 *    `restore_saved_position` tools already do.
 */
export type HandProvider = 'surface' | 'global' | 'hybrid' | 'service';

/**
 * 🔒 WHAT HAPPENS WHEN NO SURFACE IMPLEMENTS A HAND — declared per hand, and a
 * new hand cannot compile without an answer (David 2026-09-21: "if we have a
 * unified coach, how can review have things that learn doesn't? Don't we just
 * build up the coach, then all surfaces get them automatically, it's just the
 * tools that use them differently?").
 *
 * 🔴 HE IS RIGHT, AND THE FIRST CUT OF THIS FILE WAS WRONG. `HAND_PROVIDER`
 * marked NINE of fourteen hands `'surface'`, which in practice meant OPT-IN,
 * per surface, by hand — so a hand existed only where someone remembered to
 * publish it. That is the same drift the registry was built to kill, moved up a
 * layer: instead of threading props, each surface now hand-listed what it had.
 * The measured consequence: Learn published 6 of 13 hands while Play got 11
 * through the shared chat panel, so "drill this" failed on the surface that
 * OWNS in-place drills, and "make it harder" worked on Play and not on Learn.
 * That was not an oversight to patch — it is what the design predicted.
 *
 * The proof that the other model works was already in this file: `navigate`
 * (global), `save-position` / `restore-position` (service) and `set-position`
 * (hybrid — in place when a board is mounted, else the play route) need NO
 * surface to opt in. Every surface has them, and a surface only changes HOW
 * they render.
 *
 * So the default is inverted. A surface handler is an OVERRIDE, and every hand
 * states what the coach does without one. `'none'` is a legitimate answer — a
 * move needs a board — but it must say WHY, and that sentence is what the
 * student is told instead of a flat "no board on this surface".
 */
export type HandFallback =
  /** The actuator performs it itself, no surface needed. */
  | { kind: 'global' }
  /** Written to shared state; whatever is mounted picks it up. */
  | { kind: 'service' }
  /** Take the student to a surface that CAN do it. */
  | { kind: 'route'; to: string }
  /** Honestly impossible without a surface — `because` is said out loud. */
  | { kind: 'none'; because: string };

export const HAND_FALLBACK: Record<CoachHand, HandFallback> = {
  // A move needs a board that is already mounted: routing first would land on a
  // fresh board where the move is meaningless, which is worse than a refusal.
  'play-move': { kind: 'none', because: 'there is no board here to move on — open a board first and I will play it' },
  'take-back': { kind: 'none', because: 'there is no game here to take a move back from' },
  'set-position': { kind: 'route', to: BOARD_ROUTE },
  'reset-board': { kind: 'route', to: BOARD_ROUTE },
  // 🔴 OWED, AND SAID OUT LOUD RATHER THAN QUIETLY LEFT. Both of these are
  // SETTINGS, not surface actions — which side sits at the bottom, and how hard
  // the opponent plays. They cannot be `service` yet because the app has FOUR
  // local copies of `difficulty` (Play, Learn, OpeningPlayMode, Kid) and TWO of
  // board orientation, with no shared field to write. Hoisting those onto one
  // source is the next step; until it lands, this states the real reason
  // instead of pretending the hand is surface-bound by nature.
  'set-orientation': { kind: 'none', because: 'I can only flip a board that is on screen' },
  'set-strength': { kind: 'none', because: 'I can only change the opponent in a game that is running' },
  'save-position': { kind: 'service' },
  'restore-position': { kind: 'service' },
  navigate: { kind: 'global' },
  'quiz-move': { kind: 'none', because: 'quizzing needs a board with a move worth asking about' },
  'start-walkthrough': { kind: 'route', to: '/coach/teach' },
  // The drill itself comes from `coachDrillService` — only WHERE it renders is
  // the surface's business, so a surface without a runner sends the student to
  // one that has it rather than refusing.
  'start-drill': { kind: 'route', to: '/tactics/calculation' },
  'set-view-mode': { kind: 'none', because: 'view modes belong to whichever surface is open' },
  'show-squares': { kind: 'none', because: 'there is no board here to point at' },
};

export const HAND_PROVIDER: Record<CoachHand, HandProvider> = {
  'play-move': 'surface',
  'take-back': 'surface',
  'set-position': 'hybrid',
  'reset-board': 'surface',
  'set-orientation': 'surface',
  'save-position': 'service',
  'restore-position': 'service',
  navigate: 'global',
  'quiz-move': 'surface',
  'start-walkthrough': 'hybrid',
  'start-drill': 'surface',
  'set-view-mode': 'surface',
  'show-squares': 'surface',
  'set-strength': 'surface',
};

/**
 * WHAT the coach wants done. Every field is a value CODE produced — a SAN the
 * board validated, a FEN from the DB, squares a fact-computer coupled at
 * emission. The model never fills one of these in.
 */
export type CoachAction =
  | { hand: 'play-move'; san: string }
  | { hand: 'take-back'; count: number }
  | { hand: 'set-position'; fen: string }
  | { hand: 'reset-board' }
  | { hand: 'set-orientation'; orientation: 'white' | 'black' }
  /** The FEN is supplied by the caller that HAS the board — the actuator is a
   *  leaf and never reaches for live state. */
  | { hand: 'save-position'; fen: string; label?: string }
  | { hand: 'restore-position' }
  | { hand: 'navigate'; path: string }
  | { hand: 'quiz-move'; expectedSan: string; prompt: string; allowAlternatives?: readonly string[] }
  | { hand: 'start-walkthrough'; opening: string; variation?: string; orientation?: 'white' | 'black'; pgn?: string }
  | { hand: 'start-drill'; motif?: string | null }
  | { hand: 'set-view-mode'; mode: string }
  /** THE EYES. Squares come from `ClauseItem.squares`, coupled at emission by
   *  the computer that produced the fact — never scraped back out of prose. */
  | { hand: 'show-squares'; squares: readonly Square[]; arrows?: readonly { from: Square; to: Square }[] }
  /** THE OPPONENT'S STRENGTH. `targetElo` is computed from the board (the same
   *  `capabilityEvidence` measurement that drives teaching), never typed in. */
  | { hand: 'set-strength'; targetElo: number };

/** The handlers a mounted surface offers. All optional: a surface answers for
 *  the hands it genuinely has, and the resolver reports the truth about the
 *  rest. Returning `void` is read as success; throwing is caught. */
export interface CoachHands {
  playMove?: (san: string) => unknown;
  takeBack?: (count: number) => unknown;
  setPosition?: (fen: string) => unknown;
  resetBoard?: () => unknown;
  setOrientation?: (orientation: 'white' | 'black') => unknown;
  savePosition?: () => unknown;
  restorePosition?: () => unknown;
  quizMove?: (args: { expectedSan: string; prompt: string; allowAlternatives?: readonly string[] }) => unknown;
  startWalkthrough?: (args: { opening: string; variation?: string; orientation?: 'white' | 'black'; pgn?: string }) => unknown;
  startDrill?: (motif?: string | null) => unknown;
  setViewMode?: (mode: string) => unknown;
  showSquares?: (squares: readonly Square[], arrows?: readonly { from: Square; to: Square }[]) => unknown;
  setStrength?: (targetElo: number) => unknown;
}

// ─── registration ───────────────────────────────────────────────────────────

let navigateFn: ((path: string) => void) | null = null;
/**
 * 🔒 A STACK, NOT A SLOT — and an EMPTY SET PUBLISHES NOTHING (2026-09-21).
 *
 * This was `let hands = next` with `if (hands === next) hands = {}` on unmount,
 * and that is correct only while exactly one hand-owning surface is mounted.
 * It is not: `GlobalCoachDrawer` renders the SAME chat panel over whatever page
 * the student is on, and passes it no board callbacks at all. So the drawer
 * opening over Play registered `{playMove: undefined, …}`, WIPING Play's real
 * hands; closing it cleared the slot to `{}`; and Play never got them back,
 * because its own effect had no reason to re-run. One drawer open/close and the
 * board went deaf to every command for the rest of the session.
 *
 * Two rules fix it, and both are needed:
 *  1. A set with NO functions is not a registration. A surface with nothing to
 *     publish must not be able to take the registry away from one that has.
 *  2. Unregistering RESTORES the owner underneath instead of clearing. An
 *     overlay that legitimately owns hands (a modal board) gets them while it
 *     is up, and the surface beneath gets them back when it goes away.
 *
 * Ordering is by mount, so the TOP of the stack is the most recently mounted
 * owner — the same "last mount wins" the old slot had, minus the two ways it
 * lost hands permanently.
 */
interface HandsEntry { readonly hands: CoachHands }
const handStack: HandsEntry[] = [];

/** The hands of the top-most owner. `{}` when nothing is mounted — every
 *  reader then answers {ok:false} with a reason rather than faking success. */
function hands_(): CoachHands {
  return handStack.length > 0 ? handStack[handStack.length - 1].hands : {};
}

/** Register the app's navigate function (call once at the app root). */
export function registerCoachNavigate(fn: (path: string) => void): void {
  navigateFn = fn;
}

/** Drop the registration (on app-root unmount / tests). */
export function clearCoachNavigate(): void {
  navigateFn = null;
}

/**
 * A mounted surface publishes its hands. Returns the unregister function, so a
 * component can `useEffect(() => registerCoachHands(h), [])` and clean up on
 * unmount without a second import.
 *
 * 🚨 LAST MOUNT WINS, and that is deliberate. Two coach surfaces are never
 * interactive at once — the student is on one board — so the most recently
 * mounted one is the one their command is about. The unregister only clears if
 * it is still the owner, so an unmount racing a mount cannot blank the live
 * surface's hands.
 */
export function registerCoachHands(next: CoachHands): () => void {
  // Rule 1: nothing to publish → no claim. The global drawer mounts this same
  // panel with no board callbacks, and it must not evict the surface below it.
  if (!Object.values(next).some((h) => typeof h === 'function')) return () => {};
  const entry: HandsEntry = { hands: next };
  handStack.push(entry);
  // Rule 2: pop THIS entry wherever it sits, restoring whoever is beneath.
  // Splice by identity rather than popping the end, so an out-of-order unmount
  // (React does not promise LIFO across trees) never evicts someone else.
  return () => {
    const i = handStack.indexOf(entry);
    if (i >= 0) handStack.splice(i, 1);
  };
}

/** Drop every surface hand (tests / app-root unmount). */
export function clearCoachHands(): void {
  handStack.length = 0;
}

/** The hands the currently-mounted surface published. */
export function currentCoachHands(): CoachHands {
  return hands_();
}

// ─── the one entry point ────────────────────────────────────────────────────

/** Navigate the app to a route. Returns {ok:false} when no navigator is
 *  registered — so a caller can report the truth instead of faking success. */
export function coachNavigate(path: string): ActuationResult {
  const p = (path ?? '').trim();
  if (!p) return { ok: false, reason: 'empty path' };
  if (!navigateFn) return { ok: false, reason: 'navigation unavailable on this surface' };
  try {
    navigateFn(p);
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Set up a position on the play board from anywhere: navigate to the play
 *  surface seeded with the FEN (it renders `?fen=`). Returns {ok:false} when
 *  navigation isn't available, so the coach never fake-reports "done". */
export function coachSetBoardPosition(fen: string): ActuationResult {
  const f = (fen ?? '').trim();
  if (!f) return { ok: false, reason: 'no fen' };
  return coachNavigate(`${BOARD_ROUTE}?fen=${encodeURIComponent(f)}`);
}

/** True when a navigator is registered (the coach can actually actuate). */
export function coachCanActuate(): boolean {
  return navigateFn !== null;
}

/** Can this specific hand be performed right now? Used to tell the student the
 *  truth ("no board here") rather than failing silently. */
export function canPerform(hand: CoachHand): boolean {
  const provider = HAND_PROVIDER[hand];
  if (provider === 'service') return true; // no UI needed — works anywhere
  if (provider === 'global') return navigateFn !== null;
  const has = surfaceHandlerFor(hand) !== undefined;
  return provider === 'hybrid' ? has || navigateFn !== null : has;
}

function surfaceHandlerFor(hand: CoachHand): ((...args: never[]) => unknown) | undefined {
  const h = hands_() as Record<string, ((...args: never[]) => unknown) | undefined>;
  const key: Record<CoachHand, keyof CoachHands> = {
    'play-move': 'playMove',
    'take-back': 'takeBack',
    'set-position': 'setPosition',
    'reset-board': 'resetBoard',
    'set-orientation': 'setOrientation',
    'save-position': 'savePosition',
    'restore-position': 'restorePosition',
    navigate: 'playMove', // unused: navigate is global-only (see HAND_PROVIDER)
    'quiz-move': 'quizMove',
    'start-walkthrough': 'startWalkthrough',
    'start-drill': 'startDrill',
    'set-view-mode': 'setViewMode',
    'show-squares': 'showSquares',
    'set-strength': 'setStrength',
  };
  return hand === 'navigate' ? undefined : h[key[hand]];
}

/** Normalise whatever a surface handler returned into an ActuationResult.
 *  `void`/`undefined` means it did the thing; a surface may also return an
 *  explicit `{ok:false, reason}` to refuse with an explanation. */
async function settle(value: unknown): Promise<ActuationResult> {
  const r = await Promise.resolve(value);
  if (r === undefined || r === null) return { ok: true };
  if (typeof r === 'boolean') return { ok: r };
  if (typeof r === 'object' && 'ok' in (r as Record<string, unknown>)) return r as ActuationResult;
  return { ok: true };
}

/**
 * No surface implements this hand — so ask the coach what it does anyway.
 * Replaces six identical `{ok:false,'no board on this surface'}` dead ends,
 * each of which was the same sentence for a different question. A hand whose
 * fallback ROUTES now takes the student somewhere it works; one that genuinely
 * cannot says why, in its own words.
 */
function withoutSurface(hand: CoachHand): ActuationResult {
  const fb = HAND_FALLBACK[hand];
  switch (fb.kind) {
    case 'route': return coachNavigate(fb.to);
    case 'none': return { ok: false, reason: fb.because };
    // `global` and `service` hands never reach here — they are answered by
    // their own case in `actuate` before the handler is consulted.
    default: return { ok: false, reason: `${hand} is unavailable here` };
  }
}


/**
 * PERFORM THE ACTION. The single door every hand goes through, whether the
 * spine decided it or the student typed it.
 *
 * It never throws: a handler that blows up becomes `{ok:false, reason}`, so a
 * caller always has something true to say. That matters more than it sounds —
 * the bug this module was born from was a tool reporting success it had not
 * achieved.
 */
export async function actuate(action: CoachAction): Promise<ActuationResult> {
  // ONE snapshot for the whole dispatch. Beyond satisfying narrowing, it is the
  // correct semantics: a surface unmounting mid-await must not make the second
  // half of a dispatch read a different owner's hands than the first half did.
  const h = hands_();
  const handler = surfaceHandlerFor(action.hand);
  try {
    switch (action.hand) {
      case 'navigate':
        return coachNavigate(action.path);
      case 'set-position': {
        const f = (action.fen ?? '').trim();
        if (!f) return { ok: false, reason: 'no fen' };
        // hybrid: in place when a board is mounted, else the play route.
        if (h.setPosition) return await settle(h.setPosition(f));
        return coachSetBoardPosition(f);
      }
      case 'start-walkthrough':
        if (h.startWalkthrough) return await settle(h.startWalkthrough(action));
        return coachNavigate(`/coach/teach?opening=${encodeURIComponent(action.opening)}`);
      case 'play-move':
        if (!handler) return withoutSurface('play-move');
        return await settle(h.playMove?.(action.san));
      case 'take-back':
        if (!handler) return withoutSurface('take-back');
        return await settle(h.takeBack?.(action.count));
      case 'reset-board':
        if (!handler) return withoutSurface('reset-board');
        return await settle(h.resetBoard?.());
      case 'set-orientation':
        if (!handler) return withoutSurface('set-orientation');
        return await settle(h.setOrientation?.(action.orientation));
      case 'save-position': {
        // SERVICE-level: the same coach-memory write the `save_position` tool
        // makes, so "save this spot" works on a surface with no board too.
        const f = (action.fen ?? '').trim();
        if (!f) return { ok: false, reason: 'no position to save' };
        memorySetSavedPosition({ fen: f, label: action.label });
        return { ok: true };
      }
      case 'restore-position': {
        // Read the memory, then put it on a board through the normal
        // set-position path (in place when one is mounted, else the play
        // route). One mechanism, not a second restore.
        const saved = memoryReadSavedPosition();
        const fen = typeof saved?.fen === 'string' ? saved.fen : '';
        if (!fen) return { ok: false, reason: 'nothing saved yet' };
        if (h.restorePosition) return await settle(h.restorePosition());
        if (h.setPosition) return await settle(h.setPosition(fen));
        return coachSetBoardPosition(fen);
      }
      case 'quiz-move':
        if (!handler) return withoutSurface('quiz-move');
        return await settle(h.quizMove?.(action));
      case 'start-drill':
        if (!handler) return withoutSurface('start-drill');
        return await settle(h.startDrill?.(action.motif ?? null));
      case 'set-view-mode':
        if (!handler) return withoutSurface('set-view-mode');
        return await settle(h.setViewMode?.(action.mode));
      case 'show-squares':
        if (!handler) return withoutSurface('show-squares');
        return await settle(h.showSquares?.(action.squares, action.arrows));
      case 'set-strength':
        if (!handler) return withoutSurface('set-strength');
        return await settle(h.setStrength?.(action.targetElo));
    }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ─── the bridge from the student's text box ─────────────────────────────────

/**
 * TURN A ROUTED USER COMMAND INTO A HAND.
 *
 * `coachSessionRouter.tryRouteIntent` is the app's ONE deterministic command
 * router (regex-first, no model). This adapter is the only thing between it and
 * the hands, so the student's text box and the spine reach `actuate` through
 * the same door — which is the whole design (see this file's header).
 *
 * 🔒 EVERY CHESS VALUE IS FILLED HERE, FROM THE BOARD — never from the
 * sentence. The router deliberately returns a DIRECTION for strength rather
 * than a number, because it does not know the opponent's current Elo; the step
 * is applied here, off the live value. Same reason `quiz_me` and `show_squares`
 * arrive with nothing in them: the MOVE and the SQUARES are the caller's to
 * resolve from the live position and the computed facts, and a parser that
 * invented either would be the model's old job wearing a regex.
 */
export interface CommandBoardContext {
  /** The opponent's current strength, so harder/easier is a real step. */
  currentElo?: number;
  /** The move the board says is the teachable one, when the caller resolved
   *  one — `quiz_me` needs it and the router cannot know it. */
  quizSan?: string | null;
  /** Squares a fact-computer coupled at emission — `show_squares` needs them. */
  squares?: readonly Square[];
  /** The live FEN, for `save_position`. */
  fen?: string;
}

/** One step of strength. Small on purpose: the foundation's rule is that
 *  confidence NARROWS rather than swings, so a single "make it harder" moves
 *  the opponent a band, not a class. */
export const ELO_STEP = 150;
const ELO_MIN = 600;
const ELO_MAX = 2800;
const ELO_DEFAULT = 1200;

export function steppedElo(current: number | undefined, dir: 'up' | 'down'): number {
  const base = typeof current === 'number' && Number.isFinite(current) ? current : ELO_DEFAULT;
  return Math.max(ELO_MIN, Math.min(ELO_MAX, Math.round(base + (dir === 'up' ? ELO_STEP : -ELO_STEP))));
}

/** The routed-intent shape this adapter consumes. Declared structurally rather
 *  than imported so this leaf does not depend on the router (which imports half
 *  the opening stack) — the union is the contract, and the exhaustive switch
 *  below fails to compile if the router adds a kind without answering here. */
export type RoutedCommand =
  | { kind: 'play_move'; san: string }
  | { kind: 'take_back_move'; count: number }
  | { kind: 'reset_board' }
  | { kind: 'set_board_position'; fen: string }
  | { kind: 'navigate_to_route'; route: string }
  | { kind: 'set_orientation'; orientation: 'white' | 'black' }
  | { kind: 'save_position' }
  | { kind: 'restore_position' }
  | { kind: 'set_strength'; direction: 'up' | 'down' }
  | { kind: 'quiz_me' }
  | { kind: 'start_drill' }
  | { kind: 'show_squares' };

export function actionForCommand(
  intent: RoutedCommand,
  ctx: CommandBoardContext = {},
): CoachAction | null {
  switch (intent.kind) {
    case 'play_move': return { hand: 'play-move', san: intent.san };
    case 'take_back_move': return { hand: 'take-back', count: intent.count };
    case 'reset_board': return { hand: 'reset-board' };
    case 'set_board_position': return { hand: 'set-position', fen: intent.fen };
    case 'navigate_to_route': return { hand: 'navigate', path: intent.route };
    case 'set_orientation': return { hand: 'set-orientation', orientation: intent.orientation };
    case 'save_position':
      // Nothing to save without a board — honest null beats saving a blank.
      return ctx.fen ? { hand: 'save-position', fen: ctx.fen } : null;
    case 'restore_position': return { hand: 'restore-position' };
    case 'set_strength': return { hand: 'set-strength', targetElo: steppedElo(ctx.currentElo, intent.direction) };
    case 'quiz_me':
      // No move resolved → no quiz. Empty > invented (G3): the caller asks the
      // board for the teachable move, and when there isn't one we say so
      // rather than quizzing on a move nobody computed.
      return ctx.quizSan ? { hand: 'quiz-move', expectedSan: ctx.quizSan, prompt: 'Your move — what did you find?' } : null;
    case 'start_drill': return { hand: 'start-drill', motif: null };
    case 'show_squares':
      return ctx.squares && ctx.squares.length > 0 ? { hand: 'show-squares', squares: ctx.squares } : null;
  }
}
