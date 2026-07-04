import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ChatMessage } from './ChatMessage';
import type { ChatMessage as ChatMessageType } from '../../types';

// Capture navigate() calls so we can assert the chip routes correctly.
const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

function baseMessage(overrides: Partial<ChatMessageType> = {}): ChatMessageType {
  return {
    id: 'm1',
    role: 'assistant',
    content: 'You have 6 opening cards due for review across two openings.',
    timestamp: 0,
    ...overrides,
  };
}

function renderMessage(message: ChatMessageType): void {
  render(
    <MemoryRouter>
      <ChatMessage message={message} />
    </MemoryRouter>,
  );
}

describe('ChatMessage — grounded action picker', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it('renders the start_review chip when the grounded answer offers it', () => {
    renderMessage(baseMessage({ metadata: { actions: [{ type: 'start_review', id: 'srs' }] } }));
    const chip = screen.getByTestId('action-start_review');
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveTextContent('Start review');
  });

  it('navigates to the SRS trainer when the start_review chip is tapped (opt-in, not auto)', () => {
    renderMessage(baseMessage({ metadata: { actions: [{ type: 'start_review', id: 'srs' }] } }));
    // No navigation until the student actually taps — never auto-launched.
    expect(navigateMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('action-start_review'));
    expect(navigateMock).toHaveBeenCalledWith('/openings/srs');
  });

  it('renders no action chip when the answer attached no offer', () => {
    renderMessage(baseMessage());
    expect(screen.queryByTestId('action-start_review')).not.toBeInTheDocument();
  });

  // Game-sourced training chips (David 2026-07-04: "pull from real user games").
  it.each([
    ['calc_training', 'games', 'Train calculation', '/tactics/analysis-practice'],
    ['train_mistakes', 'games', 'Drill my mistakes', '/tactics/mistakes'],
    ['endgame_training', 'convert', 'Train endgames', '/coach/endgame'],
    ['review_games', 'best', 'Review my games', '/coach/review'],
  ])('routes the %s chip to its game-sourced surface', (type, id, label, route) => {
    renderMessage(baseMessage({ metadata: { actions: [{ type, id }] } }));
    const chip = screen.getByTestId(`action-${type}`);
    expect(chip).toHaveTextContent(label);
    fireEvent.click(chip);
    expect(navigateMock).toHaveBeenCalledWith(route);
  });

  it('routes an unscoped weakness_drill to the game-sourced weakness overview', () => {
    renderMessage(baseMessage({ metadata: { actions: [{ type: 'weakness_drill', id: 'all' }] } }));
    fireEvent.click(screen.getByTestId('action-weakness_drill'));
    expect(navigateMock).toHaveBeenCalledWith('/tactics/weakness-themes');
  });

  it('routes a scoped weakness_drill to the adaptive surface with the forced theme', () => {
    renderMessage(baseMessage({ metadata: { actions: [{ type: 'weakness_drill', id: 'fork' }] } }));
    fireEvent.click(screen.getByTestId('action-weakness_drill'));
    expect(navigateMock).toHaveBeenCalledWith('/tactics/adaptive', { state: { forcedWeakThemes: ['fork'] } });
  });
});
