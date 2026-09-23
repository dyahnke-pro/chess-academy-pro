// homeOpeningSteer — PLAY STEERS INTO THE HOME REPERTOIRE (WO-HOME-OPENING-01
// A7, PLAN decision 2026-09-22: "with the student as Black and the Pirc as
// home, the bot opens 1.e4 and follows the lines the student actually faces").
//
// The opponent's opening moves come from the student's OWN home games: at the
// current position, what did their opponents play next, and how often. That
// is a trie over the games on record — never theory recalled, never an engine
// pick — so the coach puts the student back into the positions they meet and
// keep meeting. Out of that trie (fewer than STEER_MIN_GAMES reached the
// position) it returns null and the existing layers take over: the taught
// slip has already had its turn, the amateur band and Stockfish follow.
//
// The pick among several faced continuations is weighted-RANDOM by frequency.
// That is the sanctioned randomness (CLAUDE.md: the opponent's moves are
// genuinely random on purpose); a single continuation is deterministic.
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { useAppStore } from '../stores/appStore';
import { logAppAudit } from './appAuditor';
import { isFixtureGame } from './fixtureGames';
import { isHomeOpeningGame } from './homeOpening';
import { getHomeOpenings } from './homeOpeningService';
import { getHomeSteerEntry, invalidateHomeSteer, setHomeSteerEntry, type HomeSteerEntry, type SteerIndex } from './homeSteerCache';
import { fenKey } from './needScore';
import type { PlayerColor, PlayerIdentity } from './playerIdentity';
import type { GameRecord } from '../types';

export { invalidateHomeSteer } from './homeSteerCache';
export type { SteerIndex } from './homeSteerCache';

/** Games that must have reached a position before the steer follows it. */
export const STEER_MIN_GAMES = 3;
/** Only the opening is steered; past this ply the trie thins to nothing anyway. */
export const STEER_MAX_PLY = 24;

export interface HomeSteerPick {
  san: string;
  uci: string;
  /** Games in which the opponent played this move here. */
  games: number;
  /** Home games that reached this position. */
  total: number;
  family: string;
}

/**
 * The first `maxPly` SAN tokens of a raw imported PGN — headers, `{…}` clock
 * and eval comments, `(…)` variations, NAGs, move numbers and the result
 * stripped. NOT validated here: the replay below plays each token through
 * chess.js and breaks on the first illegal one, which is the same legality the
 * old `loadPgn` gave — at a fraction of the cost. Measured 2026-09-23 (walk 4):
 * `loadPgn` + `history()` on a whole 80-ply chess.com game is ~12 ms, so the
 * 87-game home set cost ~1 s on the main thread at the coach's FIRST move —
 * the cold build lost its 4 s budget on prod (`home-steer-miss warm=false`)
 * while move two hit warm. Only the opening plies were ever needed.
 */
export function openingSans(pgn: string, maxPly: number): string[] {
  const body = pgn
    .replace(/^\s*\[[^\]]*\]\s*$/gm, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\([^)]*\)/g, ' ');
  const out: string[] = [];
  for (const raw of body.split(/\s+/)) {
    if (out.length >= maxPly) break;
    const t = raw.replace(/^\d+\.(?:\.\.)?/, '');
    if (!t || /^\d+\.*$/.test(t) || /^\$\d+$/.test(t) || /^(?:1-0|0-1|1\/2-1\/2|\*)$/.test(t)) continue;
    out.push(t);
  }
  return out;
}

/** Build the index from the student's home games: the OPPONENT's replies at
 *  every position the games reached, for the given student colour. Pure. */
export function buildSteerIndex(games: readonly GameRecord[], identity: PlayerIdentity, colour: PlayerColor, family: string): SteerIndex {
  const index: SteerIndex = new Map();
  const opponentTurn = colour === 'white' ? 'b' : 'w';
  for (const g of games) {
    if (!isHomeOpeningGame(g, identity, { [colour]: { family } })) continue;
    const sans = openingSans(g.pgn, STEER_MAX_PLY);
    const replay = new Chess();
    for (let i = 0; i < sans.length; i += 1) {
      const before = replay.fen();
      if (replay.turn() === opponentTurn) {
        const k = fenKey(before);
        const bucket = index.get(k) ?? new Map<string, number>();
        bucket.set(sans[i], (bucket.get(sans[i]) ?? 0) + 1);
        index.set(k, bucket);
      }
      try { replay.move(sans[i]); } catch { break; }
    }
  }
  return index;
}

/** The steer at a position, or null below the floor. `rng` is injectable for
 *  the gate; production passes Math.random (the opponent's randomness). */
