import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/utils';
import { db } from '../../db/schema';
import { buildGameRecord, buildUserProfile, resetFactoryCounter } from '../../test/factories';
import { openingKeyFor } from '../../services/openingKey';
import { __resetHomeOpeningCacheForTests } from '../../services/homeOpeningService';
import { HomeOpeningCard } from './HomeOpeningCard';

// THE HOME OPENINGS CARD (A3): one per colour off the record, a one-tap change
// that sticks, the floor stated in numbers instead of a thin line crowned.

vi.mock('../../stores/appStore', () => ({
  useAppStore: { getState: () => ({ activeProfile: null, setActiveProfile: () => undefined }) },
}));
vi.mock('../../services/appAuditor', () => ({ logAppAudit: async () => undefined }));

const PIRC = openingKeyFor('B07', 'Pirc Defense');
const ELEPHANT = openingKeyFor('C40', 'Elephant Gambit');

beforeEach(async () => {
  resetFactoryCounter();
  __resetHomeOpeningCacheForTests();
  await db.delete();
  await db.open();
  await db.profiles.put(buildUserProfile({ id: 'main', preferences: { ...buildUserProfile().preferences, chessComUsername: 'student' } }));
});

describe('HomeOpeningCard', () => {
  it('renders nothing with no games', async () => {
    const { container } = render(<HomeOpeningCard />);
    await waitFor(() => expect(container.querySelector('[data-testid="home-opening-card-loading"]')).toBeNull());
    expect(container.querySelector('[data-testid="home-opening-card"]')).toBeNull();
  });

  it('names the home opening as Black, states the floor for White, and a tap changes it', async () => {
    await db.games.bulkPut([
      ...Array.from({ length: 12 }, (_, i) => buildGameRecord({ id: `p${i}`, openingId: PIRC, white: 'opp', black: 'student', result: '0-1' })),
      ...Array.from({ length: 3 }, (_, i) => buildGameRecord({ id: `e${i}`, openingId: ELEPHANT, white: 'opp', black: 'student', result: '1-0' })),
      buildGameRecord({ id: 'w', openingId: PIRC, white: 'student', black: 'opp', result: '1-0' }),
    ]);
    render(<HomeOpeningCard />);
    await screen.findByTestId('home-opening-card');
    expect((await screen.findByTestId('home-opening-black-name')).textContent).toContain('Pirc Defense');
    expect(screen.getByTestId('home-opening-black-name').textContent).toContain('12 games');
    expect(screen.getByTestId('home-opening-white-none').textContent).toMatch(/10 games in a line/);
    fireEvent.click(screen.getByTestId('home-opening-change-black'));
    const option = await screen.findByTestId('home-opening-option-black-elephant-gambit');
    expect(option.textContent).toContain('thin');
    fireEvent.click(option);
    await waitFor(() => expect(screen.getByTestId('home-opening-black-name').textContent).toContain('Elephant Gambit'));
    expect(screen.getByTestId('home-opening-black-name').textContent).toContain('your pick');
    expect((await db.profiles.get('main'))?.preferences.homeOpenings?.black?.source).toBe('student');
  });
});
