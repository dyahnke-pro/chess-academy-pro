import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdaptiveSessionPanel } from './AdaptiveSessionPanel';
import { createAdaptiveSession } from '../../services/adaptivePuzzleService';

describe('AdaptiveSessionPanel — one rating on the tab (RT1)', () => {
  it('shows the student\'s puzzle rating and how it moved this session — not a second rating', () => {
    // The session's internal selection rating is 1000-ish; the student's
    // rating is 1487 → 1499. Only the latter may appear.
    render(<AdaptiveSessionPanel session={createAdaptiveSession('easy')} ratingHistory={[1487, 1495, 1499]} />);
    expect(screen.getByTestId('session-rating')).toHaveTextContent('1499');
    expect(screen.getByText('+12')).toBeInTheDocument();
    expect(screen.queryByText(/Session Rating/)).toBeNull();
  });
});
