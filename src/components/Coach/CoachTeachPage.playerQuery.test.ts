import { describe, it, expect } from 'vitest';
import { buildPlayerStyleQuery } from './CoachTeachPage';

/**
 * Locks the routing contract for the "How a pro plays" picker mode.
 *
 * The query must fall through CoachTeachPage.handleSubmit's two surface
 * interceptors so it reaches the coach BRAIN (coachService.ask) with the
 * grounded player tools (lookup_player_opening_moves / lookup_player_games),
 * instead of being captured as an opening name and fuzzy-matched.
 *
 *   1. The bare-name router only fires when the input has NO "?" — so the
 *      query MUST contain "?".
 *   2. TEACH_PATTERN anchors on a teach/show/walk-me-through verb prefix — so
 *      the query must NOT start with one (it starts with "How does").
 *
 * If a future edit drops the "?" or rephrases to "show me / teach me …", the
 * player tools never fire and the user gets a generic walkthrough. This test
 * fails loudly if either property is lost.
 */
describe('buildPlayerStyleQuery — brain-routing contract', () => {
  const cases: Array<[string, string]> = [
    ['Magnus Carlsen', 'Sicilian Defense'],
    ['Daniel Naroditsky', 'Caro-Kann'],
    ['penguingm1', "King's Indian Defense"], // raw lichess username + apostrophe opening
  ];

  for (const [player, opening] of cases) {
    it(`routes to the brain for "${player}" + "${opening}"`, () => {
      const q = buildPlayerStyleQuery(player, opening);
      // (1) must contain "?" so the bare-name router skips it
      expect(q.includes('?')).toBe(true);
      // (2) must NOT begin with a teach/show/walk verb (TEACH_PATTERN)
      expect(/^\s*(?:teach|show|walk|drill|quiz|play|punish)\b/i.test(q)).toBe(false);
      // starts with the load-bearing "How does" prefix
      expect(q.toLowerCase().startsWith('how does ')).toBe(true);
      // carries both the player and the opening verbatim
      expect(q).toContain(player);
      expect(q).toContain(opening);
    });
  }

  it('produces the exact phrasing the brain keys on', () => {
    expect(buildPlayerStyleQuery('Hikaru Nakamura', 'Najdorf')).toBe(
      'How does Hikaru Nakamura play the Najdorf?',
    );
  });
});
