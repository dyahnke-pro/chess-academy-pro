# Masterclass Soundness Repair — Plan & Research (2026-06-09)

**Status: RESEARCH / PLANNING ONLY. No build, no content change until this doc
is reviewed by David.** This doc is the durable memory of the plan so the work
can be double-checked before anything is touched.

## Why this exists

The soundness sweep (`scripts/soundness-sweep.mjs`, Stockfish 16 @ depth 18,
student's perspective) flagged 15 masterclass lessons whose terminus leaves the
student worse than −1.0. Per-ply diagnosis (`scripts/_diag-soundness.mjs` +
`scripts/_diag-curve.mjs`) sorted them into three buckets. This doc plans the
repair of the lines that genuinely need it.

## The fix order (LOCKED — G9.3 Gate D)

For every line in scope, in this exact order — **no narration written until the
move skeleton is locked and verified:**

1. **Gate B — extend the opening to a real middlegame** on the *sound* line.
   The corrected spine is the DATA-walk (most-played master move per ply, via
   `/api/lichess-explorer`), engine-verified at the terminus. Never authored
   from memory (G3).
2. **Gate C — re-anchor the middlegame plan** so its `criticalPositionFen` is
   the corrected opening's terminal FEN (opening → middlegame is ONE continuous
   line). Re-derive the plan themes from the data at that position.
3. **THEN** (Phase 2, separate research) author narration over the locked
   skeleton.

Every corrected move in this doc carries its **source + eval** so it can be
double-checked.

---

## Phase 0 — Soundness findings (DONE)

### Bucket A — FAULTY: a clearly better move existed (fixable)

Student was healthy; a single taught move (usually the last) threw it.

