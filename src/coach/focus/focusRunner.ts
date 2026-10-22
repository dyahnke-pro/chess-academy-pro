/**
 * THE FOCUS RUNNER (WO-LEARN-FOCUS-01 → WO-FOCUS-TACTICS-01,
 * `docs/LEARN-FOCUS.md` §4, §9, §10) — a pure state machine.
 * `stepFocus(state, event)` returns the next state and the EFFECTS; the page
 * only carries them out (`useFocusRunner`). Every decision — when to ask,
 * when to teach a miss, when a chance is prompted, when the rung moves — is
 * made here, where a test can hold it.
 *
 * EVERY GAME IS THE TACTICS FOCUS, the same for everyone (David 2026-10-22:
 * "Should be the same as now but tactics added in"): the pre-game line, then
 * the coach speaks on a MISS only — a find is silent (it pays its coins and
 * burst), and only a find that answers a question said out loud is credited
 * in words. What the RUNG decides (`RUNG_TIERS`):
 *   - rung 0: the first chance is asked; a miss holds the board — a clue,
 *     then Try again / Play on; a second miss offers Show me (the student's
 *     tap, never automatic) or Play on;
 *   - rung 1: the same, and a second miss plays on with no answer;
 *   - rungs 2–3: no pause and no clue — the coach punishes, and the recap
 *     shows it.
 * The answer is NEVER shown unasked. Every miss goes on the recap's list, with
 * Play it out from the board before it. The one exception outside the focus
 * is a deciding blunder, once a game, at rungs 0–1: "That one decides the
 * game. Want it back?"
 */
import { Chess, type Color } from 'chess.js';
import type { MisconceptionTagId } from '../../data/misconceptionTags';
import { levelOfTag, type MotifLevel } from '../../data/tacticMotifs';
import type { RewardKind } from '../../services/rewardEvents';
import {
  chancesAt, decidingBlunder, judgeChance, leftLoose, solvePlies,
  type ChanceDifficulty, type ChanceVerdict, type FocusChance, type FocusMove, type ReadLine,
} from './focusChances';
import { askLine, clueLine, creditLine, endLine, recapLabel, shownLine } from './focusLines';
import { DECIDING_LINE, type FocusId, type FocusSeat } from './focusCard';
import type { FocusSetup } from './focusSetup';
import { NO_PLANTS, plantAsk, presents, type FocusPlantAsk, type PlantState } from './focusPlant';
import { RUNG_TIERS, rungFrom, rungProgressLine, rungUpLine, type RungGame, type TacticsRung } from './focusRung';
import {
  CASTLE_LOSING_CP, CASTLE_REMINDER_LINE, CASTLE_REWIND_ASK, castleProbe, castleReady, castleStopLine, castleVerdict,
  isAttack, reminderDue, rewindTarget, type CastleBoard, type CastleProbe, type CastleSide,
} from './castlingWatch';

export interface SeatTally { posed: number; found: number; missed: number; steered: number }

/** Who made the chance on this board: the coach's planted slip on your side,
 *  its flipped tactic on theirs, or nobody. */
export type PlantedSeat = FocusSeat | null;

interface BoardState {
  fen: string;
  prevFen: string | null;
  /** The ply the user's next move will be (1-based, `GameRecord.promptedPlies`). */
  ply: number;
  student: Color;
  lines: readonly ReadLine[] | null;
  chances: FocusChance[];
  /** The coach's last move was steered to pose the defend seat. */
  steered: boolean;
  /** The coach's last move was a plant (`focusPlant`): a chance in that seat
   *  here counts half, like a steered one. */
  planted: PlantedSeat;
  /** A question was asked on this board. */
  prompted: boolean;
  /** The chance a question was asked about OUT LOUD on this board (the
   *  opening ask, or one carried open from a spoken question). Its find is
   *  the only one ever spoken: David 2026-10-22, "only fire when the user
   *  misses a move — say nothing if the user finds the right move without
   *  the prompt". */
  askedChance: string | null;
}

interface PauseState {
  /** The focus chance the move missed — null for a deciding blunder. */
  chance: FocusChance | null;
  fenBefore: string;
  ply: number;
  /** The move that missed it, for the record. */
  san: string;
  /** 0 = awaiting the first decision; 1 = taken back, a retry is owed;
   *  2 = missed again, awaiting Show me / Play on (rung 0). */
  retries: 0 | 1 | 2;
  /** Prompted when the miss happened (an asked board). */
  prompted: boolean;
  steered: boolean;
  planted: boolean;
  /** A castling STOP: the board "Go back and castle" rewinds to. */
  castle?: CastleBoard;
}

