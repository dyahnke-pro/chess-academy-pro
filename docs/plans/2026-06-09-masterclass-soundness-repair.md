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

- **Pirc, Austrian Attack** — the ONE genuinely dim Pirc line. At depth 24 the
  taught line is **−1.63** (passive `…O-O/…Na6-c7/…b6/…Rb8` crawl lets White
  swing `Qe1-Qh4`). **Fix = swap the passive plan for the active `…c5` strike —
  already proven sound in this opening's own siblings:** the "Austrian with …e5
  …c5" tab evals **+0.29** and GothamChess's `…c5 Bb5+ Nc6 e5 Nd7` evals −0.05.
  Same opening, better plan — NOT a drop.
- **Pirc, Czech — RECLASSIFIED (2026-06-09 depth-24 re-eval): FINE.** The earlier
  "⛔ −1.37" was an INTERMEDIATE ply, not the terminus. The full taught line at
  depth 24 is **−0.79** — same slightly-passive band as the other sound Pirc
  tabs. **No replace, no drop.** (The depth-18 sweep over-pessimised it by ~23cp,
  consistent with the gem-depth finding that deeper search is kinder to quiet
  lines.)

**Full Pirc soundness map (depth 24, student=Black):** Byrne +0.29, Austrian-w-c5
+0.29, Fianchetto −0.47, Lion −0.48, Main/Classical −0.51, 150 −0.67, Czech
−0.79, **Austrian Attack −1.63 (lone fix)**. 7 of 9 lines −0.5..+0.3; the Pirc is
a healthy fighting repertoire. Pro-rep: Hikaru "vs Austrian f4" also dim (−1.06,
optional same `…c5` fix); GothamChess Pirc all fine (−0.05..−0.58).
- **Benoni, Taimanov (f4/Bb5+)** — the Modern Benoni into the Taimanov is the
  critical anti-Benoni; Black is −1.0 to −1.4 the whole way with best play. Bad
  matchup to teach as a Black main line.

> **DECISION STATUS (updated 2026-06-09 after the depth-24 Pirc map):**
> - **Pirc Austrian** — the data ANSWERS it: rebuild the tab onto the in-opening
>   `…c5` plan (proven +0.29 in the sibling tab). No David decision needed.
> - **Pirc Czech** — RECLASSIFIED FINE (−0.79 at depth 24). No action.
> - **Benoni Taimanov** — the one genuine keep-vs-replace JUDGMENT left: it's a
>   tough matchup (~−0.7 to −1.0) with no in-opening rescue as clean as the Pirc's.
>   Keep-with-honest-framing or steer the Benoni move-order away from the Taimanov?
>   **This is the remaining Bucket-B call for David.**

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
| **Pirc Czech** | `e4 d6 d4 Nf6 Nc3 c6 f4 Qa5 Bd3 e5 Nf3 Bg4 Be3 Nbd7 O-O Be7 h3 Bxf3 Qxf3 O-O Ne2 c5 dxe5 dxe5` (move 12) | **−0.79 @d24 ✓** | (fine) |
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
- **Pirc Czech is FINE (−0.79 @d24)** — the earlier −1.37 was an intermediate ply.
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

