import { describe, it, expect } from 'vitest';
import { matchNavigationRoute, matchRouteByTopic } from './navigationRouter';

// Unified action layer: "take me to X" / "open X" resolves to a REAL route in
// code — deterministic, never invented, works on every surface via dispatch.

describe('matchNavigationRoute', () => {
  it('resolves common destinations', () => {
    expect(matchNavigationRoute('take me to tactics')?.path).toBe('/tactics');
    expect(matchNavigationRoute('open settings')?.path).toBe('/settings');
    expect(matchNavigationRoute('go to my weaknesses')?.path).toBe('/weaknesses');
    expect(matchNavigationRoute('navigate to the opening explorer')?.path).toBe('/openings');
    expect(matchNavigationRoute('switch to calculation')?.path).toBe('/tactics/calculation');
    expect(matchNavigationRoute('take me home')?.path).toBe('/');
  });

  it('prefers the more specific alias', () => {
    expect(matchNavigationRoute('open the training plan')?.path).toBe('/coach/plan');
    expect(matchNavigationRoute('take me to play with coach')?.path).toBe('/coach/play');
  });

  it('confirms with a human label', () => {
    expect(matchNavigationRoute('open settings')?.ack).toBe('Opening Settings.');
  });

  it('requires a navigation intent phrase', () => {
    // A bare destination word without "take me to / open / go to" is not a nav.
    expect(matchNavigationRoute('what are the best tactics?')).toBeNull();
    expect(matchNavigationRoute('settings')).toBeNull();
  });

  it('returns null for unknown destinations (falls through to the brain)', () => {
    expect(matchNavigationRoute('take me to the moon')).toBeNull();
    expect(matchNavigationRoute('open the pod bay doors')).toBeNull();
  });

  it('does not fire navigation on a content/show-a-puzzle phrase target it does not know', () => {
    // "show me" is a nav trigger, but with no known destination it declines
    // (the training-aid router upstream handles "show me a fork puzzle").
    expect(matchNavigationRoute('show me a fork puzzle')).toBeNull();
  });
});

// F15 app-help: resolve the route a question NAMES, without a navigation verb.
describe('matchRouteByTopic', () => {
  it('resolves a destination named without a nav verb', () => {
    expect(matchRouteByTopic('what does the tactics tab do?')?.path).toBe('/tactics');
    expect(matchRouteByTopic('how does the calculation trainer work?')?.path).toBe('/tactics/calculation');
    expect(matchRouteByTopic("what's the training plan for?")?.path).toBe('/coach/plan');
  });

  it('returns a human label alongside the path', () => {
    expect(matchRouteByTopic('what does the settings screen do?')).toEqual({ path: '/settings', label: 'Settings' });
  });

  it('returns null when no curated route is named', () => {
    expect(matchRouteByTopic('what does the knight do?')).toBeNull();
    expect(matchRouteByTopic('how does en passant work?')).toBeNull();
  });
});
