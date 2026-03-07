export interface BoardColorScheme {
  id: string;
  name: string;
  lightSquare: string;
  darkSquare: string;
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
];

export const DEFAULT_BOARD_COLOR = 'classic';

export function getBoardColor(id: string): BoardColorScheme {
  return BOARD_COLORS.find((bc) => bc.id === id) ?? BOARD_COLORS[0];
}
