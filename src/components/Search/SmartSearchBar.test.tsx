import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { SmartSearchBar } from './SmartSearchBar';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import { buildOpeningRecord, resetFactoryCounter } from '../../test/factories';

// Mock coachApi
vi.mock('../../services/coachApi', () => ({
  getCoachChatResponse: vi.fn().mockResolvedValue(''),
}));

function renderWithRouter(ui: React.ReactElement): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <MotionConfig transition={{ duration: 0 }}>
        {ui}
      </MotionConfig>
    </MemoryRouter>,
  );
}

describe('SmartSearchBar', () => {
  beforeEach(async () => {
    resetFactoryCounter();
    await db.delete();
    await db.open();
    useAppStore.getState().reset();
  });

  it('renders the search input', () => {
    renderWithRouter(<SmartSearchBar />);
    expect(screen.getByTestId('smart-search-input')).toBeInTheDocument();
  });

  it('shows AI-powered caption', () => {
    renderWithRouter(<SmartSearchBar />);
    expect(screen.getByText(/AI-powered/)).toBeInTheDocument();
  });

  it('shows clear button when query is entered', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SmartSearchBar />);

    const input = screen.getByTestId('smart-search-input');
    await user.type(input, 'test');

    expect(screen.getByTestId('search-clear')).toBeInTheDocument();
  });

  it('clears query when clear button is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SmartSearchBar />);

    const input = screen.getByTestId<HTMLInputElement>('smart-search-input');
    await user.type(input, 'test');
    expect(input.value).toBe('test');

    await user.click(screen.getByTestId('search-clear'));
    expect(input.value).toBe('');
  });

  it('shows results dropdown after searching', async () => {
    await db.openings.add(
      buildOpeningRecord({ id: 'test-open', name: 'Sicilian Defense', eco: 'B20' }),
    );

    const user = userEvent.setup();
    renderWithRouter(<SmartSearchBar />);

    const input = screen.getByTestId('smart-search-input');
    await user.type(input, 'Sicilian');

    await waitFor(() => {
      expect(screen.getByText('Sicilian Defense')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('uses scoped placeholder for openings', () => {
    renderWithRouter(<SmartSearchBar scope="opening" />);
    const input = screen.getByTestId<HTMLInputElement>('smart-search-input');
    expect(input.placeholder).toContain('openings');
  });

  it('calls onResultsChange when results update', async () => {
    await db.openings.add(
      buildOpeningRecord({ id: 'callback-test', name: 'French Defense', eco: 'C00' }),
    );

    const onResultsChange = vi.fn();
    const user = userEvent.setup();
    renderWithRouter(<SmartSearchBar onResultsChange={onResultsChange} />);

    const input = screen.getByTestId('smart-search-input');
    await user.type(input, 'French');

    await waitFor(() => {
      expect(onResultsChange).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('shows Ask Coach option when query is 3+ characters', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SmartSearchBar />);

    const input = screen.getByTestId('smart-search-input');
    await user.type(input, 'How do I play the Sicilian?');

    await waitFor(() => {
      expect(screen.getByTestId('ask-coach-option')).toBeInTheDocument();
    });

    expect(screen.getByText('Ask Coach')).toBeInTheDocument();
  });

  it('opens coach drawer with query when Ask Coach is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SmartSearchBar />);

    const input = screen.getByTestId('smart-search-input');
    await user.type(input, 'What are my weaknesses?');

    await waitFor(() => {
      expect(screen.getByTestId('ask-coach-option')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('ask-coach-option'));

    const state = useAppStore.getState();
    expect(state.coachDrawerOpen).toBe(true);
    expect(state.coachDrawerInitialMessage).toBe('What are my weaknesses?');
  });

  it('opens coach drawer on Enter when no result is selected', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SmartSearchBar />);

    const input = screen.getByTestId('smart-search-input');
    await user.type(input, 'Help me improve');
    await user.keyboard('{Enter}');

    const state = useAppStore.getState();
    expect(state.coachDrawerOpen).toBe(true);
    expect(state.coachDrawerInitialMessage).toBe('Help me improve');
  });
});
