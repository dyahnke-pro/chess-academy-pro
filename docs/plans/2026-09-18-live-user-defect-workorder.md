# WO-LIVE-DEFECTS-01 — defects found in real user sessions, week of 2026-09-11

**Source:** PostHog native-iOS App Store telemetry, 2026-09-11 → 2026-09-18.
Seven real users. Two produced substantial sessions; every defect below was read
off the full `narration_text` property of what those two people actually heard.

| device | where | when | length |
|---|---|---|---|
| `7554150d` Panama City | `/coach/play` | Sep 13 15:26–15:48 | 22 min, 108 plies, won by mate |
| `6646b2ac` Bang Lamung TH | `/coach/teach` + home chat | Sep 15–16 | 2 days, Thai speaker, 1050 peak |

**Read this first:** the evidence is verbatim user-heard speech, not inferred.
Where a root cause is VERIFIED in code it carries a `file:line`. Where it is
SUSPECTED it says so and carries an investigation step. Do not collapse those
two categories — three earlier passes over this data got it wrong by doing so.

---

## Corrections to earlier reporting (do not re-derive)

- **`requested 600 → elo=1320` is NOT a defect.** Stockfish's `UCI_Elo` floors
  at 1320; `coachGameEngine.ts:95` documents this and compensates with a 150ms
  movetime. Working as designed. Do not "fix" it.
- **Play was not silent.** It spoke 221 lines. The earlier "narration defaults
  off" reading was wrong — `narrateMove`'s `narrationMode` gate is a deliberate
  opt-in fallback (`coachAgentRunner.ts:88-96`) and should stay off.
- **`summary` on voice events is a ~40-char preview.** The real string is
  `properties.narration_text`. Any analysis quoting `summary` is truncated.

---

## Phase 1 — SHIP TONIGHT (user-visible falsehoods)

### D1. Checkmate is graded as a 300-point blunder — VERIFIED
**What the user heard, as their winning move:**
```
rook to a5, checkmate is a blunder — about 300.0 points.
queen to d8, check was stronger — it gives check.
```
**Root cause.** `CoachGamePage.tsx:3094` computes `evalLoss` from RAW evals with
no mate clamp. It is passed straight into `assembleSlipNarration({cpLoss: evalLoss})`
at `:3673` (mistake/inaccuracy) and `:3807` (blunder), which formats
`(cpLoss/100).toFixed(1)` at `groundedAnswer.ts:4796`. A mate score is ±30000 →
"300.0 points".

The batch path already solved this: `gameAnalysisService.ts:1238` wraps both
sides in `capEval()` with a comment naming this exact bug (David 2026-08-28).
**The live path never got the fix.** `capEval` is `accuracyService.ts:11`
(MATE_THRESHOLD 20000 → ±1500).

**Fix, two parts — both required:**
1. `CoachGamePage.tsx:3094` — wrap both terms in `capEval()`, mirroring
   `gameAnalysisService.ts:1238` exactly. Import from `accuracyService`.
2. **A mating move must never be graded at all.** Short-circuit before
   classification when `moveResult.san.includes('#')` — the game is over, there
   is no "stronger move", and the engine's post-mate best move is meaningless
   (which is where "queen to d8, check was stronger" came from). Emit the
   win line instead.

**Gate:** new test in `groundedAnswer.test.ts` — `assembleSlipNarration` with
`cpLoss: 30000` must not render "300.0"; and a `#` move must not reach it.
**Sweep:** grep every `assembleSlipNarration(` call site for an uncapped cpLoss.
Both known call sites are in `CoachGamePage.tsx`; check `CoachTeachPage` too.

### D2. The coach claims it did something it did not do — VERIFIED (behaviour), root SUSPECTED
**What the Thai user heard**, after asking to drill the Italian:
```
ได้เลยครับ — ผมตั้งกระดาน Italian Game ให้แล้ว
("Sure — I've already set up the Italian Game board for you.")
ได้เลยครับ — แต่ walkthrough ต้องเปิดบนหน้า Teach ถึงจะเดินได้ ผมพาไปเดี๋ยวนี้
("...but the walkthrough has to open on the Teach page. I'll take you there now.")
```
Claim and contradiction in one utterance. The board was never set up.

