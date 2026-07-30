# Colle-Zukertort (White) — Aman Hambleton voice corpus

Farmed 2026-07-30 from the 22-part "Colle Zukertort is the BEST attacking opening"
series. Reference only; every move below is UNVERIFIED (see `../README.md`).

Source: https://www.youtube.com/playlist?list=PLUjxDD7HNNTgHZ8KoBAaDppN1zerOWpXi

## The setup

d4, Nf3, e3, b3, Bb2, Bd3, O-O, then Ne5 and f4 — the Pillsbury attacking
formation with the queen's bishop outside the pawn chain. He frames the whole
opening as an attacking system, not a quiet one.

## The move-order rule he states as absolute

**The c-pawn goes in front of the knight — never Nc3 with the c-pawn behind it.**
He states this flatly as the setup rule: c4 (or c3) first, then the knight. This
is the same rule he states in the 1.b4 series, which suggests it is a genuine
personal principle across his queenside systems rather than a line-specific quirk,
and it is a good candidate for a cross-opening teaching beat.

## When the standard attack applies — and when it doesn't

The most useful thing in the series, because it is a *conditional*:

- **Black plays ...d5** → the normal plan is on. Ne5, f4, rook lift, kingside
  attack. He wants the knight on e5 supported and the f-file opening.
- **Black plays ...d6 (and especially ...g6)** → the Ne5 attack does not work.
  He says outright you can't always have an attack with Ne5, and against the
  ...g6 setups he switches to c4 and plays a different game entirely.

That branch — same first four moves, two completely different plans depending on
Black's third-move commitment — is the lesson. It is also honest about the
system's limits, which is rarer than it should be in system-opening content.

## Tactical and positional motifs he returns to

- **Ba3 hitting the e7-bishop**, forcing a knight to a bad square. He rates it as
  strong enough to play almost without checking for danger.
- **a4-a5 clamp** on the queenside, described as threatening both Ba3 and the
  further a-pawn push — a two-threat move.
- **h4-h5 when Black's knight has left f6** — his stated trigger for switching to
  a direct pawn storm.
- **The urgency argument:** White has to get the knight in and f4 played almost
  immediately, because if Black is allowed to consolidate, Black's position is
  simply good. He is explicit that the system punishes slow play by White.

## Verification owed

- The ...d5 vs ...d6/...g6 branch is the centrepiece. Build the two spines from
  real data before writing a word of narration (G9.3 Gate D).
- Ba3 and the a4-a5 clamp need concrete anchor positions; "it always works" is
  not a tier.
- The h4-h5 trigger needs a stated condition tighter than "knight left f6" before
  it can be a teaching rule.

## Data backing

No `aman-colle` tree exists. Same check as the London and the QG: measure his own
game volume first, and if it's thin, build it as taught-not-played with DB and
explorer grounding rather than faking game-derived depth.
