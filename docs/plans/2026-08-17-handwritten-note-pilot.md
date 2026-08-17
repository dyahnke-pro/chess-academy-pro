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
even supposed to be better", "catch your opponent totally off guard", "land
immediately in a completely lost position", "far from an intuitive move".

## What the lesson actually recommends

Worth stating, because it is NOT what the corpus notes imply. The tracker shows
the lesson converging on **5.d4** against the Traxler — not the famous 5.Nxf7,
and not 5.Bxf7+. The video visits all three; only one is the recommendation, and
a note attached to the wrong one teaches the wrong repertoire.

## The notes

### 1. Why the famous sacrifice is sound and still wrong to play

- **position** (tracker t=158.0s, ply 9, the moment Nxf7 appears)
  `r1bqk2r/pppp1Npp/2n2n2/2b1p3/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 0 5`
- **teaches** — A line can be objectively playable and still be the wrong
  practical choice. When every continuation is forcing and one slip ends the
  game, the recall a line demands is part of its price, and a verdict of
  "balanced" does not repay that price.
- **explains** — Taking on f7 drags the black king into the open, but it hands
  Black a long series of checks that must each be met exactly. White is no
  better at the end of it, so the risk buys no advantage — only an obligation to
  remember a great deal of theory correctly under a clock.

### 2. Surprise is a real asset, and it is not the same as soundness

- **position** (tracker t=308.5s, ply 9, the recommended 5.d4)
  `r1bqk2r/pppp1ppp/2n2n2/2b1p1N1/2BPP3/8/PPP2PPP/RNBQK2R b KQkq - 0 5`
- **teaches** — Against a gambit whose whole value is preparation, the strongest
  practical reply is often the one your opponent has not studied. A move that is
  merely good but unexpected can outperform a move that is best and famous,
  because the opponent's preparation is part of the position too.
- **explains** — Pushing the d-pawn opens the queen's bishop and strikes at the
  centre while Black's pieces are still committed to a kingside attack that has
  not started. Black's position is defensible, but only by a reply most players
  never consider, so the practical result is far worse for Black than the
  evaluation suggests.

### 3. The only defence is a counter-attack, not a retreat

- **position** (tracker t=345.5s, ply 10, after Black finds the defence)
  `r1bqk2r/ppp2ppp/2n2n2/2bpp1N1/2BPP3/8/PPP2PPP/RNBQK2R w KQkq - 0 6`
- **teaches** — When a defender's instinct is to protect the attacked point, the
  saving move is often to hit something of equal value instead. Counting who is
  attacking what, rather than rescuing the piece under fire, is what finds these.
- **explains** — Advancing the d-pawn ignores the threat and challenges the
  bishop that aims at f7. Because it interferes with White's most dangerous
  piece rather than fleeing, Black gains the time that a defensive move would
  have spent, and the attack loses its momentum.

### 4. Take with the piece that keeps the game simple

- **position** (tracker t=229.0s, ply 11, after the bishop capture and retreat)
  `r1bq3r/ppppk1pp/2n2n2/2b1p1N1/2B1P3/8/PPPP1PPP/RNBQK2R b KQ - 2 6`
- **teaches** — Against an aggressive gambit, prefer the capture that removes
  the opponent's attacking chances over the one that wins the most material. The
  best practical answer often leaves the fewest enemy pieces pointing at your
  king.
- **explains** — Capturing with the bishop checks immediately and forces the
  king to step forward before Black can coordinate. The lines that make this
  opening dangerous never begin, and White keeps a sound extra pawn and a safe
  king rather than a larger material count and an exposed one.

## Status — NOT merged into the corpus

A demonstration of method, not shipped content. Merging needs the usual gates
(`gateSpoken`, board-truth grading, source recording) and an id decision, since
these are new notes rather than rewrites of existing ones.

## Rate, measured

Four notes from one 27-minute lesson, working from the tracker's 31 rewind
points to find the moments worth writing about. That is the honest unit of work:
the machine part (download, calibrate, track) is ~3 minutes per video and
unattended; the writing is the cost, and it does not parallelise.

A full pass on this lesson would be perhaps 12-18 notes — the branch points that
teach something distinct, not every ply. Scale from that before committing to a
video count.
