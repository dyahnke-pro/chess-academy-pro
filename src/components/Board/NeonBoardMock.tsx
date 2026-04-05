import { useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { getBoardColor } from '../../services/boardColorService';
import { buildPieceRenderer } from '../../services/pieceSetService';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const MID_FEN = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';

const AQUA_GLOW = {
  boxShadow: '0 0 12px 2px #00e5ff, 0 0 30px 4px rgba(0, 229, 255, 0.35)',
  borderRadius: '4px',
};

function BoardPreview({
  label,
  boardColorId,
  pieceSetId,
  fen,
  glowStyle,
}: {
  label: string;
  boardColorId: string;
  pieceSetId: string;
  fen: string;
  glowStyle?: React.CSSProperties;
}): JSX.Element {
  const colors = useMemo(() => getBoardColor(boardColorId), [boardColorId]);
  const pieces = useMemo(() => buildPieceRenderer(pieceSetId), [pieceSetId]);

  return (
    <div className="flex flex-col items-center gap-3">
      <h3 className="text-sm font-bold" style={{ color: '#e0e0e0' }}>{label}</h3>
      <div style={glowStyle}>
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
      <h1 className="text-2xl font-bold" style={{ color: '#00e5ff' }}>
        Neon Board Preview
      </h1>
      <p className="text-sm" style={{ color: '#888' }}>
        Classic board with aqua glow outline &bull; White pieces glow green &bull; Black pieces glow purple
      </p>

      {/* Row 1: Before vs After */}
      <div className="flex flex-wrap justify-center gap-8">
        <div className="w-[360px]">
          <BoardPreview
            label="Before (no glow)"
            boardColorId="classic"
            pieceSetId="staunton"
            fen={START_FEN}
          />
        </div>
        <div className="w-[360px]">
          <BoardPreview
            label="Neon (aqua glow + piece outlines)"
            boardColorId="neon"
            pieceSetId="staunton"
            fen={START_FEN}
            glowStyle={AQUA_GLOW}
          />
        </div>
      </div>

      {/* Row 2: Mid-game with different piece sets */}
      <h2 className="text-lg font-semibold" style={{ color: '#e0e0e0' }}>
        Mid-game positions
      </h2>
      <div className="flex flex-wrap justify-center gap-8">
        <div className="w-[320px]">
          <BoardPreview
            label="Neon + Staunton"
            boardColorId="neon"
            pieceSetId="staunton"
            fen={MID_FEN}
            glowStyle={AQUA_GLOW}
          />
        </div>
        <div className="w-[320px]">
          <BoardPreview
            label="Neon + Neo"
            boardColorId="neon"
            pieceSetId="neo"
            fen={MID_FEN}
            glowStyle={AQUA_GLOW}
          />
        </div>
        <div className="w-[320px]">
          <BoardPreview
            label="Neon + California"
            boardColorId="neon"
            pieceSetId="california"
            fen={MID_FEN}
            glowStyle={AQUA_GLOW}
          />
        </div>
      </div>
    </div>
  );
}
