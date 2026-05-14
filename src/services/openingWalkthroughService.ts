// openingWalkthroughService
// -------------------------
// Reconstruct the move sequence that led to a puzzle's pre-state.
// Lichess's puzzle API returns `game.pgn` (the full game) +
// `puzzle.initialPly` (how many ply into that PGN the puzzle position
// starts). Slicing PGN to initialPly OFTEN gives us the exact history
// — but Lichess's initialPly + our local puzzle FEN occasionally drift
// (off-by-one from how the puzzle was seeded, or the FEN was sourced
// from a different game). When that happens, the original
// implementation animated initialPly plies and then snapped to the
// puzzle position visually because the terminus didn't match.
//
// Layered recovery:
//   1. **PGN-scan** — replay the full PGN one ply at a time and
//      return at the FIRST ply whose resulting FEN matches the target.
//      Handles drift in either direction (initialPly too high or too
//      low) without any extra network call.
//   2. **Explorer bridge** — when the puzzle FEN never appears in the
//      source-game PGN at all (different game took us there), play
//      the Lichess opening-explorer's MOST-POPULAR continuation
//      ply-by-ply from the source-game's terminus until we either
//      land on the target or hit a small depth limit. "Most probable
//      continuation" per David's spec.
//   3. **Give up** — if neither path closes the gap, return the
//      original setupSans with `found=false` so the caller falls
//      through to the existing skip-to-puzzle error UI.
//
// Used by the Opening Traps "Show the opening" button so the user
// watches the position develop ply-by-ply instead of jump-cutting in.

import { Chess } from 'chess.js';
import { fetchLichessExplorer } from './lichessExplorerService';

const PROXY_PATH = '/api/lichess-puzzle';
const FETCH_TIMEOUT_MS = 6_000;
/** Explorer-bridge cap. Most drift cases close within 1-2 plies; 4
 *  bounds the explorer cost (each ply = one /api/lichess-explorer hit)
 *  while still rescuing edge cases. */
const BRIDGE_MAX_DEPTH = 4;

export interface OpeningWalkthroughResult {
  /** SAN move list from the starting position to the puzzle's pre-state.
   *  Empty when the lookup failed. */
  sans: string[];
  /** True when sans.length > 0 AND the last move's resulting FEN
   *  matches the requested target (placement+turn+castling+ep). */
  found: boolean;
}

interface LichessPuzzleResponse {
  game?: {
    pgn?: string;
  };
  puzzle?: {
    initialPly?: number;
  };
}

function fenKey(fen: string): string {
  // Compare positions ignoring half-move clock + full-move number
  // (fields 5 & 6) — those drift between Lichess's PGN replay and
  // the puzzle FEN we ship locally.
  return fen.split(' ').slice(0, 4).join(' ');
}

/** Replay the PGN from the start, returning the shortest prefix that
 *  lands on `targetFen` (compared by fenKey). Returns null if the
 *  target never appears. */
function scanPgnForTarget(pgnSans: string[], targetFen: string): {
  sans: string[];
  terminalFen: string;
  reached: boolean;
} {
  const targetKey = fenKey(targetFen);
  const chess = new Chess();
  if (fenKey(chess.fen()) === targetKey) {
    return { sans: [], terminalFen: chess.fen(), reached: true };
  }
  const sansSoFar: string[] = [];
  for (const san of pgnSans) {
    try {
      chess.move(san);
    } catch {
      // Bad SAN — Lichess PGN had something chess.js rejects. Stop
      // scanning and let the caller decide whether to bridge from
      // here.
      break;
    }
    sansSoFar.push(san);
    if (fenKey(chess.fen()) === targetKey) {
      return { sans: sansSoFar, terminalFen: chess.fen(), reached: true };
    }
  }
  return { sans: sansSoFar, terminalFen: chess.fen(), reached: false };
}