**What is verified.** `startWalkthroughForOpening.ts:66-78` does the right thing
— it refuses with `ok:false` and a comment citing "NO FAKE SUCCESS (David
2026-09-08)". The tool is correct. **The LLM then narrated a success anyway.**
The `coach_answer` event shows `tools=[start_walkthrough_for_opening, navigate_to_route]`
and `coach_grounding_gate_tripped: board-changing tool(s) fired but voice did
not announce it on home-chat`.

**This is a G0 violation:** the model is deciding what happened rather than
voicing the computed tool result. A failed tool must produce a computed failure
sentence, not a model-authored one.

**Fix.** Route tool outcomes through `voiceFacts` as FACTS, not as prose the
model may paraphrase. On `ok:false`, the spoken line is the computed refusal,
full stop. The model may translate it (D5) but may not contradict it.
**Investigation step first:** find where a failed tool result is handed back into
the prompt in `coachApi.ts` / `coachService.ts` and confirm whether the failure
is even visible to the phrasing pass.

**Gate:** a test that a tool returning `ok:false` can never produce an answer
containing a success assertion. The existing `coach_grounding_gate_tripped`
already DETECTS this — it fired and nothing acted on it. Escalate it from
audit-only to a regen.

### D3. `start_walkthrough_for_opening` cannot fire from home chat — VERIFIED
The Thai user asked **seven times** across two days and never got a lesson:
```
13:06:09  ผมอยากซ้อมการเปิดเกมครับแบบอิตาลีให้เชี่ยวชาญตอนนี้ผมเป็นมือใหม่
13:06:31  ผมอยากซ้อมเปิดเกมแบบอิตาลีสอนหน่อย
13:10:01  แป๊บนึงนะรีเซ็ทกระดานใหม่แล้วสอนผมเดินแบบอิตาลี
13:11:54  ผมเริ่มได้เลยใช่ไหม   ("I can start now, right?")
...
```
12 × `coach_tool_call_error`. The coach fired `navigate_to_route` and **never
re-fired the walkthrough after arriving.** A two-step hand-off that completes
step 1 and drops step 2.

**Fix.** Make the navigate→start sequence one atomic actuation: queue the
walkthrough intent before navigating and have the Teach surface drain the queue
on mount. `ctx.onStartWalkthroughForOpening` is absent on home-chat by design —
the fix is the hand-off, not widening the tool's host list.

**Gate:** integration test — request a walkthrough from home-chat, assert the
Teach surface starts it. **Audit:** extend `audit-teach-forkdive-prod.mjs`.

### D4. Wrong opening served — VERIFIED (behaviour), root UNKNOWN
Asked for the **Italian** seven times. The board became:
```
13:09:46  This game is now the Van't Kruijs Opening.   (1.e3)
13:12:43  opening identified: King's Pawn Game
13:12:52  The line has sharpened into the Vienna Game.
```
Never the Italian. **Downstream of D3** — with no walkthrough, they were left on
a free board and the opening detector narrated whatever drifted out. Re-measure
after D3 lands before treating this as its own bug.

---

## Phase 2 — the register is wrong on Play

### D9. 154 unrequested answer-reveals on the pure-playing surface — root NARROWED, not closed
**Verified:** 154 lines came through `voiceService.speakForced` on `/coach/play`,
shaped exactly like `useHintSystem.ts:360`:
```ts
const answerText = whyClean ? `${movePhrase} — ${whyClean}.` : `${movePhrase} — that's the strongest move here.`;
```
matching what the user heard: `Your bishop to e4 — that's the strongest move here.`
`useHintSystem.ts:347` is the ONLY builder of `Your ${piece} to ${sq}` in the
codebase, and `:412` speaks it via `speakForced`. Tier 3 IS the answer reveal.

**What is NOT established: whether the student tapped Hint 154 times.**
PostHog shows zero hint events — but `hint-revealed` is defined at
`appAuditor.ts:583` and is **absent from the `analytics.ts` mirror allowlist**,
so PostHog never receives it. The instrument is blind. 154 reveals in 22 min is
one per 8.5s; `requestHint` has exactly one caller, the Hint button
(`CoachGamePage.tsx:4261`). Plausible mashing, or an auto-escalation — unknown.

