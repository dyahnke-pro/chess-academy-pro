// Real positions from Naroditsky speedrun games walked on Learn (2026-09-30).
// Each is a board where the coach said "Watch out — …" or "Careful — …" and
// stopped; `best` is Stockfish depth 16 at that board.
import { describe, it, expect } from 'vitest';
import { threatAnswer } from './threatAnswer';
import { stripThink } from '../utils/thinkPause';

const run = (fen: string, squares: string[], best: string, cp: number, shape: 'line' | 'hit' = 'line', ply = 0) =>
  withPlainText(threatAnswer({ fen, squares, bestUci: best, studentCp: cp, student: fen.split(' ')[1] as 'w' | 'b', ply, shape, namesMove: true }));
const withPlainText = <T extends { text: string } | null>(a: T): T => (a ? { ...a, text: stripThink(a.text) } : a);

describe('threatAnswer', () => {
  it('a pawn that hits the pinner is "ask the question" (…Bg4 pins Nf3 to Rd1; h3)', () => {
    const a = run('r3qrk1/ppp1bppp/4n3/4P2n/6b1/1BN1BN2/PPP3PP/3RQRK1 w - - 5 16', ['g4', 'f3', 'd1'], 'h2h3', 223);
    expect(a?.kind).toBe('kick');
    expect(a?.text).toMatch(/\? Ask the question — h3 hits the bishop at once\.$/);
    expect(a?.arrow).toMatchObject({ from: 'h2', to: 'h3', role: 'play', vouchedBy: 'engine' });
  });

  it('moving the piece behind the pin is "step out of it" (…Bb4 pins Nc3 to Qe1; Qh4)', () => {
    const a = run('r3qrk1/pp3ppp/2p1n3/4P2n/1b4b1/1BN1BN2/PPP3PP/3RQRK1 w - - 2 18', ['b4', 'c3', 'e1'], 'e1h4', 330);
    expect(a?.kind).toBe('step-out');
    expect(a?.text).toContain('your queen on e1 steps out of it with Qh4');
    expect(a?.text).not.toMatch(/Qh4 takes/);
  });

  it('the king leaving the file is named as the king (…Rae8 pins Be3 to Ke1; Kd2)', () => {
    const a = run('r3rk2/pp1n1ppp/8/8/8/2P1BN2/PP4PP/RN2K3 w - - 3 19', ['e8', 'e3', 'e1'], 'e1d2', 225);
    expect(a?.text).toContain('your king steps out of it with Kd2');
  });

  it('a second guard is "guard it" (rooks stacked on the e-file against Be3; Nc4)', () => {
    const a = run('4rk2/pp3ppp/8/4r3/8/2P1B3/PP1N1KPP/R7 w - - 2 22', ['e8', 'e5', 'e3'], 'd2c4', 264);
    expect(a?.kind).toBe('guard');
    expect(a?.text).toContain('Nc4 adds a defender to your bishop on e3');
  });

  it('taking the attacker is "take it" (Bb5 hit by …Bd7; Bxd7+)', () => {
    const a = run('rn1qkb1r/pp1b1ppp/5n2/1Bpp4/3P4/2P2N2/PP3PPP/RNBQK2R w KQkq - 4 7', ['b5', 'd7'], 'b5d7', 29, 'hit');
    expect(a?.kind).toBe('take');
    expect(a?.text).toContain('Bxd7+ removes the bishop doing it');
  });

  it('a hit piece moving away names its square, never "the line" (Be6 hit by …Qe7; Bg4)', () => {
    const a = run('5r1k/pp2q1pp/2p1B3/2b1P2P/5B2/2N2R1P/PPP3K1/4Q3 w - - 3 27', ['e6', 'e7'], 'e6g4', 715, 'hit');
    expect(a?.kind).toBe('step-out');
    expect(a?.text).toContain('Move it — Bg4 puts the bishop on g4, where they can\'t win it.');
    expect(a?.text).not.toContain('line');
  });

  it('a best move that ignores the threat, student not worse, is "it can wait" (…Bc5 pins f2; Qxd5)', () => {
    const a = run('r2qk2r/pp1n1ppp/8/2bp4/4n3/2P2N2/PP3PPP/RNBQR1K1 w kq - 2 13', ['c5', 'f2', 'g1'], 'd1d5', 259);
    expect(a?.kind).toBe('wait');
    expect(a?.text).toContain('It can wait — Qxd5 comes first.');
  });

  it('says nothing when the best move does none of those and the student is worse', () => {
    const a = run('r2qk2r/pp1n1ppp/8/2bp4/4n3/2P2N2/PP3PPP/RNBQR1K1 w kq - 2 13', ['c5', 'f2', 'g1'], 'd1d5', -200);
    expect(a).toBeNull();
  });

  it('the question stem rotates on the ply, never randomly', () => {
    const fen = 'r3qrk1/ppp1bppp/4n3/4P2n/6b1/1BN1BN2/PPP3PP/3RQRK1 w - - 5 16';
    const t = [0, 1, 2, 3].map((p) => run(fen, ['g4', 'f3', 'd1'], 'h2h3', 223, 'line', p)?.text.split('?')[0]);
    expect(new Set(t.slice(0, 3)).size).toBe(3);
    expect(t[3]).toBe(t[0]);
  });

  it('a hit line naming only the victim finds the attacker on the board', () => {
    const a = run('5r1k/pp2q1pp/2p1B3/2b1P2P/5B2/2N2R1P/PPP3K1/4Q3 w - - 3 27', ['e6'], 'e6g4', 715, 'hit');
    expect(a?.kind).toBe('step-out');
  });

  it('the attacked piece leaving with a capture is never "guard it" (walk 2026-09-30, Rd7 hit; Rxe7+)', () => {
    const fen = '1r5r/1b1Rb3/p3k1p1/1p2p2p/4P2P/2B2P2/PPP1B1P1/1K5R w - - 1 27';
    const a = run(fen, ['d7', 'e6'], 'd7e7', 400, 'hit');
    expect(a?.kind).toBe('with-gain');
    expect(a?.text).toContain('Move it with gain — take their bishop with check: Rxe7+.');
  });

  it('refuses a board where the student is not to move', () => {
    expect(threatAnswer({ fen: 'r3rk2/pp1n1ppp/8/8/8/2P1BN2/PP4PP/RN2K3 b - - 3 19', squares: ['e8', 'e3', 'e1'], bestUci: 'f8g8', studentCp: 0, student: 'w', ply: 0, shape: 'line', namesMove: true })).toBeNull();
  });

  it('a check elsewhere is not "guard it", even when it leaves a defender (merged walk, x-TMzSM51Cw ply 28)', () => {
    // Knight on e3 hit; Nxf3+ from d4 checks, and only then does the c5-bishop cover e3.
    const a = run('r2q1rk1/ppp2ppp/1b6/3p4/3n4/4nP1P/PPPQ2P1/2R1K2R b K - 0 16', ['e3'], 'd4f3', 150, 'hit');
    expect(a?.kind === 'guard').toBe(false);
  });
});

