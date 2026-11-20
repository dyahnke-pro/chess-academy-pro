// positionCharacter — what the position is ABOUT right now, and the moment
// that changes (WO-2, David 2026-09-29: "Plans change as the board does. You
// can read this in his transcripts. Tactical to positional back to tactics.").
//
// Every plan reader in the app reads one position or one engine line. None
// says "the position has changed — it's about the king now", and that turn is
// the thing Naroditsky narrates most often between the moves themselves.
//
// Pure and deterministic (G0): the character is COMPUTED from inputs the
// caller already has on the live path — the board's material, whether a
// tactic is live for either side (the detectors), and how sharp the engine
// says the position is (the gap between its best and second-best move). The
// words are fixed stems rotated on a counter, never Math.random.
//
// A switch is announced only once the new character has HELD for two reads:
// one ply of a tactic flickering in and out of a line is not the position
// changing, and a coach that announces every flicker is noise.
import { sideToMoveAs } from './threatOut';
import { Chess } from 'chess.js';
import { quietBalance } from './material';
import { legalSeeGainFor, findOpenFiles } from './positionReadingService';
import { lockedPawnPairs, wingPawns } from './boardStructure';

export type Character = 'tactical' | 'positional' | 'conversion' | 'defence';

interface CharacterInputs {
  fen: string;
  studentColor: 'white' | 'black';
  /** A tactic or threat the detectors found live on this board, either side. */
  tacticLive: boolean;
  /** Centipawns between the engine's best and second-best move, or null when
   *  there is no multi-PV read. A position where one move is far better than
   *  every other is a position about calculation. */
  bestGapCp: number | null;
}

/** Material, in pawns, that makes the game about converting or holding. */
const DECISIVE_MATERIAL = 3;
/** A best-move gap this wide means there is one right move to find. */
export const SHARP_GAP_CP = 150;

/** Evaluation, in centipawns, past which a game is decided either way. */
const DECIDED_CP = 300;

/** The best-move gap that makes a position SHARP — none when the second-best
 *  move still wins (or still loses) as clearly as the best. +9 against +6.5 is
 *  a wide gap and no question at all (walk 2026-09-30, game 2 ply 57). */
export function sharpGap(bestCp: number | null | undefined, secondCp: number | null | undefined): number | null {
  if (typeof bestCp !== 'number' || typeof secondCp !== 'number') return null;
  const sameSideDecided = (bestCp >= DECIDED_CP && secondCp >= DECIDED_CP) || (bestCp <= -DECIDED_CP && secondCp <= -DECIDED_CP);
  return sameSideDecided ? 0 : bestMoveGap(bestCp, secondCp);
}

/** THE ONE best-move gap: how far the engine's best line stands over its
 *  second, in centipawns, whatever the game's state. A gap between two
 *  candidate lines, never a move's price (that is `liveMovePrice`). */
export function bestMoveGap(bestCp: number, secondCp: number): number {
  return Math.abs(bestCp - secondCp);
}

/** A tactic counts as LIVE only when a verifier PROVED it wins something.
 *  The detector reports a pin's geometry with no verdict, and a standing pin
 *  (…Bg4 on Nf3/d1) is not the position turning sharp — hand walk 2026-09-30
 *  heard it flip the read twice in a quiet Closed Ruy. A pin that really costs
 *  material still reads sharp through the engine's best-move gap. */
export function provenTacticLive(immediate: ReadonlyArray<{ wins?: 'live' | 'threat' | 'none' }>): boolean {
  return immediate.some((t) => t.wins === 'live' || t.wins === 'threat');
}

export function characterOf(i: CharacterInputs): Character {
  // QUIET, never raw (walk oct3a): a board read mid-exchange is not a
  // conversion or a defence — the side to move cashes its best capture first.
  const bal = quietBalance(i.fen) * (i.studentColor === 'white' ? 1 : -1);
  // A live tactic outranks the material count: being up a rook with your
  // queen hanging is a tactical position before it is a conversion.
  if (i.tacticLive || (i.bestGapCp !== null && i.bestGapCp >= SHARP_GAP_CP)) return 'tactical';
  if (bal >= DECISIVE_MATERIAL) return 'conversion';
  if (bal <= -DECISIVE_MATERIAL) return 'defence';
  return 'positional';
}

