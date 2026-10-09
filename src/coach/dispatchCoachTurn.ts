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
import { openSentence } from '../utils/openSentence';
import { answerBoardTurn, BOARD_ANSWERED_KINDS } from './boardTurnAnswer';
import { coachService, type CoachServiceOptions } from './coachService';
import type { CoachAskInput, CoachAnswer, CoachSurface } from './types';
import type { WalkableLine } from '../types';
import { routeChatIntent } from '../services/coachSessionRouter';
import { askSourceFor, positionalTopic } from './questionIntents';
import { assemblePositionalAnswer } from '../services/groundedAnswer';
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
  type Referent,
} from './chatTurn';
import { parseChatTurn, type ParseResult, type Reader } from './chatTurnParser';
import { emitChatTurn, type ChatTurnOutcome } from './chatTurnEvents';
import { isStockFallback } from './stockLine';
import { detectLanguage } from '../utils/detectLanguage';
import { noteTurnLanguage, chosenOrTypedLanguageName } from '../services/spokenLanguage';
import { directAnswer } from './chatTurnAnswers';
import { executeSteps } from './requestExecutor';
import type { ResolvedStep } from './requestSteps';

export interface DispatchCoachTurnOptions extends CoachServiceOptions {
  /** The prior assistant message — lets the action router catch the
   *  "coach proposed a game → user said yes" affirmation flow. */
  lastAssistantMessage?: string;
  /** Skip the deterministic action router (rare — a surface that must never
   *  navigate/route away, e.g. a locked in-lesson board). Default false. */
  skipActionRouter?: boolean;
  /** A read the surface already started for this turn (`openTurnRead`), so
   *  the turn is read ONCE: a surface whose own commands run first (Learn)
   *  starts the read up front and hands it to the door only when the turn
   *  reaches it. */
  turnRead?: TurnReadHandle;
}

// ─── THE READ, IN SHADOW ───────────────────────────────────────────────────

/** Conversation memory, ONE per surface, living inside the door. */
const conversations = new Map<CoachSurface, ConversationState>();

/** RUNTIME switch (ONE-CHAT FINAL step 5: a runtime flag, never a build flag —
 *  an OTA dispatch ships whatever `main` holds). ON since 2026-10-05 (David:
 *  "Switch it on"), after the held-out eval read 107/107: a validated reading
 *  serves its canonical route or its computed answer; a failed, slow or
 *  invalid read still falls back to today's routing. */
