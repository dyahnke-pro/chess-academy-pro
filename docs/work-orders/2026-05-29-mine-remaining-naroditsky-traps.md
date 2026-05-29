# WO: Mine + author trap-lessons for the 6 remaining Naroditsky openings

**Status:** OPEN. Hand-off from 2026-05-29 buildout session.
**Estimated effort:** 3-5 hours (six openings, each needing miner adaptation + author 3-5 trap-lessons + wire).
**Blocking:** nothing. Run anytime; doesn't depend on other in-flight work.

---

## Context

Naroditsky has 10 openings in `src/data/pro-repertoires.json`:

| Opening | trapLines/warningLines | Curated trap-lesson file | Status |
|---|---|---|---|
| Caro-Kann | 1+1 | (existing legacy) | depth varies, leave alone |
| **Alapin** | 5+4 | `proNaroditskyAlapinTrapLessons.ts` (9 entries) | ✅ DONE |
| **KID** | 4+0 | `proNaroditskyKIDTrapLessons.ts` (4 entries) | ✅ DONE |
| **Najdorf** | 0+0 | — | ❌ THIS WO |
| **Alekhine** | 0+0 | — | ❌ THIS WO |
| **KIA** | 0+0 | — | ❌ THIS WO |
| **Rossolimo** | 0+0 | — | ❌ THIS WO |
| **Jobava London** | 0+0 | — | ❌ THIS WO |
| **Ruy Lopez** | 0+0 | — | ❌ THIS WO |
| Fantasy Caro | 0+0 | — | (defer, lowest priority) |

**Why this matters (the bug we already fixed for Alapin):** without a curated
trap-lesson file + routing, any `trapLines[]` / `warningLines[]` entries in
`pro-repertoires.json` fall through to the legacy `WalkthroughMode` /
`DrillMode` (smaller board, code-generated SAN dictation like "3...Nd5"
instead of hand-written prose). David caught this on the Alapin Bc2 warning
on 2026-05-29; the routing fix went through `getProNaroditskyAlapinTrapPlayableLine`
in `OpeningDetailPage.tsx`. The same routing extension already supports KID
via `getProNaroditskyKIDTrapPlayableLine`. Adding new openings just means
authoring the lesson file + wiring it into the resolver chain.

## The procedure (per opening)

### STEP 1 — Adapt the miner

The reference miner is `scripts/pro-repertoire/mine-kid-traps.mjs` (color logic
already inverted for Black openings) or `scripts/pro-repertoire/mine-alapin-traps.mjs`
(original White-opening logic). For each new opening:

```bash
cp scripts/pro-repertoire/mine-alapin-traps.mjs scripts/pro-repertoire/mine-<opening>-traps.mjs
```

Then edit these constants in the new file:
- `PREFIX = ["..."]` — the opening's identifying SAN prefix (e.g. `["e4","c5","Nf3"]` for Rossolimo)
- The color filter: `if (isWhite) continue` for Black openings (student is Black) or `if (isBlack) continue` for White openings (student is White)
- The `result !== "1-0"` check: keep `"1-0"` for White openings, change to `"0-1"` for Black openings
- The `lastDiff - swing` vs `swing - lastDiff` calculation: flip sign for Black openings (so swings toward Black are positive)
- The log strings and opponent/opponentRating field references

**Color matrix:**

| Opening | Student color | Filter | Result | Cliff direction |
|---|---|---|---|---|
| Najdorf | Black | `if (isWhite) continue` | `"0-1"` | `lastDiff - swing` (toward Black) |
| Alekhine | Black | `if (isWhite) continue` | `"0-1"` | `lastDiff - swing` |
| KIA | White | `if (isBlack) continue` | `"1-0"` | `swing - lastDiff` (toward White) |
| Rossolimo | White | `if (isBlack) continue` | `"1-0"` | `swing - lastDiff` |
| Jobava London | White | `if (isBlack) continue` | `"1-0"` | `swing - lastDiff` |
| Ruy Lopez | White | `if (isBlack) continue` | `"1-0"` | `swing - lastDiff` |

The KID miner has the correct inverted logic for Black openings — reference it
for Najdorf + Alekhine.

### STEP 2 — Run the miner

```bash
node scripts/pro-repertoire/mine-<opening>-traps.mjs > /tmp/<opening>-traps.out 2>&1
```

Expected: a sorted list of trap patterns with frequency, the position FEN
before the blunder, the blunder SAN, and example games with opponent ratings.
The JSON dump goes to `data/sources/danielnaroditsky-<opening>-trap-candidates.json`.

**Sanity check:** for each opening expect 50-2000 unique trap patterns. If you
get 0 or 5, the color logic is probably wrong — flip it.

### STEP 3 — Pick 4-6 teachable patterns

