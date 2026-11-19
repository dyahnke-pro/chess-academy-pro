// The chat's standing reads and the live depth reads, through the one
// registry (basket: every computer a surface calls lives in boardComputers).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { readBoard, readBoardAll, positionReadKind, minorityLever } from './boardComputers';
import { detectKingExposure, kingExposureClause } from './kingSafety';
import { findMinorityAttack } from './positionReadingService';
import { NO_SOUND_PLIES } from './thinkAloud';

const EXPOSED = '5rk1/8/8/8/7q/8/7P/5RK1 w - - 0 1';

describe('chat reads through the registry', () => {
  it('kingExposure: the one clause, fronted with whose king it is', () => {
    const clause = kingExposureClause(detectKingExposure(EXPOSED, 'w')!);
    expect(readBoard('kingExposure', { fen: EXPOSED, side: 'w', student: 'w' })?.text).toBe(`Your king: ${clause}`);
    expect(readBoard('kingExposure', { fen: EXPOSED, side: 'w', student: 'b' })?.text).toBe(`Their king: ${clause}`);
    expect(readBoard('kingExposure', { fen: new Chess().fen(), side: 'w', student: 'w' })).toBeNull();
  });
  it('shelterCracked: their king with two of three shelter pawns gone', () => {
    expect(readBoard('shelterCracked', { fen: EXPOSED, student: 'b' })?.text).toMatch(/^Their shelter is cracked — (two|all three)/);
    expect(readBoard('shelterCracked', { fen: EXPOSED, student: 'w' })).toBeNull();
  });
  it('positionRead: every observation, its own kind on the key', () => {
    const reads = readBoardAll('positionRead', { fen: '6k1/8/6p1/8/8/8/5PPP/3QR1K1 w - - 0 1', student: 'w' });
    expect(reads.map(positionReadKind)).toEqual(['piece', 'structure']);
    expect(reads.every((f) => f.text.length > 0)).toBe(true);
  });
  it('minority: the lever rides on the key', () => {
    const fen = 'r1bq1rk1/pp3ppp/2n1pn2/3p4/2PP4/2N1PN2/PP3PPP/R1BQ1RK1 w - - 0 9';
    const ma = findMinorityAttack(fen, 'w');
    const f = readBoardAll('minority', { fen, student: 'w' }).find((x) => x.seat === 'student');
    expect(f ? minorityLever(f) : null).toBe(ma?.leverSan ?? null);
  });
});

describe('the live depth reads through the registry', () => {
  it('theirHabit carries the tempo count, before the pieces at home', () => {
    const h = readBoardAll('theirHabit', { history: ['e4', 'Nf6', 'Nc3', 'Nd5', 'Nf3', 'Nb4'], student: 'w', sound: NO_SOUND_PLIES });
    expect(h.map((f) => f.claims[0])).toContain('habit:their:tempo');
  });
});
