import { useCallback } from 'react';
import { useDismissals } from '../../stores/userContext';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { recordDismissal } from '../../services/dismissals';
import { track, EVENTS } from '../../services/analytics';

interface NewFeaturePinProps {
  /** Unique key written to user_dismissals after first click. Convention:
   *  `pin:<feature-name>` (e.g. `pin:pawns-journey`). */
  seenKey: string;
  /**
   * PostHog feature flag gating the pin. When the flag is off or the
   * user has already dismissed `seenKey`, the component renders null.
   * Callers do NOT need to guard the render — this component owns the
   * "should I show?" logic.
   */
  flag: string;
  /**
   * Optional click handler. Runs AFTER the dismissal is recorded so the
   * caller can e.g. navigate without a race.
   */
  onClick?: () => void;
  'data-testid'?: string;
}

/**
 * Small pulsing dot rendered next to a nav item or card to draw
 * attention to a newly-shipped feature. First tap records the
 * dismissal and the pin disappears for that user forever.
 */
export function NewFeaturePin({
  seenKey,
  flag,
  onClick,
  'data-testid': testId,
}: NewFeaturePinProps): JSX.Element | null {
  const enabled = useFeatureFlag(flag);
  const dismissals = useDismissals();

  const handleClick = useCallback(() => {
    void recordDismissal(seenKey);
    track(EVENTS.nudgeDismissed, { key: seenKey });
    if (onClick) onClick();
  }, [seenKey, onClick]);

  if (!enabled) return null;
  if (dismissals.has(seenKey)) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="New feature — tap to dismiss"
      data-testid={testId ?? 'new-feature-pin'}
      className="relative inline-flex h-2.5 w-2.5 items-center justify-center"
    >
      <span
        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
        style={{ background: 'var(--color-accent)' }}
        aria-hidden="true"
      />
      <span
        className="relative inline-flex h-2.5 w-2.5 rounded-full"
        style={{ background: 'var(--color-accent)' }}
        aria-hidden="true"
      />
    </button>
  );
}
