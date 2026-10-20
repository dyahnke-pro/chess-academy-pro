// reviewOpeningTheory — the OPENING THEORY LECTURE for the first part of a
// post-game review (David 2026-07-20: "a solid 5 minutes explaining the theory
// behind the opening and the variation that was played… what the different
// lines are, what is considered the best moves, what other sidelines can be
// played").
//
// This is the DATA computer (G0/G3): it walks the game's own opening moves
// through the masters database and, at every real branch point, records the
// MAINLINE (most-played master move), the top SIDELINES, the move the student's
// game actually played, and where the game LEFT mainstream theory. Every number
// is a database aggregate — no move, frequency, or win-rate is invented. The
// narration layer (reviewOpeningTheoryNarration) turns this into the spoken
// lecture; the LLM only phrases these computed facts.

import { shareAdverb, topMoveShare } from '../utils/shareWords';
import { describeSampleSize, scoreWords } from './explorerTranslate';
import { andList, lineShape, type LineSeat } from '../utils/andList';
import { Chess } from 'chess.js';
import type { MasterPlayResult, MasterPlayMove, MasterPlayTopGame } from './masterPlayTypes';
import { lookupMasterPlay } from './masterPlayLookup';
import { walkBookLine } from './theoryDeparture';
import { detectOpeningTranspositional } from './openingDetectionService';
import { lineWins } from './lineCalc';
import { costWords } from './engineConstants';
import { trapAheadAt, warmGemIndexes } from './gemCrushLines';
import { openingIdentityLine, warmOpeningIdentity } from './openingIdentity';
import { buildReviewMoveTeaching } from './reviewMoveTeaching';
import { withSubject, openSentence } from '../utils/openSentence';
import { identifyingTokens } from './danyaTeachingService';
import { explainTemptingCapture } from './reviewTeachingPoints';
import repertoire from '../data/repertoire.json';
import { bookMoveWhy } from './bookMoveWhy';
import { mastersPlanRead, mastersPlanLine, planStillAhead, type MastersPlanRead, type MovesAt } from './mastersPlanRead';
import { ensureMastersDbLoaded, mastersMovesSync } from './masterPlayLookup';
import { noteArrowSourceAt } from './openingGenerator';
import { loadFarmedCorpora } from './farmedCorpusData';

/** A candidate move at a branch point, with its master-DB frequency + score. */
interface TheoryMove {
  san: string;
  games: number;
  /** Share of games at this position that played this move (0..1). */
  pct: number;
  /** Win-share for the SIDE TO MOVE (win + half the draws), 0..1. Null when the
   *  masters DB has no result split for this position (degrade to popularity). */
  scoreForMover: number | null;
}

/** One theoretically-meaningful moment in the opening. */
interface TheoryBranch {
  /** 1-indexed ply of the move played here. */
  ply: number;
  moveNumber: number;
  moverColor: 'white' | 'black';
  fenBefore: string;
  /** The move the student's game actually played (null if it wasn't in the DB). */
  played: TheoryMove | null;
  /** The most-played master move at this position. */
  mainline: TheoryMove;
  /** The next-most-played alternatives (up to 2). */
  sidelines: TheoryMove[];
  totalGames: number;
  isMainline: boolean;
  /** Played is a known master move but not the mainline. */
  isSideline: boolean;
  /** The played move isn't in the master DB at this position. */
  leftBook: boolean;
  /** The named opening/variation the GAME'S line reaches at this ply (DB trie),
   *  or null — Danya re-names the variation at every branch. */
  variationName: string | null;
  /** The named variation the MAINLINE move would reach (for "the main line is
   *  the Austrian Attack"), or null. */
  mainlineName: string | null;
  /** The masters most-played continuation AFTER the mainline move — the "let's
   *  see the next couple of moves" dive Danya does (FpYf1Wrzi2M). Each step is
   *  the top master move at its node, chess.js-replayed, with a COMPUTED per-move
   *  why (mechanics + the "why not just take?" refutation when one applies) so
   *  the walk teaches every step instead of flashing moves (David 2026-07-21:
   *  "played out too quickly with no narration… explain each move with the same
   *  level of detail"). Empty when not dived. */
  mainlineDive: Array<{ san: string; fenAfter: string; why: string | null }>;
  /** The position after the mainline move — the FEN the dive starts from. */
  diveFromFen: string | null;
  /** Master games that reached THIS position — Danya's "Carlsen had this against
   *  Yangyi." From the lookup's topGames (rich sidecar / live), empty when the
   *  source has none. */
  topGames: MasterPlayTopGame[];
  /** The untaken alternatives at this branch, each played OUT as a short masters
   *  line so the coach can MARCH them on the board with narration during the
   *  Opening-theory lecture (David 2026-07-23: "if we want the coach to march
   *  those lines out with narration, the opening theory button is a good place").
   *  Populated only on the C8 "what was left out" branch. Empty otherwise. */
  exploreLines: ExploreLine[];
  /** Stockfish's own pick at this position — Danya's "the fish likes Knight d4."
   *  Filled by enrichLectureWithEngine (a NON-blocking pass after the DB build);
   *  null until then / when no engine. G0/G3: a real engine move + eval. */
  engineBest?: { san: string; evalCp: number } | null;
  /** The move the GAME played here, SAN (also when it left the book). */
  gameSan: string;
  /** The game's moves BEFORE this branch — the key the opening DB names each
   *  alternative's family by (`branchesAt`). */
  prefixSans: string[];
  /** What the game's move cost its own side by the review's engine read,
   *  centipawns; null when the review has no read for this ply. */
  playedCost: number | null;
  /** When the game's move dropped material by force: the engine's reply line,
   *  walked to its last capture (`lineCalc`), and what it wins. */
  refutation: { sans: string[]; what: string } | null;
}

/** The review's own engine read of one game ply (0-based index = ply − 1). */
interface LectureGameRead {
  /** Centipawns the move cost its own side (mover's POV); null when unknown. */
  cpLoss: number | null;
  /** The engine's best line for the OTHER side after the move, UCI. */
  replyLineUci: readonly string[];
}

/** An untaken alternative the coach marches out on the review board — the
 *  alternative move + a short masters continuation, each step with a computed
 *  why (G0/G3: real moves, computed reasons). Rendered as a theory-beat dive. */
export interface ExploreLine {
  /** The alternative SAN (e.g. "a6"). */
  san: string;
  /** Its share of master games at the branch (0..1), for the beat prose. */
  pct: number;
  /** The position to play the line out FROM (the branch's fenBefore). */
  fromFen: string;
  /** The alternative move + its masters continuation, board-replayed. */
  steps: Array<{ san: string; fenAfter: string; why: string | null }>;
}

interface OpeningTheoryLecture {
  openingName: string;
  /** The theoretically-meaningful branch points, in game order. */
  branches: TheoryBranch[];
  /** 1-indexed ply where the game left mainstream theory, or null. */
  departurePly: number | null;
  /** Master games at the root — the size of the theory the opening rests on. */
  startGames: number;
  /** THE PLAN THE OPENING WAS HEADING FOR — `mastersPlanRead` at the deepest
   *  position on the game's own path with enough master games: each side's
   *  break, piece home and castling side. Null when the book is too thin. */
  planRead: MastersPlanRead | null;
}

/** The CURATED, opening-SPECIFIC key ideas — repertoire keyIdeas ONLY, never the
 *  generic universal fallback. Returns null when the opening isn't in the corpus,
 *  so callers can distinguish "I have a specific plan for this opening" from
 *  "only universal principles apply" (David 2026-07-20: the dev-plan beat must
 *  be SPECIFIC to the opening played, not the same 'develop the knights' every
 *  game). G3 — never invents theory. */
