/**
 * walkthroughAdapter
 * ------------------
 * Converts legacy "moves + parallel annotation array" data (from
 * gambits.json / openings-lichess.json / the annotationService) into
 * canonical WalkthroughStep[] objects where narration is embedded on
 * each step.
 *
 * Keeping the adapter here lets us ship the WalkthroughStep type
 * without rewriting the large JSON data files. The adapter is the
 * single source of truth for mapping old → new.
 *
 * TODO(migration): once all consumers read WalkthroughStep directly,
 * we can rewrite gambits.json in the new shape and delete this
 * adapter's legacy path. Tracked in MANIFEST.md.
 */
import { Chess } from 'chess.js';
import type { OpeningMoveAnnotation } from '../types';
import type { WalkthroughStep, WalkthroughSession } from '../types/walkthrough';

export interface BuildStepsInput {
  /** Space-delimited SAN moves, e.g. "e4 e5 Nf3 Nc6". */
  pgn: string;
  /** Annotations indexed in move order (same length as moves array). */
  annotations?: OpeningMoveAnnotation[];
  /** Starting FEN — defaults to the standard position. */
  startFen?: string;
  /** Optional source tag for debugging. */
  source?: string;
}

/**
 * Build a WalkthroughStep[] from a PGN + parallel annotation array.
 *
 * The canonical guarantee: each step's san is the actual SAN chess.js
 * produces when it plays that move. If a legacy annotation's san
 * disagrees with the computed one we log a warning (in dev) and keep
 * the computed san — the board is the truth.
 */
export function buildStepsFromPgn(input: BuildStepsInput): WalkthroughStep[] {
  const { pgn, annotations, startFen, source } = input;
  const chess = startFen ? new Chess(startFen) : new Chess();

  const sanList = pgn.trim().split(/\s+/).filter(Boolean);
  const steps: WalkthroughStep[] = [];

  for (let i = 0; i < sanList.length; i++) {
    const rawSan = sanList[i];
    let move: ReturnType<Chess['move']> | null = null;
    try {
      move = chess.move(rawSan);
    } catch {
      move = null;
    }
    if (!move) {
      // Invalid move — abort cleanly. Dev-time errors are preferable to
      // silent desync.
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn(`[walkthroughAdapter] illegal SAN "${rawSan}" at index ${i}`, { source });
      }
      break;
    }
    const annotation = annotations?.[i];
    const narration = deriveNarration(annotation, move.san);

    if (annotation && annotation.san && annotation.san !== move.san) {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn(
          `[walkthroughAdapter] annotation san mismatch at index ${i}: ` +
            `expected "${move.san}", annotation said "${annotation.san}"`,
          { source },
        );
      }
    }

    steps.push({
      moveNumber: Math.floor(i / 2) + 1,
      san: move.san,
      fenAfter: chess.fen(),
      narration,
      pawnStructure: annotation?.pawnStructure,
      coachHint: annotation?.plans?.[0],
      arrows: annotation?.arrows,
      highlights: annotation?.highlights,
      source,
    });
  }

  return steps;
}

/**
 * Pick the best narration text from a legacy annotation. Prefers
 * `annotation` text, falls back to a terse system-generated one so
 * there's always SOMETHING to speak.
 */
function deriveNarration(
  annotation: OpeningMoveAnnotation | undefined,
  san: string,
): string {
  if (annotation?.annotation && annotation.annotation.trim().length > 0) {
    return annotation.annotation.trim();
  }
  return `${san}.`;
}

/**
 * Build a full WalkthroughSession from a PGN + parallel annotations.
 * Convenience over buildStepsFromPgn for callers that want a ready-
 * to-run session object.
 */
export function buildSession(
  input: BuildStepsInput & {
    title: string;
    subtitle?: string;
    orientation?: 'white' | 'black';
    kind?: WalkthroughSession['kind'];
  },
): WalkthroughSession {
  return {
    title: input.title,
    subtitle: input.subtitle,
    startFen: input.startFen,
    orientation: input.orientation ?? 'white',
    kind: input.kind ?? 'opening',
    steps: buildStepsFromPgn(input),
  };
}
