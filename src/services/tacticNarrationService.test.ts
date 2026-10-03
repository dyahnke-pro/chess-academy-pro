import { describe, it, expect } from 'vitest';
import {
  describeMove,
  drillIntro,
  drillTransition,
  drillCorrect,
  drillIncorrect,
  setupIntro,
  setupPrepPlanted,
  setupRevealComplete,
  setupIncorrect,
  setupHintIdea,
  setupHintPiece,
  createIntro,
  createReplayNarration,
  createTransition,
  createCorrect,
  createIncorrect,
  createDepthIncrease,
} from './tacticNarrationService';
import type { TacticType } from '../types';

const TYPES: TacticType[] = [
  'fork', 'pin', 'skewer', 'discovered_attack', 'back_rank', 'hanging_piece',
  'promotion', 'deflection', 'overloaded_piece', 'trapped_piece', 'clearance',
  'interference', 'zwischenzug', 'x_ray', 'double_check', 'removing_the_guard',
  'checkmate', 'tactical_sequence',
];

/** ONE PERSPECTIVE (CLAUDE.md): student = you, never we / us / our / let's. */
const BANNED = /\b(we|we're|we've|we'll|us|our|ours|ourselves|let's|let us)\b/i;

function everyLine(): string[] {
  const out: string[] = [];
  for (const t of TYPES) {
    for (const k of [0, 1, 2, 3, 4]) {
      out.push(setupIntro(t, 1, k), setupIntro(t, 3, k), drillTransition(t, k), drillCorrect(t, k), createTransition(k));
    }
    out.push(
      drillIntro(t, 'Magnus', 'Sicilian Defense'), drillIntro(t, null, null), drillIncorrect(t),
      setupPrepPlanted(t), setupRevealComplete(t), setupIncorrect(),
      setupHintIdea(t, true), setupHintIdea(t, false),
      setupHintPiece(t, 'bishop', true), setupHintPiece(t, null, false),
      createIntro('Magnus', 'Sicilian Defense', 15, 25), createIntro(null, null, 5, 5),
      createCorrect(t, 0), createCorrect(t, 3), createCorrect(t, 6), createIncorrect(t),
      createDepthIncrease(10), createDepthIncrease(30),
    );
  }
  out.push(describeMove('Nxf7+', true), createReplayNarration('O-O', false, 0, 4) ?? '');
  return out;
}

describe('tacticNarrationService — perspective', () => {
  it('no line speaks in the first-person plural (we / us / our / let\'s)', () => {
    const offenders = everyLine().filter((l) => BANNED.test(l));
    expect(offenders).toEqual([]);
  });

  it('the replay intro and the create miss line address the student directly', () => {
    expect(createIntro('Magnus', null, 5, 5)).toBe('Replay your game against Magnus.');
    expect(createIncorrect('fork')).toContain('you are training');
  });
});

describe('setupIntro — rotated, never identical back to back', () => {
  it('consecutive puzzles of the SAME theme draw different stems (say-once would mute a repeat)', () => {
    for (const t of TYPES) {
      for (const d of [1, 2, 3]) {
        for (let k = 0; k < 8; k += 1) {
          expect(setupIntro(t, d, k + 1)).not.toBe(setupIntro(t, d, k));
        }
      }
    }
  });

  it('is deterministic on the key (resume-safe)', () => {
    expect(setupIntro('pin', 2, 5)).toBe(setupIntro('pin', 2, 5));
  });
});

describe('setup hint ladder text', () => {
  it('tier 1 names the motif and never a square, a piece name or a move', () => {
    for (const t of TYPES) {
      for (const first of [true, false]) {
        const text = setupHintIdea(t, first);
        expect(text).not.toMatch(/\b[a-h][1-8]\b/);
        expect(text).not.toMatch(/\byour (knight|bishop|rook|queen|king|pawn)\b/i);
      }
    }
    expect(setupHintIdea('fork', true).toLowerCase()).toContain('fork');
    expect(setupHintIdea('fork', true).toLowerCase()).toContain('quiet');
  });

  it('tier 2 names the piece and never a destination square', () => {
    const text = setupHintPiece('pin', 'bishop', true);
    expect(text).toContain('Your bishop');
    expect(text.toLowerCase()).toContain('pin');
    expect(text).not.toMatch(/\b[a-h][1-8]\b/);
    expect(setupHintPiece('pin', null, false)).toContain('highlighted piece');
  });
});
