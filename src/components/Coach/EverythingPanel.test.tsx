import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const owner = vi.hoisted(() => ({ yes: true }));
vi.mock('../../services/dataDrop', () => ({ canSendMyData: () => Promise.resolve(owner.yes) }));

import { EverythingPanel } from './EverythingPanel';
import { emitEverything, everythingListening, __resetEverything } from '../../services/everythingEvents';

describe('Everything mode in the app (task #101)', () => {
  beforeEach(() => { __resetEverything(); owner.yes = true; });
  it('an owner turns it on and sees every line, said and held, with the computer and why', async () => {
    render(<EverythingPanel />);
    const toggle = await screen.findByTestId('everything-toggle');
    expect(everythingListening()).toBe(false);
    fireEvent.click(toggle);
    await waitFor(() => expect(everythingListening()).toBe(true));
    act(() => emitEverything({ surface: 'learn', door: 'learn-turn', at: { fen: '8/8/8/8/8/8/8/K6k w - - 0 1', ply: 12 }, lines: [
      { computer: 'threeFacts (binding)', kind: 'binding', text: 'Their d5 is aimed at your pawn on e4.', said: false, why: 'faded' },
      { computer: 'costReason', kind: 'consequence', text: 'It lets their knight in.', said: true, why: null },
    ] }));
    const lines = await screen.findAllByTestId('everything-line');
    expect(lines.map((l) => l.textContent)).toEqual([
      'held · threeFacts (binding) (faded) — Their d5 is aimed at your pawn on e4.',
      'said · costReason — It lets their knight in.',
    ]);
  });
  it('NEGATIVE CONTROL: a student device shows nothing and nothing listens', async () => {
    owner.yes = false;
    const { container } = render(<EverythingPanel />);
    await new Promise((r) => setTimeout(r, 20));
    expect(container.innerHTML).toBe('');
    expect(everythingListening()).toBe(false);
  });
});
