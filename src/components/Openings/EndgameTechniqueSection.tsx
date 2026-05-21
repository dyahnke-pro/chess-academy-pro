import { useMemo } from 'react';
import { Crown, BookOpen as LearnIcon, Swords } from 'lucide-react';
import { MiniBoard } from '../Board/MiniBoard';
import { getEndgameLessonsForOpening } from '../../services/openingEndgameMap';
import type { EndgameLesson } from '../../types/endgameLesson';

export type EndgameAction = 'study' | 'play';

interface EndgameTechniqueSectionProps {
  openingId: string;
  boardOrientation: 'white' | 'black';
  onAction: (lesson: EndgameLesson, action: EndgameAction) => void;
}

const ACTION_BTN =
  'p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-theme-accent/20 bg-theme-surface border border-theme-border hover:border-theme-accent/40 text-theme-text-muted hover:text-theme-accent transition-colors opening-action-glow';

/**
 * "Endgame Technique" masterclass section for the opening detail page.
 * Surfaces the curated endgame lessons this opening steers toward
 * (king-and-pawn, rook endings, …) as playable lines: Study opens the
 * full interactive lesson (watch + practice), Play runs the position
 * against the coach. Renders nothing when no lesson maps.
 */
export function EndgameTechniqueSection({
  openingId,
  boardOrientation,
  onAction,
}: EndgameTechniqueSectionProps): React.ReactNode {
  const lessons = useMemo(() => getEndgameLessonsForOpening(openingId), [openingId]);

  if (lessons.length === 0) return null;

  return (
    <div className="bg-theme-surface rounded-xl p-4 mb-4" data-testid="endgame-technique-section">
      <div className="flex items-center gap-2 mb-3">
        <Crown size={14} className="text-blue-400" />
        <h3 className="text-sm font-semibold text-theme-text">Endgame Technique ({lessons.length})</h3>
      </div>
      <p className="text-xs text-theme-text-muted mb-3">
        The endgames this opening steers toward — study each one, then play it out against the coach.
      </p>
      <div className="space-y-1">
        {lessons.map((lesson) => (
          <div
            key={lesson.id}
            className="w-full p-3 rounded-lg hover:bg-theme-border/50 transition-colors"
            data-testid={`endgame-line-${lesson.id}`}
          >
            <button
              onClick={() => onAction(lesson, 'study')}
              className="flex items-center gap-3 w-full text-left"
              aria-label={`Study ${lesson.name}`}
            >
              <MiniBoard fen={lesson.positions[0]?.fen ?? ''} size={48} orientation={boardOrientation} />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-theme-text">{lesson.name}</span>
                <p className="text-xs text-theme-text-muted line-clamp-2 mt-0.5">{lesson.narration.rule}</p>
              </div>
            </button>
            <div className="flex items-center gap-1.5 mt-2 ml-[60px]">
              <button
                onClick={() => onAction(lesson, 'study')}
                className={`${ACTION_BTN} opening-action-glow-learn`}
                aria-label={`Study ${lesson.name}`}
                title="Study"
                data-testid={`endgame-study-${lesson.id}`}
              >
                <LearnIcon size={16} />
              </button>
              <button
                onClick={() => onAction(lesson, 'play')}
                className={`${ACTION_BTN} opening-action-glow-play`}
                aria-label={`Play ${lesson.name}`}
                title="Play"
                data-testid={`endgame-play-${lesson.id}`}
              >
                <Swords size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
