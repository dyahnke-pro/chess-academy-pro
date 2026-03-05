import { Check } from 'lucide-react';
import { THEMES, applyTheme } from '../../services/themeService';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import type { AppTheme } from '../../types';

export function ThemePickerPanel(): JSX.Element {
  const activeTheme = useAppStore((s) => s.activeTheme);
  const setActiveTheme = useAppStore((s) => s.setActiveTheme);
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  const handleSelect = async (theme: AppTheme): Promise<void> => {
    applyTheme(theme);
    setActiveTheme(theme);

    if (activeProfile) {
      const updatedPrefs = { ...activeProfile.preferences, theme: theme.id };
      await db.profiles.update(activeProfile.id, { preferences: updatedPrefs });
      setActiveProfile({ ...activeProfile, preferences: updatedPrefs });
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2 p-2" data-testid="theme-picker-panel">
      {THEMES.map((theme) => {
        const isActive = activeTheme?.id === theme.id;
        return (
          <button
            key={theme.id}
            onClick={() => void handleSelect(theme)}
            className="flex flex-col items-start gap-1.5 p-3 rounded-lg border transition-colors text-left"
            style={{
              background: theme.colors.bg,
              borderColor: isActive ? theme.colors.accent : theme.colors.border,
              borderWidth: isActive ? '2px' : '1px',
            }}
            data-testid={`theme-card-${theme.id}`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-medium" style={{ color: theme.colors.text }}>
                {theme.name}
              </span>
              {isActive && (
                <Check size={14} style={{ color: theme.colors.accent }} data-testid="theme-check" />
              )}
            </div>
            <div className="flex gap-1">
              {[theme.colors.bg, theme.colors.accent, theme.colors.surface, theme.colors.text, theme.colors.success].map(
                (color, i) => (
                  <div
                    key={i}
                    className="w-3.5 h-3.5 rounded-full border"
                    style={{ background: color, borderColor: theme.colors.border }}
                  />
                ),
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
