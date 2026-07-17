# PLAN — Non-built openings route to the coach (search cleanup)

**Owner:** David · **Started:** 2026-07-16 · **Deploy:** push to `main`

## The problem (David, from the Panov search screenshots)

Searching an opening (e.g. "Panov") returns a pile of results, and almost
all of them open a **half-built "course"** — a 2–4-move auto-walkthrough
(`WalkthroughMode`) over a raw Lichess ECO entry, with locked
Learn/Practice/Play. Only the handful we actually authored open a real
course. The half-built pages look broken and embarrass the app.

### Why they exist (the data model)

The app seeds **3,654 opening NAMES** from `openings-lichess.json`. Each
name carries a move sequence of whatever depth Lichess recorded (2–25
plies). **Depth is not "built."** "Built" = a hand-authored course
(masterclass / pro / anti / gambit) with a registered `LessonScript`.
There are **167** of those (43 masterclass + 82 pro + 35 anti + 7 gambit),
and `hasLessonScript(id)` is a verified-complete signal for them (0 gaps).
Everything else (~3,500) is a raw name with no course → the half-built
page.

## The decision (David 2026-07-16)

Search should still **show** real opening names (incl. ones we haven't
built — e.g. "Scandinavian Defense: Panov Transfer"). What must go is the
**half-built experience**, not the name. So:

- **Non-built line tapped → open the coach and AUTO-START the lesson.**
  No second ask. The coach opens with: *"We don't have a hand-built
  masterclass for <X> yet, so I'm going to teach it to you myself,"* then
  launches the DB-anchored walkthrough (`generateOpeningFromDbNarration`,
  G3-safe — moves from the DB, LLM writes prose only).
- **Built course tapped → opens normally** (unchanged).
- **Empty search results → coach CTA:** "No course for '<q>' yet — want
  the coach to teach it?" (same auto-start handoff).
- **Scandi Panov stays a Scandinavian line** — no cross-redirect to Caro.

## Phased plan

### Phase 1 — routing spine  ·  status: DONE (tests green, ship-check green)
- [x] `OpeningDetailPage.loadOpening`: after the existing masterclass
      redirect, if `!hasLessonScript(id)` → `navigate('/coach/teach?teach=<name>&auto=1', {replace:true})`.
      Single chokepoint — covers search taps, deep links, related tiles.
      Test: "reroutes a NON-built opening … to the coach auto-teach".
- [x] `CoachTeachPage`: on `?auto=1` + `?teach=<name>`, emit the
      "no masterclass, I'll teach it" line and auto-launch the walkthrough
      (reuse `handleSubmit(<name>)`). Distinct from the `?opening=` greeting
      path (opt-in "Ready to start?"). Test: "auto-teaches a NON-built
      opening arriving via ?teach=<name>&auto=1".
- [x] Empty-search state in the openings search dropdown → coach CTA
      (`teach-it-option`) that routes to the same handoff. Test: "offers a
      coach-teach CTA when a scoped opening search finds nothing".

