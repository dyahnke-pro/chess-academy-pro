// FOUR MORE RECOVERY CHECKS (mistakes round 2): each repair state holds at the
// quiet end of the reply line AND not on the board the move was played from —
// the state the move left. Boards from real master games
// (`src/data/model-games.json`), the reply line as the game played it.
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import games from '../data/model-games.json';
import { repairFillsFor } from './mistakeLesson';
import type { MistakeCause } from './mistakeCause';

const game = (id: string): string[] => {
  const g = (games as Array<{ id: string; pgn: string }>).find((x) => x.id === id);
  if (!g) throw new Error(`no game ${id}`);
  return g.pgn.trim().split(/\s+/);
};
/** The board before ply `i` (0-based) and the two replies after it, as UCI. */
const at = (id: string, i: number): { fenBefore: string; playedSan: string; replyLineUci: string[] } => {
  const sans = game(id);
  const c = new Chess();
  for (const s of sans.slice(0, i)) c.move(s);
  const fenBefore = c.fen();
  c.move(sans[i]);
  const replyLineUci = sans.slice(i + 1, i + 3).map((s) => { const m = c.move(s); return `${m.from}${m.to}${m.promotion ?? ''}`; });
  return { fenBefore, playedSan: sans[i], replyLineUci };
};
const cause = (kind: MistakeCause['kind']): MistakeCause => ({ kind, detail: null, motif: null, tag: null } as unknown as MistakeCause);

describe('the board states a move leaves', () => {
  it('pinned-now: Fischer–Petrosian, 12…Qd7 Re1 pins the bishop on e7 to the king', () => {
    const x = at('mg-fischer-petrosian', 23);
    expect(x.playedSan).toBe('Qd7');
    expect(repairFillsFor('pinned-now', { ...x, seat: 'you', cause: cause('positional') })).toEqual({ tPiece: 'bishop', target: 'e7', opPiece: 'rook' });
    // The move before it left no pin of its own.
    expect(repairFillsFor('pinned-now', { ...at('mg-fischer-petrosian', 21), seat: 'you', cause: cause('positional') })).toBeNull();
  });

  it('castling-lost: the Caro Exchange, 8…Nxe5 Bb5+ Kd8 — the king gave up castling', () => {
    const x = at('mg-caro-exchange', 15);
    expect(x.playedSan).toBe('Nxe5');
    expect(repairFillsFor('castling-lost', { ...x, seat: 'you', cause: cause('positional') })).toEqual({});
  });

  it('development-behind: three minor pieces at home after a move that wasted time', () => {
    const x = at('mg-rubinstein-four-knights-game', 9);
    expect(repairFillsFor('development-behind', { ...x, seat: 'you', cause: cause('tempo-wasted') })).toEqual({ n: 'three' });
    // Only on a move that wasted time (or the queen out early).
    expect(repairFillsFor('development-behind', { ...x, seat: 'you', cause: cause('positional') })).toBeNull();
  });

  it('file-opened: Fischer–Petrosian, 10.exd5 exd5 opens the e-file for a rook', () => {
    const x = at('mg-fischer-petrosian', 18);
    expect(x.playedSan).toBe('exd5');
    expect(repairFillsFor('file-opened', { ...x, seat: 'you', cause: cause('positional') })).toEqual({ file: 'e' });
  });
});
