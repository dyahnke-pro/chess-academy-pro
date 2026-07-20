// reviewPieceItinerary — §1 "piece routes as itineraries" (the transcript gap:
// Naroditsky narrates a knight's journey "f3–d2–c4", not three single moves).
//
// 100% G0/G3: the route is the piece's ACTUAL path in THIS game — chess.js
// replays the moves and chains each hop (a move whose FROM square is where the
// same piece last landed). Nothing is invented; we never fabricate a maneuver
// the student didn't play. A route only surfaces when it's a real REROUTE — a
// minor piece taking ≥2 hops to reach an ADVANCED square (its journey is the
// lesson, not a one-move development).

import { Chess } from 'chess.js';

const PIECE_LABEL: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };

export interface PieceItinerary {
  /** 1-based ply where the maneuver completes (the last hop). */
  ply: number;
  pieceType: 'n' | 'b' | 'r' | 'q';
  /** The chained squares, e.g. ['f3','d2','c4']. */
  route: string[];
  /** Grounded narration naming the whole route. */
  text: string;
}

interface ActiveRoute {
  pieceType: string;
  color: 'w' | 'b';
  squares: string[];
}

/** Is the square advanced enough that reaching it was worth a maneuver? Ranks
 *  4-6 for White / 3-5 for Black (out of your own half, toward the enemy). */
function isAdvanced(square: string, color: 'w' | 'b'): boolean {
  const r = Number(square[1]);
  return color === 'w' ? r >= 4 && r <= 6 : r >= 3 && r <= 5;
}

/**
 * Detect the student's real piece reroutes and return an itinerary beat for
 * each, keyed by the ply it completes. `budget` caps how many surface (a game
 * with many shuffles shouldn't narrate them all). Minor pieces only by default
 * — a knight/bishop journey is the classic teaching maneuver.
 */
export function detectPieceItineraries(
  sans: string[],
  playerColor: 'white' | 'black',
  opts?: { budget?: number },
): Map<number, PieceItinerary> {
  const budget = opts?.budget ?? 2;
  const studentWB: 'w' | 'b' = playerColor === 'white' ? 'w' : 'b';
  const chess = new Chess();
  // Active routes keyed by the square the piece currently sits on.
  const bySquare = new Map<string, ActiveRoute>();
  const found: PieceItinerary[] = [];
  const emittedRoutes = new Set<string>(); // dedup by piece+first-square

  for (let i = 0; i < sans.length; i++) {
    let mv;
    try {
      mv = chess.move(sans[i]);
    } catch {
      break; // an unparseable SAN — stop, keep what we have
    }
    if (!mv) break;
    const ply = i + 1;
    // A capture removes any route the captured piece owned on `to`.
    if (mv.captured) bySquare.delete(mv.to);

    if (mv.color !== studentWB) {
      // Opponent move: it may vacate/occupy squares, but we only chart the
      // student's own pieces. Still, if the student's route piece was captured
      // above we've handled it; move on.
      continue;
    }

    // Continue an existing route if this piece stepped off its last square.
    const prior = bySquare.get(mv.from);
    if (prior && prior.pieceType === mv.piece && prior.color === mv.color) {
      bySquare.delete(mv.from);
      prior.squares.push(mv.to);
      bySquare.set(mv.to, prior);
    } else {
      bySquare.set(mv.to, { pieceType: mv.piece, color: mv.color, squares: [mv.from, mv.to] });
    }

    // A real reroute = a minor piece, ≥3 squares (2+ hops), landing advanced.
    const route = bySquare.get(mv.to)!;
    const key = `${route.pieceType}:${route.squares[0]}`;
    if (
      (route.pieceType === 'n' || route.pieceType === 'b')
      && route.squares.length >= 3
      && isAdvanced(mv.to, studentWB)
      && !emittedRoutes.has(key)
    ) {
      emittedRoutes.add(key);
      // Narrate the meaningful tail (last 3 squares) so a long journey reads tight.
      const shown = route.squares.slice(-3);
      const label = PIECE_LABEL[route.pieceType];
      found.push({
        ply,
        pieceType: route.pieceType as 'n' | 'b',
        route: route.squares.slice(),
        text: `Follow the ${label}'s journey — ${shown.join('–')}. It reroutes to ${mv.to} instead of settling for its first square, and that patience is the whole idea.`,
      });
    }
  }

  // Keep the earliest `budget` maneuvers (chronological — you learn as you go).
  found.sort((a, b) => a.ply - b.ply);
  return new Map(found.slice(0, budget).map((it) => [it.ply, it]));
}
