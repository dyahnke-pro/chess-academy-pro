import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { Chess } from 'chess.js';
import { ReplyTree } from './ReplyTree';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';
import { positionOf } from '../../utils/samePosition';
import type { OpeningRecord } from '../../types';
import type { ChapterSubline } from '../../services/openingCourse';
import type { ClubReplyRecord } from '../../services/clubReplies';

// buildCourse is exercised elsewhere; here its output is controlled so the
// tree's own behaviour (grouping by move, numbering, tags, open) is tested.
const buildCourseMock = vi.fn();
vi.mock('../../services/openingCourse', () => ({
  buildCourse: (o: OpeningRecord) => buildCourseMock(o),
  sublinesForOpening: () => ({}),
}));
vi.mock('../../data/lessons/sublineNarration', () => ({
  getSublineNarration: () => null,
}));
// The replies built from the games arrive after mount; controlled here too.
const builtMock = vi.fn((): Promise<unknown[]> => Promise.resolve([]));
vi.mock('../../services/builtReplies', () => ({
  builtRepliesFor: () => builtMock(),
  tabLineSans: () => ADV,
  replyFloorPly: () => 4,
}));
// The club replies file and the student's own games, controlled too.
const clubMock = vi.fn((): Promise<ClubReplyRecord[]> => Promise.resolve([]));
vi.mock('../../services/clubReplies', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/clubReplies')>()),
  clubRepliesOf: () => clubMock(),
}));
const auditMock = vi.fn();
vi.mock('../../services/appAuditor', () => ({
  logAppAudit: (e: unknown) => { auditMock(e); return Promise.resolve(); },
}));
const facedMock = vi.fn((): Promise<Map<string, Map<string, number>>> => Promise.resolve(new Map()));
vi.mock('../../services/facedReplies', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/facedReplies')>()),
  facedRepliesIndex: () => facedMock(),
}));

const opening = { id: 'caro-kann', color: 'black' } as unknown as OpeningRecord;
const ADV = ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5'];
const AFTER_ADV = ((): string => { const c = new Chess(); for (const s of ADV) c.move(s); return positionOf(c.fen()); })();
const clubRec = (san: string, cont: string[], reach: Record<string, number>): ClubReplyRecord =>
  ({ board: AFTER_ADV, san, cont, games: 1000, pct: 3, reach, endCp: 20, middlegame: true });
const sub = (triggerMove: string, pct: number, name = 'Caro-Kann Defense: Advance Variation, Short Variation'): ChapterSubline =>
  ({ tab: 1, triggerMove, atPly: 6, pct, name, moves: [...ADV, triggerMove], reachesMiddlegame: true, games: 100 }) as unknown as ChapterSubline;
const courseWith = (lineIndex: number, sublines: ChapterSubline[]): unknown => ({ chapters: [{ lineIndex, sublines }] });

