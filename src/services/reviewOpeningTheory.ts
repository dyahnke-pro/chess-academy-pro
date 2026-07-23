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

import { Chess } from 'chess.js';
import type { MasterPlayResult, MasterPlayMove, MasterPlayTopGame } from './masterPlayTypes';
import { lookupMasterPlay } from './masterPlayLookup';
import { walkBookLine } from './theoryDeparture';
import { detectOpeningTranspositional } from './openingDetectionService';
import { buildReviewMoveTeaching } from './reviewMoveTeaching';
import { explainTemptingCapture } from './reviewTeachingPoints';
import repertoire from '../data/repertoire.json';

/** A candidate move at a branch point, with its master-DB frequency + score. */
export interface TheoryMove {
  san: string;
  games: number;
  /** Share of games at this position that played this move (0..1). */
  pct: number;
  /** Win-share for the SIDE TO MOVE (win + half the draws), 0..1. Null when the
   *  masters DB has no result split for this position (degrade to popularity). */
  scoreForMover: number | null;
}

/** One theoretically-meaningful moment in the opening. */
export interface TheoryBranch {
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
}

export interface OpeningTheoryLecture {
  openingName: string;
  /** The theoretically-meaningful branch points, in game order. */
  branches: TheoryBranch[];
  /** 1-indexed ply where the game left mainstream theory, or null. */
  departurePly: number | null;
  /** Master games at the root — the size of the theory the opening rests on. */
  startGames: number;
}

/** Universal opening principles — the grounded floor for openings NOT in the
 *  curated repertoire (modern lines like the Pirc/Modern/KID that postdate the
 *  classical corpus). These are the public-domain principles Naroditsky reduces
 *  theory to for intermediate players ("keep developing, fight for the centre").
 *  Not opening-specific theory — the honest general layer, per CLAUDE.md's
 *  "verify universal principles" rule for modern openings. */
const UNIVERSAL_OPENING_IDEAS: string[] = [
  'control the centre and develop your pieces toward it',
  'get your king safe early, then look for your pawn break',
  "don't move the same piece twice in the opening without a concrete reason",
];

/** The opening's grounded key ideas — the curated repertoire keyIdeas when the
 *  opening is in the corpus (classical set), else the universal principles.
 *  Never invents opening-specific theory (G3). Exported for tests. */
export function resolveOpeningIdeas(openingName: string | null): string[] {
  return resolveCuratedOpeningIdeas(openingName) ?? UNIVERSAL_OPENING_IDEAS;
}

/** The CURATED, opening-SPECIFIC key ideas — repertoire keyIdeas ONLY, never the
 *  generic universal fallback. Returns null when the opening isn't in the corpus,
 *  so callers can distinguish "I have a specific plan for this opening" from
 *  "only universal principles apply" (David 2026-07-20: the dev-plan beat must
 *  be SPECIFIC to the opening played, not the same 'develop the knights' every
 *  game). G3 — never invents theory. */
export function resolveCuratedOpeningIdeas(openingName: string | null): string[] | null {
  if (!openingName) return null;
  const norm = openingName.toLowerCase();
  const entry = (repertoire as Array<{ name?: string; keyIdeas?: string[]; shortOverview?: string }>)
    .find((r) => typeof r.name === 'string' && (norm.includes(r.name.toLowerCase()) || r.name.toLowerCase().includes(norm)));
  if (entry?.keyIdeas && entry.keyIdeas.length > 0) return entry.keyIdeas.slice(0, 3);
  if (entry?.shortOverview) return [entry.shortOverview];
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

function scoreForMover(m: MasterPlayMove, mover: 'white' | 'black'): number | null {
  // white/draw/black are win-shares of the games with this move. The bundled
  // masters DB currently ships WITHOUT the result split (enrich-openings-db.mjs
  // dropped it — now fixed, but a rebuild is pending), so these are all 0 → no
  // real score. Return null so the lecture DEGRADES to popularity-only instead
  // of falsely claiming "scoring 0% — a matter of style" (David 2026-07-23).
  const hasData = m.whitePct + m.drawPct + m.blackPct > 0;
  if (!hasData) return null;
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

/** ", scoring 62%" when the result split exists, else "" (popularity-only). */
function scoreClause(m: TheoryMove): string {
  return m.scoreForMover != null ? `, scoring ${pct(m.scoreForMover)}` : '';
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
  opts: { lookup?: (fen: string) => Promise<MasterPlayResult> } = {},
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
        b.mainlineDive = line.map((p) => {
          const parts: string[] = [];
          const w = moveWhy(prevFen, p.san);
          if (w) parts.push(w);
          const tempt = explainTemptingCapture(prevFen, p.san, 'neutral');
          if (tempt) parts.push(tempt);
          prevFen = p.fenAfter;
          return { san: p.san, fenAfter: p.fenAfter, why: parts.length ? parts.join(' ') : null };
        });
      }
    } catch { /* a dive is a bonus, never a blocker */ }
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
  return { openingName, branches, departurePly, startGames };
}

