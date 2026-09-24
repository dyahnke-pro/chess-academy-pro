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
import { computePvLine, type PvEngine, type PvLine } from './pvPlayback';
import { conceptForLine, type ComputedConcept } from './conceptEngine';
import { criticalityThresholds } from './criticalityScan';
import { stockfishEngine } from './stockfishEngine';
import { proofCut, describeProofResult } from './exchangeLedger';
import { getCachedAmateurPlay } from './amateurPlayCache';
import { andList } from '../utils/andList';

export interface AlternativeCandidate {
  san: string;
  games: number;
  /** Share of games at this position (0–100), when known. */
  pct: number | null;
  /** Whose games: players at the student's level (the amateur explorer band)
   *  or masters. Absent = masters (the historical source). */
  source?: 'amateur' | 'masters';
}

export interface RefutedAlternative {
  /** The human-popular alternative to the taught/played move. */
  alt: string;
  games: number;
  pct: number | null;
  /** What it costs the mover, centipawns (>0 = worse than the taught move). */
  costCp: number;
  /** The punishing line after the alternative (engine), or null when unavailable. */
  line: PvLine | null;
  /** The concept the punishment lands, or null when it is positional. */
  concept: Pick<ComputedConcept, 'id' | 'name' | 'full' | 'short'> | null;
  /** Spoken SANs of the punishing line — exactly the plies that PROVE its
   *  point (mate, or a settled material gain); empty when nothing settles. */
  lineSans: string[];
  /** What the proven line ends on, from the student's seat ("they win a
   *  knight", "it's mate"), or null when the line proves no material point. */
  proofResult?: string | null;
  /** Whose games the popularity is counted over. */
  source?: 'amateur' | 'masters';
  /** DNA-register text, present tense. */
  text: string;
}

export interface RefutedAlternativeInput {
  fenBefore: string;
  taughtSan: string;
  /** Candidate alternatives at this position, most-played first (the caller
   *  supplies them from the masters DB / the openings DB — never from memory). */
  candidates: readonly AlternativeCandidate[];
  studentColor: 'white' | 'black';
  engine?: PvEngine;
  /** Engine depth for the two reads (taught / alternative). */
  depth?: number;
  maxPlies?: number;
}

function sanToUci(fen: string, san: string): string | null {
  try {
    const c = new Chess(fen);
    const m = c.move(san);
    return m ? `${m.from}${m.to}${m.promotion ?? ''}` : null;
  } catch { return null; }
}

