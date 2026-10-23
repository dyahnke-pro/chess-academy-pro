import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import type { MissionGame } from '../missionCard';
import { IDLE, stepMission, type RunnerState } from '../missionRunner';
import { MISSIONS } from '../registry';
import {
  CHECKMATE_CLOSES_AFTER_MOVES,
  checkCheckmateKing,
  checkmateKingProgress,
  checkmateKingShowMove,
  nonStalematingMovesUci,
} from './checkmateKing';

/** Kf7 and Qg6 against Kh8, White (the student) to move: four mates, and a
 *  waiting king move (Kf6) stalemates. */
const BOX = '7k/5K2/6Q1/8/8/8/8/8 w - - 0 1';
/** The same board for a Black student: Kf2 and Qg3 against Kh1. */
const BOX_BLACK = '8/8/8/8/8/6q1/5k2/7K b - - 0 1';
/** A rook ending: Ra7 and Kg6 against Kh8 — Ra8 mates. */
const ROOK = '7k/R7/6K1/8/8/8/8/8 w - - 0 1';

/** Sam Loyd's ten-move stalemate: White's 10th move, Qe6, stalemates — the
 *  student is White, and 43 other moves there do not. */
const LOYD = 'e3 a5 Qh5 Ra6 Qxa5 h5 Qxc7 Rah6 h4 f6 Qxd7+ Kf7 Qxb7 Qd3 Qxb8 Qh7 Qxc8 Kg6 Qe6'.split(' ');
/** White mates on move three: e4, d4, Qh5#. */
const QUICK_MATE = 'e4 f6 d4 g5 Qh5#'.split(' ');

function game(startFen: string | undefined, sans: string[], opts: { color?: 'w' | 'b'; startPly?: number; forgiven?: number[] } = {}): MissionGame {
  return {
    sans,
    ...(startFen ? { startFen } : {}),
    studentColor: opts.color ?? 'w',
    forgiven: new Set(opts.forgiven ?? []),
    startPly: opts.startPly ?? 0,
  };
}

describe('every fixture is a legal board', () => {
  it.each([BOX, BOX_BLACK, ROOK])('%s', (fen) => {
    const b = new Chess(fen);
    expect(b.isGameOver()).toBe(false);
    const them = b.turn() === 'w' ? 'b' : 'w';
    const king = b.board().flat().find((c) => c && c.type === 'k' && c.color === them);
    expect(king && b.isAttacked(king.square, b.turn())).toBe(false);
  });
});

describe('checkmate the king — the check', () => {
  it('any checkmate by the student passes — a queen, a rook, a mate from the opening', () => {
    expect(checkCheckmateKing(game(BOX, ['Qg7#']))).toEqual({ state: 'pass', ply: 0 });
    expect(checkCheckmateKing(game(BOX, ['Qh6#']))).toEqual({ state: 'pass', ply: 0 });
    expect(checkCheckmateKing(game(BOX_BLACK, ['Qg2#'], { color: 'b' }))).toEqual({ state: 'pass', ply: 0 });
    expect(checkCheckmateKing(game(ROOK, ['Ra8#']))).toEqual({ state: 'pass', ply: 0 });
    expect(checkCheckmateKing(game(undefined, QUICK_MATE))).toEqual({ state: 'pass', ply: 4 });
  });

  it('no method is judged: a check, a king walk, a queen far away — all pending until the mate', () => {
    expect(checkCheckmateKing(game(BOX, ['Qe8+'])).state).toBe('pending');
    expect(checkCheckmateKing(game(BOX, ['Qa6'])).state).toBe('pending');
    expect(checkCheckmateKing(game(ROOK, ['Ke6'])).state).toBe('pending');
  });

  it('a stalemate when another move did not stalemate → MISS stalemate, in a set position and in a real game', () => {
    expect(checkCheckmateKing(game(BOX, ['Kf6']))).toEqual({ state: 'miss', ply: 0, reason: 'stalemate' });
    expect(checkCheckmateKing(game(undefined, LOYD))).toEqual({ state: 'miss', ply: 18, reason: 'stalemate' });
  });

  it('FAIL TWIN — the coach mating the student is never the student\'s pass', () => {
    const fools = 'f3 e5 g4 Qh4#'.split(' ');
    expect(checkCheckmateKing(game(undefined, fools)).state).toBe('pending');
    // The same game for a Black student: the student's own mate passes.
    expect(checkCheckmateKing(game(undefined, fools, { color: 'b' }))).toEqual({ state: 'pass', ply: 3 });
  });

  it('a forgiven stalemate (Play on) ends the card incomplete — the game is over', () => {
    expect(checkCheckmateKing(game(BOX, ['Kf6'], { forgiven: [0] }))).toEqual({ state: 'incomplete', ply: 0 });
  });

  it('no ply before the card went live is judged, and the coach\'s moves never are', () => {
    expect(checkCheckmateKing(game(undefined, QUICK_MATE, { startPly: 5 })).state).toBe('pending');
    expect(checkCheckmateKing(game(undefined, LOYD.slice(0, 18))).state).toBe('pending');
  });

  it('the safe set excludes every stalemating move and leads with the mates', () => {
    const ok = nonStalematingMovesUci(BOX, 'w');
    expect(ok.slice(0, 4).sort()).toEqual(['g6g7', 'g6g8', 'g6h5', 'g6h6'].sort());
    expect(ok).not.toContain('f7f6');
    expect(nonStalematingMovesUci(BOX, 'b')).toEqual([]);
  });
});

