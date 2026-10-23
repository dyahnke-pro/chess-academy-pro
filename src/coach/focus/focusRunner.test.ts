import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { FOCUS_IDLE, focusPlantAsk, stepFocus, type FocusEffect, type FocusEvent, type FocusRunState, type PlantedSeat } from './focusRunner';
import type { FocusSetup } from './focusSetup';
import type { FocusMove } from './focusChances';
import { DECIDING_LINE, PREGAME_LINE } from './focusCard';
import type { RungGame, TacticsRung } from './focusRung';

// Scenario tests: the runner is sequence-dependent, so each test walks a game.

const play = (fen: string, san: string): string => { const c = new Chess(fen); c.move(san); return c.fen(); };
const move = (fen: string, san: string, cpLoss: number | null = null): FocusMove => ({
  fenBefore: fen, san, fenAfter: play(fen, san), student: fen.split(' ')[1] === 'w' ? 'w' : 'b', cpLoss, lines: null,
});
const setup = (over: Partial<FocusSetup> = {}): FocusSetup => ({
  focus: 'tactics', rung: 0, reason: 'seed', window: [],
  seatStates: { defend: 'red', exploit: 'red' }, levels: ['beginner'], targetPly: 12, line: PREGAME_LINE, tempoBest: 0, ...over,
});
const at = (rung: TacticsRung, over: Partial<FocusSetup> = {}): FocusSetup => setup({ rung, ...over });

function run(events: FocusEvent[], start: FocusRunState = FOCUS_IDLE): { state: FocusRunState; effects: FocusEffect[][] } {
  let state = start;
  const effects: FocusEffect[][] = [];
  for (const e of events) { const s = stepFocus(state, e); state = s.state; effects.push(s.effects); }
  return { state, effects };
}
// The shape of a step; the reward effect has its own tests below.
const kinds = (es: FocusEffect[]): string[] => es.filter((e) => e.kind !== 'reward').map((e) => (e.kind === 'say' ? `say:${e.line}` : e.kind));
const board = (fen: string, ply: number, steered = false, planted: PlantedSeat = null, prevFen: string | null = null): FocusEvent => ({ kind: 'board', fen, prevFen, ply, student: fen.split(' ')[1] === 'w' ? 'w' : 'b', lines: null, steered, planted });
const turnRow = (es: FocusEffect[]) => es.find((e): e is Extract<FocusEffect, { kind: 'turn' }> => e.kind === 'turn')?.row;
const rewards = (es: FocusEffect[]) => es.filter((e): e is Extract<FocusEffect, { kind: 'reward' }> => e.kind === 'reward');

/** A knight on e5 with nothing guarding it; d4 takes it. */
const LOOSE_KNIGHT = '4k3/8/8/4n3/3P4/8/8/3QK3 w - - 0 1';
/** …that knight just came from f6: the plainest chance, rung 0. */
const KNIGHT_CAME = '4k3/8/5n2/8/3P4/8/8/3QK3 b - - 0 1';
/** Your knight on e4 attacked by the d5 pawn. */
const KNIGHT_HIT = '4k3/8/8/3p4/4N3/8/8/4K3 w - - 0 1';
/** Off the focus: 1.f3 e5 2.g4?? allows …Qh4# — nothing of yours hangs. */
const MATE_DROP = 'rnbqkbnr/pppp1ppp/8/4p3/8/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 2';
/** Hanging the queen: Qh5 walks into the f6 knight — a loose-piece miss, the focus's own. */
const QUEEN_DROP = 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 2 3';

describe('every game is the tactics focus: the pre-game line, then quiet unless a miss', () => {
  it('the same line for everyone, before move 1', () => {
    const { effects } = run([{ kind: 'start', setup: at(2) }]);
    expect(effects[0]).toEqual([{ kind: 'say', text: PREGAME_LINE, line: 'announce' }]);
  });
  it('rung 0 asks its first chance (prompted); the find that answers it is the one credited out loud', () => {
    const { effects } = run([{ kind: 'start', setup: at(0) }, board(LOOSE_KNIGHT, 7), { kind: 'moved', move: move(LOOSE_KNIGHT, 'dxe5') }]);
    expect(kinds(effects[1])).toEqual(['say:ask', 'prompt']);
    expect(effects[1].find((e) => e.kind === 'prompt')).toEqual({ kind: 'prompt', ply: 7 });
    expect(kinds(effects[2])).toEqual(['record', 'say:credit', 'turn', 'reply']);
    expect(effects[2][0]).toMatchObject({ kind: 'record', outcome: 'held', prompted: true });
  });
  it('rung 0 asks THEIR chance when your side has none on the board', () => {
    const { effects } = run([{ kind: 'start', setup: at(0) }, board(KNIGHT_HIT, 7)]);
    expect(effects[1][0]).toMatchObject({ kind: 'say', line: 'ask', text: expect.stringMatching(/safe|loose/) });
  });
  it('rungs 1–3 never ask', () => {
    for (const r of [1, 2, 3] as const) {
      const { effects } = run([{ kind: 'start', setup: at(r) }, board(LOOSE_KNIGHT, 7)]);
      expect(effects[1].some((e) => e.kind === 'say'), `rung ${r}`).toBe(false);
    }
  });
  it('after the ask, finds are silent — recorded, counted, paid, never said', () => {
    const { effects, state } = run([
      { kind: 'start', setup: at(0) }, board(LOOSE_KNIGHT, 7), { kind: 'moved', move: move(LOOSE_KNIGHT, 'dxe5') },
      board(KNIGHT_HIT, 9), { kind: 'moved', move: move(KNIGHT_HIT, 'Nc3') },
    ]);
    expect(effects[3]).toEqual([]);
    expect(kinds(effects[4])).toEqual(['record', 'turn', 'reply']);
    expect(effects[4][0]).toMatchObject({ kind: 'record', outcome: 'held', prompted: false });
    expect(turnRow(effects[4])).toMatchObject({ outcome: 'found', spoke: 'none', rung: 0, held: false });
    expect(state.tally.defend.found + state.tally.exploit.found).toBe(2);
  });
});

