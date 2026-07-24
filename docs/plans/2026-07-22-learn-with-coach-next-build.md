# Learn with Coach — the next build (David 2026-07-22: "Learn is the next build")

The post-game review was rebuilt to the Danya standard across 2026-07-19→22.
This plan ports every upgrade that belongs on `/coach/teach` (Learn), in the
IN-GAME/WATCH register (present-tense live teaching — NOT the review's
retrospective register; the two-register law of 2026-07-19 stands). The shared
fact-computers move across; the review's phrasing does not.

## The register difference (locked, do not blur)

Review speaks in hindsight: "you played X, the better move was Y." Learn speaks
in the present as a line unfolds: "the knight settles on f6, and now watch the
d5 square." Everything below is a FACT-COMPUTER port + a NEW Learn-voice
phrasing — never a copy of review sentences.

## What ports from the review build

1. **THE THREAT CALL-OUT (deep + static, engine-confirmed)** — David
   2026-07-22: "Mark this as a later build for learn with coach!!" As a taught
   line plays, the coach names what the move ON THE BOARD now threatens —
   `describeStudentThreat` (static, counter-tactic-verified) + the engine
   null-move deep threat (2-3 moves out) + the #4b engine-confirmation
   marriage (statics propose + explain, engine decides). In Learn this becomes
   present-tense: "and just like that, White is threatening Nxf2 — pawn falls,
   queen and rook forked." Fires on BOTH sides' moves in a walkthrough (the
   student must see the opponent's threats too — that's what Learn teaches).

2. **THE PER-MOVE WHY EVERYWHERE** — the walk's rich `plyFactsForMove` +
   seat-stamped tactic facts (`seatPieceReferences` — mine/yours computed into
   the package, never invented by the voice). Learn's move narration inherits
   the exact same G0 pipeline + the house-voice fidelity nets (board-accuracy,
   seat, numbers, frame canaries, repetition dedup).

3. **THE BETTER-LINE WHY on wrong answers** — when the student plays a wrong
   move in Learn/Practice (drill, findMove, guided play), don't just say
   "not quite": play the engine's line STARTING with the right move, narrated
   ply-by-ply with computed whys (the review's pass #4, re-voiced for Learn:
   "here's why this one — watch"). The takeback offer stays.

   **3b. THREAT-DIAGNOSIS on wrong answers (David 2026-07-22):** classify
   WHICH threat the wrong answer was responding to, so the coach knows
   whether the student SAW the right threat and mis-defended, or missed it
   entirely. Computable from the DetectedThreat package: enumerate the
   position's live threats; for each, test whether the student's move
   addresses it (covers the landing square / moves a target / undermines a
   guard — the describeThreatPrevention mechanism classes, run against the
   WRONG move). Three verdicts, three teachings:
   - addressed the RIGHT threat, wrong way → "you saw the fork — but Rd7
     guards the knight with the piece that was holding f7, and now f7 hangs.
     Guard it with the OTHER rook." (the key-defender-overload case David
     named);
   - addressed the WRONG threat → "that defends the bishop, but the bigger
     problem was the fork on f2 — biggest threat first";
   - addressed no threat → the miss is the lesson: teach the recognition
     pattern (describeThreatRecognition) before showing the answer.

4. **POSITION-ANCHORED PLANS, never templates** — `buildOpeningDevelopmentPlan`
   with the named-jobs upgrade ("the g8 knight belongs on f6, the c8 bishop is
   still boxed in — then castle") replaces any remaining generic plan prose in
   Learn walkthrough beats + the leaf "what now" moments.

5. **STORY-AS-EVIDENCE + WATCH-THE-GAME** — the verified model-game corpus
   (`pickStoryGame` + `momentVerifies` runtime gate) surfaces in Learn when a
   taught line reaches a position a master game reached: "this exact structure —
   look at Fischer–Spassky, Game 6" with the one-tap playback (overview +
   verified criticalMoments spoken).

6. **STATIC-CLAIM VERIFICATION AS LAW** — every prescriptive material claim in
   Learn's narration paths goes through `captureHasCounterTactic` / SEE-net /
   engine-confirmation, same as review. Sweep the Learn narration generators
   (`generateOpeningFromDbNarration` prose prompts, stage-gen pedagogy fields,
   move-report narration) for any surviving one-ply static story.

7. **SEAT + NUMBER + FRAME FIDELITY NETS on the house voice** — wherever Learn
   warms deterministic facts through the LLM, wire the same acceptance gates
   the review has (`narrationSeatFaithful` board-truth possessives,
   `narrationNumbersFaithful`, mate/sac/frame canaries, verbatim-repeat dedup).

8. **THE "WHY'D YOU PLAY THAT?" FAUCET** — already mandated for Learn (the
   2026-07-06 voice law: the blocking picker lives in LEARN, never Play).
   The review's misconception → weakness-bucket → drill chain is live; Learn's
   un-retired faucet should feed the same buckets so Learn and Review teach
   from one model of the student.

