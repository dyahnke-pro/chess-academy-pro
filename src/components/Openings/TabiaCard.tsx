import { useMemo } from 'react';
import { Flag, PlayCircle } from 'lucide-react';
import { ConsistentChessboard } from '../Chessboard/ConsistentChessboard';
import { tabiaStructure } from '../../services/tabiaStructure';
import { andList } from '../../utils/andList';
import { numberedLine } from '../../utils/numberedMove';
import type { MiddlegamePlan } from '../../types';

/**
 * THE TABIA — the position this line's middlegame starts from, shown right
 * under the line it ends (WO-COURSE-01 B, David 2026-10-27: "Is there anything
 * we can do to improve the tabia/sublines?"). Before this the plans began
 * ~1,000px further down the page, with nothing tying them to the moves.
 *
 * The board is the plan's own anchor (`criticalPositionFen`, which G9.3 Gate C
 * pins to the line), so the card and the plan below speak about one board.
 * Your plan, breaks and maneuvers are the plan's — hand-written, or the one
 * the games played from the line's middlegame (`computedPlan`); what the
 * STRUCTURE asks of both sides is computed on that board, from the student's
 * seat (`tabiaStructure`, G0). A line that stops in the opening reaches its
 * middlegame by the games' most-played moves (the plan's `approach`): they are
 * written here, and the plan line plays them first (2026-10-29).
 */
export function TabiaCard({ fen, studentColor, plan, onWatchPlan }: {
  fen: string;
  studentColor: 'white' | 'black';
  plan: MiddlegamePlan | null;
  onWatchPlan?: () => void;
}): JSX.Element | null {
  const structure = useMemo(() => tabiaStructure(fen, studentColor), [fen, studentColor]);

  const yourPlan = plan?.title ?? null;
  const breaks = plan?.pawnBreaks.map((b) => b.move) ?? [];
  const maneuvers = plan?.pieceManeuvers.map((m) => `${m.piece} ${m.route}`.trim()) ?? [];
  const approach = plan?.approach?.length ? numberedLine(plan.lineMoves?.length ?? 0, plan.approach) : null;
  // The plan line plays the way here first — when there is a line to play;
  // with none the button opens the plan's study, which starts on this board.
  const playsTheWay = Boolean(approach && plan?.playableLines?.length);
  if (!yourPlan && !structure) return null;

  return (
    <div className="mb-6 rounded-2xl bg-theme-surface border border-sky-500/30 p-4" data-testid="tabia-card">
      <div className="flex items-center gap-2 mb-1">
        <Flag size={15} className="text-sky-400 shrink-0" />
        <p className="text-sm font-bold">The tabia</p>
      </div>
      <p className="text-[11px] text-theme-text-muted mb-3">
        {approach
          ? "Where this line's middlegame starts — the games' most-played moves carry the line on to it."
          : "Where this line's middlegame starts — the position to aim for."}
      </p>
      {approach && (
        <p className="text-xs mb-3 font-mono" data-testid="tabia-approach"><span className="font-sans font-semibold text-theme-text">The way here: </span>{approach}</p>
      )}
      <div className="flex gap-3 items-start">
        <div className="w-32 shrink-0">
          <ConsistentChessboard fen={fen} boardOrientation={studentColor} />
        </div>
        <div className="min-w-0 flex-1 flex flex-col gap-1.5 text-xs">
          {yourPlan && (
            <p data-testid="tabia-your-plan"><span className="font-semibold text-emerald-300">Your plan: </span>{yourPlan}</p>
          )}
          {structure && (
            <p data-testid="tabia-structure"><span className="font-semibold text-sky-300">The structure: </span>{structure}</p>
          )}
          {breaks.length > 0 && (
            <p data-testid="tabia-breaks"><span className="font-semibold text-theme-text">Pawn breaks: </span>{andList(breaks)}</p>
          )}
          {maneuvers.length > 0 && (
            <p data-testid="tabia-maneuvers"><span className="font-semibold text-theme-text">Piece routes: </span>{andList(maneuvers)}</p>
          )}
        </div>
      </div>
      {plan && onWatchPlan && (
        <button
          type="button"
          onClick={onWatchPlan}
          className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-sky-300 hover:text-sky-200"
          data-testid="tabia-watch-plan"
        >
          <PlayCircle size={14} /> {playsTheWay ? 'Watch the way here and the plan' : 'Watch the plan from here'}
        </button>
      )}
    </div>
  );
}
