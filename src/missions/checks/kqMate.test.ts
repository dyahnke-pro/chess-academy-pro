import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import type { MissionGame } from '../missionCard';
import { IDLE, stepMission, type RunnerState } from '../missionRunner';
import { MISSIONS } from '../registry';
import {
  KQ_MATE_BRIEFING,
  KQ_MATE_DEMO_FEN,
  KQ_MATE_DEMO_SANS,
  KQ_MATE_TRY_FEN,
  checkKqMate,
  kingBox,
  kqMateProgress,
  kqMateSafeMovesUci,
  kqMateShowMove,
  mateInOneUci,
  posesKqMate,
} from './kqMate';

/** The box closed: Kf7 and Qg6 against Kh8, White (the student) to move. */
const TRY = KQ_MATE_TRY_FEN;
/** The same board for a Black student: Kf2 and Qg3 against Kh1. */
const TRY_BLACK = '8/8/8/8/8/6q1/5k2/7K b - - 0 1';
/** King and queen at home against a centre king (the briefing demo). */
const HOME = KQ_MATE_DEMO_FEN;
/** Ke1 Qd1 against Kc3: Qd2+ stands next to their king, guarded by yours. */
const GUARDED = '8/8/8/8/8/2k5/8/3QK3 w - - 0 1';
/** Queens facing on the d-file once Qc2-d2 is played. */
const QUEENS = '3qk3/8/8/8/8/8/2Q5/4K3 w - - 0 1';

function game(startFen: string, sans: string[], opts: { color?: 'w' | 'b'; startPly?: number; forgiven?: number[] } = {}): MissionGame {
  return {
    sans,
    startFen,
    studentColor: opts.color ?? 'w',
    forgiven: new Set(opts.forgiven ?? []),
    startPly: opts.startPly ?? 0,
  };
}

describe('every fixture is a legal board', () => {
  it.each([TRY, TRY_BLACK, HOME, GUARDED, QUEENS])('%s', (fen) => {
    const b = new Chess(fen);
    expect(b.isGameOver()).toBe(false);
    // The side not to move is never in check.
    const them = b.turn() === 'w' ? 'b' : 'w';
    const king = b.board().flat().find((c) => c && c.type === 'k' && c.color === them);
    expect(king && b.isAttacked(king.square, b.turn())).toBe(false);
  });
});

