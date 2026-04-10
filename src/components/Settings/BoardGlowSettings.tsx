import { useState, useCallback, useMemo } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { Sparkles, RotateCcw } from 'lucide-react';

// ─── Neon color presets ──────────────────────────────────────────────────────

interface NeonPreset {
  label: string;
  rgb: string;
  hex: string;
}

const NEON_PRESETS: NeonPreset[] = [
  { label: 'Cyan', rgb: '0, 229, 255', hex: '#00e5ff' },
  { label: 'Purple', rgb: '168, 85, 247', hex: '#a855f7' },
  { label: 'Green', rgb: '0, 255, 136', hex: '#00ff88' },
  { label: 'Pink', rgb: '255, 0, 200', hex: '#ff00c8' },
  { label: 'Red', rgb: '255, 50, 50', hex: '#ff3232' },
  { label: 'Orange', rgb: '255, 150, 0', hex: '#ff9600' },
  { label: 'Yellow', rgb: '255, 230, 0', hex: '#ffe600' },
  { label: 'Blue', rgb: '59, 130, 246', hex: '#3b82f6' },
  { label: 'Rose', rgb: '251, 113, 133', hex: '#fb7185' },
  { label: 'Lime', rgb: '163, 230, 53', hex: '#a3e635' },
  { label: 'Indigo', rgb: '99, 102, 241', hex: '#6366f1' },
  { label: 'White', rgb: '255, 255, 255', hex: '#ffffff' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function rgbToHex(rgb: string): string {
  const parts = rgb.split(',').map((s) => parseInt(s.trim(), 10));
  return '#' + parts.map((p) => p.toString(16).padStart(2, '0')).join('');
}

const BOARD_FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const BOARD_RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

// ─── Sub-components ──────────────────────────────────────────────────────────

interface NeonColorPickerProps {
  label: string;
  currentRgb: string;
  onSelectRgb: (rgb: string) => void;
}

function NeonColorPicker({ label, currentRgb, onSelectRgb }: NeonColorPickerProps): JSX.Element {
  const currentHex = rgbToHex(currentRgb);

  return (
    <div>
      <label className="text-xs font-medium block mb-2" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {NEON_PRESETS.map((preset) => {
          const isActive = preset.rgb === currentRgb;
          return (
            <button
              key={preset.hex}
              onClick={() => onSelectRgb(preset.rgb)}
              className="w-7 h-7 rounded-full transition-all duration-150"
              style={{
                backgroundColor: preset.hex,
                boxShadow: isActive
                  ? `0 0 10px rgba(${preset.rgb}, 0.9), 0 0 20px rgba(${preset.rgb}, 0.5)`
                  : `0 0 4px rgba(${preset.rgb}, 0.4)`,
                border: isActive ? '2px solid white' : '2px solid transparent',
                transform: isActive ? 'scale(1.15)' : 'scale(1)',
              }}
              title={preset.label}
              aria-label={`Select ${preset.label}`}
              data-testid={`neon-preset-${preset.label.toLowerCase()}`}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={currentHex}
          onChange={(e) => onSelectRgb(hexToRgb(e.target.value))}
          className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
          aria-label={`${label} custom color picker`}
          data-testid={`color-wheel-${label.toLowerCase().replace(/\s+/g, '-')}`}
        />
        <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
          {currentHex.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

interface DimmerSliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  testId: string;
}

function DimmerSlider({ label, value, onChange, testId }: DimmerSliderProps): JSX.Element {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
        <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--color-text)' }}>{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={200}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-current"
        style={{
          background: `linear-gradient(to right, transparent 0%, rgba(201, 168, 76, 0.7) ${value / 2}%, rgba(51, 51, 51, 0.5) ${value / 2}%)`,
        }}
        data-testid={testId}
      />
    </div>
  );
}

// ─── Mock Chess Board with 3D neon glow ──────────────────────────────────────

interface MockBoardProps {
  glowColor: string;
  brightness: number;
}

function MockChessBoard({ glowColor, brightness }: MockBoardProps): JSX.Element {
  const scale = brightness / 100;
  const r = Math.round;

  return (
    <div
      className="rounded-lg overflow-hidden mx-auto"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        width: '100%',
        maxWidth: '280px',
        aspectRatio: '1',
        boxShadow: brightness > 0
          ? `0 0 ${r(12 * scale)}px rgba(${glowColor}, ${Math.min(1, 0.4 * scale)}), 0 0 ${r(24 * scale)}px rgba(${glowColor}, ${Math.min(1, 0.2 * scale)})`
          : 'none',
      }}
      data-testid="mock-chess-board"
    >
      {BOARD_RANKS.map((rank) =>
        BOARD_FILES.map((file) => {
          const fileIdx = BOARD_FILES.indexOf(file);
          const isLight = (fileIdx + rank) % 2 === 1;
          const o1 = Math.min(1, 0.2 * scale);
          const o2 = Math.min(1, 0.12 * scale);
          const o3 = Math.min(1, 0.08 * scale);
          const o4 = Math.min(1, 0.06 * scale);

          return (
            <div
              key={`${file}${rank}`}
              style={{
                backgroundColor: isLight ? '#3d3d50' : '#272738',
                boxShadow: scale > 0
                  ? [
                      `inset 0 0 ${r(6 * scale)}px rgba(${glowColor}, ${o1})`,
                      `inset 0 0 ${r(2 * scale)}px rgba(${glowColor}, ${o2})`,
                      `inset ${r(1 * scale)}px ${r(1 * scale)}px ${r(3 * scale)}px rgba(0,0,0, ${o3})`,
                      `inset ${r(-1 * scale)}px ${r(-1 * scale)}px ${r(2 * scale)}px rgba(${glowColor}, ${o4})`,
                    ].join(', ')
                  : 'none',
                aspectRatio: '1',
              }}
            />
          );
        }),
      )}
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

export function BoardGlowSettings(): JSX.Element {
  const { settings, updateSettings } = useSettings();

  const [glowColor, setGlowColor] = useState(settings.boardGlowColor);
  const [brightness, setBrightness] = useState(settings.glowBrightness);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const isDirty = useMemo(() => (
    glowColor !== settings.boardGlowColor ||
    brightness !== settings.glowBrightness
  ), [glowColor, brightness, settings]);

  const handleSave = useCallback(async (): Promise<void> => {
    await updateSettings({
      boardGlowColor: glowColor,
      glowBrightness: brightness,
    });
    setSaveStatus('Glow settings saved');
    setTimeout(() => setSaveStatus(null), 2000);
  }, [glowColor, brightness, updateSettings]);

  const handleReset = useCallback((): void => {
    setGlowColor('0, 229, 255');
    setBrightness(100);
  }, []);

  return (
    <div className="space-y-5" data-testid="board-glow-settings">
      {/* Master dimmer */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Glow Brightness
        </h4>
        <DimmerSlider
          label="Master Dimmer"
          value={brightness}
          onChange={setBrightness}
          testId="dimmer-master"
        />
        <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Controls all neon glow across the app — board, cards, buttons
        </p>
      </div>

      {/* Live preview */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Board Preview
        </h4>
        <MockChessBoard
          glowColor={glowColor}
          brightness={brightness}
        />
      </div>

      {/* Board glow color */}
      <NeonColorPicker
        label="Board Glow Color"
        currentRgb={glowColor}
        onSelectRgb={setGlowColor}
      />

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => void handleSave()}
          disabled={!isDirty}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-40"
          style={{
            background: isDirty ? 'var(--color-accent)' : 'var(--color-bg)',
            color: isDirty ? 'var(--color-bg)' : 'var(--color-text-muted)',
            boxShadow: isDirty ? '0 0 12px rgba(201, 168, 76, 0.5), 0 0 24px rgba(201, 168, 76, 0.25)' : 'none',
          }}
          data-testid="glow-save-btn"
        >
          {saveStatus ?? 'Save Glow Settings'}
        </button>
        <button
          onClick={handleReset}
          className="p-2.5 rounded-lg border transition-colors hover:opacity-80"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          aria-label="Reset to defaults"
          data-testid="glow-reset-btn"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Entry button for the settings page ──────────────────────────────────────

interface BoardGlowButtonProps {
  onClick: () => void;
}

export function BoardGlowButton({ onClick }: BoardGlowButtonProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200"
      style={{
        background: 'var(--color-bg)',
        borderTop: '1px solid rgba(168, 85, 247, 0.2)',
        borderRight: '1px solid rgba(168, 85, 247, 0.2)',
        borderLeft: '2px solid rgba(0, 229, 255, 0.6)',
        borderBottom: '2px solid rgba(168, 85, 247, 0.6)',
        boxShadow: '0 0 8px rgba(0, 229, 255, 0.4), 0 0 16px rgba(168, 85, 247, 0.25), 0 0 28px rgba(0, 229, 255, 0.12)',
        color: 'var(--color-text)',
      }}
      data-testid="board-glow-btn"
    >
      <Sparkles size={18} className="text-cyan-400" />
      Board Glow Settings
    </button>
  );
}
