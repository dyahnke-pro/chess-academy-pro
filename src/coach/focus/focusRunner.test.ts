import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { FOCUS_IDLE, stepFocus, type FocusEffect, type FocusEvent, type FocusRunState } from './focusRunner';
import type { FocusPick } from './focusPicker';
import type { FocusMove } from './focusChances';
import { DECIDING_LINE, UNANNOUNCED_LINE } from './focusCard';

// Scenario tests: the runner is sequence-dependent, so each test walks a game.

const play = (fen: string, san: string): string => { const c = new Chess(fen); c.move(san); return c.fen(); };
const move = (fen: string, san: string, cpLoss: number | null = null): FocusMove => ({
  fenBefore: fen, san, fenAfter: play(fen, san), student: fen.split(' ')[1] === 'w' ? 'w' : 'b', cpLoss, lines: null,
});
const pick = (over: Partial<FocusPick> = {}): FocusPick => ({
  focus: 'loose-pieces', state: 'red', mode: 'teach', reason: 'red',
  seatStates: { defend: 'red', exploit: 'red' }, weakerSeat: 'defend', announced: true,
  line: 'Today: loose pieces, yours and theirs.', ...over,
});

function run(events: FocusEvent[], start: FocusRunState = FOCUS_IDLE): { state: FocusRunState; effects: FocusEffect[][] } {
  let state = start;
  const effects: FocusEffect[][] = [];
  for (const e of events) { const s = stepFocus(state, e); state = s.state; effects.push(s.effects); }
  return { state, effects };
}
const kinds = (es: FocusEffect[]): string[] => es.map((e) => (e.kind === 'say' ? `say:${e.line}` : e.kind));
const board = (fen: string, ply: number, steered = false): FocusEvent => ({ kind: 'board', fen, prevFen: null, ply, student: fen.split(' ')[1] === 'w' ? 'w' : 'b', lines: null, steered });

/** A knight on e5 with nothing guarding it; d4 takes it. */
const LOOSE_KNIGHT = '4k3/8/8/4n3/3P4/8/8/3QK3 w - - 0 1';
/** Your knight on e4 attacked by the d5 pawn. */
const KNIGHT_HIT = '4k3/8/8/3p4/4N3/8/8/4K3 w - - 0 1';
/** Hanging the queen: Qh5 walks into the f6 knight. */
const QUEEN_DROP = 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 2 3';

describe('a red focus: named, the first chance asked, then quiet tests', () => {
  it('announce → ask on the first chance (prompted) → a find is credited', () => {
    const { effects } = run([{ kind: 'start', pick: pick() }, board(LOOSE_KNIGHT, 7), { kind: 'moved', move: move(LOOSE_KNIGHT, 'dxe5') }]);
    expect(effects[0]).toEqual([{ kind: 'say', text: 'Today: loose pieces, yours and theirs.', line: 'announce' }]);
    expect(kinds(effects[1])).toEqual(['say:ask', 'prompt']);
    expect(effects[1].find((e) => e.kind === 'prompt')).toEqual({ kind: 'prompt', ply: 7 });
    expect(kinds(effects[2])).toEqual(['record', 'say:credit', 'turn', 'reply']);
    expect(effects[2][0]).toMatchObject({ kind: 'record', outcome: 'held', prompted: true });
  });
  it('the second chance is NOT asked — a quiet test that counts', () => {
    const { effects } = run([
      { kind: 'start', pick: pick() }, board(LOOSE_KNIGHT, 7), { kind: 'moved', move: move(LOOSE_KNIGHT, 'dxe5') },
      board(KNIGHT_HIT, 9), { kind: 'moved', move: move(KNIGHT_HIT, 'Nc3') },
    ]);
    expect(effects[3]).toEqual([]);
    expect(effects[4][0]).toMatchObject({ kind: 'record', outcome: 'held', prompted: false });
  });
});

describe('every miss is taught on the spot', () => {
  const start: FocusEvent[] = [{ kind: 'start', pick: pick() }, board(LOOSE_KNIGHT, 7), { kind: 'moved', move: move(LOOSE_KNIGHT, 'dxe5') }, board(KNIGHT_HIT, 9)];
  it('a miss holds the coach, says the clue; Try again takes it back, files the miss, prompts the retry', () => {
    const { effects, state } = run([...start, { kind: 'moved', move: move(KNIGHT_HIT, 'Kd2') }, { kind: 'try-again' }]);
    expect(kinds(effects[4])).toEqual(['say:clue', 'turn', 'hold']);
    expect(effects[4][0]).toMatchObject({ text: 'Hold on — your knight on e4 is attacked and not defended. It\'s loose.' });
    expect(kinds(effects[5])).toEqual(['undo', 'record', 'prompt']);
    expect(effects[5][1]).toMatchObject({ outcome: 'broken', takenBack: true, prompted: false });
    expect(state.pause?.retries).toBe(1);
  });
  it('a retry that finds it is credited (prompted) and the game goes on', () => {
    const { effects } = run([...start, { kind: 'moved', move: move(KNIGHT_HIT, 'Kd2') }, { kind: 'try-again' }, { kind: 'moved', move: move(KNIGHT_HIT, 'Nc3') }]);
    expect(kinds(effects[6])).toEqual(['record', 'say:credit', 'turn', 'reply']);
    expect(effects[6][0]).toMatchObject({ outcome: 'held', prompted: true });
  });
  it('a second miss at one decision shows the answer and plays on, punished', () => {
    const { effects, state } = run([...start, { kind: 'moved', move: move(KNIGHT_HIT, 'Kd2') }, { kind: 'try-again' }, { kind: 'moved', move: move(KNIGHT_HIT, 'Kf2') }]);
    expect(kinds(effects[6])).toEqual(['record', 'show', 'say:shown', 'turn', 'reply']);
    // "keeps your knight on e4" alone read as "the knight must stay on e4".
    expect(effects[6].find((e) => e.kind === 'say')).toMatchObject({ text: 'The arrow shows a move that keeps your knight on e4 safe.' });
    expect(effects[6].find((e) => e.kind === 'reply')).toEqual({ kind: 'reply', punish: true });
    expect(state.pause).toBeNull();
  });
  it('a retry from another board is a new decision, never a second answer to the old one', () => {
    // After Try again the bar's Takeback undid one more move: the next move is
    // played from a different board and must not be judged against the knight.
    const { effects, state } = run([...start, { kind: 'moved', move: move(KNIGHT_HIT, 'Kd2') }, { kind: 'try-again' }, { kind: 'moved', move: move(LOOSE_KNIGHT, 'Kd2') }]);
    expect(kinds(effects[6])).not.toContain('say:shown');
    expect(effects[6].some((e) => e.kind === 'record' && e.chance.piece?.square === 'e4')).toBe(false);
    expect(state.pause).toBeNull();
  });
  it('Play on lets the miss stand: filed, and the coach punishes', () => {
    const { effects } = run([...start, { kind: 'moved', move: move(KNIGHT_HIT, 'Kd2') }, { kind: 'play-on' }]);
    expect(kinds(effects[5])).toEqual(['record', 'reply']);
    expect(effects[5][0]).toMatchObject({ outcome: 'broken', takenBack: false });
    expect(effects[5][1]).toEqual({ kind: 'reply', punish: true });
  });
});