/** Probe Lichess explorer for the MOST-POPULAR move from `fromFen`.
 *  Returns the SAN or null when the explorer has no data / errors. */
async function topExplorerMove(fromFen: string): Promise<string | null> {
  try {
    const result = await fetchLichessExplorer(fromFen);
    const top = result.moves[0];
    return top?.san ?? null;
  } catch {
    return null;
  }
}

/** From `fromFen` play the most-popular continuation ply-by-ply until
 *  the position matches `targetFen` (placement+turn+castling+ep). Stops
 *  at `BRIDGE_MAX_DEPTH` to bound explorer calls. Returns the bridging
 *  SANs (possibly empty if no bridge found within budget).
 *
 *  Greedy single-line search: try the explorer's top move at each
 *  step. If it lands on target → done. If not → recurse with that
 *  move played. No backtracking, no BFS branching — keeps the
 *  network cost predictable. If the top-1 line doesn't close the
 *  gap within depth, give up rather than burn a fan-out of probes. */
async function bridgeToTarget(
  fromFen: string,
  targetFen: string,
): Promise<string[]> {
  const targetKey = fenKey(targetFen);
  if (fenKey(fromFen) === targetKey) return [];
  const chess = new Chess(fromFen);
  const bridge: string[] = [];
  for (let depth = 0; depth < BRIDGE_MAX_DEPTH; depth++) {
    const nextSan = await topExplorerMove(chess.fen());
    if (!nextSan) return [];
    try {
      chess.move(nextSan);
    } catch {
      return [];
    }
    bridge.push(nextSan);
    if (fenKey(chess.fen()) === targetKey) return bridge;
  }
  return [];
}

/** Fetch the puzzle's source game and return the SAN move list from
 *  the chess starting position up to the puzzle's pre-state. */
export async function reconstructPathForPuzzle(
  puzzleId: string,
  targetFen: string,
): Promise<OpeningWalkthroughResult> {
  let data: LichessPuzzleResponse | null = null;
  try {
    const resp = await fetch(`${PROXY_PATH}?id=${encodeURIComponent(puzzleId)}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!resp.ok) return { sans: [], found: false };
    data = (await resp.json()) as LichessPuzzleResponse;
  } catch {
    return { sans: [], found: false };
  }

  const pgn = data?.game?.pgn ?? '';
  const initialPly = data?.puzzle?.initialPly;
  if (!pgn || typeof initialPly !== 'number') {
    return { sans: [], found: false };
  }

  // Lichess's `game.pgn` is space-separated SANs (no move numbers, no
  // header tags).
  const allSans = pgn.split(/\s+/).filter(Boolean);

  // ── Layer 1: PGN-scan ─────────────────────────────────────────
  // Replay the full PGN one ply at a time and return at the first
  // ply whose resulting FEN matches the target. Tolerates Lichess's
  // initialPly being off (in either direction) from our local
  // puzzle FEN's actual position in the source game.
  const scan = scanPgnForTarget(allSans, targetFen);
  if (scan.reached) {
    return { sans: scan.sans, found: true };
  }

  // ── Layer 2: Explorer bridge ──────────────────────────────────
  // The source-game PGN replay never hit the target — the puzzle was
  // likely seeded from a different game that transposed into this
  // position. Play the most-popular continuation from the PGN's
  // terminus toward the target. Per David's spec: "the most probable
  // continuation to play out on the board to reach the starting
  // position of the puzzle."
  const bridge = await bridgeToTarget(scan.terminalFen, targetFen);
  if (bridge.length > 0) {
    return { sans: [...scan.sans, ...bridge], found: true };
  }

  // ── Layer 3: Give up ──────────────────────────────────────────
  // Neither layer closed the gap. Return the initialPly slice (the
  // original-behavior fallback) so the caller's error UI fires and
  // the user is told the source game couldn't be reconstructed.
  const setupSans = allSans.slice(0, initialPly);
  return { sans: setupSans, found: false };
}
