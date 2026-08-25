# The DNA outline — the single standard for every voiced narration

David 2026-08-24 ("if you need to write any narrations I want you to do it using
the DNA outline") + 2026-08-25 (hand-authored, zero LLM, move by move, nothing
lost). This is the authoring standard for every line in `data/video-narration-voiced/`
and therefore for teach-me-X walkthroughs, matchups, and the Tier-1 corpus that
feeds free-play / review / tactics. Read it before writing a single narration.

## What the DNA is

The house teaching voice — Naroditsky's instructive register, depersonalized
(never his name, never the channel/video). It is a STYLE, applied to every
opening regardless of whose game it is: concept-first, facts then the point, warm
but rigorous, one clipped spark of warmth ("clean", "there it is") — never
sentiment, never philosophizing. Present-tense live teaching as the demo game
unfolds ("White develops the knight, eyeing the centre; Black answers with…, and
the tension builds"). It is NOT the user's game, so: no "you blundered", no "the
best move was", no "your plan" — it's "White's plan / Black's plan".

## The video makes the line; our teaching is matched to it

The move spine we teach is the exact line played/taught in the video (the bank's
`line`/`fen`, chess.js-legal). We do not pull a line from a DB and bolt words on.
Read the distilled transcript ("watching the video") and write what he taught at
each move, in our words.

## Per-position fields (each anchored to `fen` + `t`)

- **`spoken`** — the teaching read at THIS position: the idea behind the move,
  the plan, the threat, the subtlety, and any hypothetical / what-if line he
  walks ("if Black takes, then…"). Length uncapped — match his depth.
- **`teaches`** — the transferable idea (optional).
- **`plans`** — the forward plan (optional; "" if none).

Where the moment warrants, the spoken beat takes this shape (use what fits — not
every line needs all of it):

> **affirm → but → refute → play the line out → the point (tactic named to the
> pieces) → verdict.**

## COVERAGE — MOVE BY MOVE (David 2026-08-25, supersedes "pick the moments")

Every move that carries teaching about the position gets a `spoken` line. Capture
**everything** he says about the position, including the **hypothetical / analysis
lines** — do not summarize detail away. The ONLY moves left blank (`spoken: ""`)
are pure non-position chatter (greetings, results-talk, "we'll have plenty after
the game"). When unsure whether a line is position-relevant, KEEP it.

> This replaces the earlier "silence on routine plies / pick the moments that
> change understanding" rule. That was the sparse approach David rejected as
> "bastardized, sloppy, no content".

## Absolute rules (ride with every line)

1. **ZERO LLM — hand-authored by the agent.** No DeepSeek/model rewrite. You read
   the transcript and write each line yourself (David msgs 51, 147).
2. **Nothing dropped — REPHRASE, never delete.** A board-truth or wording problem
   is fixed by rewriting so the idea survives. Dropping loses teaching; that is
   the failure this standard exists to prevent.
3. **Zero verbatim.** Never copy his phrasing from `said` (plagiarism guard,
   locked 2026-07-02). Original prose only. (Rule of thumb: no ~8-word span
   matching the transcript.)
4. **Board-truth is absolute (G3).** The banked `fen` is authoritative. Only name
   a piece on a square if it is really there on that move's board. A
   destination/hypothetical square is fine ("the knight heads for f5"). Never
   invent a move or square. This is the `narrationAccuracy` contract, applied at
   author time.
5. **Translation, not invention (G0).** Say what HE taught — add zero chess
   content of your own. If he didn't say a piece is pinned, don't say pinned.
   When the transcript is vague, stay vague.
6. **Depersonalized.** Never the speaker, channel, video, stream, chat, or
   "speedrun".
7. **No move-number prefixes** ("Nf3", never "12.Nf3" — TTS reads "12." as
   "twelve"). Stats stay ("his 92% pick", "528 games").
8. **Concept-first, no praise, no filler, no interface talk** (the Narration
   Voice Rules in CLAUDE.md apply in full).

## The file shape

`data/video-narration-voiced/<id>.json` mirrors the bank but replaces verbatim
`said` with our-words `spoken` (+ optional `teaches`/`plans`); `{ply, t, fen,
line}` are copied from the bank UNTOUCHED (position + timestamp preserved).
Carries `voice: "danya-dna"`, `source: "yt:<id>"`, `openingName`, `studentSide`.
The raw bank (`data/video-narration/`) is gitignored — verbatim never re-enters
the tree.

## Verify before commit

- **Bank-fidelity** — `{ply, t, fen, line}` mirror the bank exactly.
- **Board-truth** — every piece/square a `spoken` line names is true on its `fen`
  (present-tense claims; hypothetical/typical sentences exempt).
- Tools: `scripts/voiced-authoring/inspect.mjs <id>` to read the timeline,
  `scripts/voiced-authoring/verify.mjs <id>` (or `verify-shard.mjs` for a set).
