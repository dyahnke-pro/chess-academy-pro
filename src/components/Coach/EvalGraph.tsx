import { useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
} from 'recharts';
import type { CoachGameMove } from '../../types';

interface EvalGraphProps {
  moves: CoachGameMove[];
  currentMoveIndex: number | null;
  onMoveClick?: (moveIndex: number) => void;
  className?: string;
}

interface DataPoint {
  index: number;
  label: string;
  eval: number;
  isBlunder: boolean;
  isBrilliant: boolean;
}

interface EvalTooltipProps {
  active?: boolean;
  label?: string | number;
}

function EvalTooltip({ active, label }: EvalTooltipProps): JSX.Element | null {
  if (!active || label === undefined) return null;
  return (
    <div
      className="rounded px-2 py-1 text-xs shadow-lg"
      style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
    >
      <div className="font-medium">Move {label}</div>
    </div>
  );
}

const EVAL_CLAMP = 5;

function clampEval(evalCp: number | null): number {
  if (evalCp === null) return 0;
  const pawns = evalCp / 100;
  return Math.max(-EVAL_CLAMP, Math.min(EVAL_CLAMP, pawns));
}

export function EvalGraph({
  moves,
  currentMoveIndex,
  onMoveClick,
  className = '',
}: EvalGraphProps): JSX.Element {
  const data = useMemo<DataPoint[]>(() => {
    const points: DataPoint[] = [{ index: -1, label: 'Start', eval: 0, isBlunder: false, isBrilliant: false }];

    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      const moveNum = Math.floor(i / 2) + 1;
      const label = i % 2 === 0 ? `${moveNum}. ${m.san}` : `${moveNum}... ${m.san}`;

      points.push({
        index: i,
        label,
        eval: clampEval(m.evaluation),
        isBlunder: m.classification === 'blunder' || m.classification === 'mistake',
        isBrilliant: m.classification === 'brilliant',
      });
    }

    return points;
  }, [moves]);

  const handleClick = useCallback(
    (point: DataPoint) => {
      if (onMoveClick && point.index >= 0) {
        onMoveClick(point.index);
      }
    },
    [onMoveClick],
  );

  if (moves.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-20 text-xs ${className}`}
        style={{ color: 'var(--color-text-muted)' }}
      >
        No moves to graph
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`} data-testid="eval-graph">
      <ResponsiveContainer width="100%" height={100}>
        <AreaChart
          data={data}
          margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
          onClick={(nextState) => {
            const idx = nextState.activeTooltipIndex;
            if (typeof idx === 'number' && idx >= 0 && idx < data.length) {
              handleClick(data[idx]);
            }
          }}
        >
          <defs>
            <linearGradient id="evalGradientPos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-text)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--color-text)" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="evalGradientNeg" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="var(--color-text-muted)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--color-text-muted)" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <XAxis dataKey="index" hide />
          <YAxis domain={[-EVAL_CLAMP, EVAL_CLAMP]} hide />

          <ReferenceLine y={0} stroke="var(--color-border)" strokeDasharray="3 3" />

          {currentMoveIndex !== null && currentMoveIndex >= -1 && (
            <ReferenceLine
              x={currentMoveIndex}
              stroke="var(--color-accent)"
              strokeWidth={2}
              strokeDasharray="3 3"
            />
          )}

          <Area
            type="monotone"
            dataKey="eval"
            stroke="var(--color-text-muted)"
            strokeWidth={1.5}
            fill="url(#evalGradientPos)"
            baseValue={0}
            isAnimationActive={false}
          />

          <Tooltip content={<EvalTooltip />} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
