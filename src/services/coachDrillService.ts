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
