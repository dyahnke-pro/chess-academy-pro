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

const PNAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export interface PositionFactsInput {
  fen: string;
  moverColor: 'w' | 'b';
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
  mustDefend: MustDefend;
  leansOn: LeansOn | null;
  /** Board-true clauses, most-important-first, ready for the facts string. */
  clauses: string[];
}

/** Best-for-the-mover minus runner-up, from the analysis fan (mover-POV, so a
 *  bigger gap = more of an only-move). */
function moverGap12(analysis: PositionFactsInput['analysis'], moverColor: 'w' | 'b'): number {
  const sign = moverColor === 'w' ? 1 : -1;
  const cps = [...(analysis.topLines ?? [])]
    .sort((a, b) => a.rank - b.rank)
    .map((l) => (l.mate != null ? (l.mate > 0 ? 100000 : -100000) : l.evaluation) * sign);
  if (cps.length < 2) return cps.length === 1 ? Infinity : 0;
  return cps[0] - cps[1];
}

function severityFromGap(gapCp: number, rating: number): Severity {
  const th = criticalityThresholds(rating);
  return gapCp >= th.onlyMove ? 'only-move' : gapCp >= th.critical ? 'critical' : gapCp >= th.notable ? 'notable' : 'none';
}

export async function computePositionFacts(input: PositionFactsInput): Promise<PositionFactsResult> {
  const { fen, moverColor, analysis } = input;
  const rating = input.rating ?? 1500;

  // Cheap facts (no search): must-defend + the sharpness score.
  const mustDefend = computeMustDefend(fen, moverColor);
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
    wdl: analysis.wdl ?? null,
  }, rating);

  // Perturbation is expensive → only when the moment earns it AND a probe fn was
  // supplied. Its own thresholds still gate whether there's a real supporter.
  let leansOn: LeansOn | null = null;
  if (importance.speak && input.evalBoard && (importance.rank >= 45 || importance.tier === 'teaching')) {
    try { leansOn = await computeLeansOn(fen, moverColor, input.evalBoard); } catch { leansOn = null; }
  }

  return { importance, criticality, mustDefend, leansOn, clauses: buildClauses(importance, mustDefend, leansOn) };
}

/** Fact → board-true DNA clause, emitted most-important-first (rank order). Each
 *  names only what the board really has (the pieces come straight from the
 *  probes, which read the live FEN). Empty when nothing earns voice. */
function buildClauses(importance: ImportanceVerdict, mustDefend: MustDefend, leansOn: LeansOn | null): string[] {
  if (!importance.speak) return [];
  const ranked: Array<{ rank: number; text: string }> = [];

  // Incoming fire — the standing must-defend, named and board-true.
  if (mustDefend.net >= 3 && mustDefend.pieces[0]) {
    const p = mustDefend.pieces[0];
    ranked.push({ rank: 75, text: `The ${PNAME[p.piece.toLowerCase()]} on ${p.square} hangs to the opponent's next move — it has to be dealt with.` });
  }
  // Key moment — the decision leverage, honestly (only-move vs a hinging choice).
  if (importance.tier === 'only-move') ranked.push({ rank: 85, text: `Only one move really holds here — this is the moment to slow down.` });
  else if (importance.tier === 'critical') ranked.push({ rank: 65, text: `This is a critical moment — the choice here is the one that decides it.` });
  // The campaign — why the strong piece is strong, and what it leans on.
  if (leansOn) ranked.push({ rank: 40, text: `The ${leansOn.piece} on ${leansOn.square} is doing the work — but it leans on the ${leansOn.leansOn.piece} on ${leansOn.leansOn.square}; take that away and it's ordinary.` });
  // Convert-mode — decided game, one beat.
  if (importance.tier === 'convert') ranked.push({ rank: 20, text: `This is technique now — convert it cleanly, no heroics.` });

  return ranked.sort((a, b) => b.rank - a.rank).map((c) => c.text);
}
