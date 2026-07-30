# Aman Hambleton — Sicilian Kan / Taimanov (...e6) voice corpus

Sources consulted (2026-06-01):
- Aman Hambleton's public Lichess study "Games in the Sicilian with 2...e6" (lichess.org/study/VDBNbkrj)
- chessbrah Building Habits / Bullet Habits series (chess.com/blog/lavantien SCID extract)
- chess.com opening pages: Sicilian Defense Taimanov 5.Nc3 a6; Kan Variation
- chessworld.net Sicilian Kan adviser; chessable.com Taimanov guide

## Core ideas (mainstream understanding, threaded with his data)
- 2...e6 is the flexible Kan/Taimanov move order — keeps options between ...a6 (Kan)
  and ...Nc6 (Taimanov). His most-played line in the whole 35k corpus (2006g, 74.8%).
- 4...a6: stops Nb5 (no Nd6+/Nb5 hops into the position) AND prepares ...b5 queenside
  expansion. The signature move.
- 5...Qc7: the Bastrikov setup — queen eyes the e5-square and the half-open c-file,
  discourages e5, supports ...b5 and a later ...Bb7.
- The plan is NOT memorization: ...a6, ...Qc7, ...b5, ...Bb7 and the ...d6/...e5
  or ...d5 central breaks work together. Black expands on the queenside while White
  attacks the kingside (opposite-wing races in the f4 lines).
- vs 6.Bd3 (his main): small-center Scheveningen structure, ...d6, ...Nbd7, ...b5.
- vs 5.c4 Maróczy Bind: ...Nf6, ...d6, ...b6, ...Bb7 — hypermodern, pressure the
  bind, break with ...d5 or ...b5 when prepared. His best-scoring? No — solid.
- vs 2.c3 Alapin: ...Nf6 hitting e4, ...d5 freeing — equalizing the anti-Sicilian.

## Hambleton phrasing / register notes
- Principle-first, "habits" framing: develop, don't hang pieces, improve worst piece.
- Queenside majority races: "you push where you're strong."

---

# YouTube teaching corpus (added 2026-07-30)

The 21-part "Play the Sicilian Taimanov like a Grandmaster!" series (400-500 up to
2400-2500) is his dedicated teaching run on this exact opening — the richest voice
source for any already-built `pro-aman-*` entry. Reference only; every move below
is UNVERIFIED (see `../README.md` — auto-captions mangle notation badly, and this
series is one of the worst offenders: "time onov" for Taimanov, "Brook" for rook).

Source: https://www.youtube.com/playlist?list=PLUjxDD7HNNTjZAD99gBAKVm_ZipXTtNYn

## The structural rules he states

**The c-pawn does not go to c4.** Stated as a personal absolute — he needs that
pawn where it is, and pushing it wrecks the structure the setup depends on. This
is the clearest structural rule in the series and the one most worth a beat.

**...e5 (or ...e4) only when it forces a capture that corrects the structure.**
His stated exception: the one time he'll push the e-pawn in a Taimanov setup is
when it forces White to take, so he can immediately repair a structure he
otherwise never wants to be stuck with. A conditional rule with a stated reason —
good two-register material.

**Pawns on dark squares when you have the bishop pair.** He calls the dark-square
pawns the best gift he can give his own position when holding two bishops, and
states the king-and-pawn colour rule directly: against a dark-square bishop, your
pawns want to be on dark squares and your king on a light one. This is standard
Capablanca/Lasker colour-complex understanding — cross-check it against
`chess-concepts.json` and cite `concept:` sources, rather than treating it as his
original idea.

**Trade off the enemy dark-square bishop whenever you can get your hands on it.**
Repeated across bands, and consistent with the pawn-colour rule above.

**...Ba6 is a big move and it always works.** His words for the light-square
pressure against the c4-square, which he ties to wanting ...c4 ideas himself.
Needs a real position — this is exactly the kind of "always" that is true in one
structure and loses a piece in another.

**...b5 with the pin as a common motif.** Named as recurring; unverified.

**The developing default when White goes Bg5**: block with ...Be7 and castle,
stated as an automatic sequence.

## Coverage note

The series covers what happens when opponents **dodge** the Taimanov as much as
what happens when they allow it — he complains about it repeatedly at the higher
bands. That anti-dodge material maps onto the existing `pro-aman-anti-caro`-style
sideline entries and is worth mining separately if the Kan/Taimanov entry gets a
variation-tab expansion.

## Verification owed

- Every rule above needs its anchor position from `data/sources/chessbrah-trees/aman-sicilian-kan.json`
  (which already exists — this is the one opening where the game data is already
  extracted and the voice was the missing half).
- The pawn-colour and bishop-pair ideas should cite the book corpus, not him.
- "...Ba6 always works" must not ship in that form; find the structure where it's
  true and teach that.
