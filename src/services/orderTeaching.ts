// BATCH 1 ON THE LIVE BOARD — what the student's move teaches about opening
// equivalence, order and timing, said AFTER the move (and after their reply,
// where the lesson is the reply). Composed here once and pushed by
// `learnBoardTeaching.studentMoveTeaching`, so the page gains every lane with
// no new import; the Learn door ranks them like every other lane.
//
// DUAL-USE: each lane that answers a question the board posed carries the
// held row it proves (`evidence`), recorded by `recordTeachingEvidence`; a
// miss is the live slip capture's to record (one row, never two).
import { Chess } from 'chess.js';
import { legalLineProof, squaresProof, type Proof } from './proof';
import { tradeLedger } from './tempoCount';
import { notYetPlayed } from './notYetPlayed';
import { heldResource } from './holdResource';
import { captureChoice } from './captureChoice';
import { kickAfterRecapture } from './kickMap';
import { pawnSquareTaken, pawnSquareRaceProof } from './planRace';
import { patternFails } from './patternFails';
import { openingEquivalence } from './openingEquivalence';
import type { ArrowClaim } from './arrowDoor';
import type { StudentMoveInput, TeachingHint } from './learnBoardTeaching';

/** A proof's line as board arrows, ply by ply — the words and the marks from
 *  one source. */
export function proofArrows(proof: Proof, source: string): ArrowClaim[] {
  const line = proof.line;
  if (!line) return [];
  const out: ArrowClaim[] = [];
  let c: Chess;
  try { c = new Chess(line.fen); } catch { return out; }
  for (const san of line.sans) {
    const before = c.fen();
    try {
      const m = c.move(san);
      out.push({ from: m.from, to: m.to, role: 'line', fen: before, source });
    } catch { break; }
  }
  return out;
}

/** Everything batch 1 can teach about the student's move. `i.reply` is their
 *  answer when it is on the board. */
export function orderTeaching(i: StudentMoveInput): TeachingHint[] {
  const out: TeachingHint[] = [];
  let me: 'w' | 'b';
  try { me = new Chess(i.fenBefore).turn(); } catch { return out; }
  const reply = i.reply ? i.reply.replace(/^…/, '') : null;

  // THE MOVE-COUNT LEDGER: the trade the reply completed, counted.
  if (reply && i.cpLoss < 50) {
    const led = tradeLedger([...i.history, reply], me);
    const proof = led ? squaresProof(led.text, led.squares) : null;
    if (led && proof) out.push({ lane: 'tradeLedger', text: led.text, proof, squares: [led.square], claims: [`ledger:${led.kind}:${led.square}`], event: { name: 'coach_trade_ledger', props: { surface: 'coach-teach', kind: led.kind } }, arrows: [], evidence: { tag: 'tempo-handed', posedImportance: 50 } });
  }

  // ORDER FROM WHAT THEY HAVE NOT PLAYED: development first, the guard can wait.
  const ny = notYetPlayed(i.fenBefore, i.san, i.bestSan, i.cpLoss);
  if (ny) {
    const proof = squaresProof(ny.text, ny.squares);
    if (proof) out.push({ lane: 'notYetPlayed', text: ny.text, proof, squares: ny.squares, claims: [`not-yet-played:${ny.target}`], event: { name: 'coach_not_yet_played', props: { surface: 'coach-teach' } }, arrows: [], evidence: { tag: 'neglected-development', posedImportance: 50 } });
  }

  // A RESOURCE KEPT IN HAND until it bites.
  const hold = heldResource(i.fenBefore, i.san, i.bestSan, i.cpLoss);
  if (hold) {
    const lp = legalLineProof(hold.fen, hold.sans);
    if (lp) {
      const proof: Proof = { ...lp, squares: hold.squares };
      out.push({ lane: 'holdResource', text: hold.text, proof, squares: hold.squares, claims: [`hold:${hold.resource}`], event: { name: 'coach_resource_held', props: { surface: 'coach-teach', check: hold.check } }, arrows: proofArrows(proof, 'learn.holdResource'), evidence: { tag: 'bad-trade', posedImportance: 50 } });
    }
  }

  // THE OFF-BOOK METHOD: which capture, by the square each one hands them.
  const cc = captureChoice(i.fenBefore, i.san, i.bestSan, i.cpLoss);
  if (cc) {
    const lp = legalLineProof(i.fenBefore, cc.bad);
    if (lp) {
      const proof: Proof = { ...lp, squares: [cc.square] };
      out.push({ lane: 'captureChoice', text: cc.text, proof, squares: cc.squares, claims: [`capture-choice:${cc.square}`], event: { name: 'coach_capture_choice', props: { surface: 'coach-teach', playedBad: cc.playedBad } }, arrows: proofArrows(proof, 'learn.captureChoice'), ...(cc.playedBad ? {} : { evidence: { tag: 'created-pawn-weakness' as const, posedImportance: 60 } }) });
    }
  }

  // THE KICK MAP: the capture dragged their piece onto a square a pawn hits.
  if (i.cpLoss < 30) {
    const kick = kickAfterRecapture(i.fenBefore, i.san, reply, i.bestLine?.moves ?? []);
    const lp = kick ? legalLineProof(i.fenBefore, kick.sans) : null;
    if (kick && lp) {
      const proof: Proof = { ...lp, squares: kick.squares };
      out.push({ lane: 'kickMap', text: kick.text, proof, squares: kick.squares, claims: [`kick:${kick.kick.square}`], event: { name: 'coach_kick_map', props: { surface: 'coach-teach', landings: kick.kick.landings.length } }, arrows: proofArrows(proof, 'learn.kickMap'), evidence: { tag: 'tempo-handed', posedImportance: 50 } });
    }
  }

  // THE MIRROR-STRUCTURE RACE, WON: the pawn reached the contested square first.
  const won = pawnSquareTaken(i.fenBefore, i.san, i.cpLoss);
  if (won) {
    const proof = pawnSquareRaceProof(i.fenBefore, won.race);
    if (proof) out.push({ lane: 'breakRace', text: won.text, proof, squares: won.squares, claims: [`pawn-race:${won.race.square}`], event: { name: 'coach_pawn_race_won', props: { surface: 'coach-teach' } }, arrows: [], evidence: { tag: 'mistimed-pawn-break', posedImportance: 60 } });
  }

  // THE STOCK SHOT THAT FAILED HERE — and the student did not play it.
  if (i.topLines && i.topLines.length >= 2 && i.cpLoss < 50) {
    const pf = patternFails(i.fenBefore, i.topLines, i.san);
    if (pf) out.push({ lane: 'patternFails', text: pf.text, proof: pf.proof, squares: pf.squares, claims: [`pattern-fails:${pf.tempting}`], event: { name: 'coach_pattern_fails', props: { surface: 'coach-teach', pattern: pf.pattern } }, arrows: proofArrows(pf.proof, 'learn.patternFails'), evidence: { tag: 'calculation-depth', posedImportance: 70 } });
  }

  // THE OPENING THIS BOARD IS, once their reply is on it.
  if (reply) {
    const eq = openingEquivalence([...i.history, reply], me);
    if (eq) out.push({ lane: 'openingEquivalence', text: eq.text, proof: eq.proof, squares: eq.squares, claims: [`equivalence:${eq.name}`], event: { name: 'coach_opening_equivalence', props: { surface: 'coach-teach', kind: eq.kind } }, // No arrows: an inserted-move proof runs on the REFERENCE board, not
      // the one in front of the student.
      arrows: [] });
  }
  return out;
}