describe('K+Q mate — the check', () => {
  it('1. the student mates → PASS', () => {
    expect(checkKqMate(game(TRY, ['Qg7#']))).toEqual({ state: 'pass', ply: 0 });
    expect(checkKqMate(game(TRY_BLACK, ['Qg2#'], { color: 'b' }))).toEqual({ state: 'pass', ply: 0 });
  });

  it('2. the whole demo line: pending to the last move, then PASS on the mate', () => {
    for (let n = 1; n < KQ_MATE_DEMO_SANS.length; n++) {
      expect(checkKqMate(game(HOME, KQ_MATE_DEMO_SANS.slice(0, n))).state).toBe('pending');
    }
    expect(checkKqMate(game(HOME, [...KQ_MATE_DEMO_SANS]))).toEqual({ state: 'pass', ply: 12 });
  });

  it('3. a waiting king move that leaves their king no square → MISS stalemate', () => {
    expect(checkKqMate(game(TRY, ['Kf6']))).toEqual({ state: 'miss', ply: 0, reason: 'stalemate' });
    expect(checkKqMate(game(TRY_BLACK, ['Kf3'], { color: 'b' }))).toEqual({ state: 'miss', ply: 0, reason: 'stalemate' });
  });

  it('4. FAIL TWIN — a "mate" that is stalemate never passes, and a check that is not mate stays pending', () => {
    // Kf6 closes every square — and gives no check: a draw, not a mate.
    const stale = new Chess(TRY); stale.move('Kf6');
    expect(stale.isStalemate()).toBe(true);
    expect(checkKqMate(game(TRY, ['Kf6'])).state).not.toBe('pass');
    // Qf6+ checks, but Kh7 escapes.
    expect(checkKqMate(game(TRY, ['Qf6+']))).toEqual({ state: 'pending' });
  });

  it('5. the queen walks next to their king with nothing guarding it → MISS lost-the-queen', () => {
    expect(checkKqMate(game(HOME, ['Qd4+']))).toEqual({ state: 'miss', ply: 0, reason: 'lost-the-queen' });
    expect(checkKqMate(game(HOME, ['Qd5+']))).toEqual({ state: 'miss', ply: 0, reason: 'lost-the-queen' });
  });

  it('6. FAIL TWIN — next to their king but guarded by yours is no loss; a queen traded for a queen is no loss', () => {
    expect(checkKqMate(game(GUARDED, ['Qd2+']))).toEqual({ state: 'pending' });
    // A board where the coach still has a queen is not this card's question —
    // traded or dropped, neither move is judged (the card asks only against a
    // bare king; `posesKqMate`).
    expect(checkKqMate(game(QUEENS, ['Qd2']))).toEqual({ state: 'pending' });
    expect(checkKqMate(game(QUEENS, ['Qd3']))).toEqual({ state: 'pending' });
  });

  it('7. a ply the student played on from is walked past; a forgiven stalemate ends the card incomplete', () => {
    expect(checkKqMate(game(HOME, ['Qd4+'], { forgiven: [0] }))).toEqual({ state: 'pending' });
    expect(checkKqMate(game(TRY, ['Kf6'], { forgiven: [0] }))).toEqual({ state: 'incomplete', ply: 0 });
  });

  it('8. no ply before the card went live is judged, and the coach\'s moves are never judged', () => {
    expect(checkKqMate(game(TRY, ['Kf6'], { startPly: 1 }))).toEqual({ state: 'pending' });
    // White (the coach here) stalemates Black's lone king? Not the student's move.
    expect(checkKqMate(game(TRY, ['Kf6'], { color: 'b' }))).toEqual({ state: 'pending' });
  });

  it('9. without a scenario board only a posed ply is judged — Fool\'s mate is no K+Q pass', () => {
    // The coach still has its whole army: the question was never on the board.
    expect(checkKqMate({ sans: ['f3', 'e5', 'g4', 'Qh4#'], studentColor: 'b', forgiven: new Set(), startPly: 0 }))
      .toEqual({ state: 'incomplete', ply: 3 });
  });

  // The two rows the gate-1 audit (2026-10-21, prod) recorded against the
  // graduated card, each on a board the question was never on.
  it('10. a rook mate in a crowded ending is no K+Q pass (game 5)', () => {
    const board = '1R3r1k/2PR4/p5pr/n3p1N1/P5P1/5P2/6K1/8 w - - 0 43';
    expect(checkKqMate(game(board, ['Rxf8#']))).toEqual({ state: 'incomplete', ply: 0 });
  });

  it('11. a queen traded off in a full middlegame is no K+Q miss (game 7)', () => {
    const board = '5rk1/5p2/3b2pP/1p5P/2q5/P3PN2/4Q1K1/1B5R w - - 1 49';
    expect(checkKqMate(game(board, ['Qxc4']))).toEqual({ state: 'pending' });
  });

  it('12. posed = the coach has a bare king and the student a queen', () => {
    expect(posesKqMate(new Chess(HOME), 'w')).toBe(true);
    expect(posesKqMate(new Chess('4k3/4p3/8/8/8/8/8/3QK3 w - - 0 1'), 'w'), 'one coach pawn left').toBe(false);
    expect(posesKqMate(new Chess('4k3/8/8/8/8/8/8/3RK3 w - - 0 1'), 'w'), 'no student queen').toBe(false);
  });
});

