// THE TRANSPOSITION READER (census: "transposition reader"). The opening trie
// names a game by its MOVE ORDER; a game that reaches a named position by a
// different order keeps the coarse name it had. This names the POSITION: every
// Lichess DB opening keyed by the board it reaches (built offline by
// `scripts/build-opening-positions.mjs`, fetched lazily — never replayed at
// runtime). G3: every name is a real DB entry; only the move order differs.
import type { DetectedOpening } from '../types';

type PositionMap = Record<string, [string, number]>;
let positions: PositionMap | null = null;
let loading = false;

/** Fetch the index once, off the move path. */
export function warmOpeningPositions(): void {
  if (positions || loading || typeof fetch !== 'function') return;
  loading = true;
  void fetch('/data/opening-positions.json')
    .then((r) => (r.ok ? r.json() as Promise<PositionMap> : null))
    .then((j) => { if (j) positions = j; })
    .catch(() => undefined)
    .finally(() => { loading = false; });
}

/** Whether the index has loaded (a null answer before then means "not yet"). */
export function openingPositionsLoaded(): boolean { return positions !== null; }

/** For tests and for a caller that already holds the map. */
export function setOpeningPositions(map: PositionMap | null): void { positions = map; }

/** The DB opening this exact position is, or null (or not loaded yet). */
export function openingAtPosition(fen: string): { name: string; plies: number } | null {
  if (!positions) { warmOpeningPositions(); return null; }
  const hit = positions[fen.split(' ').slice(0, 4).join(' ')];
  return hit ? { name: hit[0], plies: hit[1] } : null;
}

/** The opening the game TRANSPOSED into: the board is a named DB position, and
 *  the move-order trie did not reach it (its match ended on an earlier ply or
 *  named something else). Null when there is no transposition to report. */
export function transposedOpening(fen: string, historyLength: number, byOrder: DetectedOpening | null): string | null {
  const pos = openingAtPosition(fen);
  if (!pos) return null;
  if (byOrder && byOrder.name === pos.name) return null;
  if (byOrder && byOrder.plyCount === historyLength) return null;   // the trie is AT this board already
  return pos.name;
}
