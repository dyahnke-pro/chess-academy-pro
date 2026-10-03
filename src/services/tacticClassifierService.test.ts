import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { deriveMissedTacticsForGame, focusThemeLabel, motifThemeLabels, getPrimaryThemeLabel } from './tacticClassifierService';
import { buildGameRecord } from '../test/factories';
import type { MoveAnnotation } from '../types';

// WO-STANDARD-01 D-17 (prod tape 2026-09-22): "a missed hanging piece cost
// 365.5 points". `MoveAnnotation.evaluation` is CENTIPAWNS by its own type; the
// classifier multiplied it by 100 again, so every recorded tactic carried a
// swing 100× too large and the 80cp floor admitted every 1cp wobble.
describe('deriveMissedTacticsForGame — the eval unit is centipawns, once (D-17)', () => {
  // 1.e4 e5 2.Qh5 Nc6 3.Bc4 Nf6?? 4.Nf3?? — Qxf7# was on the board and
  // White developed instead.
  const SANS = ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Nf3'];
  const c = new Chess();
  const annotations: MoveAnnotation[] = SANS.map((san, i) => {
    c.move(san);
    return {
      moveNumber: Math.floor(i / 2) + 1,
      color: i % 2 === 0 ? 'white' : 'black',
      san,
      // White-POV centipawns. Before the blunder White is +200; after it -50.
      evaluation: i === 6 ? -50 : i === 5 ? 200 : 20,
      bestMove: i === 6 ? 'h5f7' : null,
      bestMoveEval: i === 6 ? 200 : null,
      classification: i === 6 ? 'blunder' : 'good',
      comment: null,
    };
  });
  const game = buildGameRecord({
    pgn: '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Nf3 *',
    studentSide: 'white',
    annotations,
  });

  it('records the swing in centipawns — 250, never 25000', () => {
    const tactics = deriveMissedTacticsForGame(game, 'white');
    expect(tactics.length).toBe(1);
    expect(tactics[0].tacticType).toBe('checkmate');
    expect(tactics[0].evalSwing).toBe(250);
  });

  it('NEGATIVE CONTROL: a 40cp wobble stays under the 80cp floor (the ×100 bug admitted it as 4000)', () => {
    const wobble = annotations.map((a, i) => (i === 6 ? { ...a, evaluation: 160 } : a));
    const tactics = deriveMissedTacticsForGame(buildGameRecord({ ...game, annotations: wobble }), 'white');
    expect(tactics).toEqual([]);
  });
});

// Live walk 2026-10-03: a drill opened from a theme card was headed by the
// puzzle's FIRST classified tactic — Discovered Attacks → FORK, Zugzwang →
// PROMOTION, Endgame Technique → PIN.
describe('focusThemeLabel — a themed drill is headed by its own theme', () => {
  it('names the drilled theme the puzzle carries, not the first tactic', () => {
    const themes = ['discoveredAttack', 'fork', 'middlegame'];
    expect(getPrimaryThemeLabel(themes)).toBe('Fork'); // the old heading
    expect(focusThemeLabel(themes, ['discoveredAttack'])).toBe('Discovered Attack');
    expect(focusThemeLabel(['advancedPawn', 'endgame', 'promotion', 'zugzwang'], ['zugzwang'])).toBe('Zugzwang');
  });

  it('a specific ending beats the phase tag on the Endgame Technique card', () => {
    const card = ['endgame', 'rookEndgame', 'pawnEndgame', 'bishopEndgame', 'knightEndgame', 'queenEndgame'];
    expect(focusThemeLabel(['endgame', 'pin', 'rookEndgame'], card)).toBe('Rook Endgame');
    expect(focusThemeLabel(['endgame', 'pin'], card)).toBe('Endgame');
  });

  it('null when the puzzle carries none of the focus themes', () => {
    expect(focusThemeLabel(['fork'], ['pin'])).toBeNull();
  });
});

describe('motifThemeLabels — rows show motifs, never raw DB tags', () => {
  it('drops grading/size/phase tags and labels the rest', () => {
    expect(motifThemeLabels(['advantage', 'defensiveMove', 'hangingPiece', 'opening', 'short'])).toEqual(['Hanging Piece']);
    expect(motifThemeLabels(['crushing', 'fork', 'master', 'attackingF2F7'])).toEqual(['Fork', 'Attack on f2/f7']);
    expect(motifThemeLabels(['crushing'])).toEqual([]);
  });
});
