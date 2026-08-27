// positionFacts — THE COMPOSER (G0). Ties the new board-truth computers into one
// ordered, DNA-voiced fact packet for a position, gated by the importance model.
// This is the runtime mirror of the offline render-briefing (docs/plans/
// 2026-08-26-position-facts-calculator.md): the COMPUTER selects (importance),
// orders (rank), and writes the clauses in the DNA register; the surface hands
// them to voiceFacts, which voices them in order (or preferRaw speaks them).
//
// RECONCILED, not duplicated:
//  • It takes the surface's EXISTING StockfishAnalysis (the warm eval-bar read) —
//    no second MultiPV scan.
//  • The decision-leverage bar reuses `criticalityThresholds` (scanCriticality's
//    rating-scaled doctrine), so the two never disagree.
//  • `computeCriticality` is the sharpness SCORE (from the same analysis);
//    `computeImportance` is the speak/rank verdict. One analysis, both reads.
//  • Perturbation (expensive) runs ONLY when importance says the moment matters.
import type { StockfishAnalysis } from '../types';
import { computeCriticality, criticalitySignalsFromAnalysis, type CriticalityRead } from './criticality';
import { computeImportance, type ImportanceVerdict } from './narrationImportance';
import { criticalityThresholds, type Severity } from './criticalityScan';
import { computeMustDefend, type MustDefend } from './threatOut';
import { computeLeansOn, type LeansOn, type EvalBoardFn } from './perturbation';
import { buildDeliberation, deliberationFacts, type Deliberation } from './deliberation';
import { detectLatentDanger, latentDangerClause, type LatentDanger } from './latentDanger';

const PNAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export interface PositionFactsInput {
  fen: string;
  /** The side to move at `fen`. Decision-leverage belongs to this side. */
  moverColor: 'w' | 'b';
  /** The student's colour. When the student is to move, the decision facts are
   *  framed as theirs ("your critical moment"); when the OPPONENT is to move,
   *  the same facts are framed as the opponent's INTENT ("White is threatening…")
   *  — so the coach explains both sides, per the teach-both standard. */
  studentColor: 'w' | 'b';
  rating?: number;
  /** The surface's existing analysis (eval-bar read). topLines = the MultiPV fan. */
  analysis: Pick<StockfishAnalysis, 'topLines' | 'evaluation' | 'isMate' | 'mateIn' | 'seldepth' | 'depth' | 'wdl'>;
  /** Realized swing (cp cost, mover-POV) of a move JUST played, if grading one. */
  cpLossCp?: number | null;
  /** A declared teaching beat here (opening name / plan / keystone). */
  teachingBeat?: boolean;
  /** Material hanging to the MOVER right now (they can grab it) — the criticality
   *  `loose` signal. Optional; 0 when not computed. */
  looseNow?: number;
  /** Injected static-eval fn for the perturbation probe. When omitted, leans-on
   *  is skipped (it's the one expensive fact). */
  evalBoard?: EvalBoardFn;
}

export interface PositionFactsResult {
  importance: ImportanceVerdict;
  criticality: CriticalityRead;
  /** What the STUDENT must defend (the opponent's standing threat). */
  mustDefend: MustDefend;
  /** The student's best-placed piece + what it leans on. */
  leansOn: LeansOn | null;
  /** The OPPONENT's best-placed piece + what it leans on — the counter, so the
   *  coach can explain their asset AND how to undermine it. */
  opponentLeansOn: LeansOn | null;
  /** The weighing — the top candidates + why each falls short (the discussion).
   *  Null when it's not the student's move or there's nothing to weigh. */
  deliberation: Deliberation | null;
  /** A pin/skewer in waiting on the student's own king/queen (the prevention
   *  layer). Null when the geometry isn't there. */
  latentDanger: LatentDanger | null;
  /** Board-true clauses, most-important-first, each TAGGED by kind so a surface
   *  can emit only what its existing lanes don't already cover (no walk-over). */
  clauses: ClauseItem[];
}

export type ClauseKind = 'deliberation' | 'latent-danger' | 'must-defend' | 'key-moment' | 'opponent-intent' | 'student-leans' | 'opponent-leans' | 'convert';
export interface ClauseItem { kind: ClauseKind; rank: number; text: string; }

/** The ordered clause TEXT, optionally dropping kinds a surface already covers. */
export function clauseText(items: readonly ClauseItem[], exclude: readonly ClauseKind[] = []): string[] {
  return items.filter((c) => !exclude.includes(c.kind)).map((c) => c.text);
}

/** Best-for-the-mover minus runner-up, from the analysis fan (mover-POV, so a
 *  bigger gap = more of an only-move). */
