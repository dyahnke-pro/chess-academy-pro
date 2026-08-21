# Line-for-line video narration rewrite — backlog + workflow

David 2026-08-21 (correcting a session that cherry-picked 2-3 notes/lesson):
*"You are writing line for line so we can add the games into our coaches teach
me x opening!!"* — every distilled teaching lesson gets its narration rewritten
**move-by-move** into our own words, so the whole game becomes a narrated line
the coach can teach.

## The standard (what "done" means for a lesson)

- A hand-written note on **every settled position where the teacher is teaching**
  (not banter, not a rewind artifact, not a position the video only passed
  through). A clean forward-walk lesson → ~15-40 notes; messy post-game/banter
  lessons → only the genuine teaching moments (empty > generic > invented).
- Prose is **original** (video is reference only; `gateSpoken` 6-word overlap
  check enforces no lifting). `teaches` = transferable principle; `explains` =
  concrete board-grounded why.
- **Every board claim chess.js-verified.** Named squares/pieces must be true at
  the note's FEN or the splice grader eats the clause.
- `line` = the **video's exact move order** (include rewind shuffles like
  `Bf1 Bc8 Bb5+ Bd7`; the FEN is identical so claims still verify, but
  `attach-notes` matches by SAN string and refuses a cleaned-up line).
- Anchor only at positions **`note-anchors` lists** (settled nodes). A position
  the video passed straight through cannot be anchored — move the note one ply
  to the nearest settled node.
- Off-taught-line notes are fine (live in free-play/review); on-taught-line ones
  also fire in Watch/Learn. Never bend the repertoire to the note; **do not edit
  the opening tab** (`repertoire.json`/`lessons/*`) — out of scope.

## Per-lesson workflow

1. `node scripts/video-align/note-anchors.mjs <id> --all` → settled positions,
   exact video-order `line`, timestamp, taught-line label, `[HAS NOTE]`, caption.
2. Skip `[HAS NOTE]` (already covered by position), banter-only, and overflow
   (⚠ >300 words = tracker lost the board) positions.
3. Write `data/video-notes/<id>.json` — one note per teaching position, exact
   `line`, original prose, reasons where a clean atomic claim exists.
4. `check-notes.mjs <id>` (reasons hold) → `attach-notes.mjs --write`
   (14/14 anchored) → `emit-notes.mjs --write`.
5. If a `pro-*`/unconfirmed title track promotes, add a hand `titleCheck.verdict`.
6. Gates: `npx vitest run src/data/videoNoteCaptions.test.ts src/data/videoNoteSplice.test.ts src/data/noteOriginSeparation.test.ts src/data/videoTrackIntegrity.test.ts`
7. `WALKTHROUGH_GEN_REV` already bumped this session; batch further bumps.

## Done this session (line-for-line)

- `uJro3yCDEgk` Alapin Sicilian — 14 notes (opening → Re1+ tactic → endgame).

## Done earlier this session (sparse — pre-correction, still valid)

- QGA, Caro Tartakower, Alapin (2...Nf6), French Advance, Glek, Pirc Austrian,
  Bishop's, Nimzo 4.f3 — 1-3 notes each (these lessons can be extended to full
  line-for-line later).

## Backlog queue

~108 un-noted teaching lessons, ~3,294 clean line-for-line positions. Regenerate
the ranking by clean-writable count with the scan used 2026-08-21 (un-noted
teaching tracks with captions, positions with 12-260 word paired captions not
already noted). Prefer CLEAN forward-walk single-opening lessons; skip/limit
post-game-analysis + heavy-banter lessons. Top of queue (clean count / total):
lLkqjBOGgek QGD 78/119, Dp2q1lzUVlQ Anti-Marshall 65/82, kVIQEb0fOPg Nimzovitch
Sicilian 55/70, uJro3yCDEgk Alapin DONE, Dj_hLEdDpAg Sicilian 48/59, and so on.

## Note

Distillation of the remaining video-drop backlog was running in parallel
(batch ~6/8, ~120/156). Its banked tracks also need pairing (`pair-narration.mjs
--write`) then line-for-line notes.
