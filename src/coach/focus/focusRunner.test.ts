import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { FOCUS_IDLE, stepFocus, type FocusEffect, type FocusEvent, type FocusRunState } from './focusRunner';
import type { FocusPick } from './focusPicker';
import type { FocusMove } from './focusChances';
import { DECIDING_LINE, UNANNOUNCED_LINE } from './focusCard';
import { foundOf } from './focusLines';

// Scenario tests: the runner is sequence-dependent, so each test walks a game.

const play = (fen: string, san: string): string => { const c = new Chess(fen); c.move(san); return c.fen(); };
const move = (fen: string, san: string, cpLoss: number | null = null): FocusMove => ({
  fenBefore: fen, san, fenAfter: play(fen, san), student: fen.split(' ')[1] === 'w' ? 'w' : 'b', cpLoss, lines: null,
});
const pick = (over: Partial<FocusPick> = {}): FocusPick => ({
  focus: 'loose-pieces', state: 'red', mode: 'teach', reason: 'red',
  seatStates: { defend: 'red', exploit: 'red' }, weakerSeat: 'defend', levels: ['beginner'], announced: true,
  line: 'Today: loose pieces, yours and theirs.', ...over,
});

function run(events: FocusEvent[], start: FocusRunState = FOCUS_IDLE): { state: FocusRunState; effects: FocusEffect[][] } {
  let state = start;
  const effects: FocusEffect[][] = [];
  for (const e of events) { const s = stepFocus(state, e); state = s.state; effects.push(s.effects); }
  return { state, effects };
}
// The shape of a step; the reward effect has its own tests below.
const kinds = (es: FocusEffect[]): string[] => es.filter((e) => e.kind !== 'reward').map((e) => (e.kind === 'say' ? `say:${e.line}` : e.kind));
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
  it('a routine second find is quiet — recorded and counted, never said', () => {
    const { effects, state } = run([
      { kind: 'start', pick: pick() }, board(LOOSE_KNIGHT, 7), { kind: 'moved', move: move(LOOSE_KNIGHT, 'dxe5') },
      board(KNIGHT_HIT, 9), { kind: 'moved', move: move(KNIGHT_HIT, 'Nc3') },
    ]);
    expect(kinds(effects[4])).toEqual(['record', 'turn', 'reply']);
    expect(effects[4].find((e) => e.kind === 'turn')).toMatchObject({ row: { outcome: 'found', spoke: 'none' } });
    expect(state.tally.defend.found + state.tally.exploit.found).toBe(2);
  });
  it('a find nobody asked about is silent, even right after a miss (David 2026-10-22: speak only on a miss)', () => {
    const { effects } = run([
      { kind: 'start', pick: pick() }, board(LOOSE_KNIGHT, 7), { kind: 'moved', move: move(LOOSE_KNIGHT, 'dxe5') },
      board(KNIGHT_HIT, 9), { kind: 'moved', move: move(KNIGHT_HIT, 'Kd2') }, { kind: 'play-on' },
      board(KNIGHT_HIT.replace('4K3', '3K4'), 11), { kind: 'moved', move: move(KNIGHT_HIT.replace('4K3', '3K4'), 'Nc3') },
    ]);
    expect(effects[7].some((e) => e.kind === 'say')).toBe(false);
    expect(effects[7].find((e) => e.kind === 'record')).toMatchObject({ outcome: 'held', prompted: false });
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
    const { effects } = run([{ kind: 'start', pick: tactics }, board(QUEEN_DROP, 5), { kind: 'moved', move: move(QUEEN_DROP, 'Qh5', 900) }, { kind: 'try-again' }]);
    expect(effects[2]).toEqual([{ kind: 'say', text: DECIDING_LINE, line: 'deciding' }, { kind: 'hold', deciding: true }]);
    expect(kinds(effects[3])).toEqual(['undo', 'record-deciding', 'prompt']);
  });
  it('only once: a second deciding blunder is left for Review', () => {
    const { effects } = run([
      { kind: 'start', pick: tactics }, board(QUEEN_DROP, 5), { kind: 'moved', move: move(QUEEN_DROP, 'Qh5', 900) }, { kind: 'play-on' },
      board(QUEEN_DROP, 7), { kind: 'moved', move: move(QUEEN_DROP, 'Qh5', 900) },
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

describe('the found-of count reads as English', () => {
  // countWord(0) is "no": prod tactics game 2 ended "you found no of three".
  it.each([
    [0, 3, 'you found none of the three'],
    [0, 1, 'you missed the one chance'],
    [1, 1, 'you found the one chance'],
    [5, 5, 'you found all five'],
    [2, 2, 'you found both'],
    [0, 2, 'you found neither'],
    [2, 5, 'you found two of five'],
  ])('%i of %i → "%s"', (found, chances, words) => {
    expect(foundOf(found, chances)).toBe(words);
  });
});

describe('castling is one decision a game', () => {
  const CASTLE_READY = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 8';
  const kings = pick({ focus: 'kings' });
  it('the board poses castling while it stands', () => {
    const { state } = run([{ kind: 'start', pick: kings }, board(CASTLE_READY, 15)]);
    expect(state.board?.chances.some((c) => c.kind === 'castle')).toBe(true);
  });
  it('once answered, it is never posed again that game (prod kings game 2 recorded one decision six times)', () => {
    const started = run([{ kind: 'start', pick: kings }]).state;
    const { state } = run([board(CASTLE_READY, 17)], { ...started, asked: true, resolved: ['castle'] });
    expect(state.board?.chances.some((c) => c.kind === 'castle')).toBe(false);
  });
});

describe('a castling question stands until castling is given up (prod kings game 2)', () => {
  const CASTLE_READY = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 8';
  const kings = pick({ focus: 'kings' });
  it('asked, left open, then a king walk on a board where castling is not legal: taught, and Try again that keeps it is credited', () => {
    // Ng1 blocks castling (open, nothing said); after …d6, Ke2 gives it up.
    const blocked = play(play(CASTLE_READY, 'Ng1'), 'd6');
    const { effects, state } = run([
      { kind: 'start', pick: kings }, board(CASTLE_READY, 15), { kind: 'moved', move: move(CASTLE_READY, 'Ng1') },
      board(blocked, 17), { kind: 'moved', move: move(blocked, 'Ke2') },
      { kind: 'try-again' }, { kind: 'moved', move: move(blocked, 'Nc3') },
    ]);
    expect(kinds(effects[1])).toContain('say:ask');
    expect(effects[2].some((e) => e.kind === 'record')).toBe(false);
    expect(effects[3].some((e) => e.kind === 'say')).toBe(false);
    const clue = effects[4].find((e) => e.kind === 'say');
    expect(clue).toMatchObject({ line: 'clue', text: 'Hold on — that move gives up castling for good, and your king stays in the centre.' });
    expect(effects[6].find((e) => e.kind === 'say')).toMatchObject({ line: 'credit' });
    expect(effects[6].find((e) => e.kind === 'say' && e.text.includes('your king can still castle'))).toBeDefined();
    expect(state.resolved).toContain('castle');
  });
  it('a taught delay keeps the question open: castling later counts as the find (prod kings game 3)', () => {
    const { effects } = run([
      { kind: 'start', pick: kings }, board(CASTLE_READY, 15), { kind: 'moved', move: move(CASTLE_READY, 'a3', 250) },
    ]);
    const taught = effects[2].some((e) => e.kind === 'say' && e.line === 'clue');
    expect(taught).toBe(true);
    const after = play(play(CASTLE_READY, 'a3'), 'a6');
    const later = play(play(after, 'h3'), 'h6');
    const rest = run([
      { kind: 'play-on' },
      board(after, 17), { kind: 'moved', move: move(after, 'h3', 250) },
      board(later, 19), { kind: 'moved', move: move(later, 'O-O') },
    ], run([{ kind: 'start', pick: kings }, board(CASTLE_READY, 15), { kind: 'moved', move: move(CASTLE_READY, 'a3', 250) }]).state);
    // The further delay is quiet; castling later, on its own, is a silent
    // find — recorded and counted, never said (nobody asked on that board).
    expect(rest.effects[2].some((e) => e.kind === 'say')).toBe(false);
    expect(rest.effects[4].some((e) => e.kind === 'say')).toBe(false);
    expect(rest.effects[4].find((e) => e.kind === 'record')).toMatchObject({ outcome: 'held' });
    expect(rest.state.resolved).toContain('castle');
    expect(rest.state.tally.defend.found).toBe(1);
  });
  it('the end line never says "it never came up" after the question was asked', () => {
    const { effects } = run([
      { kind: 'start', pick: kings }, board(CASTLE_READY, 15), { kind: 'moved', move: move(CASTLE_READY, 'Nc3') }, { kind: 'game-over' },
    ]);
    const end = effects[3].find((e) => e.kind === 'say');
    expect(end && 'text' in end ? end.text : '').not.toContain('never came up');
  });
});

describe('a question left open is judged on the move that answers it', () => {
  /** Your knight on d5 hit by the e6 pawn; Ra8+ checks and answers nothing. */
  const KNIGHT_PAWN = '4k3/8/4p3/3N4/8/8/8/R3K3 w - - 0 1';
  it('a check is not recorded; the next move is judged, still prompted by the question asked', () => {
    const next = play(play(KNIGHT_PAWN, 'Ra8+'), 'Kf7');
    const { effects } = run([
      { kind: 'start', pick: pick() }, board(KNIGHT_PAWN, 7), { kind: 'moved', move: move(KNIGHT_PAWN, 'Ra8+') },
      board(next, 9), { kind: 'moved', move: move(next, 'Nc3') },
    ]);
    expect(kinds(effects[1])).toEqual(['say:ask', 'prompt']);
    expect(effects[2].some((e) => e.kind === 'record' || e.kind === 'turn')).toBe(false);
    expect(effects[3]).toContainEqual({ kind: 'prompt', ply: 9 });
    expect(effects[4].find((e) => e.kind === 'record')).toMatchObject({ outcome: 'held', prompted: true });
    // It answers the question said out loud, so it is the one find spoken.
    expect(effects[4].find((e) => e.kind === 'say')).toMatchObject({ line: 'credit' });
  });
  it('a retry that leaves it open carries the told question to the next move', () => {
    const next = play(play(KNIGHT_PAWN, 'Ra8+'), 'Kf7');
    const { effects } = run([
      { kind: 'start', pick: pick() }, board(LOOSE_KNIGHT, 7), { kind: 'moved', move: move(LOOSE_KNIGHT, 'dxe5') },
      board(KNIGHT_PAWN, 9), { kind: 'moved', move: move(KNIGHT_PAWN, 'Kd2') }, { kind: 'try-again' },
      { kind: 'moved', move: move(KNIGHT_PAWN, 'Ra8+') },
      board(next, 11), { kind: 'moved', move: move(next, 'Nc3') },
    ]);
    expect(kinds(effects[4])).toContain('say:clue');
    expect(effects[6].some((e) => e.kind === 'record')).toBe(false);
    expect(effects[7]).toContainEqual({ kind: 'prompt', ply: 11 });
    expect(effects[8].find((e) => e.kind === 'record')).toMatchObject({ outcome: 'held', prompted: true });
  });
});

describe('the reward layer is tied to the focus (David 2026-10-22)', () => {
  const rewards = (es: FocusEffect[]) => es.filter((e): e is Extract<FocusEffect, { kind: 'reward' }> => e.kind === 'reward');
  it('a find pays — the asked one and a silent one alike — with the burst that matches it', () => {
    const { effects } = run([
      { kind: 'start', pick: pick() }, board(LOOSE_KNIGHT, 7), { kind: 'moved', move: move(LOOSE_KNIGHT, 'dxe5') },
      board(KNIGHT_HIT, 9), { kind: 'moved', move: move(KNIGHT_HIT, 'Nc3') },
    ]);
    expect(rewards(effects[2])).toEqual([{ kind: 'reward', reward: 'punished', square: 'e5', ply: 7 }]);
    expect(rewards(effects[4])).toEqual([{ kind: 'reward', reward: 'saved', square: 'c3', ply: 9 }]);
    expect(effects[4].some((e) => e.kind === 'say')).toBe(false);   // silent, still paid
    expect(effects[4].find((e) => e.kind === 'turn')).toMatchObject({ row: { outcome: 'found', reward: 'saved' } });
  });
  it('a taught miss pays nothing and breaks the streak; the retry find gets the smaller celebration', () => {
    const { effects } = run([
      { kind: 'start', pick: pick() }, board(LOOSE_KNIGHT, 7), { kind: 'moved', move: move(LOOSE_KNIGHT, 'dxe5') },
      board(KNIGHT_HIT, 9), { kind: 'moved', move: move(KNIGHT_HIT, 'Kd2') }, { kind: 'try-again' },
      { kind: 'moved', move: move(KNIGHT_HIT, 'Nc3') },
    ]);
    expect(rewards(effects[4])).toEqual([{ kind: 'reward', reward: null, square: null, ply: 9 }]);
    expect(effects[4].find((e) => e.kind === 'turn')).toMatchObject({ row: { outcome: 'missed', reward: null } });
    expect(rewards(effects[6])).toEqual([{ kind: 'reward', reward: 'missionRetry', square: 'c3', ply: 9 }]);
  });
  it('a move that finds one chance and misses another pays nothing; the retry pays once', () => {
    // Nc3 saves the knight from the d5 pawn but walks past the free knight on a5.
    const FIND_AND_MISS = '4k3/8/8/n2p4/4N3/8/8/R3K3 w - - 0 1';
    const { effects } = run([
      { kind: 'start', pick: pick() }, board(FIND_AND_MISS, 9), { kind: 'moved', move: move(FIND_AND_MISS, 'Nc3') },
      { kind: 'try-again' }, { kind: 'moved', move: move(FIND_AND_MISS, 'Rxa5') },
    ]);
    const turns = effects[2].filter((e): e is Extract<FocusEffect, { kind: 'turn' }> => e.kind === 'turn');
    expect(turns.map((e) => e.row.outcome).sort()).toEqual(['found', 'missed']);
    expect(rewards(effects[2])).toEqual([{ kind: 'reward', reward: null, square: null, ply: 9 }]);
    expect(turns.every((e) => e.row.reward === null)).toBe(true);
    const paid = effects.flatMap((es) => rewards(es)).filter((r) => r.reward);
    expect(paid).toEqual([{ kind: 'reward', reward: 'missionRetry', square: 'a5', ply: 9 }]);
  });
  it('two finds on one move pay once, the bigger one', () => {
    // dxe5 takes the free knight on e5 and the d4 pawn leaves the d-file: one move, one reward.
    const { effects } = run([{ kind: 'start', pick: pick() }, board(LOOSE_KNIGHT, 7), { kind: 'moved', move: move(LOOSE_KNIGHT, 'dxe5') }]);
    expect(rewards(effects[2])).toHaveLength(1);
  });
});