**Do this in order:**
1. **Instrument first.** Add `hint-revealed` to the PostHog mirror. Without it
   this question cannot be answered on the next user either.
2. Local repro on `/coach/play`: play 20 moves without touching Hint; count
   `speakForced` calls. That settles it in ten minutes.
3. Only then fix. If tapped: the answer-reveal contradicts the honesty contract
   ("WINNING / KEEP-PRESSING = a GUIDED FIND-THE-MOVE, never a handed answer")
   and Tier 3 should withhold the square. If auto-fired: kill the trigger.

**Also fix regardless** — `CoachGamePage.tsx:970` lists **"move dictation"** as a
sanctioned Play speaker in the comment that correctly disables `useLiveCoach`.
It is not sanctioned. CLAUDE.md: Play "NEVER volunteers a note mid-game", and
Narration Voice Rule 3 bans restating the board. Correct the comment so the next
session does not read it as licence.

### D8/D12. Identical line repeated 4–5× in 25 seconds — VERIFIED
```
15:35:03 / :09 / :12 / :25 / :28
Watch out — if I play b6, moving from b7 to b6 reveals rook on b8 attacking rook on b1.
```
| times | line |
|---|---|
| 5 | Your king to d4 — marches your king toward the center… |
| 5 | Your bishop to e4 — that's the strongest move here. |
| 4 | Watch out — if I play b6… |
| 4 | Your bishop to g2 — takes aim at the center, hitting d5 and e4. |
| 2 | king to g6 is a blunder — about 7.1 points… *(twice, 13s apart, same move)* |

Learn had the same shape: `d4 is the pawn break…` ×4, `d6 is a hole in their
camp` ×4, `It's genuinely close — X is about as good, so don't agonise` ×5 in
4 minutes with a different piece each time.

`useLiveCoach` has a `saidRef` say-once set (`useLiveCoach.ts:126-131`) — and it
is DISABLED on Play, so nothing dedupes there. **Fix:** a say-once ledger at the
`voiceService` layer keyed on exact text + position, so it holds for every
surface rather than per-hook. Threat lines re-fire because the threat is still
live — that is correct to re-evaluate and wrong to re-speak verbatim.

### D11. Three generators stack into one utterance — VERIFIED
```
That gave them the run of c5 and d4. You'd love to develop right into the middle
with the bishop to d3 — but the bishop to d6 and it falls apart. It's genuinely
close — the bishop to a2 is about as good, so don't agonise.
```
`backwardLook.drawback` + a lookahead + the hint register, concatenated.
`factSelector`/`coachDecider` exist to subsume exactly this (CLAUDE.md G4.5.1)
but these three reach the voice by different paths. **Fix:** route
`CoachTeachPage.hintRegister` / `trackA` / `voicePackage` through
`coachDecider.decide()` instead of composing at the call site.

---

## Phase 3 — correctness of individual claims

### D6. Promotion narrated as a pawn push — VERIFIED
```
15:47:57  Your pawn to h7 — pushes your passed pawn — passed pawns must be pushed.
15:48:00  Your pawn to h8 — pushes your passed pawn — passed pawns must be pushed.
```
h8 is a **promotion**. `moveFundamentals.ts` contains **zero** promotion
handling (`grep -n "promot" src/services/moveFundamentals.ts` → no match), so an
8th-rank arrival falls into the `passed-pawn` branch at `:389` (`relRank >= 4 &&
isPassedPawn`). **Fix:** add a `promotion` fundamental ranked above `passed-pawn`,
reading `mv.promotion`. Highest weight in the file — it is the most consequential
thing a pawn can do.

### D7. Garbled opening name spoken aloud — VERIFIED, root UNKNOWN
```
15:29:47  This is the middlegame now — the kingádas Opening has run its course…
```
`"has run its course"` appears nowhere in `src/` — it is LLM-authored phrasing
over a computed opening name, and `kingádas` is a corrupted string. Find the
producer (likely the phase-transition package), then decide whether the name is
corrupt upstream or mangled in the phrasing pass.

### D10. Missing space between concatenated strings — VERIFIED
```
…and pauses so you can pick what to explore.Material is even, and I don't have…
```
Also `…ถามได้ตลอดลุยต่อเลยครับ — แต่ตัว walkthrough…`. Two spoken segments joined with
no separator. **Fix:** join at the composition point with a space normalizer.

