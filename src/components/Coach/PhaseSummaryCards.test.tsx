import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhaseSummaryCards } from './PhaseSummaryCards';
import type { PhaseAccuracy, GamePhase } from '../../types';

const phaseBreakdown: PhaseAccuracy[] = [
  { phase: 'opening', accuracy: 85, moveCount: 10, mistakes: 1 },
  { phase: 'middlegame', accuracy: 62, moveCount: 20, mistakes: 3 },
  { phase: 'endgame', accuracy: 45, moveCount: 8, mistakes: 2 },
];

describe('PhaseSummaryCards', () => {
  it('renders all three phase cards', () => {
    render(
      <PhaseSummaryCards
        phaseBreakdown={phaseBreakdown}
        phaseDetails={{}}
        loadingPhase={null}
        onRequestDetail={vi.fn()}
      />,
    );
    expect(screen.getByTestId('phase-card-opening')).toBeInTheDocument();
    expect(screen.getByTestId('phase-card-middlegame')).toBeInTheDocument();
    expect(screen.getByTestId('phase-card-endgame')).toBeInTheDocument();
  });

  it('displays phase labels', () => {
    render(
      <PhaseSummaryCards
        phaseBreakdown={phaseBreakdown}
        phaseDetails={{}}
        loadingPhase={null}
        onRequestDetail={vi.fn()}
      />,
    );
    expect(screen.getByText('Opening')).toBeInTheDocument();
    expect(screen.getByText('Middlegame')).toBeInTheDocument();
    expect(screen.getByText('Endgame')).toBeInTheDocument();
  });

  it('displays accuracy percentages', () => {
    render(
      <PhaseSummaryCards
        phaseBreakdown={phaseBreakdown}
        phaseDetails={{}}
        loadingPhase={null}
        onRequestDetail={vi.fn()}
      />,
    );
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('62%')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('displays mistake counts', () => {
    render(
      <PhaseSummaryCards
        phaseBreakdown={phaseBreakdown}
        phaseDetails={{}}
        loadingPhase={null}
        onRequestDetail={vi.fn()}
      />,
    );
    expect(screen.getByText('1 mistake')).toBeInTheDocument();
    expect(screen.getByText('3 mistakes')).toBeInTheDocument();
    expect(screen.getByText('2 mistakes')).toBeInTheDocument();
  });

  it('skips phases with zero moves', () => {
    const partial: PhaseAccuracy[] = [
      { phase: 'opening', accuracy: 80, moveCount: 10, mistakes: 0 },
      { phase: 'middlegame', accuracy: 70, moveCount: 0, mistakes: 0 },
      { phase: 'endgame', accuracy: 60, moveCount: 5, mistakes: 1 },
    ];
    render(
      <PhaseSummaryCards
        phaseBreakdown={partial}
        phaseDetails={{}}
        loadingPhase={null}
        onRequestDetail={vi.fn()}
      />,
    );
    expect(screen.getByTestId('phase-card-opening')).toBeInTheDocument();
    expect(screen.queryByTestId('phase-card-middlegame')).not.toBeInTheDocument();
    expect(screen.getByTestId('phase-card-endgame')).toBeInTheDocument();
  });

  it('calls onRequestDetail when expanding a phase without detail', () => {
    const handler = vi.fn();
    render(
      <PhaseSummaryCards
        phaseBreakdown={phaseBreakdown}
        phaseDetails={{}}
        loadingPhase={null}
        onRequestDetail={handler}
      />,
    );
    fireEvent.click(screen.getByText('Opening'));
    expect(handler).toHaveBeenCalledWith('opening');
  });

  it('does not call onRequestDetail when detail already loaded', () => {
    const handler = vi.fn();
    render(
      <PhaseSummaryCards
        phaseBreakdown={phaseBreakdown}
        phaseDetails={{ opening: 'Great opening play!' }}
        loadingPhase={null}
        onRequestDetail={handler}
      />,
    );
    fireEvent.click(screen.getByText('Opening'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('shows loading indicator when phase is being analyzed', () => {
    render(
      <PhaseSummaryCards
        phaseBreakdown={phaseBreakdown}
        phaseDetails={{}}
        loadingPhase={'opening' as GamePhase}
        onRequestDetail={vi.fn()}
      />,
    );
    // Expand opening card
    fireEvent.click(screen.getByText('Opening'));
    expect(screen.getByText(/Analyzing opening/i)).toBeInTheDocument();
  });

  it('shows detail text when available and expanded', () => {
    render(
      <PhaseSummaryCards
        phaseBreakdown={phaseBreakdown}
        phaseDetails={{ opening: 'You developed your pieces efficiently.' }}
        loadingPhase={null}
        onRequestDetail={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Opening'));
    expect(screen.getByTestId('phase-detail-opening')).toBeInTheDocument();
    expect(screen.getByText('You developed your pieces efficiently.')).toBeInTheDocument();
  });

  it('collapses when clicking an expanded phase', () => {
    render(
      <PhaseSummaryCards
        phaseBreakdown={phaseBreakdown}
        phaseDetails={{ opening: 'Detail text' }}
        loadingPhase={null}
        onRequestDetail={vi.fn()}
      />,
    );
    // Expand
    fireEvent.click(screen.getByText('Opening'));
    expect(screen.getByTestId('phase-detail-opening')).toBeInTheDocument();
    // Collapse
    fireEvent.click(screen.getByText('Opening'));
    expect(screen.queryByTestId('phase-detail-opening')).not.toBeInTheDocument();
  });
});
