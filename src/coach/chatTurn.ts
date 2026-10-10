/**
 * chatTurn — THE ONE CLOSED FORM a student's turn is read into (ONE-CHAT
 * FINAL, docs/plans/2026-09-29-ONE-CHAT.md; P0a of
 * docs/plans/2026-10-04-learn-how-to-think.md).
 *
 * Phrasing varies endlessly; what the coach can DO with a question does not.
 * So the model's only job on a turn is to fill this form — WHICH question
 * (a kind that is one of today's lanes, or one of the new lesson kinds), WHICH
 * things on the board it points at (referents), WHOSE side — and code checks
 * every field against the board before anything is answered. The model never
 * answers, never picks a move, never decides chess (G0).
 *
 * Everything here is PURE (no Dexie, no network, no LLM): the schema, the fast
 * path today's regex routing takes, the board validation, the deterministic
 * square-answer reader and the conversation memory. The LLM read lives in
 * `chatTurnParser.ts`; the shadow wiring in `dispatchCoachTurn.ts`.
 *
 * 🔒 THE KINDS ARE A `Record`, NOT A LIST. `CHAT_KINDS` is keyed by every
 * `ChatKind`, so adding a kind fails to compile until someone states its lane,
 * whether its answerer exists, and the gloss the reader is shown. A kind with
 * no answerer yet is honest about it (`answerer: 'pending'`), never silently
 * routed somewhere that does not answer it.
 */
import { Chess, type Square } from 'chess.js';
import { whyNotLegal } from '../services/whyNotLegal';
import { captureRead } from '../services/positionReadingService';
import {
  buildQuestionGrounding,
  compareMovesAsk,
  isAlternativesQuestion,
  isStopCommand,
  looksLikeConversationalReply,
  pieceOptionsRef,
} from './questionIntents';
import { detectBoardQuestion } from './boardQuestions';
import { resolveSteps, type RequestStep, type ResolvedStep } from './requestSteps';

// ─── THE FAST PATH: today's deterministic routing, as lane ids ─────────────

/**
 * Today's lanes, IN DISPATCH ORDER (coachApi.getCoachChatResponse, read
 * 2026-10-04: the `if (grounding.X)` blocks from the retrospective lane at
 * ~:4020 down to the position-assessment default at ~:6450, with the pre-lanes
 * that run before it — stop, a bare yes/no, the piece-options answer at
 * ~:3620). `fastPathLane` returns the FIRST that fires, so the order is the
 * precedence the shadow compares against.
 *
 * It is an approximation of the real dispatch and says so: several lanes
 * self-gate inside coachApi and fall through (the concept lane's token gate,
 * the board-dependent lanes with no board). That is why the shadow row also
 * carries `servedIntent` — the lane that ACTUALLY voiced the answer.
 */
export const FAST_PATH_LANES = [
  'command', 'stop', 'conversational-reply', 'piece-options',
  'record-vs', 'training-request', 'retrospective-move', 'method', 'move-rating',
  'strengths', 'stats', 'opening-accuracy', 'opening-traps', 'review-due',
  'weakness-lifecycle', 'weakness-briefing', 'mistakes', 'errors-by-situation',
  'misconceptions', 'tactics-profile', 'phase-profile', 'counter-repertoire',
  'repertoire-gap', 'accuracy', 'consistency', 'time-trouble', 'last-game',
  'converting', 'color', 'records', 'puzzle-stats', 'transfer-gap', 'skill-radar',
  'trend', 'progress', 'opening-profile', 'concept', 'theory', 'teaching-method',
  'settings', 'name-opening', 'app-help', 'alternatives', 'why-best-move',
  'opponent-move', 'last-move', 'compare-moves', 'candidate-move', 'hint',
  'endgame', 'whose-turn', 'live-colour', 'mate', 'draw', 'best-move', 'plan',
  'opening-identity', 'opening-existence', 'last-game-mistake', 'tactics',
  'master-play', 'player-games', 'endgame-weakness', 'positional',
  'position-assessment', 'none',
] as const;
export type FastPathLane = typeof FAST_PATH_LANES[number];

type Grounding = ReturnType<typeof buildQuestionGrounding>;

/** Each lane's test, from the grounding object today's router builds (plus
 *  the few detectors coachService runs beside it). Exhaustive over the lanes:
 *  a new lane fails to compile until it says how it is detected. */
