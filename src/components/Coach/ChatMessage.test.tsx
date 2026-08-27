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

  it('drills an unscoped weakness_drill IN the coach tab (no reroute to tactics)', () => {
    renderMessage(baseMessage({ metadata: { actions: [{ type: 'weakness_drill', id: 'all' }] } }));
    fireEvent.click(screen.getByTestId('action-weakness_drill'));
    expect(navigateMock).toHaveBeenCalledWith('/coach/teach?drill=mistakes');
  });

  it('drills a scoped weakness_drill IN the coach tab, carrying the motif hint', () => {
    renderMessage(baseMessage({ metadata: { actions: [{ type: 'weakness_drill', id: 'fork' }] } }));
    fireEvent.click(screen.getByTestId('action-weakness_drill'));
    expect(navigateMock).toHaveBeenCalledWith('/coach/teach?drill=mistakes&theme=fork');
  });

  // Dead-wire guard (David 2026-07-04): every chip must land on a REAL route.
  // analyse_position used to navigate to /analysis, which was never registered.
  it('routes analyse_position to the real analysis board (/coach/analyse, not a dead /analysis)', () => {
    renderMessage(baseMessage({ metadata: { actions: [{ type: 'analyse_position', id: 'current' }] } }));
    fireEvent.click(screen.getByTestId('action-analyse_position'));
    expect(navigateMock).toHaveBeenCalledWith('/coach/analyse');
  });
});

describe('ChatMessage — inline "did you mean" choice chips (David 2026-07-18)', () => {
  it('renders a chip per message.choices entry and calls onPickChoice with the tapped text', () => {
    const onPick = vi.fn();
    render(
      <MemoryRouter>
        <ChatMessage
          message={baseMessage({
            content: 'Did you mean one of these? Tap one to start.',
            choices: ["King's Indian Attack", 'Sicilian Defense: Dragon Variation'],
          })}
          onPickChoice={onPick}
        />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('message-choice-chips')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('message-choice-chip-0'));
    expect(onPick).toHaveBeenCalledWith("King's Indian Attack");
    fireEvent.click(screen.getByTestId('message-choice-chip-1'));
    expect(onPick).toHaveBeenCalledWith('Sicilian Defense: Dragon Variation');
  });

  it('renders no chips when onPickChoice is absent (streaming placeholder)', () => {
    render(
      <MemoryRouter>
        <ChatMessage message={baseMessage({ choices: ['A', 'B'] })} />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId('message-choice-chips')).not.toBeInTheDocument();
  });

  it('never renders choice chips on a user message', () => {
    const onPick = vi.fn();
    render(
      <MemoryRouter>
        <ChatMessage message={baseMessage({ role: 'user', choices: ['A', 'B'] })} onPickChoice={onPick} />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId('message-choice-chips')).not.toBeInTheDocument();
  });
});
