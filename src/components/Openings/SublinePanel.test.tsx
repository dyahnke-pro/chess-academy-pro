import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SublinePanel } from './SublinePanel';
import type { OpeningRecord } from '../../types';
import type { CourseSubline } from '../../services/openingCourse';

// buildCourse is exercised heavily elsewhere; here we control its output so the
// panel's own behaviour (self-hide on empty, list + Watch/Play wiring, show-more)
// is tested in isolation.
const buildCourseMock = vi.fn();
vi.mock('../../services/openingCourse', () => ({
  buildCourse: (o: OpeningRecord) => buildCourseMock(o),
}));
vi.mock('../../services/courseWhyFacts', () => ({
  sublineWhyFact: () => ({ text: '' }),
}));

const opening = { id: 'kings-indian-defence', color: 'black' } as unknown as OpeningRecord;
const sub = (triggerMove: string, atPly: number, pct: number): CourseSubline =>
  ({ triggerMove, atPly, pct, name: `Test: ${triggerMove} line`, moves: [], reachesMiddlegame: true, games: 100 }) as unknown as CourseSubline;

const courseWith = (lineIndex: number, sublines: CourseSubline[]): unknown => ({
  chapters: [{ lineIndex, sublines }],
});

describe('SublinePanel', () => {
  beforeEach(() => buildCourseMock.mockReset());

  it('self-hides (renders null) when the line has no sublines', () => {
    buildCourseMock.mockReturnValue(courseWith(0, []));
    const { container } = render(
      <SublinePanel opening={opening} lineIndex={0} onWatch={vi.fn()} onPlay={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('self-hides on the main line (no matching chapter)', () => {
    buildCourseMock.mockReturnValue(courseWith(0, [sub('b4', 16, 42)]));
    const { container } = render(
      <SublinePanel opening={opening} lineIndex={-1} onWatch={vi.fn()} onPlay={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('lists the deviations and fires Watch/Play with the subline + line index', () => {
    const onWatch = vi.fn();
    const onPlay = vi.fn();
    buildCourseMock.mockReturnValue(courseWith(2, [sub('h3', 10, 13)]));
    render(<SublinePanel opening={opening} lineIndex={2} onWatch={onWatch} onPlay={onPlay} />);
    expect(screen.getByTestId('subline-panel')).toBeTruthy();
    fireEvent.click(screen.getByTestId('subline-watch-10-h3'));
    fireEvent.click(screen.getByTestId('subline-play-10-h3'));
    expect(onWatch).toHaveBeenCalledWith(expect.objectContaining({ triggerMove: 'h3' }), 2);
    expect(onPlay).toHaveBeenCalledWith(expect.objectContaining({ triggerMove: 'h3' }), 2);
  });

  it('collapses past 3 deviations and expands via show-more', () => {
    buildCourseMock.mockReturnValue(courseWith(0, [
      sub('a', 10, 30), sub('b', 11, 20), sub('c', 12, 15), sub('d', 13, 10), sub('e', 14, 5),
    ]));
    render(<SublinePanel opening={opening} lineIndex={0} onWatch={vi.fn()} onPlay={vi.fn()} />);
    expect(screen.queryByTestId('subline-watch-13-d')).toBeNull();
    fireEvent.click(screen.getByTestId('subline-toggle'));
    expect(screen.getByTestId('subline-watch-13-d')).toBeTruthy();
  });
});
