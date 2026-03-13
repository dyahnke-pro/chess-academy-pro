import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PIECE_SETS, LICHESS_CDN } from '../../services/pieceSetService';
import type { GhostMoveData } from '../../types';

interface GhostPieceOverlayProps {
  ghostMove: GhostMoveData;
  boardOrientation: 'white' | 'black';
  pieceSet: string;
}

function squareToPosition(
  square: string,
  orientation: 'white' | 'black',
  boardSize: number,
): { left: number; top: number } {
  const file = square.charCodeAt(0) - 97; // a=0 … h=7
  const rank = parseInt(square[1]) - 1; // 1=0 … 8=7

  const squareSize = boardSize / 8;
  const col = orientation === 'white' ? file : 7 - file;
  const row = orientation === 'white' ? 7 - rank : rank;

  return { left: col * squareSize, top: row * squareSize };
}

// eslint-disable-next-line react-refresh/only-export-components
export function getPieceImageUrl(piece: string, pieceSet: string): string {
  const config = PIECE_SETS.find((ps) => ps.id === pieceSet);
  if (config?.lichessName) {
    return `${LICHESS_CDN}/${config.lichessName}/${piece}.svg`;
  }
  // Default staunton — use react-chessboard's Wikipedia piece set
  return `https://images.chesscomfiles.com/chess-themes/pieces/neo/150/${piece}.png`;
}

export function GhostPieceOverlay({
  ghostMove,
  boardOrientation,
  pieceSet,
}: GhostPieceOverlayProps): JSX.Element | null {
  const containerRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState(0);

  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (!parent) return;

    // Initial measurement
    setBoardSize(parent.clientWidth);

    const observer = new ResizeObserver((entries) => {
      const entry = entries.at(0);
      if (entry !== undefined) {
        setBoardSize(entry.contentRect.width);
      }
    });
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  if (boardSize === 0) {
    return <div ref={containerRef} className="absolute inset-0 pointer-events-none" />;
  }

  const squareSize = boardSize / 8;
  const fromPos = squareToPosition(ghostMove.fromSquare, boardOrientation, boardSize);
  const toPos = squareToPosition(ghostMove.toSquare, boardOrientation, boardSize);
  const imgUrl = getPieceImageUrl(ghostMove.piece, pieceSet);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 5 }}
      data-testid="ghost-piece-overlay"
    >
      {/* Origin square — piece fading out */}
      <div
        className="absolute"
        style={{
          left: fromPos.left,
          top: fromPos.top,
          width: squareSize,
          height: squareSize,
          opacity: 0.25,
        }}
        data-testid="ghost-origin"
      >
        <img
          src={imgUrl}
          alt=""
          className="w-full h-full"
          draggable={false}
        />
      </div>

      {/* Destination square — ghost piece appearing */}
      <motion.div
        className="absolute"
        style={{
          left: toPos.left,
          top: toPos.top,
          width: squareSize,
          height: squareSize,
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.55, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        data-testid="ghost-destination"
      >
        <img
          src={imgUrl}
          alt=""
          className="w-full h-full"
          draggable={false}
        />
      </motion.div>
    </div>
  );
}
