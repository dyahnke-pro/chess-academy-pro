// BATCH 1 READS — opening equivalence, order and timing, as POSITION reads
// (the student to move, or any ply for the opening's identity). One composer so
// the one producer (`thinkAloud.depthClauses`) reaches them on every surface it
// already reaches — Learn's position facts, the live coach, phase narration,
// "read this position" and Why — with one call, not eight.
//
// Every read here carries its proof, and each speaks only where the engine's
// own move agrees with it: the read EXPLAINS the engine's choice, it never
// argues for a different one (G0).
import { Chess } from 'chess.js';
import { openingEquivalence } from './openingEquivalence';
import { notYetIdea } from './notYetPlayed';
import { holdIdea } from './holdResource';
import { captureTooEarly } from './tempoCount';
import { patternFails } from './patternFails';
import { captureChoiceIdea } from './captureChoice';
import { pawnSquareRaceRead, pawnSquareRaceProof } from './planRace';
import { kickLineRead } from './kickMap';
import { legalLineProof, squaresProof, type Proof } from './proof';
import { costStakes, type FactStakes } from './factStakes';

export type OrderReadKind = 'equivalence' | 'timing' | 'refuted' | 'capture-choice' | 'plan-race' | 'kick';

export interface OrderRead {
  kind: OrderReadKind;
  text: string;
  proof: Proof;
  squares: string[];
  /** A once-per-game claim (the voice package drops a repeat). */
  claim: string;
  lines?: Array<{ fen: string; sans: string[] }>;
  stakes?: FactStakes;
  /** It names the student's move — speaks only where the move may be named. */
  namesMove: boolean;
}

type Line = { moves: readonly string[]; evaluation: number; mate: number | null };

const seatCp = (fen: string, l: Line): number => {
  const white = l.mate != null ? (l.mate > 0 ? 100000 : -100000) : l.evaluation;
  return fen.split(' ')[1] === 'w' ? white : -white;
};

/**
 * `fen` = the board; `history` = every SAN of the game to it; `student` the
 * student's colour; `topLines` the engine's multi-PV lines at `fen` (best
 * first, UCI); `engineBest` the best move's SAN.
 */
export function orderReads(args: {
  fen: string;
  history: readonly string[];
  student: 'w' | 'b';
  topLines: readonly Line[];
  engineBest: string | null;
}): OrderRead[] {
  const out: OrderRead[] = [];
  const { fen, student, engineBest } = args;
  let toMove: 'w' | 'b';
  try { toMove = new Chess(fen).turn(); } catch { return out; }

  // THE OPENING THIS BOARD IS (any ply): only when the history reaches this
  // board, so the read is about the game on the board.
  try {
    const c = new Chess();
    for (const m of args.history) c.move(m);
    if (c.fen().split(' ')[0] === fen.split(' ')[0]) {
      const eq = openingEquivalence(args.history, student);
      if (eq) out.push({ kind: 'equivalence', text: eq.text, proof: eq.proof, squares: eq.squares, claim: `equivalence:${eq.name}`, namesMove: false });
    }
  } catch { /* a history from another start is never guessed at */ }

  if (toMove !== student) return out;

  // WHAT CAN WAIT, from what they have not played yet.
  const ny = notYetIdea(fen, student, engineBest);
  if (ny) {
    const proof = squaresProof(ny.text, ny.squares);
    if (proof) out.push({ kind: 'timing', text: ny.text, proof, squares: ny.squares, claim: `not-yet-played:${ny.target}`, namesMove: false });
  }
  // A RESOURCE TO HOLD until their move makes it bite.
  const hold = holdIdea(fen, student, engineBest);
  if (hold) {
    const proof = legalLineProof(hold.fen, hold.sans);
    if (proof) out.push({ kind: 'timing', text: hold.text, proof: { ...proof, squares: hold.squares }, squares: hold.squares, claim: `hold:${hold.resource}`, lines: [{ fen: hold.fen, sans: [...hold.sans] }], namesMove: false });
  }
  // A CAPTURE THAT WOULD DEVELOP THEIR PIECE FOR THEM.
  const early = captureTooEarly(fen, student, engineBest);
  if (early) {
    const proof = legalLineProof(fen, [early.capture, early.recapture], true);
    if (proof) out.push({ kind: 'timing', text: early.text, proof, squares: early.squares, claim: `capture-early:${early.squares[1]}`, lines: [{ fen, sans: [early.capture, early.recapture] }], namesMove: false });
  }
  // THE STOCK SHOT THAT FAILS HERE — needs the engine's line for that move.
  const pf = patternFails(fen, args.topLines);
  if (pf) {
    const tempting = args.topLines.find((l) => {
      try { return new Chess(fen).move({ from: l.moves[0].slice(0, 2), to: l.moves[0].slice(2, 4), promotion: l.moves[0][4] }).san === pf.tempting; } catch { return false; }
    });
    const gap = tempting && args.topLines[0] ? seatCp(fen, args.topLines[0]) - seatCp(fen, tempting) : null;
    out.push({ kind: 'refuted', text: pf.text, proof: pf.proof, squares: pf.squares, claim: `pattern-fails:${pf.tempting}`, ...(pf.proof.line ? { lines: [{ fen: pf.proof.line.fen, sans: [...pf.proof.line.sans] }] } : {}), ...(gap !== null && costStakes(gap) ? { stakes: costStakes(gap) as FactStakes } : {}), namesMove: false });
  }

  // ── reads that NAME the student's move (the engine's) ──
  const cc = captureChoiceIdea(fen, engineBest);
  if (cc) {
    const proof = legalLineProof(fen, cc.bad);
    if (proof) out.push({ kind: 'capture-choice', text: cc.text, proof: { ...proof, squares: [cc.square] }, squares: cc.squares, claim: `capture-choice:${cc.square}`, namesMove: true });
  }
  const race = pawnSquareRaceRead(fen, student, engineBest);
  if (race) {
    const proof = pawnSquareRaceProof(fen, race.race);
    if (proof) out.push({ kind: 'plan-race', text: race.text, proof, squares: proof.squares ? [...proof.squares] : race.squares, claim: `pawn-race:${race.race.square}`, namesMove: true });
  }
  const kick = args.topLines[0] ? kickLineRead(fen, args.topLines[0].moves) : null;
  if (kick) {
    const proof = legalLineProof(fen, kick.sans);
    if (proof) out.push({ kind: 'kick', text: kick.text, proof: { ...proof, squares: kick.squares }, squares: kick.squares, claim: `kick:${kick.kick.square}`, lines: [{ fen, sans: [...kick.sans] }], namesMove: true });
  }
  return out;
}
