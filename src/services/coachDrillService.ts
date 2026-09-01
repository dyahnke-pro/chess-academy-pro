/**
 * coachDrillService
 * -----------------
 * Picks a REAL training drill (a Lichess-DB puzzle) for a training-aid
 * request, so the coach can set it up ON THE BOARD in-place (Learn tab)
 * instead of routing the user away or — worse — letting the LLM invent a
 * fake drill (G0: the LLM decides no chess content; David's report:
 * "drill calculation" made the brain hallucinate "find the best first
 * move from the starting position").
 *
 * Everything here is code: the puzzle, its position, and its solution
 * come from `puzzles.json` (15K curated Lichess puzzles, CC0) and
 * chess.js. The coach's ONLY job downstream is to voice the prompt and
 * the feedback — never to choose the move or the position.
 *
 * A drill is a real puzzle rendered as a solve-on-the-board challenge:
 *   - `setupFen`     — the position the student sees (opponent's setup
 *                      move already applied, Lichess convention).
 *   - `playerColor`  — whose move it is (the student's side).
 *   - `solutionSan`  — the full forced line FROM setupFen, alternating
 *                      student move / opponent reply / student move …
 *                      (chess.js-validated SAN). The student plays the
 *                      even indices; the coach auto-plays the odd ones.
 *   - `prompt`       — a concrete, code-authored challenge line.
 */
import { Chess } from 'chess.js';
import puzzlesData from '../data/puzzles.json';
import { db } from '../db/schema';
import type { MistakePuzzle, TacticType } from '../types';
import { themesForTactic } from './weaknessSpine';
import { classifyEndgameType, endgameTypeInfo } from './endgameProfileService';

interface RawPuzzle {
  id: string;
  fen: string;
  moves: string;
  rating: number;
  themes: string[];
  openingTags: string | string[] | null;
  popularity: number;
  nbPlays: number;
}

const PUZZLES = puzzlesData as RawPuzzle[];

export interface CoachDrill {
  /** Stable slug of the training aid this drill satisfies. */
  aid: string;
  /** Human label for the aid ("Calculation", "Fork tactics"). */
  label: string;
  /** Position the student solves from (opponent's setup move applied). */
  setupFen: string;
  /** The student's side to move. */
  playerColor: 'white' | 'black';
  /** Full forced line from setupFen: [studentMove, oppReply, studentMove, …]. */
  solutionSan: string[];
  /** Concrete challenge prompt the coach voices (code-authored, G0). */
  prompt: string;
  /** Source puzzle id + rating (for audits / SRS). */
  puzzleId: string;
  rating: number;
  /** A fresh pattern rep appended AFTER the student's own flubbed instances,
   *  to cement the pattern rather than only re-testing their exact positions
   *  (Phase 3, David 2026-08-26 "evidence-first, then drill the pattern"). Not
   *  one of the student's mistakes — the surface can frame it as "now a fresh
   *  one to lock it in". */
  isCementRep?: boolean;
}

/** Maps a training-aid slug to the Lichess puzzle themes that define it.
 *  ANY-of match on `themes`; `exclude` drops a theme from the pool. An
 *  empty `themes` means "any tactical puzzle" (generic drill). */
interface AidSpec {
  themes: string[];
  exclude?: string[];
  label: string;
  /** Verb the prompt uses for the goal ("win material", "find the mate"). */
  goal: string;
}

const AID_SPECS: Record<string, AidSpec> = {
  calculation: {
    themes: ['mateIn2', 'mateIn3', 'quietMove', 'long', 'defensiveMove', 'sacrifice'],
    exclude: ['mateIn1'],
    label: 'Calculation',
    goal: 'calculate the strongest line',
  },
  'mating-patterns': {
    themes: ['mateIn1', 'mateIn2', 'mateIn3', 'mate'],
    label: 'Mating patterns',
    goal: 'find the checkmate',
  },
  'pawn-endings': {
    themes: ['pawnEndgame', 'endgame', 'advancedPawn', 'promotion'],
    label: 'Pawn endings',
    goal: 'find the winning idea',
  },
  'rook-endings': {
    themes: ['rookEndgame', 'endgame'],
    label: 'Rook endings',
    goal: 'find the precise move',
  },
  endgame: {
    themes: ['endgame'],
    label: 'Endgame technique',
    goal: 'find the best move',
  },
  puzzle: {
    themes: [],
    label: 'Tactics',
    goal: 'find the best move',
  },
};

