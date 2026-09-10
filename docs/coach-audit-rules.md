# Coach Audit Rules — LOCKED (David 2026-09-10, said more than once)

Read this at the start of every audit loop. Regain context after EACH loop.

## THE RULES (non-negotiable)

1. **FULL AUDIT FIRST, THEN FIXES.** Drive and catalog EVERY function on the
   map before changing any code. Do NOT fall into find-a-break → fix → repeat.
   The complete break list comes first; fixes come after, batched.

2. **DO THE AUDIT BY HAND.** Drive the surface yourself — one interaction at a
   time — READ the real result, JUDGE it, decide the next. NOT a fire-and-forget
   bot script that runs the whole matrix and emits a grid to parse. Use the
   driver to run ONE ask/action, read the REAL assistant bubble
   (`[data-testid="chat-message-assistant"]`) + board, judge, then the next.
   Steer live: dismiss overlays, adapt the next ask to what you saw. A silent
   no-op is a FAILED step, not a pass — assert the expected post-state.

3. **ROOT CAUSE, NO BAND-AIDS, NO SHORTCUTS.** For every error, write one
   sentence naming the structural cause, then fix the disease — not the symptom
   in one caller. Sweep the class (grep for siblings). Prefer the fix that makes
   the drift impossible to reopen.

4. **REGAIN CONTEXT AFTER EACH LOOP.** Re-read this file + `coach-function-map.md`
   (git state, open findings, what's verified) at the top of each loop so the
   thread doesn't drift.

5. **VERIFY EACH FIX BY HAND ON PROD** after it deploys (read the real bubble),
   before calling it done. One push at the end of the fix batch, not per-fix.

## WHY (the relapses this kills)
- Reading a body-innerText diff instead of the real bubble faked 3 "failures"
  (material/development/weakness) that actually answered.
- A fire-and-forget matrix bot couldn't tell a dead lane from a wrong position
  because nothing looked at the board; its seed silently no-op'd.
- Fixing mid-audit (piecemeal) instead of cataloging first wastes pushes and
  misses the class.
