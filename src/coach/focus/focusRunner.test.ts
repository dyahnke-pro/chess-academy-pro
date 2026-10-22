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
  seatStates: { defend: 'red', exploit: 'red' }, levels: ['beginner'], targetPly: 12, line: PREGAME_LINE, ...over,
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
    expect(kinds(effects[5])).toEqual(['undo', 'record', 'prompt']);
    expect(effects[5][1]).toMatchObject({ outcome: 'broken', takenBack: true, prompted: false });
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
    expect(kinds(effects[3])).toEqual(['undo', 'record-deciding', 'prompt']);
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
    expect(end?.result).toMatchObject({ rung: 0, atRung: { found: 1, missed: 0 }, next: { rung: 1, step: 'up' } });
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
    expect(effects[3].find((e) => e.kind === 'say')).toMatchObject({ text: "STOP! You're not castled, and that just cost you! You need to castle first! Want to go back and castle?" });
    expect(effects[3].find((e) => e.kind === 'castle-row')).toMatchObject({ row: { verdict: 'stop', drop: 150, gain: 160, losing: false, attack: false, rewindPly: 7 } });
    expect(rewards(effects[3])).toEqual([{ kind: 'reward', reward: null, square: null, ply: 7 }]);
    expect(state.pause?.castle?.ply).toBe(7);
  });
  it('"Go back and castle" rewinds to the board castling was ready on — told, so castling there counts neither way', () => {
    const { effects, state } = run([...opened(), moved('d3'), { kind: 'castle-read', fenBefore: READY, realCp: null, whatIfCp: 40 }, { kind: 'try-again' }]);
    expect(effects[4].slice(0, 2)).toEqual([{ kind: 'rewind', ply: 7 }, { kind: 'prompt', ply: 7 }]);
    expect(state.pause).toBeNull();
    expect(state.board).toMatchObject({ fen: READY, ply: 7, prompted: true });
    const castled = run([moved('O-O')], state).effects[0];
    expect(castled.some((e) => e.kind === 'probe' || (e.kind === 'say' && e.line === 'castle-stop'))).toBe(false);
  });
  it('Play on lets it stand and the coach shows why', () => {
    const { effects } = run([...opened(), moved('d3'), { kind: 'castle-read', fenBefore: READY, realCp: null, whatIfCp: 40 }, { kind: 'play-on' }]);
    expect(effects[4]).toEqual([{ kind: 'reply', punish: true }]);
  });
  it('a losing STOP on an attack says so', () => {
    const { effects } = run([...opened(), { kind: 'moved', move: { ...move(READY, 'Ng5'), lines: [READ[0], { moves: ['f3g5', 'h7h6'], evaluation: -350, mate: null }] } }, { kind: 'castle-read', fenBefore: READY, realCp: null, whatIfCp: 40 }]);
    expect(effects[3].find((e) => e.kind === 'say')).toMatchObject({ text: expect.stringMatching(/^STOP! You're not castled, and because of that you're now in a losing position! You need to castle before you attack!/) });
  });
  it('twin: the what-if barely helps — no STOP; the early reminder is said once, and the coach replies', () => {
    const { effects, state } = run([...opened(), moved('d3'), { kind: 'castle-read', fenBefore: READY, realCp: null, whatIfCp: -60 }]);
    expect(kinds(effects[3])).toEqual(['castle-row', 'say:castle-reminder', 'castle-row', 'reply']);
    expect(effects[3][0]).toMatchObject({ row: { verdict: 'quiet' } });
    expect(effects[3].find((e) => e.kind === 'say')).toMatchObject({ text: 'You could have castled there. Get your king safe before the centre opens.' });
    const again = run([readyBoard(9), moved('a3')], state).effects[1];
    expect(again.some((e) => e.kind === 'say')).toBe(false);
  });
  it('twin: a cheap move is never held; a stale read changes nothing', () => {
    const cheap = run([...opened(), moved('a3')]);
    expect(cheap.effects[2].some((e) => e.kind === 'probe')).toBe(false);
    expect(cheap.effects[2].at(-1)).toEqual({ kind: 'reply', punish: false });
    const stale = run([...opened(), moved('d3'), { kind: 'castle-read', fenBefore: KNIGHT_HIT, realCp: -120, whatIfCp: 40 }]);
    expect(stale.effects[3]).toEqual([]);
  });
});
