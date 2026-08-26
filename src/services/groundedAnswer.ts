/**
 * groundedAnswer — Phase 1 of the coach-chat grounding inversion
 * (docs/plans/2026-06-10-coach-chat-grounding-inversion.md).
 *
 * The contract: the LLM voices computed facts; it never reasons about the
 * board. This assembles the FACTS for a move / eval question entirely in
 * code — the engine's best move, the line, the eval, and the GROUNDED reason
 * it's strong (`explainBestMoveGrounded`, the no-LLM "why" the review path
 * already uses). The chat path hands the resulting `facts` string to the LLM
 * with a voice-only instruction; the model adds nothing.
 *
 * Pure + side-effect-free so it's trivially testable and can't regress the
 * live chat. Wiring it into `getCoachChatResponse` is the next step.
 */
import { Chess } from 'chess.js';
import type { Square, PieceSymbol } from 'chess.js';
import { seeGain } from './positionReadingService';
import type { TacticsLiveContext, LivePlayerGamesContext } from '../coach/types';
import type { BadHabit, LessonScript, MoveAnnotation } from '../types';
import type { MasterPlayResult } from './masterPlayTypes';
import type { ConceptEntry } from './chessConceptService';
import type { TablebaseLookupResult } from './lichessTablebaseService';

// Pure board-fact constants — universal chess values, leaf-local so this module
// imports nothing that could loop back. coachFeatureService imports these FROM
// here (one direction), instead of the reverse that created the cycle.
export const REVIEW_PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
export const REVIEW_PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 99 };
function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

export interface GroundedAnswer {
  /** The plain-language facts the LLM must voice — and ONLY these. */
  facts: string;
  /** SAN of the computed best move (for the arrow + the prompt), or null. */
  bestMoveSan: string | null;
  /** The from/to of the best move, for a `[BOARD: arrow:from-to:green]`. */
  bestMoveFromTo: { from: string; to: string } | null;
  /** Where every fact came from (engine / chess.js) — recorded, never the LLM. */
  sources: string[];
}

/** Convert a centipawn eval (side-to-move POV) into a grounded phrase. Never
 *  invents a number — rounds the real one. */
function evalPhrase(evalCp: number | null | undefined, mateIn: number | null | undefined, mover: 'white' | 'black'): string | null {
  if (typeof mateIn === 'number' && mateIn !== 0) {
    const who = mateIn > 0 ? mover : (mover === 'white' ? 'black' : 'white');
    return `there is a forced mate in ${Math.abs(mateIn)} for ${who}`;
  }
  if (typeof evalCp !== 'number') return null;
  const pawns = evalCp / 100;
  const who = pawns >= 0 ? mover : (mover === 'white' ? 'black' : 'white');
  const mag = Math.abs(pawns);
  if (mag < 0.3) return 'the position is roughly balanced';
  // Eval voiced in POINTS, never "pawns" (David 2026-07-24: "if the eval is
  // called out then say up by three points, not three pawns").
  if (mag < 1.0) return `${who} is slightly better (about ${mag.toFixed(1)} points)`;
  if (mag < 2.5) return `${who} is clearly better (about ${mag.toFixed(1)} points)`;
  return `${who} is winning (about ${mag.toFixed(1)} points)`;
}

/**
 * assemblePositionAssessment — "who's winning?", "how do I stand here?",
 * "what's the eval?", "is this good for me?". The fact source is Stockfish's
 * eval (already threaded from the surface) PLUS the one most-relevant fact from
 * `liveTacticsContext` — voiced from the STUDENT's perspective. This grounds
 * the single biggest slice of the free-reasoning chat fallback (a bare
 * "who's better / assess this" readout the LLM used to free-narrate). Returns
 * null when there's nothing computed to say (no eval AND no tactic) so the
 * caller falls through. Takes WHITE-perspective eval (LiveState convention)
 * and converts to the student's POV internally.
 */
// ── THE POSITION READ, IN THE HOUSE VOICE ────────────────────────────────────
//
// These strings are SPOKEN, on a surface the student hits several times a game,
// and they were one flat sentence each: "The position is roughly balanced."
// Correct, and it read like an instrument panel.
//
// They could not be warmed by the corpus bake, and it is worth saying why: the
// bake rewrites 58,124 STORED notes offline, but these are parameterized — the
// eval, the square, the piece are filled in at run time, so there is no fixed
// string to rewrite. Warming a template means WRITING it warm, which is
// narration voice rule 9 ("code templates should not be the source of
// frequently-spoken text; write 3-5 variants and rotate").
//
// Every variant says exactly what the engine said. The eval is never softened,
// never dropped, never rounded differently — only the sentence around it
// changes. `{m}` is the magnitude in points, `{n}` the mate distance.
const BALANCED = [
  'The position is roughly balanced.',
  'Materially and positionally, this is level.',
  'Neither side has anything concrete here yet.',
  'Dead level — this one gets decided by ideas, not by the count.',
];
const SLIGHT_EDGE = [
  "You're slightly better — about {m} of a point.",
  "A small edge to you, about {m} of a point. Worth nursing.",
  "You hold a shade the better of it, roughly {m} of a point.",
  "About {m} of a point in your favour — an edge, not yet an advantage.",
];
const SLIGHT_DEFICIT = [
  "You're slightly worse — about {m} of a point.",
  "You're a shade worse here, around {m} of a point. Nothing fatal.",
  "About {m} of a point against you — solvable, but do not drift.",
  "Slightly the worse side, {m} of a point. Time to be accurate.",
];
const CLEAR_EDGE = [
  "You're clearly better — about {m} points.",
  "A real advantage now, about {m} points. Convert it.",
  "About {m} points to you — this is the kind of edge that wins games.",
  "Clearly your position, {m} points up. Keep the initiative.",
];
const CLEAR_DEFICIT = [
  "You're clearly worse — about {m} points.",
  "About {m} points against you. This needs active defence.",
  "You are the worse side by roughly {m} points — look for counterplay.",
  "{m} points down. Complicate before it simplifies.",
];
const WINNING = [
  "You're winning — about {m} points up.",
  "This is won, {m} points up. Technique from here.",
  "About {m} points ahead — take the simplest road home.",
  "Decisive, {m} points in hand. Trade pieces, not pawns.",
];
const LOSING = [
  "You're losing — about {m} points down.",
  "About {m} points down. Only practical chances left.",
  "{m} points against you — set problems, do not resign the position.",
  "Objectively lost by {m} points. Make it hard.",
];
const MATE_FOR_YOU = [
  'You have a forced mate in {n}.',
  'Mate in {n} is there — find it.',
  'There is a forced mate in {n} for you.',
];
const MATE_AGAINST_YOU = [
  'There is a forced mate against you in {n}.',
  'You are being mated in {n}. Look for the check that stops it.',
  'Mate against you in {n} — this needs a defence right now.',
];

/** Deterministic variant choice. The same position always reads the same way —
 *  consistency beats novelty, and it keeps the TTS clip cache warm. */
const pick = (variants: readonly string[], seed: number): string =>
  variants[Math.abs(seed) % variants.length];

export function assemblePositionAssessment(opts: {
  evalCp: number | null | undefined;
  mateIn: number | null | undefined;
  tactics?: TacticsLiveContext | null;
  studentColor: 'white' | 'black';
}): GroundedAnswer | null {
  const { tactics, studentColor } = opts;
  const sc: 'w' | 'b' = studentColor === 'white' ? 'w' : 'b';
  const parts: string[] = [];

  // WHITE-perspective eval → student POV (flip sign for Black).
  const studentEvalCp = typeof opts.evalCp === 'number' ? (studentColor === 'white' ? opts.evalCp : -opts.evalCp) : null;
  const studentMateIn = typeof opts.mateIn === 'number' ? (studentColor === 'white' ? opts.mateIn : -opts.mateIn) : null;

  if (typeof studentMateIn === 'number' && studentMateIn !== 0) {
    const n = Math.abs(studentMateIn);
    parts.push(studentMateIn > 0
      ? pick(MATE_FOR_YOU, n).replace('{n}', String(n))
      : pick(MATE_AGAINST_YOU, n).replace('{n}', String(n)));
  } else if (typeof studentEvalCp === 'number') {
    const mag = Math.abs(studentEvalCp) / 100;
    const ahead = studentEvalCp >= 0;
    // Rotation seed: the eval itself. The SAME position always reads the same
    // way — consistency matters more than novelty, and it keeps the TTS clip
    // cache warm — while different positions draw different stems, so a long
    // game never sounds like one recording (narration voice rule 9).
    const seed = Math.abs(Math.round(studentEvalCp));
    if (mag < 0.3) parts.push(pick(BALANCED, seed));
    else if (mag < 1.0) parts.push(pick(ahead ? SLIGHT_EDGE : SLIGHT_DEFICIT, seed).replace('{m}', mag.toFixed(1)));
    else if (mag < 2.5) parts.push(pick(ahead ? CLEAR_EDGE : CLEAR_DEFICIT, seed).replace('{m}', mag.toFixed(1)));
    else parts.push(pick(ahead ? WINNING : LOSING, seed).replace('{m}', mag.toFixed(1)));
  }

  // Add the single most relevant computed fact so the assessment names a WHY.
  if (tactics) {
    if (tactics.boardFacts?.mateInOne) {
      parts.push(`There is checkmate in one on the board: ${tactics.boardFacts.mateInOne}.`);
    } else if (tactics.immediate[0]?.description) {
      parts.push(`${tactics.immediate[0].description}.`);
    } else {
      const myHang = tactics.hanging.find((h) => h.color === sc);
      if (myHang) parts.push(`Your ${REVIEW_PIECE_NAME[myHang.piece] ?? myHang.piece} on ${myHang.square} is hanging.`);
      else if (tactics.threats[0]?.description) parts.push(`Watch out — ${tactics.threats[0].description}.`);
    }
  }

  if (parts.length === 0) return null;
  const sources = tactics ? ['engine:stockfish', 'board:chess.js'] : ['engine:stockfish'];
  return { facts: parts.join(' '), bestMoveSan: null, bestMoveFromTo: null, sources };
}

/**
 * assembleSettingsAnswer — the DATA half of settings (F17): "is voice on?",
 * "what's my narration level?", "what are my settings?". Reads the user's
 * CURRENT preferences (passed in by the caller so this stays a pure leaf) and
 * voices them. The mutate half ("turn voice on") is a separate action. Returns
 * null when there's nothing to report.
 */
export function assembleSettingsAnswer(opts: {
  voiceOn?: boolean | null;
  narration?: 'silent' | 'brief' | 'full' | null;
  showHints?: boolean | null;
  cloudEnabled?: boolean | null;
  personality?: string | null;
}): GroundedAnswer | null {
  const parts: string[] = [];
  if (typeof opts.voiceOn === 'boolean') parts.push(`Voice narration is ${opts.voiceOn ? 'on' : 'off'}.`);
  if (opts.narration) {
    const desc =
      opts.narration === 'silent' ? 'silent — no spoken narration'
      : opts.narration === 'brief' ? 'brief — short, capped narration'
      : 'full — complete narration';
    parts.push(`Your narration level is ${desc}.`);
  }
  if (typeof opts.showHints === 'boolean') parts.push(`Hints are ${opts.showHints ? 'on' : 'off'}.`);
  if (typeof opts.cloudEnabled === 'boolean' && !opts.cloudEnabled) {
    parts.push('The premium voice is off, so narration uses the device voice.');
  }
  if (opts.personality && opts.personality !== 'default') parts.push(`Coach personality is set to ${opts.personality}.`);
  if (parts.length === 0) return null;
  return { facts: parts.join(' '), bestMoveSan: null, bestMoveFromTo: null, sources: ['app:settings'] };
}

/**
 * assembleAppHelpAnswer — "what does the Tactics tab do?", "how does the
 * Calculation trainer work?", "what's the Training Plan for?" (F15 app-help).
 * The fact source is `APP_ROUTES_MANIFEST` (hand-maintained truth about every
 * navigable surface — title + editorial description). The caller resolves WHICH
 * route the question names (matchRouteByTopic) and hands the entry in, so this
 * stays a pure leaf. The LLM decides nothing — it voices the app's own copy.
 * Returns null when the entry has no description to voice.
 */
export function assembleAppHelpAnswer(opts: {
  title: string;
  description: string;
}): GroundedAnswer | null {
  const title = opts.title?.trim();
  const description = opts.description?.trim();
  if (!title || !description) return null;
  return { facts: `${title}: ${description}`, bestMoveSan: null, bestMoveFromTo: null, sources: ['app:routes'] };
}

/**
 * assembleTeachingAnswer — "how do you teach the X?", "how does the app teach
 * this opening?", "how do the lessons work?" (F11 pedagogy). The fact source is
 * the app's OWN teaching structure: the WLPP grammar (Watch/Learn/Practice/Play)
 * plus, when a curated `LessonScript` exists for the opening, its real shape
 * (minutes, beat count, the authored short-register idea cues) and any supporting
 * plans/traps/quiz. The LLM decides nothing — this describes how we actually
 * teach, grounded in the lesson data. When no specific lesson resolves, it still
 * describes the general WLPP method (a true description of the app). Returns null
 * only when there is nothing to say. `lesson` is passed in by the caller so this
 * module stays a pure leaf (no data-layer import).
 */
export function assembleTeachingAnswer(opts: {
  openingName?: string | null;
  lesson: LessonScript | null;
  extras?: { plans?: number; traps?: number; quiz?: boolean };
}): GroundedAnswer | null {
  const { lesson } = opts;
  const name = opts.openingName?.trim() || null;
  const parts: string[] = [];

  // The WLPP method is how EVERY opening is taught — always true, always safe.
  const wlpp =
    'It runs through four rungs — Watch, Learn, Practice, Play. You watch the ' +
    'line played move by move with narration, then play each move yourself as I ' +
    'cue it, then play it again silently with a hint if you need one, then a full ' +
    'game locked to the line so you own it.';

  if (lesson && lesson.beats.length > 0) {
    parts.push(name ? `Here's how we teach the ${name}.` : "Here's how the opening lessons work.");
    parts.push(wlpp);
    parts.push(
      `The ${name ?? 'lesson'} lesson runs about ${lesson.minutes} minute${lesson.minutes === 1 ? '' : 's'} ` +
      `across ${lesson.beats.length} key position${lesson.beats.length === 1 ? '' : 's'}.`,
    );
    const cues = lesson.beats
      .map((b) => b.sayShort)
      .filter((s): s is string => !!s && s.trim().length > 0)
      .slice(0, 3);
    if (cues.length > 0) parts.push(`The ideas you'll drill: ${cues.join('; ')}.`);
    const extras: string[] = [];
    if (opts.extras?.plans) extras.push(`${opts.extras.plans} middlegame plan${opts.extras.plans === 1 ? '' : 's'}`);
    if (opts.extras?.traps) extras.push(`${opts.extras.traps} trap${opts.extras.traps === 1 ? '' : 's'} to spring or sidestep`);
    if (opts.extras?.quiz) extras.push('checkpoint quizzes');
    if (extras.length > 0) parts.push(`It also carries ${extras.join(', ')}.`);
    const sources = lesson.sources && lesson.sources.length > 0 ? lesson.sources : ['app:lesson'];
    return { facts: parts.join(' '), bestMoveSan: null, bestMoveFromTo: null, sources };
  }

  // No curated lesson for this opening — describe the general method (true for
  // every opening), naming the opening if we have it.
  parts.push(
    name
      ? `We teach the ${name} the same way we teach every opening.`
      : 'Here\'s how the opening lessons work.',
  );
  parts.push(wlpp);
  parts.push('Every move is led by arrows and highlights so your eye lands where the idea is, and the coach can lock a real game to the exact line so you practice it, not a lookalike.');
  return { facts: parts.join(' '), bestMoveSan: null, bestMoveFromTo: null, sources: ['app:lesson-method'] };
}

/** chess.js piece letter → the singular word a student says. Deliberately NOT
 *  the plural `PIECE_WORD` further down this file: that one counts material
 *  ("2 knights"), this one names one move's mover. */
const MOVER_WORD: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

/**
 * Assemble the grounded facts for a move / best-move / eval question.
 * Returns null when there's no engine move to ground on (caller falls back
 * to the existing path — this never fabricates).
 */
export function assembleMoveEvalAnswer(opts: {
  fen: string;
  /** Engine best move in UCI (e.g. `g1f3`) — from Stockfish PV[0]. */
  bestMoveUci: string | null;
  evalCp?: number | null;
  mateIn?: number | null;
  /** Whose game this is. When the position is NOT the student's to move, the
   *  engine's best move belongs to the OPPONENT and must be named as theirs.
   *
   *  Without this the phase report told David, playing White, "The best move
   *  is Qb6" on a Black-to-move board — and the coach played exactly that
   *  twenty-one seconds later. Every "best move" in that report was advice for
   *  his opponent, read to him as his own. He described it as the hints being
   *  bad moves; they were good moves for the wrong player. */
  studentColor?: 'white' | 'black' | null;
  /** THE PIECE THE STUDENT ASKED ABOUT, when they restricted the question.
   *
   *  🔒 ANSWER THE QUESTION THAT WAS ASKED (David 2026-08-11: "the coach could
   *  not answer my questions when asked"). From his game, via PostHog: he asked
   *  "Which pawn should I push?" and was told "The best move is O-O. White is
   *  clearly better." Castling is not a pawn. The classifier matched
   *  "should i … push", routed it to the best-move lane, and the lane — which
   *  never sees the question, only the engine — answered a different question
   *  confidently.
   *
   *  The honest repair is not to suppress the best move: it is still the true
   *  answer to "what should I play". It is to SAY that it isn't the thing they
   *  asked about, so the student can tell an answer from a non-answer. */
  askedPiece?: 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king' | null;
}): GroundedAnswer | null {
  const { fen, bestMoveUci } = opts;
  if (!bestMoveUci || bestMoveUci.length < 4) return null;

  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }
  const mover: 'white' | 'black' = chess.turn() === 'w' ? 'white' : 'black';

  // SAN + from/to from the UCI — chess.js is the truth, not the LLM.
  let bestMoveSan: string | null = null;
  let fromTo: { from: string; to: string } | null = null;
  let bestMovePiece: string | null = null;
  try {
    const probe = new Chess(fen);
    const from = bestMoveUci.slice(0, 2);
    const to = bestMoveUci.slice(2, 4);
    const promotion = bestMoveUci.length > 4 ? bestMoveUci[4] : undefined;
    const mv = probe.move({ from, to, promotion });
    if (mv) {
      bestMoveSan = mv.san;
      fromTo = { from, to };
      bestMovePiece = MOVER_WORD[mv.piece] ?? null;
    }
  } catch {
    return null; // illegal best move → don't ground (never fabricate)
  }
  if (!bestMoveSan) return null;

  // The GROUNDED reason it's strong — no LLM. (playedSan null: we're not
  // contrasting a played move here, just stating what the best move achieves.)
  const why = explainBestMoveGrounded(fen, null, bestMoveUci, mover);
  const evalText = evalPhrase(opts.evalCp, opts.mateIn, mover);

  const theirMove = Boolean(opts.studentColor) && opts.studentColor !== mover;
  // The student named a piece and the engine's answer is a different one. Say
  // so BEFORE naming the move — chess.js supplied the piece, so this is a fact
  // about the board, not a hedge.
  const wrongPiece = Boolean(opts.askedPiece) && Boolean(bestMovePiece)
    && opts.askedPiece !== bestMovePiece;
  const parts: string[] = [
    theirMove
      ? `Their strongest reply is ${bestMoveSan}.`
      : wrongPiece
        ? `No ${opts.askedPiece} move is the answer here — the strongest is ${bestMoveSan}.`
        : `The best move is ${bestMoveSan}.`,
  ];
  if (why) parts.push(why);
  if (evalText) parts.push(`${evalText.charAt(0).toUpperCase()}${evalText.slice(1)}.`);

  const sources = ['engine:stockfish', 'board:chess.js'];

  return {
    facts: parts.join(' '),
    bestMoveSan,
    bestMoveFromTo: fromTo,
    sources,
  };
}

/**
 * assembleCandidateMoveAnswer — the GROUNDED answer to "is <move> ok / can I
 * play <move> / what about <move>" (David 2026-07-10: "Coach needs to evaluate
 * the OTHER moves against database and stockfish" — not deflect to "the best
 * move is X"). Everything is computed (chess.js legality + Stockfish eval + DB
 * frequency); the LLM only phrases it via voiceFacts. Returns null only when
 * the candidate SAN is unparseable AND we have nothing honest to say.
 *
 * Sign convention: `bestEvalCp` and `candidateEvalCp` are BOTH from the MOVER's
 * point of view (positive = good for the side to move). The runtime negates the
 * post-candidate opponent-POV eval before passing it in, so `cpLoss =
 * bestEvalCp - candidateEvalCp` is a non-negative "how much worse than best".
 */
export function assembleCandidateMoveAnswer(opts: {
  fen: string;
  /** The move the student named, in SAN (e.g. "Qf3"). */
  candidateSan: string;
  /** Engine best move in UCI — from Stockfish PV[0]. */
  bestMoveUci: string | null;
  /** Mover-POV eval of the position (value of best play). */
  bestEvalCp?: number | null;
  /** Mover-POV value of the candidate (post-move eval, already negated to
   *  mover POV by the runtime). */
  candidateEvalCp?: number | null;
  /** Mover-POV mate distance after the candidate (negative = candidate gets
   *  mated). */
  candidateMateIn?: number | null;
  /** % of master games that play the candidate here, when the explorer has it. */
  masterFreqPct?: number | null;
}): GroundedAnswer | null {
  const { fen, candidateSan } = opts;
  const raw = (candidateSan ?? '').trim();
  if (!raw) return null;

  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }
  const mover: 'white' | 'black' = chess.turn() === 'w' ? 'white' : 'black';

  // Legality is chess.js truth. An illegal proposal gets an honest answer, not
  // a fabricated evaluation (empty > invented).
  let candNorm: string | null = null;
  try {
    const probe = new Chess(fen);
    const mv = probe.move(raw);
    candNorm = mv ? mv.san : null;
  } catch {
    candNorm = null;
  }
  if (!candNorm) {
    return {
      facts: `${raw} isn't a legal move in this position.`,
      bestMoveSan: null,
      bestMoveFromTo: null,
      sources: ['board:chess.js'],
    };
  }

  // Best move SAN + from/to from the UCI (chess.js is the truth).
  let bestSan: string | null = null;
  let bestFromTo: { from: string; to: string } | null = null;
  if (opts.bestMoveUci && opts.bestMoveUci.length >= 4) {
    try {
      const probe = new Chess(fen);
      const from = opts.bestMoveUci.slice(0, 2);
      const to = opts.bestMoveUci.slice(2, 4);
      const promotion = opts.bestMoveUci.length > 4 ? opts.bestMoveUci[4] : undefined;
      const mv = probe.move({ from, to, promotion });
      if (mv) {
        bestSan = mv.san;
        bestFromTo = { from, to };
      }
    } catch {
      bestSan = null;
    }
  }

  const sources = ['engine:stockfish', 'board:chess.js'];
  const geo = describeMoveGeometry(fen, candNorm, mover); // what the candidate DOES
  const freqText =
    typeof opts.masterFreqPct === 'number' && opts.masterFreqPct >= 1
      ? `Masters play it about ${Math.round(opts.masterFreqPct)}% of the time here.`
      : null;

  // Candidate IS the engine's best move → affirm it (with the grounded why).
  if (bestSan && candNorm === bestSan) {
    const why = explainBestMoveGrounded(fen, null, opts.bestMoveUci, mover);
    const parts = [`Yes — ${candNorm} is the best move here.`];
    if (why) parts.push(why);
    if (freqText) parts.push(freqText);
    return { facts: parts.join(' '), bestMoveSan: bestSan, bestMoveFromTo: bestFromTo, sources };
  }

  // Candidate mated / gets mated after it.
  if (typeof opts.candidateMateIn === 'number' && opts.candidateMateIn < 0) {
    const parts = [`${candNorm} loses — it walks into mate in ${Math.abs(opts.candidateMateIn)}.`];
    if (bestSan) parts.push(`Play ${bestSan} instead.`);
    return { facts: parts.join(' '), bestMoveSan: bestSan, bestMoveFromTo: bestFromTo, sources };
  }

  // Compute the cp-loss vs best (both mover-POV). Absent evals → a bounded,
  // honest verdict that still names the best alternative rather than guessing.
  const haveEvals =
    typeof opts.bestEvalCp === 'number' && typeof opts.candidateEvalCp === 'number';
  const cpLoss = haveEvals ? Math.max(0, (opts.bestEvalCp as number) - (opts.candidateEvalCp as number)) : null;
  const pawns = cpLoss !== null ? (cpLoss / 100).toFixed(1) : null;

  let verdict: string;
  if (cpLoss === null) {
    verdict = bestSan
      ? `${candNorm} is playable, but ${bestSan} is the engine's top choice here.`
      : `${candNorm} is a legal move here.`;
  } else if (cpLoss <= 30) {
    verdict = `${candNorm} is perfectly fine — essentially equal to the best move${bestSan ? ` ${bestSan}` : ''}.`;
  } else if (cpLoss <= 90) {
    verdict = `${candNorm} is playable, just slightly worse than ${bestSan ?? 'the best move'} — about ${pawns} of a point.`;
  } else if (cpLoss <= 200) {
    verdict = `${candNorm} is an inaccuracy — it gives up about ${pawns} of a point versus ${bestSan ?? 'the best move'}.`;
  } else {
    verdict = `${candNorm} is a mistake — it loses about ${pawns} points; ${bestSan ?? 'the engine move'} is much better.`;
  }

  const parts = [verdict];
  // Name WHAT the candidate does when the geometry is concrete (not a bare
  // "attacks"), so the student hears the reason, not just the grade.
  if (geo && !geo.startsWith('attacks')) parts.push(`It ${geo}.`);
  const evalText = evalPhrase(opts.candidateEvalCp, opts.candidateMateIn, mover);
  if (evalText) parts.push(`After it, ${evalText}.`);
  if (freqText) parts.push(freqText);

  return {
    facts: parts.join(' '),
    bestMoveSan: bestSan,
    bestMoveFromTo: bestFromTo,
    sources,
  };
}

