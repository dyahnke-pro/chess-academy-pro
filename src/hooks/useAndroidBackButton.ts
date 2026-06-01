import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

/**
 * Android hardware / gesture back-button handler.
 *
 * Without this, Android's back gesture pops the native WebView's
 * history and — at the first entry — EXITS the whole app, even from
 * a deep sub-route. That's jarring: a student two screens into a
 * lesson taps back and the app closes instead of stepping up a level.
 *
 * Contract (store-readiness GAP 3 #5):
 *  - Not on a native Android shell  → no-op (web back is the browser's job).
 *  - There is in-app history to pop → go back one screen.
 *  - At a top-level route with no   → minimize the app (send to
 *    history (e.g. "/" )              background) rather than kill it,
 *                                     matching Android's expected
 *                                     "back from home = leave, don't quit"
 *                                     behavior.
 *
 * Must be mounted INSIDE the router (uses useNavigate / useLocation).
 */
export function useAndroidBackButton(): void {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;

    const handlePromise = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      // `canGoBack` reflects the WebView's own history. We trust the
      // router's history depth too: if we're at the app root, leave.
      const atRoot = location.pathname === '/' || location.pathname === '/coach/home';
      if (canGoBack && !atRoot) {
        void navigate(-1);
      } else {
        // Don't exitApp() — minimizing matches Android UX and keeps the
        // app warm so re-entry is instant (Dexie + warmed pools survive).
        void CapacitorApp.minimizeApp();
      }
    });

    return () => {
      void handlePromise.then((handle) => handle.remove());
    };
  }, [navigate, location.pathname]);
}
