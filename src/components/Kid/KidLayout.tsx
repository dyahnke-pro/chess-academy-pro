import { useEffect, useRef, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { applyTheme, getThemeById } from '../../services/themeService';
import { voiceService } from '../../services/voiceService';

export function KidLayout(): JSX.Element {
  const navigate = useNavigate();
  const activeTheme = useAppStore((s) => s.activeTheme);
  const setActiveTheme = useAppStore((s) => s.setActiveTheme);
  const previousThemeId = useRef<string>(activeTheme?.id ?? 'dark-premium');

  useEffect(() => {
    const savedThemeId = previousThemeId.current;
    const kidTheme = getThemeById('kid-mode');
    applyTheme(kidTheme);
    setActiveTheme(kidTheme);
    // Kids non-negotiable #4: every kid utterance speaks in Ruth,
    // regardless of the profile's coach personality. Lock here so no
    // kid call site can leak an adult personality voice.
    voiceService.lockKidVoice();

    return () => {
      voiceService.stop();
      voiceService.unlockKidVoice();
      const prevTheme = getThemeById(savedThemeId);
      applyTheme(prevTheme);
      setActiveTheme(prevTheme);
    };
  }, [setActiveTheme]);

  const handleBackToMain = useCallback((): void => {
    void navigate('/');
  }, [navigate]);

  return (
    <div
      className="flex flex-col min-h-dvh text-xl md:text-2xl leading-relaxed tracking-wide"
      style={{ background: 'var(--color-bg)' }}
      data-testid="kid-layout"
    >
      {/* Kids Mode header */}
      <header
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          background: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
        }}
        data-testid="kid-header"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToMain}
            className="p-1.5 rounded-lg hover:opacity-80 transition-opacity"
            style={{ color: 'var(--color-text-muted)' }}
            aria-label="Back to Chess Academy"
            data-testid="kid-back-to-main"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">♞</span>
            <span
              className="font-bold text-lg"
              style={{ color: 'var(--color-text)' }}
            >
              Kids Mode
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex flex-1 flex-col min-h-0 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
