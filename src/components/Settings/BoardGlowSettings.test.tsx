import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BoardGlowSettings, BoardGlowButton } from './BoardGlowSettings';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';

// Wrap with MemoryRouter for any hook that might need it
import { MemoryRouter } from 'react-router-dom';

function renderWithProviders(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('BoardGlowButton', () => {
  it('renders the glow settings button', () => {
    const onClick = vi.fn();
    renderWithProviders(<BoardGlowButton onClick={onClick} />);
    const btn = screen.getByTestId('board-glow-btn');
    expect(btn).toBeDefined();
    expect(btn.textContent).toContain('Board Glow Settings');
  });

  it('calls onClick when pressed', () => {
    const onClick = vi.fn();
    renderWithProviders(<BoardGlowButton onClick={onClick} />);
    fireEvent.click(screen.getByTestId('board-glow-btn'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('BoardGlowSettings', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    useAppStore.getState().setActiveProfile(buildUserProfile());
  });

  it('renders the master dimmer slider', () => {
    renderWithProviders(<BoardGlowSettings />);
    expect(screen.getByTestId('dimmer-master')).toBeDefined();
  });

  it('renders the mock chess board preview', () => {
    renderWithProviders(<BoardGlowSettings />);
    expect(screen.getByTestId('mock-chess-board')).toBeDefined();
  });

  it('renders color presets', () => {
    renderWithProviders(<BoardGlowSettings />);
    expect(screen.getByTestId('neon-preset-cyan')).toBeDefined();
    expect(screen.getByTestId('neon-preset-purple')).toBeDefined();
  });

  it('renders save and reset buttons', () => {
    renderWithProviders(<BoardGlowSettings />);
    expect(screen.getByTestId('glow-save-btn')).toBeDefined();
    expect(screen.getByTestId('glow-reset-btn')).toBeDefined();
  });

  it('save button is disabled when no changes made', () => {
    renderWithProviders(<BoardGlowSettings />);
    const saveBtn = screen.getByTestId('glow-save-btn') as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it('save button enables after changing brightness', () => {
    renderWithProviders(<BoardGlowSettings />);
    const slider = screen.getByTestId('dimmer-master') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '150' } });
    const saveBtn = screen.getByTestId('glow-save-btn') as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false);
  });

  it('clicking a preset color changes the active color', () => {
    renderWithProviders(<BoardGlowSettings />);
    const purpleBtn = screen.getByTestId('neon-preset-purple');
    fireEvent.click(purpleBtn);
    // Save button should be enabled if default was cyan
    const saveBtn = screen.getByTestId('glow-save-btn') as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false);
  });
});