/** The stepper's state across reads. It lives in the game's story
 *  (`GameStory`'s plan desk, P1-8c — `EMPTY_CHARACTER_STATE` is the fresh
 *  one), so a takeback restores it and a new game forgets it. */
export interface CharacterState {
  /** The character last announced (or settled silently on the first read). */
  readonly current: Character | null;
  /** A different character seen on the most recent read, not yet held. */
  readonly pending: Character | null;
}

const SWITCH: Record<Character, readonly string[]> = {
  // WITH ITS REASON (walk 2026-09-30: "the position has turned sharp" said
  // nothing about WHY, or what to do about it). The tactical stems name what
  // made it sharp — see TACTICAL_WHY — and every stem says what to do now.
  tactical: [
    'The position has turned sharp — calculate before you move.',
    'Things have got concrete — check every forcing move before anything quiet.',
  ],
  positional: [
    'The tactics have settled — now ask which of your pieces is doing the least, and improve it.',
    'The dust has cleared — it is a quiet game now: improve your worst piece before starting anything new.',
  ],
  conversion: [
    'You are up material now — the job changes to trading down and converting.',
    'With extra material the plan simplifies: trade pieces, keep it safe, and cash in.',
  ],
  defence: [
    'You are down material now — the job is to make it hard: keep pieces on, since every trade makes their extra material count for more, and look for counterplay.',
    'Behind on material, trades help them — keep the position complicated and your pieces active.',
  ],
};

interface CharacterStep {
  next: CharacterState;
  /** The switch to speak, or null. */
  switched: { to: Character; text: string } | null;
}

/** What made it sharp, when the caller knows: a tactic live on the board, or
 *  one move far better than every other (the engine's best-move gap). */
type SharpReason = 'tactic' | 'gap';

const TACTICAL_WHY: Record<SharpReason, readonly string[]> = {
  tactic: [
    'The position has turned sharp — there is a tactic on the board, so check every capture and check before anything quiet.',
    'Things have got concrete — a tactic is live, so look at every forcing move first.',
  ],
  gap: [
    'The position has turned sharp — one move here is far better than the rest, so calculate before you move.',
    'Things have got concrete — only one move really works here; find it before anything else.',
  ],
};

/** One read of the position. The first read settles the character silently —
 *  the game does not "change" into the character it started in. `said` is how
 *  many switches INTO each character the student has heard this
 *  game (the story's `switchesSaid`; none said when a character has no entry) —
 *  the stems rotate on it, so the second turn to "sharp" never repeats the
 *  first one's words, and a switch the door held does not spend a stem. */
export function stepCharacter(state: CharacterState, now: Character, said: Readonly<Partial<Record<Character, number>>>, reason?: SharpReason): CharacterStep {
  if (state.current === null) return { next: { current: now, pending: null }, switched: null };
  if (now === state.current) return { next: { ...state, pending: null }, switched: null };
  if (state.pending !== now) return { next: { ...state, pending: now }, switched: null };
  const stems = now === 'tactical' && reason ? TACTICAL_WHY[reason] : SWITCH[now];
  return { next: { current: now, pending: null }, switched: { to: now, text: stems[(said[now] ?? 0) % stems.length] } };
}

/** ONE BOARD'S CHARACTER READ, as every surface hands it in
 *  (WO-STORY-MATRIX-01 P1-9c). Learn steps it on its live read, Review on its
 *  walk — one computer, so the switch and its guards are the same words on
 *  every surface (they lived inline on the Learn page). */
export interface CharacterBoardRead {
  fen: string;
  studentColor: 'white' | 'black';
  /** The detectors' immediate tactics on `fen`; only proven ones make it sharp. */
  immediate: ReadonlyArray<{ wins?: 'live' | 'threat' | 'none' }>;
  /** The engine's lines at `fen`, best first, from the side to move — empty or
   *  one when the surface has no multi-PV read (no best-move gap is then read). */
  topLines: ReadonlyArray<{ evaluation: number; mate?: number | null }>;
  /** The move that made `fen`. */
  lastSan: string;
}

/** Any piece either side can win by exchange right now. */
function looseOnBoard(fen: string): boolean {
  try {
    const b = new Chess(fen);
    return b.board().flat().some((c) => !!c && c.type !== 'k'
      && legalSeeGainFor(fen, c.square, c.color === 'w' ? 'b' : 'w') > 0);
  } catch { return false; }
}

