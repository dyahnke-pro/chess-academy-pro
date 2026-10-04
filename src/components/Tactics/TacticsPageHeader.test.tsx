import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, fireEvent } from '../../test/utils';
import { TacticsPageHeader } from './TacticsPageHeader';

describe('TacticsPageHeader', () => {
  it('renders a plain arrow back button, the title and the right slot', () => {
    const onBack = vi.fn();
    render(
      <TacticsPageHeader
        title="Setup Trainer"
        onBack={onBack}
        right={<span data-testid="right-slot">help</span>}
      />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Setup Trainer' })).toBeInTheDocument();
    expect(screen.getByTestId('right-slot')).toBeInTheDocument();
    const back = screen.getByTestId('back-btn');
    expect(back).toHaveAttribute('aria-label', 'Back to Tactics');
    // ONE style: no boxed border, no "Back" text beside the arrow.
    expect(back.className).not.toMatch(/\bborder\b/);
    expect(back.textContent).toBe('');
    fireEvent.click(back);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('keeps a screen-specific back testid and label', () => {
    render(<TacticsPageHeader title="Pattern Recognition" onBack={() => undefined} backTestId="pattern-school-back" backLabel="Back to tactics" />);
    expect(screen.getByTestId('pattern-school-back')).toHaveAttribute('aria-label', 'Back to tactics');
  });

  it('renders no back button when there is nowhere to go', () => {
    render(<TacticsPageHeader title="Tactics" />);
    expect(screen.queryByTestId('back-btn')).toBeNull();
  });
});

// Hand walk 2026-10-04 (C8/C9): Puzzle Trainer, Calculation and Opening Traps
// had no way back, and the rest used four different back-button styles. Every
// Tactics sub-screen now draws its header through this one component.
describe('every Tactics sub-screen uses the one header', () => {
  const SCREENS = [
    'src/components/Tactics/TacticSetupPage.tsx',
    'src/components/Tactics/FindSquarePage.tsx',
    'src/components/Tactics/TacticalProfilePage.tsx',
    'src/components/Tactics/PatternSchoolPage.tsx',
    'src/components/Tactics/TacticDrillPage.tsx',
    'src/components/Tactics/TacticCreatePage.tsx',
    'src/components/Coach/CalculationTab.tsx',
    'src/components/Puzzles/MyMistakesPage.tsx',
    'src/components/Puzzles/WeaknessTagDrillPage.tsx',
    'src/components/Puzzles/DeepRunPage.tsx',
    'src/components/Puzzles/LichessDashboardPage.tsx',
    'src/components/Puzzles/PuzzleTrainerPage.tsx',
    'src/components/Debug/OpeningBlundersPage.tsx',
  ];
  it.each(SCREENS)('%s renders TacticsPageHeader with a back action', (file) => {
    const src = readFileSync(resolve(process.cwd(), file), 'utf8');
    expect(src).toContain('<TacticsPageHeader');
    expect(src).toMatch(/<TacticsPageHeader[\s\S]*?onBack=/);
  });
});