describe('a short focus: unannounced, revealed by its first taught miss', () => {
  const shortPick = pick({ state: 'short', mode: 'test', announced: false, line: UNANNOUNCED_LINE });
  it('no question, no credit, no prompt while unrevealed', () => {
    const { effects } = run([{ kind: 'start', pick: shortPick }, board(LOOSE_KNIGHT, 7), { kind: 'moved', move: move(LOOSE_KNIGHT, 'dxe5') }]);
    expect(effects[0]).toEqual([{ kind: 'say', text: UNANNOUNCED_LINE, line: 'announce' }]);
    expect(effects[1]).toEqual([]);
    expect(kinds(effects[2])).toEqual(['record', 'turn', 'reply']);
    expect(effects[2][0]).toMatchObject({ prompted: false });
  });
  it('after a taught miss, every later chance of the game is prompted', () => {
    const { effects, state } = run([
      { kind: 'start', pick: shortPick }, board(KNIGHT_HIT, 7), { kind: 'moved', move: move(KNIGHT_HIT, 'Kd2') }, { kind: 'play-on' },
      board(LOOSE_KNIGHT, 9),
    ]);
    expect(state.announced).toBe(true);
    expect(effects[4]).toEqual([{ kind: 'prompt', ply: 9 }]);
  });
});

describe('the deciding blunder — once a game, outside the focus', () => {
  const tactics = pick({ focus: 'tactics' });
  it('"That one decides the game. Want it back?" then Take back files it', () => {
    const { effects } = run([{ kind: 'start', pick: tactics }, board(QUEEN_DROP, 5), { kind: 'moved', move: move(QUEEN_DROP, 'Qh5') }, { kind: 'try-again' }]);
    expect(effects[2]).toEqual([{ kind: 'say', text: DECIDING_LINE, line: 'deciding' }, { kind: 'hold', deciding: true }]);
    expect(kinds(effects[3])).toEqual(['undo', 'record-deciding', 'prompt']);
  });
  it('only once: a second deciding blunder is left for Review', () => {
    const { effects } = run([
      { kind: 'start', pick: tactics }, board(QUEEN_DROP, 5), { kind: 'moved', move: move(QUEEN_DROP, 'Qh5') }, { kind: 'play-on' },
      board(QUEEN_DROP, 7), { kind: 'moved', move: move(QUEEN_DROP, 'Qh5') },
    ]);
    expect(effects[5]).toEqual([{ kind: 'reply', punish: false }]);
  });
});

describe('steered chances and the end line', () => {
  it('a defend chance the coach steered into is marked steered', () => {
    const { effects } = run([{ kind: 'start', pick: pick() }, board(KNIGHT_HIT, 9, true), { kind: 'moved', move: move(KNIGHT_HIT, 'Nc3') }]);
    expect(effects[1]).toContainEqual({ kind: 'steered', ply: 9 });
    expect(effects[2][0]).toMatchObject({ kind: 'record', steered: true });
  });
  it('the end line counts the decisions, first tries only', () => {
    const { effects } = run([
      { kind: 'start', pick: pick() }, board(LOOSE_KNIGHT, 7), { kind: 'moved', move: move(LOOSE_KNIGHT, 'dxe5') },
      board(KNIGHT_HIT, 9), { kind: 'moved', move: move(KNIGHT_HIT, 'Kd2') }, { kind: 'try-again' }, { kind: 'moved', move: move(KNIGHT_HIT, 'Nc3') },
      { kind: 'game-over' },
    ]);
    const end = effects[7].find((e) => e.kind === 'end');
    expect(end).toMatchObject({ text: 'Loose pieces today: you found one of two. Review has the rest.' });
  });
  it('a focus that never came up says so', () => {
    const { effects } = run([{ kind: 'start', pick: pick() }, { kind: 'game-over' }]);
    expect(effects[1][0]).toMatchObject({ text: 'Loose pieces today: it never came up this game. Review has the rest.' });
  });
});