9. **DEEP REVIEW DETAIL toggle applies to Learn** — the same
   `reviewFullDetail` preference should switch Learn's walkthrough narration
   between the one-beat register and the full-facet register (rename the
   setting copy to "Deep Coach Detail" when wired).

10. **SHARED MESSAGING COMPONENT** — task #25: the review adopts Learn/Play's
    `ChatMessage` component (choices/chips). Do this AS PART of the Learn
    build so all three surfaces speak through one renderer (David 2026-07-21:
    "We need that identical").

## Sequencing

- Phase A: fact-computer ports (1, 2, 4, 6, 7) — pure wiring, no UX change.
- Phase B: wrong-answer better-line why (3) + faucet feed unification (8).
- Phase C: story-game surfacing (5) + deep-detail toggle (9).
- Phase D: shared ChatMessage renderer (10) across Learn/Play/Review.
- Every phase: the review-real-game audit standard cloned for Learn
  (`audit-learn-real-line.mjs`) — seed a real opening, drive the walkthrough
  like a human, read every spoken line against the board.

## Explicitly NOT ported

- Retrospective register ("you should have", mistake recaps) — review-only.
- The rating-banded audience clause — retired everywhere (one register).
- Blocking cards on Play — Play stays a pure playing surface (locked).

## Reconciliation against shipped code (2026-07-24 — read before building)

The 07-22 plan was written before the Learn surface advanced. Reconciled against
`useTeachWalkthrough.ts` / `CoachTeachPage.tsx` / the 07-13 behavior map, most of
the big-ticket ports are ALREADY shipped or would be redundant. The genuine delta
is narrower than the 10-item list. Verified state:

- **ALREADY SHIPPED (do not rebuild):**
  - Register + anti-overstatement + structural-beat prompt (#2/#4 prose side) —
    task #7, commit `5698b87`; the WHY-DISCIPLINE bullet is at `openingGenerator.ts:1310`.
  - The "why'd you play that?" faucet (#8) — `useDiscussionPractice(true,{interruptive:true})`
    is LIVE in `CoachTeachPage.tsx:901`, rating-gated (`slipWarrantsInterjection`),
    and BOTH Learn and Review call the SAME `captureMisconception` → shared weakness
    bucket (Review uses the same hook at `CoachGameReview.tsx:641`). Feed unification
    is DONE.
  - Grounded board-move→coach-reply (#6 for the interactive reply path) — code
    computes capture/check/mate + grounded why, LLM only voices (behavior map B8).
  - Guided-find-the-move, threat-check, arrow dedupe — all live.

- **REDUNDANT / DEFERRED (skip or hold):**
  - #2 per-move why on the PASSIVE Watch walkthrough — the authored LLM prose
    (gated by `narrationAccuracy`) already teaches the why per move; a deterministic
    overlay on top would double-narrate and read robotic. The review computers are
    also SEAT-framed ("you"), wrong for a demo game — would need a side-reframe.
    Only worth it as a fidelity NET, not additive prose.
  - #1 threat call-out on the passive walkthrough — David tagged "later build" on
    07-22. Held.

- **GENUINE GAP — BUILT 2026-07-24 (task #26 Phase B, this session):**
  - **Drill wrong-answer teaching** (`learn.stage.drill.wrong`). Previously the
    drill miss card showed only "the move is X" — no teaching. Now it computes the
    review's better-move why via the new `learnMoveTeaching.buildDrillWrongTeaching`
    (`explainBestMoveGrounded` played-vs-best + `buildReviewMoveTeaching` fallback —
    pure board facts, G0/G3), renders it on the `walkthrough-drill-wrong` card
    (`walkthrough-drill-teaching` testid), and voices it Silent-gated via
    `speakWalkthroughText` (matches the sanctioned calc-drill "hint after wrong
    attempt" pattern). The student is the mover in a drill, so the "your move" seat
    framing is correct. Example output: *"It develops the knight to c6, eyeing d4
    and e5, while your move let White play Nxe5, winning the pawn."* findMove/quiz
    wrong answers already teach via authored per-candidate `explanation` — drill was
    the only empty surface. Unit-tested (`learnMoveTeaching.test.ts`).

- **STILL OPEN (remaining real delta):**
  - #3b threat-diagnosis (3-way classify) — marginal over the costClause already
    shown; low priority.
  - #5 story-game surfacing in Learn (Phase C).
  - #9 Deep Coach Detail toggle wired to Learn (Phase C).
  - #10 shared ChatMessage renderer across Learn/Play/Review (Phase D) — David wants
    this ("We need that identical").
  - `audit-learn-real-line.mjs` clone of the real-game audit standard (Phase D).
