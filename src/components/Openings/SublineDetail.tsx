import { useMemo } from 'react';
import { Chess } from 'chess.js';
import { ArrowLeft, Brain, Check, PlayCircle, Swords, BookOpen as LearnIcon, Repeat } from 'lucide-react';
import { ConsistentChessboard } from '../Chessboard/ConsistentChessboard';
import { TagChip, distinctiveName, replyIdea } from './ReplyTree';
import type { ChapterSubline } from '../../services/openingCourse';
import { gemForReply, replyTag } from '../../services/replyTags';
import { sublineLineKey } from '../../services/srsOpeningService';
import { gemWinLabel } from '../../data/lessons/punishGems';
import { numberedMove } from '../../utils/numberedMove';
import { RUNGS, isSublineRungComplete, type Rung } from '../../utils/wlppLadder';
import type { OpeningRecord } from '../../types';

/**
 * One opponent reply, opened like a variation (WO-COURSE-01 A, David
 * 2026-10-27: "tapping a subline opens it like a variation tab"). The board
 * shows the position the reply leaves, with the same four steps a variation
 * has. Finishing Learn puts the line into spaced review
 * (`markSublineRungComplete`).
 */
export function SublineDetail({ opening, subline, tabLabel, isTopOfGroup, onBack, onRung }: {
  opening: OpeningRecord;
  subline: ChapterSubline;
  /** The chapter the reply was opened from (Back returns there). */
  tabLabel: string;
  /** The reply is the most played at its move (drives the Main tag). */
  isTopOfGroup: boolean;
  onBack: () => void;
  onRung: (rung: Rung) => void;
}): JSX.Element {
  const key = sublineLineKey(subline);
  const replyMoves = useMemo(() => subline.moves.slice(0, subline.atPly + 1), [subline]);
  const fen = useMemo(() => {
    const c = new Chess();
    for (const san of replyMoves) c.move(san);
    return c.fen();
  }, [replyMoves]);
  const tag = replyTag(opening.id, replyMoves, subline.pct, isTopOfGroup);
  const gem = gemForReply(opening.id, replyMoves);
  const next = RUNGS.find((r) => !isSublineRungComplete(opening, key, r)) ?? null;
  const learned = isSublineRungComplete(opening, key, 'learn');

  const rungs: Array<{ rung: Rung; label: string; icon: JSX.Element }> = [
    { rung: 'watch', label: 'Watch', icon: <PlayCircle size={18} /> },
    { rung: 'learn', label: 'Learn', icon: <LearnIcon size={18} /> },
    { rung: 'practice', label: 'Practice', icon: <Brain size={18} /> },
    { rung: 'play', label: 'Play', icon: <Swords size={18} /> },
  ];

  return (
    <div className="flex flex-col flex-1 p-4 md:p-6 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-6 overflow-y-auto max-w-lg mx-auto w-full" data-testid="subline-detail">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-theme-text-muted hover:text-theme-text self-start mb-3"
        data-testid="subline-back"
      >
        <ArrowLeft size={16} /> {tabLabel}
      </button>
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-xl font-bold text-theme-text font-mono">{numberedMove(subline.atPly, subline.triggerMove)}</h2>
        <TagChip tag={tag} />
      </div>
      <p className="text-sm text-theme-text-muted mb-1">{distinctiveName(subline.name)} · {subline.pct}% of games here</p>
      <p className="text-sm text-theme-text mb-3" data-testid="subline-idea">{replyIdea(opening.id, subline)}</p>
      {gem && (tag === 'trap' || tag === 'mistake') && (
        <p className="text-xs mb-3 px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-200" data-testid="subline-known-mistake">
          {tag === 'trap' ? 'A trap for them' : 'A known mistake'} — {gem.punish} punishes it ({gemWinLabel(gem)}).
        </p>
      )}
      <div className="w-full max-w-[360px] self-center mb-4">
        <ConsistentChessboard fen={fen} boardOrientation={opening.color} />
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {rungs.map((r) => {
          const done = isSublineRungComplete(opening, key, r.rung);
          const primary = r.rung === next;
          return (
            <button
              key={r.rung}
              type="button"
              onClick={() => onRung(r.rung)}
              className={`relative flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-xs font-semibold transition-all opening-action-glow opening-action-glow-${r.rung} ${
                primary
                  ? 'bg-gradient-to-r from-theme-accent to-theme-accent/80 text-white ring-2 ring-theme-accent/60'
                  : 'bg-theme-surface border border-theme-border text-theme-text hover:bg-theme-border'
              }`}
              data-testid={`subline-${r.rung}-btn`}
              data-primary={primary || undefined}
            >
              {r.icon}
              {r.label}
              {done && (
                <span className="absolute top-1 right-1 text-emerald-400" data-testid={`subline-done-${r.rung}`}>
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-theme-text-muted mt-3" data-testid="subline-review-note">
        <Repeat size={13} className={learned ? 'text-emerald-400' : ''} />
        {learned ? 'In your spaced review.' : 'Finish Learn and this line joins your spaced review.'}
      </p>
    </div>
  );
}
