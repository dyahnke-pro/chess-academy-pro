// refutedAlternativeCore — the PURE half of the refuted-alternative computer
// (WO-TEACH-02 S2): picking the popular alternative, rendering the sentence, and
// costing it off a fan the caller ALREADY paid for. No engine, no cache, no
// database — so the live composer (`positionFacts`, a pure module) can read it,
// and the engine version (`refutedAlternative.ts`) re-exports the same picker
// and renderer, so the two can never phrase one fact two ways.
import { Chess } from 'chess.js';
import type { PvLine } from './pvPlayback';
import type { ComputedConcept } from './conceptEngine';
import { criticalityThresholds } from './criticalityScan';
import { proofCut, describeProofResult } from './exchangeLedger';
import { andList } from '../utils/andList';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

function stripGlyphs(s: string): string { return s.replace(/[+#!?]+$/, ''); }

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

/** Below this share a move is not what people REACH FOR here — it is a stray
 *  (a prod review said "Most people play Bg6 here (1% of players)"). A bar,
 *  not a cap: every alternative at or above it is eligible. */
export const MIN_ALTERNATIVE_SHARE = 10;

/** The most-played real alternative that is not the taught move, when it is
 *  played often enough to be a real temptation. */
export function pickAlternative(taughtSan: string, candidates: readonly AlternativeCandidate[]): AlternativeCandidate | null {
  const taught = stripGlyphs(taughtSan);
  const alts = candidates.filter((c) => stripGlyphs(c.san) !== taught && c.games > 0
    && (c.pct === null || c.pct >= MIN_ALTERNATIVE_SHARE));
  if (alts.length === 0) return null;
  return [...alts].sort((a, b) => b.games - a.games)[0];
}

function pawns(cp: number): string { return (cp / 100).toFixed(1); }

/** The DNA-register sentence over the computed facts. Pure; exported for the
 *  review, which supplies its own cost + line from the stored analysis. */
export function renderRefutedAlternative(
  f: Omit<RefutedAlternative, 'text'>,
  taughtSan: string,
  /** THE ROTATION KEY — required, and stable about the moment (the board the
   *  move was chosen on, via `stemKeyOf`). The wrapper varies; the share, the
   *  source, the cost and the proven line never do (rotate the stem, never the
   *  claim — `rotateStem`). */
  stemKey: number,
): string {
  // THE SHARE IS STATED, NEVER ROUNDED UP TO "MOST" — and the source is named
  // as what it is: the amateur band is "players at your level", the masters
  // database is "masters".
  const who = f.source === 'amateur' ? 'players at your level' : 'masters';
  const lead = f.pct === null
    ? rotateStem([
      `${f.alt} is a common choice here (${f.games} games)`,
      `Plenty of games go ${f.alt} here (${f.games} of them)`,
    ], stemKey)
    : f.pct >= 50
      ? rotateStem([
        `Most ${who} play ${f.alt} here (${f.pct}%)`,
        `More than half of ${who} play ${f.alt} here (${f.pct}%)`,
      ], stemKey)
      : rotateStem([
        `${f.pct}% of ${who} play ${f.alt} here`,
        `${f.alt} is what ${f.pct}% of ${who} reach for here`,
      ], stemKey);
  // THE LINE AS PROOF (WO-LAYERS-01): the moves are spoken only as far as the
  // point they prove, then the result — never a recital of a line that proves
  // nothing.
  const proven = f.lineSans.length > 0 && f.proofResult ? ` ${andList(f.lineSans)} — ${f.proofResult}.` : '';
  if (f.concept) {
    const close = rotateStem([`${taughtSan} keeps that off the board.`, `${taughtSan} doesn't allow it.`, `That's what ${taughtSan} rules out.`], stemKey);
    return `${lead}, and it walks into a ${f.concept.name.toLowerCase()}:${proven} ${f.concept.full} ${close}`;
  }
  if (proven) {
    const close = rotateStem([`${taughtSan} avoids that.`, `${taughtSan} sidesteps it.`, `${taughtSan} keeps that from happening.`], stemKey);
    return `${lead}, and it loses material:${proven} ${close}`;
  }
  // "holds the balance" was the old close, and it is only true of a level
  // position — the claim here is the COST, so the close names the cost.
  const cost = rotateStem([
    `it costs about ${pawns(f.costCp)} points — nothing forcing, just a worse position`,
    `it gives away about ${pawns(f.costCp)} points — no tactic, just a worse position`,
  ], stemKey);
  const close = rotateStem([`${taughtSan} doesn't pay that.`, `${taughtSan} keeps those points.`, `${taughtSan} avoids that cost.`], stemKey);
  return `${lead}, and ${cost}. ${close}`;
}

/** Candidates from a masters-DB move list (`mastersMovesSync`). */
export function candidatesFromMasters(moves: ReadonlyArray<{ san: string; games: number }> | null): AlternativeCandidate[] {
  if (!moves || moves.length === 0) return [];
  const total = moves.reduce((s, m) => s + m.games, 0);
  return moves.map((m) => ({ san: m.san, games: m.games, pct: total > 0 ? Math.round((m.games / total) * 100) : null }));
}

/** Candidates from the amateur explorer band (`amateurPlayCache` entry moves). */
export function candidatesFromAmateur(moves: ReadonlyArray<{ san: string; games: number; pct: number }> | null): AlternativeCandidate[] {
  if (!moves || moves.length === 0) return [];
  return moves.map((m) => ({ san: m.san, games: m.games, pct: m.pct, source: 'amateur' as const }));
}

/** One line of a MultiPV fan (the shape `StockfishAnalysis.topLines` carries). */
export interface FanLine {
  evaluation: number;
  mate?: number | null;
  moves: readonly string[];
}

const MATE_CP = 100_000;

/** The alternative's line cut to the point it PROVES (mate, or a settled
 *  material result), from the mover's seat — or nothing, when it proves no
 *  point: then no move of it is recited (the line as proof). One cut for the
 *  engine version and the fan version. */
export function provenPrefix(fenBefore: string, sans: readonly string[], moverWB: 'w' | 'b'): { lineSans: string[]; proofResult: string | null } {
  const proof = sans.length > 0 ? proofCut(fenBefore, sans, moverWB) : null;
  if (!proof) return { lineSans: [], proofResult: null };
  const proofResult = proof.mate ? "it's mate" : proof.ledger ? describeProofResult(proof.ledger) : null;
  return { lineSans: proofResult ? sans.slice(0, proof.plies) : [], proofResult };
}

/**
 * THE REFUTED ALTERNATIVE, OFF A FAN ALREADY PAID FOR — the live half. Learn
 * reads the MultiPV fan at the board the student moved from; when the move
 * players at their level reach for is IN that fan, its cost against the move
 * the student played is read straight off it (same search, same depth — the
 * only honest comparison) and its own line proves why. No new search, so it
 * is silent whenever the popular move was not among the engine's lines: an
 * alternative the engine never evaluated has no cost we can state.
 */
export function refutedFromFan(input: {
  fenBefore: string;
  playedSan: string;
  candidates: readonly AlternativeCandidate[];
  fan: readonly FanLine[];
  moverWB: 'w' | 'b';
}): RefutedAlternative | null {
  const alt = pickAlternative(input.playedSan, input.candidates);
  if (!alt) return null;
  const uciOf = (san: string): string | null => {
    try { const m = new Chess(input.fenBefore).move(san); return `${m.from}${m.to}${m.promotion ?? ''}`; } catch { return null; }
  };
  const altUci = uciOf(alt.san);
  const playedUci = uciOf(input.playedSan);
  if (!altUci || !playedUci) return null;
  const altLine = input.fan.find((l) => l.moves[0] === altUci);
  const playedLine = input.fan.find((l) => l.moves[0] === playedUci);
  if (!altLine || !playedLine) return null;
  const sign = input.moverWB === 'w' ? 1 : -1;
  const cp = (l: FanLine): number => (l.mate != null ? (l.mate > 0 ? MATE_CP : -MATE_CP) : l.evaluation) * sign;
  const costCp = Math.round(cp(playedLine) - cp(altLine));
  if (costCp < criticalityThresholds().notable) return null;
  const sans: string[] = [];
  try {
    const c = new Chess(input.fenBefore);
    for (const u of altLine.moves) sans.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? u[4] : undefined }).san);
  } catch { /* the playable prefix is what we have */ }
  const { lineSans, proofResult } = provenPrefix(input.fenBefore, sans, input.moverWB);
  const facts = { alt: alt.san, games: alt.games, pct: alt.pct, costCp, line: null, concept: null, lineSans, proofResult, source: alt.source ?? 'masters' as const };
  return { ...facts, text: renderRefutedAlternative(facts, input.playedSan, stemKeyOf(input.fenBefore)) };
}
