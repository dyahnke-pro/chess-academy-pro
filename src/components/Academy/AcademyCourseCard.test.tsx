import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { AcademyCourseCard } from './AcademyCourseCard';
import { buildOpeningRecord } from '../../test/factories';
import { MAIN_LINE_INDEX } from '../../utils/wlppLadder';

function opening(overrides = {}) {
  return buildOpeningRecord({
    id: 'card-test',
    eco: 'B12',
    name: 'Caro-Kann Defence',
    color: 'black',
    style: 'solid',
    variations: [
      { name: 'Advance', pgn: '1.e4 c6 2.d4 d5 3.e5', explanation: 'space' },
      { name: 'Exchange', pgn: '1.e4 c6 2.d4 d5 3.exd5', explanation: 'symmetry' },
    ],
    ...overrides,
  });
}

describe('AcademyCourseCard', () => {
  it('shows "Start course" and 0% when nothing is done', () => {
    render(<AcademyCourseCard opening={opening()} onOpen={() => {}} />);
    expect(screen.getByText('Start course')).toBeInTheDocument();
    // 3 chapters: main line + 2 variations; none complete.
    expect(screen.getByTestId('academy-course-chapters-card-test')).toHaveTextContent('0/3 chapters · 0%');
  });

  it('shows a Resume CTA pointing at the current chapter when partway through', () => {
    // Main line fully done (chapter 1 complete) → current chapter is 2.
    const all = [MAIN_LINE_INDEX];
    render(
      <AcademyCourseCard
        opening={opening({
          linesDiscovered: all, linesLearned: all, linesPerfected: all, linesPlayed: all,
        })}
        onOpen={() => {}}
      />,
    );
    expect(screen.getByText('Resume · Chapter 2')).toBeInTheDocument();
    expect(screen.getByTestId('academy-course-chapters-card-test')).toHaveTextContent('1/3 chapters');
  });

  it('shows Review + the complete badge when every chapter is done', () => {
    const all = [MAIN_LINE_INDEX, 0, 1];
    render(
      <AcademyCourseCard
        opening={opening({
          linesDiscovered: all, linesLearned: all, linesPerfected: all, linesPlayed: all,
        })}
        onOpen={() => {}}
      />,
    );
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByTestId('academy-course-complete-card-test')).toBeInTheDocument();
    expect(screen.getByTestId('academy-course-chapters-card-test')).toHaveTextContent('3/3 chapters · 100%');
  });

  it('fires onOpen when tapped', () => {
    const onOpen = vi.fn();
    render(<AcademyCourseCard opening={opening()} onOpen={onOpen} />);
    fireEvent.click(screen.getByTestId('academy-course-card-test'));
    expect(onOpen).toHaveBeenCalledOnce();
  });
});