/** Aid slugs (as emitted by `trainingAidRouter`) that map to a real
 *  solve-on-the-board drill. Lesson-shaped aids (eval-lab, principles,
 *  drawing-patterns, weaknesses, mistakes) are NOT here — they aren't a
 *  single-position puzzle. A `puzzle:<theme>` slug is always drillable. */
const DRILLABLE_AIDS = new Set<string>([
  'calculation',
  'mating-patterns',
  'pawn-endings',
  'rook-endings',
  'endgame',
  'puzzle',
  // "drill my mistakes" / "work on my weaknesses" → the adaptive mistake
  // queue (startMistakeDrills). pickCoachDrill falls back to the generic
  // tactics pool for a brand-new user with no mistakes on file.
  'mistakes',
]);

/** True when the aid can be set up as a board drill (so the coach loads
 *  a real puzzle on the Learn board instead of routing anywhere). */
export function isDrillableAid(aid: string): boolean {
  return DRILLABLE_AIDS.has(aid) || aid.startsWith('puzzle:');
}

/** Popularity / plays floors — keep novelty / under-tested puzzles out
 *  (same bar the calculation-drill surface uses). */
const MIN_POPULARITY = 50;
const MIN_PLAYS = 80;

export interface PickDrillOptions {
  /** Target rating — the drill is picked nearest this. Defaults to 1200. */
  rating?: number;
  /** Deterministic tie-break seed so re-entry is reproducible in tests. */
  seed?: number;
}

/**
 * Pick a real drill for a training-aid slug.
 *
 * The slug is what `trainingAidRouter` / the coach chat detects, e.g.
 * `calculation`, `mating-patterns`, `pawn-endings`, `endgame`, `puzzle`,
 * or a themed puzzle `puzzle:<theme>` (e.g. `puzzle:fork`). Unknown
 * slugs fall back to the generic tactics pool. Returns null only when no
 * puzzle in the DB matches (should never happen for the shipped aids —
 * the pools are thousands deep).
 */
export function pickCoachDrill(aid: string, options: PickDrillOptions = {}): CoachDrill | null {
  const targetRating = options.rating ?? 1200;
  const seed = options.seed ?? 1;

  // `puzzle:<theme>` deep-links a specific tactical theme.
  let themes: string[] = [];
  let exclude: string[] | undefined;
  let label = 'Tactics';
  let goal = 'find the best move';
  if (aid.startsWith('puzzle:')) {
    const theme = aid.slice('puzzle:'.length);
    themes = theme ? [theme] : [];
    label = `${spaced(theme)} tactics`;
    goal = 'find the best move';
  } else {
    const spec = AID_SPECS[aid] ?? AID_SPECS.puzzle;
    themes = spec.themes;
    exclude = spec.exclude;
    label = spec.label;
    goal = spec.goal;
  }

  const themeSet = new Set(themes);
  const excludeSet = new Set(exclude ?? []);
  const pool = PUZZLES.filter((p) => {
    if (p.popularity < MIN_POPULARITY) return false;
    if (p.nbPlays < MIN_PLAYS) return false;
    if (exclude && p.themes.some((t) => excludeSet.has(t))) return false;
    if (themeSet.size === 0) return true;
    return p.themes.some((t) => themeSet.has(t));
  });
  if (pool.length === 0) return null;

  // Pick nearest the target rating; break ties deterministically by seed
  // so a session re-entry can vary while a test stays reproducible.
  pool.sort((a, b) => {
    const da = Math.abs(a.rating - targetRating);
    const db = Math.abs(b.rating - targetRating);
    if (da !== db) return da - db;
    return hash(seed, a.id) - hash(seed, b.id);
  });

  // Walk candidates until one converts to a legal drill (guards against a
  // rare malformed UCI line).
  for (const p of pool.slice(0, 32)) {
    const drill = toDrill(p, aid, label, goal);
    if (drill) return drill;
  }
  return null;
}

