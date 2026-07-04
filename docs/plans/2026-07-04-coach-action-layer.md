# Coach ACTION / CAPABILITY layer — make each grounded answer *do* the thing

**David 2026-07-04:** *"It looks like we are just working in questions/answers.
After this we will need to wire in actions/capabilities related to each
question. Make sense?"* — Yes. The Q/A grounded verticals
(`2026-07-04-coach-grounded-verticals.md`) are the prerequisite; this layer
turns each answer's *suggested phrase* into a real, tappable action.

## The gap

Every grounded answer today dead-ends in a phrase the user must TYPE BACK:
- review-due → *"Say 'review my openings' and I'll run today's reps."*
- opening-traps → *"Say 'punish lines for the Italian' and I'll run the drill."*
- opening-accuracy → *"Want me to drill that with you?"*

The action layer makes the coach ACT — but **never automatically** (David
2026-07-04: *"The coach will need to ask the user if they want to drill/work on
whatever question was asked. Tie it into a picker once the coach answers the
stated user question. Don't just make it automatic."*). The flow is:

**user asks → coach answers (grounded) → coach presents a PICKER asking if they
want to drill/work on it → user picks → the action fires.**

The picker is opt-in per interaction. The coach answers the STATED question
first (the Q/A layer), then offers the follow-up action(s) as tappable choices —
it does not launch a drill on its own.

## Question → action map

| Grounded answer (shipped) | Action | Launcher that already exists |
|---|---|---|
| review-due ("14 cards due") | **start SRS review** | route `/openings/srs` (`SrsTrainerPage`) |
| opening-accuracy ("weakest line is the Classical at 42%") | **drill that variation** | `walkthrough.startAtStageMenu(tree,'drill')` on Learn; `OpeningPlayMode customLine` |
| opening-traps ("your traps are X") | **start the punish drill** | STAGE_PATTERNS `"punish lines for X"` → `startAtStageMenu(tree,'punish')` |
| opening-profile ("weakest opening is X") | **drill it** | same as accuracy |
| progress/weakness ("weak at forks") | **launch a fork puzzle set** | `trainingAidRouter` → `/coach/teach?drill=puzzle:fork` |
| stats/strengths | (mostly informational; optional "review worst games") | `/coach/review` |

## Design (proposed — refine before building)

**1. A `CoachActionOffer` on the grounded response — a PICKER, not an
auto-dispatch.** The assembler / interception emits one or more OFFERED actions
that the surface renders as a picker (tappable choices) UNDER the answer:
```ts
type CoachAction =
  | { kind: 'srs-review' }
  | { kind: 'drill-variation'; openingId: string; variationName?: string }
  | { kind: 'punish-drill'; openingId: string }
  | { kind: 'drill-opening'; openingId: string }
  | { kind: 'puzzle-theme'; theme: string };

interface CoachActionOffer {
  prompt: string;            // "Want to work on this?" — the coach's ask
  options: Array<{ label: string; action: CoachAction }>;  // + an implicit "no thanks"
}
```
Each action is COMPUTED (a specific opening/variation/theme the code just named)
— stays G0. The offer is presented; **nothing fires until the user taps.**

**2. Thread the OFFER through the chokepoint.** `voiceFacts` returns the voiced
string; add an optional `actionOffer` alongside it so `getCoachChatResponse`
returns `{ text, actionOffer? }`. Main plumbing change — the response type + each
interception `return voiced` site attaches the offer built from the same data
it just voiced.

**3. Surfaces render the PICKER + dispatch on tap.** The chat bubble renders
`actionOffer.options` as chips/buttons (plus a dismiss). On tap, a shared
`dispatchCoachAction(action, {navigate, walkthrough})`:
- `srs-review` → `navigate('/openings/srs')` (works on every surface).
- `drill-variation` / `punish-drill` / `drill-opening` → on Learn, resolve the
  tree + `walkthrough.startAtStageMenu`; on opening-page/other, navigate to
  `/coach/teach?...` or the opening page's WLPP.
- `puzzle-theme` → `trainingAidRouter` route.
If a surface can't dispatch a given action, it omits that option (the answer
text still stands).

**4. Follow-up honoring (optional, secondary).** In addition to the picker, the
coach may honor a typed "yes"/"do it" right after the offer by dispatching the
last-offered action — but the PICKER is the primary, explicit affordance David
asked for. Never auto-launch.

## Build order (each its own PR + audit)

1. **Pilot: review-due → picker ("Want to run today's reps?" → "Start review")
   → `/openings/srs`.** Simplest launcher (pure navigation), proves the
   CoachActionOffer picker plumbing end-to-end. Interactive Playwright audit: ask
   "what's due", assert the ANSWER renders AND the picker appears (nothing
   navigates yet), TAP "Start review", assert the URL is `/openings/srs` and the
   trainer mounts. Also assert: dismissing the picker does NOT navigate (not
   automatic).
2. **punish-drill button** (opening-traps) — reuse the `"punish lines for X"`
   walkthrough path; audit that the punish stage actually launches.
3. **drill-variation button** (opening-accuracy / opening-profile) — the
   weakest line; audit the drill mounts on the named variation.
4. **puzzle-theme button** (weakness) — fork/pin/etc. puzzle set.
5. **Follow-up "yes/do it"** honoring across surfaces.

## Audit shape (DIFFERENT from the Q/A verticals)

The Q/A verticals used chat-reply-content classification. The action layer needs
**interactive Playwright audits** that TAP the button and assert the resulting
navigation / drill mount / stage launch (G7 — drive the real affordance, assert
the post-state, per-function coverage grid). A green chat reply is NOT enough —
the action must actually fire and land on the right surface.

## Risks / notes

- The two-color trap-drill AUTO-LAUNCH (drill White's strongest, then Black's,
  sequenced on the single-tree walkthrough) is a sub-case of #2 — needs the
  "pending next action" memory from #4. Do #2 single-opening first.
- Cross-surface dispatch differs: Learn has the walkthrough launcher in-page;
  opening-page chat + play must navigate. Keep `dispatchCoachAction` surface-
  aware (pass the launcher deps in).
- Don't regress the Q/A answers — the action is ADDITIVE (the answer text stays;
  the button is extra). If a surface can't dispatch a given action, it just
  doesn't render the button (the typed-phrase fallback still works).
