# Video-narration rewrite — the banked bank → our-words DNA narration (David 2026-08-24)

**David:** *"i need t stamp and position attached to each note"* + *"the OG plan
was to have you rewrite each narration to not lose context or quality … can you
handle both?"* + *"if you need to write any narrations i want you to do it using
the DNA outline."*

Branch: `claude/gem-teaching-learn-coach-1oe5pw`. NARRATION WORK — stays on the
branch, David judges the Dragon proof before any scale-up / ship.

## The state we found (verified, not guessed)

- The whole farmed corpus (~65k notes, ~2,265 videos) carries **zero timestamps**
  and only ~10% carry a position. The distiller (`distill-v2.mjs`) *computes* a
  per-note `t`, but the shipped `danya-teachings.json` dropped it (0 / 11,426).
- The real asset is the **video-align bank**: `data/video-narration/<id>.json`,
  **438 Naroditsky videos** where the board was read off the *video pixels*
  frame-by-frame, so every spoken moment carries a true `{ply, t, fen, line}`.
  Built by `scripts/video-align/` (`track.mjs` etc.), paired at commit `09120f6`,
  then **removed from the tree** in the 3.7 iOS release (`fe0224f`) for size.
  Recover with `git show 09120f6:data/video-narration/<id>.json`.
- Each banked move's `said` is **raw verbatim transcript** — cannot ship
  (plagiarism guard). **No rewrite was ever done** (no `spoken`/reworded field
  on any branch). That rewrite is this task.

## What "both" means, and that it's tractable

- **Position + timestamp: already solved** for the 438 (the bank). Deterministic,
  free — we copy `{ply, t, fen, line}` straight through.
- **The rewrite is the only work left**, and it's the quality lever: read each
  `said` for the IDEAS at that exact board, write ORIGINAL our-words prose to the
  DNA outline, board-true to the `fen`.

## The DNA outline (the standard for every narration written here)

Per anchored position:
- `spoken` (= `explains`) — 1–3 sentences reading THIS position (what matters, why)
- `teaches` — the transferable idea
- `plans` — the forward plan ("" if none)

Spoken-beat shape where the moment warrants: **affirm → but → refute → play the
line out → the point (tactic named to the pieces) → verdict.**

Absolute rules (ride with every line): original prose only (zero verbatim from
`said`); never name speaker/video/opponent; the banked `fen` is authoritative —
phrase only what is true on that board, never invent a move/square; concept-first;
no praise; no filler; no move-number prefixes ("Nf3", never "12.Nf3").

## Output — a distinctly labeled folder (David: "placed in a different folder")

`data/video-narration-voiced/<id>.json`. Mirrors the bank but replaces verbatim
`said` with our-words `spoken` (+ `teaches`/`plans`); `{ply, t, fen, line}`
untouched; carries `voice: "danya-dna"`, `source: "yt:<id>"`, `openingName`.
The raw bank (`data/video-narration/`) is gitignored — verbatim never re-enters
the tree.

## Every voiced file is verified

1. **Bank-fidelity** — `{ply, t, fen, line}` mirror the bank exactly.
2. **Board-truth** — every piece/square a `spoken` line names is true on its
   `fen` (the narrationAccuracy contract, applied at author time).
3. Silence on routine/duplicate/rewind plies (empty `spoken`) — save voice for
   moments that change understanding.

## SCOPE — ALL openings (David 2026-08-24: "i want you rewriting all openings. not just the dragon ones")

The deliverable is the **entire 438-video Naroditsky bank**, every opening — not
the 7 Dragon videos. The Dragon proof is only the quality template.

**Honest note on "you rewriting":** 438 videos × ~60 moments ≈ **26k narrations**.
That can't be hand-typed one line at a time in chat. So it runs as a **gated
authoring batch I drive and review**: a strong model (Opus-class, NOT the weak
DeepSeek pass that lost context the first time) rewrites each video to the DNA
outline, and EVERY line clears the same two hard gates the Dragon proof cleared —
**bank-fidelity** (`{ply,t,fen,line}` untouched) and **board-truth** (every
piece/square named is true on its `fen`) — plus a **no-verbatim** check against
`said`. I review per opening against the hand-written Dragon bar. Any file that
fails a gate is regenerated, never shipped. This is the only way to cover all
openings AND hold the quality; literal hand-authoring of 26k moments is not real.

## Phased plan

- [x] **P0 — the Dragon proof, hand-written by me.** `YzI6qI-33_U` — 55 moves,
  11 narrated to the DNA outline, 44 silent. Bank-fidelity PASS; all 13
  load-bearing board claims true. The gold reference the batch must match.
- [ ] **P1 — the gated batch engine.** `scripts/danya-corpus/rewrite-video-narration.mjs`:
  read a banked file → detect its opening (line → openings DB) → per anchored
  position, rewrite `said` → our-words DNA outline on a strong model → run
  bank-fidelity + board-truth + no-verbatim gates → write
  `data/video-narration-voiced/<id>.json`. Resumable, idempotent.
- [ ] **P2 — run it over all 438, grouped by opening.** Review per opening
  against the Dragon bar; regen any gate failures. Log per-opening coverage.
- [ ] **P3 — merge per opening into branching walkthroughs** (shared spine where
  videos agree, branches at divergence, deduped), note-driven — the note LEADS
  the beat (G0), arrows from the note.
- [ ] **P4 — wire the voiced corpus into the teach path** as the note source for
  `generateOpeningFromDbNarration` / the note-driven walkthrough, behind the
  usual gates; real-game audit; David approves → ship.

## Decisions log
- 2026-08-24 David: rewrite must use the DNA outline; timestamp + position on
  every note; new labeled folder; narration stays on-branch until he approves.

## Next-session pickup
1. Author P1 (6 more Dragon videos) with the same author-script pattern
   (`/tmp/author-dragon-*.mjs` shape → `data/video-narration-voiced/<id>.json`),
   verifying bank-fidelity + board-truth per file.
2. Then P2 merge. The bank is recoverable at `09120f6` for any video id.
