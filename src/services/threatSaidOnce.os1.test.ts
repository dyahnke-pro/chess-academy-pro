// OS-1 g2 ply 12 (Najdorf English Attack as Black, 6…e5 7.Nb3): the Bg5 pin
// was said three times in one turn — a conditional threat that blamed …Nc6
// for a pin Bg5 makes whatever Black plays, then the prophylaxis line saying
// the pin twice in its own two sentences.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { spokenUpcoming } from './liveTacticsContext';
import { detectTactics } from './tacticsDetector';
import { findProphylaxis, prophylaxisLine } from './prophylaxis';

const root = (() => { const c = new Chess(); 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 f3 e5 Nb3'.split(' ').forEach((m) => c.move(m)); return c.fen(); })();
const after = (sans: string[]): string => { const c = new Chess(root); sans.forEach((m) => c.move(m)); return c.fen(); };

describe('the Bg5 pin, said once (OS-1 g2 ply 12)', () => {
  it('a pin their move makes anyway is never blamed on the student\'s move', () => {
    const fen = after(['Nc6', 'Bg5']);
    const pin = detectTactics(fen).tactics.find((t) => t.type === 'pin' && t.involvedSquares.includes('g5'));
    expect(pin).toBeDefined();
    const said = spokenUpcoming(['Nc6', 'Bg5'], pin!.description, fen, root, 'b') ?? '';
    expect(said).not.toMatch(/if you play/);
    expect(said).toMatch(/^if they play Bg5, their bishop on g5 pins your knight on f6/);
  });
  it('the prophylaxis line names the pin once', () => {
    const p = findProphylaxis(root);
    expect(p?.intent.san).toBe('Bg5');
    const line = prophylaxisLine(p!);
    expect(line.match(/\bpin\b/g)?.length ?? 0).toBeLessThanOrEqual(1);
  });
});