describe('rung 0: a miss holds the board; never the answer unasked; Show me after a second miss', () => {
  const start: FocusEvent[] = [{ kind: 'start', setup: at(0) }, board(LOOSE_KNIGHT, 7), { kind: 'moved', move: move(LOOSE_KNIGHT, 'dxe5') }, board(KNIGHT_HIT, 9)];
  it('a miss says the clue and holds; Try again takes it back, files the miss, prompts the retry', () => {
    const { effects, state } = run([...start, { kind: 'moved', move: move(KNIGHT_HIT, 'Kd2') }, { kind: 'try-again' }]);
    expect(kinds(effects[4])).toEqual(['say:clue', 'turn', 'hold']);
    expect(effects[4].find((e) => e.kind === 'say')).toMatchObject({ text: 'Hold on — your knight on e4 is attacked and not defended. It\'s loose.' });
    expect(turnRow(effects[4])).toMatchObject({ held: true, spoke: 'clue' });
    expect(kinds(effects[5])).toEqual(['undo', 'taken-back', 'record', 'prompt']);
    // The miss the coach stopped, taken back: still a first-try miss for the puzzles (David 2026-10-23).
    expect(effects[5][1]).toEqual({ kind: 'taken-back', fen: KNIGHT_HIT, san: 'Kd2' });
    expect(effects[5][2]).toMatchObject({ outcome: 'broken', takenBack: true, prompted: false });
    expect(state.pause?.retries).toBe(1);
  });
  it('a retry that finds it is credited (prompted), pays the retry reward, and the game goes on', () => {
    const { effects, state } = run([...start, { kind: 'moved', move: move(KNIGHT_HIT, 'Kd2') }, { kind: 'try-again' }, { kind: 'moved', move: move(KNIGHT_HIT, 'Nc3') }]);
    expect(kinds(effects[6])).toEqual(['record', 'say:credit', 'turn', 'reply']);
    expect(effects[6][0]).toMatchObject({ outcome: 'held', prompted: true });
    expect(rewards(effects[6])).toEqual([{ kind: 'reward', reward: 'missionRetry', square: 'c3', ply: 9 }]);
    expect(state.missed, 'found on the retry: not on the recap').toEqual([]);
  });
  it('a second miss NEVER shows the answer: it holds for Show me / Play on', () => {
    const { effects, state } = run([...start, { kind: 'moved', move: move(KNIGHT_HIT, 'Kd2') }, { kind: 'try-again' }, { kind: 'moved', move: move(KNIGHT_HIT, 'Kf2') }]);
    expect(kinds(effects[6])).toEqual(['record', 'turn', 'hold']);
    expect(effects[6].some((e) => e.kind === 'show' || e.kind === 'say')).toBe(false);
    expect(state.pause?.retries).toBe(2);
    expect(state.missed).toHaveLength(1);
  });
  it('Show me is the student\'s tap: the arrow, the line, and the coach plays on', () => {
    const { effects, state } = run([...start, { kind: 'moved', move: move(KNIGHT_HIT, 'Kd2') }, { kind: 'try-again' }, { kind: 'moved', move: move(KNIGHT_HIT, 'Kf2') }, { kind: 'show-me' }]);
    expect(kinds(effects[7])).toEqual(['show', 'say:shown', 'turn', 'reply']);
    expect(effects[7].find((e) => e.kind === 'say')).toMatchObject({ text: 'The arrow shows a move that keeps your knight on e4 safe.' });
    expect(effects[7].find((e) => e.kind === 'reply')).toEqual({ kind: 'reply', punish: true });
    expect(state.pause).toBeNull();
  });
  it('Play on after the second miss shows nothing — the coach punishes', () => {
    const { effects, state } = run([...start, { kind: 'moved', move: move(KNIGHT_HIT, 'Kd2') }, { kind: 'try-again' }, { kind: 'moved', move: move(KNIGHT_HIT, 'Kf2') }, { kind: 'play-on' }]);
    expect(effects[7]).toEqual([{ kind: 'reply', punish: true }]);
    expect(state.missed, 'filed once').toHaveLength(1);
  });
  it('Show me does nothing before a second miss', () => {
    const { effects } = run([...start, { kind: 'moved', move: move(KNIGHT_HIT, 'Kd2') }, { kind: 'show-me' }]);
    expect(effects[5]).toEqual([]);
  });
  it('a retry from another board is a new decision, never a second answer to the old one', () => {
    const { effects, state } = run([...start, { kind: 'moved', move: move(KNIGHT_HIT, 'Kd2') }, { kind: 'try-again' }, { kind: 'moved', move: move(LOOSE_KNIGHT, 'Kd2') }]);
    expect(effects[6].some((e) => e.kind === 'record' && e.chance.piece?.square === 'e4')).toBe(false);
    expect(state.pause).toBeNull();
  });
  it('the game ends with Try again / Play on still up: the miss stands — filed and on the card (prod record 2026-10-23)', () => {
    const { effects, state } = run([...start, { kind: 'moved', move: move(KNIGHT_HIT, 'Kd2') }, { kind: 'game-over', at: 100 }]);
    const last = effects[effects.length - 1];
    expect(last.filter((e) => e.kind === 'record')).toEqual([expect.objectContaining({ outcome: 'broken', takenBack: false })]);
    expect(last.some((e) => e.kind === 'reply'), 'the game is over: no coach reply').toBe(false);
    const end = last.find((e) => e.kind === 'end');
    expect(end?.kind === 'end' ? end.result.missed.map((m) => m.label) : null).toEqual(['Move 5 — your knight on e4 was loose']);
    expect(state.pause).toBeNull();
  });
  it('the game ends during the retry: the miss was filed at Try again, and stands on the card', () => {
    const { effects } = run([...start, { kind: 'moved', move: move(KNIGHT_HIT, 'Kd2') }, { kind: 'try-again' }, { kind: 'game-over', at: 100 }]);
    const last = effects[effects.length - 1];
    expect(last.filter((e) => e.kind === 'record'), 'filed once, at Try again').toEqual([]);
    const end = last.find((e) => e.kind === 'end');
    expect(end?.kind === 'end' ? end.result.missed.length : null).toBe(1);
  });
  it('twin: ended after a second miss — on the card once, never twice', () => {
    const { effects } = run([...start, { kind: 'moved', move: move(KNIGHT_HIT, 'Kd2') }, { kind: 'try-again' }, { kind: 'moved', move: move(KNIGHT_HIT, 'Kf2') }, { kind: 'game-over', at: 100 }]);
    const end = effects[effects.length - 1].find((e) => e.kind === 'end');
    expect(end?.kind === 'end' ? end.result.missed.length : null).toBe(1);
  });
  it('Play on at the first decision lets the miss stand: filed, on the recap, punished', () => {
    const { effects, state } = run([...start, { kind: 'moved', move: move(KNIGHT_HIT, 'Kd2') }, { kind: 'play-on' }]);
    expect(kinds(effects[5])).toEqual(['record', 'reply']);
    expect(effects[5][0]).toMatchObject({ outcome: 'broken', takenBack: false });
    expect(effects[5][1]).toEqual({ kind: 'reply', punish: true });
    expect(state.missed[0]).toMatchObject({ ply: 9, seat: 'defend', kind: 'save', label: 'Move 5 — your knight on e4 was loose', solve: 1, fenBefore: KNIGHT_HIT });
  });
});

