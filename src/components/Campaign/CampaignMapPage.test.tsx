import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const loadMock = vi.fn();
vi.mock('../../missions/missionRecord', () => ({ loadMissionRecord: () => loadMock() }));

import { CampaignMapPage } from './CampaignMapPage';

describe('CampaignMapPage', () => {
  it('shows the loading state, then the chapter, levels and the locked boss', async () => {
    loadMock.mockResolvedValue([]);
    render(<MemoryRouter><CampaignMapPage /></MemoryRouter>);
    expect(screen.getByTestId('campaign-map-loading')).toBeInTheDocument();
    expect(await screen.findByTestId('campaign-chapter-1')).toBeInTheDocument();
    expect(screen.getByTestId('campaign-slot-1-opening')).toHaveAttribute('data-status', 'active');
    expect(screen.getByTestId('campaign-slot-1-endgame')).toHaveAttribute('data-status', 'active');
    expect(screen.getByTestId('campaign-slot-2-opening')).toHaveAttribute('data-status', 'coming');
    expect(screen.getByTestId('campaign-boss-grabber')).toHaveAttribute('data-gate', 'locked');
    expect(screen.queryByTestId('campaign-boss-start-grabber')).not.toBeInTheDocument();
    expect(screen.getByTestId('campaign-play')).toBeInTheDocument();
  });

  it('a record that cannot be read says so', async () => {
    loadMock.mockRejectedValue(new Error('no db'));
    render(<MemoryRouter><CampaignMapPage /></MemoryRouter>);
    expect(await screen.findByTestId('campaign-map-error')).toBeInTheDocument();
  });
});
