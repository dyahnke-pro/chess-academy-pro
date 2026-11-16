/**
 * "OUT OF REACH" ONLY WHEN IT IS (Review prod audit 2026-11-16, Giri–Carlsen):
 * "You played a5 — it takes your pawn out of reach of their rook on a1" and
 * "a4, which gets your pawn off a5 before their rook on a1 can take it" — the
 * rook still hits a5 and a4 down the open a-file. The move saves the pawn by
 * putting it where it is guarded, so that is what is said.
 */
import { describe, it, expect } from 'vitest';
import { moveJob, MINE } from './bookMoveWhy';
import { NO_FOLLOW } from './exchangeLedger';

// Before 25...a4 (after 25.Re2): a5 hangs to the rook on a1, a4 is guarded by the bishop on c6.
const BEFORE_A4 = '1qr2rk1/4bpp1/2b1p2p/p3P3/3PNQ2/5N2/1P2R1PP/R6K b - - 5 25';

describe('rescueJob: the attacker still reaching the new square', () => {
  it('never says the pawn is out of reach of a rook that still hits it', () => {
    const j = moveJob(BEFORE_A4, 'a4', 'b', MINE, null, NO_FOLLOW);
    const said = [j?.clause ?? '', ...(j?.forms ?? [])].join(' | ');
    expect(said).not.toMatch(/out of reach|before .* can take it/);
  });
  it('says where the pawn is safe and what guards it there', () => {
    const j = moveJob(BEFORE_A4, 'a4', 'b', MINE, null, NO_FOLLOW);
    expect(j?.clause).toMatch(/a4/);
    expect(j?.clause).toMatch(/bishop/);
  });
});
