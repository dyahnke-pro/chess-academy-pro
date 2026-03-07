import type { PieceRenderObject } from 'react-chessboard';

export interface PieceSetConfig {
  id: string;
  name: string;
  /** Lichess piece set directory name for CDN loading. null = use react-chessboard defaults. */
  lichessName: string | null;
}

export const PIECE_SETS: PieceSetConfig[] = [
  { id: 'staunton', name: 'Staunton', lichessName: null },
  { id: 'neo', name: 'Neo', lichessName: 'companion' },
  { id: 'alpha', name: 'Alpha', lichessName: 'alpha' },
  { id: 'merida', name: 'Merida', lichessName: 'merida' },
  { id: 'california', name: 'California', lichessName: 'california' },
  { id: 'cardinal', name: 'Cardinal', lichessName: 'cardinal' },
  { id: 'tatiana', name: 'Tatiana', lichessName: 'tatiana' },
  { id: 'pixel', name: 'Pixel', lichessName: 'pixel' },
  { id: 'horsey', name: 'Horsey', lichessName: 'horsey' },
  { id: 'letter', name: 'Letter', lichessName: 'letter' },
];

const PIECE_MAP: Record<string, string> = {
  wP: 'wP', wN: 'wN', wB: 'wB', wR: 'wR', wQ: 'wQ', wK: 'wK',
  bP: 'bP', bN: 'bN', bB: 'bB', bR: 'bR', bQ: 'bQ', bK: 'bK',
};

const LICHESS_CDN = 'https://lichess1.org/assets/piece';

/**
 * Builds a PieceRenderObject for react-chessboard from a Lichess piece set name.
 * Returns undefined for the default set (uses react-chessboard built-in pieces).
 */
export function buildPieceRenderer(pieceSetId: string): PieceRenderObject | undefined {
  const config = PIECE_SETS.find((ps) => ps.id === pieceSetId);
  if (!config?.lichessName) return undefined;

  const setName = config.lichessName;
  const pieces: PieceRenderObject = {};

  for (const [key, file] of Object.entries(PIECE_MAP)) {
    const url = `${LICHESS_CDN}/${setName}/${file}.svg`;
    pieces[key] = ({ svgStyle } = {}) => (
      <img
        src={url}
        alt={key}
        style={{
          width: '100%',
          height: '100%',
          ...svgStyle,
        }}
        draggable={false}
      />
    );
  }

  return pieces;
}

export function getPieceSetConfig(id: string): PieceSetConfig {
  return PIECE_SETS.find((ps) => ps.id === id) ?? PIECE_SETS[0];
}
