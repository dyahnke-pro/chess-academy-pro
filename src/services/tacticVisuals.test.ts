import { describe, it, expect } from 'vitest';
import { buildTacticVisuals } from './tacticVisuals';

describe('buildTacticVisuals', () => {
  it('draws a green arrow + landing highlight on the key move', () => {
    // White knight b5 can play Nc7+ forking the king (e8) and rook (a8).
    const fen = 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1';
    const { arrows, highlights } = buildTacticVisuals(fen, ['b5c7']);

    // The key move is always drawn from→to.
    const keyMove = arrows.find((a) => a.startSquare === 'b5' && a.endSquare === 'c7');
    expect(keyMove).toBeDefined();
    expect(keyMove?.color).toMatch(/34, 197, 94/); // green

    // The landing square is highlighted so the eye lands on it.
    expect(highlights.some((h) => h.square === 'c7')).toBe(true);
  });

  it('paints the fork geometry (attacker → each target) it creates', () => {
    const fen = 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1';
    const { arrows, highlights } = buildTacticVisuals(fen, ['b5c7']);

    // After Nc7+ the knight forks a8 (rook) and e8 (king). The tactic detector
    // should surface those squares; we draw attacker→target lines from c7.
    const forkArrows = arrows.filter((a) => a.startSquare === 'c7');
    // At least one fork line to a real target square.
    expect(forkArrows.length).toBeGreaterThanOrEqual(1);
    for (const a of forkArrows) expect(['a8', 'e8']).toContain(a.endSquare);

    // The forked pieces' squares are highlighted.
    const hlSquares = new Set(highlights.map((h) => h.square));
    expect(hlSquares.has('a8') || hlSquares.has('e8')).toBe(true);
  });

  it('is empty for a missing FEN and safe for an empty move line', () => {
    expect(buildTacticVisuals(undefined, ['b5c7'])).toEqual({ arrows: [], highlights: [] });
    // No move line → surface whatever tactic already stands (quiet start pos = none).
    const start = buildTacticVisuals('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', []);
    expect(start.arrows).toEqual([]);
  });

  it('never throws on an illegal move line — still shows the move arrow', () => {
    const fen = 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1';
    const { arrows } = buildTacticVisuals(fen, ['b5b6']); // legal knight? no — b5-b6 illegal for a knight
    // Even if the move is illegal to replay, the key-move arrow is still drawn.
    expect(arrows.some((a) => a.startSquare === 'b5' && a.endSquare === 'b6')).toBe(true);
  });
});
