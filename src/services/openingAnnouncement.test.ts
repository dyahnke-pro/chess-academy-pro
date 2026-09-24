import { describe, it, expect } from 'vitest';
import { openingAnnouncement } from './openingAnnouncement';

// Prod Learn tape 2026-09-24: four announcements in ten plies, each the
// detector refining its guess. One on first identification, one where the
// game leaves book.
describe('openingAnnouncement — name it once, then once more where theory ends', () => {
  it('names the first identification', () => {
    expect(openingAnnouncement({ name: 'Scandinavian Defense', plyCount: 2 }, 2, null)).toBe('This game is now the Scandinavian Defense.');
  });
  it('a refinement while still in book says nothing', () => {
    expect(openingAnnouncement({ name: 'Scandinavian Defense: Main Line', plyCount: 5 }, 5, 'Scandinavian Defense')).toBeNull();
  });
  it('the settled name is said once, at the ply the game leaves book', () => {
    expect(openingAnnouncement({ name: 'Scandinavian Defense: Lasker Variation', plyCount: 10 }, 11, 'Scandinavian Defense'))
      .toBe("You've left the book here — the line was the Scandinavian Defense: Lasker Variation.");
  });
  it('never repeats a name already said', () => {
    expect(openingAnnouncement({ name: 'Scandinavian Defense', plyCount: 2 }, 9, 'Scandinavian Defense')).toBeNull();
    expect(openingAnnouncement(null, 3, null)).toBeNull();
  });
});