let serveParsedRoute = true;
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
    lastCoachLine: ls.lastCoachLine,
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
  }).then((r) => {
    // The turn's language is noted the moment it is read — before any answer,
    // lesson or narration is phrased (WO-CHAT-01 P2).
    noteTurnLanguage(r.language);
    return r;
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
  /** What the coach answered (null: a surface answered outside the door). */
  answerText?: string | null;
  outcome: ChatTurnOutcome;
  /** `Date.now()` when the turn reached the door. */
  startedAt?: number;
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
    referents: turn && turn.referents.length > 0 ? turn.referents.map(describeReferent).join(' ') : null,
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
    outcome: opts.outcome,
    answerPreview: opts.answerText ? opts.answerText.slice(0, 160) : null,
    askLang: result?.language ?? detectLanguage(input.ask).name,
    // The language the answer is SHOWN in: an answer already in the student's
    // language stays as written; the app's own English is rendered in the
    // conversation's language by the bubble and the voice.
    answerLang: opts.answerText
      ? (detectLanguage(opts.answerText).nonEnglish ? detectLanguage(opts.answerText).name : (chosenOrTypedLanguageName() ?? 'English'))
      : null,
    leakedMarkup: !!opts.answerText && /\[BOARD:|\[\[/.test(opts.answerText),
    totalMs: opts.startedAt ? Date.now() - opts.startedAt : null,
  });
}

function describeReferent(r: Referent): string {
  switch (r.type) {
    case 'move': return `move:${r.san}`;
    case 'square': return `square:${r.square}`;
    case 'piece': return `piece:${r.piece}@${r.square ?? '?'}${r.seat ? `/${r.seat}` : ''}`;
    default: return r.type;
  }
}

/** A read started before the surface knows whether the door will answer. */
export interface TurnReadHandle {
  /** The door takes the read; the shadow row is then the door's to emit. */
  claim(): Promise<ParseResult | null>;
  /** Look at the reading WITHOUT taking it (Learn acts on a request reading
   *  itself; anything else still reaches the door). */
  peek(): Promise<ParseResult | null>;
  /** The surface answered the turn from the reading: emit its row now. */
  answered(a: { servedIntent: string; answerText: string; outcome: ChatTurnOutcome }): void;
}

/** Store what the coach offered on a surface (Learn's "Start the X
 *  walkthrough" prompt), so "go" / "can I start now?" runs it. */
export function setPendingOffer(surface: CoachSurface, pending: ResolvedStep[] | null): void {
  conversations.set(surface, { ...conversationFor(surface), pending });
}

/**
 * Start the read for a turn whose surface runs its own commands first (Learn:
 * "play the Sicilian", stop/resume, a move). If the turn reaches the door, the
 * door claims this read and serves from it; if a surface command answered it
 * instead, the read is logged as a shadow row once it lands. One read either
 * way — never a second model call for the same words.
 */
export function openTurnRead(input: CoachAskInput): TurnReadHandle | null {
  if (!isStudentTurn(input)) return null;
  const read = startChatTurnRead(input);
  let claimed = false;
  void read.then(() => new Promise((r) => setTimeout(r, UNCLAIMED_GRACE_MS))).then(() => {
    if (claimed) return;
    return settleChatTurnRead({
      input,
      read,
      fastPathLane: fastPathLane(input.ask, { fen: input.liveState.fen }),
      servedIntent: null,
      servedParsed: false,
      outcome: 'surface',
    });
  }).catch(() => { /* telemetry never breaks a turn */ });
  const startedAt = Date.now();
  return {
    claim: () => { claimed = true; return read; },
    peek: () => read,
    answered: (a) => {
      claimed = true;
      void settleChatTurnRead({
        input, read, fastPathLane: fastPathLane(input.ask, { fen: input.liveState.fen }),
        servedIntent: a.servedIntent, servedParsed: true, answerText: a.answerText, outcome: a.outcome, startedAt,
      }).catch(() => { /* telemetry never breaks a turn */ });
    },
  };
}

/** How long after the read lands a surface command is assumed to have
 *  answered the turn (the door, when reached, claims it well before). */
const UNCLAIMED_GRACE_MS = 3000;

// ─── THE DOOR ──────────────────────────────────────────────────────────────

/** Was this answer computed on the board by the door (a board answer, a
 *  direct answer, or a refuted premise) rather than phrased by a model?
 *  Surfaces skip their model-prose gates for these: there is nothing to
 *  validate in a fact read off the board. */
export function isComputedAnswer(servedIntent: string | null): boolean {
  if (!servedIntent) return false;
  if (servedIntent.startsWith('board:') || servedIntent.startsWith('premise:')) return true;
  const spec = (CHAT_KINDS as Record<string, { answerer: string } | undefined>)[servedIntent];
  return spec?.answerer === 'direct';
}

/** Readings the board refutes outright: the named piece is not there, is
 *  the other side's, or does not exist. */
const FALSE_PREMISE: ReadonlySet<string> = new Set(['piece-not-there', 'piece-wrong-seat', 'piece-absent', 'unknown-opening']);

/** Readings a positional topic in the student's words may answer instead —
 *  the general board kinds a topic sharpens, never a named-move question. */
const POSITIONAL_READABLE: ReadonlySet<string> = new Set(['positional', 'plan', 'progress', 'position-assessment', 'piece-options', 'what-about-piece', 'is-piece-loose', 'hint', 'method']);
/** Topics about one piece or the material count: the per-piece answer and the
 *  material lane own these. */
const PIECE_LEVEL_TOPICS: ReadonlySet<string> = new Set(['material', 'piece', 'maneuver']);

export async function dispatchCoachTurn(
  input: CoachAskInput,
  options: DispatchCoachTurnOptions = {},
): Promise<CoachAnswer> {
  const startedAt = Date.now();
  const student = isStudentTurn(input);
  // The read starts NOW, in parallel with today's routing — no added latency.
  const read = student ? (options.turnRead?.claim() ?? startChatTurnRead(input)) : null;
  let servedParsed = false;
  let effectiveInput = input;
  // The kind the reader placed this turn in, when it did (null: no reading).
  let readKind: string | null = null;
  if (read && serveParsedRoute) {
    // FLAG ON: wait for the reading and, when it validated and its kind has a
    // live answerer, serve the canonical question that routes to it.
    const r = await read;
    // EVERY ANSWER THE DOOR COMPUTES LEAVES THROUGH HERE, with its row. It
    // is NOT translated here: the bubble (`useLocalizedContent`) and the voice
    // (`voiceService`) already render every answer in the conversation's
    // language, which the read noted before any answer was built
    // (WO-CHAT-01 P2). A second translation here would be a second model call.
    const serve = (raw: string, servedIntent: string, outcome: ChatTurnOutcome, extra: Partial<CoachAnswer> = {}): CoachAnswer => {
      const text = openSentence(raw);
      servedParsed = true;
      void settleChatTurnRead({ input, read, fastPathLane: fastPathLane(input.ask, { fen: input.liveState.fen }), servedIntent, servedParsed, answerText: text, outcome, startedAt })
        .catch(() => { /* telemetry never breaks a turn */ });
      return { text, toolCallIds: [], dispatchedToolNames: [], provider: options.provider ?? 'deepseek', servedIntent, ...extra };
    };
    // A kind with no lane today answers with its own computed sentence.
    const turn = r?.validation?.ok ? r.validation.turn : null;
    readKind = turn?.kind ?? (r?.turn ? 'unclear' : null);
    // A POSITIONAL TOPIC IN THE STUDENT'S OWN WORDS is answered by the
    // positional computer with that topic (walk 5: "what is my worst piece?"
    // and "where should my rooks go?" were re-worded to "where are the
    // outposts?" and to a plan — the topic was thrown away). It runs before
    // the per-piece answers: "is my king safe?" is king SAFETY, not what the
    // king guards. Material keeps its lane (it reads a pending recapture), and
    // a question about one piece keeps the per-piece answer.
    // A REQUEST IS DONE FROM ITS STEPS (WO-CHAT-01 P1). The reading carries
    // what was asked as typed steps with every opening resolved by code; the
    // app acts first and the words report what it did. Before this, the
    // phrase router cut the opening out of the sentence by position ("…teach
    // me" → an opening called "me").
    if (turn?.steps && turn.steps.length > 0) {
      const surface = input.liveState.surface;
      const conv = conversationFor(surface);
      const out = executeSteps(turn.steps, { hasBoard: !!input.liveState.fen, pending: conv.pending });
      if (out) {
        conversations.set(surface, { ...conv, pending: out.pending });
        if (out.path && options.onNavigate) options.onNavigate(out.path);
        const offers = [...(out.path ? [{ type: 'navigate', id: out.path }] : []), ...(out.actionOffer ?? [])];
        return serve(out.text, out.servedIntent, 'command', {
          dispatchedToolNames: out.path ? ['navigate_to_route'] : [],
          ...(offers.length ? { actionOffer: offers } : {}),
        });
      }
    }
    const ptopic = positionalTopic(input.ask);
    if (ptopic && !PIECE_LEVEL_TOPICS.has(ptopic) && input.liveState.fen && (turn ? POSITIONAL_READABLE.has(turn.kind) : true)) {
      const sc = input.liveState.studentColor ?? (input.liveState.fen.split(' ')[1] === 'b' ? 'black' : 'white');
      const answer = (() => { try { return assemblePositionalAnswer(input.liveState.fen, sc, ptopic, input.ask); } catch { return null; } })();
      if (answer?.facts) {
        return serve(answer.facts, `board:positional:${ptopic}`, 'answered');
      }
    }
    if (turn && CHAT_KINDS[turn.kind].answerer === 'direct' && input.liveState.fen) {
      const studentWB = input.liveState.studentColor === 'black' ? 'b' : input.liveState.studentColor === 'white' ? 'w' : (input.liveState.fen.split(' ')[1] === 'b' ? 'b' : 'w');
      // A proof the answer carries (a capture that wins the attacker) comes
      // back as a line the board walks while the words say it.
      const proofOut: { lines?: WalkableLine[] } = {};
      const text = directAnswer(turn, input.liveState.fen, conversationFor(input.liveState.surface), studentWB, input.ask, input.liveState.moveHistory ?? [], input.liveState.lastCoachLine ?? null, proofOut);
      if (text) {
        return serve(text, turn.kind, 'answered', proofOut.lines?.length ? { lines: proofOut.lines } : {});
      }
    }
    // THE BOARD ANSWERS THE DECODED QUESTION — never re-worded into a lane
    // that drops what was read (chat thinks like the coach, 2026-10-09).
    if (turn && BOARD_ANSWERED_KINDS.has(turn.kind) && input.liveState.fen) {
      const sc = input.liveState.studentColor ?? (input.liveState.fen.split(' ')[1] === 'b' ? 'black' : 'white');
      const out: { endorsed?: string[] } = {};
      const text = await answerBoardTurn(turn, { fen: input.liveState.fen, history: input.liveState.moveHistory ?? [], studentColor: sc }, out).catch(() => null);
      if (text) {
        return serve(text, `board:${turn.kind}`, 'answered', out.endorsed?.length ? { endorsedSans: out.endorsed } : {});
      }
    }
    // A FALSE PREMISE IS ANSWERED, NOT ROUTED (pass 2, 2026-10-09: "how do I
    // defend my knight on c3?" with no knight there got a book passage about
    // forks). When the board says the piece the student named is not there,
    // or is the other side's, that IS the answer.
    const bad = r?.validation && !r.validation.ok ? r.validation : null;
    if (bad && FALSE_PREMISE.has(bad.reason) && bad.clarify) {
      return serve(bad.clarify, `premise:${bad.reason}`, 'asked-back');
    }
    const canonical = turn ? canonicalAsk(turn) : null;
    if (canonical) {
      effectiveInput = { ...input, ask: canonical };
      servedParsed = true;
    }
    // A turn written in another language carries the reader's English, so
    // nothing downstream translates it again (WO-CHAT-01 P2).
    if (r?.english && r.language && r.language !== 'English') effectiveInput = { ...effectiveInput, english: r.english };
    // The reading rides the turn to the catch-all (see askBackAtCatchAll).
    if (turn) effectiveInput = { ...effectiveInput, reading: { kind: turn.kind } };
    else if (r?.validation && !r.validation.ok) effectiveInput = { ...effectiveInput, reading: { kind: 'unclear', clarify: r.validation.clarify } };
  }

  let routedCommand = false;
  const finish = (raw: CoachAnswer): CoachAnswer => {
    const answer = typeof raw.text === 'string' ? { ...raw, text: openSentence(raw.text) } : raw;
    if (read) {
      void settleChatTurnRead({
        input,
        read,
        fastPathLane: fastPathLane(input.ask, { fen: input.liveState.fen, routedCommand }),
        servedIntent: answer.servedIntent ?? null,
        servedParsed,
        answerText: typeof answer.text === 'string' ? answer.text : null,
        outcome: outcomeOf(answer, routedCommand),
        startedAt,
      }).catch(() => { /* telemetry never breaks a turn */ });
    }
    return answer;
  };

  // THE READER DECIDES WHAT IS A COMMAND (2026-10-08): the action router acts
  // on a turn read as a command, or on one the reader could not read at all.
  // A turn read as a QUESTION is never hijacked into an action — the router's
  // phrase match took "don't show me the arrows" as "show me [the opening]
  // arrows" and offered a walkthrough.
  const mayAct = readKind === null || readKind === 'command' || readKind === 'training-request' || readKind === 'unclear';
  if (!options.skipActionRouter && mayAct) {
    try {
      const routed = await routeChatIntent(effectiveInput.ask, {
        ...(effectiveInput.english ? { english: effectiveInput.english } : {}),
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

/** The outcome of a turn the door answered through the brain or the router. */
function outcomeOf(answer: CoachAnswer, routedCommand: boolean): ChatTurnOutcome {
  if (routedCommand) return 'command';
  const text = typeof answer.text === 'string' ? answer.text : '';
  if (isStockFallback(text)) return 'stock';
  if (answer.servedIntent === 'ask-back') return 'asked-back';
  return 'answered';
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
    outcome: 'surface',
  }).catch(() => { /* telemetry never breaks a turn */ });
}
