# Vienna Game — how it SHOULD work, and how it DOES (walkthrough + audit)

David's overnight ask (2026-05-24): *"tell me how the Vienna SHOULD work
and then walk through the ENTIRE thing, interactive audit telling me how it
does work and then fix what needs fixing to make it work like it should …
check wiring and make sure all data is connected. Then we make the
playbook for future sessions so they can build on their own."*

This doc is the deliverable. Part 1 = the spec (how it SHOULD work). Part 2
= the interactive walkthrough (how it DOES, tab by tab, function by
function). Part 3 = what I fixed. Part 4 = what's flagged for David.

---

## PART 1 — How the Vienna SHOULD work (the spec)

### The shape (same for every masterclass — this IS the standard)

`/openings/vienna-game` opens the **detail page**. The user sees:

1. **A header** — title "Vienna Game", favourite heart, and the top-right
   **"i"** help bubble (auto-opens first visit, then replayable). The bubble
   teaches the WLPP climb.
2. **A tab strip** — the **Classical (main)** pill plus 4 curated variation
   tabs. For the Vienna the curated set (locked in `variationTabs.ts`) is:
   - **Classical** (main line) — `e4 e5 Nc3 Nf6 Bc4 Bc5 d3 …` the slow
     Italian-Vienna hybrid; the spine every other line reuses.
   - **Gambit** — `e4 e5 Nc3 Nf6 f4` the Vienna Gambit, White's most
     aggressive try.
   - **vs 2…Nc6** — `e4 e5 Nc3 Nc6 f4` the lines where Black develops the
     knight first (Hamppe-Allgaier / Pierce territory).
   - **Frankenstein-Dracula** — `e4 e5 Nc3 Nf6 Bc4 Nxe4` Black grabs the
     e4-pawn; White gets a raging attack for it (the famous rook-grab line).
   - **Paulsen** — `e4 e5 Nc3 Nf6 g3` the quiet fianchetto setup.
