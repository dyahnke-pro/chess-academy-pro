import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { ReviewCitationPreviews } from './ReviewCitationPreviews';
import type { ReviewMoveCitation } from '../../services/coachFeatureService';

// The board is heavy — stub it to a marker that echoes its fen + arrows.
vi.mock('../Chessboard/ConsistentChessboard', () => ({
  ConsistentChessboard: ({ fen, arrows }: { fen: string; arrows?: { startSquare: string; endSquare: string }[] }) => (
    <div data-testid="preview-board" data-fen={fen} data-arrows={(arrows ?? []).map((a) => `${a.startSquare}${a.endSquare}`).join(',')} />
  ),
}));

function cite(overrides: Partial<ReviewMoveCitation> & { ply: number }): ReviewMoveCitation {
  return {
    moveNumber: Math.ceil(overrides.ply / 2),
    moverColor: 'white',
    playedSan: 'Qh5',
    suggestedSan: 'Nf3',
    classification: 'blunder',
    fenBefore: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    fenAfter: 'x',
    evalSwingCp: 325,
    playedSquares: ['d1', 'h5'],
    suggestedSquares: ['g1', 'f3'],
    whyBetter: null,
    whyItFailedLine: null,
    whyItFailedSquares: [],
    ...overrides,
  };
}

describe('ReviewCitationPreviews', () => {
  it('renders nothing when there are no citations', () => {
    const { container } = render(<ReviewCitationPreviews citations={[]} onJumpToPly={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a preview per citation with played + suggested SAN', () => {
    render(<ReviewCitationPreviews citations={[cite({ ply: 3 })]} onJumpToPly={() => {}} />);
    expect(screen.getByTestId('review-citation-previews')).toBeInTheDocument();
    expect(screen.getByTestId('review-citation-3')).toBeInTheDocument();
    expect(screen.getByText('Qh5')).toBeInTheDocument();
    expect(screen.getByText('Nf3')).toBeInTheDocument();
    expect(screen.getByText('Move 2')).toBeInTheDocument();
  });

  it('passes the played + suggested squares to the board as arrows', () => {
    render(<ReviewCitationPreviews citations={[cite({ ply: 3 })]} onJumpToPly={() => {}} />);
    expect(screen.getByTestId('preview-board').getAttribute('data-arrows')).toBe('d1h5,g1f3');
  });

  it('jumps to the cited ply on tap', () => {
    const onJump = vi.fn();
    render(<ReviewCitationPreviews citations={[cite({ ply: 7 })]} onJumpToPly={onJump} />);
    fireEvent.click(screen.getByTestId('review-citation-7'));
    expect(onJump).toHaveBeenCalledWith(7);
  });

  it('orders the most costly swing first', () => {
    render(
      <ReviewCitationPreviews
        citations={[
          cite({ ply: 3, evalSwingCp: 80, classification: 'inaccuracy' }),
          cite({ ply: 9, evalSwingCp: 400, classification: 'blunder' }),
        ]}
        onJumpToPly={() => {}}
      />,
    );
    const cards = screen.getAllByTestId(/review-citation-\d+/);
    expect(cards[0].getAttribute('data-testid')).toBe('review-citation-9'); // biggest swing first
  });

  it('shows the grounded "why better" line when present', () => {
    render(<ReviewCitationPreviews citations={[cite({ ply: 3, whyBetter: 'Playing Nf3 first develops with a threat.' })]} onJumpToPly={() => {}} />);
    expect(screen.getByTestId('review-citation-why-3')).toHaveTextContent('develops with a threat');
  });

  it('omits the suggestion clause when there is no engine best move', () => {
    render(<ReviewCitationPreviews citations={[cite({ ply: 3, suggestedSan: null, suggestedSquares: null })]} onJumpToPly={() => {}} />);
    expect(screen.queryByText('Nf3')).not.toBeInTheDocument();
    expect(screen.getByText('Qh5')).toBeInTheDocument();
  });
});

// ── THE REASON YOUR MOVE FAILED ─────────────────────────────────────────────
//
// 🔒 COMPUTED AND RENDERED BY NOBODY is the defect this session found four
// times: the field lands on the citation, every test passes, and the student
// never sees a word of it. The service test proves the sentence exists; this
// proves it reaches the screen, and in the right order.
describe('why the played move failed', () => {
  it('shows the reason the student\'s own move did not work', () => {
    render(<ReviewCitationPreviews
      citations={[cite({ ply: 5, whyItFailedLine: 'That hit the pawn on f7, but the king on e8 is holding it.' })]}
      onJumpToPly={() => {}}
    />);
    expect(screen.getByTestId('review-citation-failed-5')).toHaveTextContent('king on e8');
  });

  it('puts it AHEAD of why the engine\'s move was better', () => {
    // They played the move for a reason; why it failed is what they came back
    // to find out. "The stronger move was X" answers a different question.
    const { container } = render(<ReviewCitationPreviews
      citations={[cite({
        ply: 5,
        whyItFailedLine: 'The guard was holding it.',
        whyBetter: 'Nf3 develops with a threat.',
      })]}
      onJumpToPly={() => {}}
    />);
    const text = container.textContent ?? '';
    expect(text.indexOf('The guard was holding it.'))
      .toBeLessThan(text.indexOf('Nf3 develops with a threat.'));
  });

  it('renders nothing extra when the board had no geometry to name', () => {
    render(<ReviewCitationPreviews citations={[cite({ ply: 5 })]} onJumpToPly={() => {}} />);
    expect(screen.queryByTestId('review-citation-failed-5')).toBeNull();
  });
});
