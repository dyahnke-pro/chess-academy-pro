import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ReferralPanel } from './ReferralPanel';

const getStatus = vi.fn();
const claimCode = vi.fn();
vi.mock('../../services/referralService', () => ({
  getStatus: (...a: unknown[]) => getStatus(...a),
  claimCode: (...a: unknown[]) => claimCode(...a),
}));

function openPanel(): void {
  fireEvent(window, new CustomEvent('open-referral'));
}

beforeEach(() => {
  getStatus.mockReset().mockResolvedValue({ code: 'ABC123', credits: 0, recruits: 0, claimed: null });
  claimCode.mockReset().mockResolvedValue('ok');
});

describe('ReferralPanel', () => {
  it('is hidden until the open-referral event fires, then shows the code', async () => {
    render(<ReferralPanel />);
    expect(screen.queryByTestId('referral-panel')).toBeNull();
    openPanel();
    await waitFor(() => expect(screen.getByTestId('referral-code')).toHaveTextContent('ABC123'));
  });

  it('shows earned credits when the server reports them', async () => {
    getStatus.mockResolvedValue({ code: 'ABC123', credits: 2, recruits: 1, claimed: null });
    render(<ReferralPanel />);
    openPanel();
    await waitFor(() => expect(screen.getByTestId('referral-credits')).toBeInTheDocument());
    expect(screen.getByTestId('referral-credits')).toHaveTextContent('2 free openings');
  });

  it('redeeming a code shows the success outcome and calls the service', async () => {
    render(<ReferralPanel />);
    openPanel();
    await waitFor(() => screen.getByTestId('referral-entry'));
    fireEvent.change(screen.getByTestId('referral-entry'), { target: { value: 'xyz789' } });
    fireEvent.click(screen.getByTestId('referral-redeem'));
    await waitFor(() => expect(screen.getByTestId('referral-outcome')).toBeInTheDocument());
    expect(claimCode).toHaveBeenCalledWith('XYZ789'); // uppercased
  });

  it('a bad code shows the error outcome', async () => {
    claimCode.mockResolvedValue('unknown-code');
    render(<ReferralPanel />);
    openPanel();
    await waitFor(() => screen.getByTestId('referral-entry'));
    fireEvent.change(screen.getByTestId('referral-entry'), { target: { value: 'BAD000' } });
    fireEvent.click(screen.getByTestId('referral-redeem'));
    await waitFor(() => expect(screen.getByTestId('referral-outcome')).toHaveTextContent(/double-check/i));
  });
});