3. **Per tab, an identical set of functions** (the "every tab works the
   same" contract):
   - **WLPP buttons** — Watch / Learn / Practice / Play.
     - **Watch**: the line auto-plays while the coach narrates each move in
       full, hand-authored prose. Lead-the-eye arrows + highlights on every
       narrated square. Ends with a CTA that **steps to Learn** (not Play).
     - **Learn**: the opponent's moves auto-play; the student plays their
       (White) moves on the board; the voice gives a **truncated cue** per
       move (move + 3–5-word echo of the Watch idea).
     - **Practice**: same line, **silent**, with a **Hint** button.
     - **Play**: a real game vs the coach, **locked to this exact line/
       variation** (not the generic Vienna) — `customLine` carries the tab's
       PGN.
   - **Overview / Key Ideas** — the prose ideas for the line.
   - **Weapons (punish-gems + named traps)** — the section's spine is the
     **mined punish-gems**: a common opponent inaccuracy on this line + the
     engine-confirmed crush, in full WLPP, ordered by strength (confirmed
     crushes first, positional edges last, each honestly labelled). Named
     traps (Würzburger, Hamppe-Allgaier, Hamppe-Muzio, Frankenstein
     rook-grab, Copycat Qxf2+) layer on top where real.
   - **Model game** — ONE real master game per tab, always a **White win**
     (student's side), shown via the model-game viewer.
   - **Coach chat** — scoped to the opening + the active variation.

### What "all data connected" means for the Vienna specifically

- **5 curated tabs** → each resolves to a **distinct, non-null lesson**
  (`VIENNA_GAME_LESSON` for main; `VIENNA_VARIATION_LESSONS` for the 4).
- **21 punish-gems** (`punish-gems.json`, openingId `vienna-game`): 16
  `confirmed` + 5 `positional`. **Every one hand-narrated** (Watch prose +
  Learn cues) in `punishGemNarration.ts`, alignment-gated. They distribute
  across the tabs by inverse-prefix (a gem surfaces on the tab whose spine it
  is a prefix of).
- **Named traps** — `VIENNA_TRAP_LESSONS` (Würzburger, Hamppe-Allgaier,
  Hamppe-Muzio, Frankenstein, Copycat-Queen families), each routed to its
  correct tab.
- **5 model games** (`vienna-model-games.json`), one per tab, all `1-0`
  (White wins): Firouzja–Carlsen (Classical), Andreikin–Kramnik (Gambit),
  Kasparov–Caruana (vs 2…Nc6), Firouzja–Aronian (Frankenstein-Dracula),
  Mamedyarov–Kramnik (Paulsen).
- **4 key ideas** on the opening record.
- **The board** is `ConsistentChessboard`; voice obeys the verbosity
  setting; narration is grounded (gates: lessonIntegrity, narrationAccuracy,
  punishGems, wlppNarration).

---

## PART 2 — How it DOES work (interactive walkthrough)

Driven personally against `localhost:5173` with a fresh (cold-Dexie) context,
`scripts/audit-vienna-walkthrough.mjs`. The 3-pass post-deploy loop
(`audit-punish-gems-loop.mjs AUDIT_OPENING=vienna-game`) also passed — 3
consecutive error-free passes, every function, deepening each pass.

### Tab strip — ✅ matches spec
5 tabs render, all distinct: **Main line · Gambit · vs 2…Nc6 ·
Frankenstein-Dracula · Paulsen**. (Internally these are repertoire variation
indices main / 0 / 4 / 1 / 6 — see Part 4 on index 1.)

### Lessons — ✅ all distinct, all hand-authored
Each tab's Watch opens a DIFFERENT lesson with hand-written prose:
| Tab | Lesson title | Watch opening (decoded off /api/tts) |
|---|---|---|
| Main | "The Vienna Game — A Master Class" | "Welcome. Today we study the opening forged in the Viennese chess clubs of the 1860s — the chosen weapon of Steinitz…" |
| Gambit | "Vienna Game — The Gambit (3.f4)" | "Welcome to the Vienna Gambit, the opening's loudest weapon. After 2.Nc3 Nf6 White does what Edward Lasker…" |
| vs 2…Nc6 | "Vienna Game — Black plays 2…Nc6" | "At amateur level Black plays 2…Nc6 even more often than 2…Nf6 — almost forty per cent…" |
| Frankenstein-Dracula | "Vienna Game — The Frankenstein-Dracula" | "The Frankenstein-Dracula begins quietly enough: 3.Bc4, the Italian-Vienna bishop pointing at f7…" |
| Paulsen | "Vienna Game — The Paulsen (3.g3)" | "3.g3 — the Paulsen Variation, named for Louis Paulsen who pioneered fianchetto systems…" |

No duplicate, no wrong-tab, no empty lesson. (TTS renders SAN as speech —
"Nc3" → "knight to c3" — which is correct for the spoken Watch prose.)

### Weapons — ✅ gems sorted + narrated, traps routed per tab
- **Punish-gems per tab:** Main **21** (the full set), vs 2…Nc6 **5**,
  Frankenstein-Dracula **5**, Paulsen **3**, Gambit **0**. Every gem tile
  names its real inaccuracy + punish ("Opponent plays Nd4 — punish with
  Nxd6+"). No empty gem card.
- **Ordering (Main tab) is strongest→weakest by engine eval:** Nd4→Nxd6+
  (cp 820), Bb6→Qxg7 (557), g6→Qxe5+ (483), Qg6→Qxg6 (448), d6→Nxf2 (446),
  … down through the 16 `confirmed` crushes, THEN the 5 `positional` edges
  last (Bxf3→Qxf3 88, e4→Qe2 85, Ng4→Ng5 76, Bg4→h3 62, f5→Nxe5 58). Matches
  the doctrine: confirmed first, positional honestly labelled at the bottom.
- **Named traps routed to the right tab:** Würzburger (Gambit);
  Hamppe-Allgaier, Hamppe-Muzio, Copycat-Qg4, Pierce Gambit, Steinitz
  King-Walk (vs 2…Nc6); Frankenstein Nxa8 Raid + the "3…Nxe4 demands 4.Qh5"
  warning (Frankenstein-Dracula).

### Model games — ✅ one per tab, all White wins (student's side)
`vienna-model-games.json` carries 5, each tagged to a tab, all `1-0`:
Firouzja–Carlsen (Main), Andreikin–Kramnik (Gambit), Kasparov–Caruana
(vs 2…Nc6), Firouzja–Aronian (Frankenstein-Dracula), Mamedyarov–Kramnik
(Paulsen). None show White losing — passes the "student side wins" rule.

### WLPP plumbing — ✅ (code-verified where headless can't interact)
- **Watch** auto-plays with hand-authored prose narration (decoded above).
- **Learn** speaks the truncated cue: `lessonToPlayableLine` sets
  `learnCues[ply] = beat.sayShort`, `PlayableLinePlayer` speaks
  `line.learnCues?.[i]` (falls back to `sanToSpeech`). Variation/gem/trap
  Learn all carried the same way.
- **Practice** is silent (mode-aware `prefetchAudio` fires no TTS).
- **Play** is locked to the exact line: variation-play passes
  `customLine={opening.variations[selectedTabIndex]}`; gem-play and
  named-trap-play pass their own `customLine`. The generic main line is
  NOT used for a variation's Play.

### Errors — ✅ none
0 page errors across the full walk. The only console noise is a cert warning
on a blocked external resource (sandbox network policy), not app code.

## PART 3 — Fixes applied
- **None needed for the Vienna lesson surface itself** — it already works
  like the spec. (Honest result: the "fix what's broken" step found nothing
  broken in the masterclass flow; I did not invent fixes to look busy.)
- Onboarding: shipped the "i" help bubbles (separate batch) — note the
  Masterclass help **auto-opens on first visit** and is a modal; the probe
  confirmed it overlays the page until dismissed (intended), then stays
  behind the "i".

## PART 4 — Flagged for David (not blind-fixed, per "when unsure, ask")
1. **Latent data mislabel — Frankenstein-Dracula / "Falkbeer".** The
   "Frankenstein-Dracula" TAB binds to repertoire variation **index 1**,
   which is **named "Falkbeer Variation"** in `repertoire.json` even though
   its PGN is the Frankenstein-Dracula main line (the Nb5…Nxc7+…Nxa8
   rook-raid). The user sees the correct label "Frankenstein-Dracula" (from
   the curated `variationTabs.ts`), the correct lesson, the correct trap, and
   the correct model game — so it is **NOT user-visible-broken**. But:
   - "Falkbeer" is a King's-Gambit term, not a Vienna line — the name is
     factually wrong.
   - There is a SECOND entry, **index 3, actually named
     "Frankenstein-Dracula"** (a quieter 3…Nxe4 4.Qh5 Nd6 5.Bb3 **Be7** line),
     which is NOT surfaced as a tab — an orphaned near-duplicate.
   - The curated tab regex `/frankenstein|falkbeer/i` matches index 1 before
     index 3 purely by order — fragile if the array is ever reordered.
   - **Recommended fix (needs your call on naming):** rename variation [1]
     from "Falkbeer Variation" to its real name and reconcile vs the [3]
     entry (keep one as the tab, fold/rename the other). This touches
     `repertoire.json` + the `VIENNA_VARIATION_LESSONS` alias key
     (`'vienna-game::Falkbeer Variation'`) + any `linesDiscovered` indices,
     so I left it for you rather than guess and risk the working state.
   - Other non-surfaced Vienna entries (Stanley [2], Vienna Gambit Accepted
     [5], Copycat [7]) are intentionally not in the curated 5-tab set — not a
     bug, just noting they exist in the data.
2. **Model-game card heading** — the viewer mounts and the data is correct;
   the probe's text-sniff for the heading was weak ("maybe" on 4/5 tabs). Not
   a defect, just flagging the audit signal is soft if you want a hard check
   added later.
