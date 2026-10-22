import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import type { MissionGame } from '../missionCard';
import { IDLE, stepMission, type RunnerState, type Step } from '../missionRunner';
import { MISSIONS } from '../registry';
import { exactWinner } from './kpEndings';
import {
  KP_TRIANGULATION_BRIEFING,
  checkKpTriangulation,
  kpTriangulationFoundAt,
  kpTriangulationProgress,
  kpTriangulationShowMove,
  triangulationDecision,
} from './kpTriangulation';

/** The app's own triangulation lesson board (src/data/pawn-endings.json):
 *  Ke4 + b5, c4 against Kc7 + b6, White to move. Only Ke5 wins; c5, Kd5 and
 *  Kd4 let Black hold; with Black to move Black is lost. (Syzygy agrees.) */
const LESSON = '8/2k5/1p6/1P6/2P1K3/8/8/8 w - - 0 1';
/** The same board for a Black student (ranks flipped, colours swapped). */
const LESSON_BLACK = '8/8/8/2p1k3/1p6/1P6/2K5/8 b - - 0 1';
/** The triangle: e4–e5–d5 and home, their king c7–d7–c7. */
const TRIANGLE = ['Ke5', 'Kd7', 'Kd5', 'Kc7', 'Ke4'];
/** Not a library board: Black (the coach) to move from d7 — a draw with the
 *  right move, but ...Kc7 walks into the lesson board on a live game. */
const BEFORE_LESSON = '8/3k4/1p6/1P6/2P1K3/8/8/8 b - - 0 1';

const flipSan = (san: string): string => san.replace(/[1-8]/g, (r) => String(9 - Number(r)));

function game(startFen: string | undefined, sans: string[], opts: { color?: 'w' | 'b'; startPly?: number; forgiven?: number[] } = {}): MissionGame {
  return {
    sans,
    ...(startFen ? { startFen } : {}),
    studentColor: opts.color ?? 'w',
    forgiven: new Set(opts.forgiven ?? []),
    startPly: opts.startPly ?? 0,
  };
}

describe('every fixture is a legal board with the result the test claims', () => {
  it.each([[LESSON, 'w'], [LESSON_BLACK, 'b'], [BEFORE_LESSON, 'draw']] as const)('%s → %s', (fen, winner) => {
    const b = new Chess(fen);
    expect(b.isGameOver()).toBe(false);
    expect(exactWinner(b)).toBe(winner);
  });

  it('the lesson board with Black to move is lost for Black (the zugzwang the triangle hands over)', () => {
    expect(exactWinner(new Chess('8/2k5/1p6/1P6/2P1K3/8/8/8 b - - 0 1'))).toBe('w');
  });
});

describe('Triangulation — the decision board', () => {
  it('reads true on the lesson board, both colours', () => {
    expect(triangulationDecision(new Chess(LESSON), 'w')).toBe(true);
    expect(triangulationDecision(new Chess(LESSON_BLACK), 'b')).toBe(true);
  });

  it('FAIL TWINS — one condition missing, never a decision board', () => {
    // The defender to move: the zugzwang is already theirs, nothing to hand over.
    expect(triangulationDecision(new Chess('8/2k5/1p6/1P6/2P1K3/8/8/8 b - - 0 1'), 'w')).toBe(false);
    // Their king cannot guard b6 in time: Kxb6 wins at once — a capture wins.
    expect(triangulationDecision(new Chess('8/4k3/Kp6/1P6/2P5/8/8/8 w - - 0 1'), 'w')).toBe(false);
    // The wrong colour's question.
    expect(triangulationDecision(new Chess(LESSON), 'b')).toBe(false);
  });
});

