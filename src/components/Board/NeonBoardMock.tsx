import { useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { getBoardColor } from '../../services/boardColorService';
import { buildPieceRenderer } from '../../services/pieceSetService';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const MID_FEN = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';

const NEON_GLOW_STYLES = {
  cyan: {
    boxShadow: '0 0 12px 2px #00ff88, 0 0 30px 4px rgba(0, 255, 136, 0.3)',
    borderRadius: '4px',
  },
  purple: {
    boxShadow: '0 0 12px 2px #a855f7, 0 0 30px 4px rgba(168, 85, 247, 0.3)',
    borderRadius: '4px',
  },
  gold: {
    boxShadow: '0 0 12px 2px #c9a84c, 0 0 30px 4px rgba(201, 168, 76, 0.3)',
    borderRadius: '4px',
  },
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
      <h1 className="text-2xl font-bold" style={{ color: '#00ffc8' }}>
        Neon Board Preview
      </h1>
      <p className="text-sm" style={{ color: '#888' }}>
        Standard board colors with neon glow outlines
      </p>

      {/* Row 1: No glow vs Cyan glow on classic board */}
      <div className="flex flex-wrap justify-center gap-8">
        <div className="w-[320px]">
          <BoardPreview
            label="Classic (no glow)"
            boardColorId="classic"
            pieceSetId="staunton"
            fen={START_FEN}
          />
        </div>
        <div className="w-[320px]">
          <BoardPreview
            label="Classic + Cyan Glow"
            boardColorId="classic"
            pieceSetId="staunton"
            fen={START_FEN}
            glowStyle={NEON_GLOW_STYLES.cyan}
          />
        </div>
      </div>

      {/* Row 2: Different glow colors on standard boards */}
      <h2 className="text-lg font-semibold" style={{ color: '#e0e0e0' }}>
        Glow color options
      </h2>
      <div className="flex flex-wrap justify-center gap-8">
        <div className="w-[280px]">
          <BoardPreview
            label="Tournament + Cyan"
            boardColorId="tournament"
            pieceSetId="staunton"
            fen={MID_FEN}
            glowStyle={NEON_GLOW_STYLES.cyan}
          />
        </div>
        <div className="w-[280px]">
          <BoardPreview
            label="Classic + Purple"
            boardColorId="classic"
            pieceSetId="staunton"
            fen={MID_FEN}
            glowStyle={NEON_GLOW_STYLES.purple}
          />
        </div>
        <div className="w-[280px]">
          <BoardPreview
            label="Classic + Gold"
            boardColorId="classic"
            pieceSetId="staunton"
            fen={MID_FEN}
            glowStyle={NEON_GLOW_STYLES.gold}
          />
        </div>
      </div>

      {/* Row 3: Other board colors with glow */}
      <h2 className="text-lg font-semibold" style={{ color: '#e0e0e0' }}>
        Other board colors with neon glow
      </h2>
      <div className="flex flex-wrap justify-center gap-8">
        <div className="w-[280px]">
          <BoardPreview
            label="Blue + Cyan Glow"
            boardColorId="blue"
            pieceSetId="neo"
            fen={MID_FEN}
            glowStyle={NEON_GLOW_STYLES.cyan}
          />
        </div>
        <div className="w-[280px]">
          <BoardPreview
            label="Wood + Gold Glow"
            boardColorId="wood"
            pieceSetId="staunton"
            fen={MID_FEN}
            glowStyle={NEON_GLOW_STYLES.gold}
          />
        </div>
        <div className="w-[280px]">
          <BoardPreview
            label="Purple + Purple Glow"
            boardColorId="purple"
            pieceSetId="california"
            fen={MID_FEN}
            glowStyle={NEON_GLOW_STYLES.purple}
          />
        </div>
      </div>
    </div>
  );
}