describe('checkmate the king — the move a second miss shows', () => {
  it('a mate when there is one, before any engine candidate', () => {
    expect(checkmateKingShowMove(BOX, 'w', ['f7e7', 'g6h6'])).toEqual({ from: 'g6', to: 'g7' });
  });

  it('with no mate, the engine\'s first candidate that does not stalemate — never a stalemating one', () => {
    const before = new Chess();
    for (const san of LOYD.slice(0, -1)) before.move(san);
    // Qe6 (c8e6) stalemates; the engine's next candidate is shown instead.
    expect(checkmateKingShowMove(before.fen(), 'w', ['c8e6', 'c8d7'])).toEqual({ from: 'c8', to: 'd7' });
  });
});

describe('checkmate the king — the banner', () => {
  it('names the goal, never a method or a move', () => {
    expect(checkmateKingProgress()).toBe('Checkmate the king');
  });
});

describe('checkmate the king — the runner plays the card in the student\'s own game', () => {
  const CARD = MISSIONS['kq-mate'];
  const moved = (s: RunnerState, sans: string[], candidatesUci: string[] = []): ReturnType<typeof stepMission> => {
    const b = new Chess();
    for (const san of sans.slice(0, -1)) b.move(san);
    return stepMission(s, { kind: 'moved', game: { sans, studentColor: 'w' }, fenBefore: b.fen(), candidatesUci });
  };
  const live = (): RunnerState => {
    const s0 = stepMission(IDLE, { kind: 'start', cards: [CARD] });
    // No briefing, no board swapped in: the announce alone.
    expect(s0.effects).toEqual([{ kind: 'say', line: 'announce', text: 'Endgame mission: checkmate the king.' }]);
    return s0.state;
  };
  /** The student's moves before the last one, through the runner. */
  const upTo = (s: RunnerState, sans: string[]): RunnerState => {
    let st = s;
    for (let n = 1; n < sans.length; n += 2) st = moved(st, sans.slice(0, n)).state;
    return st;
  };

  it('the card David asked for: no scenario, no briefing, live until the game ends', () => {
    expect(CARD).toMatchObject({
      level: 1, phase: 'endgame', title: 'Checkmate the king', classification: 'live', arrivalBar: 0,
      closesAfterMoves: CHECKMATE_CLOSES_AFTER_MOVES, checkModule: 'checkmateKing', graduate: { firstTryPasses: 3 },
    });
    expect(CARD.scenario).toBeUndefined();
    expect(CARD.briefing).toBeUndefined();
    expect(CARD.missPhraseFor).toBeUndefined();
  });

  it('a mate in the student\'s own game is a first-try pass — never a scenario row', () => {
    const last = moved(upTo(live(), QUICK_MATE), QUICK_MATE);
    expect(last.state).toMatchObject({ outcome: 'pass-first-try', resolvedAtPly: 4 });
    expect(last.effects).toContainEqual({ kind: 'record', card: CARD, outcome: 'pass-first-try' });
    expect(last.effects.some((e) => e.kind === 'load-position')).toBe(false);
  });

  it('a stalemate pauses with the fixed phrase; "Try again" undoes the student\'s move only', () => {
    const miss = moved(upTo(live(), LOYD), LOYD, ['c8d7']);
    expect(miss.state).toMatchObject({ phase: 'paused', pause: { ply: 18, reason: 'stalemate' } });
    expect(miss.effects).toEqual([{ kind: 'say', line: 'miss', text: 'Leave their king a square.' }, { kind: 'hold' }]);
    expect(stepMission(miss.state, { kind: 'try-again' }).effects).toEqual([{ kind: 'undo' }]);
  });
});
