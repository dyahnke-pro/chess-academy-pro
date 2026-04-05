import { useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { getBoardColor } from '../../services/boardColorService';
import { buildPieceRenderer } from '../../services/pieceSetService';

const NEON_GLOW = {
  borderRadius: '4px',
  border: '1px solid rgba(0, 255, 200, 0.4)',
  boxShadow: '0 0 20px rgba(0, 255, 200, 0.35), 0 0 60px rgba(0, 255, 200, 0.1)',
};

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const MID_FEN = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';

function BoardPreview({
  label,
  boardColorId,
  pieceSetId,
  neonGlow,
  fen,
}: {
  label: string;
  boardColorId: string;
  pieceSetId: string;
  neonGlow: boolean;
  fen: string;
}): JSX.Element {
  const colors = useMemo(() => getBoardColor(boardColorId), [boardColorId]);
  const pieces = useMemo(() => buildPieceRenderer(pieceSetId), [pieceSetId]);

  return (
    <div className="flex flex-col items-center gap-3">
      <h3 className="text-sm font-bold" style={{ color: '#e0e0e0' }}>{label}</h3>
      <div style={neonGlow ? NEON_GLOW : undefined}>
        <Chessboard
          options={{
            position: fen,
            boardOrientation: 'white',
            darkSquareStyle: { backgroundColor: colors.darkSquare },
            lightSquareStyle: { backgroundColor: colors.lightSquare },
            ...(pieces ? { pieces } : {}),
            allowDragging: false,
          }}
        />
      </div>
    </div>
  );
}

export function NeonBoardMock(): JSX.Element {
  return (
    <div
      className="min-h-screen flex flex-col items-center py-8 px-4 gap-10"
      style={{ background: '#0a0a0a' }}
      data-testid="neon-board-mock"
    >
      <h1 className="text-2xl font-bold" style={{ color: '#00ffc8' }}>
        Neon Board Preview
      </h1>

      {/* Side by side: Classic vs Neon */}
      <div className="flex flex-wrap justify-center gap-8">
        <div className="w-[320px]">
          <BoardPreview
            label="Classic (current)"
            boardColorId="classic"
            pieceSetId="staunton"
            neonGlow={false}
            fen={START_FEN}
          />
        </div>
        <div className="w-[320px]">
          <BoardPreview
            label="Neon"
            boardColorId="neon"
            pieceSetId="staunton"
            neonGlow
            fen={START_FEN}
          />
        </div>
      </div>

      {/* Neon with mid-game position and different piece sets */}
      <h2 className="text-lg font-semibold" style={{ color: '#e0e0e0' }}>
        Mid-game with different piece sets
      </h2>
      <div className="flex flex-wrap justify-center gap-8">
        <div className="w-[280px]">
          <BoardPreview
            label="Neon + Neo pieces"
            boardColorId="neon"
            pieceSetId="neo"
            neonGlow
            fen={MID_FEN}
          />
        </div>
        <div className="w-[280px]">
          <BoardPreview
            label="Neon + California pieces"
            boardColorId="neon"
            pieceSetId="california"
            neonGlow
            fen={MID_FEN}
          />
        </div>
        <div className="w-[280px]">
          <BoardPreview
            label="Neon + Alpha pieces"
            boardColorId="neon"
            pieceSetId="alpha"
            neonGlow
            fen={MID_FEN}
          />
        </div>
      </div>
    </div>
  );
}
