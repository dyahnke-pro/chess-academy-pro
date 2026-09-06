// explorerTeachLine
// -----------------
// Build a DEEP teaching line for a THIN/MISSING coach opening by walking the
// Lichess explorer from the opening's terminus (David 2026-09-06: "the fix for
// missing coach openings is to ask the amateur database into coach teach X
// opening… whichever one uses it the most… best grounded G0 opening data").
//
// Source selection is DATA-DRIVEN, not a fixed rule: at each ply we prefer the
// MASTERS explorer (sound theory — the right thing to teach as an opening's
// mainline), and fall to the AMATEUR buckets when masters is thin. A top-level
// opening therefore teaches from masters; the Traxler — which nobody plays at
// the top — teaches from its own amateur games instead of misfiring onto a
// name-matched Danish Gambit (the 809b388 bug this closes).
//
// G0/G3: every move is REAL explorer data (never invented) and chess.js-legal.
// Soundness guard is data-driven and engine-free — we skip a popular-but-losing
// move by its practical score in those same real games.

import { Chess } from 'chess.js';
import { fetchLichessExplorer } from './lichessExplorerService';
import type { LichessExplorerResult, LichessExplorerMove } from '../types';

export interface ExplorerTeachSegment {
  san: string;
  source: 'masters' | 'amateur';
  /** Games in the explorer that played this move at that position. */
  games: number;
  /** The mover's practical score (0-100) on this move in those games. */
  scorePctForMover: number;
}

export interface ExplorerTeachLine {
  /** SAN moves to APPEND to the seed line, sourced from the explorer. */
  sans: string[];
  segments: ExplorerTeachSegment[];
  /** FEN after the last appended move (= seedFen when sans is empty). */
  endFen: string;
}

/** Masters is "grounded" at a position once it holds this many games. */
const MASTERS_MIN_GAMES = 5;
/** Amateur is noisier, so it needs more games before we trust the line. */
const AMATEUR_MIN_GAMES = 20;
/** Don't follow a move played in fewer than this many games (noise). */
const MIN_MOVE_GAMES = 3;
/** Bound the walk — each ply costs up to two explorer hits. */
const DEFAULT_MAX_PLIES = 14;
/** A move whose mover-score is below this is a practical loser — skip it in
 *  favour of the next most-played sound move. */
const SOUNDNESS_FLOOR_PCT = 40;

function totalGames(r: LichessExplorerResult): number {
  return r.white + r.draws + r.black;
}
function moveGames(m: LichessExplorerMove): number {
  return m.white + m.draws + m.black;
}

/** The mover's practical score (0-100): (theirWins + draws/2) / games. */
export function moverScore(m: LichessExplorerMove, mover: 'w' | 'b'): number {
  const g = moveGames(m);
  if (g === 0) return 50;
  const wins = mover === 'w' ? m.white : m.black;
  return ((wins + m.draws / 2) / g) * 100;
}

/** Pick the move to teach: the MOST-PLAYED move (among the top few) that clears
 *  the soundness floor for the side to move; else the outright most-played. */
export function pickMove(r: LichessExplorerResult, mover: 'w' | 'b'): LichessExplorerMove | null {
  const candidates = [...r.moves].sort((a, b) => moveGames(b) - moveGames(a)).slice(0, 4);
  if (candidates.length === 0) return null;
  const sound = candidates.find(
    (m) => moveGames(m) >= MIN_MOVE_GAMES && moverScore(m, mover) >= SOUNDNESS_FLOOR_PCT,
  );
  return sound ?? candidates[0];
}

/**
 * Walk the explorer from `seedFen` and return the deep line to teach.
 * Returns an empty `sans` when neither source is grounded at the seed (the
 * caller keeps whatever short line it already has).
 */
export async function buildExplorerTeachLine(
  seedFen: string,
  opts?: { maxPlies?: number; ratings?: string },
): Promise<ExplorerTeachLine> {
  const maxPlies = opts?.maxPlies ?? DEFAULT_MAX_PLIES;
  let chess: Chess;
  try {
    chess = new Chess(seedFen);
  } catch {
    return { sans: [], segments: [], endFen: seedFen };
  }

  const sans: string[] = [];
  const segments: ExplorerTeachSegment[] = [];
  // Once masters comes back thin, stop paying for masters calls on the rest of
  // the walk (an obscure opening stays obscure) — halves the network cost.
  let mastersExhausted = false;

  for (let ply = 0; ply < maxPlies; ply += 1) {
    if (chess.isGameOver()) break;
    const fen = chess.fen();
    const mover = chess.turn();
    let source: 'masters' | 'amateur' | null = null;
    let picked: LichessExplorerMove | null = null;

    if (!mastersExhausted) {
      try {
        const masters = await fetchLichessExplorer(fen, 'masters');
        if (totalGames(masters) >= MASTERS_MIN_GAMES) {
          picked = pickMove(masters, mover);
          if (picked) source = 'masters';
        } else {
          mastersExhausted = true;
        }
      } catch {
        mastersExhausted = true; // circuit open / offline — lean on amateur
      }
    }

    if (!picked) {
      try {
        const amateur = await fetchLichessExplorer(
          fen,
          'lichess',
          opts?.ratings ? { ratings: opts.ratings } : undefined,
        );
        if (totalGames(amateur) >= AMATEUR_MIN_GAMES) {
          picked = pickMove(amateur, mover);
          if (picked) source = 'amateur';
        }
      } catch {
        /* both sources unreachable — stop here */
      }
    }

    if (!picked || !source) break; // no grounded data → stop extending

    let applied: ReturnType<Chess['move']> | null = null;
    try {
      applied = chess.move(picked.san);
    } catch {
      break; // explorer SAN illegal from this FEN (shouldn't happen) — stop
    }
    if (!applied) break;

    sans.push(applied.san);
    segments.push({
      san: applied.san,
      source,
      games: moveGames(picked),
      scorePctForMover: Math.round(moverScore(picked, mover)),
    });
  }

  return { sans, segments, endFen: chess.fen() };
}