// ─── NARRATION BEATS ────────────────────────────────────────────────────────
// The lecture, turned into a sequence of playable beats: at each branch the
// board shows the MAINLINE move (the arrow / played move) while the coach voices
// the grounded theory — mainline %, sidelines, and where the game deviated. Each
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
  // popularity comparison (real data) — never a fabricated "0% vs 0%".
  if (mainline.scoreForMover != null && played.scoreForMover != null) {
    const diff = mainline.scoreForMover - played.scoreForMover;
    if (diff >= 0.03) {
      parts.push(`In master play the main line scores ${pct(mainline.scoreForMover)} to ${lineWord}'s ${pct(played.scoreForMover)} — that's its pro; ${lineWord}'s pro is that opponents prepare for it less.`);
    } else if (diff <= -0.03) {
      parts.push(`Interestingly, ${sideWord} actually scores a touch BETTER in master play (${pct(played.scoreForMover)} to ${pct(mainline.scoreForMover)}) — it's less common, not worse.`);
    } else {
      parts.push(`The two score about the same in master play (${pct(mainline.scoreForMover)} vs ${pct(played.scoreForMover)}) — the choice is a matter of style.`);
    }
  } else {
    parts.push(`The main line is the more travelled road (${pct(mainline.pct)} of games vs ${pct(played.pct)}); ${lineWord}'s upside is surprise — opponents prepare for it less.`);
  }
  // "Forcing" is measured on the MAINLINE dive only — we never dove the
  // sideline, so a comparative "sharper of the two" / "both are quiet" claim
  // has no data on one of the two (board-awareness sweep, 2026-07-22). Speak
  // only about the mainline, which is what we actually computed.
  const forcing = dive.filter((d) => d.san.includes('x') || d.san.includes('+') || d.san.includes('#')).length;
  if (forcing >= 2) {
    parts.push(`The main line runs sharp — ${forcing} captures or checks inside the next few moves.`);
  }
  return parts.length ? ` ${parts.join(' ')}` : '';
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
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
function moveWhy(fenBefore: string, san: string): string | null {
  const raw = buildReviewMoveTeaching(fenBefore, san);
  if (!raw) return null;
  // Take just the first sentence — the theory beat wants a tight one-line
  // reason, not the full multi-sentence teaching paragraph.
  const first = raw.split(/(?<=[.!?])\s/)[0].trim();
  if (first.length < 6) return null;
  // Ensure it ends in a period so it slots cleanly as a trailing sentence.
  return /[.!?]$/.test(first) ? first : `${first}.`;
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

function sidelineClause(sidelines: TheoryMove[]): string {
  const named = sidelines.filter((s) => s.games > 0);
  if (named.length === 0) return '';
  if (named.length === 1) return ` The main alternative is ${named[0].san} (${pct(named[0].pct)}).`;
  return ` The other main tries are ${named[0].san} (${pct(named[0].pct)}) and ${named[1].san} (${pct(named[1].pct)}).`;
}

/** WHY the main line is the main line — grounded in the DATA (§3 gap). The main
 *  move is always the most-PLAYED (that's how it's picked); the extra insight is
 *  whether it ALSO scores best. Both → that's why it's main; if a sideline scores
 *  higher, say so honestly (popularity ≠ always the top score). */
function whyMainClause(mainline: TheoryMove, sidelines: TheoryMove[]): string {
  const named = sidelines.filter((s) => s.games > 0);
  if (named.length === 0) return '';
  // No result split → speak popularity only, never a fabricated score claim.
  if (mainline.scoreForMover == null) {
    return ' It\'s the most-played move here — the well-trodden main road.';
  }
  const bestSide = Math.max(...named.map((s) => s.scoreForMover ?? 0));
  if (mainline.scoreForMover >= bestSide) {
    return ' It leads the pack on BOTH counts — most-played and best-scoring — which is exactly why it earns the "main line" label.';
  }
  return ' Interestingly it\'s the most POPULAR without being the top-scorer here — a practical, well-trodden choice more than a proven edge.';
}

/**
 * Turn a lecture into playable, grounded beats. `ideas` (optional) are the
 * opening's known key ideas (from repertoire.json / the concept corpus) — when
 * present, the intro weaves one in; the frequencies always stand on their own.
 */
export function buildTheoryLectureBeats(
  lecture: OpeningTheoryLecture,
  ideas: string[] = [],
  /** The student's colour — so a sideline the OPPONENT played is narrated as
   *  "your opponent's line", never "your line" (board-awareness sweep,
   *  2026-07-22). Absent → neutral "your" (back-compat for callers/tests that
   *  don't thread it). */
  studentColor?: 'white' | 'black',
): TheoryLectureBeat[] {
  const beats: TheoryLectureBeat[] = [];
  const first = lecture.branches[0];
  const ideaClause = ideas.length > 0 ? ` The core idea: ${ideas[0]}` : '';
  beats.push({
    fenBefore: first.fenBefore,
    showUci: null,
    showSan: null,
    moveNumber: first.moveNumber,
    moverColor: first.moverColor,
    kind: 'intro',
    fact: `This is the theory behind the ${lecture.openingName}, the backbone of ${lecture.startGames.toLocaleString()} master games.${ideaClause}`,
  });

  // Only announce a variation NAME when it's new (Danya re-names at each branch,
  // but doesn't repeat the same name twice in a row).
  let lastNamed = lecture.openingName;
  const nameClause = (name: string | null): string => {
    if (!name || name === lastNamed) return '';
    lastNamed = name;
    return ` This is the ${name}.`;
  };
  const mainlineNameClause = (name: string | null): string =>
    !name || name === lastNamed ? '' : ` — the ${name}`;

  // G5 — a WHY sentence is spoken at most ONCE across the lecture. The same
  // developing move recurs ("the knight bears down on d4 and e5" on Nc3, Nf3,
  // Nc6); repeating it verbatim is the robotic tell David flagged. First use
  // keeps it; later identical sentences drop to silence.
  const seenWhy = new Set<string>();
  const freshWhy = (fenBefore: string, san: string): string => {
    const w = moveWhy(fenBefore, san);
    if (!w) return '';
    const k = w.toLowerCase();
    if (seenWhy.has(k)) return '';
    seenWhy.add(k);
    return ` ${w}`;
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
      const side = b.moverColor === 'white' ? 'White' : 'Black';
      beats.push({
        fenBefore: b.fenBefore, showUci: uciFor(b.fenBefore, b.mainline.san), showSan: b.mainline.san,
        moveNumber: b.moveNumber, moverColor: b.moverColor, kind: 'mainline',
        fact: `${b.mainline.san} is the standard move for ${side} here.${freshWhy(b.fenBefore, b.mainline.san)}`,
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
    const sanList = dive.map((d) => d.san).join(', ');
    beats.push({
      fenBefore: first.fenBefore, showUci: null, showSan: null,
      moveNumber: first.moveNumber, moverColor: first.moverColor, kind: 'mainline',
      fact: `The next moves are standard theory — ${sanList} — normal development, both sides fighting for the centre.`,
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
        fact: `Move ${b.moveNumber}, ${nSan} — this defines the ${lecture.openingName}.${freshWhy(b.fenBefore, nSan)}${modelClause(b)}`,
      });
      continue;
    }
    if (!isDistinctive(b)) { ffRun.push(b); continue; }
    flushFF(ffRun); ffRun = [];
    const side = b.moverColor === 'white' ? 'White' : 'Black';
    // The grounded WHY of the mainline move — Danya states the move, THEN the
    // reason as its own sentence ("Nf3. The knight bears down on d4 and e5.").
    // Board-computed (buildReviewMoveTeaching, G3); may be null. Deduped (G5).
    const whySentence = freshWhy(b.fenBefore, b.mainline.san);
    if (b.leftBook) {
      beats.push({
        fenBefore: b.fenBefore,
        showUci: uciFor(b.fenBefore, b.mainline.san),
        showSan: b.mainline.san,
        moveNumber: b.moveNumber,
        moverColor: b.moverColor,
        kind: 'departure',
        // Danya's departure shape: name where book is, what it is, then the
        // anti-sideline recipe ("when in doubt, keep developing").
        fact: `At move ${b.moveNumber}, this is where the game leaves mainstream theory. The book move for ${side} is ${b.mainline.san}${mainlineNameClause(b.mainlineName)} — ${pct(b.mainline.pct)} of master games${scoreClause(b.mainline)}.${whySentence}${sidelineClause(b.sidelines)}${b.mainlineDive.length >= 2 ? ' Let me show you how the main line runs from here.' : ' Past here you\'re on your own; keep developing and fight for the centre.'}`,
        diveFromFen: b.diveFromFen ?? undefined,
        dive: b.mainlineDive.length >= 2 ? b.mainlineDive : undefined,
      });
    } else if (b.isSideline && b.played) {
      beats.push({
        fenBefore: b.fenBefore,
        showUci: uciFor(b.fenBefore, b.played.san),
        showSan: b.played.san,
        moveNumber: b.moveNumber,
        moverColor: b.moverColor,
        kind: 'sideline',
        // The comparison is COMPUTED (score + forcing count) — the old hardcoded
        // "the main line presses a touch harder" was flavor, not data. And when a
        // dive exists, the beat WALKS the main line so the student SEES the moves
        // being compared (David 2026-07-21: "what was the main line? Show me").
        fact: `At move ${b.moveNumber}, the main line is ${b.mainline.san} (${pct(b.mainline.pct)}${scoreClause(b.mainline)}).${whySentence} This game took ${b.played.san} (${pct(b.played.pct)}) — a known sideline.${lineCompareClause(b.mainline, b.played, b.mainlineDive, studentColor && b.moverColor !== studentColor ? "your opponent's" : 'your')}${modelClause(b)}${nameClause(b.variationName)}${b.mainlineDive.length >= 2 ? ` Let me walk you down the main line ${b.mainline.san} so you can compare.` : ''}`,
        diveFromFen: b.diveFromFen ?? undefined,
        dive: b.mainlineDive.length >= 2 ? b.mainlineDive : undefined,
      });
    } else {
      beats.push({
        fenBefore: b.fenBefore,
        showUci: uciFor(b.fenBefore, b.mainline.san),
        showSan: b.mainline.san,
        moveNumber: b.moveNumber,
        moverColor: b.moverColor,
        kind: 'mainline',
        fact: `At move ${b.moveNumber}, ${b.mainline.san} is the main line for ${side} — ${pct(b.mainline.pct)} of games${scoreClause(b.mainline)}, the principled choice.${whySentence}${whyMainClause(b.mainline, b.sidelines)}${sidelineClause(b.sidelines)}${modelClause(b)}${nameClause(b.variationName)}${b.mainlineDive.length >= 2 ? ' Let me show you where it leads.' : ''}`,
        diveFromFen: b.diveFromFen ?? undefined,
        dive: b.mainlineDive.length >= 2 ? b.mainlineDive : undefined,
      });
    }
  }
  flushFF(ffRun); // any trailing obvious moves

  // Closing PLAN beat — Danya always lands on the middlegame idea ("march the
  // queenside pawns, 2v1" / "e5 vs c5 breaks"). Use a second key idea if there
  // is one distinct from the intro's, so the lecture ends on the plan, not stats.
  const planIdea = ideas.find((x) => x !== ideas[0]) ?? ideas[0];
  if (planIdea) {
    const last = lecture.branches[lecture.branches.length - 1];
    beats.push({
      fenBefore: last.fenBefore,
      showUci: null,
      showSan: null,
      moveNumber: last.moveNumber,
      moverColor: last.moverColor,
      kind: 'outro',
      fact: `The takeaway for this opening: ${planIdea}`,
    });
  }

  return beats;
}
