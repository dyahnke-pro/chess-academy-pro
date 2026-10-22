import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { Chess } from 'chess.js';

vi.mock('../services/appAuditor', () => ({ logAppAudit: vi.fn() }));

import { logAppAudit } from '../services/appAuditor';
import { useMissionRunner, type MissionRunner, type MissionRunnerHands } from './useMissionRunner';
import { MISSIONS } from './registry';

type Verdict = ReturnType<MissionRunner['moved']>;
const CARD = MISSIONS['develop-and-castle'];
const sans = (m: string): string[] => m.split(/\s+/).filter(Boolean);
const fenOf = (moves: string[]): string => { const b = new Chess(); for (const s of moves) b.move(s); return b.fen(); };

function setup(): { hands: MissionRunnerHands; result: { current: MissionRunner }; move: (moves: string) => Verdict } {
  const hands: MissionRunnerHands = {
    say: vi.fn(), celebrate: vi.fn(), found: vi.fn(), endAsDraw: vi.fn(), record: vi.fn(), undo: vi.fn(), show: vi.fn(), replyToHeldMove: vi.fn(),
    briefing: vi.fn(), loadPosition: vi.fn(), recap: vi.fn(),
  };
  const { result } = renderHook(() => useMissionRunner(hands));
  const move = (moves: string): Verdict => {
    const all = sans(moves);
    let r: Verdict = 'reply';
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
    expect(result.current.dials(14)).toBeNull();
    expect(hands.endAsDraw).not.toHaveBeenCalled();
  });

  it('a fortress pass hands the page the draw, and the coach holds its reply', () => {
    const { hands, result, move } = setup();
    act(() => result.current.start([{ ...CARD, passEnds: 'draw' }]));
    expect(move('e4 e5 Nf3 Nc6 Bc4 Bc5 Nc3 Nf6 d3 d6 O-O O-O Bg5')).toBe('hold');
    expect(hands.endAsDraw).toHaveBeenCalledTimes(1);
    expect(hands.celebrate).toHaveBeenCalledWith(true);
  });
});

