import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen } from '../../test/utils';
import { PlayerInfoBar } from './PlayerInfoBar';

// David's phone, 2026-10-18: "Shrinks a little after each move". A "Thinking…"
// line under the board pushed the controls down, so the fit took the space out
// of the board on every coach reply. The status lives in the coach's bar.
describe('the coach is thinking — said in its bar, never under the board', () => {
  it('the bar shows the status beside the name', () => {
    render(<PlayerInfoBar name="Coach" isBot capturedPieces={[]} isActive status="Thinking…" />);
    expect(screen.getByTestId('coach-thinking')).toHaveTextContent('Thinking…');
  });
  it('no status, nothing shown', () => {
    render(<PlayerInfoBar name="Coach" isBot capturedPieces={[]} isActive={false} />);
    expect(screen.queryByTestId('coach-thinking')).not.toBeInTheDocument();
  });
  it('Learn renders no thinking line of its own (it would move the board)', () => {
    const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(src).not.toContain('data-testid="coach-thinking"');
    expect(src).toContain("status={opponentThinking ? 'Thinking…' : undefined}");
  });
});
