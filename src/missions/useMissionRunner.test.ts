import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { Chess } from 'chess.js';

vi.mock('../services/appAuditor', () => ({ logAppAudit: vi.fn() }));

import { logAppAudit } from '../services/appAuditor';
import { useMissionRunner, type MissionRunner, type MissionRunnerHands } from './useMissionRunner';
import { MISSIONS } from './registry';

const CARD = MISSIONS['develop-and-castle'];
const sans = (m: string): string[] => m.split(/\s+/).filter(Boolean);
const fenOf = (moves: string[]): string => { const b = new Chess(); for (const s of moves) b.move(s); return b.fen(); };

function setup(): { hands: MissionRunnerHands; result: { current: MissionRunner }; move: (moves: string) => 'reply' | 'hold' } {
  const hands: MissionRunnerHands = {
    say: vi.fn(), celebrate: vi.fn(), record: vi.fn(), undo: vi.fn(), show: vi.fn(), replyToHeldMove: vi.fn(),
  };
  const { result } = renderHook(() => useMissionRunner(hands));
  const move = (moves: string): 'reply' | 'hold' => {
    const all = sans(moves);
    let r: 'reply' | 'hold' = 'reply';
    act(() => { r = result.current.moved({ sans: all, studentColor: 'w' }, fenOf(all.slice(0, -1)), []); });
    return r;
  };
  return { hands, result, move };
}

describe('useMissionRunner — wiring', () => {
  it('announces once at the start', () => {
    const { hands, result } = setup();
    act(() => result.current.start([CARD]));
    expect(hands.say).toHaveBeenCalledTimes(1);
    expect(hands.say).toHaveBeenCalledWith(CARD.announce, 'announce');
    expect(result.current.view.phase).toBe('live');
  });

  it('a miss holds the coach reply; "Try again" undoes one ply; nothing is recorded yet', () => {
    const { hands, result, move } = setup();
    act(() => result.current.start([CARD]));
    expect(move('e4 e5 Nf3 Nc6 Ng5')).toBe('hold');
    expect(hands.say).toHaveBeenLastCalledWith(CARD.missPhrase, 'miss');
    expect(result.current.view.phase).toBe('paused');
    act(() => result.current.tryAgain());
    expect(hands.undo).toHaveBeenCalledTimes(1);
    expect(hands.replyToHeldMove).not.toHaveBeenCalled();
    expect(hands.record).not.toHaveBeenCalled();
  });

  it('"Play on" lets the coach answer the held move', () => {
    const { hands, result, move } = setup();
    act(() => result.current.start([CARD]));
    move('e4 e5 Nf3 Nc6 Ng5');
    act(() => result.current.playOn());
    expect(hands.replyToHeldMove).toHaveBeenCalledTimes(1);
    expect(hands.undo).not.toHaveBeenCalled();
  });

  it('the second miss at a decision draws the move and plays on', () => {
    const { hands, result, move } = setup();
    act(() => result.current.start([CARD]));
    move('e4 e5 Nf3 Nc6 Ng5');
    act(() => result.current.tryAgain());
    expect(move('e4 e5 Nf3 Nc6 Nh4')).toBe('reply');
    expect(hands.show).toHaveBeenCalledTimes(1);
    expect(hands.record).toHaveBeenCalledWith(CARD, { outcome: 'miss-shown', missPly: 4, reason: 'repeat-move' });
    // Inline reply: the page carries on with the move; the held-move path is not used.
    expect(hands.replyToHeldMove).not.toHaveBeenCalled();
  });

  it('a pass fires the reward once and writes one row for the mission', () => {
    const { hands, result, move } = setup();
    act(() => result.current.start([CARD]));
    move('e4 e5 Nf3 Nc6 Bc4 Bc5 Nc3 Nf6 d3 d6 O-O O-O Bg5');
    move('e4 e5 Nf3 Nc6 Bc4 Bc5 Nc3 Nf6 d3 d6 O-O O-O Bg5 Bg4 h3');
    expect(hands.celebrate).toHaveBeenCalledTimes(1);
    expect(hands.celebrate).toHaveBeenCalledWith(true);
    expect(hands.record).toHaveBeenCalledTimes(1);
    expect(hands.say).toHaveBeenLastCalledWith(CARD.passLine, 'pass');
    // The game stays the mission's after the pass (Campaign); the dials lift.
    expect(result.current.ownsGame()).toBe(true);
    expect(result.current.dials()).toBeNull();
  });
});

const MG = MISSIONS['free-piece-stay-ahead'];
/** White student. The coach plants …Ng4 at ply 15; f3 takes it. */
const PLANT_PREFIX = 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nxd4 Qxd4 Qf6 Qxf6 Nxf6 f3 Bc5 Bd3 Ng4';

