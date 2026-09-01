/**
 * EndgameTrainerPage — hosts the interactive tablebase endgame trainer for a
 * lesson launched from the coach ("play the Lucena with me" → the coach offers a
 * chip → this page). Loads the lesson by id, derives the start position + the
 * student's side (the side to move at the start = whose technique it is), and
 * mounts EndgameTablebaseTrainer. Loading / not-found / no-playable-position all
 * handled explicitly (standing order: every new surface has loading + empty +
 * error states).
 */
import { useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import { getEndgameLessonById } from '../../services/endgameLessonsService';
import { EndgameTablebaseTrainer } from './EndgameTablebaseTrainer';

export function EndgameTrainerPage(): JSX.Element {
  const { lessonId } = useParams<{ lessonId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  // CUSTOM position (David 2026-09-01: "make custom endgame training for the
  // user") — the coach launches the trainer on the student's OWN flubbed endgame
  // via `?fen=`. Validated with chess.js; an illegal FEN falls back to the lesson.
  const customFen = useMemo(() => {
    const f = params.get('fen');
    if (!f) return null;
    try { new Chess(f); return f; } catch { return null; }
  }, [params]);
  const customTitle = params.get('title') || 'Endgame Training';

  const lesson = useMemo(() => (lessonId && lessonId !== 'custom' ? getEndgameLessonById(lessonId) : null), [lessonId]);
  const playable = useMemo(() => lesson?.positions.find((p) => p.fen) ?? null, [lesson]);

  const exit = (): void => { void navigate('/coach/teach'); };

  if (customFen) {
    return (
      <div className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6 max-w-lg mx-auto w-full">
        <EndgameTablebaseTrainer
          fen={customFen}
          studentColor={customFen.split(' ')[1] === 'b' ? 'black' : 'white'}
          title={customTitle}
          onExit={exit}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6 max-w-lg mx-auto w-full">
      {!lesson ? (
        <div className="text-center text-theme-text-muted py-12" data-testid="endgame-trainer-notfound">
          <p className="font-bold text-theme-text mb-1">That ending isn't in the catalog.</p>
          <p className="text-sm">Ask the coach for a specific technique — the Lucena, the opposition, a rook ending.</p>
          <button type="button" onClick={exit} className="mt-4 text-sm underline">Back to the coach</button>
        </div>
      ) : !playable ? (
        <div className="text-center text-theme-text-muted py-12" data-testid="endgame-trainer-noposition">
          <p className="font-bold text-theme-text mb-1">{lesson.name}</p>
          <p className="text-sm">This lesson has no playable position to drill yet.</p>
          <button type="button" onClick={exit} className="mt-4 text-sm underline">Back to the coach</button>
        </div>
      ) : (
        <EndgameTablebaseTrainer
          fen={playable.fen}
          studentColor={playable.fen.split(' ')[1] === 'b' ? 'black' : 'white'}
          title={lesson.name}
          intro={lesson.narration.rule}
          onExit={exit}
        />
      )}
    </div>
  );
}
