import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { IDLE, missionDials, missionSilentTurn, stepMission, type RunnerState } from './missionRunner';
import { MISSIONS } from './registry';

const CARD = MISSIONS['develop-and-castle'];
const sans = (moves: string): string[] => moves.split(/\s+/).filter(Boolean);
const fenOf = (moves: string[]): string => { const b = new Chess(); for (const s of moves) b.move(s); return b.fen(); };
const moved = (state: RunnerState, moves: string, studentColor: 'w' | 'b' = 'w') => {
  const all = sans(moves);
  return stepMission(state, { kind: 'moved', game: { sans: all, studentColor }, fenBefore: fenOf(all.slice(0, -1)), candidatesUci: ['f1c4'] });
};
const live = (): RunnerState => stepMission(IDLE, { kind: 'start', card: CARD }).state;

describe('the mission runner — transitions', () => {
  it('start announces once and goes live', () => {
    const s = stepMission(IDLE, { kind: 'start', card: CARD });
    expect(s.state.phase).toBe('live');
    expect(s.effects).toEqual([{ kind: 'say', line: 'announce', text: CARD.announce }]);
  });

  it('a pending move lets the coach reply, silently', () => {
    const s = moved(live(), 'e4');
    expect(s.effects).toEqual([{ kind: 'reply' }]);
    expect(s.state.phase).toBe('live');
  });

  it('a miss pauses BEFORE the coach replies, with the fixed phrase', () => {
    const s = moved(live(), 'e4 e5 Nf3 Nc6 Ng5');
    expect(s.state.phase).toBe('paused');
    expect(s.state.pause).toEqual({ ply: 4, reason: 'repeat-move' });
    expect(s.effects).toEqual([{ kind: 'say', line: 'miss', text: CARD.missPhrase }, { kind: 'hold' }]);
    expect(s.effects.some((e) => e.kind === 'reply')).toBe(false);
  });

  it('"Try again" undoes the student move only and the mission stays live', () => {
    const paused = moved(live(), 'e4 e5 Nf3 Nc6 Ng5').state;
    const s = stepMission(paused, { kind: 'try-again' });
    expect(s.effects).toEqual([{ kind: 'undo' }]);
    expect(s.state.phase).toBe('live');
  });

  it('a second miss at the same decision shows the move and plays on — miss-shown', () => {
    let st = moved(live(), 'e4 e5 Nf3 Nc6 Ng5').state;
    st = stepMission(st, { kind: 'try-again' }).state;
    const s = moved(st, 'e4 e5 Nf3 Nc6 Nh4');
    expect(s.state).toMatchObject({ phase: 'resolved', outcome: 'miss-shown', resolvedAtPly: 4 });
    expect(s.effects).toEqual([
      { kind: 'say', line: 'miss', text: CARD.missPhrase },
      { kind: 'show', move: { from: 'f1', to: 'c4' } },
      { kind: 'record', outcome: 'miss-shown', missPly: 4, reason: 'repeat-move' },
      { kind: 'reply' },
    ]);
  });

  it('a clean pass celebrates in full and records pass-first-try', () => {
    const s = moved(live(), 'e4 e5 Nf3 Nc6 Bc4 Bc5 Nc3 Nf6 d3 d6 O-O O-O Bg5');
    expect(s.state).toMatchObject({ phase: 'resolved', outcome: 'pass-first-try', resolvedAtPly: 12 });
    expect(s.effects).toEqual([
      { kind: 'celebrate', firstTry: true },
      { kind: 'say', line: 'pass', text: CARD.passLine },
      { kind: 'record', outcome: 'pass-first-try' },
      { kind: 'reply' },
    ]);
  });

  it('a pass after a retried miss is a retry pass — the smaller celebration', () => {
    let st = moved(live(), 'e4 e5 Nf3 Nc6 Ng5').state;
    st = stepMission(st, { kind: 'try-again' }).state;
    const s = moved(st, 'e4 e5 Nf3 Nc6 Bc4 Bc5 Nc3 Nf6 d3 d6 O-O O-O Bg5');
    expect(s.state.outcome).toBe('pass-retry');
    expect(s.effects[0]).toEqual({ kind: 'celebrate', firstTry: false });
  });

  it('"Play on" forgives that ply, lets the coach reply, and the check walks past it', () => {
    let st = moved(live(), 'e4 e5 Nf3 Nc6 Ng5').state;
    const on = stepMission(st, { kind: 'play-on' });
    expect(on.effects).toEqual([{ kind: 'reply' }]);
    st = on.state;
    expect(moved(st, 'e4 e5 Nf3 Nc6 Ng5 d6 d3').effects).toEqual([{ kind: 'reply' }]);
  });

  it('still pending at the closing move: incomplete, silently', () => {
    // 15 moves each side of pawn shuffles that never castle.
    const shuffle = 'a3 a6 Ra2 Ra7 Ra1 Ra8 Ra2 Ra7 Ra1 Ra8 Ra2 Ra7 Ra1 Ra8 Ra2 Ra7 Ra1 Ra8 Ra2 Ra7 Ra1 Ra8 Ra2 Ra7 Ra1 Ra8 Ra2 Ra7 Ra1';
    const s = moved(live(), shuffle);
    expect(sans(shuffle)).toHaveLength(29); // White's 15th move
    expect(s.state).toMatchObject({ phase: 'resolved', outcome: 'incomplete' });
    expect(s.effects).toEqual([{ kind: 'record', outcome: 'incomplete' }, { kind: 'reply' }]);
  });

  it('a move while paused waits with the rewind', () => {
    const paused = moved(live(), 'e4 e5 Nf3 Nc6 Ng5').state;
    expect(moved(paused, 'e4 e5 Nf3 Nc6 Ng5 d6').effects).toEqual([{ kind: 'hold' }]);
  });

  it('with no mission every move simply replies', () => {
    expect(moved(IDLE, 'e4 e5 Nf3 Nc6 Ng5').effects).toEqual([{ kind: 'reply' }]);
  });
});

describe('the mission runner — silence and dials', () => {
  it('turns are silent while live or paused, and on the move that resolves it — then open', () => {
    expect(missionSilentTurn(IDLE, 0)).toBe(false);
    const l = live();
    expect(missionSilentTurn(l, 4)).toBe(true);
    const done = moved(l, 'e4 e5 Nf3 Nc6 Bc4 Bc5 Nc3 Nf6 d3 d6 O-O O-O Bg5').state;
    expect(missionSilentTurn(done, 12)).toBe(true);
    expect(missionSilentTurn(done, 14)).toBe(false);
  });

  it('the coach plays under the card dials only while the mission is unresolved', () => {
    expect(missionDials(live())).toEqual({ attacksOnPieces: 'off', plannedTrap: 'off' });
    const done = moved(live(), 'e4 e5 Nf3 Nc6 Bc4 Bc5 Nc3 Nf6 d3 d6 O-O O-O Bg5').state;
    expect(missionDials(done)).toBeNull();
    expect(missionDials(IDLE)).toBeNull();
  });

  it('a takeback past the held move lifts the pause and forgets later forgiveness', () => {
    const paused = moved(live(), 'e4 e5 Nf3 Nc6 Ng5').state;
    expect(stepMission(paused, { kind: 'rewind', plies: 4 }).state).toMatchObject({ phase: 'live', pause: null });
    const on = stepMission(paused, { kind: 'play-on' }).state;
    expect([...stepMission(on, { kind: 'rewind', plies: 3 }).state.forgiven]).toEqual([]);
  });
});
