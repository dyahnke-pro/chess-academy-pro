import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReplyTree } from './ReplyTree';
import type { OpeningRecord } from '../../types';
import type { CourseSubline } from '../../services/openingCourse';

// buildCourse is exercised elsewhere; here its output is controlled so the
// tree's own behaviour (grouping by move, numbering, tags, open) is tested.
const buildCourseMock = vi.fn();
vi.mock('../../services/openingCourse', () => ({
  buildCourse: (o: OpeningRecord) => buildCourseMock(o),
}));
vi.mock('../../data/lessons/sublineNarration', () => ({
  getSublineNarration: () => null,
}));

const opening = { id: 'caro-kann', color: 'black' } as unknown as OpeningRecord;
const ADV = ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5'];
const sub = (triggerMove: string, pct: number, name = 'Caro-Kann Defense: Advance Variation, Short Variation'): CourseSubline =>
  ({ triggerMove, atPly: 6, pct, name, moves: [...ADV, triggerMove], reachesMiddlegame: true, games: 100 }) as unknown as CourseSubline;
const courseWith = (lineIndex: number, sublines: CourseSubline[]): unknown => ({ chapters: [{ lineIndex, sublines }] });

describe('ReplyTree', () => {
  beforeEach(() => buildCourseMock.mockReset());

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
});
