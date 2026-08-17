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

### 5. Six squares, and the greedy one is mate

- **position** (tracker t=176.0s, ply 12, king on f2, Black has just checked)
  `r1bqk2r/pppp1Npp/2n5/4p3/2B1n3/8/PPPP1KPP/RNBQ3R w kq - 0 7`
- **teaches** — A king dragged into the open has to choose between holding on to
  material and getting out of the way, and the instinct to hold on is usually
  the losing one. Count the checks available to the attacker before deciding
  where to step, not after.
- **explains** — The king has six legal squares here. Stepping forward keeps
  everything defended and walks into a forced mate; stepping back to the corner
  concedes a pawn and survives. The difference is not calculation depth, it is
  which question was asked first — "what can I keep" or "where can I not be
  checked".
- **verified** — chess.js confirms the forced sequence the lesson plays out ends
  in checkmate, and that the retreat square was legal and available throughout.

### 6. Four ways to meet a central break, and what they have in common

The lesson answers 5.d4 with four separate branches. Each is a distinct beat and
each has a position the tracker recorded:

| Black's try | position after it |
|---|---|
| `5…Bxd4` | `r1bqk2r/pppp1ppp/2n2n2/4p1N1/2BbP3/8/PPP2PPP/RNBQK2R w KQkq - 0 6` |
| `5…Nxd4` | `r1bqk2r/pppp1ppp/5n2/2b1p1N1/2BnP3/8/PPP2PPP/RNBQK2R w KQkq - 0 6` |
| `5…exd4` | `r1bqk2r/pppp1ppp/2n2n2/2b3N1/2BpP3/8/PPP2PPP/RNBQK2R w KQkq - 0 6` |
| `5…d5` | `r1bqk2r/ppp2ppp/2n2n2/2bpp1N1/2BPP3/8/PPP2PPP/RNBQK2R w KQkq - 0 6` |

- **teaches** — When a pawn break is met by three different captures and one
  counter-push, the captures usually share a refutation and the push is the real
  test. Group the replies that take before spending effort on them separately.
- **explains** — Each of the three captures leaves the f7 square undefended for
  one more move, and the same knight jump answers all three. Only the counter-push
  declines to take, which is why it is the line worth studying: it changes what
  the attacking pieces are aimed at instead of accepting the trade.

### 7. The critical defence, and why it is a trade rather than a rescue

- **position** (tracker t=345.5s, ply 10, the counter-push)
  `r1bqk2r/ppp2ppp/2n2n2/2bpp1N1/2BPP3/8/PPP2PPP/RNBQK2R w KQkq - 0 6`
- **teaches** — The soundest defences to a sacrificial attack usually give
  something back rather than clinging to everything. Returning material to blunt
  the attacker's best piece is a trade, not a concession.
- **explains** — The lesson continues by taking the pawn, trading knights, and
  recapturing the bishop, which liquidates the pieces aimed at the king. What
  survives is an ordinary position where the extra pawn matters and the attack
  does not, and that is the whole point of choosing this defence over one that
  tries to keep everything.

## Status — NOT merged into the corpus

A demonstration of method, not shipped content. Merging needs the usual gates
(`gateSpoken`, board-truth grading, source recording) and an id decision, since
these are new notes rather than rewrites of existing ones.

## Rate, measured

Seven notes from one 27-minute lesson, working from the tracker's 31 rewind
points to find the moments worth writing about. The machine part (download,
calibrate, track) is ~3 minutes per video and unattended; the writing is the
cost, and it does not parallelise.

Seven covers the lesson's spine: why the famous sacrifice is declined, what is
recommended instead, the four replies to it, the critical defence, and the mate
that punishes greed. A thorough pass might reach 12-15 by adding the sub-branches
after `5…Nxd4`, which the lesson explores at length (two White tries, each
walked to a conclusion).

**A FEN I TYPED WRONG, caught by checking it against the tracker.** Note 5's
position was hand-transcribed instead of copied, and I put Black's bishop on c5
when it had already been captured on f2, dropped White's bishop from c4, and got
the pawn rank wrong. Every sentence of the note was fine; the board it pointed at
was fiction. This is the corpus's own defect reproduced by hand, three notes
after writing a warning about it — so: **copy positions from the tracker output,
never retype them**, and diff every one before it ships.

**A claim checked and DROPPED, recorded because the checking is the method.** I
expected the point of 5.d4 to be that it denies the king the escape it needs in
the pure Traxler. chess.js says otherwise: the king has the same six legal
squares in both lines. Had that gone into a note from memory it would have been
fluent, plausible and false — which is precisely the failure this whole pipeline
exists to prevent.

---

# THE FORKS — the "other lines", which is the point

David 2026-08-17: *"what i like about his videos and what i want to carry over
are the teachings about the other lines. I want to walk people down those lines,
especially in the review section, but i want Learn with coach to touch on them
as well so the user knows there are other options at certain forks/positions."*

**That content was already captured, and it is what the rewinds are.** A teacher
rewinds for exactly one reason: to return to a position and show a different
option. So each rewind marks a fork, and the moves played after each visit are
the options. `scripts/video-align/forks.mjs` derives them; they are stored in
the track.

On the pilot lesson: **10 forks, 24 options, every one legal at its position.**

| after | options the lesson showed |
|---|---|
| `Ng5` | `d5` 2m03 · `Bc5` 2m17 |
| `Ng5 Bc5` | `Nxf7` 2m38 · `Bxf7+` 3m45 · `d4` 5m09 |
| `… d4` | `d5` 5m46 · `Bxd4` 5m60 · `Nxd4` 10m10 · `exd4` 11m36 |
| `… Bxd5` | `Nxd5` 12m20 · `Nxd4` 13m35 |
| `… Nxe4` | `Qh5+` 10m29 · `Be2` 11m01 |
| `… Kg1 Qh4` | `Nd8` 6m30 · `g3` 6m44 |
| `… Nxh8` | `Nd4` 7m09 · `Qxc4` 7m14 |
| `… Bc4` (deep) | `Bg4` 15m58 · `Rf8` 16m41 · `Qe8` 17m31 |

## Why these are safe to present, when a generated list would not be

The options are not proposed by a model and not looked up in a database — they
are the moves that appeared on screen. "Here are three other tries at this
position" is a claim about the video, and the video is the evidence. There is
nothing to hallucinate and nothing to verify afterwards, which is the whole G0
posture: code computes the fact, the coach only voices it.

Contrast the alternative that was never on the table: asking a model "what else
could Black play here?" That produces fluent, plausible, sometimes-wrong lines
with nothing to check them against — the failure this corpus already has.

## How each surface uses them

**Review — walk the line.** Each option carries its `continuation` and the
TIMESTAMP where the teacher takes it up. So a review can play the alternative
out move by move, and the teaching that belongs to it is locatable rather than
guessed at. This is the surface David named first, and it is the one the data
suits best: a fork with three options is three walkable lines.

**Learn — say that the fork exists.** At a fork position, the student should
learn that a choice is being made, not just watch one move happen: *"this is one
of three tries here; the lesson also looks at X and Y."* Naming the alternatives
without walking them is the lighter touch he asked for — enough that the student
knows the position is a decision point.

The fork's `ply` says how deep it sits, which is the natural way to decide how
much to say: the move-4 fork between three whole systems deserves a sentence,
the move-19 fork between three quiet developing moves does not.

## Gate

`videoTrackIntegrity.test.ts` (in ship-check) plays every option at its own fork
position. They were demonstrated rather than invented, but a transcription slip
would still put an impossible move in front of a student.
