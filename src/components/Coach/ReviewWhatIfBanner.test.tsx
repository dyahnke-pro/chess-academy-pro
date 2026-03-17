import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReviewWhatIfBanner } from './ReviewWhatIfBanner';

describe('ReviewWhatIfBanner', () => {
  it('renders What-If Mode label', () => {
    render(<ReviewWhatIfBanner isThinking={false} onBackToReview={vi.fn()} />);
    expect(screen.getByText('What-If Mode')).toBeInTheDocument();
  });

  it('shows thinking indicator when isThinking', () => {
    render(<ReviewWhatIfBanner isThinking={true} onBackToReview={vi.fn()} />);
    expect(screen.getByText('Thinking...')).toBeInTheDocument();
  });

  it('hides thinking indicator when not thinking', () => {
    render(<ReviewWhatIfBanner isThinking={false} onBackToReview={vi.fn()} />);
    expect(screen.queryByText('Thinking...')).not.toBeInTheDocument();
  });

  it('calls onBackToReview when button clicked', () => {
    const handler = vi.fn();
    render(<ReviewWhatIfBanner isThinking={false} onBackToReview={handler} />);
    fireEvent.click(screen.getByTestId('back-to-review-btn'));
    expect(handler).toHaveBeenCalledOnce();
  });
});
