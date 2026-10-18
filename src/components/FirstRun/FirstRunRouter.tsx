import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { needsStrengthQuestion } from '../../services/strengthCalibrationService';
import { getFirstRunStep } from '../../services/firstRunJourney';
import { isAuditMarkedPage } from '../../services/appAuditor';
import { captureEvent } from '../../services/analytics';

/** An audit drives the app from `/` and expects the home screen; it opts into
 *  the journey explicitly when the journey is what it measures. */
function auditOptedIn(): boolean {
  try { return localStorage.getItem('auditFirstRun') === '1'; } catch { return false; }
}

/**
 * FirstRunRouter — a brand-new install lands on the board, not a menu (David
 * 2026-10-18). Once consent and the strength question are answered, a new
 * student sitting on the home screen is taken straight into Learn with Coach.
 * Once per session: a student who comes back to the home screen stays there.
 */
export function FirstRunRouter(): null {
  const profile = useAppStore((s) => s.activeProfile);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const done = useRef(false);

  const ready = !!profile && !profile.isKidMode && profile.aiDataConsent !== undefined && !needsStrengthQuestion(profile);

  useEffect(() => {
    if (done.current || !ready || pathname !== '/') return;
    if (isAuditMarkedPage() && !auditOptedIn()) return;
    let cancelled = false;
    void getFirstRunStep().then((step) => {
      if (cancelled || done.current) return;
      done.current = true;
      if (step !== 'learn') return;
      captureEvent('first_run_step', { step: 'learn' });
      void navigate('/coach/teach', { replace: true });
    });
    return () => { cancelled = true; };
  }, [ready, pathname, navigate]);

  return null;
}
