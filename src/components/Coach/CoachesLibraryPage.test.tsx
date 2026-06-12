import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../test/utils';
import { CoachesLibraryPage } from './CoachesLibraryPage';

// Drive the reader's "current paragraph" by hand so we can assert the
// follow-along scroll fires for the right element. `mockCurrentId` is mutated
// between renders to simulate the voice moving through the page.
let mockCurrentId: string | null = null;
const playFrom = vi.fn();
vi.mock('../../hooks/useProseReader', () => ({
  useProseReader: () => ({
    currentId: mockCurrentId,
    isPlaying: mockCurrentId !== null,
    playFrom,
    playOne: vi.fn(),
    toggle: vi.fn(),
    stop: vi.fn(),
  }),
}));

// JSDOM has no layout engine — stub scrollIntoView and capture call args.
const scrollIntoView = vi.fn();
Element.prototype.scrollIntoView = scrollIntoView as unknown as typeof Element.prototype.scrollIntoView;

// Open the reader at the Capablanca middle-game Example 11 page (pageIndex 3),
// which prints a diagram (a living board) and has a single paragraph.
async function openBoardPage(): Promise<void> {
  render(<CoachesLibraryPage />);
  fireEvent.change(screen.getByTestId('library-search-input'), { target: { value: 'uncovers' } });
  const hit = await screen.findByTestId('library-search-hit-capablanca-chess-fundamentals-3');
  fireEvent.click(hit);
  await screen.findByTestId('library-living-board');
}

describe('CoachesLibraryPage follow-along scroll', () => {
  beforeEach(() => {
    mockCurrentId = null;
    scrollIntoView.mockClear();
    playFrom.mockClear();
  });

  it('focuses the living board when the diagram paragraph is read', async () => {
    // The single paragraph on this page IS the last paragraph and the page has
    // a board, so the reader should center the board (illustration focus).
    mockCurrentId = 'cf-mg-ex11-p0-c0';
    await openBoardPage();

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    const lastArgs = scrollIntoView.mock.calls.at(-1)?.[0];
    expect(lastArgs).toMatchObject({ block: 'center' });
  });

  it('scrolls the active paragraph to the top as it is read (no diagram cue)', async () => {
    // Page cf-2 has no board and 14 paragraphs; reading its first paragraph
    // (not the last, no diagram) scrolls the words to the top so the student
    // follows along without scrolling their phone.
    mockCurrentId = 'cf-2-p0-c0';
    render(<CoachesLibraryPage />);
    fireEvent.change(screen.getByTestId('library-search-input'), { target: { value: 'combination' } });
    fireEvent.click(await screen.findByTestId('library-search-hit-capablanca-chess-fundamentals-2'));
    await screen.findByTestId('library-page');

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    const lastArgs = scrollIntoView.mock.calls.at(-1)?.[0];
    expect(lastArgs).toMatchObject({ block: 'start' });
  });
});
