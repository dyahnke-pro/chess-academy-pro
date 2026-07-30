# English Opening (White) — Aman Hambleton voice corpus

Farmed 2026-07-30 from the 15-part "GM Hambleton's English Speedrun" plus the
standalone "GRANDMASTER EXPLAINS: The English Opening". Reference only; every move
below is UNVERIFIED (see `../README.md`).

Sources:
- English Speedrun — https://www.youtube.com/playlist?list=PLUjxDD7HNNTgFhixLDC8ZbTyLaqZZ-oyu
- GRANDMASTER EXPLAINS: The English Opening (standalone lecture)

## The structural targets he names

**The a4/b3/Rc1 formation as "goals and dreams".** He says it in those words: with
pawns on a4 and b3 and the rook on c1, the enemy a-pawn becomes a fixed target,
b3 supports both his pawns, and everything defends itself. A concrete, nameable
target formation is unusually good raw material for a middlegame-plan card,
because the plan has a picture rather than a slogan.

**Take on c5 and play b4.** His stated default whenever Black plays ...c5: capture
and follow with b4, and he says plainly that he is happy to steer into an
isolated-queen's-pawn position as White. Naming the structure he *wants* is more
useful than the move itself.

**e5 as the anti-Sicilian-flavoured clamp.** He notes e5 is the main move against
the Sicilian setups precisely because White hasn't taken in the centre, and it
stops Black from getting in ...d5.

**Nd5 as the permanent ambition.** Black not wanting to allow Nd5 drives several
of his moves; a knight landing on c4 gets the same treatment — he calls it
dominant when it lands.

**The h4-h5 space grab.** His reasoning is worth keeping because it's a chain of
concrete consequences rather than a slogan: h5 stops ...h5, and once he gets h5
in, ...g6 is met by h6, while ...h6 leaves the king unable to feel safe on h7 —
and the pawn on a light square is easy for him to support.

**Cramp as the win condition.** Repeatedly, the evaluation he gives is that Black
simply has nowhere to put pieces, and that trades are Black's only relief — so he
declines them. Any trade being good for him is stated as the tell that the
strategy has worked.

## Verification owed

- The a4/b3/Rc1 formation is the single best candidate here; it needs a real
  anchor FEN from the tree and a check that the a-pawn target is actually fixed
  in that position.
- The take-on-c5-and-b4 rule and the IQP preference need the branch where they
  apply — the English transposes constantly, and a rule stated in one structure
  will be wrong two moves earlier.
- The h4-h5 chain is a good multi-clause "why", but each clause must be true on
  the board at the ply it's spoken (the narration-accuracy contract), so it needs
  a specific position, not a general recipe.

## Data backing

No `aman-english` tree yet, but the English is a plausible one for his own corpus
— he plays c4 in blitz. Run the extractor before deciding taught-vs-played.
