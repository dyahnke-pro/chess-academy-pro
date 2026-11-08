// TWO SAFETY HABITS, EARNED BY THE BOARD (WO-TEACH-GAPS P3 method beats).
//
// BLUNDER CHECK — "before you let go of the piece, ask what they can take now".
// Earned only when it would have saved the game's material: the student's move
// cost >= 150cp and their reply simply took a student piece that the move left
// en prise (it was winnable by exchange right after the move).
//
// AUTOPILOT GUARD — "when a move feels automatic, that's the moment to check
// it". Earned when the move cost >= 100cp AND it is the move most players at the
// student's level play in this position (the reflex, not an oddity).
//
// Both teach the HABIT; the grade beside them names the better move. The
// blunder check is asked in full once a game (`method:blunder-check`) and as a
// short callback after that; the autopilot guard once (`method:autopilot`).
//
// A LEAF: chess.js + the SEE helper.
import { Chess, type Square } from 'chess.js';
import { legalSeeGainFor } from './positionReadingService';
import { MATERIAL_VALUE } from './pieceValues';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { howItFell } from './slipDepth';
import { andList } from '../utils/andList';

const BLUNDER_CHECK_CP = 150;
const AUTOPILOT_CP = 100;

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };

export function blunderCheck(
  fenBefore: string,
  san: string,
  reply: string | null,
  cpLoss: number,
  /** The full question was already said this game: say the short callback
   *  (the habit is built by asking it again, never by silence after once). */
  again = false,
): string | null {
  if (!reply || cpLoss < BLUNDER_CHECK_CP) return null;
  let c: Chess;
  let mine;
  try { c = new Chess(fenBefore); mine = c.move(san); } catch { return null; }
  const afterMove = c.fen();
  let r;
  try { r = c.move(reply.replace(/^…/, '')); } catch { return null; }
  let answer: string | null = null;
  if (r.captured && r.captured !== 'k') {
    // Taking back on the square the student just captured on, for no more than
    // they took, is a TRADE (the Ruy exchange: Bxc6 dxc6), not a blunder.
    const trade = !!mine.captured && r.to === mine.to && (MATERIAL_VALUE[r.captured] ?? 0) <= (MATERIAL_VALUE[mine.captured] ?? 0);
    // The piece was winnable right after the student's move — not a trade.
    // THE ANSWER IS THEIR MOVE (Colle replay 2026-11-05, 26.Qh6: "what
    // checks, captures and threats do they have? Here the answer was your
    // pawn on c3" — a piece where the question asks for a capture).
    if (!trade && legalSeeGainFor(afterMove, r.to, r.color) > 0) answer = `${r.color === 'b' ? '…' : ''}${r.san}, taking your ${NAME[r.captured] ?? 'piece'} on ${r.to}`;
  }
  // THE CHECK IS THE FIRST C OF CCT (Learn audit 2026-10-15: "e5 was a
  // blunder — it let them force mate, starting with Qxa7" and no habit,
  // because the lane only knew captures). A costly move answered by a check
  // is the question the habit asks first.
  if (!answer && /[+#]$/.test(r.san)) answer = `their check, ${r.color === 'b' ? '…' : ''}${r.san}`;
  if (!answer) return null;
  return again ? blunderCheckAgain(answer, fenBefore) : blunderCheckAnswer(answer);
}

/** THE ONE BLUNDER-CHECK SENTENCE (David 2026-10-14: a question the student
 *  learns to ask themself, and name CCT). Said by this lane when they took the
 *  piece, and by the slip question when the line takes it — one wording, one
 *  say-once claim (`method:blunder-check`). */
export const BLUNDER_CHECK_QUESTION = 'Blunder check before you let go of a piece: run CCT for them — what checks, captures and threats do they have once it lands?';
export function blunderCheckLine(pieceName: string, square: string): string {
  return blunderCheckAnswer(`a capture: your ${pieceName} on ${square} was there to take`);
}
function blunderCheckAnswer(answer: string): string {
  return `${BLUNDER_CHECK_QUESTION} Here the answer was ${answer}.`;
}
/** The short callback once the question has been asked this game. */
function blunderCheckAgain(answer: string, fen: string): string {
  return rotateStem([
    `Blunder check again — the answer was ${answer}.`,
    `Same question before you let go: what do they have? Here, ${answer}.`,
    `CCT for them once more — the answer was ${answer}.`,
  ], stemKeyOf(fen));
}

export function autopilotGuard(san: string, cpLoss: number, popularTopSan: string | null): string | null {
  if (!popularTopSan || cpLoss < AUTOPILOT_CP) return null;
  const bare = (s: string): string => s.replace(/[+#!?]+$/, '');
  if (bare(san) !== bare(popularTopSan)) return null;
  return 'That is the move most players make here — and it costs. When a move feels automatic, that is exactly the moment to check it.';
}

/** When they are collapsing, a slow move gives them the one thing they need —
 *  time. Earned when the student is still winning after the move (>= 300cp),
 *  the engine's move was a check or a capture, and the played move was neither
 *  and cost >= 100cp. Teaches the habit only; the grade names the better move. */
const KEEP_PRESSING_WIN_CP = 300;
export function keepPressing(fenBefore: string, san: string, bestSan: string | null, cpLoss: number, cpAfter: number | null): string | null {
  if (!bestSan || cpAfter === null || cpAfter < KEEP_PRESSING_WIN_CP || cpLoss < AUTOPILOT_CP) return null;
  const forcing = (x: string): boolean => /x|[+#]$/.test(x);
  const bare = (s: string): string => s.replace(/[+#!?]+$/, '');
  if (bare(san) === bare(bestSan) || forcing(san) || !forcing(bestSan)) return null;
  try { new Chess(fenBefore).move(san); } catch { return null; }
  return 'When they are on the ropes, keep asking questions — a check or a capture first, so they never get a free move to untangle.';
}

/** A STUDENT'S SLIP AS THE HABIT THAT CATCHES IT (WO-STORY-MATRIX-01 P1-9c) —
 *  the one reading for every surface: Learn's slip question and Review's
 *  method beat ask the same thinking step in the same words. Read off the
 *  board, never guessed:
 *   · the moved piece stopped guarding something — what was it guarding?
 *   · the lost piece was ALREADY losable before the move — the danger stood and
 *     went unanswered (the opponent-threat habit);
 *   · otherwise THIS move made it losable — the blunder check. */
export interface SlipRead {
  fenBefore: string;
  san: string;
  /** The square the slip lost a piece on, or null. */
  lostSquare: string | null;
  /** The square the moved piece stopped guarding, when that is why it failed. */
  guardLeft: string | null;
  student: 'w' | 'b';
  /** THE PUNISHMENT the engine found, their move first, from the board after
   *  the slip (WO-DEPTH-01). REQUIRED — `null` when the surface has no line —
   *  because the blunder check is only the habit that catches a piece left to
   *  be taken: on David's record 73% of the slips that lost material took two
   *  or more of their moves, a third began with a quiet move, and "your pawn
   *  on d6 was there to take" was said of a pawn that fell seven moves later. */
  punishLine: { fen: string; uci: readonly string[] } | null;
}
export type SlipHabit = 'what-it-guarded' | 'opponent-threat' | 'blunder-check';

export function slipHabit(slip: SlipRead, stemKey: number): { habit: SlipHabit; text: string } | null {
  const { fenBefore, san, lostSquare, guardLeft, student } = slip;
  // WHAT WAS IT GUARDING? (David's 13.Bc3, 2026-10-20: the bishop left e3 to a
  // knight fork, and the habit that catches it is asked before the piece moves.)
  // The square is the grade's to name ("Your bishop was guarding e3"); the
  // habit is the question.
  if (guardLeft && /^[a-h][1-8]$/.test(guardLeft)) {
    return { habit: 'what-it-guarded', text: rotateStem([
      'The question that catches this: before a piece moves, ask what it is guarding.',
      'Ask it before every move: what does this piece guard right now?',
    ], stemKey) };
  }
  if (!lostSquare || !/^[a-h][1-8]$/.test(lostSquare)) return null;
  let before: Chess;
  try { before = new Chess(fenBefore); } catch { return null; }
  const them: 'w' | 'b' = student === 'w' ? 'b' : 'w';
  const there = before.get(lostSquare as Square);
  const standing = !!there && there.color === student && legalSeeGainFor(fenBefore, lostSquare as Square, them) > 0;
  if (standing) return { habit: 'opponent-threat', text: answerDangerQuestion(lostSquare, stemKey) };
  // Named off the board AFTER the move — the piece may have just moved there.
  let name = 'piece';
  try {
    const c = new Chess(fenBefore); c.move(san);
    const lost = c.get(lostSquare as Square);
    if (lost && lost.color === student) name = ({ p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' } as Record<string, string>)[lost.type] ?? 'piece';
  } catch { /* the name is a courtesy */ }
  // HOW THE PIECE FELL decides which habit would have caught it (WO-DEPTH-01,
  // measured on David's 1,134 slips; `slipDepth.howItFell`, the one reader).
  // Left to be taken right after the move → the blunder check, as before. Lost
  // within the distance a line may be named on one read → still the blunder
  // check, answered with HOW it fell: a threat, a quiet move, a check or a
  // capture first. Lost later than that → not this habit (the positional reason
  // is the lesson). No line to read → the question, never an invented answer.
  const fall = howItFell(fenBefore, san, lostSquare, slip.punishLine);
  if (!fall) return null;
  if (fall.kind === 'left-to-take') return { habit: 'blunder-check', text: blunderCheckLine(name, lostSquare) };
  if (fall.kind === 'unknown') return { habit: 'blunder-check', text: BLUNDER_CHECK_QUESTION };
  if (fall.kind === 'later' || !fall.ref) return null;
  const first = fall.ref.sans[0];
  const PIECE: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
  // "left … under attack", never "it hit": the move may only have uncovered
  // another piece's attack (11…Qd4 Qh3: the queen on h3 does not reach d4).
  const hit = fall.hit.map((h) => `your ${PIECE[h.piece] ?? 'piece'} on ${h.square}`);
  const how = fall.kind === 'threat' ? `a threat: ${first} took nothing, but it left ${andList(hit)} under attack`
    : fall.kind === 'quiet' ? `a quiet move: ${first} took nothing and gave no check`
      : fall.kind === 'check' ? `a check: ${first}` : `a capture: ${first}`;
  const whenAt = (k: number): string => (k <= 1 ? 'straight away' : 'on their next move');
  // The piece is named as it stood when it was TAKEN: one that walked onto the
  // square during the line is "your bishop", with no square it never stood on.
  const takenName = fall.takenPiece ? PIECE[fall.takenPiece] ?? null : null;
  const fell = fall.ref.mate
    ? `it was mate ${whenAt(fall.ref.moves)}`
    : fall.takenAt > 0 && takenName
      ? takenName === name ? `your ${name} on ${lostSquare} fell ${whenAt(fall.takenAt)}` : `your ${takenName} fell ${whenAt(fall.takenAt)}`
    : `they won material ${whenAt(fall.ref.moves)}`;
  return { habit: 'blunder-check', text: blunderCheckAnswer(`${how}, and ${fell}`) };
}

/** THE ONE ANSWER-THE-DANGER QUESTION — said by whichever line of the turn
 *  names the unanswered threat first (the instant grade or the full verdict),
 *  under one say-once claim, the opponent-threat habit's (`habitSaidKey`). */
export function answerDangerQuestion(square: string | null, stemKey: number): string {
  return square
    ? rotateStem([
      `The question that catches this: what did their last move attack? Answer it before your own idea — the piece on ${square} was already in danger.`,
      `Ask it every move: what are they hitting? The piece on ${square} was already under attack, and that question finds it.`,
    ], stemKey)
    : rotateStem([
      'The question that catches this: what did their last move attack? Answer it before your own idea.',
      'Ask it every move: what are they hitting? Answer that before you play your own idea.',
    ], stemKey);
}
