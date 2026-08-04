import { describe, it, expect } from 'vitest';
import { generateMistakeNarration, type NarrationParams } from './mistakeNarration';
import type { MistakeClassification, MistakeGamePhase } from '../types';

function buildParams(overrides?: Partial<NarrationParams>): NarrationParams {
  return {
    classification: 'mistake',
    gamePhase: 'middlegame',
    playerMoveSan: 'Bxh7',
    bestMoveSan: 'Nf3',
    cpLoss: 150,
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    moves: 'd2d4 d7d5 c4b5 c6a5 b5d3',
    opponentName: null,
    gameDate: null,
    openingName: null,
    evalBefore: null,
    ...overrides,
  };
}

describe('generateMistakeNarration', () => {
  const classifications: MistakeClassification[] = ['blunder', 'mistake', 'inaccuracy', 'miss'];
  const phases: MistakeGamePhase[] = ['opening', 'middlegame', 'endgame'];

  it('returns a MistakeNarration with an intro and a move array', () => {
    const result = generateMistakeNarration(buildParams());
    expect(result.intro).toBeTruthy();
    expect(Array.isArray(result.moveNarrations)).toBe(true);
    // `outro` is deliberately NOT asserted truthy — see the block below. It is
    // computed from the move, and an empty one is the correct answer when the
    // move proves nothing worth a closing line.
    expect(typeof result.outro).toBe('string');
  });

  it('intro contains the player move', () => {
    const result = generateMistakeNarration(buildParams({ playerMoveSan: 'h4', bestMoveSan: 'Nf3' }));
    expect(result.intro).toContain('h4');
    // bestMove is intentionally NOT in the intro — it's revealed in moveNarrations
    // so the player can try to find it themselves
  });

  it('intro contains centipawn loss as pawns', () => {
    const result = generateMistakeNarration(buildParams({ cpLoss: 250 }));
    expect(result.intro).toContain('2.5');
  });

  it.each(classifications)('generates narration for classification: %s', (classification) => {
    const result = generateMistakeNarration(buildParams({ classification }));
    expect(result.intro.length).toBeGreaterThan(20);
  });

  it.each(phases)('generates narration for phase: %s', (gamePhase) => {
    const result = generateMistakeNarration(buildParams({ gamePhase }));
    expect(result.intro.length).toBeGreaterThan(20);
  });

  it('generates all combinations of classification x phase', () => {
    for (const classification of classifications) {
      for (const phase of phases) {
        const result = generateMistakeNarration(buildParams({ classification, gamePhase: phase }));
        expect(result.intro).toBeTruthy();
      }
    }
  });

  it('generates per-move narrations matching player move count', () => {
    // Use valid moves from starting FEN: 1. d4 d5 2. Bb5 (3 UCI = 2 player + 1 opponent)
    // Then add more: 3 UCI = 2 player moves, 5 UCI = 3 player moves
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const result = generateMistakeNarration(buildParams({
      fen,
      moves: 'e2e4 e7e5 d2d4 d7d5 g1f3',
    }));
    // 5 UCI moves: player=e4, d4, Nf3 (3), opponent=e5, d5 (2)
    expect(result.moveNarrations.length).toBe(3);
  });

  it('generates per-move narrations for single-move puzzles', () => {
    const result = generateMistakeNarration(buildParams({ moves: 'd2d4' }));
    expect(result.moveNarrations.length).toBe(1);
  });

  it('returns empty moveNarrations for empty moves', () => {
    const result = generateMistakeNarration(buildParams({ moves: '' }));
    expect(result.moveNarrations).toEqual([]);
  });

  it('first move narration contains the SAN of the first move', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const result = generateMistakeNarration(buildParams({ fen, moves: 'e2e4 e7e5 d2d4' }));
    expect(result.moveNarrations[0]).toContain('e4');
  });

  it('blunder intro contains severity language', () => {
    const result = generateMistakeNarration(buildParams({ classification: 'blunder', cpLoss: 400 }));
    // Should contain cp reference with "serious" since >=300
    expect(result.intro).toMatch(/serious|blunder|loses|dropped/i);
  });

  it('miss intro references opponent mistake', () => {
    const result = generateMistakeNarration(buildParams({ classification: 'miss' }));
    expect(result.intro).toMatch(/opponent|punish|capitalize|off the hook/i);
  });

  it('includes opponent name in intro when provided', () => {
    const result = generateMistakeNarration(buildParams({ opponentName: 'Magnus' }));
    expect(result.intro).toContain('vs Magnus');
  });

  it('includes time ago in intro when gameDate provided', () => {
    const today = new Date().toISOString().split('T')[0];
    const result = generateMistakeNarration(buildParams({ opponentName: 'Bot', gameDate: today }));
    expect(result.intro).toContain('today');
  });

  it('includes opening name in intro when provided', () => {
    const result = generateMistakeNarration(buildParams({
      opponentName: 'Bot',
      openingName: 'Sicilian Defense',
    }));
    expect(result.intro).toContain('Sicilian Defense');
  });

  it('includes advantage context when evalBefore provided', () => {
    const result = generateMistakeNarration(buildParams({
      opponentName: 'Bot',
      evalBefore: 2.0,
    }));
    expect(result.intro).toMatch(/strong advantage/i);
  });

  it('indicates equal position when evalBefore is near zero', () => {
    const result = generateMistakeNarration(buildParams({
      opponentName: 'Bot',
      evalBefore: 0.1,
    }));
    expect(result.intro).toMatch(/roughly equal/i);
  });

  it('conceptHint is a string, and never the generic advice pool', () => {
    const result = generateMistakeNarration(buildParams());
    expect(typeof result.conceptHint).toBe('string');
    // An empty hint is CORRECT when nothing computes: both call sites in
    // MistakePuzzleBoard fall back to getCoachingMessage(tacticType, …), which
    // is keyed on the puzzle's real tactic and beats any platitude we could
    // emit here.
    expect(result.conceptHint).not.toMatch(/worst-placed piece|creates the most problems/i);
  });

  it('omits context sentence when no context fields are provided', () => {
    const result = generateMistakeNarration(buildParams({
      opponentName: null,
      gameDate: null,
      openingName: null,
      evalBefore: null,
    }));
    // Should NOT contain "vs" or "playing the" — just the mistake explanation
    expect(result.intro).not.toContain('vs ');
    expect(result.intro).not.toContain('playing the');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// THE VOICE GATE (David 2026-08-04).
//
// Before this, every spoken line on /tactics/mistakes came from four fixed
// template pools slot-filled with the SAN. His device log caught them in the
// wild — "Middlegame positions require checking for checks, captures, and
// threats on every move" on every middlegame puzzle forever, and "That's it!
// king to g5. king to g5 improves your position." naming the move twice around
// a phrase that says nothing about the board.
//
// The pools are deleted and the narration is computed from the position now.
// These assertions exist so they cannot grow back: they encode the locked
// Narration Voice Rules as executable checks rather than prose in CLAUDE.md.
// ─────────────────────────────────────────────────────────────────────────────
describe('narration voice rules', () => {
  /** Every line the student can hear, from one generated narration. */
  function allLines(p: NarrationParams): string[] {
    const n = generateMistakeNarration(p);
    return [n.intro, ...n.moveNarrations, n.outro, n.conceptHint].filter((s) => s.trim().length > 0);
  }

  // A spread of real positions so a rule can't pass by luck on one fixture.
  const POSITIONS: NarrationParams[] = [
    buildParams(),
    buildParams({
      // David's logged Ng5 blunder — the exact puzzle from his screenshot.
      fen: '7r/2k1b3/2nqb1R1/p1pp4/Qp6/5N2/PP1NKP2/8 w - - 3 30',
      playerMoveSan: 'Ng5', bestMoveSan: 'Qb5', moves: 'a4b5',
      cpLoss: 350, classification: 'blunder', gamePhase: 'middlegame', evalBefore: 1.8,
    }),
    buildParams({
      // Bare king-and-knight endgame — the "develops the king" case.
      fen: '8/pp6/1n1N4/4p3/5pk1/2N1b2P/PPR3P1/7K b - - 0 31',
      playerMoveSan: 'Kg3', bestMoveSan: 'Kg5', moves: 'g4g5',
      cpLoss: 350, classification: 'blunder', gamePhase: 'endgame', evalBefore: -0.2,
    }),
  ];

  it('rule #5 — never opens with an acknowledgment', () => {
    // "That's it!", "Correct,", "Nice find!", "Well played,", "Perfect,".
    // The position turning in the student's favour IS the acknowledgment;
    // praise rings hollow by the third puzzle.
    const BANNED = /^(that'?s it|correct|nice find|well played|perfect|great|excellent|good job)\b/i;
    for (const p of POSITIONS) {
      for (const line of allLines(p)) expect(line).not.toMatch(BANNED);
    }
  });

  it('rule #3 — never says the same move twice in one line', () => {
    for (const p of POSITIONS) {
      for (const line of allLines(p)) {
        for (const san of [p.playerMoveSan, p.bestMoveSan]) {
          const hits = line.split(new RegExp(`\\b${san.replace(/[+#]/g, '')}\\b`)).length - 1;
          expect(hits, `"${san}" repeated in: ${line}`).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('rule #6 — no first-person or interface meta', () => {
    const BANNED = /\b(let me|i think|i'?ll show|let'?s find the best move|click|tap|press the)\b/i;
    for (const p of POSITIONS) {
      for (const line of allLines(p)) expect(line).not.toMatch(BANNED);
    }
  });

  it('rule #1 — the deleted filler pools never reappear', () => {
    const POOLS = [
      /Middlegame positions require checking/i,
      /In the middlegame, always scan for tactical shots/i,
      /In the opening, piece development and center control are everything/i,
      /In the endgame, king activity and passed pawns decide/i,
      /Tactical awareness in the middlegame comes from pattern recognition/i,
      /improves your position\.?$/i,
      /These moments are painful/i,
      /Stay hungry for your opponent/i,
    ];
    for (const p of POSITIONS) {
      for (const line of allLines(p)) {
        for (const pool of POOLS) expect(line, `filler resurfaced: ${line}`).not.toMatch(pool);
      }
    }
  });

  it('never speaks a bare piece letter — Polly reads "p" as the letter', () => {
    for (const p of POSITIONS) {
      for (const line of allLines(p)) expect(line).not.toMatch(/\bThe [pnbrqk] on [a-h][1-8]\b/);
    }
  });

  it('M1 — states where you stood even with no opponent metadata', () => {
    // The regression from David's screenshot: the eval clause used to be
    // emitted INSIDE the opponent/date block, so a puzzle carrying a known
    // evalBefore and nothing else silently lost the one sentence that says
    // whether the game was still winnable.
    const result = generateMistakeNarration(buildParams({
      opponentName: null, gameDate: null, openingName: null, evalBefore: 1.8,
    }));
    expect(result.intro).toMatch(/strong advantage/i);
  });

  it('does not leak the solution square before the attempt', () => {
    // The pre-attempt position read describes the shape of the problem. It must
    // never name a square the solution moves through, or the intro hands over
    // the answer (rule #8 — a note during an attempt is a spoiler).
    for (const p of POSITIONS) {
      const n = generateMistakeNarration(p);
      const first = p.moves.trim().split(/\s+/)[0];
      if (!first || first.length < 4) continue;
      const to = first.slice(2, 4);
      // The intro's board-read clauses are everything before the mistake
      // sentence; the mistake sentence itself legitimately names the played
      // move. Assert on the read portion only.
      const read = n.intro.split(/You played|Uh oh|was a serious mistake|wasn'?t the best|Slight slip|Not a bad move|Your opponent slipped|There was a chance/)[0];
      expect(read, `read leaked ${to}: ${read}`).not.toContain(to);
    }
  });
});
