// gamesCourse — AN OPENING WITH NO HAND-BUILT LESSON, BUILT FROM THE GAMES
// (WO-ALL-OPENINGS-01 P2, David 2026-10-28: "Make sure the 'all' section of
// the openings teaches and builds this way" · "go as deep as chessbase on the
// forks"). The page's course is read off an `OpeningRecord` — `pgn` is the
// main line, `variations` the tabs (`openingCourse.buildCourse`,
// `variationTabs.buildVariationTabs`). A database-only opening's record has a
// three-move pgn and no variations, so this builds both from the games:
//
//   • the MAIN LINE — the named line, then the masters' most-played move each
//     ply until both sides have castled or the games run thin (the student's
//     move: the most-played one that does not lose in practice);
//   • a VARIATION for every real split along it — a move masters play in 8%+
//     and 10+ of the games at that board — walked the same way;
//   • a STOCKFISH VETO, when the caller gives one, on a main line that leaves
//     the student lost: the most-played line branching on a student move that
//     does not leave them lost takes its place.
//
// Every move is a move masters played (G3); Stockfish only checks a line. The
// database is injected, so the same builder runs on the deep master tree, the
// live explorer, or a fixture.
import { Chess } from 'chess.js';
import type { LichessExplorerResult, OpeningRecord, OpeningReply, OpeningVariation } from '../types';
import { pickWalkMove, repliesOverBar, moverScore } from './explorerTeachLine';
import { detectOpening } from './openingDetectionService';

/** Why a walk stopped. */
export type CourseStop = 'middlegame' | 'thin' | 'game-over' | 'max' | 'unreachable';

export interface CourseLine {
  /** The whole line from the start position. */
  sans: string[];
  /** Index in `sans` of the line's first move off its parent: the named
   *  line's length for the main line, the split's ply for a variation. */
  from: number;
  /** Games at the board the line leaves its parent from. */
  games: number;
  /** The first move's share of those games; null on the main line. */
  share: number | null;
  stop: CourseStop;
  /** The deepest named line in the opening database the line reaches past
   *  `from`, or null. */
  name: string | null;
  /** The student's eval at the line's end (cp, + good for them), when the
   *  veto read it. */
  endCp?: number | null;
}

export interface GamesCourse {
  main: CourseLine;
  variations: CourseLine[];
  /** How the games at the named line's end scored. */
  results: { white: number; draws: number; black: number } | null;
  /** A lookup failed: thinner than the data — never cache it. */
  incomplete: boolean;
}

export interface GamesCourseOptions {
  /** The database's answer at the board `sans` reaches, or null (no games). */
  lookup: (sans: readonly string[]) => Promise<LichessExplorerResult | null>;
  /** The student's eval (cp) at a board — the veto on a lost main line. */
  veto?: (fen: string) => Promise<number | null>;
}

/** A walk stops where fewer games than this reached the board. */
const WALK_FLOOR_GAMES = 10;
/** A guard on a walk's length; the middlegame stops it first. */
const WALK_MAX_PLIES = 30;
/** A main line ending worse than this for the student is vetoed. */
const VETO_CP = -100;
/** A student move scoring under this in practice is not taught. */
const SOUND_PCT = 40;

function games(r: LichessExplorerResult): number {
  return r.white + r.draws + r.black;
}

function bothCastled(c: Chess): boolean {
  const h = c.history({ verbose: true });
  return h.some((m) => m.color === 'w' && m.san.startsWith('O-O')) && h.some((m) => m.color === 'b' && m.san.startsWith('O-O'));
}

async function walk(start: readonly string[], student: 'w' | 'b', opts: GamesCourseOptions): Promise<{ sans: string[]; stop: CourseStop; failed: boolean }> {
  const c = new Chess();
  for (const s of start) c.move(s);
  const sans = [...start];
  for (let k = 0; k < WALK_MAX_PLIES; k += 1) {
    if (c.isGameOver()) return { sans, stop: 'game-over', failed: false };
    if (bothCastled(c)) return { sans, stop: 'middlegame', failed: false };
    let r: LichessExplorerResult | null;
    try { r = await opts.lookup(sans); } catch { return { sans, stop: 'unreachable', failed: true }; }
    if (!r || games(r) < WALK_FLOOR_GAMES) return { sans, stop: 'thin', failed: false };
    const pick = pickWalkMove(r, c.turn(), student);
    if (!pick) return { sans, stop: 'thin', failed: false };
    try { sans.push(c.move(pick.san).san); } catch { return { sans, stop: 'thin', failed: false }; }
  }
  return { sans, stop: 'max', failed: false };
}

function nameFor(sans: readonly string[], from: number): string | null {
  const d = detectOpening([...sans]);
  return d && d.plyCount > from ? d.name : null;
}

function fenOf(sans: readonly string[]): string {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
}

/** Build the course for the named line `lineSans`, the student playing `side`.
 *  Null when the line is not legal. */
