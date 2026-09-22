/**
 * THE SURFACE IS A PROPERTY OF THE ROUTE (WO-STANDARD-01 H2).
 *
 * The global drawer used to file every ask as `home-chat` no matter where it
 * was mounted, so a lesson asked for ON `/coach/teach` was refused as "no host
 * here". `coachSurfaceForRoute` derives the surface from the pathname at ask
 * time; these pin the mapping and its inverse.
 */
import { describe, it, expect } from 'vitest';
import { coachSurfaceForRoute, coachSurfaceToRoute } from './questionIntents';
import { COACH_SURFACES } from './surfaceContract';

describe('coachSurfaceForRoute', () => {
  it.each([
    ['/coach/teach', 'teach'],
    ['/coach/teach?opening=Italian%20Game', 'teach'],
    ['/coach/review/abc-123', 'review'],
    ['/coach/review', 'review'],
    ['/coach/play', 'game-chat'],
    ['/coach/play?fen=x', 'game-chat'],
    ['/coach/chat', 'standalone-chat'],
  ])('%s → %s', (path, surface) => {
    expect(coachSurfaceForRoute(path)).toBe(surface);
  });

  it.each(['/', '/coach/home', '/openings/italian-game', '/tactics', '', '/coach/teacher'])(
    '%s is home chat — the drawer over anything else',
    (path) => { expect(coachSurfaceForRoute(path)).toBe('home-chat'); },
  );

  it('round-trips every surface that owns a route', () => {
    for (const s of COACH_SURFACES) {
      const route = coachSurfaceToRoute(s);
      const back = coachSurfaceForRoute(route);
      // Play's four voices (game-chat / move-selector / hint / phase-narration)
      // share one route and a chat mounted there is the game chat; smart-search
      // and ping have no route a drawer can sit on.
      const expected = route === '/coach/play' ? 'game-chat' : route === '/' || route === '/coach/ping' ? 'home-chat' : s;
      expect(back, `${s} → ${route} → ${back}`).toBe(expected);
    }
  });

  it('CAN FIRE — the negative control', () => {
    expect(coachSurfaceForRoute('/coach/teach')).not.toBe('home-chat');
  });
});
