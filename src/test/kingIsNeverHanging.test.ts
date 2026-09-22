/**
 * A KING IS NEVER HANGING — that is check.
 *
 * 🔴 MEASURED 2026-09-21 on a real board from `mg-lichess-8I2YuiTC`:
 *
 *     findHangingBySee('4r1k1/3b1pB1/1b1p1Qn1/1p1P4/1p2P3/5NNP/5qP1/4R1K1 w')
 *       → g1 piece=k color=w gain=100   ← the WHITE KING, "hanging"
 *
 * `legalSeeGainFor` scores with the CAPTURE table (a king is 100 there, so an
 * exchange search never trades into one). Read as "what can be WON" that is
 * nonsense — and the list is sorted by gain DESC, so the king sorted FIRST and
 * four consumers take `hanging[0]`: the attack-target list, the reading-facts
 * narration, the hanging DRILL ("Is any piece hanging?" answered with a king),
 * and a `seeSequence` computed on the king's square.
 *
 * `findHangingPieces` in tacticClassifier had always skipped kings. The two are
 * otherwise a strict superset pair — measured across 12 positions, SEE never
 * missed anything the classifier found, so this was the ONE real divergence
 * rather than a difference of definition.
 *
 * This is also the piece-value split biting for real: MATERIAL (k:0) and
 * CAPTURE (k:100) answer different questions, and reading one as the other put
 * a king in a material list.
 */

import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { findHangingBySee } from '../services/positionReadingService';
import { findHangingPieces } from '../services/tacticClassifier';

/** The measured board: White king on g1, in check from the f2 queen. */
const KING_IN_CHECK = '4r1k1/3b1pB1/1b1p1Qn1/1p1P4/1p2P3/5NNP/5qP1/4R1K1 w - - 0 26';

describe('findHangingBySee never reports a king', () => {
  it('the board that found it — g1 is the king, and must not be listed', () => {
    const hung = findHangingBySee(KING_IN_CHECK);
    // NON-VACUOUS: the position genuinely has loose material, so an empty list
    // would mean the detector broke rather than that the fix worked.
    expect(hung.length, 'nothing detected — the scan is broken, not clean').toBeGreaterThan(0);
    expect(hung.map((h) => h.piece), 'a king is never hanging — that is check').not.toContain('k');
    expect(hung.map((h) => h.square)).not.toContain('g1');
  });

  it('still finds the real loose piece it always found', () => {
    // g3 is the undefended knight — the thing the classifier flags too. The fix
    // must remove ONLY the king, never a real hang.
    expect(findHangingBySee(KING_IN_CHECK).map((h) => h.square)).toContain('g3');
  });

  it('agrees with its sibling on what is NOT a king', () => {
    // The two detectors are a superset pair; after the fix, every square the
    // classifier flags must still appear in the SEE list.
    const classifier = findHangingPieces(new Chess(KING_IN_CHECK)).map((h) => String(h.square));
    const see = new Set(findHangingBySee(KING_IN_CHECK).map((h) => String(h.square)));
    for (const sq of classifier) expect(see, `${sq} lost from the SEE list`).toContain(sq);
  });
});
