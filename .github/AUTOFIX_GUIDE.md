# Autofix operating guide (condensed)

You are an autonomous Claude session triaging ONE live production error and
opening a **draft PR**. This is the distilled context you need — read it
instead of the full `CLAUDE.md` (~400KB), which will exhaust your turn/token
budget. When a fix touches a specific subsystem, **grep `CLAUDE.md`** for that
subsystem's rules (e.g. `grep -n "voiceService\|narration\|coach" CLAUDE.md`)
rather than reading the whole file.

## Your scope (hard limits)
- Fix the SINGLE highest-impact genuine code bug in the digest. One bug, one PR.
- Open a **DRAFT** PR against `main`. **NEVER push to `main`.** David reviews + merges.
- Minimal, surgical changes. No unrelated refactors.
- If nothing in the digest is a genuinely fixable code bug, open **NO PR** —
  comment your triage conclusion on the `🐛 PostHog error watch` tracking issue.

## Triage rules
- **Fix** high-occurrence crashes: `uncaught-error`, `unhandled-rejection`,
  `error-boundary`, `continuity-error`, `sanitizer-leak`, IndexedDB/transaction errors.
- **Skip (note, don't patch)** architectural grounding signals: `claim-validator-trip`,
  `master-play-enforcement-fallback`. These are by-design guardrails, not bugs.
- **Skip `ProviderTokensEmpty`** entirely — a provider ran out of credits; it's an
  ops alert for David to top up, never a code change. Never open a PR for it.
- **`coach non-answer` IS fixable** (reason `re-ask` / `fallback-or-greeting`): the
  coach connected but didn't address the question. Root cause is usually an intent
  classifier in `src/coach/coachService.ts` not recognizing the phrasing — broaden the
  matching router the "thesaurus" way `src/coach/questionIntents.test.ts` does, and add
  the failing phrasing to that test.

## STOP before you patch — check prior attempts (anti-bandaid gate)
This is the #1 failure mode of this autofix and it is **mandatory** to run first.
Each autofix run is stateless, so without this check it re-patches the SAME symptom
every cycle. Before writing any code:
1. **Look for prior attempts on this same error/subsystem.** Run:
   `gh pr list --state all --search "fix <keyword>" --limit 20` AND
   `git branch -r --list 'origin/fix/*<keyword>*'` (keyword = the crashing
   subsystem, e.g. `stockfish`, `transaction`, `sanitizer`).
2. **If ≥2 prior PRs/branches already target this same error or symptom, DO NOT open
   another patch.** Per CLAUDE.md's core doctrine: "if fix N+1 treats the same
   symptom from a different angle, the disease is architectural — stop and invert."
   Instead: either implement the ARCHITECTURAL root cause (the one all the prior
   bandaids danced around), or — if that needs a design decision — open **NO PR** and
   comment the escalation (what the real root cause is, why it needs David) on the
   `🐛 PostHog error watch` tracking issue.
3. **A better error message, a dedup window, a wider try/catch, or "suppress spurious
   X" is DIAGNOSTICS, not a crash fix.** For a crash (OOM, worker init-fail,
   uncaught, unhandled-rejection) the fix must change WHY it happens — resource
   limits, lifecycle, variant/engine selection, a real guard on the failing path —
   not how it is reported or deduped. If the ONLY thing you can do is improve
   diagnostics, say so explicitly in the PR body and do NOT claim it fixes the crash.
   > Cautionary tale: the Stockfish `[object ErrorEvent]` / multi-thread OOM crash
   > drew 5+ autofix PRs — all "extract the real error message" / "dedup the crash" /
   > "suppress the spurious cascade." Every one was a bandaid. The actual root cause
   > was WASM engine variant selection (use the `asm` build on iOS so the threaded
   > heap never OOMs — `stockfishEngine.ts`). Don't be PR #6 of a symptom.

## How to fix (the bar)
- **Root cause, not symptom.** Name the disease in one sentence, then **sweep**:
  grep for every other instance of the same pattern and fix them all. "I fixed the
  one in the stack trace" is not the bar. Re-read the anti-bandaid gate above: if
  your fix only changes how the error is logged/deduped/swallowed, it is a symptom
  patch — go find why the code path fails instead.
- **The DB/engine owns chess truth; the LLM only writes prose.** Never make the LLM
  decide moves, evals, FENs, or which line/puzzle — those come from chess.js /
  Stockfish / the data files. If your fix adds a validator/regex/retry to police LLM
  output, stop — compute the answer in code instead.
- **Voice** always routes through `voiceService` (`speakInternal` / `speakForced` /
  `speakReadAloud`); never a new fetch-then-play helper. `/api/tts` is streaming.

## Code conventions (enforced by lint/typecheck)
- TypeScript strict. **No `any`** (use `unknown` + guards). Explicit param/return types.
- **Named exports only** — except `api/*` serverless handlers, which use `export default`.
- Functional React components only; Tailwind utility classes only; no inline styles.
- **Never `localStorage`** — use Dexie/IndexedDB. Import `openai` only in `coachApi.ts`.
  Run Stockfish only through `stockfishEngine.ts`. Don't mock chess.js in tests.
- New features need tests. Test files co-located (`Foo.tsx` → `Foo.test.tsx`).

## Verify before opening the PR
- Run `npm run ship-check` — typecheck + lint (0 errors) + content gates must pass.
  It prints `READY TO PUSH` on success. Do not open the PR until it's green.

## PR body
Name the error, the root cause, the fix, and what you could NOT verify from CI
(e.g. the live 3-instrument prod audit, which David runs after merge). Title: `fix: <bug>`.
