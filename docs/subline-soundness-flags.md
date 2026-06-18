# Subline soundness flags (2026-06-18, from Group B's extension sweep)

After extending every course subline to a real middlegame (engine-primary,
`scripts/extend-subline-responses.mjs`) I ran an engine soundness sweep on the
terminus of all 3,772 sublines from the **student's** POV
(`scripts/soundness-sweep-sublines.mjs`, bar −1.2). Group B fixed every flagged
line in its own scope (sicilian/french/caro/pirc/scandi/alekhine/anti-*). The
lines below are flagged but live in **other groups' narration files** — the
data line is shared (I own it) but the authored beats reference the moves, so
fixing them needs the owning group to rebuild the line + re-author the beats
together. **These are pre-existing** (the deviation refutes the chosen
variation setup); my extension only revealed them.

All are **beated** (authored beats) unless noted. Eval = student POV at the
24-ply terminus.

## Group A (e4 e5) — `sublineNarrationE4E5.ts` / base map

Philidor var 4 is a **systemic** problem — the whole variation-4 setup hangs
material across eight sublines:

| key | student eval |
|---|---|
| `philidor-defence::4::Bg5@10` | −7.47 |
| `philidor-defence::4::Nxe5@10` | −6.16 |
| `philidor-defence::4::dxe5@10` | −6.09 |
| `philidor-defence::4::Ne5@12` | −5.27 |
| `philidor-defence::4::Ng3@10` | −2.92 |
| `philidor-defence::4::Qxd4@12` | −2.66 |
| `philidor-defence::4::Nc5@10` | −2.45 |
| `philidor-defence::4::Nc3@10` | −2.42 |
| `philidor-defence::4::Ng5@8` | −1.40 |
| `petrov-defence::1::Bxe4@10` | −5.51 |
| `petrov-defence::2::e5@12` | −4.23 |
| `petrov-defence::4::Bc4@12` | −1.73 |
| `petrov-defence::6::Bc4@12` | −1.62 |
| `petrov-defence::3::Bd3@10` | −1.40 |
| `vienna-game::4::Bg4@13` | −1.85 |
| `vienna-game::5::Qe7@7` | −1.82 |
| `vienna-game::6::Bc5@5` | −1.35 |

## Group C (d4 / flank) — `sublineNarrationD4Flank.ts`

| key | student eval |
|---|---|
| `nimzo-indian::3::Bxf6@8` | −5.07 |
| `slav-defence::6::Bxf6@10` | −2.23 |

The mild `qgd::6::cxd5@8` (−1.53), `old-indian-defence::1::Nge2@10`/`Be3@10`
(−1.26), `benoni-defence::5::Nf3@10` (−1.24), `dutch-defence::1::Nf3@4` (−1.22)
are **non-beated** and already deep-re-extended to their true value — sharp
lines where the student is a touch worse but not lost; honest intro-only
narration is fine to leave.

## How to fix one (the Group B recipe)

For each beated line: engine-rebuild the sound continuation from the deviation
(keep the safe prefix up to the deviation, then Stockfish best-move both sides
to ~move 12), replace the `moves` in `course-sublines.json`, then rewrite the
narration intro + beats to teach the sound plan (board-verified arrow origins,
≤8-word cues). See the Group B fixes in this commit (french `f3@6`, caro
`e5@12`/`c3@10`, french `Bxf6@8`, najdorf/dragon `f3@8`) as the template.