export function resolveCuratedOpeningIdeas(
  openingName: string | null,
  /** REQUIRED — the student's seat. A repertoire entry's ideas are written for
   *  ITS colour ("Develop the light-squared bishop to f5 before …e6" is the
   *  Scandinavian player's plan), so they never reach the other seat (David's
   *  Scandinavian as White, 2026-10-19, heard Black's plan as his takeaway). */
  seat: 'white' | 'black',
): string[] | null {
  if (!openingName) return null;
  // Match by IDENTIFYING-token overlap, not a bidirectional full-name substring
  // (deep-dive D#2). The old substring match drifted two ways: a short entry
  // name substring-hits an unrelated game ("English" inside "…English Attack"),
  // and punctuation differences ("Sicilian Defense: Najdorf" vs the entry
  // "Sicilian: Najdorf") made a real match MISS. Tokenizing strips generic
  // scaffolding ("Defense", "Opening", "Attack") and normalizes punctuation, and
  // picking the entry that shares the MOST identifying tokens means a
  // "Sicilian … English Attack" game resolves to the Najdorf entry (2 shared),
  // never the English Opening (1 shared). G3 — still never invents theory.
  const queryTokens = identifyingTokens(openingName);
  if (queryTokens.size === 0) return null;
  let entry: { name?: string; keyIdeas?: string[]; shortOverview?: string } | null = null;
  let bestOverlap = 0;
  for (const r of repertoire as Array<{ name?: string; color?: string; keyIdeas?: string[]; shortOverview?: string }>) {
    if (typeof r.name !== 'string' || r.color !== seat) continue;
    const nameTokens = identifyingTokens(r.name);
    // EVERY identifying token of the entry must be in the game's name: one
    // shared token is a family, not this line (David's Old Sicilian was told
    // the Najdorf's "…a6 prevents Bb5+" off the lone token "sicilian").
    let overlap = 0;
    for (const t of nameTokens) if (queryTokens.has(t)) overlap += 1;
    if (overlap < nameTokens.size) continue;
    if (overlap > bestOverlap) { bestOverlap = overlap; entry = r; }
  }
  if (bestOverlap === 0 || !entry) return null;
  if (entry.keyIdeas && entry.keyIdeas.length > 0) return entry.keyIdeas.slice(0, 3);
  if (entry.shortOverview) return [entry.shortOverview];
  return null;
}

/** A position needs at least this many master games to be a real branch. */
const MIN_BRANCH_GAMES = 10;
/** The theory tour covers the whole opening phase — moves 1-12 (24 plies)
 *  where master coverage supports it (David 2026-07-20: "opening phase / theory
 *  1-12 need to be locked in"). The walk stops early on book departure or when a
 *  position drops below MIN_BRANCH_GAMES, so deep-theory lines get the full run
 *  and offbeat ones stop honestly where the book does. */
const MAX_PLIES = 24;

/** A move needs at least this many master games for its win-rate to be worth
 *  citing — below it, "scores 100%" is one or two games of noise, not a signal
 *  Danya would ever quote (David 2026-07-23). Degrade to popularity instead. */
const SCORE_MIN_GAMES = 10;

function scoreForMover(m: MasterPlayMove, mover: 'white' | 'black'): number | null {
  // white/draw/black are win-shares of the games with this move. The bundled
  // masters DB currently ships WITHOUT the result split (enrich-openings-db.mjs
  // dropped it — now fixed, but a rebuild is pending), so these are all 0 → no
  // real score. Return null so the lecture DEGRADES to popularity-only instead
  // of falsely claiming "scoring 0% — a matter of style" (David 2026-07-23).
  const hasData = m.whitePct + m.drawPct + m.blackPct > 0;
  if (!hasData) return null;
  // Small-sample guard — a 1-2 game win-rate ("100%") is noise, not theory.
  if (m.games < SCORE_MIN_GAMES) return null;
  return mover === 'white'
    ? m.whitePct + m.drawPct / 2
    : m.blackPct + m.drawPct / 2;
}

function toTheoryMove(m: MasterPlayMove, total: number, mover: 'white' | 'black'): TheoryMove {
  return {
    san: m.san,
    games: m.games,
    pct: total > 0 ? m.games / total : 0,
    scoreForMover: scoreForMover(m, mover),
  };
}

/** How the side that plays the move fares from here, in WORDS (V8 — no
 *  percentages in speech; the edges are explorerTranslate.scoreWords, the one
 *  set every surface reads). The score is EXPECTED POINTS for that side (win=1,
 *  draw=½), anchored to even (David 2026-07-23: "what does scoring 46% mean?"),
 *  and when it is the OPPONENT's move and they score under even, it says plainly
 *  that is comfortable for the student. "" when there is no result split. */
function scoreClause(
  m: TheoryMove,
  moverColor: 'white' | 'black',
  studentColor?: 'white' | 'black',
): string {
  if (m.scoreForMover == null) return '';
  const side = moverColor === 'white' ? 'White' : 'Black';
  const benefit = studentColor && moverColor !== studentColor && m.scoreForMover <= 0.47 ? ' — comfortable for you' : '';
  return `, and from here it ${scoreWords(m.scoreForMover)} for ${side}${benefit}`;
}

/** Warm what the lecture's beats read synchronously (the gem index for the
 *  trap on the line, the opening identity for the intro). Call before building. */
export function warmLectureSources(): void {
  warmGemIndexes();
  warmOpeningIdentity();
}

/** The review's engine read of the game's move, as lecture facts: its cost,
 *  and — when the reply line wins material — that line to its last capture. */
function gameReadFor(
  fenBefore: string, san: string, mover: 'white' | 'black', read: LectureGameRead | null,
): { playedCost: number | null; refutation: { sans: string[]; what: string } | null } {
  if (!read) return { playedCost: null, refutation: null };
  let refutation: { sans: string[]; what: string } | null = null;
  if (read.replyLineUci.length >= 2) {
    try {
      const c = new Chess(fenBefore);
      c.move(san);
      const w = lineWins(c.fen(), read.replyLineUci, mover === 'white' ? 'b' : 'w', undefined, { fenBefore, san });
      if (w) refutation = { sans: w.sans, what: w.what };
    } catch { /* no line — the cost stands alone */ }
  }
  return { playedCost: read.cpLoss, refutation };
}

/**
 * Build the opening-theory lecture for a game from its own opening moves.
 * Walks the masters DB along the game; each branch records mainline + sidelines
 * + the played move + the departure point. Returns null when there's no real
 * theory to teach (the game left book immediately, or the DB is unavailable).
 */
