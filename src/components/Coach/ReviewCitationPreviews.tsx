// ReviewCitationPreviews — inline board previews for the game-review recap
// (David 2026-06-27, IMG_4298: "I don't have any visual reference for these
// words. Could we include a preview that shows the board in the positions it's
// talking about?"). Every preview is GROUNDED: the position, the played move
// (red arrow) and the engine's better move (green arrow) all come from
// `buildReviewCitations` — computed from the engine annotations + chess.js,
// never the LLM (G0/G3). Tapping a preview jumps the main review board to that
// ply, so there's no duplicate runtime.

import { ConsistentChessboard, type BoardArrow } from '../Chessboard/ConsistentChessboard';
import type { ReviewMoveCitation } from '../../services/coachFeatureService';

const PLAYED_ARROW = '#ef4444'; // red — the move you played
const SUGGESTED_ARROW = '#22c55e'; // green — the engine's better move

const CLASSIFICATION_LABEL: Record<ReviewMoveCitation['classification'], string> = {
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
};

const CLASSIFICATION_COLOR: Record<ReviewMoveCitation['classification'], string> = {
  inaccuracy: '#eab308', // amber
  mistake: '#f97316', // orange
  blunder: '#ef4444', // red
};

export interface ReviewCitationPreviewsProps {
  citations: ReviewMoveCitation[];
  /** Jump the main review board to a ply (1-based). */
  onJumpToPly: (ply: number) => void;
  /** Optional cap — show the N most costly first. Default: all. */
  limit?: number;
}

function buildArrows(c: ReviewMoveCitation): BoardArrow[] {
  const arrows: BoardArrow[] = [];
  if (c.playedSquares) {
    arrows.push({ startSquare: c.playedSquares[0], endSquare: c.playedSquares[1], color: PLAYED_ARROW });
  }
  if (c.suggestedSquares) {
    arrows.push({ startSquare: c.suggestedSquares[0], endSquare: c.suggestedSquares[1], color: SUGGESTED_ARROW });
  }
  return arrows;
}

export function ReviewCitationPreviews({ citations, onJumpToPly, limit }: ReviewCitationPreviewsProps): JSX.Element | null {
  if (citations.length === 0) return null;

  // Most costly first (by eval swing), then chronological for ties / null swings.
  const ordered = [...citations].sort((a, b) => {
    const sa = a.evalSwingCp ?? -1;
    const sb = b.evalSwingCp ?? -1;
    if (sb !== sa) return sb - sa;
    return a.ply - b.ply;
  });
  const shown = typeof limit === 'number' ? ordered.slice(0, limit) : ordered;

  return (
    <div className="border-t border-theme-border px-3 py-2" data-testid="review-citation-previews">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          Key moments ({shown.length})
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 shrink-0">
        {shown.map((c) => (
          <button
            key={c.ply}
            type="button"
            onClick={() => onJumpToPly(c.ply)}
            className="shrink-0 w-[136px] rounded-xl border border-theme-border bg-theme-surface/40 p-1.5 text-left hover:border-theme-border/80 transition-colors active:scale-[0.98]"
            data-testid={`review-citation-${c.ply}`}
          >
            <div className="w-full aspect-square rounded-lg overflow-hidden pointer-events-none">
              <ConsistentChessboard
                fen={c.fenBefore}
                boardOrientation={c.moverColor}
                arrows={buildArrows(c)}
                interactive={false}
                enableMoveSound={false}
                showCheckHighlight={false}
              />
            </div>
            <div className="mt-1.5 flex items-center gap-1">
              <span
                className="text-[9px] font-bold uppercase tracking-wide px-1 py-0.5 rounded"
                style={{ color: CLASSIFICATION_COLOR[c.classification], background: `${CLASSIFICATION_COLOR[c.classification]}1a` }}
              >
                {CLASSIFICATION_LABEL[c.classification]}
              </span>
              <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text)' }}>
                Move {c.moveNumber}
              </span>
            </div>
            <div className="mt-0.5 text-[10px] leading-snug" style={{ color: 'var(--color-text-muted)' }}>
              You played <span style={{ color: PLAYED_ARROW }}>{c.playedSan}</span>
              {c.suggestedSan ? (
                <>
                  ; better was <span style={{ color: SUGGESTED_ARROW }}>{c.suggestedSan}</span>
                </>
              ) : null}
            </div>
            {c.whyBetter ? (
              <div className="mt-1 text-[10px] leading-snug" style={{ color: 'var(--color-text)' }} data-testid={`review-citation-why-${c.ply}`}>
                {c.whyBetter}
              </div>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
