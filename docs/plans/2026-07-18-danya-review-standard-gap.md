# The Danya Post-Game-Review Standard — gap analysis (David 2026-07-18)

Source: 10 Naroditsky speedrun transcripts pulled via yt-dlp (tv client +
`--ignore-no-formats-error` — the working recipe when android_vr bot-checks),
saved to gitignored `data/sources/naroditsky-voice/transcripts/speedrun-*.txt`
(REFERENCE ONLY — never quote, never ship; plagiarism guard per CLAUDE.md).
Videos: hzotV0aslmY (750), QxHsw4ZS2Ts (Boor/Slav), iwCO5bNiuNw (1310),
G1UdMY89U1k (Smith-Morra), d6tZXETpqT0 (QGD Carlsbad), oH407-a1v-4 (1370),
bIxvPbhuTpo (1900), rk_9n_Kj6EE (Alapin), ktoa6lk6qNk (Alapin), U7pqt57VwuU (QGA).

## His method (measured, not vibes)

Technique counts across the 10 videos (regex sweep, conservative undercount):
viewer questions 59 · theory references 42 · distilled principles 15 ·
GM/model-game references 10 · explicit alternative-line branches 6+ (phrasing
varies widely; the real count per video is higher — nearly every review moment
branches).

The seven load-bearing techniques, all combined in ONE review:
1. **Why-driven narrative on every move** — not only flagged moves; quiet moves
   get plans ("we can pressure the queenside by bringing the rook to c8").
2. **Socratic questions ~every 2-3 minutes** — "who can spot a nice square for
   this knight?", "why or why not should we open the center, using the logic
   we've discussed?", "would Bishop d3 be acceptable? Why not?" Then he ANSWERS
   the wrong candidates concretely (plays out why Bd3 fails: "Qxd3 and he's
   opened the d-file — Black is still much better").
3. **Alternative lines PLAYED OUT on the board** — he branches, plays 4-10
   plies of the refutation/better plan, returns: "but let's go back to the
   game." The student SEES the line, never just hears the SAN.
4. **GM model games woven in on theme-match** — mid-review of an outpost/
   advantage-transformation game he pulls up Fischer–Petrosian 1971, walks the
   same theme (knight outpost → Bxd7 transformation → rooks to the 7th), and
   ties it back: "much like in our game… a very similar narrative."
5. **Opening-theory contextualization** — what was book, where the game left
   theory, why the move order matters (42 refs across 10 videos).
6. **Portable principle distillation** — "piece of advice: when you're looking
   for a discovered attack, make sure you're not letting your opponent
   recapture AND defend the target at the same time." A rule that travels to
   the next game, stated at the moment it was violated.
7. **One thematic through-line per game** — the game is ABOUT something
   ("transformation of the advantage"), named and returned to.

## Ours today (from CoachGameReview.tsx + coachFeatureService.ts, read end-to-end)

AT or NEAR standard (the interrogation layer — deliberately Danya-shaped):
- Find-the-shot (missed-win guided find, hint/reveal/takeback) ✅
- Why-did-you-play-that faucet on student mistakes (rating-gated) ✅
- Blunder rewind → hold challenge ("last holdable moment") ✅
- Turning-point question at game end ✅
- Grounded per-ply narration (classification + best move + board-geometry
  why-better clause) ✅ but terse, facts-only
- Accuracy/phase summary, citations with played-vs-suggested squares ✅
- Mid-review chat with the brain ✅
- Weakness capture → mistake puzzles → drills (a loop Danya DOESN'T have) ✅

THE GAPS (ranked):
1. **No played-out alternative lines.** "Show engine lines" renders MultiPV
   SANs as TEXT; the old what-if board was REMOVED in ship-4. The student
   never watches the refutation or the better plan happen. This is the #1
   structural distance from his standard.
2. **No model games.** Zero GM-game injection in review — while the app
   already ships 646 model-games.json entries, ~2MB pro-game-references, the
   masters explorer proxy, and lichess game export. All ingredients, no dish.
3. **No principle distillation.** We say "that drops the knight" but never
   "whenever X, check Y" — the misconception classifier already TAGS the
   pattern class internally; the review never voices it as a portable rule.
4. **No theory-departure moment.** Opening is named in the intro; we never
   show "book ended here — the main move is X because Y" (openings-lichess +
   masters DB make this computable).
5. **No thematic through-line.** Intro/closing count errors; the game is never
   ABOUT something.
6. **Quiet-move plans.** Danya narrates plans on unflagged moves; ours are
   silent between mistakes (partly a deliberate voice-rule choice — keystones
   only — but the plan-level commentary is what makes his walk feel coached).

## Verdict
~55-60% of the standard. The question/diagnostic layer is genuinely his
format already. The distance is: lines you can WATCH (1), masters woven in
(2), and the connective tissue (3-5). All five gaps are buildable grounded:
engine PV playback for (1), theme-matched model-game lookup for (2),
misconception-tag → principle text for (3), masters-DB divergence ply for
(4), dominant-theme classification for (5). G0-clean throughout — every one
is computed, the LLM (if used at all) only phrases.

## Status: analysis only — no build started (David asked for the distance).
