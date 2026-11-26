// THE ONE CAUSE OF A MISTAKE (WO-LEARN-MISTAKES-ONLY, David 2026-11-23/24).
//
// `errorWhy` read the cause of every costly move — the mechanism
// (`whyItFailed`), the reason walker (`costReason`, allowed / missed + motif),
// the positional tag — and returned only finished sentences, so no recipe
// could key on it and a mistake with no cause was indistinguishable from one
// whose cause was dropped. This is the cause as data. A leaf: types and one
// pure classifier, no Dexie, no engine.
//
// The list is exhaustive on purpose: `mistakeLesson` keys a
// `Record<MistakeCauseKind, …>`, so a new kind fails to compile until its
// lesson is written. `unexplained` is a real answer (silent and logged,
// never guessed — David 2026-11-24: "We never make anything up").
import type { TacticType } from '../types';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import type { WhyItFailedKind } from './whyItFailed';
import type { StructuralCause } from './structuralCause';
import type { CauseReaderKey } from './teachingSentence';

export type MistakeCauseKind =
  | 'allowed-mate'
  | 'missed-mate'
  | 'took-guarded'
  | 'eyed-guarded'
  | 'answered-by-check'
  | 'left-hanging'
  | 'abandoned-defender'
  | 'abandoned-fork-square'
  | 'walks-into-fork'
  | 'allowed-tactic'
  | 'allowed-capture'
  | 'allowed-threat'
  | 'king-hunt'
  | 'ignored-threat'
  | 'missed-win'
  // The structural causes (`structuralCause`, MISTAKE-CAUSES.md §B): what a
  // costly move changed that is not material.
  | 'stalemate'
  | 'technique-broken'
  | 'passer-handed'
  | 'compensation-lost'
  | 'traded-into-target'
  | 'colour-conceded'
  | 'tempo-wasted'
  | 'positional'
  | 'unexplained';

export interface MistakeCause {
  kind: MistakeCauseKind;
  /** The one classifier's motif for the line that punishes (allowed) or wins
   *  (missed), when it names one. */
  motif: TacticType | null;
  /** The record tag the board files the move under — kept even when the
   *  better move is named (it was dropped there before, 26 of 87 live moves). */
  tag: Exclude<MisconceptionTagId, 'other'> | null;
  /** False when the threat was already on the board before the move. */
  causedByMove: boolean;
  /** The reader's facts (target square, colour, pawn …): the structural
   *  reader's on a structural kind, a cause reader's on the kind it files
   *  under (`causeReaderKey`); null otherwise. */
  detail: CauseDetail | null;
}

/** The facts a reader hands over with the cause. The structural causes, and
 *  the cause readers filed under an existing kind: the lone guard the better
 *  move hits (`missed-win`), the pawn the line wins later (`allowed-capture`),
 *  the bishop shut in or the rook off its file (`positional`). */
export type CauseDetail =
  | StructuralCause
  | { kind: 'defender-hit'; defender: string; target: string }
  | { kind: 'allowed-capture'; pawn: string; plies: number }
  | { kind: 'positional'; how: 'bishop-shut' | 'rook-activity'; tag: 'misplaced-piece' | 'passive-rook'; piece: 'b' | 'r'; square: string; by: string };

/** Which cause-reader lesson a detail is told by (`CAUSE_READER_LESSONS`):
 *  the tempo ones by how, the lone guard, the pawn let go, the positional
 *  ones by how. Null: the cause's own recipe tells it. */
export function causeReaderKey(d: CauseDetail | null): CauseReaderKey | null {
  if (!d) return null;
  if (d.kind === 'tempo-wasted') return d.how === 'retreat' || d.how === 'missed-tempo' || d.how === 'wrong-order' || d.how === 'freed-square' ? d.how : null;
  if (d.kind === 'defender-hit') return 'defender-hit';
  if (d.kind === 'allowed-capture') return 'pawn-let-go';
  if (d.kind === 'positional') return d.how;
  return null;
}