/** THE CASTLING WATCH's game state (`castlingWatch`, PLAN.md item 5). */
interface CastleState {
  /** The early reminder was said (once a game). */
  reminded: boolean;
  /** Boards the student moved from with castling ready — the rewind's targets. */
  boards: CastleBoard[];
  /** A costly move held while the page reads the what-if. */
  probe: { fenBefore: string; san: string; ply: number; student: Color; probe: CastleProbe } | null;
}

/** One castling-watch decision, for the audit (`castle-watch`). */
export interface CastleRow {
  ply: number;
  verdict: 'stop' | 'quiet' | 'reminder' | 'no-read';
  side: CastleSide | null;
  bestCp: number | null;
  realCp: number | null;
  whatIfCp: number | null;
  /** What the move cost, and how much of it the castled king would have held. */
  drop: number | null;
  gain: number | null;
  losing: boolean;
  attack: boolean;
  /** The board ply "Go back and castle" would rewind to, or null. */
  rewindPly: number | null;
}

/** A chance missed this game, for the recap's Play it out. */
export interface MissedChance {
  ply: number;
  fenBefore: string;
  seat: FocusSeat;
  kind: FocusChance['kind'];
  tag: MisconceptionTagId;
  difficulty: ChanceDifficulty;
  /** The engine's line from the board before (UCI, student first), when known. */
  line: readonly string[] | null;
  /** How many plies of `line` Play it out walks (`solvePlies`). */
  solve: number;
  /** "Move 14 — a loose piece of theirs". Never the answer. */
  label: string;
}

export interface FocusRunState {
  setup: FocusSetup | null;
  asked: boolean;
  board: BoardState | null;
  pause: PauseState | null;
  decidingUsed: boolean;
  /** Chances left OPEN by the last move (a check, or material taken
   *  elsewhere, with the piece still to be won): the same decision is judged
   *  on the next move, so it keeps the flags it was first posed with — a
   *  question the coach asked stays prompted until it is answered. */
  carried: Array<{ key: string; prompted: boolean; steered: boolean; asked: boolean }>;
  tally: Record<FocusSeat, SeatTally>;
  /** Unprompted answers to chances at least as hard as the rung (either
   *  seat) — what moves the rung. */
  atRung: { found: number; missed: number };
  missed: MissedChance[];
  /** The coach's planted chances this game (`focusPlant`). */
  plant: PlantState;
  castle: CastleState;
}

/** What a focus find pays, by what was found — the same reward vocabulary
 *  as every other surface. `rank` picks the one reward when one move finds
 *  two things. Exhaustive: a new chance kind fails to compile until priced. */
const FIND_REWARD: Record<FocusChance['kind'], { reward: RewardKind; rank: number }> = {
  save: { reward: 'saved', rank: 2 },
  leave: { reward: 'saved', rank: 2 },
  motif: { reward: 'saved', rank: 2 },
  take: { reward: 'punished', rank: 3 },
  shot: { reward: 'punished', rank: 3 },
  'mate-threat': { reward: 'onlyMove', rank: 4 },
  'mate-for-you': { reward: 'onlyMove', rank: 4 },
};
/** A find on the retry, after a taught miss: the smaller celebration. */
export const RETRY_REWARD: RewardKind = 'missionRetry';
/** A rung-up: its own moment (David 2026-10-22: "Make sure the dopamine tools
 *  are linked"). */
const RUNG_UP_REWARD: RewardKind = 'levelUp';

function toSquare(fen: string, san: string): string | null {
  try { return new Chess(fen).move(san).to; } catch { return null; }
}

const EMPTY_TALLY = (): Record<FocusSeat, SeatTally> => ({
  defend: { posed: 0, found: 0, missed: 0, steered: 0 },
  exploit: { posed: 0, found: 0, missed: 0, steered: 0 },
});

const NO_CASTLE: CastleState = { reminded: false, boards: [], probe: null };

export const FOCUS_IDLE: FocusRunState = { setup: null, asked: false, board: null, pause: null, decidingUsed: false, carried: [], tally: EMPTY_TALLY(), atRung: { found: 0, missed: 0 }, missed: [], plant: NO_PLANTS, castle: NO_CASTLE };

export type FocusEvent =
  | { kind: 'start'; setup: FocusSetup }
  | { kind: 'stop' }
  /** The user is to move on this board. */
  | { kind: 'board'; fen: string; prevFen: string | null; ply: number; student: Color; lines: readonly ReadLine[] | null; steered: boolean; planted: PlantedSeat }
  /** An engine read landed for the board the user is on. */
  | { kind: 'read'; fen: string; lines: readonly ReadLine[] }
  /** The user moved (before the coach replies). */
  | { kind: 'moved'; move: FocusMove }
  | { kind: 'try-again' }
  | { kind: 'play-on' }
  /** The student tapped Show me after a second miss (rung 0). */
  | { kind: 'show-me' }
  /** The page read the castling probe's boards (the student's view, cp; null
   *  when a read failed). */
  | { kind: 'castle-read'; fenBefore: string; realCp: number | null; whatIfCp: number | null }
  | { kind: 'game-over'; at: number };

