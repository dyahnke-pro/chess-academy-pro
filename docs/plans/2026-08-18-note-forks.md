# Making the hand-written notes audible — the fork build (2026-08-18)

## The problem this solves

A note anchored where no lesson goes is **silent in Watch and Learn**. It still
fires in free play and review, where the student reaches whatever they reach —
but that is not where most students meet the coach, so a note written off-line
is teaching almost nobody.

Measured at the start of this session: **10 of 64** hand-written notes sat on a
line the repertoire teaches. The other 54 were written from wherever the video
happened to settle, which has no reason to match where the repertoire goes.

## The fix, and the rule it must not break

Add the video's line as a **BRANCH** at the position where it leaves our spine.
The spine — the most-played master move at each ply — is untouched. What gets
added is an alternative that a strong teacher actually played and taught,
chess.js-validated, with the teaching already written against it.

Steering the SPINE toward the notes would be the violation: it would mean
teaching what we can narrate instead of what the data says is theory, and it
would be invisible afterwards because the lesson would still look coherent.

## Result

| | notes on a taught line |
|---|---|
| before | 10 / 64 |
| after 10 forks | 26 / 71 |

Ten variations added, across nine openings. Each is gated in
`videoNoteSplice.test.ts`: the fork must still speak a hand-written note through
the real splice (retrieval → spoken register → board-truth grader). Nothing else
notices if a fork is later renamed or trimmed — the opening still works, the
gates still pass, and the notes simply go quiet again.

**"On a taught line" is not yet "on a taught surface"** — see the section below
before treating this table as delivery.

## The pipeline

```
fork-plan.mjs           # where does each off-line note leave the taught lines?
build-opening-spine.mjs # how does that branch continue, per master data?
fork-check.mjs          # is it fit to add, and what teaching does it buy?
line-profile.mjs        # for a flagged line: WHERE does it go wrong?
```

`fork-check` is the gate. A branch has to clear all of:

- **branches at ply 4+** — a fork at ply 0-3 is a different opening;
- **reaches a middlegame** (G9.3 Gate B) and is at least 10 half-moves;
- **played in ≥30 master games at the fork** — below that it is a curiosity, not
  theory, and the deep tail such a branch produces comes from the amateur
  database rather than from master practice;
- **results that do not fall away from the fork point**;
- **unlocks at least one note** — a branch that buys no teaching is not a fork.

## Two calibration mistakes worth not repeating

**An absolute score threshold is the wrong test.** Flagging "under 40%" fired on
four sound Black lines, because Black scores under 50% in every opening ever
played. The question is narrower — is this branch worse than the position the
lesson already walks to? The fork point is that baseline and it is free.

**The worst point needs a real sample.** Taking the minimum score over the whole
branch turns any thin tail into a flag; it fired on a line that held level for
eleven plies and then ran out of games. The threshold is 30 games, which is what
makes the flag mean "masters do badly here" instead of "the sample got small".

## What was rejected, and why

Six candidate forks were dropped rather than shipped:

| branch | reason |
|---|---|
| Belgrade `5...h6` | 4 master games at the fork |
| Fantasy `3...Nd7` | 10 games; the tail comes from the amateur database |
| Fantasy `3...Nf6` | 2 games |
| Italian Four Knights `4...Nd4` | 1 game |
| Traxler `5.d4` | 13 games, and the line dies at ply 11 in master play |
| anti-KID `Bf4` with ...c6/a6/b5 | 494 games at the branch point say Black's plan scores 31% — the data disagrees with the lesson, so the lesson does not become a taught line |
| Grünfeld fianchetto tabia | reachable only by transposition; filing it under the nearest host would have miscategorised it |

Their notes stay where they are. Free play and review is a legitimate home for a
note; a bad taught line is not.

## The wire that does not fire yet — READ THIS BEFORE CALLING THE FORKS DONE

The forks landed in `repertoire.json`, the gates went green, and **no surface
shows them.** `buildVariationTabs` lists a variation only when it is hand-listed
in its opening's curated array or carries its own `LessonScript` — and it gates
BOTH the openings-detail tabs and the `/coach/teach` line picker. So ten
variations sit in the shipped bundle, seeded into Dexie on a real device, offered
by nothing.

Nothing in the test suite could see it. `videoNoteSplice` walks the variation's
own PGN, so it proves the notes fire on those positions and says nothing about
whether a student can get there. It was found by driving prod: the Caro picker
offered seven tiles for eight variations.

**Adding curated tab entries is NOT the fix on its own, and was reverted.**
`lessonTabIntegrity` is a locked gate: every masterclass variation tab must have
its own `LessonScript`, or it falls back to the main-line lesson and shows the
student a duplicate. Wiring the ten tabs failed it on all nine openings, with the
gate stating the choice outright — *"Add a lesson … or drop the tab."*

**So the remaining step is authoring, not wiring:** one hand-written
`LessonScript` per fork, keyed `<openingId>::<variation name>`, to the masterclass
standard (two registers on every beat, lead-the-eye arrows, `sources[]`,
board-verified). The tab entry goes in with the lesson, in the same change. Half
of the teaching already exists — each fork was chosen because notes were written
against its positions, and those notes are the spine of the beats.

Until then the forks are not wasted: the notes fire on those positions in free
play and review, where a student reaches whatever they reach.

## Also in this pass

- **`reasonCheck` crashed on any move that answers a check.** `setTurn` plays a
  null move, which is illegal while the side to move is in check, so reading a
  position "from their side" threw instead of returning a verdict — taking the
  whole run with it. Now the FEN's active field is rewritten instead.
- **Structured reasons retrofitted onto 24 older notes**, prose-backed only: a
  true fact a note never asserts is not a reason for the move. Backlog 48 → 27.
- **One mis-anchored note moved onto the move it describes** — a note about
  capturing on f7, filed two plies later on the bishop's retreat.
- **New notes**: the anti-KID Bf4 system (4) and the Fantasy `3...e6` main line
  (3), every board claim checked with chess.js first.

## Next

- 28 tracks in `data/video-pending/` still owe notes.
- 27 notes still carry no structured reasons.
- The engine soundness sweep did NOT run — no Stockfish binary in this
  container, and the bundled WASM builds would not drive from node. The lines
  are data-derived (most-played master move at every ply) and results-checked,
  which is a strong prior but is not the sweep. Run
  `scripts/soundness-sweep.mjs` where a binary is available.
