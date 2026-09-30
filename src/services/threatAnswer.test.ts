// Real positions from Naroditsky speedrun games walked on Learn (2026-09-30).
// Each is a board where the coach said "Watch out — …" or "Careful — …" and
// stopped; `best` is Stockfish depth 16 at that board.
import { describe, it, expect } from 'vitest';
import { threatAnswer } from './threatAnswer';
import { stripThink } from '../utils/thinkPause';

const run = (fen: string, squares: string[], best: string, cp: number, shape: 'line' | 'hit' = 'line', ply = 0) =>
  withPlainText(threatAnswer({ fen, squares, bestUci: best, studentCp: cp, student: fen.split(' ')[1] as 'w' | 'b', ply, shape }));
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
    expect(a?.text).toContain('Qh4 takes the queen off the line');
  });

  it('the king leaving the file is named as the king (…Rae8 pins Be3 to Ke1; Kd2)', () => {
    const a = run('r3rk2/pp1n1ppp/8/8/8/2P1BN2/PP4PP/RN2K3 w - - 3 19', ['e8', 'e3', 'e1'], 'e1d2', 225);
    expect(a?.text).toContain('Kd2 takes the king off the line');
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
    expect(threatAnswer({ fen: 'r3rk2/pp1n1ppp/8/8/8/2P1BN2/PP4PP/RN2K3 b - - 3 19', squares: ['e8', 'e3', 'e1'], bestUci: 'f8g8', studentCp: 0, student: 'w', ply: 0, shape: 'line' })).toBeNull();
  });
});
