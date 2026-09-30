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
import { materialBalance } from './pieceValues';

export type Character = 'tactical' | 'positional' | 'conversion' | 'defence';

export interface CharacterInputs {
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
export const DECISIVE_MATERIAL = 3;
/** A best-move gap this wide means there is one right move to find. */
export const SHARP_GAP_CP = 150;

/** A tactic counts as LIVE only when a verifier PROVED it wins something.
 *  The detector reports a pin's geometry with no verdict, and a standing pin
 *  (…Bg4 on Nf3/d1) is not the position turning sharp — hand walk 2026-09-30
 *  heard it flip the read twice in a quiet Closed Ruy. A pin that really costs
 *  material still reads sharp through the engine's best-move gap. */
export function provenTacticLive(immediate: ReadonlyArray<{ wins?: 'live' | 'threat' | 'none' }>): boolean {
  return immediate.some((t) => t.wins === 'live' || t.wins === 'threat');
}

export function characterOf(i: CharacterInputs): Character {
  const bal = materialBalance(i.fen) * (i.studentColor === 'white' ? 1 : -1);
  // A live tactic outranks the material count: being up a rook with your
  // queen hanging is a tactical position before it is a conversion.
  if (i.tacticLive || (i.bestGapCp !== null && i.bestGapCp >= SHARP_GAP_CP)) return 'tactical';
  if (bal >= DECISIVE_MATERIAL) return 'conversion';
  if (bal <= -DECISIVE_MATERIAL) return 'defence';
  return 'positional';
}

export interface CharacterState {
  /** The character last announced (or settled silently on the first read). */
  current: Character | null;
  /** A different character seen on the most recent read, not yet held. */
  pending: Character | null;
  /** Switches spoken INTO each character — rotates that character's stems,
   *  so the second turn to "sharp" never repeats the first one's words. */
  spoken: Readonly<Record<Character, number>>;
}

export const EMPTY_CHARACTER: CharacterState = {
  current: null, pending: null, spoken: { tactical: 0, positional: 0, conversion: 0, defence: 0 },
};

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
    'You are down material now — the job is to make it hard: keep pieces on and look for counterplay.',
    'Behind on material, trades help them — keep the position complicated and your pieces active.',
  ],
};

export interface CharacterStep {
  next: CharacterState;
  /** The switch to speak, or null. */
  switched: { to: Character; text: string } | null;
}

/** One read of the position. The first read settles the character silently —
 *  the game does not "change" into the character it started in. */
/** What made it sharp, when the caller knows: a tactic live on the board, or
 *  one move far better than every other (the engine's best-move gap). */
export type SharpReason = 'tactic' | 'gap';

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

export function stepCharacter(state: CharacterState, now: Character, reason?: SharpReason): CharacterStep {
  if (state.current === null) return { next: { ...state, current: now, pending: null }, switched: null };
  if (now === state.current) return { next: { ...state, pending: null }, switched: null };
  if (state.pending !== now) return { next: { ...state, pending: now }, switched: null };
  const stems = now === 'tactical' && reason ? TACTICAL_WHY[reason] : SWITCH[now];
  const text = stems[state.spoken[now] % stems.length];
  return {
    next: { current: now, pending: null, spoken: { ...state.spoken, [now]: state.spoken[now] + 1 } },
    switched: { to: now, text },
  };
}