const MG = MISSIONS['free-piece-stay-ahead'];
/** White student. The coach plants …Ng4 at ply 15; f3 takes it. */
/** The coach's slip …Qe7 at ply 7: Nxc7+ forks king and rook (§6a). */
const PLANT_PREFIX = 'e4 e5 Nf3 Nc6 Nc3 Nf6 Nb5 Qe7';
const SLIP = { square: 'a8', line: ['b5c7', 'e8d8', 'c7a8'], depth: 1, alts: [] };
const SHUFFLE = 'Ng8 Ba6 Nh6 Bb5 Ng4 Bc4 Nf6 Be2 Ng8 Bf1 Nh6 Ba6 Ng4 Bb5 Nf6 Bc4 Ng8 Be2 Nh6 Bf1 Ng4 Ba6 Nf6 Bb5 Ng8 Bc4 Nh6 Be2 Ng4 Bf1 Nf6 Ba6 Ng8 Bb5 Nh6 Bc4 Ng4 Be2 Nf6 Bf1 Ng8 Ba6 Nh6 Bb5 Ng4 Bc4 Nf6 Be2 Ng8 Bf1 Nh6 Ba6 Ng4 Bb5 Nf6 Bc4 Ng8 Be2 Nh6 Bf1 Ng4 Ba6 Nf6 Bb5 Ng8 Bc4 Nh6 Be2';

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
    // No slip yet: the middlegame card stays open, however long it takes…
    for (let ply = 13; ply <= 13 + 2 * 29; ply += 2) act(() => result.current.coachMoved(ply, { scan: { 'no-slip': 1 } }));
    expect(hands.record).toHaveBeenCalledTimes(1);
    // …and closes, honestly, only when the game does.
    act(() => result.current.gameOver());
    expect(hands.record).toHaveBeenCalledTimes(2);
    expect(hands.record).toHaveBeenLastCalledWith(MG, { outcome: 'incomplete', plantFound: false });
  });

  it('logs mission-plant-none with the reasons when the card closes without a slip', () => {
    vi.mocked(logAppAudit).mockClear();
    const { result, move } = setup();
    act(() => result.current.start([CARD, MG]));
    move('e4 e5 Nf3 Nc6 Bc4 Bc5 Nc3 Nf6 d3 d6 O-O O-O Bg5');
    const plyOf = (n: number): number => 13 + 2 * (n - 1);
    for (let n = 1; n <= 25; n += 1) act(() => result.current.coachMoved(plyOf(n), { scan: { 'no-line': 1 } }));
    act(() => result.current.coachMoved(plyOf(26), { scan: { 'no-read': 1 } }));
    expect(vi.mocked(logAppAudit).mock.calls.some(([e]) => e.kind === 'mission-plant-none')).toBe(false);
    act(() => result.current.gameOver());
    const none = vi.mocked(logAppAudit).mock.calls.find(([e]) => e.kind === 'mission-plant-none');
    expect(none?.[0].details).toContain('"no-line":25');
    expect(none?.[0].details).toContain('"no-read":1');
  });

  it('a slip: the miss phrase for it, a second miss shows the line, a pass rewards once', () => {
    const { hands, result } = setup();
    const moveFull = (moves: string): Verdict => {
      const all = sans(moves);
      let r: Verdict = 'reply';
      act(() => { r = result.current.moved({ sans: all, studentColor: 'w' }, fenOf(all.slice(0, -1)), []); });
      return r;
    };
    act(() => result.current.start([MG]));
    act(() => result.current.coachMoved(7, { planted: SLIP }));
    expect(moveFull(`${PLANT_PREFIX} d3`)).toBe('hold');
    expect(hands.say).toHaveBeenLastCalledWith("There's a win on the board — find it.", 'miss');
    act(() => result.current.tryAgain());
    expect(moveFull(`${PLANT_PREFIX} h3`)).toBe('reply');
    expect(hands.show).toHaveBeenCalledWith({ from: 'b5', to: 'c7' });
    expect(hands.record).toHaveBeenCalledWith(MG, { outcome: 'miss-shown', missPly: 8, reason: 'missed-free-piece', plantFound: true });
    expect(hands.celebrate).not.toHaveBeenCalled();
  });

  it('a clean middlegame pass fires the reward exactly once', () => {
    const { hands, result } = setup();
    act(() => result.current.start([MG]));
    act(() => result.current.coachMoved(7, { planted: SLIP }));
    const line = sans(`${PLANT_PREFIX} Nxc7+ Kd8 Nxa8 ${SHUFFLE}`);
    for (let n = 9; n <= line.length; n += 2) {
      act(() => { result.current.moved({ sans: line.slice(0, n), studentColor: 'w' }, fenOf(line.slice(0, n - 1)), []); });
    }
    expect(hands.celebrate).toHaveBeenCalledTimes(1);
    expect(hands.say).toHaveBeenLastCalledWith(`${MG.passLine} The fork won it.`, 'pass');
    expect(hands.record).toHaveBeenCalledWith(MG, { outcome: 'pass-first-try', plantFound: true });
    // The find paid once, at the capture — before the pass, never again after.
    expect(hands.found).toHaveBeenCalledTimes(1);
  });

  it('winning the extra piece pays the find AT ONCE — the pass may be many moves away (David 2026-10-21)', () => {
    const { hands, result } = setup();
    act(() => result.current.start([MG]));
    act(() => result.current.coachMoved(7, { planted: SLIP }));
    const line = sans(`${PLANT_PREFIX} Nxc7+ Kd8 Nxa8`);
    // The fork itself is no find yet: the piece has not fallen.
    act(() => { result.current.moved({ sans: line.slice(0, 9), studentColor: 'w' }, fenOf(line.slice(0, 8)), []); });
    expect(hands.found).not.toHaveBeenCalled();
    // The capture is.
    act(() => { result.current.moved({ sans: line, studentColor: 'w' }, fenOf(line.slice(0, -1)), []); });
    expect(hands.found).toHaveBeenCalledTimes(1);
    expect(hands.found).toHaveBeenCalledWith(MG);
    expect(hands.celebrate).not.toHaveBeenCalled();
  });
});

describe('useMissionRunner — Campaign hands (WO-CAMPAIGN-MASTER Phase 0)', () => {
  it('a scenario phase replaces the board: briefing, then the position, and the coach does not answer', () => {
    const { hands, result } = setup();
    const ENDGAME = { ...MG, phase: 'endgame' as const, scenario: { providerId: 'kq-vs-k' as const },
      briefing: { novel: true, idea: 'Box the king.', demoFen: '8/8/8/8/8/8/8/8 w - - 0 1', demoSans: [], tryFen: '8/8/8/8/8/8/8/8 w - - 0 1', tryAnswersUci: [] } };
    act(() => result.current.start([CARD, ENDGAME]));
    const line = sans('e4 e5 Nf3 Nc6 Bc4 Bc5 Nc3 Nf6 d3 d6 O-O O-O Bg5');
    let verdict = '';
    act(() => { verdict = result.current.moved({ sans: line, studentColor: 'w' }, fenOf(line.slice(0, -1)), []); });
    expect(verdict).toBe('board-replaced');
    expect(hands.briefing).toHaveBeenCalledWith(ENDGAME);
    expect(hands.loadPosition).toHaveBeenCalledWith('kq-vs-k', ENDGAME);
    expect(result.current.liveCard()?.phase).toBe('endgame');
  });

  it('the game ending hands the recap over once', () => {
    const { hands, result } = setup();
    act(() => result.current.start([CARD]));
    act(() => result.current.gameOver());
    act(() => result.current.gameOver());
    expect(hands.recap).toHaveBeenCalledTimes(1);
    expect(hands.recap).toHaveBeenCalledWith({ opening: 'incomplete' });
  });
});