describe('K+Q mate — the move a second miss shows', () => {
  it('the first engine candidate that neither stalemates nor drops the queen', () => {
    expect(kqMateShowMove(TRY, 'w', ['f7f6', 'g6g7'])).toEqual({ from: 'g6', to: 'g7' });
    expect(kqMateShowMove(HOME, 'w', ['d1d4', 'd1d7'])).toEqual({ from: 'd1', to: 'd7' });
  });

  it('with no usable read, a mating move first — deterministic', () => {
    const shown = kqMateShowMove(TRY, 'w', ['f7f6']);
    expect(shown).not.toBeNull();
    const b = new Chess(TRY);
    b.move({ from: shown!.from, to: shown!.to });
    expect(b.isCheckmate()).toBe(true);
    expect(kqMateShowMove(TRY, 'w', [])).toEqual(shown);
  });

  it('the safe set excludes every stalemating and queen-losing move', () => {
    const safe = kqMateSafeMovesUci(TRY, 'w');
    expect(safe).not.toContain('f7f6');
    expect(kqMateSafeMovesUci(HOME, 'w')).not.toContain('d1d4');
    for (const uci of safe) {
      const b = new Chess(TRY);
      b.move({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
      expect(b.isStalemate()).toBe(false);
    }
  });
});

describe('K+Q mate — the banner', () => {
  it('reads the size of their king\'s box, never a move', () => {
    // Qa7 cuts the seventh rank: Kh8 has c8–h8.
    expect(kqMateProgress(game('7k/8/Q7/8/8/8/8/K7 w - - 0 1', ['Qa7']))).toBe("Their king's box: 6 squares");
    const stale = new Chess(TRY); stale.move('Kf6');
    expect(kingBox(stale, 'w')).toBe(1);
    expect(kqMateProgress(game(TRY, ['Kf6']))).toBe("Their king's box: 1 square");
  });

  it('before any move on no board, the mission itself', () => {
    expect(kqMateProgress({ sans: [], studentColor: 'w', forgiven: new Set(), startPly: 0 })).toBe('Checkmate with king and queen');
  });
});

describe('K+Q mate — the briefing is true on the board', () => {
  it('the demo is a legal mate in 6–8 of the student\'s moves, never a stalemate on the way', () => {
    const b = new Chess(KQ_MATE_BRIEFING.demoFen);
    let studentMoves = 0;
    for (const san of KQ_MATE_BRIEFING.demoSans) {
      if (b.turn() === 'w') studentMoves++;
      b.move(san);
      expect(b.isStalemate()).toBe(false);
    }
    expect(b.isCheckmate()).toBe(true);
    expect(studentMoves).toBeGreaterThanOrEqual(6);
    expect(studentMoves).toBeLessThanOrEqual(8);
  });

  it('the try is one move from mate; its answers are every mating move, and a waiting move stalemates', () => {
    expect(KQ_MATE_BRIEFING.tryAnswersUci).toEqual(mateInOneUci(KQ_MATE_BRIEFING.tryFen));
    expect([...KQ_MATE_BRIEFING.tryAnswersUci].sort()).toEqual(['g6g7', 'g6g8', 'g6h5', 'g6h6'].sort());
    expect(new Chess(KQ_MATE_BRIEFING.tryFen).isGameOver()).toBe(false);
    expect(checkKqMate(game(KQ_MATE_BRIEFING.tryFen, ['Kf6'])).state).toBe('miss');
  });
});

describe('K+Q mate — the runner plays the card', () => {
  const CARD = MISSIONS['kq-mate'];
  const moved = (s: RunnerState, startFen: string, sans: string[], candidatesUci: string[] = []) => {
    const b = new Chess(startFen);
    for (const san of sans.slice(0, -1)) b.move(san);
    return stepMission(s, { kind: 'moved', game: { sans, studentColor: 'w' }, fenBefore: b.fen(), candidatesUci });
  };
  const loaded = (fen: string): RunnerState => {
    const s0 = stepMission(IDLE, { kind: 'start', cards: [CARD] });
    expect(s0.effects).toEqual([
      { kind: 'briefing', card: CARD },
      { kind: 'load-position', scenarioId: 'kq-vs-k', card: CARD },
      { kind: 'say', line: 'announce', text: 'Endgame mission: checkmate with king and queen.' },
    ]);
    return stepMission(s0.state, { kind: 'scenario-loaded', fen }).state;
  };

  it('the card is the endgame mission the WO specifies', () => {
    expect(CARD).toMatchObject({
      level: 1, phase: 'endgame', classification: 'live', arrivalBar: 0.95, closesAfterMoves: 40,
      checkModule: 'kqMate', scenario: { providerId: 'kq-vs-k' }, graduate: { firstTryPasses: 3 }, unlock: { after: [] },
      coachDials: { attacksOnPieces: 'on', plannedTrap: 'off', plantFreePiece: 'off', trades: 'normal', rewinds: 'every-miss', strengthOffset: 0, steer: 'off' },
    });
    expect(CARD.closesAtMove).toBeUndefined();
  });

  it('a stalemate pauses with the fixed phrase; "Try again" undoes it; the mate is a retry pass', () => {
    const miss = moved(loaded(TRY), TRY, ['Kf6'], ['f7f6', 'g6g7']);
    expect(miss.state).toMatchObject({ phase: 'paused', pause: { ply: 0, reason: 'stalemate' } });
    expect(miss.effects).toEqual([{ kind: 'say', line: 'miss', text: 'Leave their king a square.' }, { kind: 'hold' }]);
    const undo = stepMission(miss.state, { kind: 'try-again' });
    expect(undo.effects).toEqual([{ kind: 'undo' }]);
    const pass = moved(undo.state, TRY, ['Qg7#']);
    expect(pass.state).toMatchObject({ phase: 'resolved', outcome: 'pass-retry' });
    expect(pass.effects).toEqual([
      { kind: 'celebrate', firstTry: false },
      { kind: 'say', line: 'pass', text: 'Checkmate — mission complete!' },
      { kind: 'record', card: CARD, outcome: 'pass-retry', scenario: true },
      { kind: 'reply' },
    ]);
  });

  it('a second stalemate at the same decision shows the mate and plays on — miss-shown', () => {
    let s = moved(loaded(TRY), TRY, ['Kf6'], ['f7f6', 'g6g7']).state;
    s = stepMission(s, { kind: 'try-again' }).state;
    const again = moved(s, TRY, ['Kf6'], ['f7f6', 'g6g7']);
    expect(again.effects).toEqual([
      { kind: 'say', line: 'miss', text: 'Leave their king a square.' },
      { kind: 'show', move: { from: 'g6', to: 'g7' } },
      { kind: 'record', card: CARD, outcome: 'miss-shown', missPly: 0, reason: 'stalemate', scenario: true },
      { kind: 'reply' },
    ]);
  });

  it('a hung queen has its own fixed phrase', () => {
    const miss = moved(loaded(HOME), HOME, ['Qd4+'], ['d1d7']);
    expect(miss.state.pause).toEqual({ ply: 0, reason: 'lost-the-queen' });
    expect(miss.effects[0]).toEqual({ kind: 'say', line: 'miss', text: 'Keep your queen safe — it does the work.' });
  });

  it('the demo line played clean is a first-try pass, recorded as a scenario phase', () => {
    let s = loaded(HOME);
    for (let n = 1; n < KQ_MATE_DEMO_SANS.length; n += 2) {
      const step = moved(s, HOME, KQ_MATE_DEMO_SANS.slice(0, n));
      expect(step.effects).toEqual([{ kind: 'reply' }]);
      s = step.state;
    }
    const last = moved(s, HOME, [...KQ_MATE_DEMO_SANS]);
    expect(last.state).toMatchObject({ outcome: 'pass-first-try', resolvedAtPly: 12 });
    expect(last.effects).toContainEqual({ kind: 'record', card: CARD, outcome: 'pass-first-try', scenario: true });
  });
});
