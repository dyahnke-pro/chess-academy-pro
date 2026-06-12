# Audit Protocol — the standard (David, locked 2026-06-12)

How EVERY surface gets audited. Read this before auditing anything. This is the
loop-audit standard from CLAUDE.md, written down with the rules I kept missing.

## 0. The first principle — IF IT DIDN'T BREAK, YOU DIDN'T PUSH HARD ENOUGH

A clean audit is **not** a finish line — it's a signal to probe **harder**. A
green first pass means the happy path works; it says nothing about the surface's
real robustness. Your job is to **break it**, then fix it, then try to break it
again, until you genuinely can't. If three passes go by and nothing ever broke,
**you under-probed** — add more adversarial inputs and run again. "It passed" is
never the report; "I tried hard to break it and here's what I found / fixed /
couldn't break" is the report.

## 1. MAP EVERY FUNCTION FIRST

Before driving anything, enumerate **every** function of the surface — don't
guess from memory. Pull the full interactive surface from the code:

- `grep` every `data-testid` in the page component.
- `grep` every `const handle*` / `on*` handler.
- Note every button, toggle, mode, input, gesture, and state-dependent feature
  (things that only appear after a specific action or coach decision).

The audit must **touch every one** of these. A function you didn't drive is a
function you didn't audit.

## 2. DRIVE EACH FUNCTION — THEN ATTACK IT (G7)

For every function: drive the happy path once, then **attack it**. Adversarial /
failure-mode inputs are mandatory, not optional:

- **Off-canonical input** — misspellings, alternate spellings, junk, empty,
  huge, unicode, the wrong type.
- **Out-of-order** — do steps in the wrong sequence; trigger B before A.
- **Rapid-fire / double-tap** — click the same control 5× fast; spam it mid-
  animation; double-submit.
- **Mid-action interrupt** — start something, then navigate / restart / resign /
  toggle a setting before it finishes.
- **Illegal / edge** — illegal move, takeback at move 0, nav past the ends,
  resign before moving, hint with nothing to hint, explore with no line.
- **Cold-cache / first-run** — clear IndexedDB; fresh profile; pick-before-load
  (tap a control before its data finishes loading).
- **State-dependent features** — actively MANUFACTURE the trigger state (play a
  real blunder to fire interception; set up a hanging piece and don't take it to
  fire the missed-tactic path; send the chat command that enters practice/
  walkthrough). "It only fires when the coach decides" is not an excuse to skip —
  create the condition. Only route to a real device when the trigger genuinely
  cannot be produced headless (and say so explicitly, per G7).

## 3. THE 3-PASS CONTRACT

- MET **only** on **3 CONSECUTIVE** passes with **zero failures and zero
  console/page errors**.
- **EACH pass digs DEEPER** — more adversarial inputs than the last, not a re-run
  of the same script.
- **EACH pass touches EVERY function.**
- **ANY break resets the streak to 0.** When something breaks: stop, **FIX it**,
  then start the 3-pass count over from zero.
- A pass where nothing broke AND you didn't add new attacks does **not** count —
  see §0.

## 4. THREE INSTRUMENTS (where the surface speaks / persists)

Per G1, when the surface narrates or emits audits, use all three together:
1. **Playwright** drives the DOM.
2. **Live audit-stream pull** (`/api/audit-stream`, before + after) — what the
   app actually DID.
3. **Narration listener sidecar** — what the voice actually SPOKE, and that it
   fired at all (silence where a keystone should speak is a bug).

## 5. RUN AGAINST PROD

Default to the live `main`/prod URL (verify the bundle hash advanced past your
push first). Localhost is the fallback only when prod is provably stale.

## 6. DONE means

3 consecutive deeper passes, every function driven AND attacked, every break
found-and-fixed, zero errors — plus an explicit list of anything that genuinely
couldn't be reproduced headless (routed to a device check). Commit the audit
script + register it in `docs/AUDIT_INDEX.md`.
