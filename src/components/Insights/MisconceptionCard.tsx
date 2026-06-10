/**
 * MisconceptionCard — one captured mistake, correctable (Step 5).
 *
 * The silent-classify pivot auto-buckets every slip with no mid-game question,
 * so a wrong tag must be fixable later. This card is that correction surface:
 * it reconstructs the decision moment (board at the position BEFORE the move,
 * a RED arrow on what you played + a GREEN arrow on the engine's best), and
 * offers two paths — re-tag in place (tap the pill → pick a bucket), or open
 * the game in Review at that exact move (tap "Review", deep-links via ?move).
 *
 * 100% code: arrows are resolved by chess.js (arrowEngine.resolveSanToArrow),
 * the re-tag writes through reassignMisconception. No LLM anywhere.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Eye } from 'lucide-react';
import { ConsistentChessboard } from '../Chessboard/ConsistentChessboard';
import { resolveSanToArrow } from '../../services/arrowEngine';
import { reassignMisconception, listMisconceptionTags } from '../../services/misconceptionService';
import type { BoardArrow, MisconceptionTagRecord } from '../../types';

interface MisconceptionCardProps {
  record: MisconceptionTagRecord;
  /** Called after a successful re-tag so the parent can refresh its list. */
  onRetagged: () => void;
}

/** The ply index for the review deep-link (?move=N is 1-indexed). The record's
 *  moveNumber is the full move number; the student moved on the side whose turn
 *  it is in `fen` (the position before the move). */
function reviewMoveParam(rec: MisconceptionTagRecord): number | null {
  if (!rec.sourceGameId || rec.moveNumber == null) return null;
  const blackToMove = rec.fen.split(' ')[1] === 'b';
  const ply = (rec.moveNumber - 1) * 2 + (blackToMove ? 1 : 0); // 0-indexed ply
  return ply + 1; // CoachReviewSessionPage wants 1-indexed `move`
}

export function MisconceptionCard({ record, onRetagged }: MisconceptionCardProps): JSX.Element {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const orientation: 'white' | 'black' = record.fen.split(' ')[1] === 'b' ? 'black' : 'white';

  const arrows = useMemo<BoardArrow[]>(() => {
    const out: BoardArrow[] = [];
    if (record.playedSan) {
      const a = resolveSanToArrow(record.playedSan, [record.fen]);
      if (a) out.push({ startSquare: a.from, endSquare: a.to, color: '#ef4444' }); // red = what you played
    }
    if (record.bestSan) {
      const b = resolveSanToArrow(record.bestSan, [record.fen]);
      if (b) out.push({ startSquare: b.from, endSquare: b.to, color: '#22c55e' }); // green = engine best
    }
    return out;
  }, [record.fen, record.playedSan, record.bestSan]);

  const reviewMove = reviewMoveParam(record);

  const handleRetag = async (tag: string): Promise<void> => {
    setSaving(true);
    try {
      await reassignMisconception(record.id, tag);
      setMenuOpen(false);
      onRetagged();
    } finally {
      setSaving(false);
    }
  };

  const tagOptions = listMisconceptionTags().filter((t) => t.id !== record.tag && t.id !== 'other');

  return (
    <div className="rounded-lg border border-theme-border bg-theme-surface/60 p-2.5 flex gap-3" data-testid={`misconception-card-${record.id}`}>
      <div className="shrink-0 w-24 h-24">
        <ConsistentChessboard fen={record.fen} boardOrientation={orientation} arrows={arrows} />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="text-xs text-theme-text-muted">
          {record.openingName ? <span className="text-theme-text">{record.openingName}</span> : 'Your game'}
          {record.cpLoss ? <span className="text-rose-400"> · −{(record.cpLoss / 100).toFixed(1)}</span> : null}
        </div>
        <div className="text-xs text-theme-text">
          {record.playedSan && <span><span className="text-rose-400">{record.playedSan}</span> played</span>}
          {record.bestSan && <span className="text-theme-text-muted">, best <span className="text-emerald-400">{record.bestSan}</span></span>}
        </div>

        <div className="mt-auto flex items-center gap-2 pt-1">
          {reviewMove != null && (
            <button
              onClick={() => void navigate(`/coach/review/${record.sourceGameId}?move=${reviewMove}`)}
              className="flex items-center gap-1 text-[11px] font-medium text-theme-accent hover:opacity-80"
              data-testid={`misconception-card-review-${record.id}`}
            >
              <Eye size={12} /> Review
            </button>
          )}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            disabled={saving}
            className="flex items-center gap-1 text-[11px] font-medium text-theme-text-muted hover:text-theme-text disabled:opacity-50"
            data-testid={`misconception-card-retag-${record.id}`}
          >
            Not this? <ChevronDown size={12} />
          </button>
        </div>

        {menuOpen && (
          <div className="flex flex-wrap gap-1 pt-1" data-testid={`misconception-card-menu-${record.id}`}>
            {tagOptions.map((t) => (
              <button
                key={t.id}
                onClick={() => void handleRetag(t.id)}
                disabled={saving}
                className="text-[10px] px-1.5 py-0.5 rounded bg-theme-surface border border-theme-border text-theme-text-muted hover:text-theme-text disabled:opacity-50"
              >
                {t.label}
              </button>
            ))}
            <button
              onClick={() => void handleRetag('random')}
              disabled={saving}
              className="text-[10px] px-1.5 py-0.5 rounded bg-theme-surface border border-theme-border text-theme-text-muted/70 hover:text-theme-text disabled:opacity-50"
            >
              Random / not sure
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