export type SayLine = 'announce' | 'ask' | 'credit' | 'clue' | 'shown' | 'deciding' | 'end' | 'rung-up' | 'castle-stop' | 'castle-reminder';

export interface FocusTurnRow {
  ply: number;
  focus: FocusId;
  seat: FocusSeat;
  kind: FocusChance['kind'];
  /** The skill row the chance is scored under (a motif's own tag), so an
   *  audit can hold that only OPEN motif levels are asked (WO-MOTIFS-01). */
  tag: MisconceptionTagId;
  /** That row's motif level, null for a skill that is not a motif row. */
  level: MotifLevel | null;
  outcome: ChanceVerdict;
  spoke: 'credit' | 'clue' | 'shown' | 'deciding' | 'none';
  prompted: boolean;
  steered: boolean;
  /** A chance the coach planted (`focusPlant`). */
  planted: boolean;
  /** How hard the chance was to find (`ChanceDifficulty`, the rung scale). */
  difficulty: ChanceDifficulty;
  /** The game's rung. */
  rung: TacticsRung;
  /** The board held for the student (a pause), or the coach replied. */
  held: boolean;
  retry: boolean;
  /** The reward this row fired (coins + burst), or null. */
  reward: RewardKind | null;
}

export interface FocusResult {
  focus: FocusId;
  rung: TacticsRung;
  tally: Record<FocusSeat, SeatTally>;
  /** Unprompted answers at the rung — what moves the rung. */
  atRung: { found: number; missed: number };
  /** The first chance on your side at your rung, or null: the guarantee was
   *  not met (the game ended first — logged, never assumed). */
  presented: PlantState['presented'];
  /** The next game's rung, and the step this game took. */
  next: { rung: TacticsRung; step: 'up' | 'back' | null };
  /** "2 of 3 finds to Intermediate", or null at the top. */
  progress: string | null;
  missed: MissedChance[];
}

export type FocusEffect =
  | { kind: 'say'; text: string; line: SayLine }
  /** This ply was prompted: the page files it in `promptedPlies`. */
  | { kind: 'prompt'; ply: number }
  /** A steered chance: the page files the ply in `steeredPlies`. */
  | { kind: 'steered'; ply: number }
  | { kind: 'record'; chance: FocusChance; outcome: 'held' | 'broken'; fen: string; san: string; prompted: boolean; steered: boolean; takenBack: boolean }
  /** A deciding blunder taken back: the page files the miss under its classified tag. */
  | { kind: 'record-deciding'; fen: string; san: string }
  /** Stop before the coach replies; the banner offers its buttons. */
  | { kind: 'hold'; deciding: boolean }
  | { kind: 'undo' }
  | { kind: 'show'; uci: string; fen: string }
  /** Let the coach reply to the move that stands; `punish` = a focus miss stands. */
  | { kind: 'reply'; punish: boolean }
  | { kind: 'turn'; row: FocusTurnRow }
  /** THE REWARD LAYER, TIED TO THE FOCUS (David 2026-10-22: "make sure the
   *  dopamine tools are working here as well … tie them into the focus"): a
   *  focus find fires its coins and burst; `null` is a miss, which breaks the
   *  streak. In a focus game nothing else rewards (checkmate aside). */
  | { kind: 'reward'; reward: RewardKind | null; square: string | null; ply: number; label?: string }
  /** THE CASTLING WATCH: hold the move and read these boards, then send
   *  `castle-read`. */
  | { kind: 'probe'; probe: CastleProbe }
  /** A castling STOP: the miss filed as `king-stuck-center`. */
  | { kind: 'record-castle'; fen: string; san: string }
  /** "Go back and castle": take back to the board the student's move at
   *  `ply` is played from. */
  | { kind: 'rewind'; ply: number }
  | { kind: 'castle-row'; row: CastleRow }
  | { kind: 'end'; text: string; result: FocusResult };

export interface FocusStep { state: FocusRunState; effects: FocusEffect[] }

function sameBoard(a: string, b: string): boolean {
  return a.split(' ').slice(0, 4).join(' ') === b.split(' ').slice(0, 4).join(' ');
}

/** The chance a rung-0 game asks first: yours when there is one (the
 *  promised chance), else theirs. */
function leadChance(chances: readonly FocusChance[]): FocusChance | null {
  return chances.find((c) => c.seat === 'exploit') ?? (chances.length > 0 ? chances[0] : null);
}

function withTally(t0: Record<FocusSeat, SeatTally>, seat: FocusSeat, v: 'found' | 'missed', steered: boolean): Record<FocusSeat, SeatTally> {
  const t = { defend: { ...t0.defend }, exploit: { ...t0.exploit } };
  t[seat].posed += 1;
  t[seat][v] += 1;
  if (steered) t[seat].steered += 1;
  return t;
}