From the mined patterns, select the ones that:
- Appear in ≥3 games (preferably ≥8)
- Have at least ONE named victim ≥2700 rating (the receipts make narration credible)
- Are tactically clean (the cliff swing is real material, not just temporary exchange dynamics — verify by replaying the punish sequence in chess.js)
- Are NOT the mainline (a "blunder" that's the principled move is a false positive — drop it)

For each pattern: capture the prefix moves + blunder SAN + the actual punish
sequence from one of the example games (copy verbatim from the candidates JSON;
NEVER reconstruct from "what the principled line would be" — §1b show-your-work rule).

### STEP 4 — Author the trap-lesson file

Pattern to follow exactly: `src/data/lessons/proNaroditskyKIDTrapLessons.ts`
(or `proNaroditskyAlapinTrapLessons.ts` for White openings).

Each trap = a `LessonScript` with 4 beats:

1. **Setup beat** — reach the position where the slip happens. Narration:
   "Black/White's natural-looking X here actually walks into Y. N opponents
   including <named opponent> at <rating> fell into this same pattern."
2. **Slip beat** — opponent plays the blunder. Narration explains why it looks
   reasonable but isn't.
3. **Punish beat** — student plays the refutation. Narration names the squares,
   the tactical theme (fork, pin, sacrifice, structural).
4. **Cash beat** — material won / king exposed / position decisively better.
   Narration ties it to the strategic conversion.

**Hard rules (DO NOT skip):**
- Every `moves` string is chess.js-validated end-to-end (validate with the
  inline script at the bottom of this WO).
- Every `say` and `sayShort` is hand-written. NO templated "X% in Y games tells
  you this works" stat-drop punchlines (that pattern got scrubbed from
  the Alapin variations on 2026-05-29 — David called it out as "not hand-written").
- Every claim like "the knight attacks the queen" / "eyes f7" / "fork" must be
  verifiable by chess.js at the position the beat reaches (§1c narrationFactCheck
  gate enforces this).
- `kind: 'trap'` on the LessonScript (the type union doesn't include `'warning'` —
  the local `TrapEntry` interface field can use `'warning'` for routing
  classification but the LessonScript itself uses `'trap'`).
- `sources[]` array: chess.com opening page URL + `https://api.chess.com/pub/player/danielnaroditsky/games/archives` minimum.

Helper exports at the bottom of the file:

```ts
export function getProNaroditsky<Opening>TrapLesson(name: string): LessonScript | null {
  // ...lookup by name from TRAPS array
}
export function getProNaroditsky<Opening>TrapPlayableLine(name: string): PlayableMiddlegameLine | null {
  const lesson = getProNaroditsky<Opening>TrapLesson(name);
  if (!lesson) return null;
  return lessonToPlayableLine(lesson);
}
```

### STEP 5 — Add trapLines to pro-repertoires.json

In the opening's entry, add:

```json
"trapLines": [
  {
    "name": "<EXACT match to the lesson record key>",
    "pgn": "<full SAN sequence, chess.js-legal>",
    "explanation": "<full prose explaining the trap mechanism, citing real game counts + named opponents>"
  },
  ...
]
```

The `name` field MUST match exactly what's in the lesson file's `TRAPS` array
or the routing won't resolve.

### STEP 6 — Wire into OpeningDetailPage

In `src/components/Openings/OpeningDetailPage.tsx`, find the existing import
chain for trap-lesson resolvers (around line 76):

```ts
import { getProNaroditskyAlapinTrapPlayableLine } from '../../data/lessons/proNaroditskyAlapinTrapLessons';
import { getProNaroditskyKIDTrapPlayableLine } from '../../data/lessons/proNaroditskyKIDTrapLessons';
// ADD: import { getProNaroditskyNajdorfTrapPlayableLine } from '...';
```

Then find the curated trap routing (search for `getProNaroditskyAlapinTrapPlayableLine`)
and extend the resolver chain:

```ts
const curated =
  opening.id === 'pro-naroditsky-alapin'
    ? getProNaroditskyAlapinTrapPlayableLine(trap.name)
    : opening.id === 'pro-naroditsky-kid'
      ? getProNaroditskyKIDTrapPlayableLine(trap.name)
      : opening.id === 'pro-naroditsky-najdorf'
        ? getProNaroditskyNajdorfTrapPlayableLine(trap.name)
        : null;
```

Apply this to all 4 sites (trap-walkthrough, trap-learn, warning-walkthrough,
warning-learn).

### STEP 7 — Validate

```bash
npx tsc --noEmit
npx vitest run src/data/pro-repertoires.test.ts src/data/pro-repertoires-orientation.test.ts \
  src/data/lessons/lessonIntegrity.test.ts src/data/narrationFactCheck.test.ts \
  src/data/lessons/wlppNarration.test.ts
```

All must pass. The narrationFactCheck gate catches false claims like "the
queen eyes h7" when she doesn't.

