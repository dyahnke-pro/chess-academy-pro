import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  computeMoveFundamentals,
  principleLine,
  ruleForPurpose,
  pickLeadingFundamentals,
  strategicWhyLed,
  strategicWhySelfContained,
  type MoveFundamental,
  principleContrastLine,
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

describe('a quiet pawn move that SUPPORTS the center has a why (prod hint audit 2026-09-06)', () => {
  // 1.e4 e6 — the engine gave 2.c3. The hint fell to the bare "that's the
  // strongest move here" because nothing modelled a pawn GUARDING the center.
  const FRENCH = 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
  it('c3 prepares d4 — the d-pawn arrives supported (2026-09-25: the better statement of guarding d4)', () => {
    const funds = computeMoveFundamentals(FRENCH, 'c3', 'white');
    expect(funds[0].id).toBe('prepare-break');
    expect(funds[0].squares).toEqual(['c3', 'd4', 'd2']);
    expect(strategicWhyLed(FRENCH, 'c3', 'white')).toBe('prepares d4 — when the d-pawn goes forward, it will be supported');
    // the support clause about the same square steps aside
    expect(funds.some((f) => f.id === 'center')).toBe(false);
  });
  it('e3 from the start guards d4 (f4 is extended center, not core — filtered out)', () => {
    // The centre clause is present and core-only (d4, never f4). Since
    // 2026-09-24 e3 LEADS with freeing the f1-bishop — the other true reason.
    // Since 2026-09-25 the d4 clause is "prepares d4" (d2–d4 arrives
    // supported), the better statement of guarding it — still core-only.
    const funds = computeMoveFundamentals(START, 'e3', 'white');
    const prep = funds.find((f) => f.id === 'prepare-break');
    expect(prep?.led).toBe('prepares d4 — when the d-pawn goes forward, it will be supported');
    expect(funds.some((f) => f.squares.includes('f4'))).toBe(false);
    expect(strategicWhyLed(START, 'e3', 'white')).toContain('opens the diagonal for the bishop on f1');
  });
  it('a wing pawn (a3 guards only b4) is NOT center support — keeps the a3 contract null', () => {
    expect(strategicWhyLed(START, 'a3', 'white')).toBeNull();
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

// Coach audit 2026-09-11 — the three positional fundamentals added so a quiet
// best move (h3, b4, O-O-side pawns) gets a real "why" instead of "advancing
// the pawn to h3". Each is board-verified; these lock that they fire on a real
// board and, for prophylaxis, ONLY when an enemy minor can actually reach the
// square (never an invented "stops …Bg4").
describe('computeMoveFundamentals — positional fundamentals (audit 2026-09-11)', () => {
  it('space: b4 in the KID grabs queenside space', () => {
    const fen = 'r1bq1rk1/ppp1npbp/3p1np1/3Pp3/2P1P3/2N2N2/PP2BPPP/R1BQ1RK1 w - - 1 9';
    const funds = computeMoveFundamentals(fen, 'b4', 'white');
    const space = funds.find((f) => f.id === 'space');
    expect(space, 'b4 should grab queenside space').toBeTruthy();
    expect(space!.led).toContain('queenside');
  });

  it('prophylaxis: h3 in the Italian takes g4 from the c8 bishop (which really can reach it)', () => {
    const fen = 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQ1RK1 w - - 2 7';
    const funds = computeMoveFundamentals(fen, 'h3', 'white');
    const p = funds.find((f) => f.id === 'prophylaxis');
    expect(p, 'h3 should deny the bishop g4').toBeTruthy();
    expect(p!.led).toContain('g4');
    expect(p!.led).toContain('bishop');
  });

  it('luft (not a false prophylaxis): h3 with no enemy minor able to reach g4 makes luft', () => {
    // King castled kingside, only rooks + pawns — no black minor can reach g4,
    // so prophylaxis must NOT fire; luft must.
    const fen = '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 20';
    const funds = computeMoveFundamentals(fen, 'h3', 'white');
    expect(funds.some((f) => f.id === 'prophylaxis'), 'no minor → no prophylaxis claim').toBe(false);
    const luft = funds.find((f) => f.id === 'luft');
    expect(luft, 'h3 in front of the castled king makes luft').toBeTruthy();
    expect(luft!.led).toContain('luft');
  });
});

describe('a pawn move that opens a bishop (hand walk 2026-09-24)', () => {
  it('Naroditsky\'s d3 opens the c1-bishop — and says so, not only "guards e4"', () => {
    // After 8.O-O Nbd7 in his game; White to play d3.
    const fen = 'r3kb1r/pp1npppp/2p2n2/q6b/8/2N3PP/PPPPNPB1/R1BQ1RK1 w kq - 3 9';
    const funds = computeMoveFundamentals(fen, 'd3', 'white');
    const top = funds.slice().sort((a, b) => b.weight - a.weight)[0];
    expect(top?.led).toContain('bishop on c1');
  });
  it('NEGATIVE CONTROL: a pawn move that frees nothing names no bishop', () => {
    const funds = computeMoveFundamentals('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'a3', 'white');
    expect(funds.some((f) => f.led.includes('bishop on'))).toBe(false);
  });
});

describe('g3 prepares the fianchetto (hand walk 2026-09-24)', () => {
  it('names the fianchetto — his "special setup, g3, preparing to fianchetto"', () => {
    // 1.e4 d5 2.exd5 Qxd5 3.Nc3 Qa5 — White plays g3.
    const fen = 'rnb1kbnr/ppp1pppp/8/q7/8/2N5/PPPP1PPP/R1BQKBNR w KQkq - 2 4';
    const top = computeMoveFundamentals(fen, 'g3', 'white').sort((a, b) => b.weight - a.weight)[0];
    expect(top?.led).toBe('prepares to fianchetto the bishop to g2');
  });
});

describe('development with tempo (hand walk 2026-09-24)', () => {
  it('3.Nc3 against the Scandinavian queen says it hits the queen', () => {
    // 1.e4 d5 2.exd5 Qxd5 — White plays Nc3.
    const fen = 'rnb1kbnr/ppp1pppp/8/3q4/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3';
    const dev = computeMoveFundamentals(fen, 'Nc3', 'white').find((f) => f.id === 'development');
    expect(dev?.led).toContain('with tempo, hitting the queen on d5');
  });
  it('NEGATIVE CONTROL: 2.Nf3 hits nothing and says nothing about tempo', () => {
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    const dev = computeMoveFundamentals(fen, 'Nf3', 'white').find((f) => f.id === 'development');
    expect(dev?.led ?? '').not.toContain('tempo');
  });
});

describe('a pawn that kicks a piece gains a tempo (hand walk 2026-09-24)', () => {
  it('9.f4 against …Ne5 in the Philidor: the reason is the kick, not "grab space"', () => {
    const fen = 'r1bq1rk1/ppp1bppp/3p1n2/4n3/3NP3/1BN5/PPP2PPP/R1BQ1RK1 w - - 5 9';
    const top = computeMoveFundamentals(fen, 'f4', 'white').sort((a, b) => b.weight - a.weight)[0];
    expect(top?.id).toBe('tempo');
    expect(top?.led).toBe('kicks their knight off e5, gaining time');
  });
  it('NEGATIVE CONTROL: a pawn push that hits nothing is not tempo', () => {
    expect(computeMoveFundamentals(START, 'e4', 'white').some((f) => f.id === 'tempo')).toBe(false);
  });
});

describe('a capture is not "planting on an outpost" (hand walk 2026-09-24)', () => {
  it('23.Bxe6+ takes a knight with check', () => {
    expect(computeMoveFundamentals('3q1rk1/pp4pp/2p1n3/4Pp1P/1b6/1BN1BR1P/PPP5/4Q1K1 w - - 0 23', 'Bxe6+', 'white').some((f) => f.id === 'outpost')).toBe(false);
  });
});

describe('development is a piece leaving its OWN starting square (hand walk 2026-09-30, Closed Ruy)', () => {
  const RUY = 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O d3 Bg4 Nbd2 Na5 Bc2 c5 Nf1 Nc6'.split(' ');
  it('Nf1–e3 on move 13 is not development', async () => {
    const { Chess } = await import('chess.js');
    const { computeMoveFundamentals } = await import('./moveFundamentals');
    const c = new Chess(); for (const m of RUY) c.move(m);
    expect(computeMoveFundamentals(c.fen(), 'Ne3', 'white').some((f) => f.id === 'development')).toBe(false);
  });
  it('Nb1–c3 still is (positive control)', async () => {
    const { Chess } = await import('chess.js');
    const { computeMoveFundamentals } = await import('./moveFundamentals');
    const c = new Chess(); c.move('e4'); c.move('e5');
    expect(computeMoveFundamentals(c.fen(), 'Nc3', 'white').some((f) => f.id === 'development')).toBe(true);
  });
});

// unify-the-coach B1 (2026-10-01): past the opening the stem described the move
// ("Ne3 lands on the e3 outpost") and never said why. The first time a
// fundamental speaks in a game, its rule rides with it; after that, the stem.
describe('the rule rides with the middlegame purpose, once (B1)', () => {
  const fen = '1r3r1k/pp1R2pp/8/4p3/2B3P1/1P6/1P4nP/1K5R b - - 3 25';
  it('the first outpost says why outposts matter', async () => {
    const { principleLine } = await import('./moveFundamentals');
    const r = principleLine(fen, 'Ne3', 'black', new Set(), 0);
    expect(r?.text).toMatch(/e3 outpost.* — a piece no pawn can chase stays there/);
    expect(r?.id.split('|')).toContain('mg-rule:outpost');
  });
  it('once the rule is taught, only the stem speaks', async () => {
    const { principleLine } = await import('./moveFundamentals');
    const r = principleLine(fen, 'Ne3', 'black', new Set(['mg-rule:outpost']), 0);
    expect(r?.text).not.toMatch(/no pawn can chase/);
  });
});

// unify-the-coach B1 step 2: "Bc4 clears the way to castle" described the plan.
// The rule behind the prepared move rides with it, once a game, on the same
// ledger the principle lines use.
describe('the rule behind a prepared move (B1)', () => {
  // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 — White to move; O-O is what Bc4 prepared.
  const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
  it('castling carries the king-safety rule', async () => {
    const { ruleForPurpose } = await import('./moveFundamentals');
    const r = ruleForPurpose(fen, 'O-O', 'white', new Set(), 'student');
    expect(r?.text).toMatch(/king left in the middle/);
    expect(r?.keys).toContain('king-safety');
  });
  it('a rule already taught is not said again', async () => {
    const { ruleForPurpose } = await import('./moveFundamentals');
    expect(ruleForPurpose(fen, 'O-O', 'white', new Set(['king-safety']), 'student')).toBeNull();
  });
  it('reads the prepared move with the mover to play (their plan, our turn)', async () => {
    const { ruleForPurpose } = await import('./moveFundamentals');
    // Same board with BLACK to move: White's O-O is still read as White's.
    const black = fen.replace(' w ', ' b ');
    expect(ruleForPurpose(black, 'O-O', 'white', new Set(), 'student')?.keys).toContain('king-safety');
  });
});

describe('the space rule rides with a flank space-grab, once (B1)', () => {
  it('a4 past the opening says why space matters, then only the purpose', () => {
    const c = new Chess();
    for (const s of 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Be7 Nc3 Nf6 Bc4 O-O Bb3 Nbd7 O-O Ne5 f4 Ned7 Nf3 Nc5 Qe1 Bg4 e5 dxe5 fxe5 Nh5 Be3 Ne6'.split(' ')) c.move(s);
    const first = principleLine(c.fen(), 'a4', 'white', new Set(), 0);
    expect(first?.text).toBe('Your a4 grabs space on the queenside — space is a slow, real edge: keep it and your pieces breathe while theirs stumble over each other.');
    const again = principleLine(c.fen(), 'a4', 'white', new Set(['mg-rule:space']), 0);
    expect(again?.text).toBe('Your a4 grabs space on the queenside.');
  });
});

describe('a rule rides only where its reason is true (B1)', () => {
  it('h3 on move 15, every black minor out, kicks the bishop without the "developing" reason', () => {
    const c = new Chess();
    for (const s of 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Be7 Nc3 Nf6 Bc4 O-O Bb3 Nbd7 O-O Ne5 f4 Ned7 Nf3 Nc5 Qe1 Bg4 e5 dxe5 fxe5 Nh5 Be3 Ne6'.split(' ')) c.move(s);
    expect(principleLine(c.fen(), 'h3', 'white', new Set(), 0)?.text).toBe('Your h3 kicks their bishop off g4, gaining time.');
  });
});

describe('prophylaxis carries its rule, once (B1, David 2026-10-01: "Add rule base")', () => {
  it('g3 takes f4 from the knight and says why denying a square matters', () => {
    const c = new Chess();
    for (const s of 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Be7 Nc3 Nf6 Bc4 O-O Bb3 Nbd7 O-O Ne5 f4 Ned7 Nf3 Nc5 Qe1 Bg4 e5 dxe5 fxe5 Nh5 Be3 Ne6'.split(' ')) c.move(s);
    expect(principleLine(c.fen(), 'g3', 'white', new Set(), 0)?.text).toBe('Your g3 takes the f4 square away from their knight — stop what they want before you chase what you want: a square their piece never reaches is a plan it never starts.');
    expect(principleLine(c.fen(), 'g3', 'white', new Set(['mg-rule:prophylaxis']), 0)?.text).toBe('Your g3 takes the f4 square away from their knight.');
  });
});


describe('the rule behind THEIR prepared move speaks from the right seat (Learn walk 2026-10-01)', () => {
  it('their O-O prepares d5 to hit the knight — no "every move they spend retreating" said to the student', () => {
    const c = new Chess();
    for (const s of 'e4 e5 c3 Be7 d4 exd4 cxd4 Nf6 Nc3 Nc6 h3 d5 e5 Ne4 Bd3 Bb4 Bxe4 dxe4 Ne2 Be6 O-O'.split(' ')) c.move(s);
    // The walk had already taught the centre rule, so tempo was next in line.
    const theirs = ruleForPurpose(c.fen(), 'd5', 'white', new Set(['center']), 'opponent');
    expect(theirs?.keys ?? []).not.toContain('tempo');
    expect(theirs?.text ?? '').not.toMatch(/\bthey spend\b/);
  });
});

describe('the outpost rule rides only with a piece standing on the hole (Learn walk 2026-10-01)', () => {
  it('Nh6+ eyes g4 — no "stays there for the whole game"', () => {
    const c = new Chess();
    for (const s of 'h4 Nc6 c3 Nf6 f3 e5 g4 d5 b4 e4 h5 exf3 exf3 Bd6 Kf2 O-O d4 a5 b5 Ne7 a4 c5 g5 Nf5 gxf6 Qxf6 f4 cxd4 c4 dxc4 Bxc4 Bc5 Kf1 Be6 Bxe6 Qxe6 Qf3 Qc4+ Kg2 Qxc1 Ne2 Ne3+ Kg3 Qb2 Nbc3 dxc3 Rab1 Nf5+ Kg4'.split(' ')) c.move(s);
    const r = principleLine(c.fen(), 'Nh6+', 'black', new Set(), 0);
    expect(r?.text ?? '').toMatch(/eyes g4/);
    expect(r?.text ?? '').not.toMatch(/stays there/);
  });
});

describe('principleContrastLine — the rule the best move kept, on a move that kept none (review walk 2026-10-02)', () => {
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  it('1.h4 (owed, silent before): names the rule e4 kept, says nothing about h4', () => {
    const r = principleContrastLine(START, 'h4', 'e4', 'white', new Set(), 0);
    expect(r?.first).toBe(true);
    expect(r?.text).toMatch(/^e4 was the opening move here — stake out the center/);
    expect(r?.text).not.toMatch(/h4/);
  });
  it('a rule already taught is a stem, not the rule again', () => {
    const r = principleContrastLine(START, 'h4', 'e4', 'white', new Set(['center']), 0);
    expect(r?.first).toBe(false);
    expect(r?.text).toBe('e4 stakes out the center and grabs space — the opening move here.');
  });
  it('silent when the played move keeps a rule of its own, or IS the best move', () => {
    expect(principleContrastLine(START, 'd4', 'e4', 'white', new Set(), 0)).toBeNull();
    expect(principleContrastLine(START, 'e4', 'e4', 'white', new Set(), 0)).toBeNull();
    expect(principleContrastLine(START, 'h4', null, 'white', new Set(), 0)).toBeNull();
  });
});
