import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import type { MissionGame } from '../missionCard';
import { IDLE, stepMission, type RunnerState, type Step } from '../missionRunner';
import { MISSIONS } from '../registry';
import { exactWinner } from './kpEndings';
import {
  KP_OUTFLANKING_BRIEFING,
  KP_OUTFLANKING_DEMO_FEN,
  KP_OUTFLANKING_DEMO_SANS,
  KP_OUTFLANKING_TRY_FEN,
  checkKpOutflanking,
  kpOutflankingFoundAt,
  kpOutflankingProgress,
  kpOutflankingShowMove,
  outflankDecision,
} from './kpOutflanking';

/** Ke5 + Pc6 against Ke7, White to move: only Kd5 wins; the pawn run c7 lets
 *  Black draw (a library board; the exact tables, Syzygy and Stockfish agree). */
const FACE = '8/4k3/2P5/4K3/8/8/8/8 w - - 0 1';
/** The same board for a Black student (ranks flipped, colours swapped). */
const FACE_BLACK = '8/8/8/8/4k3/2p5/4K3/8 b - - 0 1';
/** Kb6 + Pb7 against Kb8: Ka6 / Kc6 win, stepping back draws (a library board). */
const SEVENTH = '1k6/1P6/1K6/8/8/8/8/8 w - - 0 1';
/** A blocked pair: Ke6 + Pb5 against Ke8 + Pb6 — only Kd6 wins (a library board). */
const PAIR = '4k3/8/1p2K3/1P6/8/8/8/8 w - - 0 1';
/** The kings face each other but the pawn has a spare move that ALSO wins
 *  (e3): no sidestep is forced — not this card's question. */
const SPARE_TEMPO = '8/8/4k3/8/4K3/8/4P3/8 w - - 0 1';
/** The kings face each other on the rook's file with the defender in the
 *  corner: the student is not winning — nothing to judge. */
const ROOK_PAWN = 'k7/8/K7/P7/8/8/8/8 w - - 0 1';
/** Not a library board: Black (the coach) to move from f7. ...Ke7 makes the
 *  decision board FACE on the board of a live game. */
const BEFORE_FACE = '8/5k2/2P5/4K3/8/8/8/8 b - - 0 1';

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
  it.each([
    [FACE, 'w'], [FACE_BLACK, 'b'], [SEVENTH, 'w'], [PAIR, 'w'], [SPARE_TEMPO, 'w'], [ROOK_PAWN, 'draw'], [BEFORE_FACE, 'w'],
  ] as const)('%s → %s', (fen, winner) => {
    const b = new Chess(fen);
    expect(b.isGameOver()).toBe(false);
    expect(exactWinner(b)).toBe(winner);
  });
});

describe('Outflanking — the decision board', () => {
  it('reads true where the kings face each other and only a sidestep wins, both colours', () => {
    expect(outflankDecision(new Chess(FACE), 'w')).toBe(true);
    expect(outflankDecision(new Chess(FACE_BLACK), 'b')).toBe(true);
    expect(outflankDecision(new Chess(SEVENTH), 'w')).toBe(true);
    expect(outflankDecision(new Chess(PAIR), 'w')).toBe(true);
  });

  it('FAIL TWINS — one condition missing, never a decision board', () => {
    // A spare pawn move also wins: no sidestep is forced.
    expect(outflankDecision(new Chess(SPARE_TEMPO), 'w')).toBe(false);
    // Not winning at all.
    expect(outflankDecision(new Chess(ROOK_PAWN), 'w')).toBe(false);
    // The defender to move: the student holds the opposition, nothing to find.
    expect(outflankDecision(new Chess('8/4k3/2P5/4K3/8/8/8/8 b - - 0 1'), 'w')).toBe(false);
    // The kings three ranks apart (not facing).
    expect(outflankDecision(new Chess('8/4k3/2P5/8/4K3/8/8/8 w - - 0 1'), 'w')).toBe(false);
    // The wrong colour's question.
    expect(outflankDecision(new Chess(FACE), 'b')).toBe(false);
  });
});

