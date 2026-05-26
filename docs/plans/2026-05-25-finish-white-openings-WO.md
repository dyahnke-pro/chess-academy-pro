# WO — Finish the White Openings (new session) — 2026-05-25

**For the next session (the one with chess access).** Read this FIRST, then
`docs/opening-masterclass-playbook.md`. The previous session got chess egress
firewalled (GitHub-only), shipped a half-finished Queen's Gambit, and reverted
it. This WO is the clean restart.

---

## 0. FIRST — verify the environment actually opened (do not skip)
The prior container was GitHub-only (explorer + prod + web all `403`, keys
unset). David opened the env config; it binds at CONTAINER START, so confirm
THIS container actually has it:

```bash
curl -s -m 12 "https://chess-academy-pro.vercel.app/api/lichess-explorer?source=masters&play=d2d4,d7d5,c2c4" | head -c 80
curl -s -m 12 -o /dev/null -w "%{http_code}\n" https://chess-academy-pro.vercel.app/
node -e "console.log(['DEEPSEEK_KEY','ANTHROPIC_KEY','AUDIT_STREAM_SECRET'].map(k=>k+':'+(process.env[k]?'set':'unset')).join(' '))"
sudo apt-get install -y stockfish && which stockfish   # NOT pre-installed; lands at /usr/games/stockfish
```
- Explorer must return JSON (not `Host not in allowlist`); prod `/` should be 200/30x (not 403).
- **If still 403 / keys unset → STOP and tell David** (the change didn't take; another fresh session needed). Do NOT fall back to half-measures.

## 1. Current state of `main`
- `main` had **39 masterclasses**; QG was **reverted** off it (`revert(qg)…`, ~`c680f34`) — `queens-gambit` is a plain repertoire opening again.
- **3 White openings still MISSING**: `queens-gambit`, `trompowsky-attack`, `birds-opening`. Everything else in the 40 is built (parallel sessions completed the rest; `main` moves FAST — re-check `opening-manifests.json` keys at start, and `git fetch` before every push).

## 2. What went wrong — do NOT repeat
- QG was merged with a **1-gem, unverified weapon section** and **no confirmed prod audit** = half-done on production. That's the cardinal failure.
- **`#669` (open draft, branch `claude/zen-tesla-JuPbF`) is STALE** — its content predates the new SEALED gates (it lacks `sources`/`learnCues`/`shortNarration`, has un-narrated gems). **Do not lift it.** Build QG fresh to the current standard.
- A masterclass is **NOT done** until: weapon section mined + **engine-confirmed at the quiet end** + **Google-verified vs theory** + hand-narrated; ALL sealed gates green; on `main`; **prod post-deploy audit (G1) confirmed green**.

## 3. The SEALED gates (author these from the START — last session hit them one-by-one)
Every masterclass artifact needs a **resolvable `sources`** (`concept:<id>` | `book:<id>` | reputable https URL) — these gates have NO baseline/escape:
- **Lessons** (main + each variation): `sources` on the `LessonScript`. (`lessonSources.test`)
- **Model games**: `sources`; `studentSide` = a real **WIN** (never draw/loss). (`modelGames.test`, `modelGames-orientation.test` + add id to its `PROTECTED`)
- **Middlegame plan lines**: `sources` **and** `learnCues` (one ≤8-word cue per move, ceiling-0). (`middlegamePlanThemes.test`)
- **Pitfalls / common-mistakes**: `explanation` + `shortNarration` (≤8w) + `sources`. (`commonMistakeNarration.test`)
- **Punish-gems**: hand-narrated `watch[]`+`learn[]` (length = playLine plies) + `sources`. **Un-narrated masterclass gems are FORBIDDEN** (ceiling-0 coverage) — narrate every kept gem or drop it.

## 4. Build recipe (per opening — `queens-gambit`, then `trompowsky-attack`, then `birds-opening`)
Replicate the Vienna literally (playbook §0.7). Now that the explorer + Stockfish + keys are available, do it ALL in-sandbox (no CI workaround needed):
1. `node scripts/scaffold-opening.mjs <id> "<Name>" white`
2. Author main + variation lessons (two registers + `sources`); tab regexes (`variationTabs.ts`); tab→plan map (`<id>MasterclassTabs.ts` + the `OpeningDetailPage` chain).
3. Middlegame plans (one per tab) + `learnCues` + `sources`; `scripts/add-leadeye-to-plans.mjs`.
4. **Gems**: `OPENINGS=<id> node scripts/mine-punish-gems.mjs` (Stockfish + amateur explorer, both reachable now). Grade at the quiet end (≥+0.5 positional / ≥+1.0 confirmed). **Google-verify the headline crushes vs theory.** Hand-narrate every kept gem; drop the rest.
5. **Model games**: real student-WIN PGNs from the explorer `topGames` → `lichess-game-export`. `sources` + `studentSide:'white'`. None for a variation → omit (empty > losing/fabricated).
6. Quizzes + common-mistakes (with `shortNarration` + `sources`).
7. Manifest entry (STEP 9) — relocates the opening Most Common → Masterclasses.
8. Register in BOTH `registry.ts` (gate) and `index.ts` (runtime).

### Per-opening notes
- **queens-gambit** (white): repertoire `pgn` may still be the Classical-Orthodox spine from the revert — verify/repoint. 8 variations (Exchange, Classical/Tartakower, QGA, Slav, Semi-Slav, Catalan-transposition, Anti-Bf4). Classical, so the book corpus grounds narration.
- **trompowsky-attack** (white): `1.d4 Nf6 2.Bg5`; 8 variations. MODERN — no opening book corpus; ground on `chess-concepts.json` universal principles + a reputable URL + DB moves (per CLAUDE.md modern-opening note).
- **birds-opening** (white): `1.f4`; check its repertoire `variations` first.

## 5. DoD — not done until ALL of:
- `npm run ship-check` = READY TO PUSH (sealed content gates).
- Per-opening interactive audits: `AUDIT_OPENING=<id> node scripts/audit-punish-gems-loop.mjs` (3-pass), `audit-opening-walkthrough.mjs`, `audit-leadeye-plans.mjs`, `audit-named-traps.mjs`.
- Pushed to `main`.
- **Prod post-deploy audit run + GREEN** against `chess-academy-pro.vercel.app` (now reachable) + audit-stream pulled (G2). If the env DIDN'T open, do NOT merge calling it done — hand the branch to David.

## 6. Cleanup (dead branches/workflows from the churn)
Delete: `claude/qg-integrate-669`, `claude/mine-qg-gems`, `claude/mine-tromp-gems`, and the temp `_mine-qg-temp.yml` / `_mine-tromp-temp.yml` workflows on those branches. Verify no leftover `queens-gambit` masterclass refs on `main` after the revert (the b6 gem-narration entry, the QG repertoire pgn repoint, and the QG common-mistake `sources`/`shortNarration` may linger harmlessly — confirm).

## 7. Process guardrail (the real lesson)
"Gates green locally" ≠ "shipped." Don't declare a masterclass done, and don't
leave it on `main`, until the **prod G1 audit is confirmed green**. With chess
access restored that's finally doable in-session — use it every merge.