export async function buildOpeningTheoryLecture(
  fens: string[],
  sans: string[],
  openingName: string,
  opts: {
    lookup?: (fen: string) => Promise<MasterPlayResult>;
    gameReads?: ReadonlyArray<LectureGameRead | null>;
    studentColor: 'white' | 'black' | undefined;
    /** The masters file read synchronously, for the plan walk. Absent → the
     *  app's loaded copy (`mastersMovesSync`, warmed here). */
    movesAt?: MovesAt;
  },
): Promise<OpeningTheoryLecture | null> {
  if (fens.length < 2 || sans.length < 1) return null;
  const lookup =
    opts.lookup ?? ((fen: string) => lookupMasterPlay(fen, { triggeredBy: 'manual', surface: 'game-review' }));

  const branches: TheoryBranch[] = [];
  let departurePly: number | null = null;
  let startGames = 0;
  const limit = Math.min(sans.length, MAX_PLIES, fens.length - 1);

  for (let i = 0; i < limit; i++) {
    const fenBefore = fens[i];
    let res: MasterPlayResult;
    try {
      res = await lookup(fenBefore);
    } catch {
      break; // DB down → stop; whatever we have is honest
    }
    // Book ran thin here → this is where the game left mainstream theory.
    if (res.totalGames < MIN_BRANCH_GAMES || res.moves.length === 0) {
      if (departurePly === null) departurePly = i + 1;
      break;
    }

    const mover: 'white' | 'black' = i % 2 === 0 ? 'white' : 'black';
    const total = res.totalGames;
    const playedMove = res.moves.find((m) => m.san === sans[i]) ?? null;
    const mainlineRaw = res.moves[0];
    const isMainline = playedMove !== null && playedMove.san === mainlineRaw.san;
    const leftBook = playedMove === null;
    if (leftBook && departurePly === null) departurePly = i + 1;

    // Record a branch when there's genuine choice (2+ known moves) OR the game
    // deviated (a sideline / a departure) — skip forced single-reply positions.
    if (res.moves.length >= 2 || !isMainline) {
      const variationName = detectOpeningTranspositional(sans.slice(0, i + 1))?.name ?? null;
      const mainlineName = detectOpeningTranspositional([...sans.slice(0, i), mainlineRaw.san])?.name ?? null;
      branches.push({
        ply: i + 1,
        moveNumber: Math.ceil((i + 1) / 2),
        moverColor: mover,
        fenBefore,
        played: playedMove ? toTheoryMove(playedMove, total, mover) : null,
        mainline: toTheoryMove(mainlineRaw, total, mover),
        sidelines: res.moves.slice(1, 3).map((m) => toTheoryMove(m, total, mover)),
        totalGames: total,
        isMainline,
        isSideline: playedMove !== null && !isMainline,
        leftBook,
        variationName,
        mainlineName,
        mainlineDive: [],
        diveFromFen: null,
        topGames: res.topGames ? [...res.topGames] : [],
        exploreLines: [],
        engineBest: null,
        gameSan: sans[i],
        prefixSans: sans.slice(0, i),
        ...gameReadFor(fenBefore, sans[i], mover, opts.gameReads?.[i] ?? null),
      });
    }

    if (leftBook) break; // once off-book, the theory tour is over
  }

  // DIVE DOWN the mainline at the instructive branches — Danya's "let's see the
  // next couple of moves" (FpYf1Wrzi2M). EVERY SIDELINE gets a dive (David
  // 2026-07-21: "It said the main line is more aggressive. Well, what was the
  // main line? Show me those moves") plus the departure point and the deepest
  // mainline branch — capped so the lecture stays a lecture, not an hour.
  const MAX_DIVES = 4;
  const diveTargets: TheoryBranch[] = [];
  const depBranch = branches.find((b) => b.leftBook);
  if (depBranch) diveTargets.push(depBranch);
  for (const b of branches) {
    if (b.isSideline && !diveTargets.includes(b)) diveTargets.push(b);
  }
  const lastMain = [...branches].reverse().find((b) => !b.leftBook);
  if (lastMain && !diveTargets.includes(lastMain)) diveTargets.push(lastMain);
  for (const b of diveTargets.slice(0, MAX_DIVES)) {
    try {
      const c = new Chess(b.fenBefore);
      const mv = c.move(b.mainline.san);
      if (!mv) continue;
      const fromFen = c.fen();
      const line = await walkBookLine(fromFen, { maxPlies: 5, minGames: 5, lookup: opts.lookup });
      if (line.length >= 2) {
        b.diveFromFen = fromFen;
        // Per-step WHY, computed at build time: what the move does on the board
        // (mechanics) + the "why not just take?" refutation when a tempting
        // capture is being ignored (the Bg5/h4 register, David 2026-07-21).
        let prevFen = fromFen;
        b.mainlineDive = line.map((p, i) => {
          const parts: string[] = [];
          const w = moveWhy(prevFen, p.san, opts.studentColor);
          if (w) parts.push(w);
          const tempt = explainTemptingCapture(prevFen, p.san, 'neutral', line.slice(i).map((q) => q.san));
          if (tempt) parts.push(tempt);
          prevFen = p.fenAfter;
          return { san: p.san, fenAfter: p.fenAfter, why: parts.length ? parts.join(' ') : null };
        });
      }
    } catch { /* a dive is a bonus, never a blocker */ }
  }

  // C8 EXPLORE — march the untaken alternatives out (David 2026-07-23). Pick the
  // branch where the game FOLLOWED the main line (so its sidelines are genuinely
  // unexplored) with the strongest alternatives, and play each of its top-2
  // sidelines OUT: the alternative move + a short masters continuation, each step
  // with a computed why. Attached to that branch; the lecture renders them as
  // dives so the coach marches them on the board with narration.
  const c8Candidate = branches
    .filter((b) => b.ply >= 3 && !b.isSideline && !b.leftBook && b.played != null && b.sidelines.some((s) => s.games > 0))
    .map((b) => ({ b, own: b.moverColor === opts.studentColor ? 1 : 0, weight: b.sidelines.reduce((s, m) => s + m.pct, 0) }))
    // The STUDENT's own forks first (the tree walked after the game is theirs
    // to learn), then the strongest alternatives.
    .sort((a, b) => b.own - a.own || b.weight - a.weight)[0]?.b;
  if (c8Candidate) {
    const alts = c8Candidate.sidelines.filter((s) => s.games > 0).slice(0, 2);
    for (const alt of alts) {
      try {
        const c = new Chess(c8Candidate.fenBefore);
        const mv = c.move(alt.san);
        if (!mv) continue;
        const afterAlt = c.fen();
        const cont = await walkBookLine(afterAlt, { maxPlies: 4, minGames: 5, lookup: opts.lookup });
        const steps: Array<{ san: string; fenAfter: string; why: string | null }> = [];
        // Step 0 is the alternative move itself.
        steps.push({ san: alt.san, fenAfter: afterAlt, why: moveWhy(c8Candidate.fenBefore, alt.san, opts.studentColor) });
        let prev = afterAlt;
        for (const [i, p] of cont.entries()) {
          const parts: string[] = [];
          const w = moveWhy(prev, p.san, opts.studentColor);
          if (w) parts.push(w);
          const tempt = explainTemptingCapture(prev, p.san, 'neutral', cont.slice(i).map((q) => q.san));
          if (tempt) parts.push(tempt);
          steps.push({ san: p.san, fenAfter: p.fenAfter, why: parts.length ? parts.join(' ') : null });
          prev = p.fenAfter;
        }
        c8Candidate.exploreLines.push({ san: alt.san, pct: alt.pct, fromFen: c8Candidate.fenBefore, steps });
      } catch { /* a marched line is a bonus, never a blocker */ }
    }
  }

  if (branches.length === 0) return null;
  // "The backbone of N master games" is the count at THIS OPENING's NAMING
  // position — Danya's "over a thousand games." NOT the whole DB (plies 1-2 =
  // startpos/e4 mega-counts), NOT the broad parent (the Nc3 Sicilian is ~600k
  // before it's a Grand Prix), and NOT the thin deep tail (a move-9 position may
  // have only tens). Use the branch where the game first reaches its OWN named
  // opening; fall back to the deepest still-in-book position.
  const namingBranch = branches.find((b) => b.variationName === openingName);
  const deepestInBook = [...branches].reverse().find((b) => !b.leftBook);
  startGames = (namingBranch ?? deepestInBook ?? branches[0]).totalGames;
  return { openingName, branches, departurePly, startGames, planRead: await planOnGamePath(fens, departurePly != null ? departurePly - 1 : limit, opts.movesAt) };
}

/** The masters' plan for the opening the game played: read at the deepest
 *  position on the game's own path with enough games to say "usually"
 *  (`MIN_ROOT_GAMES`), keeping only what still lies ahead on the board where
 *  the game's book ended (`planStillAhead`) — a plan read before the game's
 *  bishop left f1 must not send that bishop somewhere from f1 (David's Vienna,
 *  2026-10-19: "your bishop on f1 usually goes to b5" with it on c4). */
async function planOnGamePath(fens: readonly string[], endIdx: number, movesAt: MovesAt | undefined): Promise<MastersPlanRead | null> {
  let at = movesAt;
  if (!at) {
    try { await ensureMastersDbLoaded(); } catch { return null; }
    at = mastersMovesSync;
  }
  const end = Math.min(endIdx, fens.length - 1);
  if (end < 0) return null;
  for (let i = end; i >= 0; i--) {
    const ahead = planStillAhead(mastersPlanRead(fens[i], at), fens[end]);
    if (ahead) return ahead;
  }
  return null;
}

/** Minimal engine seam for the theory lecture — matches
 *  `stockfishEngine.analyzeWithBudget` (bound in the component). */
