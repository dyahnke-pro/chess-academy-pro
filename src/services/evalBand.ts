/**
 * evalBand — WHO IS BETTER, AND BY HOW MUCH, in one ladder (census
 * 2026-10-10; David approved the bands: "1 eval wording is fine").
 *
 * Seven ladders held seven sets of thresholds (30/100/250, 50/150, 50/150/300,
 * 50/150/400, 60/150/280/500, 80/250, 0.5/1.5 pawns), so +1.2 read "clearly
 * better" on one screen and "slightly better" on another. The BAND is decided
 * here once; each surface keeps its own wording (tense, seat, register) but
 * reads the band from this function, so no two can disagree about the
 * position.
 *
 *   |eval| < 0.5  level
 *   0.5 – 1.5     slightly better / worse
 *   1.5 – 3.0     clearly better / worse
 *   ≥ 3.0         winning / losing
 */
export type EvalBand = 'level' | 'slightly' | 'clearly' | 'decisive';

export const EVAL_BAND_CP = { slightly: 50, clearly: 150, decisive: 300 } as const;

/** The band of an eval, by its size alone (the sign says for whom). */
export function evalBand(cp: number): EvalBand {
  const m = Math.abs(cp);
  if (m < EVAL_BAND_CP.slightly) return 'level';
  if (m < EVAL_BAND_CP.clearly) return 'slightly';
  if (m < EVAL_BAND_CP.decisive) return 'clearly';
  return 'decisive';
}

/** The plain words for a band, from the side it favours ('better') or the
 *  side it does not ('worse'). */
export function evalBandWords(band: EvalBand, side: 'better' | 'worse'): string {
  if (band === 'level') return 'level';
  if (band === 'decisive') return side === 'better' ? 'winning' : 'losing';
  return `${band} ${side}`;
}