describe('rung 1: the clue and Try again, then a second miss plays on with no answer', () => {
  it('no Show me at rung 1', () => {
    const { effects, state } = run([
      { kind: 'start', setup: at(1) }, board(KNIGHT_HIT, 9), { kind: 'moved', move: move(KNIGHT_HIT, 'Kd2') },
      { kind: 'try-again' }, { kind: 'moved', move: move(KNIGHT_HIT, 'Kf2') },
    ]);
    expect(kinds(effects[2])).toEqual(['say:clue', 'turn', 'hold']);
    expect(kinds(effects[4])).toEqual(['record', 'turn', 'reply']);
    expect(effects[4].find((e) => e.kind === 'reply')).toEqual({ kind: 'reply', punish: true });
    expect(effects[4].some((e) => e.kind === 'show' || e.kind === 'say')).toBe(false);
    expect(state.pause).toBeNull();
    expect(state.missed).toHaveLength(1);
  });
});

describe('rungs 2–3: no pause and no clue — the coach punishes, the recap shows it', () => {
  it.each([2, 3] as const)('rung %i: a miss is recorded silently and punished', (r) => {
    const { effects, state } = run([{ kind: 'start', setup: at(r) }, board(KNIGHT_HIT, 9), { kind: 'moved', move: move(KNIGHT_HIT, 'Kd2') }]);
    expect(kinds(effects[2])).toEqual(['record', 'turn', 'reply']);
    expect(effects[2].some((e) => e.kind === 'say' || e.kind === 'hold')).toBe(false);
    expect(effects[2].find((e) => e.kind === 'reply')).toEqual({ kind: 'reply', punish: true });
    expect(turnRow(effects[2])).toMatchObject({ outcome: 'missed', held: false, rung: r });
    expect(state.pause).toBeNull();
    expect(state.missed).toHaveLength(1);
    expect(rewards(effects[2])).toEqual([{ kind: 'reward', reward: null, square: null, ply: 9 }]);
  });
  it('no deciding-blunder rescue at the top rungs', () => {
    const { effects } = run([{ kind: 'start', setup: at(2) }, board(MATE_DROP, 3), { kind: 'moved', move: move(MATE_DROP, 'g4', 900) }]);
    expect(effects[2]).toEqual([{ kind: 'reply', punish: false }]);
  });
});

describe('the deciding blunder — once a game, rungs 0–1, outside the focus', () => {
  it('"That one decides the game. Want it back?" then Take back files it', () => {
    const { effects } = run([{ kind: 'start', setup: at(1) }, board(MATE_DROP, 3), { kind: 'moved', move: move(MATE_DROP, 'g4', 900) }, { kind: 'try-again' }]);
    expect(effects[2]).toEqual([{ kind: 'say', text: DECIDING_LINE, line: 'deciding' }, { kind: 'hold', deciding: true }]);
    expect(kinds(effects[3])).toEqual(['undo', 'taken-back', 'record-deciding', 'prompt']);
    expect(effects[3][1]).toEqual({ kind: 'taken-back', fen: MATE_DROP, san: 'g4' });
  });
  it('twin: Play on keeps the move in the game — nothing is flagged as taken back (the game\'s own analysis files it)', () => {
    const { effects } = run([{ kind: 'start', setup: at(1) }, board(MATE_DROP, 3), { kind: 'moved', move: move(MATE_DROP, 'g4', 900) }, { kind: 'play-on' }]);
    expect(effects[3].some((e) => e.kind === 'taken-back')).toBe(false);
  });
  it('only once: a second deciding blunder is left for Review', () => {
    const { effects } = run([
      { kind: 'start', setup: at(1) }, board(MATE_DROP, 3), { kind: 'moved', move: move(MATE_DROP, 'g4', 900) }, { kind: 'play-on' },
      board(MATE_DROP, 5), { kind: 'moved', move: move(MATE_DROP, 'g4', 900) },
    ]);
    expect(effects[5]).toEqual([{ kind: 'reply', punish: false }]);
  });
  it('a hung queen is the focus\'s own miss: the clue, never the deciding line', () => {
    const { effects } = run([{ kind: 'start', setup: at(1) }, board(QUEEN_DROP, 5), { kind: 'moved', move: move(QUEEN_DROP, 'Qh5', 900) }]);
    expect(kinds(effects[2])).toEqual(['say:clue', 'turn', 'hold']);
    expect(effects[2].find((e) => e.kind === 'hold')).toEqual({ kind: 'hold', deciding: false });
  });
});

