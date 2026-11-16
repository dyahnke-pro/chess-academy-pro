/**
 * GameSettingsButton — a phone's one button for the game's settings (colour,
 * difficulty, the analysis toggles). On a phone the header row they lived in
 * took a board's worth of height (David 2026-11-16: "The board is the wrong
 * size … It needs to fill the screen"); the controls are the same ones the
 * desktop header shows, passed in, so there is one copy of each.
 *
 * The face says the settings at a glance: your colour and the difficulty.
 * The menu floats over the board's top edge and never moves the board.
 */
import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { CoachDifficulty } from '../../types';

const LETTER: Record<CoachDifficulty, string> = { easy: 'E', medium: 'M', hard: 'H' };

export function GameSettingsButton({ color, difficulty, children }: {
  color: 'white' | 'black';
  difficulty: CoachDifficulty;
  children: React.ReactNode;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" data-testid="game-settings">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-theme-border text-xs text-theme-text-muted"
        aria-label="Game settings"
        aria-expanded={open}
        data-testid="game-settings-btn"
      >
        <SlidersHorizontal size={14} />
        <span className={`w-3 h-3 rounded-full border ${color === 'white' ? 'bg-white border-neutral-300' : 'bg-neutral-800 border-neutral-600'}`} />
        <span className="font-semibold">{LETTER[difficulty]}</span>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-30 flex flex-col items-end gap-2 rounded-xl border border-theme-border bg-theme-bg p-2 shadow-lg"
          data-testid="game-settings-menu"
        >
          {children}
        </div>
      )}
    </div>
  );
}
