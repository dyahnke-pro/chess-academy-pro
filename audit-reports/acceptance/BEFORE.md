# Learn acceptance — BEFORE (main 46c8eb2f on prod)

Muted replays through the hand driver, David's record loaded (32,189 rows), 30 s minimum per move, against https://chess-academy-pro.vercel.app serving 46c8eb2f (Vercel production deployment, verified). Scored by `scripts/audit-acceptance-list.mjs` with the final scorer; `--selftest` 91/91 (six-game) and 96/96 (golden) controls hold. Re-scoring any tape gives the identical result.

## Golden speedrun (Naroditsky, Three Knights, 12 moves) — `golden-speedrun.json`

| run | met | of | his ideas covered |
|---|---|---|---|
| 1 | 57 | 71 | 10 of 24 |
| 2 | 58 | 71 | 11 of 24 |
| 3 | 57 | 71 | 10 of 24 |

All 47 MUST NOTs held in every run. Only one item varies across runs (their Be3 hitting the c5 bishop, heard in run 2 only).

## Six fixed games — `learn-list.json`

**Run 1: 704 of 753. Run 2: 709 of 753.** 740 of 753 items got the same verdict in both runs; the 13 that flipped are the app saying something different (11 own-move reasons, 2 next-move leaks), never the scorer.

| game | run 1 | run 2 |
|---|---|---|
| g1 | 230/248 | 233/248 |
| g2 | 70/76 | 70/76 |
| g3 | 80/86 | 80/86 |
| g4 | 77/84 | 78/84 |
| dB | 123/127 | 124/127 |
| dW | 124/132 | 124/132 |

| kind | run 1 | run 2 |
|---|---|---|
| reason | 112/146 | 117/146 |
| noLeak | 123/128 | 123/128 |
| noRepeat | 147/147 | 147/147 |
| noStat | 147/147 | 147/147 |
| boardTrue | 147/147 | 147/147 |
| verdict | 7/7 | 7/7 |
| danger | 10/12 | 10/12 |
| identity | 6/6 | 6/6 |
| beat | 4/4 | 4/4 |
| once | 0/2 | 0/2 |
| banned | 1/7 | 1/7 |

Per-run misses with the line heard: `runs/<run>/score.md`. Tapes recorded before the reply-time fix are scored with `--events runs/<run>/events`.
