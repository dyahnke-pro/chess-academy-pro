import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import type { LessonScript } from '../../types';
import { db } from '../../db/schema';
import { remember, recallData } from '../../services/studentMemory';

vi.mock('../Chessboard/ConsistentChessboard', () => ({ ConsistentChessboard: () => null }));
vi.mock('./LessonScaffold', () => ({ LessonScaffold: () => null }));
vi.mock('../../services/voiceService', () => ({ voiceService: { speakLecture: vi.fn(() => Promise.resolve()), stop: vi.fn() } }));
vi.mock('../../hooks/useSettings', () => ({ useSettings: () => ({ settings: { voiceEnabled: false } }) }));

const started: number[] = [];
vi.mock('../../hooks/useStrictNarration', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  return {
    useStrictNarration: ({ applyStep, initialStepIndex = 0 }: { applyStep: (i: number) => void; initialStepIndex?: number }) => {
      React.useEffect(() => { started.push(initialStepIndex); applyStep(initialStepIndex); }, []);
      return { isAutoPlaying: true, isFinished: false, next: vi.fn(), prev: vi.fn(), goToStep: vi.fn(), toggleAutoPlay: vi.fn() };
    },
  };
});

import { LessonPlayer } from './LessonPlayer';

const beat = (id: string) => ({ id, moves: ['e4'], say: id });
const SCRIPT: LessonScript = {
  openingId: 'resume-test', title: 'Main', minutes: 5, orientation: 'white',
  beats: [beat('a'), beat('b'), beat('c'), beat('d'), beat('e')],
};

beforeEach(async () => { started.length = 0; db.close(); await db.delete(); await db.open(); });

describe('Watch resumes where the student left (persistent memory)', () => {
  it('starts at beat 1 with nothing remembered, and remembers the beat it applies', async () => {
    render(<LessonPlayer script={SCRIPT} onExit={() => {}} />);
    await waitFor(() => expect(started).toEqual([0]));
    await waitFor(async () => expect(await recallData('watch-beat', 'resume-test::Main')).toEqual({ beatIndex: 0, beatCount: 5 }));
  });

  it('a reopened Watch starts at the remembered beat', async () => {
    await remember('watch-beat', 'resume-test::Main', { beatIndex: 3, beatCount: 5 });
    render(<LessonPlayer script={SCRIPT} onExit={() => {}} />);
    await waitFor(() => expect(started).toEqual([3]));
  });

  it('a lesson whose beats changed starts over', async () => {
    await remember('watch-beat', 'resume-test::Main', { beatIndex: 3, beatCount: 9 });
    render(<LessonPlayer script={SCRIPT} onExit={() => {}} />);
    await waitFor(() => expect(started).toEqual([0]));
  });
});