describe('useMissionRunner — two phases in one game (WO-MISSIONS-02)', () => {
  it('opening pass → the middlegame card announces once, then two record rows by the end', () => {
    const { hands, result, move } = setup();
    act(() => result.current.start([CARD, MG]));
    move('e4 e5 Nf3 Nc6 Bc4 Bc5 Nc3 Nf6 d3 d6 O-O O-O Bg5');
    expect(result.current.view.card?.id).toBe('free-piece-stay-ahead');
    expect(result.current.view.startPly).toBe(13);
    const announces = vi.mocked(hands.say).mock.calls.filter(([, line]) => line === 'announce').map(([text]) => text);
    expect(announces).toEqual([CARD.announce, MG.announce]);
    expect(hands.record).toHaveBeenCalledTimes(1);
    expect(hands.record).toHaveBeenLastCalledWith(CARD, { outcome: 'pass-first-try' });
    // The middlegame card closes too — no plant came in its window.
    for (let ply = 13; ply <= 27; ply += 2) act(() => result.current.coachMoved(ply, { scan: { 'no-free-piece': 1 } }));
    expect(hands.record).toHaveBeenCalledTimes(2);
    expect(hands.record).toHaveBeenLastCalledWith(MG, { outcome: 'incomplete', plantFound: false });
  });

  it('logs mission-plant-none with the reasons when the window closes after the 8th coach move', () => {
    vi.mocked(logAppAudit).mockClear();
    const { result, move } = setup();
    act(() => result.current.start([CARD, MG]));
    move('e4 e5 Nf3 Nc6 Bc4 Bc5 Nc3 Nf6 d3 d6 O-O O-O Bg5');
    for (let ply = 13; ply <= 25; ply += 2) act(() => result.current.coachMoved(ply, { scan: { threatens: 1 } }));
    expect(vi.mocked(logAppAudit).mock.calls.some(([e]) => e.kind === 'mission-plant-none')).toBe(false);
    act(() => result.current.coachMoved(27, { scan: { 'no-read': 1 } }));
    const none = vi.mocked(logAppAudit).mock.calls.find(([e]) => e.kind === 'mission-plant-none');
    expect(none?.[0].details).toContain('"threatens":7');
    expect(none?.[0].details).toContain('"no-read":1');
  });

  it('a planted piece: the miss phrase for it, a second miss shows the capture, a pass rewards once', () => {
    const { hands, result } = setup();
    const moveFull = (moves: string): 'reply' | 'hold' => {
      const all = sans(moves);
      let r: 'reply' | 'hold' = 'reply';
      act(() => { r = result.current.moved({ sans: all, studentColor: 'w' }, fenOf(all.slice(0, -1)), []); });
      return r;
    };
    act(() => result.current.start([MG]));
    act(() => result.current.coachMoved(15, { square: 'g4' }));
    expect(moveFull(`${PLANT_PREFIX} Nc3`)).toBe('hold');
    expect(hands.say).toHaveBeenLastCalledWith("There's a win on the board — find it.", 'miss');
    act(() => result.current.tryAgain());
    expect(moveFull(`${PLANT_PREFIX} Kd2`)).toBe('reply');
    expect(hands.show).toHaveBeenCalledWith({ from: 'f3', to: 'g4' });
    expect(hands.record).toHaveBeenCalledWith(MG, { outcome: 'miss-shown', missPly: 16, reason: 'missed-free-piece', plantFound: true });
    expect(hands.celebrate).not.toHaveBeenCalled();
  });

  it('a clean middlegame pass fires the reward exactly once', () => {
    const { hands, result } = setup();
    act(() => result.current.start([MG]));
    act(() => result.current.coachMoved(15, { square: 'g4' }));
    const line = sans(`${PLANT_PREFIX} fxg4 d6 Nc3 Be6 Bd2 O-O-O O-O-O Rhe8 Rhe1 Bd4 Bf4 Bxc3 bxc3 d5 exd5 Bxd5 Rxe8 Rxe8 Kd2`);
    for (let n = 17; n <= line.length; n += 2) {
      act(() => { result.current.moved({ sans: line.slice(0, n), studentColor: 'w' }, fenOf(line.slice(0, n - 1)), []); });
    }
    expect(hands.celebrate).toHaveBeenCalledTimes(1);
    expect(hands.say).toHaveBeenLastCalledWith(MG.passLine, 'pass');
    expect(hands.record).toHaveBeenCalledWith(MG, { outcome: 'pass-first-try', plantFound: true });
  });
});
