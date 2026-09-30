import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/schema';
import { medianBookDepth, noteTrapMeeting, resetTrapRecord, trapDecision, trapSpeaks, warmTrapRecord, type TrapMeeting } from './trapLearning';

const held = (game: string, prompted: boolean, at: number): TrapMeeting => ({ outcome: 'held', prompted, sourceGameId: game, recordedAt: at });
const broken = (game: string, at: number): TrapMeeting => ({ outcome: 'broken', prompted: false, sourceGameId: game, recordedAt: at });
const opts = { bookDepthPlies: null, trapPly: 9 };

describe('trapDecision — warn, test, green, red', () => {
  it('grey warns: a first meeting always speaks', () => {
    expect(trapDecision([], opts)).toEqual({ state: 'grey', speak: true });
  });
  it('one heeded warning is not yet a test without book depth', () => {
    expect(trapDecision([held('g1', true, 1)], opts)).toEqual({ state: 'warned', speak: true });
  });
  it('two heeded warnings in two games earn the silent test', () => {
    expect(trapDecision([held('g1', true, 1), held('g2', true, 2)], opts)).toEqual({ state: 'test', speak: false });
  });
  it('two heeds inside ONE game do not', () => {
    expect(trapDecision([held('g1', true, 1), held('g1', true, 2)], opts).speak).toBe(true);
  });
  it('book depth past the trap brings the test after one heeded game', () => {
    expect(trapDecision([held('g1', true, 1)], { bookDepthPlies: 14, trapPly: 9 })).toEqual({ state: 'test', speak: false });
    expect(trapDecision([held('g1', true, 1)], { bookDepthPlies: 6, trapPly: 9 }).speak).toBe(true);
  });
  it('an unaided avoid is green — quiet', () => {
    expect(trapDecision([held('g1', true, 1), held('g2', true, 2), held('g3', false, 3)], opts)).toEqual({ state: 'green', speak: false });
  });
  it('book depth alone never makes a trap green', () => {
    expect(trapDecision([], { bookDepthPlies: 30, trapPly: 9 }).speak).toBe(true);
  });
  it('walking in turns it red, and green must be re-earned', () => {
    const rows = [held('g1', true, 1), held('g2', true, 2), held('g3', false, 3), broken('g4', 4)];
    expect(trapDecision(rows, opts)).toEqual({ state: 'red', speak: true });
    expect(trapDecision([...rows, held('g5', true, 5)], opts)).toEqual({ state: 'red', speak: true });
    expect(trapDecision([...rows, held('g5', true, 5), held('g6', true, 6)], opts).state).toBe('test');
  });
});

describe('medianBookDepth', () => {
  it('reads the middle ply, null with no record', () => {
    expect(medianBookDepth([])).toBeNull();
    expect(medianBookDepth([4, 12, 8])).toBe(8);
    expect(medianBookDepth([4, 10])).toBe(7);
  });
});

describe('the trap record round-trips through the evidence store', () => {
  const FEN = 'r1bqkb1r/pppp1ppp/2n2n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R b KQkq - 0 5';
  beforeEach(async () => { await db.delete(); await db.open(); resetTrapRecord(); });

  it('meetings recorded in two games bring the test; an unaided avoid makes it green', async () => {
    await warmTrapRecord();
    expect(trapSpeaks(FEN, 10).speak).toBe(true);
    noteTrapMeeting({ fen: FEN, playedSan: 'Bb4', slipSan: 'Nxd4', warned: true, confirmed: true, gameId: 'g1' });
    noteTrapMeeting({ fen: FEN, playedSan: 'Bb4', slipSan: 'Nxd4', warned: true, confirmed: true, gameId: 'g2' });
    expect(trapSpeaks(FEN, 10)).toEqual({ state: 'test', speak: false });
    expect(noteTrapMeeting({ fen: FEN, playedSan: 'Bb4', slipSan: 'Nxd4', warned: false, confirmed: true, gameId: 'g3' })).toBe('held');
    expect(trapSpeaks(FEN, 10).state).toBe('green');
    // …and the rows reached the store the heat map reads.
    await new Promise((r) => setTimeout(r, 20));
    resetTrapRecord();
    await warmTrapRecord();
    expect(trapSpeaks(FEN, 10).state).toBe('green');
    const rows = await db.capabilityEvidence.where('tag').equals('missed-opponents-threat').toArray();
    expect(rows).toHaveLength(3);
    expect(rows.filter((r) => r.prompted)).toHaveLength(2);
  });

  it('playing the slip records a break', () => {
    expect(noteTrapMeeting({ fen: FEN, playedSan: 'Nxd4', slipSan: 'Nxd4', warned: true, confirmed: true, gameId: 'g1' })).toBe('broken');
  });
});