interface TheoryEngine {
  analyzePosition: (fen: string, depth: number) => Promise<{ bestMove: string; evaluation: number; mateIn?: number | null }>;
}

/**
 * NON-blocking engine pass — fills `engineBest` on the lecture's key branches so
 * the coach can voice Danya's "the fish likes Knight d4 / the engine's own pick
 * is very testing" (C7). Runs AFTER the DB build (the theory button appears
 * without waiting on Stockfish), on a handful of the most instructive branches
 * only (naming + real-choice + sidelines, capped) so it stays a few engine
 * calls, not dozens. G0/G3: every move is the real engine best move.
 */
export async function enrichLectureWithEngine(
  lecture: OpeningTheoryLecture,
  engine: TheoryEngine,
  opts: { depth?: number; max?: number } = {},
): Promise<void> {
  const depth = opts.depth ?? 14;
  const max = opts.max ?? 3;
  const keys = lecture.branches
    .filter((b) => b.ply >= 3 && (b.isSideline || b.mainline.pct < 0.62 || b.variationName === lecture.openingName))
    .slice(0, max);
  for (const b of keys) {
    try {
      const a = await engine.analyzePosition(b.fenBefore, depth);
      if (!a.bestMove || a.bestMove.length < 4) continue;
      const c = new Chess(b.fenBefore);
      const m = c.move({ from: a.bestMove.slice(0, 2), to: a.bestMove.slice(2, 4), promotion: a.bestMove.slice(4, 5) || undefined });
      if (m) b.engineBest = { san: m.san, evalCp: Math.round(a.evaluation) };
    } catch { /* engine is a bonus, never a blocker */ }
  }
}

// ─── NARRATION BEATS ────────────────────────────────────────────────────────
// The lecture, turned into a sequence of playable beats: at each branch the
// board shows the MAINLINE move (the arrow / played move) while the coach voices
// the grounded theory — how firmly masters back the mainline, the sidelines, and
// where the game deviated, all in words (V8). Each
// `fact` is only computed numbers (G0); the house voice phrases them at runtime.

export interface TheoryLectureBeat {
  /** Position before this beat's move. */
  fenBefore: string;
  /** The move to PLAY on the board for this beat (the mainline), UCI. Null on
   *  the intro/outro beats (nothing to move). */
  showUci: string | null;
  /** The mainline SAN shown (for the arrow label / dev). */
  showSan: string | null;
  moveNumber: number;
  moverColor: 'white' | 'black';
  kind: 'intro' | 'mainline' | 'sideline' | 'departure' | 'outro';
  /** The grounded fact for the house voice to phrase. */
  fact: string;
  /** When present, the player PLAYS OUT this masters continuation on the board
   *  after the fact is spoken — Danya's "let's see the next couple of moves".
   *  Each step carries its computed why, spoken as the move lands. */
  diveFromFen?: string;
  dive?: Array<{ san: string; fenAfter: string; why: string | null }>;
  /** Untaken alternatives the student can OPTIONALLY play out — rendered as
   *  "Explore a6" chips, NOT auto-marched (David 2026-07-23: "the button lets
   *  users decide if they want to listen/learn them, instead of forcing more
   *  theory"). Present only on the C8 "what was left out" beat. */
  explore?: ExploreLine[];
}

/** PROS AND CONS of main line vs the played sideline — ALL computed (David
 *  2026-07-21: "What are the pros and cons of each line?" / "Why is it more
 *  aggressive?"). Score comparison from the master DB; "aggressive" grounded in
 *  the FORCING count of the mainline dive (captures + checks in the next few
 *  moves) — never a vibe. */
function lineCompareClause(
  mainline: TheoryMove,
  played: TheoryMove,
  dive: Array<{ san: string }>,
  /** Whose sideline this is — "your"/"your opponent's". A branch is recorded
   *  for BOTH colours, so a sideline the OPPONENT chose must not be narrated
   *  as "your line" (board-awareness sweep, 2026-07-22). */
  poss: 'your' | "your opponent's" = 'your',
): string {
  const parts: string[] = [];
  const lineWord = poss === 'your' ? 'your line' : "your opponent's line";
  const sideWord = poss === 'your' ? 'your sideline' : "your opponent's sideline";
  // Score comparison ONLY when the result split exists; otherwise degrade to a
  // popularity comparison (real data). Said in words, never as numbers (V8).
  if (mainline.scoreForMover != null && played.scoreForMover != null) {
    const diff = mainline.scoreForMover - played.scoreForMover;
    if (diff >= 0.03) {
      parts.push(`In master play the main line scores better than ${lineWord}.`);
    } else if (diff <= -0.03) {
      parts.push(`Interestingly, ${sideWord} actually scores a touch BETTER in master play — it's less common, not worse.`);
    } else {
      parts.push('The two score about the same in master play.');
    }
  }
  // No result split → nothing to compare but popularity, which the share
  // already said. ("Opponents prepare for it less" was a guess, never data.)
  // "Forcing" is measured on the MAINLINE dive only — we never dove the
  // sideline, so a comparative "sharper of the two" / "both are quiet" claim
  // has no data on one of the two (board-awareness sweep, 2026-07-22). Speak
  // only about the mainline, which is what we actually computed.
  const forcing = dive.filter((d) => d.san.includes('x') || d.san.includes('+') || d.san.includes('#')).length;
  if (forcing >= 2) {
    parts.push('The main line runs sharp — captures and checks come within the next few moves.');
  }
  return parts.length ? ` ${parts.join(' ')}` : '';
}

/** A model-game citation — Danya's "Carlsen had this against Yangyi." Prefers a
 *  game the STUDENT's side WON (the instructive "here's how your side plays it"),
 *  else the highest-profile game. Names + year are real (topGames from the DB /
 *  live). Empty when the source carries no games. Depersonalized: names the
 *  players (public record), never "he/his". */
function modelGameClause(
  topGames: MasterPlayTopGame[],
  studentColor: 'white' | 'black' | undefined,
): string {
  const named = topGames.filter((g) => g.white && g.black);
  if (named.length === 0) return '';
  const studentWon = (g: MasterPlayTopGame): boolean =>
    (studentColor === 'white' && g.result === '1-0') || (studentColor === 'black' && g.result === '0-1');
  const pick = named.find(studentWon) ?? named[0];
  const yr = pick.year ? `, ${pick.year}` : '';
  const outcome = pick.result === '1-0' ? ' (a White win)' : pick.result === '0-1' ? ' (a Black win)' : '';
  return ` This exact position was reached in ${pick.white}–${pick.black}${yr}${outcome}.`;
}

/** The grounded WHY of a move — what it DOES on the board (bears on a centre
 *  square, opens a file, tucks the king away, lands a tactic). Board-computed
 *  via buildReviewMoveTeaching (G3); null on a move with no concrete point.
 *  Returns a complete, capitalised sentence (its OWN sentence — Danya states
 *  the move, then the reason) so callers append it as trailing prose, never as
 *  an "— it …" clause (buildReviewMoveTeaching sentences lead with a subject
 *  like "The knight …", which an "it" prefix would garble). */
function moveWhy(fenBefore: string, san: string, studentColor: 'white' | 'black' | undefined, subject: string = san): string | null {
  // THE SEAT IS PER MOVE (oct3a review walk): a book line alternates movers,
  // so "their knight" is right on the student's plies only.
  const moverIsStudent = studentColor ? (fenBefore.split(' ')[1] === 'w') === (studentColor === 'white') : true;
  const raw = buildReviewMoveTeaching(fenBefore, san, moverIsStudent);
  if (!raw) return null;
  // Take just the first sentence — the theory beat wants a tight one-line
  // reason, not the full multi-sentence teaching paragraph.
  const first = raw.split(/(?<=[.!?])\s/)[0].trim();
  if (first.length < 6) return null;
  // Ensure it ends in a period so it slots cleanly as a trailing sentence.
  const said = withSubject(first, subject);
  return /[.!?]$/.test(said) ? said : `${said}.`;
}

