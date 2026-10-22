import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Check, ChevronRight, X } from 'lucide-react';
import { ConsistentChessboard, type BoardArrow } from '../Chessboard/ConsistentChessboard';
import type { MissionBriefing } from '../../missions/missionCard';
import { briefingFor } from './briefingMirror';
import { admitArrows } from '../../services/arrowDoor';

/** How long each demo move stays on the board. */
export const DEMO_STEP_MS = 1200;

type Step = 'idea' | 'demo' | 'try';

interface BriefingFlowProps {
  title: string;
  briefing: MissionBriefing;
  /** `full` the first time; `try-only` when a habit comes back. */
  mode: 'full' | 'try-only';
  /** The student's view; a briefing written for the other colour is mirrored
   *  so the try is always the student's move. */
  orientation: 'white' | 'black';
  /** The try was answered (right or not); the game may begin. */
  onDone: (rightFirstTime: boolean) => void;
}

/** The demo's boards, move by move, with the arrow of the move just played —
 *  a `line` claim through the arrow door, on the board before the move. */
function demoFrames(b: MissionBriefing, studentColor: 'white' | 'black'): Array<{ fen: string; arrow: BoardArrow | null }> {
  const c = new Chess(b.demoFen);
  const frames: Array<{ fen: string; arrow: BoardArrow | null }> = [{ fen: c.fen(), arrow: null }];
  for (const san of b.demoSans) {
    try {
      const before = c.fen();
      const m = c.move(san);
      const { arrows } = admitArrows([{ from: m.from, to: m.to, role: 'line', fen: before, source: 'campaign.briefing.demo' }], { fen: before, studentColor });
      frames.push({ fen: c.fen(), arrow: arrows[0] ?? null });
    } catch { break; }
  }
  return frames;
}

/** A NEW idea, taught before the game (Lane C): one board and one sentence,
 *  the idea played out with arrows, then one try. A habit that comes back
 *  gets the try alone. */
export function BriefingFlow({ title, briefing: authored, mode, orientation, onDone }: BriefingFlowProps): JSX.Element {
  const briefing = useMemo(() => briefingFor(authored, orientation === 'white' ? 'w' : 'b'), [authored, orientation]);
  const [step, setStep] = useState<Step>(mode === 'full' ? 'idea' : 'try');
  const frames = useMemo(() => demoFrames(briefing, orientation), [briefing, orientation]);
  const [frame, setFrame] = useState(0);
  const [tried, setTried] = useState<{ right: boolean; fen: string } | null>(null);
  /** Tap-tap: the first tap picks a piece of the side to move, the second tries. */
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    if (step !== 'demo' || frame >= frames.length - 1) return;
    const t = setTimeout(() => setFrame((f) => f + 1), DEMO_STEP_MS);
    return () => clearTimeout(t);
  }, [step, frame, frames.length]);

  const answer = briefing.tryAnswersUci[0] ?? '';
  // The answer shown after a wrong try: a `line` claim on the try's board.
  const tryArrows: BoardArrow[] = tried && !tried.right && answer
    ? admitArrows([{ from: answer.slice(0, 2), to: answer.slice(2, 4), role: 'line', fen: briefing.tryFen, source: 'campaign.briefing.try' }], { fen: briefing.tryFen, studentColor: orientation }).arrows
    : [];

  const attempt = (from: string, to: string): boolean => {
    if (tried) return false;
    const right = briefing.tryAnswersUci.some((u) => u.slice(0, 4) === `${from}${to}`);
    let fen = briefing.tryFen;
    if (right) {
      try { const c = new Chess(briefing.tryFen); c.move({ from, to, promotion: 'q' }); fen = c.fen(); } catch { /* keep the board */ }
    }
    setTried({ right, fen });
    return right;
  };

  const tap = (square: string): void => {
    if (step !== 'try' || tried) return;
    const own = new Chess(briefing.tryFen);
    const piece = own.get(square as Parameters<Chess['get']>[0]);
    if (piece && piece.color === own.turn()) { setPicked(square); return; }
    if (picked) { setPicked(null); attempt(picked, square); }
  };

  const boardFen = step === 'idea' ? briefing.demoFen : step === 'demo' ? frames[frame].fen : (tried?.fen ?? briefing.tryFen);
  const arrows = step === 'demo' ? (frames[frame].arrow ? [frames[frame].arrow] : []) : step === 'try' ? tryArrows : [];

  return (
    <div className="flex flex-col gap-3 p-3" data-testid="mission-briefing" data-step={step}>
      <div className="text-sm font-semibold text-theme-text">{title}</div>
      <div className="w-full max-w-sm mx-auto">
        <ConsistentChessboard
          fen={boardFen}
          boardOrientation={orientation}
          interactive={step === 'try' && !tried}
          arrows={arrows}
          squareStyles={picked ? { [picked]: { background: 'rgba(56, 189, 248, 0.45)' } } : {}}
          onPieceDrop={({ sourceSquare, targetSquare }) => (targetSquare ? attempt(sourceSquare, targetSquare) : false)}
          onSquareClick={({ square }) => tap(square)}
        />
      </div>
      {step === 'idea' && (
        <>
          <p className="text-sm text-theme-text" data-testid="mission-briefing-idea">{briefing.idea}</p>
          <button onClick={() => { setFrame(0); setStep('demo'); }} className="flex items-center justify-center gap-1 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white min-h-[44px]" data-testid="mission-briefing-next">
            Show me<ChevronRight size={16} />
          </button>
        </>
      )}
      {step === 'demo' && (
        <button
          onClick={() => setStep('try')}
          disabled={frame < frames.length - 1}
          className="flex items-center justify-center gap-1 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white min-h-[44px] disabled:opacity-40"
          data-testid="mission-briefing-try"
        >
          Your turn<ChevronRight size={16} />
        </button>
      )}
      {step === 'try' && (
        <>
          {!tried && <p className="text-sm text-theme-text" data-testid="mission-briefing-ask">Your move — find it.</p>}
          {tried?.right && <p className="flex items-center gap-1 text-sm text-emerald-400" data-testid="mission-briefing-right"><Check size={16} />That's it.</p>}
          {tried && !tried.right && <p className="flex items-center gap-1 text-sm text-rose-400" data-testid="mission-briefing-shown"><X size={16} />Here is the move.</p>}
          {tried && (
            <button onClick={() => onDone(tried.right)} className="flex items-center justify-center gap-1 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white min-h-[44px]" data-testid="mission-briefing-done">
              Start the game<ChevronRight size={16} />
            </button>
          )}
        </>
      )}
    </div>
  );
}