const LANE_FIRES: Record<Exclude<FastPathLane, 'command' | 'none'>, (g: Grounding, ask: string) => boolean> = {
  stop: (_g, a) => isStopCommand(a),
  'conversational-reply': (_g, a) => looksLikeConversationalReply(a),
  'piece-options': (_g, a) => pieceOptionsRef(a) !== null,
  'record-vs': (g) => !!g.recordVsTarget,
  'training-request': (g) => !!g.trainingRequestKind,
  'retrospective-move': (g) => !!g.retrospectiveMoveQuestion,
  method: (g) => !!g.methodQuestion,
  'move-rating': (g) => !!g.moveRatingQuestion,
  strengths: (g) => !!g.strengthsQuestion,
  stats: (g) => !!g.statsQuestion,
  'opening-accuracy': (g) => !!g.openingAccuracyQuestion,
  'opening-traps': (g) => !!g.openingTrapsQuestion,
  'review-due': (g) => !!g.reviewDueQuestion,
  'weakness-lifecycle': (g) => !!g.weaknessLifecycleKind,
  'weakness-briefing': (g) => !!g.weaknessBriefingQuestion,
  mistakes: (g) => !!g.mistakesQuestion,
  'errors-by-situation': (g) => !!g.errorsBySituationQuestion,
  misconceptions: (g) => !!g.misconceptionsQuestion,
  'tactics-profile': (g) => !!g.tacticsProfileQuestion,
  'phase-profile': (g) => !!g.phaseQuestion,
  'counter-repertoire': (g) => !!g.counterRepertoireQuestion,
  'repertoire-gap': (g) => !!g.repertoireGapQuestion,
  accuracy: (g) => !!g.accuracyQuestion,
  consistency: (g) => !!g.consistencyQuestion,
  'time-trouble': (g) => !!g.timeTroubleQuestion,
  'last-game': (g) => !!g.lastGameQuestion,
  converting: (g) => !!g.convertingQuestion,
  color: (g) => !!g.colorQuestion,
  records: (g) => !!g.recordsQuestion,
  'puzzle-stats': (g) => !!g.puzzleStatsQuestion,
  'transfer-gap': (g) => !!g.transferGapQuestion,
  'skill-radar': (g) => !!g.skillRadarQuestion,
  trend: (g) => !!g.trendQuestion,
  progress: (g) => !!g.progressQuestion,
  'opening-profile': (g) => !!g.openingProfileQuestion,
  concept: (g) => !!g.conceptQuestion,
  theory: (g) => !!g.theoryQuestion,
  'teaching-method': (g) => !!g.teachingMethodQuestion,
  settings: (g) => !!g.settingsQuestion,
  'name-opening': (g) => !!g.nameOpeningQuestion,
  'app-help': (g) => !!g.appHelpQuestion,
  alternatives: (_g, a) => isAlternativesQuestion(a),
  'why-best-move': (g) => !!g.whyBestMoveQuestion,
  'opponent-move': (g) => !!g.opponentMoveQuestion,
  'last-move': (g) => !!g.lastMoveQuestion,
  'compare-moves': (_g, a) => compareMovesAsk(a) !== null,
  'candidate-move': (g) => !!g.candidateMoveQuestion,
  hint: (g) => !!g.hintQuestion,
  endgame: (g) => !!g.endgameQuestion,
  'whose-turn': (_g, a) => detectBoardQuestion(a) === 'whose-turn',
  'live-colour': (_g, a) => detectBoardQuestion(a) === 'live-colour',
  mate: (_g, a) => detectBoardQuestion(a) === 'mate',
  draw: (_g, a) => detectBoardQuestion(a) === 'draw',
  'best-move': (g) => !!g.bestMoveQuestion,
  plan: (g) => !!g.planQuestion,
  'opening-identity': (g) => typeof g.openingIdentityName === 'string' && g.openingIdentityName.length > 0,
  'opening-existence': (g) => typeof g.openingExistenceName === 'string' && g.openingExistenceName.length > 0,
  'last-game-mistake': (g) => !!g.lastGameMistakeQuestion,
  tactics: (g) => !!g.tacticsQuestion,
  'master-play': (g) => !!g.masterPlayQuestion,
  'player-games': (g) => !!g.playerGamesQuestion,
  'endgame-weakness': (g) => !!g.endgameWeaknessQuestion,
  positional: (g) => !!g.positionalTopic,
  'position-assessment': (g) => !!g.positionAssessmentQuestion,
};

/**
 * The lane today's deterministic routing takes for `ask`. `routedCommand` is
 * the action router's verdict (the door ran it already); a routed command
 * wins outright, exactly as it does in `dispatchCoachTurn`.
 */
export function fastPathLane(ask: string, opts: { fen?: string; routedCommand?: boolean } = {}): FastPathLane {
  if (opts.routedCommand) return 'command';
  const g = buildQuestionGrounding(ask, { fen: opts.fen });
  for (const lane of FAST_PATH_LANES) {
    if (lane === 'command' || lane === 'none') continue;
    if (LANE_FIRES[lane](g, ask)) return lane;
  }
  return 'none';
}

// ─── THE FORM ──────────────────────────────────────────────────────────────

/** The lesson / dialogue kinds the regex lanes never had (ONE-CHAT FINAL +
 *  the 2026-10-04 lesson plan §A2). */
export const NEW_KINDS = [
  'compare-my-move', 'why-is-it-a-target', 'count-attackers', 'count-defenders',
  'what-about-piece', 'is-piece-loose', 'what-did-their-move-change',
  'what-should-i-play', 'i-dont-know', 'answer', 'start-thinking-lesson', 'book-teaching',
  'defend-piece', 'win-piece', 'attack-piece', 'material-change', 'explain-last', 'threats', 'develop-next',
  'best-defence', 'faster-win',
] as const;
export type NewKind = typeof NEW_KINDS[number];

/** Every kind a turn can be read as: one per existing lane (1-to-1), the new
 *  kinds, small talk, and the honest "cannot tell". */
export type ChatKind = Exclude<FastPathLane, 'none'> | NewKind | 'chat' | 'unclear';

export type Seat = 'me' | 'them';
export type PieceLetter = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

/** What a turn points at on the board. */
export type Referent =
  | { type: 'square'; square: string }
  /** "the knight on c6", "my bishop", "the other knight" (`other: true`). */
  | { type: 'piece'; piece: PieceLetter; square: string | null; seat: Seat | null; other?: boolean }
  /** A move named in SAN ("Nxe5"). */
  | { type: 'move'; san: string }
  /** "what I played" — the student's own last move or try. */
  | { type: 'what-i-played' }
  /** "their last move" / "what they just did". */
  | { type: 'their-last-move' };

export interface ChatTurn {
  kind: ChatKind;
  referents: Referent[];
  /** Whose side the question is about, when it says. */
  seat: Seat | null;
  /** A name the turn carries that is not on the board: an opening, a player,
   *  a concept ("the Sicilian", "Magnus", "a fork"). As said, in English. */
  topic: string | null;
  /** What the student asked the app to DO, in order (WO-CHAT-01 P1). Absent
   *  or empty on a question. */
  steps?: RequestStep[];
}

/** A piece referent once the board has placed it. */
export type ResolvedReferent =
  | Exclude<Referent, { type: 'piece' | 'move' }>
  | { type: 'piece'; piece: PieceLetter; square: string; seat: Seat }
  /** `played`: the move is not legal now but was made earlier (on the tape or
   *  as the student's last try) — "why Nf1?" about a move already made. */
  | { type: 'move'; san: string; played: boolean };

export interface ResolvedChatTurn extends Omit<ChatTurn, 'referents' | 'steps'> {
  referents: ResolvedReferent[];
  /** Each step with its opening resolved to one DB name. */
  steps?: ResolvedStep[];
}

// ─── THE KIND TABLE ────────────────────────────────────────────────────────