/** An unprompted answer to a chance at the rung moves the rung. */
function withRung(r: FocusRunState['atRung'], ch: FocusChance, v: 'found' | 'missed', prompted: boolean, rung: TacticsRung): FocusRunState['atRung'] {
  if (prompted || ch.difficulty < rung) return r;
  return v === 'found' ? { ...r, found: r.found + 1 } : { ...r, missed: r.missed + 1 };
}

function missedOf(ch: FocusChance, ply: number, fenBefore: string): MissedChance {
  return { ply, fenBefore, seat: ch.seat, kind: ch.kind, tag: ch.tag, difficulty: ch.difficulty, line: ch.line ?? (ch.answerUci ? [ch.answerUci] : null), solve: solvePlies(ch, fenBefore), label: recapLabel(ch, ply) };
}

/** Recompute the board's chances and decide whether to ask. */
function onBoard(s: FocusRunState, b: BoardState): FocusStep {
  const setup = s.setup;
  if (!setup) return { state: s, effects: [] };
  const chances = chancesAt({ fen: b.fen, prevFen: b.prevFen, student: b.student, lines: b.lines }, new Set(setup.levels));
  // THE GUARANTEE (focusPlant): the first chance on your side at your rung —
  // the board's own or the coach's plant — presents the focus this game.
  const shown = s.plant.presented ? null : chances.find((c) => presents(c, setup.rung, b.ply, setup.targetPly)) ?? null;
  if (shown) s = { ...s, plant: { ...s.plant, presented: { ply: b.ply, difficulty: shown.difficulty } } };
  const effects: FocusEffect[] = [];
  let asked = s.asked;
  let prompted = b.prompted;
  let steered = b.steered;
  let askedChance = b.askedChance;
  const carried = s.carried.filter((c) => chances.some((ch) => ch.key === c.key));
  if (chances.length > 0) {
    if (!steered && carried.some((c) => c.steered)) steered = true;
    if ((steered && chances.some((c) => c.seat === 'defend')) || (b.planted && chances.some((c) => c.seat === b.planted))) effects.push({ kind: 'steered', ply: b.ply });
    if (!prompted && carried.some((c) => c.prompted)) { prompted = true; effects.push({ kind: 'prompt', ply: b.ply }); }
    askedChance = askedChance ?? carried.find((c) => c.asked)?.key ?? null;
    // RUNG 0: THE FIRST CHANCE IS ASKED, then the coach goes quiet.
    if (RUNG_TIERS[setup.rung].asksFirst && !asked) {
      const lead = leadChance(chances);
      if (lead) {
        asked = true;
        askedChance = lead.key;
        effects.push({ kind: 'say', text: askLine(lead, b.ply), line: 'ask' });
        if (!prompted) { prompted = true; effects.push({ kind: 'prompt', ply: b.ply }); }
      }
    }
  }
  return { state: { ...s, asked, board: { ...b, chances, prompted, steered, askedChance } }, effects };
}

function endOf(s: FocusRunState, at: number): FocusStep {
  const setup = s.setup;
  if (!setup) return { state: s, effects: [] };
  const thisGame: RungGame = { rung: setup.rung, found: s.atRung.found, missed: s.atRung.missed, at };
  const next = rungFrom([...setup.window, thisGame], setup.rung);
  const text = endLine({ yours: s.tally.exploit, theirs: s.tally.defend, presented: !!s.plant.presented });
  const result: FocusResult = {
    focus: setup.focus, rung: setup.rung, tally: s.tally, atRung: s.atRung, presented: s.plant.presented,
    next: { rung: next.rung, step: next.step },
    // A rung-up is said on the card too, ahead of the count toward the next.
    progress: next.step === 'up' ? [rungUpLine(next.rung), rungProgressLine(next)].filter(Boolean).join(' ') : rungProgressLine(next),
    missed: s.missed,
  };
  const effects: FocusEffect[] = [{ kind: 'say', text, line: 'end' }];
  if (next.step === 'up') {
    const up = rungUpLine(next.rung);
    effects.push({ kind: 'say', text: up, line: 'rung-up' });
    effects.push({ kind: 'reward', reward: RUNG_UP_REWARD, square: null, ply: s.board?.ply ?? 0, label: up.replace(/!$/, '').toUpperCase() });
  }
  effects.push({ kind: 'end', text, result });
  return { state: { ...s, pause: null }, effects };
}