/** Convert a raw Lichess puzzle to a solve-on-the-board drill. Lichess
 *  convention: `moves[0]` is the opponent's setup move; the student
 *  solves from the resulting position. Every move is chess.js-validated;
 *  a malformed line returns null. */
function toDrill(p: RawPuzzle, aid: string, label: string, goal: string): CoachDrill | null {
  const uci = p.moves.split(' ').filter(Boolean);
  if (uci.length < 2) return null;
  try {
    const chess = new Chess(p.fen);
    const setup = chess.move(uciToMove(uci[0]));
    if (!setup) return null;
    const setupFen = chess.fen();
    const playerColor: 'white' | 'black' = chess.turn() === 'w' ? 'white' : 'black';

    const solutionSan: string[] = [];
    for (let i = 1; i < uci.length; i += 1) {
      const m = chess.move(uciToMove(uci[i]));
      if (!m) break;
      solutionSan.push(m.san);
    }
    if (solutionSan.length === 0) return null;

    const side = playerColor === 'white' ? 'White' : 'Black';
    const prompt = `${label} drill — ${side} to move. ${capitalize(goal)}.`;

    return {
      aid,
      label,
      setupFen,
      playerColor,
      solutionSan,
      prompt,
      puzzleId: p.id,
      rating: p.rating,
    };
  } catch {
    return null;
  }
}

// ─── Mistake-sourced drills (David 2026-07-03) ──────────────────────
// "Make sure the puzzles pull from user mistakes. Most common to least."
// The user's own blunders live in the `mistakePuzzles` Dexie store, each
// already solve-ready: `fen` is the position where they erred (their
// turn), `moves` is the correct line starting with the move they missed.
// We bucket by the missed pattern (tacticType, else game phase), rank the
// buckets by frequency (most common weakness first), and hand back a
// queue of real drills. The adaptive "tested out → next theme" loop
// (P3) walks this queue; see docs/plans/2026-07-03-coach-inplace-adaptive-drills.md.

/** A weakness theme drawn from the user's mistakes, with its drills. */
export interface MistakeDrillTheme {
  /** Bucket key, e.g. 'tactic:fork' | 'phase:endgame'. */
  key: string;
  /** Display label, e.g. 'Forks', 'Endgame'. */
  label: string;
  /** How many mistakes fed this theme (drives the most→least ordering). */
  count: number;
  /** The drills for this theme, worst mistake (highest cp loss) first. */
  drills: CoachDrill[];
}

const TACTIC_LABELS: Record<string, string> = {
  fork: 'Forks',
  pin: 'Pins',
  skewer: 'Skewers',
  discovered_attack: 'Discovered attacks',
  back_rank: 'Back-rank tactics',
  hanging_piece: 'Hanging pieces',
  promotion: 'Promotions',
  deflection: 'Deflections',
  overloaded_piece: 'Overloaded pieces',
  trapped_piece: 'Trapped pieces',
  clearance: 'Clearance',
  interference: 'Interference',
  zwischenzug: 'Zwischenzug',
  x_ray: 'X-ray tactics',
  double_check: 'Double checks',
  removing_the_guard: 'Removing the guard',
  tactical_sequence: 'Tactical sequences',
};

const PHASE_LABELS: Record<string, string> = {
  opening: 'Opening',
  middlegame: 'Middlegame',
  endgame: 'Endgame',
};

function bucketOf(mp: MistakePuzzle): { key: string; label: string } {
  // Position-transformation (trade) errors get their own weakness bucket
  // (Phase 4), not a generic phase bucket.
  if (mp.positionalMotif) {
    return {
      key: `transform:${mp.positionalMotif}`,
      label: mp.positionalMotif === 'unfavorable-trade' ? 'Unfavorable trades' : 'Missed favorable trades',
    };
  }
  if (mp.tacticType) {
    return { key: `tactic:${mp.tacticType}`, label: TACTIC_LABELS[mp.tacticType] ?? mp.tacticType };
  }
  // Endgame mistakes drill by ENDING TYPE (David 2026-09-01) so a motif-scoped
  // "drill it" targets rook endings / K+P specifically — matches the weakness
  // spine's clusterId (analysis: prefix stripped for the drill key).
  if (mp.gamePhase === 'endgame') {
    const type = classifyEndgameType(mp.fen);
    if (type !== 'other') {
      const label = endgameTypeInfo(type).label;
      return { key: `endgame-type:${type}`, label: label.charAt(0).toUpperCase() + label.slice(1) };
    }
  }
  return { key: `phase:${mp.gamePhase}`, label: PHASE_LABELS[mp.gamePhase] ?? 'Tactics' };
}

