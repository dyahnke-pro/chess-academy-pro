// boardPlan — structure→plan clause (Phase 1 slice, the CAMPAIGN line of the
// general's briefing). Names the textbook plan a CLEAR pawn structure dictates,
// board-true and conservative: only the unambiguous, canonical cases (a passed
// pawn, an isolated queen's pawn) — where the plan is settled theory, not a
// judgment call. When the structure is ambiguous it returns null (empty > a
// generic "improve your pieces", per "when unsure, leave blank"). G0/G3: the
// structure comes from chess.js geometry (describeStructure); the plan is the
// established idea for that structure, phrased in code.
import { Chess, type Square } from 'chess.js';
import { describeStructure } from './boardStructure';
// `stepsToPromote` moved to planRace when the race needed the same unit — one
// copy, one direction (boardPlan → planRace → boardStructure). A second copy is
// exactly the drift the duplicated-constant rule exists to stop.
import { detectPlanRace, planRaceClause, stepsToPromote } from './planRace';

type Color = 'w' | 'b';

const PIECE_NOUN: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** The square directly in front of a pawn (toward promotion), or null off-board. */
function frontSquare(square: string, color: Color): string | null {
  const file = square[0];
  const rank = Number.parseInt(square[1] ?? '0', 10);
  const nr = color === 'w' ? rank + 1 : rank - 1;
  if (nr < 1 || nr > 8) return null;
  return `${file}${nr}`;
}

/** What blocks a passer's advance: 'clear' (front empty, push it), 'enemy' (a
 *  blockader sits in front — the push is stopped), or 'friendly' (self-blocked).
 *  Board-true via chess.js so the plan never says "push it" on a pawn that can't
 *  move (B#4). Returns the blocker's piece letter when occupied. */
function passerBlock(fen: string, square: string, color: Color): { kind: 'clear' | 'enemy' | 'friendly'; piece?: string } {
  const front = frontSquare(square, color);
  if (!front) return { kind: 'clear' }; // already on the promotion rank — nothing ahead
  try {
    const occ = new Chess(fen).get(front as Square);
    if (!occ) return { kind: 'clear' };
    return { kind: occ.color === color ? 'friendly' : 'enemy', piece: occ.type };
  } catch { return { kind: 'clear' }; }
}

/** The most advanced pawn square in a list, for the given colour. */
function mostAdvanced(squares: string[], color: Color): string | null {
  if (squares.length === 0) return null;
  return [...squares].sort((a, b) => stepsToPromote(a, color) - stepsToPromote(b, color))[0];
}

/** Is a square the d- or e-file (the queen's/king's-pawn isolani — the one
 *  whose plan is textbook). */
function isCentralFile(square: string): boolean {
  return square[0] === 'd' || square[0] === 'e';
}

/**
 * The plan the structure dictates for the STUDENT, or null when the structure
 * has no canonical single plan. Priority: a passed pawn (yours = push, theirs =
 * blockade) outranks an isolani read, because a passer is the more forcing
 * feature.
 */
/**
 * A plan's TEXT and its stable IDENTITY.
 *
 * `planMemory.stepPlan` decided "has the plan changed?" by comparing the
 * rendered SENTENCE, so every plan that names a square which MOVES re-announced
 * itself on each push — "your passed pawn on b5" became "on b6" and read as a
 * brand-new plan. Comparing rendered prose to establish identity is the same
 * anti-pattern as scraping squares back out of a sentence. The `id` names the
 * plan KIND (and the race VERDICT, because a flip genuinely is a new plan); it
 * deliberately omits the square, so advancing the pawn you were told to advance
 * is not a change of plan.
 */
export interface StructurePlanFact { text: string; id: string; }

/** The text alone — the shape four existing callers want. */
export function structurePlan(fen: string, studentColor: Color): string | null {
  return structurePlanFact(fen, studentColor)?.text ?? null;
}

export function structurePlanFact(fen: string, studentColor: Color): StructurePlanFact | null {
  const s = describeStructure(fen);
  if (!s) return null;
  const opp: Color = studentColor === 'w' ? 'b' : 'w';

  // Passed pawns — the most forcing structural feature. But "push it" is only
  // honest when the pawn can actually advance (B#4): a blockaded passer needs the
  // blockader challenged first, and a self-blocked one needs its path cleared.
  const mine = mostAdvanced(s.pawns.passedPawns[studentColor], studentColor);
  if (mine) {
    const block = passerBlock(fen, mine, studentColor);
    if (block.kind === 'enemy') {
      return { id: 'passer-blockaded-enemy', text: `Your passed pawn on ${mine} is a trump, but their ${PIECE_NOUN[block.piece ?? 'p']} blockades it — challenge or dislodge that blockader before it can run.` };
    }
    if (block.kind === 'friendly') {
      return { id: 'passer-blockaded-friendly', text: `Your passed pawn on ${mine} is a trump, but your own ${PIECE_NOUN[block.piece ?? 'p']} sits in its path — clear the way before it can advance.` };
    }
    // 🚨 THE ELSE-CHAIN DEFECT (found reading the code, 2026-09-17). Everything
    // below used to be unreachable whenever the student had a passer of their
    // own, so with runners on BOTH wings the coach said "push it and make them
    // deal with the promotion" and never once checked whether THEIRS queens
    // first. That is the coach telling you to run a race it has not looked at.
    // The race clause carries its own instruction (push, or stop theirs first),
    // so it REPLACES the bare push rather than sitting beside it.
    //
    // The register is pinned to 'live' by THIS function's own prose — every
    // sentence here is present tense ("is the trump here"), so the caller does
    // not get to choose it. Review gets the retrospective wording through the
    // `[plan-race]` facet instead.
    // ONLY a PASSER race may stand in for the passer plan. Reading real games
    // caught this: at Karpov–Kasparov move 14 White has a passed d-pawn, and an
    // unfiltered race handed back the FILE-collision clause — so the student was
    // told about the c-file and the passed pawn was never mentioned at all. A
    // race replaces this plan only when it is about the very thing this plan is
    // about; the file collision reaches review through its own `[plan-race]`
    // facet, where it sits BESIDE the plan instead of deleting it.
    const race = detectPlanRace(fen, studentColor);
    const raceText = race?.kind === 'passer-race' ? planRaceClause(fen, studentColor, 'live') : null;
    if (race?.kind === 'passer-race' && raceText) {
      return {
        id: `passer-race:${race.youQueenFirst ? 'you' : 'them'}`,
        text: `${raceText.charAt(0).toUpperCase()}${raceText.slice(1)}.`,
      };
    }
    return { id: 'passer-mine', text: `Your passed pawn on ${mine} is the trump here — push it and make them deal with the promotion.` };
  }
  const theirs = mostAdvanced(s.pawns.passedPawns[opp], opp);
  if (theirs) {
    return { id: 'passer-theirs', text: `Their passed pawn on ${theirs} is the danger — get a piece in front of it and blockade before it runs.` };
  }

  // Isolated queen's/king's pawn — the classic IQP plan.
  const myIso = s.pawns.isolatedPawns[studentColor].filter(isCentralFile)[0];
  if (myIso) {
    return { id: 'iqp-mine', text: `You're playing with the isolated pawn on ${myIso} — keep pieces on and use the open lines for activity; don't drift into the endgame where it's a target.` };
  }
  const theirIso = s.pawns.isolatedPawns[opp].filter(isCentralFile)[0];
  if (theirIso) {
    return { id: 'iqp-theirs', text: `They have the isolated pawn on ${theirIso} — trade pieces and pile onto it; the endgame is where it falls.` };
  }

  return null;
}
