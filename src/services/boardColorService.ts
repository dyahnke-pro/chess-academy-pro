export interface BoardColorScheme {
  id: string;
  name: string;
  lightSquare: string;
  darkSquare: string;
  /** Optional CSS box-shadow for a glowing border around the board. */
  borderGlow?: string;
  /** Optional CSS filter applied to white pieces (e.g. neon drop-shadow). */
  whitePieceFilter?: string;
  /** Optional CSS filter applied to black pieces (e.g. neon drop-shadow). */
  blackPieceFilter?: string;
}

export const BOARD_COLORS: BoardColorScheme[] = [
  { id: 'classic', name: 'Classic', lightSquare: '#f0d9b5', darkSquare: '#b58863' },
  { id: 'tournament', name: 'Tournament', lightSquare: '#eeeed2', darkSquare: '#769656' },
  { id: 'green', name: 'Green', lightSquare: '#ffffdd', darkSquare: '#86a666' },
  { id: 'blue', name: 'Blue', lightSquare: '#dee3e6', darkSquare: '#8ca2ad' },
  { id: 'purple', name: 'Purple', lightSquare: '#e8daf5', darkSquare: '#9076b3' },
  { id: 'wood', name: 'Wood', lightSquare: '#e8c99b', darkSquare: '#a87642' },
  { id: 'ice', name: 'Ice', lightSquare: '#e0f0ff', darkSquare: '#7ca9c4' },
  { id: 'coral', name: 'Coral', lightSquare: '#fff0f0', darkSquare: '#d88c9a' },
  {
    id: 'neon',
    name: 'Neon',
    lightSquare: '#1a1040',
    darkSquare: '#0c1a3a',
    borderGlow: '0 0 12px 2px #00ff88, 0 0 30px 4px rgba(0, 255, 136, 0.3)',
    whitePieceFilter: 'drop-shadow(0 0 6px #00ff88) drop-shadow(0 0 2px #00ff88)',
    blackPieceFilter: 'drop-shadow(0 0 6px #a855f7) drop-shadow(0 0 2px #a855f7)',
  },
];

export const DEFAULT_BOARD_COLOR = 'classic';

export function getBoardColor(id: string): BoardColorScheme {
  return BOARD_COLORS.find((bc) => bc.id === id) ?? BOARD_COLORS[0];
}