/** Convert one mistake puzzle to a solve-on-the-board drill. Unlike the
 *  Lichess-DB path there is NO opponent setup move — `mp.fen` is already
 *  the student's-turn position and `mp.moves` is the correct line from
 *  it. Every move is chess.js-validated; a malformed record returns
 *  null. Falls back to the single best move when the line won't replay. */
export function mistakePuzzleToDrill(mp: MistakePuzzle): CoachDrill | null {
  const { key, label } = bucketOf(mp);
  // Invalid FEN → not a drill.
  let playerColor: 'white' | 'black';
  try {
    playerColor = new Chess(mp.fen).turn() === 'w' ? 'white' : 'black';
  } catch {
    return null;
  }
  // Replay the recorded line. chess.js throws on an illegal move, so an
  // isolated try lets a malformed line fall back to the single best move
  // rather than discarding the whole drill.
  let solutionSan: string[] = [];
  try {
    const chess = new Chess(mp.fen);
    for (const u of (mp.moves ?? '').split(' ').filter(Boolean)) {
      solutionSan.push(chess.move(uciToMove(u)).san);
    }
  } catch {
    solutionSan = [];
  }
  if (solutionSan.length === 0 && mp.bestMoveSan) {
    try {
      solutionSan = [new Chess(mp.fen).move(mp.bestMoveSan).san];
    } catch {
      return null;
    }
  }
  if (solutionSan.length === 0) return null;

  const side = playerColor === 'white' ? 'White' : 'Black';
  return {
    aid: `mistake:${key}`,
    label,
    setupFen: mp.fen,
    playerColor,
    solutionSan,
    prompt: `From one of your own games — ${side} to move. You missed the best move here. Find it.`,
    puzzleId: mp.id,
    rating: Math.max(400, Math.round(mp.cpLoss)) || 1200,
  };
}

/**
 * True when the user has uploaded REAL games from lichess / chess.com (or
 * a PGN import) — excluding the seeded `sample-*` review games, which
 * carry lichess/chesscom sources but aren't the user's data. Drives the
 * caught-up vs no-data fork (David 2026-07-03): no uploaded games → fall
 * back to a DB tactic; games uploaded but nothing due → "you're caught up,
 * nothing to do."
 */
export async function hasImportedGames(): Promise<boolean> {
  try {
    const games = await db.games.toArray();
    return games.some(
      (g) =>
        (g.source === 'lichess' || g.source === 'chesscom' || g.source === 'import') &&
        !g.id.startsWith('sample-'),
    );
  } catch {
    return false;
  }
}

/**
 * Build the user's mistake-drill queue: their real blunders bucketed by
 * missed pattern and ranked MOST COMMON → least. Each theme's drills are
 * ordered worst-mistake-first (highest cp loss).
 *
 * Only DUE, NON-MASTERED mistakes are included — SRS controls what comes
 * back (David 2026-07-03: "it drops out for the day, the SRS brings it
 * back, and after ~3 days of consecutive no-mistake solves it drops
 * out"). A mistake that mastered out (3 correct spaced reps via
 * `gradeMistakePuzzle`) is gone from the pool everywhere; a mistake solved
 * today has its due-date pushed to a future day, so it won't resurface
 * until SRS schedules it. Returns [] when nothing is due (the caller
 * falls back to `pickCoachDrill`).
 */
/** One recurring-weakness row for the evidence header — the student's OWN
 *  instances of a pattern, most common first. */
export interface WeaknessSummaryRow {
  key: string;
  label: string;
  count: number;
}