function moverGap12(analysis: PositionFactsInput['analysis'], moverColor: 'w' | 'b'): number {
  const sign = moverColor === 'w' ? 1 : -1;
  const cps = [...(analysis.topLines ?? [])]
    .sort((a, b) => a.rank - b.rank)
    .map((l) => (l.mate != null ? (l.mate > 0 ? 100000 : -100000) : l.evaluation) * sign);
  // Fewer than 2 lines = the MultiPV fan wasn't run wide enough to judge
  // decision-leverage. We can't tell a genuine only-move (1 legal move) from a
  // width-1 analysis without the legal-move count, so claim NO leverage rather
  // than a false only-move (scanCriticality uses legalCount for the real thing).
  if (cps.length < 2) return 0;
  return cps[0] - cps[1];
}

function severityFromGap(gapCp: number, rating: number): Severity {
  const th = criticalityThresholds(rating);
  return gapCp >= th.onlyMove ? 'only-move' : gapCp >= th.critical ? 'critical' : gapCp >= th.notable ? 'notable' : 'none';
}

export async function computePositionFacts(input: PositionFactsInput): Promise<PositionFactsResult> {
  const { fen, moverColor, studentColor, analysis } = input;
  const opponentColor: 'w' | 'b' = studentColor === 'w' ? 'b' : 'w';
  const rating = input.rating ?? 1500;

  // OPENING PHASE — PositionFacts is a MIDDLEGAME live supply. The opening is
  // owned by corpus notes + baked narration (Tiers 1–2); a perturbation "best
  // piece" probe on a near-home position is noise ("their knight on b8 is doing
  // the most work — trade it off" on move one). So in the opening we suppress
  // the whole positional-campaign + decision-leverage set and keep ONLY a real
  // hanging threat (a genuinely dropped piece IS worth saying, even early).
  const fullmove = Number.parseInt(fen.split(' ')[5] ?? '1', 10) || 1;
  const openingPhase = fullmove < 10;

  // Cheap facts (no search): what the STUDENT must defend + the sharpness score.
  const mustDefend = computeMustDefend(fen, studentColor);
  const criticality = computeCriticality(
    criticalitySignalsFromAnalysis(analysis, { looseMaterial: input.looseNow ?? 0, threatNet: mustDefend.net }),
  );

  // The verdict: does it speak, and how does it rank?
  const gap12 = moverGap12(analysis, moverColor);
  const evalCpWhitePov = analysis.isMate
    ? (analysis.mateIn ?? 0) > 0 ? 100000 : -100000
    : analysis.evaluation;
  const importance = computeImportance({
    decision: { severity: severityFromGap(gap12, rating), gapCp: gap12 },
    cpLossCp: input.cpLossCp ?? null,
    threatNet: mustDefend.net,
    teachingBeat: !!input.teachingBeat,
    evalCpWhitePov,
    // WdlRead {win,draw,loss} → the [w,d,l] tuple the importance model reads.
    // (Passing the object directly makes wdl[0]/wdl[2] undefined → every
    // position falsely reads "decided" and goes silent.)
    wdl: analysis.wdl ? [analysis.wdl.win, analysis.wdl.draw, analysis.wdl.loss] : null,
  }, rating);

  // Perturbation is expensive → only when the moment earns it AND a probe fn was
  // supplied AND we're out of the opening. Probe BOTH sides: the student's
  // asset, and the opponent's best piece (name their asset + how to undermine
  // it). A teaching beat alone no longer opens this gate — the "best piece"
  // read is a real middlegame imbalance, not opening narration. Its own
  // thresholds still gate whether there's a genuine supporter.
  let leansOn: LeansOn | null = null;
  let opponentLeansOn: LeansOn | null = null;
  if (importance.speak && input.evalBoard && !openingPhase && importance.rank >= 45) {
    try { leansOn = await computeLeansOn(fen, studentColor, input.evalBoard); } catch { leansOn = null; }
    try { opponentLeansOn = await computeLeansOn(fen, opponentColor, input.evalBoard); } catch { opponentLeansOn = null; }
  }

  // The weighing (the discussion) — the top candidates + why each falls short.
  // Only the STUDENT's own move is worth weighing out loud, and never in the
  // opening (book, nothing to deliberate). Cheap: no search, chess.js over the
  // fan we already have.
  const studentToMove = moverColor === studentColor;
  const deliberation = (!openingPhase && studentToMove)
    ? buildDeliberation({ analysis, fenBefore: fen, moverColor })
    : null;

  // The prevention layer — a pin/skewer in waiting on the student's own king or
  // queen (the heartbreak class). Pure board geometry, no engine. Prophylactic,
  // so it's the student's concern on their move, out of the opening.
  const latentDanger = (!openingPhase && studentToMove)
    ? detectLatentDanger(fen, studentColor)
    : null;

  return {
    importance, criticality, mustDefend, leansOn, opponentLeansOn, deliberation, latentDanger,
    clauses: buildClauses({ importance, mustDefend, leansOn, opponentLeansOn, studentToMove, openingPhase, deliberation, latentDanger }),
  };
}

