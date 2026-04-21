import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { AppErrorFallback } from './components/ui/AppErrorFallback';
import { initSentry, SentryErrorBoundary } from './services/sentry';
import { initPostHog } from './services/analytics';

// Init observability BEFORE React mounts so Sentry can instrument
// the first render and PostHog's pageview listener is armed before
// the router reports its first location. Both are no-ops when their
// env vars are unset or we're not in a prod build.
initSentry();
initPostHog();

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

// Nesting: Sentry.ErrorBoundary is outermost so it reports the
// failure to Sentry, with <AppErrorFallback /> shown to the user.
// The existing in-house ErrorBoundary stays as a second ring — it
// logs to the local audit stream (separate destination from Sentry)
// and survives when Sentry is disabled.
createRoot(root).render(
  <StrictMode>
    <SentryErrorBoundary fallback={<AppErrorFallback />}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </SentryErrorBoundary>
  </StrictMode>,
);
