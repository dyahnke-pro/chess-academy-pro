/**
 * kidGameCoach — the LIVE, kid-safe, GROUNDED coach voice for the kid
 * "Play Game" surface (`/kid/play-games/:gameId`, GuidedGamePage).
 *
 * This is the kid-mode equivalent of the adult Play/Learn-with-Coach voice
 * (coachMoveCommentary / useLiveCoach), built to the LOCKED kid contract:
 *
 *   • Every LLM call routes through `getKidLlmResponse` (skipPersonality +
 *     KID_SAFETY_PROMPT — Ruth default, no SAN, age-appropriate). Importing the
 *     adult coach chat entry point here is BANNED (kid non-negotiable #3) — the
 *     kid-safe wrapper is the only sanctioned lane.
 *   • The LLM NEVER decides chess content (G0/kid #1/#17). The move played is
 *     the SCRIPTED san; the position facts are computed in code
 *     (`describeKidMove` via chess.js, `buildFedTacticsContext` board facts).
 *     The model only rephrases those computed facts into fresh kid prose.
 *   • Every output is sanitized (`sanitizeKidCoachText`) and falls back to the
 *     hand-authored static text on ANY anomaly (empty / no-key banner / SAN
 *     leak / over-length / throw). A hallucination in kid mode is a P0 bug —
 *     the authored text is always the safety net.
 *   • No per-move praise (kid #5) — the prompt restates the move's EFFECT.
 */
import { Chess } from 'chess.js';
import { getKidLlmResponse, voiceFacts } from './coachApi';
import { buildFedTacticsContext, formatTacticsSubBlock } from './liveTacticsContext';
import { groundCoachAnswerBoardClaims } from './boardClaimValidator';
import { logAppAudit } from './appAuditor';
import { buildQuestionGrounding } from '../coach/questionIntents';
import { assembleConceptAnswer, assembleTeachingAnswer, assembleAppHelpAnswer } from './groundedAnswer';
import { detectConceptsInText, getConcept, resolveOpeningIdFromName } from './chessConceptService';
import { getLessonScript } from '../data/lessons';
import { getOpeningById } from './openingService';
import { matchRouteByTopic } from './navigationRouter';
import { APP_ROUTES_MANIFEST } from '../data/appRoutesManifest';

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

/**
 * Dynamic, kid-safe narration for a move that was just played. The LLM is
 * HANDED the computed move + concept and asked only to phrase it freshly for a
 * young child — it never decides what the move was. Falls back to the authored
 * narration on any anomaly. Returns the authored text (or '') when no key /
 * offline so the surface is never blocked.
 */