describe('the rung moves on unprompted answers at the rung (either seat)', () => {
  const ended = (events: FocusEvent[]) => {
    const { effects } = run([...events, { kind: 'game-over', at: 100 }]);
    const last = effects[effects.length - 1];
    return { last, end: last.find((e): e is Extract<FocusEffect, { kind: 'end' }> => e.kind === 'end') };
  };
  const two: RungGame = { rung: 0, found: 2, missed: 0, at: 1 };
  it('the third find in the window steps up: the line, its own reward, the next rung', () => {
    const { last, end } = ended([
      { kind: 'start', setup: at(0, { window: [two], reason: 'games' }) },
      board(KNIGHT_HIT, 7), { kind: 'moved', move: move(KNIGHT_HIT, 'Nc3') },            // asked — does not count
      board(LOOSE_KNIGHT, 9, false, null, KNIGHT_CAME), { kind: 'moved', move: move(LOOSE_KNIGHT, 'dxe5') }, // unprompted, rung 0
    ]);
    expect(end?.result).toMatchObject({ rung: 0, atRung: { found: 1, missed: 0 }, next: { rung: 1, step: 'up' }, progress: 'Tactics: Intermediate! 0 of 3 finds to Strong intermediate' });
    expect(last.find((e) => e.kind === 'say' && e.line === 'rung-up')).toMatchObject({ text: 'Tactics: Intermediate!' });
    expect(rewards(last)).toEqual([{ kind: 'reward', reward: 'levelUp', square: null, ply: 9, label: 'TACTICS: INTERMEDIATE' }]);
  });
  it('a prompted find never counts — the same game with only the asked find stays', () => {
    const { last, end } = ended([
      { kind: 'start', setup: at(0, { window: [two], reason: 'games' }) },
      board(KNIGHT_HIT, 7), { kind: 'moved', move: move(KNIGHT_HIT, 'Nc3') },
    ]);
    expect(end?.result).toMatchObject({ atRung: { found: 0, missed: 0 }, next: { rung: 0, step: null }, progress: '2 of 3 finds to Intermediate' });
    expect(last.some((e) => e.kind === 'say' && e.line === 'rung-up')).toBe(false);
  });
  it('a chance below the rung never counts (rung 2, a free piece)', () => {
    const { end } = ended([{ kind: 'start', setup: at(2) }, board(LOOSE_KNIGHT, 9, false, null, KNIGHT_CAME), { kind: 'moved', move: move(LOOSE_KNIGHT, 'dxe5') }]);
    expect(end?.result.atRung).toEqual({ found: 0, missed: 0 });
    expect(end?.result.tally.exploit.found).toBe(1);
  });
  it('five games at the rung below 75% step back — no line, no reward', () => {
    const poor: RungGame[] = [1, 2, 3, 4].map((i) => ({ rung: 1, found: 0, missed: 1, at: i }));
    const { last, end } = ended([{ kind: 'start', setup: at(1, { window: poor, reason: 'games' }) }, board(KNIGHT_HIT, 9), { kind: 'moved', move: move(KNIGHT_HIT, 'Kd2') }, { kind: 'play-on' }]);
    expect(end?.result.next).toEqual({ rung: 0, step: 'back' });
    expect(rewards(last)).toEqual([]);
  });
  it('the top rung has no progress line', () => {
    const { end } = ended([{ kind: 'start', setup: at(3) }]);
    expect(end?.result.progress).toBeNull();
  });
});

describe('the end line and the recap', () => {
  it('your chances and theirs, first tries only', () => {
    const { effects } = run([
      { kind: 'start', setup: at(0) }, board(LOOSE_KNIGHT, 7), { kind: 'moved', move: move(LOOSE_KNIGHT, 'dxe5') },
      board(KNIGHT_HIT, 9), { kind: 'moved', move: move(KNIGHT_HIT, 'Kd2') }, { kind: 'try-again' }, { kind: 'moved', move: move(KNIGHT_HIT, 'Nc3') },
      { kind: 'game-over', at: 100 },
    ]);
    expect(effects[7].find((e) => e.kind === 'end')).toMatchObject({ text: 'Tactics today: you found your one chance, and their one tactic landed. Review has the rest.' });
  });
  it('a game that ended before your chance says so', () => {
    const { effects } = run([{ kind: 'start', setup: at(0) }, { kind: 'game-over', at: 100 }]);
    expect(effects[1][0]).toMatchObject({ text: 'Tactics today: the game ended before your chance came. Review has the rest.' });
    expect(effects[1].find((e) => e.kind === 'end')).toMatchObject({ result: { presented: null, missed: [] } });
  });
  it('the recap lists every miss that stood, never the answer', () => {
    const { effects } = run([
      { kind: 'start', setup: at(2) }, board(KNIGHT_HIT, 9), { kind: 'moved', move: move(KNIGHT_HIT, 'Kd2') },
      board(LOOSE_KNIGHT, 11), { kind: 'moved', move: move(LOOSE_KNIGHT, 'Kf1') },
      { kind: 'game-over', at: 100 },
    ]);
    const end = effects[5].find((e): e is Extract<FocusEffect, { kind: 'end' }> => e.kind === 'end');
    expect(end?.result.missed.map((m) => m.label)).toEqual(['Move 5 — your knight on e4 was loose', 'Move 6 — a loose piece of theirs']);
    expect(end?.result.missed.every((m) => !/[KQRBN]?x?[a-h][1-8]\+?$/.test(m.label.replace(/on [a-h][1-8]/, '')))).toBe(true);
  });
});

describe('a question left open is judged on the move that answers it', () => {
  /** Your knight on d5 hit by the e6 pawn; Ra8+ checks and answers nothing. */
  const KNIGHT_PAWN = '4k3/8/4p3/3N4/8/8/8/R3K3 w - - 0 1';
  it('a check is not recorded; the next move is judged, still prompted by the question asked', () => {
    const next = play(play(KNIGHT_PAWN, 'Ra8+'), 'Kf7');
    const { effects } = run([
      { kind: 'start', setup: at(0) }, board(KNIGHT_PAWN, 7), { kind: 'moved', move: move(KNIGHT_PAWN, 'Ra8+') },
      board(next, 9), { kind: 'moved', move: move(next, 'Nc3') },
    ]);
    expect(kinds(effects[1])).toEqual(['say:ask', 'prompt']);
    expect(effects[2].some((e) => e.kind === 'record' || e.kind === 'turn')).toBe(false);
    expect(effects[3]).toContainEqual({ kind: 'prompt', ply: 9 });
    expect(effects[4].find((e) => e.kind === 'record')).toMatchObject({ outcome: 'held', prompted: true });
    expect(effects[4].find((e) => e.kind === 'say')).toMatchObject({ line: 'credit' });
  });
});

describe('the reward layer is tied to the focus (David 2026-10-22)', () => {
  it('a find pays — the asked one and a silent one alike — with the burst that matches it', () => {
    const { effects } = run([
      { kind: 'start', setup: at(0) }, board(LOOSE_KNIGHT, 7), { kind: 'moved', move: move(LOOSE_KNIGHT, 'dxe5') },
      board(KNIGHT_HIT, 9), { kind: 'moved', move: move(KNIGHT_HIT, 'Nc3') },
    ]);
    expect(rewards(effects[2])).toEqual([{ kind: 'reward', reward: 'punished', square: 'e5', ply: 7 }]);
    expect(rewards(effects[4])).toEqual([{ kind: 'reward', reward: 'saved', square: 'c3', ply: 9 }]);
    expect(turnRow(effects[4])).toMatchObject({ outcome: 'found', reward: 'saved' });
  });
  it('a move that finds one chance and misses another pays nothing; the retry pays once', () => {
    // Nc3 saves the knight from the d5 pawn but walks past the free knight on a5.
    const FIND_AND_MISS = '4k3/8/8/n2p4/4N3/8/8/R3K3 w - - 0 1';
    const { effects } = run([
      { kind: 'start', setup: at(1) }, board(FIND_AND_MISS, 9), { kind: 'moved', move: move(FIND_AND_MISS, 'Nc3') },
      { kind: 'try-again' }, { kind: 'moved', move: move(FIND_AND_MISS, 'Rxa5') },
    ]);
    const turns = effects[2].filter((e): e is Extract<FocusEffect, { kind: 'turn' }> => e.kind === 'turn');
    expect(turns.map((e) => e.row.outcome).sort()).toEqual(['found', 'missed']);
    expect(rewards(effects[2])).toEqual([{ kind: 'reward', reward: null, square: null, ply: 9 }]);
    const paid = effects.flatMap((es) => rewards(es)).filter((r) => r.reward);
    expect(paid).toEqual([{ kind: 'reward', reward: 'missionRetry', square: 'a5', ply: 9 }]);
  });
});

