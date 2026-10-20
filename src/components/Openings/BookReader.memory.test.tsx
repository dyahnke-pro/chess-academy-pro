import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { db } from '../../db/schema';

vi.mock('../../services/voiceService', async () => {
  const { buildVoiceServiceMock } = await import('../../test/mocks/voice-service');
  return { voiceService: buildVoiceServiceMock() };
});

const page = (t: string) => ({ text: t, author: 'Capablanca', bookTitle: 'Chess Fundamentals', gutenbergId: 33870 });
vi.mock('../../services/chessConceptService', () => ({
  getOpeningBookPages: () => [page('One.'), page('Two.'), page('Three.')],
  getConceptBookGroups: () => [],
}));

import { BookReader } from './BookReader';

beforeEach(async () => { db.close(); await db.delete(); await db.open(); });

describe('BookReader remembers the page (persistent memory)', () => {
  it('reopens on the page the student left', async () => {
    render(<BookReader openingName="Test Opening" />);
    await waitFor(() => expect(screen.getByTestId('book-reader-page-count')).toBeInTheDocument());
    const total = screen.getByTestId('book-reader-page-count').textContent?.split('/')[1];
    fireEvent.click(screen.getByTestId('book-reader-next'));
    await waitFor(() => expect(screen.getByTestId('book-reader-page-count').textContent).toBe(`2/${total}`));
    // An IndexedDB write, not a render: under a loaded full-suite run it can
    // outlast waitFor's 1 s default (it passed alone and failed in ship-check).
    await waitFor(async () => expect((await db.studentMemory.get('book-page:Test Opening'))?.data).toEqual({ activeIdx: 0, page: 1 }), { timeout: 5000 });
    cleanup();
    db.close(); await db.open();
    render(<BookReader openingName="Test Opening" />);
    await waitFor(() => expect(screen.getByTestId('book-reader-page-count').textContent).toBe(`2/${total}`), { timeout: 5000 });
  });
});
