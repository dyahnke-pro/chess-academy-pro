import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { SidelineExplainer } from './SidelineExplainer';
import type { OpeningRecord, OpeningVariation } from '../../types';

vi.mock('../../services/contentGenerationService', () => ({
  generateSidelineExplanation: vi.fn().mockResolvedValue('This sideline is played to avoid the main line complications.'),
}));

const opening = {
  id: 'italian-game',
  name: 'Italian Game',
  pgn: 'e4 e5 Nf3 Nc6 Bc4',
  fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 3',
} as OpeningRecord;

const variation: OpeningVariation = {
  name: 'Giuoco Piano',
  pgn: 'e4 e5 Nf3 Nc6 Bc4 Bc5',
  explanation: 'Classical development',
};

const fen = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4';

describe('SidelineExplainer', () => {
  it('renders the explain button', () => {
    render(
      <SidelineExplainer opening={opening} variation={variation} fen={fen} />,
    );
    expect(screen.getByTestId('sideline-explain-btn')).toBeInTheDocument();
  });

  it('shows explanation after clicking explain', async () => {
    render(
      <SidelineExplainer opening={opening} variation={variation} fen={fen} />,
    );
    fireEvent.click(screen.getByTestId('sideline-explain-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('sideline-explanation')).toBeInTheDocument();
    });
    expect(screen.getByText(/This sideline is played/)).toBeInTheDocument();
  });

  it('closes explanation when clicked again', async () => {
    render(
      <SidelineExplainer opening={opening} variation={variation} fen={fen} />,
    );
    fireEvent.click(screen.getByTestId('sideline-explain-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('sideline-explanation')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('sideline-explain-btn'));
    expect(screen.queryByTestId('sideline-explanation')).not.toBeInTheDocument();
  });
});
