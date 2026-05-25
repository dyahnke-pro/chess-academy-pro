import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('files masterclasses under White / Black color sub-tabs', async () => {
    mockGetMasterclassOpenings.mockResolvedValue([
      buildOpeningRecord({ id: 'ruy-lopez', name: 'Ruy Lopez', color: 'white' }),
      buildOpeningRecord({ id: 'pirc-defence', name: 'Pirc Defence', color: 'black' }),
      buildOpeningRecord({ id: 'vienna-game', name: 'Vienna Game', color: 'white' }),
    ]);
    renderTab();

    await waitFor(() => {
      expect(screen.getByTestId('tab-masterclasses')).toBeInTheDocument();
    });

    // White sub-tab is the default: White classes show, Black ones don't.
    expect(screen.getByText('Ruy Lopez')).toBeInTheDocument();
    expect(screen.getByText('Vienna Game')).toBeInTheDocument();
    expect(screen.queryByText('Pirc Defence')).not.toBeInTheDocument();

    // Switching to the Black sub-tab reveals the black-side classes.
    await userEvent.click(screen.getByTestId('masterclass-color-black'));
    expect(screen.getByText('Pirc Defence')).toBeInTheDocument();
    expect(screen.queryByText('Ruy Lopez')).not.toBeInTheDocument();
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
