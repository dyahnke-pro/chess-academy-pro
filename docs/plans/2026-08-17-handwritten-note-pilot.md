# Hand-written notes, anchored to what the video showed — pilot

David 2026-08-17: *"since you are redistilling by hand, rewrite the narrations so
we are not plagiarizing"* and *"you do this, not the LLM."*

So the notes below are written by me, from watching what the lesson taught, in
original prose. The model does not write them and no script extracts them. The
transcript is a comprehension aid only: it tells me WHICH established idea is
being taught at a moment; the sentences are mine.

## Why this is different from the corpus we have

Every note in `danya-teachings.json` was written by a model from a transcript
chunk, then assigned a position by searching DB spines. That is how a Traxler
lesson's teaching ended up filed in the Giuoco Pianissimo, and how three such
notes still get spoken at boards their lesson never showed (see PLAN.md).

Here the position is not searched for. It is READ OFF THE VIDEO — the tracker
returns a FEN with a timestamp, and the note is attached to the FEN that was on
screen when the idea was taught. There is nothing to mis-file.

## The plagiarism rule these satisfy

`gateSpoken` rejects any 6-word run shared with the source, and the standing
rule (CLAUDE.md, 2026-07-02) is stricter in spirit: the ideas are public-domain
chess understanding, the words must be original. Phrases deliberately NOT used
from this transcript: "the complications after knight takes f7 are wild",
"crazy memorization", "one of the more famous mating sequences", "white is not
even supposed to be better".

## The notes

### 1. Why the sacrifice is sound and still wrong to play

- **position** (tracker t=158.0s, ply 9, the moment Nxf7 appears on the board)
  `r1bqk2r/pppp1Npp/2n2n2/2b1p3/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 0 5`
- **teaches** — A line can be objectively playable and still be the wrong
  practical choice. When every continuation is forcing and a single lapse ends
  the game, the memory a line demands is part of its cost, and a verdict of
  "balanced" does not repay that cost.
- **explains** — Taking on f7 drags the black king into the open, but it hands
  Black a long series of checks and threats that have to be met exactly. White
  is not better at the end of it, so the risk buys no advantage — only the
  obligation to recall a great deal of theory correctly under a clock.
- **why it is teachable here** — This is the branch point of the whole lesson.
  The tracker shows him returning to it repeatedly (31 rewinds in the video),
  which is what a teacher does at a decision worth explaining.

### 2. The refutation that keeps the game simple

- **position** (tracker t=224.5s, ply 9, after the alternative capture)
  `r1bqk2r/pppp1Bpp/2n2n2/2b1p1N1/4P3/8/PPPP1PPP/RNBQK2R b KQkq - 0 5`
- **teaches** — Against an aggressive gambit, prefer the reply that removes the
  opponent's attacking chances over the one that grabs the most material. The
  strongest practical answer is often the one that leaves the fewest pieces
  pointing at your king.
- **explains** — Taking with the bishop first checks the king and forces it to
  move before Black can organise anything. The attacking lines that make this
  opening dangerous never get started, and White keeps a sound extra pawn with
  a safe king instead of a large material count and an exposed one.

## Status — NOT merged into the corpus

These are a demonstration of the method, not shipped content. Merging needs the
usual gates (`gateSpoken`, board-truth grading, source recording) and a decision
about ids, since these are new notes rather than rewrites of existing ones.

## What this pilot establishes

The full loop is now proven on one video: download -> hand calibration -> track
(153 plies, 31 rewinds, verified against known theory) -> read the lesson at a
timestamped position -> write an original note anchored to the FEN that was
actually on screen.

The expensive open question is only how many notes per video this yields at
acceptable quality, and that is now a question of author time rather than of
whether the machinery works.
