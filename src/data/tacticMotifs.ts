// THE MASTER MOTIF LIST — every tactic the record tracks, both seats, three
// levels (WO-MOTIFS-01, David 2026-10-22: "make sure that you cover all
// tactics in chess" → "we can sprinkle them in through beginner intermediate
// and advanced levels").
//
// ONE table, so the Weaknesses tab, the skill meters, the lessons and the
// classifier read the same names: a motif here is a row on the record from
// both seats — "their fork landed" and "you missed a fork" — and a level the
// lessons open in order. A `Record` over the union, so a new motif fails to
// compile until its two tags and its level are decided.
//
// What is NOT a row, and why: a close cousin is named inside its parent
// (attraction → decoy → deflection here, undermining → removing the guard,
// cross-pin → pin, underpromotion → promotion, back-rank mate → mate) — on a
// club player's record a split that fine would never fill. Motifs with no
// reader yet (desperado, windmill, perpetual check, the stalemate save) join when their reader does (M3); a row nothing can fill is a tile
// that can only lie.

import type { TacticType } from '../types';
import type { MisconceptionTagId } from './misconceptionTags';

export type MotifId =
  | 'free-piece'
  | 'fork'
  | 'pin'
  | 'skewer'
  | 'discovered-attack'
  | 'discovered-check'
  | 'x-ray'
  | 'mate'
  | 'promotion'
  | 'double-check'
  | 'removing-the-guard'
  | 'overload'
  | 'deflection'
  | 'zwischenzug'
  | 'trapped-piece'
  | 'clearance'
  | 'interference';

/** The order the motifs open in a lesson. The next level opens when the one
 *  before it holds ≥ 75% IN GAMES — never the rating, never wins, never
 *  puzzles (PLAN.md WO-MOTIFS-01, decision 2). */
export type MotifLevel = 'beginner' | 'intermediate' | 'advanced';

export const MOTIF_LEVELS: readonly MotifLevel[] = ['beginner', 'intermediate', 'advanced'];

export interface MotifDef {
  id: MotifId;
  /** The spoken noun, mid-sentence ("a fork", "removing the guard"). */
  word: string;
  /** The row's title on a tab ("Forks", "Removing the guard"). */
  label: string;
  /** Ordered by the median rating of the Lichess puzzles carrying the theme
   *  (`src/data/puzzles.json`, 15,000 CC0; PLAN.md WO-MOTIFS-01). */
  level: MotifLevel;
  /** "Their X landed": the opponent's motif stood at your turn and your reply
   *  let it win. `null` until a reader can see THEIR motif coming (the line
   *  tactics need one, M3) — an honest gap, never a borrowed tag. */
  theirs: MisconceptionTagId | null;
  /** "You missed X": the motif was yours to play. */
  yours: MisconceptionTagId;
  /** Lichess puzzle themes that train it (puzzles.json theme names). */
  themes: readonly string[];
}

export const MOTIFS: Record<MotifId, MotifDef> = {
  // ── Beginner ─────────────────────────────────────────────────────────
  'free-piece': { id: 'free-piece', word: 'free piece', label: 'Free pieces', level: 'beginner', theirs: 'hung-material', yours: 'missed-your-free-piece', themes: ['hangingPiece'] },
  fork: { id: 'fork', word: 'fork', label: 'Forks', level: 'beginner', theirs: 'missed-their-fork', yours: 'missed-your-fork', themes: ['fork'] },
  // The data puts pin at 1639; it stays Beginner — a pin is easy to see and
  // hard to use, and puzzle ratings measure the hardest move to find.
  pin: { id: 'pin', word: 'pin', label: 'Pins', level: 'beginner', theirs: 'missed-their-pin', yours: 'missed-your-pin', themes: ['pin'] },
  skewer: { id: 'skewer', word: 'skewer', label: 'Skewers', level: 'beginner', theirs: 'missed-their-skewer', yours: 'missed-your-skewer', themes: ['skewer'] },
  'discovered-attack': { id: 'discovered-attack', word: 'discovered attack', label: 'Discovered attacks', level: 'beginner', theirs: 'missed-their-discovery', yours: 'missed-your-discovery', themes: ['discoveredAttack'] },
  mate: { id: 'mate', word: 'mate', label: 'Mates', level: 'beginner', theirs: 'missed-their-mate', yours: 'missed-your-mate', themes: ['mateIn1', 'mateIn2', 'backRankMate'] },
  promotion: { id: 'promotion', word: 'promotion', label: 'Promotions', level: 'beginner', theirs: null, yours: 'missed-your-promotion', themes: ['promotion', 'advancedPawn'] },
  // ── Intermediate ─────────────────────────────────────────────────────
  // Their side stays null: the threat reader sees their discovery coming, not
  // whether it will check, so their discovered checks file under discovered
  // attack (the true, coarser name) until it can (M3, 2026-10-22).
  'discovered-check': { id: 'discovered-check', word: 'discovered check', label: 'Discovered checks', level: 'intermediate', theirs: null, yours: 'missed-your-discovered-check', themes: ['discoveredCheck'] },
  // The x-ray as the record can see it: the recapture through the piece that
  // screened your line (Rxe1 Qxe1 Qxe1). Their side null for the same reason.
  'x-ray': { id: 'x-ray', word: 'x-ray', label: 'X-rays', level: 'intermediate', theirs: null, yours: 'missed-your-x-ray', themes: ['xRayAttack'] },
  'double-check': { id: 'double-check', word: 'double check', label: 'Double checks', level: 'intermediate', theirs: 'missed-their-double-check', yours: 'missed-your-double-check', themes: ['doubleCheck'] },
  'removing-the-guard': { id: 'removing-the-guard', word: 'removing the guard', label: 'Removing the guard', level: 'intermediate', theirs: 'missed-their-guard-removal', yours: 'missed-your-guard-removal', themes: ['capturingDefender'] },
  // No overloading theme in our puzzle set; an overloaded defender is the one
  // a deflection pulls away, so its drills share that theme.
  overload: { id: 'overload', word: 'overloaded defender', label: 'Overloaded defenders', level: 'intermediate', theirs: 'missed-their-overload', yours: 'missed-your-overload', themes: ['deflection'] },
  deflection: { id: 'deflection', word: 'deflection', label: 'Deflections', level: 'intermediate', theirs: null, yours: 'missed-your-deflection', themes: ['deflection', 'attraction'] },
  zwischenzug: { id: 'zwischenzug', word: 'in-between move', label: 'In-between moves', level: 'intermediate', theirs: null, yours: 'missed-your-zwischenzug', themes: ['intermezzo'] },
  'trapped-piece': { id: 'trapped-piece', word: 'trapped piece', label: 'Trapped pieces', level: 'intermediate', theirs: 'missed-their-trap', yours: 'missed-your-trapped-piece', themes: ['trappedPiece'] },
  // ── Advanced ─────────────────────────────────────────────────────────
  clearance: { id: 'clearance', word: 'clearance', label: 'Clearances', level: 'advanced', theirs: null, yours: 'missed-your-clearance', themes: ['clearance'] },
  interference: { id: 'interference', word: 'interference', label: 'Interference', level: 'advanced', theirs: null, yours: 'missed-your-interference', themes: ['interference'] },
};