/**
 * Group a set of mistake puzzles by the SAME weakness buckets the drill queue
 * uses (`bucketOf`), counting the student's live instances — the evidence that
 * a pattern keeps recurring ("Forks ×5"). Mastered ("drilled shut") instances
 * are excluded: the header shows what's still open, not a trophy case. Pure, so
 * the surface can render it without a service round-trip.
 */
export function summarizeWeaknesses(mistakes: MistakePuzzle[]): WeaknessSummaryRow[] {
  const rows = new Map<string, WeaknessSummaryRow>();
  for (const mp of mistakes) {
    if (mp.status === 'mastered') continue;
    const { key, label } = bucketOf(mp);
    const row = rows.get(key) ?? { key, label, count: 0 };
    row.count += 1;
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, z) => (z.count - a.count) || a.label.localeCompare(z.label));
}

export async function buildMistakeDrillQueue(
  options: { today?: string; cementReps?: number; rating?: number; gameId?: string; motif?: string } = {},
): Promise<MistakeDrillTheme[]> {
  const today = options.today ?? new Date().toISOString().split('T')[0];
  const cementReps = Math.max(0, options.cementReps ?? 0);
  const cementRating = options.rating ?? 1200;
  let mistakes: MistakePuzzle[] = [];
  try {
    mistakes = await db.mistakePuzzles.toArray();
  } catch {
    return [];
  }
  if (options.gameId) {
    // GAME-SCOPED drill (David 2026-09-01: "set up the associated drills") — the
    // coach just named THIS game's critical error, so drill this game's mistakes
    // NOW regardless of SRS due date (the student asked for them). Still skip
    // mastered ones.
    mistakes = mistakes.filter((mp) => mp.sourceGameId === options.gameId && mp.status !== 'mastered');
  } else if (options.motif) {
    // MOTIF-SCOPED drill (P-III.3, David 2026-09-01: "drill what is needed") — the
    // coach named a specific weakness pattern (e.g. "tactic:fork"); drill exactly
    // that cluster NOW, ignoring the SRS due date. `motif` is the bucketOf key
    // (the weaknessSpine clusterId with any `analysis:` prefix stripped). Still
    // skip mastered ones.
    const motif = options.motif.replace(/^analysis:/, '');
    mistakes = mistakes.filter((mp) => bucketOf(mp).key === motif && mp.status !== 'mastered');
  } else {
    // SRS gate: skip mastered ("tested out") and not-yet-due mistakes.
    mistakes = mistakes.filter((mp) => mp.status !== 'mastered' && mp.srsDueDate <= today);
  }
  if (mistakes.length === 0) return [];

  const buckets = new Map<string, { label: string; items: MistakePuzzle[] }>();
  for (const mp of mistakes) {
    const { key, label } = bucketOf(mp);
    const b = buckets.get(key) ?? { label, items: [] };
    b.items.push(mp);
    buckets.set(key, b);
  }

  const themes: MistakeDrillTheme[] = [];
  for (const [key, b] of buckets) {
    const ordered = [...b.items].sort((a, z) => z.cpLoss - a.cpLoss);
    const drills = ordered
      .map(mistakePuzzleToDrill)
      .filter((d): d is CoachDrill => d !== null);
    if (drills.length === 0) continue;
    // `count` is the evidence — how many of the STUDENT'S OWN games hit this
    // weakness — so it must be fixed before any cement rep is appended (a fresh
    // pattern rep is not another instance of their mistake). Drives ordering.
    const ownCount = drills.length;
    // CEMENT THE PATTERN (Phase 3): after the student re-solves their own
    // flubbed positions in a TACTIC theme, append fresh reps of that same
    // Lichess pattern from puzzles.json — so they drill the idea, not only their
    // exact positions. Only tactic buckets map cleanly to a themed pool; phase /
    // transform buckets have none, so they get no cement rep (empty > guessed).
    if (cementReps > 0 && key.startsWith('tactic:')) {
      const theme = themesForTactic(key.slice('tactic:'.length) as TacticType)[0];
      if (theme) {
        const seenIds = new Set(drills.map((d) => d.puzzleId));
        const seenFens = new Set(drills.map((d) => d.setupFen));
        let added = 0;
        for (let s = 0; added < cementReps && s < cementReps + 6; s += 1) {
          const fresh = pickCoachDrill(`puzzle:${theme}`, { rating: cementRating, seed: 1009 + s });
          if (!fresh || seenIds.has(fresh.puzzleId) || seenFens.has(fresh.setupFen)) continue;
          seenIds.add(fresh.puzzleId);
          seenFens.add(fresh.setupFen);
          drills.push({ ...fresh, label: b.label, isCementRep: true });
          added += 1;
        }
      }
    }
    themes.push({ key, label: b.label, count: ownCount, drills });
  }
  // Most common weakness first; stable tie-break by label so the order is
  // deterministic across reloads.
  themes.sort((a, z) => (z.count - a.count) || a.label.localeCompare(z.label));
  return themes;
}

