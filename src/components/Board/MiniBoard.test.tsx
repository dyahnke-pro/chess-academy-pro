import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../test/utils';
import { MiniBoard } from './MiniBoard';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const EMPTY_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';
const KING_ONLY_FEN = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';

describe('MiniBoard', () => {
  it('renders an SVG element', () => {
    render(<MiniBoard fen={STARTING_FEN} />);
    const svg = screen.getByLabelText('Board position');
    expect(svg).toBeInTheDocument();
    expect(svg.tagName).toBe('svg');
  });

  it('uses the default size of 56', () => {
    render(<MiniBoard fen={STARTING_FEN} />);
    const svg = screen.getByLabelText('Board position');
    expect(svg.getAttribute('width')).toBe('56');
    expect(svg.getAttribute('height')).toBe('56');
  });

  it('respects a custom size prop', () => {
    render(<MiniBoard fen={STARTING_FEN} size={80} />);
    const svg = screen.getByLabelText('Board position');
    expect(svg.getAttribute('width')).toBe('80');
    expect(svg.getAttribute('height')).toBe('80');
  });

  it('renders 64 square rects for any position', () => {
    render(<MiniBoard fen={STARTING_FEN} />);
    const svg = screen.getByLabelText('Board position');
    const rects = svg.querySelectorAll('rect');
    expect(rects).toHaveLength(64);
  });

  it('renders piece text elements for occupied squares', () => {
    render(<MiniBoard fen={STARTING_FEN} />);
    const svg = screen.getByLabelText('Board position');
    // Starting position has 32 pieces
    const texts = svg.querySelectorAll('text');
    expect(texts).toHaveLength(32);
  });

  it('renders no piece text elements for an empty board', () => {
    render(<MiniBoard fen={EMPTY_FEN} />);
    const svg = screen.getByLabelText('Board position');
    const texts = svg.querySelectorAll('text');
    expect(texts).toHaveLength(0);
  });

  it('renders exactly 2 piece text elements for a king-only position', () => {
    render(<MiniBoard fen={KING_ONLY_FEN} />);
    const svg = screen.getByLabelText('Board position');
    const texts = svg.querySelectorAll('text');
    expect(texts).toHaveLength(2);
  });

  it('renders Unicode piece characters', () => {
    render(<MiniBoard fen={KING_ONLY_FEN} />);
    const svg = screen.getByLabelText('Board position');
    const texts = svg.querySelectorAll('text');
    const chars = Array.from(texts).map((t) => t.textContent);
    // White king ♔ = \u2654, Black king ♚ = \u265A
    expect(chars).toContain('\u2654');
    expect(chars).toContain('\u265A');
  });

  it('uses alternating square colors', () => {
    render(<MiniBoard fen={EMPTY_FEN} />);
    const svg = screen.getByLabelText('Board position');
    const rects = svg.querySelectorAll('rect');
    const fills = Array.from(rects).map((r) => r.getAttribute('fill'));
    const light = '#f0d9b5';
    const dark = '#b58863';
    // First square (a8) should be light
    expect(fills[0]).toBe(light);
    // Second square (b8) should be dark
    expect(fills[1]).toBe(dark);
    // Both colors should be present
    expect(fills.filter((f) => f === light).length).toBeGreaterThan(0);
    expect(fills.filter((f) => f === dark).length).toBeGreaterThan(0);
  });

  it('defaults to white orientation', () => {
    // With white orientation, the first row rendered is rank 8 (black's back rank)
    render(<MiniBoard fen={KING_ONLY_FEN} />);
    const svg = screen.getByLabelText('Board position');
    const texts = svg.querySelectorAll('text');
    // Black king (♚) should appear in the first row (low y), white king in last row (high y)
    const blackKing = Array.from(texts).find((t) => t.textContent === '\u265A');
    const whiteKing = Array.from(texts).find((t) => t.textContent === '\u2654');
    expect(blackKing).toBeDefined();
    expect(whiteKing).toBeDefined();
    if (blackKing && whiteKing) {
      const blackY = parseFloat(blackKing.getAttribute('y') ?? '0');
      const whiteY = parseFloat(whiteKing.getAttribute('y') ?? '0');
      expect(blackY).toBeLessThan(whiteY);
    }
  });

  it('reverses rows for black orientation', () => {
    render(<MiniBoard fen={KING_ONLY_FEN} orientation="black" />);
    const svg = screen.getByLabelText('Board position');
    const texts = svg.querySelectorAll('text');
    const blackKing = Array.from(texts).find((t) => t.textContent === '\u265A');
    const whiteKing = Array.from(texts).find((t) => t.textContent === '\u2654');
    expect(blackKing).toBeDefined();
    expect(whiteKing).toBeDefined();
    if (blackKing && whiteKing) {
      const blackY = parseFloat(blackKing.getAttribute('y') ?? '0');
      const whiteY = parseFloat(whiteKing.getAttribute('y') ?? '0');
      // Black orientation: white king should be in the top rows, black king in bottom
      expect(whiteY).toBeLessThan(blackY);
    }
  });
});
