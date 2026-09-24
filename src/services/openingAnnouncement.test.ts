import { describe, it, expect } from 'vitest';
import { openingAnnouncement } from './openingAnnouncement';
import { isBookLine } from './openingDetectionService';

// Prod Learn tape 2026-09-24: four announcements in ten plies, each the
// detector refining its guess. One on first identification, one where the
// game leaves book.
describe('openingAnnouncement — name it once, then once more where theory ends', () => {
  it('names the first identification', () => {
    expect(openingAnnouncement({ name: 'Scandinavian Defense' }, true, null)).toBe('This game is now the Scandinavian Defense.');
  });
  it('a refinement while still in book says nothing', () => {
    expect(openingAnnouncement({ name: 'Scandinavian Defense: Main Line' }, true, 'Scandinavian Defense')).toBeNull();
  });
  it('the settled name is said once, at the ply the game leaves book', () => {
    expect(openingAnnouncement({ name: 'Scandinavian Defense: Lasker Variation' }, false, 'Scandinavian Defense'))
      .toBe("You've left the book here — the line was the Scandinavian Defense: Lasker Variation.");
  });
  it('never repeats a name already said', () => {
    expect(openingAnnouncement({ name: 'Scandinavian Defense' }, false, 'Scandinavian Defense')).toBeNull();
    expect(openingAnnouncement(null, false, null)).toBeNull();
  });
  it('THE TAPE: the game past the end of Main Line but still inside Mieses is IN book — silent', () => {
    // 1.e4 d5 2.exd5 Qxd5 3.Nc3 — past "Main Line" (the detector's name) but
    // real theory continues it, so nothing has been left.
    const history = ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3'];
    expect(isBookLine(history)).toBe(true);
    expect(openingAnnouncement({ name: 'Scandinavian Defense: Main Line' }, isBookLine(history), 'Scandinavian Defense')).toBeNull();
  });
});
