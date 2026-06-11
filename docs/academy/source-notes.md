# Academy Source Notes — sectioning & cross-book synthesis

Working notes for **"The Philosophy of A General"** (the Academy Listen track).
Method (per David, 2026-06-11): *read every book, break each into sections,
combine like sections across books, rebuild into something better.* This file
is the durable record of that sectioning so a future session can extend the
audiobook without re-deriving the corpus.

The raw books live (gitignored audit copy) at
`docs/audit-runs/2026-05-19-chess-books-raw/` — the public-domain corpus the
app already ships in distilled form (`chess-concepts.json`,
`opening-book-pages.json`). Constraint for the rebuild: **board-free** — no
square names, every concept explained in *words* so it teaches by ear (drive /
sleep listening).

---

## 1. The books, sectioned

**Capablanca — _Chess Fundamentals_.** Relative value of the pieces · general
strategy of the opening (develop fast; knights before bishops; don't move a
piece twice; queen not out early) · control of the centre (no violent attack
without it) · the initiative (the move *is* the initiative; relinquish only for
compensation) · direct attacks en masse · relinquishing the initiative · knight
vs bishop · salient points about pawns (the backward pawn on an open file; the
"hole"; two pawns abreast strongest; the passed pawn grows as pieces leave) ·
endgame principles (opposition, rook endings, the king as endgame piece).

**Edward Lasker — _Chess Strategy_.** Relative value via **mobility** (the
supreme criterion; a boxed rook is no rook) · the opening (loss of a move;
P-K4/P-Q4 free the most pieces) · the centre · weaknesses & **fixing** a
weakness ("attack only what cannot move away") · the **pawn skeleton** and its
transformation as the basis of every plan · open files & diagonals · the
middle game (concentrate superior force on the point) · the end-game (active
king; reduce to a known won ending; pawn strategy is the heart).

**Edward Lasker — _Chess & Checkers_.** Elementary tactics · the mate with
minimal force (Q / R / 2B / B+N; 2N cannot) · **the opposition**, King-and-Pawn
vs King · sacrifice = investment for an equivalent advantage · general
principles of strategy (restated, beginner-facing).

**Staunton — _Chess-Player's Handbook (Blue Book)_.** "General Rules &
Observations," sectioned by piece — **the King** (castle early kingside; an
active king in the ending) · **the Queen** (too valuable for a minor's job; not
out early) · **the Rook** (open files; double them; the seventh rank) · **the
Bishop** (the pair; keep pawns off its colour in endings; bishop vs knight) ·
**the Knight** (its leap; the rim; knight + pawns ending) · **the Pawns** (the
soul; united vs separated; doubled — worst on the rook file; passed pawn
supported) · Maxims (move slowly; weigh the *peculiar* worth of a piece;
exchange when superior; composure).

**Young — _Chess Generalship: Grand Reconnaissance_.** Chess as campaign · the
**Grand Reconnaissance** (read the whole field; never magnify the enemy's
weakness nor your own strength) · the Point of Direction / decisive objective ·
**concentration of a superior force upon the decisive point** (a chess-native
precursor to Clausewitz's centre of gravity).

**Edge — _Exploits of Paul Morphy_** & **Bird — _Chess History &
Reminiscences_.** The romantic-attack record: Morphy's power = **rapid, total
development** turned straight into the attack; the sacrifice "à la Morphy" to
open lines; the mating combination born of every piece in play.

**The canon the app already grounds on** (referenced, classical): Nimzowitsch,
_My System_ (restraint, prophylaxis, the blockade, the pawn chain & its base,
the isolani, holes & outposts, over-protection, play on two wings, active
defence) · Réti, _Modern Ideas in Chess_ (transforming the character of the
position; the contest of ideas) · Emanuel Lasker, _Common Sense in Chess /
Lasker's Manual_ (chess as struggle; the value of the move; the fighting
defence) · Znosko-Borovsky, _The Middle Game in Chess_ (Force/Space/Time; the
valuation of the position) · Philidor (the pawns are the soul) · Clausewitz,
_On War_ & Boyd, the OODA loop (the Advanced Doctrine).

---

## 2. Like-sections clustered → chapters

Each chapter of the audiobook is one cluster, woven from every book that
speaks to it:

| Chapter | Cluster (combined sections) |
|---|---|
| Prologue — The Two Armies | The elements (Capablanca/Znosko) + mobility as the master test (Ed. Lasker) + the will (Em. Lasker) + the reconnaissance frame (Young) |
| 1 Marshalling the Army | Opening/development (Capablanca, Ed. Lasker, Staunton, Morphy) |
| 2 Seizing the Initiative | The initiative (Capablanca, Em. Lasker, Znosko) + the gambit (Morphy) |
| 3 Reading the Field | The evaluation method: elements + pawn skeleton + weak squares + mobility (Young, Ed. Lasker, Capablanca, Nimzo, Staunton) — *the chapter David flagged as not teaching* |
| 4 The Commander's Calculus | Valuation → posture (Znosko, Capablanca, Em. Lasker) |
| 5 Locking Down | Restraint / prophylaxis / blockade / fixed centre (Nimzo, Capablanca, Ed. Lasker) |
| 6 Holding the Ground | Pawn craft deep (Capablanca, Nimzo, Staunton, Ed. Lasker, Philidor) |
| 7 The Decisive Point | Concentration + two weaknesses (Young, Capablanca, Ed. Lasker, Nimzo) |
| 8 Commanding the Forces | Piece play by nature (Staunton, Capablanca, Nimzo, Ed. Lasker) |
| 9 The Doctrine of the Exchange | Trading (Capablanca, Nimzo, Staunton, Ed. Lasker) |
| 10 The Assault | Attacking the king (Capablanca, Em. Lasker, Staunton, Morphy) |
| 11 Defence & Counterstroke | Active defence / central counter (Nimzo, Capablanca, Em. Lasker, Ed. Lasker) |
| 12 The Will to Win | Psychology / struggle (Em. Lasker, Réti, Staunton) |
| 13 Forcing the Surrender | Endgame (Capablanca, Ed. Lasker both books, Staunton) |
| 14 Culminating Point | Clausewitz + relinquishing the initiative (Capablanca) |
| 15 Centre of Gravity | Clausewitz + key point/over-protection (Nimzo) + Young's decisive point |
| 16 Inside His Decision Loop | Boyd + transforming the position (Réti) |
| Epilogue — Commander's Eye | The whole synthesis recapitulated |

## 3. Rebuild rules

- **Teach by ear.** Every named concept (isolated/backward/doubled pawn, hole,
  outpost, open file, bishop pair, opposition, passed pawn) is explained in
  plain words the same breath it's named — the listener builds the picture in
  their head, no board.
- **Right ideas, elegantly taught** (the masterclass doctrine): the settled,
  mainstream understanding is the raw material; the elegance is the job. No
  invented lines (board-free, so no move-claims to get wrong); concepts are the
  consensus of the corpus above.
- **Long & deep.** Each chapter a full audio-essay, flowing prose for drive /
  sleep listening — not bullet-dense.
- **Cite sources** per chapter (the `**Sources.**` line), naming which books
  the cluster drew from.