### Phase 1.5 — the coach can actually teach short non-built lines (option B)  ·  status: DONE
David's test (2026-07-16) exposed that the coach **couldn't teach the Scandi
Panov at all** — `resolveOpeningEntry` + the fuzzy matcher both filter out
terminal-short lines (≤8-ply namesakes), returning null even for the exact
name, so the handoff hit "did you mean" instead of a lesson.
- [x] `generateOpening`/`generateOpeningFromDbNarration`/`buildFallbackTreeFromDb`
      accept an `entryOverride: { canonicalName, eco, moves }` that skips name
      resolution and builds the walkthrough straight from the given moves
      (G3-safe — moves are the DB record's).
- [x] `OpeningDetailPage` already passes `oid`; the coach auto-teach now loads
      the record via `getOpeningById` (UNFILTERED) and calls `generateOpening`
      with the override, bypassing both filters. Search-CTA path (no oid) still
      falls back to name-based resolution.
- [x] Test: `generateOpening entryOverride` — name resolution fails for the
      Scandi Panov (`ok:false`) but the override builds a tree (`ok:true`).
- Analytics (`unbuilt_opening_lesson`) fires regardless, so demand is tracked
  even when the name-based fallback can't resolve.

### Phase 1.6 — TYPING an opening name into the coach teaches it (teach-rescue)  ·  status: DONE
David tested by typing "Scandi panov" into the coach chat → got the brain's
"can't verify from grounded data" refusal. Two root causes: (1) the filtered
resolver `getOpeningMoves` hides terminal-short lines (returns null even for
the exact name), and (2) "Scandi" is an abbreviation no matcher recognizes.
- [x] Tier 2.5 teach-rescue: when `getOpeningMoves` returns null, before
      dropping to the brain, expand abbreviations + run the UNFILTERED
      `searchOpenings`, and if it resolves, teach that exact line from its DB
      PGN via the entryOverride path (option B). Q&A intents already excluded
      upstream, so no Q&A hijack. Applies to opening-tap handoff AND typed chat.
- [x] `expandOpeningAbbrev` — whole-word abbrev map (scandi→scandinavian,
      caro→caro-kann, kid, qgd, qga, nimzo, najdorff→najdorf). Extend as
      testers surface more. Moved to shared `src/utils/openingAbbrev.ts`.
- [x] `searchOpenings` self-expands abbreviations (retry-on-empty), so the
      DASHBOARD global search + the openings-page search ALSO surface casual
      input ("Scandi panov" → Scandinavian Panov). David tested the dashboard
      search and it "didn't find it" — this is that fix. The coach rescue now
      just calls searchOpenings (no pre-expand needed).
- [x] Test `CoachTeachPage.teachRescue.test.ts` — "Scandi panov" → abbrev
      expand → unfiltered search → Panov Transfer → override builds a tree.

### Phase 3 — coach "I can't verify" fallback: what ACTUALLY hits it (PostHog-grounded)  ·  status: DONE
David asked to fix the coach routing so intents dead-end less on the
`STOCK_GROUNDING_FALLBACK` ("I can't verify that precisely from grounded
data"). Rather than fix hypotheticals, pulled the REAL hitters from PostHog
`coach_answer` (answer_text ILIKE the fallback, last 45d):
- **move-narration turns on `/coach/teach`** (12 hits, 1 user, 2026-07-12
  13:41–14:05) — the Learn walkthrough spoke the stock line for a whole
  session. ALREADY FIXED by the `moveNarrationFacts` → `voiceFacts`
  short-circuit (`coachApi.ts:2482`, landed 2026-07-12) + build 143. **Zero
  recurrence after 2026-07-12** — verified, not a live regression.
- **"Scandi panov" / "Panov" searches** (4 hits, Yorkville) — the non-built
  openings work above (Phases 1–1.6, build 143). Fixed.
- one-offs: "Against the Cato khan what should I play?" (`/coach/home`, 1×,
  open-ended strategy Q&A — honest fallback), "Can you hear me" (`/coach/play`,
  1×, mic test). Not worth special routing at 1 occurrence each.
- **"Teach me tactics" / "Teach me endgames" / "Turn on hints" did NOT appear
  in the real fallback data** — those were session hypotheses. "Turn on hints"
  is already handled by `applyCoachSetting` on every real surface. But the
  `teach`/`learn` framing gap in `trainingAidRouter` was REAL in code (they
  weren't framing verbs), so closed it proactively:
- [x] `trainingAidRouter.FRAMING_RE` += `teach(?:\s+me)?|learn` → "teach me
      tactics" → tactics board drill, "teach me endgames" → endgame drill,
      "learn tactics" → tactics drill. Opening names ("teach me the Najdorf")
      carry no aid noun → still fall through to the opening router. Shared by
      every coach surface (Learn/Play/chat/mic). Test: `trainingAidRouter.test.ts`
      "teach me / learn framing".

### Phase 2 — polish  ·  status: partial
- [x] Keep the Accelerated Panov → Caro Panov-tab transposition redirect
      (`masterclassRedirect.ts`) — it opens a REAL course, better than a
      redundant coach lesson. Excludes the …e5 Open Variation.
- [ ] Optional: collapse exact-duplicate-name rows in search results
      (deferred — not blocking; non-built dups now all hand off to coach).

## Decisions log
- 2026-07-16 — Non-built → coach auto-teach (not "hide from search", not
  "keep bare page"). David: "open the coach tab and cue the coach to start
  making the lesson … we do not have a hand built masterclass for x
  opening so I am going to teach it to you."
- 2026-07-16 — Reverted the first attempt (hide terminal-short stubs from
  `searchOpenings`) — non-built names should SHOW now, not be filtered.

## Blast radius / next-session note
The detail-page reroute applies to **every** non-built opening (~3,500),
at every entry point — not just search. Tapping any raw ECO opening now
bounces to the coach auto-teach instead of the bare-reference page (this
also drops that page's Wikipedia "Understand" zone for those openings —
intended per David's call). Verify with the coach-teach + openings audits.
