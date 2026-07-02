import { Languages } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

/**
 * Settings control for the lesson-narration language (localization pilot).
 * Self-contained: reads/writes the active profile's `narrationLanguage`.
 * Only languages we ship a narration pack for are offered; English is the
 * always-available source of truth. Switching speaks + shows the masterclass
 * Watch narration in that language (voice follows automatically via TTS).
 */
const LANGUAGES: ReadonlyArray<{ code: string; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español (beta)' },
];

export function NarrationLanguageSetting(): JSX.Element | null {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  if (!activeProfile) return null;

  const current = activeProfile.preferences.narrationLanguage ?? 'en';

  const setLang = (code: string): void => {
    setActiveProfile({
      ...activeProfile,
      preferences: { ...activeProfile.preferences, narrationLanguage: code },
    });
  };

  return (
    <div className="pt-4 border-t space-y-2" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <Languages size={16} style={{ color: 'var(--color-accent)' }} />
        Lesson narration language
      </div>
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        The language the masterclass Watch lessons are taught and spoken in. The
        coaching voice matches automatically. App menus stay in English.
      </p>
      <select
        value={current}
        onChange={(e) => setLang(e.target.value)}
        className="w-full py-2 px-3 rounded-lg text-sm"
        style={{
          background: 'var(--color-bg)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
        }}
        data-testid="narration-language-select"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    </div>
  );
}
