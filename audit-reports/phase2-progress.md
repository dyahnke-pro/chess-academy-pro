# Phase 2 — L5 / R1 progress (branch `phase2-l5-r1`)

- 2026-11-08 04:30 UTC — branch cut from a627fe9. Danya bench re-run started (EVERY=3, REACH=0); Review's walk source excluded (5 s a note, 83% of the run's time — measured on 10 notes).
- 2026-11-08 05:00 UTC — R1 measured: 0 of 966 of David's games carry the candidate reads; 167 graded at review depth open whole and are never re-read. R1 built: `topUpWeighedReads` behind the walk + a complete walk takes a newer build. Tests fail on the old code.
- 2026-11-08 05:26 UTC — R1 reviewed and committed (27bb1fb): + weighedReads no longer caches a null read taken without a live worker (test fails on the old code); 40 direct-importer test files green, app + test typecheck green, maps fresh. Plan + bench edits + the L5 per-moment scorer committed (a7e3b46). The earlier bench run had died at 800/2488 notes. Next: L5 replays of 8 of his games, then the bench.
