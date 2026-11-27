// THE OPENED FILE (mistakes round 2, beside main's six board states): the
// file a move opened is the student's — a rook belongs there — held at the
// quiet end of the reply line AND closed on the board the move was played from. Boards from real master games
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

describe('the file a move opens', () => {
  it('file-opened: Fischer–Petrosian, 10.exd5 exd5 opens the e-file for a rook', () => {
    const x = at('mg-fischer-petrosian', 18);
    expect(x.playedSan).toBe('exd5');
    expect(repairFillsFor('file-opened', { ...x, seat: 'you', cause: cause('positional') })).toEqual({ file: 'e' });
  });
});
