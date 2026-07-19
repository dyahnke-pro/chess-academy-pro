import { describe, it, expect } from 'vitest';
import { buildPrincipleQuiz, quizVerdictLine, type PrincipleQuizEngine } from './principleQuiz';
import type { StockfishAnalysis } from '../types';

// Position: after 1.e4 e5 2.Nf3, Black to move. Best is Nc6 (develop);
// the student played f6 (weakening) — the classic neglected-development /
// weakened-shelter shape.
const FEN = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 1 2';

function analysis(partial: Partial<StockfishAnalysis>): StockfishAnalysis {
  return {
    bestMove: 'b8c6',
    evaluation: -30, // White-POV: Black slightly worse is fine here
    isMate: false,
    mateIn: null,
    depth: 12,
    topLines: [
      { rank: 1, evaluation: -30, moves: ['b8c6'], mate: null },
      { rank: 2, evaluation: 150, moves: ['f7f6'], mate: null }, // f6 is bad for Black
    ],
    nodesPerSecond: 0,
    ...partial,
  };
}

const cannedEngine = (root: StockfishAnalysis): PrincipleQuizEngine => ({
  analyzePosition: async (fen: string) => {
    if (fen === FEN) return root;
    throw new Error('unexpected probe: ' + fen);
  },
});

describe('principleQuiz — the device application quiz (Phase 3.3)', () => {
  it('builds a quiz: best complies, the played slip clearly fails', async () => {
    const quiz = await buildPrincipleQuiz({
      tag: 'neglected-development',
      fen: FEN,
      playedSan: 'f6',
      engine: cannedEngine(analysis({})),
    });
    expect(quiz).not.toBeNull();
    expect(quiz!.correctSan).toBe('Nc6');
    const played = quiz!.candidates.find((c) => c.san === 'f6')!;
    expect(played.complies).toBe(false);
    // Mover-POV (Black): best -(-30)=30, f6 -(150)=-150 → delta 180.
    expect(played.deltaCp).toBe(180);
    const best = quiz!.candidates.find((c) => c.san === 'Nc6')!;
    expect(best.complies).toBe(true);
    // Deterministic order (locale sort by SAN): f6 before Nc6.
    expect(quiz!.candidates.map((c) => c.san)).toEqual(['f6', 'Nc6']);
  });

  it('returns null when the tag has no device (`other`)', async () => {
    const quiz = await buildPrincipleQuiz({
      tag: 'other',
      fen: FEN,
      playedSan: 'f6',
      engine: cannedEngine(analysis({})),
    });
    expect(quiz).toBeNull();
  });

  it('returns null when the played move is near-best — no manufactured quiz', async () => {
    const quiz = await buildPrincipleQuiz({
      tag: 'neglected-development',
      fen: FEN,
      playedSan: 'f6',
      engine: cannedEngine(
        analysis({ topLines: [
          { rank: 1, evaluation: -30, moves: ['b8c6'], mate: null },
          { rank: 2, evaluation: -10, moves: ['f7f6'], mate: null }, // near-best
        ] }),
      ),
    });
    expect(quiz).toBeNull();
  });

  it('returns null when the played move IS the best move', async () => {
    const quiz = await buildPrincipleQuiz({
      tag: 'neglected-development',
      fen: FEN,
      playedSan: 'Nc6',
      engine: cannedEngine(analysis({})),
    });
    expect(quiz).toBeNull();
  });

  it('returns null on engine failure, never throws', async () => {
    const quiz = await buildPrincipleQuiz({
      tag: 'neglected-development',
      fen: FEN,
      playedSan: 'f6',
      engine: { analyzePosition: async () => { throw new Error('engine down'); } },
    });
    expect(quiz).toBeNull();
  });

  it('quizVerdictLine states computed numbers for a failing pick', async () => {
    const quiz = (await buildPrincipleQuiz({
      tag: 'neglected-development',
      fen: FEN,
      playedSan: 'f6',
      engine: cannedEngine(analysis({})),
    }))!;
    const wrong = quizVerdictLine(quiz, 'f6');
    expect(wrong).toContain('fails the device');
    expect(wrong).toContain('1.8 pawns');
    expect(wrong).toContain('Nc6');
    const right = quizVerdictLine(quiz, 'Nc6');
    expect(right).toContain('passes the device');
  });
});
