import { useState } from 'react';
import { Settings, ChevronDown, ChevronUp, Timer, Eye, Volume2, VolumeX, Lightbulb } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useSettings } from '../../hooks/useSettings';

/**
 * PuzzleQuickSettings
 * -------------------
 * Collapsible panel on the /tactics hub. Surfaces the most-touched
 * puzzle preferences so the student doesn't have to dive into
 * /settings every time they want to tweak the experience.
 *
 * Toggles in v1:
 *   - Puzzle timer (elapsed badge on every puzzle)
 *   - Tactic name (skewer / fork / pin chip above the board)
 *   - Hints (the auto-progressive nudge ladder)
 *   - Voice (Polly narration for puzzle intros + outros)
 *
 * David's directive 2026-05-19: "I want a toggle and quick settings
 * added to puzzle home tab for easy adjustments".
 *
 * Each toggle persists to UserPreferences via appStore (matches the
 * coachVoiceOn pattern). Closed by default so it doesn't clutter
 * the hub for users who don't need to fiddle.
 */
export function PuzzleQuickSettings(): JSX.Element {
  const [open, setOpen] = useState(false);

  const puzzleTimerOn = useAppStore((s) => s.puzzleTimerOn);
  const togglePuzzleTimer = useAppStore((s) => s.togglePuzzleTimer);
  const puzzleClockTargetSec = useAppStore((s) => s.puzzleClockTargetSec);
  const setPuzzleClockTargetSec = useAppStore((s) => s.setPuzzleClockTargetSec);
  const puzzleShowTacticName = useAppStore((s) => s.puzzleShowTacticName);
  const togglePuzzleShowTacticName = useAppStore((s) => s.togglePuzzleShowTacticName);
  const coachVoiceOn = useAppStore((s) => s.coachVoiceOn);
  const toggleCoachVoice = useAppStore((s) => s.toggleCoachVoice);

  const { settings, updateSetting } = useSettings();

  return (
    <div
      className="max-w-lg mx-auto w-full rounded-2xl border border-theme-border bg-theme-surface/60 overflow-hidden"
      data-testid="puzzle-quick-settings"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-text-muted hover:bg-theme-surface/80 transition-colors"
        aria-expanded={open}
        data-testid="puzzle-quick-settings-toggle"
      >
        <Settings size={14} />
        <span className="flex-1 text-left font-medium">Quick settings</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-1.5" data-testid="puzzle-quick-settings-panel">
          <Toggle
            icon={<Timer size={14} />}
            label="Countdown clock"
            sublabel={
              puzzleTimerOn
                ? `Visible countdown — adds time pressure (target ${puzzleClockTargetSec}s)`
                : 'Off: timer runs hidden and logs solve time to weaknesses'
            }
            checked={puzzleTimerOn}
            onChange={() => togglePuzzleTimer()}
            testId="qs-toggle-timer"
          />
          {puzzleTimerOn && (
            <div className="pl-7 pr-2 pb-1" data-testid="qs-clock-target-row">
              <div className="flex items-center justify-between text-[11px] text-theme-text-muted mb-1">
                <span>Target time</span>
                <span className="tabular-nums font-semibold text-theme-text">
                  {puzzleClockTargetSec}s
                </span>
              </div>
              <input
                type="range"
                min={15}
                max={180}
                step={15}
                value={puzzleClockTargetSec}
                onChange={(e) => setPuzzleClockTargetSec(Number(e.target.value))}
                className="w-full accent-theme-accent"
                data-testid="qs-clock-target-slider"
              />
              <div className="flex justify-between text-[10px] text-theme-text-muted mt-0.5">
                <span>15s</span>
                <span>3:00</span>
              </div>
            </div>
          )}
          <Toggle
            icon={<Eye size={14} />}
            label="Show tactic name"
            sublabel="Skewer / Fork / Pin chip on each puzzle"
            checked={puzzleShowTacticName}
            onChange={() => togglePuzzleShowTacticName()}
            testId="qs-toggle-tactic-name"
          />
          <Toggle
            icon={<Lightbulb size={14} />}
            label="Auto-hints on wrong moves"
            sublabel="Progressive nudges after each failed attempt"
            checked={settings.showHints}
            onChange={() => void updateSetting('showHints', !settings.showHints)}
            testId="qs-toggle-hints"
          />
          <Toggle
            icon={coachVoiceOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
            label="Voice narration"
            sublabel="Polly speaks puzzle intros + outros"
            checked={coachVoiceOn}
            onChange={() => toggleCoachVoice()}
            testId="qs-toggle-voice"
          />
        </div>
      )}
    </div>
  );
}

interface ToggleProps {
  icon: JSX.Element;
  label: string;
  sublabel: string;
  checked: boolean;
  onChange: () => void;
  testId: string;
}

function Toggle({ icon, label, sublabel, checked, onChange, testId }: ToggleProps): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-theme-surface transition-colors"
      data-testid={testId}
      data-checked={checked ? 'true' : 'false'}
    >
      <span className={`shrink-0 ${checked ? 'text-theme-accent' : 'text-theme-text-muted'}`}>
        {icon}
      </span>
      <span className="flex-1 text-left">
        <span className="block text-sm text-theme-text">{label}</span>
        <span className="block text-[11px] text-theme-text-muted leading-snug">{sublabel}</span>
      </span>
      <span
        className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${
          checked ? 'bg-theme-accent' : 'bg-theme-border'
        }`}
        aria-hidden
      >
        <span
          className={`w-4 h-4 rounded-full bg-white transition-transform shadow ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  );
}
