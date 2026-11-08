// THE TEMPTING MOVE REFUTED, HEARD IN REVIEW'S OWN WALK (R1, 2026-11-08). The
// record's candidate reads (`MoveAnnotation.weighed`) reach the facets
// (`weighedMoves.test`); this walks the whole game through Review's segment
// builder — the door, the floor, the say-once ledgers — and reads the line
// for his 7…Ng4 (8urm2D1HhX8) off the narration the student hears.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { buildReviewSegmentsForTests, type ReviewMoveInput } from './coachFeatureService';
import type { StoredWeighReads } from '../types';

interface Fixture { video: string; fenBefore: string; played: string; reads: StoredWeighReads['reads'] }
const G = (JSON.parse(readFileSync('src/test/fixtures/danya-weighed-reads.json', 'utf8')) as Fixture[]).find((x) => x.video === '8urm2D1HhX8')!;
const LINE = ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6', 'd3', 'Bc5', 'Be3', 'Bxe3', 'fxe3', 'Ng4'];

function walk(weighed: StoredWeighReads | undefined, student: 'white' | 'black'): string {
  const board = new Chess();
  const inputs: ReviewMoveInput[] = LINE.map((san, i) => {
    board.move(san);
    const last = i === LINE.length - 1;
    return {
      ply: i + 1, san, isCoachMove: false, classification: i < 6 ? 'book' : 'good',
      evaluation: last ? 78 : 30, preMoveEval: last ? 70 : 30, bestMove: null, fenAfter: board.fen(),
      ...(last && weighed ? { weighed } : {}),
    };
  });
  // Production Review is uncapped (`isReviewUncapped` is true unless ?uncapped=0).
  const segs = buildReviewSegmentsForTests(inputs, student, null, true, 1500);
  return segs.find((s) => s.ply === LINE.length)?.narration ?? '';
}

describe('Review says the tempting move refuted off the record\'s reads', () => {
  it('on the student\'s own move — and never without the reads', () => {
    expect(new Chess(G.fenBefore).fen().split(' ')[1]).toBe('b');
    const said = walk({ depth: 16, reads: G.reads }, 'black');
    expect(said).toMatch(/Nxe4 is tempting here, but it fails: they play dxe4/);
    expect(walk(undefined, 'black')).not.toMatch(/tempting/);
  });

  it('on their move, from the student\'s seat', () => {
    expect(walk({ depth: 16, reads: G.reads }, 'white')).toMatch(/Nxe4 was tempting for them, but it fails: you play dxe4/);
  });
});
