import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'framer-motion';
import { MiddlegamePlanStudy } from './MiddlegamePlanStudy';
import { buildMiddlegamePlan } from '../../test/factories';

vi.mock('react-chessboard', () => ({
  Chessboard: ({ position }: { position: string }) => (
    <div data-testid="chessboard" data-position={position} />
  ),
}));

function renderStudy(
  overrides?: Partial<Parameters<typeof MiddlegamePlanStudy>[0]>,
): ReturnType<typeof render> {
  const plan = buildMiddlegamePlan({
    title: 'Central Push',
    overview: 'White plays d4 to open the center.',
    pawnBreaks: [
      { move: 'd3-d4', explanation: 'Opens the center for White.', fen: 'start-fen' },
      { move: 'f2-f4', explanation: 'Kingside expansion.', fen: 'start-fen-2' },
    ],
    pieceManeuvers: [
      { piece: 'Knight', route: 'Nd2-f1-g3', explanation: 'Reroutes to kingside.' },
    ],
    strategicThemes: ['Control d5', 'Minority attack'],
    endgameTransitions: ['Trade into bishop endgame'],
  });

  return render(
    <MotionConfig transition={{ duration: 0 }}>
      <MiddlegamePlanStudy
        plan={plan}
        boardOrientation="white"
        onExit={vi.fn()}
        {...overrides}
      />
    </MotionConfig>,
  );
}

describe('MiddlegamePlanStudy', () => {
  it('renders the plan title and overview', () => {
    renderStudy();
    expect(screen.getByText('Central Push')).toBeInTheDocument();
    expect(screen.getByTestId('plan-overview')).toBeInTheDocument();
    expect(screen.getByText('White plays d4 to open the center.')).toBeInTheDocument();
  });

  it('shows pawn breaks when tab is clicked', async () => {
    renderStudy();
    await userEvent.click(screen.getByTestId('plan-tab-pawnBreaks'));
    expect(screen.getByTestId('plan-pawn-breaks')).toBeInTheDocument();
    expect(screen.getByText('d3-d4')).toBeInTheDocument();
    expect(screen.getByText('Opens the center for White.')).toBeInTheDocument();
  });

  it('navigates between pawn breaks', async () => {
    renderStudy();
    await userEvent.click(screen.getByTestId('plan-tab-pawnBreaks'));
    expect(screen.getByText('d3-d4')).toBeInTheDocument();

    const nextBtn = screen.getByLabelText('Next break');
    await userEvent.click(nextBtn);
    expect(screen.getByText('f2-f4')).toBeInTheDocument();

    const prevBtn = screen.getByLabelText('Previous break');
    await userEvent.click(prevBtn);
    expect(screen.getByText('d3-d4')).toBeInTheDocument();
  });

  it('shows piece maneuvers when tab is clicked', async () => {
    renderStudy();
    await userEvent.click(screen.getByTestId('plan-tab-maneuvers'));
    expect(screen.getByTestId('plan-maneuvers')).toBeInTheDocument();
    expect(screen.getByText('Knight')).toBeInTheDocument();
    expect(screen.getByText('Nd2-f1-g3')).toBeInTheDocument();
  });

  it('shows strategic themes when tab is clicked', async () => {
    renderStudy();
    await userEvent.click(screen.getByTestId('plan-tab-themes'));
    expect(screen.getByTestId('plan-themes')).toBeInTheDocument();
    expect(screen.getByText('Control d5')).toBeInTheDocument();
    expect(screen.getByText('Minority attack')).toBeInTheDocument();
  });

  it('shows endgame transitions when tab is clicked', async () => {
    renderStudy();
    await userEvent.click(screen.getByTestId('plan-tab-endgames'));
    expect(screen.getByTestId('plan-endgames')).toBeInTheDocument();
    expect(screen.getByText('Trade into bishop endgame')).toBeInTheDocument();
  });

  it('calls onExit when back button is clicked', async () => {
    const onExit = vi.fn();
    renderStudy({ onExit });
    await userEvent.click(screen.getByTestId('plan-study-back'));
    expect(onExit).toHaveBeenCalled();
  });
});
