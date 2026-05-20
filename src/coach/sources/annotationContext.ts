/**
 * Annotation grounding source — pulls per-move text from the 1893
 * curated annotation files in `src/data/annotations/` and shapes it
 * into a compact context block the envelope can drop into the
 * `[Live state]` sub-tree.
 *
 * Why this exists: the coach LLM brain previously had no access to the
 * authored opening-book text. It would riff generic "this opening
 * controls the center" prose with no grounding in the curated
 * annotations we ship. The walkthrough pipeline already uses these
 * files for spoken narration; this loader brings the same content
 * into chat / Q&A / move narration via the envelope.
 *
 * Contract (G3-aligned): the LLM must treat annotation text as
 * authoritative book context — riff on it, not against it. Don't
 * invent alternative lines the book doesn't list. When no annotation
 * exists for the current opening, the brain falls back to its prior
 * (ungrounded) behavior — the loader returns `null` and the envelope
 * formatter omits the block entirely.
 */
import type { LiveAnnotationContext } from '../types';
import { loadAnnotations } from '../../services/annotationService';
import { detectOpening } from '../../services/openingDetectionService';

/** Slugify a Lichess-style opening name into the annotation file
 *  filename stem. Handles colons (drop subline suffix), apostrophes
 *  (→ `-s-`), spaces/hyphens (→ single dash). The annotation
 *  service's `resolveAnnotationId` has its own ECO-strip + legacy
 *  alias fallback, so this only needs to produce the canonical base
 *  slug — fuzziness downstream.
 *
 *  Examples:
 *    "Italian Game"                           → "italian-game"
 *    "King's Indian Defense"                  → "king-s-indian-defense"
 *    "Sicilian Defense: Najdorf Variation"    → "sicilian-defense"
 *    "Caro-Kann Defense"                      → "caro-kann-defense"
 */
function openingNameToAnnotationId(name: string): string {
  const base = name.split(':')[0].trim();
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Maximum annotations to include in the envelope. Each entry is
 *  ~200-400 tokens; ceiling keeps the [Live state] block lean for
 *  positions deep into the opening tree. */
const MAX_WINDOW = 6;

/** Build the annotation context block from an opening name + move
 *  history. Returns `null` when no annotation file matches the
 *  opening — caller (envelope) skips the block entirely.
 *
 *  The window centers on the current ply: includes annotation for
 *  the move just played + the next few candidate plies, so the
 *  brain can both *describe* what happened AND *anticipate* the
 *  near continuation when answering "what now?" questions. */
export async function loadAnnotationContextForLive(args: {
  openingName?: string | null;
  moveHistory: string[];
}): Promise<LiveAnnotationContext | null> {
  const { moveHistory } = args;
  let openingName = args.openingName ?? null;

  // Sometimes surfaces ship the ECO code ("B01", "C50") as
  // openingName when the real classified name isn't available
  // (e.g. review path falling back to game.eco). Treat ECO-shape
  // strings as null so detection can take over from moveHistory.
  if (openingName && /^[A-E]\d{2}$/.test(openingName.trim())) {
    openingName = null;
  }

  // When no usable name from the surface, derive from moveHistory.
  // Use detectOpening (matches the longest known prefix in the
  // Lichess opening trie) — this returns "Italian Game" / "Caro-Kann
  // Defense" / etc, which slugifies to existing annotation files.
  if (!openingName && moveHistory.length > 0) {
    const detected = detectOpening(moveHistory);
    if (detected?.name) openingName = detected.name;
  }
  if (!openingName) return null;

  const openingId = openingNameToAnnotationId(openingName);
  if (!openingId) return null;

  // Call `loadAnnotations` (not `loadAnnotationsForPgn`) — the
  // latter has a 50% prefix-match gate designed for walkthroughs
  // that walk the annotation line. For coach grounding on a 50-ply
  // game where the annotation only covers the first 8 plies, the
  // prefix gate returns null. We just want the opening's main-line
  // annotations regardless of how far past book the game has gone.
  const annotations = await loadAnnotations(openingId);
  if (!annotations || annotations.length === 0) return null;
  const pgn = moveHistory.join(' ');

  // Window strategy: when the game is still inside the annotated
  // plies, center on the current ply (one prior for context +
  // lookahead). When the game has gone past the book (common for
  // played-out games), give the brain the END of the annotation so
  // it sees how book theory wrapped up before the moves diverged.
  // This makes review-time grounding work for 54-ply games against
  // 8-ply opening annotations — the brain knows the line's last
  // book-theory moves and can riff from there.
  const currentPly = moveHistory.length;
  const annLen = annotations.length;
  let start: number;
  let end: number;
  if (currentPly < annLen) {
    start = Math.max(0, currentPly - 1);
    end = Math.min(annLen, start + MAX_WINDOW);
  } else {
    // Past the book — show the final MAX_WINDOW plies of theory.
    start = Math.max(0, annLen - MAX_WINDOW);
    end = annLen;
  }
  const window = annotations.slice(start, end);
  if (window.length === 0) return null;

  return {
    openingName,
    openingId,
    pgnSoFar: pgn,
    currentPly,
    totalAnnotated: annotations.length,
    moves: window.map((a, i) => ({
      ply: start + i,
      san: a.san,
      annotation: a.annotation ?? '',
      shortNarration: a.shortNarration,
      plans: a.plans,
      alternatives: a.alternatives,
      pawnStructure: a.pawnStructure,
    })),
  };
}
