// Self-contained browser init-script: neutralize the strength-calibration
// bubble (CLAUDE.md caveat #6) so it can never intercept clicks, on every
// navigation. Inject once per context: `ctx.addInitScript(autoDismissCalibration)`.
//
// The bubble is a full-screen `role="dialog"` modal (z-110, inset-0) that
// intercepts pointer events, so any audit clicking a tab / board / button on a
// fresh prod context times out ("…strength-calibration-bubble… intercepts
// pointer events"). Older scripts predate it and never dismissed it.
//
// IMPORTANT — why CSS, not just a click: clicking the skill band fires the
// app's async `applyStrength`, which WRITES the calibrated profile to Dexie.
// In a container where app-level Dexie writes stall, that write never resolves,
// so `setNeedsCalibration(false)` never runs and the bubble never detaches —
// a band-click alone then hangs forever. Forcing `pointer-events:none` on the
// overlay makes every click fall through to the surface behind it REGARDLESS of
// whether any write completes — fully write-independent. The band-click is kept
// as a best-effort so calibration also completes when writes DO work.
export function autoDismissCalibration() {
  const css =
    '[data-testid="strength-calibration-bubble"]{pointer-events:none!important;opacity:0!important;}' +
    '[data-testid="strength-calibration-bubble"] *{pointer-events:none!important;}' +
    // The page-help modal auto-opens on many surfaces (/tactics, /coach, …) as
    // a full-screen dialog and intercepts the first click on the surface behind
    // it (e.g. the puzzle quick-settings toggle). Neutralize it the same way.
    '[data-testid="page-help-modal"]{pointer-events:none!important;opacity:0!important;}' +
    '[data-testid="page-help-modal"] *{pointer-events:none!important;}';
  const inject = () => {
    if (!document.head && !document.documentElement) { setTimeout(inject, 20); return; }
    if (document.getElementById('__audit_kill_calib')) return;
    const s = document.createElement('style');
    s.id = '__audit_kill_calib';
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  };
  inject();
  // best-effort: also complete calibration when Dexie writes work
  const clickBand = () => {
    if (!document.querySelector('[data-testid="strength-calibration-bubble"]')) return;
    const btn = document.querySelector('[data-testid="skill-band-intermediate"]');
    if (btn) btn.click();
  };
  // best-effort: also CLOSE the page-help modal outright when it auto-opens.
  const closePageHelp = () => {
    const close = document.querySelector('[data-testid="page-help-close"]');
    if (close) close.click();
  };
  const sweep = () => { inject(); clickBand(); closePageHelp(); };
  const start = () => {
    if (!document.body) { setTimeout(start, 50); return; }
    new MutationObserver(sweep).observe(document.body, { childList: true, subtree: true });
    sweep();
  };
  start();
  setInterval(sweep, 500);
}
