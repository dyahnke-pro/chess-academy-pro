// noSafeChecks — "I AM ALL OUT OF MEANINGFUL CHECKS" (Danya have-check, 2026-11-19).
//
// Danya, Wallach–Naroditsky: "White is threatening Ng6, and I am all out of
// meaningful checks." When the opponent threatens something and every check you
// have just hands over the checking piece, checks cannot be the answer: the
// position asks for a quiet defence or a deeper idea. No computer counted the
// checks a side has and whether any of them is safe.
//
// The read, chess.js only:
//   - a SAFE check lands on a square where the opponent cannot win the checking
//     piece (`legalSeeGain` ≤ 0 for them), or mates;
//   - it fires when the side to move has checks but none of them is safe, and
//     the opponent — given the move — has at least one safe check of their own.
// The text names their safe checks and how many checks you have.
import { Chess, type Color, type Move } from 'chess.js';
import { legalSeeGain } from './positionReadingService';
import { computeMustDefend, flipSideToMove } from './threatOut';
import { andList, countWord } from '../utils/andList';

export interface NoSafeChecks { side: Color; yourChecks: string[]; theirSafeChecks: string[]; text: string; squares: string[] }

function checks(fen: string): { safe: Move[]; all: Move[] } {
  const c = new Chess(fen);
  const all = c.moves({ verbose: true }).filter((m) => m.san.includes('+') || m.san.includes('#'));
  const safe = all.filter((m) => {
    if (m.san.includes('#')) return true;
    const after = new Chess(fen);
    after.move(m.san);
    return legalSeeGain(after.fen(), m.to) <= 0;
  });
  return { safe, all };
}

/** The side to move has only checks that give the piece away while the other side has safe ones, or null. */
export function noSafeChecks(fen: string, student: Color): NoSafeChecks | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  if (c.inCheck()) return null;
  const mine = checks(fen);
  if (!mine.all.length || mine.safe.length) return null;
  // Only when checks would be the tempting way out (his "White is threatening
  // Ng6, and I am all out of meaningful checks"): the side to move faces a
  // threat — a piece it must defend, or a mate in one against it. A board with
  // nothing threatened asks no question of the checks (decision baseline
  // 2026-11-19: "they are out of useful checks … while you have Qd4+" on a
  // quiet board).
  const side0 = c.turn();
  const flippedProbe = flipSideToMove(fen);
  const mateThreat = !!flippedProbe && new Chess(flippedProbe).moves().some((m) => m.endsWith('#'));
  if (computeMustDefend(fen, side0).pieces.length === 0 && !mateThreat) return null;
  const flipped = flipSideToMove(fen);
  if (!flipped) return null;
  const theirs = checks(flipped);
  if (!theirs.safe.length) return null;
  const side = c.turn();
  const you = side === student;
  const theirSans = theirs.safe.map((m) => m.san);
  const n = mine.all.length;
  const text = you
    ? `They have ${theirSans.length === 1 ? 'a safe check' : 'safe checks'} in ${andList(theirSans)}, and you are out of useful ones: your ${n === 1 ? 'only check gives' : `${countWord(n)} checks all give`} the checking piece away. Checks will not save you here — look for a quiet move or a deeper idea.`
    : `${n === 1 ? 'Their only check gives' : n === 2 ? 'Both of their checks give' : `All ${countWord(n)} of their checks give`} the checking piece away, while you still have ${andList(theirSans)}.`;
  return { side, yourChecks: mine.all.map((m) => m.san), theirSafeChecks: theirSans, text, squares: theirs.safe.map((m) => m.to) };
}
