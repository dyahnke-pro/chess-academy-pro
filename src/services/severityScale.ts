/**
 * severityScale — central thresholds + visual treatments for "this
 * stat is bad and the user should feel it." David's directive on the
 * Weaknesses tab: a really lacking stat should get redder + warning
 * iconography so the surface induces a sense of urgency about
 * shortcomings, not just reports them flatly.
 *
 * Tiers are stat-shape-aware: a 25% win rate is "weak", but a 25%
 * drill accuracy is "severe" — drills should be 70%+ to be healthy.
 * Each tier carries a color token + icon + optional CSS animation
 * class so every consumer renders the same urgency for the same
 * number.
 *
 * Pure functions. No React imports. Consumers compose the returned
 * tokens into their own JSX.
 */

export type Severity = 'healthy' | 'caution' | 'weak' | 'severe' | 'critical';

export interface SeverityTokens {
  tier: Severity;
  /** Hex / CSS var for the primary color text. */
  color: string;
  /** Optional warning icon string. Empty for healthy / caution. */
  icon: '' | '⚠' | '‼';
  /** When set, the consumer should add this CSS class for animation
   *  (Tailwind built-in or custom). Empty when no animation. */
  animationClass: '' | 'animate-pulse';
  /** Drop-shadow / glow style for severe + critical tiers. Empty
   *  string when no glow. */
  glow: string;
  /** Plain-English label for screen readers + aria-labels. */
  ariaLabel: string;
}

const TOKENS: Record<Severity, Omit<SeverityTokens, 'tier'>> = {
  healthy: {
    color: 'var(--color-success)',
    icon: '',
    animationClass: '',
    glow: '',
    ariaLabel: 'healthy',
  },
  caution: {
    color: '#f59e0b',
    icon: '',
    animationClass: '',
    glow: '',
    ariaLabel: 'caution',
  },
  weak: {
    color: 'var(--color-error)',
    icon: '',
    animationClass: '',
    glow: '',
    ariaLabel: 'weak',
  },
  severe: {
    color: '#ef4444',
    icon: '⚠',
    animationClass: '',
    glow: '0 0 6px rgba(239, 68, 68, 0.6)',
    ariaLabel: 'severe — needs attention',
  },
  critical: {
    color: '#dc2626',
    icon: '‼',
    animationClass: 'animate-pulse',
    glow: '0 0 10px rgba(220, 38, 38, 0.85), 0 0 18px rgba(220, 38, 38, 0.45)',
    ariaLabel: 'critical — urgent',
  },
};

/** Win-rate (or "as White / Black / Combined" rate) severity. The
 *  thresholds match the legacy red/yellow/green cutoffs of 60/40 and
 *  extend below for the new severe / critical tiers. */
export function winRateSeverity(pct: number): Severity {
  if (pct >= 60) return 'healthy';
  if (pct >= 40) return 'caution';
  if (pct >= 25) return 'weak';
  if (pct >= 15) return 'severe';
  return 'critical';
}

/** Drill / puzzle accuracy severity. The healthy threshold is higher
 *  than win-rate (70% vs 60%) because drill expectations are higher —
 *  a drill is a known-correct training position and falling below 70%
 *  signals the user is missing what they should know. */
export function drillAccuracySeverity(pct: number): Severity {
  if (pct >= 70) return 'healthy';
  if (pct >= 50) return 'caution';
  if (pct >= 30) return 'weak';
  if (pct >= 20) return 'severe';
  return 'critical';
}

/** Compose tokens for the given severity. Always returns a complete
 *  tokens object; healthy returns the green default. */
export function severityTokens(sev: Severity): SeverityTokens {
  return { tier: sev, ...TOKENS[sev] };
}

/** Convenience helpers — read a percentage, return the tokens to
 *  render. Saves callers from doing both steps. */
export function winRateTokens(pct: number): SeverityTokens {
  return severityTokens(winRateSeverity(pct));
}
export function drillAccuracyTokens(pct: number): SeverityTokens {
  return severityTokens(drillAccuracySeverity(pct));
}
