# Stonewall (White) — Aman Hambleton voice corpus

Farmed 2026-07-30 from the 11-part "Win in Chess using the Stonewall" series.
Reference only; every move below is UNVERIFIED (see `../README.md`).

Source: https://www.youtube.com/playlist?list=PLUjxDD7HNNTgUMR77Bdd3NGtvFXApHZkS

## The one rule the whole series hangs on

**Never let Black get a pawn to f5.** He states this as the thing he is doing
differently from the standard Stonewall treatment, and gives the full reason: if
Black gets the doubled f-pawns, one of them controls e4 and the other plays ...f6,
and White never gets to use e5. The entire point of the formation is the e5
outpost, so conceding f5 concedes the opening.

That is a genuinely good teaching beat — a single prophylactic rule derived
transparently from what the structure is *for*.

## The g4 plan

His recurring engine of play on the kingside:

- h3 first, then Rg1, then g4.
- If Black takes on g4 and he recaptures with the g-pawn, he gets the open g-file.
- If the exchange happens such that Black's e-pawn recaptures on f5, that pawn
  becomes a **protected passed pawn** for him — he flags this as the outcome he
  is actually steering toward, not a byproduct.

He also states h3 before e3 as a move-order preference, on the grounds that the
bishop eventually has to leave and h3 pre-empts what happens when it does.

## Against ...c5

His stated handling: throw in c3, but with no intention of recapturing that way —
the plan is always to take with the other pawn. A small, concrete move-order rule
of exactly the kind the app's Learn rung is good at.

## Piece routing

- The dark-square bishop to h4 as fast as possible when Black mirrors the setup.
- Knight to d2 as the standard rerouting square.
- Knight rerouting via f8 for Black in the mirrored structures — he narrates the
  defensive version too, which makes the series useful for both colours.
- Trade offers judged by whether they help Black free the cramped position; he
  reads a retreating enemy queen as the signal his plan is working.

## Verification owed

- The f5 prophylaxis rule is the headline. It's a structural claim, defensible
  from general understanding, but the *line* that demonstrates it must come from
  the data.
- The protected-passed-pawn outcome of the g4 plan needs a concrete position; it
  is the kind of claim that is true in one pawn configuration and false in the
  next-door one.
- The c3-but-recapture-the-other-way rule needs its actual position.

## Relationship to the Colle and the London

All three are d4 systems with an e5 outpost ambition and a dark-square bishop
question, and he teaches them with overlapping vocabulary. If more than one gets
built, the outpost-and-bishop through-line is worth making explicit across them
rather than repeating it three times.

## Data backing

No tree. Same taught-not-played check as the other systems.
