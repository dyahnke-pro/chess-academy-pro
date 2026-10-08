/**
 * kidGameCoach — the LIVE, kid-safe, GROUNDED coach voice for the kid
 * "Play Game" surface (`/kid/play-games/:gameId`, GuidedGamePage).
 *
 * This is the kid-mode equivalent of the adult Play/Learn-with-Coach voice
 * (coachMoveCommentary / useLiveCoach), built to the LOCKED kid contract:
 *
 *   • The move narration, the instruction and the wrong-move nudge are
 *     COMPUTED (the authored note, else chess.js words) — no model call. The
 *     model used to "rephrase" them freely, which is chess content the board
 *     never produced (kid P0, G0); removed 2026-10-08.
 *   • The question box phrases computed facts through `voiceFacts({kidSafe})`
 *     only (`kidBoardAnswers`). Importing the adult coach chat entry point here
 *     is BANNED (kid non-negotiable #3).
 *   • Every output is sanitized (`sanitizeKidCoachText`) and falls back to the
 *     hand-authored static text on ANY anomaly (empty / no-key banner / SAN
 *     leak / over-length / throw). A hallucination in kid mode is a P0 bug —
 *     the authored text is always the safety net.
 *   • No per-move praise (kid #5) — the line restates the move's EFFECT.
 */
import { Chess } from 'chess.js';
import { voiceFacts } from './coachApi';
import { logAppAudit } from './appAuditor';
import { buildQuestionGrounding } from '../coach/questionIntents';
import { assembleConceptAnswer, assembleTeachingAnswer, assembleAppHelpAnswer } from './groundedAnswer';
import { detectConceptsInText, getConcept, resolveOpeningIdFromName } from './chessConceptService';
import { getLessonScript } from '../data/lessons';
import { getOpeningById } from './openingService';
import { matchRouteByTopic } from './navigationRouter';
import { APP_ROUTES_MANIFEST } from '../data/appRoutesManifest';
import {
  classifyKidBoardQuestion,
  kidBoardLine,
  kidHintFacts,
  kidSafetyFacts,
  kidWhereFacts,
} from './kidBoardAnswers';
import type { KidAnswerKind } from './kidBoardAnswers';

/** Single-letter piece type → kid word. */
function pieceWord(piece: string): string {
  switch (piece.toLowerCase()) {
    case 'p': return 'pawn';
    case 'n': return 'knight';
    case 'b': return 'bishop';
    case 'r': return 'rook';
    case 'q': return 'queen';
    case 'k': return 'king';
    default: return 'piece';
  }
}

/**
 * Spell a SAN move into kid-friendly words, GROUNDED by chess.js applied to
 * the real position (G3 — never invented). "Bc4" → "the bishop moves to c4";
 * "Qxf7#" → "the queen captures on f7 — checkmate!". Square names (c4/f7) are
 * fine in kid text; SAN tokens (Bc4/Qxf7#) are not (kid #6) — this is the
 * code-side translator that keeps SAN out of the kid's ear. Returns '' when
 * the move is illegal from `fenBefore` so callers can fall back.
 */
