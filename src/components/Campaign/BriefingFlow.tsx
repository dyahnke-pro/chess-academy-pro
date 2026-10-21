import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Check, ChevronRight, X } from 'lucide-react';
import { ConsistentChessboard, type BoardArrow } from '../Chessboard/ConsistentChessboard';
import type { MissionBriefing } from '../../missions/missionCard';

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

const mirrorSquare = (sq: string): string => `${sq[0]}${9 - Number(sq[1])}`;

/** The same position seen from the other side: ranks flipped, colours swapped. */
export function mirrorFen(fen: string): string {
  const [board, turn, castling, ep, ...rest] = fen.split(' ');
  const swapCase = (c: string): string => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase());
  const rows = board.split('/').reverse().map((r) => [...r].map((c) => (/[a-z]/i.test(c) ? swapCase(c) : c)).join(''));
  const cast = castling === '-' ? '-' : [...castling].map(swapCase).sort((a, b) => (a === a.toUpperCase() ? 0 : 1) - (b === b.toUpperCase() ? 0 : 1)).join('');
  return [rows.join('/'), turn === 'w' ? 'b' : 'w', cast, ep === '-' ? '-' : mirrorSquare(ep), ...rest].join(' ');
}

/** The briefing for the student's colour: mirrored when its try is the other
 *  side's move. Every move is re-derived on the mirrored board by chess.js. */
export function briefingFor(b: MissionBriefing, student: 'w' | 'b'): MissionBriefing {
  if (new Chess(b.tryFen).turn() === student) return b;
  const demo = new Chess(b.demoFen);
  const mirrored = new Chess(mirrorFen(b.demoFen));
  const demoSans: string[] = [];
  for (const san of b.demoSans) {
    const m = demo.move(san);
    demoSans.push(mirrored.move({ from: mirrorSquare(m.from), to: mirrorSquare(m.to), ...(m.promotion ? { promotion: m.promotion } : {}) }).san);
  }
  const mirrorUci = (u: string): string => `${mirrorSquare(u.slice(0, 2))}${mirrorSquare(u.slice(2, 4))}${u.slice(4)}`;
  return { ...b, demoFen: mirrorFen(b.demoFen), demoSans, tryFen: mirrorFen(b.tryFen), tryAnswersUci: b.tryAnswersUci.map(mirrorUci) };
}

/** The demo's boards, move by move, with the arrow of the move just played. */
function demoFrames(b: MissionBriefing): Array<{ fen: string; arrow: BoardArrow | null }> {
  const c = new Chess(b.demoFen);
  const frames: Array<{ fen: string; arrow: BoardArrow | null }> = [{ fen: c.fen(), arrow: null }];
  for (const san of b.demoSans) {
    try {
      const m = c.move(san);
      frames.push({ fen: c.fen(), arrow: { startSquare: m.from, endSquare: m.to, color: 'rgba(34,197,94,0.85)' } });
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
  const frames = useMemo(() => demoFrames(briefing), [briefing]);
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
  const tryArrows: BoardArrow[] = tried && !tried.right && answer
    ? [{ startSquare: answer.slice(0, 2), endSquare: answer.slice(2, 4), color: 'rgba(34,197,94,0.85)' }]
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
