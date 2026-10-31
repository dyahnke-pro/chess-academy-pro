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

// Same tape, after the batch shipped: "It is a quiet opening: 9 moves of
// master theory…" on move three, then "…: 8 moves of master theory…" a move
// later — the identity keyed by the opening's NAME, said again for every
// refinement of it. It is one claim a game.
describe('what the opening is, said once a game', () => {
  it('a refined name does not say the identity again', { timeout: 120_000 }, async () => {
    const { readFileSync } = await import('node:fs');
    const { setOpeningPositions } = await import('./openingPositions');
    const { setOpeningIdentity } = await import('./openingIdentity');
    setOpeningPositions(JSON.parse(readFileSync('public/data/opening-positions.json', 'utf8')) as Record<string, [string, number]>);
    setOpeningIdentity(JSON.parse(readFileSync('public/data/opening-identity.json', 'utf8')));
    const segs = buildReviewSegmentsForTests(inputs(), 'white', null, true, 1200, [], coldStudent(1200), 'g');
    const quiet = segs.filter((s) => /quiet opening|sharp and theory-heavy/.test(s.narration ?? '')).map((s) => s.ply);
    expect(quiet.length).toBeLessThanOrEqual(1);
  });
});

// v5 re-run (2026-10-29): "Wins their pawn on a2, and nothing can take back."
// four times in one review (chesscom-143368469378: Rxd6, Rxa2, Rxb3, Rxh5) —
// one template, a new square. A job said many times a game rotates its words
// on how often that kind has been said this walk.
describe('a free capture said three times is not one template three times', () => {
  it('Bxb5, Bxg5, exf5 — three wordings, each with its reason', { timeout: 120_000 }, () => {
    const c = new Chess();
    const game = 'e4 b5 Bxb5 g5 d4 a5 Bxg5 f5 exf5 a4'.split(' ').map((san, i) => {
      c.move(san);
      return { ply: i + 1, san, fenAfter: c.fen(), isCoachMove: i % 2 === 1, classification: 'good', preMoveEval: 30, evaluation: 30, bestMove: null } as ReviewMoveInput;
    });
    const segs = buildReviewSegmentsForTests(game, 'white', null, true, 1200, [], coldStudent(1200), 'g');
    const job = (ply: number): string => (segs.find((s) => s.ply === ply)?.narration ?? '').match(/[^.]*nothing can take back\./)?.[0] ?? '';
    const said = [3, 7, 9].map(job);
    // Each says what the capture nets, never the capture again (David
    // 2026-10-30: "queen takes d8, takes the queen").
    for (const s of said) expect(s).toMatch(/\ba (?:free )?pawn\b/);
    expect(new Set(said.map((s) => s.replace(/[a-h][1-8]/g, 'SQ').trim())).size).toBe(3);
  });
});

// v6 re-run (2026-10-29, chesscom-143368469378, the student Black): their
// c-pawn walked c4 → c7 and Review said, at each step, "The plan changes here
// — now it's to win their weak pawn on c5 … c6 … c7" (and h4 → h5 before it).
// One pawn is one plan: a pawn plan is keyed by its file.
describe('a pawn walking its file is one plan, not a new one each step', () => {
  it('his game: the weak-pawn plan is announced at most once per pawn', { timeout: 240_000 }, () => {
    const SANS = 'd4 Nf6 g3 d6 Bg2 g6 Bg5 h6 Bxf6 exf6 Nf3 Bg7 h3 O-O O-O f5 Nc3 Re8 Nd5 c6 Nb4 a5 Nd3 Be6 Nf4 Bc4 b3 Ba6 c4 c5 Rb1 g5 Nh5 Bh8 dxc5 g4 Qxd6 Qxd6 cxd6 gxf3 Bxf3 Nd7 Nf4 Ne5 Bd5 Rad8 Rbd1 Rxd6 Bxf7+ Nxf7 Rxd6 Nxd6 e3 Ne4 Nd5 Nd2 Rd1 Nf3+ Kg2 Ng5 h4 Ne4 f3 Nf6 Nxf6+ Bxf6 Rd6 Rxe3 Rxf6 Re2+ Kh3 b6 Rxb6 Bc8 Rb8 Re8 Rb6 f4+ g4 h5 Rb5 hxg4+ fxg4 Re3+ Kg2 f3+ Kf2 Rc3 Rxa5 Bxg4 Rg5+ Kf7 Rxg4 Rc2+ Kxf3 Rxa2 h5 Ra3 Ke4 Rxb3 Kd4 Rh3 c5 Rxh5 c6 Rh8 Re4 Rc8 Kd5 Rd8+ Kc5 Rc8 Kb6 Kf6 c7 Kf5'.split(' ');
    const c = new Chess();
    const game = SANS.map((san, i) => {
      c.move(san);
      return { ply: i + 1, san, fenAfter: c.fen(), isCoachMove: i % 2 === 0, classification: 'good', preMoveEval: 0, evaluation: 0, bestMove: null } as ReviewMoveInput;
    });
    const segs = buildReviewSegmentsForTests(game, 'black', null, true, 1200, [], coldStudent(1200), 'g');
    const said = segs.map((s) => s.narration ?? '').join(' ');
    const weakPawnAnnouncements = said.match(/(?:plan changes here — now it's|The new plan is) to win their weak pawn on c[4-7]/g) ?? [];
    expect(weakPawnAnnouncements.length).toBeLessThanOrEqual(1);
    expect(said).not.toMatch(/so it is no longer the weak pawn you were besieging/);
  });
});
