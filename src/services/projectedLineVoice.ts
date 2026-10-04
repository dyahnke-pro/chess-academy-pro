/**
 * projectedLineVoice — the ONE per-ply voice for a line the coach PLAYS OUT on
 * the board for the student (the review's stronger-line walk and its shot
 * sequence). It replaced a per-ply composition that ran every ply — the
 * opponent's replies and the moves after the line had already won — through
 * the same move describers, so the student heard:
 *
 *   "…then they answer Kf1, the king trains on the knight on e2 — pressure
 *    they have to answer, Nxc3, you win the queen, the knight trains on the
 *    pawn on a2 — pressure they have to answer"
 *   "Qd8+, then Rxd8, they take the queen, landing a removal of the defender"
 *
 * Four defects, one cause (a move describer cannot know which line it is in):
 *  - a motif credited to the OPPONENT's reply — the line's point is the
 *    student's, and a reply that "lands" something inside it is the defender's
 *    forced answer, not their tactic;
 *  - a positional clause on every reply ("the king steps toward safety");
 *  - "X trains on Y — pressure they have to answer" on a move AFTER the queen
 *    was already won, where nothing is under question any more;
 *  - the king's own clause on a forced king reply.
 *
 * So the line is read as a LINE (the reference shape is
 * `puzzleConceptExplanation`): the student's moves carry their computed facts
 * and the line's motif once, where it lands; the opponent's replies are stated
 * plainly in the one shared vocabulary (`opponentReplySentence`); and nothing
 * is said after the line's POINT — mate, or the settled material result
 * `proofCut` computes. Silence after the point is a computed verdict, not a cap
 * (G4.5): the line has proved its claim.
 *
 * G0: every sentence is computed (chess.js, `computePlyFacts`, `proofCut`,
 * `tacticInvariant`); seat law: you / they, never we.
 */
import { Chess } from 'chess.js';
import { plyFactsString, renderPlyFactLine, type PlyFacts } from './pvPlayback';
import { buildReviewMoveTeaching } from './reviewMoveTeaching';
import { explainTemptingCapture } from './reviewTeachingPoints';
import { opponentReplySentence } from './puzzleConceptExplanation';
import { proofCut } from './exchangeLedger';
import { tacticInvariant } from './conceptEngine';

/** One ply of a projected line — a `PvPly` carries all of these. */
export interface ProjectedLinePly {
  san: string;
  moverColor: 'white' | 'black';
  fenBefore: string;
  fenAfter: string;
  facts: PlyFacts;
}

export interface ProjectedLineVoiceOptions {
  /** A quiet student move (no capture, check, tactic or structure fact) still
   *  gets the board-true positional teacher. The stronger-line walk wants it
   *  ("every move in the shown line gets a why"); the shot sequence, which
   *  speaks only keystones, does not. */
  teachQuiet: boolean;
  /** Add the "why not just take?" clause to the student's plies. */
  explainTemptation: boolean;
}

/** How many plies of the line make its point: through mate, or through the
 *  settled material the line WINS for the student. A line that wins nothing
 *  settled — or whose count is still down, as in a sacrifice still being paid
 *  back by the attack (Morphy's Nxb5 cxb5 Bxb5+ then O-O-O+) — has not made its
 *  point early, so every ply of it may speak. */
function pointLength(plies: readonly ProjectedLinePly[], studentWB: 'w' | 'b'): number {
  if (plies.length === 0) return 0;
  const proof = proofCut(plies[0].fenBefore, plies.map((p) => p.san), studentWB);
  if (!proof) return plies.length;
  const gained = proof.mate || (proof.ledger?.netPawns ?? 0) > 0;
  return gained ? Math.min(Math.max(1, proof.plies), plies.length) : plies.length;
}

function sentence(text: string): string {
  const t = text.trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

/**
 * The spoken line for each ply of a projected line played FOR the student (the
 * student's colour moves first or second — the seat is read per ply). Null at
 * a ply that says nothing (a quiet keystone-only ply, or any ply after the
 * line's point). The caller pairs entries with the plies it plays out.
 */
export function projectedLineVoice(
  plies: readonly ProjectedLinePly[],
  studentColor: 'white' | 'black',
  opts: ProjectedLineVoiceOptions,
): (string | null)[] {
  const studentWB: 'w' | 'b' = studentColor === 'white' ? 'w' : 'b';
  const end = pointLength(plies, studentWB);
  // The line's motif, said once — on the STUDENT's ply that lands it, inside
  // the point. A reply's "tactic" is never the line's lesson.
  let motifAt = -1;
  let motif: string | null = null;
  for (let i = 0; i < end; i += 1) {
    const p = plies[i];
    if (p.moverColor !== studentColor || !p.facts.tacticLanded) continue;
    const inv = tacticInvariant(p.facts.tacticLanded);
    if (!inv) continue;
    const full = inv.full.charAt(0).toUpperCase() + inv.full.slice(1);
    motif = /[.!?]$/.test(full) ? full : `${full}.`;
    motifAt = i;
    break;
  }
  const sans = plies.map((p) => p.san);
  let prevStudentTo: string | null = null;
  return plies.map((p, i): string | null => {
    const studentMove = p.moverColor === studentColor;
    // The square a student CAPTURE landed on — only a capture can be taken
    // back (a pawn pushed to c5 and taken there was won, not recaptured).
    let to: string | null = null;
    let inCheck = false;
    try {
      const c = new Chess(p.fenBefore);
      inCheck = c.inCheck();
      const mv = c.move(p.san);
      to = mv.captured ? mv.to : null;
    } catch { to = null; }
    if (i >= end) {
      // Past the point: the board still plays the moves; the voice has said
      // what the line proves and adds nothing.
      prevStudentTo = studentMove ? to : null;
      return null;
    }
    if (!studentMove) {
      const reply = p.facts.isMate ? `${p.san} — checkmate.` : opponentReplySentence(p.fenBefore, p.san, prevStudentTo);
      prevStudentTo = null;
      return reply;
    }
    prevStudentTo = to;
    if (p.facts.isMate) return `${p.san} — checkmate.`;
    const facts = plyFactsString(p) ?? renderPlyFactLine(p);
    let base = facts;
    if (!base && opts.teachQuiet) {
      // Out of check the move's point is the check it answers — the king's
      // "steps toward safety" clause is the describer guessing.
      base = inCheck ? `You answer the check with ${p.san}.` : buildReviewMoveTeaching(p.fenBefore, p.san, true);
    }
    const parts = [base ? sentence(base) : null];
    if (i === motifAt && motif) parts.push(motif);
    if (opts.explainTemptation) parts.push(explainTemptingCapture(p.fenBefore, p.san, 'you', sans.slice(i)));
    const out = parts.filter((x): x is string => !!x && x.trim().length > 0).join(' ').trim();
    return out.length > 0 ? out : null;
  });
}