| Line | Faulty move | Eval | Correct move (engine + masters) | Holds |
|---|---|---|---|---|
| Alekhine, Four Pawns | final `…f6` | −1.07 | `…Nxd4` | −0.07 |
| Semi-Slav, Botvinnik | final `…Qa5` | −2.82 | `…Qb5` (607 master games) | ~level |
| KID, Fianchetto | final `…cxd5` | −1.40 | `…Nc5` (masters #1) | −0.70 |
| Old Indian, Czech | final `…c5` | −1.11 | `…a5` | −0.62 |
| Old Indian, Be2 | final `…c5` | −1.26 | `…a5` | −0.93 |
| Sicilian Dragon, Chinese | tail `…b5` (+`…Bd7`) | −1.16 | `…Na5` (`…Nxd4` earlier) | −0.57 |

Top two (Alekhine, Botvinnik) are unambiguous blunders off an equal/level
position. The bottom four are a faulty tail on a dim opening (the swap recovers
30–70cp but the opening is still slightly worse — see Bucket B note).

### Bucket B — DIM OPENING played reasonably (curation + line rebuild)

Curve shows best ≈ taught at almost every ply — no single blunder. The opening
itself drifts the student to a bad position.

- **Pirc, Austrian Attack** — steady slide −0.55 → −1.64; engine-best at the end
  still −1.27. Passive `…Na6-c7 + …b6` plan; Stockfish even prefers `…e5` over
  the Pirc's own `…g6`. No clean single fix — needs a more active spine or
  honest framing.
- **Pirc, Czech** — `…c6 + …Qa5` sideline sits ~−1.0 from move 9. Dim by
  variation choice.
- **Benoni, Taimanov (f4/Bb5+)** — the Modern Benoni into the Taimanov is the
  critical anti-Benoni; Black is −1.0 to −1.4 the whole way with best play. Bad
  matchup to teach as a Black main line.

> **DECISION NEEDED (David):** for Bucket B, do we (a) rebuild the spine onto the
> soundest available line of the same opening and keep it (with honest "this is
> a tough, slightly-worse defense" framing), or (b) replace the variation
> entirely with a sounder sibling? Phase-1 research below gives the soundest data
> line for each so the decision is informed.

### Bucket C — GAMBIT / SIDELINE SHOWCASES (NOT defects — leave the moves)

Negative eval is the point. Only a defect if the narration claims soundness/
equality. **Excluded from the move-repair scope; the ONLY action is a
narration-honesty check (Phase 2).**

- King's Gambit Allgaier (−3.6), Muzio (−2.6), Classical (−1.0) — piece sacs.
- Albin Countergambit (−1.4) — `2…e5` IS Black's gambit.
- Budapest Fajarowicz (−1.1) — the dubious sideline is the subject.
- Vienna vs 2…Nc6 (−0.9) — sharp Vienna Gambit `Nf3→Ng5`; `Nf3` is masters' #1.

---

## Phase 1 — Corrected opening → middlegame + plan anchor (IN PROGRESS)

Grounded via `scripts/_diag-research-walk.mjs` (data-walk + engine-verify).
Per opening: the corrected sound spine to the middlegame, the terminus eval
(student persp), the anchor FEN for the re-anchored middlegame plan, and the
data-derived plan themes.

### 1A — Corrected opening → middlegame spines (Gate B, engine-verified)

All spines are the DATA-walk (most-played master move per ply via
`/api/lichess-explorer`, masters DB w/ 2200+ lichess fallback), engine-verified
at the terminus (Stockfish 16, depth 20, student = Black on all of these).
Compare the corrected terminus eval to the broken lesson's eval in Phase 0.

| Line | Corrected data spine (engine-verified) | Terminus | Was |
|---|---|---|---|
| **Alekhine Four Pawns** | `e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 f4 dxe5 fxe5 Nc6 Be3 Bf5 Nc3 e6 Nf3 Be7 Be2 O-O O-O f6 exf6 Bxf6 Qd2 Qe7 Rad1 Rad8 Qc1 h6` (move 15) | **−0.82** | −1.07 |
| **Semi-Slav Botvinnik** | `d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 dxc4 e4 b5 e5 h6 Bh4 g5 Nxg5 hxg5 Bxg5 Nbd7 g3 Bb7 Bg2 Qb6 exf6 O-O-O O-O c5 d5 b4 Na4 Qb5 a3 Nb8 axb4 cxb4 Qg4 Bxd5 Rfc1 Nc6` (move 20) | **−0.45** | −2.82 |
| **KID Fianchetto** | `d4 Nf6 c4 g6 g3 Bg7 Bg2 O-O Nc3 d6 Nf3 Nc6 O-O a6 h3 Rb8 e4 b5 e5 dxe5 dxe5 Qxd1 Rxd1 Nd7 e6 fxe6 cxb5 axb5 Bf4 Nde5` (move 15) | **−0.21** | −1.40 |
| **Old Indian (Be2 & Czech)** | `d4 Nf6 c4 d6 Nc3 e5 Nf3 Nbd7 e4 Be7 Be2 O-O O-O c6 Re1 a6 Bf1 b5 a3 Bb7 Bg5` (move 11) | **−0.58** | −1.11 / −1.26 |
| **Pirc Austrian** | `e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O Bd3 Na6 O-O c5 d5 Bg4 Bc4 Nc7 h3 Bxf3 Qxf3 a6 a4 b6 Qd3 Qc8` (move 13) | **−0.74** | −1.64 |
| **Pirc Czech** | `e4 d6 d4 Nf6 Nc3 c6 f4 Qa5 Bd3 e5 Nf3 Bg4 Be3 Nbd7 O-O Be7 h3 Bxf3 Qxf3 O-O Ne2` (move 11) | **−1.37 ⚠** | −1.02 |
| **Benoni Taimanov** | `d4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 f4 Bg7 Bb5+ Nfd7 a4 O-O Nf3 Na6 O-O Nb4 Re1 a6 Bf1 Re8 h3 f5 Bd2` (move 15) | **−0.74** | −1.39 |
| **Sicilian Dragon** | `e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 O-O-O d5 exd5 Nxd5 Nxc6 bxc6 Bd4 e5 Bc5 Be6 Ne4 Re8 h4 h6 g4 Qc7 g5 h5 Bc4 Red8 Qf2 Nf4 Bxe6 Nxe6` (move 20) | **−0.53** | −1.16 |

**Anchor FENs (for the re-anchored middlegame plan, Gate C):**
- Alekhine Four Pawns: `3r1rk1/ppp1q1p1/1nn1pb1p/5b2/2PP4/2N1BN2/PP2B1PP/2QR1RK1 w - - 0 16`
- Semi-Slav Botvinnik: `2kr1b1r/p4p2/2n1pP2/1q1b2B1/Npp3Q1/6P1/1P3PBP/R1R3K1 w - - 2 21`
- KID Fianchetto: `1rb2rk1/2p1p1bp/2n1p1p1/1p2n3/5B2/2N2NPP/PP3PB1/R2R2K1 w - - 2 16`
- Old Indian: `r2q1rk1/1b1nbppp/p1pp1n2/1p2p1B1/2PPP3/P1N2N2/1P3PPP/R2QRBK1 b - - 2 11`
- Pirc Austrian: `r1q2rk1/2n1ppbp/pp1p1np1/2pP4/P1B1PP2/2NQ3P/1PP3P1/R1B2RK1 w - - 2 14`
- Pirc Czech: `r4rk1/pp1nbppp/2pp1n2/q3p3/3PPP2/3BBQ1P/PPP1N1P1/R4RK1 b - - 2 11`
- Benoni Taimanov: `r1bqr1k1/1p1n2bp/p2p2p1/2pP1p2/Pn2PP2/2N2N1P/1P1B2P1/R2QRBK1 b - - 1 15`
- Dragon: `r2r2k1/p1q2pb1/2p1n1p1/2B1p1Pp/4N2P/5P2/PPP2Q2/2KR3R w - - 0 21`

### Findings that change the plan

- **The data-walk alone fixes most of them.** Walking the most-played master
  line (instead of whatever the lesson hand-picked) lands Alekhine −0.82,
  Botvinnik −0.45 (and it *plays `…Qb5`* on its own — confirming the Bucket A
  fix), KID Fianchetto −0.21, Old Indian −0.58, Dragon −0.53, Benoni −0.74,
  Pirc Austrian −0.74. All a real improvement; all reach a middlegame. So for
  7 of 8, the repair = **rebuild the spine on the data line + re-anchor the
  plan** — no invention needed.
- **Pirc Czech is the exception ⚠.** Even the most-played line reaches −1.37 —
  the variation is genuinely dim at the root. This is a **replace, don't
  rebuild** candidate (swap the Czech `…c6+…Qa5` for a sounder Pirc/Modern
  treatment, OR drop the variation). Needs David's Bucket-B call. (Note: the
  −1.37 leaned on the 2200+ lichess fallback where masters thinned — worth one
  re-confirm at the fork before deciding, but the signal is clear.)
- **KID Fianchetto's corrected line (−0.21) transitions into a queens-off
  middlegame** (`…dxe5 …Qxd1`), so its "middlegame plan" is really an
  early-endgame plan — the re-anchored plan must reflect that, not a kingside
  storm.

### 1B — Middlegame plans grounded from the data (Gate C themes)

_(continuation walk — most-played plan moves from each anchor — appended next)_

---

## Phase 2 — Narration research (PENDING — after Phase 1 review)

For each corrected line: gather the teaching IDEAS from grounded sources (book
corpus `chess-concepts.json` / `opening-book-pages.json` for classical openings;
reputable references for modern ones), record `sources[]` per beat, in original
prose (no lifted phrasing). Saved here before any narration is authored.

---

## Sequencing / next-session pickup

1. Finish Phase 1 tables (this doc) — corrected spines + plan anchors, all
   engine-verified, all sourced.
2. David reviews + answers the Bucket B decision.
3. Phase 2 narration research → appended here.
4. ONLY THEN build, in Gate B→C→D order, one opening at a time, re-running the
   soundness sweep + board-truth gates after each.