export interface KindSpec {
  /** One line the reader is shown so it can pick this kind. */
  gloss: string;
  /** The lane that answers it today ('none' = nothing yet). */
  lane: FastPathLane;
  /** 'live' — an answerer exists and this kind can be SERVED from the parse
   *  (behind the flag). 'direct' — no lane today; answered by its own
   *  computed sentence (`chatTurnAnswers.directAnswer`) behind the same flag.
   *  'pending' — read and logged only; its answerer is a
   *  later phase (P0c loose computer, P1 lesson). */
  answerer: 'live' | 'direct' | 'pending';
  /** The deterministic question that routes to `lane` — how a parsed turn is
   *  served without a second router: the fast path answers this exact text.
   *  Null when the kind is not servable this way (commands, small talk). */
  canonical: ((t: ResolvedChatTurn) => string | null) | null;
}

const PIECE_WORD: Record<PieceLetter, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const firstPiece = (t: ResolvedChatTurn): Extract<ResolvedReferent, { type: 'piece' }> | null =>
  t.referents.find((r): r is Extract<ResolvedReferent, { type: 'piece' }> => r.type === 'piece') ?? null;
const firstMoveRef = (t: ResolvedChatTurn): Extract<ResolvedReferent, { type: 'move' }> | null =>
  t.referents.find((r): r is Extract<ResolvedReferent, { type: 'move' }> => r.type === 'move') ?? null;
const firstMove = (t: ResolvedChatTurn): string | null => firstMoveRef(t)?.san ?? null;
/**
 * 🔒 A NAMED MOVE IS NEVER DROPPED (2026-10-08). The rewrite of a reading
 * into the question its lane answers used to be fixed text for several kinds,
 * so "my knight to d5, was that good?" became "was that a good move?" and the
 * lane rated a different move, and "why is Ne4 best?" explained the engine's
 * Na3. When the student named a move, the question is about THAT move: one
 * still to play is weighed on the board now, one already made is judged where
 * it was played.
 */
const aboutNamedMove = (fallback: string) => (t: ResolvedChatTurn): string => {
  const m = firstMoveRef(t);
  if (!m) return fallback;
  return m.played ? `how good was ${m.san}?` : `is ${m.san} good here?`;
};
const topicOr = (t: ResolvedChatTurn, fmt: (x: string) => string, fallback: string | null): string | null =>
  (t.topic ? fmt(t.topic) : fallback);
const fixed = (q: string) => (): string => q;
const pending = (gloss: string, lane: FastPathLane = 'none'): KindSpec => ({ gloss, lane, answerer: 'pending', canonical: null });
const direct = (gloss: string): KindSpec => ({ gloss, lane: 'none', answerer: 'direct', canonical: null });