describe('ReplyTree', () => {
  beforeEach(() => {
    buildCourseMock.mockReset(); builtMock.mockReset(); builtMock.mockResolvedValue([]);
    clubMock.mockReset(); clubMock.mockResolvedValue([]);
    facedMock.mockReset(); facedMock.mockResolvedValue(new Map());
    useAppStore.setState({ activeProfile: buildUserProfile({ currentRating: 1100 }) });
    auditMock.mockReset();
  });

  it('self-hides when the line has no replies', () => {
    buildCourseMock.mockReturnValue(courseWith(1, []));
    const { container } = render(<ReplyTree opening={opening} lineIndex={1} onOpen={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('groups replies under the move they answer, numbered, most played first', () => {
    buildCourseMock.mockReturnValue(courseWith(1, [sub('c3', 32), sub('Bd3', 36), sub('h4', 20)]));
    render(<ReplyTree opening={opening} lineIndex={1} onOpen={vi.fn()} />);
    const group = screen.getByTestId('reply-group-6');
    expect(group.textContent).toContain('After 3…Bf5');
    const rows = group.querySelectorAll('[data-testid^="reply-6-"]');
    expect([...rows].map((r) => r.querySelector('.font-mono')?.textContent)).toEqual(['4.Bd3', '4.c3', '4.h4']);
  });

  it('tags the most played reply Main and the rest Sideline', () => {
    buildCourseMock.mockReturnValue(courseWith(1, [sub('Bd3', 36), sub('c3', 32)]));
    render(<ReplyTree opening={opening} lineIndex={1} onOpen={vi.fn()} />);
    expect(screen.getByTestId('reply-6-Bd3').textContent).toContain('Main');
    expect(screen.getByTestId('reply-6-c3').textContent).toContain('Sideline');
  });

  it('opens the reply with its line and whether it leads its group', () => {
    const onOpen = vi.fn();
    buildCourseMock.mockReturnValue(courseWith(1, [sub('Bd3', 36), sub('c3', 32)]));
    render(<ReplyTree opening={opening} lineIndex={1} onOpen={onOpen} />);
    fireEvent.click(screen.getByTestId('reply-6-c3'));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ triggerMove: 'c3' }), 1, false);
  });

  it('adds the replies built from the games after the curated ones, never one twice', async () => {
    buildCourseMock.mockReturnValue(courseWith(1, [sub('Bd3', 36)]));
    builtMock.mockResolvedValue([
      { triggerMove: 'Bd3', atPly: 6, pct: 36, games: 100, name: '', moves: [...ADV, 'Bd3'], reachesMiddlegame: true },
      { triggerMove: 'Nf3', atPly: 6, pct: 30, games: 90, name: '', moves: [...ADV, 'Nf3'], reachesMiddlegame: true },
    ]);
    render(<ReplyTree opening={opening} lineIndex={1} onOpen={vi.fn()} />);
    expect(await screen.findByTestId('reply-6-Nf3')).toBeTruthy();
    expect(screen.getAllByTestId('reply-6-Bd3')).toHaveLength(1);
  });

  // WO-COURSE-01 D — the replies club players make that no taught line covers.
  const C3 = clubRec('c3', ['e6', 'Be2', 'c5'], { '1000,1200': 1, '1400,1600': 3, '1800,2000': 9 });
  const H4 = clubRec('h4', ['h5', 'c4', 'e6'], { '1000,1200': 5, '1400,1600': 2, '1800,2000': 0.5 });
  const rowOrder = (): string[] => [...screen.getByTestId('reply-group-6').querySelectorAll('[data-testid^="reply-6-"]')]
    .map((r) => r.querySelector('.font-mono')?.textContent ?? '');

  it('adds the club replies after the course\'s, tagged Club, ordered by the student\'s band', async () => {
    buildCourseMock.mockReturnValue(courseWith(1, [sub('Bd3', 36)]));
    clubMock.mockResolvedValue([C3, H4]);
    const { unmount } = render(<ReplyTree opening={opening} lineIndex={1} onOpen={vi.fn()} />);
    expect(await screen.findByTestId('reply-6-h4')).toBeTruthy();
    expect(rowOrder()).toEqual(['4.Bd3', '4.h4', '4.c3']);
    expect(within(screen.getByTestId('reply-6-h4')).getByTestId('reply-tag-club')).toBeTruthy();
    expect(within(screen.getByTestId('reply-6-Bd3')).getByTestId('reply-tag-main')).toBeTruthy();
    // The order is observable: one audit row says what was chosen, for which band.
    const row = auditMock.mock.calls.map(([e]) => e as { kind: string; details: string }).find((e) => e.kind === 'club-replies-ordered');
    expect(JSON.parse(row?.details ?? '{}')).toMatchObject({
      openingId: 'caro-kann', lineIndex: 1, band: '1000,1200', shown: 2, met: 0,
      rows: [{ group: '6', san: 'h4', reach: 5, met: 0 }, { group: '6', san: 'c3', reach: 1, met: 0 }],
    });
    unmount();
    // A stronger student meets them in the other order.
    useAppStore.setState({ activeProfile: buildUserProfile({ currentRating: 1900 }) });
    render(<ReplyTree opening={opening} lineIndex={1} onOpen={vi.fn()} />);
    expect(await screen.findByTestId('reply-6-h4')).toBeTruthy();
    expect(rowOrder()).toEqual(['4.Bd3', '4.c3', '4.h4']);
  });

  it('puts a reply the student met in their own games first, and says so', async () => {
    buildCourseMock.mockReturnValue(courseWith(1, [sub('Bd3', 36)]));
    clubMock.mockResolvedValue([C3, H4]);
    facedMock.mockResolvedValue(new Map([[AFTER_ADV, new Map([['c3', 2]])]]));
    render(<ReplyTree opening={opening} lineIndex={1} onOpen={vi.fn()} />);
    expect(await screen.findByTestId('reply-met-6-c3')).toBeTruthy();
    expect(rowOrder()).toEqual(['4.c3', '4.Bd3', '4.h4']);
    // Met first is an order, not a promotion: the course's top reply stays Main.
    expect(within(screen.getByTestId('reply-6-Bd3')).getByTestId('reply-tag-main')).toBeTruthy();
  });

  it('opens a club reply with its whole line and its club facts', async () => {
    const onOpen = vi.fn();
    buildCourseMock.mockReturnValue(courseWith(1, [sub('Bd3', 36)]));
    clubMock.mockResolvedValue([H4]);
    render(<ReplyTree opening={opening} lineIndex={1} onOpen={onOpen} />);
    fireEvent.click(await screen.findByTestId('reply-6-h4'));
    expect(onOpen).toHaveBeenCalledWith(
      expect.objectContaining({ triggerMove: 'h4', tab: 1, atPly: 6, moves: [...ADV, 'h4', 'h5', 'c4', 'e6'], club: expect.objectContaining({ reach: 5 }) }),
      1,
      false,
    );
  });
});
