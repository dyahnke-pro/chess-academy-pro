import { describe, it, expect } from 'vitest';
import {
  computeMoveFundamentals,
  pickLeadingFundamentals,
  strategicWhyLed,
  strategicWhySelfContained,
  type MoveFundamental,
} from './moveFundamentals';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function fund(id: MoveFundamental['id'], weight: number): MoveFundamental {
  return { id, weight, led: id, selfContained: id, imperative: id, squares: [] };
}

describe('computeMoveFundamentals — development leads a quiet developing move', () => {
  it('Nf3 from the start: development, naming the center it fights for', () => {
    const funds = computeMoveFundamentals(START, 'Nf3', 'white');
    expect(funds[0].id).toBe('development');
    expect(funds[0].squares).toContain('f3');
    expect(strategicWhyLed(START, 'Nf3', 'white')).toBe(
      'develops into the game, fighting for the center on d4 and e5',
    );
    expect(strategicWhySelfContained(START, 'Nf3', 'white')).toBe(
      'develops the knight into the game, fighting for the center on d4 and e5',
    );
  });

  it('the led form never restates the piece (it follows an already-named move)', () => {
    const led = strategicWhyLed(START, 'Nc3', 'white');
    expect(led).not.toMatch(/knight/i);
    expect(led).toMatch(/^develops into the game/);
  });
});

describe('king safety leads when the move castles', () => {
  const CASTLE_FEN = 'rnbqk2r/ppp2ppp/3b1n2/3pp3/4P3/2NP1N2/PPP1BPPP/R1BQK2R w KQkq - 0 6';
  it('O-O = king-safety, woven, king + rook squares', () => {
    const funds = computeMoveFundamentals(CASTLE_FEN, 'O-O', 'white');
    expect(funds[0].id).toBe('king-safety');
    expect(funds[0].squares).toEqual(['g1', 'f1']);
    expect(strategicWhySelfContained(CASTLE_FEN, 'O-O', 'white')).toBe(
      'castling gets your king to safety and brings the rook toward the center',
    );
  });
});

describe('outpost outranks bare development', () => {
  it('a knight landing where no pawn can evict it is an outpost', () => {
    // Black has no c- or e-pawn, so e5 can never be challenged.
    const fen = '4k3/pp4pp/8/8/8/5N2/PP4PP/4K3 w - - 0 20';
    const funds = computeMoveFundamentals(fen, 'Ne5', 'white');
    expect(funds[0].id).toBe('outpost');
    expect(funds[0].selfContained).toMatch(/outpost/);
    expect(funds.some((f) => f.id === 'development')).toBe(false);
  });
});

describe('central pawn advance stakes out the center', () => {
  it('e4 from the start = center + space', () => {
    const funds = computeMoveFundamentals(START, 'e4', 'white');
    expect(funds.some((f) => f.id === 'center')).toBe(true);
    expect(strategicWhySelfContained(START, 'e4', 'white')).toMatch(/stakes out the center/);
  });
});

describe('endgame fundamentals', () => {
  it('a king step toward the center = king-activity', () => {
    const fen = '7k/8/8/8/8/8/8/4K3 w - - 0 40';
    const funds = computeMoveFundamentals(fen, 'Kd2', 'white');
    expect(funds[0].id).toBe('king-activity');
    expect(funds[0].led).toMatch(/king toward the center/);
  });

  it('pushing a passer = passed-pawn', () => {
    const fen = '8/8/3P4/8/8/8/8/k6K w - - 0 40';
    const funds = computeMoveFundamentals(fen, 'd7', 'white');
    expect(funds.some((f) => f.id === 'passed-pawn')).toBe(true);
    expect(strategicWhySelfContained(fen, 'd7', 'white')).toMatch(/passed pawns must be pushed/);
  });
});

describe('open file for a rook', () => {
  it('a rook to an empty file takes the open file', () => {
    const fen = '4k3/1p4p1/8/8/8/8/1P4P1/R3K3 w Q - 0 20';
    const funds = computeMoveFundamentals(fen, 'Rd1', 'white');
    const openFile = funds.find((f) => f.id === 'open-file');
    expect(openFile).toBeTruthy();
    expect(openFile!.led).toMatch(/d-file/);
  });
});

describe('recapture-safety guard — a hanging piece is never a merit', () => {
  it('returns nothing when the moved piece simply drops', () => {
    // Rook to d5 where a pawn on e6 (…exd5) just wins it: not a merit.
    const fen = '4k3/8/4p3/8/8/8/8/3RK3 w - - 0 20';
    const funds = computeMoveFundamentals(fen, 'Rd5', 'white');
    expect(funds).toEqual([]);
  });
});

describe('pickLeadingFundamentals — state two only when nearly tied', () => {
  it('takes one when the top clearly dominates', () => {
    const lead = pickLeadingFundamentals([fund('king-safety', 92), fund('development', 70)]);
    expect(lead.map((f) => f.id)).toEqual(['king-safety']);
  });

  it('states both when they are within 12 and both matter', () => {
    const lead = pickLeadingFundamentals([fund('development', 80), fund('center', 72)]);
    expect(lead.map((f) => f.id)).toEqual(['development', 'center']);
  });

  it('drops a weak second even when close', () => {
    const lead = pickLeadingFundamentals([fund('center', 54), fund('open-file', 50)]);
    expect(lead.map((f) => f.id)).toEqual(['center']);
  });

  it('is empty on no fundamentals', () => {
    expect(pickLeadingFundamentals([])).toEqual([]);
    expect(strategicWhyLed(START, 'a3', 'white')).toBeNull();
  });
});
