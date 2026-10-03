// refutedAlternative — THE BIG ONE (unified-coach N3, plan §3.4; David
// 2026-09-15: "The refuted alternative — this is the big one … Link them, yes.
// This is one computer not 5 separate ones.").
//
// The content of opening theory is not "play X" — it is "most people play Y
// here, and Y costs this much because of THIS line and THIS idea". The pieces
// already existed as three separate computers and never met: the human-popular
// sibling (masters DB frequencies), the engine's cost + punishing line
// (`computePvLine`, graded at the quiet end per the gem doctrine), and the
// concept the line lands (`conceptForLine`). This composes them into ONE fact:
//
//   { alt, games, pct, costCp, line, concept, text }
//
// Every field is computed (G0/G3): the alternative is a real DB move, the cost
// is the engine's, the line is the engine's, the concept is the classifier's.
// The text is a DNA-register TEMPLATE over those facts; the model may phrase it
// through `voiceFacts`, it never chooses it. Positional punishment → concept is
// null and the text states the cost only — never an invented motif.
//
// Callers: the generator (baked per student ply at generation time — engine at
// gen), the review (the student's own departure — from the game's stored eval
// + PV, no new engine call), and the live coach on demand.
import { Chess } from 'chess.js';
import { computePvLine, type PvEngine, type PvLine, type MoveScorer } from './pvPlayback';
import { conceptForLine } from './conceptEngine';
import { stemKeyOf } from '../utils/rotateStem';
import { criticalityThresholds } from './criticalityScan';
import { stockfishEngine } from './stockfishEngine';
import { getCachedAmateurPlay } from './amateurPlayCache';
import {
  pickAlternative, renderRefutedAlternative, candidatesFromMasters, candidatesFromAmateur, provenPrefix, droppedJob, alternativeCostCp,
  type AlternativeCandidate, type RefutedAlternative,
} from './refutedAlternativeCore';

export { pickAlternative, renderRefutedAlternative, candidatesFromMasters };
export type { AlternativeCandidate, RefutedAlternative };



export interface RefutedAlternativeInput {
  fenBefore: string;
  taughtSan: string;
  /** Candidate alternatives at this position, most-played first (the caller
   *  supplies them from the masters DB / the openings DB — never from memory). */
  candidates: readonly AlternativeCandidate[];
  studentColor: 'white' | 'black';
  /** Scores both moves in ONE search (the cost) and plays the alternative's
   *  line (the proof). Defaults to the singleton. */
  engine?: PvEngine & MoveScorer;
  /** Engine depth for the comparison and the proof line. */
  depth?: number;
  maxPlies?: number;
}

/** The singleton as a scorer: `searchmoves` rides its queued search. */
const SINGLETON: PvEngine & MoveScorer = {
  analyzePosition: (fen, depth) => stockfishEngine.analyzePosition(fen, depth),
  async scoreMoves(fen, ucis, depth) {
    const r = await stockfishEngine.analyzePosition(fen, depth, { searchmoves: ucis.join(' ') });
    return r.topLines.map((l) => ({ evaluation: l.evaluation, mate: l.mate, moves: l.moves }));
  },
};

function sanToUci(fen: string, san: string): string | null {
  try {
    const c = new Chess(fen);
    const m = c.move(san);
    return m ? `${m.from}${m.to}${m.promotion ?? ''}` : null;
  } catch { return null; }
}


/**
 * Compute the refuted alternative for a taught move, or null when there is no
 * real alternative, the engine cannot read the position, or the alternative
 * does not cost enough to clear the band-free `criticalityThresholds().notable`
 * bar — the same scale as every other importance read; never a second bar,
 * and (B6) never a rating.
 */
export async function refutedAlternative(input: RefutedAlternativeInput): Promise<RefutedAlternative | null> {
  const engine = input.engine ?? SINGLETON;
  const depth = input.depth ?? 12;
  const maxPlies = input.maxPlies ?? 6;
  const alt = pickAlternative(input.taughtSan, input.candidates);
  if (!alt) return null;
  const taughtUci = sanToUci(input.fenBefore, input.taughtSan);
  const altUci = sanToUci(input.fenBefore, alt.san);
  if (!taughtUci || !altUci) return null;
  const moverIsWhite = new Chess(input.fenBefore).turn() === 'w';

  // THE COST: both moves scored in ONE search (alternativeCostCp). The
  // alternative's own line is played afterwards only to PROVE the cost.
  // SEQUENTIAL, never Promise.all: a pooled caller hands in ONE lane's worker.
  let costCp: number | null;
  let altLine: PvLine | null;
  try {
    const fan = await engine.scoreMoves(input.fenBefore, [taughtUci, altUci], depth);
    costCp = alternativeCostCp(taughtUci, altUci, fan, moverIsWhite ? 'w' : 'b');
    if (costCp === null || costCp < criticalityThresholds().notable) return null;
    altLine = await computePvLine(input.fenBefore, { firstUci: altUci, maxPlies, depth, engine });
  } catch { return null; }
  if (!altLine) return null;

  // The concept the PUNISHMENT lands — the opponent's line after the alt, read
  // from the opponent's seat (they are the one landing the tactic).
  const opponent: 'w' | 'b' = moverIsWhite ? 'b' : 'w';
  const punish = altLine.plies.slice(1);
  let concept: RefutedAlternative['concept'] = null;
  if (punish.length > 0) {
    try {
      const lead = conceptForLine({
        fen: punish[0].fenBefore,
        uci: punish.map((p) => p.uci),
        studentColor: opponent,
        rootEvalCp: altLine.rootEvalCp,
        lineEvalCp: altLine.terminalEvalCp ?? altLine.rootEvalCp,
        max: 1,
        sources: ['tactic', 'mate'],
      })[0];
      if (lead && lead.source !== 'positional') concept = { id: lead.id, name: lead.name, full: lead.full, short: lead.short };
    } catch { concept = null; }
  }
  const sans = altLine.plies.map((p) => p.san);
  const studentWB: 'w' | 'b' = input.studentColor === 'white' ? 'w' : 'b';
  const { lineSans, proofResult } = provenPrefix(input.fenBefore, sans, studentWB);
  const facts = { alt: alt.san, games: alt.games, pct: alt.pct, costCp, line: altLine, concept, lineSans, proofResult, source: alt.source ?? 'masters', job: droppedJob(input.fenBefore, sans) };
  return { ...facts, text: renderRefutedAlternative(facts, input.taughtSan, stemKeyOf(input.fenBefore)) };
}


/** Candidates for a position, players at the student's level FIRST (the
 *  amateur explorer band — cache-only, never the network, per the amateur
 *  cache's rate-limit contract), masters as the fallback. The alternative a
 *  student is most likely to reach for is the one people at their level play;
 *  a masters-only list hides the mistakes they actually make. */
export function candidatesForPosition(
  fen: string,
  masters: ReadonlyArray<{ san: string; games: number }> | null,
): AlternativeCandidate[] {
  const amateur = getCachedAmateurPlay(fen);
  if (amateur && amateur.moves.length >= 2) return candidatesFromAmateur(amateur.moves);
  return candidatesFromMasters(masters).map((c) => ({ ...c, source: 'masters' as const }));
}