export async function buildGamesCourse(lineSans: readonly string[], side: 'white' | 'black', opts: GamesCourseOptions): Promise<GamesCourse | null> {
  const student: 'w' | 'b' = side === 'white' ? 'w' : 'b';
  try { fenOf(lineSans); } catch { return null; }
  let incomplete = false;
  let root: LichessExplorerResult | null = null;
  try { root = await opts.lookup(lineSans); } catch { incomplete = true; }
  const results = root ? { white: root.white, draws: root.draws, black: root.black } : null;
  if (!root || games(root) < WALK_FLOOR_GAMES) {
    return { main: { sans: [...lineSans], from: lineSans.length, games: root ? games(root) : 0, share: null, stop: incomplete ? 'unreachable' : 'thin', name: null }, variations: [], results, incomplete };
  }
  const mainWalk = await walk(lineSans, student, opts);
  incomplete ||= mainWalk.failed;
  let main: CourseLine = { sans: mainWalk.sans, from: lineSans.length, games: games(root), share: null, stop: mainWalk.stop, name: nameFor(mainWalk.sans, lineSans.length) };

  const variations: CourseLine[] = [];
  for (let i = lineSans.length; i < main.sans.length; i += 1) {
    const prefix = main.sans.slice(0, i);
    let r: LichessExplorerResult | null;
    try { r = await opts.lookup(prefix); } catch { incomplete = true; continue; }
    if (!r) continue;
    const mover: 'w' | 'b' = i % 2 === 0 ? 'w' : 'b';
    const total = games(r);
    for (const alt of repliesOverBar(r, 'masters')) {
      if (alt.san === main.sans[i]) continue;
      // The student is taught moves that hold up in practice; the opponent's
      // are the ones the student will meet, sound or not.
      if (mover === student && moverScore(alt, mover) < SOUND_PCT) continue;
      let start: string[];
      try { const c = new Chess(fenOf(prefix)); start = [...prefix, c.move(alt.san).san]; } catch { continue; }
      const w = await walk(start, student, opts);
      incomplete ||= w.failed;
      variations.push({ sans: w.sans, from: i, games: total, share: total ? (alt.white + alt.draws + alt.black) / total : null, stop: w.stop, name: nameFor(w.sans, i + 1) });
    }
  }

  const veto = opts.veto;
  if (veto) {
    const endOf = async (l: CourseLine): Promise<number | null> => {
      try { return await veto(fenOf(l.sans)); } catch { return null; }
    };
    main.endCp = await endOf(main);
    if (main.endCp !== null && main.endCp < VETO_CP) {
      for (const v of variations.filter((x) => (x.from % 2 === 0 ? 'w' : 'b') === student)) {
        v.endCp = await endOf(v);
        if (v.endCp !== null && v.endCp >= VETO_CP) {
          const old = main;
          main = { ...v, share: null };
          variations.splice(variations.indexOf(v), 1, { ...old, from: v.from, share: v.share });
          break;
        }
      }
    }
  }
  return { main, variations, results, incomplete };
}

/**
 * THEIR REPLIES inside one line, built from the games (David 2026-10-28: "every
 * subline and tabia listed out … match the depth of chessable"). Chessable's
 * shape: the student has ONE answer at each position — the line's — and the
 * opponent's every real reply is a subline. So only the OPPONENT's moves split:
 * at each of their moves from `from` on, every reply masters play in 8%+ and
 * 10+ of the games at that board, other than the line's own move, walked to
 * the middlegame the same way as the line. Deeper forks live in the lesson
 * itself, which stops at every split as it is played.
 */
export async function buildReplies(lineSans: readonly string[], from: number, side: 'white' | 'black', opts: GamesCourseOptions): Promise<{ replies: OpeningReply[]; incomplete: boolean }> {
  const student: 'w' | 'b' = side === 'white' ? 'w' : 'b';
  const replies: OpeningReply[] = [];
  const trunkName = detectOpening([...lineSans])?.name ?? '';
  let incomplete = false;
  for (let i = Math.max(0, from); i < lineSans.length; i += 1) {
    const mover: 'w' | 'b' = i % 2 === 0 ? 'w' : 'b';
    if (mover === student) continue;
    const prefix = lineSans.slice(0, i);
    let r: LichessExplorerResult | null;
    try { r = await opts.lookup(prefix); } catch { incomplete = true; continue; }
    if (!r) continue;
    const total = games(r);
    for (const alt of repliesOverBar(r, 'masters')) {
      if (alt.san === lineSans[i]) continue;
      let start: string[];
      try { const c = new Chess(fenOf(prefix)); start = [...prefix, c.move(alt.san).san]; } catch { continue; }
      const w = await walk(start, student, opts);
      incomplete ||= w.failed;
      const altGames = alt.white + alt.draws + alt.black;
      // The reply's own name: one the trunk already carried (the opening's name,
      // matched before the reply moved) would label every reply the same.
      const named = detectOpening([...w.sans]);
      replies.push({
        triggerMove: start[i],
        name: named && named.plyCount > i && named.name !== trunkName ? named.name : '',
        pct: total ? Math.round((altGames / total) * 100) : 0,
        games: altGames,
        moves: w.sans,
        atPly: i,
        reachesMiddlegame: w.stop === 'middlegame',
      });
    }
  }
  return { replies, incomplete };
}

/** A split move as a tab says it: "…g6" for Black, "b4" for White. */
function moveLabel(line: CourseLine): string {
  const san = line.sans[line.from];
  return line.from % 2 === 1 ? `…${san}` : san;
}

/** The course as the opening page reads it: the record with its main line
 *  run on and its variations filled — never written back over the database
 *  row (its pgn is the opening's identity). */
export function courseRecord(opening: OpeningRecord, course: GamesCourse): OpeningRecord {
  const variations: OpeningVariation[] = course.variations.map((v) => {
    const label = moveLabel(v);
    const pct = v.share !== null ? Math.round(v.share * 100) : null;
    const said = pct !== null ? ` — masters play it in ${pct}% of the ${v.games.toLocaleString('en-US')} games at that point` : '';
    return {
      name: `${v.name ?? opening.name} (${label})`,
      pgn: v.sans.join(' '),
      explanation: `${label}${said}.`,
      deviationMove: v.from,
      source: 'masters',
    };
  });
  return { ...opening, pgn: course.main.sans.join(' '), variations: variations.length ? variations : opening.variations };
}
