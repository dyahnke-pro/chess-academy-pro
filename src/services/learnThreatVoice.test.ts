import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { learnThreatVoice, recordThreatAnswersAtMove } from './learnBoardTeaching';
import { EMPTY_STUDENT_RECORD, studentRecordFrom } from './studentRecord';
import type { CapabilityEvidenceRecord } from './capabilityEvidence';

// Learn's ONE threat-voice decider (OS-4) — replaces `seenOneMoveAttack`.
// Same real positions its test used, read through the student's record.

const before = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
/** 3…Na5 hits the bishop on c4 directly; nothing guards it. */
const NA5 = { fenBefore: before(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']), opponentSan: 'Na5' };
/** 3.Nc3 hits the queen on d5 (the Scandinavian). */
const NC3 = { fenBefore: before(['e4', 'd5', 'exd5', 'Qxd5']), opponentSan: 'Nc3' };
/** 2…Qh4+ — a check. */
const QH4 = { fenBefore: before(['e4', 'e5', 'f3']), opponentSan: 'Qh4+' };

/** A record of `held` answers and `missed` misses, one per game. */
const record = (held: number, missed: number): ReturnType<typeof studentRecordFrom> => {
  const rows = Array.from({ length: held + missed }, (_, i): CapabilityEvidenceRecord => ({
    id: `r${i}`, tag: 'missed-opponents-threat', outcome: i < missed ? 'broken' : 'held',
    fen: `8/8/8/8/8/8/8/K6k w - - 0 ${i + 1}`, playedSan: 'Kb1', posedImportance: 90,
    recordedAt: i, origin: 'review', prompted: false, sourceGameId: `g${i}`,
  }));
  return studentRecordFrom([], rows, [], Date.now());
};
/** Held 19 of the last 20 — green. */
const GREEN = record(19, 1);
/** Answered right once since the last miss — NOT proven (grey). The old
 *  decider went quiet here; David's rule says only green goes quiet. */
const ANSWERED_ONCE = record(1, 1);

describe('learnThreatVoice', () => {
  it('green + the piece that just moved hitting a loose piece: silent — no voice, no arrow (David 2026-10-20)', () => {
    const v = learnThreatVoice({ kind: 'hanging', square: 'c4' }, NA5, GREEN);
    expect(v).toMatchObject({ voice: 'quiet', skill: 'missed-opponents-threat' });
    expect(v).not.toHaveProperty('mark');
  });
  it('the queen hit by the knight that just moved goes quiet for a proven student too', () => {
    expect(learnThreatVoice({ kind: 'cheaper-hit', hit: { sq: 'd5', bySq: 'c3' } }, NC3, GREEN)).toMatchObject({ voice: 'quiet' });
  });
  it('an empty record (grey) hears it in full', () => {
    expect(learnThreatVoice({ kind: 'hanging', square: 'c4' }, NA5, EMPTY_STUDENT_RECORD).voice).toBe('full');
  });
  it('answered right once but not proven still hears it in full (the old decider went quiet)', () => {
    expect(learnThreatVoice({ kind: 'hanging', square: 'c4' }, NA5, ANSWERED_ONCE).voice).toBe('full');
  });
  it('a check is never simple: a proven student hears it short, not silence', () => {
    expect(learnThreatVoice({ kind: 'cheaper-hit', hit: { sq: 'e1', bySq: 'h4' } }, QH4, GREEN)).toMatchObject({ voice: 'short', visibility: { rule: 'check' } });
  });
  it('a threat that lands later (no attacker on the board yet) speaks short when green', () => {
    expect(learnThreatVoice({ kind: 'soon', threat: { type: 'fork', description: '' } }, NA5, GREEN).voice).toBe('short');
  });
});

describe('recordThreatAnswersAtMove', () => {
  it('never throws, whatever the board', () => {
    expect(() => recordThreatAnswersAtMove({ fen: 'not a fen', prevFen: null, playedSan: 'e4', said: null, gameId: null })).not.toThrow();
  });
});
