/**
 * CoachEndgamePage navigation tests — locks the back-button
 * destination so future refactors can't silently reroute the user
 * out to the Dashboard. David's audit flagged this exact regression
 * shape: "Clicking the back button on the top left takes me all
 * the way out to dashboard." The current wiring goes to /coach/home
 * (the Coach hub); this test fails fast if anyone changes that.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { CoachEndgamePage } from './CoachEndgamePage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('CoachEndgamePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('back arrow on the picker routes to the Coach hub, not the Dashboard', () => {
    render(<CoachEndgamePage />);
    const backBtn = screen.getByLabelText('Back to coach hub');
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/coach/home');
    expect(mockNavigate).not.toHaveBeenCalledWith('/');
  });
});
