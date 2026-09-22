/**
 * ONE NOTE, ONE RECORD (WO-STANDARD-01 H4).
 *
 * PostHog, native, 30d: every `feedback_submitted` row was duplicated — two
 * rows for "I love this app so much…", 7 seconds apart, one session, both
 * from QuickFeedbackButton. The share sheet was dismissed (AbortError →
 * 'idle'), the student tapped Send again, and the capture ran again.
 *
 * Proof is the OUTPUT: the number of `submitFeedback` calls (one write to the
 * record each). The negative control is a CHANGED note, which must capture
 * again — otherwise a gate that only counted "once" could pass on a panel
 * that never captured at all after the first note.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '../../test/utils';
import { QuickFeedbackButton } from './QuickFeedbackButton';
import { FeedbackForm } from './FeedbackForm';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';

const mockSubmit = vi.fn();
vi.mock('../../services/feedback', () => ({
  submitFeedback: (...args: unknown[]): Promise<boolean> => mockSubmit(...args) as Promise<boolean>,
}));

function abortError(): DOMException {
  return new DOMException('The user cancelled the share', 'AbortError');
}

describe('QuickFeedbackButton captures each note once', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubmit.mockResolvedValue(true);
    useAppStore.setState({ activeProfile: buildUserProfile({ id: 'main', name: 'Player' }) });
  });

  it('a re-tap after the share sheet is dismissed does NOT write a second record', async () => {
    // First tap: the share sheet is cancelled → the panel returns to idle.
    const share = vi.fn().mockRejectedValueOnce(abortError()).mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true, writable: true });

    render(<QuickFeedbackButton />);
    fireEvent.click(screen.getByText('Feedback'));
    const box = screen.getByTestId('quick-feedback-message');
    act(() => { fireEvent.change(box, { target: { value: 'I love this app so much.' } }); });

    fireEvent.click(screen.getByTestId('quick-feedback-submit'));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    // Back to idle — the button is enabled again, exactly the prod path.
    await waitFor(() => expect(screen.getByTestId('quick-feedback-submit')).not.toBeDisabled());

    fireEvent.click(screen.getByTestId('quick-feedback-submit'));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(2));

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockSubmit.mock.calls[0][0]).toMatchObject({ message: 'I love this app so much.', source: 'QuickFeedbackButton' });
  });

  it('NEGATIVE CONTROL — a changed note captures again', async () => {
    const share = vi.fn().mockRejectedValue(abortError());
    Object.defineProperty(navigator, 'share', { value: share, configurable: true, writable: true });

    render(<QuickFeedbackButton />);
    fireEvent.click(screen.getByText('Feedback'));
    const box = screen.getByTestId('quick-feedback-message');
    act(() => { fireEvent.change(box, { target: { value: 'first note' } }); });
    fireEvent.click(screen.getByTestId('quick-feedback-submit'));
    await waitFor(() => expect(screen.getByTestId('quick-feedback-submit')).not.toBeDisabled());

    act(() => { fireEvent.change(box, { target: { value: 'second, different note' } }); });
    fireEvent.click(screen.getByTestId('quick-feedback-submit'));
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(2));
    expect(mockSubmit.mock.calls[1][0]).toMatchObject({ message: 'second, different note' });
  });
});

describe('FeedbackForm captures each note once', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubmit.mockResolvedValue(true);
    useAppStore.setState({ activeProfile: buildUserProfile({ id: 'main', name: 'Player' }) });
  });

  it('two submits of the same note write one record', () => {
    render(<FeedbackForm onClose={() => undefined} />);
    act(() => { fireEvent.change(screen.getByTestId('feedback-message'), { target: { value: 'a bug report' } }); });
    const btn = screen.getByTestId('feedback-submit');
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(mockSubmit).toHaveBeenCalledTimes(1);
  });
});
