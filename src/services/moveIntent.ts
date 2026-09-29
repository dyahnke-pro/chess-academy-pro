// moveIntent — what a move is FOR (David 2026-09-29: "focus on number 1": the
// coach describes the board; Naroditsky says why a move is played).
//
// Two questions, each answered by the engine, never by a guess:
//   PREVENTS — what would the opponent play if this side PASSED? If this move
//              takes that reply away (illegal now, or no longer one of their
//              good moves), the move stops it: "h3 — so …Bg4 isn't possible."
//   PREPARES — what would this side play if it moved AGAIN? If that move was
//              illegal or clearly worse before this one, this move prepares it:
//              "first X, so that Y".
// Both at once is "one move, two jobs". The same computer reads either seat, so
// "what is their move for?" is the same question asked of the other side.
//
// Pure: the four engine reads are handed in (see `IntentReads`). No engine call
// here, no model — the caller owns the search budget.
import { Chess } from 'chess.js';
import type { AnalysisLine } from '../types';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export interface IntentReads {
  /** Mover to move at the board BEFORE the move (the ordinary read). */
  before: readonly AnalysisLine[];
  /** Opponent to move at the board before the move — a null move: the side
   *  that is about to move passes. `nullMoveFen(fenBefore)`. */
  passBefore: readonly AnalysisLine[];
  /** Opponent to move at the board AFTER the move (the ordinary read). */
  after: readonly AnalysisLine[];
  /** Mover to move again at the board after the move — a null move for the
   *  opponent. `nullMoveFen(fenAfter)`. */
  passAfter: readonly AnalysisLine[];
}

export interface IntentMove { uci: string; san: string }

export interface MoveIntent {
  /** The reply this move took away from the opponent. */
  prevents: (IntentMove & { threatCp: number }) | null;
  /** The follow-up this move made possible or clearly better. */
  prepares: (IntentMove & { gainCp: number }) | null;
  text: string;
}

/** A real threat costs the side that passes at least this much. */
export const THREAT_CP = 100;
/** A follow-up is "prepared" when it gained at least this much. */
export const PREPARE_CP = 50;
/** A reply counts as gone when it now scores this much worse than their best. */
const GONE_CP = 60;

const MATE = 100_000;

/** Line value in centipawns from `pov`'s side ('w' | 'b'). Mate is folded to a
 *  large number, nearer mates larger. */
function valueFor(l: AnalysisLine, pov: 'w' | 'b'): number {
  const white = l.mate !== null && l.mate !== undefined
    ? (l.mate > 0 ? MATE - Math.abs(l.mate) : -(MATE - Math.abs(l.mate)))
    : l.evaluation;
  return pov === 'w' ? white : -white;
}

/** The same board with the other side to move — a pass. Null when the side to
 *  move is in check (a pass would be illegal) or the FEN is unreadable. */
export function nullMoveFen(fen: string): string | null {
  try {
    const c = new Chess(fen);
    if (c.inCheck()) return null;
    const parts = fen.split(' ');
    parts[1] = parts[1] === 'w' ? 'b' : 'w';
    parts[3] = '-';
    // The side passing is not in check, so nothing attacks its king and the
    // flipped board is legal as it stands.
    const flipped = parts.join(' ');
    new Chess(flipped);
    return flipped;
  } catch { return null; }
}

function sanOf(fen: string, uci: string): string | null {
  try {
    const m = new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || undefined });
    return m?.san ?? null;
  } catch { return null; }
}

const firstMove = (l: AnalysisLine | undefined): string | null => l?.moves?.[0] ?? null;

/** The value of `uci` among `lines` for `pov`, or null when it is not listed. */
function valueOfMove(lines: readonly AnalysisLine[], uci: string, pov: 'w' | 'b'): number | null {
  const hit = lines.find((l) => firstMove(l) === uci);
  return hit ? valueFor(hit, pov) : null;
}

/**
 * What `playedSan` (from `fenBefore`) is FOR, or null when the engine shows no
 * reply it took away and no follow-up it made possible.
 */
