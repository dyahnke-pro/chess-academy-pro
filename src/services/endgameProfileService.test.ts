import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db/schema';
import { classifyEndgameType, endgameTypeInfo, endgameTablebaseReady, getEndgameWeaknessProfile } from './endgameProfileService';
import type { MistakePuzzle } from '../types';

function emp(over: Partial<MistakePuzzle>): MistakePuzzle {
  return {
    id: Math.random().toString(36).slice(2), fen: '8/8/8/4k3/8/8/4P3/4K3 w - - 0 1',
    playerMove: 'e1e2', playerMoveSan: 'Ke2', bestMove: 'e1d2', bestMoveSan: 'Kd2', moves: '',
    cpLoss: 300, classification: 'blunder', gamePhase: 'endgame', moveNumber: 40, sourceGameId: 'g',
    sourceMode: 'analysis', playerColor: 'white', promptText: '', narration: {} as never,
    createdAt: '2026-01-01T00:00:00Z', opponentName: null, gameDate: '2026-01-01', openingName: null,
    evalBefore: 0, srsInterval: 0, srsEaseFactor: 2.5, srsRepetitions: 0, srsDueDate: '2026-01-01',
    srsLastReview: null, status: 'unsolved', attempts: 0, successes: 0, ...over,
  } as MistakePuzzle;
}

describe('classifyEndgameType (endgame-weakness tie-in)', () => {
  it.each([
    ['8/8/8/4k3/8/8/4P3/4K3 w - - 0 1', 'king-pawn'],       // K+P vs K
    ['8/8/8/4k3/8/8/r7/2R1K3 w - - 0 1', 'rook'],           // R vs R, no pawns
    ['8/5p2/8/4k3/8/8/r4P2/2R1K3 w - - 0 1', 'rook-pawn'],  // rooks + pawns
    ['8/8/8/4k3/8/5N2/8/4K1b1 w - - 0 1', 'minor-piece'],   // knight vs bishop
    ['8/8/8/4k3/8/8/3Q4/4K3 w - - 0 1', 'queen'],           // Q vs K
  ])('classifies %s → %s', (fen, type) => {
    expect(classifyEndgameType(fen)).toBe(type);
  });

  it('maps each type to a label, concept, and (mostly) a lesson', () => {
    const info = endgameTypeInfo('rook-pawn');
    expect(info.label).toMatch(/rook/i);
    expect(info.lessonId).toBe('lucena-position');
    expect(info.conceptQuery.length).toBeGreaterThan(0);
  });

  it('flags tablebase readiness by piece count', () => {
    expect(endgameTablebaseReady('8/8/8/4k3/8/8/4P3/4K3 w - - 0 1')).toBe(true);
    expect(endgameTablebaseReady('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe(false);
  });
});

describe('getEndgameWeaknessProfile (loop tie-in)', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it('names the weakest ending TYPE and seeds a custom drill from the own position', async () => {
    await db.mistakePuzzles.bulkAdd([
      // 3 rook-and-pawn slips (the weakest), one tablebase-ready for a custom drill.
      emp({ fen: '8/5p2/8/4k3/8/8/r4P2/2R1K3 w - - 0 1', cpLoss: 400 }),
      emp({ fen: '8/5p2/8/4k3/8/8/r4P2/2R1K3 w - - 0 1', cpLoss: 250 }),
      emp({ fen: '8/5p2/8/4k3/8/8/r4P2/2R1K3 w - - 0 1', cpLoss: 200 }),
      // 1 king-and-pawn slip.
      emp({ fen: '8/8/8/4k3/8/8/4P3/4K3 w - - 0 1', cpLoss: 150 }),
    ]);
    const p = await getEndgameWeaknessProfile();
    expect(p.sample).toBe(4);
    expect(p.weakest).not.toBeNull();
    expect(p.weakest!.type).toBe('rook-pawn');
    expect(p.weakest!.lessonId).toBe('lucena-position');
    expect(p.weakest!.ownFen).toBeTruthy(); // ≤7 pieces → custom drill seed
  });

  it('is empty with no endgame mistakes', async () => {
    await db.mistakePuzzles.bulkAdd([emp({ gamePhase: 'middlegame' })]);
    const p = await getEndgameWeaknessProfile();
    expect(p.weakest).toBeNull();
    expect(p.sample).toBe(0);
  });
});
