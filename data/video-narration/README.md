# video-narration — every position, and what was said over it

David 2026-08-17: *"We don't really need the video as long as we have the FENs
narrations, and captions ... We just need the information from the video.
Narrations paired with moves. And all words spoken."*

This is that join. A video is a delivery mechanism for three things — the
positions, the words, and which words went with which position — and the first
two were already being kept in separate files that nothing had ever connected.
Once they are connected the video is genuinely disposable: everything a
hand-written note needs is here.

Each entry is one settled position: its ply, its FEN, the moves that produced
it, the timestamp, and the words spoken while it was on the board. Forks carry
the same pairing per option, so an alternative line arrives with the teacher's
explanation of *that* alternative attached.

## What "over it" means

The window runs from the moment a position settles to the moment the next one
does — literally what was said while this position was on the board, which
needs no guessing about anyone's rhythm. A 12-second lead-in is included,
because the reason for a move is usually spoken while reaching for the piece
("I'll go knight f3 here, because…"), and that sentence belongs to the move it
explains rather than to the position it left.

Measured on the first eleven builds: 100% of positions came back with narration,
63,879 words paired. Spot-checked, `Bb5+` pairs with *"we start by checking on
B5"*, `Bd7` with *"most people go Bishop D7… it's depriving the B8 knight of a
square"*, `Be2` with *"we move it to E2 in order to stop Bishop G4"*.

## Reference only — never quoted

Unchanged plagiarism guard. The paired text tells you WHICH established idea the
lesson is on at this move — out of the several it may state, which is the whole
reason for keeping all of them. The shipped narration is original prose teaching
that idea. Nothing here is ever lifted verbatim or shipped as narration.

## Rebuilding

```bash
node scripts/video-align/pair-narration.mjs [videoId] --write
```

Runs entirely offline. That matters: the video download is the rate-limited step
and is refused for long stretches, while this needs only files already on disk,
so the whole bank can be paired during an hour when nothing can be fetched.
