import { useEffect, useState } from 'react';
import { PlayableLinePlayer } from './PlayableLinePlayer';
import { generatedLessonFor, lessonBeatsOnLine, overlayBeats } from '../../services/generatedLesson';
import type { MiddlegamePlan, OpeningRecord, PlayableMiddlegameLine } from '../../types';

interface GeneratedPlanPlayerProps {
  opening: OpeningRecord;
  /** A plan computed from the masters' games: it carries the moves that reach
   *  its tabia (`lineMoves`) and the masters' line from there. */
  plan: MiddlegamePlan & { lineMoves: string[]; playableLines: PlayableMiddlegameLine[] };
  /** The name the line is taught under (the tab's, else the opening's). */
  name: string;
  mode: 'watch' | 'learn' | 'practice';
  onComplete: () => void;
  onExit: () => void;
}

/** THE COMPUTED PLAN, TAUGHT ON THE FLY (WO-ALL-OPENINGS-01 O5). The plan line
 *  picks up at the tabia (G9.3 Gate C); its words are the lesson the coach's
 *  pipeline generates along the whole line — opening moves and the masters'
 *  continuation — laid on the continuation's moves, so the plan speaks in the
 *  voice the opening's Watch did. Plays silent with its arrows when nothing
 *  could be built. */
export function GeneratedPlanPlayer({ opening, plan, name, mode, onComplete, onExit }: GeneratedPlanPlayerProps): JSX.Element {
  const base = plan.playableLines[0];
  const key = `${plan.lineMoves.join(' ')}|${base.moves.join(' ')}`;
  const [built, setBuilt] = useState<{ key: string; line: PlayableMiddlegameLine } | null>(null);

  useEffect(() => {
    let live = true;
    const moves = [...plan.lineMoves, ...base.moves];
    void generatedLessonFor({ name, eco: opening.eco, moves, openingId: opening.id, color: opening.color })
      .then((script) => {
        const line = script ? overlayBeats(base, lessonBeatsOnLine(script, moves), plan.lineMoves.length) : base;
        if (live) setBuilt({ key, line });
      });
    return () => { live = false; };
  }, [key, name, plan.lineMoves, base, opening.eco, opening.id, opening.color]);

  if (!built || built.key !== key) {
    return (
      <div className="flex flex-1 items-center justify-center p-6" data-testid="generated-plan-loading">
        <p className="text-sm text-theme-text-muted">Building the plan from the games…</p>
      </div>
    );
  }
  return (
    <PlayableLinePlayer
      line={built.line}
      boardOrientation={opening.color}
      mode={mode}
      onComplete={onComplete}
      onExit={onExit}
    />
  );
}
