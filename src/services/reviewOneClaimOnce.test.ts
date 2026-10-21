import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewSegmentsForTests, type ReviewMoveInput } from './coachFeatureService';
import { coldStudent } from './needScore';
import type { ReviewIntent } from './reviewMoveIntent';

// Review tape 2026-10-21 (Firouzja–Carlsen, King's Indian, the student White):
// on 8.Bd3 the coach said "Brings your bishop out and clears the way to castle
// next move. Your bishop to d3 clears the way to castle." — the board's job
// line and the engine's reason, one claim twice.
const SANS = ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'h3', 'c5', 'd5', 'e6', 'Bd3', 'Nbd7', 'O-O'];

function inputs(): ReviewMoveInput[] {
  const c = new Chess();
  return SANS.map((san, i) => {
    c.move(san);
    return { ply: i + 1, san, fenAfter: c.fen(), isCoachMove: i % 2 === 1, classification: 'good', preMoveEval: 30, evaluation: 30, bestMove: null } as ReviewMoveInput;
  });
}

describe('one claim, one producer: castling prepared is said once', () => {
  it('8.Bd3 — the engine reason says it; the job line steps aside', { timeout: 60_000 }, () => {
    const intents = new Map<number, ReviewIntent>([[15, { text: 'Your bishop to d3 clears the way to castle.', squares: ['d3'], prepsCastle: true }]]);
    const segs = buildReviewSegmentsForTests(inputs(), 'white', null, true, 1200, [], coldStudent(1200), 'g', new Map(), intents);
    const said = segs.find((s) => s.ply === 15)?.narration ?? '';
    expect(said).toMatch(/clears the way to castle/);
    expect(said.match(/castle/g) ?? []).toHaveLength(1);
  });
});

// Same tape: "Turn the board around and it is the King's Indian Attack:
// Sicilian Variation …" on move two, then "This is the King's Indian Attack:
// French Variation with the colours reversed …" on move three — one board,
// seen two ways a move apart. The claim was keyed on the NAME.
describe('the opening this board is, said once a game', () => {
  it('a second, different name for the same reversed opening is not said', { timeout: 60_000 }, async () => {
    const { readFileSync } = await import('node:fs');
    const { setOpeningPositions } = await import('./openingPositions');
    setOpeningPositions(JSON.parse(readFileSync('public/data/opening-positions.json', 'utf8')) as Record<string, [string, number]>);
    const segs = buildReviewSegmentsForTests(inputs(), 'white', null, true, 1200, [], coldStudent(1200), 'g');
    const named = segs.filter((s) => /King's Indian Attack/.test(s.narration ?? '')).map((s) => s.ply);
    expect(named).toHaveLength(1);
  });
});

// Same tape, 20.Bd2: "Your bishop to d2 steps out of the pawn's reach, keeping
// the bishop rather than letting the pawn win it. Takes your bishop out of
// reach of their pawn on f4." — the rule the move kept and the move's job, one
// rescue said twice.
describe('a piece taken out of an attack is said once', () => {
  it('20.Bd2 — the rule says it with its reason; the bare job steps aside', { timeout: 120_000 }, () => {
    const moves = '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O 6. h3 c5 7. d5 e6 8. Bd3 Nbd7 9. O-O e5 10. Be3 Nh5 11. a3 Nf4 12. b4 b6 13. Rb1 Nxd3 14. Qxd3 a6 15. Rfe1 h6 16. Qd2 Kh7 17. Na4 f5 18. bxc5 bxc5 19. Qc2 f4 20. Bd2'
      .replace(/\d+\./g, '').trim().split(/\s+/);
    const c = new Chess();
    const game = moves.map((san, i) => {
      c.move(san);
      return { ply: i + 1, san, fenAfter: c.fen(), isCoachMove: i % 2 === 1, classification: 'good', preMoveEval: 30, evaluation: 30, bestMove: null } as ReviewMoveInput;
    });
    const segs = buildReviewSegmentsForTests(game, 'white', null, true, 1200, [], coldStudent(1200), 'g');
    const said = segs.find((s) => s.ply === 39)?.narration ?? '';
    expect(said).toMatch(/out of (?:the pawn's )?reach/);
    expect(said.match(/out of (?:the pawn's )?reach/g) ?? []).toHaveLength(1);
  });
});

// The same class on 14 real games (probe 2026-10-21): a job line and a rule
// line on one move, saying one claim. The rule keeps it — with its subject and
// its reason — only when it names the same square.
describe('a job a rule already states is not said again', () => {
  const walk = (line: string): Map<number, string> => {
    const c = new Chess();
    const game = line.split(' ').map((san, i) => {
      c.move(san);
      return { ply: i + 1, san, fenAfter: c.fen(), isCoachMove: i % 2 === 1, classification: 'good', preMoveEval: 30, evaluation: 30, bestMove: null } as ReviewMoveInput;
    });
    const segs = buildReviewSegmentsForTests(game, 'white', null, true, 1200, [], coldStudent(1200), 'g');
    return new Map(segs.map((s) => [s.ply, s.narration ?? '']));
  };
  it('Ruy Lopez: Nf3 on e5, Ba4 out of the pawn\'s reach, Re1 behind the e4 pawn — each once', { timeout: 120_000 }, () => {
    const said = walk('e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1');
    expect(said.get(3)).toMatch(/e5, attacking the pawn there/);
    expect(said.get(3)).not.toMatch(/Attacks their pawn on e5/);
    expect(said.get(7)).toMatch(/steps out of the pawn's reach/);
    expect(said.get(7)).not.toMatch(/out of reach of their pawn on a6/);
    expect(said.get(11)).toMatch(/behind your e4 pawn — it guards it now/);
    expect(said.get(11)).not.toMatch(/guard to your pawn on e4/);
  });
  it('Italian: c3 prepares d4 once', { timeout: 120_000 }, () => {
    const said = walk('e4 e5 Nf3 Nc6 Bc4 Bc5 c3');
    expect(said.get(7)).toMatch(/prepares d4/i);
    expect(said.get(7)?.match(/prepares d4/gi) ?? []).toHaveLength(1);
  });
});