describe('Learn walk 2026-10-02 — "it can wait" is never a rescue', () => {
  it('ply 48: the hanging-knight warning, best Qd2 rescues the queen Rxb2 hits — not "it can wait"', () => {
    const fen = 'r4rk1/1p3ppp/8/pPb2n1P/P4PK1/2p2Q2/1q2N3/1R5R b - - 3 25';
    const a = threatAnswer({ fen, squares: ['f5'], bestUci: 'b2d2', studentCp: 640, student: 'b', ply: 48, shape: 'hit', namesMove: true });
    expect(a?.kind).not.toBe('wait');
  });
  it('ply 70: the discovery-in-waiting warning, best Nc3 rescues the knight Rxe2 hits — not "it can wait"', () => {
    const fen = '4rrk1/1p3ppp/8/pP3P1P/Pb2N1K1/4R3/4n3/7R b - - 2 36';
    const a = threatAnswer({ fen, squares: ['e4', 'e3', 'e8'], bestUci: 'e2c3', studentCp: 530, student: 'b', ply: 70, shape: 'line', namesMove: true });
    expect(a?.kind).not.toBe('wait');
  });
  it('ply 72: a forked rook leaving with a capture is still "move it with gain" (it IS one of the forked pieces)', () => {
    const fen = '2r5/2R4p/pNrP2p1/2Pk1p2/1P6/7P/P5P1/6K1 b - - 4 37';
    const a = threatAnswer({ fen, squares: ['c7', 'c8', 'c6'], bestUci: 'c6b6', studentCp: -800, student: 'b', ply: 72, shape: 'hit', namesMove: true });
    expect(a?.kind).toBe('with-gain');
  });
});