export function steerFromIndex(index: SteerIndex, fen: string, family: string, rng: () => number = Math.random): HomeSteerPick | null {
  const bucket = index.get(fenKey(fen));
  if (!bucket) return null;
  const all = [...bucket.entries()].filter(([, n]) => n > 0);
  const total = all.reduce((s, [, n]) => s + n, 0);
  if (total < STEER_MIN_GAMES) return null;
  // A MOVE, not only the position, must clear the floor (walk 5, 2026-09-23):
  // after 1.e4 c5 the weighted pick drew 2.Bb5 — faced in ONE of 87 home
  // Sicilians. That is not "the lines the student actually faces", it is a
  // one-off game. The randomness among real lines stays (the opponent is
  // random on purpose); the one-offs leave the draw. `total` keeps counting
  // every game at the position, so "faced N of M" still reads against the
  // student's whole record.
  const rows = all.filter(([, n]) => n >= STEER_MIN_GAMES).sort((a, b) => b[1] - a[1]);
  if (rows.length === 0) return null;
  const pool = rows.reduce((s, [, n]) => s + n, 0);
  let r = rng() * pool;
  let pick = rows[rows.length - 1];
  for (const row of rows) { r -= row[1]; if (r < 0) { pick = row; break; } }
  const chess = new Chess(fen);
  let move;
  try { move = chess.move(pick[0]); } catch { return null; }
  return { san: move.san, uci: `${move.from}${move.to}${move.promotion ?? ''}`, games: pick[1], total, family };
}

const COLOURS: readonly PlayerColor[] = ['white', 'black'];
const inFlight = new Map<PlayerColor, Promise<HomeSteerEntry | null>>();

/** Test hook. */
export function __resetHomeSteerCacheForTests(): void { invalidateHomeSteer(); inFlight.clear(); }

/** Is this colour's index already built? The warm lookup is synchronous and
 *  touches no Dexie; the cold path is the build below. `coachGameEngine` sizes
 *  its budget on this (walk 2, 2026-09-23). */
export function isHomeSteerWarm(studentColor: PlayerColor): boolean {
  return getHomeSteerEntry(studentColor) !== null;
}

function identityNow(): PlayerIdentity {
  const p = useAppStore.getState().activeProfile;
  return { profileName: p?.name ?? null, chessComUsername: p?.preferences.chessComUsername ?? null, lichessUsername: p?.preferences.lichessUsername ?? null };
}

/**
 * Build (or join the in-flight build of) one colour's index. One build per
 * colour at a time: a Play mount and the coach's first turn both asking within
 * the same second share the work instead of doubling it on a starved thread.
 * Null when the student has no home opening for that colour — nothing is
 * cached, so the next call asks the record again (cheap, and an import that
 * creates a home will be followed by its own warm).
 */
async function buildFor(colour: PlayerColor, trigger: string): Promise<HomeSteerEntry | null> {
  const cached = getHomeSteerEntry(colour);
  if (cached) return cached;
  const running = inFlight.get(colour);
  if (running) return running;
  const work = (async (): Promise<HomeSteerEntry | null> => {
    const t0 = Date.now();
    const home = await getHomeOpenings();
    const choice = home[colour];
    if (!choice) return null;
    const games = await db.games.filter((g) => !g.isMasterGame && !isFixtureGame(g)).toArray();
    const index = buildSteerIndex(games, identityNow(), colour, choice.family);
    const entry: HomeSteerEntry = { index, family: choice.family, games: games.length, builtAt: Date.now(), buildMs: Date.now() - t0 };
    setHomeSteerEntry(colour, entry);
    void logAppAudit({
      kind: 'home-steer-warmed',
      category: 'subsystem',
      source: 'homeOpeningSteer.buildFor',
      summary: `colour=${colour} family=${choice.family} positions=${index.size} games=${games.length} buildMs=${entry.buildMs} trigger=${trigger}`,
    });
    return entry;
  })().finally(() => { inFlight.delete(colour); });
  inFlight.set(colour, work);
  return work;
}

/**
 * Warm the index ahead of the move that needs it — at boot (deferred, after
 * the first paint), after an import, and when Play mounts. Never throws: a
 * failed warm just leaves the cold path to the pick, budgeted as before.
 */
export async function warmHomeSteer(colour?: PlayerColor, trigger = 'warm'): Promise<void> {
  const targets = colour ? [colour] : COLOURS;
  await Promise.all(targets.map((c) => buildFor(c, trigger).catch(() => null)));
}

/**
 * The opponent's steer at `fen` for a student playing `studentColor`, from
 * their persisted home opening for that colour. Null when there is no home,
 * the position is past the opening, or too few home games reached it.
 * Warm: a synchronous map lookup. Cold: the build above, which the caller
 * budgets.
 */
export async function pickHomeSteerMove(fen: string, studentColor: PlayerColor, rng: () => number = Math.random): Promise<HomeSteerPick | null> {
  const ply = (Number(fen.split(' ')[5] ?? '1') - 1) * 2 + (fen.split(' ')[1] === 'b' ? 1 : 0);
  if (ply >= STEER_MAX_PLY) return null;
  const entry = getHomeSteerEntry(studentColor) ?? await buildFor(studentColor, 'pick');
  if (!entry) return null;
  return steerFromIndex(entry.index, fen, entry.family, rng);
}