### STEP 8 — Bump PRO_DATA_REVISION

```ts
// src/services/dataLoader.ts
const PRO_DATA_REVISION = '2026-MM-DD-<opening>-trap-lessons';
```

### STEP 9 — Commit + push to main

```bash
git add -A
git commit -m "feat(pro-rep): <opening> curated trap-lessons + routing"
git push origin HEAD:main
```

Then run `git push origin <session-branch>` to satisfy the branch hook.

### STEP 10 — Repeat for the next opening

Six openings total. Going in order of impact (most-played first):

1. **KIA** (18,216 games) — most-played; highest user impact
2. **Rossolimo** (4,151 games)
3. **Ruy Lopez** (2,922 games)
4. **Alekhine** (2,830 games)
5. **Jobava London** (2,170 games)
6. **Najdorf** (1,475 games)

## Inline chess.js validator (run before commit)

```bash
node -e "
import('chess.js').then(({Chess}) => {
  const file = require('fs').readFileSync('src/data/lessons/proNaroditsky<Opening>TrapLessons.ts', 'utf8');
  const re = /moves:\s*'([^']+)'/g;
  let m, n = 0, errs = 0;
  while ((m = re.exec(file)) !== null) {
    const c = new Chess();
    try { for (const s of m[1].trim().split(/\s+/)) c.move(s); n++; }
    catch (e) { errs++; console.log('BAD: ' + m[1] + ' — ' + e.message); }
  }
  console.log(n + ' beats legal, ' + errs + ' errors');
});
"
```

## Acceptance criteria

For each opening:
- [ ] Miner exists at `scripts/pro-repertoire/mine-<opening>-traps.mjs` and produces ≥30 trap patterns
- [ ] Trap-lesson file exists at `src/data/lessons/proNaroditsky<Opening>TrapLessons.ts` with 4-6 LessonScripts
- [ ] Every beat's `say` and `sayShort` is hand-written (no templated stat-drops)
- [ ] Every `moves` sequence chess.js-validates
- [ ] `pro-repertoires.json` entry has matching `trapLines[]` entries (names match exactly)
- [ ] `OpeningDetailPage.tsx` resolver chain includes the new opening
- [ ] All gates green: typecheck, lessonIntegrity, narrationFactCheck, wlppNarration, pro-repertoires gates
- [ ] Pushed to main + branch
- [ ] PRO_DATA_REVISION bumped

## Reference files (read these first)

1. **`src/data/lessons/proNaroditskyAlapinTrapLessons.ts`** — the canonical
   pattern for White openings (9 LessonScripts, helper exports, well-tested).
2. **`src/data/lessons/proNaroditskyKIDTrapLessons.ts`** — the canonical
   pattern for Black openings (4 LessonScripts, voice register for Black side).
3. **`scripts/pro-repertoire/mine-alapin-traps.mjs`** — reference White miner.
4. **`scripts/pro-repertoire/mine-kid-traps.mjs`** — reference Black miner
   (color-inverted from Alapin).
5. **`src/components/Openings/OpeningDetailPage.tsx`** lines 73-78 (imports)
   and the 4 routing sites for trap/warning walkthrough/learn (search for
   `getProNaroditskyAlapinTrapPlayableLine`).
6. **`CLAUDE.md`** — read §G1, §G3, §G5, §1a (TRAP RULE — traps must be
   mined, never authored), §1b (show-your-work rule), §1c
   (narrationFactCheck gate).
7. **`docs/plans/2026-05-28-pro-rep-deep-build-doctrine.md`** — the locked
   procedure doctrine (read STEP −1 through STEP 9 specifically).

## What NOT to do

- DO NOT fabricate trap patterns from "typical opening tactical knowledge"
  (§1a TRAP RULE locked David 2026-05-28 after a fabrication incident).
- DO NOT skip the chess.js validation — illegal moves crash the runtime
  silently and David finds them on prod.
- DO NOT use templated stat-drop endings ("X% in Y games tells you this
  works") — David called this out on 2026-05-29.
- DO NOT branch off main for this work; push directly to main per the
  Deployment Policy in CLAUDE.md.
- DO NOT skip authoring beats with "TODO Pass B" placeholders — Pass A is
  for the KID skeleton only; this WO is pure Pass B narration.
- DO NOT add to the narrationFactCheck baseline. The gate is supposed to
  shrink, not grow.

## When complete

Reply with:
- Number of curated trap-lessons added per opening
- Top mined patterns (game count + named victim) for each opening
- Confirmation gates all green + commits pushed
- Any patterns you DROPPED as false-positives (mainline moves the miner
  flagged) and why

---

**Estimated session length:** budget 30-45 minutes per opening × 6 openings
= 3-5 hours. Going depth-first per the doctrine; do NOT try to ship all
six in a single session if it forces shortcuts on any of them.
