import { useEffect, useRef, useState } from 'react';
import { PlayableLinePlayer } from './PlayableLinePlayer';
import { generatedLessonFor, lessonBeatsOnLine, overlayBeats } from '../../services/generatedLesson';
import type { OpeningRecord, PlayableMiddlegameLine } from '../../types';

interface GeneratedLinePlayerProps {
  opening: OpeningRecord;
  /** The moves from the start that reach `line.fen` ([] for a line from move
   *  one, a plan's `lineMoves` for a plan from its tabia). */
  prefix: readonly string[];
  line: PlayableMiddlegameLine;
  /** The name the line is taught under (the tab's, else the opening's). */
  name: string;
  /** Whether corpus notes lead the beats — no for a trap played out, whose
   *  boards carry notes about the sound alternatives, not the slip. */
  corpusNotes: boolean;
  mode: 'watch' | 'learn' | 'practice';
  onComplete: () => void;
  onExit: () => void;
  onAdvanceToLearn?: () => void;
  onContinuePlaying?: () => void;
}

/** A LINE BUILT FROM THE GAMES, TAUGHT ON THE FLY (WO-ALL-OPENINGS-01 O2/O5):
 *  a plan computed from the masters' games, a trap the gem calculator found.
 *  Its words are the lesson the coach's pipeline generates along the whole
 *  line, laid on the moves the line leaves silent — so a plan or a trap
 *  speaks in the voice the opening's Watch did. Plays with its arrows and its
 *  own computed words when nothing could be built. */
export function GeneratedLinePlayer({ opening, prefix, line, name, corpusNotes, mode, onComplete, onExit, onAdvanceToLearn, onContinuePlaying }: GeneratedLinePlayerProps): JSX.Element {
  // Keyed by the moves, never by the arrays' identity: a caller that builds
  // the line in render must not restart the build on every render.
  const key = `${prefix.join(' ')}|${line.moves.join(' ')}`;
  const latest = useRef({ prefix, line });
  latest.current = { prefix, line };
  const [built, setBuilt] = useState<{ key: string; line: PlayableMiddlegameLine } | null>(null);

  useEffect(() => {
    let live = true;
    const { prefix: pre, line: base } = latest.current;
    const moves = [...pre, ...base.moves];
    void generatedLessonFor({ name, eco: opening.eco, moves, openingId: opening.id, color: opening.color, corpusNotes })
      .then((script) => {
        const taught = script ? overlayBeats(base, lessonBeatsOnLine(script, moves), pre.length) : base;
        if (live) setBuilt({ key, line: taught });
      });
    return () => { live = false; };
  }, [key, name, corpusNotes, opening.eco, opening.id, opening.color]);

  if (!built || built.key !== key) {
    return (
      <div className="flex flex-1 items-center justify-center p-6" data-testid="generated-line-loading">
        <p className="text-sm text-theme-text-muted">Building the lesson from the games…</p>
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
      onAdvanceToLearn={onAdvanceToLearn}
      onContinuePlaying={onContinuePlaying}
    />
  );
}
