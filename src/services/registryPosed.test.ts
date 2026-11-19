// BOTH WAYS (David 2026-11-19: "Make sure all computers work both ways").
// Each registry read that TEACHES a danger or a chance on the board the
// student moves on also POSES that skill to the record: the move answers it
// (held), or misses it (broken), and the hold rate reads the tag — green after
// holds, red after misses. Real boards from each detector's own tests.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { positionPosed, registryPosedFacts } from './moveInsight';
import { capabilityOutcomes, type CapabilityEvidenceRecord } from './capabilityEvidence';
import { studentRecordFrom } from './studentRecord';
import { HOLD_MIN_POSED } from './holdRate';
import type { MisconceptionTagId } from '../data/misconceptionTags';

interface Case {
  computer: string;
  tag: MisconceptionTagId;
  fen: string;
  /** A clean move on that board (the question held). */
  held: string;
  /** The move that misses it (filed under the skill it was about). */
  missed: string;
}

const CASES: Case[] = [
  // Their queen went to h4: a knight fork on c7 two moves out for White.
  { computer: 'detectLatentFork', tag: 'missed-your-fork', fen: 'r1b1kb1r/pp2pppp/2np1n2/8/3NP2q/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 7', held: 'Ndb5', missed: 'h3' },
  // Rook e8 behind the knight e5: move the knight and the bishop on e3 is pinned.
  { computer: 'detectLatentDanger', tag: 'missed-their-pin', fen: '4r1k1/8/8/4N3/8/4B3/8/4K3 w - - 0 1', held: 'Kd2', missed: 'Nc6' },
  // Bxe5 lines the bishop up in front of the king on the e-file.
  { computer: 'detectTradeCreatesPin', tag: 'bad-trade', fen: '4r1k1/8/8/4n3/3B4/8/8/4K3 w - - 0 1', held: 'Kd2', missed: 'Bxe5' },
  // King in the centre, a rook on e8 and the e-file about to open.
  { computer: 'detectCentralKingDanger', tag: 'king-stuck-center', fen: '4r1k1/8/8/3p4/4P3/8/8/4K2R w K - 0 12', held: 'O-O', missed: 'Rh2' },
  // Kg1 with only h2 left in front of it, their rook and queen bearing in.
  { computer: 'detectKingExposure', tag: 'weakened-king-safety', fen: '5rk1/8/8/8/7q/8/7P/5RK1 w - - 0 1', held: 'Kg2', missed: 'Rf2' },
  // Qxb7 is met by Nc5 and the queen has no square.
  { computer: 'findQueenGrabTraps', tag: 'poisoned-pawn', fen: 'r2q1r1k/pppnn1p1/3p3p/1P1Qp3/8/P1N2N1P/5PP1/R1B1R1K1 w - - 1 17', held: 'Qb3', missed: 'Qxb7' },
];

const side = (fen: string): 'white' | 'black' => (fen.split(' ')[1] === 'w' ? 'white' : 'black');

function row(c: Case, outcome: 'held' | 'broken', i: number): CapabilityEvidenceRecord {
  return { id: `${c.tag}:${outcome}:${i}`, tag: c.tag, outcome, fen: c.fen, playedSan: outcome === 'held' ? c.held : c.missed, posedImportance: 70,
    recordedAt: 1_700_000_000_000 + i * 60_000, origin: 'game', prompted: false, sourceGameId: `g${i}` };
}

describe('the registry reads pose their skill to the record (both ways)', () => {
  it.each(CASES)('$computer teaches the board and carries its skill ($tag)', (c) => {
    const f = registryPosedFacts(c.fen, c.fen.split(' ')[1] as 'w' | 'b').find((x) => x.computer === c.computer);
    expect(f, c.computer).toBeDefined();
    expect(f!.skill).toBe(c.tag);
  });

  it.each(CASES)('$computer: the board posed $tag — held on a clean move, broken on the miss', (c) => {
    // The moves are legal on the board (the test's own check).
    for (const san of [c.held, c.missed]) expect(new Chess(c.fen).move(san), san).toBeTruthy();
    const alsoPosed = positionPosed(c.fen, {});
    expect(alsoPosed.map((p) => p.tag)).toContain(c.tag);
    const held = capabilityOutcomes({ fenBefore: c.fen, playedSan: c.held, moverColor: side(c.fen), cpLoss: 0, alsoPosed });
    expect(held.find((r) => r.tag === c.tag)?.outcome).toBe('held');
    const missed = capabilityOutcomes({ fenBefore: c.fen, playedSan: c.missed, moverColor: side(c.fen), cpLoss: 300, alsoPosed, slipTag: c.tag });
    expect(missed.find((r) => r.tag === c.tag)?.outcome).toBe('broken');
  });

  it.each(CASES)('$computer: the hold rate reads $tag — green after holds, red after misses', (c) => {
    const n = HOLD_MIN_POSED + 2;
    const green = studentRecordFrom([], Array.from({ length: n }, (_, i) => row(c, 'held', i)), [], 1_800_000_000_000);
    expect(green.heat.get(c.tag)?.state).toBe('green');
    const red = studentRecordFrom([], Array.from({ length: n }, (_, i) => row(c, i < 2 ? 'held' : 'broken', i)), [], 1_800_000_000_000);
    expect(red.heat.get(c.tag)?.state).toBe('red');
  });

  it('a quiet opening board poses none of them', () => {
    expect(registryPosedFacts(new Chess().fen(), 'w')).toEqual([]);
  });
});
