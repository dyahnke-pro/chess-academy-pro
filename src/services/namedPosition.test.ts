import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { resolveNamedPosition, namedPositionNames } from './namedPosition';

describe('namedPosition — code supplies the board, the model only names it', () => {
  it('has a non-empty corpus (a resolver over nothing would pass every null test)', () => {
    const names = namedPositionNames();
    expect(names.length).toBeGreaterThan(5);
  });

  it('every resolvable name yields a LEGAL board', () => {
    // The whole point is that these FENs are real. A corpus entry with a
    // malformed FEN would hand the coach a broken board with full confidence.
    for (const name of namedPositionNames()) {
      const hit = resolveNamedPosition(name);
      expect(hit, `"${name}" does not resolve to itself`).toBeTruthy();
      expect(() => new Chess(hit!.fen), `${name}: ${hit!.fen}`).not.toThrow();
    }
  });

  it('resolves a spoken request the way a student would phrase it', () => {
    const hit = resolveNamedPosition('set up a back-rank mate');
    expect(hit?.name.toLowerCase()).toContain('back-rank');
    expect(new Chess(hit!.fen).fen()).toBe(hit!.fen);
  });

  it('matches an alias, not only the canonical name', () => {
    // mating-patterns.json gives Back-Rank Mate the alias "Corridor Mate".
    const hit = resolveNamedPosition('corridor mate');
    expect(hit?.id).toBe('back-rank-mate');
  });

  it('returns NULL for something the corpora do not carry', () => {
    // Null is the honest answer. A fuzzy near-miss would set up a confidently
    // narrated board the student never asked for — the hallucination this
    // whole build exists to remove, wearing a helpfulness costume.
    expect(resolveNamedPosition('the Zurich 1953 rook ending')).toBeNull();
    expect(resolveNamedPosition('xyzzy')).toBeNull();
    expect(resolveNamedPosition('')).toBeNull();
  });

  it('a bare stop-word query never resolves', () => {
    // "the position" / "a setup" must not land on whatever sorts first.
    expect(resolveNamedPosition('the position')).toBeNull();
    expect(resolveNamedPosition('set up the position')).toBeNull();
  });
});