/** THE CHARACTER STEP FOR ONE BOARD: its read, the step, and the switch kept
 *  only when it is true on the board. The state always steps — a held switch
 *  is still the position's character. */
export function characterTurn(state: CharacterState, said: Readonly<Partial<Record<Character, number>>>, r: CharacterBoardRead): CharacterStep {
  // A detected tactic, not a HANGING piece, and a PROVEN one: a bishop hit by a
  // pawn simply steps away, and a standing pin carries no verdict (hand walks
  // 2026-09-30, Closed Ruy: 3…a6 read as "turned sharp", then …Bg4).
  const tacticLive = provenTacticLive(r.immediate);
  const gap = r.topLines.length >= 2 ? sharpGap(r.topLines[0].evaluation, r.topLines[1].evaluation) : null;
  const now = characterOf({ fen: r.fen, studentColor: r.studentColor, tacticLive, bestGapCp: gap });
  // The reason the switch names ("there is a tactic") reads the same proven
  // set the character did — never a hanging piece.
  const step = stepCharacter(state, now, said, tacticLive ? 'tactic' : gap !== null && gap >= SHARP_GAP_CP ? 'gap' : undefined);
  if (!step.switched) return step;
  // A forced mate already says what the position is about; "it has turned
  // sharp" beside it is the same fact twice (run C walk 2026-09-30).
  const mateOnBoard = typeof r.topLines[0]?.mate === 'number' && (r.topLines[0].mate ?? 0) > 0;
  // "It is a quiet game now" on the move that just gave check is the opposite
  // of the truth (run D walk, f6+)…
  const quietOnCheck = step.switched.to === 'positional' && /[+#]$/.test(r.lastSan);
  // …and so is "the tactics have settled" while any tactic is on the board, one
  // move stands far above the rest (claim check 2026-09-30, item 65: …Bb4
  // pinning Nc3 was the top line), or material is loose (run J, ply 50).
  const quietButConcrete = step.switched.to === 'positional'
    && (r.immediate.length > 0 || (gap !== null && gap >= SHARP_GAP_CP) || looseOnBoard(r.fen));
  return mateOnBoard || quietOnCheck || quietButConcrete ? { next: step.next, switched: null } : step;
}

// ── THE KIND OF POSITION ON ONE BOARD, for the read's story ─────────────────
//
// David 2026-11-18 (the read's verdict). Danya never stops at "you're better":
// "a clean pawn up, but the open board and few pieces give Black drawing
// chances"; "the position is locked; neither side seems in danger"; "with
// Black totally devoid of counterplay, he makes sure to improve all of his
// pieces to the fullest extent before doing anything concrete". Three
// readings off the board and the engine's number, the first that holds,
// said from the student's seat.

export type BoardKind = 'drawing-chances' | 'locked' | 'no-counterplay';

/** The student's edge, centipawns, that counts as better; past the upper bar
 *  the game is decided and no "drawing chances" are said. */
const BETTER_CP = 80;
/** Past two pawns the engine sees the win: an edge that size in an opposite-
 *  bishop ending is the second front working, not drawing chances (Danya,
 *  mastering opposite-coloured bishops #1, +2.42: "White wins despite the
 *  opposite bishops"). */
const DRAWISH_BELOW_CP = 200;
/** The best move must stand this little above the second for "no hurry": a
 *  wider gap is one move to find now. */
const NO_HURRY_GAP_CP = 40;
/** Locked, and close enough that nobody is in danger yet. */
const LOCKED_CLOSE_CP = 150;

/** How many squares the side's pieces (not pawns or the king) reach. */
function pieceReach(c: Chess, side: 'w' | 'b'): number {
  const turned = sideToMoveAs(c.fen(), side);
  if (!turned) return 0;
  try { return new Chess(turned).moves({ verbose: true }).filter((m) => m.piece !== 'p' && m.piece !== 'k').length; } catch { return 0; }
}

const squareShade = (sq: string): number => (sq.charCodeAt(0) - 97 + Number(sq[1])) % 2;

/** THE KIND OF POSITION for `student` ('w'/'b'), whose edge is `studentCp`
 *  (centipawns, the student's seat; null when unread). Null when none holds. */
export function boardKind(fen: string, student: 'w' | 'b', studentCp: number | null,
  /** The engine's lines on `fen`, best first (UCI, the side to move's move
   *  first; `evaluation` White's view). "No hurry" is a claim about the
   *  engine's best move — that it is quiet and nothing stands far above the
   *  rest — so without the lines it is not said. */
  lines: ReadonlyArray<{ moves: readonly string[]; evaluation: number; mate?: number | null }> = []): { kind: BoardKind; text: string } | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const all = c.board().flat().filter((p): p is NonNullable<typeof p> => !!p);
  const better = studentCp !== null && studentCp >= BETTER_CP;
  if (better && studentCp < DRAWISH_BELOW_CP) {
    const heavy = all.filter((p) => p.type === 'q' || p.type === 'r');
    const minors = all.filter((p) => p.type === 'b' || p.type === 'n');
    const bishops = minors.filter((p) => p.type === 'b');
    const opposite = heavy.length === 0 && minors.length === 2 && bishops.length === 2
      && bishops[0].color !== bishops[1].color && squareShade(bishops[0].square) !== squareShade(bishops[1].square);
    // The standing line already said the edge; this says what holds it back,
    // never "you're better" a second time.
    if (opposite) return { kind: 'drawing-chances', text: 'But the bishops run on opposite colours: with only pawns besides, they have real drawing chances.' };
    const wings = wingPawns(c);
    const on = (w: 'queenside' | 'kingside'): number => wings.w[w].length + wings.b[w].length;
    // Drawing chances on one wing are the extra pawn's: the student a pawn up
    // at most, with pawns on both sides of it. A lone pawn against a rook is
    // a race (a guide to underpromotion #0, the Saavedra), not a hold.
    const pawns = all.filter((p) => p.type === 'p');
    const edge = quietBalance(fen) * (student === 'w' ? 1 : -1);
    if (heavy.length + minors.length <= 2 && (on('queenside') === 0) !== (on('kingside') === 0)
      && pawns.some((p) => p.color === student) && pawns.some((p) => p.color !== student) && edge >= 0 && edge <= 1) {
      return { kind: 'drawing-chances', text: 'But with so little left and every pawn on one wing, they have real drawing chances.' };
    }
  }
  // Locked and close: "nobody is in danger" is false on a board one side is
  // winning (Desperado, Black clearly worse in a bind with an h-file attack
  // coming).
  if ((studentCp === null || Math.abs(studentCp) < LOCKED_CLOSE_CP) && lockedPawnPairs(c).length >= 3 && findOpenFiles(fen).open.length === 0) {
    // What locked pawns PROVE is where the play goes, never that nobody is in
    // danger (Danya, how to beat Magnus Carlsen #1: locked, and White's
    // kingside attack comes quickly — Black must play …Nc5 now).
    return { kind: 'locked', text: 'The position is locked: the pawns hold each other and no file is open, so the play goes through the pawn breaks.' };
  }
  if (better && quietBest(fen, lines)) {
    const mine = pieceReach(c, student);
    const theirs = pieceReach(c, student === 'w' ? 'b' : 'w');
    if (mine >= 10 && theirs * 2 < mine) {
      return { kind: 'no-counterplay', text: 'They have no counterplay, so there is no hurry: improve every piece before doing anything concrete.' };
    }
  }
  return null;
}

/** The engine's best move is QUIET and nothing stands far above the rest:
 *  not a capture, a check or a pawn move, no capture in its line's first two
 *  replies, and within `NO_HURRY_GAP_CP` of the second line. "No hurry"
 *  against a concrete best move tells the student to wait while the move that
 *  wins is there (Danya, mastering intuition #1: 37.c5!! at +1.24 against
 *  +0.50; the modern immortal #3: a4, then the f-file opens). */
function quietBest(fen: string, lines: ReadonlyArray<{ moves: readonly string[]; evaluation: number; mate?: number | null }>): boolean {
  const best = lines[0];
  if (!best || best.moves.length === 0 || lines.length < 2) return false;
  if (typeof best.mate === 'number') return false;
  if (Math.abs(best.evaluation - lines[1].evaluation) >= NO_HURRY_GAP_CP) return false;
  try {
    const c = new Chess(fen);
    for (let i = 0; i < Math.min(3, best.moves.length); i += 1) {
      const u = best.moves[i];
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      if (m.captured || /[+#]/.test(m.san) || (i === 0 && m.piece === 'p')) return false;
    }
  } catch { return false; }
  return true;
}
