/**
 * THE FOCUS RUNNER (WO-LEARN-FOCUS-01, `docs/LEARN-FOCUS.md` §4, §9, §10) — a
 * pure state machine. `stepFocus(state, event)` returns the next state and the
 * EFFECTS; the page only carries them out (`useFocusRunner`). Every decision —
 * when to ask, when to credit, when to stop the board and teach the miss, when
 * a chance is prompted — is made here, where a test can hold it.
 *
 * THE FADE: a red or grey focus is named before the game and its first chance
 * is asked; every later chance is a quiet test. A short focus is unannounced
 * until the first miss is taught, and from then on every chance of that game
 * is prompted (the focus is revealed). A green focus is a silent watch. In
 * every mode a miss is taught on the spot: the coach stops before it replies,
 * says the clue, and Try again takes the move back (the retry is prompted) or
 * Play on lets it stand (the coach punishes). A second miss at one decision
 * shows the answer and plays on. The one exception outside the focus is a
 * deciding blunder, once a game: "That one decides the game. Want it back?"
 */
import type { Color } from 'chess.js';
import {
  chancesAt, decidingBlunder, judgeChance, leftLoose,
  type ChanceVerdict, type FocusChance, type FocusMove, type ReadLine,
} from './focusChances';
import { askLine, clueLine, creditLine, foundOf, shownLine } from './focusLines';
import { DECIDING_LINE, FOCUS_CARDS, REVIEW_HAS_THE_REST, type FocusId, type FocusSeat } from './focusCard';
import type { FocusPick } from './focusPicker';

export interface SeatTally { posed: number; found: number; missed: number; steered: number }

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
  /** A question was asked on this board (or the focus is revealed). */
  prompted: boolean;
}

interface PauseState {
  /** The focus chance the move missed — null for a deciding blunder. */
  chance: FocusChance | null;
  fenBefore: string;
  ply: number;
  /** The move that missed it, for the record. */
  san: string;
  /** 0 = awaiting the first decision; 1 = the move was taken back, a retry is owed. */
  retries: number;
  /** Prompted when the miss happened (an asked board). */
  prompted: boolean;
  steered: boolean;
}

export interface FocusRunState {
  pick: FocusPick | null;
  announced: boolean;
  asked: boolean;
  board: BoardState | null;
  pause: PauseState | null;
  decidingUsed: boolean;
  /** Chance keys already credited this game (said once). */
  credited: string[];
  /** A find is credited out loud only when it TEACHES: the first find of the
   *  game, and the first find after a miss (the correction). Every other find
   *  is a quiet test — recorded and counted in the end line, never said. The
   *  first prod game on David's record credited thirteen routine saves ("your
   *  queen is safe on a4 now") and ran to 19 lines; this is the lever on the
   *  8–15 lines a game, not a cap. */
  creditOwed: boolean;
  /** Chance keys of a ONCE-A-GAME decision already answered (castling): the
   *  question stands move after move, and is one decision, so it is asked,
   *  judged and recorded once. Prod kings game 2 recorded one castling
   *  decision six times. */
  resolved: string[];
  /** Chances left OPEN by the last move (a check, or material taken
   *  elsewhere, with the piece still to be won): the same decision is judged
   *  on the next move, so it keeps the flags it was first posed with — a
   *  question the coach asked stays prompted until it is answered. */
  carried: Array<{ key: string; prompted: boolean; steered: boolean }>;
  tally: Record<FocusSeat, SeatTally>;
}

/** The chance kinds that are ONE decision a game, however many moves the
 *  question stands. */
const ONCE_A_GAME: ReadonlySet<FocusChance['kind']> = new Set<FocusChance['kind']>(['castle']);

const EMPTY_TALLY = (): Record<FocusSeat, SeatTally> => ({
  defend: { posed: 0, found: 0, missed: 0, steered: 0 },
  exploit: { posed: 0, found: 0, missed: 0, steered: 0 },
});

export const FOCUS_IDLE: FocusRunState = { pick: null, announced: false, asked: false, board: null, pause: null, decidingUsed: false, credited: [], creditOwed: true, resolved: [], carried: [], tally: EMPTY_TALLY() };

export type FocusEvent =
  | { kind: 'start'; pick: FocusPick }
  | { kind: 'stop' }
  /** The user is to move on this board. */
  | { kind: 'board'; fen: string; prevFen: string | null; ply: number; student: Color; lines: readonly ReadLine[] | null; steered: boolean }
  /** An engine read landed for the board the user is on. */
  | { kind: 'read'; fen: string; lines: readonly ReadLine[] }
  /** The user moved (before the coach replies). */
  | { kind: 'moved'; move: FocusMove }
  | { kind: 'try-again' }
  | { kind: 'play-on' }
  | { kind: 'game-over' };