export const CHAT_KINDS: Record<ChatKind, KindSpec> = {
  // ── commands + conversation (answered by the action router / the thread) ──
  command: { gloss: 'a command to DO something: change a setting (turn voice on/off, change verbosity), go to a page, start a game, lesson, drill or review, take back a move', lane: 'command', answerer: 'live', canonical: null },
  stop: { gloss: 'tells the coach to stop talking right now or be quiet (not a settings change)', lane: 'stop', answerer: 'live', canonical: fixed('stop') },
  'conversational-reply': { gloss: 'a bare yes / no reply to what the coach just offered', lane: 'conversational-reply', answerer: 'live', canonical: null },
  chat: { gloss: 'small talk with no chess question (hello, thanks)', lane: 'none', answerer: 'live', canonical: null },
  unclear: { gloss: 'you cannot tell what is being asked', lane: 'none', answerer: 'pending', canonical: null },

  // ── the board, now ──
  'piece-options': { gloss: 'could a piece have moved / where can a piece go ("couldn\'t he just move the queen?")', lane: 'piece-options', answerer: 'live',
    canonical: (t) => { const p = firstPiece(t); return p ? `${p.seat === 'them' ? "couldn't they move their" : 'could I move my'} ${PIECE_WORD[p.piece]}?` : null; } },
  'best-move': { gloss: 'what is the best move here', lane: 'best-move', answerer: 'live', canonical: aboutNamedMove("what's my best move?") },
  'why-best-move': { gloss: 'why is the engine\'s best move best', lane: 'why-best-move', answerer: 'live', canonical: aboutNamedMove('why is that the best move?') },
  alternatives: { gloss: 'what other moves are worth considering', lane: 'alternatives', answerer: 'live', canonical: null },
  'candidate-move': { gloss: 'is a NAMED move good / what happens if I play it', lane: 'candidate-move', answerer: 'live',
    canonical: (t) => { const m = firstMove(t); return m ? `is ${m} good here?` : null; } },
  'compare-moves': { gloss: 'which of two named moves is better', lane: 'compare-moves', answerer: 'live',
    canonical: (t) => { const ms = t.referents.filter((r) => r.type === 'move') as Array<{ san: string }>; return ms.length >= 2 ? `${ms[0].san} or ${ms[1].san}?` : null; } },
  plan: { gloss: 'what is the plan here', lane: 'plan', answerer: 'live', canonical: fixed("what's my plan here?") },
  hint: { gloss: 'asks for a hint without the answer', lane: 'hint', answerer: 'live', canonical: fixed('give me a hint') },
  method: { gloss: 'HOW to think / what to look for here (the routine, not the move)', lane: 'method', answerer: 'live', canonical: fixed('what should I be thinking about in this position?') },
  tactics: { gloss: 'are there tactics / threats on the board now', lane: 'tactics', answerer: 'live', canonical: fixed('are there any tactics here?') },
  'position-assessment': { gloss: 'who is better / what is the evaluation', lane: 'position-assessment', answerer: 'live', canonical: fixed("who's winning?") },
  'whose-turn': { gloss: 'whose move it is', lane: 'whose-turn', answerer: 'live', canonical: fixed('whose turn is it?') },
  'live-colour': { gloss: 'which colour the student is playing', lane: 'live-colour', answerer: 'live', canonical: fixed('what colour am I?') },
  mate: { gloss: 'is there a checkmate', lane: 'mate', answerer: 'live', canonical: fixed('is there a mate here?') },
  draw: { gloss: 'is this a draw', lane: 'draw', answerer: 'live', canonical: fixed('is it a draw?') },
  endgame: { gloss: 'how to play / win / hold this endgame', lane: 'endgame', answerer: 'live', canonical: fixed('how do I win this endgame?') },
  positional: { gloss: 'a positional feature of the board (weak squares, outposts, pawn structure)', lane: 'positional', answerer: 'live', canonical: fixed('where are the outposts?') },
  'master-play': { gloss: 'what masters play in this position', lane: 'master-play', answerer: 'live', canonical: fixed('what do masters play here?') },
  'player-games': { gloss: 'how a named pro plays this line', lane: 'player-games', answerer: 'live', canonical: null },

  // ── moves already played ──
  'move-rating': { gloss: 'was the last move good', lane: 'move-rating', answerer: 'live', canonical: aboutNamedMove('was that a good move?') },
  'retrospective-move': { gloss: 'why was a move ALREADY PLAYED good or bad', lane: 'retrospective-move', answerer: 'live',
    canonical: (t) => { const m = firstMove(t); return m ? `how good was ${m}?` : 'how good was my last move?'; } },
  'opponent-move': { gloss: 'why did the opponent play their last move', lane: 'opponent-move', answerer: 'live', canonical: fixed('why did they play that?') },
  'last-move': { gloss: 'what was the last move / which piece just moved', lane: 'last-move', answerer: 'live', canonical: fixed('what was the last move?') },

  // ── the student's own record ──
  strengths: { gloss: 'what am I good at', lane: 'strengths', answerer: 'live', canonical: fixed('what am I good at?') },
  stats: { gloss: 'my rating / numbers', lane: 'stats', answerer: 'live', canonical: fixed("what's my rating?") },
  'opening-accuracy': { gloss: 'how accurately I play an opening', lane: 'opening-accuracy', answerer: 'live',
    canonical: (t) => topicOr(t, (x) => `how accurate am I in the ${x}?`, null) },
  'opening-traps': { gloss: 'traps in an opening', lane: 'opening-traps', answerer: 'live',
    canonical: (t) => topicOr(t, (x) => `what traps can I play in the ${x}?`, null) },
  'review-due': { gloss: 'what is due for review', lane: 'review-due', answerer: 'live', canonical: fixed("what's due for review?") },
  'weakness-lifecycle': { gloss: 'which weaknesses I have fixed or still have, over time', lane: 'weakness-lifecycle', answerer: 'live', canonical: fixed('what have I fixed?') },
  'weakness-briefing': { gloss: 'a briefing on my weaknesses', lane: 'weakness-briefing', answerer: 'live', canonical: fixed('what are my weaknesses?') },
  mistakes: { gloss: 'what mistakes I make', lane: 'mistakes', answerer: 'live', canonical: fixed('what mistakes do I make?') },
  'errors-by-situation': { gloss: 'when I blunder (winning, losing, time)', lane: 'errors-by-situation', answerer: 'live', canonical: fixed('do I blunder more when I am winning or losing?') },
  misconceptions: { gloss: 'which thinking errors I keep making', lane: 'misconceptions', answerer: 'live', canonical: fixed('what thinking errors do I keep making?') },
  'tactics-profile': { gloss: 'how good my tactics are', lane: 'tactics-profile', answerer: 'live', canonical: fixed('how are my tactics?') },
  'phase-profile': { gloss: 'which game phase I am weakest in', lane: 'phase-profile', answerer: 'live', canonical: fixed('which phase am I weakest in?') },
  'counter-repertoire': { gloss: 'what should I PLAY against a named opening (a recommendation, not my past results)', lane: 'counter-repertoire', answerer: 'live',
    canonical: (t) => topicOr(t, (x) => `what should I play against the ${x}?`, null) },
  'repertoire-gap': { gloss: 'gaps in my repertoire', lane: 'repertoire-gap', answerer: 'live', canonical: fixed('where are the gaps in my repertoire?') },
  accuracy: { gloss: 'my accuracy', lane: 'accuracy', answerer: 'live', canonical: fixed("what's my accuracy?") },
  consistency: { gloss: 'how consistent I am', lane: 'consistency', answerer: 'live', canonical: fixed('how consistent am I?') },
  'time-trouble': { gloss: 'do I play too fast / time trouble', lane: 'time-trouble', answerer: 'live', canonical: fixed('do I play too fast?') },
  'last-game': { gloss: 'my last game', lane: 'last-game', answerer: 'live', canonical: fixed('did I win my last game?') },
  'last-game-mistake': { gloss: 'my mistakes in my last game', lane: 'last-game-mistake', answerer: 'live', canonical: fixed('what was my biggest mistake in my last game?') },
  converting: { gloss: 'how well I convert winning positions', lane: 'converting', answerer: 'live', canonical: fixed('how good am I at converting winning positions?') },
  color: { gloss: 'am I better as White or Black', lane: 'color', answerer: 'live', canonical: fixed('am I better as White or Black?') },
  records: { gloss: 'my best win / records', lane: 'records', answerer: 'live', canonical: fixed("what's my best win?") },
  'record-vs': { gloss: 'my results / how I score against a named opening or opponent (my past games, not what to play)', lane: 'record-vs', answerer: 'live',
    canonical: (t) => topicOr(t, (x) => `how do I score against the ${x}?`, null) },
  'puzzle-stats': { gloss: 'my puzzle rating / puzzle numbers', lane: 'puzzle-stats', answerer: 'live', canonical: fixed("what's my puzzle rating?") },
  'transfer-gap': { gloss: 'do my puzzle skills transfer to games', lane: 'transfer-gap', answerer: 'live', canonical: fixed('do my puzzle skills carry over to my games?') },
  'skill-radar': { gloss: 'my skill radar', lane: 'skill-radar', answerer: 'live', canonical: fixed('show my skill radar') },
  trend: { gloss: 'my rating trend', lane: 'trend', answerer: 'live', canonical: fixed('am I getting better?') },
  progress: { gloss: 'am I improving', lane: 'progress', answerer: 'live', canonical: fixed('how is my progress?') },
  'opening-profile': { gloss: 'my best / worst openings', lane: 'opening-profile', answerer: 'live', canonical: fixed("what's my best opening?") },
  'endgame-weakness': { gloss: 'which endgames I am weakest at', lane: 'endgame-weakness', answerer: 'live', canonical: fixed('what is my weakest endgame?') },
  'training-request': { gloss: 'asks to set up a kind of training', lane: 'training-request', answerer: 'live', canonical: null },

  // ── knowledge ──
  concept: { gloss: 'what is a chess concept or RULE, or how a rule works (a fork, a pin, zugzwang; "how do I castle?", "how does en passant work?")', lane: 'concept', answerer: 'live',
    // The student's OWN words, never a rewording: "how do I castle?" re-worded
    // to "what's a castling?" lost the rules answer, which reads the words
    // (WO-CHAT-01 P3). The pin routes the turn; the words keep their content.
    canonical: null },
  theory: { gloss: 'general how-to strategy ("how do I play against an isolated pawn")', lane: 'theory', answerer: 'live',
    canonical: (t) => topicOr(t, (x) => `how do I play against ${x}?`, null) },
  'teaching-method': { gloss: 'how the coach would teach something', lane: 'teaching-method', answerer: 'live',
    canonical: (t) => topicOr(t, (x) => `how do you teach the ${x}?`, null) },
  settings: { gloss: 'asks what a setting is set to', lane: 'settings', answerer: 'live', canonical: fixed('is voice on?') },
  'app-help': { gloss: 'how to use THIS APP — its pages, buttons and features, or what the coach can do (never a chess rule: "how do I castle?" is a concept)', lane: 'app-help', answerer: 'live', canonical: fixed('what can you do?') },
  'name-opening': { gloss: 'what opening is this', lane: 'name-opening', answerer: 'live', canonical: fixed('what opening is this?') },
  'opening-identity': { gloss: 'what is a named opening', lane: 'opening-identity', answerer: 'live', canonical: null },
  'opening-existence': { gloss: 'does a named opening exist', lane: 'opening-existence', answerer: 'live',
    canonical: (t) => topicOr(t, (x) => `is there an opening called ${x}?`, null) },

  // ── the new kinds (dialogue + the thinking lesson) ──
  'compare-my-move': { gloss: 'why is a move better than WHAT I PLAYED (compares the student\'s own move with a better one)', lane: 'retrospective-move', answerer: 'live',
    canonical: fixed('why is that better than what I played?') },
  'what-did-their-move-change': { gloss: 'what did the opponent\'s last move change / threaten', lane: 'opponent-move', answerer: 'live', canonical: fixed('why did they play that?') },
  'what-should-i-play': { gloss: 'what should I play here (the move, with its reason)', lane: 'best-move', answerer: 'live', canonical: aboutNamedMove("what's my best move?") },
  'why-is-it-a-target': direct('why is a piece or square a target'),
  'count-attackers': direct('how many pieces attack a piece or square'),
  'count-defenders': direct('how many pieces defend a piece or square'),
  'what-about-piece': direct('"what about my bishop?" — a named piece\'s safety and scope'),
  'is-piece-loose': direct('is a piece loose / undefended (or which pieces are)'),
  'defend-piece': direct('how do I defend / save / protect a piece of mine ("how do I defend it?")'),
  'win-piece': direct('can I win / take / get back one of their pieces or pawns ("can I get my pawn back?")'),
  'attack-piece': direct('how can I attack / go after one of their pieces or pawns ("can I attack the b7 pawn?")'),
  'material-change': direct('did I just lose / drop / hang something ("did I just lose a pawn?")'),
  'threats': direct('what are they threatening / what is my threat (the threats on the board, either side)'),
  'develop-next': { gloss: 'which piece should I develop / bring out next', lane: 'best-move', answerer: 'live', canonical: fixed("what's my best move?") },
  'best-defence': { gloss: 'what is the OPPONENT\'s best defence / reply to a move ("what\'s their best defence?", "what if they don\'t take?", "how do they defend against Ng5?")', lane: 'best-move', answerer: 'live', canonical: fixed("what's my best move?") },
  'faster-win': { gloss: 'is there a faster, cleaner or simpler win than the best move', lane: 'alternatives', answerer: 'live', canonical: fixed('what else could I play here?') },
  'explain-last': direct('a follow-up about the coach\'s own last line ("stop what?", "what do you mean?")'),
  // Outside a lesson (which has its own "I don't know"), not knowing is a
  // request for help: the hint lane.
  // Answered before every lane on the student's own words (coachService →
  // bookTeaching), so no canonical rewrite: "what do the books say" in
  // today's fast path means BOOK MOVES (opening theory), not the library.
  'book-teaching': { gloss: 'asks what a chess author or book teaches ("what does Lasker say about defence", "teach me the blockade from My System", "what do the books say about passed pawns")', lane: 'none', answerer: 'live', canonical: null },
  'i-dont-know': { gloss: 'the student says they do not know the answer', lane: 'hint', answerer: 'live', canonical: fixed('give me a hint') },
  answer: pending('the student ANSWERS the coach\'s question by naming squares or pieces ("c6 and e5", "the knight on c6")'),
  'start-thinking-lesson': pending('asks to be taught how to think / a general lesson ("teach me", "teach me to think")'),
};