describe('a move that misses two chances: the others wait with the pause (prod 2026-10-22)', () => {
  // Ke2 walks past the free knight on a5 AND leaves your knight on e4 to the d5 pawn.
  const TWO_MISSES = '4k3/8/8/n2p4/4N3/8/8/R3K3 w - - 0 1';
  const records = (es: FocusEffect[]) => es.filter((e): e is Extract<FocusEffect, { kind: 'record' }> => e.kind === 'record');
  const opened = (rung: TacticsRung): FocusEvent[] => [{ kind: 'start', setup: at(rung) }, board(TWO_MISSES, 9), { kind: 'moved', move: move(TWO_MISSES, 'Ke2') }];
  it('the clue names yours; the other is NOT filed yet — Play on files both, and both are on the recap', () => {
    const first = run(opened(1));
    expect(first.effects[2].find((e) => e.kind === 'say')).toMatchObject({ line: 'clue' });
    expect(records(first.effects[2])).toEqual([]);
    const played = run([{ kind: 'play-on' }], first.state);
    expect(records(played.effects[0]).map((r) => `${r.chance.kind}:${r.outcome}:${r.prompted}`).sort()).toEqual(['save:broken:false', 'take:broken:false']);
    expect(played.state.missed.map((x) => x.kind).sort()).toEqual(['save', 'take']);
  });
  it('Try again files both taken back; a retry that handles BOTH takes neither onto the recap', () => {
    // Nxd5?? is not it — a retry that saves the knight AND takes: impossible
    // here, so the retry Nc3 saves your knight and walks past theirs again.
    const tried = run([{ kind: 'try-again' }], run(opened(1)).state);
    expect(records(tried.effects[0]).map((r) => `${r.chance.kind}:${r.takenBack}`).sort()).toEqual(['save:true', 'take:true']);
    const retry = run([{ kind: 'moved', move: move(TWO_MISSES, 'Nc3') }], tried.state);
    const rs = records(retry.effects[0]).map((r) => `${r.chance.kind}:${r.outcome}:${r.prompted}`).sort();
    expect(rs).toEqual(['save:held:true', 'take:broken:true']);
    expect(retry.state.missed.map((x) => x.kind), 'the saved knight never stood as a miss').toEqual(['take']);
  });
  it('a retry that finds yours and leaves the knight in a level trade: the knight is judged on the next move, told', () => {
    const tried = run([{ kind: 'try-again' }], run(opened(1)).state);
    const retry = run([{ kind: 'moved', move: move(TWO_MISSES, 'Rxa5') }], tried.state);
    expect(records(retry.effects[0]).map((r) => `${r.chance.kind}:${r.outcome}:${r.prompted}`)).toEqual(['take:held:true']);
    expect(retry.state.missed).toEqual([]);
    expect(retry.state.carried).toEqual([expect.objectContaining({ prompted: true, asked: false })]);
    // The ledger closes the first try's "missed" row for the knight: left open (prod record game 1, 2026-10-23).
    const rows = retry.effects[0].filter((e): e is Extract<FocusEffect, { kind: 'turn' }> => e.kind === 'turn').map((e) => `${e.row.kind}:${e.row.outcome}:${e.row.retry}`);
    expect(rows.sort()).toEqual(['save:exempt:true', 'take:found:true']);
    expect(rewards(retry.effects[0]).filter((r) => r.reward)).toEqual([{ kind: 'reward', reward: 'missionRetry', square: 'a5', ply: 9 }]);
  });
});

