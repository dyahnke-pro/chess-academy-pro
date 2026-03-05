import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('renders with default props', () => {
    render(<Skeleton />);
    const el = screen.getByTestId('skeleton');
    expect(el).toBeInTheDocument();
    expect(el.style.width).toBe('100%');
    expect(el.style.height).toBe('1rem');
  });

  it('renders with custom dimensions', () => {
    render(<Skeleton width="200px" height="3rem" />);
    const el = screen.getByTestId('skeleton');
    expect(el.style.width).toBe('200px');
    expect(el.style.height).toBe('3rem');
  });

  it('applies custom className', () => {
    render(<Skeleton className="my-custom-class" />);
    const el = screen.getByTestId('skeleton');
    expect(el.classList.contains('my-custom-class')).toBe(true);
  });

  it('has animate-pulse class', () => {
    render(<Skeleton />);
    const el = screen.getByTestId('skeleton');
    expect(el.classList.contains('animate-pulse')).toBe(true);
  });
});
