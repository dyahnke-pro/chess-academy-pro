import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../test/utils';
import { ChessLessonLayout } from './ChessLessonLayout';

describe('ChessLessonLayout', () => {
  it('renders the board, controls, and required slots', () => {
    render(
      <ChessLessonLayout
        board={<div data-testid="board-content">BOARD</div>}
        controls={<div data-testid="controls-content">CTRLS</div>}
      />,
    );
    expect(screen.getByTestId('board-content')).toBeInTheDocument();
    expect(screen.getByTestId('controls-content')).toBeInTheDocument();
  });

  it('renders the optional header, aboveBoard, and belowControls slots', () => {
    render(
      <ChessLessonLayout
        header={<div data-testid="hdr">H</div>}
        aboveBoard={<div data-testid="above">A</div>}
        board={<div>B</div>}
        controls={<div>C</div>}
        belowControls={<div data-testid="below">L</div>}
      />,
    );
    expect(screen.getByTestId('hdr')).toBeInTheDocument();
    expect(screen.getByTestId('above')).toBeInTheDocument();
    expect(screen.getByTestId('below')).toBeInTheDocument();
  });

  it('reserves bottom-nav clearance by default (safe-area-aware padding)', () => {
    render(<ChessLessonLayout board={<div>B</div>} controls={<div>C</div>} />);
    const root = screen.getByTestId('chess-lesson-layout');
    // The root applies the calc()-based padding class used for the mobile nav offset
    expect(root.className).toMatch(/pb-\[calc\(4\.5rem\+env\(safe-area-inset-bottom/);
  });

  it('omits bottom-nav clearance when reserveBottomNav=false', () => {
    render(
      <ChessLessonLayout
        board={<div>B</div>}
        controls={<div>C</div>}
        reserveBottomNav={false}
      />,
    );
    const root = screen.getByTestId('chess-lesson-layout');
    expect(root.className).not.toMatch(/safe-area-inset-bottom/);
  });

  it('caps the board height responsively to leave room for controls', () => {
    render(<ChessLessonLayout board={<div>B</div>} controls={<div>C</div>} />);
    const boardSlot = screen.getByTestId('chess-lesson-board');
    // The cap must be present so very tall viewports (or short ones) don't push
    // controls off-screen
    expect(boardSlot.className).toMatch(/max-h-\[min\(60vh,440px\)\]/);
  });

  it('renders the optional belowBoard slot when given', () => {
    render(
      <ChessLessonLayout
        board={<div>B</div>}
        belowBoard={<div data-testid="below-board">EngineLines</div>}
        controls={<div>C</div>}
      />,
    );
    expect(screen.getByTestId('below-board')).toBeInTheDocument();
    expect(screen.getByTestId('chess-lesson-below-board')).toBeInTheDocument();
  });

  it('puts a fixed gap between board and controls', () => {
    render(<ChessLessonLayout board={<div>B</div>} controls={<div>C</div>} />);
    const controlsSlot = screen.getByTestId('chess-lesson-controls');
    expect(controlsSlot.className).toMatch(/mt-6/);
  });
});