/** Every kind the reader may choose, in a stable order. */
export const ALL_CHAT_KINDS = Object.keys(CHAT_KINDS) as ChatKind[];

// ─── THE DETERMINISTIC ANSWER READER ───────────────────────────────────────

const SQ_RE = /^[a-h][1-8]$/;
const PIECE_WORDS: Record<string, PieceLetter> = {
  pawn: 'p', pawns: 'p', knight: 'n', knights: 'n', night: 'n', horse: 'n', bishop: 'b', bishops: 'b',
  rook: 'r', rooks: 'r', queen: 'q', king: 'k',
};
const FILLER = new Set(['the', 'and', 'on', 'at', 'my', 'their', 'his', 'her', 'a', 'an', 'also', 'plus', 'both', 'or', 'square', 'squares', 'is', 'it', "it's", 'its', 'one', 'maybe', 'um', 'uh', 'and,', 'then']);

/**
 * A turn that is ONLY squares / pieces — "c6", "c6 and e5", "the knight on c6
 * and the pawn on e5", "the rook" — read with no model at all. This is the
 * deterministic fast path for a spoken or typed ANSWER to a tap question;
 * everything else goes to the reader. Null when any other word is present
 * (then it is not a bare answer, and guessing would be deciding).
 */
export function readSquareAnswer(text: string): ChatTurn | null {
  const words = text.toLowerCase().replace(/[.,!?;:]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 24) return null;
  const refs: Referent[] = [];
  let seat: Seat | null = null;
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i];
    if (w === 'my') { seat = 'me'; continue; }
    if (w === 'their' || w === 'his' || w === 'her') { seat = 'them'; continue; }
    if (SQ_RE.test(w)) { refs.push({ type: 'square', square: w }); continue; }
    if (PIECE_WORDS[w]) {
      // "the knight on c6" — the piece takes its square.
      const next = words[i + 1] === 'on' || words[i + 1] === 'at' ? words[i + 2] : null;
      if (next && SQ_RE.test(next)) {
        refs.push({ type: 'piece', piece: PIECE_WORDS[w], square: next, seat });
        i += 2;
      } else {
        refs.push({ type: 'piece', piece: PIECE_WORDS[w], square: null, seat });
      }
      continue;
    }
    if (FILLER.has(w)) continue;
    return null;
  }
  if (refs.length === 0) return null;
  return { kind: 'answer', referents: refs, seat, topic: null };
}