export function describeKidMove(fenBefore: string, san: string): string {
  try {
    const chess = new Chess(fenBefore);
    const move = chess.move(san);
    const piece = pieceWord(move.piece);
    const verb = move.captured ? 'captures on' : 'moves to';
    const castle = move.san.replace(/[+#]/g, '');
    let text =
      castle === 'O-O' ? 'the king castles to safety on the kingside'
      : castle === 'O-O-O' ? 'the king castles to safety on the queenside'
      : `the ${piece} ${verb} ${move.to}`;
    if (move.promotion) {
      text += `, becoming a ${pieceWord(move.promotion)}`;
    }
    if (chess.isCheckmate()) text += ' — checkmate!';
    else if (chess.isCheck()) text += ', putting the king in check';
    return text;
  } catch {
    return '';
  }
}

/** SAN-token shapes we must never let reach a child (kid #6). Matches things
 *  like Nf3, Bxc4, Qf7#, O-O, e8=Q, R1d2 — but NOT bare square names (c4) or
 *  ordinary capitalized words at a sentence start (handled by the word
 *  boundaries + required move punctuation/piece-letter structure). */
const SAN_TOKEN_RE =
  /\b(O-O(?:-O)?|[KQRBN][a-h1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h]x[a-h][1-8](?:=[QRBN])?[+#]?|[a-h][1-8]=[QRBN][+#]?)\b/g;

/**
 * Sanitize an LLM kid-coach string. Strips any leaked SAN token, collapses
 * whitespace, and hard-caps length. Returns '' when nothing usable remains so
 * the caller falls back to the authored static text. Shared by every path so
 * a single model slip can't reach a child.
 */
export function sanitizeKidCoachText(raw: string, maxChars = 240): string {
  if (!raw) return '';
  // The no-key / offline banners the LLM lane can surface — never speak.
  if (raw.includes('⚠️') || /no api key/i.test(raw)) return '';
  let text = raw.replace(SAN_TOKEN_RE, '').replace(/\s{2,}/g, ' ').trim();
  // Drop stray double-spaces / dangling punctuation left by a stripped token.
  text = text.replace(/\s+([.,!?])/g, '$1').replace(/\(\s*\)/g, '').trim();
  if (text.length === 0) return '';
  if (text.length > maxChars) {
    // Cut at the last sentence end within budget; else hard cut.
    const slice = text.slice(0, maxChars);
    const lastStop = Math.max(slice.lastIndexOf('.'), slice.lastIndexOf('!'), slice.lastIndexOf('?'));
    text = (lastStop > 40 ? slice.slice(0, lastStop + 1) : slice).trim();
  }
  return text;
}

export interface KidMoveNarrationInput {
  /** FEN BEFORE the move was played. */
  fenBefore: string;
  /** The scripted SAN that was just played (source of truth — kid #17). */
  san: string;
  /** True if the KID played this move; false if it was the opponent's. */
  isPlayerMove: boolean;
  /** The scripted teaching concept for this move, if any. */
  teachingConcept?: string;
  /** The hand-authored narration — the GROUNDED seed + the fallback. */
  authoredNarration?: string;
}

/** The scripted move as kid words in the child's seat: "your knight moves to
 *  f3" / "their bishop captures on e5, putting the king in check". Computed
 *  from chess.js — the coach says only what the board shows (kid #17, G0). */
function seatedMove(fenBefore: string, san: string, mine: boolean): string {
  const desc = describeKidMove(fenBefore, san);
  return desc ? desc.replace(/^the /, mine ? 'your ' : 'their ') : '';
}

function capitalise(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Narration for a move that was just played. The hand-authored note leads;
 * with none, the computed move speaks. No model writes a word of it: the model
 * used to "rephrase" this, and free prose around a move is chess content the
 * board never produced (kid P0, G0). Empty when the move cannot be replayed.
 */
export function kidMoveNarration(input: KidMoveNarrationInput): string {
  if (input.authoredNarration) return input.authoredNarration;
  const move = seatedMove(input.fenBefore, input.san, input.isPlayerMove);
  if (!move) return '';
  const concept = input.teachingConcept ? ` That's the idea of ${input.teachingConcept}.` : '';
  return `${capitalise(move)}.${concept}`;
}

export interface KidInstructionInput {
  /** FEN of the position the child is about to move in. */
  fenBefore: string;
  /** The scripted SAN the child should play (source of truth — kid #17). */
  expectedSan: string;
  /** The scripted teaching concept, if any. */
  teachingConcept?: string;
  /** Hand-authored instruction — the GROUNDED seed + the fallback. */
  authored?: string;
}

/** "move your knight to f3" / "castle your king to the kingside" — the
 *  scripted move as an instruction, computed from chess.js. */
function instructionFor(fenBefore: string, san: string): string {
  try {
    const move = new Chess(fenBefore).move(san);
    const bare = move.san.replace(/[+#]/g, '');
    if (bare === 'O-O') return 'castle your king to safety on the kingside';
    if (bare === 'O-O-O') return 'castle your king to safety on the queenside';
    const piece = pieceWord(move.piece);
    return move.captured ? `capture on ${move.to} with your ${piece}` : `move your ${piece} to ${move.to}`;
  } catch {
    return '';
  }
}

/**
 * The instruction for the move the child should play next (a guided game
 * GUIDES, so naming it is the point). The authored instruction leads; with
 * none, the computed move speaks. No model call (kid P0, G0).
 */
export function kidMoveInstruction(input: KidInstructionInput): string {
  if (input.authored) return input.authored;
  const instruction = instructionFor(input.fenBefore, input.expectedSan);
  if (!instruction) return '';
  const concept = input.teachingConcept ? ` That's the idea of ${input.teachingConcept}.` : '';
  return `Now ${instruction}.${concept}`;
}

export interface KidWrongMoveInput {
  /** FEN BEFORE the kid's wrong attempt (the position they should move in). */
  fenBefore: string;
  /** The scripted SAN the kid SHOULD play next (source of truth). */
  expectedSan: string;
  /** Hand-authored wrong-move response — the fallback. */
  authoredResponse?: string;
}

/**
 * The nudge after a wrong move: the authored response, else a kind computed
 * pointer at the scripted move. No model call (kid P0, G0).
 */
export function kidWrongMoveHint(input: KidWrongMoveInput): string {
  if (input.authoredResponse) return input.authoredResponse;
  const instruction = instructionFor(input.fenBefore, input.expectedSan);
  return instruction ? `Not quite. Try to ${instruction}.` : 'Not quite. Try again.';
}

/**
 * Voice a computed fact bundle KID-SAFE, through the ONE grounding chokepoint
 * (`voiceFacts` with `kidSafe: true`), then sanitize. Returns null when nothing
 * usable remains so the caller falls through. The facts are computed in code by
 * the SHARED assemblers — the model only phrases them for a child (G0).
 */
async function voiceKidFacts(facts: string, question: string): Promise<string | null> {
  try {
    const voiced = await voiceFacts(facts, {
      studentMessage: question,
      kidSafe: true,
      intent: 'kid-grounded',
    });
    const clean = sanitizeKidCoachText(voiced ?? '', 300);
    return clean || null;
  } catch {
    return null;
  }
}

/**
 * getKidGroundedResponse — TIE THE KID SECTION INTO THE UNIFIED SPINE (David:
 * "no reason it needs to be isolated out"). A child's question runs through the
 * SAME intent detector (`buildQuestionGrounding`) and the SAME fact-assemblers
 * (`assembleConceptAnswer` / `assembleTeachingAnswer` / `assembleAppHelpAnswer`)
 * the adult coach uses — the kid is no longer on a knowledge island that only
 * knows the live board. The ONLY kid-specific step is the voicing register:
 * facts are phrased kid-safe (spelled-out moves, warm, no praise) at the shared
 * `voiceFacts` chokepoint, then sanitized.
 *
 * Scoped to the kid-appropriate knowledge families a 5-10 y.o. actually asks —
 * "what's a fork?" (concept), "how do you teach the Italian?" (pedagogy), "what
 * does the puzzles page do?" (app help). Adult-only families (weakness stats,
 * pro repertoires, settings mutations, records) are deliberately NOT surfaced
 * to a child. Returns null when no kid family fires so the caller falls back to
 * the computed board kinds. Every answer is grounded + sanitized.
 */
export async function getKidGroundedResponse(
  question: string,
  fen: string,
): Promise<string | null> {
  let g;
  try {
    g = buildQuestionGrounding(question, { fen });
  } catch {
    return null;
  }

  // CONCEPT — "what's a fork / a pin / checkmate?" Definition from the book
  // corpus (chess-concepts.json), never training memory (G3). Confirm a real
  // concept token fired (the detector only checked shape).
  if (g.conceptQuestion) {
    const ids = detectConceptsInText(question);
    if (ids.length > 0) {
      const concept = getConcept(ids[0]);
      const answer = concept ? assembleConceptAnswer(concept) : null;
      if (answer) {
        const voiced = await voiceKidFacts(answer.facts, question);
        if (voiced) return voiced;
      }
    }
  }

  // HOW WE TEACH — "how do you teach the Italian?" The WLPP grammar + the
  // curated LessonScript for the named opening. Fact source is our own lesson
  // data, so no board / master-play lookup.
  if (g.teachingMethodQuestion) {
    try {
      const openingId = g.openingId ?? resolveOpeningIdFromName(question) ?? null;
      const lesson = openingId ? getLessonScript(openingId) : null;
      let openingName: string | null = null;
      if (openingId) {
        const rec = await getOpeningById(openingId);
        openingName = rec?.name ?? null;
      }
      const answer = assembleTeachingAnswer({ openingName, lesson });
      if (answer) {
        const voiced = await voiceKidFacts(answer.facts, question);
        if (voiced) return voiced;
      }
    } catch { /* fall through */ }
  }

  // APP HELP — "what does the puzzles page do?" Voiced from the app route
  // manifest's own copy (title + description), never a free-LLM guess.
  if (g.appHelpQuestion) {
    try {
      const topic = matchRouteByTopic(question);
      const entry = topic ? APP_ROUTES_MANIFEST.find((e) => e.path === topic.path) : null;
      if (entry) {
        const answer = assembleAppHelpAnswer({ title: entry.title, description: entry.description });
        if (answer) {
          const voiced = await voiceKidFacts(answer.facts, question);
          if (voiced) return voiced;
        }
      }
    } catch { /* fall through */ }
  }

  return null;
}

export interface KidGameQuestionInput {
  /** The child's typed/spoken question. */
  question: string;
  /** Current board FEN (for computed board facts). */
  fen: string;
  /** The side the child plays — every "your"/"their" in the answer is seated
   *  from this. Required: the seat is part of what a claim means (CLAUDE.md
   *  "THE SEAT IS PART OF THE SELECTION"). */
  playerColor: 'w' | 'b';
  /** The scripted next move the child should play, if known (source of truth). */
  expectedNextSan?: string;
  /** The scripted teaching concept for that next move, if any. */
  nextTeachingConcept?: string;
}

export interface KidGameAnswer {
  text: string;
  kind: KidAnswerKind;
}

/** The computed facts for one board kind — plain kid prose, no notation. */
function boardFactsFor(kind: Exclude<KidAnswerKind, 'concept'>, input: KidGameQuestionInput): string {
  switch (kind) {
    case 'is-it-safe': return kidSafetyFacts(input.question, input.fen, input.playerColor);
    case 'where-can-it-go': return kidWhereFacts(input.question, input.fen, input.playerColor);
    case 'hint': return kidHintFacts({
      fen: input.fen,
      kid: input.playerColor,
      expectedNextSan: input.expectedNextSan,
      teachingConcept: input.nextTeachingConcept,
    });
    case 'look-at-board': return kidBoardLine(input.fen, input.playerColor);
  }
}

/**
 * "Ask the coach" — the kid question box (GuidedGamePage), the ONLY kid
 * question surface. G0, with no hole: the answer kind is chosen in code
 * (`classifyKidBoardQuestion`, then the shared concept spine), the facts are
 * computed by chess.js on the live board (`kidBoardAnswers`) or by the shared
 * concept assemblers, and the model only PHRASES them kid-safe through
 * `voiceFacts({kidSafe})`. Anything no kind covers gets the computed board line
 * ("let's look at the board" + something true on it). There is no free LLM
 * answer any more, so there is nothing for a claim-stripper to strip.
 */
export async function answerKidGameQuestionWithKind(input: KidGameQuestionInput): Promise<KidGameAnswer> {
  const boardKind = classifyKidBoardQuestion(input.question);
  let kind: KidAnswerKind;
  let text: string | null = null;
  if (boardKind) {
    kind = boardKind;
  } else {
    // CONCEPT — "what's a fork?" — the shared concept spine, voiced kid-safe.
    try {
      text = await getKidGroundedResponse(input.question, input.fen);
    } catch {
      text = null;
    }
    kind = text ? 'concept' : 'look-at-board';
  }
  if (!text) {
    const facts = boardFactsFor(kind === 'concept' ? 'look-at-board' : kind, input);
    text = (await voiceKidFacts(facts, input.question)) ?? sanitizeKidCoachText(facts, 600);
  }
  void logAppAudit({
    kind: 'kid-question-answered',
    category: 'subsystem',
    source: 'kidGameCoach.answerKidGameQuestion',
    summary: `kid question answered as ${kind}`,
    details: JSON.stringify({ answerKind: kind, fen: input.fen, kid: input.playerColor }),
  });
  return { text, kind };
}

export async function answerKidGameQuestion(input: KidGameQuestionInput): Promise<string> {
  return (await answerKidGameQuestionWithKind(input)).text;
}
