import { useMemo } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { getBoardColor } from '../../services/boardColorService';

const PIECE_UNICODE: Record<string, string> = {
  K: '\u2654', Q: '\u2655', R: '\u2656', B: '\u2657', N: '\u2658', P: '\u2659',
  k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F',
};

function parseFenPosition(fen: string): (string | null)[][] {
  const position = fen.split(' ')[0];
  return position.split('/').map((row) => {
    const squares: (string | null)[] = [];
    for (const ch of row) {
      if (ch >= '1' && ch <= '8') {
        for (let i = 0; i < parseInt(ch); i++) squares.push(null);
      } else {
        squares.push(ch);
      }
    }
    return squares;
  });
}

interface MiniBoardProps {
  fen: string;
  size?: number;
  orientation?: 'white' | 'black';
}

export function MiniBoard({ fen, size = 56, orientation = 'white' }: MiniBoardProps): JSX.Element {
  const { settings } = useSettings();
  const colors = useMemo(() => getBoardColor(settings.boardColor), [settings.boardColor]);
  const board = useMemo(() => parseFenPosition(fen), [fen]);
  const sq = size / 8;

  const rows = orientation === 'white' ? board : [...board].reverse();

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="rounded shrink-0"
      aria-label="Board position"
    >
      {rows.map((row, r) => {
        const cols = orientation === 'black' ? [...row].reverse() : row;
        return cols.map((piece, c) => {
          const isLight = (r + c) % 2 === 0;
          return (
            <g key={`${r}-${c}`}>
              <rect
                x={c * sq}
                y={r * sq}
                width={sq}
                height={sq}
                fill={isLight ? colors.lightSquare : colors.darkSquare}
              />
              {piece && (
                <text
                  x={c * sq + sq / 2}
                  y={r * sq + sq * 0.55}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={sq * 0.82}
                  fill={piece === piece.toUpperCase() ? '#fff' : '#222'}
                  stroke={piece === piece.toUpperCase() ? '#333' : '#ddd'}
                  strokeWidth={0.3}
                >
                  {PIECE_UNICODE[piece]}
                </text>
              )}
            </g>
          );
        });
      })}
    </svg>
  );
}
