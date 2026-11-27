/**
 * THE OPENING'S FOCUS — DEVELOP AND CASTLE (Coach Build Board "4. Focuses",
 * David 2026-11-24). The Campaign's Develop & Castle card, reused: its one rule
 * read off one board (`breaksDevelopRule` — a knight or bishop moved a second
 * time unforced, or castling given up) and its fixed miss phrases. Scored both
 * ways, once a skill a game for the hold:
 *   - MISSED: the move breaks the rule — `neglected-development` (a minor
 *     moved twice) or `king-stuck-center` (castling given up);
 *   - HELD: the student castles with castling still theirs to lose
 *     (`king-stuck-center`), and brings the last of the four minors out
 *     without a repeat (`neglected-development`).
 * Pure: chess.js only.
 */
import { Chess, type Color, type Square } from 'chess.js';
import type { MisconceptionTagId } from '../../data/misconceptionTags';
import { breaksDevelopRule, CASTLING_LOST_PHRASE, DEVELOP_MISS_PHRASE } from '../../missions/checks/developAndCastle';
import { homeSquaresOf } from '../../services/development';

export interface OpeningJudgeState {
  /** Skills already scored this game (a held is said once; a miss stops the held). */
  missed: ReadonlySet<MisconceptionTagId>;
  held: ReadonlySet<MisconceptionTagId>;
}

export const NO_OPENING_JUDGE: OpeningJudgeState = { missed: new Set(), held: new Set() };

export interface SkillVerdict {
  tag: MisconceptionTagId;
  outcome: 'held' | 'broken';
  /** The fixed words a miss is taught with. */
  line: string | null;
}

/** The fixed phrase each opening miss is taught with. */
export const OPENING_MISS_LINE: Record<'neglected-development' | 'king-stuck-center', string> = {
  'neglected-development': DEVELOP_MISS_PHRASE,
  'king-stuck-center': CASTLING_LOST_PHRASE,
};

function allMinorsOut(fen: string, me: Color): boolean {
  const c = new Chess(fen);
  return [...homeSquaresOf('n', me), ...homeSquaresOf('b', me)].every((sq) => {
    const p = c.get(sq as Square);
    return !p || p.color !== me || (p.type !== 'n' && p.type !== 'b');
  });
}

/** The verdicts one opening move earns, and the state after it. */
export function judgeOpeningMove(fenBefore: string, san: string, st: OpeningJudgeState): { verdicts: SkillVerdict[]; state: OpeningJudgeState } {
  let c: Chess;
  let mv;
  try { c = new Chess(fenBefore); mv = c.move(san); } catch { return { verdicts: [], state: st }; }
  const me = mv.color;
  const uci = `${mv.from}${mv.to}${mv.promotion ?? ''}`;
  const verdicts: SkillVerdict[] = [];
  const missed = new Set(st.missed);
  const held = new Set(st.held);
  const broke = breaksDevelopRule(fenBefore, uci);
  if (broke) {
    const tag: 'neglected-development' | 'king-stuck-center' = broke === 'repeat-move' ? 'neglected-development' : 'king-stuck-center';
    missed.add(tag);
    verdicts.push({ tag, outcome: 'broken', line: OPENING_MISS_LINE[tag] });
  }
  if ((mv.isKingsideCastle() || mv.isQueensideCastle()) && !missed.has('king-stuck-center') && !held.has('king-stuck-center')) {
    held.add('king-stuck-center');
    verdicts.push({ tag: 'king-stuck-center', outcome: 'held', line: null });
  }
  const minorLeftHome = (mv.piece === 'n' || mv.piece === 'b') && homeSquaresOf(mv.piece, me).includes(mv.from as Square);
  if (minorLeftHome && !missed.has('neglected-development') && !held.has('neglected-development') && allMinorsOut(c.fen(), me)) {
    held.add('neglected-development');
    verdicts.push({ tag: 'neglected-development', outcome: 'held', line: null });
  }
  return { verdicts, state: { missed, held } };
}
