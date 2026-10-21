import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { Chess } from 'chess.js';

vi.mock('../services/appAuditor', () => ({ logAppAudit: vi.fn() }));

import { useMissionRunner, type MissionRunnerHands } from './useMissionRunner';
import { MISSIONS } from './registry';

const CARD = MISSIONS['develop-and-castle'];
const sans = (m: string): string[] => m.split(/\s+/).filter(Boolean);
const fenOf = (moves: string[]): string => { const b = new Chess(); for (const s of moves) b.move(s); return b.fen(); };

function setup() {
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
    act(() => result.current.start(CARD));
    expect(hands.say).toHaveBeenCalledTimes(1);
    expect(hands.say).toHaveBeenCalledWith(CARD.announce, 'announce');
    expect(result.current.view.phase).toBe('live');
  });

  it('a miss holds the coach reply; "Try again" undoes one ply; nothing is recorded yet', () => {
    const { hands, result, move } = setup();
    act(() => result.current.start(CARD));
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
    act(() => result.current.start(CARD));
    move('e4 e5 Nf3 Nc6 Ng5');
    act(() => result.current.playOn());
    expect(hands.replyToHeldMove).toHaveBeenCalledTimes(1);
    expect(hands.undo).not.toHaveBeenCalled();
  });

  it('the second miss at a decision draws the move and plays on', () => {
    const { hands, result, move } = setup();
    act(() => result.current.start(CARD));
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
    act(() => result.current.start(CARD));
    move('e4 e5 Nf3 Nc6 Bc4 Bc5 Nc3 Nf6 d3 d6 O-O O-O Bg5');
    move('e4 e5 Nf3 Nc6 Bc4 Bc5 Nc3 Nf6 d3 d6 O-O O-O Bg5 Bg4 h3');
    expect(hands.celebrate).toHaveBeenCalledTimes(1);
    expect(hands.celebrate).toHaveBeenCalledWith(true);
    expect(hands.record).toHaveBeenCalledTimes(1);
    expect(hands.say).toHaveBeenLastCalledWith(CARD.passLine, 'pass');
    expect(result.current.silentTurn(12)).toBe(true);
    expect(result.current.silentTurn(14)).toBe(false);
    expect(result.current.dials()).toBeNull();
  });
});
