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

/** The same board with White's king stepped out of check to h1 — legal for
 *  either side to capture on, so the SEE read stands. */
const OUT_OF_CHECK = '4r1k1/3b1pB1/1b1p1Qn1/1p1P4/1p2P3/5NNP/5qP1/4R2K w - - 0 26';

describe('findHangingBySee never reports a king', () => {
  it('the board that found it — the side to move is in check, so the SEE read abstains (walk oct3e)', () => {
    // The king was only ever "hanging" because the scan handed the move to the
    // side giving check — a board that cannot exist. `asIfToMove` refuses it,
    // which makes the king impossible to list rather than filtered out after.
    const hung = findHangingBySee(KING_IN_CHECK);
    expect(hung.map((h) => h.piece)).not.toContain('k');
    expect(hung.map((h) => h.square)).not.toContain('g1');
  });

  it('still finds the real loose piece on a legal board', () => {
    const hung = findHangingBySee(OUT_OF_CHECK);
    expect(hung.length, 'nothing detected — the scan is broken, not clean').toBeGreaterThan(0);
    expect(hung.map((h) => h.square)).toContain('g3');
    expect(hung.map((h) => h.piece)).not.toContain('k');
  });

  it('agrees with its sibling on what is NOT a king', () => {
    const classifier = findHangingPieces(new Chess(OUT_OF_CHECK)).map((h) => h.square);
    const see = new Set(findHangingBySee(OUT_OF_CHECK).map((h) => h.square));
    for (const sq of classifier) expect(see, `${sq} lost from the SEE list`).toContain(sq);
  });
});