export function stepFocus(s: FocusRunState, e: FocusEvent): FocusStep {
  switch (e.kind) {
    case 'start':
      return {
        state: { ...FOCUS_IDLE, setup: e.setup, tally: EMPTY_TALLY() },
        effects: [{ kind: 'say', text: e.setup.line, line: 'announce' }],
      };
    case 'stop':
      return { state: FOCUS_IDLE, effects: [] };
    case 'board': {
      if (!s.setup || s.pause) return { state: s, effects: [] };
      // A PLANTED board is a plant made: counted, and the spacing runs from here.
      const plant = e.planted ? { ...s.plant, count: s.plant.count + 1, flips: s.plant.flips + (e.planted === 'defend' ? 1 : 0), lastPly: e.ply } : s.plant;
      // A board with castling ready is where "Go back and castle" can return to.
      const castle = castleReady(e.fen, e.student)
        ? { ...s.castle, boards: [...s.castle.boards.filter((x) => x.ply < e.ply), { ply: e.ply, fen: e.fen, prevFen: e.prevFen, lines: e.lines }] }
        : s.castle;
      return onBoard({ ...s, plant, castle }, { fen: e.fen, prevFen: e.prevFen, ply: e.ply, student: e.student, lines: e.lines, chances: [], steered: e.steered, planted: e.planted, prompted: false, askedChance: null });
    }
    case 'read': {
      if (!s.setup || s.pause || !s.board || !sameBoard(s.board.fen, e.fen)) return { state: s, effects: [] };
      const boards = s.castle.boards.map((x) => (sameBoard(x.fen, e.fen) ? { ...x, lines: e.lines } : x));
      return onBoard({ ...s, castle: { ...s.castle, boards } }, { ...s.board, lines: e.lines });
    }
    case 'moved': return onMoved(s, e.move);
    case 'try-again': {
      const p = s.pause;
      if (!p || p.retries !== 0) return { state: s, effects: [] };
      if (p.castle) return goBackAndCastle(s, p.castle);
      const effects: FocusEffect[] = [{ kind: 'undo' }];
      // The miss is the user's, taken back: still on the record, unprompted
      // unless the board was asked.
      if (p.chance) effects.push({ kind: 'record', chance: p.chance, outcome: 'broken', fen: p.fenBefore, san: p.san, prompted: p.prompted, steered: p.steered, takenBack: true });
      else effects.push({ kind: 'record-deciding', fen: p.fenBefore, san: p.san });
      // The retry was told the moment: prompted.
      effects.push({ kind: 'prompt', ply: p.ply });
      const board = s.board ? { ...s.board, prompted: true } : null;
      return { state: { ...s, board, pause: { ...p, retries: 1, prompted: true } }, effects };
    }
    case 'play-on': {
      const p = s.pause;
      if (!p || p.retries === 1) return { state: s, effects: [] };
      // A castling STOP played on: the miss was filed when it was said; the
      // coach shows why.
      if (p.castle) return { state: { ...s, pause: null }, effects: [{ kind: 'reply', punish: true }] };
      const effects: FocusEffect[] = [];
      // A first decision's miss is recorded here; a second miss was recorded
      // when it was played.
      if (p.chance && p.retries === 0) effects.push({ kind: 'record', chance: p.chance, outcome: 'broken', fen: p.fenBefore, san: p.san, prompted: p.prompted, steered: p.steered, takenBack: false });
      const missed = p.chance && p.retries === 0 ? [...s.missed, missedOf(p.chance, p.ply, p.fenBefore)] : s.missed;
      effects.push({ kind: 'reply', punish: !!p.chance });
      return { state: { ...s, missed, pause: null }, effects };
    }
    case 'show-me': {
      const p = s.pause;
      if (!p || p.retries !== 2 || !p.chance) return { state: s, effects: [] };
      const effects: FocusEffect[] = [];
      if (p.chance.answerUci) effects.push({ kind: 'show', uci: p.chance.answerUci, fen: p.fenBefore });
      effects.push({ kind: 'say', text: shownLine(p.chance), line: 'shown' });
      effects.push({ kind: 'turn', row: row(s, p.chance, p.ply, 'missed', 'shown', true, p.steered, p.planted, false, true, null) });
      effects.push({ kind: 'reply', punish: true });
      return { state: { ...s, pause: null }, effects };
    }
    case 'castle-read': return onCastleRead(s, e);
    case 'game-over': return s.setup ? endOf(s, e.at) : { state: s, effects: [] };
  }
}

