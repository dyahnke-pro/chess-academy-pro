# WO-VOICED-AUTHORING — move-by-move voiced narration authoring (parallel shard)

**Owner note (David):** hand this ONE doc to up to 4 sessions, each with a
DIFFERENT shard letter (A/B/C/D). Shards are disjoint — no two sessions touch
the same video, so they never collide. Session c28ca97f is separately
re-authoring the 147 already-voiced files; these shards are the 292 videos that
have NO voiced narration yet.

**Pick your shard:** you were assigned **shard-`<A|B|C|D>`**. Everywhere below,
substitute your letter. Your id list is `docs/wo/voiced-shards/shard-<X>.txt`
(73 videos).

---

## THE STANDARD, IN ONE LINE: every move, every narration captured (David 2026-08-26)

**Mirror the teacher move by move — nothing position-relevant is ever lost.**
EVERY move that carries teaching gets an original, board-true spoken line. EVERY
narration he gives — the idea behind the move, the plan, the threat, the
subtlety, AND every hypothetical / what-if line he walks ("if Black takes,
then…") — is captured, in our words. The ONLY blank moves (`spoken: ""`) are pure
non-position chatter (greetings, results-talk, "we'll have plenty after the
game"). If in doubt whether a line is position-relevant, KEEP it. **Never drop a
line to fix a board-truth or wording problem — REPHRASE so the idea survives.**
Dropping loses teaching; that is the exact failure this WO exists to prevent.

## What's wrong and what "done" means

The voiced narrations were authored sparsely — a handful of hand-picked beats
per video, most moves left silent. That is the failure mode. The standard above
supersedes it: **mirror the teacher move by move**, board-true, nothing dropped.

### 🚫 ZERO LLM — YOU HAND-WRITE EVERY LINE. This is non-negotiable (David msgs 51, 147).

David rejected LLM authoring twice: *"all in his own words, zero LLM… ALL IN OUR
OWN WORDS!!!"* and *"You are rewriting by hand right? I don't want to lose
anything because a computer is doing it."* An earlier DeepSeek pipeline
(`author-video.mjs` / `author-all.mjs`) DROPPED any line it couldn't auto-gate —
losing teaching and costing money. **Those scripts are disabled. Do NOT run
them. Do NOT call any LLM API to write narration.** You — the reasoning agent —
read the distilled transcript and write each line yourself.

**These narrations are the most important coach teaching data and feed multiple
surfaces. Nothing position-relevant may be lost.** The rules:

- **Capture EVERYTHING he says about the position** — idea, plan, threat,
  subtlety, and every hypothetical/what-if line. Length uncapped; match his
  depth. If in doubt whether a line is position-relevant, KEEP it.
- **Never drop to fix a problem — REPHRASE.** If a board-truth or wording issue
  makes a line hard, rewrite it so the idea survives. Dropping a line loses
  teaching; that is the failure mode we are fixing, not a tool.
- **Translation, not invention (G0/G3).** Say what HE taught, in your own words —
  add ZERO chess content of your own. If he didn't say a piece is pinned, don't
  say pinned. When his transcript is vague, stay vague.
- **Board-truth is absolute.** Only name a piece on a square if it's really there
  on that move's board. A destination/hypothetical square is fine ("the knight
  heads for f5"). Verify against the piece list `scripts/voiced-authoring/inspect.mjs`
  prints per move.
- **No verbatim** — never copy his phrasing (plagiarism guard, locked 2026-07-02).
  Rewrite in the DNA voice.
- **No attribution** (never name him/the channel/"speedrun") and **no move-number
  prefixes** ("Nc3", never "2.Nc3").

## 🔒 TWO SOURCES, ONE VOICE — transcript OR the board (David 2026-08-26, LOCKED)

Every voiced beat is computed from facts and phrased in the DNA voice — the
narrator DECIDES nothing (G0). There are two fact sources, and they compose:

1. **The video's own teaching** (`said`, distilled) — the primary source when the
   video actually teaches. This is the transcript path below.
2. **The board computer facts** — when the transcript is thin, banter, or absent
   (and for any FUTURE game that is not his), the **board carries the teaching**:
   `scripts/voiced-authoring/facts.mjs` computes, per move, the move + its class,
   material, checks/captures, and the **Stockfish eval / best move / principal
   variation**. You phrase THOSE facts in the DNA voice, board-true.

**Read `docs/voiced-narration-from-board.md`** — the locked standard for the
board-facts path. It is a strict extension of the DNA outline (same gates, same
G0/G3), proven 2026-08-26 on the 7 formerly-set-aside "sparse banter" videos
(pure-podcast transcripts turned into full lessons, 130 beats / 315 nodes, 0
board-truth failures). **A sparse transcript is NOT a reason to set a video
aside** — narrate it from the board.

## The voice (house register — apply to every line)

**Read `docs/DNA-outline.md` first — it is the authoring standard** (voice,
per-position fields, the beat shape, move-by-move coverage, and the absolute
rules). Everything below summarizes it.


Naroditsky's instructive register, stripped of philosophy: concept-first, facts
then the point, warm but rigorous. Present-tense live teaching as the demo game
unfolds — "White develops the knight, eyeing the centre; Black answers with…,
and the tension builds." NOT the user's own game, so no "you blundered", no "the
best move was". It is a STYLE (depersonalized — never name him). See CLAUDE.md
"THE NARODITSKY HOUSE VOICE" + "TWO DISTINCT NARRATION REGISTERS" (use the
IN-GAME / WATCH register, not the post-game-review register).

## Setup (once)

```bash
# 1. Branch off the tooling branch (it carries author-video/author-all/recover-
#    bank/verify-shard + the shard lists; main doesn't have them yet). Direct
#    push to main is classifier-blocked; you'll open a PR.
git fetch origin claude/gem-teaching-learn-coach-1oe5pw
git checkout -B claude/voiced-shard-<X> origin/claude/gem-teaching-learn-coach-1oe5pw

# 2. Recover your shard's bank transcripts (they're gitignored — live in 09120f6).
#    NO API KEY is needed — you hand-write, no LLM is called.
node scripts/voiced-authoring/recover-bank.mjs docs/wo/voiced-shards/shard-<X>.txt
```

## Author your shard BY HAND (move by move)

For **each** video id in your shard, one at a time:

1. **Read the whole timeline** — this is "watching the video" (David [66]):
   ```bash
   node scripts/voiced-authoring/inspect.mjs <id>            # idx | ply | move | transcript, per move
   node scripts/voiced-authoring/inspect.mjs <id> 3 14 24    # full FEN for specific indexes
   ```
   Read every row start to finish before writing. Understand the game he played
   and what he taught at each move. The `line` field = the move(s) made at that
   row (the video's real line); the `said` field = his raw words there (auto-
   caption — misheard words are common: "fortnite scotch" = "four knights
   scotch"; repair them by sense).

2. **Write the voiced file yourself** — build the moves array by hand. The move
   spine (`ply`, `t`, `fen`, `line`) is COPIED from the bank verbatim (position +
   timestamp preserved); you write only `spoken` per move. Use the shared helper
   so fidelity is automatic — author an index→text map and pass it to `build`:
   ```js
   // scratch script you run with node, e.g. scripts/voiced-authoring/_author-<id>.mjs
   import { build } from './lib.mjs';
   build('<id>', 'Opening Name', 'white', {
     6:  { explains: 'your hand-written line for row 6 …' },
     7:  { explains: 'your hand-written line for row 7 …' },
     8:  { explains: 'your hand-written line for row 8 …', reanchor: true }, // analysis/rewind row
     // …a key for EVERY position-relevant row; omit only pure-chatter rows
   });
   ```
   Write in the DNA voice, capture every position-relevant line (incl.
   hypotheticals), board-true, never dropping to dodge a problem — rephrase.
   `openingName` from the bank title is fine; blank is OK (corpus notes are
   position-keyed, `opening:null`).

3. **Verify that one video** before moving on:
   ```bash
   node scripts/voiced-authoring/verify.mjs <id>
   ```
   FIDELITY must PASS; eyeball the board-truth table (each square you named,
   with what's actually on it) — fix any square that isn't what you said.

Work through the shard video by video. Yes, it's slow — that's the point; this
is the coach's most important teaching data and it is authored by hand.

## Sparse / no-transcript videos — narrate from the BOARD (the exact steps, David 2026-08-26)

When a video's transcript is banter / blitz distraction / two-person commentary
with only a handful of real chess remarks — or is any game that isn't his — do
NOT set it aside. Narrate it from the board computer facts, in the DNA voice.
Full standard: `docs/voiced-narration-from-board.md`. The exact loop:

```bash
# One-time: the engine must be present (facts.mjs reads /usr/games/stockfish).
apt-get install -y stockfish   # lands at /usr/games/stockfish; verify it evals

# Per video:
node scripts/voiced-authoring/facts.mjs <id> 14   # board facts per move:
                                                  #   move+class, material,
                                                  #   eval / bestmove / PV
node scripts/voiced-authoring/_dump.mjs <id>      # the thin transcript (any real remark)
```

Then hand-author each teaching node's `spoken` from **facts + any transcript
remark**, in the DNA voice, board-true. The discipline:

- **Every claim traces to a `facts.mjs` row or the transcript.** Name a piece on
  a square only if the FEN has it; a "best move / the point is…" is the engine's
  `best`/`pv`, not your guess; a verdict ("level", "a pull for White") is the
  engine `eval`.
- **Eval is side-to-move-relative** — convert to a fixed side before you voice a
  verdict, and keep it depersonalized ("the engine calls it level", never "you're
  better"). The engine is also the honest record: it corrected two games this
  session where the streamer's self-talk ("disaster", "happy with a draw")
  disagreed with the board.
- **Name a tactic only if `pv` shows it.** Quiet PV → teach the maneuver; forcing
  PV → play it out ("if the rook takes, the line runs …, and the point is …").
- **Thin facts → stay thin.** Empty > invented (G0/G3). Same "rephrase, never
  drop" rule for board-truth trips.

Then gate + commit exactly as the transcript path (verify-shard, board-truth 0).

## The efficient loop this session used (reference)

Per video: write a throwaway `scripts/voiced-authoring/_author-<id>.mjs` (the
`build()` chokepoint), run it, gate it with `verify-shard.mjs` on a one-id file,
fix any board-truth trip by **rephrasing** (move-phrasing "to/into/off c3" and
hypothetical framing "if/would/plan" are exempt from the present-tense check),
then `rm` the scratch script (never commit it) and commit the
`data/video-narration-voiced/<id>.json` in small batches. `facts.mjs` and
`_dump.mjs` ARE committed (reusable tools); `_author-*.mjs` scratch is not.

## Verify (must pass before you commit)

```bash
node scripts/voiced-authoring/verify-shard.mjs docs/wo/voiced-shards/shard-<X>.txt
```
Must print `fidelity fails 0 | board-truth fails 0`. Fidelity 0 proves every
file mirrors its bank; board-truth 0 proves no false present-tense piece-on-
square claim slipped. If either is non-zero, the named file/idx is the offender
— re-run that video and re-verify.

**Spot-check 3 of your videos by eye** against the transcript (this is the real
quality bar, David 2026-05-19 "PLAYWRIGHT/audit must be INTERACTIVE"):
```bash
node -e "const v=require('./data/video-narration-voiced/<id>.json'),b=require('./data/video-narration/<id>.json');v.moves.forEach((m,i)=>{if(m.spoken)console.log('#'+i+' ['+ (m.line||[]).join(' ')+']\n  SAID: '+(b.moves[i].said||'').replace(/\s+/g,' ').slice(0,140)+'\n  OURS: '+m.spoken+'\n')})"
```
Confirm: each idea traces to something he actually said at that position; the
hypothetical lines are present; nothing names a piece that isn't on the board.

## Commit + PR (never push to main directly)

```bash
git add data/video-narration-voiced/
git commit -m "feat(voiced): move-by-move narration authoring, shard <X>"
git push -u origin claude/voiced-shard-<X>
```
Open a **draft PR** titled `voiced narration — shard <X> (move-by-move)`. Body:
video count, total authored moves, verify-shard output. Do NOT rebuild the
derived artifacts (`voiced-walkthroughs.json` / `voiced-matchups.json` /
`voiced-teachings.json`) — those are global single files rebuilt ONCE by the
integration WO after all shard PRs land, so rebuilding per-shard would collide.

## Do / Don't

- DO capture EVERY position-relevant line, including hypotheticals and subtle
  points. Length is uncapped — match his depth.
- DO leave a move blank when the transcript there is pure chatter.
- DON'T quote him. DON'T add analysis he didn't give. DON'T name a piece on an
  empty square as present fact. DON'T write move numbers.
- DON'T touch another shard's ids or the 147 already-voiced files.
- DON'T rebuild the derived JSON or wire anything — that's WO-VOICED-BAKE-TIER1.
