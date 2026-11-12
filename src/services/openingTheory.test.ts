// Gaps A2-A5 — opening theory calculated from the masters' games at a board.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';
import { __setLocalDbForTests } from './masterPlayLookup';
import { openingTheoryFacts } from './openingTheory';

const fenAfter = (sans: string): string => { const c = new Chess(); for (const s of sans.split(' ').filter(Boolean)) c.move(s); return c.fen(); };

beforeAll(() => {
  __setLocalDbForTests(JSON.parse(readFileSync(join(process.cwd(), 'public/data/openings-masters-db.json'), 'utf8')));
});

describe('openingTheoryFacts', () => {
  it('1.e4 is a main move, and the board says what else masters play and their aim', () => {
    const f = openingTheoryFacts(new Chess().fen(), 'e4', true);
    expect(f.find((x) => x.kind === 'book-standing')?.sentence ?? '').toMatch(/main move|main line/);
    // Every alternative named is a move masters play here and carries an aim.
    for (const a of f.filter((x) => x.kind === 'book-alternatives')) expect(a.sentence).toMatch(/^Masters also play \S+ here, which /);
  });
  it('a rare move is called a sideline and names the main move', () => {
    const f = openingTheoryFacts(fenAfter('e4 c6 d4 d5 e5 Bf5'), 'a3', true);
    const s = f.find((x) => x.kind === 'book-standing');
    if (s) expect(s.sentence).toMatch(/sideline|leave the masters' moves/);
  });
  it('the reply masters give is named with their dots', () => {
    // A split field (after 2…d5 White plays e5, Nc3, exd5 or Nd2) names no reply.
    expect(openingTheoryFacts(fenAfter('e4 c6 d4'), 'd5', false).some((x) => x.kind === 'book-reply')).toBe(false);
    expect(openingTheoryFacts(fenAfter('e4 e5'), 'Nf3', true).find((x) => x.kind === 'book-reply')?.sentence ?? '').toMatch(/^Masters \w+( \w+)? answer with …Nc6\.$/);
  });
  it('no master games, no theory', () => {
    expect(openingTheoryFacts(fenAfter('a3 h6 b4 h5'), 'Ra2', true)).toEqual([]);
  });
});

describe('an alternative with the same aim (voice gate, 2026-11-12)', () => {
  it('is said as "with the same idea", never the aim again', async () => {
    const { Chess } = await import('chess.js');
    const c = new Chess(); for (const m of ['e4', 'c5', 'Nf3']) c.move(m);
    const facts = openingTheoryFacts(c.fen(), 'd6', true);
    const alts = facts.filter((f) => f.kind === 'book-alternatives');
    expect(alts.length).toBeGreaterThan(0);
    for (const a of alts) expect(a.sentence).not.toMatch(/which prepares e5/);
  });
});
