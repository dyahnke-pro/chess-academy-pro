import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MotionConfig } from 'framer-motion';
import { RewardLayer, BANNER_MIN_MS } from './RewardLayer';
import { emitRewardEvent } from '../../services/rewardEvents';

describe('RewardLayer — banners that land together play in turn (2026-10-22)', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('the find and the pass on one move: "Extra piece won!" shows first, then "Mission complete!"', () => {
    vi.useFakeTimers();
    render(<MotionConfig transition={{ duration: 0 }}><RewardLayer /></MotionConfig>);
    act(() => {
      emitRewardEvent({ kind: 'gem', label: 'Extra piece won!' });
      emitRewardEvent({ kind: 'mission', label: 'Mission complete!' });
    });
    // The prod gate game showed only the second: the first never drew.
    expect(screen.getByText('Extra piece won!')).toBeInTheDocument();
    expect(screen.queryByText('Mission complete!')).toBeNull();
    act(() => { vi.advanceTimersByTime(BANNER_MIN_MS + 50); });
    expect(screen.getByText('Mission complete!')).toBeInTheDocument();
  });

  it('fail twin: one banner alone holds its full time', () => {
    vi.useFakeTimers();
    render(<MotionConfig transition={{ duration: 0 }}><RewardLayer /></MotionConfig>);
    act(() => { emitRewardEvent({ kind: 'gem', label: 'Outflanked!' }); });
    act(() => { vi.advanceTimersByTime(BANNER_MIN_MS + 50); });
    expect(screen.getByText('Outflanked!')).toBeInTheDocument();
  });
});
