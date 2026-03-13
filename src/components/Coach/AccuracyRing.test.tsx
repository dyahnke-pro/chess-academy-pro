import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import { AccuracyRing } from './AccuracyRing';

describe('AccuracyRing', () => {
  it('renders the accuracy value', () => {
    render(<AccuracyRing accuracy={85.7} />);
    expect(screen.getByText('86')).toBeInTheDocument();
  });

  it('renders the default "Accuracy" label', () => {
    render(<AccuracyRing accuracy={50} />);
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
  });

  it('renders a custom label', () => {
    render(<AccuracyRing accuracy={50} label="You" />);
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.queryByText('Accuracy')).not.toBeInTheDocument();
  });

  it('uses green color for accuracy >= 80', () => {
    render(<AccuracyRing accuracy={85} />);
    const fill = screen.getByTestId('accuracy-ring-fill');
    expect(fill.getAttribute('stroke')).toBe('#22c55e');
  });

  it('uses amber color for accuracy >= 60 and < 80', () => {
    render(<AccuracyRing accuracy={65} />);
    const fill = screen.getByTestId('accuracy-ring-fill');
    expect(fill.getAttribute('stroke')).toBe('#fbbf24');
  });

  it('uses red color for accuracy < 60', () => {
    render(<AccuracyRing accuracy={45} />);
    const fill = screen.getByTestId('accuracy-ring-fill');
    expect(fill.getAttribute('stroke')).toBe('#ef4444');
  });

  it('clamps accuracy at 100 for the ring fill', () => {
    render(<AccuracyRing accuracy={110} />);
    // Should still show 110 in text (rounded)
    expect(screen.getByText('110')).toBeInTheDocument();
    // Ring dashoffset should be 0 (full fill) since clamped at 100
    const fill = screen.getByTestId('accuracy-ring-fill');
    const circumference = 2 * Math.PI * 38; // (80 - 4) / 2 = 38
    const dashArray = fill.getAttribute('stroke-dasharray');
    expect(dashArray).toBe(String(circumference));
  });

  it('renders with custom size', () => {
    render(<AccuracyRing accuracy={75} size={120} />);
    const svg = screen.getByTestId('accuracy-ring').querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('120');
    expect(svg?.getAttribute('height')).toBe('120');
  });

  it('applies className', () => {
    render(<AccuracyRing accuracy={75} className="mt-4" />);
    expect(screen.getByTestId('accuracy-ring').className).toContain('mt-4');
  });
});