### D13. Half of all weakness tags are `uncategorized` — VERIFIED
4 of 8 on the Play game came back `tag=other bucket=uncategorized`, at
cpLoss 350, 173, 149 and 96. A 350cp error the model cannot name teaches nothing
and cannot be drilled. **Fix:** log the unmatched inputs so the misclassified
population is visible, then extend the tagger. Do not guess new tags blind.

---

## Phase 4 — infrastructure

### D15. TTS playback timeout — VERIFIED, root UNKNOWN
`narration TTS playback timed out` and `phase narration TTS playback timed out`,
on BOTH heavy users, on BOTH surfaces (`usePositionNarration`, `usePhaseNarration`),
2 each. Low volume, but it lands on the only two people who used the product.
The Learn session's LAST event is one of these.

### D5. Language falls back to English mid-conversation — VERIFIED
The Thai user got Thai chat replies and **English computed narration**, interleaved:
```
13:13:38  Out of the opening now — this is a middlegame where you're a shade better…
13:14:06  Your king on e1 is still in the center with lines opening — castle before anything sharp.
```
— excellent coaching, in the wrong language, after two days of Thai.

**Root cause, verified.** Two separate paths:
- Chat replies localize via `coachService.ts:571` —
  `askLang.nonEnglish ? askLang.name : (spokenLanguageName() ?? 'English')`.
  Detected input wins. Works.
- Computed narration localizes via `voiceService.ts:1342` —
  `if (spokenLanguageName())`, which reads ONLY
  `activeProfile.preferences.narrationLanguage`. **This user never set it**, so
  every computed line stayed English.

**Fix.** The DETECTED conversation language must become a sticky session fact
that `spokenLanguageName()` consults, so one Thai message makes the whole coach
Thai without the user finding a setting. `localizeSpokenText`'s existing
"detected input wins" guard (`spokenLanguage.ts:67`) already handles the
don't-double-translate half.

**Note the cost shape:** this puts every computed line through a translation
call. `spokenLanguage.ts` caches (500 entries) — verify the cache hits before
shipping, and expect a TTS bill (new strings miss the clip cache).

---

## Sequencing

1. **D1 first** — it is a falsehood in the last sentence a winning user hears,
   and it is a two-line fix with an existing reference implementation.
2. **D2 + D3 together** — same user journey; fixing the hand-off without fixing
   the false success just makes the lie less frequent.
3. **D9 instrumentation early** (mirror `hint-revealed`) — it is cheap and it is
   the only way the next session can answer the question at all.
4. **D5 before more non-English users arrive.** Thailand is not an outlier; the
   App Store is global and the multilingual seam half-works today, which is worse
   than not working — it teaches in a language the user didn't choose.
5. Phase 3 in any order.

## Decisions log — David's call

- **D9:** if the student DID tap Hint 154 times, does Tier 3 keep naming the
  square? The honesty contract says withhold it; the student clearly wanted it.
- **D5:** auto-switch the whole coach on one detected non-English message, or
  prompt once ("เปลี่ยนเป็นภาษาไทยไหม?") and remember? Auto is fewer taps;
  prompt is reversible.
- **D13:** extend the tagger, or surface `uncategorized` to the student as
  "a 3.5-pawn error here" with no name? Empty > generic, but 350cp is worth
  saying something about.

## Gates and audits

Per CLAUDE.md G1, every phase ships with: `npm run ship-check` green → push to
`main` → verify the prod bundle hash advanced → **the two-audit pair, run
sequentially, never concurrently**:
- `scripts/audit-review-overhaul-prod.mjs`
- `scripts/audit-concept-gameplay-prod.mjs`

Both muted (`muteTtsForAudit`), both 3-instrument. **Report the narrations, not
the pass count** — every defect in this WO was found by reading output that every
gate passed green.

New audit coverage owed: a Play-surface register audit that FAILS on an
unrequested answer-reveal, and a mate-in-one assertion that the coach congratulates
rather than grades.

## Next-session pickup

Start at D1. The reference implementation is `gameAnalysisService.ts:1238`.
Do not trust `properties.summary` in PostHog — use `properties.narration_text`.