describe('the tempo run (David 2026-10-22: "you HAD them on the run!")', () => {
  // Ra8+ Kg7, Ra7+ Kg6 — two checks in a row — then a quiet king move.
  const P1 = '7k/8/8/8/8/8/8/R3K3 w - - 0 1';
  const A1 = play(P1, 'Ra8+');
  const P2 = play(A1, 'Kg7');
  const A2 = play(P2, 'Ra7+');
  const P3 = play(A2, 'Kg6');
  const A3 = play(P3, 'Ke2');
  const P4 = play(A3, 'Kf5');
  const L = (uci: string, ev = 20) => [{ moves: [uci], evaluation: ev, mate: null }, { moves: ['e1d1'], evaluation: 0, mate: null }];
  const bd = (fen: string, prevFen: string | null, ply: number, lines: ReturnType<typeof L> | null): FocusEvent => ({ kind: 'board', fen, prevFen, ply, student: 'w', lines, steered: false, planted: null });
  const mv = (fen: string, san: string, lines: ReturnType<typeof L> | null): FocusEvent => ({ kind: 'moved', move: { ...move(fen, san), lines } });
  // The page's board event carries `prevFen` = the board the user moved FROM
  // (the motif reader's "your last turn") — never the board after the move.
  const game = (endLines: ReturnType<typeof L>, best = 0): FocusEvent[] => [
    { kind: 'start', setup: at(2, { tempoBest: best }) },
    bd(P1, null, 1, L('a1a8')), mv(P1, 'Ra8+', L('a1a8')),
    bd(P2, P1, 3, L('a8a7')), mv(P2, 'Ra7+', L('a8a7')),
    bd(P3, P2, 5, endLines), mv(P3, 'Ke2', endLines),
    bd(P4, P3, 7, null),
  ];
  it('the run ends on the quiet move: said in the past tense, with the starburst and the coin', () => {
    const { effects, state } = run(game([{ moves: ['e1e2'], evaluation: 0, mate: null }, { moves: ['a7a6'], evaluation: 10, mate: null }]));
    const at7 = effects[7];
    expect(at7.find((e) => e.kind === 'say')).toMatchObject({ text: 'You HAD them on the run!', line: 'tempo-had' });
    expect(rewards(at7)).toEqual([{ kind: 'reward', reward: 'tempoRun', square: null, ply: 5, label: 'TEMPO RUN ×2' }]);
    expect(state.tempo).toEqual({ length: 0, longest: 2 });
    expect(effects.slice(0, 7).some((es) => es.some((e) => e.kind === 'say' && e.line.startsWith('tempo')))).toBe(false);
  });
  it('ended with a forcing move still on and the quiet move costing half a pawn: let off — no coin', () => {
    const { effects } = run(game([{ moves: ['a7a6'], evaluation: 90, mate: null }, { moves: ['e1e2'], evaluation: 0, mate: null }]));
    expect(effects[7].find((e) => e.kind === 'say')).toMatchObject({ text: 'You had them on the run — and you let them off the hook.', line: 'tempo-let-off' });
    expect(rewards(effects[7]).filter((r) => r.reward)).toEqual([]);
  });
  it('the move is kept from `moved` and joins the run when the next board comes (the page\'s prevFen is the board moved FROM)', () => {
    const quiet = [{ moves: ['e1e2'], evaluation: 0, mate: null }, { moves: ['a7a6'], evaluation: 10, mate: null }];
    const ev = game(quiet);
    const mid = run(ev.slice(0, 5));
    expect(mid.state.lastMove).toMatchObject({ san: 'Ra7+' });
    expect(mid.state.tempo).toEqual({ length: 1, longest: 1 });
  });
  it('a line already said about the move that ended it: the run waits for the recap', () => {
    const quiet = [{ moves: ['e1e2'], evaluation: 0, mate: null }, { moves: ['a7a6'], evaluation: 10, mate: null }];
    const events = game(quiet);
    const spoken = run(events.slice(0, 6));
    const { effects } = run(events.slice(6), { ...spoken.state, spoke: true });
    expect(effects[1].some((e) => e.kind === 'say' && e.line.startsWith('tempo'))).toBe(false);
  });
  it('a check that repeats a position ends the run — a perpetual is no run (prod record 2026-10-23)', () => {
    // Ra8+ Kg7 Ra7+ Kg8 Ra8+ Kg7 Ra7+: the last check brings back the board
    // after the first Ra7+.
    const Q3 = play(A2, 'Kg8');
    const B3 = play(Q3, 'Ra8+');
    const Q4 = play(B3, 'Kg7');
    const B4 = play(Q4, 'Ra7+');
    const Q5 = play(B4, 'Kg8');
    const { effects, state } = run([
      { kind: 'start', setup: at(2) },
      bd(P1, null, 1, L('a1a8')), mv(P1, 'Ra8+', L('a1a8')),
      bd(P2, P1, 3, L('a8a7')), mv(P2, 'Ra7+', L('a8a7')),
      bd(Q3, P2, 5, L('a7a8')), mv(Q3, 'Ra8+', L('a7a8')),
      bd(Q4, Q3, 7, L('a8a7')), mv(Q4, 'Ra7+', L('a8a7')),
      bd(Q5, Q4, 9, null),
    ]);
    expect(state.tempo.longest).toBe(3);
    expect(effects.at(-1)?.find((e) => e.kind === 'say')).toMatchObject({ line: 'tempo-had' });
    expect(state.stood).toHaveLength(4);
  });
  it('the recap: the longest run, and a new best over the record with its own burst', () => {
    const quiet = [{ moves: ['e1e2'], evaluation: 0, mate: null }, { moves: ['a7a6'], evaluation: 10, mate: null }];
    const beat = run([...game(quiet, 1), { kind: 'game-over', at: 1 }]);
    const end = beat.effects.at(-1) ?? [];
    expect(end.find((e) => e.kind === 'end')).toMatchObject({ result: { tempo: { longest: 2, best: 1, newBest: true } } });
    expect(rewards(end)).toContainEqual({ kind: 'reward', reward: 'newBest', square: null, ply: 7, label: 'NEW BEST · TEMPO RUN ×2' });
    const held = run([...game(quiet, 3), { kind: 'game-over', at: 1 }]);
    expect((held.effects.at(-1) ?? []).find((e) => e.kind === 'end')).toMatchObject({ result: { tempo: { longest: 2, best: 3, newBest: false } } });
    expect(rewards(held.effects.at(-1) ?? []).some((r) => r.reward === 'newBest')).toBe(false);
  });
});

// THE COACH LEAVES CHANCES (focusPlant): the runner keeps the count, the
// spacing, the pattern to bring back, the flips and the guarantee.
describe('planted chances', () => {
  const opened = (s = at(0)): FocusEvent[] => [{ kind: 'start', setup: s }, board(LOOSE_KNIGHT, 7), { kind: 'moved', move: move(LOOSE_KNIGHT, 'dxe5') }];

  it('a planted board is a plant made: counted, and the spacing runs from it; a flip is counted as one', () => {
    expect(run([...opened(), board(LOOSE_KNIGHT, 13, false, 'exploit')]).state.plant).toMatchObject({ count: 1, flips: 0, lastPly: 13 });
    expect(run([...opened(), board(KNIGHT_HIT, 13, false, 'defend')]).state.plant).toMatchObject({ count: 1, flips: 1, lastPly: 13 });
  });
  it('a planted find counts half — steered on the record, planted on the row', () => {
    const { effects } = run([...opened(), board(LOOSE_KNIGHT, 13, false, 'exploit'), { kind: 'moved', move: move(LOOSE_KNIGHT, 'dxe5') }]);
    expect(kinds(effects[3])).toContain('steered');
    expect(effects[4][0]).toMatchObject({ kind: 'record', outcome: 'held', prompted: false, steered: true });
    expect(turnRow(effects[4])).toMatchObject({ planted: true, steered: true, outcome: 'found' });
  });
  it('a flipped plant marks THEIR seat: your save there counts half', () => {
    const { effects } = run([...opened(), board(KNIGHT_HIT, 13, false, 'defend'), { kind: 'moved', move: move(KNIGHT_HIT, 'Nc3') }]);
    expect(turnRow(effects[4])).toMatchObject({ seat: 'defend', planted: true, steered: true });
  });
  it('a miss on your side asks the next plant for the same pattern, spaced', () => {
    const { state } = run([...opened(at(2)), board(LOOSE_KNIGHT, 33, false, 'exploit'), { kind: 'moved', move: move(LOOSE_KNIGHT, 'Kf1') }]);
    expect(state.plant.need).toBe('missed-your-free-piece');
    expect(focusPlantAsk(state, 39, LOOSE_KNIGHT), 'spaced').toBeNull();
  });
  it('THE GUARANTEE: until a chance at the rung has been on the board, the coach plants from the target ply', () => {
    const fresh = run([{ kind: 'start', setup: at(2, { targetPly: 16 }) }]).state;
    expect(focusPlantAsk(fresh, 15, LOOSE_KNIGHT)).toBeNull();
    expect(focusPlantAsk(fresh, 16, LOOSE_KNIGHT)).toEqual({ tag: null, difficulty: 2, extra: false });
    const lowChance = run([{ kind: 'start', setup: at(2) }, board(LOOSE_KNIGHT, 9)]).state;
    expect(lowChance.plant.presented, 'a rung-1 piece does not present rung 2').toBeNull();
    const late = run([{ kind: 'start', setup: at(2) }, board(LOOSE_KNIGHT, 41)]).state;
    expect(late.plant.presented, 'from move 20 one rung easier counts').toEqual({ ply: 41, difficulty: 1 });
  });
  it('the result says whether the focus was presented', () => {
    const { effects } = run([...opened(), { kind: 'game-over', at: 100 }]);
    expect(effects[effects.length - 1].find((e) => e.kind === 'end')).toMatchObject({ result: { rung: 0, presented: { ply: 7, difficulty: 1 } } });
  });
  it('never while the board waits on Try again / Play on', () => {
    const held = run([...opened(), board(KNIGHT_HIT, 13), { kind: 'moved', move: move(KNIGHT_HIT, 'Kd2') }]).state;
    expect(held.pause).not.toBeNull();
    expect(focusPlantAsk(held, 21, LOOSE_KNIGHT)).toBeNull();
  });
});