/** The castling probe's boards came back: STOP, or the move goes on. */
function onCastleRead(s: FocusRunState, e: Extract<FocusEvent, { kind: 'castle-read' }>): FocusStep {
  const pr = s.castle.probe;
  if (!s.setup || !pr || !sameBoard(pr.fenBefore, e.fenBefore)) return { state: s, effects: [] };
  const realCp = e.realCp ?? pr.probe.realCp;
  const base: CastleRow = { ply: pr.ply, verdict: 'no-read', side: pr.probe.side, bestCp: pr.probe.bestCp, realCp, whatIfCp: e.whatIfCp, drop: null, gain: null, losing: false, attack: false, rewindPly: null };
  const cleared: FocusRunState = { ...s, castle: { ...s.castle, probe: null } };
  const move = { fenBefore: pr.fenBefore, san: pr.san, student: pr.student };
  if (realCp === null || e.whatIfCp === null) return goOn(cleared, move, pr.ply, [{ kind: 'castle-row', row: base }]);
  const v = castleVerdict({ bestCp: pr.probe.bestCp, realCp, whatIfCp: e.whatIfCp });
  if (!v.stop) return goOn(cleared, move, pr.ply, [{ kind: 'castle-row', row: { ...base, verdict: 'quiet', drop: v.drop, gain: v.gain } }]);
  const losing = realCp <= CASTLE_LOSING_CP;
  const attack = isAttack(pr.fenBefore, pr.san);
  // The rewind goes to a board BEFORE this move — never forward.
  const target = rewindTarget(s.castle.boards.filter((b) => b.ply <= pr.ply), pr.student);
  const row: CastleRow = { ...base, verdict: 'stop', drop: v.drop, gain: v.gain, losing, attack, rewindPly: target?.ply ?? null };
  const effects: FocusEffect[] = [
    { kind: 'record-castle', fen: pr.fenBefore, san: pr.san },
    { kind: 'castle-row', row },
    { kind: 'say', text: target ? `${castleStopLine(losing, attack)} ${CASTLE_REWIND_ASK}` : castleStopLine(losing, attack), line: 'castle-stop' },
    { kind: 'reward', reward: null, square: null, ply: pr.ply },
  ];
  if (!target) {
    effects.push({ kind: 'reply', punish: true });
    return { state: cleared, effects };
  }
  effects.push({ kind: 'hold', deciding: false });
  return {
    state: { ...cleared, pause: { chance: null, fenBefore: pr.fenBefore, ply: pr.ply, san: pr.san, retries: 0, prompted: false, steered: false, planted: false, castle: target } },
    effects,
  };
}

/** No STOP: the early reminder when it is due, then the coach replies. */
function goOn(s: FocusRunState, m: { fenBefore: string; san: string; student: Color }, ply: number, effects: FocusEffect[]): FocusStep {
  let state = s;
  if (reminderDue(m, ply, s.castle.reminded)) {
    state = { ...s, castle: { ...s.castle, reminded: true } };
    effects.push({ kind: 'say', text: CASTLE_REMINDER_LINE, line: 'castle-reminder' });
    effects.push({ kind: 'castle-row', row: { ply, verdict: 'reminder', side: null, bestCp: null, realCp: null, whatIfCp: null, drop: null, gain: null, losing: false, attack: false, rewindPly: null } });
  }
  effects.push({ kind: 'reply', punish: false });
  return { state, effects };
}

/** "Go back and castle": take back to the board castling was ready on, told
 *  (castling there is prompted and counts neither way). */
function goBackAndCastle(s: FocusRunState, target: CastleBoard): FocusStep {
  const rewound: FocusRunState = { ...s, pause: null, carried: [], castle: { ...s.castle, boards: s.castle.boards.filter((b) => b.ply <= target.ply) } };
  const step = onBoard(rewound, { fen: target.fen, prevFen: target.prevFen, ply: target.ply, student: target.fen.split(' ')[1] === 'b' ? 'b' : 'w', lines: target.lines, chances: [], steered: false, planted: null, prompted: true, askedChance: null });
  return { state: step.state, effects: [{ kind: 'rewind', ply: target.ply }, { kind: 'prompt', ply: target.ply }, ...step.effects] };
}

