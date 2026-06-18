# Subline narration coverage audit (2026-06-18, snapshot)

**Verdict: quality is excellent where the rework is done; coverage is the
problem.** After my extension deepened every line to a real middlegame
(~24 plies), most of A's and C's entries still narrate only up to the
deviation and then play **14–18 plies in silence** — the exact "moves play in
rapid succession and end at the critical moment" failure David rejected. The
extension outran the narration. (A and C are actively closing this; numbers
below are a moving snapshot.)

## The standard (recap)

A beat on (or after) the deviation, then **beats spread across the response
moves**, driving into the middlegame with a plan — voiced AS each move plays,
not front-loaded into the intro. The Marshall rebuild (`marshall-attack`,
commit 699f0e03) and the Petrov 3.d4 rebuild (898fb8f3) are the template:
3–4 beats past the deviation, coach voice, lead-the-eye arrows, a real plan.
**That meets/exceeds the bar.**

## The gap (silent ≥4 plies past the deviation, no beat there)

- **Group A: ~722 / 888 entries** dead-end (≈16% teach past the deviation).
- **Group C: ~1,675 / 1,829 entries** dead-end (≈8% done).

Example — `ruy-lopez::0::Nf6@5` → `RUY_BERLIN`: strong intro, but its ONE beat
sits on the deviation (move 5), then the 24-ply line plays out silently. Worse,
the intro teaches the `…Nxe4` Berlin **endgame** while the data line actually
plays the `…Bc5` Berlin (`O-O Bc5 c3 O-O d4 Bb6 a4 exd4 e5 Ne4 …`) — the silent
moves don't even match the prose. **Re-anchor the prose to the line the data
actually plays, then beat it out move by move.**

## Worklist — dead-end count by opening (priority: high count + "0 done")

### Group A (`sublineNarrationE4E5.ts`)
evans-gambit 80 · italian-game 65 · petrov-defence (rebuild in flight) ·
four-knights-game 75 · vienna-game 75 · ruy-lopez 78 · kings-gambit 66 ·
two-knights-defence 56 · scotch-game 56 · philidor-defence 56 ·
scotch-gambit 26 · stafford-gambit 20 · vienna-gambit 19 · danish-gambit 10.

### Group C (`sublineNarrationD4Flank.ts`)
london-system 79 · reti-opening 78 · kings-indian-attack 78 · queens-gambit 77 ·
english-opening 73 · qgd 73 · slav-defence 70 · trompowsky-attack 70 ·
birds-opening 70 · dutch-defence 68 · nimzo-indian 66 · old-indian-defence 66 ·
benko-gambit 61 · benoni-defence 60 · anti-colle-black 60 · qga 59 ·
budapest-gambit 59 · semi-slav 57 · grunfeld 57 · catalan 56 ·
anti-kid-saemisch 50 · kings-indian-defence 45 · (+ ~12 anti-* lines, 6–36 each).

(Run the per-opening audit fresh anytime: import the three maps + course-sublines
and count entries whose deepest beat atMove ≤ atPly while the line runs ≥4 plies
past the deviation.)

## The fix (per entry — the Marshall recipe)

1. Read the **actual data line** in `course-sublines.json` (it's deep now).
2. Re-anchor the intro to THAT line (1–2 sentences — the setup's been seen).
3. Author 3–4 beats on the student's response moves past the deviation,
   landing each on a real move, driving to a middlegame plan.
4. Board-verify every claim + arrow origin (the gate checks arrows; prose
   board-accuracy is on the author's eye).
5. Coach voice: lead with the move, second person, explain the why, no
   "This is the…". Two registers (`say` + `sayShort` ≤8 words). Sources resolve.

The gate (`sublineNarration.test.ts`) enforces structure; it does NOT catch a
silent dead-end or an intro/line mismatch — those are caught only by reading.
