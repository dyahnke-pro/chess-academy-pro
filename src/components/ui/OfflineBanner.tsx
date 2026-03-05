import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner(): JSX.Element | null {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = (): void => setIsOffline(false);
    const handleOffline = (): void => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      className="flex items-center justify-center gap-2 py-1.5 text-xs font-medium"
      style={{ background: 'var(--color-warning)', color: 'var(--color-bg)' }}
      data-testid="offline-banner"
    >
      <WifiOff size={12} />
      You&apos;re offline &mdash; all training features still work
    </div>
  );
}