/** One engine line for the alternatives comparison: the first move (SAN),
 *  the engine's reply to it (SAN, when the PV carries one), and the
 *  WHITE-perspective eval of the line. Built by `buildAlternativesContext`
 *  from the MultiPV analysis — everything chess.js-validated. */
export interface AlternativeLineFact {
  san: string;
  replySan: string | null;
  evalCp: number | null;
  mateIn: number | null;
}

/**
 * assembleAlternativesAnswer — the GROUNDED answer to "why is the best move
 * better than the alternatives / what else could I play / why are the natural
 * alternatives worse" (David 2026-07-11: the thrice-repeated live-prod ask
 * "explain the key idea and why the natural alternatives are worse" got the
 * same generic PV recitation each time — NOTHING computed the comparison).
 *
 * The fact source is Stockfish's MultiPV top lines: the best line plus the
 * next alternatives, each with its eval and the engine's REPLY that punishes
 * it. cp-gaps grade each alternative honestly (nearly-as-good / slightly
 * worse / a real concession / loses outright); the reply names the concrete
 * consequence. Everything computed (G0) — the LLM only phrases via voiceFacts.
 *
 * `lines` evals are WHITE-perspective (StockfishAnalysis convention); this
 * assembler flips to mover POV itself. Returns null when fewer than 2 lines
 * are available (nothing to compare — fall through to the best-move branch).
 */
export function assembleAlternativesAnswer(opts: {
  fen: string;
  lines: ReadonlyArray<AlternativeLineFact>;
}): GroundedAnswer | null {
  const { fen, lines } = opts;
  if (!lines || lines.length < 2) return null;

  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }
  const mover: 'white' | 'black' = chess.turn() === 'w' ? 'white' : 'black';
  const flip = mover === 'black' ? -1 : 1;

  // Validate + normalize the best line's first move (chess.js is the truth).
  const best = lines[0];
  let bestSan: string | null = null;
  let bestFromTo: { from: string; to: string } | null = null;
  let bestUci: string | null = null;
  try {
    const probe = new Chess(fen);
    const mv = probe.move(best.san);
    if (mv) {
      bestSan = mv.san;
      bestFromTo = { from: mv.from, to: mv.to };
      bestUci = `${mv.from}${mv.to}${mv.promotion ?? ''}`;
    }
  } catch {
    return null;
  }
  if (!bestSan || !bestUci) return null;

  const bestEvalStm = typeof best.evalCp === 'number' ? best.evalCp * flip : null;
  const bestMateStm = typeof best.mateIn === 'number' && best.mateIn !== null ? best.mateIn * flip : null;

  const parts: string[] = [];
  // 1. The best move + the grounded WHY (fork/pin/mate/material/positional).
  const why = explainBestMoveGrounded(fen, null, bestUci, mover);
  parts.push(`The best move is ${bestSan}.`);
  if (why) parts.push(why);

  // 2. Each alternative, graded by its cp-gap to best, with the engine's
  //    punishing reply as the concrete consequence.
  const closeOnes: string[] = [];
  for (const alt of lines.slice(1, 4)) {
    // Validate the alternative's first move on THIS board.
    let altSan: string | null = null;
    let altAfter: Chess | null = null;
    try {
      const probe = new Chess(fen);
      const mv = probe.move(alt.san);
      if (mv) {
        altSan = mv.san;
        altAfter = probe;
      }
    } catch {
      continue;
    }
    if (!altSan || altSan === bestSan) continue;

    const altEvalStm = typeof alt.evalCp === 'number' ? alt.evalCp * flip : null;
    const altMateStm = typeof alt.mateIn === 'number' && alt.mateIn !== null ? alt.mateIn * flip : null;

    // The engine's reply to the alternative — validated on the post-alt board.
    let replyClause: string | null = null;
    if (alt.replySan && altAfter) {
      try {
        const replyProbe = new Chess(altAfter.fen());
        const replyMv = replyProbe.move(alt.replySan);
        if (replyMv) {
          const opp: 'white' | 'black' = mover === 'white' ? 'black' : 'white';
          const replyGeo = describeMoveGeometry(altAfter.fen(), replyMv.san, opp);
          replyClause = replyGeo
            ? `the reply ${replyMv.san} ${replyGeo}`
            : `the engine answers ${replyMv.san}`;
        }
      } catch { /* reply illegal on this board — skip the clause */ }
    }

    // Alternative walks into mate → say that, nothing else matters.
    if (typeof altMateStm === 'number' && altMateStm < 0) {
      parts.push(`${altSan} loses outright — it walks into a mate in ${Math.abs(altMateStm)}.`);
      continue;
    }

    const cpLoss =
      bestEvalStm !== null && altEvalStm !== null ? Math.max(0, bestEvalStm - altEvalStm) : null;
    if (cpLoss === null) {
      // No eval to compare — name the reply consequence if we have one, else skip.
      if (replyClause) parts.push(`Against ${altSan}, ${replyClause}.`);
      continue;
    }
    const pawns = (cpLoss / 100).toFixed(1);
    if (cpLoss <= 30) {
      closeOnes.push(altSan);
    } else if (cpLoss <= 90) {
      parts.push(`${altSan} is playable but slightly worse — about ${pawns} of a point${replyClause ? `; ${replyClause}` : ''}.`);
    } else if (cpLoss <= 200) {
      parts.push(`${altSan} concedes about ${pawns} points${replyClause ? ` — ${replyClause}` : ''}.`);
    } else {
      parts.push(`${altSan} is much worse — it gives up about ${pawns} points${replyClause ? `; ${replyClause}` : ''}.`);
    }
  }
  // Honest when the engine says several moves are fine: don't invent a gap.
  if (closeOnes.length > 0) {
    parts.push(
      closeOnes.length === 1
        ? `${closeOnes[0]} is essentially as good — a real alternative.`
        : `${closeOnes.join(' and ')} are essentially as good — this position offers more than one route.`,
    );
  }

  // 3. The verdict eval of best play.
  const evalText = evalPhrase(bestEvalStm, bestMateStm, mover);
  if (evalText) parts.push(`With ${bestSan}, ${evalText}.`);

  return {
    facts: parts.join(' '),
    bestMoveSan: bestSan,
    bestMoveFromTo: bestFromTo,
    sources: ['engine:stockfish', 'board:chess.js'],
  };
}

/**
 * explainBestMoveGrounded — the GROUNDED, LLM-FREE "why" (moved here from
 * coachFeatureService 2026-06-10 to break the import cycle: pure board-fact
 * computers belong in the leaf, not in a service tangled with coachApi). It
 * reports ONLY what chess.js can prove about the board — what the best move
 * concretely wins, whether it gives check, what the played move left hanging —
 * never the engine's deep reasoning it can't see.
 */
export function explainBestMoveGrounded(
  fenBefore: string,
  playedSan: string | null,
  bestMoveUci: string | null,
  moverColor: 'white' | 'black',
): string | null {
  if (!bestMoveUci || bestMoveUci.length < 4) return null;
  const mc: 'w' | 'b' = moverColor === 'white' ? 'w' : 'b';

  let bestClause: string | null = null;
  try {
    const c = new Chess(fenBefore);
    const to = bestMoveUci.slice(2, 4);
    const captured = c.get(to as never);
    const mv = c.move({ from: bestMoveUci.slice(0, 2), to, promotion: bestMoveUci.length > 4 ? bestMoveUci[4] : undefined });
    if (mv) {
      // Prefer the RICH, hand-audited geometry (fork/pin/mate/check/material) so
      // the "why it was a mistake" narration names the concrete point of the best
      // move — the engine-reasoning form (David 2026-07-10). EXCLUDE the bare
      // "attacks the X" clause: this function promises recapture-safety (it must
      // NOT claim merit on a move whose piece just hangs), and a lone attack can
      // fire from a piece that is itself en prise. Forks/pins/mate/check/material
      // are all forcing or material-safe. Falls back to the narrow capture/check
      // read when no strong geometry is computable.
      const geo = describeMoveGeometry(fenBefore, mv.san, moverColor);
      if (geo && !geo.startsWith('attacks')) {
        bestClause = `it ${geo}`;
      } else if (captured && captured.color !== mc) {
        const recapturable = c.attackers(to as never, captured.color).length > 0;
        const movedVal = REVIEW_PIECE_VALUE[mv.piece] ?? 0;
        const capVal = REVIEW_PIECE_VALUE[captured.type] ?? 0;
        if (!recapturable || capVal > movedVal) {
          bestClause = `it wins the ${REVIEW_PIECE_NAME[captured.type]} on ${to}`;
        }
      }
      if (!bestClause && c.inCheck()) bestClause = 'it comes with check';
      // POSITIONAL fallback (David 2026-07-10: "tell the user WHY it's best" —
      // on EVERY wrong move, not just forcing ones). When the best move makes no
      // fork/pin/check/material threat, name its quiet purpose — the outpost it
      // takes, the centre it develops toward — so a mistake's "why the engine's
      // move was better" is never empty on a quiet position. Pure board geometry
      // (G3): quietPurposePhrase returns null rather than invent.
      if (!bestClause) {
        const q = quietPurposePhrase(fenBefore, mv.san, moverColor);
        if (q) bestClause = `it ${q}`;
      }
      // NB: we do NOT name a bare "sacrifice" as the reason the best move is best
      // here — from the best-move's inputs alone we can't show the compensation
      // (the deflection payoff lives in the follow-up line), and "it sacrifices
      // the rook" with no why reads as nonsense. A sound sacrifice is named only
      // where the classification already establishes soundness — the student's
      // own brilliant/great move (see buildDeterministicNarration). Forcing sacs
      // (check/fork/capture) are still caught by the geometry above.
    }
  } catch { /* board fact unavailable — stay silent */ }

  let costClause: string | null = null;
  if (playedSan) {
    try {
      const c = new Chess(fenBefore);
      if (c.move(playedSan)) {
        // A piece is only a real loss if the opponent has a LEGAL capture that
        // wins material by static-exchange eval. `findHangingPieces` /
        // `chess.attackers` count PINNED attackers that can't actually capture
        // — the 2026-06-27 "your move left the pawn on e5 hanging" false
        // positive, whose only attacker was a pinned knight (no legal capture
        // existed). Drive off legal captures + SEE so a pin can never be read
        // as a hang, and a defended-but-exchange-losing piece still is.
        const legalCaps = c.moves({ verbose: true }).filter((m) => m.captured);
        let worst: { square: Square; piece: PieceSymbol; gain: number; san: string } | null = null;
        for (const cap of legalCaps) {
          const to = cap.to;
          const victim = c.get(to);
          if (!victim || victim.color !== mc) continue; // must capture the mover's own piece
          const gain = seeGain(c, to); // material the opponent wins on that square
          if (gain > 0 && (!worst || gain > worst.gain)) {
            worst = { square: to, piece: victim.type, gain, san: cap.san };
          }
        }
        if (worst) {
          // SEE is BLIND past its own square — it cannot see a fork landing
          // ELSEWHERE on the reply. David 2026-07-21 (Berlin, "let White take
          // on e5 and pick up a pawn for nothing"): taking e5 walked into a
          // king-rook fork, so the "wins the pawn" story was FALSE even though
          // SEE-on-e5 was positive. Simulate the capture and scan the mover's
          // replies for a refuting counter-tactic (a safe fork on two majors,
          // or a capture regaining at least the lost material). If one exists,
          // the capture is NOT a clean win — say nothing rather than a wrong
          // story (empty > invented); the eval swing + best move still speak.
          const refuted = captureHasCounterTactic(c.fen(), worst.san, mc, worst.gain);
          if (!refuted) {
            const punisher = mc === 'w' ? 'Black' : 'White';
            let givesCheck = false;
            try { const after = new Chess(c.fen()); after.move(worst.san); givesCheck = after.inCheck(); } catch { /* keep false */ }
            costClause = `your move let ${punisher} play ${worst.san}, winning the ${REVIEW_PIECE_NAME[worst.piece]}${givesCheck ? ' with check' : ''}`;
          }
        }
      }
    } catch { /* board fact unavailable — stay silent */ }
  }

  if (bestClause && costClause) return `${cap(bestClause)}, while ${costClause}.`;
  if (bestClause) return `${cap(bestClause)}.`;
  if (costClause) return `${cap(costClause)}.`;
  return null;
}

/**
 * captureHasCounterTactic — does the side that just "lost" material to the
 * given capture have an immediate tactical reply that refutes the win? Checks
 * two board-provable resources after simulating the capture:
 *   • a SAFE FORK: a reply attacking the enemy king plus a rook/queen (or any
 *     two pieces worth ≥5) from a square the opponent cannot favorably take;
 *   • a REGAIN: a reply capturing material whose static exchange nets at
 *     least what was lost.
 * Used to keep SEE-based "wins the pawn" claims honest — SEE cannot see a
 * fork that lands on a DIFFERENT square one move later.
 */
