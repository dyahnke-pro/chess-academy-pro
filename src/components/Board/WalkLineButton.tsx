import { Play } from 'lucide-react';
import type { WalkableLine } from '../../types';

interface WalkLineButtonProps {
  line: WalkableLine;
  onWalk: (line: WalkableLine) => void;
  testId?: string;
}

/** "Play it out" for a line the coach spoke — the same Walk control the Learn
 *  chat shows under a message, for boards that have no chat. */
export function WalkLineButton({ line, onWalk, testId = 'walk-line-btn' }: WalkLineButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onWalk(line)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 text-xs font-medium text-sky-300 hover:bg-sky-500/20 transition-colors"
      data-testid={testId}
      aria-label={`Play out the line starting ${line.label}`}
    >
      <Play size={12} />
      <span>Play out {line.label}</span>
    </button>
  );
}