export function moveIntent(
  fenBefore: string,
  playedSan: string,
  reads: IntentReads,
  /** Whose move this is, for the wording: the student's, or their opponent's. */
  seat: 'student' | 'opponent',
): MoveIntent | null {
  let fenAfter: string;
  let playedUci: string;
  let mover: 'w' | 'b';
  try {
    const c = new Chess(fenBefore);
    mover = c.turn();
    const m = c.move(playedSan);
    if (!m) return null;
    playedUci = `${m.from}${m.to}${m.promotion ?? ''}`;
    fenAfter = c.fen();
    if (c.isGameOver()) return null;
  } catch { return null; }
  const opp: 'w' | 'b' = mover === 'w' ? 'b' : 'w';
  if (!reads.before.length || !reads.after.length) return null;

  // ── PREVENTS ────────────────────────────────────────────────────────────
  // Every reply the opponent would have after a pass is a candidate — his
  // "prevents" is often their second idea, not their first. The strongest
  // real threat the move took away is the one named.
  let prevents: MoveIntent['prevents'] = null;
  const passFen = nullMoveFen(fenBefore);
  if (passFen && reads.before[0]) {
    const ifBest = -valueFor(reads.before[0], mover);
    const theirBestNow = reads.after[0] ? valueFor(reads.after[0], opp) : null;
    const worstListed = reads.after.length ? Math.min(...reads.after.map((l) => valueFor(l, opp))) : null;
    for (const line of reads.passBefore) {
      const threat = firstMove(line);
      if (!threat) continue;
      // What passing would cost the mover: this reply after a pass, against
      // the mover's own best move now (both from the opponent's side).
      const threatCp = valueFor(line, opp) - ifBest;
      if (threatCp < THREAT_CP || (prevents && prevents.threatCp >= threatCp)) continue;
      const threatSan = sanOf(passFen, threat);
      // Moving the attacked piece away is a rescue, not a purpose worth naming.
      const rescue = threat.slice(2, 4) === playedUci.slice(0, 2);
      if (!threatSan || rescue || threat === playedUci) continue;
      const stillLegal = sanOf(fenAfter, threat) !== null;
      const threatNow = valueOfMove(reads.after, threat, opp);
      const gone = !stillLegal
        || (theirBestNow !== null && threatNow !== null && threatNow <= theirBestNow - GONE_CP)
        // Not even among their listed moves: worse than the worst of them.
        || (threatNow === null && theirBestNow !== null && worstListed !== null && worstListed <= theirBestNow - GONE_CP);
      if (gone) prevents = { uci: threat, san: threatSan, threatCp };
    }
  }

  // ── PREPARES ────────────────────────────────────────────────────────────
  let prepares: MoveIntent['prepares'] = null;
  const againFen = nullMoveFen(fenAfter);
  const follow = firstMove(reads.passAfter[0]);
  if (againFen && follow && reads.passAfter[0] && follow !== playedUci) {
    const followSan = sanOf(againFen, follow);
    // A capture or a check after a PASS is an artifact of the pass — the
    // opponent never got to answer. A plan move is quiet.
    const forcing = !!followSan && /[x+#]/.test(followSan);
    const nowValue = valueFor(reads.passAfter[0], mover);
    const legalBefore = sanOf(fenBefore, follow) !== null;
    const beforeValue = valueOfMove(reads.before, follow, mover);
    // Illegal before → the move made it possible. Listed before → the gain is
    // exact. Legal but unlisted → unknown, and unknown is never claimed.
    const gainCp = !legalBefore ? PREPARE_CP : beforeValue !== null ? nowValue - beforeValue : null;
    if (followSan && !forcing && gainCp !== null && gainCp >= PREPARE_CP) prepares = { uci: follow, san: followSan, gainCp };
  }

  if (!prevents && !prepares) return null;
  return { prevents, prepares, text: phrase(playedSan, prevents, prepares, seat, mover, fenAfter) };
}

function phrase(
  san: string,
  prevents: MoveIntent['prevents'],
  prepares: MoveIntent['prepares'],
  seat: 'student' | 'opponent',
  mover: 'w' | 'b',
  fenAfter: string,
): string {
  const dot = (s: string, side: 'w' | 'b'): string => (side === 'b' ? `…${s}` : s);
  const opp: 'w' | 'b' = mover === 'w' ? 'b' : 'w';
  const played = dot(san, mover);
  const key = stemKeyOf(fenAfter);
  if (seat === 'student') {
    const stop = prevents ? dot(prevents.san, opp) : '';
    const prep = prepares ? dot(prepares.san, mover) : '';
    if (prevents && prepares) return `${played} does two jobs: it stops ${stop}, and it prepares ${prep}.`;
    if (prevents) return rotateStem([`${played} — so ${stop} isn't possible any more.`, `The point of ${played}: it takes ${stop} away.`], key);
    return rotateStem([`${played} prepares ${prep}.`, `${played} first, so that ${prep} comes next.`], key);
  }
  const stop = prevents ? `your ${dot(prevents.san, opp)}` : '';
  const prep = prepares ? dot(prepares.san, mover) : '';
  if (prevents && prepares) return `Their ${played} does two jobs: it stops ${stop}, and it prepares ${prep}.`;
  if (prevents) return rotateStem([`Their ${played} stops ${stop}.`, `The point of their ${played}: it takes ${stop} away.`], key);
  return rotateStem([`Their ${played} prepares ${prep}.`, `They play ${played} first, so that ${prep} comes next.`], key);
}