Continuation walk (`scripts/_diag-plan-walk.mjs`): from each anchor, the
most-played master move for ~12 plies (game counts in parens). Where the data
goes thin/off-book, the plan must be derived from STRUCTURE + the concept corpus
(G3: never invent a continuation the games don't show — "empty > generic >
invented").

| Line | Data continuation from anchor (most-played) | Plan reading |
|---|---|---|
| **Botvinnik** ✅rich | `Bxd5 Rxd5 Rxc4 Rxg5 Qd4 Kb8 Rxc6 Rxg3+ fxg3 Qxc6 Rd1 Qc7` (187–208 games each) | Not a "plan" — **forced main-line theory**. Mass liquidation to a Q+R middlegame ≈ balanced (Black's extra pawns vs White's activity). The lesson should FOLLOW this forced line; the "plan" beat = the liquidation + resulting structure. |
| **Benoni Taimanov** ✅rich | `fxe4 Nxe4 Nf6 Nxf6+ Bxf6 Qb3 Rxe1 Rxe1 Bf5 g4 Bd7 Bc3` (23–34) | The thematic **`…f5` break** (already on the board at the anchor) → `…fxe4` opens the f-file, trade a pair of knights, activate the bishops (`…Bf5/…Bd7`) and the `Bg7/…Bf6` long diagonal. Theme = `…f5` central break + f-file/long-diagonal pressure. |
| **Dragon (d5 main)** ◑thins | `Bd6 Qb6 c3` (42→29→15) | After the `…d5` liquidation: Black's `…Qb6` hits b2/f2, piece activity + queenside/open-file counterplay (classic Dragon, calmer structure). Theme = active pieces + queenside pressure. Thins → ground rest on structure. |
| **Old Indian** ◑thin | `h6 Bh4 Re8 Rc1` (10–21) | Complete development (`…Re8`), question the Bg5 (`…h6`), then the central `…exd4`/`…d5` break or play on the `…b5` queenside already started. Theme = central break + queenside space. Thin → structure-grounded. |
| **Alekhine Four Pawns** ◑thin | `Kh1 Kh8 b3 Bh7 Bd3` (6–153) | Quiet regroup: kings tucked, White builds the `Bd3` battery on b1-h7; Black holds the **bishop pair** (post-`…Bxf6`) and contests the f-file (`…Rad8`→f-file). Theme = bishop pair + f-file/central counterplay. Thin → structure-grounded. |
| **KID Fianchetto** ⚠off-book | (none — off masters book at the anchor) | The corrected line went **queens-off at move 15** (`…dxe5 …Qxd1`). So this is an **early-endgame plan, not a kingside storm**: centralized `…Nde5` knights, the e5/e6 pawn tension, knights-vs-bishop-pair balance. MUST ground on minor-piece-ending concepts (Capablanca/Lasker), not invent moves. |
| **Pirc Austrian** ⚠off-book | (none — off masters book at move 13) | Closed center (White's `d5`): Black's `Nc7 + …b5/…a6/…Rb8` queenside expansion + the `Bg7` diagonal, aiming at `…e6`/`…f5` breaks. Dim (−0.74). Theme = queenside play vs White's space. Off-book → structure-grounded; **Bucket-B decision applies.** |
| **Pirc Czech** ✓ | fine at −0.79 (depth 24) | Standard slightly-passive plan; treat like the other sound Pirc tabs. No special action. |

### Phase 1 conclusion

- **7 of 8 are "rebuild the spine on the data line + re-anchor the plan"** — all
  engine-verified sound, all reach a middlegame, no invention. Two (Botvinnik,
  Benoni) even have rich forced/thematic continuations to follow; the rest reach
  a sound position whose plan grounds on structure + concepts where the data
  thins.
- **Pirc Austrian** is the lone dim Pirc line; fix = in-opening `…c5` plan
  (data-proven +0.29). **Pirc Czech reclassified FINE.** Remaining Bucket-B
  call = **Benoni Taimanov** (keep-with-honest-framing vs steer move-order).
- **KID Fianchetto's plan is an early endgame**, not a kingside attack — the
  re-anchored plan + its narration must reflect that.

**Move skeletons are now LOCKED and verified (Gate B done; Gate C anchors +
themes identified). Narration (Phase 2) comes next — nothing is authored yet.**

---

## Phase 2 — Narration research (DONE — grounding identified, prose NOT authored)

The narration is built LAST (Gate D), over the locked skeleton. This section
records, per line, **what grounds the ideas** so the build authors ORIGINAL
prose from real sources — never from memory, never lifted (the 2026-06-09
plagiarism lesson: even ungated pro-rep prose must be *translated*, not copied).

**Corpus reality check (from `chess-concepts.json` + `opening-book-pages.json`):**
- Book pages exist for **`old-indian-defence`** (+ caro-kann, french, ruy,
  vienna, king's-gambit, qgd, etc.) — the corpus is pre-1930s **classical only**.
- The other six targets (Alekhine, Semi-Slav Botvinnik, KID, Pirc, Benoni,
  Dragon) are **modern → NO opening-specific book page**. They ground on (a)
  universal `concept:<id>` passages, (b) the DB move-lines (G3), (c) reputable
  URLs on the `narrationSources` allowlist (chess.com, lichess.org,
  chessable.com, wikipedia.org, 365chess.com, chessbase.com, chess24.com…).
- `concept:` ids verified to carry real passages and matched to each theme below
  (ids with 0 passages, e.g. `pos-bishop-pair`, `att-queenside-attack`, are NOT
  cited — use the populated equivalent, e.g. `end-two-bishops`).

**Build rule for every beat (record in `sources[]`):** ≥1 resolvable source —
`concept:<id>` and/or `book:<id>` and/or an allowlist URL — and the prose is
original (no phrase lifted from any source, incl. marketing copy).

| Line | Grounding sources | Teaching IDEAS to translate (not copy) |
|---|---|---|
| **Alekhine Four Pawns** | `concept:end-two-bishops`, `concept:pos-open-file`, `concept:pos-center`, `concept:pos-tempo`; chess.com/lichess/wikipedia Alekhine pages | Black *invites* White's huge c4-d4-e4-f4 center, then undermines it; the `…f6` break — timed AFTER development, not early (that was the −1.07 bug) — cracks the e5 wedge; Black emerges with the **bishop pair** + f-file play, slightly worse but active (−0.8). |
| **Semi-Slav Botvinnik** | `concept:tac-sacrifice`, `concept:pos-initiative`, `concept:pawn-passed`, `concept:pos-open-file`; chessable/chessbase/chess.com Botvinnik | The most-analyzed forcing line in chess: Black takes c4 then the b-pawns, White sacs a piece for the e5/f6 wedge + initiative; the **main line liquidates** (the rich data continuation) to a balanced Q+R position — Black's extra pawns offset White's activity. Beat = follow the forced theory + name the resulting balance. |
| **KID Fianchetto** | `concept:end-bishop-vs-knight`, `concept:end-two-bishops`, `concept:pos-centralization`, `concept:end-rook-7th`; chess.com/lichess KID Fianchetto | **Early-endgame plan, NOT a kingside storm** (corrected line trades queens move 15). The Fianchetto is White's most solid anti-KID; Black sidesteps the bad version via `…a6/…b5/…dxe5/…Qxd1` into a near-equal ending — teach the **holding technique** with centralized `…Nde5` knights vs the bishop pair. |
| **Old Indian** (Be2 & Czech) | **`book:old-indian-defence`** (real pages!), `concept:pawn-chain`, `concept:pos-center`, `concept:pos-development` | A sound, slightly passive KID-cousin: Black accepts less space for a solid structure, finishes developing, then breaks with `…exd4`/`…d5` or expands queenside (`…b5/…a6`, already on the board). Honest register: a touch worse (~−0.5), comfortable to play. **Avoid the `…c5` that tanked to −1.2.** |
| **Pirc Austrian** ⚠ | `concept:pawn-chain`, `concept:pos-space` (read), `concept:pos-weak-squares`; chess.com/lichess/wikipedia Pirc Austrian | Queenside expansion (`…b5/…a6/…Rb8/…Nc7`) vs White's big space, `Bg7` on the long diagonal, aiming at `…e6`/`…f5`. **Dim (−0.74) — narration MUST be honest it's a tough, slightly-worse defense, never claim equality** (the Antoshin failure). Pending Bucket-B decision. |
| **Benoni Taimanov** | `concept:pawn-chain`, `concept:pos-open-file`, `concept:att-kingside-storm`, `concept:pos-initiative`; chess.com/lichess/chessable Modern Benoni | The Taimanov (`f4/Bb5+`) is the critical anti-Benoni; Black must play actively for the **`…f5` break** (the rich data continuation: `…fxe4`, open the f-file, activate the bishops). Honest: Black is worse (~−0.7) and playing for activity/counterplay, not equality. |
| **Dragon (d5 main)** | `concept:pos-open-file`, `concept:pos-initiative`, `concept:tac-sacrifice`; chess.com/lichess Yugoslav Attack, chessbase | `…d5` is THE equalizer in the Yugoslav — it liquidates White's attack and leaves Black with sound, active piece play (`…Qb6` hitting b2/f2, queenside/open-file pressure). Replaces the dubious Chinese `…Rb8/…b5` (−1.16) with the principled central break (−0.53). |
| **Pirc Czech** ✓ | `concept:pawn-chain`, `concept:pos-development`; chess.com/lichess Pirc | Fine (−0.79). Standard slightly-passive Pirc register; same grounding as the other tabs. No special action. |

### Phase 2 conclusion
Every active line has ≥1 resolvable grounding source identified (Old Indian even
has real book pages). For the two honest-but-dim lines (Pirc Austrian, Benoni)
the narration register is constrained: **truthful "you're slightly worse,
play for X" framing — never an equality claim.** No prose authored; the build
reads the actual `concept:`/`book:` passage text before writing, in original
words.

### Phase 2 addendum — narration-honesty scan (2026-06-09, DONE)

Grepped `say`/`sayShort` across all flagged-opening lesson files for
equality/soundness language ("equal", "comfortable", "fully sound", "never
worse", "risk-free", "dead level"…). **Nuanced result — NOT a blanket lie:**

- **Mostly honest / on the SOUND sibling lines** (no action): Pirc Classical is
  tagged in-code `engine -0.42`; the KID Fianchetto beat already says *"be honest
  about the verdict — Black is a shade worse… a shade passive"* (the correct
  register); the Budapest **Adler** main line and the King's Gambit **Modern/
  Fischer** lines that genuinely recoup to ~level legitimately say "roughly
  balanced / comfortable". Alekhine **Exchange** ("full equality") is the calm
  ~equal line, not the flagged Four Pawns.
- **VERIFY-PER-LINE during the build** (the equality claim must be checked
  against THAT line's eval, not the sibling's): the genuinely-dim flagged lines —
  **Pirc Austrian** (−1.86), **Benoni Taimanov** (−0.7+), **Budapest Fajarowicz**
  (−1.1), and the King's Gambit **Allgaier/Muzio** sacs (−2.6/−3.6) — must NOT
  carry "equal/comfortable/never worse" on their own beats. The scan didn't catch
  an obvious violation on those specific beats, but the cross-check (claim ↔ that
  beat's terminus eval) is a build-time task folded into the per-line authoring.
- **Net:** no emergency overclaim found; the honesty risk is real but contained,
  and the per-line claim↔eval check is part of Phase-2 authoring for the dim/sac
  lines. The `narration-honesty assertion` (Phase 3 gate) automates this going
  forward.

---

## Phase 3 — The gate fix (prevent recurrence; build after the content repair)

`soundness-sweep.mjs` is currently an orphaned manual script — that's why these
15 shipped. Do NOT add a blunt "terminus < −1.0 fails" gate (it false-fails
every honest gambit and flaps on depth-noisy sharp lines). Instead:

1. **Per-ply "throw-from-healthy" detector (hard-fail).** At each student ply,
   if engine-best ≥ −0.5 (healthy) AND the taught move drops ≥ 80cp into
   worse-than −1.0 → fail. Catches Alekhine `…f6` / Botvinnik `…Qa5` (throws
   from a healthy position) while never firing on a gambit (its drop is from an
   already-committed-negative position). No allowlist needed for sacrifices.
2. **Shrinking soundness-showcase baseline** (like `KNOWN_SHORTFALLS`): explicit
   reviewed allowlist for legitimately-negative lines (gambits + chosen-dim
   defenses). Anything < −1.0 that isn't a throw and isn't allowlisted → fail.
   List only shrinks.
3. **Narration-honesty assertion** on every allowlisted negative line: forbid
   equality-claiming language ("equal", "comfortable", "fine for Black",
   "fully sound"). This is the gate that would have caught the Antoshin.
4. **Wire it into `ship-check`**, depth-bounded, **engine-skip-clean** when
   Stockfish is absent (exactly how `mastersCoverage.test.ts` degrades in the
   sandbox) so CI/local enforce it without false-blocking the web sandbox.

## Sequencing / next-session pickup

1. Finish Phase 1 tables (this doc) — corrected spines + plan anchors, all
   engine-verified, all sourced.
2. David answers the ONE remaining Bucket-B call: Benoni Taimanov (keep+honest-frame vs re-steer move-order). (Pirc Austrian fix is data-decided; Pirc Czech is fine.)
3. Phase 2 narration research → appended here.
4. ONLY THEN build, in Gate B→C→D order, one opening at a time, re-running the
   soundness sweep + board-truth gates after each.
