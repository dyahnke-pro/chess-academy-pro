import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { IDLE, lineReply, missionDials, missionOwnsGame, plantArmed, runnerReadsMoves, stepMission, type RunnerState, type Step } from './missionRunner';
import { PLANT_WINDOW } from './earnedSlip';
import type { MissionCard } from './missionCard';
import { MISSIONS } from './registry';

const CARD = MISSIONS['develop-and-castle'];
const sans = (moves: string): string[] => moves.split(/\s+/).filter(Boolean);
const fenOf = (moves: string[]): string => { const b = new Chess(); for (const s of moves) b.move(s); return b.fen(); };
const moved = (state: RunnerState, moves: string, studentColor: 'w' | 'b' = 'w'): Step => {
  const all = sans(moves);
  return stepMission(state, { kind: 'moved', game: { sans: all, studentColor }, fenBefore: fenOf(all.slice(0, -1)), candidatesUci: ['f1c4'] });
};
const live = (): RunnerState => stepMission(IDLE, { kind: 'start', cards: [CARD] }).state;

/** The coach's slip (§6a) the plant tests hand the runner: …Qe7 in the
 *  fork line, Nxc7+ forks king and rook, …Kd8, Nxa8. */
const SLIP = { square: 'a8', line: ['b5c7', 'e8d8', 'c7a8'], depth: 1, alts: [] };

