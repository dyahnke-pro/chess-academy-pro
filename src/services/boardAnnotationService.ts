import type { BoardArrow, BoardHighlight, BoardAnnotationCommand } from '../types';

const COLOR_MAP: Record<string, string> = {
  green: 'rgba(34, 197, 94, 0.8)',
  red: 'rgba(239, 68, 68, 0.8)',
  blue: 'rgba(59, 130, 246, 0.8)',
  yellow: 'rgba(234, 179, 8, 0.8)',
  orange: 'rgba(249, 115, 22, 0.8)',
};

const BOARD_TAG_REGEX = /\[BOARD:\s*(arrow|highlight|position|practice|clear)(?::([^\]]*))?\]/gi;
const VALID_SQUARE = /^[a-h][1-8]$/;

function resolveColor(name: string): string {
  return COLOR_MAP[name.toLowerCase().trim()] ?? COLOR_MAP.green;
}

function isValidSquare(sq: string): boolean {
  return VALID_SQUARE.test(sq.trim());
}

function isValidFen(fen: string): boolean {
  const parts = fen.trim().split(' ');
  if (parts.length < 1) return false;
  const ranks = parts[0].split('/');
  return ranks.length === 8;
}

function parseArrowData(data: string): BoardArrow[] {
  const arrows: BoardArrow[] = [];
  const entries = data.split(',');

  for (const entry of entries) {
    const parts = entry.trim().split(':');
    if (parts.length < 1) continue;

    const squares = parts[0].trim();
    const color = parts[1] ? resolveColor(parts[1]) : COLOR_MAP.green;
    const [from, to] = squares.split('-');

    if (from && to && isValidSquare(from) && isValidSquare(to)) {
      arrows.push({ startSquare: from.trim(), endSquare: to.trim(), color });
    }
  }

  return arrows;
}

function parseHighlightData(data: string): BoardHighlight[] {
  const highlights: BoardHighlight[] = [];
  const entries = data.split(',');

  for (const entry of entries) {
    const parts = entry.trim().split(':');
    if (parts.length < 1) continue;

    const square = parts[0].trim();
    const color = parts[1] ? resolveColor(parts[1]) : COLOR_MAP.green;

    if (isValidSquare(square)) {
      highlights.push({ square, color });
    }
  }

  return highlights;
}

export interface ParseBoardResult {
  cleanText: string;
  commands: BoardAnnotationCommand[];
}

export function parseBoardTags(text: string): ParseBoardResult {
  const commands: BoardAnnotationCommand[] = [];

  const cleanText = text.replace(BOARD_TAG_REGEX, (_match, type: string, data?: string) => {
    const tagType = type.toLowerCase();

    switch (tagType) {
      case 'arrow': {
        if (!data) break;
        const arrows = parseArrowData(data);
        if (arrows.length > 0) {
          commands.push({ type: 'arrow', arrows });
        }
        break;
      }
      case 'highlight': {
        if (!data) break;
        const highlights = parseHighlightData(data);
        if (highlights.length > 0) {
          commands.push({ type: 'highlight', highlights });
        }
        break;
      }
      case 'position': {
        if (!data) break;
        // FEN may contain colons, so split on last colon for the label
        const lastColon = data.lastIndexOf(':');
        let fen: string;
        let label: string;

        if (lastColon > 0) {
          // Check if the part after the last colon looks like a label (not a FEN component)
          const afterColon = data.slice(lastColon + 1).trim();
          const beforeColon = data.slice(0, lastColon).trim();

          // FEN parts contain only specific chars; labels contain letters/spaces
          if (afterColon.length > 0 && !/^[rnbqkpRNBQKP1-8/\s\-wbKQkq]+$/.test(afterColon)) {
            fen = beforeColon;
            label = afterColon;
          } else {
            fen = data.trim();
            label = 'Analysis position';
          }
        } else {
          fen = data.trim();
          label = 'Analysis position';
        }

        if (isValidFen(fen)) {
          commands.push({ type: 'show_position', fen, label });
        }
        break;
      }
      case 'practice': {
        if (!data) break;
        // Same FEN:Label format as position, but creates an interactive practice position
        const practiceLastColon = data.lastIndexOf(':');
        let practiceFen: string;
        let practiceLabel: string;

        if (practiceLastColon > 0) {
          const afterColon = data.slice(practiceLastColon + 1).trim();
          const beforeColon = data.slice(0, practiceLastColon).trim();

          if (afterColon.length > 0 && !/^[rnbqkpRNBQKP1-8/\s\-wbKQkq]+$/.test(afterColon)) {
            practiceFen = beforeColon;
            practiceLabel = afterColon;
          } else {
            practiceFen = data.trim();
            practiceLabel = 'Practice position';
          }
        } else {
          practiceFen = data.trim();
          practiceLabel = 'Practice position';
        }

        if (isValidFen(practiceFen)) {
          commands.push({ type: 'practice', fen: practiceFen, label: practiceLabel });
        }
        break;
      }
      case 'clear': {
        commands.push({ type: 'clear' });
        break;
      }
    }

    return '';
  }).trim();

  return { cleanText, commands };
}
