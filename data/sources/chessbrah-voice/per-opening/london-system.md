# London System (White) — Aman Hambleton voice corpus

Farmed 2026-07-30 from the 18-part "Grandmaster Teaches The London System" series.
Reference only; every move below is UNVERIFIED (see `../README.md`).

Sources:
- Grandmaster Teaches The London System (18 parts) — https://www.youtube.com/playlist?list=PLUjxDD7HNNTiljFCufDXDSjEQH1cIdbSx
- London System Series playlist (course companion) — https://www.youtube.com/playlist?list=PLUjxDD7HNNTiljFCufDXDSjEQH1cIdbSx

## Why this one first

This is his flagship teaching opening — he has a paid London course and the
channel bills him as the London pro. It is also the deepest instructional series
on the channel and the one where his explanation rate stays high across every
part, because he is teaching a system he has genuinely codified rather than
reacting to whatever a speedrun opponent plays.

It is a real gap in our content: Naroditsky's London material is *anti*-London
(how to punish it as Black). Nobody in the repertoire teaches the White side.

## The structural rules he repeats

**Keep the dark-square bishop, and know its retreat square.** The bishop
essentially always drops back to h2 rather than e3 — he says outright that it
doesn't want to go to e3 in these structures. Preserving that bishop is treated as
the system's core asset, and several of his move-order choices exist only to keep
it alive.

**h3 is a system move, not a waiting move.** Played early and often, specifically
to deny ...Nh5 (and ...Bg4/...Bf5 ideas) the tempo that would harass the
dark-square bishop. He picks h3 over Nf3 in some orders purely to keep the bishop.

**c3 or c4 is decided by Black's central break.** The rule he states: if it looks
like an ...e5 game, you need c4 rather than c3. The c3 setup is for the quiet
structures; the moment Black commits to the ...e5 break, the modest c3 concedes
the centre and c4 with Nc3 is the fight. He explicitly warns against the passive
c3-and-Nbd2 default when the position has gone sharp.

**Against ...f5 you must get f3 in.** Kicking the knight is described as
necessary, not optional — otherwise Black's kingside space becomes permanent.

**c5 as a loosening pawn sacrifice.** He calls it a common motif: give the pawn to
open the b2-diagonal, which he wants open at all times. Pairs with Qb3 ideas
hitting a hanging bishop on b7 or the b7-square generally.

**Bd3 over Bb5.** He says he has settled on Bd3 as his main bishop square and
regards the Bb5 lines as no longer promising against current Black defences, and
overhyped.

**Ng5 when Black plays a ...Bf7-style setup** — he says he always feels confident
going Ng5 there, and has used it in tournament play.

**a4-a5 queenside clamp** appears repeatedly as the alternative plan when the
kingside attack isn't available.

## Verification owed before any of this ships

- The bishop-retreat and h3 rules are structural claims and can be stated from
  general London understanding, but each *line* demonstrating them must be pulled
  from the tree/explorer, not from the captions.
- The c3-vs-c4 rule is the strongest and most teachable idea here. Build it as a
  branch point in the lesson: same position, Black commits to ...e5, the spine
  takes the c4 route. Needs a real branch in the data to hang on.
- The c5 pawn sacrifice needs engine verification of the compensation before it
  is taught as sound, and it must be classified per the trap taxonomy — most
  likely `mistake`/positional rather than a forced tactical trap.
- Ng5 vs the ...Bf7 setups: find the actual games. He says he played it in a
  tournament; if it's in his chess.com corpus it becomes a real model game.

## Data backing

`data/sources/chessbrah-trees/` currently has no London tree — the extractor was
never pointed at it. Before building, add a London entry to `OPENINGS` in
`extract-opening-tree.mjs` (`minPrefix: ['d4','d5','Bf4']` and the ...Nf6 order)
and run the STEP 2 extraction. If his own blitz corpus is thin here, this is a
legitimate taught-not-played build: ground the moves on the theory DB plus the
masters/club explorer and flag it as such.