describe('the mission runner — transitions', () => {
  it('start announces once and goes live', () => {
    const s = stepMission(IDLE, { kind: 'start', cards: [CARD] });
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
      { kind: 'record', card: CARD, outcome: 'miss-shown', missPly: 4, reason: 'repeat-move' },
      { kind: 'reply' },
    ]);
  });

  it('a clean pass celebrates in full and records pass-first-try', () => {
    const s = moved(live(), 'e4 e5 Nf3 Nc6 Bc4 Bc5 Nc3 Nf6 d3 d6 O-O O-O Bg5');
    expect(s.state).toMatchObject({ phase: 'resolved', outcome: 'pass-first-try', resolvedAtPly: 12 });
    expect(s.effects).toEqual([
      { kind: 'celebrate', firstTry: true },
      { kind: 'say', line: 'pass', text: CARD.passLine },
      { kind: 'record', card: CARD, outcome: 'pass-first-try' },
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
    expect(s.effects).toEqual([{ kind: 'record', card: CARD, outcome: 'incomplete' }, { kind: 'reply' }]);
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
  it('a Campaign game is the mission\'s for the whole game — before and after it resolves; a stopped one is not', () => {
    expect(missionOwnsGame(IDLE)).toBe(false);
    const l = live();
    expect(missionOwnsGame(l)).toBe(true);
    const done = moved(l, 'e4 e5 Nf3 Nc6 Bc4 Bc5 Nc3 Nf6 d3 d6 O-O O-O Bg5').state;
    expect(missionOwnsGame(done)).toBe(true);
    expect(missionOwnsGame(stepMission(done, { kind: 'stop' }).state)).toBe(false);
  });

  it('the coach plays under the card dials only while the mission is unresolved', () => {
    expect(missionDials(live())).toEqual(CARD.coachDials);
    expect(CARD.coachDials).toMatchObject({ attacksOnPieces: 'off', plannedTrap: 'off', plantFreePiece: 'off' });
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

const MG = MISSIONS['free-piece-stay-ahead'];
/** The Italian pass at ply 12, then the coach's reply and play on. White student. */
const ITALIAN_PASS = 'e4 e5 Nf3 Nc6 Bc4 Bc5 Nc3 Nf6 d3 d6 O-O O-O Bg5';
const both = (): RunnerState => stepMission(IDLE, { kind: 'start', cards: [CARD, MG] }).state;

describe('the mission runner — phase sequencing (WO-MISSIONS-02)', () => {
  it('only the first card announces at the start; the middlegame card waits for its phase', () => {
    const s = stepMission(IDLE, { kind: 'start', cards: [CARD, MG] });
    expect(s.effects).toEqual([{ kind: 'say', line: 'announce', text: CARD.announce }]);
    expect(s.state.card?.id).toBe('develop-and-castle');
    expect(s.state.phaseCards).toEqual({ opening: CARD, middlegame: MG, endgame: null });
    expect(s.state.currentPhase).toBe('opening');
  });

  it('the middlegame card goes live the ply after the opening resolves, announced once, before the reply', () => {
    const s = moved(both(), ITALIAN_PASS);
    expect(s.effects).toEqual([
      { kind: 'celebrate', firstTry: true },
      { kind: 'say', line: 'pass', text: CARD.passLine },
      { kind: 'record', card: CARD, outcome: 'pass-first-try' },
      { kind: 'say', line: 'announce', text: MG.announce },
      { kind: 'reply' },
    ]);
    expect(s.state).toMatchObject({ phase: 'live', startPly: 13, outcome: null, currentPhase: 'middlegame' });
    expect(s.state.card?.id).toBe('free-piece-stay-ahead');
    // It takes the coach's dials from here: attacks on, the planned trap still off.
    expect(missionDials(s.state)).toEqual(MG.coachDials);
    expect(s.effects.filter((e) => e.kind === 'say' && e.line === 'announce')).toHaveLength(1);
    // The silence gate: the live middlegame card owns the game's voice too.
    expect(missionOwnsGame(s.state)).toBe(true);
  });

  it('a miss-shown or incomplete opening hands on too', () => {
    let st = moved(both(), 'e4 e5 Nf3 Nc6 Ng5').state;
    st = stepMission(st, { kind: 'try-again' }).state;
    const shown = moved(st, 'e4 e5 Nf3 Nc6 Nh4');
    expect(shown.state.card?.id).toBe('free-piece-stay-ahead');
    expect(shown.state.startPly).toBe(5);
  });

  it('the plant window: the coach\'s 2nd move of the card to the last, once', () => {
    const mg = moved(both(), ITALIAN_PASS).state; // startPly 13 — the coach's first reply
    const plyOf = (n: number): number => 13 + 2 * (n - 1);
    expect(plantArmed(mg, plyOf(1))).toBe(false);
    expect(plantArmed(mg, plyOf(2))).toBe(true);
    expect(plantArmed(mg, plyOf(PLANT_WINDOW.last))).toBe(true);
    expect(plantArmed(mg, plyOf(PLANT_WINDOW.last + 1))).toBe(false);
    const slip = { square: 'a8', line: ['b5c7', 'e8d8', 'c7a8'], depth: 1, alts: [] };
    const planted = stepMission(mg, { kind: 'coach-moved', ply: 15, planted: slip }).state;
    expect(planted.context).toEqual({ planted: { ply: 15, ...slip } });
    expect(plantArmed(planted, 17)).toBe(false);
    // The opening card never plants.
    expect(plantArmed(both(), 3)).toBe(false);
  });

  it('no plant by the window\'s last coach move: incomplete, plantFound false, the reasons summed', () => {
    let st = moved(both(), ITALIAN_PASS).state;
    const plyOf = (n: number): number => 13 + 2 * (n - 1);
    for (let n = 1; n < PLANT_WINDOW.last; n += 1) {
      const s = stepMission(st, { kind: 'coach-moved', ply: plyOf(n), scan: { 'no-slip': 1 } });
      expect(s.effects).toEqual([]);
      st = s.state;
    }
    const closed = stepMission(st, { kind: 'coach-moved', ply: plyOf(PLANT_WINDOW.last), scan: { 'no-line': 2 } });
    expect(closed.effects).toEqual([
      { kind: 'plant-none', card: MG, reasons: { 'no-slip': PLANT_WINDOW.last - 1, 'no-line': 2 } },
      { kind: 'record', card: MG, outcome: 'incomplete', plantFound: false },
    ]);
    expect(closed.state).toMatchObject({ phase: 'resolved', outcome: 'incomplete' });
  });

  it('each miss reason speaks its own fixed phrase; the second miss shows the line', () => {
    // White student; the coach slips …Qe7 at ply 7 — Nxc7+ forks king and rook.
    const PREFIX = 'e4 e5 Nf3 Nc6 Nc3 Nf6 Nb5 Qe7';
    let st: RunnerState = { ...stepMission(IDLE, { kind: 'start', cards: [MG] }).state, startPly: 4 };
    st = stepMission(st, { kind: 'coach-moved', ply: 7, planted: SLIP }).state;
    const miss = moved(st, `${PREFIX} d3`);
    expect(miss.effects).toEqual([{ kind: 'say', line: 'miss', text: "There's a win on the board — find it." }, { kind: 'hold' }]);
    st = stepMission(miss.state, { kind: 'try-again' }).state;
    const second = moved(st, `${PREFIX} h3`);
    expect(second.effects).toEqual([
      { kind: 'say', line: 'miss', text: "There's a win on the board — find it." },
      { kind: 'show', move: { from: 'b5', to: 'c7' } },
      { kind: 'record', card: MG, outcome: 'miss-shown', missPly: 8, reason: 'missed-free-piece', plantFound: true },
      { kind: 'reply' },
    ]);
    // The give-back reason has its own phrase: …Bxa8 wins the knight back, Bf4 hangs.
    let st2: RunnerState = { ...stepMission(IDLE, { kind: 'start', cards: [MG] }).state, startPly: 4 };
    st2 = stepMission(st2, { kind: 'coach-moved', ply: 7, planted: SLIP }).state;
    st2 = moved(st2, `${PREFIX} Nxc7+ Kd8 Nxa8`).state;
    const giveBack = moved(st2, `${PREFIX} Nxc7+ Kd8 Nxa8 b6 d3 Bb7 h3 Bxa8 Bf4`);
    expect(giveBack.effects[0]).toEqual({ kind: 'say', line: 'miss', text: "You're ahead — keep every piece safe." });
  });

  it('a pass fires the reward once and records with plantFound; the game stays silent after', () => {
    // The line played, then the lead held to White's 40th move (no repetition).
    const TO_PASS = 'e4 e5 Nf3 Nc6 Nc3 Nf6 Nb5 Qe7 Nxc7+ Kd8 Nxa8 Ng8 Ba6 Nh6 Bb5 Ng4 Bc4 Nf6 Be2 Ng8 Bf1 Nh6 Ba6 Ng4 Bb5 Nf6 Bc4 Ng8 Be2 Nh6 Bf1 Ng4 Ba6 Nf6 Bb5 Ng8 Bc4 Nh6 Be2 Ng4 Bf1 Nf6 Ba6 Ng8 Bb5 Nh6 Bc4 Ng4 Be2 Nf6 Bf1 Ng8 Ba6 Nh6 Bb5 Ng4 Bc4 Nf6 Be2 Ng8 Bf1 Nh6 Ba6 Ng4 Bb5 Nf6 Bc4 Ng8 Be2 Nh6 Bf1 Ng4 Ba6 Nf6 Bb5 Ng8 Bc4 Nh6 Be2';
    let st: RunnerState = { ...stepMission(IDLE, { kind: 'start', cards: [MG] }).state, startPly: 4 };
    st = stepMission(st, { kind: 'coach-moved', ply: 7, planted: SLIP }).state;
    const s = moved(st, TO_PASS);
    expect(s.effects).toEqual([
      { kind: 'celebrate', firstTry: true },
      // The pass names the pattern that won the piece (§6a).
      { kind: 'say', line: 'pass', text: `${MG.passLine} The fork won it.` },
      { kind: 'record', card: MG, outcome: 'pass-first-try', plantFound: true },
      { kind: 'reply' },
    ]);
    // No endgame card yet: resolved, and still the mission's game (silent).
    expect(s.state.phase).toBe('resolved');
    expect(missionOwnsGame(s.state)).toBe(true);
    expect(missionDials(s.state)).toBeNull();
  });

  it('a takeback past the plant forgets it', () => {
    let st = moved(both(), ITALIAN_PASS).state;
    st = stepMission(st, { kind: 'coach-moved', ply: 15, planted: SLIP }).state;
    expect(stepMission(st, { kind: 'rewind', plies: 15 }).state.context).toEqual({});
    expect(stepMission(st, { kind: 'rewind', plies: 16 }).state.context.planted).toBeDefined();
  });

  it('on the line the coach answers as the line says; off it, it plays its own game', () => {
    const PREFIX = 'e4 e5 Nf3 Nc6 Nc3 Nf6 Nb5 Qe7';
    let st: RunnerState = { ...stepMission(IDLE, { kind: 'start', cards: [MG] }).state, startPly: 4 };
    st = stepMission(st, { kind: 'coach-moved', ply: 7, planted: SLIP }).state;
    expect(lineReply(st, PREFIX.split(' '))).toBeNull();               // the student's turn
    expect(lineReply(st, `${PREFIX} Nxc7+`.split(' '))).toBe('e8d8'); // on the line
    expect(lineReply(st, `${PREFIX} d3`.split(' '))).toBeNull();      // off it
    expect(lineReply(st, `${PREFIX} Nxc7+ Kd8 Nxa8`.split(' '))).toBeNull(); // the line is done
  });

  it('the game ends with a card live: it closes incomplete, silently, and no later card starts', () => {
    const over = stepMission(both(), { kind: 'game-over' });
    expect(over.effects).toEqual([
      { kind: 'record', card: CARD, outcome: 'incomplete' },
      { kind: 'recap', results: { opening: 'incomplete' } },
    ]);
    expect(over.state).toMatchObject({ phase: 'resolved', outcome: 'incomplete', over: true, currentPhase: 'opening' });
    expect(over.state.card?.id).toBe('develop-and-castle');
    // Already over: nothing more, no second recap.
    expect(stepMission(over.state, { kind: 'game-over' }).effects).toEqual([]);
    // The middlegame card closes with its plant read; the recap carries both phases.
    const mg = moved(both(), ITALIAN_PASS).state;
    expect(stepMission(mg, { kind: 'game-over' }).effects).toEqual([
      { kind: 'record', card: MG, outcome: 'incomplete', plantFound: false },
      { kind: 'recap', results: { opening: 'pass-first-try', middlegame: 'incomplete' } },
    ]);
  });
});

describe('the mission runner — Campaign extension points (WO-CAMPAIGN-MASTER Phase 0)', () => {
  /** A stand-in endgame card with a briefing and a scenario (the real one is Lane A's). */
  const ENDGAME: MissionCard = {
    ...MG, phase: 'endgame', scenario: { providerId: 'kq-vs-k' },
    briefing: { novel: true, idea: 'Box the king.', demoFen: '8/8/8/8/8/8/8/8 w - - 0 1', demoSans: [], tryFen: '8/8/8/8/8/8/8/8 w - - 0 1', tryAnswersUci: [] },
  };

  it('a graduated card watches in silence: one row, watcher: true, no word — then the next phase begins', () => {
    const s0 = stepMission(IDLE, { kind: 'start', cards: [MG], watchers: [CARD] });
    expect(s0.effects).toEqual([]);
    expect(s0.state).toMatchObject({ phase: 'watching', currentPhase: 'opening', card: null });
    expect(missionOwnsGame(s0.state)).toBe(true);
    expect(runnerReadsMoves(s0.state)).toBe(true);
    const s1 = moved(s0.state, ITALIAN_PASS);
    expect(s1.effects).toEqual([
      { kind: 'record', card: CARD, outcome: 'pass-first-try', watcher: true },
      { kind: 'say', line: 'announce', text: MG.announce },
      { kind: 'reply' },
    ]);
    expect(s1.state).toMatchObject({ phase: 'live', currentPhase: 'middlegame', startPly: 13 });
  });

  it('a watcher that misses writes `missed`, silently — no pause, no phrase', () => {
    const s0 = stepMission(IDLE, { kind: 'start', cards: [MG], watchers: [CARD] }).state;
    const s1 = moved(s0, 'e4 e5 Nf3 Nc6 Ng5');
    expect(s1.effects[0]).toEqual({ kind: 'record', card: CARD, outcome: 'missed', watcher: true, missPly: 4, reason: 'repeat-move' });
    expect(s1.effects.some((e) => e.kind === 'say' && e.line === 'miss')).toBe(false);
    expect(s1.effects.some((e) => e.kind === 'hold')).toBe(false);
  });

  it('a card whose rewinds dial is `none` misses silently and plays on', () => {
    const quiet: MissionCard = { ...CARD, coachDials: { ...CARD.coachDials, rewinds: 'none' } };
    const s0 = stepMission(IDLE, { kind: 'start', cards: [quiet] }).state;
    const s1 = moved(s0, 'e4 e5 Nf3 Nc6 Ng5');
    expect(s1.effects).toEqual([{ kind: 'record', card: quiet, outcome: 'missed', missPly: 4, reason: 'repeat-move' }, { kind: 'reply' }]);
    expect(s1.state).toMatchObject({ phase: 'resolved', outcome: 'missed' });
  });

  it('a phase with neither card nor watcher is passed straight through; a briefing and a scenario come before the announce, and the coach does not answer', () => {
    const s0 = stepMission(IDLE, { kind: 'start', cards: [CARD, ENDGAME] }).state;
    const s1 = moved(s0, ITALIAN_PASS);
    expect(s1.effects).toEqual([
      { kind: 'celebrate', firstTry: true },
      { kind: 'say', line: 'pass', text: CARD.passLine },
      { kind: 'record', card: CARD, outcome: 'pass-first-try' },
      { kind: 'briefing', card: ENDGAME },
      { kind: 'load-position', scenarioId: 'kq-vs-k', card: ENDGAME },
      { kind: 'say', line: 'announce', text: ENDGAME.announce },
    ]);
    expect(s1.state).toMatchObject({ phase: 'live', currentPhase: 'endgame' });
    const loaded = stepMission(s1.state, { kind: 'scenario-loaded', fen: '8/8/8/3k4/8/8/8/KQ6 w - - 0 1' });
    expect(loaded.state).toMatchObject({ startFen: '8/8/8/3k4/8/8/8/KQ6 w - - 0 1', startPly: 0 });
  });

  it('the board can end a phase: its live card closes incomplete and the named phase begins', () => {
    const s0 = stepMission(IDLE, { kind: 'start', cards: [CARD, MG] }).state;
    const b = stepMission(s0, { kind: 'phase-boundary', phase: 'middlegame', ply: 20 });
    expect(b.effects).toEqual([
      { kind: 'record', card: CARD, outcome: 'incomplete' },
      { kind: 'say', line: 'announce', text: MG.announce },
    ]);
    expect(b.state).toMatchObject({ phase: 'live', currentPhase: 'middlegame', startPly: 20, results: { opening: 'incomplete' } });
    // A boundary into a phase already begun is ignored.
    expect(stepMission(b.state, { kind: 'phase-boundary', phase: 'middlegame', ply: 30 }).effects).toEqual([]);
  });

  it('a boundary past a phase skips its card: it never starts and writes no row', () => {
    const s0 = stepMission(IDLE, { kind: 'start', cards: [CARD, MG] }).state;
    const b = stepMission(s0, { kind: 'phase-boundary', phase: 'endgame', ply: 40 });
    expect(b.effects).toEqual([{ kind: 'record', card: CARD, outcome: 'incomplete' }]);
    expect(b.state).toMatchObject({ phase: 'resolved', currentPhase: 'endgame' });
  });

  it('the game ending closes open watchers too, and the recap lists every phase', () => {
    const s0 = stepMission(IDLE, { kind: 'start', cards: [MG], watchers: [CARD] }).state;
    const over = stepMission(s0, { kind: 'game-over' });
    expect(over.effects).toEqual([
      { kind: 'record', card: CARD, outcome: 'incomplete', watcher: true },
      { kind: 'recap', results: {} },
    ]);
  });
});


describe('a boss game owns the board with nothing to teach', () => {
  it('an owned start with no card and no watcher still starts (silent), and recaps once at the end', async () => {
    const { stepMission, IDLE, missionOwnsGame } = await import('./missionRunner');
    expect(missionOwnsGame(stepMission(IDLE, { kind: 'start', cards: [], watchers: [] }).state)).toBe(false);
    const owned = stepMission(IDLE, { kind: 'start', cards: [], watchers: [], owned: true });
    expect(missionOwnsGame(owned.state)).toBe(true);
    expect(owned.effects).toEqual([]);
    const over = stepMission(owned.state, { kind: 'game-over' });
    expect(over.effects).toEqual([{ kind: 'recap', results: {} }]);
  });
});

describe('a move that ends the game hands on to nothing', () => {
  it("a pass on the game's last move never starts the next card's scenario; mid-game it does", async () => {
    const { stepMission, IDLE } = await import('./missionRunner');
    const { MISSIONS } = await import('./registry');
    const passes: MissionCard = { ...MISSIONS['free-piece-stay-ahead'], check: (g) => ({ state: 'pass', ply: g.sans.length - 1 }) };
    const kq = MISSIONS['kq-mate'];
    const begun = stepMission(IDLE, { kind: 'start', cards: [passes, kq] });
    expect(begun.state.card?.id).toBe('free-piece-stay-ahead');
    const move = (sans: string[]) => stepMission(begun.state, { kind: 'moved', game: { sans, studentColor: 'b' }, fenBefore: '', candidatesUci: [] });
    // Fool's mate: the student's move mates — the card passes and the game is over.
    const mated = move(['f3', 'e5', 'g4', 'Qh4#']);
    expect(mated.effects.some((e) => e.kind === 'load-position')).toBe(false);
    expect(mated.state.card?.id).toBe('free-piece-stay-ahead');
    expect(mated.state.phase).toBe('resolved');
    // The same pass on a move that does not end the game hands on to the K+Q scenario.
    const onward = move(['e4', 'e5']);
    expect(onward.effects.some((e) => e.kind === 'load-position')).toBe(true);
    expect(onward.state.card?.id).toBe('kq-mate');
  });
});
