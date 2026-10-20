// playedConcept — THE CONCEPT A MOVE JUST PLAYED, named for either side (David
// 2026-10-18: "Make sure all other concepts like danger levels get called out
// when played by either side. Again, algo based. So not needed for players that
// demonstrate these concepts regularly").
//
// The concept is the one the move CREATED, read by the reality-gated detector
// (`computePlyFacts.tacticLanded`: the moved piece is the agent, the pattern is
// new on the board, and it really wins something). Its sentence is the
// detector's own description, seated for the student.
//
// ALGO, NOT A RULE: a concept the student has PROVEN is not named again —
// proven from their own record, puzzles on that theme answered well, or the
// concept played by them in their games often enough (`conceptRecord`).
import { Chess, type Square } from 'chess.js';
import { computePlyFacts } from './pvPlayback';
import { detectTactics } from './tacticsDetector';
import { patternWord } from './tacticVocabulary';
import { seatPieceReferences } from '../utils/seatPieces';
import { continueSentence } from '../utils/openSentence';

export interface PlayedConcept {
  /** The pattern (the detector's vocabulary: fork, pin, skewer, discovery…). */
  type: string;
  word: string;
  mover: 'w' | 'b';
  san: string;
  squares: string[];
  /** The detector's description of the pattern, seat-neutral. */
  description: string | null;
  /** The board after the move. */
  fenAfter: string;
  /** A pin the move KEPT rather than made (golden replay 2026-10-20, 8…Bh5:
   *  the bishop asked to decide by h3 steps back along the same line and the
   *  knight on f3 stays pinned). */
  kept?: boolean;
}

/** The concept `san` creates when played from `fenBefore`, or null. */
export function playedConcept(fenBefore: string, san: string): PlayedConcept | null {
  let c: Chess;
  try { c = new Chess(fenBefore); } catch { return null; }
  const mover = c.turn();
  let mv;
  try { mv = c.move(san); } catch { return null; }
  if (!mv) return null;
  const fenAfter = c.fen();
  let type: string | null = null;
  try {
    type = computePlyFacts(fenBefore, fenAfter, { ...(mv.captured ? { captured: mv.captured } : {}), san: mv.san, color: mv.color, ...(mv.promotion ? { promotion: mv.promotion } : {}) }).tacticLanded;
  } catch { type = null; }
  if (!type) {
    const k = keptPin(fenBefore, mv.from, mv.to, fenAfter);
    return k ? { type: 'pin', word: patternWord('pin') ?? 'pin', mover, san: mv.san, squares: [...k.involvedSquares], description: k.description ?? null, fenAfter, kept: true } : null;
  }
  if (type === 'battery') return null;
  const word = patternWord(type);
  if (!word) return null;
  const t = detectTactics(fenAfter).tactics.find((x) => x.type === type && x.involvedSquares.includes(mv.to));
  return { type, word, mover, san: mv.san, squares: t ? [...t.involvedSquares] : [mv.to], description: t?.description ?? null, fenAfter };
}

/** The pin `to` holds after the move, when the same piece already bore on the
 *  pinned piece from `from` — the pin is KEPT, not made. */
function keptPin(fenBefore: string, from: string, to: string, fenAfter: string): ReturnType<typeof detectTactics>['tactics'][number] | null {
  const pin = detectTactics(fenAfter).tactics.find((x) => x.type === 'pin' && x.involvedSquares[0] === to);
  const pinned = pin?.involvedSquares[1];
  if (!pin || !pinned) return null;
  try {
    const before = new Chess(fenBefore);
    return before.attackers(pinned as Square, before.turn()).includes(from as Square) ? pin : null;
  } catch { return null; }
}

/** Said from the student's seat. */
export function playedConceptLine(c: PlayedConcept, student: 'w' | 'b'): string {
  const byStudent = c.mover === student;
  const said = c.description ? continueSentence(seatPieceReferences(c.description.trim().replace(/[.!]$/, ''), c.fenAfter, student)) : null;
  const how = said && c.kept ? said.replace(/\bpins\b/, 'keeps the pin on') : said;
  // The description already names the pattern ("forks", "pins"): said once,
  // with the move that made it; otherwise the pattern is named outright.
  const named = how && new RegExp(`\\b${c.word.split(' ')[0].slice(0, 4)}`, 'i').test(how);
  if (how && named) return byStudent ? `With ${c.san}, ${how}.` : `With their ${c.san}, ${how}.`;
  if (how) return byStudent ? `${c.san} is a ${c.word}: ${how}.` : `Their ${c.san} is a ${c.word}: ${how}.`;
  return byStudent ? `${c.san} is a ${c.word}.` : `Their ${c.san} is a ${c.word}.`;
}
