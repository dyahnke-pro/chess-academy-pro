# Narrating from the board — the DNA standard for thin/no-transcript videos

David 2026-08-26: *"use the narrations that are in the video, the dna outline, and
the board computer facts to narrate like Naroditsky … If we lock this system in
well, it will be used to narrate other videos not from him in his teaching style.
The app depends on it."*

This is the standard for the case `docs/DNA-outline.md` did not cover: a video
whose transcript carries little or no teaching (banter, blitz, two-person
commentary), **and** — the reason it matters — any FUTURE game that is not his at
all. When the words run thin, the **board carries the teaching**, voiced in the
DNA register. It is a strict extension of the DNA outline, not a relaxation:
every rule there still holds. Read `docs/DNA-outline.md` first.

## The three inputs and their precedence

1. **The video's own narration** (`said`, distilled). Use every genuine chess
   remark it contains (opening named, a plan, a judgment). Reference-only, never
   verbatim (plagiarism guard). For a non-his video this may be empty — fine.
2. **The DNA outline** — the voice and the beat shape. Unchanged.
3. **The board computer facts** — `scripts/voiced-authoring/facts.mjs`: per
   position, the move + its class, material, checks/captures, and the Stockfish
   eval / best move / principal variation. This is the authority the teaching is
   COMPUTED from when the transcript is silent.

Precedence for a CLAIM: transcript teaching (if present) → board facts →
nothing. Never a fourth source (memory, "book theory", invention).

## G0/G3 — why this is allowed, and where its line is

This is the supreme law, not a loophole in it. G0: *the narrator DECIDES nothing;
it voices facts computed in code.* Here the fact-computer is chess.js (the FEN is
authoritative — G3) plus Stockfish (eval, best move, PV). The author's only job
is to PHRASE those computed facts in the DNA voice. So:

- **Every board claim traces to `facts.mjs` or the transcript.** A piece is named
  on a square only if the FEN has it there. A "best move / the point is…" claim
  is the engine's `best`/`pv`, not the author's guess. A "this is roughly level /
  a pull for White" verdict is the engine `eval`, stated to a fixed side.
- **Eval is side-to-move-relative** in the facts dump. Convert to a fixed
  perspective before you voice it, and keep it depersonalized: "the engine calls
  it level", "a whisper for White" — never "you're better".
- **Do not name a tactic the engine did not show.** If `pv` is a quiet
  maneuvering line, teach the maneuver, not a fork. If `pv` is forcing, play it
  out ("if the rook takes, the line runs …, and the point is the check on g7").
- **When both transcript and engine are silent on WHY**, teach only what the move
  plainly is (develop, castle, contest the center) — stay vague rather than
  invent. The DNA outline's "when the transcript is vague, stay vague" becomes
  "when the facts are thin, stay thin". Empty > invented.

## The beat, built from facts

The DNA shape — **affirm → but → refute → play the line out → the point (named to
the pieces) → verdict** — is now sourced from the fact row:

- *affirm / what the move is* ← move class + square (FEN-true).
- *the plan / idea* ← transcript remark if any, else the engine `pv` read as the
  intention ("the knights eye d5", "the break is c4 next").
- *refute / the tempting alternative* ← when the engine `best` differs sharply
  from a natural human try, or the eval swung, name the better idea and play its
  `pv` out.
- *the point* ← the concrete end of the `pv`, named to the pieces, FEN-checked at
  that ply (a hypothetical square is always fine).
- *verdict* ← the engine `eval`, fixed-side, depersonalized.

Not every move needs all of it. A quiet developing move gets a quiet line.

## Non-student / commentary games

A demo or commentary game has no student. Keep the two-sided voice ("White
develops…, Black answers…"). Set `studentSide` to the side the narration
foregrounds (the player fighting for the win, or White by default). It affects
downstream board orientation only; the prose stays neutral.

## COVERAGE

Move-by-move, exactly as the DNA outline demands. The ONLY blank moves
(`spoken: ""`) are pure non-position nodes (reanchor duplicates with nothing new,
greetings, results-talk). A thin transcript is not a licence to go sparse — the
board fills the silence.

## Gates (all must pass before commit)

- **Bank-fidelity** — `{ply, t, fen, line}` mirror the bank exactly.
- **Board-truth** — every present-tense piece/square claim is true on that `fen`
  (`scripts/voiced-authoring/verify-shard.mjs`; hypotheticals exempt).
- **Facts-grounded** — every eval/verdict/tactic/best-move claim traces to a
  `facts.mjs` row for that node. (Author discipline; re-run facts.mjs to check.)
- **Zero-verbatim** — no ~8-word span matches `said`.
- **No move-number prefixes**; stats stay; depersonalized; no praise/filler.

## The workflow, per video

1. `node scripts/voiced-authoring/facts.mjs <id> 15` — compute the board facts.
2. `node scripts/voiced-authoring/_dump.mjs <id>` — read the thin transcript.
3. Hand-author a `_author-<id>.mjs` (the `build()` chokepoint), one `spoken` beat
   per teaching node, sourced ONLY from facts + transcript, in the DNA voice.
4. `node scripts/voiced-authoring/verify-shard.mjs` — gate. Rephrase any
   board-truth trip so the idea survives (never drop it).
5. `rm` the scratch author script; commit the `data/video-narration-voiced/<id>.json`.
