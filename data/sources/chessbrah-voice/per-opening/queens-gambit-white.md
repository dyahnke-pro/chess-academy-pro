# Queen's Gambit (White) — Aman Hambleton voice corpus

Farmed 2026-07-30 from the 23-part "How to WIN with the QUEEN'S GAMBIT" series
(400-500 up to the 2500-2600 finale). Reference only; every move below is
UNVERIFIED (see `../README.md`).

Source: https://www.youtube.com/playlist?list=PLUjxDD7HNNTgUtmFtlWp2W3Lu9RKRziZv

## The setup he actually teaches

Not a theory dump — a **piece-placement system** he repeats every game and calls
autopilot: bishop to d3, knight to e2 and onward to e3 or g3, then Be3/Bd4, Qd2,
and the queen's knight rerouting via d1. The stated benefit is that once the
centre closes, every piece has a known square and you can play on general
principles without calculating an opening you half-remember.

## The ideas that recur

**Meet a closed centre by capturing and playing f4 immediately.** His stated plan
whichever pawn Black pushes: take, then f4 at once, so that Black never gets to
play f4 against him. He accepts that Black gets ...e4 in return and argues the
resulting piece squares are worth it. This is the most systematised idea in the
series and the one most worth building a lesson around.

**Don't let Black develop the light-square bishop for free.** Stated as a general
rule for playing against the Queen's Gambit structures: ...Bf5 and ...Bg4 should
cost Black something. Hence the early h3, and g4 in the specific line where it
gains the tempo.

**h3 before e4, because e4 weakens g4.** He is explicit that the reason for h3 is
that once he commits to e4, the g4-square becomes a hole worth pre-empting.

**Pressure on c6 with Na4 against ...b5.** Recurring: Black's queenside expansion
runs into Na4, and the c6-pawn becomes the target. When ...Rb8 is awkward, ...Ba6
is Black's better try — he names it as the move he'd fear.

**The d5 break as the structure-wrecker.** Repeatedly the move he saves: not for
material but because it ruins Black's pawn structure, and specifically because
doubling pawns in front of the enemy king is worth more than a tempo.

**Bxh6 sacrifice vs fianchetto setups.** He claims it essentially always works
against the King's Indian-style structures that arise when Black avoids ...d5.
This is exactly the class of claim that must be engine-verified before it ships —
"pretty much always wins" is a coach's shorthand, not a tier.

**Why ...c5 too early is bad for Black.** A clean teaching moment: Black attacks a
pawn that a natural developing move defends, then has no follow-up, is still two
moves from castling, is opening the centre against a king that can castle
immediately, and ends up with an isolated pawn for the trouble. Four separate
reasons stacked on one move — a good template for a Pitfall entry.

## Verification owed

- The f4 clamp plan needs a real anchor position from the tree/explorer, and the
  "they never get f4" claim should be checked against what Black actually plays.
- Bxh6: engine-verify at the quiet end of a best-play playout and tier it per the
  gem doctrine (≥+1.0 confirmed, +0.5-1.0 positional, below that it does not
  ship). Do not author the "always wins" framing.
- The ...c5-too-early pitfall is the strongest Pitfall candidate in the series;
  it needs a FEN, the wrong move, the correct move, and an engine delta.
- Na4/c6 pressure: find the branch in the data where ...b5 is actually common at
  club level, or it isn't worth a lesson.

## Data backing

No `aman-queens-gambit` tree exists yet. He plays 1.d4 systems less than 1.e4 in
his blitz corpus, so check the volume before committing to a full G9.1 build — if
his own games are thin, build it as taught-not-played on DB + explorer grounding
and say so in the entry.
