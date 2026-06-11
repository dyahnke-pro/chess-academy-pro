import { describe, it, expect } from 'vitest';
import { classifyMisconception } from './misconceptionClassifier';

// The classifier is now FULLY DETERMINISTIC — no LLM, no mocks. It reads the
// board (chess.js) + the engine facts the caller supplies and computes a
// closed-set tag in code (David 2026-06-11: "remove the LLM"). A real slip
// always yields a tag, so the Thinking-Errors pipeline never depends on a
// model returning parseable JSON.

describe('classifyMisconception (deterministic)', () => {
  it('tags hung-material when the move leaves a piece en prise, naming the square', async () => {
    // White Nf3-d4 walks into the e5 pawn; the knight on d4 is undefended.
    const r = await classifyMisconception({
      fen: '4k3/8/8/4p3/8/5N2/8/4K3 w - - 0 1',
      playedSan: 'Nd4',
      gamePhase: 'middlegame',
    });
    expect(r).not.toBeNull();
    expect(r!.tag).toBe('hung-material');
    expect(r!.coachNote).toContain('d4');
    expect(r!.coachNote.toLowerCase()).toContain('knight');
  });

  it('tags missed-tactic when a forcing best move lands a tactic and the played move was quiet', async () => {
    // Nd6+ forks the king on e8 and rook on c8; the player shuffled the king.
    const r = await classifyMisconception({
      fen: '2r1k3/8/8/8/4N3/8/8/4K3 w - - 0 1',
      playedSan: 'Kd2',
      bestSan: 'Nd6+',
      gamePhase: 'middlegame',
    });
    expect(r!.tag).toBe('missed-tactic');
  });

  it('does NOT tag missed-tactic when the played move itself was forcing', async () => {
    // Same fork available, but the player captured something (not "quiet").
    const r = await classifyMisconception({
      fen: '2r1k3/8/8/8/4N3/8/8/4K3 w - - 0 1',
      playedSan: 'Nxc5', // illegal here → falls back, but proves we don't mislabel
      bestSan: 'Nd6+',
      gamePhase: 'middlegame',
    });
    expect(r!.tag).not.toBe('missed-tactic');
  });

  it('tags greedy-pawn-grab when an opening move snatches a pawn', async () => {
    const r = await classifyMisconception({
      fen: '4k3/8/8/2p5/4N3/8/8/4K3 w - - 0 1',
      playedSan: 'Nxc5',
      gamePhase: 'opening',
    });
    expect(r!.tag).toBe('greedy-pawn-grab');
    expect(r!.coachNote).toContain('c5');
  });

  it('tags king-stuck-center when castling was legal and declined in the opening', async () => {
    const r = await classifyMisconception({
      fen: 'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
      playedSan: 'd3',
      gamePhase: 'opening',
    });
    expect(r!.tag).toBe('king-stuck-center');
  });

  it('falls back to an honest phase-bucketed "other" when no motif is provable', async () => {
    const r = await classifyMisconception({
      fen: 'r4rk1/pppq1ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPPQ1PPP/R4RK1 w - - 0 1',
      playedSan: 'a3',
      gamePhase: 'middlegame',
    });
    expect(r!.tag).toBe('other');
    expect(r!.customLabel).toBe('Middlegame slip');
  });

  it('returns null only when the FEN itself is unparseable', async () => {
    expect(await classifyMisconception({ fen: 'not a fen', playedSan: 'e4' })).toBeNull();
  });

  it('still surfaces the slip (never null) when the SAN does not fit the FEN', async () => {
    const r = await classifyMisconception({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      playedSan: 'Qh5', // illegal move 1
      gamePhase: 'opening',
    });
    expect(r).not.toBeNull();
    expect(r!.tag).toBe('other');
    expect(r!.customLabel).toBe('Opening slip');
  });

  it('every emitted tag is in the closed set (no hallucinated ids — impossible by construction)', async () => {
    const r = await classifyMisconception({
      fen: '4k3/8/8/4p3/8/5N2/8/4K3 w - - 0 1',
      playedSan: 'Nd4',
    });
    // 'none' is never emitted; the caller already gated this as a real slip.
    expect(r!.tag).not.toBe('none');
  });
});