function onMoved(s: FocusRunState, m: FocusMove): FocusStep {
  const setup = s.setup;
  if (!setup) return { state: s, effects: [{ kind: 'reply', punish: false }] };
  const tier = RUNG_TIERS[setup.rung];
  const b = s.board && sameBoard(s.board.fen, m.fenBefore) ? s.board : null;
  const ply = b?.ply ?? 0;
  const effects: FocusEffect[] = [];
  let state = s;

  // ── A RETRY after Try again: the same decision, judged again ───────────────
  // Only on the same board: a move from another board (the bar's Takeback
  // undid more) is a new decision, never a second answer to the old one.
  if (s.pause && s.pause.retries === 1 && !sameBoard(s.pause.fenBefore, m.fenBefore)) state = { ...s, pause: null };
  if (state.pause && state.pause.retries === 1) {
    const p = state.pause;
    if (p.chance) {
      const v = judgeChance(p.chance, m);
      if (v === 'missed') {
        // A SECOND MISS AT ONE DECISION: never the answer unasked. Rung 0 holds
        // the board for Show me / Play on; rung 1 plays on.
        effects.push({ kind: 'record', chance: p.chance, outcome: 'broken', fen: m.fenBefore, san: m.san, prompted: true, steered: p.steered, takenBack: false });
        effects.push({ kind: 'reward', reward: null, square: null, ply });
        const missed = [...state.missed, missedOf(p.chance, p.ply, p.fenBefore)];
        if (tier.showMe) {
          effects.push({ kind: 'turn', row: row(state, p.chance, ply, v, 'none', true, p.steered, p.planted, true, true, null) });
          effects.push({ kind: 'hold', deciding: false });
          return { state: { ...state, missed, pause: { ...p, san: m.san, retries: 2 } }, effects };
        }
        effects.push({ kind: 'turn', row: row(state, p.chance, ply, v, 'none', true, p.steered, p.planted, false, true, null) });
        effects.push({ kind: 'reply', punish: true });
        return { state: { ...state, missed, pause: null }, effects };
      }
      if (v === 'found') {
        effects.push({ kind: 'record', chance: p.chance, outcome: 'held', fen: m.fenBefore, san: m.san, prompted: true, steered: p.steered, takenBack: false });
        effects.push({ kind: 'say', text: creditLine(p.chance, ply, m), line: 'credit' });
        effects.push({ kind: 'turn', row: row(state, p.chance, ply, v, 'credit', true, p.steered, p.planted, false, true, RETRY_REWARD) });
        effects.push({ kind: 'reward', reward: RETRY_REWARD, square: toSquare(m.fenBefore, m.san), ply });
        effects.push({ kind: 'reply', punish: false });
        return { state: { ...state, pause: null }, effects };
      }
    }
    // A deciding blunder's retry, or an exempt one: the game goes on. A retry
    // that leaves the question open carries it, told, to the next move.
    effects.push({ kind: 'reply', punish: false });
    const carried = p.chance ? [{ key: p.chance.key, prompted: true, steered: p.steered, asked: true }] : [];
    return { state: { ...state, pause: null, carried }, effects };
  }

  // ── A FIRST MOVE on this board ─────────────────────────────────────────────
  const prompted = !!b?.prompted;
  const steered = !!b?.steered;
  // The coach CREATED this chance — your defend seat by a steer, either seat
  // by a plant: a find counts half (a miss counts in full).
  const plantedOf = (c: FocusChance): boolean => !!b?.planted && c.seat === b.planted;
  const halfOf = (c: FocusChance): boolean => (steered && c.seat === 'defend') || plantedOf(c);
  const verdicts: Array<{ chance: FocusChance; v: ChanceVerdict }> = (b?.chances ?? []).map((chance) => ({ chance, v: judgeChance(chance, m) }));
  const left = leftLoose(m);
  if (left && !verdicts.some((x) => x.chance.key === left.key || (x.v === 'missed' && x.chance.kind === 'save'))) verdicts.push({ chance: left, v: 'missed' });
  const carried = verdicts.filter((x) => x.v === 'exempt').map((x) => ({ key: x.chance.key, prompted, steered: halfOf(x.chance), asked: b?.askedChance === x.chance.key }));
  // A miss on your side asks the next plant for the same pattern.
  let plant = s.plant;
  for (const x of verdicts) if (x.chance.seat === 'exploit' && x.v === 'missed') plant = { ...plant, need: x.chance.tag };
  let tally = s.tally;
  let atRung = s.atRung;
  // ONE reward per move: the biggest find pays (two finds on one move are
  // one moment). A move with a miss pays nothing — its finds are recorded,
  // but the move is a miss, and a retry pays.
  const missed = verdicts.filter((x) => x.v === 'missed');
  const paid = missed.length > 0 ? null : verdicts.filter((x) => x.v === 'found').sort((a, c) => FIND_REWARD[c.chance.kind].rank - FIND_REWARD[a.chance.kind].rank)[0]?.chance ?? null;
  for (const { chance, v } of verdicts) {
    if (v !== 'found') continue;
    const chanceSteered = halfOf(chance);
    tally = withTally(tally, chance.seat, 'found', chanceSteered);
    atRung = withRung(atRung, chance, 'found', prompted, setup.rung);
    effects.push({ kind: 'record', chance, outcome: 'held', fen: m.fenBefore, san: m.san, prompted, steered: chanceSteered, takenBack: false });
    // A find is spoken only when it answers a question said out loud; every
    // other find is silent, and counted in the end line.
    const say = b?.askedChance === chance.key;
    if (say) effects.push({ kind: 'say', text: creditLine(chance, ply, m), line: 'credit' });
    effects.push({ kind: 'turn', row: row(state, chance, ply, v, say ? 'credit' : 'none', prompted, chanceSteered, plantedOf(chance), false, false, chance === paid ? FIND_REWARD[chance.kind].reward : null) });
  }
  if (paid) effects.push({ kind: 'reward', reward: FIND_REWARD[paid.kind].reward, square: toSquare(m.fenBefore, m.san), ply });
  state = { ...state, carried, tally, atRung, plant };
  if (missed.length > 0) {
    for (const { chance } of missed) {
      tally = withTally(tally, chance.seat, 'missed', halfOf(chance));
      atRung = withRung(atRung, chance, 'missed', prompted, setup.rung);
    }
    effects.push({ kind: 'reward', reward: null, square: null, ply });
    // THE TOP RUNGS PLAY ON: no pause, no clue — every miss recorded, the
    // coach punishes, and the recap shows it.
    if (!tier.pauses) {
      for (const { chance } of missed) {
        effects.push({ kind: 'record', chance, outcome: 'broken', fen: m.fenBefore, san: m.san, prompted, steered: halfOf(chance), takenBack: false });
        effects.push({ kind: 'turn', row: row(state, chance, ply, 'missed', 'none', prompted, halfOf(chance), plantedOf(chance), false, false, null) });
      }
      effects.push({ kind: 'reply', punish: true });
      return { state: { ...state, tally, atRung, missed: [...state.missed, ...missed.map((x) => missedOf(x.chance, ply, m.fenBefore))] }, effects };
    }
    // RUNGS 0–1: the miss the game leans on — yours first — is taught on the
    // spot; the rest are recorded.
    const lead = missed.find((x) => x.chance.seat === 'exploit') ?? missed[0];
    const others = missed.filter((x) => x !== lead);
    for (const { chance } of others) {
      effects.push({ kind: 'record', chance, outcome: 'broken', fen: m.fenBefore, san: m.san, prompted, steered: halfOf(chance), takenBack: false });
      effects.push({ kind: 'turn', row: row(state, chance, ply, 'missed', 'none', prompted, halfOf(chance), plantedOf(chance), false, false, null) });
    }
    effects.push({ kind: 'say', text: clueLine(lead.chance, ply), line: 'clue' });
    effects.push({ kind: 'turn', row: row(state, lead.chance, ply, 'missed', 'clue', prompted, halfOf(lead.chance), plantedOf(lead.chance), true, false, null) });
    effects.push({ kind: 'hold', deciding: false });
    return {
      state: {
        ...state, tally, atRung,
        missed: [...state.missed, ...others.map((x) => missedOf(x.chance, ply, m.fenBefore))],
        pause: { chance: lead.chance, fenBefore: m.fenBefore, ply, san: m.san, retries: 0, prompted, steered: halfOf(lead.chance), planted: plantedOf(lead.chance) },
      },
      effects,
    };
  }
  // ── The one exception: an off-focus move that decides the game (rungs 0–1) ──
  if (tier.pauses && !s.decidingUsed) {
    const d = decidingBlunder(m);
    if (d) {
      effects.push({ kind: 'say', text: DECIDING_LINE, line: 'deciding' });
      effects.push({ kind: 'hold', deciding: true });
      return { state: { ...state, decidingUsed: true, pause: { chance: null, fenBefore: m.fenBefore, ply, san: m.san, retries: 0, prompted, steered: false, planted: false } }, effects };
    }
  }
  // ── THE CASTLING WATCH: a costly move with the king uncastled is held while
  // the page reads the castled what-if (`castle-read` decides). ─────────────
  const probe = b ? castleProbe(m) : null;
  if (probe) {
    effects.push({ kind: 'probe', probe });
    return { state: { ...state, castle: { ...state.castle, probe: { fenBefore: m.fenBefore, san: m.san, ply, student: m.student, probe } } }, effects };
  }
  return b ? goOn(state, m, ply, effects) : { state, effects: [...effects, { kind: 'reply', punish: false }] };
}

