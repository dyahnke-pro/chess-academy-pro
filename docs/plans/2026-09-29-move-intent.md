# Move intent — the coach says WHY, not only WHAT (2026-09-29)

**Owner:** the "Chess app review" session (WO-5 scoreboard owner). **Approved by David 2026-09-29:** build the move-intent computer; pure computer + score, then hand the lane to the WO-COACH-TEACHER session (it owns Learn's turn path and lane table).

## 1. Assessment — the scoreboard (partial: 34 of his 50 voiced games, 906 beats)

Instrument: `scripts/scoreboard/` — his per-ply lines tagged with the census taxonomy (`his-tags.json`), a TAPE of what Learn actually speaks on the same games through the real page (`tape.mjs`, muted, opponent dictated), our lines tagged by the same classifier (`tag-ours.mjs`), scored per beat (`score-tape.py`: our beat after student ply p covers his lines at p and p+1).

- He teaches on 554 beats; we land at least one of his points on **38%** of them. Point-for-point: **17%** (284 / 1,647).
- We speak on **89%** of beats, ~2 lines / 48 words each.

**What he says that we don't** (his count → our match):

| his point | his | match |
|---|---|---|
| plans | 115 | 12% |
| what a quiet move is FOR | 89 | 7% |
| what the move PREVENTS | 73 | 7% |
| piece routes | 61 | 10% |
| king attack | 52 | 10% |
| what THEIR move is for | 51 | 4% |
| recapture choice | 47 | 6% |
| practical play, eval, move order, two jobs, timing | 20–30 each | 0% |

**What we say that lands elsewhere** (our count → share where he says the same thing): threats 205 → 9%, hanging pieces 143 → 5%, breaks 123 → 7%, piece quality 164 → 9%, structure 150 → 12%, verdicts 268 → 15%. Only the opening idea lands (40%).

**The read.** We are a board DESCRIBER; he is a THINKER. We report what is true on the board every move; he mostly says what a move is FOR, what it STOPS, where the plan goes. Picking one lead per move (WO-1b) cuts the noise but cannot raise the number by itself — the missing points need a computer that does not exist yet.

Caveat: he narrates selectively, so a true fact he skipped counts as off-target; the "match" column is the fair one.

## 2. The plan — one computer: `moveIntent`

Four of his top rows are one question — "what is this move for?": quiet-move purpose (89), prevents (73), their move's purpose (51), two jobs (21) = **234 moments at 4–7% today**. It also feeds plans and piece routes.

**Engine-proven, both seats (G0):**
- **PREVENTS** — the null-move probe: what would the opponent play if this side passed? If this move takes that reply away (it is now illegal, or now loses), the move stops it: "h3 — so …Bg4 isn't possible."
- **PREPARES** — the engine's next move for this side AFTER this move, compared with the same move BEFORE it: it was bad or illegal before and good now → "first X, so that Y."
- **TWO JOBS** — both at once.
- The same computer on the opponent's move is "what their move is for".

**Guards (where it breaks):**
- Trivial prep from engine noise → a real gain is required (≥ 50cp, landing within 2 plies).
- Preventing a reply that was bad anyway is not prevention → only a reply that scored well for them counts.
- One computer, not two: `opponentMovePurpose.threatStoppedBy` is the narrow version of PREVENTS for their moves; extend it, don't duplicate.
- Returns null rather than generic prose (empty > generic).

**Steps:**
1. `src/services/moveIntent.ts` (pure; engine lines handed in, no engine calls inside) + tests on HIS game positions where he says "so that" / "prevents" — each test fails before the computer exists.
2. Offline score: run it over the 50 games through the claim-checker harvest; report the PURPOSE / PREVENT / OPP-PURPOSE / TWO-JOBS rows before vs after, plus accuracy (board + engine verify) ≥ 97%.
3. Hand off one lane (`moveIntent`) to the WO-COACH-TEACHER session with the numbers — it wires it into the door.

## 3. Open blockers on this branch
- The merge of `main` into `claude/chess-app-review-perf-du6haq` (commit `20ffa4f0f`) is committed but not pushed: the orphan ceiling in `src/coach/tools/registry.completeness.test.ts` reads 5 unreachable spine modules against a ceiling of 4 (`coachChatService`, `openingNameClaimValidator`, `principleDetector`, `tacticDrillService`, `threatCheck`). One became unreachable when `main`'s lane cleanup met this branch; find which, then retire it or restore its caller.
- The 50-game tape finishes ~16 games from now; the full baseline follows.
