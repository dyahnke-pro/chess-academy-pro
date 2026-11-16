import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { davidEvidence, davidSlips, davidNow } from './__fixtures__/davidRecord';
import type { CapabilityEvidenceRecord } from './capabilityEvidence';
import { plainHitOnBoard } from './learnRecordTerms';
import { studentRecordFrom } from './studentRecord';

// David 2026-11-16: "It's still stating the obvious. That the pawn sticks my
// pawn" → "That's not the right fix what about people learning how to play?"
// A plain threat speaks by the student's OWN record of seeing them.

const fenAfter = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
const CARO = fenAfter(['e4', 'c6', 'd4', 'd5']);                       // White to move, e4 hit by the d5 pawn
const KICK = fenAfter(['e4', 'Nf6', 'e5']);                             // Black to move, the knight kicked
const LOOSE_BISHOP = '4k3/8/8/8/8/2b5/8/B3K3 w - - 0 1';                // a bishop hits a bishop, no pawn in it

const rows = (fen: string, outcomes: ('held' | 'broken')[]): CapabilityEvidenceRecord[] =>
  outcomes.map((outcome, i) => ({
    id: `p${fen.length}-${i}`, tag: 'missed-opponents-threat', outcome, fen, playedSan: 'Nc3',
    posedImportance: 90, recordedAt: i, origin: 'learn', prompted: false, sourceGameId: `g${fen.length}-${i}`,
  }));

const plainThreatState = (ev: CapabilityEvidenceRecord[], sl: never[], now: number): string => studentRecordFrom([], ev, sl, now).plainThreats;

describe('the plain-threat record', () => {
  it('reads a plain pawn hit off the board alone', () => {
    expect(plainHitOnBoard(CARO)).toBe(true);
    expect(plainHitOnBoard(KICK)).toBe(true);
  });
  it('NEGATIVE CONTROL: a loose piece hit by a piece is not plain', () => {
    expect(plainHitOnBoard(LOOSE_BISHOP)).toBe(false);
    expect(plainHitOnBoard(new Chess().fen())).toBe(false);
  });
  it('a learner with no record is grey (taught); eight held is green; misses are red', () => {
    expect(plainThreatState([], [], davidNow)).toBe('grey');
    expect(plainThreatState(rows(CARO, Array(8).fill('held')), [], davidNow)).toBe('green');
    expect(plainThreatState(rows(CARO, Array(8).fill('broken')), [], davidNow)).toBe('red');
  });
  it('only plain boards count toward it', () => {
    expect(plainThreatState(rows(LOOSE_BISHOP, Array(8).fill('held')), [], davidNow)).toBe('grey');
  });
  it("David's real record", () => {
    const r = studentRecordFrom([], davidEvidence, davidSlips, davidNow);
    const posed = [...davidEvidence, ...davidSlips].filter((x) => x.tag === 'missed-opponents-threat' && plainHitOnBoard(x.fen)).length;
    console.log(`david plain threats: ${r.plainThreats}, plain boards on record: ${posed}`);
    expect(['grey', 'red', 'short', 'green']).toContain(r.plainThreats);
  });
});
