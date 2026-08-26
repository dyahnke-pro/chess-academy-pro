// criticality.ts — HOW SHARP IS THIS POSITION, as a computed number (G0).
//
// The keystone of the PositionFacts calculator, ported to the runtime from the
// offline reference `scripts/voiced-authoring/position-facts.mjs` (validated
// across Kramnik / MVL / Nepo — see docs/plans/2026-08-26-position-facts-
// calculator.md). It reads cheap signals the engine already produces and
// returns one score + band. That score does three jobs, all downstream:
//   (a) gates the expensive facts (only compute a deep read where it trips),
//   (b) earns the "key moment — don't rush" narration line, and
//   (c) decides silence-when-quiet.
//
// It DECIDES nothing about chess — it VOICES a fact ("this position is sharp").
// Every signal is a board/engine measurement; missing signals count as 0, so a
// thin read (MultiPV spread + hanging material alone) still yields an honest,
// if conservative, score. Nothing here invents.
import type { StockfishAnalysis } from '../types';

/** The five sharpness signals + the must-defend escalator, each already
 *  normalised to 0..1 by the caller-facing helper below. Provide what you have;
 *  an absent signal is 0 (a conservative read, never an invented one). */
export interface CriticalitySignals {
  /** volatility — candidate spread cp1−cpN across the MultiPV fan (÷300). */
  volatility: number;
  /** only-move — gap cp1−cp2 (÷150): one move far ahead of the rest. */
  onlyMove: number;
  /** trap — a shallow-vs-deep disagreement / seldepth spike (a hidden point). */
  trap: number;
  /** forcing — the best line wins material, or a forcing depth-spike. */
  forcing: number;
  /** loose — material hanging on the board right now (SEE, ÷3). */
  loose: number;
  /** threat — a concrete standing must-defend the mover has to meet (÷5). */
  threat: number;
  /** raw loose material in points (drives the ≥3 floor). */
  looseRaw?: number;
  /** raw threat material in points (drives the must-defend floor). */
  threatRaw?: number;
  /** a forced mate is in the air (either side). */
  mateInAir?: boolean;
}

export type CriticalityBand = 'quiet' | 'think' | 'key' | 'critical';

export interface CriticalityRead {
  score: number;
  band: CriticalityBand;
  /** the normalised component values, for observability / a facts trail. */
  components: { V: number; O: number; T: number; F: number; L: number; Tr: number };
}

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

/**
 * The score, ported verbatim from the offline calculator so the runtime and the
 * authoring tool agree to the point.
 *
 * base = 100·(0.42·V + 0.20·O + 0.16·T + 0.12·F + 0.10·L); a standing threat is
 * ADDITIVE (never a weight competitor that would deflate the sharpness base):
 * score = min(100, base + 25·Tr). Floors: loose≥3 → ≥55; must-defend≥3 → ≥50;
 * mate-in-air → ≥80. Bands: <20 quiet · 20–45 think · 45–70 key · ≥70 critical.
 */
export function computeCriticality(s: CriticalitySignals): CriticalityRead {
  const V = clamp01(s.volatility), O = clamp01(s.onlyMove), T = clamp01(s.trap);
  const F = clamp01(s.forcing), L = clamp01(s.loose), Tr = clamp01(s.threat);
  const base = 100 * (0.42 * V + 0.20 * O + 0.16 * T + 0.12 * F + 0.10 * L);
  let score = Math.min(100, Math.round(base + 25 * Tr));
  if ((s.looseRaw ?? 0) >= 3) score = Math.max(score, 55);
  if ((s.threatRaw ?? 0) >= 3) score = Math.max(score, 50);
  if (s.mateInAir) score = Math.max(score, 80);
  const band: CriticalityBand = score >= 70 ? 'critical' : score >= 45 ? 'key' : score >= 20 ? 'think' : 'quiet';
  return { score, band, components: { V: +V.toFixed(2), O: +O.toFixed(2), T: +T.toFixed(2), F: +F.toFixed(2), L: +L.toFixed(2), Tr: +Tr.toFixed(2) } };
}

/**
 * Derive the sharpness signals from a MultiPV analysis + the cheap extras a
 * surface already holds. `topLines` gives volatility (spread) and only-move
 * (gap12) for free — the two dominant weights. `looseMaterial` / `threatNet`
 * are the SEE reads a surface can compute from the board; pass them when you
 * have them, omit them when you don't (they degrade to 0, never a guess).
 */
export function criticalitySignalsFromAnalysis(
  analysis: Pick<StockfishAnalysis, 'topLines' | 'seldepth' | 'depth' | 'isMate'>,
  extras?: { looseMaterial?: number; threatNet?: number; forcingNet?: number },
): CriticalitySignals {
  const lines = [...(analysis.topLines ?? [])].sort((a, b) => a.rank - b.rank);
  // Evals are same-POV across the fan, so differences are convention-free.
  const cps = lines.map((l) => (l.mate != null ? (l.mate > 0 ? 100000 : -100000) : l.evaluation));
  const cp1 = cps[0] ?? 0, cp2 = cps[1] ?? cp1, cpN = cps[cps.length - 1] ?? cp1;
  const spread = cp1 - cpN, gap12 = cp1 - cp2;
  const seldepthSpike = Math.max(0, (analysis.seldepth ?? 0) - (analysis.depth ?? 0));
  const looseRaw = extras?.looseMaterial ?? 0;
  const threatRaw = extras?.threatNet ?? 0;
  const forcingNet = extras?.forcingNet ?? 0;
  return {
    volatility: clamp01(spread / 300),
    onlyMove: clamp01(gap12 / 150),
    // Live surfaces don't cheaply hold a separate shallow read; use the
    // seldepth spike as the honest available proxy for "a hidden point deeper
    // than the nominal depth". 0 when the engine didn't report seldepth.
    trap: clamp01(seldepthSpike / 8),
    forcing: forcingNet > 0 ? clamp01(forcingNet / 5) : clamp01(seldepthSpike / 8),
    loose: clamp01(looseRaw / 3),
    threat: threatRaw > 0 ? clamp01(threatRaw / 5) : 0,
    looseRaw, threatRaw,
    mateInAir: analysis.isMate || Math.abs(cp1) >= 100000,
  };
}