describe('a line threat is answered only when it is on the board (Smith-Morra replay 2026-10-19)', () => {
  // 1.e4 c5 2.d4 cxd4 3.c3 dxc3 4.Nxc3 d6: "No rush yet — if you play e5 and
  // they answer dxe5, … reveals their queen on d8 attacking your queen on d1"
  // was answered "Step out of it — take the queen off the line" — a line the
  // d6 pawn shuts, and can only open after a move of the student's.
  const smithMorra = 'rnbqkbnr/pp2pppp/3p4/8/4P3/2N5/PP3PPP/R1BQKBNR w KQkq - 0 5';
  it('a hypothetical discovery gets no answer', () => {
    for (const namesMove of [true, false]) {
      expect(threatAnswer({ fen: smithMorra, squares: ['d6', 'd8', 'd1'], bestUci: 'd1b3', studentCp: 80, student: 'w', ply: 0, shape: 'line', namesMove })).toBeNull();
    }
  });
  it('two of their pieces on the line: moving one cannot open it', () => {
    // …d5 and the knight on e4 both stand between b7 and g2.
    expect(threatAnswer({ fen: '6k1/1b3ppp/8/3pP3/4n3/6P1/5PQK/8 w - d6 0 30', squares: ['e4', 'f2', 'b7', 'g2'], bestUci: 'g2h3', studentCp: 0, student: 'w', ply: 0, shape: 'line', namesMove: false })).toBeNull();
  });
  it('a discovery they can play next move is answered, and the answer names the piece', () => {
    const fen = '3qk3/8/8/3n4/8/8/8/3QK3 w - - 0 1';
    const held = threatAnswer({ fen, squares: ['d8', 'd1'], bestUci: 'd1b3', studentCp: 0, student: 'w', ply: 0, shape: 'line', namesMove: false });
    expect(held?.kind).toBe('step-out');
    expect(stripThink(held?.text ?? '')).toMatch(/Step off the line — your queen on d1 has a square out of it\.$/);
  });
});

describe('Learn holds the move (hard-question walk 2026-10-11)', () => {
  it('the held answer says the kind of move, never the move, and draws nothing', () => {
    const fen = 'r3qrk1/ppp1bppp/4n3/4P2n/6b1/1BN1BN2/PPP3PP/3RQRK1 w - - 5 16';
    const named = threatAnswer({ fen, squares: ['g4', 'f3', 'd1'], bestUci: 'h2h3', studentCp: 223, student: 'w', ply: 0, shape: 'line', namesMove: true })!;
    const held = threatAnswer({ fen, squares: ['g4', 'f3', 'd1'], bestUci: 'h2h3', studentCp: 223, student: 'w', ply: 0, shape: 'line', namesMove: false })!;
    expect(stripThink(held.text)).toMatch(/Ask the question — a pawn move hits the attacker at once\.$/);
    expect(named.text).toContain(named.san);
    expect(held.kind).toBe(named.kind);
    expect(held.text).not.toContain(held.san);
    expect(held.arrow).toBeNull();
  });
});

describe('a held "take it" never hands over the capture (Smith-Morra walk 2026-10-19)', () => {
  it('one capture of the attacker on the board: the held answer is silent', () => {
    // Their bishop on g3 hits the rook on f2; only hxg3 takes it.
    const fen = '6k1/5ppp/8/8/8/6b1/5R1P/6K1 w - - 0 31';
    expect(threatAnswer({ fen, squares: ['g3', 'f2'], bestUci: 'h2g3', studentCp: 300, student: 'w', ply: 0, shape: 'hit', namesMove: true })?.kind).toBe('take');
    expect(threatAnswer({ fen, squares: ['g3', 'f2'], bestUci: 'h2g3', studentCp: 300, student: 'w', ply: 0, shape: 'hit', namesMove: false })).toBeNull();
  });
  it('several captures: which one matters, never "any will do"', () => {
    const fen = '6k1/5ppp/8/8/8/6b1/4NR1P/6K1 w - - 0 31';
    const held = threatAnswer({ fen, squares: ['g3', 'f2'], bestUci: 'h2g3', studentCp: 300, student: 'w', ply: 0, shape: 'hit', namesMove: false });
    expect(stripThink(held?.text ?? '')).toMatch(/Take it — but with the right piece: check what each capture of the bishop allows before you choose\.$/);
    expect(held?.text).not.toMatch(/hxg3|h2/);
  });
});

describe('a held "it can wait" says what comes first, or nothing (OS-1 g2 ply 18)', () => {
  it('the d-file battery on d6 after 10.O-O-O, met by the quiet a5: silent, never "something stronger comes first"', () => {
    const fen = 'rn1q1rk1/1p2bppp/p2pbn2/4p3/4P3/1NN1BP2/PPPQ2PP/2KR1B1R b - - 7 10';
    const at = (namesMove: boolean) => threatAnswer({ fen, squares: ['d1', 'd2', 'd6'], bestUci: 'a6a5', studentCp: 0, student: 'b', ply: 18, shape: 'line', namesMove });
    expect(at(true)?.kind).toBe('wait');
    expect(at(false)).toBeNull();
  });
  it('a capture first is said by its kind, the move held', () => {
    const a = threatAnswer({ fen: 'r2qk2r/pp1n1ppp/8/2bp4/4n3/2P2N2/PP3PPP/RNBQR1K1 w kq - 2 13', squares: ['c5', 'f2', 'g1'], bestUci: 'd1d5', studentCp: 259, student: 'w', ply: 0, shape: 'line', namesMove: false });
    expect(stripThink(a?.text ?? '')).toMatch(/It can wait — you have a capture that comes first: their pawn is there to take\.$/);
    expect(a?.text).not.toMatch(/Qxd5|d5/);
  });
});
