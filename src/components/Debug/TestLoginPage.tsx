import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getOrCreateMainProfile } from '../../services/dbService';
import { useAppStore } from '../../stores/appStore';

/**
 * Playwright-only "login" screen. Not linked from UI. Only registered
 * when VITE_ALLOW_TEST_LOGIN=true at build time (see App.tsx).
 *
 * For the single-user app there is no real Supabase auth yet — the
 * "logged-in" state is just the presence of a local Dexie profile.
 * This page forces the profile into memory so Playwright's
 * storageState reload behaves identically to a normal session start
 * and the nav tests can assert against a known landing route.
 */
export function TestLoginPage(): JSX.Element {
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const activeProfile = useAppStore((s) => s.activeProfile);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run(): Promise<void> {
      const profile = await getOrCreateMainProfile();
      if (cancelled) return;
      setActiveProfile(profile);
      setReady(true);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [setActiveProfile]);

  if (ready && activeProfile) {
    return <Navigate to="/" replace />;
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-8"
      data-testid="test-login-page"
    >
      <p className="text-sm opacity-70">Preparing test profile…</p>
    </div>
  );
}
