import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import { ChessLessonLayout } from './ChessLessonLayout';

describe('ChessLessonLayout', () => {
  it('renders the board slot', () => {
    render(
      <ChessLessonLayout board={<div data-testid="my-board">board</div>} />,
    );
    expect(screen.getByTestId('lesson-board-slot')).toBeInTheDocument();
    expect(screen.getByTestId('my-board')).toBeInTheDocument();
  });

  it('renders header and controls slots when provided', () => {
    render(
      <ChessLessonLayout
        header={<div data-testid="my-header">title</div>}
        board={<div>board</div>}
        controls={<button data-testid="next-btn">Next</button>}
      />,
    );
    expect(screen.getByTestId('my-header')).toBeInTheDocument();
    expect(screen.getByTestId('next-btn')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-header')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-controls')).toBeInTheDocument();
  });

  it('omits optional slots when not provided', () => {
    render(<ChessLessonLayout board={<div>board</div>} />);
    expect(screen.queryByTestId('lesson-header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lesson-controls')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lesson-footer')).not.toBeInTheDocument();
  });

  it('orders slots as header → board → controls → footer', () => {
    render(
      <ChessLessonLayout
        header={<div data-testid="h">h</div>}
        board={<div data-testid="b">b</div>}
        controls={<div data-testid="c">c</div>}
        footer={<div data-testid="f">f</div>}
      />,
    );
    const root = screen.getByTestId('chess-lesson-layout');
    const slots = Array.from(root.children);
    const ids = slots.map(s => s.getAttribute('data-testid'));
    expect(ids).toEqual([
      'lesson-header',
      'lesson-board-slot',
      'lesson-controls',
      'lesson-footer',
    ]);
  });
});