export async function generateKidMoveNarration(input: KidMoveNarrationInput): Promise<string> {
  const fallback = input.authoredNarration ?? '';
  const moveDesc = describeKidMove(input.fenBefore, input.san);
  if (!moveDesc) return fallback; // illegal/desync → trust the script
  const who = input.isPlayerMove ? 'You' : 'Your opponent';
  const concept = input.teachingConcept ? ` This shows the idea of ${input.teachingConcept}.` : '';
  const seed = input.authoredNarration ? `\nThe lesson note for this move: "${input.authoredNarration}"` : '';
  const prompt = `A move was just played in a friendly chess game for a young child.
GROUND TRUTH (do not contradict, do not name any other move): ${who} just played — ${moveDesc}.${concept}${seed}

Say ONE warm, simple sentence (max ~20 words) describing what this move DOES, for a 5-to-10-year-old. Spell out pieces and squares in words; never use chess notation. Do not say "great move" or praise — just describe the idea so the child learns. Speak as the friendly coach.`;
  try {
    const reply = await getKidLlmResponse([{ role: 'user', content: prompt }], '', 160);
    const clean = sanitizeKidCoachText(reply);
    return clean || fallback;
  } catch {
    return fallback;
  }
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

/**
 * Dynamic, kid-safe instruction for the move the child should play next. A
 * guided game GUIDES — telling the child which piece to move where IS the
 * point — so the LLM is handed the computed move (`describeKidMove`) and asked
 * to phrase it as a friendly instruction, spelled out, never notation. Falls
 * back to the authored instruction on any anomaly.
 */
export async function generateKidMoveInstruction(input: KidInstructionInput): Promise<string> {
  const fallback = input.authored ?? '';
  const moveDesc = describeKidMove(input.fenBefore, input.expectedSan);
  if (!moveDesc) return fallback;
  const concept = input.teachingConcept ? ` This teaches the idea of ${input.teachingConcept}.` : '';
  const prompt = `In a friendly chess game for a young child, it is the child's turn to move.
GROUND TRUTH — the move to guide them toward is: ${moveDesc}.${concept} (Describe the piece and the square in words; never reveal it as notation.)

Say ONE warm, simple instruction (max ~20 words) telling them which piece to move and where, for a 5-to-10-year-old. No praise. Speak as the friendly coach.`;
  try {
    const reply = await getKidLlmResponse([{ role: 'user', content: prompt }], '', 160);
    const clean = sanitizeKidCoachText(reply);
    return clean || fallback;
  } catch {
    return fallback;
  }
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
 * Dynamic, kid-safe encouragement after a wrong move. Grounded by the EXPECTED
 * scripted move (spelled out) so the nudge points at the right idea without
 * ever inventing chess. Falls back to the authored response.
 */
export async function generateKidWrongMoveHint(input: KidWrongMoveInput): Promise<string> {
  const fallback = input.authoredResponse ?? 'Not quite — try again!';
  const moveDesc = describeKidMove(input.fenBefore, input.expectedSan);
  if (!moveDesc) return fallback;
  const prompt = `In a friendly chess game for a young child, the child tried a move that wasn't the one we're learning.
GROUND TRUTH — the move to gently steer them toward is: ${moveDesc}. (Do not reveal it as notation; describe the piece and where it should go.)

Say ONE kind, encouraging sentence (max ~20 words) nudging them toward that move, for a 5-to-10-year-old. No scolding, no praise, no chess notation. Speak as the friendly coach.`;
  try {
    const reply = await getKidLlmResponse([{ role: 'user', content: prompt }], '', 160);
    const clean = sanitizeKidCoachText(reply);
    return clean || fallback;
  } catch {
    return fallback;
  }
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
 * the live-board Q&A path. Every answer is grounded + sanitized; a hallucinated
 * board fact in kid mode is a P0 bug, so the caller still runs the board-claim
 * gate on the live-board path.
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
  /** Current board FEN (for grounded board facts). */
  fen: string;
  /** The scripted next move the child should play, if known (source of truth). */
  expectedNextSan?: string;
  /** The game's title (for friendly context). */
  gameTitle: string;
  /** Prior chat turns for continuity. */
  history: { role: 'user' | 'assistant'; content: string }[];
}

const KID_QUESTION_FALLBACK =
  "Great question! Keep looking at the board — what could each of your pieces do next?";

/**
 * "Ask the coach" — the kid-mode equivalent of Learn-with-Coach chat. The
 * answer is GROUNDED by code-computed board facts (hanging pieces / attack map
 * / mate-in-one via formatTacticsSubBlock) PLUS the scripted next move, so the
 * coach can answer "what should I do?" / "why?" without inventing chess. Always
 * kid-safe; falls back to a safe canned line on any anomaly.
 */
export async function answerKidGameQuestion(input: KidGameQuestionInput): Promise<string> {
  // TIE-IN (David): a knowledge question ("what's a fork?", "how do you teach
  // the Italian?", "what does the puzzles page do?") routes through the SAME
  // shared grounding spine as the adult coach, voiced kid-safe. Only when no
  // kid knowledge family fires do we fall to the live-board Q&A below — so a
  // board question ("what should I do?") still gets the tuned board grounding.
  try {
    const grounded = await getKidGroundedResponse(input.question, input.fen);
    // The grounded answer describes a CONCEPT / a DIFFERENT opening's position,
    // not the live board — so it is NOT board-claim-gated (that gate is for the
    // live-board path below). It is safe by construction: the facts are computed
    // by the shared assemblers, voiceFacts adds no numbers, sanitize strips any
    // SAN. Return it directly when a kid knowledge family fired.
    if (grounded) return grounded;
  } catch { /* fall through to live-board path */ }

  let groundingBlock = '';
  try {
    const sideToMove: 'w' | 'b' = input.fen.split(' ')[1] === 'b' ? 'b' : 'w';
    const tactics = await buildFedTacticsContext(
      input.fen,
      sideToMove,
      1000,
      null,
      () => Promise.resolve(null),
    );
    groundingBlock = formatTacticsSubBlock(tactics);
  } catch {
    groundingBlock = '';
  }
  const nextMove = input.expectedNextSan ? describeKidMove(input.fen, input.expectedNextSan) : '';
  const nextLine = nextMove
    ? `\nThe move we're learning next is: ${nextMove}. If they ask what to play, gently point them toward THIS (describe the piece + square, never notation).`
    : '';
  const groundLine = groundingBlock
    ? `\n\n[Board facts — GROUND TRUTH, the ONLY chess facts you may use; never invent a piece, square, capture, check, or mate not listed here]\n${groundingBlock}`
    : '';
  const systemAddition = `You are the friendly chess coach in a guided game ("${input.gameTitle}") for a child aged 5-10. Answer their question in 1-2 short, warm sentences. Describe pieces and squares in plain words; never use chess notation. Only use the board facts provided below — do not invent any move, capture, threat, or mate. Encourage curiosity.${nextLine}${groundLine}`;
  try {
    const reply = await getKidLlmResponse(
      [...input.history, { role: 'user', content: input.question }],
      systemAddition,
      256,
    );
    const clean = sanitizeKidCoachText(reply, 300);
    if (!clean) return KID_QUESTION_FALLBACK;
    // CHESS-CLAIM GATE (David 2026-07-04, P0 kid non-negotiable): the language
    // sanitizer above cleans WORDS, but it can't catch an INVENTED board fact —
    // "your knight can take the queen on d5" when d5 is empty. Kid mode's
    // supreme rule is "an LLM hallucinating chess content is a P0 bug", so run
    // the same board-claim gate the coach surfaces use: strip any sentence
    // whose piece/square/capture/mate claim is provably false on THIS position.
    // The kid never hears a made-up move. If the gate empties the answer
    // (every sentence was false), serve the safe canned line.
    const gated = groundCoachAnswerBoardClaims(clean, input.fen);
    if (gated.dropped.length > 0) {
      void logAppAudit({
        kind: 'claim-validator-trip',
        category: 'subsystem',
        source: 'kidGameCoach.answerKidGameQuestion.boardClaimGate',
        summary: `kid Q&A stripped ${gated.dropped.length} board-false sentence(s)`,
        details: JSON.stringify({ dropped: gated.dropped.slice(0, 3), fen: input.fen }),
      });
    }
    return gated.text.trim() || KID_QUESTION_FALLBACK;
  } catch {
    return KID_QUESTION_FALLBACK;
  }
}