describe('Outflanking — the check', () => {
  it('1. the exact line from the library board — pending to the last move, PASS on the queen', () => {
    const sans = [...KP_OUTFLANKING_DEMO_SANS];
    expect(KP_OUTFLANKING_DEMO_FEN).toBe(FACE);
    for (let n = 1; n < sans.length; n++) expect(checkKpOutflanking(game(FACE, sans.slice(0, n))).state).toBe('pending');
    expect(checkKpOutflanking(game(FACE, sans))).toEqual({ state: 'pass', ply: sans.length - 1 });
    // The same line mirrored for a Black student.
    const mirrored = sans.map(flipSan);
    expect(checkKpOutflanking(game(FACE_BLACK, mirrored, { color: 'b' }))).toEqual({ state: 'pass', ply: mirrored.length - 1 });
  });

  it('2. the pawn run on the decision board → MISS faced-the-king, showing the key sidestep', () => {
    expect(checkKpOutflanking(game(FACE, ['c7']))).toEqual({ state: 'miss', ply: 0, reason: 'faced-the-king', showMove: { from: 'e5', to: 'd5' } });
    expect(checkKpOutflanking(game(FACE, ['Kf5']))).toMatchObject({ state: 'miss', ply: 0, reason: 'faced-the-king' });
    expect(checkKpOutflanking(game(FACE_BLACK, ['c2'], { color: 'b' }))).toEqual({ state: 'miss', ply: 0, reason: 'faced-the-king', showMove: { from: 'e4', to: 'd4' } });
    // Stepping back on the seventh-rank board, and the head-on try on the pair.
    expect(checkKpOutflanking(game(SEVENTH, ['Kc5']))).toMatchObject({ state: 'miss', ply: 0, reason: 'faced-the-king' });
    expect(checkKpOutflanking(game(PAIR, ['Kd5']))).toMatchObject({ state: 'miss', ply: 0, reason: 'faced-the-king', showMove: { from: 'e6', to: 'd6' } });
  });

  it('3. FAIL TWIN — the right sidestep is not a miss, and a sidestep the wrong way is', () => {
    expect(checkKpOutflanking(game(FACE, ['Kd5'])).state).toBe('pending');
    expect(checkKpOutflanking(game(PAIR, ['Kd6'])).state).toBe('pending');
    // On the pair board only one sidestep wins: Kf6 heads away from their pawn.
    expect(checkKpOutflanking(game(PAIR, ['Kf6']))).toMatchObject({ state: 'miss', reason: 'faced-the-king' });
  });

  it('4. after the sidestep, any move that lets the win slip → MISS kp-win-slipped', () => {
    // Kc6 Ka7 b8=Q+?: their king takes the new queen — a draw, not a pass.
    const b = new Chess(SEVENTH); b.move('Kc6'); b.move('Ka7');
    expect(exactWinner(b)).toBe('w');
    b.move('b8=Q+');
    expect(exactWinner(b)).toBe('draw');
    expect(checkKpOutflanking(game(SEVENTH, ['Kc6', 'Ka7', 'b8=Q+']))).toMatchObject({ state: 'miss', ply: 2, reason: 'kp-win-slipped' });
    // Kc7 keeps the queen guarded: the next promotion passes.
    expect(checkKpOutflanking(game(SEVENTH, ['Kc6', 'Ka7', 'Kc7', 'Ka6', 'b8=Q']))).toEqual({ state: 'pass', ply: 4 });
  });

  it('5. FAIL TWIN — a promotion only passes when the new queen survives', () => {
    const shown = checkKpOutflanking(game(SEVENTH, ['Kc6', 'Ka7', 'b8=Q+']));
    expect(shown.state).not.toBe('pass');
  });

  it('6. a forgiven ply is walked past; a ply before startPly and the coach\'s moves are never judged', () => {
    expect(checkKpOutflanking(game(FACE, ['c7'], { forgiven: [0] }))).toEqual({ state: 'pending' });
    expect(checkKpOutflanking(game(FACE, ['c7'], { startPly: 1 }))).toEqual({ state: 'pending' });
    expect(checkKpOutflanking(game(FACE, ['c7'], { color: 'b' }))).toEqual({ state: 'pending' });
  });

  it('7. a live game is judged only from its first decision board on', () => {
    // ...Ke7 puts the decision on the board; the pawn run then misses.
    expect(checkKpOutflanking(game(BEFORE_FACE, ['Ke7', 'c7']))).toMatchObject({ state: 'miss', ply: 1, reason: 'faced-the-king' });
    expect(checkKpOutflanking(game(BEFORE_FACE, ['Ke7', 'Kd5'])).state).toBe('pending');
    // A slip before any decision board is not this card's question.
    expect(checkKpOutflanking(game('8/4k3/2P5/8/4K3/8/8/8 w - - 0 1', ['Kf4'])).state).toBe('pending');
    // A spare-tempo board never poses it; the standard start never does.
    expect(checkKpOutflanking(game(SPARE_TEMPO, ['e3'])).state).toBe('pending');
    expect(checkKpOutflanking(game(undefined, ['e4', 'e5', 'Nf3'])).state).toBe('pending');
  });

  it('8. the find pays at once: the winning sidestep on a decision board', () => {
    expect(kpOutflankingFoundAt(game(FACE, ['Kd5']))).toBe(0);
    expect(kpOutflankingFoundAt(game(FACE, ['c7']))).toBeNull();
    expect(kpOutflankingFoundAt(game(BEFORE_FACE, ['Ke7', 'Kd5']))).toBe(1);
  });
});

