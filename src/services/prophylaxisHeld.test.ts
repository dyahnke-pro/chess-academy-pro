// Easy walk 2026-10-11: "h3 first — it stops the pin with Bg4" was said on
// Learn unasked. The held idea names their idea, never the move that stops it.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { findProphylaxis, prophylaxisIdea, prophylaxisLine } from './prophylaxis';

describe('prophylaxis, held', () => {
  it('names their pin, never the stopping move', () => {
    const c = new Chess();
    'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6'.split(' ').forEach((m) => c.move(m));
    const p = findProphylaxis(c.fen());
    expect(p).not.toBeNull();
    expect(prophylaxisLine(p!)).toContain(p!.prevention.san);
    const idea = prophylaxisIdea(p!).text;
    expect(idea).not.toContain(p!.prevention.san);
    expect(idea).toMatch(/^Watch …?Bg4 — it would pin your knight on f3\. One move stops it before it lands\.$/);
  });
});