// THE CASTLING WATCH (PLAN.md item 5): the runner holds a costly move while
// the page reads the castled what-if, then decides — STOP, or on with the game.
describe('the castling watch', () => {
  /** The Italian, White to move: castling is ready. */
  const READY = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
  const READ = [
    { moves: ['e1g1', 'f6e4'], evaluation: 30, mate: null },
    { moves: ['d2d3', 'f6g4'], evaluation: -120, mate: null },
    { moves: ['a2a3', 'f6g4'], evaluation: 10, mate: null },
  ];
  const readyBoard = (ply: number): FocusEvent => ({ kind: 'board', fen: READY, prevFen: null, ply, student: 'w', lines: READ, steered: false, planted: null });
  const moved = (san: string): FocusEvent => ({ kind: 'moved', move: { ...move(READY, san), lines: READ } });
  const opened = (rung: TacticsRung = 2): FocusEvent[] => [{ kind: 'start', setup: at(rung) }, readyBoard(7)];

  it('a costly move with the king uncastled is held for the what-if read — no reply yet, no plant', () => {
    const { effects, state } = run([...opened(), moved('d3')]);
    expect(effects[2].find((e) => e.kind === 'probe')).toMatchObject({ probe: { side: 'k', bestCp: 30, realCp: -120 } });
    expect(effects[2].some((e) => e.kind === 'reply')).toBe(false);
    expect(focusPlantAsk(state, 9, READY)).toBeNull();
  });
  it('STOP when the castled king would have held the cost: filed, said once with the ask, the board held', () => {
    const { effects, state } = run([...opened(), moved('d3'), { kind: 'castle-read', fenBefore: READY, realCp: null, whatIfCp: 40 }]);
    expect(kinds(effects[3])).toEqual(['record-castle', 'castle-row', 'say:castle-stop', 'hold']);
    expect(effects[3].find((e) => e.kind === 'say')).toMatchObject({ text: "STOP! You're not castled, and that just cost you! You need to castle first! Want to take that move back and castle?" });
    expect(effects[3].find((e) => e.kind === 'castle-row')).toMatchObject({ row: { verdict: 'stop', drop: 150, gain: 160, losing: false, attack: false, rewindPly: 7 } });
    expect(rewards(effects[3])).toEqual([{ kind: 'reward', reward: null, square: null, ply: 7 }]);
    expect(state.pause?.castle?.ply).toBe(7);
  });
  it('"Go back and castle" rewinds to the board castling was ready on — told, so castling there counts neither way', () => {
    const { effects, state } = run([...opened(), moved('d3'), { kind: 'castle-read', fenBefore: READY, realCp: null, whatIfCp: 40 }, { kind: 'try-again' }]);
    // The STOP's move is the flagged miss taken back (the puzzles file it).
    expect(effects[4].slice(0, 3)).toEqual([{ kind: 'rewind', ply: 7 }, { kind: 'taken-back', fen: READY, san: 'd3' }, { kind: 'prompt', ply: 7 }]);
    expect(state.pause).toBeNull();
    expect(state.board).toMatchObject({ fen: READY, ply: 7, prompted: true });
    const castled = run([moved('O-O')], state).effects[0];
    expect(castled.some((e) => e.kind === 'probe' || (e.kind === 'say' && e.line === 'castle-stop'))).toBe(false);
  });
  it('Play on lets it stand and the coach shows why', () => {
    const { effects } = run([...opened(), moved('d3'), { kind: 'castle-read', fenBefore: READY, realCp: null, whatIfCp: 40 }, { kind: 'play-on' }]);
    expect(effects[4]).toEqual([{ kind: 'reply', punish: true }]);
    expect(effects[4].some((e) => e.kind === 'taken-back')).toBe(false);
  });
  it('a losing STOP on an attack says so', () => {
    // The board's read wanted castling by far more than a pawn: the look-ahead
    // stops the move on the spot — no what-if read.
    const { effects } = run([...opened(), { kind: 'moved', move: { ...move(READY, 'Ng5'), lines: [READ[0], { moves: ['f3g5', 'h7h6'], evaluation: -350, mate: null }] } }]);
    expect(effects[2].find((e) => e.kind === 'say')).toMatchObject({ text: expect.stringMatching(/^STOP! You're not castled, and because of that you're now in a losing position! You need to castle before you attack!/) });
  });
  it('twin: the what-if barely helps — no STOP; the early reminder is said once, and the coach replies', () => {
    const { effects, state } = run([...opened(), moved('d3'), { kind: 'castle-read', fenBefore: READY, realCp: null, whatIfCp: -60 }]);
    expect(kinds(effects[3])).toEqual(['castle-row', 'say:castle-reminder', 'castle-row', 'reply']);
    expect(effects[3][0]).toMatchObject({ row: { verdict: 'quiet' } });
    expect(effects[3].find((e) => e.kind === 'say')).toMatchObject({ text: 'You could have castled there. Get your king safe before the centre opens.' });
    const again = run([readyBoard(9), moved('a3')], state).effects[1];
    expect(again.some((e) => e.kind === 'say')).toBe(false);
  });
  it('THE LOOK-AHEAD: the board wanted castling by a pawn over everything else — STOP on that move, the rewind is that one move', () => {
    const URGENT = [
      { moves: ['e1g1', 'f6e4'], evaluation: 30, mate: null },
      { moves: ['d2d3', 'f6g4'], evaluation: -90, mate: null },
      { moves: ['a2a3', 'f6g4'], evaluation: -75, mate: null },
    ];
    const { effects, state } = run([{ kind: 'start', setup: at(2) }, { ...readyBoard(7), lines: URGENT } as FocusEvent, { kind: 'moved', move: { ...move(READY, 'a3'), lines: URGENT } }]);
    expect(effects[2].some((e) => e.kind === 'probe')).toBe(false);
    expect(kinds(effects[2])).toEqual(['record-castle', 'castle-row', 'say:castle-stop', 'hold']);
    expect(effects[2].find((e) => e.kind === 'castle-row')).toMatchObject({ row: { verdict: 'stop', why: 'urgent', bestCp: 30, realCp: -75, drop: 105, rewindPly: 7, rewindMoves: 1 } });
    expect(effects[2].find((e) => e.kind === 'say')).toMatchObject({ text: "STOP! You're not castled, and that just cost you! You need to castle first! Want to take that move back and castle?" });
    expect(state.pause).toMatchObject({ castle: { ply: 7 }, castleMoves: 1 });
  });
  it('twin: castling only a little better than the rest is no look-ahead STOP — the backstop reads the what-if', () => {
    const CLOSE = [
      { moves: ['e1g1', 'f6e4'], evaluation: 30, mate: null },
      { moves: ['a2a3', 'f6g4'], evaluation: -20, mate: null },
      { moves: ['d2d3', 'f6g4'], evaluation: -120, mate: null },
    ];
    const { effects } = run([{ kind: 'start', setup: at(2) }, { ...readyBoard(7), lines: CLOSE } as FocusEvent, { kind: 'moved', move: { ...move(READY, 'd3'), lines: CLOSE } }]);
    expect(effects[2].some((e) => e.kind === 'probe')).toBe(true);
    expect(effects[2].some((e) => e.kind === 'say')).toBe(false);
  });
  it('twin: a move that hangs material is the tactics focus\'s, never the look-ahead\'s', () => {
    const HANG = [
      { moves: ['e1g1', 'f6e4'], evaluation: 30, mate: null },
      { moves: ['c4f7', 'e8f7'], evaluation: -200, mate: null },
    ];
    const { effects } = run([{ kind: 'start', setup: at(2) }, { ...readyBoard(7), lines: HANG } as FocusEvent, { kind: 'moved', move: { ...move(READY, 'Bxf7+'), lines: HANG } }]);
    expect(effects[2].some((e) => e.kind === 'castle-row' || (e.kind === 'say' && e.line === 'castle-stop'))).toBe(false);
  });
  it('the backstop names how far back, and offers it only up to three of your moves', () => {
    // Boards at plies 7, 9, 11 were castle-ready; only ply 7's read held castling.
    const SOUND = [{ moves: ['e1g1', 'f6e4'], evaluation: 30, mate: null }, { moves: ['a2a3', 'f6g4'], evaluation: 10, mate: null }];
    const NO_CASTLE = [{ moves: ['a2a3', 'f6g4'], evaluation: 10, mate: null }, { moves: ['d2d3', 'f6g4'], evaluation: -120, mate: null }];
    const at3 = run([{ kind: 'start', setup: at(2) }, { ...readyBoard(7), lines: SOUND } as FocusEvent, { kind: 'moved', move: { ...move(READY, 'a3'), lines: SOUND } },
      { ...readyBoard(9), lines: NO_CASTLE } as FocusEvent, { kind: 'moved', move: { ...move(READY, 'a3'), lines: NO_CASTLE } },
      { ...readyBoard(11), lines: NO_CASTLE } as FocusEvent, { kind: 'moved', move: { ...move(READY, 'd3'), lines: NO_CASTLE } },
      { kind: 'castle-read', fenBefore: READY, realCp: null, whatIfCp: 40 }]);
    const stop = at3.effects[7];
    expect(stop.find((e) => e.kind === 'castle-row')).toMatchObject({ row: { why: 'what-if', rewindPly: 7, rewindMoves: 3 } });
    expect(stop.find((e) => e.kind === 'say')).toMatchObject({ text: expect.stringMatching(/Want to go back three moves and castle\?$/) });
    expect(at3.state.pause?.castleMoves).toBe(3);
    // Four moves back: no offer — STOP, and the coach shows why.
    const far = run([{ kind: 'start', setup: at(2) }, { ...readyBoard(5), lines: SOUND } as FocusEvent, { kind: 'moved', move: { ...move(READY, 'a3'), lines: SOUND } },
      { ...readyBoard(7), lines: NO_CASTLE } as FocusEvent, { kind: 'moved', move: { ...move(READY, 'a3'), lines: NO_CASTLE } },
      { ...readyBoard(9), lines: NO_CASTLE } as FocusEvent, { kind: 'moved', move: { ...move(READY, 'a3'), lines: NO_CASTLE } },
      { ...readyBoard(11), lines: NO_CASTLE } as FocusEvent, { kind: 'moved', move: { ...move(READY, 'd3'), lines: NO_CASTLE } },
      { kind: 'castle-read', fenBefore: READY, realCp: null, whatIfCp: 40 }]);
    const farStop = far.effects[9];
    expect(farStop.find((e) => e.kind === 'castle-row')).toMatchObject({ row: { verdict: 'stop', rewindPly: null, rewindMoves: null } });
    expect(farStop.find((e) => e.kind === 'say')).toMatchObject({ text: "STOP! You're not castled, and that just cost you! You need to castle first!" });
    expect(farStop.at(-1)).toEqual({ kind: 'reply', punish: true });
  });
  it('twin: a cheap move is never held; a stale read changes nothing', () => {
    const cheap = run([...opened(), moved('a3')]);
    expect(cheap.effects[2].some((e) => e.kind === 'probe')).toBe(false);
    expect(cheap.effects[2].at(-1)).toEqual({ kind: 'reply', punish: false });
    const stale = run([...opened(), moved('d3'), { kind: 'castle-read', fenBefore: KNIGHT_HIT, realCp: -120, whatIfCp: 40 }]);
    expect(stale.effects[3]).toEqual([]);
  });
});