/** Fact → board-true DNA clause, emitted most-important-first (rank order). Each
 *  names only what the board really has (the pieces come straight from the
 *  probes, which read the live FEN). The decision-leverage clause is framed by
 *  whose move it is: the STUDENT's ("your critical moment") or, when the opponent
 *  is to move, the opponent's INTENT ("they have a real decision") — so the coach
 *  explains both sides. Empty when nothing earns voice. */
function buildClauses(a: {
  importance: ImportanceVerdict;
  mustDefend: MustDefend;
  leansOn: LeansOn | null;
  opponentLeansOn: LeansOn | null;
  studentToMove: boolean;
  openingPhase: boolean;
  deliberation: Deliberation | null;
  latentDanger: LatentDanger | null;
}): ClauseItem[] {
  const { importance, mustDefend, leansOn, opponentLeansOn, studentToMove, openingPhase, deliberation, latentDanger } = a;
  // A latent danger to your own king is worth a word even in an otherwise quiet
  // spot — it does not need the importance gate to have fired.
  if (!importance.speak && !latentDanger) return [];
  const ranked: ClauseItem[] = [];

  // THE WEIGHING LEADS (David 2026-08-26, the keystone) — narrate the choice, not
  // just the winner: the tempting alternatives + why each falls short, then the
  // move. Highest rank so it opens the discussion. Only fires on a genuine
  // student choice out of the opening (gated at computePositionFacts).
  if (deliberation?.isRealChoice) {
    const text = deliberationFacts(deliberation);
    if (text) ranked.push({ kind: 'deliberation', rank: 95, text });
  }

  // The prevention layer — a pin/skewer in waiting on your own king/queen. High
  // rank (a king exposure is worth catching), guide-don't-tell: it names the
  // alignment and the line, never a move. (Gated to student-to-move, out of the
  // opening, at computePositionFacts.)
  if (latentDanger) {
    ranked.push({ kind: 'latent-danger', rank: 80, text: latentDangerClause(latentDanger) });
  }

  // Incoming fire — the opponent's standing threat against the student (their
  // intent, and the student's must-defend). Board-true, named. This is the ONE
  // fact that speaks in the opening: a genuinely dropped piece is worth saying
  // even on move two.
  if (mustDefend.net >= 3 && mustDefend.pieces[0]) {
    const p = mustDefend.pieces[0];
    ranked.push({ kind: 'must-defend', rank: 75, text: `They're threatening to win the ${PNAME[p.piece.toLowerCase()]} on ${p.square} — that has to be met first.` });
  }
  // In the opening, nothing but a real hanging threat speaks — no "critical
  // moment" / "knife-edge" / "best piece, trade it off" narration on move one.
  if (openingPhase) return ranked;

  // Decision leverage — framed by whose move it is.
  if (studentToMove) {
    if (importance.tier === 'only-move') ranked.push({ kind: 'key-moment', rank: 85, text: `Only one move really holds here — this is the moment to slow down.` });
    else if (importance.tier === 'critical') ranked.push({ kind: 'key-moment', rank: 65, text: `This is a critical moment — the choice here is the one that decides it.` });
  } else {
    // The opponent is on move → explain their intent, not a "slow down" to the
    // student who isn't choosing anything right now.
    if (importance.tier === 'only-move') ranked.push({ kind: 'opponent-intent', rank: 55, text: `The opponent is on a knife-edge here — only one move keeps them in it.` });
    else if (importance.tier === 'critical') ranked.push({ kind: 'opponent-intent', rank: 50, text: `This is where the opponent has to find something — the position is sharp for them.` });
  }
  // The campaign — the student's asset, and the opponent's (with the counter).
  if (leansOn) ranked.push({ kind: 'student-leans', rank: 40, text: `Your ${leansOn.piece} on ${leansOn.square} is doing the work — it leans on the ${leansOn.leansOn.piece} on ${leansOn.leansOn.square}, so keep that support in place.` });
  if (opponentLeansOn) ranked.push({ kind: 'opponent-leans', rank: 45, text: `Their ${opponentLeansOn.piece} on ${opponentLeansOn.square} is their best piece — but it leans on the ${opponentLeansOn.leansOn.piece} on ${opponentLeansOn.leansOn.square}; take that away and it's ordinary.` });
  // Convert-mode — decided game, one beat.
  if (importance.tier === 'convert') ranked.push({ kind: 'convert', rank: 20, text: `This is technique now — convert it cleanly, no heroics.` });

  return ranked.sort((a2, b2) => b2.rank - a2.rank);
}
