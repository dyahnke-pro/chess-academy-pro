import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameSettingsButton } from './GameSettingsButton';

// David 2026-11-16: "The board is the wrong size … It needs to fill the
// screen." On a phone the header row's settings live behind one button.
describe("a phone's game settings button", () => {
  it('shows the colour and difficulty, and opens the same controls', () => {
    render(<GameSettingsButton color="black" difficulty="hard"><button data-testid="color-white-btn">w</button></GameSettingsButton>);
    expect(screen.getByTestId('game-settings-btn').textContent).toContain('H');
    expect(screen.queryByTestId('game-settings-menu')).toBeNull();
    fireEvent.click(screen.getByTestId('game-settings-btn'));
    expect(screen.getByTestId('game-settings-menu')).toBeTruthy();
    expect(screen.getByTestId('color-white-btn')).toBeTruthy();
  });
  it('the menu floats (absolute) — opening it never moves the board', () => {
    render(<GameSettingsButton color="white" difficulty="easy"><span /></GameSettingsButton>);
    fireEvent.click(screen.getByTestId('game-settings-btn'));
    expect(screen.getByTestId('game-settings-menu').className).toMatch(/\babsolute\b/);
  });
});
