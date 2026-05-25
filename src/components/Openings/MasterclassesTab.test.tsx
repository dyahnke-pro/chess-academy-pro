import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { MasterclassesTab } from './MasterclassesTab';
import { buildOpeningRecord } from '../../test/factories';

// Preserve the rest of the module (OpeningCard pulls getMasteryPercent etc.)
// and replace only the function our component uses.
vi.mock('../../services/openingService', async () => {
  const actual = await vi.importActual<typeof import('../../services/openingService')>(
    '../../services/openingService',
  );
  return { ...actual, getMasterclassOpenings: vi.fn() };
});

import { getMasterclassOpenings } from '../../services/openingService';

const mockGetMasterclassOpenings = vi.mocked(getMasterclassOpenings);

function renderTab(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <MotionConfig transition={{ duration: 0 }}>
        <MasterclassesTab />
      </MotionConfig>
    </MemoryRouter>,
  );
}

describe('MasterclassesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders an opening card for each masterclass returned by the service', async () => {
    mockGetMasterclassOpenings.mockResolvedValue([
      buildOpeningRecord({ id: 'ruy-lopez', name: 'Ruy Lopez', color: 'white' }),
      buildOpeningRecord({ id: 'pirc-defence', name: 'Pirc Defence', color: 'black' }),
      buildOpeningRecord({ id: 'vienna-game', name: 'Vienna Game', color: 'white' }),
    ]);
    renderTab();

    await waitFor(() => {
      expect(screen.getByTestId('tab-masterclasses')).toBeInTheDocument();
    });

    expect(screen.getByText('Ruy Lopez')).toBeInTheDocument();
    expect(screen.getByText('Pirc Defence')).toBeInTheDocument();
    expect(screen.getByText('Vienna Game')).toBeInTheDocument();
  });

  it('splits masterclasses into White and Black opening sections', async () => {
    mockGetMasterclassOpenings.mockResolvedValue([
      buildOpeningRecord({ id: 'ruy-lopez', name: 'Ruy Lopez', color: 'white' }),
      buildOpeningRecord({ id: 'pirc-defence', name: 'Pirc Defence', color: 'black' }),
    ]);
    renderTab();

    await waitFor(() => {
      expect(screen.getByText('White Openings')).toBeInTheDocument();
    });
    expect(screen.getByText('Black Openings')).toBeInTheDocument();
  });

  it('hides a color section when no opening of that color exists', async () => {
    mockGetMasterclassOpenings.mockResolvedValue([
      buildOpeningRecord({ id: 'ruy-lopez', name: 'Ruy Lopez', color: 'white' }),
    ]);
    renderTab();

    await waitFor(() => {
      expect(screen.getByText('White Openings')).toBeInTheDocument();
    });
    expect(screen.queryByText('Black Openings')).not.toBeInTheDocument();
  });

  it('renders an empty message when the service returns no masterclasses', async () => {
    mockGetMasterclassOpenings.mockResolvedValue([]);
    renderTab();

    await waitFor(() => {
      expect(screen.getByText(/No masterclasses available/i)).toBeInTheDocument();
    });
  });

  it('shows a loading state while the service resolves', () => {
    // Pending promise — service hasn't resolved yet.
    mockGetMasterclassOpenings.mockReturnValue(new Promise(() => {}));
    renderTab();

    expect(screen.getByText(/Loading masterclasses/i)).toBeInTheDocument();
  });
});
