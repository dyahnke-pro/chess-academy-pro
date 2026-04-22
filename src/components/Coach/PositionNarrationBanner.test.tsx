import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import { PositionNarrationBanner } from './PositionNarrationBanner';

describe('PositionNarrationBanner', () => {
  it('renders nothing when there is no text', () => {
    render(<PositionNarrationBanner text="" active={true} />);
    expect(screen.queryByTestId('position-narration-banner')).toBeNull();
  });

  it('shows the banner when active with text', () => {
    render(<PositionNarrationBanner text="We are out of book." active={true} />);
    expect(screen.getByTestId('position-narration-banner')).toBeInTheDocument();
    expect(screen.getByText('We are out of book.')).toBeInTheDocument();
  });

  it('keeps the banner visible briefly after active flips false, then hides', async () => {
    const { rerender } = render(
      <PositionNarrationBanner text="Coach speaking." active={true} />,
    );
    expect(screen.getByTestId('position-narration-banner')).toBeInTheDocument();

    rerender(<PositionNarrationBanner text="Coach speaking." active={false} />);
    // Still visible immediately after deactivation — the timeout hasn't fired yet.
    expect(screen.getByTestId('position-narration-banner')).toBeInTheDocument();

    await waitFor(
      () => expect(screen.queryByTestId('position-narration-banner')).toBeNull(),
      { timeout: 3500 },
    );
  });
});