/** The classifier's name → the motif row it files under. A `Record` over the
 *  classifier's union, so a new `TacticType` fails to compile until someone
 *  decides its row. `null` = no row: the unnamed sequence is "a shot", filed
 *  under the catch-all. */
export const MOTIF_OF_TACTIC: Record<TacticType, MotifId | null> = {
  hanging_piece: 'free-piece',
  fork: 'fork',
  pin: 'pin',
  skewer: 'skewer',
  discovered_attack: 'discovered-attack',
  discovered_check: 'discovered-check',
  back_rank: 'mate',
  checkmate: 'mate',
  promotion: 'promotion',
  double_check: 'double-check',
  removing_the_guard: 'removing-the-guard',
  overloaded_piece: 'overload',
  deflection: 'deflection',
  zwischenzug: 'zwischenzug',
  trapped_piece: 'trapped-piece',
  clearance: 'clearance',
  interference: 'interference',
  x_ray: 'x-ray',
  tactical_sequence: null,
};

/** "You missed X" for the classifier's name — the catch-all when it has no row. */
export function yoursTagForTactic(t: TacticType): MisconceptionTagId {
  const m = MOTIF_OF_TACTIC[t];
  return m ? MOTIFS[m].yours : 'missed-tactic';
}

/** One motif's tags, both seats (their side only where a reader sees it). */
export function tagsOfMotif(id: MotifId): MisconceptionTagId[] {
  const m = MOTIFS[id];
  return m.theirs ? [m.theirs, m.yours] : [m.yours];
}

/** Every tag a motif row owns, both seats. */
export const MOTIF_TAGS: ReadonlySet<MisconceptionTagId> = new Set(
  (Object.keys(MOTIFS) as MotifId[]).flatMap(tagsOfMotif),
);

/** The motif a tag belongs to, or null for a tag that is not a motif row. */
export function motifOfTag(tag: string): MotifId | null {
  for (const m of Object.values(MOTIFS)) if (m.yours === tag || m.theirs === tag) return m.id;
  return null;
}

/** The motifs of one level, in table order. */
export function motifsAt(level: MotifLevel): MotifDef[] {
  return Object.values(MOTIFS).filter((m) => m.level === level);
}

/** The skill a motif tag borrows its population difficulty from until the
 *  refit (M7) fits its own: your shot → `missed-tactic`, their tactic →
 *  `missed-opponents-threat` (the one it refines). Null for a non-motif tag. */
export function parentSkillTag(tag: string): MisconceptionTagId | null {
  for (const m of Object.values(MOTIFS)) {
    if (m.yours === tag) return 'missed-tactic';
    if (m.theirs === tag) return 'missed-opponents-threat';
  }
  return null;
}

/** The level a motif tag belongs to, or null for a tag that is not a motif row. */
export function levelOfTag(tag: string): MotifLevel | null {
  const m = motifOfTag(tag);
  return m ? MOTIFS[m].level : null;
}

/** Both seats' tags of every motif at one level — what that level's gate pools. */
export function levelTags(level: MotifLevel): MisconceptionTagId[] {
  return motifsAt(level).flatMap((m) => tagsOfMotif(m.id));
}

/**
 * THE LEVELS OPEN TO THIS STUDENT (decision 2): Beginner always; each next one
 * when the one before it is open and HOLDS — the caller's `holds` answers
 * "≥ 75% held in games" for a level, read off the same hold rate the lesson
 * gates use. Never the rating, never wins, never puzzles.
 */
export function openLevels(holds: (level: MotifLevel) => boolean): Set<MotifLevel> {
  const open = new Set<MotifLevel>(['beginner']);
  for (let i = 1; i < MOTIF_LEVELS.length; i++) {
    const prev = MOTIF_LEVELS[i - 1];
    if (!open.has(prev) || !holds(prev)) break;
    open.add(MOTIF_LEVELS[i]);
  }
  return open;
}

/** Is this tag open at these levels? A tag that is not a motif row always is;
 *  the catch-all "a shot" counts as Beginner. */
export function tagOpenAt(tag: string, open: ReadonlySet<MotifLevel>): boolean {
  const level = levelOfTag(tag);
  return level === null || open.has(level);
}