function uciFor(fen: string, san: string): string | null {
  try {
    const c = new Chess(fen);
    const m = c.move(san);
    return `${m.from}${m.to}${m.promotion ?? ''}`;
  } catch {
    return null;
  }
}

/** THE ROAD A MOVE TAKES, BY NAME (his beat 1: the fork is a choice between
 *  families of positions, not between bare moves). The opening DB's name for
 *  the position `san` reaches from this branch, said relative to the opening the
 *  game is in ("the Mieses Variation", not "Vienna Game: Mieses Variation").
 *  Null when the DB names no road there, or the road IS the current opening. */
export function familyName(prefixSans: readonly string[], san: string, current: string): string | null {
  // The name of the position the move REACHES, never a deeper line under it
  // (3…Bc5 is not "the Meitner-Mieses Gambit" until White's Qg4 is played).
  const after = detectOpeningTranspositional([...prefixSans, san])?.name;
  const here = detectOpeningTranspositional([...prefixSans])?.name ?? current;
  return after && after !== here ? nameRelativeTo(after, here) : null;
}

/** An opening name said relative to the one the game is in: the family part
 *  dropped when shared ("the Mieses Variation"), with its article. Null when
 *  it is the current opening itself. */
function nameRelativeTo(name: string, current: string): string | null {
  const n = name.trim();
  let base = current.trim();
  if (!n || n === base) return null;
  // The longest part of the current name the new one extends: "Vienna Game:
  // Stanley Variation, Meitner-Mieses Gambit" under "Vienna Game: Stanley
  // Variation" is "the Meitner-Mieses Gambit".
  let short = n;
  for (;;) {
    if (n.startsWith(`${base},`) || n.startsWith(`${base}:`)) { short = n.slice(base.length + 1).trim(); break; }
    const cut = Math.max(base.lastIndexOf(','), base.lastIndexOf(':'));
    if (cut <= 0) break;
    base = base.slice(0, cut).trim();
  }
  // The road's own name is its last part ("Stanley Variation, Three Knights
  // Variation" → "Three Knights Variation").
  short = short.split(',').pop()?.trim() ?? '';
  if (!short) return null;
  // A bare adjective is said with its family ("Closed" → "Closed Sicilian").
  if (!/(?:Variation|Defen[cs]e|Gambit|Attack|System|Line|Opening|Game|Countergambit|Trap)$/i.test(short)) {
    const head = n.split(':')[0].replace(/\s+(?:Defen[cs]e|Opening|Game)$/i, '').trim();
    if (head && !short.split(/\s+/).includes(head)) short = `${short} ${head}`;
  }
  return /^\S+['’]s\b/.test(short) ? short : `the ${short}`;
}

/** Moves listed with the family each one commits to, when the DB names one
 *  and the names tell the moves apart. */
function namedMoves(prefixSans: readonly string[], sans: readonly string[], current: string): string {
  const names = sans.map((san) => familyName(prefixSans, san, current));
  const distinct = new Set(names.filter(Boolean)).size === names.filter(Boolean).length;
  return andList(sans.map((san, i) => (distinct && names[i] ? `${san} (${names[i]})` : san)));
}

/** The alternatives, named — how often in words for a lone one (V8), and the
 *  road each one takes. */
function sidelineClause(b: TheoryBranch, current: string): string {
  const named = b.sidelines.filter((s) => s.games > 0);
  if (named.length === 0) return '';
  // An alternative is never "usually" played — the main line out-plays it.
  const adverb = shareAdverb(named[0].pct * 100);
  const list = namedMoves(b.prefixSans, named.map((s) => s.san), current);
  if (named.length === 1) return ` The main alternative is ${list}, which masters ${adverb === 'sometimes' ? 'sometimes' : 'often'} play.`;
  return ` The other main tries are ${list}.`;
}


/** WHY the main line is the main line — grounded in the DATA (§3 gap). The main
 *  move is always the most-PLAYED (that's how it's picked); the extra insight is
 *  whether it ALSO scores best. Both → that's why it's main; if a sideline scores
 *  higher, say so honestly (popularity ≠ always the top score). With no result
 *  split there is nothing beyond popularity, which the share already said. */
function whyMainClause(mainline: TheoryMove, sidelines: TheoryMove[]): string {
  const named = sidelines.filter((s) => s.games > 0);
  if (named.length === 0 || mainline.scoreForMover == null) return '';
  const bestSide = Math.max(...named.map((s) => s.scoreForMover ?? 0));
  if (mainline.scoreForMover >= bestSide) {
    return ' It leads the pack on BOTH counts — most-played and best-scoring — which is exactly why it earns the "main line" label.';
  }
  return ' Interestingly it\'s the most POPULAR without being the top-scorer here — a practical, well-trodden choice more than a proven edge.';
}

/** THE CHARACTER OF THE GAME THE OPENING WAS HEADING FOR (his beat 6), from
 *  where masters castle in it: opposite wings make the middlegame a race of
 *  pawn storms. Same-wing castling is no announcement, so it is not said. */
function characterLine(read: MastersPlanRead | null, student: 'w' | 'b'): string | null {
  const w = read?.whiteCastle;
  const b = read?.blackCastle;
  if (!w || !b || w.share < 0.5 || b.share < 0.5 || w.side === b.side) return null;
  const mine = student === 'w' ? w : b;
  const theirs = student === 'w' ? b : w;
  return `Masters castle on opposite wings here — you ${mine.side}, they ${theirs.side} — so the middlegame is a race: each side throws its pawns at the other king.`;
}

/**
 * Turn a lecture into playable, grounded beats. `ideas` (optional) are the
 * opening's curated key ideas for the student's seat — the closing line when
 * the masters' plan says nothing; the frequencies always stand on their own.
 */
export function buildTheoryLectureBeats(
  lecture: OpeningTheoryLecture,
  ideas: string[] = [],
  /** The student's colour — so a sideline the OPPONENT played is narrated as
   *  "your opponent's line", never "your line" (board-awareness sweep,
   *  2026-07-22). Absent → neutral "your" (back-compat for callers/tests that
   *  don't thread it). */
  studentColor?: 'white' | 'black',
  /** THE VIDEO CORPUS LEADS WHERE IT HAS SOMETHING (David 2026-10-19: "it
   *  needs to match the video corpus we have"). A voiced note at the exact
   *  position a beat's move reaches — seat-checked and board-graded by the
   *  caller (`noteArrowSourceAt`) — is that move's teaching; the computed why
   *  fills positions with no note. Absent → computed only. */
  noteAt?: (historySans: string[], fenAfter: string) => string | null,
): TheoryLectureBeat[] {
  const beats: TheoryLectureBeat[] = [];
  const first = lecture.branches[0];
  // WHAT THE OPENING IS (the one identity computer Learn and chat read):
  // what it provokes, what it aims at — said before the numbers.
  const identity = openingIdentityLine(lecture.openingName, studentColor === 'black' ? 'b' : 'w', studentColor ? 'seat' : 'demo', null);
  // The identity is computed and seat-aware; the key idea waits for the
  // outro, where the masters' plan says it from the game's own position.
  const ideaClause = identity ? ` ${identity.text}` : '';
  beats.push({
    fenBefore: first.fenBefore,
    showUci: null,
    showSan: null,
    moveNumber: first.moveNumber,
    moverColor: first.moverColor,
    kind: 'intro',
    fact: `Let's dig into the theory. The ${lecture.openingName} rests on ${describeSampleSize(lecture.startGames)}.${ideaClause}`,
  });

  // Only announce a variation NAME when it's new (Danya re-names at each branch,
  // but doesn't repeat the same name twice in a row).
  let lastNamed = lecture.openingName;
  const nameClause = (name: string | null): string => {
    if (!name || name === lastNamed) return '';
    lastNamed = name;
    return ` This is the ${name}.`;
  };
  const mainlineNameClause = (name: string | null, prefixSans: readonly string[]): string => {
    const said = name && name !== lastNamed ? nameRelativeTo(name, detectOpeningTranspositional([...prefixSans])?.name ?? lecture.openingName) : null;
    return said ? ` — ${said}` : '';
  };

  // G5 — a WHY sentence is spoken at most ONCE across the lecture. The same
  // developing move recurs ("the knight bears down on d4 and e5" on Nc3, Nf3,
  // Nc6); repeating it verbatim is the robotic tell David flagged. First use
  // keeps it; later identical sentences drop to silence.
  const seenWhy = new Set<string>();
  const freshWhy = (fenBefore: string, san: string): string => {
    const w = moveWhy(fenBefore, san, studentColor, 'It');
    if (!w) return '';
    const k = w.toLowerCase();
    if (seenWhy.has(k)) return '';
    seenWhy.add(k);
    return ` ${w}`;
  };

  // The teaching for a move: the voiced note at the board it reaches, else the
  // computed why (deduped as above).
  const teach = (prefixSans: readonly string[], fenBefore: string, san: string): string => {
    if (noteAt) {
      try {
        const c = new Chess(fenBefore);
        c.move(san);
        const note = noteAt([...prefixSans, san], c.fen());
        if (note) return ` ${note.trim()}`;
      } catch { /* no note — computed */ }
    }
    return freshWhy(fenBefore, san);
  };

  // The masters line walked from the book move, each step's teaching the
  // voiced note at the board it reaches when there is one.
  const diveWithNotes = (b: TheoryBranch): Array<{ san: string; fenAfter: string; why: string | null }> => {
    const prefix = [...b.prefixSans, b.mainline.san];
    return b.mainlineDive.map((st) => {
      prefix.push(st.san);
      const note = noteAt ? noteAt([...prefix], st.fenAfter) : null;
      return note ? { ...st, why: note.trim() } : st;
    });
  };

  // Stock explanatory clauses (whyMain, fast-forward tail) are spoken at most
  // once — repeating "most POPULAR without being the top-scorer" verbatim on
  // every mainline beat is the robotic tell (G5).
  const seenPhrase = new Set<string>();
  const oncePhrase = (s: string): string => {
    if (!s) return '';
    const k = s.trim().toLowerCase();
    if (seenPhrase.has(k)) return '';
    seenPhrase.add(k);
    return s;
  };

  // C7 — the ENGINE's voice (Danya's "the fish likes Knight d4 — it's very
  // testing"). When Stockfish's pick differs from the crowd's move, that's the
  // sharp/critical try; when it agrees, it backs the main road. Grounded in the
  // real engine best move (enrichLectureWithEngine). Deduped so it stays a
  // highlight, not a refrain.
  const engineClause = (b: TheoryBranch): string => {
    if (!b.engineBest) return '';
    const eb = b.engineBest.san;
    if (eb === b.mainline.san) return oncePhrase(' The engine backs it, too — this is simply best play.');
    if (eb === b.played?.san) return oncePhrase(` And the engine likes this — ${eb} is its own top pick.`);
    if (b.sidelines.some((s) => s.san === eb)) return oncePhrase(` The engine, though, leans toward ${eb} — a sharper, more testing try than the crowd's move.`);
    return oncePhrase(` The engine has its own idea here — ${eb}, a testing move off the beaten path.`);
  };

  // C4/G4 — cite ONE model game (Danya's "Carlsen had this against Yangyi"), on
  // the first branch that carries games. Once per lecture so it stays a highlight.
  let citedModel = false;
  const modelClause = (b: TheoryBranch): string => {
    if (citedModel) return '';
    const c = modelGameClause(b.topGames, studentColor);
    if (c) citedModel = true;
    return c;
  };

  // THE DEPARTURE JUDGED (Danya reviews: "e6 is inaccurate", "a horrible
  // positional move" — always with the reason). The review's own engine read:
  // what the move cost, and when it dropped material by force, the line that
  // takes it, walked to its last capture (`lineCalc`).
  const seatOf = (c: 'white' | 'black'): LineSeat => (studentColor ? (c === studentColor ? 'you' : 'they') : (c === 'white' ? 'White' : 'Black'));
  const costClause = (b: TheoryBranch): string => {
    if (b.playedCost == null) return '';
    const other: 'white' | 'black' = b.moverColor === 'white' ? 'black' : 'white';
    const winner = seatOf(other);
    // THE TRADE, NEVER A STANDING (OS-11): "wins a rook for a knight", never
    // "comes out a rook for a knight up".
    const verb = winner === 'you' || winner === 'they' ? 'win' : 'wins';
    if (b.refutation) return ` The engine punishes ${b.gameSan}: ${lineShape(b.refutation.sans, seatOf(other))} — ${winner} ${verb} ${b.refutation.what}.`;
    if (b.playedCost >= 30) return ` By the engine's count ${b.gameSan} costs ${costWords(b.playedCost)}.`;
    return ` ${b.gameSan} is perfectly playable — the engine barely minds; it is just less common.`;
  };
  // ONE KNOWN TRAP ON THE WALKED LINE (the gems — engine-verified, mined at
  // club level). In review the punishment is shown, not withheld.
  let trapSaid = false;
  const trapClause = (fen: string): string => {
    if (trapSaid) return '';
    const t = trapAheadAt(fen);
    if (!t) return '';
    trapSaid = true;
    let line = '';
    try {
      const c = new Chess(fen);
      const slip = c.move(t.san);
      const uci: string[] = [];
      const cc = new Chess(c.fen());
      for (const san of t.punish) { const m = cc.move(san); if (!m) break; uci.push(`${m.from}${m.to}${m.promotion ?? ''}`); }
      const w = lineWins(c.fen(), uci, slip.color === 'w' ? 'b' : 'w', undefined, { fenBefore: fen, san: t.san });
      line = w ? ` loses ${w.what}: ${lineShape(w.sans, seatOf(slip.color === 'w' ? 'black' : 'white'))}` : ` runs into ${t.punish[0]}`;
    } catch { return ''; }
    return ` A trap to know here: the natural ${t.san}, which club players ${shareAdverb(t.freqPct)} choose,${line}.`;
  };

  // G2 — FAST-FORWARD the obvious, STOP at the distinctive. Danya rattles the
  // well-known opening moves ("G6, Bishop G7, Knight F3, Knight C6…") and stops
  // only at the branches that MATTER: a deviation from the main line, a real
  // choice (no overwhelming consensus move), a departure from book. Emitting a
  // full "e4 is the main line, 45% of games" beat for every move is the firehose
  // David rejected. A branch is DISTINCTIVE when the game deviated (sideline /
  // off-book) or the position had genuine choice (top move under ~62%); the
  // obvious high-consensus mainline moves fold into one quiet fast-forward beat
  // that plays them on the board without stopping to lecture each.
  const CONSENSUS = 0.62;
  const isDistinctive = (b: TheoryBranch): boolean => {
    // Plies 1-2 are the "which opening" choice (e4/d4, c5/e5) — the intro already
    // named it; a full "e4 scores 45%, the other tries are d4 and Nf3" beat is
    // exactly the firehose David rejected. Fold them (unless off-book).
    if (b.ply <= 2 && !b.leftBook) return false;
    return b.leftBook || b.isSideline || b.mainline.pct < CONSENSUS;
  };

  // Flush a run of folded obvious moves as ONE fast-forward beat (plays them on
  // the board, quiet steps, single summary line — no per-move lecture).
  const flushFF = (run: TheoryBranch[]): void => {
    if (run.length === 0) return;
    if (run.length === 1) {
      // A lone obvious move isn't worth a fast-forward wrapper — give it a tight
      // one-line mainline beat instead (no stats padding).
      const b = run[0];
      beats.push({
        fenBefore: b.fenBefore, showUci: uciFor(b.fenBefore, b.mainline.san), showSan: b.mainline.san,
        moveNumber: b.moveNumber, moverColor: b.moverColor, kind: 'mainline',
        fact: `${b.mainline.san} is the standard move here.${freshWhy(b.fenBefore, b.mainline.san)}`,
      });
      return;
    }
    const first = run[0];
    const dive: Array<{ san: string; fenAfter: string; why: string | null }> = [];
    let prev = first.fenBefore;
    for (const b of run) {
      const san = b.played?.san ?? b.mainline.san;
      try { const c = new Chess(prev); const m = c.move(san); if (!m) break; dive.push({ san, fenAfter: c.fen(), why: null }); prev = c.fen(); } catch { break; }
    }
    // Vary the tail so back-to-back fast-forwards don't read identically (G5).
    const tail = oncePhrase(' — normal development, both sides fighting for the centre') || ' — standard development, played quickly';
    beats.push({
      fenBefore: first.fenBefore, showUci: null, showSan: null,
      moveNumber: first.moveNumber, moverColor: first.moverColor, kind: 'mainline',
      fact: `That's standard theory so far${tail}.`,
      diveFromFen: dive.length >= 2 ? first.fenBefore : undefined,
      dive: dive.length >= 2 ? dive : undefined,
    });
  };

  // The NAMING branch: the first ply where the game reaches its own named
  // opening. Everything up to it is the opening's CONSTRUCTION — Danya rattles
  // those moves ("Knight C3, G6, Bishop G7…") and stops to NAME the opening, he
  // does NOT frame each as "you deviated from the Open Sicilian main line."
  // Those moves ARE the Grand Prix, not a departure from it, so the misleading
  // "the main line was g3, let me show you g3" dive is suppressed for them.
  const namingIdx = lecture.branches.findIndex((b) => b.variationName === lecture.openingName);

  let ffRun: TheoryBranch[] = [];
  for (let idx = 0; idx < lecture.branches.length; idx++) {
    const b = lecture.branches[idx];
    // Opening-construction moves (before the naming ply) fold into the fast-
    // forward — they're the road TO the opening, not choices within it.
    if (namingIdx > 0 && idx < namingIdx && !b.leftBook) { ffRun.push(b); continue; }
    // The naming ply: flush the road, then a single beat that NAMES the opening
    // on its defining move (no "you left the main line" comparison).
    if (idx === namingIdx && namingIdx >= 0) {
      flushFF(ffRun); ffRun = [];
      const nSan = b.played?.san ?? b.mainline.san;
      beats.push({
        fenBefore: b.fenBefore,
        showUci: uciFor(b.fenBefore, nSan),
        showSan: nSan,
        moveNumber: b.moveNumber,
        moverColor: b.moverColor,
        kind: 'mainline',
        fact: `And there it is — ${nSan}, and that's the ${lecture.openingName}.${teach(b.prefixSans, b.fenBefore, nSan)}${engineClause(b)}${modelClause(b)}`,
      });
      continue;
    }
    if (!isDistinctive(b)) { ffRun.push(b); continue; }
    flushFF(ffRun); ffRun = [];
    const side = b.moverColor === 'white' ? 'White' : 'Black';
    // The grounded WHY of the mainline move — Danya states the move, THEN the
    // reason as its own sentence ("Nf3. The knight bears down on d4 and e5.").
    // Board-computed (buildReviewMoveTeaching, G3); may be null. Deduped (G5).
    const whySentence = teach(b.prefixSans, b.fenBefore, b.mainline.san);
    // THE STUDENT'S OWN DEPARTURE GETS THE BOOK MOVE'S JOB (bookMoveWhy, the
    // one computer Learn uses): what the book move does on the board and what
    // the move played left undone. Review may name it — the game is over. The
    // opponent's departures keep the plain move reason: bookMoveWhy speaks to
    // the side that moved.
    const own = studentColor != null && b.moverColor === studentColor;
    const bookWhy = own && !b.isMainline
      ? bookMoveWhy(b.fenBefore, b.mainline.san, b.gameSan, studentColor === 'white' ? 'w' : 'b')
      : null;
    const share = `${openSentence(topMoveShare(b.mainline.pct * 100))}${scoreClause(b.mainline, b.moverColor, studentColor)}.`;
    if (b.leftBook && bookWhy) {
      beats.push({
        fenBefore: b.fenBefore,
        showUci: uciFor(b.fenBefore, b.mainline.san),
        showSan: b.mainline.san,
        moveNumber: b.moveNumber,
        moverColor: b.moverColor,
        kind: 'departure',
        fact: `Here's where you stepped out of book, with ${b.gameSan}. ${bookWhy.text} ${share}${costClause(b)}${trapClause(b.fenBefore)}${sidelineClause(b, lecture.openingName)}${b.mainlineDive.length >= 2 ? ' Let me show you how the book line runs.' : ''}`,
        diveFromFen: b.diveFromFen ?? undefined,
        dive: b.mainlineDive.length >= 2 ? diveWithNotes(b) : undefined,
      });
    } else if (b.leftBook) {
      beats.push({
        fenBefore: b.fenBefore,
        showUci: uciFor(b.fenBefore, b.mainline.san),
        showSan: b.mainline.san,
        moveNumber: b.moveNumber,
        moverColor: b.moverColor,
        kind: 'departure',
        // Danya's departure shape: name where book is, what it is, then the
        // anti-sideline recipe ("when in doubt, keep developing").
        fact: `Here's where the game steps out of book. The main road for ${side} is ${b.mainline.san}${mainlineNameClause(b.mainlineName, b.prefixSans)} — ${topMoveShare(b.mainline.pct * 100)}${scoreClause(b.mainline, b.moverColor, studentColor)}.${whySentence}${costClause(b)}${trapClause(b.fenBefore)}${sidelineClause(b, lecture.openingName)}${b.mainlineDive.length >= 2 ? ' Let me show you how it runs from here.' : ''}`,
        diveFromFen: b.diveFromFen ?? undefined,
        dive: b.mainlineDive.length >= 2 ? diveWithNotes(b) : undefined,
      });
    } else if (b.isSideline && b.played && bookWhy) {
      beats.push({
        fenBefore: b.fenBefore,
        // The board shows the BOOK move the beat is about (and the dive
        // continues from it); the game's own move is named in the words.
        showUci: uciFor(b.fenBefore, b.mainline.san),
        showSan: b.mainline.san,
        moveNumber: b.moveNumber,
        moverColor: b.moverColor,
        kind: 'sideline',
        fact: `${bookWhy.text} ${share} ${b.played.san} is ${b.played.pct < 0.05 ? 'a rare' : 'a known'} sideline${b.variationName && b.variationName !== lastNamed && nameRelativeTo(b.variationName, lecture.openingName) ? `, ${nameRelativeTo(b.variationName, lecture.openingName)}` : ''}.${costClause(b)}${lineCompareClause(b.mainline, b.played, b.mainlineDive, 'your')}${engineClause(b)}${modelClause(b)}${b.mainlineDive.length >= 2 ? ` Let me walk down ${b.mainline.san} so you can compare.` : ''}`,
        diveFromFen: b.diveFromFen ?? undefined,
        dive: b.mainlineDive.length >= 2 ? diveWithNotes(b) : undefined,
      });
      if (b.variationName) lastNamed = b.variationName;
    } else if (b.isSideline && b.played) {
      beats.push({
        fenBefore: b.fenBefore,
        // The board shows the BOOK move the beat is about (and the dive
        // continues from it); the game's own move is named in the words.
        showUci: uciFor(b.fenBefore, b.mainline.san),
        showSan: b.mainline.san,
        moveNumber: b.moveNumber,
        moverColor: b.moverColor,
        kind: 'sideline',
        // The comparison is COMPUTED (score + forcing count) — the old hardcoded
        // "the main line presses a touch harder" was flavor, not data. And when a
        // dive exists, the beat WALKS the main line so the student SEES the moves
        // being compared (David 2026-07-21: "what was the main line? Show me").
        fact: `The main line here is ${b.mainline.san} — ${topMoveShare(b.mainline.pct * 100)}${scoreClause(b.mainline, b.moverColor, studentColor)}.${whySentence} This game went ${b.played.san} instead, ${b.played.pct < 0.05 ? 'a rare' : 'a known'} sideline.${costClause(b)}${lineCompareClause(b.mainline, b.played, b.mainlineDive, studentColor && b.moverColor !== studentColor ? "your opponent's" : 'your')}${engineClause(b)}${modelClause(b)}${nameClause(b.variationName)}${b.mainlineDive.length >= 2 ? ` Let me walk down ${b.mainline.san} so you can compare.` : ''}`,
        diveFromFen: b.diveFromFen ?? undefined,
        dive: b.mainlineDive.length >= 2 ? diveWithNotes(b) : undefined,
      });
    } else {
      beats.push({
        fenBefore: b.fenBefore,
        showUci: uciFor(b.fenBefore, b.mainline.san),
        showSan: b.mainline.san,
        moveNumber: b.moveNumber,
        moverColor: b.moverColor,
        kind: 'mainline',
        fact: `${b.mainline.san} is ${side}'s main line here — ${topMoveShare(b.mainline.pct * 100)}${scoreClause(b.mainline, b.moverColor, studentColor)}.${whySentence}${trapClause(b.fenBefore)}${oncePhrase(whyMainClause(b.mainline, b.sidelines))}${engineClause(b)}${b.exploreLines.length > 0 ? '' : sidelineClause(b, lecture.openingName)}${modelClause(b)}${nameClause(b.variationName)}${b.mainlineDive.length >= 2 ? ' Let me show you where it leads.' : ''}`,
        diveFromFen: b.diveFromFen ?? undefined,
        dive: b.mainlineDive.length >= 2 ? diveWithNotes(b) : undefined,
      });
    }
  }
  flushFF(ffRun); // any trailing obvious moves

  // C8 — WHAT WAS LEFT OUT. Danya always names the big lines he didn't cover
  // ("we didn't analyze the entire Grand Prix — Bishop C4, the Botvinnik
  // setup"). Grounded: the strongest UNEXPLORED sidelines from the DB — the
  // branch whose alternatives to the played move carry the most master games.
  // Only the STUDENT's own choice-points (a real fork you could have taken
  // elsewhere), never the opponent's.
  // Only branches where the game FOLLOWED the main line — there the sidelines
  // are genuinely UNTAKEN alternatives (never the move the game actually played).
  // Any colour: the opening's big untaken lines include the opponent's other
  // setups (Danya-as-Black cites White's "Bishop C4"). Strongest sidelines win.
  const c8 = lecture.branches.find((b) => b.exploreLines.length > 0);
  if (c8) {
    // ONE "what was left out" beat that NAMES the alternatives and OFFERS them —
    // the student taps "Explore a6" to see it played out, or skips (David
    // 2026-07-23: don't force more theory on someone who doesn't want it). The
    // playable lines ride in `explore`, rendered as chips, not auto-marched.
    const list = namedMoves(c8.prefixSans, c8.exploreLines.map((e) => e.san), lecture.openingName);
    const whose = studentColor ? (c8.moverColor === studentColor ? 'you' : 'they') : (c8.moverColor === 'white' ? 'White' : 'Black');
    beats.push({
      fenBefore: c8.fenBefore,
      showUci: uciFor(c8.fenBefore, c8.exploreLines[0].san),
      showSan: c8.exploreLines[0].san,
      moveNumber: c8.moveNumber,
      moverColor: c8.moverColor,
      kind: 'mainline',
      fact: `At move ${c8.moveNumber} ${whose} had ${c8.exploreLines.length === 1 ? 'another main road' : 'other main roads'}: ${list}.`,
      explore: c8.exploreLines,
    });
  }

  // Closing PLAN beat — Danya always lands on the middlegame idea ("march the
  // queenside pawns, 2v1" / "e5 vs c5 breaks"). COMPUTED from the masters'
  // games at the deepest book position the game reached (each side's break,
  // where the pieces go, where the kings live — his beats 6 and 8). Review may
  // name the moves: the game is over. The curated idea (seat-matched by the
  // caller) speaks only when the masters' data says nothing.
  const seat: 'w' | 'b' = studentColor === 'black' ? 'b' : 'w';
  const planText = studentColor ? mastersPlanLine(lecture.planRead, seat, null)?.text ?? null : null;
  const character = studentColor ? characterLine(lecture.planRead, seat) : null;
  const computed = [planText, character].filter(Boolean).join(' ');
  const curated = ideas[0] ? `The takeaway for this opening: ${ideas[0].replace(/[.!?]?\s*$/, '.')}` : '';
  const planIdea = computed || curated;
  if (planIdea) {
    const last = lecture.branches[lecture.branches.length - 1];
    beats.push({
      fenBefore: last.fenBefore,
      showUci: null,
      showSan: null,
      moveNumber: last.moveNumber,
      moverColor: last.moverColor,
      kind: 'outro',
      fact: planIdea,
    });
  }

  return beats;
}

/** The lecture's voiced-corpus selector: the walkthrough's own exact-position,
 *  seat-checked, board-graded pick (`noteArrowSourceAt`), each note at most once
 *  per lecture. Build one per lecture build. */
export function lectureNoteSelector(
  openingName: string | null,
  seat: 'white' | 'black',
): (historySans: string[], fenAfter: string) => string | null {
  const seen = new Set<string>();
  return (prefix, fen) => noteArrowSourceAt(prefix, fen, seen, openingName, seat);
}

/** The corpus is fetched, not bundled: resolves once it is in memory. */
export function loadLectureCorpus(): Promise<unknown> {
  return loadFarmedCorpora();
}

/** One step of the lecture as it is PERFORMED: a move made on the board, or a
 *  line said about the board as it stands. */
type LectureStep =
  | { kind: 'position'; fen: string }
  | { kind: 'move'; fenBefore: string; san: string; uci: string; fenAfter: string }
  | { kind: 'say'; text: string; fen: string; /** set on a line walked move by move: said before the why */ moveSan?: string };

/**
 * THE LECTURE AS ONE SEQUENCE — every line is said AFTER the move it is about
 * is on the board (David 2026-10-19: "the narrations behind the theory button
 * are mostly spoken before a move is even made"). The runner used to sit each
 * beat on the position BEFORE its move, arrow the move and speak about it, and
 * the fast-forward beat named a list of moves before playing them. Here a beat
 * with a move plays it first; a walked line plays each move, then says it; a
 * fast-forward says its summary only once its moves are made.
 */
export function lectureSequence(beats: readonly TheoryLectureBeat[]): LectureStep[] {
  const out: LectureStep[] = [];
  const walk = (from: string, steps: ReadonlyArray<{ san: string; fenAfter: string; why: string | null }>): void => {
    out.push({ kind: 'position', fen: from });
    let prev = from;
    for (const st of steps) {
      const uci = uciFor(prev, st.san);
      if (!uci) break;
      out.push({ kind: 'move', fenBefore: prev, san: st.san, uci, fenAfter: st.fenAfter });
      out.push({ kind: 'say', text: st.why ?? '', fen: st.fenAfter, moveSan: st.san });
      prev = st.fenAfter;
    }
  };
  for (const b of beats) {
    if (!b.showUci && b.dive && b.diveFromFen) {
      walk(b.diveFromFen, b.dive);
      out.push({ kind: 'say', text: b.fact, fen: b.dive[b.dive.length - 1].fenAfter });
      continue;
    }
    out.push({ kind: 'position', fen: b.fenBefore });
    let sayFen = b.fenBefore;
    if (b.showUci && b.showSan) {
      try {
        const c = new Chess(b.fenBefore);
        c.move(b.showSan);
        out.push({ kind: 'move', fenBefore: b.fenBefore, san: b.showSan, uci: b.showUci, fenAfter: c.fen() });
        sayFen = c.fen();
      } catch { /* no move — the line stands on the position */ }
    }
    out.push({ kind: 'say', text: b.fact, fen: sayFen });
    if (b.dive && b.diveFromFen && b.dive.length > 0) walk(b.diveFromFen, b.dive);
  }
  return out;
}