/** What errorWhy read, flattened: each field is one reader's verdict. */
export interface MistakeCauseReads {
  allowedMate: boolean;
  missedMate: boolean;
  failedKind: WhyItFailedKind | null;
  /** The move was a capture (splits held-by-defender into took / eyed). */
  playedCaptures: boolean;
  /** A line wins material for them (punishment, single reply, far loss). */
  allowedWins: boolean;
  allowedMotif: TacticType | null;
  /** A reply that attacks / checks / pins but wins nothing yet. */
  allowedThreat: boolean;
  kingHunt: boolean;
  /** The reply line wins material, but the threat was on the board before
   *  the move: the move failed to answer it. */
  ignoredThreat: boolean;
  missedMotif: TacticType | null;
  missedWins: boolean;
  tag: Exclude<MisconceptionTagId, 'other'> | null;
  causedByMove: boolean;
  /** The one structural reading of the move (`readStructuralCause`), or null. */
  structural: StructuralCause | null;
  /** The better move hits the one guard of a piece of theirs (`defenderHit`). */
  defenderHit: Extract<CauseDetail, { kind: 'defender-hit' }> | null;
  /** The reply line wins a pawn the better line keeps (`pawnLetGo`). */
  pawnLetGo: Extract<CauseDetail, { kind: 'allowed-capture' }> | null;
  /** The bishop shut in by its own pawn, or the rook off its open file. */
  positionalDetail: Extract<CauseDetail, { kind: 'positional' }> | null;
}

/** One `whyItFailed` mechanism → its cause, exhaustively. */
const FAILED_KIND: Record<WhyItFailedKind, (captures: boolean) => MistakeCauseKind> = {
  'held-by-defender': (captures) => (captures ? 'took-guarded' : 'eyed-guarded'),
  'answered-by-tactic': () => 'answered-by-check',
  'lost-the-piece': () => 'left-hanging',
  'abandoned-defender': () => 'abandoned-defender',
  'abandoned-square': () => 'abandoned-fork-square',
  'walks-into-fork': () => 'walks-into-fork',
};

/** The order is errorWhy's own: mate first, then the mechanism, then what the
 *  reply line wins, the threat, the hunt, what the better move wins, the
 *  structural reading, the board's positional reading. Nothing read →
 *  `unexplained`. A stalemate is the one structural cause told straight after
 *  the mate it is the opposite of: the game is drawn on the board, and what
 *  else the line wins or misses no longer counts. */
export function classifyMistake(r: MistakeCauseReads): MistakeCause {
  const base = { tag: r.tag, causedByMove: r.causedByMove, detail: null };
  if (r.allowedMate) return { ...base, kind: 'allowed-mate', motif: null };
  if (r.structural?.kind === 'stalemate') return { ...base, kind: 'stalemate', motif: null, detail: r.structural };
  if (r.missedMate) return { ...base, kind: 'missed-mate', motif: null };
  if (r.failedKind) return { ...base, kind: FAILED_KIND[r.failedKind](r.playedCaptures), motif: r.allowedMotif };
  if (r.allowedWins) return { ...base, kind: r.allowedMotif ? 'allowed-tactic' : 'allowed-capture', motif: r.allowedMotif };
  if (r.allowedThreat) return { ...base, kind: 'allowed-threat', motif: r.allowedMotif };
  if (r.kingHunt) return { ...base, kind: 'king-hunt', motif: null };
  if (r.missedWins) return { ...base, kind: 'missed-win', motif: r.missedMotif };
  if (r.defenderHit) return { ...base, kind: 'missed-win', motif: null, detail: r.defenderHit };
  if (r.structural) return { ...base, kind: r.structural.kind, motif: null, detail: r.structural };
  if (r.pawnLetGo) return { ...base, kind: 'allowed-capture', motif: null, detail: r.pawnLetGo };
  if (r.tag) return { ...base, kind: 'positional', motif: null, detail: r.positionalDetail?.tag === r.tag ? r.positionalDetail : null };
  if (r.positionalDetail) return { ...base, tag: r.positionalDetail.tag, kind: 'positional', motif: null, detail: r.positionalDetail };
  // Last before unexplained: a board reading of the move itself (a defender
  // it took away, a square it gave up) says more than "it was already hanging".
  if (r.ignoredThreat) return { ...base, kind: 'ignored-threat', motif: r.allowedMotif };
  return { ...base, kind: 'unexplained', motif: null };
}
