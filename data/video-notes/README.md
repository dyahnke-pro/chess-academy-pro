# video-notes — the hand-written teaching, one file per lesson

Written by Claude against the paired narration in `data/video-narration/`, never
by a model pass (CLAUDE.md). Each note names its anchor BY MOVES; the FEN is
resolved from the track, so a mistyped position is structurally unavailable.

Every board claim is checked before it is written:

    npx tsx scripts/video-align/check-notes.mjs [videoId]

## Two ways a note fails SILENTLY

Both were found by falling into them, and both pass every other check while the
note reaches nobody:

1. **Anchoring to a position the video passed through but never SETTLED on.**
   `attach-notes` refuses it outright — the note may only cite a board the
   lesson actually stood on.
2. **Naming another opening in the prose.** The anchor-integrity guard drops the
   note at selection, because naming a different opening is the signature of a
   mis-anchored note. A perfectly true aside costs the note its voice. Simplest
   rule: name no opening at all in note prose.

3. **Anchoring shallower than 3 plies.** `MIN_TEACHING_ANCHOR_PLIES` excludes
   them: a note two moves deep matches every lesson that opened the same way,
   so it teaches about wherever its own line went rather than about the
   position. A true note about a second move is still dropped — re-anchor it
   deeper only if the deeper move actually CAUSES what the note claims, and
   otherwise let it go.

## What the checking is for

The teachers' load-bearing facts hold up; their EMPHASIS does not. Measured
across the first five lessons, every rhetorical flourish that was checked turned
out false as a board claim, while the fact the tactic actually rested on was
true every time:

| the lesson says | the board says |
|---|---|
| the b8 knight is deprived | it still has c6 and a6 |
| that bishop is useless | it has eight squares |
| e5 shuts the d7 knight out | same five squares before and after |
| the knight hangs | it is defended twice |
| the e3 bishop is undefended | true — and it is the point |

A model paraphrasing a transcript keeps the vivid half and drops the verifiable
half, which is backwards. That is why this is hand-written.


## Lessons whose teaching is not board-checkable — skipped, on purpose

Some lessons teach something true that no board check can confirm, and those
get no note rather than an unverified one (empty > generic > invented).

- `kQHOIgVhyow` (King's Indian move order). The point is an ABSENCE: with the
  knight on f3 rather than c3, the usual ...Nxc3 resource does not exist, so
  ...d5 invites e4 on better terms. Every reason kind describes what a move
  DOES; none describes what is missing from the board.

Worth recording from that build even though nothing shipped: **Bg7 does not
attack d4** — the knight on f6 blocks the long diagonal. "The fianchettoed
bishop eyes the centre" is exactly what pattern-memory writes, and it is false
here until the knight moves. Checked, not assumed.