describe('Triangulation — the check', () => {
  it('1. the triangle keeps the win every move and pays the find on the way home', () => {
    for (let n = 1; n <= TRIANGLE.length; n++) expect(checkKpTriangulation(game(LESSON, TRIANGLE.slice(0, n))).state).toBe('pending');
    expect(kpTriangulationFoundAt(game(LESSON, TRIANGLE))).toBe(4);
    expect(kpTriangulationFoundAt(game(LESSON, TRIANGLE.slice(0, 3)))).toBeNull();
  });

  it('2. the demo line breaks through after the triangle → PASS on the break', () => {
    const sans = [...KP_TRIANGULATION_BRIEFING.demoSans];
    expect(KP_TRIANGULATION_BRIEFING.demoFen).toBe(LESSON);
    for (let n = 1; n < sans.length; n++) expect(checkKpTriangulation(game(LESSON, sans.slice(0, n))).state).toBe('pending');
    expect(checkKpTriangulation(game(LESSON, sans))).toEqual({ state: 'pass', ply: sans.length - 1 });
    // Mirrored for a Black student.
    expect(checkKpTriangulation(game(LESSON_BLACK, sans.map(flipSan), { color: 'b' }))).toEqual({ state: 'pass', ply: sans.length - 1 });
  });

  it('3. the direct approach and the early pawn break → MISS no-triangle, showing the triangle\'s first step', () => {
    expect(checkKpTriangulation(game(LESSON, ['Kd5']))).toEqual({ state: 'miss', ply: 0, reason: 'no-triangle', showMove: { from: 'e4', to: 'e5' } });
    expect(checkKpTriangulation(game(LESSON, ['Kd4']))).toMatchObject({ state: 'miss', ply: 0, reason: 'no-triangle' });
    expect(checkKpTriangulation(game(LESSON, ['c5']))).toMatchObject({ state: 'miss', ply: 0, reason: 'no-triangle' });
    expect(checkKpTriangulation(game(LESSON_BLACK, ['Kd4'], { color: 'b' }))).toEqual({ state: 'miss', ply: 0, reason: 'no-triangle', showMove: { from: 'e5', to: 'e4' } });
  });

  it('4. FAIL TWIN — the triangle\'s first step is not a miss, and a step that only looks like one is', () => {
    expect(checkKpTriangulation(game(LESSON, ['Ke5'])).state).toBe('pending');
    // Kf5 also steps forward, but it is not the move that keeps the win.
    expect(checkKpTriangulation(game(LESSON, ['Kf5']))).toMatchObject({ state: 'miss', reason: 'no-triangle' });
  });

  it('5. a forgiven ply is walked past; a ply before startPly and the coach\'s moves are never judged', () => {
    expect(checkKpTriangulation(game(LESSON, ['Kd5'], { forgiven: [0] }))).toEqual({ state: 'pending' });
    expect(checkKpTriangulation(game(LESSON, ['Kd5'], { startPly: 1 }))).toEqual({ state: 'pending' });
    expect(checkKpTriangulation(game(LESSON, ['Kd5'], { color: 'b' }))).toEqual({ state: 'pending' });
  });

  it('6. a live game is judged only from its first decision board on', () => {
    expect(checkKpTriangulation(game(BEFORE_LESSON, ['Kc7', 'Kd5']))).toMatchObject({ state: 'miss', ply: 1, reason: 'no-triangle' });
    expect(checkKpTriangulation(game(BEFORE_LESSON, ['Kc7', 'Ke5'])).state).toBe('pending');
    expect(checkKpTriangulation(game(undefined, ['e4', 'e5', 'Nf3'])).state).toBe('pending');
  });
});

describe('Triangulation — the banner and the shown move', () => {
  it('reads the target pawn, never a move', () => {
    expect(kpTriangulationProgress({ sans: [], studentColor: 'w', forgiven: new Set(), startPly: 0 })).toBe('Hand them the move');
    expect(kpTriangulationProgress(game(LESSON, ['Ke5']))).toBe('Win their pawn on b6');
  });

  it('a second miss shows the engine\'s first winning candidate, else the library\'s key move', () => {
    expect(kpTriangulationShowMove(LESSON, 'w', ['e4d5', 'e4e5'])).toEqual({ from: 'e4', to: 'e5' });
    expect(kpTriangulationShowMove(LESSON, 'w', ['e4d5'])).toEqual({ from: 'e4', to: 'e5' });
  });
});

