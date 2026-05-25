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

function renderTab(color: 'white' | 'black'): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <MotionConfig transition={{ duration: 0 }}>
        <MasterclassesTab color={color} />
      </MotionConfig>
    </MemoryRouter>,
  );
}

describe('MasterclassesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows ONLY white openings on the white tab — never a black one', async () => {
    mockGetMasterclassOpenings.mockResolvedValue([
      buildOpeningRecord({ id: 'ruy-lopez', name: 'Ruy Lopez', color: 'white' }),
      buildOpeningRecord({ id: 'pirc-defence', name: 'Pirc Defence', color: 'black' }),
      buildOpeningRecord({ id: 'vienna-game', name: 'Vienna Game', color: 'white' }),
    ]);
    renderTab('white');

    await waitFor(() => {
      expect(screen.getByTestId('tab-white')).toBeInTheDocument();
    });
    expect(screen.getByText('Ruy Lopez')).toBeInTheDocument();
    expect(screen.getByText('Vienna Game')).toBeInTheDocument();
    // The black opening must NOT leak into the white tab.
    expect(screen.queryByText('Pirc Defence')).not.toBeInTheDocument();
  });

  it('shows ONLY black openings on the black tab — never a white one', async () => {
    mockGetMasterclassOpenings.mockResolvedValue([
      buildOpeningRecord({ id: 'ruy-lopez', name: 'Ruy Lopez', color: 'white' }),
      buildOpeningRecord({ id: 'pirc-defence', name: 'Pirc Defence', color: 'black' }),
      buildOpeningRecord({ id: 'caro-kann', name: 'Caro-Kann', color: 'black' }),
    ]);
    renderTab('black');

    await waitFor(() => {
      expect(screen.getByTestId('tab-black')).toBeInTheDocument();
    });
    expect(screen.getByText('Pirc Defence')).toBeInTheDocument();
    expect(screen.getByText('Caro-Kann')).toBeInTheDocument();
    // The white opening must NOT leak into the black tab.
    expect(screen.queryByText('Ruy Lopez')).not.toBeInTheDocument();
  });

  it('renders an empty message when no masterclass of that color exists', async () => {
    mockGetMasterclassOpenings.mockResolvedValue([
      buildOpeningRecord({ id: 'ruy-lopez', name: 'Ruy Lopez', color: 'white' }),
    ]);
    renderTab('black');

    await waitFor(() => {
      expect(screen.getByText(/No black masterclasses available/i)).toBeInTheDocument();
    });
  });

  it('shows a loading state while the service resolves', () => {
    // Pending promise — service hasn't resolved yet.
    mockGetMasterclassOpenings.mockReturnValue(new Promise(() => {}));
    renderTab('white');

    expect(screen.getByText(/Loading masterclasses/i)).toBeInTheDocument();
  });
});
