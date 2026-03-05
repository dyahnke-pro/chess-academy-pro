import { useState, useEffect, useCallback } from 'react';
import { Download, X } from 'lucide-react';
import { db } from '../../db/schema';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt(): JSX.Element | null {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Check if user already dismissed
    void db.meta.get('install_dismissed').then((record) => {
      if (!record) {
        setDismissed(false);
      }
    });

    const handler = (e: Event): void => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async (): Promise<void> => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback((): void => {
    setDismissed(true);
    setDeferredPrompt(null);
    void db.meta.put({ key: 'install_dismissed', value: 'true' });
  }, []);

  if (!deferredPrompt || dismissed) return null;

  return (
    <div
      className="fixed bottom-16 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 rounded-xl p-4 border shadow-lg flex items-center gap-3 z-50"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      data-testid="install-prompt"
    >
      <Download size={20} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          Install Chess Academy Pro
        </p>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          For offline access
        </p>
      </div>
      <button
        onClick={() => void handleInstall()}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0"
        style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
        data-testid="install-btn"
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        className="p-1 rounded hover:opacity-70 shrink-0"
        style={{ color: 'var(--color-text-muted)' }}
        data-testid="install-dismiss-btn"
      >
        <X size={16} />
      </button>
    </div>
  );
}