// ─── VALIDATION AGAINST THE BOARD ──────────────────────────────────────────

export interface BoardContext {
  fen?: string;
  /** SAN history from the standard start, when the surface has one. */
  history?: readonly string[];
  studentColor?: 'white' | 'black';
  /** A move the student tried that is on no tape (a drill's wrong try). */
  lastStudentAttempt?: { fenBefore: string; san: string };
  /** The coach's last line, for follow-ups that point back at it. */
  lastCoachLine?: string;
}

export type ValidationResult =
  | { ok: true; turn: ResolvedChatTurn }
  | { ok: false; reason: string; clarify: string };

/** The kinds that are about a board: with none, the reading cannot stand. */
const NEEDS_BOARD: ReadonlySet<ChatKind> = new Set<ChatKind>([
  'best-move', 'why-best-move', 'alternatives', 'candidate-move', 'compare-moves', 'plan', 'hint', 'method',
  'tactics', 'position-assessment', 'whose-turn', 'mate', 'draw', 'positional', 'piece-options',
  'compare-my-move', 'why-is-it-a-target', 'count-attackers', 'count-defenders', 'what-about-piece',
  'is-piece-loose', 'what-did-their-move-change', 'what-should-i-play', 'answer', 'defend-piece', 'win-piece', 'attack-piece', 'material-change', 'explain-last', 'threats', 'develop-next',
  'best-defence', 'faster-win',
]);

/**
 * Check every field of a reading against the board, and resolve what the
 * board can resolve (a piece named without its square, "the other knight").
 * A reading that cannot stand is NOT answered from guesswork: it comes back
 * with a one-line clarifying question instead.
 */
export function validateChatTurn(turn: ChatTurn, board: BoardContext, memory: ConversationState = EMPTY_CONVERSATION): ValidationResult {
  let chess: Chess | null = null;
  if (board.fen) { try { chess = new Chess(board.fen); } catch { chess = null; } }
  if (NEEDS_BOARD.has(turn.kind) && !chess) {
    return { ok: false, reason: 'no-board', clarify: 'There is no board on this screen. Open a game or a lesson and ask there.' };
  }
  const student = board.studentColor ?? (chess && chess.turn() === 'b' ? 'black' : 'white');
  const out: ResolvedReferent[] = [];
  for (const r of turn.referents) {
    if (r.type === 'square') {
      if (!SQ_RE.test(r.square)) return { ok: false, reason: 'bad-square', clarify: `I didn't catch the square — which one did you mean?` };
      out.push({ type: 'square', square: r.square });
      continue;
    }
    if (r.type === 'piece') {
      if (!chess) return { ok: false, reason: 'no-board', clarify: "There's no board to find that piece on." };
      const resolved = resolvePiece(chess, r, student, memory);
      if (!resolved.ok) return resolved;
      out.push(resolved.ref);
      continue;
    }
    if (r.type === 'move') {
      if (!moveIsReal(r.san, board)) {
        // The board knows WHY it refused the move — say that, not "which move?".
        const dest = r.san.match(/([a-h][1-8])(?!.*[a-h][1-8])/)?.[1];
        const letter = /^[KQRBN]/.test(r.san) ? r.san[0].toLowerCase() as 'k' | 'q' | 'r' | 'b' | 'n' : 'p';
        const why = dest && board.fen ? whyNotLegal(board.fen, dest, student, letter) : null;
        if (why) return { ok: false, reason: 'illegal-move', clarify: why };
        return { ok: false, reason: 'illegal-move', clarify: `${r.san} isn't a move I can find here — which move did you mean?` };
      }
      out.push({ type: 'move', san: r.san, played: !legalNow(r.san, board) });
      continue;
    }
    if (r.type === 'what-i-played') {
      if (!board.lastStudentAttempt && !studentMoveOnTape(board, student)) {
        return { ok: false, reason: 'no-student-move', clarify: "You haven't played a move here yet — which move are you asking about?" };
      }
      out.push(r);
      continue;
    }
    out.push(r);
  }
  if (turn.kind === 'answer' && out.length === 0) {
    return { ok: false, reason: 'empty-answer', clarify: 'Tap the squares, or tell me which ones.' };
  }
  // A request's openings are resolved by code through the one resolver; a
  // name that resolves to nothing is asked back, never guessed.
  if (turn.steps && turn.steps.length > 0) {
    const steps = resolveSteps(turn.steps);
    if (!steps.ok) return steps;
    return { ok: true, turn: { ...turn, referents: out, steps: steps.steps } };
  }
  const { steps: _none, ...rest } = turn;
  return { ok: true, turn: { ...rest, referents: out } };
}

