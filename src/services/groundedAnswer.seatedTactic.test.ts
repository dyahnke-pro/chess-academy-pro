import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { assemblePositionAssessment } from './groundedAnswer';
import { buildTacticsLiveContext } from './liveTacticsContext';

// Hand walk 800 (Ruy Exchange, student Black): the assessment spoke the raw
// detector text "Bishop on g4 pins knight on f3 against queen on d1." — whose
// bishop, whose knight?
describe('the assessment seats the tactic it names', () => {
  it('"Your bishop on g4 pins their knight on f3 against their queen on d1"', () => {
    const c = new Chess();
    for (const m of ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6', 'dxc6', 'O-O', 'f6', 'd4', 'Bg4', 'c3']) c.move(m);
    const tactics = buildTacticsLiveContext(c.fen(), null, 'b', 800);
    const a = assemblePositionAssessment({ evalCp: 0, mateIn: null, tactics, studentColor: 'black', fen: c.fen() });
    expect(a?.facts ?? '').toMatch(/Your bishop on g4 pins their knight on f3/);
    expect(a?.facts ?? '').not.toMatch(/(^|\. )Bishop on g4 pins knight/);
  });
});