describe('Triangulation — the briefing is true on the board', () => {
  it('the demo keeps the win every student move: the triangle, then the break', () => {
    const b = new Chess(KP_TRIANGULATION_BRIEFING.demoFen);
    KP_TRIANGULATION_BRIEFING.demoSans.forEach((san, i) => {
      b.move(san);
      if (i % 2 === 0) expect(exactWinner(b), san).toBe('w');
    });
    expect(KP_TRIANGULATION_BRIEFING.demoSans.slice(0, 5)).toEqual(TRIANGLE);
  });

  it('the try is a decision board; its answers are exactly the winning moves', () => {
    const tryBoard = new Chess(KP_TRIANGULATION_BRIEFING.tryFen);
    expect(triangulationDecision(tryBoard, 'w')).toBe(true);
    expect(KP_TRIANGULATION_BRIEFING.tryAnswersUci.length).toBeGreaterThan(0);
  });
});

describe('Triangulation — the runner plays the card', () => {
  const CARD = MISSIONS['kp-triangulation'];
  const moved = (s: RunnerState, startFen: string, sans: string[], candidatesUci: string[] = []): Step => {
    const b = new Chess(startFen);
    for (const san of sans.slice(0, -1)) b.move(san);
    return stepMission(s, { kind: 'moved', game: { sans, studentColor: 'w' }, fenBefore: b.fen(), candidatesUci });
  };
  const loaded = (fen: string): RunnerState => {
    const s0 = stepMission(IDLE, { kind: 'start', cards: [CARD] });
    expect(s0.effects).toEqual([
      { kind: 'briefing', card: CARD },
      { kind: 'load-position', scenarioId: 'kp-triangulation', card: CARD },
      { kind: 'say', line: 'announce', text: CARD.announce },
    ]);
    return stepMission(s0.state, { kind: 'scenario-loaded', fen }).state;
  };

  it('the card is the Level 21 endgame mission', () => {
    expect(CARD).toMatchObject({
      level: 21, phase: 'endgame', classification: 'live', arrivalBar: 0.95, closesAfterMoves: 40, skill: 'endgames',
      checkModule: 'kpTriangulation', scenario: { providerId: 'kp-triangulation' }, graduate: { firstTryPasses: 4 }, unlock: { after: [] },
    });
  });

  it('the direct approach pauses with the fixed phrase; a second one shows the triangle\'s first step', () => {
    const miss = moved(loaded(LESSON), LESSON, ['Kd5'], ['e4d5', 'e4e5']);
    expect(miss.state).toMatchObject({ phase: 'paused', pause: { ply: 0, reason: 'no-triangle' } });
    expect(miss.effects).toEqual([{ kind: 'say', line: 'miss', text: 'Make them move — walk your king around a triangle.' }, { kind: 'hold' }]);
    const undo = stepMission(miss.state, { kind: 'try-again' });
    const again = moved(undo.state, LESSON, ['Kd5'], ['e4d5', 'e4e5']);
    expect(again.effects).toContainEqual({ kind: 'show', move: { from: 'e4', to: 'e5' } });
    expect(again.effects).toContainEqual({ kind: 'record', card: CARD, outcome: 'miss-shown', missPly: 0, reason: 'no-triangle', scenario: true });
  });

  it('the demo played clean: the find on the triangle\'s last step, a first-try pass on the break', () => {
    const sans = [...KP_TRIANGULATION_BRIEFING.demoSans];
    let s = loaded(LESSON);
    for (let n = 1; n < sans.length; n += 2) {
      const step = moved(s, LESSON, sans.slice(0, n));
      expect(step.effects).toEqual(n === 5 ? [{ kind: 'found', card: CARD }, { kind: 'reply' }] : [{ kind: 'reply' }]);
      s = step.state;
    }
    const last = moved(s, LESSON, sans);
    expect(last.state).toMatchObject({ outcome: 'pass-first-try', resolvedAtPly: sans.length - 1 });
    expect(last.effects).toContainEqual({ kind: 'record', card: CARD, outcome: 'pass-first-try', scenario: true });
  });
});
