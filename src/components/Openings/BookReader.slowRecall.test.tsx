import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

vi.mock('../../services/voiceService', async () => {
  const { buildVoiceServiceMock } = await import('../../test/mocks/voice-service');
  return { voiceService: buildVoiceServiceMock() };
});

const page = (t: string) => ({ text: t, author: 'Capablanca', bookTitle: 'Chess Fundamentals', gutenbergId: 33870 });
vi.mock('../../services/chessConceptService', () => ({
  getOpeningBookPages: () => [page('One.'), page('Two.'), page('Three.')],
  getConceptBookGroups: () => [],
}));

// The recall answers only when the test says so, the way a loaded device's
// IndexedDB does (ship-check 2026-10-20: the page turned before it landed was
// never saved).
let answerRecall: (v: null) => void = () => undefined;
const remember = vi.fn(() => Promise.resolve());
vi.mock('../../services/studentMemory', () => ({
  recallData: () => new Promise((r) => { answerRecall = r; }),
  remember: (...a: unknown[]) => remember(...(a as [])),
}));

import { BookReader } from './BookReader';

describe('a page turned before the saved page loads is still saved', () => {
  it('writes the turn once the recall lands', async () => {
    render(<BookReader openingName="Test Opening" />);
    await waitFor(() => expect(screen.getByTestId('book-reader-page-count')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('book-reader-next'));
    expect(remember).not.toHaveBeenCalled();
    await act(async () => { answerRecall(null); await Promise.resolve(); });
    await waitFor(() => expect(remember).toHaveBeenCalledWith('book-page', 'Test Opening', { activeIdx: 0, page: 1 }));
  });
});
