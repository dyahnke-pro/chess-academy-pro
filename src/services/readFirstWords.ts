// READ THIS POSITION'S FIRST WORDS (Coach Build Board, "Read this position":
// first word in about half a second, one order everywhere). The read's opening
// is said from a short engine read (or the cached one) while the deep read runs:
//   1. their threat — the move that wins something of yours if you pass;
//   2. the standing, always with its why (`standingRead` → verdictWithReasons;
//      a level board says why it is level), so a board never opens on silence;
//   3. both plans — yours (`planOf` on the short read's lines) and theirs
//      (the masters' break, when the book has it).
// The habit and the deep part follow from the full read (`composePositionRead`),
// with any sentence already said here dropped. PURE: the reads come in.
import { Chess, type Color, type Square } from 'chess.js';
import type { AnalysisLine } from '../types';
import { flipSideToMove } from './threatOut';
import { legalSeeGain } from './positionReadingService';
import { standingRead } from './reviewMoveBriefing';
import { planOf } from './planOf';
import { masterMovesCachedSync } from './masterPlayLookup';
import { readThreatWords } from './teachingSentence';
import { stemKeyOf } from '../utils/rotateStem';

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** Their best win if the student passed: mate, or a capture netting two or
 *  more. Read only when the student is to move. */
function theirThreat(fen: string, student: Color): { san: string; piece: string | null; square: string; mate: boolean } | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  if (c.turn() !== student || c.inCheck()) return null;
  const pass = flipSideToMove(fen);
  if (!pass) return null;
  const p = new Chess(pass);
  let best: { san: string; piece: string | null; square: string; mate: boolean; gain: number } | null = null;
  for (const m of p.moves({ verbose: true })) {
    const b = new Chess(pass); b.move(m.san);
    if (b.isCheckmate()) return { san: m.san, piece: null, square: m.to, mate: true };
    if (!m.captured) continue;
    const g = legalSeeGain(pass, m.to as Square);
    if (g >= 2 && (!best || g > best.gain)) best = { san: m.san, piece: NAME[m.captured] ?? null, square: m.to, mate: false, gain: g };
  }
  return best ? { san: best.san, piece: best.piece, square: best.square, mate: false } : null;
}

export function readFirstWords(i: {
  fen: string;
  student: Color;
  /** The short read's evaluation, from the student's seat; null when none. */
  studentPovCp: number | null;
  lines: readonly AnalysisLine[];
  /** The student's own moves may be named (not on a puzzle being solved). */
  names: boolean;
}): string[] {
  const key = stemKeyOf(`first|${i.fen.split(' ').slice(0, 2).join(' ')}`);
  const out: string[] = [];
  const threat = theirThreat(i.fen, i.student);
  if (threat) out.push(readThreatWords(threat, key));
  if (i.studentPovCp !== null) {
    const s = standingRead(i.fen, i.studentPovCp, i.student, i.lines.length ? i.lines : null);
    if (s.reasoned) out.push(s.text);
  }
  const plans = (() => { try { return planOf({ fen: i.fen, lines: i.lines, student: i.student, namesMoves: i.names, movesAt: masterMovesCachedSync }); } catch { return null; } })();
  if (plans?.mover[0]) out.push(plans.mover[0].text);
  if (plans?.other) out.push(plans.other.text);
  return out;
}

/** A sentence the opening already said (most of its words), so the deep read
 *  does not say it twice. */
export function saidAlready(sentence: string, said: readonly string[]): boolean {
  const words = (s: string): Set<string> => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2));
  const a = words(sentence);
  if (a.size === 0) return false;
  return said.some((x) => {
    const b = words(x);
    let both = 0; for (const w of a) if (b.has(w)) both += 1;
    return both / Math.min(a.size, b.size || 1) >= 0.6;
  });
}