export function captureHasCounterTactic(
  fenAfterPlayed: string,
  captureSan: string,
  moverColor: 'w' | 'b',
  lostValue: number,
): boolean {
  try {
    const c = new Chess(fenAfterPlayed);
    if (!c.move(captureSan)) return false;
    // It's now the original mover's turn — scan their replies.
    const enemy: 'w' | 'b' = moverColor === 'w' ? 'b' : 'w';
    for (const reply of c.moves({ verbose: true })) {
      // REGAIN: a capture that nets back at least what was lost.
      if (reply.captured) {
        const net = seeGain(c, reply.to);
        if (net >= lostValue) return true;
      }
      // SAFE FORK: after the reply, the moved piece attacks the enemy king
      // AND a rook or queen (or two pieces worth ≥5), and cannot be taken
      // with profit on its new square.
      const sim = new Chess(c.fen());
      let mv: ReturnType<Chess['move']> | null = null;
      try { mv = sim.move(reply.san); } catch { continue; }
      if (!mv) continue;
      let majors = 0;
      let hitsKing = false;
      for (const row of sim.board()) {
        for (const cell of row) {
          if (!cell || cell.color !== enemy) continue;
          if (cell.type !== 'k' && cell.type !== 'q' && cell.type !== 'r') continue;
          const attackedByMoved = sim.attackers(cell.square, moverColor).includes(mv.to);
          if (!attackedByMoved) continue;
          if (cell.type === 'k') hitsKing = true;
          else majors += 1;
        }
      }
      if ((hitsKing && majors >= 1) || majors >= 2) {
        const punishNet = seeGain(sim, mv.to); // opponent's best take-back on the fork square
        if (punishNet <= 0) return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/** Ray-walk from a slider's square to find a PIN it creates: the first enemy
 *  piece on a ray, with a HIGHER-value enemy piece directly behind it on the
 *  same ray (a relative pin; absolute when the rear piece is the king). Pure
 *  board geometry — this is the "bishop pins the knight to the queen" fact
 *  David asked for (2026-06-27). Returns null when no pin exists. */
function findPinFrom(
  c: Chess,
  from: Square,
  pieceType: PieceSymbol,
  moverColor: 'white' | 'black',
): { pinned: Square; pinnedPiece: PieceSymbol; rear: Square; rearPiece: PieceSymbol } | null {
  const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const dirs = pieceType === 'b' ? DIAG : pieceType === 'r' ? ORTHO : pieceType === 'q' ? [...DIAG, ...ORTHO] : [];
  if (dirs.length === 0) return null;
  const enemy = moverColor === 'white' ? 'b' : 'w';
  const f0 = from.charCodeAt(0) - 97;
  const r0 = Number(from[1]) - 1;

  for (const [df, dr] of dirs) {
    let f = f0 + df;
    let r = r0 + dr;
    let first: { sq: Square; piece: PieceSymbol } | null = null;
    while (f >= 0 && f < 8 && r >= 0 && r < 8) {
      const sq = (String.fromCharCode(97 + f) + String(r + 1)) as Square;
      const pc = c.get(sq);
      if (pc) {
        if (pc.color !== enemy) break; // friendly blocker — no pin on this ray
        if (!first) {
          first = { sq, piece: pc.type };
        } else {
          // Second enemy piece behind the first — a pin if it's worth more.
          if ((REVIEW_PIECE_VALUE[pc.type] ?? 0) > (REVIEW_PIECE_VALUE[first.piece] ?? 0)) {
            return { pinned: first.sq, pinnedPiece: first.piece, rear: sq, rearPiece: pc.type };
          }
          break;
        }
      }
      f += df;
      r += dr;
    }
  }
  return null;
}

/** The highest-value enemy piece the piece on `from` now attacks (a developing
 *  TEMPO — the move makes a threat the opponent must answer). Pure board fact. */
function bestAttackFrom(
  c: Chess,
  from: Square,
  moverColor: 'white' | 'black',
): { square: Square; piece: PieceSymbol } | null {
  const mc = moverColor === 'white' ? 'w' : 'b';
  let best: { square: Square; piece: PieceSymbol } | null = null;
  for (const sq of c.board().flat()) {
    if (!sq || sq.color === mc) continue;
    if (sq.type === 'k') continue; // a check is reported separately
    if (c.attackers(sq.square, mc).includes(from)) {
      if (!best || (REVIEW_PIECE_VALUE[sq.type] ?? 0) > (REVIEW_PIECE_VALUE[best.piece] ?? 0)) {
        best = { square: sq.square, piece: sq.type };
      }
    }
  }
  return best;
}

/**
 * describeMoveGeometry — a grounded one-phrase description of what a SINGLE
 * move DOES on the board (David 2026-06-28: "ground the tactics trainers with
 * the new tools"). Detects, in salience order: FORK (hits 2+ enemy pieces),
 * PIN (slider pins a piece to a bigger one), CHECK, MATERIAL win (a capture
 * that holds by SEE), or a single ATTACK (tempo). Pure board geometry — the
 * tactics trainers speak THIS instead of generic "the setup's in" templates.
 * Returns null when the move makes no concrete threat (stay silent, G3).
 */
export function describeMoveGeometry(
  fenBefore: string,
  san: string,
  moverColor: 'white' | 'black',
): string | null {
  let c: Chess;
  let mv;
  try {
    c = new Chess(fenBefore);
    mv = c.move(san);
  } catch {
    return null;
  }
  if (!mv) return null;
  const to = mv.to;
  const mc = moverColor === 'white' ? 'w' : 'b';

  // CHECKMATE outranks everything — a coach must say mate, not "gives check"
  // (hand-audit 2026-07-10: Ra8# was reported as "gives check"). Board truth.
  if (c.isCheckmate()) return 'delivers checkmate';

  // Every enemy piece the moved piece now attacks (king included).
  const targets: { square: Square; piece: PieceSymbol }[] = [];
  for (const sq of c.board().flat()) {
    if (!sq || sq.color === mc) continue;
    if (c.attackers(sq.square, mc).includes(to)) targets.push({ square: sq.square, piece: sq.type });
  }

  // LANDING SAFETY — a fork or a pin only "counts" if the opponent can't just
  // CAPTURE the piece that made it (David 2026-07-20: "Qxd8+ … not technically a
  // fork, the bishop was defended" — the queen simply gets recaptured, so it
  // neither forks nor pins). Static-exchange: if grabbing the piece on `to` wins
  // material for the opponent, the tactic is illusory. Board truth over label.
  const landingSafe = seeGain(c, to) <= 0;

  // FORK — the moved piece hits two enemy pieces at once (royal fork when the
  // king is one of them), AND survives on its square.
  if (targets.length >= 2 && landingSafe) {
    const enemyWB: 'w' | 'b' = mc === 'w' ? 'b' : 'w';
    // A "fork" only wins when it forces a real concession: the king is one of
    // the targets (a royal fork — the king MUST move, the other is threatened),
    // OR at least one target is UNDEFENDED (falls next). Forking two defended
    // pawns wins nothing — don't call it a fork (board-awareness sweep,
    // 2026-07-22).
    const realWin = targets.some((t) => t.piece === 'k'
      || c.attackers(t.square, enemyWB).length === 0);
    if (realWin) {
      const sorted = [...targets].sort((a, b) => (REVIEW_PIECE_VALUE[b.piece] ?? 0) - (REVIEW_PIECE_VALUE[a.piece] ?? 0));
      return `forks the ${REVIEW_PIECE_NAME[sorted[0].piece]} on ${sorted[0].square} and the ${REVIEW_PIECE_NAME[sorted[1].piece]} on ${sorted[1].square}`;
    }
  }

  // PIN — a real pin held by a piece that isn't itself hanging.
  if (landingSafe && (mv.piece === 'b' || mv.piece === 'r' || mv.piece === 'q')) {
    const pin = findPinFrom(c, to, mv.piece, moverColor);
    if (pin) return `pins the ${REVIEW_PIECE_NAME[pin.pinnedPiece]} on ${pin.pinned} to the ${REVIEW_PIECE_NAME[pin.rearPiece]} on ${pin.rear}`;
  }

  // CHECK.
  if (c.inCheck()) return 'gives check';

  // MATERIAL — a capture the opponent can't profitably recapture AND can't
  // refute with an immediate counter-tactic elsewhere (the Berlin "wins the
  // pawn while the recapture forks" class — the same guard its sibling clauses
  // at :677/:3336 already carry; board-awareness sweep 2026-07-22).
  if (mv.captured && seeGain(c, to) <= 0
    && !captureHasCounterTactic(fenBefore, mv.san, mc === 'w' ? 'b' : 'w', REVIEW_PIECE_VALUE[mv.captured] ?? 0)) {
    return `wins the ${REVIEW_PIECE_NAME[mv.captured]} on ${to}`;
  }

  // Single ATTACK (tempo) on a non-king piece.
  if (targets.length === 1 && targets[0].piece !== 'k') {
    return `attacks the ${REVIEW_PIECE_NAME[targets[0].piece]} on ${targets[0].square}`;
  }

  return null;
}

const CENTRAL_SQUARES: ReadonlyArray<string> = ['d4', 'd5', 'e4', 'e5', 'c4', 'c5', 'f4', 'f5'];

/** True when NO enemy pawn can ever advance to attack `sq` — the classic
 *  outpost test. For a white piece on (file, rank) the attacking squares are
 *  (file±1, rank+1); a black pawn reaches them from any higher rank on those
 *  files. So it's an outpost iff neither adjacent file carries an enemy pawn
 *  that could still push to the attacking rank. Pure chess.js board read. */
function isOutpostSquare(board: Chess, sq: string, moverColor: 'white' | 'black'): boolean {
  const file = sq.charCodeAt(0); // 'a'..'h'
  const rank = parseInt(sq[1], 10);
  const enemy = moverColor === 'white' ? 'b' : 'w';
  const attackRank = moverColor === 'white' ? rank + 1 : rank - 1;
  if (attackRank < 1 || attackRank > 8) return false;
  for (const df of [-1, 1]) {
    const f = file + df;
    if (f < 97 || f > 104) continue; // off-board file
    const adjFile = String.fromCharCode(f);
    for (let r = 1; r <= 8; r += 1) {
      const p = board.get(`${adjFile}${r}` as Square);
      if (!p || p.type !== 'p' || p.color !== enemy) continue;
      // Can this enemy pawn ever reach (adjFile, attackRank)? White pawns move
      // up (increasing rank), black down. Enemy = the side NOT moverColor.
      const canReach = enemy === 'w' ? r <= attackRank : r >= attackRank;
      if (canReach) return false;
    }
  }
  return true;
}

/**
 * quietPurposePhrase — the POSITIONAL merit of a NON-forcing move, as a
 * sub-clause ("develops the bishop to c4, eyeing d5 and e6", "plants a knight
 * on the d5 outpost…", "stakes out the centre with the pawn to e4"). Pure
 * chess.js board truth (G3): an outpost the piece can't be chased off, the
 * central squares a developed piece now eyes, a central pawn advance. Returns
 * null when the move has no concrete positional point worth naming — silence >
 * generic filler ("brings the knight to e2" says nothing). Used to explain WHY
 * a quiet best move is best, and to voice a strong/brilliant move the engine
 * liked, without ever inventing a reason.
 */
export function quietPurposePhrase(
  fenBefore: string,
  san: string,
  moverColor: 'white' | 'black',
): string | null {
  try {
    const b = new Chess(fenBefore);
    const mv = b.move(san);
    if (!mv) return null;
    const mc = moverColor === 'white' ? 'w' : 'b';
    // SAFETY (recapture-safety, mirrors explainBestMoveGrounded): never praise a
    // piece that HANGS on its landing square. If the opponent can win material
    // there by SEE, the move isn't a positional gain — stay silent (a rook that
    // "develops eyeing the centre" but drops to a queen is not a merit).
    if (seeGain(b, mv.to) > 0) return null;
    // Outpost — a minor piece planted where no enemy pawn can ever attack it.
    if ((mv.piece === 'n' || mv.piece === 'b') && isOutpostSquare(b, mv.to, moverColor)) {
      const rank = parseInt(mv.to[1], 10);
      const advanced = moverColor === 'white' ? rank >= 5 : rank <= 4;
      if (advanced) {
        return `plants a ${REVIEW_PIECE_NAME[mv.piece]} on the ${mv.to} outpost, where no enemy pawn covers it`;
      }
    }
    // Central pawn advance — real space; a wing pawn shuffle is not worth naming.
    if (mv.piece === 'p') {
      return CENTRAL_SQUARES.includes(mv.to)
        ? `stakes out the centre with the pawn to ${mv.to}`
        : null;
    }
    // A developed piece that now eyes central squares.
    const eyes = CENTRAL_SQUARES.filter((s) => {
      try { return b.attackers(s as Square, mc).includes(mv.to); } catch { return false; }
    });
    if (eyes.length > 0) {
      // A KING never "develops" — development is about bringing pieces off the
      // back rank into the game, which is the one thing a king is not doing.
      // Marching it toward the centre is ACTIVATION, and it is an endgame idea
      // (narration rule #1: say the thing that is actually true of the board).
      // Without this the mistake narration produced "It develops the king to
      // g5" on a bare K+N endgame — David's logged Kg3 puzzle.
      if (mv.piece === 'k') {
        return `brings the king to ${mv.to}, where it covers ${eyes.slice(0, 2).join(' and ')}`;
      }
      // DEVELOPMENT means coming off the back rank. A piece already in play
      // that merely improves is being REPOSITIONED, and calling that
      // "developing" is false on the board — the queen on a4 swinging to b5 was
      // narrated as "develops the queen to b5". Same class as the king fix
      // above: say what the move actually is.
      const homeRank = mc === 'w' ? '1' : '8';
      const verb = mv.from[1] === homeRank ? 'develops' : 'repositions';
      return `${verb} the ${REVIEW_PIECE_NAME[mv.piece]} to ${mv.to}, eyeing ${eyes.slice(0, 2).join(' and ')}`;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * describeMoveMerit — the strongest grounded reason a move the student ACTUALLY
 * PLAYED was good, as a sub-clause: the concrete geometry it created
 * (fork/pin/check/material/attack) or, failing that, its quiet positional
 * purpose (outpost / central development). Pure board truth (G3) — returns null
 * when nothing concrete is provable so the caller stays silent instead of
 * praising with filler ("Strong, accurate move"). This is the WHY behind a
 * great/brilliant move in post-game review (David 2026-07-10: "WHY WHY WHY").
 */
export function describeMoveMerit(
  fenBefore: string,
  san: string,
  moverColor: 'white' | 'black',
): string | null {
  const geo = describeMoveGeometry(fenBefore, san, moverColor);
  // STRONG, unambiguous geometry is the point — fork / real pin / check / mate /
  // a winning capture. Say it.
  if (geo && !geo.startsWith('attacks') && !geo.startsWith('pins the pawn')) return geo;
  // A bare tempo-attack ("attacks the pawn on e5" for a developing knight, where
  // the pawn is defended) or a pawn-to-piece x-ray "pin" is technically true but
  // shallow — for a quiet developing move the real teaching point is the
  // development + the centre. Prefer that when there is one; fall back to the
  // weak read only if there's no positional point to name.
  return quietPurposePhrase(fenBefore, san, moverColor) ?? geo;
}

/**
 * describeSacrifice — names a move that gives NET material as a sacrifice
 * ("sacrifices the knight on d5"). Pure board truth (G3): the mover captures
 * `capturedVal`, the opponent wins back `seeGain` on the landing square, and the
 * move is a sacrifice only when the opponent's take exceeds what was captured
 * (net material handed over) — so an even recapture/trade is NEVER called a sac.
 *
 * Soundness is NOT decided here — a hang and a brilliant decoy sac look
 * identical on this one ply; the DIFFERENCE is the follow-up, which lives in the
 * classification (brilliant/great = the engine sees the compensation) or the
 * eval. Callers gate on that: the review names a sacrifice only on a move the
 * engine already judged strong (David 2026-07-10: a deflection sac hangs a piece
 * ON PURPOSE — don't silence its WHY, and don't lie and call it development).
 */
export function describeSacrifice(
  fenBefore: string,
  san: string,
): string | null {
  try {
    const b = new Chess(fenBefore);
    const mv = b.move(san);
    if (!mv) return null;
    const capturedVal = mv.captured ? (REVIEW_PIECE_VALUE[mv.captured] ?? 0) : 0;
    const opponentWins = seeGain(b, mv.to); // material the opponent wins back on `to`
    // Net material handed over. ≥ 2 (a minor piece's worth) so a 1-pawn poke
    // isn't dressed up as a "sacrifice".
    if (opponentWins - capturedVal >= 2) {
      return `sacrifices the ${REVIEW_PIECE_NAME[mv.piece]} on ${mv.to}`;
    }
    return null;
  } catch {
    return null;
  }
}

function lowerFirst(s: string): string {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}
function upperFirst(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export interface MovePurpose extends GroundedAnswer {
  /** The purpose broken into ORDERED clauses, most-important-first, so the
   *  caller can voice the top-N by the student's verbosity (full = all,
   *  brief = 1-2, silent = none). `facts` is the chosen clauses joined. */
  clauses: string[];
}

/**
 * assembleMovePurpose — the RICH, multi-clause "the ENTIRE purpose of this move"
 * fact bundle for the teaching voice (David 2026-07-09: "Naroditsky explains the
 * entire purpose behind a move — we can account for that with deterministic data
 * can't we?"). YES: every clause here is computed from the board + engine, never
 * invented (G0):
 *   1. WHAT IT DOES   — concrete geometry (fork/pin/check/wins/attacks) or, for a
 *                       quiet move, the development + the central squares it eyes.
 *   2. OUTPOST        — a minor piece on a square no enemy pawn can ever attack.
 *   3. THE POINT      — the threat/opportunity it creates (from detectTactics).
 *   4. THE PLAN       — the mover's follow-up in the engine PV.
 *   5. THE ASSESSMENT — the eval, in words, from the student's POV.
 * The clauses are ordered so the caller slices the top-N by verbosity. voiceFacts
 * then phrases the bundle in the house teaching voice. Returns null only when the
 * move is illegal (otherwise clause 1 is always available).
 */
export function assembleMovePurpose(opts: {
  fenBefore: string;
  san: string;
  moverColor: 'white' | 'black';
  /** Engine PV in SAN from the position AFTER the move (index 0 = the opponent's
   *  reply, index 1 = the mover's follow-up). */
  pvSan?: ReadonlyArray<string>;
  /** White-perspective eval AFTER the move. */
  evalCp?: number | null;
  mateIn?: number | null;
  /** detectTactics on the position AFTER the move (opportunities = the mover's). */
  tactics?: TacticsLiveContext | null;
  studentSide?: 'white' | 'black';
  /** Verbosity cap on the number of clauses (full = undefined/all, brief = 2). */
  maxClauses?: number;
}): MovePurpose | null {
  let before: Chess;
  let mv;
  try {
    before = new Chess(opts.fenBefore);
    mv = before.move(opts.san);
  } catch {
    return null;
  }
  if (!mv) return null;
  const afterBoard = before; // `before` now reflects the position AFTER the move
  const clauses: string[] = [];
  const pieceName = REVIEW_PIECE_NAME[mv.piece];

  // 1) WHAT IT DOES.
  const geo = describeMoveGeometry(opts.fenBefore, opts.san, opts.moverColor);
  if (geo) {
    clauses.push(`The ${pieceName} ${geo}.`);
  } else if (mv.piece === 'p') {
    // "staking out space in the center" is FALSE for a wing pawn (h4, a3, g3…).
    // Only a genuinely central destination earns the centre claim; otherwise
    // speak the space-grab plainly (board-awareness sweep, 2026-07-22).
    const central = CENTRAL_SQUARES.includes(mv.to) || 'cdef'.includes(mv.to[0]);
    clauses.push(central
      ? `The pawn goes to ${mv.to}, staking out space in the center.`
      : `The pawn advances to ${mv.to}, grabbing space on the ${'abc'.includes(mv.to[0]) ? 'queenside' : 'kingside'}.`);
  } else {
    const mc = opts.moverColor === 'white' ? 'w' : 'b';
    const eyes = CENTRAL_SQUARES.filter((s) => {
      try {
        return afterBoard.attackers(s as Square, mc).includes(mv.to);
      } catch {
        return false;
      }
    });
    if (eyes.length > 0) {
      clauses.push(`The ${pieceName} develops to ${mv.to}, eyeing ${eyes.slice(0, 2).join(' and ')}.`);
    } else {
      clauses.push(`The ${pieceName} develops to ${mv.to}.`);
    }
  }

  // 2) OUTPOST — a minor piece planted where no pawn can chase it.
  if ((mv.piece === 'n' || mv.piece === 'b') && isOutpostSquare(afterBoard, mv.to, opts.moverColor)) {
    const rank = parseInt(mv.to[1], 10);
    const advanced = opts.moverColor === 'white' ? rank >= 5 : rank <= 4;
    if (advanced) clauses.push(`It's an outpost on ${mv.to} — no enemy pawn covers the square, so it sits there unchallenged.`);
  }

  // 3) THE POINT — the threat/opportunity the move creates (computed tactics).
  const point = opts.tactics?.opportunities?.[0] ?? opts.tactics?.immediate?.[0];
  if (point?.description) clauses.push(`The point: ${lowerFirst(point.description)}.`);

  // 4) THE PLAN — the mover's follow-up in the engine PV (index 1; index 0 is
  //    the opponent's reply).
  const followUp = opts.pvSan?.[1];
  if (followUp) clauses.push(`The plan is to follow with ${followUp}.`);

  // 5) THE ASSESSMENT — eval in words, student POV.
  const ss = opts.studentSide ?? opts.moverColor;
  const studentEvalCp = opts.evalCp == null ? null : (ss === 'white' ? opts.evalCp : -opts.evalCp);
  const studentMate = opts.mateIn == null ? null : (ss === 'white' ? opts.mateIn : -opts.mateIn);
  const ev = evalPhrase(studentEvalCp, studentMate, ss);
  if (ev) clauses.push(`${upperFirst(ev)}.`);

  if (clauses.length === 0) return null;
  const chosen = typeof opts.maxClauses === 'number' ? clauses.slice(0, Math.max(1, opts.maxClauses)) : clauses;
  return {
    facts: chosen.join(' '),
    clauses,
    bestMoveSan: mv.san,
    bestMoveFromTo: { from: mv.from, to: mv.to },
    sources: ['board:chess.js', 'engine:stockfish'],
  };
}

/**
 * assembleEngineReasoning — "why does the engine like this move?" / "walk me
 * through Stockfish's line" (David 2026-07-10: "get the coach deciphering why
 * Stockfish likes a move… coach is master of all now"). The engine's REASONING
 * IS its principal variation: we WALK the PV and name what each of the engine's
 * moves achieves, ending on the eval verdict. Every clause is computed from the
 * board (`describeMoveGeometry`) + the engine (PV + eval) — the LLM decides
 * nothing (G0). Unlike `assembleMoveEvalAnswer` (names the move + eval only)
 * this explains the WHY; unlike `assembleMovePurpose` (the purpose of a move the
 * student just PLAYED, one follow-up) this walks the forced line move-by-move so
 * the student sees the engine's proof, not just its verdict.
 *
 * `pvSan` is the PV from the CURRENT position: index 0 = the engine's move,
 * 1 = the opponent's reply, 2 = the engine's follow-up, 3 = reply, … Returns
 * null on an illegal/empty PV (empty > generic > invented); degrades to just the
 * best move's geometry + eval when the PV is a single move.
 */
export function assembleEngineReasoning(opts: {
  fenBefore: string;
  pvSan: ReadonlyArray<string>;
  /** Side to move in `fenBefore` — whose move the engine's line begins with. */
  moverColor: 'white' | 'black';
  /** White-perspective eval at the end of the line (LiveState convention). */
  evalCp?: number | null;
  mateIn?: number | null;
  studentSide?: 'white' | 'black';
  /** How many of the ENGINE's follow-up moves to narrate past the first (default
   *  2 — a real walk without a wall of text). */
  maxFollowUps?: number;
}): GroundedAnswer | null {
  if (!opts.pvSan || opts.pvSan.length === 0) return null;
  const mc: 'w' | 'b' = opts.moverColor === 'white' ? 'w' : 'b';

  // Advance a board through the PV, snapshotting the FEN BEFORE each ply so the
  // geometry of each move is computed from the right position.
  let board: Chess;
  try {
    board = new Chess(opts.fenBefore);
  } catch {
    return null;
  }
  interface Ply { san: string; fenBefore: string; isMover: boolean; }
  const plies: Ply[] = [];
  for (let i = 0; i < opts.pvSan.length; i += 1) {
    const fenBeforePly = board.fen();
    let mv;
    try {
      mv = board.move(opts.pvSan[i]);
    } catch {
      break; // PV move illegal from here — stop the line cleanly.
    }
    if (!mv) break;
    plies.push({ san: mv.san, fenBefore: fenBeforePly, isMover: mv.color === mc });
  }
  if (plies.length === 0 || !plies[0].isMover) return null;

  const clauses: string[] = [];

  // 1) THE ENGINE'S MOVE — what it does on the board.
  const firstGeo = describeMoveGeometry(plies[0].fenBefore, plies[0].san, opts.moverColor);
  clauses.push(
    firstGeo
      ? `The engine plays ${plies[0].san} — it ${firstGeo}.`
      : `The engine plays ${plies[0].san}.`,
  );

  // 2..N) WALK THE LINE — each subsequent ENGINE move, framed by the opponent's
  //   reply that precedes it ("if <reply>, then <engine move> <geometry>").
  const maxFollow = Math.max(0, opts.maxFollowUps ?? 2);
  let narrated = 0;
  for (let i = 1; i < plies.length && narrated < maxFollow; i += 1) {
    if (!plies[i].isMover) continue; // opponent ply — used only as setup below
    const reply = plies[i - 1]; // the opponent's move immediately before
    const geo = describeMoveGeometry(plies[i].fenBefore, plies[i].san, opts.moverColor);
    if (reply && !reply.isMover) {
      clauses.push(
        geo
          ? `If ${reply.san}, then ${plies[i].san} — it ${geo}.`
          : `If ${reply.san}, then ${plies[i].san}.`,
      );
    } else if (geo) {
      clauses.push(`Then ${plies[i].san} — it ${geo}.`);
    }
    narrated += 1;
  }

  // Final) THE VERDICT — the eval from the student's POV.
  const ss = opts.studentSide ?? opts.moverColor;
  const studentEvalCp = opts.evalCp == null ? null : (ss === 'white' ? opts.evalCp : -opts.evalCp);
  const studentMate = opts.mateIn == null ? null : (ss === 'white' ? opts.mateIn : -opts.mateIn);
  const ev = evalPhrase(studentEvalCp, studentMate, ss);
  if (ev) clauses.push(`${cap(ev)}.`);

  const first = plies[0];
  let fromTo: { from: string; to: string } | null = null;
  try {
    const probe = new Chess(opts.fenBefore);
    const mv = probe.move(first.san);
    if (mv) fromTo = { from: mv.from, to: mv.to };
  } catch { /* arrow optional */ }

  return {
    facts: clauses.join(' '),
    bestMoveSan: first.san,
    bestMoveFromTo: fromTo,
    sources: ['board:chess.js', 'engine:stockfish'],
  };
}

export interface MoveOrderExplanation {
  /** Grounded prose: why the better order is stronger (+ the cost of the wrong
   *  order when a refutation is supplied). */
  text: string;
  /** Mechanism behind the better move, for telemetry / board-demo selection. */
  mechanism: 'check' | 'pin' | 'tempo' | 'material';
}

/**
 * explainMoveOrder — the grounded "why THIS move first" comparator (David
 * 2026-06-27: "WHY moving my bishop out before bringing the queen to the
 * attack was best — do we have the geometry?"). Same pieces, different order;
 * one order is stronger because the better move makes a threat the wrong order
 * squanders. Names the MECHANISM purely from the board: it comes with CHECK,
 * it PINS an enemy piece to a bigger one, it develops with a TEMPO (attacks an
 * enemy piece), or it wins MATERIAL (SEE). The engine's eval delta (computed
 * by the caller) is what decides the order is better; this names WHY. When a
 * refutation to the worse move is supplied, the cost of the wrong order is
 * spelled out too. Returns null when a move is illegal or no concrete
 * mechanism is found — empty > generic > invented (G3).
 */
export function explainMoveOrder(opts: {
  fenBefore: string;
  betterSan: string;
  worseSan: string;
  moverColor: 'white' | 'black';
  /** Opponent's best reply to the WORSE move (engine PV ply 1), if known. */
  worseRefutationSan?: string | null;
}): MoveOrderExplanation | null {
  const { fenBefore, betterSan, worseSan, moverColor, worseRefutationSan } = opts;
  const mc = moverColor === 'white' ? 'w' : 'b';

  let mv;
  const c = new Chess(fenBefore);
  try {
    mv = c.move(betterSan);
  } catch {
    return null;
  }
  if (!mv) return null;
  // The worse move must also be legal from the SAME position (it's an
  // alternative order, not a fantasy) — verify on a fresh board.
  try {
    const probe = new Chess(fenBefore);
    if (!probe.move(worseSan)) return null;
  } catch {
    return null;
  }

  const to = mv.to;
  let mechanism: MoveOrderExplanation['mechanism'];
  let whyBetter: string;

  if (c.inCheck()) {
    mechanism = 'check';
    whyBetter = `playing ${betterSan} first comes with check, forcing the reply`;
  } else {
    const pin = (mv.piece === 'b' || mv.piece === 'r' || mv.piece === 'q')
      ? findPinFrom(c, to, mv.piece, moverColor)
      : null;
    if (pin) {
      mechanism = 'pin';
      whyBetter = `playing ${betterSan} first pins the ${REVIEW_PIECE_NAME[pin.pinnedPiece]} on ${pin.pinned} to the ${REVIEW_PIECE_NAME[pin.rearPiece]} on ${pin.rear}`;
    } else {
      const captured = mv.captured;
      // seeGain(c, to) = what the OPPONENT wins back by recapturing on `to`.
      // A genuine material win means they can't recapture profitably (≤ 0).
      const oppRecapGain = captured ? seeGain(c, to) : 1;
      const attack = bestAttackFrom(c, to, moverColor);
      if (captured && oppRecapGain <= 0) {
        mechanism = 'material';
        whyBetter = `playing ${betterSan} first wins the ${REVIEW_PIECE_NAME[captured]} on ${to}`;
      } else if (attack) {
        mechanism = 'tempo';
        whyBetter = `playing ${betterSan} first develops with a threat — it attacks the ${REVIEW_PIECE_NAME[attack.piece]} on ${attack.square}, so the opponent must respond instead of freeing their game`;
      } else {
        return null; // no concrete geometry — stay silent
      }
    }
  }

  // Cost of the wrong order, when the engine gave us the refutation.
  let cost: string | null = null;
  if (worseRefutationSan) {
    try {
      const w = new Chess(fenBefore);
      if (w.move(worseSan)) {
        const reply = w.move(worseRefutationSan);
        if (reply) {
          const opp = mc === 'w' ? 'Black' : 'White';
          if (w.inCheck()) {
            cost = `play ${worseSan} first and ${opp} hits back with ${worseRefutationSan}, check`;
          } else if (reply.captured) {
            cost = `play ${worseSan} first and ${opp} gets ${worseRefutationSan}, taking the ${REVIEW_PIECE_NAME[reply.captured]}`;
          } else {
            cost = `play ${worseSan} first and ${opp} equalizes with ${worseRefutationSan}`;
          }
        }
      }
    } catch { /* refutation didn't replay — drop the cost clause */ }
  }

  return { text: cost ? `${cap(whyBetter)}; ${cost}.` : `${cap(whyBetter)}.`, mechanism };
}

/**
 * assemblePlanAnswer — Phase 3 of the grounding inversion: plan / strategy
 * questions ("what's my plan?", "next three moves?"). The fact source is the
 * ENGINE's principal variation (`enginePlan.pvSan`, computed by Stockfish) —
 * real, legal, verified moves, NOT the LLM free-synthesizing a plan. This
 * replays the PV on the board (chess.js is the truth), extracts the student's
 * moves (the plan) + the opponent's expected replies, and packages them for
 * the voiceFacts chokepoint. The plan is built only when the student is to
 * move, so PV[0] is the student's move (even plies = student). Returns null
 * when the PV is empty or doesn't replay legally (never voices a bad line).
 */
export function assemblePlanAnswer(opts: {
  fen: string;
  pvSan: ReadonlyArray<string>;
  /** White-perspective centipawn eval of the line; null when forced mate. */
  evalCp: number | null;
  /** Mate distance in plies (signed, white-positive); null when not forced. */
  mateIn: number | null;
  studentSide: 'white' | 'black';
}): GroundedAnswer | null {
  if (!opts.pvSan || opts.pvSan.length === 0) return null;
  let chess: Chess;
  try {
    chess = new Chess(opts.fen);
  } catch {
    return null;
  }
  const moves: Array<{ san: string; from: string; to: string; isStudent: boolean }> = [];
  for (let i = 0; i < opts.pvSan.length; i += 1) {
    let mv;
    try {
      mv = chess.move(opts.pvSan[i]);
    } catch {
      break; // PV diverged from legality — stop at the last legal ply.
    }
    if (!mv) break;
    moves.push({ san: mv.san, from: mv.from, to: mv.to, isStudent: i % 2 === 0 });
  }
  if (moves.length === 0) return null;

  const studentMoves = moves.filter((m) => m.isStudent).map((m) => m.san);
  const firstReply = moves.find((m) => !m.isStudent)?.san ?? null;

  const parts: string[] = [];
  if (studentMoves.length === 1) {
    parts.push(`Your plan starts with ${studentMoves[0]}.`);
  } else {
    parts.push(`Your plan: ${studentMoves[0]}`);
    const rest = studentMoves.slice(1);
    parts[parts.length - 1] += `, then ${rest.join(', then ')}.`;
  }
  if (firstReply) parts.push(`The opponent's most likely reply is ${firstReply}.`);

  // PV eval is white-perspective; convert to the student's POV for the phrase.
  const studentEvalCp = opts.evalCp == null ? null : (opts.studentSide === 'white' ? opts.evalCp : -opts.evalCp);
  const studentMateIn = opts.mateIn == null ? null : (opts.studentSide === 'white' ? opts.mateIn : -opts.mateIn);
  const evalText = evalPhrase(studentEvalCp, studentMateIn, opts.studentSide);
  if (evalText) parts.push(`${evalText.charAt(0).toUpperCase()}${evalText.slice(1)}.`);

  const first = moves[0];
  return {
    facts: parts.join(' '),
    bestMoveSan: first.san,
    bestMoveFromTo: { from: first.from, to: first.to },
    sources: ['engine:stockfish', 'board:chess.js'],
  };
}

/**
 * assembleTacticsAnswer — Phase 2 of the grounding inversion: tactics / danger
 * questions ("is anything hanging?", "what's the threat?", "is there a fork?").
 * The `liveTacticsContext` engine has ALREADY computed everything — the fork
 * descriptions, the hanging pieces, the mate-in-one — deterministically from
 * the FEN. So this just SELECTS the relevant facts and packages them for the
 * voiceFacts chokepoint. The LLM decides nothing; it voices these descriptions.
 * Returns null when there's no concrete tactic (caller takes the one fallback).
 */
export function assembleTacticsAnswer(
  tactics: TacticsLiveContext,
  studentColor: 'white' | 'black',
): GroundedAnswer | null {
  const sc: 'w' | 'b' = studentColor === 'white' ? 'w' : 'b';
  const parts: string[] = [];

  // Most urgent: a forced mate-in-one for the side to move.
  if (tactics.boardFacts?.mateInOne) {
    parts.push(`There is checkmate in one: ${tactics.boardFacts.mateInOne}.`);
  }
  // Immediate tactics on the board now — voice the engine's own descriptions.
  for (const t of tactics.immediate.slice(0, 2)) {
    if (t.description) parts.push(`${t.description}.`);
  }
  // The STUDENT's pieces left hanging — warn concretely.
  for (const h of tactics.hanging.filter((p) => p.color === sc).slice(0, 2)) {
    parts.push(`Your ${REVIEW_PIECE_NAME[h.piece] ?? h.piece} on ${h.square} is hanging.`);
  }
  // Nothing concrete yet → surface the top threat, then the top opportunity.
  if (parts.length === 0 && tactics.threats[0]?.description) {
    parts.push(`Watch out — ${tactics.threats[0].description}.`);
  }
  if (parts.length === 0 && tactics.opportunities[0]?.description) {
    parts.push(`You have a shot: ${tactics.opportunities[0].description}.`);
  }

  if (parts.length === 0) return null;
  return {
    facts: parts.join(' '),
    bestMoveSan: null,
    bestMoveFromTo: null,
    sources: ['engine:stockfish', 'board:chess.js'],
  };
}

/**
 * assembleMasterPlayAnswer — Phase 4 of the grounding inversion: "how do
 * masters play this?" / "what's the most popular move?". The master-play
 * lookup (`masterPlayLookup`, the Lichess explorer / local DB) has ALREADY
 * computed the top moves with their game counts + White/draw/Black splits.
 * This SELECTS the top few and packages them for the voiceFacts chokepoint —
 * the LLM voices the real frequencies, it never invents "masters play X 55%".
 * Returns null when there's no master data (caller falls through).
 */
export function assembleMasterPlayAnswer(current: MasterPlayResult): GroundedAnswer | null {
  if (current.source === 'none' || current.moves.length === 0) return null;
  const fmt = (n: number): string => n.toLocaleString('en-US');
  const top = current.moves.slice(0, 3);
  const lead = top[0];
  const leadWhite = Math.round(lead.whitePct * 100);
  const leadDraw = Math.round(lead.drawPct * 100);
  const leadBlack = Math.round(lead.blackPct * 100);
  // The LOCAL masters DB carries no per-move W/D/L splits — every pct is 0
  // and the old phrasing spoke "White wins 0%, draws 0%, Black wins 0%" on
  // 1.3M games (proof run proof-msrqv0s8). Unknown splits are OMITTED, never
  // manufactured (G0: only computed facts get voiced).
  const hasSplits = leadWhite + leadDraw + leadBlack > 0;
  const parts: string[] = [
    `The most popular master move here is ${lead.san}, played in ${fmt(lead.games)} game${lead.games === 1 ? '' : 's'}` +
      (hasSplits ? ` (White wins ${leadWhite}%, draws ${leadDraw}%, Black wins ${leadBlack}%).` : `.`),
  ];
  const others = top.slice(1);
  if (others.length > 0) {
    parts.push(`Masters also play ${others.map((m) => `${m.san} (${fmt(m.games)} games)`).join(' and ')}.`);
  }

  let fromTo: { from: string; to: string } | null = null;
  if (lead.uci && lead.uci.length >= 4) {
    fromTo = { from: lead.uci.slice(0, 2), to: lead.uci.slice(2, 4) };
  }

  return {
    facts: parts.join(' '),
    bestMoveSan: lead.san,
    bestMoveFromTo: fromTo,
    sources: ['master-games:lichess'],
  };
}

/** Did the pro (playing `studentSide`) WIN this game? Lenient on the result
 *  string shape ("1-0" / "0-1" / "win" / "1/2-1/2"). */
function proWonGame(result: string, studentSide: 'white' | 'black'): boolean {
  const r = result.trim().toLowerCase();
  if (r.includes('1/2') || r === 'draw' || r === '=') return false;
  if (studentSide === 'white') return r.startsWith('1-0') || r === 'win' || r === '1';
  return r.startsWith('0-1') || r === 'win' || r === '0';
}

/**
 * assemblePlayerGamesAnswer — Phase 4 (pro-game references): "how does <pro>
 * play this?" / "show me <pro>'s games here". The fact source is the player's
 * REAL game corpus (`pro-game-references.json` → `LivePlayerGamesContext`,
 * already loaded into liveState by coachService), NOT the LLM. This voices the
 * real count + a standout game (highest-rated-opponent win, else the
 * highest-rated game) — opponent, rating, result, the named variation — all
 * board-true from the reference. Returns null when there are no games (caller
 * falls through). The LLM never invents a "<pro> plays X" game.
 */
export function assemblePlayerGamesAnswer(ctx: LivePlayerGamesContext): GroundedAnswer | null {
  if (!ctx.games || ctx.games.length === 0) {
    // Honest empty for a NAMED player we simply don't have games for in this
    // line — never invent, never show a different pro's games (David 2026-07-10:
    // "how does GothamChess play this line" couldn't be answered).
    if (ctx.requestedPlayerName) {
      return {
        facts: `I don't have any of ${ctx.requestedPlayerName}'s games in the ${ctx.openingName} in our data.`,
        bestMoveSan: null,
        bestMoveFromTo: null,
        sources: [`player-games:${ctx.playerId ?? 'pro'}`],
      };
    }
    return null;
  }
  const player = ctx.games[0].player;
  // Prefer a win over the strongest opponent; else just the strongest opponent.
  const ranked = [...ctx.games].sort((a, b) => (b.opponentRating ?? 0) - (a.opponentRating ?? 0));
  const standout = ranked.find((g) => proWonGame(g.result, g.studentSide)) ?? ranked[0];

  const total = ctx.totalAvailable || ctx.games.length;
  const parts: string[] = [
    `${player} has ${total} reference game${total === 1 ? '' : 's'} in the ${ctx.openingName}.`,
  ];
  const won = proWonGame(standout.result, standout.studentSide);
  const oppRating = standout.opponentRating ? ` (${standout.opponentRating})` : '';
  const variation = standout.variationLabel ? ` in the ${standout.variationLabel}` : '';
  if (won) {
    parts.push(`In a standout, ${player} beat ${standout.opponent}${oppRating}${variation}.`);
  } else {
    parts.push(`One notable game was against ${standout.opponent}${oppRating}${variation}.`);
  }

  return {
    facts: parts.join(' '),
    bestMoveSan: null,
    bestMoveFromTo: null,
    sources: [`player-games:${ctx.playerId ?? 'pro'}`],
  };
}

/**
 * assembleEndgameAnswer — Phase 5 (endgame): "can I win this?" / "is this a
 * draw?" / "how do I hold this ending?". The fact source is the SYZYGY
 * TABLEBASE (`lookupTablebase` via the `/api/lichess-tablebase` proxy) — literal
 * mathematical truth for ≤7-piece endings, the strongest grounding there is.
 * The caller does the (async) lookup; this packages the verdict from the
 * STUDENT's perspective for the voiceFacts chokepoint. Returns null on an
 * uncertain category (`maybe-*` / `unknown`) so the coach never voices a guess.
 */
export function assembleEndgameAnswer(opts: {
  result: TablebaseLookupResult;
  studentColor: 'white' | 'black';
}): GroundedAnswer | null {
  const { result, studentColor } = opts;
  if (result.checkmate) {
    return { facts: 'This position is already checkmate.', bestMoveSan: null, bestMoveFromTo: null, sources: ['tablebase:syzygy'] };
  }
  if (result.stalemate || result.insufficientMaterial || result.whiteRelativeResult === 'draw' ||
      result.category === 'cursed-win' || result.category === 'blessed-loss') {
    const why =
      result.stalemate ? ' (stalemate)' :
      result.insufficientMaterial ? ' (insufficient material)' :
      (result.category === 'cursed-win' || result.category === 'blessed-loss') ? ' under the fifty-move rule' : '';
    return { facts: `By the tablebase, this endgame is a theoretical draw${why} with best play.`, bestMoveSan: null, bestMoveFromTo: null, sources: ['tablebase:syzygy'] };
  }
  if (result.whiteRelativeResult === 'white-wins' || result.whiteRelativeResult === 'black-wins') {
    const studentWins =
      (result.whiteRelativeResult === 'white-wins' && studentColor === 'white') ||
      (result.whiteRelativeResult === 'black-wins' && studentColor === 'black');
    const mate = typeof result.dtm === 'number' ? ` — mate in ${Math.abs(result.dtm)}` : '';
    const facts = studentWins
      ? `By the tablebase, this endgame is a win for you with best play${mate}.`
      : `By the tablebase, this endgame is lost for you with best play${mate} — your goal is to make it as hard as possible.`;
    return { facts, bestMoveSan: null, bestMoveFromTo: null, sources: ['tablebase:syzygy'] };
  }
  return null; // maybe-win / maybe-loss / unknown → don't voice a guess.
}

/**
 * assembleConceptAnswer — Phase 5 (concepts): "what's a fork?", "explain
 * zwischenzug", "what does zugzwang mean?". The fact source is the injected
 * book corpus (`chess-concepts.json` — Capablanca / Lasker / Staunton / …),
 * NEVER the LLM's training memory. The caller detects the concept + looks it
 * up (chessConceptService); this packages the real book passage (or the
 * curated fallback definition) for the voiceFacts chokepoint, with the source
 * recorded. Returns null when the concept carries neither a passage nor a
 * fallback (caller falls through). Takes the first 2 sentences of the passage
 * so the voiced answer stays concise + grounded in the actual text.
 */
export function assembleConceptAnswer(concept: ConceptEntry): GroundedAnswer | null {
  const passage = concept.passages?.[0];
  let definition: string | null = null;
  let source: string | null = null;
  if (passage?.text?.trim()) {
    definition = passage.text.trim().split(/(?<=[.!?])\s+/).slice(0, 2).join(' ').trim();
    source = `book:${passage.bookSlug}`;
  } else if (concept.fallbackDefinition?.trim()) {
    definition = concept.fallbackDefinition.trim();
    source = `concept:${concept.id}`;
  }
  if (!definition || !source) return null;

  return {
    facts: `${cap(concept.name)}: ${definition}`,
    bestMoveSan: null,
    bestMoveFromTo: null,
    sources: [source],
  };
}

/**
 * assembleFundamentalsAnswer — "teach me the fundamentals / basics / basic
 * concepts", "what are pieces worth?", "opening principles". Before this lane
 * existed, a "teach me basic concepts" ask had NO handler and fell through to
 * the ungrounded LLM board-readout ("the best move is e4") — David 2026-08-26:
 * "it couldnt teach me basic fundamentals … all of this needs to be taught
 * while in the coach tab".
 *
 * G0/G3: these are the canonical, public-domain teaching principles (piece
 * values, control the centre, develop, castle) — established chess pedagogy
 * (Capablanca's *Chess Fundamentals*, Lasker), NOT a board claim and NOT LLM
 * invention. The text is authored here and voiced verbatim through voiceFacts;
 * the model only phrases it. `topic` scopes to one principle; 'general' (the
 * default) teaches the core four in one tight pass.
 */
export type FundamentalsTopic = 'piece-values' | 'development' | 'center' | 'king-safety' | 'general';

const FUNDAMENTALS: Record<Exclude<FundamentalsTopic, 'general'>, { facts: string; source: string }> = {
  'piece-values': {
    facts: 'Piece values, the currency of every trade: a pawn is worth 1, a knight and a bishop about 3 each, a rook 5, and the queen 9. The king is priceless — lose it and the game is over. Use these numbers to judge a trade: give up less than you get, and never hand over a rook for a knight without a concrete reason.',
    source: 'concept:fundamentals-piece-values',
  },
  development: {
    facts: 'Development means getting your pieces into the game. In the opening, bring your knights and bishops off the back rank toward the centre before you start an attack. Two rules keep it clean: do not move the same piece twice before the others are out, and do not bring the queen out early, where the opponent chases it and gains time. The Opera Game — Morphy in 1858 — is the textbook example: he develops with a threat on almost every move and the game plays itself.',
    source: 'concept:fundamentals-development',
  },
  center: {
    facts: 'Control the centre — the four squares e4, d4, e5, and d5. A pawn or piece in the centre reaches more of the board and cramps the opponent, while opening lines for your own pieces. That is why the first moves of almost every opening fight over these squares.',
    source: 'concept:fundamentals-center',
  },
  'king-safety': {
    facts: 'King safety comes first. Castle early to tuck the king into the corner behind a wall of pawns, and connect your rooks. A king caught in the centre while the position opens is the single most common way a game is lost — get it safe before you go hunting.',
    source: 'concept:fundamentals-king-safety',
  },
};

/** The famous game that best ILLUSTRATES a fundamental, so the chat answer can
 *  offer to walk it (the "see it in a real game" hand-off — David 2026-08-26).
 *  Only development/general point at the Opera Game today (the one game the app
 *  has real annotated data for); the others self-hide their walk offer. */
const FUNDAMENTALS_EXAMPLE_REVIEW: Partial<Record<FundamentalsTopic, string>> = {
  development: 'sample-morphy-opera-1858',
  general: 'sample-morphy-opera-1858',
};

export function assembleFundamentalsAnswer(
  topic: FundamentalsTopic,
): (GroundedAnswer & { exampleReviewId?: string }) | null {
  const exampleReviewId = FUNDAMENTALS_EXAMPLE_REVIEW[topic];
  if (topic !== 'general') {
    const entry = FUNDAMENTALS[topic];
    return { facts: entry.facts, bestMoveSan: null, bestMoveFromTo: null, sources: [entry.source], exampleReviewId };
  }
  // General "teach me the fundamentals" — the core four, most-load-bearing
  // first (king safety and the centre win more beginner games than anything).
  const facts = [
    'The fundamentals every game rests on. First, piece values: a pawn is 1, a knight or bishop about 3, a rook 5, the queen 9 — use them to judge every trade.',
    'Control the centre — e4, d4, e5, d5 — so your pieces reach more of the board.',
    'Develop: get your knights and bishops out toward the centre before attacking, and do not move one piece twice or bring the queen out early.',
    'And castle early to get your king safe behind its pawns — a king stuck in the centre is how most games are lost.',
    'Want to see it? The Opera Game shows every one of these winning a game.',
  ].join(' ');
  return {
    facts,
    bestMoveSan: null,
    bestMoveFromTo: null,
    sources: Object.values(FUNDAMENTALS).map((f) => f.source),
    exampleReviewId,
  };
}

/**
 * assembleFamousGameAnswer — "teach me the opera game", "show me Morphy's
 * games". Before this lane, "opera game" resolved to no opening → the LLM
 * free-narrated it from memory ("Morphy uses a brutal fork…") and the tactic
 * gate GUTTED the answer; "Morphy's games" fuzzy-matched a random opening
 * ("Evans Gambit, Morphy Attack") — David 2026-08-26, both LAST-priority.
 *
 * G0/G3: the facts are the app's OWN stored data (the Opera Game review sample
 * `sample-morphy-opera-1858` + the "Opera Mate" pattern) — real players, real
 * year, the real finish (Rd8#). Authored here, voiced verbatim; the model only
 * phrases. `reviewId` lets the caller offer the grounded move-by-move review.
 */
export type FamousGameKey = 'opera-game';

interface FamousGameEntry {
  facts: string;
  source: string;
  /** Review-sample id — the app teaches this game move-by-move at /coach/review/<id>. */
  reviewId: string;
}

const FAMOUS_GAMES: Record<FamousGameKey, FamousGameEntry> = {
  'opera-game': {
    // Phrased as the historical teaching it is — no live-board tactic
    // vocabulary (checkmate / back-rank / square claims), so the tactic gate,
    // which exists to catch the LLM inventing about THIS board, never touches
    // grounded history. Still accurate to the real game.
    facts:
      'The Opera Game: Paul Morphy against the Duke of Brunswick and Count Isouard, played in a private box at the Paris Opera in 1858. It is the model lesson in development — Morphy brings out a new piece with a threat on almost every move, castles his king to safety, and then gives up material to blast open the centre against a king still stuck there. The finish is the famous Opera Mate: Morphy offers his queen to pull away the last defender, and the rook swings onto the open file to end the game. The lesson is timeless — develop fast, open lines toward the enemy king, and never grab pawns while your own king sits in the middle.',
    source: 'concept:opera-game',
    reviewId: 'sample-morphy-opera-1858',
  },
};

export function assembleFamousGameAnswer(key: FamousGameKey): (GroundedAnswer & { reviewId: string }) | null {
  const entry = FAMOUS_GAMES[key];
  if (!entry) return null;
  return { facts: entry.facts, bestMoveSan: null, bestMoveFromTo: null, sources: [entry.source], reviewId: entry.reviewId };
}

/**
 * assembleProgressAnswer — Phase 6: "am I improving?" / "what should I work
 * on?". The answer is the student's OWN computed history — `detectBadHabits`
 * already analyzed their games and produced human-readable habit descriptions
 * with occurrence counts. This selects the top unresolved ones and packages
 * them for the voiceFacts chokepoint. The LLM voices the student's real data;
 * it never invents a weakness. Returns null when there's no habit data yet
 * (caller takes the one fallback — e.g. "play a few games and I'll spot
 * patterns").
 */
export function assembleProgressAnswer(badHabits: ReadonlyArray<BadHabit>): GroundedAnswer | null {
  const open = badHabits
    .filter((h) => !h.isResolved && h.description)
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 3);
  if (open.length === 0) return null;

  const phrase = (h: BadHabit): string =>
    `${h.description} (${h.occurrences} time${h.occurrences === 1 ? '' : 's'})`;
  const facts =
    open.length === 1
      ? `The pattern to work on: ${phrase(open[0])}.`
      : `The patterns to work on, most frequent first: ${open.map(phrase).join('; ')}.`;

  return { facts, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** Topic a student scoped a weakness/training question to, so the
 *  recommendation filters the ranked profile to that family. Maps to the
 *  `MisconceptionBucket` an aggregated weakness carries. Returns null when the
 *  question is unscoped ("what should I train?" → the whole profile). */
export type WeaknessTopic = 'tactical' | 'opening' | 'endgame' | 'positional';

export function weaknessTopicFromText(text: string | undefined | null): WeaknessTopic | null {
  if (!text) return null;
  const t = text.toLowerCase();
  // Tactics first — the most-asked scope, and its motifs (fork/pin/…) are
  // unambiguous even when the word "tactic" is absent.
  if (/\btactic(?:s|al)?\b|\bcombination|\bfork|\bpins?\b|\bskewer|\bdiscover|\bdouble\s+attack|\bback[\s-]?rank\b/.test(t)) return 'tactical';
  if (/\bend[\s-]?games?\b|\bendings?\b|\brook\s+ending|\bpawn\s+ending|\bconvert(?:ing)?\b/.test(t)) return 'endgame';
  if (/\bopening|\brepertoire\b|\bopening\s+prep/.test(t)) return 'opening';
  if (/\bpositional|\bstrateg|\bplan(?:ning|s)?\b|\bstructure/.test(t)) return 'positional';
  return null;
}

/** The minimal shape `assembleWeaknessRecommendation` reads — a structural
 *  subset of `UnifiedWeakness` (weaknessSpine) so the assembler stays a pure
 *  leaf that imports no service. The caller computes the ranked profile
 *  (`getUnifiedWeaknessProfile`) and hands the rows in. */
export interface WeaknessLike {
  /** Plain-English label, no SAN/jargon (e.g. "Forks", "Rook endgames"). */
  label: string;
  /** Instances due/open right now — the ranking + selection key. */
  openCount: number;
  /** MisconceptionBucket family, for topic filtering. */
  bucket?: string;
}

/**
 * assembleWeaknessRecommendation — the grounded "what should I train / what am
 * I weak in" answer. The student's OWN ranked weakness profile (computed by
 * `getUnifiedWeaknessProfile` across every capture pipeline — tactics, openings,
 * phase-of-loss, conversion, board-vision) is handed in; this SELECTS the top
 * few (most-frequent first), optionally scoped to a named topic, and packages
 * them for `voiceFacts`. The LLM voices the student's real numbers + a true
 * next-step fact; it never invents a weakness. Returns null when there's
 * nothing open (caller falls back to the bad-habit profile, then a no-data
 * line). G0: no chess content decided here — only phrasing downstream.
 */
export function assembleWeaknessRecommendation(
  weaknesses: ReadonlyArray<WeaknessLike>,
  opts: { topic?: WeaknessTopic | null } = {},
): GroundedAnswer | null {
  const topic = opts.topic ?? null;
  const pool = topic ? weaknesses.filter((w) => w.bucket === topic) : weaknesses;
  const open = pool
    .filter((w) => w.openCount > 0 && !!w.label)
    .sort((a, b) => b.openCount - a.openCount)
    .slice(0, 3);
  if (open.length === 0) return null;

  const phrase = (w: WeaknessLike): string =>
    `${w.label} (${w.openCount} time${w.openCount === 1 ? '' : 's'})`;
  const topicNoun =
    topic === 'tactical' ? 'tactical area'
      : topic === 'opening' ? 'opening'
        : topic === 'endgame' ? 'endgame area'
          : topic === 'positional' ? 'positional area'
            : 'area';
  const lead =
    open.length === 1
      ? `The ${topicNoun} to train, from your own games: ${phrase(open[0])}.`
      : `The ${topicNoun}s to train, most frequent first, from your own games: ${open.map(phrase).join('; ')}.`;
  // A TRUE capability fact (not invented chess content) so the coach can offer
  // the concrete next step — drilling routes to the real mistake queue.
  const facts = `${lead} You can practice these on the board anytime by asking to drill your mistakes.`;

  return { facts, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** One opening's computed stats — a structural subset of OpeningRecord (+ a
 *  game tally) so the assembler stays a pure leaf. The caller computes these
 *  from openingService (getStrongestOpenings / getMostPlayedOpenings /
 *  getWeakestOpenings) and hands them in. */
export interface OpeningStat {
  name: string;
  color: 'white' | 'black';
  /** 0-1 drill accuracy (strongest/weakest). */
  drillAccuracy?: number;
  drillAttempts?: number;
  /** real games played in this opening (most-played); 0 = drill-count fallback. */
  games?: number;
}

/**
 * assembleOpeningProfileAnswer — the grounded "what's my strongest / favorite /
 * most-played opening?" answer. The student's OWN repertoire stats (drill
 * accuracy, drill attempts, real game counts) are computed in code and handed
 * in; this SELECTS + phrases them, grouped by color so "for both white and
 * black" reads naturally. The LLM voices the real numbers; it never invents an
 * opening or a stat. Returns null when there's no data (caller falls back to a
 * "play/drill a few and I'll tell you" line). G0: no chess content decided
 * here — only phrasing downstream.
 */
export function assembleOpeningProfileAnswer(opts: {
  kind: 'strongest' | 'favorite' | 'weakest';
  openings: ReadonlyArray<OpeningStat>;
}): GroundedAnswer | null {
  const { kind, openings } = opts;
  const rows = openings.filter((o) => o.name);
  if (rows.length === 0) return null;

  const pct = (a: number | undefined): string =>
    typeof a === 'number' ? `${Math.round(a * 100)}%` : '';
  const stat = (o: OpeningStat): string => {
    if (kind === 'favorite') {
      return o.games && o.games > 0
        ? `${o.name} (${o.games} game${o.games === 1 ? '' : 's'})`
        : `${o.name} (your most-drilled)`;
    }
    // strongest / weakest → accuracy over attempts
    const acc = pct(o.drillAccuracy);
    if (acc && o.drillAttempts) return `${o.name} (${acc} over ${o.drillAttempts} drill${o.drillAttempts === 1 ? '' : 's'})`;
    if (acc) return `${o.name} (${acc})`;
    return o.name;
  };

  const white = rows.filter((o) => o.color === 'white');
  const black = rows.filter((o) => o.color === 'black');
  const label = kind === 'strongest' ? 'strongest' : kind === 'weakest' ? 'weakest' : 'most-played';

  let facts: string;
  if (white.length > 0 && black.length > 0) {
    // both colors requested — one per side
    facts = `Your ${label} opening as White is ${stat(white[0])}; as Black it's ${stat(black[0])}.`;
  } else {
    const list = rows.slice(0, 3);
    facts =
      list.length === 1
        ? `Your ${label} opening is ${stat(list[0])}.`
        : `Your ${label} openings, ${kind === 'weakest' ? 'weakest' : 'best'} first: ${list.map(stat).join('; ')}.`;
  }
  // True next-step capability facts (no invented chess content).
  const next =
    kind === 'weakest'
      ? ' Ask me to drill it and I\'ll set the line up on the board.'
      : ' Ask me to teach it or drill its traps to go deeper.';
  return { facts: facts + next, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** The student's computed game-record stats (a structural subset of
 *  OverviewInsights + the profile rating) — handed to `assembleStatsAnswer`
 *  so the assembler stays a pure leaf. */
export interface StatsLike {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;        // 0-100
  winRateWhite: number;   // 0-100
  winRateBlack: number;   // 0-100
  currentRating?: number | null;
  highestBeaten?: { name: string; rating: number } | null;
  /** Average moves per game (getOverviewInsights.avgMovesPerGame). */
  avgMovesPerGame?: number;
}

/**
 * assembleStatsAnswer — the grounded "what's my rating / record / win rate?"
 * answer. The student's OWN game history (wins/losses/draws + per-color win
 * rate, computed by getOverviewInsights) + their rating is handed in; this
 * phrases it. The LLM voices real numbers; it invents no stat. Returns null
 * when there are no games yet (caller takes the no-data line). G0.
 */
export function assembleStatsAnswer(s: StatsLike): GroundedAnswer | null {
  if (s.totalGames <= 0) return null;
  const rating = typeof s.currentRating === 'number' && s.currentRating > 0
    ? ` Your rating is about ${Math.round(s.currentRating)}.`
    : '';
  const perColor = (s.winRateWhite || s.winRateBlack)
    ? ` As White you win ${s.winRateWhite}%, as Black ${s.winRateBlack}%.`
    : '';
  const beat = s.highestBeaten && s.highestBeaten.name
    ? ` Your best scalp: ${s.highestBeaten.name} (${s.highestBeaten.rating}).`
    : '';
  const moves = typeof s.avgMovesPerGame === 'number' && s.avgMovesPerGame > 0
    ? ` Your games run about ${s.avgMovesPerGame} moves on average.`
    : '';
  const facts =
    `Across ${s.totalGames} game${s.totalGames === 1 ? '' : 's'} your record is ` +
    `${s.wins}-${s.losses}-${s.draws} (wins-losses-draws), a ${s.winRate}% win rate.` +
    perColor + rating + beat + moves;
  return { facts, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/**
 * assembleStrengthsAnswer — the grounded "what am I good at?" answer. The
 * strengths are COMPUTED (getOverviewInsights.strengths — "62% win rate as
 * White", "N brilliant moves", zero-blunder games, etc.); this selects the top
 * few and phrases them. Distinct from the weakness path so "what am I good at?"
 * stops getting a weakness-dump. Returns null when no strengths computed. G0.
 */
export function assembleStrengthsAnswer(strengths: ReadonlyArray<string>): GroundedAnswer | null {
  const open = strengths.filter((s) => !!s && s.trim().length > 0).slice(0, 3);
  if (open.length === 0) return null;
  const facts =
    open.length === 1
      ? `What you do well, from your own games: ${open[0]}.`
      : `What you do well, from your own games: ${open.join('; ')}.`;
  return { facts, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** The student's drill accuracy within ONE opening (opening-level aggregate +
 *  the weakest sub-line + the single position they miss most) — a structural
 *  subset of the OpeningRecord + its weak-spot store, handed to
 *  `assembleOpeningAccuracyAnswer` so the assembler stays a pure leaf.
 *  `accuracy`/`variationAccuracy` are 0-1; `failCount` is a raw miss tally. */
export interface OpeningAccuracyLike {
  openingName: string;
  color?: 'white' | 'black' | null;
  drillAccuracy: number;   // 0-1
  drillAttempts: number;
  /** The lowest-accuracy variation (name + its 0-1 accuracy), if any drilled. */
  weakestVariation?: { name: string; accuracy: number } | null;
  /** The single position missed most (the correct move + how often missed). */
  topWeakSpot?: { san: string; failCount: number } | null;
}

/**
 * assembleOpeningAccuracyAnswer — the grounded "how accurate am I in my
 * favorite opening / what's the weakest part of my opening theory I need to
 * work on?" answer (David 2026-07-04: "check accuracy throughout the opening,
 * identify what is weakest and what I need to work on the most"). All computed:
 * opening-level drill accuracy (OpeningRecord.drillAccuracy/Attempts), the
 * weakest variation (variationAccuracy zipped with variations[].name), and the
 * single most-missed position (openingWeakSpots ranked by failCount). The LLM
 * voices these numbers; it picks no move and invents no line. Returns null when
 * there's nothing drilled AND no weak spot recorded (caller takes the no-data
 * line). G0.
 */
export function assembleOpeningAccuracyAnswer(o: OpeningAccuracyLike): GroundedAnswer | null {
  const drilled = o.drillAttempts > 0;
  const weakVar = o.weakestVariation && o.weakestVariation.name ? o.weakestVariation : null;
  const spot = o.topWeakSpot && o.topWeakSpot.san && o.topWeakSpot.failCount > 0 ? o.topWeakSpot : null;
  if (!drilled && !spot && !weakVar) return null;

  const where = o.color ? ` as ${o.color === 'white' ? 'White' : 'Black'}` : '';
  const lead = drilled
    ? `In your ${o.openingName}${where}, you're drilling at ${Math.round(o.drillAccuracy * 100)}% over ${o.drillAttempts} attempt${o.drillAttempts === 1 ? '' : 's'}.`
    : `You haven't drilled the ${o.openingName}${where} main line yet.`;

  const varLine = weakVar
    ? ` Your weakest line is the ${weakVar.name} at ${Math.round(weakVar.accuracy * 100)}% — that's the part of your theory to shore up first.`
    : '';

  const spotLine = spot
    ? ` The position you miss most: the right move is ${spot.san}, and you've slipped there ${spot.failCount} time${spot.failCount === 1 ? '' : 's'}.`
    : '';

  // When nothing finer than the aggregate is known, still point them at drilling.
  const next = (weakVar || spot)
    ? ' Want me to drill that with you?'
    : ' Drill it a few times and I can pinpoint the exact line and move to work on.';

  return { facts: lead + varLine + spotLine + next, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** One side's opening + its real trap weapons and "watch out for" warnings —
 *  drawn from the OpeningRecord (named trapLines / traps prose = weapons; named
 *  warningLines / warnings prose = anti-traps). Handed to
 *  `assembleOpeningTrapsAnswer` so the assembler stays a pure leaf. */
export interface OpeningTrapsSideLike {
  name: string;
  color: 'white' | 'black';
  /** Trap WEAPONS — named traps the student can spring (opponent slips). */
  traps: ReadonlyArray<string>;
  /** "WATCH OUT FOR" — anti-traps where the STUDENT is the one who slips. */
  warnings: ReadonlyArray<string>;
}

/**
 * assembleOpeningTrapsAnswer — the grounded "what traps can I use in my
 * strongest opening (for both colors), and what should I watch out for?" answer
 * (David 2026-07-04: "drill me on opening traps in your strongest opening for
 * both white and black … teach me what to look out for … and what system it
 * uses to teach these"). The traps + warnings are REAL, hand-authored data on
 * the OpeningRecord (G3 — never invented); this names them per side, optionally
 * explains the WLPP teaching system, and points the student at the drill. The
 * LLM voices these names; it invents no trap. Returns null when no side carries
 * any trap or warning. G0.
 */
export function assembleOpeningTrapsAnswer(opts: {
  sides: ReadonlyArray<OpeningTrapsSideLike>;
  explainSystem?: boolean;
  /** True when the student NAMED the opening ("traps in the Italian") — the
   *  phrasing then describes THAT opening, not "your strongest". */
  named?: boolean;
}): GroundedAnswer | null {
  const clean = (xs: ReadonlyArray<string>): string[] =>
    xs.filter((s) => !!s && s.trim().length > 0).map((s) => s.trim());
  const sides = opts.sides.filter((s) => s.name && (clean(s.traps).length > 0 || clean(s.warnings).length > 0));
  // The teaching-system explanation — grounded in the app's REAL WLPP grammar +
  // trap taxonomy (not invented). Fires whenever the student asked "how do you
  // teach these / what system"; it does NOT depend on having named traps.
  const system = opts.explainSystem
    ? 'I teach every trap the same four-rung way — Watch, Learn, Practice, Play: you watch the trap spring with the key squares lit up, then I guide you through the punish move by move, then you play it silently, then you drill it live. Each trap is tagged too — a forced tactic, a positional mistake to punish, or a longer maneuvering idea.'
    : '';

  // No named traps to voice. If the student asked about the SYSTEM, still answer
  // that (it's the same regardless of which traps exist); otherwise null so the
  // caller takes the no-data line. G0 — the "how do you teach traps" answer is a
  // computed fact, not something the LLM should freestyle into a drill setup.
  if (sides.length === 0) {
    if (!system) return null;
    return {
      facts: system + ' Ask me for the traps in your strongest opening and I\'ll name them.',
      bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'],
    };
  }

  const parts: string[] = [];
  let firstDrillName = '';
  for (const s of sides) {
    if (!firstDrillName) firstDrillName = s.name;
    const traps = clean(s.traps).slice(0, 3);
    const warns = clean(s.warnings).slice(0, 2);
    const side = s.color === 'white' ? 'White' : 'Black';
    let line = opts.named
      ? `The ${s.name} (a ${side} opening) has real, verified traps.`
      : `Your strongest ${side} opening is the ${s.name}.`;
    if (traps.length) line += ` Trap weapons you can spring: ${traps.join('; ')}.`;
    if (warns.length) line += ` Watch out for: ${warns.join('; ')}.`;
    parts.push(line);
  }

  // The OFFER (David 2026-08-13: "coach should ask to show them / make a
  // lesson plan of all opening traps"): every trap answer ends by offering
  // the full walk — the traps stage already teaches each one WLPP-style.
  const next = firstDrillName
    ? ` Want me to show you? Say "teach me the traps in the ${firstDrillName}" and I'll build a lesson plan that walks every one of them.`
    : '';

  const systemTail = system ? ' ' + system : '';
  return { facts: parts.join(' ') + systemTail + next, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** The student's spaced-repetition review state — a structural subset of the
 *  live `srsOpeningCards` store (getDueCount + getEnrolledOpenings +
 *  getSrsDueOpenings), handed to `assembleReviewDueAnswer` so the assembler
 *  stays a pure leaf. */
export interface ReviewDueLike {
  /** Total cards due for review right now (nextReviewAt <= now). */
  dueCount: number;
  /** Total opening cards enrolled in the SRS (0 → nothing to review yet). */
  totalEnrolled: number;
  /** Openings that currently have due cards, name + count, richest first. */
  dueOpenings: ReadonlyArray<{ name: string; dueCards: number }>;
}

/**
 * assembleReviewDueAnswer — the grounded "what's due for review today / how many
 * cards do I have to review?" answer (David 2026-07-04: "keep working these
 * types of questions"). The counts + per-opening grouping are COMPUTED from the
 * live SRS store (`srsOpeningCards`); this phrases them and points the student
 * at the `/openings/srs` trainer. The LLM voices real numbers; it invents no
 * count. Returns null when nothing is enrolled yet (caller takes the
 * not-enrolled onboarding line). G0.
 */
export function assembleReviewDueAnswer(s: ReviewDueLike): GroundedAnswer | null {
  if (s.totalEnrolled <= 0) return null;

  // All caught up — nothing due, but cards are in rotation.
  if (s.dueCount <= 0) {
    return {
      facts: `You're all caught up — nothing due for review right now. You've got ${s.totalEnrolled} opening card${s.totalEnrolled === 1 ? '' : 's'} in rotation, and I'll resurface them as they come due.`,
      bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'],
    };
  }

  const openings = s.dueOpenings.filter((o) => o.name && o.dueCards > 0).slice(0, 3);
  const acrossN = s.dueOpenings.filter((o) => o.dueCards > 0).length;
  const across = acrossN > 1 ? ` across ${acrossN} openings` : '';
  const breakdown = openings.length
    ? ` Mostly ${openings.map((o) => `the ${o.name} (${o.dueCards})`).join(', ')}.`
    : '';
  const facts =
    `You've got ${s.dueCount} card${s.dueCount === 1 ? '' : 's'} due for review right now${across}.` +
    breakdown + ` Say "review my openings" and I'll run today's reps.`;
  return { facts, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** Readable phase word for narration. */
function phaseWord(p: string): string {
  return p === 'middlegame' ? 'middlegame' : p === 'endgame' ? 'endgame' : 'opening';
}
/** Pawns, one decimal, from centipawns. */
function pawns(cp: number): string { return (Math.abs(cp) / 100).toFixed(1); }

// ═══ WAVE 1 — the "where do I go wrong" cluster (David 2026-07-04): voice the
// weakness-tab numbers the coach never spoke, each ending in a suggestion. ═══

/** The student's mistake profile — a structural subset of getMistakeInsights +
 *  getOverviewInsights, handed to `assembleMistakesAnswer`. */
export interface MistakesLike {
  totalGames: number;
  blundersPerGame: number;
  mistakesPerGame: number;
  avgCpLoss: number;                 // centipawns lost per game
  worstPhase: { phase: string; errors: number } | null;
  thrownWins: number;
  /** Winning tactics/moves that were on the board but not played. */
  missedWins: number;
  /** Games that fell apart late (multiple errors bunched in the final moves). */
  lateGameCollapses: number;
  costliest: { san: string; cpLoss: number; opponentName: string; openingName: string | null } | null;
}

/**
 * assembleMistakesAnswer — "what mistakes do I make / how often do I blunder /
 * where do I go wrong?" Voices the real error numbers (blunder/mistake rate, avg
 * centipawn loss, worst phase, thrown-away wins, the single costliest slip) and
 * ends with a concrete thing to work on. All computed (getMistakeInsights); the
 * LLM invents no number. Returns null with no analyzed games. G0.
 */
export function assembleMistakesAnswer(m: MistakesLike): GroundedAnswer | null {
  if (m.totalGames <= 0) return null;
  const rate = `Across ${m.totalGames} game${m.totalGames === 1 ? '' : 's'} you average ${m.blundersPerGame} blunder${m.blundersPerGame === 1 ? '' : 's'} and ${m.mistakesPerGame} mistake${m.mistakesPerGame === 1 ? '' : 's'} a game, losing about ${Math.round(m.avgCpLoss)} centipawns per game.`;
  const phase = m.worstPhase && m.worstPhase.errors > 0
    ? ` Most of your errors land in the ${phaseWord(m.worstPhase.phase)} (${m.worstPhase.errors} there).`
    : '';
  const thrown = m.thrownWins > 0
    ? ` You've let ${m.thrownWins} winning position${m.thrownWins === 1 ? '' : 's'} slip.`
    : '';
  const missed = m.missedWins > 0
    ? ` And ${m.missedWins} winning shot${m.missedWins === 1 ? '' : 's'} sat on the board that you didn't take.`
    : '';
  const collapse = m.lateGameCollapses > 0
    ? ` ${m.lateGameCollapses} game${m.lateGameCollapses === 1 ? ' collapsed' : 's collapsed'} late — errors bunched in the final moves, which usually means clock or fatigue.`
    : '';
  const costly = m.costliest && m.costliest.san
    ? ` Your costliest slip was ${m.costliest.san} against ${m.costliest.opponentName || 'an opponent'}, dropping ${pawns(m.costliest.cpLoss)} points${m.costliest.openingName ? ` in the ${m.costliest.openingName}` : ''}.`
    : '';
  // Suggestion — pick the dominant lever.
  const suggest = m.thrownWins >= 2
    ? ' Work on converting winning positions — that\'s costing you the most.'
    : m.worstPhase && m.worstPhase.errors > 0
      ? ` Focus your training on the ${phaseWord(m.worstPhase.phase)}, and drill your saved mistake puzzles from there.`
      : ' Drill your saved mistake puzzles to turn these into second nature.';
  return { facts: rate + phase + thrown + missed + collapse + costly + suggest, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** Errors split by how the game stood when they happened. */
export interface ErrorsBySituationLike {
  winning: number;
  equal: number;
  losing: number;
}

/**
 * assembleErrorsBySituationAnswer — "do I blunder more when I'm winning /
 * losing?" Voices where the student's serious errors concentrate (winning vs
 * equal vs losing) and coaches to the dominant leak. Computed
 * (getMistakeInsights.errorsBySituation). Returns null with no errors. G0.
 */
export function assembleErrorsBySituationAnswer(e: ErrorsBySituationLike): GroundedAnswer | null {
  const total = e.winning + e.equal + e.losing;
  if (total <= 0) return null;
  const buckets: Array<{ key: 'winning' | 'equal' | 'losing'; n: number }> = [
    { key: 'winning', n: e.winning },
    { key: 'equal', n: e.equal },
    { key: 'losing', n: e.losing },
  ];
  buckets.sort((a, b) => b.n - a.n);
  const top = buckets[0];
  const pct = Math.round((top.n / total) * 100);
  const where = top.key === 'winning'
    ? "when you're already winning"
    : top.key === 'equal'
      ? 'in equal, balanced positions'
      : "when you're already worse";
  const lead = `Of your ${total} serious error${total === 1 ? '' : 's'}, ${pct}% (${top.n}) come ${where}.`;
  const coaching = top.key === 'winning'
    ? " The pattern is relaxing once you're ahead — keep calculating your opponent's tricks when you're winning, because that's where you leak the most points."
    : top.key === 'equal'
      ? " The errors cluster in tense, level positions — slow down at the critical moment and check every opponent threat before you commit."
      : " You crack most when already under pressure — practice defending worse positions patiently instead of lashing out.";
  return { facts: lead + coaching, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** The student's most persistent misconception, from the tagged bucket. */
export interface MisconceptionsLike {
  top: {
    label: string;
    bucket: string;
    total: number;
    openCount: number;
    /** Whole days since the last instance; null if unknown. */
    lastSeenDaysAgo: number | null;
  } | null;
  distinctTags: number;
}

/**
 * assembleMisconceptionsAnswer — "what thinking errors / misconceptions do I
 * make — am I still making them?" Voices the most-logged misconception, its
 * bucket, how recently it last surfaced, and whether it's still an active
 * pattern (due to resurface) or resting (spaced out) — David's "old error vs
 * still making it" (2026-06-19). Computed (getMisconceptionProfile). Returns
 * null with no logged misconceptions. G0.
 */
export function assembleMisconceptionsAnswer(m: MisconceptionsLike): GroundedAnswer | null {
  if (!m.top || m.top.total <= 0) return null;
  const t = m.top;
  const recency = t.lastSeenDaysAgo === null
    ? ''
    : t.lastSeenDaysAgo <= 1
      ? 'You made it as recently as today'
      : t.lastSeenDaysAgo <= 7
        ? `You last made it ${t.lastSeenDaysAgo} day${t.lastSeenDaysAgo === 1 ? '' : 's'} ago`
        : t.lastSeenDaysAgo <= 45
          ? `You last made it about ${Math.max(1, Math.round(t.lastSeenDaysAgo / 7))} week${Math.round(t.lastSeenDaysAgo / 7) === 1 ? '' : 's'} ago`
          : `You last made it about ${Math.round(t.lastSeenDaysAgo / 30)} month${Math.round(t.lastSeenDaysAgo / 30) === 1 ? '' : 's'} ago`;
  const active = t.openCount > 0
    ? `${recency ? recency + ', and it is' : 'It is'} still an active pattern — due to resurface in your training now.`
    : `${recency ? recency + '. ' : ''}It is resting for now — you have been spacing it out well.`;
  const bucket = t.bucket && t.bucket !== 'uncategorized' ? ` It is a ${t.bucket} misconception.` : '';
  const lead = `Your most persistent thinking error is "${t.label}" — logged ${t.total} time${t.total === 1 ? '' : 's'}.`;
  const more = m.distinctTags > 1
    ? ` You have ${m.distinctTags} distinct misconception patterns tracked; this is the one to fix first.`
    : '';
  return { facts: `${lead}${bucket} ${active}${more}`, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** The student's tactical profile — a subset of getTacticInsights. */
export interface TacticsProfileLike {
  totalGames: number;
  awarenessRate: number;               // %
  found: number;
  missed: number;
  missedByType: ReadonlyArray<{ type: string; count: number }>;   // desc by count
  worstPhase: { phase: string; count: number } | null;
  /** Avg centipawn cost of the most-missed motif (missedByType[0].avgCost). */
  topMissAvgCost?: number;
  /** The single costliest missed tactic (worstMisses[0]). */
  worstMiss?: { san: string; opponentName: string } | null;
  /** The student's sharpest found combination on record (bestSequences[0]). */
  bestSequence?: { san: string; opponentName: string } | null;
  /** Distinct tactic types found across games (tacticTypeBreadth). */
  breadthDistinct?: number;
  /** Whether brilliancies spread across games or cluster (brilliantConcentration). */
  brillianceShape?: 'spread' | 'clustered' | 'insufficient';
}

/**
 * assembleTacticsProfileAnswer — "how are my tactics / what tactics do I miss?"
 * Voices tactical awareness rate, found-vs-missed, the motif missed most, and
 * the phase where misses cluster, then suggests drilling that motif. Computed
 * (getTacticInsights). Distinct from the live-board "is there a tactic here"
 * (isTacticsQuestion). Returns null with no tactic data. G0.
 */
export function assembleTacticsProfileAnswer(t: TacticsProfileLike): GroundedAnswer | null {
  if (t.totalGames <= 0 || (t.found + t.missed) <= 0) return null;
  const top = t.missedByType.find((x) => x.type && x.count > 0) ?? null;

  // No missed tactics in the analyzed games. The awareness-RATE framing is
  // degenerate here: missed === 0 ⟹ rate is a vacuous 100%, and "lift your
  // awareness rate" contradicts itself (there is no gap to lift). "found" also
  // counts every brilliant/great move, so trumpeting "100% tactical awareness"
  // for a club player reads as a fake stat (David's screenshot, 2026-07-13).
  // Report the clean sheet honestly WITHOUT the 100% claim, and point forward.
  const best = t.bestSequence && t.bestSequence.san
    ? ` Your sharpest shot on record: ${t.bestSequence.san}${t.bestSequence.opponentName ? ` against ${t.bestSequence.opponentName}` : ''}.`
    : '';
  const breadth = typeof t.breadthDistinct === 'number' && t.breadthDistinct > 0
    ? ` You've found ${t.breadthDistinct} distinct tactic type${t.breadthDistinct === 1 ? '' : 's'} — ${t.breadthDistinct >= 8 ? 'a broad tactical vocabulary' : 'room to widen your pattern range'}.`
    : '';
  const brill = t.brillianceShape === 'clustered'
    ? ' Your brilliancies bunch into a few games rather than spreading across many.'
    : '';

  if (t.missed === 0) {
    const lead = `In your analyzed games I don't see a missed tactical shot — and ${t.found} sharp tactical move${t.found === 1 ? '' : 's'} you did find.`;
    const suggest = ' Keep drilling mixed tactics — step up the difficulty to keep finding them under pressure.';
    return { facts: lead + best + breadth + brill + suggest, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
  }

  const lead = `Your tactical awareness is ${t.awarenessRate}% — you spot ${t.found} tactic${t.found === 1 ? '' : 's'} and miss ${t.missed}.`;
  const byType = top
    ? ` The motif you miss most is the ${top.type} (${top.count} time${top.count === 1 ? '' : 's'}).`
    : '';
  const cost = top && typeof t.topMissAvgCost === 'number' && t.topMissAvgCost > 0
    ? ` Those cost about ${pawns(t.topMissAvgCost)} points each.`
    : '';
  const phase = t.worstPhase && t.worstPhase.count > 0
    ? ` Most of those misses come in the ${phaseWord(t.worstPhase.phase)}.`
    : '';
  const worst = t.worstMiss && t.worstMiss.san
    ? ` Your costliest miss was ${t.worstMiss.san}${t.worstMiss.opponentName ? ` against ${t.worstMiss.opponentName}` : ''}.`
    : '';
  const suggest = top
    ? ` Drill ${top.type} puzzles to close that gap.`
    : ' Keep drilling mixed tactics to lift your awareness rate.';
  return { facts: lead + byType + cost + phase + worst + best + breadth + brill + suggest, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** The student's per-phase profile — phaseAccuracy + critical-moment accuracy. */
export interface PhaseProfileLike {
  phaseAccuracy: ReadonlyArray<{ phase: string; accuracy: number; mistakes: number; moveCount: number }>;
  criticalByPhase: ReadonlyArray<{ phase: string; accuracyPct: number; total: number }>;
  /** Per-phase average centipawn loss (getMistakeInsights.errorsByPhase). */
  cpLossByPhase?: ReadonlyArray<{ phase: string; avgCpLoss: number }>;
}

/**
 * assemblePhaseProfileAnswer — "which phase am I weakest in / where do I lose?"
 * Voices accuracy per phase (opening/middlegame/endgame), names the weakest, and
 * folds in critical-moment decision quality, then suggests focusing there.
 * Computed (getOverviewInsights.phaseAccuracy + criticalMomentsAccuracy).
 * Returns null with no analyzed moves. G0.
 */
export function assemblePhaseProfileAnswer(p: PhaseProfileLike): GroundedAnswer | null {
  const played = p.phaseAccuracy.filter((x) => x.moveCount > 0 && x.accuracy > 0);
  if (played.length === 0) return null;
  const order: Record<string, number> = { opening: 0, middlegame: 1, endgame: 2 };
  const sorted = [...played].sort((a, b) => (order[a.phase] ?? 9) - (order[b.phase] ?? 9));
  const readout = sorted.map((x) => `${phaseWord(x.phase)} ${x.accuracy}%`).join(', ');
  const worst = [...played].sort((a, b) => a.accuracy - b.accuracy)[0];
  const worstLine = ` Your weakest is the ${phaseWord(worst.phase)} at ${worst.accuracy}%${worst.mistakes > 0 ? `, where you also make the most mistakes` : ''}.`;
  const worstCp = p.cpLossByPhase?.find((x) => x.phase === worst.phase);
  const cpLine = worstCp && worstCp.avgCpLoss > 0
    ? ` You bleed about ${worstCp.avgCpLoss} centipawns a game there.`
    : '';
  const crit = p.criticalByPhase.filter((x) => x.total > 0);
  const critWorst = crit.length ? [...crit].sort((a, b) => a.accuracyPct - b.accuracyPct)[0] : null;
  const critLine = critWorst
    ? ` On the game's critical moments, the ${phaseWord(critWorst.phase)} is softest — you find the best move ${critWorst.accuracyPct}% of the time there.`
    : '';
  const suggest = ` Put your training into the ${phaseWord(worst.phase)}.`;
  return { facts: `Your accuracy by phase: ${readout}.` + worstLine + cpLine + critLine + suggest, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

// ═══ IMPROVEMENT TREND (David 2026-07-04 misroute fix) — "am I improving?" ═══
// The temporal answer a trend question actually wants: is the student's play
// getting BETTER OVER TIME, not a dump of current weaknesses (that's the
// progress vertical). Grounded in phaseStrengthOverTime (per-phase monthly
// accuracy from the student's OWN analyzed games).

/** The subset of `PhaseStrengthMatrix` the trend answer needs. */
export interface TrendMatrixLike {
  monthLabels: string[];
  monthsAsc: string[];
  rows: ReadonlyArray<{
    phase: 'opening' | 'middlegame' | 'endgame';
    cells: ReadonlyArray<{ accuracyPct: number | null; samples: number }>;
  }>;
}

/**
 * assembleTrendAnswer — "am I improving / getting better / trending up?". Voiced
 * from phaseStrengthOverTime: computes a samples-weighted OVERALL accuracy per
 * month, then reports the DIRECTION + magnitude from the earliest month with
 * data to the latest, plus the standout phase. Returns null with fewer than two
 * months of analyzed data (you can't call a trend from one point) so the caller
 * falls through to a computed "not enough history yet" line. Every number is
 * read from the matrix — nothing invented. G0.
 */
export function assembleTrendAnswer(matrix: TrendMatrixLike): GroundedAnswer | null {
  const n = matrix.monthsAsc.length;
  const monthly: Array<{ label: string; acc: number | null }> = [];
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let samples = 0;
    for (const row of matrix.rows) {
      const cell = row.cells[i];
      if (cell && cell.accuracyPct !== null && cell.samples > 0) {
        sum += cell.accuracyPct * cell.samples;
        samples += cell.samples;
      }
    }
    monthly.push({ label: matrix.monthLabels[i] ?? matrix.monthsAsc[i], acc: samples > 0 ? Math.round(sum / samples) : null });
  }
  const withData = monthly.filter((m): m is { label: string; acc: number } => m.acc !== null);
  if (withData.length < 2) return null;
  const first = withData[0];
  const last = withData[withData.length - 1];
  const delta = last.acc - first.acc;
  const parts: string[] = [];
  if (delta >= 4) {
    parts.push(`Over the last few months your overall accuracy has climbed from ${first.acc}% in ${first.label} to ${last.acc}% in ${last.label} — you're improving.`);
  } else if (delta <= -4) {
    parts.push(`Over the last few months your overall accuracy has slipped from ${first.acc}% in ${first.label} to ${last.acc}% in ${last.label}.`);
  } else {
    parts.push(`Over the last few months your overall accuracy has held roughly steady, around ${last.acc}% (${first.label}: ${first.acc}%, ${last.label}: ${last.acc}%).`);
  }
  // Standout phase — biggest first→last accuracy swing among phases with ≥2 data points.
  let standout: { phase: string; delta: number; from: number; to: number } | null = null;
  for (const row of matrix.rows) {
    const pts = row.cells.filter((c): c is { accuracyPct: number; samples: number } => c.accuracyPct !== null && c.samples > 0);
    if (pts.length < 2) continue;
    const d = pts[pts.length - 1].accuracyPct - pts[0].accuracyPct;
    if (!standout || Math.abs(d) > Math.abs(standout.delta)) {
      standout = { phase: row.phase, delta: d, from: pts[0].accuracyPct, to: pts[pts.length - 1].accuracyPct };
    }
  }
  if (standout && Math.abs(standout.delta) >= 5) {
    const verb = standout.delta > 0 ? 'improved the most' : 'slipped the most';
    parts.push(`Your ${phaseWord(standout.phase)} ${verb}, from ${standout.from}% to ${standout.to}%.`);
  }
  return { facts: parts.join(' '), bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

// ═══ WAVE 2 — the REPERTOIRE-GAP cluster (David 2026-07-04: "I LOVE THIS STYLE
// OF QUESTION!"): where you leave book, the holes you're least prepared for, and
// what to learn next. Grounded in getOpeningInsights (repertoireCoverage +
// worstResults). ═══

/** The student's repertoire-gap picture — off-book rate + the openings they
 *  score worst against (their softest matchups) — a subset of getOpeningInsights,
 *  handed to `assembleRepertoireGapAnswer`. */
export interface RepertoireGapLike {
  kind: 'out-of-book' | 'hole' | 'learn-next';
  offBookPct: number | null;         // 0-100, % of games leaving prep (or null)
  totalGames: number;
  /** Openings the student scores worst against, richest signal first. */
  worstAgainst: ReadonlyArray<{ name: string; winRate: number; games: number }>;
  /** Openings the student scores BEST against (getOpeningInsights.bestResults). */
  bestAgainst?: ReadonlyArray<{ name: string; winRate: number; games: number }>;
}

/**
 * assembleRepertoireGapAnswer — the grounded "where do I leave theory / what's a
 * hole in my repertoire / what should I learn next?" answer (David 2026-07-04).
 * Voiced from the off-book rate + the openings the student scores worst against
 * (getOpeningInsights). Honest: it names the softest matchup by the real score,
 * never claims a coverage number it didn't compute. Ends by pointing at the fix.
 * Returns null with no opening/game data. G0.
 */
export function assembleRepertoireGapAnswer(g: RepertoireGapLike): GroundedAnswer | null {
  const worst = g.worstAgainst.filter((w) => w.name && w.games > 0);
  const top = worst[0] ?? null;
  const offBook = typeof g.offBookPct === 'number' && g.offBookPct >= 0;
  if (g.totalGames <= 0 || (!top && !offBook)) return null;

  if (g.kind === 'out-of-book') {
    const lead = offBook
      ? `About ${Math.round(g.offBookPct as number)}% of your games leave your prepared repertoire.`
      : `You drift out of your prep more than you'd like.`;
    const where = top
      ? ` Where it costs you most: you score only ${top.winRate}% against ${top.name} over ${top.games} games.`
      : '';
    const bestTop = g.bestAgainst?.find((b) => b.name && b.games > 0) ?? null;
    const flip = bestTop && (!top || bestTop.name !== top.name)
      ? ` On the flip side, you're strongest against ${bestTop.name} (${bestTop.winRate}% over ${bestTop.games} games).`
      : '';
    const suggest = top
      ? ` Extend your prep against ${top.name} first — that's where leaving book hurts most.`
      : ` Pin down your lines a few moves deeper so you're not improvising early.`;
    return { facts: lead + where + flip + suggest, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
  }

  if (g.kind === 'learn-next') {
    if (!top) return null;
    const facts =
      `The opening to learn next is a real answer to ${top.name} — it's your worst matchup at ${top.winRate}% over ${top.games} games` +
      (worst[1] ? `, with ${worst[1].name} (${worst[1].winRate}%) close behind` : '') +
      `. Want me to teach you a line against it?`;
    return { facts, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
  }

  // 'hole'
  if (!top) {
    // No worst-matchup signal but we know the off-book rate.
    return {
      facts: `The clearest gap is your prep depth — about ${Math.round(g.offBookPct as number)}% of your games leave book. Drill your repertoire lines deeper so you're not improvising.`,
      bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'],
    };
  }
  const runnerUp = worst[1] ? `, then ${worst[1].name} (${worst[1].winRate}%)` : '';
  const facts =
    `Your softest spot is ${top.name} — you score just ${top.winRate}% against it over ${top.games} games, your worst matchup${runnerUp}. That's the gap to plug. Want a solid line against ${top.name}?`;
  return { facts, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

// ═══ WAVE 3 — accuracy/move-quality, consistency/activity, converting/winning.
// The rest of the weakness-tab numbers, each ending in a suggestion. ═══

/** Accuracy + move-quality profile — a subset of getOverviewInsights. */
export interface AccuracyLike {
  totalGames: number;
  avgAccuracy: number;
  accuracyWhite: number;
  accuracyBlack: number;
  bestMoveAgreement: number;      // % of moves matching the engine's top choice
  brilliant: number;
  great: number;
  blunders: number;
  /** Full move-quality distribution (classificationCounts) — optional. */
  good?: number;
  book?: number;
  inaccuracies?: number;
  mistakes?: number;
}

/**
 * assembleAccuracyAnswer — "how accurate am I / how engine-like is my play?"
 * Voices average accuracy, per-colour accuracy, best-move agreement, and the
 * move-quality highlights, then suggests where to tighten up. Computed
 * (getOverviewInsights). Returns null with no analyzed games. G0.
 */
export function assembleAccuracyAnswer(a: AccuracyLike): GroundedAnswer | null {
  if (a.totalGames <= 0 || a.avgAccuracy <= 0) return null;
  const perColor = (a.accuracyWhite > 0 || a.accuracyBlack > 0)
    ? ` As White you play at ${a.accuracyWhite}%, as Black ${a.accuracyBlack}%.`
    : '';
  const agree = a.bestMoveAgreement > 0
    ? ` You match the engine's top move ${a.bestMoveAgreement}% of the time.`
    : '';
  // Full move-quality distribution when the counts are supplied (Overview →
  // Move Quality); falls back to the brilliant/great/blunder highlights.
  const dist: string[] = [];
  if (a.brilliant > 0) dist.push(`${a.brilliant} brilliant`);
  if (a.great > 0) dist.push(`${a.great} great`);
  const solid = (a.good ?? 0) + (a.book ?? 0);
  if (solid > 0) dist.push(`${solid} solid`);
  if ((a.inaccuracies ?? 0) > 0) dist.push(`${a.inaccuracies} inaccuracies`);
  if ((a.mistakes ?? 0) > 0) dist.push(`${a.mistakes} mistakes`);
  if (a.blunders > 0) dist.push(`${a.blunders} blunders`);
  const quality = dist.length ? ` Your move mix: ${dist.join(', ')}.` : '';
  // Suggestion — the biggest lever.
  const colorGap = Math.abs(a.accuracyWhite - a.accuracyBlack);
  const suggest = colorGap >= 8 && (a.accuracyWhite > 0 && a.accuracyBlack > 0)
    ? ` Your ${a.accuracyWhite < a.accuracyBlack ? 'White' : 'Black'} games are the weaker side — put your reps there.`
    : a.bestMoveAgreement > 0 && a.bestMoveAgreement < 45
      ? ' Work on calculation — you\'re leaving the best move on the table too often.'
      : ' Cutting blunders is the fastest way to lift this — drill your saved mistake puzzles.';
  return { facts: `Your average accuracy is ${a.avgAccuracy}%.` + perColor + agree + quality + suggest, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** Consistency + activity + time-control profile. */
export interface ConsistencyLike {
  currentWinStreak: number;
  longestWinStreak: number;
  timeControls: ReadonlyArray<{ bucket: string; winRatePct: number; games: number; avgAccuracyPct: number | null }>;
  /** Best run of first-try puzzle solves (StreakStats.longestSolveStreak). */
  longestSolveStreak?: number;
  /** Activity in the last year (activityHeatmap): games + distinct active days. */
  activity?: { totalGames: number; activeDays: number };
}

/**
 * assembleConsistencyAnswer — "how consistent am I / what time control am I best
 * at / am I on a streak?" Voices the win streak + the best/worst time control,
 * then suggests where to focus. Computed (streaks + timeControlPerformance).
 * Returns null with no games. G0.
 */
export function assembleConsistencyAnswer(c: ConsistencyLike): GroundedAnswer | null {
  const tc = c.timeControls.filter((t) => t.games > 0).sort((a, b) => b.winRatePct - a.winRatePct);
  if (tc.length === 0 && c.longestWinStreak <= 0) return null;
  const streak = c.longestWinStreak > 0
    ? c.currentWinStreak > 0
      ? `You're on a ${c.currentWinStreak}-game win streak (your best is ${c.longestWinStreak}).`
      : `Your longest win streak is ${c.longestWinStreak} games.`
    : `You're building your first win streak.`;
  const solve = c.longestSolveStreak && c.longestSolveStreak > 0
    ? ` Your best puzzle run is ${c.longestSolveStreak} solved first-try in a row.`
    : '';
  const act = c.activity && c.activity.totalGames > 0
    ? ` Over the last year you've played ${c.activity.totalGames} game${c.activity.totalGames === 1 ? '' : 's'} across ${c.activity.activeDays} active day${c.activity.activeDays === 1 ? '' : 's'}.`
    : '';
  const best = tc[0] ?? null;
  const worst = tc.length > 1 ? tc[tc.length - 1] : null;
  const tcLine = best
    ? ` You play best at ${best.bucket} (${best.winRatePct}% over ${best.games} games)${worst ? `, and weakest at ${worst.bucket} (${worst.winRatePct}%)` : ''}.`
    : '';
  const suggest = worst
    ? ` If you want a steadier rating, slow down in your ${worst.bucket} games — that's where results dip.`
    : ' Keep a regular cadence and I\'ll track your consistency over time.';
  return { facts: streak + solve + act + tcLine + suggest, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** Converting / winning-shape profile. */
export interface ConvertingLike {
  totalWins: number;
  thrownWins: number;
  comebackWins: number;
  quickWins: number;
  grindWins: number;
  midLengthWins: number;
}

/**
 * assembleConvertingAnswer — "do I convert winning positions / do I throw away
 * wins / how do I win?" Voices thrown wins vs comebacks + the win-shape mix, then
 * suggests the lever. Computed (getMistakeInsights.thrownWins + comebackWins +
 * winShapeStats). Returns null with no wins/data. G0.
 */
export function assembleConvertingAnswer(c: ConvertingLike): GroundedAnswer | null {
  if (c.totalWins <= 0 && c.thrownWins <= 0) return null;
  const thrown = c.thrownWins > 0
    ? `You've thrown away ${c.thrownWins} winning position${c.thrownWins === 1 ? '' : 's'}.`
    : `You rarely let a winning position slip — nice.`;
  const comeback = c.comebackWins > 0
    ? ` On the flip side, you've pulled off ${c.comebackWins} comeback win${c.comebackWins === 1 ? '' : 's'} from a losing spot.`
    : '';
  const shapeParts: string[] = [];
  if (c.quickWins > 0) shapeParts.push(`${c.quickWins} quick`);
  if (c.midLengthWins > 0) shapeParts.push(`${c.midLengthWins} mid-length`);
  if (c.grindWins > 0) shapeParts.push(`${c.grindWins} grind`);
  const shape = shapeParts.length && c.totalWins > 0
    ? ` Of your ${c.totalWins} wins: ${shapeParts.join(', ')}.`
    : '';
  const suggest = c.thrownWins >= 2
    ? ' Converting winning positions is your biggest leak — practice technique from a winning position, not just tactics.'
    : c.grindWins > c.quickWins
      ? ' You win by grinding — sharpening your attacking play could turn some of those long games into quick ones.'
      : ' Keep converting cleanly; add endgame technique to close out the tight ones.';
  return { facts: thrown + comeback + shape + suggest, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

// ═══ WAVE 4 — colour, records/bests, puzzle stats, tactic transfer gap. ═══

/** Better-as-White-or-Black profile. */
export interface ColorLike {
  totalGames: number;
  winRateWhite: number; winRateBlack: number;
  accuracyWhite: number; accuracyBlack: number;
  /** From colorProficiencyMismatch — the inversion (better at the colour you
   *  play less), when it exists; null otherwise. */
  inversion: { preferredColor: string; otherColor: string; inversionPoints: number } | null;
}
/** assembleColorAnswer — "am I better as White or Black?" G0. */
export function assembleColorAnswer(c: ColorLike): GroundedAnswer | null {
  if (c.totalGames <= 0 || (c.winRateWhite <= 0 && c.winRateBlack <= 0)) return null;
  const better = c.winRateWhite >= c.winRateBlack ? 'White' : 'Black';
  const acc = (c.accuracyWhite > 0 || c.accuracyBlack > 0)
    ? ` Your accuracy is ${c.accuracyWhite}% as White, ${c.accuracyBlack}% as Black.`
    : '';
  const inversion = c.inversion && c.inversion.inversionPoints >= 5 ? c.inversion : null;
  const inv = inversion
    ? ` Interesting — you play ${inversion.preferredColor} more, but you actually score better as ${inversion.otherColor}.`
    : '';
  const suggest = inversion
    ? ` Lean into your ${inversion.otherColor} games — that's your stronger side.`
    : ` You're stronger as ${better} — your ${better === 'White' ? 'Black' : 'White'} games are where the points are hiding.`;
  return { facts: `As White you win ${c.winRateWhite}%, as Black ${c.winRateBlack}%.` + acc + inv + suggest, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** Personal records / bests. */
export interface RecordsLike {
  totalGames: number;
  highestBeaten: { name: string; elo: number } | null;
  fastestWin: { moves: number } | null;
  longestGame: { moves: number } | null;
  bestAccuracyGame: { accuracyPct: number } | null;
  /** The strongest player who has BEATEN the student — answers "who beats me"
   *  (overview.lowestLostTo). Added 2026-07-10 so "who beats me" gets real data
   *  instead of a best-scalp mismatch (David: "answers must make sense"). */
  nemesis?: { name: string; elo: number } | null;
}
/** assembleRecordsAnswer — "my best game / fastest win / records". G0. */
export function assembleRecordsAnswer(r: RecordsLike): GroundedAnswer | null {
  if (r.totalGames <= 0) return null;
  const parts: string[] = [];
  if (r.highestBeaten) parts.push(`your best scalp is ${r.highestBeaten.name} (${r.highestBeaten.elo})`);
  if (r.nemesis) parts.push(`the strongest player to beat you was ${r.nemesis.name} (${r.nemesis.elo})`);
  if (r.bestAccuracyGame) parts.push(`your most accurate game hit ${r.bestAccuracyGame.accuracyPct}%`);
  if (r.fastestWin) parts.push(`your fastest win took ${r.fastestWin.moves} moves`);
  if (r.longestGame) parts.push(`your longest game ran ${r.longestGame.moves} moves`);
  if (parts.length === 0) return null;
  return { facts: `Your records: ${parts.join('; ')}. Want to replay your best game?`, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** Record vs a specific opening family. */
export interface OpeningRecordLike {
  openingName: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  asWhite: number;
  asBlack: number;
  winRatePct: number;
}
/** assembleOpeningRecordAnswer — "how do I do against the Sicilian?" G0. */
export function assembleOpeningRecordAnswer(r: OpeningRecordLike): GroundedAnswer | null {
  if (r.games <= 0) return null;
  const side = r.asWhite > 0 && r.asBlack > 0
    ? ` (${r.asWhite} as White, ${r.asBlack} as Black)`
    : r.asWhite > 0
      ? ` (${r.asWhite} as White)`
      : r.asBlack > 0
        ? ` (${r.asBlack} as Black)`
        : '';
  const wdl = `${r.wins}W-${r.draws}D-${r.losses}L`;
  // Suggestion keys off the win rate: below 45% is a real weak spot to drill.
  const suggest = r.winRatePct < 45
    ? ` That's below your average — the ${r.openingName} is a weak spot worth drilling.`
    : r.winRatePct >= 60
      ? ` The ${r.openingName} is a strength — keep leaning on it.`
      : ` Solid but not dominant — a few drilled lines would tip more of these your way.`;
  return {
    facts: `In the ${r.openingName} you're ${wdl} across ${r.games} game${r.games === 1 ? '' : 's'}${side} — a ${r.winRatePct}% win rate.` + suggest,
    bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'],
  };
}

/** Record vs a specific opponent. */
export interface OpponentRecordLike {
  opponentName: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  avgOpponentElo: number | null;
}
/** assembleOpponentRecordAnswer — "what's my record vs <name>?" G0. */
export function assembleOpponentRecordAnswer(r: OpponentRecordLike): GroundedAnswer | null {
  if (r.games <= 0) return null;
  const wdl = `${r.wins}W-${r.draws}D-${r.losses}L`;
  const elo = r.avgOpponentElo ? ` (averaging ${r.avgOpponentElo})` : '';
  const winRate = Math.round((r.wins / r.games) * 100);
  const suggest = r.wins > r.losses
    ? ` You have their number — keep doing what works.`
    : r.losses > r.wins
      ? ` They've had the better of it — worth reviewing those losses to find the pattern.`
      : ` Dead even — the next few games decide it.`;
  return {
    facts: `Against ${r.opponentName}${elo} you're ${wdl} across ${r.games} game${r.games === 1 ? '' : 's'} — ${winRate}%.` + suggest,
    bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'],
  };
}

/** Rating of the student's last move (computed by moveRating.ts). */
export interface MoveRatingLike {
  playedSan: string;
  wasBest: boolean;
  cpLoss: number;
  quality: 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
  betterSan: string | null;
  betterFromTo: { from: string; to: string } | null;
  missedMate: number | null;
  allowedMate: number | null;
}
/** assembleMoveRatingAnswer — "was that a good move?" G0. States the computed
 *  verdict, the eval swing, and the better move (with a green arrow) when the
 *  student missed it. No praise-for-praise — the verdict IS the content. */
export function assembleMoveRatingAnswer(r: MoveRatingLike): GroundedAnswer | null {
  const pawns = (r.cpLoss / 100).toFixed(1);
  const better = r.betterSan ? ` The engine preferred ${r.betterSan}.` : '';
  const arrow = r.betterSan && r.betterFromTo
    ? { bestMoveSan: r.betterSan, bestMoveFromTo: r.betterFromTo }
    : { bestMoveSan: null, bestMoveFromTo: null };

  let verdict: string;
  if (r.allowedMate !== null) {
    verdict = `${r.playedSan} walks into a forced mate in ${r.allowedMate}.${better}`;
  } else if (r.missedMate !== null) {
    verdict = `${r.playedSan} misses a forced mate in ${r.missedMate}.${better}`;
  } else if (r.wasBest || r.quality === 'best') {
    verdict = `${r.playedSan} was the engine's top move — you gave up nothing.`;
  } else if (r.quality === 'excellent') {
    verdict = `${r.playedSan} is within a whisker of best — about ${pawns} points.${better}`;
  } else if (r.quality === 'good') {
    verdict = `${r.playedSan} is fine; it cost only about ${pawns} points.${better}`;
  } else if (r.quality === 'inaccuracy') {
    verdict = `${r.playedSan} is a slight inaccuracy — it let about ${pawns} points slip.${better}`;
  } else if (r.quality === 'mistake') {
    verdict = `${r.playedSan} is a mistake: it cost about ${pawns} points.${better}`;
  } else {
    verdict = `${r.playedSan} is a blunder — it dropped about ${pawns} points.${better}`;
  }

  return { facts: verdict, ...arrow, sources: ['engine:stockfish'] };
}

/** Puzzle rating + solve stats. */
export interface PuzzleStatsLike {
  puzzleRating: number | null;
  totalAttempted: number;
  totalCorrect: number;
  overallAccuracy: number;
  duePuzzles: number;
  /** Mistake-puzzle progress from the student's own games (MistakeInsights). */
  mistakePuzzles?: { mastered: number; solved: number; unsolved: number };
}
/** assemblePuzzleStatsAnswer — "my puzzle rating / how many solved". G0. */
export function assemblePuzzleStatsAnswer(p: PuzzleStatsLike): GroundedAnswer | null {
  const mp = p.mistakePuzzles;
  const mpTotal = mp ? mp.mastered + mp.solved + mp.unsolved : 0;
  if (p.totalAttempted <= 0 && !(p.puzzleRating && p.puzzleRating > 0) && mpTotal <= 0) return null;
  const rating = p.puzzleRating && p.puzzleRating > 0 ? `Your puzzle rating is ${Math.round(p.puzzleRating)}.` : '';
  const solved = p.totalAttempted > 0 ? ` You've solved ${p.totalCorrect} of ${p.totalAttempted} (${p.overallAccuracy}%).` : '';
  const due = p.duePuzzles > 0 ? ` ${p.duePuzzles} are due to retry.` : '';
  const mistakeLine = mp && mpTotal > 0
    ? ` From your own games: ${mp.mastered} mistake puzzle${mp.mastered === 1 ? '' : 's'} mastered${mp.unsolved > 0 ? `, ${mp.unsolved} still to crack` : ''}.`
    : '';
  const suggest = p.duePuzzles > 0 || (mp?.unsolved ?? 0) > 0
    ? ' Clear your due and unsolved puzzles to lock the patterns in.'
    : ' Keep the daily streak going to push your rating up.';
  return { facts: (rating + solved + due + mistakeLine).trim() + suggest, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/** Tactic transfer gap (puzzle-strong / game-weak per motif). */
export interface TransferGapLike {
  /** The motif with the biggest positive transfer gap (good at puzzles, weak
   *  in games), or null if none is clearly worse in games. */
  worst: { tacticType: string; puzzleAccuracyPct: number; gameRecognitionPct: number; gapPoints: number } | null;
}
/** assembleTransferGapAnswer — "do I spot tactics in games as well as puzzles?". G0. */
export function assembleTransferGapAnswer(t: TransferGapLike): GroundedAnswer | null {
  const w = t.worst;
  if (!w || w.gapPoints < 10) return null;
  return {
    facts: `Your pattern knowledge is ahead of your board vision: you solve ${w.tacticType} puzzles at ${w.puzzleAccuracyPct}% but only spot them in your own games ${w.gameRecognitionPct}% of the time — a ${w.gapPoints}-point gap. Slow down and scan for ${w.tacticType}s in real games; the knowledge is there, the recognition isn't yet.`,
    bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'],
  };
}

/** The student's 5-axis skill radar (0-100 each) — from profile.skillRadar. */
export interface SkillRadarLike {
  opening: number; tactics: number; endgame: number; memory: number; calculation: number;
}
/**
 * assembleSkillRadarAnswer — "what's my skill breakdown / assess my chess?"
 * Voices the 5-axis skill radar, names the strongest + weakest axis, and points
 * the student at the weakest. Computed (weaknessAnalyzer.computeSkillRadar,
 * persisted on profile.skillRadar). Returns null when nothing's computed. G0.
 */
export function assembleSkillRadarAnswer(s: SkillRadarLike): GroundedAnswer | null {
  const axes: Array<{ name: string; v: number }> = [
    { name: 'opening', v: s.opening }, { name: 'tactics', v: s.tactics },
    { name: 'endgame', v: s.endgame }, { name: 'memory', v: s.memory },
    { name: 'calculation', v: s.calculation },
  ];
  if (axes.every((a) => !a.v || a.v <= 0)) return null;
  const readout = axes.map((a) => `${a.name} ${Math.round(a.v)}`).join(', ');
  const rated = axes.filter((a) => a.v > 0);
  const best = [...rated].sort((a, b) => b.v - a.v)[0];
  const worst = [...rated].sort((a, b) => a.v - b.v)[0];
  const facts =
    `Your skill breakdown (out of 100): ${readout}.` +
    (best && worst && best.name !== worst.name
      ? ` Your strongest is ${best.name} (${Math.round(best.v)}) and your weakest is ${worst.name} (${Math.round(worst.v)}) — that's where the fastest gains are.`
      : '') +
    (worst ? ` Put your training into ${worst.name}.` : '');
  return { facts, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

/**
 * assembleGameReviewAnswer — GROUNDED whole-game review from the COMPUTED engine
 * annotations (David 2026-07-09: "rip out the hallucinations"). The old review
 * free-LLM'd a narrative over the PGN ("explain WHY it was bad") — invented
 * reasoning. Here every fact is the engine's: the result, the error counts, and
 * each critical moment's move + eval + the engine's preferred move. The LLM only
 * phrases these; it never reasons about the game. Returns null when there are no
 * annotations to ground on.
 */
export function assembleGameReviewAnswer(opts: {
  white: string;
  black: string;
  /** The STUDENT's colour, when known. The verdict grades the STUDENT — an
   *  opponent's blunders must not inflate "significant issues to address" or an
   *  opponent's clean play credit the student (board-awareness sweep,
   *  2026-07-22). When absent, the verdict describes the GAME (both players),
   *  never a misattributed personal grade. */
  studentColor?: 'white' | 'black';
  result: string;
  moveCount: number;
  annotations: MoveAnnotation[] | null;
  /** The game PGN. When present, each critical moment is ROOTED in the engine-
   *  reasoning walk (David 2026-07-10: "root of review with coach's narration"):
   *  we reconstruct the position, convert the engine's best move to SAN, and name
   *  WHY the engine preferred it (fork/pin/wins/… via `describeMoveGeometry`)
   *  instead of dumping a raw UCI. Optional — without it the review still lists
   *  the moves + evals, just without the per-move geometry. */
  pgn?: string;
}): GroundedAnswer | null {
  const anns = opts.annotations;
  if (!anns || anns.length === 0) return null;

  // Reconstruct the position BEFORE each ply so a critical move's engine reason
  // (and its best-move SAN) can be computed from the board. Keyed moveNumber+color.
  const fenBeforeByKey = new Map<string, string>();
  if (opts.pgn) {
    try {
      const walk = new Chess();
      walk.loadPgn(opts.pgn);
      const history = walk.history({ verbose: true });
      const replay = new Chess();
      for (const h of history) {
        const moveNo = Number(h.before.split(' ')[5]) || 0;
        fenBeforeByKey.set(`${moveNo}:${h.color === 'w' ? 'white' : 'black'}`, h.before);
        replay.move(h.san);
      }
    } catch { /* bad PGN — reasons just won't be computed */ }
  }
  /** The engine's preferred move as SAN + the reason it's preferred (geometry). */
  const engineReason = (m: MoveAnnotation): { san: string; why: string | null } | null => {
    if (!m.bestMove || m.bestMove.length < 4) return null;
    const fenBefore = fenBeforeByKey.get(`${m.moveNumber}:${m.color}`);
    if (!fenBefore) return null;
    try {
      const c = new Chess(fenBefore);
      const u = m.bestMove;
      const mv = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? u[4] : undefined });
      if (!mv) return null;
      const why = describeMoveGeometry(fenBefore, mv.san, m.color);
      return { san: mv.san, why };
    } catch {
      return null;
    }
  };

  // COUNTERFACTUAL swing — what the move actually cost, in pawns, from the
  // MOVER's perspective (bestMoveEval = the eval best play would have kept;
  // evaluation = the eval after the move played; both White-POV centipawns).
  // This is the raw material for the coach's "had you found X…" beat — the
  // number IS the verdict, so the phrasing model never has to invent one.
  const swingPawns = (m: MoveAnnotation): number | null => {
    if (typeof m.evaluation !== 'number' || typeof m.bestMoveEval !== 'number') return null;
    const raw = m.color === 'white' ? m.bestMoveEval - m.evaluation : m.evaluation - m.bestMoveEval;
    return raw > 0 ? raw / 100 : null;
  };
  const fmtWhiteEval = (cp: number): string => `${cp > 0 ? '+' : ''}${(cp / 100).toFixed(1)} for White`;

  const blunders = anns.filter((a) => a.classification === 'blunder');
  const mistakes = anns.filter((a) => a.classification === 'mistake');
  const inaccuracies = anns.filter((a) => a.classification === 'inaccuracy');
  const total = blunders.length + mistakes.length + inaccuracies.length;

  const parts: string[] = [
    `Game: ${opts.white} (White) vs ${opts.black} (Black). Result: ${opts.result}. About ${opts.moveCount} moves.`,
    `Engine analysis (Stockfish), across both players: ${blunders.length} blunder(s), ${mistakes.length} mistake(s), ${inaccuracies.length} inaccuracy/inaccuracies.`,
  ];

  // Each critical moment is grounded: the move played, the eval AFTER it, and the
  // engine's preferred move. No free "why" — the eval swing + the better move ARE
  // the why.
  const critical = anns.filter(
    (a) => a.classification === 'blunder' || a.classification === 'mistake' || a.classification === 'brilliant',
  );
  if (critical.length > 0) {
    parts.push('Critical moments:');
    for (const m of critical.slice(0, 8)) {
      const dot = m.color === 'black' ? '…' : '.';
      const evalStr = m.evaluation !== null ? `eval ${m.evaluation > 0 ? '+' : ''}${(m.evaluation / 100).toFixed(1)} for White` : '';
      // ROOT the "why" in the engine-reasoning walk: name the engine's preferred
      // move in SAN + what it achieves (fork/pin/wins/…), not a raw UCI.
      const reason = engineReason(m);
      const bestStr = reason
        ? `the engine preferred ${reason.san}${reason.why ? `, which ${reason.why}` : ''}`
        : m.bestMove
          ? `the engine preferred ${m.bestMove}`
          : '';
      // The counterfactual anchor: what best play would have kept + the cost of
      // the move played, in real pawns. Only on genuine errors with both evals.
      const swing = m.classification === 'brilliant' ? null : swingPawns(m);
      const costStr = swing !== null && swing >= 0.5 && typeof m.bestMoveEval === 'number'
        // "points", not "pawns". These two sentences land in the SAME spoken
        // paragraph as the turning-point line below, and they disagreed —
        // "swung about 4.0 pawns" immediately followed by "about 4.0 points".
        // One unit per read; the app says points everywhere else.
        ? ` Best play here kept it at ${fmtWhiteEval(m.bestMoveEval)} — this one move swung about ${swing.toFixed(1)} point${swing >= 1.05 ? 's' : ''}.`
        : '';
      parts.push(`- Move ${m.moveNumber}${dot} ${m.san} — ${m.classification.toUpperCase()}${evalStr ? `, ${evalStr}` : ''}${bestStr ? `; ${bestStr}` : ''}.${costStr}`);
    }
    // Name THE turning point when the game had several costed moments — the
    // biggest single swing is the story's hinge, computed, never chosen by the LLM.
    const costed = critical
      .map((m) => ({ m, swing: m.classification === 'brilliant' ? null : swingPawns(m) }))
      .filter((x): x is { m: MoveAnnotation; swing: number } => x.swing !== null && x.swing >= 1.0)
      .sort((a, b) => b.swing - a.swing);
    if (costed.length >= 2) {
      const top = costed[0];
      const dot = top.m.color === 'black' ? '…' : '.';
      parts.push(`The turning point: move ${top.m.moveNumber}${dot} ${top.m.san} — the game's biggest single swing, about ${top.swing.toFixed(1)} points.`);
    }
  }

  // Honest, computed calibration — never "well played" when the engine
  // disagrees. The verdict grades the STUDENT: count only their errors when the
  // colour is known, so an opponent's blunders can't be read as the student's
  // (board-awareness sweep, 2026-07-22). When the colour is unknown, describe
  // the GAME (both players) rather than misattribute a personal grade.
  const sc = opts.studentColor;
  const myB = sc ? blunders.filter((a) => a.color === sc).length : blunders.length;
  const myM = sc ? mistakes.filter((a) => a.color === sc).length : mistakes.length;
  const myTotal = sc
    ? myB + myM + inaccuracies.filter((a) => a.color === sc).length
    : total;
  const verdict = sc
    ? (myB >= 2 ? 'Multiple blunders on your side — significant issues to address.'
      : myB === 1 ? 'One blunder was your main turning point.'
      : myM >= 2 ? 'A few mistakes cost you ground.'
      : myTotal <= 1 ? 'Cleanly played — very few engine-flagged errors from you.'
      : 'A solid game from you, with a few inaccuracies to tighten up.')
    : (myB >= 2 ? 'The game saw multiple blunders across both sides.'
      : myB === 1 ? 'One blunder was the main turning point of the game.'
      : myM >= 2 ? 'A few mistakes decided the balance.'
      : myTotal <= 1 ? 'A clean game — very few engine-flagged errors either side.'
      : 'A solid game with a few inaccuracies on the board.');
  parts.push(verdict);

  return { facts: parts.join('\n'), bestMoveSan: null, bestMoveFromTo: null, sources: ['engine:stockfish'] };
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA-CAPTURE for the previously-missing questions (David 2026-07-10: "add in
// the data capture to the missing questions"). Each is a PURE fact-computer over
// data the app already persists — G0: compute the fact in code, voiceFacts
// phrases it, the LLM decides nothing.
// ─────────────────────────────────────────────────────────────────────────────

/** Time-trouble profile — how often the student blunders on a low clock.
 *  Sourced from `detectTimeTrouble` (blunders made at/under LOW_TIME_MS crossed
 *  against per-ply `clockRemainingMs`). Answers "do I play too fast / flag / lose
 *  on time". */
export interface TimeTroubleLike {
  /** Blunders made at/under the low-time bar. */
  hits: number;
  /** Total analyzed blunders (the denominator for the share). */
  totalBlunders: number;
  /** How many of the student's games carry per-ply clock data. */
  gamesWithClock: number;
  /** The lowest clock (ms) a blunder was made on, if any. */
  lowestClockMs: number | null;
}
export function assembleTimeTroubleAnswer(t: TimeTroubleLike): GroundedAnswer | null {
  // No clock data at all → nothing to compute (the caller serves a no-data line).
  if (t.gamesWithClock <= 0) return null;
  if (t.hits <= 0) {
    const facts =
      `Across your ${t.gamesWithClock} game${t.gamesWithClock === 1 ? '' : 's'} with clock data, ` +
      `none of your blunders came in time trouble — your errors aren't clock-driven, so slowing down isn't the fix here.`;
    return { facts, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games', 'engine:stockfish'] };
  }
  const share = t.totalBlunders > 0 ? Math.round((t.hits / t.totalBlunders) * 100) : 0;
  const shareStr = share > 0 ? ` — about ${share}% of your analyzed blunders` : '';
  const lowest = typeof t.lowestClockMs === 'number'
    ? ` Your worst came with just ${Math.max(0, Math.round(t.lowestClockMs / 1000))} seconds left.`
    : '';
  const facts =
    `${t.hits} of your blunders came in time trouble${shareStr} — mistakes made with under 30 seconds on the clock.` +
    lowest +
    ` That's a clock-management leak: bank time earlier so you're not deciding critical moves on the increment.`;
  return { facts, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games', 'engine:stockfish'] };
}

/** Most-recent-game result — answers "did I win my last game / what was the
 *  result / how did my last game go". Pure formatter over the latest game record. */
export interface LastGameLike {
  outcome: 'win' | 'loss' | 'draw';
  playerColor: 'white' | 'black';
  opponent?: string | null;
  opening?: string | null;
  /** Human phrase for how it ended ("checkmate", "resignation", "on time", …). */
  endReason?: string | null;
  movesPlayed?: number | null;
}
export function assembleLastGameAnswer(g: LastGameLike | null): GroundedAnswer | null {
  if (!g) return null;
  const verb = g.outcome === 'win' ? 'won' : g.outcome === 'loss' ? 'lost' : 'drew';
  const vs = g.opponent ? ` against ${g.opponent}` : '';
  const as = ` as ${g.playerColor}`;
  const opn = g.opening ? ` in the ${g.opening}` : '';
  const how = g.endReason ? ` (${g.endReason})` : '';
  const len = typeof g.movesPlayed === 'number' && g.movesPlayed > 0 ? ` after ${g.movesPlayed} moves` : '';
  const facts = `Your last game: you ${verb}${as}${vs}${opn}${how}${len}.`;
  return { facts, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:your-games'] };
}

// ─────────────────────────────────────────────────────────────────────────────
// POSITIONAL-FEATURE answers (David 2026-07-10: "make sure the answers are
// calculated with the correct deterministic data"). The eval-only
// assemblePositionAssessment answers "who's winning" but NOT "who controls the
// center / how many pieces / is my structure sound" — those need the STATIC
// features, computed here from the FEN via positionReadingService (pure
// chess.js — same module for every static feature this function reads, per
// David 2026-08-14: "all the coding in one place so knowledge doesn't get
// forgotten in a different file". This used to split material/center off into
// a separate positionAssessor.ts with its own duplicate pawn-structure/king-
// safety logic that nothing ever read — deleted; countMaterial/
// centralPieceCount now live alongside the rest of this file's static reads.
// ─────────────────────────────────────────────────────────────────────────────
import { findPieceQuality, findWeakPawns, developmentRead, kingSafetyRead, countMaterial, centralPieceCount } from './positionReadingService';

export type PositionalTopic = 'material' | 'center' | 'development' | 'structure' | 'king' | 'piece';

const PIECE_WORD: Record<string, string> = { p: 'pawns', n: 'knights', b: 'bishops', r: 'rooks', q: 'queen', k: 'king' };

export function assemblePositionalAnswer(fen: string, studentColor: 'white' | 'black', topic: PositionalTopic, ask?: string): GroundedAnswer | null {
  let a: ReturnType<typeof countMaterial>;
  try { a = countMaterial(fen); } catch { return null; }

  // FALSE-PREMISE CHECK (2026-08-13 audit): "is my queen on h5 well placed?"
  // at the start position must be CORRECTED from the board, never answered as
  // if the premise were true (and never topic-switched to the best move). When
  // the ask names a piece ON a square, verify it — a mismatch is itself the
  // grounded answer.
  if (topic === 'piece' && ask) {
    const m = ask.toLowerCase().match(/\b(queen|rook|bishop|knight|pawn|king)\s+(?:on|at)\s+([a-h][1-8])\b/);
    if (m) {
      const LETTER: Record<string, string> = { queen: 'q', rook: 'r', bishop: 'b', knight: 'n', pawn: 'p', king: 'k' };
      const wanted = LETTER[m[1]];
      const sq = m[2];
      try {
        const board = new Chess(fen);
        const cell = board.get(sq as Parameters<Chess['get']>[0]);
        const myC2: 'w' | 'b' = studentColor === 'white' ? 'w' : 'b';
        if (!cell || cell.type !== wanted || cell.color !== myC2) {
          const actual = cell
            ? `${cell.color === myC2 ? 'your' : "your opponent's"} ${REVIEW_PIECE_NAME[cell.type] ?? cell.type} is on ${sq}`
            : `${sq} is empty`;
          // Where IS their piece of that type? Name real squares only.
          const homes: string[] = [];
          for (const row of board.board()) {
            for (const c of row) {
              if (c && c.type === wanted && c.color === myC2) homes.push(c.square);
            }
          }
          const whereabouts = homes.length
            ? ` Your ${m[1]}${homes.length > 1 ? 's are' : ' is'} on ${homes.join(' and ')}.`
            : ` You have no ${m[1]} on the board.`;
          return {
            facts: `Your ${m[1]} isn't on ${sq} — ${actual}.${whereabouts}`,
            bestMoveSan: null, bestMoveFromTo: null, sources: ['board:chess.js'],
          };
        }
      } catch { /* bad fen — fall through to the generic read */ }
    }
  }
  const me = studentColor;
  const opp = studentColor === 'white' ? 'black' : 'white';
  const myC: 'w' | 'b' = me === 'white' ? 'w' : 'b';
  const src = ['board:chess.js'];

  if (topic === 'material') {
    const adv = me === 'white' ? a.advantage : -a.advantage;
    const mineCount = me === 'white' ? a.material.white : a.material.black;
    const pieces = (['q', 'r', 'b', 'n', 'p'] as const)
      .filter((p) => (mineCount[p] ?? 0) > 0)
      .map((p) => `${mineCount[p]} ${PIECE_WORD[p]}`)
      .join(', ');
    const balance = adv === 0 ? 'Material is even.' : adv > 0 ? `You're up ${adv} point${adv === 1 ? '' : 's'} of material.` : `You're down ${Math.abs(adv)} point${Math.abs(adv) === 1 ? '' : 's'} of material.`;
    return { facts: `${balance} You have ${pieces}.`, bestMoveSan: null, bestMoveFromTo: null, sources: src };
  }

  if (topic === 'center') {
    const central = centralPieceCount(fen);
    const mine = me === 'white' ? central.white : central.black;
    const theirs = me === 'white' ? central.black : central.white;
    const verdict = mine > theirs ? `you control the center` : mine < theirs ? `${opp} controls the center` : `the center is contested`;
    return { facts: `You have ${mine} piece${mine === 1 ? '' : 's'} bearing on the centre to ${opp}'s ${theirs} — ${verdict}.`, bestMoveSan: null, bestMoveFromTo: null, sources: src };
  }

  if (topic === 'development') {
    const d = developmentRead(fen, myC);
    if (!d) return null;
    const castled = d.castled ? 'and you have castled' : 'and you have not castled yet';
    return { facts: `You've developed ${d.developedMinors} of your ${d.totalMinors} minor pieces ${castled}.`, bestMoveSan: null, bestMoveFromTo: null, sources: src };
  }

  if (topic === 'structure') {
    const wp = findWeakPawns(fen, myC);
    const iso = wp.isolated.length ? `isolated pawn${wp.isolated.length === 1 ? '' : 's'} on ${wp.isolated.join(', ')}` : '';
    const dbl = wp.doubled.length ? `doubled pawn${wp.doubled.length === 1 ? '' : 's'} on ${wp.doubled.join(', ')}` : '';
    const bwd = wp.backward.length ? `backward pawn${wp.backward.length === 1 ? '' : 's'} on ${wp.backward.join(', ')}` : '';
    const faults = [iso, dbl, bwd].filter(Boolean).join(' and ');
    return { facts: faults ? `Your pawn structure has ${faults}.` : `Your pawn structure is sound — no isolated, doubled, or backward pawns.`, bestMoveSan: null, bestMoveFromTo: null, sources: src };
  }

  if (topic === 'king') {
    // kingSafetyRead is the ONE king-safety read now — it already carries
    // castled + exposed (this used to also cross-check a duplicate castled/
    // exposed pair computed independently in the deleted positionAssessor.ts;
    // the two rarely disagreed, and when they did there was no reason to
    // prefer one over the other — one computer, one answer).
    const k = kingSafetyRead(fen, myC);
    const castled = k?.castled ?? false;
    const exposed = k?.exposed ?? false;
    const detail = exposed ? ' Its pawn shield is compromised.' : '';
    return { facts: `Your king is ${castled ? 'castled' : 'not castled'} and ${exposed ? 'looks exposed' : 'reasonably safe'}.${detail}`, bestMoveSan: null, bestMoveFromTo: null, sources: src };
  }

  // piece quality
  const quality = findPieceQuality(fen).filter((q) => q.color === myC);
  if (quality.length === 0) return { facts: `None of your pieces stand out as especially good or bad right now.`, bestMoveSan: null, bestMoveFromTo: null, sources: src };
  const good = quality.filter((q) => q.quality === 'good').map((q) => `${PIECE_WORD[q.piece] ?? q.piece} on ${q.square} (${q.reason})`);
  const bad = quality.filter((q) => q.quality === 'bad').map((q) => `${PIECE_WORD[q.piece] ?? q.piece} on ${q.square} (${q.reason})`);
  const g = good.length ? `Well-placed: your ${good.join(', ')}.` : '';
  const b = bad.length ? `Poorly-placed: your ${bad.join(', ')}.` : '';
  return { facts: [g, b].filter(Boolean).join(' '), bestMoveSan: null, bestMoveFromTo: null, sources: src };
}

// ═══ COUNTER-REPERTOIRE RECOMMENDATION (David 2026-07-15) — "what should I
// play against the Pirc?" answered with the app's curated counter-repertoire,
// style-matched to the student's own Stockfish-classified game profile, and
// backed by honest anonymous stats. NEVER a pro's name in the phrasing. ═══

/** One curated recommendation, a structural subset of CounterRecommendation. */
export interface CounterRecLike {
  openingId: string;
  name: string;
  styleTags: ReadonlyArray<string>;
  stat?: { games: number; scorePct: number } | null;
}

/** The student's aggregated style profile (getPlayerStyleProfile). */
export interface StyleProfileLike {
  style: string;
  count: number;
  total: number;
}

/** Style clusters for matching a player profile to a recommendation's tags:
 *  the attacking cluster and the quiet cluster. Same vocabulary as
 *  gameStyleClassifier. */
const ATTACKING_STYLES = new Set(['tactical', 'aggressive', 'sharp']);
const QUIET_STYLES = new Set(['positional', 'solid']);

function styleMatches(profileStyle: string, tags: ReadonlyArray<string>): boolean {
  const attacking = ATTACKING_STYLES.has(profileStyle);
  const quiet = QUIET_STYLES.has(profileStyle);
  return tags.some((t) => (attacking && ATTACKING_STYLES.has(t)) || (quiet && QUIET_STYLES.has(t)));
}

const STYLE_WORD: Record<string, string> = {
  tactical: 'tactical', aggressive: 'aggressive', sharp: 'sharp',
  positional: 'positional', solid: 'solid',
};

/**
 * pickCounterRecommendation — the ONE selection rule shared by the answer
 * prose and the action chip (they must never disagree): exactly one
 * style-matched line → that line; otherwise the first (curated order).
 * Null only when the list is empty.
 */
export function pickCounterRecommendation(
  recs: ReadonlyArray<CounterRecLike>,
  profile: StyleProfileLike | null | undefined,
): CounterRecLike | null {
  const pool = recs.filter((r) => r.name && r.openingId);
  if (pool.length === 0) return null;
  if (pool.length === 1 || !profile) return pool[0];
  const matched = pool.filter((r) => styleMatches(profile.style, r.styleTags));
  if (matched.length === 1) return matched[0];
  return pool[0];
}

/** Anonymous corpus stat — the phrasing contract bans pro names. */
function statClause(stat: { games: number; scorePct: number } | null | undefined): string {
  if (!stat || stat.games <= 0) return '';
  return ` — it scores ${stat.scorePct}% across ${stat.games.toLocaleString()} games at grandmaster level`;
}

/**
 * assembleCounterRepertoireAnswer — the grounded "what should I play against
 * X?" answer (David 2026-07-15, after the live coach answered the Pirc ask
 * with a bare "e4, +0.6" position eval). Selection logic is ALL here in code:
 * one recommendation → recommend it; two → name BOTH and pick the one whose
 * styleTags match the student's own Stockfish-classified style profile (or
 * the first, style-neutral, when no profile / no match). Stats are the honest
 * curated corpus numbers + the student's own matchup score. First-person coach
 * voice, anonymous stats, never a pro's name (the phrasing contract). The LLM
 * only rephrases downstream (G0).
 */
export function assembleCounterRepertoireAnswer(opts: {
  opponentDisplayName: string;
  studentSide: 'white' | 'black';
  recommendations: ReadonlyArray<CounterRecLike>;
  userMatchup?: { winRate: number; games: number } | null;
  styleProfile?: StyleProfileLike | null;
}): GroundedAnswer | null {
  const recs = opts.recommendations.filter((r) => r.name && r.openingId);
  if (recs.length === 0) return null;

  const matchup = opts.userMatchup && opts.userMatchup.games > 0
    ? ` In your own games you score ${opts.userMatchup.winRate}% against it over ${opts.userMatchup.games} game${opts.userMatchup.games === 1 ? '' : 's'} — that's the gap this plugs.`
    : '';

  if (recs.length === 1) {
    const r = recs[0];
    const facts =
      `Against ${opts.opponentDisplayName}, based on how I teach it, I recommend ${r.name}${statClause(r.stat)}.${matchup}` +
      ` Want to learn it? I have the full line ready for you.`;
    return { facts, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:counter-repertoire'] };
  }

  // Two (or more — present the top two) recommendations.
  const [a, b] = recs;
  const styleWordFor = (r: CounterRecLike): string => STYLE_WORD[r.styleTags[0]] ?? r.styleTags[0] ?? '';
  const profile = opts.styleProfile ?? null;
  const aMatch = profile ? styleMatches(profile.style, a.styleTags) : false;
  const bMatch = profile ? styleMatches(profile.style, b.styleTags) : false;
  // Exactly one style-matched line → it's the pick, and the style is the
  // stated reason. Otherwise default to the first (curated order) neutrally.
  const pick = pickCounterRecommendation(recs, profile) ?? a;
  const styleReason = profile && (aMatch !== bMatch)
    ? ` Your own games lean ${STYLE_WORD[profile.style] ?? profile.style} (${profile.count} of your last ${profile.total} analyzed), so I'd start with ${pick.name}`
    : ` I'd start with ${pick.name}`;

  const facts =
    `I teach two answers to ${opts.opponentDisplayName}: ${a.name} (${styleWordFor(a)}) and ${b.name} (${styleWordFor(b)}).` +
    `${styleReason}${statClause(pick.stat)}.${matchup}` +
    ` Want to learn it? I have the full line ready for you.`;
  return { facts, bestMoveSan: null, bestMoveFromTo: null, sources: ['data:counter-repertoire'] };
}

/**
 * seatPieceReferences — the deterministic MINE/YOURS layer (David 2026-07-21:
 * "ship the correct answer to the LLM — build the deterministic mine/yours
 * guard into the package"). Tactic descriptions come out of the detector
 * seatless ("Bishop on c5 pins pawn on f2 against king on g1"), which left
 * the house-voice model to INVENT the possessive — and it flipped seats
 * (G0 violation: the LLM was deciding). This computes the owner of every
 * "<piece> on <square>" reference from the BOARD and stamps your/their into
 * the fact itself, so the model is handed the seat and never chooses one.
 * References already carrying a possessive, and mismatched/vacated squares,
 * are left untouched. Pure chess.js; on any parse problem the text ships
 * unchanged.
 */
export function seatPieceReferences(
  text: string,
  fen: string,
  studentColorWB: 'w' | 'b',
): string {
  try {
    const board = new Chess(fen);
    const WANT: Record<string, string> = { knight: 'n', bishop: 'b', rook: 'r', queen: 'q', pawn: 'p', king: 'k' };
    // Structural adjectives the composed facets place BETWEEN a possessive and
    // the piece noun ("your PASSED pawn", "their WEAK pawn"). Captured as part of
    // the lead so a possessive already present isn't re-stamped into a
    // double-possessive — "your passed YOUR pawn on c2" (preview line-read,
    // 2026-07-22).
    const ADJ = 'passed|weak|isolated|doubled|backward|extra|lone|bad|connected|protected|central|advanced|remaining|outside';
    return text.replace(
      new RegExp(
        `(\\b[Yy]our opponent's\\s+|\\b[Yy]our\\s+|\\b[Tt]heir\\s+|\\b[Tt]he\\s+|\\b[Aa]n?\\s+)?((?:${ADJ})\\s+)?\\b(Knight|Bishop|Rook|Queen|Pawn|King|knight|bishop|rook|queen|pawn|king)\\s+on\\s+([a-h][1-8])\\b`,
        'g',
      ),
      (whole, lead: string | undefined, adj: string | undefined, piece: string, sq: string) => {
        const leadLower = (lead ?? '').toLowerCase().trim();
        // Already seated — leave the author's possessive (and any adjective it
        // introduced) alone.
        if (leadLower.startsWith('your') || leadLower.startsWith('their')) return whole;
        // An INDEFINITE article ("creates a passed pawn on c2") is already
        // grammatical — stamping a possessive after it produced "a your passed
        // pawn on c2" (prod line-read, 2026-07-23). Leave indefinite phrases be.
        if (leadLower === 'a' || leadLower === 'an') return whole;
        const cell = board.get(sq as Square);
        if (!cell || cell.type !== WANT[piece.toLowerCase()]) return whole;
        const owner = cell.color === studentColorWB ? 'your' : 'their';
        const firstChar = (lead && lead.length > 0 ? lead : (adj && adj.length > 0 ? adj : piece)).charAt(0);
        const sentenceStart = firstChar === firstChar.toUpperCase();
        const ownerWord = sentenceStart ? cap(owner) : owner;
        // Preserve a bare adjective (rare "the passed pawn" form) after the owner.
        return `${ownerWord} ${adj ? adj.toLowerCase() : ''}${piece.toLowerCase()} on ${sq}`;
      },
    );
  } catch {
    return text;
  }
}

/**
 * describeStudentThreat — THE THREAT CALL-OUT (David 2026-07-21, emphatic:
 * "The coach should identify my threat and call it out!!"). After the
 * student's move, compute the biggest immediate threat the move CREATED —
 * mate-in-one, a safe royal fork, or a capture that wins clean material —
 * by giving the student a hypothetical second move in a row (null-move
 * scan). Board-provable only (chess.js + SEE + the fork-safety check); the
 * Berlin case this exists for: after ...Bc5, ...Nxf2 wins the f2 pawn and
 * forks queen and rook, and the king cannot recapture because the c5
 * bishop covers f2 — a threat the review walked straight past.
 *
 * Returns null when: the position is in check (the check IS the story),
 * no qualifying threat exists, or the same threat already existed before
 * the move (never re-narrate a standing threat every ply).
 */
/** A detected NEW threat, as structured board truth — the PACKAGE the voice
 *  is handed (David 2026-07-22: "delivered in the package! BEFORE THE
 *  DECISION!"): kind, landing square, fork targets, and the squares that
 *  GUARD the landing square, so prevention and recognition teaching are
 *  computed, never improvised. */
export interface DetectedThreat {
  san: string;
  detail: string;
  kind: 'mate' | 'fork' | 'capture';
  /** The threatening piece's ORIGIN square — for drawing the threat arrow
   *  (from → landing) on the board so the threat is SHOWN, not just spoken
   *  (David 2026-07-24: "no threat detection" — it fired in audio but nothing
   *  was drawn). */
  from: string;
  /** The threatening piece's landing square. */
  landing: string;
  /** Fork victims ("queen on d1"), empty for non-forks. */
  targets: string[];
  /** The SQUARES of the fork victims (for highlighting them on the board),
   *  parallel to `targets`. Empty for non-forks. */
  targetSquares: string[];
  /** Squares of the mover's pieces that DEFEND the landing square — the
   *  foundation a defender can undermine (the Berlin Bc5 guarding f2). */
  guards: string[];
  rank: number;
}

/** detectNewThreat — the structured core of the threat call-out: the biggest
 *  NEW threat `moverWB`'s move created (mate-in-one / safe royal fork / clean
 *  SEE-verified capture), via the null-move scan. Side-agnostic: pass the
 *  student's color for "you're threatening", the opponent's for "their move
 *  threatens" + the prevention teaching. Null when nothing qualifies, the
 *  position is in check, or the same threat existed before the move. */
export function detectNewThreat(
  fenBefore: string,
  fenAfter: string,
  moverWB: 'w' | 'b',
): DetectedThreat | null {
  try {
    const after = new Chess(fenAfter);
    if (after.inCheck()) return null; // the check is already the narration
    const findBest = (fen: string): DetectedThreat | null => {
      let c: Chess;
      try { c = new Chess(fen); } catch { return null; }
      if (c.turn() !== moverWB || c.inCheck() || c.isGameOver()) return null;
      let best: DetectedThreat | null = null;
      const enemy: 'w' | 'b' = moverWB === 'w' ? 'b' : 'w';
      const guardsOf = (sim: Chess, sq: string): string[] =>
        sim.attackers(sq as Square, moverWB).filter((g) => g !== sq);
      for (const mv of c.moves({ verbose: true })) {
        const sim = new Chess(fen);
        let played: ReturnType<Chess['move']> | null = null;
        try { played = sim.move(mv.san); } catch { continue; }
        if (!played) continue;
        // Mate-in-one: the highest-ranked threat, always safe to name.
        if (sim.isCheckmate()) {
          best = { san: mv.san, detail: 'delivers checkmate', kind: 'mate', from: played.from, landing: played.to, targets: [], targetSquares: [], guards: guardsOf(sim, played.to), rank: 1000 };
          break;
        }
        // Safe royal fork from the landing square (king + major, or two majors),
        // un-takeable with profit.
        const majors: string[] = [];
        const majorSquares: string[] = [];
        let kingSquare: string | null = null;
        let hitsKing = false;
        for (const row of sim.board()) {
          for (const cell of row) {
            if (!cell || cell.color !== enemy) continue;
            if (cell.type !== 'k' && cell.type !== 'q' && cell.type !== 'r') continue;
            if (!sim.attackers(cell.square, moverWB).includes(played.to)) continue;
            if (cell.type === 'k') { hitsKing = true; kingSquare = cell.square; }
            else { majors.push(`${cell.type === 'q' ? 'queen' : 'rook'} on ${cell.square}`); majorSquares.push(cell.square); }
          }
        }
        if ((hitsKing && majors.length >= 1) || majors.length >= 2) {
          if (seeGain(sim, played.to) <= 0) {
            const capBit = played.captured ? `wins the ${REVIEW_PIECE_NAME[played.captured]} on ${played.to} and ` : '';
            // SEAT-NEUTRAL victims ("the king", "the queen on d1") — this
            // detector is side-agnostic (called for BOTH the student's threats
            // AND the opponent's). Baking "their king" made "their move
            // threatens … forks THEIR king" read as the opponent's own king
            // when it is in fact the STUDENT's (board-awareness sweep,
            // 2026-07-22). The consumer's framing ("you're threatening" /
            // "their move threatens") already carries whose move it is.
            const forkTargets = hitsKing ? `the king and ${majors[0]}` : `the ${majors.join(' and ')}`;
            const rank = 500 + (played.captured ? PIECE_VALUE_LOCAL[played.captured] ?? 0 : 0);
            if (!best || rank > best.rank) {
              best = { san: mv.san, detail: `${capBit}forks ${forkTargets}`, kind: 'fork', from: played.from, landing: played.to, targets: hitsKing ? ['the king', majors[0]] : majors, targetSquares: hitsKing ? [kingSquare as string, ...(majorSquares[0] ? [majorSquares[0]] : [])] : majorSquares, guards: guardsOf(sim, played.to), rank };
            }
            continue;
          }
        }
        // Clean material win: a capture whose static exchange nets a piece —
        // AND survives the opponent's immediate counter-tactics (the same
        // verification the cost clause gets; a poisoned Qxb2-style grab must
        // never be narrated as a threat).
        if (played.captured) {
          const net = seeGain(c, mv.to);
          if (net >= 3 && (!best || net > best.rank)
            && !captureHasCounterTactic(fen, mv.san, moverWB === 'w' ? 'b' : 'w', net)) {
            best = { san: mv.san, detail: `wins the ${REVIEW_PIECE_NAME[played.captured]} on ${mv.to}`, kind: 'capture', from: mv.from, landing: mv.to, targets: [], targetSquares: [], guards: guardsOf(sim, mv.to), rank: net };
          }
        }
      }
      return best;
    };
    // Flip the side to move so the mover "moves again" — the threat scan.
    const parts = fenAfter.split(' ');
    parts[1] = moverWB;
    parts[3] = '-'; // clear en passant — not meaningful for a null-move scan
    const threat = findBest(parts.join(' '));
    if (!threat) return null;
    // NEW threats only — a threat that already existed before the move was
    // not created by it, and re-narrating a standing threat every ply is
    // noise (the repetition class).
    const prior = findBest(fenBefore);
    if (prior && prior.san === threat.san) return null;
    return threat;
  } catch {
    return null;
  }
}

/** The student-voice phrasing of detectNewThreat (back-compat wrapper). */
export function describeStudentThreat(
  fenBefore: string,
  fenAfter: string,
  studentWB: 'w' | 'b',
): string | null {
  const t = detectNewThreat(fenBefore, fenAfter, studentWB);
  return t ? `you're now threatening ${t.san} — it ${t.detail}` : null;
}

const PIECE_VALUE_LOCAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/**
 * describeThreatRecognition — TEACH THE PATTERN (David 2026-07-22: "TEACH the
 * user how to identify and prevent it"). Names the board geometry that made
 * the threat possible, computed from the DetectedThreat package — the
 * precursor the student should learn to SEE before it lands.
 */
export function describeThreatRecognition(
  threat: DetectedThreat,
  fenAfter: string,
  victimWB: 'w' | 'b',
): string | null {
  try {
    const c = new Chess(fenAfter);
    if (threat.kind === 'fork') {
      const victimGuards = c.attackers(threat.landing as Square, victimWB).length;
      const guardBit = victimGuards === 0
        ? `and nothing of yours covers ${threat.landing}`
        : threat.guards.length > 0
          ? `and ${threat.landing} is backed up by their piece on ${threat.guards[0]}`
          : `even though you cover ${threat.landing}`;
      // The geometry depends on the FORKING PIECE — "one knight's-hop" is only
      // true for a knight fork; detectNewThreat scans EVERY piece's moves, so a
      // queen/rook/bishop fork must not get the knight's-hop lie (board-awareness
      // sweep, 2026-07-22). Read the forker's type from the THREAT'S SAN — the
      // piece that MOVES — not off the landing square: on a capture-fork
      // (Nxf2) the landing square still holds the VICTIM (the f2 pawn), so
      // reading it there misread the knight as a pawn and dropped the
      // knight's-hop geometry entirely (fidelity test, Berlin ...Bc5→Nxf2).
      const sanPieceLetter = /^([NBRQK])/.exec(threat.san);
      const forkerType = sanPieceLetter ? sanPieceLetter[1].toLowerCase() : 'p';
      const geom = forkerType === 'n'
        ? `sitting one knight's-hop from ${threat.landing}`
        : forkerType === 'p'
          ? `both caught by a pawn on ${threat.landing}`
          : `both in the ${REVIEW_PIECE_NAME[forkerType]}'s line from ${threat.landing}`;
      return `the pattern to spot: ${threat.targets.join(' and ')} ${geom}, ${guardBit} — that alignment IS the fork, a move before it lands`;
    }
    if (threat.kind === 'capture') {
      const cell = c.get(threat.landing as Square);
      const noun = cell ? REVIEW_PIECE_NAME[cell.type] : 'piece';
      // The capture threat gates on SEE net ≥ 3 — which a DEFENDED high-value
      // victim (NxQ, queen guarded by a pawn) satisfies. "sits loose /
      // undefended" was then false on the very piece it teaches (board-awareness
      // sweep, 2026-07-22). Check the actual defence and word it honestly.
      const defended = c.attackers(threat.landing as Square, victimWB).length > 0;
      return defended
        ? `the pattern to spot: the ${noun} on ${threat.landing} is worth more than what attacks it — an under-defended high-value piece falls to a cheaper attacker`
        : `the pattern to spot: the ${noun} on ${threat.landing} sits loose — an undefended piece is a standing invitation, and tactics find it`;
    }
    // Mate threat: don't assert the flight squares are ALREADY gone (a supported
    // mate removes them only when it arrives) — teach the habit, not a false
    // current-board claim (board-awareness sweep, 2026-07-22).
    return `the pattern to spot: a mating net is forming around the king — count its flight squares before the checks start, because that's what runs out`;
  } catch {
    return null;
  }
}

/**
 * describeThreatPrevention — TEACH THE DEFENSE. Given the DetectedThreat
 * package and the engine's stored best reply (delivered in the package — the
 * next ply's analysis, no fresh search), name HOW the defense meets the
 * threat, computed from the board:
 *   • undermines the guard — the defense attacks a piece that backs the
 *     threat's landing square (the Berlin d4! hitting the c5 bishop that
 *     guarded f2);
 *   • covers the landing square — the square gains a defender and the tactic
 *     no longer wins the exchange;
 *   • moves the target — a forked piece steps off the alignment;
 *   • else, verified relief — the threat simply no longer works after it.
 * Null when the defense doesn't verifiably address the threat (never claim a
 * defense the board can't prove).
 */
export function describeThreatPrevention(
  fenAfter: string,
  threat: DetectedThreat,
  defenseSan: string,
  threatWB: 'w' | 'b',
): string | null {
  try {
    const c = new Chess(fenAfter);
    const def = c.move(defenseSan);
    if (!def) return null;
    const defenderWB: 'w' | 'b' = threatWB === 'w' ? 'b' : 'w';
    // (0) The threatened piece ITSELF steps out of danger — the defense move
    // vacates the landing square. "adding a defender to <square>" is FALSE here:
    // the square is now empty, so the piece that just fled cannot be said to
    // "defend" it (audit 2026-07-24: Qb3 / Nf6 / Re8 / Bxe6 were each wrongly
    // said to "add a defender" to the very square they FLED). Describe the escape.
    if (def.from === threat.landing) {
      const cap = def.captured ? `, grabbing the ${REVIEW_PIECE_NAME[def.captured]} on ${def.to} on the way` : '';
      return `${defenseSan} gets the ${REVIEW_PIECE_NAME[def.piece]} out of the fire${cap}`;
    }
    // (1) Undermine the guard: the defense attacks a guard of the landing sq.
    // "holding the WHOLE combination together" is only true when there is a
    // SINGLE guard — hitting one of two dismantles nothing (board-awareness
    // sweep, 2026-07-22).
    for (const g of threat.guards) {
      const cell = c.get(g as Square);
      if (cell && cell.color === threatWB && c.attackers(g as Square, defenderWB).includes(def.to)) {
        const soleGuard = threat.guards.length === 1;
        return soleGuard
          ? `${defenseSan} meets it by hitting the ${REVIEW_PIECE_NAME[cell.type]} on ${g} — the piece holding the whole thing together`
          : `${defenseSan} meets it by hitting the ${REVIEW_PIECE_NAME[cell.type]} on ${g}, one of the pieces backing it up`;
      }
    }
    // (2) Cover the landing square: it gains a defender from the defense. Don't
    // over-claim "no longer safe" (a knight winning a defended queen still
    // wins even with an added defender) and don't call it "the fork square"
    // when the threat was a capture/mate — describe what the move DID
    // (board-awareness sweep, 2026-07-22).
    if (c.attackers(threat.landing as Square, defenderWB).includes(def.to)) {
      return `${defenseSan} meets it by adding a defender to ${threat.landing}, the square the threat needed`;
    }
    // (3) Move the target: a forked piece stepped off the alignment.
    for (const t of threat.targets) {
      const sq = t.match(/on ([a-h][1-8])/)?.[1];
      if (sq && def.from === sq) {
        return `${defenseSan} meets it by stepping the ${t.replace(/ on [a-h][1-8]/, '')} off the forking alignment`;
      }
    }
    // (4) Verified relief: the threat move no longer works at all.
    const flip = c.fen().split(' ');
    flip[1] = threatWB;
    flip[3] = '-';
    try {
      const probe = new Chess(flip.join(' '));
      if (!probe.inCheck()) {
        const still = probe.moves().some((m) => m.replace(/[+#!?]+$/, '') === threat.san.replace(/[+#!?]+$/, ''));
        if (!still) return `${defenseSan} takes ${threat.san} off the board entirely`;
      }
    } catch { /* fall through */ }
    return null; // the defense fights elsewhere — don't claim what the board can't prove
  } catch {
    return null;
  }
}