// ─── Session progression through the mistake queue (P3) ─────────────
// David 2026-07-03: real "test out" is the SRS mastery — a mistake drops
// out for the day when solved, the SRS brings it back, and after ~3
// correct spaced reps (`MASTERY_REPETITIONS` in mistakePuzzleService) it
// masters out of the pool for good. That persisted grade — via
// `gradeMistakePuzzle`, the SAME function MyMistakes / the SRS trainer
// use — is applied by the Learn surface on every solve/miss (so the coach
// drill stays in sync app-wide). This function only walks the CURRENT
// SESSION's due queue: serve each due mistake once, then advance to the
// next-most-common weakness. Pure, so it's unit-testable.

/** Where the user is in this session's mistake queue. */
export interface DrillProgress {
  queue: MistakeDrillTheme[];
  themeIdx: number;
  puzzleIdx: number;
}

export interface DrillAdvance {
  /** No more due mistakes this session. */
  done: boolean;
  /** Just finished a theme's due mistakes and moved to the next. */
  themeCompleted: boolean;
  /** Label of the theme just completed for the session (when themeCompleted). */
  completedLabel?: string;
  /** Label of the theme now starting (when themeCompleted, not done). */
  nextLabel?: string;
  /** The next drill to load + the progress to store (when not done). */
  next?: { drill: CoachDrill; progress: DrillProgress };
}

/**
 * Decide what happens after the user finishes the current drill (the SRS
 * grade is applied separately by the caller). Advances to the next due
 * mistake in the theme; when the theme's due mistakes are exhausted for
 * the session, moves to the next-most-common weakness; done when the
 * whole due queue is worked. Pure — the Learn surface applies the result.
 */
export function advanceMistakeDrill(p: DrillProgress): DrillAdvance {
  const theme = p.queue[p.themeIdx];
  if (!theme) return { done: true, themeCompleted: false };

  const puzzleIdx = p.puzzleIdx + 1;
  if (puzzleIdx < theme.drills.length) {
    return {
      done: false,
      themeCompleted: false,
      next: { drill: theme.drills[puzzleIdx], progress: { ...p, puzzleIdx } },
    };
  }

  // Theme's due mistakes are done for the session → next weakness.
  const themeIdx = p.themeIdx + 1;
  const nextTheme = p.queue[themeIdx];
  if (!nextTheme) {
    return { done: true, themeCompleted: true, completedLabel: theme.label };
  }
  return {
    done: false,
    themeCompleted: true,
    completedLabel: theme.label,
    nextLabel: nextTheme.label,
    next: {
      drill: nextTheme.drills[0],
      progress: { queue: p.queue, themeIdx, puzzleIdx: 0 },
    },
  };
}

function uciToMove(uci: string): { from: string; to: string; promotion?: string } {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci[4] : undefined,
  };
}

function spaced(t: string): string {
  return t.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
}

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

/** Deterministic hash for reproducible tie-breaks. */
function hash(seed: number, id: string): number {
  let s = seed >>> 0;
  for (let i = 0; i < id.length; i += 1) {
    s = (s + id.charCodeAt(i)) >>> 0;
    s = Math.imul(s ^ (s >>> 15), s | 1);
  }
  return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
}
