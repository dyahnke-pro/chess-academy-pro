import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { BossGate } from '../../missions/bosses/attempts';
import type { MapChapter } from './campaignMap';

const gateMock = vi.fn<() => BossGate>();
vi.mock('../../missions/missionRecord', () => ({ loadMissionRecord: () => Promise.resolve([]) }));
vi.mock('../../missions/bosses/bossRecord', () => ({ loadBossAttempts: () => Promise.resolve([]) }));
vi.mock('./campaignMap', () => ({
  campaignMap: (): MapChapter[] => [{
    chapter: { tier: 1, title: 'Chapter 1', levels: [1, 2, 3, 4], boss: 'grabber' },
    levels: [],
    boss: { id: 'grabber', name: 'The Grabber', gate: gateMock(), practiceTitle: 'Take the free piece, stay ahead' },
  }],
}));

import { CampaignMapPage } from './CampaignMapPage';

function Where(): JSX.Element { return <div data-testid="where">{useLocation().pathname + useLocation().search}</div>; }
const renderMap = (): void => {
  render(
    <MemoryRouter initialEntries={['/coach/campaign/map']}>
      <Routes>
        <Route path="/coach/campaign/map" element={<CampaignMapPage />} />
        <Route path="/coach/campaign" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('the boss node on the map', () => {
  it('an open boss offers the fight, which opens a boss game', async () => {
    gateMock.mockReturnValue({ kind: 'ready', attempts: 0 });
    renderMap();
    fireEvent.click(await screen.findByTestId('campaign-boss-start-grabber'));
    expect(screen.getByTestId('where')).toHaveTextContent('/coach/campaign?boss=grabber');
  });

  it('after a loss it reads as a rematch', async () => {
    gateMock.mockReturnValue({ kind: 'ready', attempts: 1 });
    renderMap();
    expect(await screen.findByTestId('campaign-boss-grabber')).toHaveTextContent('Rematch ready.');
  });

  it('owed practice says which habit and how many games — and offers no fight', async () => {
    gateMock.mockReturnValue({ kind: 'practice', cardId: 'free-piece-stay-ahead', remaining: 2 });
    renderMap();
    const node = await screen.findByTestId('campaign-boss-grabber');
    expect(node).toHaveAttribute('data-gate', 'practice');
    expect(node).toHaveTextContent('Practise Take the free piece, stay ahead first — 2 more games.');
    expect(screen.queryByTestId('campaign-boss-start-grabber')).not.toBeInTheDocument();
  });

  it('beaten: play it again', async () => {
    gateMock.mockReturnValue({ kind: 'beaten', attempts: 3 });
    renderMap();
    expect(await screen.findByTestId('campaign-boss-start-grabber')).toHaveTextContent('Play again');
  });
});