function row(s: FocusRunState, chance: FocusChance, ply: number, outcome: ChanceVerdict, spoke: FocusTurnRow['spoke'], prompted: boolean, steered: boolean, planted: boolean, held: boolean, retry: boolean, reward: RewardKind | null): FocusTurnRow {
  return { ply, focus: s.setup?.focus ?? 'tactics', seat: chance.seat, kind: chance.kind, tag: chance.tag, level: levelOfTag(chance.tag), outcome, spoke, prompted, steered, planted, difficulty: chance.difficulty, rung: s.setup?.rung ?? 0, held, retry, reward };
}

/** Whether the coach may plant a chance on the move before board `ply` (the
 *  ply the user's next move will be), and what pattern (`focusPlant`). `fen`
 *  is the board the coach moves from. Never while the board waits on a
 *  decision, never outside a focus game. */
export function focusPlantAsk(s: FocusRunState, ply: number, fen: string): FocusPlantAsk | null {
  if (!s.setup || s.pause || s.castle.probe) return null;
  return plantAsk(s.plant, { rung: s.setup.rung, posed: s.tally.exploit.posed, targetPly: s.setup.targetPly }, ply, fen);
}

/** The runner reads the user's moves now (a focus game is on). */
export function focusOwnsGame(s: FocusRunState): boolean {
  return s.setup !== null;
}
