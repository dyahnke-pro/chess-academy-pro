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
import { isFixtureGame } from './fixtureGames';
import { isHomeOpeningGame } from './homeOpening';
import { getHomeOpenings } from './homeOpeningService';
import { fenKey } from './needScore';
import type { PlayerColor, PlayerIdentity } from './playerIdentity';
import type { GameRecord } from '../types';

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

/** fenKey(position before the opponent's move) → san → games. */
export type SteerIndex = Map<string, Map<string, number>>;

/** Build the index from the student's home games: the OPPONENT's replies at
 *  every position the games reached, for the given student colour. Pure. */
export function buildSteerIndex(games: readonly GameRecord[], identity: PlayerIdentity, colour: PlayerColor, family: string): SteerIndex {
  const index: SteerIndex = new Map();
  const opponentTurn = colour === 'white' ? 'b' : 'w';
  for (const g of games) {
    if (!isHomeOpeningGame(g, identity, { [colour]: { family } })) continue;
    const chess = new Chess();
    let sans: string[];
    try { chess.loadPgn(g.pgn); sans = chess.history(); } catch { continue; }
    const replay = new Chess();
    for (let i = 0; i < sans.length && i < STEER_MAX_PLY; i += 1) {
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
  const rows = [...bucket.entries()].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const total = rows.reduce((s, [, n]) => s + n, 0);
  if (total < STEER_MIN_GAMES) return null;
  let r = rng() * total;
  let pick = rows[rows.length - 1];
  for (const row of rows) { r -= row[1]; if (r < 0) { pick = row; break; } }
  const chess = new Chess(fen);
  let move;
  try { move = chess.move(pick[0]); } catch { return null; }
  return { san: move.san, uci: `${move.from}${move.to}${move.promotion ?? ''}`, games: pick[1], total, family };
}

const TTL_MS = 5 * 60 * 1000;
let cache: { at: number; key: string; index: SteerIndex; family: string } | null = null;

/** Test hook. */
export function __resetHomeSteerCacheForTests(): void { cache = null; }

/** Whether the steer index for this colour is already built (the first call of
 *  a game pays the whole build — 932 PGNs parsed — and must not be held to the
 *  warm-lookup budget; walk 2, 2026-09-23: the opening move of a Learn game
 *  fell through to the amateur band while the index was still building). */
export function isHomeSteerWarm(studentColor: PlayerColor): boolean {
  return !!cache && cache.key.startsWith(`${studentColor}:`) && Date.now() - cache.at <= TTL_MS;
}

/**
 * The opponent's steer at `fen` for a student playing `studentColor`, from
 * their persisted home opening for that colour. Null when there is no home,
 * the position is past the opening, or too few home games reached it.
 */
export async function pickHomeSteerMove(fen: string, studentColor: PlayerColor, rng: () => number = Math.random): Promise<HomeSteerPick | null> {
  const ply = (Number(fen.split(' ')[5] ?? '1') - 1) * 2 + (fen.split(' ')[1] === 'b' ? 1 : 0);
  if (ply >= STEER_MAX_PLY) return null;
  const home = await getHomeOpenings();
  const choice = home[studentColor];
  if (!choice) return null;
  const games = await db.games.filter((g) => !g.isMasterGame && !isFixtureGame(g)).toArray();
  const key = `${studentColor}:${choice.family}:${games.length}`;
  if (!cache || cache.key !== key || Date.now() - cache.at > TTL_MS) {
    const p = useAppStore.getState().activeProfile;
    const identity: PlayerIdentity = { profileName: p?.name ?? null, chessComUsername: p?.preferences.chessComUsername ?? null, lichessUsername: p?.preferences.lichessUsername ?? null };
    cache = { at: Date.now(), key, index: buildSteerIndex(games, identity, studentColor, choice.family), family: choice.family };
  }
  return steerFromIndex(cache.index, fen, cache.family, rng);
}