function resolvePiece(
  chess: Chess,
  r: Extract<Referent, { type: 'piece' }>,
  student: 'white' | 'black',
  memory: ConversationState,
): { ok: true; ref: Extract<ResolvedReferent, { type: 'piece' }> } | { ok: false; reason: string; clarify: string } {
  const name = PIECE_WORD[r.piece];
  const sideOf = (c: 'w' | 'b'): Seat => ((c === 'w') === (student === 'white') ? 'me' : 'them');
  if (r.square) {
    const cell = SQ_RE.test(r.square) ? chess.get(r.square as Square) : undefined;
    if (!cell || cell.type !== r.piece) {
      return { ok: false, reason: 'piece-not-there', clarify: `There's no ${name} on ${r.square} — which piece did you mean?` };
    }
    const seat = sideOf(cell.color);
    if (r.seat && r.seat !== seat) {
      return { ok: false, reason: 'piece-wrong-seat', clarify: `The ${name} on ${r.square} is ${seat === 'me' ? 'yours' : 'theirs'} — did you mean that one?` };
    }
    return { ok: true, ref: { type: 'piece', piece: r.piece, square: r.square, seat } };
  }
  const candidates: Array<{ square: string; seat: Seat }> = [];
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.type !== r.piece) continue;
      const seat = sideOf(cell.color);
      if (r.seat && seat !== r.seat) continue;
      candidates.push({ square: cell.square, seat });
    }
  }
  // "The other knight": the one we were NOT just talking about.
  const pool = r.other && memory.lastPiece && memory.lastPiece.piece === r.piece
    ? candidates.filter((c) => c.square !== memory.lastPiece?.square)
    : candidates;
  if (pool.length === 1) return { ok: true, ref: { type: 'piece', piece: r.piece, square: pool[0].square, seat: pool[0].seat } };
  if (pool.length === 0) {
    const whose = r.seat === 'me' ? 'You have' : r.seat === 'them' ? 'They have' : 'There is';
    return { ok: false, reason: 'piece-absent', clarify: `${whose} no ${name} on the board.` };
  }
  // Several — the one we were just discussing, if it is among them.
  if (!r.other && memory.lastPiece && pool.some((c) => c.square === memory.lastPiece?.square)) {
    const p = pool.find((c) => c.square === memory.lastPiece?.square);
    if (p) return { ok: true, ref: { type: 'piece', piece: r.piece, square: p.square, seat: p.seat } };
  }
  // THE ONE UNDER FIRE (hand walk 2026-10-09: "where should the bishop go?"
  // right after "your bishop on b5 is attacked" was asked back "which bishop —
  // c8, b6, b5 or c1?"). Of several, the one the board puts in danger is the
  // one the question is about; then, with no seat said, the student's own.
  const inDanger = pool.filter((c) => {
    const owner = chess.get(c.square as Square)?.color;
    if (!owner) return false;
    try { return (captureRead(chess.fen(), c.square as Square, owner === 'w' ? 'b' : 'w') ?? 0) > 0; } catch { return false; }
  });
  // THE ONE IN PLAY: of the student's own, the only one that has left its
  // starting square ("can they attack my bishop?" with bishops on c1 and c4
  // means c4 — live walk B11 was asked back "which bishop?").
  const mineInPlay = pool.filter((c) => c.seat === 'me' && !onHomeSquare(r.piece, c.square, student));
  const pick = inDanger.length === 1 ? inDanger[0]
    : !r.seat && pool.filter((c) => c.seat === 'me').length === 1 ? pool.find((c) => c.seat === 'me')
    : r.seat !== 'them' && mineInPlay.length === 1 ? mineInPlay[0] : undefined;
  if (pick) return { ok: true, ref: { type: 'piece', piece: r.piece, square: pick.square, seat: pick.seat } };
  // Still several: with no side said, the question is about the student's
  // OWN pieces — "should the knight take?" asked of a White student was
  // answered "which knight — b8, g8, b1 or g1?" (live walk R3).
  const mine = !r.seat ? pool.filter((c) => c.seat === 'me') : [];
  const asked = mine.length > 0 ? mine : pool;
  return {
    ok: false,
    reason: 'piece-ambiguous',
    clarify: `Which ${name} — ${asked.map((c) => `the one on ${c.square}`).join(' or ')}?`,
  };
}

/** Is a piece of the student's on one of its starting squares? */
function onHomeSquare(piece: PieceLetter, square: string, student: 'white' | 'black'): boolean {
  const rank = student === 'white' ? '1' : '8';
  const pawnRank = student === 'white' ? '2' : '7';
  const files: Record<PieceLetter, string> = { p: 'abcdefgh', n: 'bg', b: 'cf', r: 'ah', q: 'd', k: 'e' };
  return square[1] === (piece === 'p' ? pawnRank : rank) && files[piece].includes(square[0]);
}

function legalNow(san: string, board: BoardContext): boolean {
  if (!board.fen) return false;
  try { return !!new Chess(board.fen).move(san); } catch { return false; }
}

/** A named move is real when it is legal now OR was played (on the tape) —
 *  "why Nf1?" names a move already made as often as one to make. Matched by
 *  coordinates at each ply, never by SAN string (Nxd4 vs Nexd4). */
