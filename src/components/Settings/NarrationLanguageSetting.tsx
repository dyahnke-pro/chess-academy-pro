import { Languages } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

/**
 * Settings control for the coach's narration language.
 * Self-contained: reads/writes the active profile's `narrationLanguage`.
 * English is the always-available source of truth; every other language is
 * produced from it at speech time (`spokenLanguage`), so the list is not
 * limited to the openings that ship a written translation pack.
 */
// Every language the coach can SPEAK. It used to list only the two we ship a
// written translation pack for, because packs were the only mechanism — but the
// coach's spoken narration now translates at the voice chokepoint, which needs
// no pack at all (see `spokenLanguage`). So the list is what the coach can say,
// not what happens to be pre-translated.
const LANGUAGES: ReadonlyArray<{ code: string; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pl', label: 'Polski' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'ru', label: 'Русский' },
  { code: 'ar', label: 'العربية' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
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
        The language the coach teaches and speaks in — lessons, walkthroughs,
        the middlegame play-out, chat replies. Moves stay in standard notation
        and the voice matches the language automatically. App menus stay in
        English, and a few written lesson texts may still show English.
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