export type SayLine = 'announce' | 'ask' | 'credit' | 'clue' | 'shown' | 'deciding' | 'end';

export interface FocusTurnRow {
  ply: number;
  focus: FocusId;
  seat: FocusSeat;
  kind: FocusChance['kind'];
  outcome: ChanceVerdict;
  spoke: 'credit' | 'clue' | 'shown' | 'deciding' | 'none';
  prompted: boolean;
  steered: boolean;
  retry: boolean;
}

export interface FocusResult {
  focus: FocusId;
  mode: FocusPick['mode'];
  announced: boolean;
  revealed: boolean;
  tally: Record<FocusSeat, SeatTally>;
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
  /** Stop before the coach replies; the banner offers Try again / Play on. */
  | { kind: 'hold'; deciding: boolean }
  | { kind: 'undo' }
  | { kind: 'show'; uci: string; fen: string }
  /** Let the coach reply to the move that stands; `punish` = a focus miss stands. */
  | { kind: 'reply'; punish: boolean }
  | { kind: 'turn'; row: FocusTurnRow }
  | { kind: 'end'; text: string; result: FocusResult };

export interface FocusStep { state: FocusRunState; effects: FocusEffect[] }

function sameBoard(a: string, b: string): boolean {
  return a.split(' ').slice(0, 4).join(' ') === b.split(' ').slice(0, 4).join(' ');
}

/** The chance the game leans on: the weaker seat's first, else the first. */
function leadChance(chances: readonly FocusChance[], seat: FocusSeat): FocusChance | null {
  return chances.find((c) => c.seat === seat) ?? (chances.length > 0 ? chances[0] : null);
}

function endText(s: FocusRunState): string {
  if (!s.pick) return REVIEW_HAS_THE_REST;
  const card = FOCUS_CARDS[s.pick.focus];
  const chances = s.tally.defend.found + s.tally.defend.missed + s.tally.exploit.found + s.tally.exploit.missed;
  const found = s.tally.defend.found + s.tally.exploit.found;
  const head = s.announced ? `${card.title} today` : `Today's hidden focus was ${card.title.toLowerCase()}`;
  if (chances === 0) return `${head}: it never came up this game. ${REVIEW_HAS_THE_REST}`;
  return `${head}: ${foundOf(found, chances)}. ${REVIEW_HAS_THE_REST}`;
}

function withTally(s: FocusRunState, seat: FocusSeat, v: 'found' | 'missed', steered: boolean): Record<FocusSeat, SeatTally> {
  const t = { defend: { ...s.tally.defend }, exploit: { ...s.tally.exploit } };
  t[seat].posed += 1;
  t[seat][v] += 1;
  if (steered) t[seat].steered += 1;
  return t;
}

/** Recompute the board's chances and decide whether to ask. */
function onBoard(s: FocusRunState, b: BoardState): FocusStep {
  if (!s.pick) return { state: s, effects: [] };
  const chances = chancesAt({ fen: b.fen, prevFen: b.prevFen, student: b.student, lines: b.lines }, s.pick.focus)
    .filter((c) => !(ONCE_A_GAME.has(c.kind) && s.resolved.includes(c.key)));
  const effects: FocusEffect[] = [];
  let asked = s.asked;
  let prompted = b.prompted;
  let steered = b.steered;
  const carried = s.carried.filter((c) => chances.some((ch) => ch.key === c.key));
  if (chances.length > 0) {
    if (!steered && carried.some((c) => c.steered)) steered = true;
    if (steered && chances.some((c) => c.seat === 'defend')) effects.push({ kind: 'steered', ply: b.ply });
    if (!prompted && carried.some((c) => c.prompted)) { prompted = true; effects.push({ kind: 'prompt', ply: b.ply }); }
    // A REVEALED focus in a test game: every later chance is prompted.
    if (s.pick.mode !== 'teach' && s.announced && !prompted) { prompted = true; effects.push({ kind: 'prompt', ply: b.ply }); }
    // THE FIRST CHANCE OF A TEACH GAME IS ASKED, then the coach goes quiet.
    if (s.pick.mode === 'teach' && !asked) {
      const lead = leadChance(chances, s.pick.weakerSeat);
      if (lead) {
        asked = true;
        effects.push({ kind: 'say', text: askLine(lead, b.ply), line: 'ask' });
        if (!prompted) { prompted = true; effects.push({ kind: 'prompt', ply: b.ply }); }
      }
    }
  }
  return { state: { ...s, asked, board: { ...b, chances, prompted, steered } }, effects };
}

export function stepFocus(s: FocusRunState, e: FocusEvent): FocusStep {
  switch (e.kind) {
    case 'start':
      return {
        state: { ...FOCUS_IDLE, pick: e.pick, announced: e.pick.announced, tally: EMPTY_TALLY() },
        effects: [{ kind: 'say', text: e.pick.line, line: 'announce' }],
      };
    case 'stop':
      return { state: FOCUS_IDLE, effects: [] };
    case 'board': {
      if (!s.pick || s.pause) return { state: s, effects: [] };
      return onBoard(s, { fen: e.fen, prevFen: e.prevFen, ply: e.ply, student: e.student, lines: e.lines, chances: [], steered: e.steered, prompted: false });
    }
    case 'read': {
      if (!s.pick || s.pause || !s.board || !sameBoard(s.board.fen, e.fen)) return { state: s, effects: [] };
      return onBoard(s, { ...s.board, lines: e.lines });
    }
    case 'moved': return onMoved(s, e.move);
    case 'try-again': {
      const p = s.pause;
      if (!p) return { state: s, effects: [] };
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
      if (!p) return { state: s, effects: [] };
      const effects: FocusEffect[] = [];
      if (p.chance) effects.push({ kind: 'record', chance: p.chance, outcome: 'broken', fen: p.fenBefore, san: p.san, prompted: p.prompted, steered: p.steered, takenBack: false });
      effects.push({ kind: 'reply', punish: !!p.chance });
      return { state: { ...s, pause: null }, effects };
    }
    case 'game-over': {
      if (!s.pick) return { state: s, effects: [] };
      const result: FocusResult = { focus: s.pick.focus, mode: s.pick.mode, announced: s.pick.announced, revealed: s.announced && !s.pick.announced, tally: s.tally };
      return { state: { ...s, pause: null }, effects: [{ kind: 'say', text: endText(s), line: 'end' }, { kind: 'end', text: endText(s), result }] };
    }
  }
}

function onMoved(s: FocusRunState, m: FocusMove): FocusStep {
  if (!s.pick) return { state: s, effects: [{ kind: 'reply', punish: false }] };
  const b = s.board && sameBoard(s.board.fen, m.fenBefore) ? s.board : null;
  const ply = b?.ply ?? 0;
  const effects: FocusEffect[] = [];
  let state = s;

  // ── A RETRY after Try again: the same decision, judged again ───────────────
  // Only on the same board: a move from another board (the bar's Takeback
  // undid more) is a new decision, never a second answer to the old one.
  if (s.pause && s.pause.retries > 0 && !sameBoard(s.pause.fenBefore, m.fenBefore)) state = { ...s, pause: null };
  if (state.pause && state.pause.retries > 0) {
    const p = state.pause;
    if (p.chance) {
      const v = judgeChance(p.chance, m);
      if (v === 'missed') {
        // Second miss at one decision: the answer is shown, the game plays on.
        effects.push({ kind: 'record', chance: p.chance, outcome: 'broken', fen: m.fenBefore, san: m.san, prompted: true, steered: p.steered, takenBack: false });
        if (p.chance.answerUci) effects.push({ kind: 'show', uci: p.chance.answerUci, fen: p.fenBefore });
        effects.push({ kind: 'say', text: shownLine(p.chance), line: 'shown' });
        effects.push({ kind: 'turn', row: row(p.chance, ply, v, 'shown', true, p.steered, true) });
        effects.push({ kind: 'reply', punish: true });
        return { state: { ...state, pause: null }, effects };
      }
      if (v === 'found') {
        effects.push({ kind: 'record', chance: p.chance, outcome: 'held', fen: m.fenBefore, san: m.san, prompted: true, steered: p.steered, takenBack: false });
        effects.push({ kind: 'say', text: creditLine(p.chance, ply, m), line: 'credit' });
        effects.push({ kind: 'turn', row: row(p.chance, ply, v, 'credit', true, p.steered, true) });
        effects.push({ kind: 'reply', punish: false });
        return { state: { ...state, pause: null, creditOwed: false }, effects };
      }
    }
    // A deciding blunder's retry, or an exempt one: the game goes on. A retry
    // that leaves the question open carries it, told, to the next move.
    effects.push({ kind: 'reply', punish: false });
    const carried = p.chance ? [{ key: p.chance.key, prompted: true, steered: p.steered }] : [];
    return { state: { ...state, pause: null, carried }, effects };
  }

  // ── A FIRST MOVE on this board ─────────────────────────────────────────────
  const prompted = !!b?.prompted;
  const steered = !!b?.steered;
  const verdicts: Array<{ chance: FocusChance; v: ChanceVerdict }> = (b?.chances ?? []).map((chance) => ({ chance, v: judgeChance(chance, m) }));
  if (s.pick.focus === 'loose-pieces') {
    const left = leftLoose(m);
    if (left && !verdicts.some((x) => x.chance.key === left.key || (x.v === 'missed' && x.chance.kind === 'save'))) verdicts.push({ chance: left, v: 'missed' });
  }
  const credited = [...s.credited];
  const resolved = [...s.resolved, ...verdicts.filter((x) => (x.v === 'found' || x.v === 'missed') && ONCE_A_GAME.has(x.chance.kind)).map((x) => x.chance.key)];
  const carried = verdicts.filter((x) => x.v === 'exempt').map((x) => ({ key: x.chance.key, prompted, steered: steered && x.chance.seat === 'defend' }));
  let creditOwed = s.creditOwed;
  let tally = s.tally;
  for (const { chance, v } of verdicts) {
    if (v !== 'found') continue;
    const chanceSteered = steered && chance.seat === 'defend';
    tally = withTally({ ...s, tally }, chance.seat, 'found', chanceSteered);
    effects.push({ kind: 'record', chance, outcome: 'held', fen: m.fenBefore, san: m.san, prompted, steered: chanceSteered, takenBack: false });
    const say = state.announced && creditOwed && !credited.includes(chance.key);
    if (say) { credited.push(chance.key); creditOwed = false; effects.push({ kind: 'say', text: creditLine(chance, ply, m), line: 'credit' }); }
    effects.push({ kind: 'turn', row: row(chance, ply, v, say ? 'credit' : 'none', prompted, chanceSteered, false) });
  }
  const missed = verdicts.filter((x) => x.v === 'missed');
  state = { ...state, credited, creditOwed, resolved, carried, tally };
  if (missed.length > 0) {
    // EVERY MISS IS TAUGHT — the one the game leans on is taught on the spot;
    // the rest are recorded.
    const lead = missed.find((x) => x.chance.seat === s.pick?.weakerSeat) ?? missed[0];
    for (const { chance } of missed) {
      const chanceSteered = steered && chance.seat === 'defend';
      tally = withTally({ ...state, tally }, chance.seat, 'missed', chanceSteered);
      if (chance === lead.chance) continue;   // recorded at the decision (Try again / Play on)
      effects.push({ kind: 'record', chance, outcome: 'broken', fen: m.fenBefore, san: m.san, prompted, steered: chanceSteered, takenBack: false });
      effects.push({ kind: 'turn', row: row(chance, ply, 'missed', 'none', prompted, chanceSteered, false) });
    }
    const leadSteered = steered && lead.chance.seat === 'defend';
    effects.push({ kind: 'say', text: clueLine(lead.chance, ply), line: 'clue' });
    effects.push({ kind: 'turn', row: row(lead.chance, ply, 'missed', 'clue', prompted, leadSteered, false) });
    effects.push({ kind: 'hold', deciding: false });
    // A taught miss REVEALS an unannounced focus: from here every chance is prompted.
    return {
      state: { ...state, tally, announced: true, creditOwed: true, pause: { chance: lead.chance, fenBefore: m.fenBefore, ply, san: m.san, retries: 0, prompted, steered: leadSteered } },
      effects,
    };
  }
  // ── The one exception: an off-focus move that decides the game ────────────
  if (!s.decidingUsed) {
    const d = decidingBlunder(m);
    if (d) {
      effects.push({ kind: 'say', text: DECIDING_LINE, line: 'deciding' });
      effects.push({ kind: 'hold', deciding: true });
      return { state: { ...state, tally, decidingUsed: true, pause: { chance: null, fenBefore: m.fenBefore, ply, san: m.san, retries: 0, prompted, steered: false } }, effects };
    }
  }
  effects.push({ kind: 'reply', punish: false });
  return { state: { ...state, tally }, effects };
}

function row(chance: FocusChance, ply: number, outcome: ChanceVerdict, spoke: FocusTurnRow['spoke'], prompted: boolean, steered: boolean, retry: boolean): FocusTurnRow {
  return { ply, focus: chance.focus, seat: chance.seat, kind: chance.kind, outcome, spoke, prompted, steered, retry };
}

/** The runner reads the user's moves now (a focus game is on). */
export function focusOwnsGame(s: FocusRunState): boolean {
  return s.pick !== null;
}