describe('Outflanking — the banner and the shown move', () => {
  it('reads the pawn race or the target pawn, never a move', () => {
    expect(kpOutflankingProgress({ sans: [], studentColor: 'w', forgiven: new Set(), startPly: 0 })).toBe('Go around their king');
    expect(kpOutflankingProgress(game(FACE, ['Kd5']))).toBe('Your pawn: 2 steps to queen');
    expect(kpOutflankingProgress(game(FACE_BLACK, ['Kd4'], { color: 'b' }))).toBe('Your pawn: 2 steps to queen');
    expect(kpOutflankingProgress(game(PAIR, []))).toBe('Win their pawn on b6');
  });

  it('a second miss shows the engine\'s first winning candidate, else the library\'s key move', () => {
    expect(kpOutflankingShowMove(FACE, 'w', ['c6c7', 'e5d5'])).toEqual({ from: 'e5', to: 'd5' });
    expect(kpOutflankingShowMove(FACE, 'w', ['c6c7'])).toEqual({ from: 'e5', to: 'd5' });
    expect(kpOutflankingShowMove(SEVENTH, 'w', ['b6a6'])).toEqual({ from: 'b6', to: 'a6' });
  });
});

describe('Outflanking — the briefing is true on the board', () => {
  it('the demo is a legal line that keeps the win every student move and ends in a queen that survives', () => {
    const b = new Chess(KP_OUTFLANKING_BRIEFING.demoFen);
    for (const san of KP_OUTFLANKING_BRIEFING.demoSans) {
      b.move(san);
      expect(b.isStalemate()).toBe(false);
      expect(exactWinner(b), san).toBe('w');
    }
    expect(KP_OUTFLANKING_BRIEFING.demoSans.at(-1)).toMatch(/=Q/);
  });

  it('the try is a decision board; its answers are exactly the winning sidesteps', () => {
    expect(outflankDecision(new Chess(KP_OUTFLANKING_TRY_FEN), 'w')).toBe(true);
    expect([...KP_OUTFLANKING_BRIEFING.tryAnswersUci].sort()).toEqual(['e6d6', 'e6f6']);
  });
});

describe('Outflanking — the runner plays the card', () => {
  const CARD = MISSIONS['kp-outflanking'];
  const moved = (s: RunnerState, startFen: string, sans: string[], candidatesUci: string[] = []): Step => {
    const b = new Chess(startFen);
    for (const san of sans.slice(0, -1)) b.move(san);
    return stepMission(s, { kind: 'moved', game: { sans, studentColor: 'w' }, fenBefore: b.fen(), candidatesUci });
  };
  const loaded = (fen: string): RunnerState => {
    const s0 = stepMission(IDLE, { kind: 'start', cards: [CARD] });
    expect(s0.effects).toEqual([
      { kind: 'briefing', card: CARD },
      { kind: 'load-position', scenarioId: 'kp-outflanking', card: CARD },
      { kind: 'say', line: 'announce', text: CARD.announce },
    ]);
    return stepMission(s0.state, { kind: 'scenario-loaded', fen }).state;
  };

  it('the card is the Level 19 endgame mission', () => {
    expect(CARD).toMatchObject({
      level: 19, phase: 'endgame', classification: 'live', arrivalBar: 0.95, closesAfterMoves: 40, skill: 'endgames',
      checkModule: 'kpOutflanking', scenario: { providerId: 'kp-outflanking' }, graduate: { firstTryPasses: 4 }, unlock: { after: [] },
    });
    expect(CARD.foundAt).not.toBeNull();
  });

  it('the pawn run pauses with the fixed phrase; "Try again" undoes it; a second run shows the sidestep', () => {
    const miss = moved(loaded(FACE), FACE, ['c7'], ['c6c7', 'e5d5']);
    expect(miss.state).toMatchObject({ phase: 'paused', pause: { ply: 0, reason: 'faced-the-king' } });
    expect(miss.effects).toEqual([{ kind: 'say', line: 'miss', text: 'Go around their king, not into it.' }, { kind: 'hold' }]);
    const undo = stepMission(miss.state, { kind: 'try-again' });
    expect(undo.effects).toEqual([{ kind: 'undo' }]);
    const again = moved(undo.state, FACE, ['c7'], ['c6c7', 'e5d5']);
    expect(again.effects).toEqual([
      { kind: 'say', line: 'miss', text: 'Go around their king, not into it.' },
      { kind: 'show', move: { from: 'e5', to: 'd5' } },
      { kind: 'record', card: CARD, outcome: 'miss-shown', missPly: 0, reason: 'faced-the-king', scenario: true },
      { kind: 'reply' },
    ]);
  });

  it('the exact line played clean: the sidestep pays the find, the queen is a first-try pass', () => {
    const sans = [...KP_OUTFLANKING_DEMO_SANS];
    let s = loaded(FACE);
    const first = moved(s, FACE, sans.slice(0, 1));
    expect(first.effects).toEqual([{ kind: 'found', card: CARD }, { kind: 'reply' }]);
    s = first.state;
    for (let n = 3; n < sans.length; n += 2) {
      const step = moved(s, FACE, sans.slice(0, n));
      expect(step.effects).toEqual([{ kind: 'reply' }]);
      s = step.state;
    }
    const last = moved(s, FACE, sans);
    expect(last.state).toMatchObject({ outcome: 'pass-first-try', resolvedAtPly: sans.length - 1 });
    expect(last.effects).toContainEqual({ kind: 'say', line: 'pass', text: CARD.passLine });
    expect(last.effects).toContainEqual({ kind: 'record', card: CARD, outcome: 'pass-first-try', scenario: true });
  });
});
