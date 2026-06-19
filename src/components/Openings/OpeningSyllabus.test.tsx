import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OpeningSyllabus } from './OpeningSyllabus';
import type { OpeningRecord } from '../../types';
import type { CourseChapter, CourseSubline } from '../../services/openingCourse';
import type { Rung } from '../../utils/wlppLadder';

const buildCourseMock = vi.fn();
vi.mock('../../services/openingCourse', () => ({
  buildCourse: (o: OpeningRecord) => buildCourseMock(o),
}));
vi.mock('../../services/courseWhyFacts', () => ({ sublineWhyFact: () => ({ text: '' }) }));

const opening = { id: 'qgd', color: 'black' } as unknown as OpeningRecord;

const rung = (r: Rung, complete: boolean, unlocked: boolean) => ({ rung: r, label: r, complete, unlocked });
const sub = (triggerMove: string, atPly: number, pct: number): CourseSubline =>
  ({ triggerMove, atPly, pct, name: `QGD: ${triggerMove}`, moves: [], reachesMiddlegame: true, games: 100 }) as unknown as CourseSubline;

const chapter = (over: Partial<CourseChapter>): CourseChapter => ({
  n: 1, lineIndex: -1, label: 'Main Line', isMainLine: true, summary: '', completedRungs: 0, totalRungs: 4,
  percent: 0, status: 'not-started',
  rungs: [rung('watch', false, true), rung('learn', false, false), rung('practice', false, false), rung('play', false, false)],
  sublines: [],
  ...over,
} as unknown as CourseChapter);

const courseWith = (chapters: CourseChapter[]): unknown => ({ chapters });

describe('OpeningSyllabus', () => {
  beforeEach(() => buildCourseMock.mockReset());

  it('self-hides when the opening has no variations (single chapter)', () => {
    buildCourseMock.mockReturnValue(courseWith([chapter({})]));
    const { container } = render(
      <OpeningSyllabus opening={opening} selectedIndex={-1} onSelectChapter={vi.fn()} onWatchSubline={vi.fn()} onPlaySubline={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a card per variation and focuses the selected one', () => {
    buildCourseMock.mockReturnValue(courseWith([
      chapter({ n: 1, lineIndex: -1, label: 'Main Line' }),
      chapter({ n: 2, lineIndex: 0, label: 'Tartakower', isMainLine: false }),
    ]));
    render(<OpeningSyllabus opening={opening} selectedIndex={0} onSelectChapter={vi.fn()} onWatchSubline={vi.fn()} onPlaySubline={vi.fn()} />);
    expect(screen.getByTestId('syllabus-card-main')).toBeTruthy();
    expect(screen.getByTestId('syllabus-card-0').getAttribute('data-focused')).toBe('true');
    expect(screen.getByTestId('syllabus-card-main').getAttribute('data-focused')).toBe('false');
  });

  it('tapping a chapter calls onSelectChapter with the line index', () => {
    const onSelect = vi.fn();
    buildCourseMock.mockReturnValue(courseWith([
      chapter({ n: 1, lineIndex: -1, label: 'Main Line' }),
      chapter({ n: 2, lineIndex: 0, label: 'Tartakower', isMainLine: false }),
    ]));
    render(<OpeningSyllabus opening={opening} selectedIndex={-1} onSelectChapter={onSelect} onWatchSubline={vi.fn()} onPlaySubline={vi.fn()} />);
    fireEvent.click(screen.getByTestId('syllabus-select-0'));
    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it('shows WLPP status (not launchers) and a locked rung carries a lock', () => {
    buildCourseMock.mockReturnValue(courseWith([
      chapter({ n: 1, lineIndex: -1 }),
      chapter({ n: 2, lineIndex: 0, isMainLine: false }),
    ]));
    render(<OpeningSyllabus opening={opening} selectedIndex={-1} onSelectChapter={vi.fn()} onWatchSubline={vi.fn()} onPlaySubline={vi.fn()} />);
    const status = screen.getByTestId('syllabus-status-main');
    // status pills are spans, not buttons
    expect(status.querySelectorAll('button').length).toBe(0);
    expect(status.textContent).toContain('Learn');
  });

  it('expands deviations on tap and fires Watch/Play with the subline + line', () => {
    const onWatch = vi.fn();
    const onPlay = vi.fn();
    buildCourseMock.mockReturnValue(courseWith([
      chapter({ n: 1, lineIndex: -1 }),
      chapter({ n: 2, lineIndex: 0, isMainLine: false, sublines: [sub('cxd5', 8, 54)] }),
    ]));
    render(<OpeningSyllabus opening={opening} selectedIndex={-1} onSelectChapter={vi.fn()} onWatchSubline={onWatch} onPlaySubline={onPlay} />);
    fireEvent.click(screen.getByTestId('syllabus-select-0'));
    fireEvent.click(screen.getByTestId('syllabus-subline-watch-0-8-cxd5'));
    fireEvent.click(screen.getByTestId('syllabus-subline-play-0-8-cxd5'));
    expect(onWatch).toHaveBeenCalledWith(expect.objectContaining({ triggerMove: 'cxd5' }), 0);
    expect(onPlay).toHaveBeenCalledWith(expect.objectContaining({ triggerMove: 'cxd5' }), 0);
  });
});
