import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { CourseSyllabusPage } from './CourseSyllabusPage';
import { buildOpeningRecord } from '../../test/factories';
import { MAIN_LINE_INDEX } from '../../utils/wlppLadder';

vi.mock('../../services/openingService', () => ({ getOpeningById: vi.fn() }));
import { getOpeningById } from '../../services/openingService';
const mockGet = vi.mocked(getOpeningById);

function renderAt(id: string): void {
  render(
    <MemoryRouter initialEntries={[`/academy/course/${id}`]}>
      <MotionConfig transition={{ duration: 0 }}>
        <Routes>
          <Route path="/academy/course/:id" element={<CourseSyllabusPage />} />
        </Routes>
      </MotionConfig>
    </MemoryRouter>,
  );
}

function opening(overrides = {}) {
  return buildOpeningRecord({
    id: 'caro', eco: 'B12', name: 'Caro-Kann Defence', color: 'black',
    overview: 'A solid answer to e4.',
    variations: [
      { name: 'Advance', pgn: '1.e4 c6 2.d4 d5 3.e5', explanation: 'space' },
      { name: 'Exchange', pgn: '1.e4 c6 2.d4 d5 3.exd5', explanation: 'symmetry' },
    ],
    ...overrides,
  });
}

describe('CourseSyllabusPage', () => {
  beforeEach(() => mockGet.mockReset());

  it('renders the cover, progress, Start CTA, and a numbered chapter per line', async () => {
    mockGet.mockResolvedValue(opening());
    renderAt('caro');
    expect(await screen.findByTestId('course-cover')).toHaveTextContent('Caro-Kann Defence');
    expect(screen.getByTestId('course-progress-label')).toHaveTextContent('Chapter 1 of 3 · 0%');
    expect(screen.getByTestId('course-resume')).toHaveTextContent('Start course');
    // main line + 2 variations = chapters 1..3
    expect(screen.getByTestId('course-chapter-1')).toBeInTheDocument();
    expect(screen.getByTestId('course-chapter-3')).toHaveTextContent('Exchange');
  });

  it('shows the finish line and a Review CTA when every chapter is complete', async () => {
    const all = [MAIN_LINE_INDEX, 0, 1];
    mockGet.mockResolvedValue(opening({
      linesDiscovered: all, linesLearned: all, linesPerfected: all, linesPlayed: all,
    }));
    renderAt('caro');
    expect(await screen.findByTestId('course-finish-line')).toBeInTheDocument();
    expect(screen.getByTestId('course-resume')).toHaveTextContent('Review the course');
    expect(screen.getByTestId('course-progress-label')).toHaveTextContent('100%');
  });

  it('renders a chapter\'s sublines ("They might play") when the data has them', async () => {
    mockGet.mockResolvedValue(opening({ id: 'caro-kann' }));
    renderAt('caro-kann');
    // chapter 2 = first variation (index 0), which carries sublines for caro-kann
    const subs = await screen.findByTestId('course-sublines-2');
    expect(subs).toHaveTextContent('They might play');
  });

  it('shows a not-found state for a missing course', async () => {
    mockGet.mockResolvedValue(undefined);
    renderAt('nope');
    expect(await screen.findByTestId('course-notfound')).toBeInTheDocument();
  });
});
