import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { db } from '../../db/schema';
import { rememberTrendPoint } from '../../services/studentMemory';
import { AdaptiveSessionSummary } from './AdaptiveSessionSummary';
import type { AdaptiveSessionSummary as SummaryData } from '../../services/adaptivePuzzleService';

const summary = (bestStreak: number): SummaryData => ({
  puzzlesSolved: 5, puzzlesFailed: 1, totalPuzzles: 6, accuracy: 0.8, bestStreak,
  startRating: 1200, endRating: 1230, ratingHistory: [1200, 1230], weakestThemes: [], duration: 60,
});

beforeEach(async () => { db.close(); await db.delete(); await db.open(); });

describe('AdaptiveSessionSummary — progress across sessions (persistent memory)', () => {
  it('names the all-time best streak when this session fell short of it', async () => {
    render(<AdaptiveSessionSummary summary={summary(7)} onBackToSelect={() => {}} onPlayAgain={() => {}} />);
    await waitFor(() => expect(screen.getByTestId('summary-best-ever').textContent).toMatch(/new all-time best/));
    cleanup();
    db.close(); await db.open();
    render(<AdaptiveSessionSummary summary={summary(3)} onBackToSelect={() => {}} onPlayAgain={() => {}} />);
    await waitFor(() => expect(screen.getByTestId('summary-best-ever').textContent).toBe('All-time best streak: 7'));
  });

  it('shows the rating across days', async () => {
    await rememberTrendPoint('puzzle-rating', 1180, Date.UTC(2026, 9, 1));
    await rememberTrendPoint('puzzle-rating', 1230, Date.UTC(2026, 9, 2));
    render(<AdaptiveSessionSummary summary={summary(3)} onBackToSelect={() => {}} onPlayAgain={() => {}} />);
    await waitFor(() => expect(screen.getByTestId('summary-days').textContent).toContain('10-01: 1180'));
  });
});
