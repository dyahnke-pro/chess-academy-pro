import { describe, it, expect } from 'vitest';
import { buildDrillLines, isStudentPly, studentPlies, lineWeight, selectNextLine, type DrillLine } from './courseTrainer';
import { buildOpeningRecord } from '../test/factories';

describe('buildDrillLines', () => {
  it('includes the main line, variations, and sublines', () => {
    // caro-kann is in course-sublines.json, so its variation chapters carry sublines
    const lines = buildDrillLines(
      buildOpeningRecord({
        id: 'caro-kann', color: 'black', pgn: 'e4 c6 d4 d5',
        variations: [{ name: 'Classical', pgn: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5', explanation: 'x' }],
      }),
    );
    expect(lines.find((l) => l.id === 'main')).toBeTruthy();
    expect(lines.find((l) => l.id === 'var-0')).toBeTruthy();
    expect(lines.some((l) => l.id.startsWith('sub-'))).toBe(true);
    for (const l of lines) expect(l.studentColor).toBe('black');
  });
});

describe('isStudentPly / studentPlies', () => {
  it('maps ply parity to side for White and Black', () => {
    expect(isStudentPly(0, 'white')).toBe(true);  // White's 1st move
    expect(isStudentPly(1, 'white')).toBe(false);
    expect(isStudentPly(0, 'black')).toBe(false);
    expect(isStudentPly(1, 'black')).toBe(true);  // Black's 1st reply
  });
  it('lists the student move indices', () => {
    const line: DrillLine = { id: 'x', label: 'x', studentColor: 'black', moves: ['e4', 'c6', 'd4', 'd5'] };
    expect(studentPlies(line)).toEqual([1, 3]);
  });
});

describe('adaptive weighting', () => {
  it('boosts unseen lines and weights missed lines higher', () => {
    expect(lineWeight(undefined)).toBe(2);
    expect(lineWeight({ attempts: 4, misses: 0 })).toBe(1);   // mastered → lowest
    expect(lineWeight({ attempts: 4, misses: 4 })).toBe(5);   // always missed → highest
    expect(lineWeight({ attempts: 4, misses: 2 })).toBe(3);
  });

  it('selectNextLine biases toward the high-miss line', () => {
    const lines: DrillLine[] = [
      { id: 'a', label: 'a', studentColor: 'white', moves: ['e4', 'e5'] },
      { id: 'b', label: 'b', studentColor: 'white', moves: ['d4', 'd5'] },
    ];
    const progress = { a: { attempts: 5, misses: 0 }, b: { attempts: 5, misses: 5 } };
    // weights: a=1, b=5, total=6. rand=0.5 -> 3.0; a consumes 1, then b. -> b
    expect(selectNextLine(lines, progress, () => 0.5)?.id).toBe('b');
    // rand near 0 lands in a
    expect(selectNextLine(lines, progress, () => 0.0)?.id).toBe('a');
  });

  it('returns null for no lines', () => {
    expect(selectNextLine([], {})).toBeNull();
  });
});