function moveIsReal(san: string, board: BoardContext): boolean {
  if (board.fen) {
    try { if (new Chess(board.fen).move(san)) return true; } catch { /* not legal now */ }
  }
  if (board.lastStudentAttempt) {
    try { if (new Chess(board.lastStudentAttempt.fenBefore).move(san)) return true; } catch { /* no */ }
  }
  const history = board.history ?? [];
  // NO MOVE LIST (an explain board, a puzzle): the side that just moved has
  // that piece standing on the move's square, so it may have been their last
  // move (hard walk 2026-10-10: "what did their last move Kg8 threaten?" was
  // refused as illegal, and a phrase router answered with the best move).
  if (history.length === 0 && board.fen) {
    const dest = san.replace(/[+#?!]+$/, '').match(/([a-h][1-8])(?:=[QRBN])?$/)?.[1];
    const letter = /^[KQRBN]/.test(san) ? san[0].toLowerCase() : 'p';
    try {
      const c = new Chess(board.fen);
      const justMoved = c.turn() === 'w' ? 'b' : 'w';
      const p = dest ? c.get(dest as Square) : null;
      if (p && p.color === justMoved && p.type === letter && !/^O-O/.test(san)) return true;
    } catch { /* no board to read */ }
  }
  if (history.length > 0) {
    const c = new Chess();
    for (const played of history) {
      const before = c.fen();
      let mv;
      try { mv = c.move(played); } catch { return false; }
      if (!mv) return false;
      try {
        const named = new Chess(before).move(san);
        if (named && named.from === mv.from && named.to === mv.to) return true;
      } catch { /* not this ply */ }
    }
  }
  return false;
}

function studentMoveOnTape(board: BoardContext, student: 'white' | 'black'): boolean {
  const h = board.history ?? [];
  const parity = student === 'white' ? 0 : 1;
  return h.some((_m, i) => i % 2 === parity);
}

// ─── CONVERSATION MEMORY ───────────────────────────────────────────────────

/**
 * What the conversation is about, carried across turns so "the other knight",
 * "and for Black?" and "what I played" resolve. ONE shape for every surface
 * (ONE-CHAT FINAL §4); each surface keeps its own instance inside the door.
 */
export interface ConversationState {
  lastPiece: { piece: PieceLetter; square: string; seat: Seat } | null;
  lastSquare: string | null;
  lastMove: string | null;
  /** The student's seat on this surface, when known. */
  seat: 'white' | 'black' | null;
  /** The previous reading, for "and why?" follow-ups. */
  lastTurn: ResolvedChatTurn | null;
  /** WHAT THE COACH OFFERED AND HAS NOT DONE YET, as steps — so "go ahead" /
   *  "can I start now?" runs it (WO-CHAT-01 P1; walk R7 answered "can I start
   *  now?" with a best move). Only a request sets or clears it. */
  pending: ResolvedStep[] | null;
}

export const EMPTY_CONVERSATION: ConversationState = {
  lastPiece: null, lastSquare: null, lastMove: null, seat: null, lastTurn: null, pending: null,
};

/** Fold a validated reading into the memory. Pure. */
export function nextConversationState(prev: ConversationState, turn: ResolvedChatTurn, seat: 'white' | 'black' | null): ConversationState {
  let { lastPiece, lastSquare, lastMove } = prev;
  for (const r of turn.referents) {
    if (r.type === 'piece') { lastPiece = { piece: r.piece, square: r.square, seat: r.seat }; lastSquare = r.square; }
    else if (r.type === 'square') lastSquare = r.square;
    else if (r.type === 'move') lastMove = r.san;
  }
  return { lastPiece, lastSquare, lastMove, seat: seat ?? prev.seat, lastTurn: turn, pending: prev.pending };
}

/** The deterministic question a reading is SERVED as, or null when the kind
 *  is not servable from the parse (no answerer yet, or a command). */
export function canonicalAsk(turn: ResolvedChatTurn): string | null {
  const spec = CHAT_KINDS[turn.kind];
  if (spec.answerer !== 'live' || !spec.canonical) return null;
  return spec.canonical(turn);
}

/** Does a reading agree with the lane today's routing chose? */
export function kindAgreesWithLane(kind: ChatKind, lane: FastPathLane): boolean {
  return CHAT_KINDS[kind].lane === lane;
}

/** Every lane that fires for `ask`, in precedence order (the answer table's
 *  fallback reads the next allowed one when today's first pick is refused). */
export function firingLanes(ask: string, opts: { fen?: string; routedCommand?: boolean } = {}): FastPathLane[] {
  const g = buildQuestionGrounding(ask, { fen: opts.fen });
  const out: FastPathLane[] = opts.routedCommand ? ['command'] : [];
  for (const lane of FAST_PATH_LANES) {
    if (lane === 'command' || lane === 'none') continue;
    if (LANE_FIRES[lane](g, ask)) out.push(lane);
  }
  return out;
}

// ─── THE CATCH-ALL'S ANSWER, BY KIND ───────────────────────────────────────

/** Kinds about the student's own record. */
const RECORD_KINDS: ReadonlySet<ChatKind> = new Set<ChatKind>([
  'strengths', 'stats', 'opening-accuracy', 'review-due', 'weakness-lifecycle', 'weakness-briefing',
  'mistakes', 'errors-by-situation', 'misconceptions', 'tactics-profile', 'phase-profile',
  'repertoire-gap', 'accuracy', 'consistency', 'time-trouble', 'last-game', 'last-game-mistake',
  'converting', 'color', 'records', 'record-vs', 'puzzle-stats', 'transfer-gap', 'skill-radar',
  'trend', 'progress', 'opening-profile', 'endgame-weakness',
]);
const ACTION_KINDS: ReadonlySet<ChatKind> = new Set<ChatKind>(['command', 'training-request', 'settings', 'app-help', 'start-thinking-lesson']);
const KNOWLEDGE_KINDS: ReadonlySet<ChatKind> = new Set<ChatKind>([
  'concept', 'theory', 'teaching-method', 'opening-identity', 'opening-existence', 'counter-repertoire',
  'opening-traps', 'book-teaching',
]);

/**
 * What the catch-all says when no lane answered (2026-10-08). The catch-all
 * reads the board — right for a question about the board, wrong for anything
 * else: "what thinking errors have I made?" used to get the best move. So a
 * turn the door read as something other than the board is asked back about
 * THAT instead. Null lets the catch-all answer.
 */
export function askBackAtCatchAll(kind: ChatKind, clarify: string | undefined, hasBoard: boolean): string | null {
  if (kind === 'chat' || kind === 'conversational-reply' || kind === 'stop') return null;
  if (NEEDS_BOARD.has(kind) || kind === 'move-rating' || kind === 'retrospective-move' || kind === 'opponent-move' || kind === 'last-move' || kind === 'endgame' || kind === 'live-colour') {
    return hasBoard ? null : (clarify ?? "Which position do you mean? Open it on the board and ask me again.");
  }
  if (clarify) return clarify;
  if (RECORD_KINDS.has(kind)) return 'Do you mean your weaknesses, your openings, or your recent games?';
  if (ACTION_KINDS.has(kind)) return "I can't do that from the chat. I can teach or play an opening, review a game, or set up a drill — which would you like?";
  if (KNOWLEDGE_KINDS.has(kind)) return "I don't have an answer for that one yet. Ask me about a move, an opening or your games.";
  if (kind === 'player-games' || kind === 'master-play') return "I only know the games in this app and the openings it teaches, not other players' records.";
  return 'I am not sure what you mean. Could you say it another way?';
}