function stripGlyphs(s: string): string { return s.replace(/[+#!?]+$/, ''); }

/** Mover-POV eval of a line's promise, graded at the QUIET END when the verify
 *  pass ran (the gem doctrine: never a one-ply eval). */
function moverEval(line: PvLine, moverIsWhite: boolean): number {
  // The quiet-end read is only trusted when the verify pass ran AND the line
  // held its promise; otherwise the root promise is the honest number.
  const cp = line.delivers && line.terminalEvalCp != null ? line.terminalEvalCp : line.rootEvalCp;
  return moverIsWhite ? cp : -cp;
}

/** The most-played real alternative that is not the taught move. */
export function pickAlternative(taughtSan: string, candidates: readonly AlternativeCandidate[]): AlternativeCandidate | null {
  const taught = stripGlyphs(taughtSan);
  const alts = candidates.filter((c) => stripGlyphs(c.san) !== taught && c.games > 0);
  if (alts.length === 0) return null;
  return [...alts].sort((a, b) => b.games - a.games)[0];
}

function pawns(cp: number): string { return (cp / 100).toFixed(1); }

/** The DNA-register sentence over the computed facts. Pure; exported for the
 *  review, which supplies its own cost + line from the stored analysis. */
export function renderRefutedAlternative(f: Omit<RefutedAlternative, 'text'>, taughtSan: string): string {
  const who = f.source === 'amateur' ? 'players at your level' : 'players';
  const pop = f.pct != null ? `${f.pct}% of ${who}` : `${f.games} games`;
  const lead = f.source === 'amateur' ? `Most players at your level play ${f.alt} here (${pop})` : `Most people play ${f.alt} here (${pop})`;
  // THE LINE AS PROOF (WO-LAYERS-01): the moves are spoken only as far as the
  // point they prove, then the result — never a recital of a line that proves
  // nothing.
  const proven = f.lineSans.length > 0 && f.proofResult ? ` ${andList(f.lineSans)} — ${f.proofResult}.` : '';
  if (f.concept) {
    return `${lead}, and it walks into a ${f.concept.name.toLowerCase()}:${proven} ${f.concept.full} ${taughtSan} keeps that off the board.`;
  }
  if (proven) return `${lead}, and it loses material:${proven} ${taughtSan} avoids that.`;
  return `${lead}, and it costs about ${pawns(f.costCp)} points — nothing forcing, just a worse position. ${taughtSan} holds the balance.`;
}

/**
 * Compute the refuted alternative for a taught move, or null when there is no
 * real alternative, the engine cannot read the position, or the alternative
 * does not cost enough to clear the band-free `criticalityThresholds().notable`
 * bar — the same scale as every other importance read; never a second bar,
 * and (B6) never a rating.
 */
export async function refutedAlternative(input: RefutedAlternativeInput): Promise<RefutedAlternative | null> {
  const engine = input.engine ?? stockfishEngine;
  const depth = input.depth ?? 12;
  const maxPlies = input.maxPlies ?? 6;
  const alt = pickAlternative(input.taughtSan, input.candidates);
  if (!alt) return null;
  const taughtUci = sanToUci(input.fenBefore, input.taughtSan);
  const altUci = sanToUci(input.fenBefore, alt.san);
  if (!taughtUci || !altUci) return null;
  const moverIsWhite = new Chess(input.fenBefore).turn() === 'w';

  let taughtLine: PvLine | null = null;
  let altLine: PvLine | null = null;
  // SEQUENTIAL, never Promise.all: a pooled caller hands in ONE lane's
  // worker, and two searches at once on one worker corrupt each other; the
  // singleton queues them anyway, so parallel bought nothing there.
  try {
    taughtLine = await computePvLine(input.fenBefore, { firstUci: taughtUci, maxPlies, depth, engine });
    altLine = await computePvLine(input.fenBefore, { firstUci: altUci, maxPlies, depth, engine });
  } catch { return null; }
  if (!taughtLine || !altLine) return null;
  const costCp = Math.round(moverEval(taughtLine, moverIsWhite) - moverEval(altLine, moverIsWhite));
  if (costCp < criticalityThresholds().notable) return null;

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
  const proof = sans.length > 0 ? proofCut(input.fenBefore, sans, studentWB) : null;
  const lineSans = proof ? sans.slice(0, proof.plies) : [];
  const proofResult = proof ? (proof.mate ? "it's mate" : proof.ledger ? describeProofResult(proof.ledger) : null) : null;
  const facts = { alt: alt.san, games: alt.games, pct: alt.pct, costCp, line: altLine, concept, lineSans, proofResult, source: alt.source ?? 'masters' };
  return { ...facts, text: renderRefutedAlternative(facts, input.taughtSan) };
}

/** Candidates from a masters-DB move list (`mastersMovesSync`). */
export function candidatesFromMasters(moves: ReadonlyArray<{ san: string; games: number }> | null): AlternativeCandidate[] {
  if (!moves || moves.length === 0) return [];
  const total = moves.reduce((s, m) => s + m.games, 0);
  return moves.map((m) => ({ san: m.san, games: m.games, pct: total > 0 ? Math.round((m.games / total) * 100) : null }));
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
  if (amateur && amateur.moves.length >= 2) {
    return amateur.moves.map((m) => ({ san: m.san, games: m.games, pct: m.pct, source: 'amateur' as const }));
  }
  return candidatesFromMasters(masters).map((c) => ({ ...c, source: 'masters' as const }));
}
