# The Pro-Rep Efficient Build Recipe (locked 2026-05-31)

The Hikaru build (5 openings → full G9.1 parity in one session) proved this
workflow. It's the §G9.2 procedure made FAST: **extract the data first with a
throwaway script, then author from the printout.** Never author a line, plan,
pitfall, or endgame from imagination — pull the real moves, then write prose
over them. Every layer below was built this way and passed its gate first try
(after the gotchas here are avoided).

The meta-rule: **a 30-line extraction script that prints "here's the real spine
terminus + the real continuation + the squares the student actually lands on"
turns authoring from guesswork into transcription.** Write that script per
layer, read its output, author, delete the script.

---

## STEP ORDER (per opening, but batch each layer across all openings)

Do each LAYER across all openings before moving to the next — it amortises the
extraction script and keeps the voice consistent. Order: lessons → model games
→ plans → pitfalls → endgames. Ship once at the end (batch the Vercel deploy).

---

## LAYER 1 — Lessons (the STAR, §G9.3 Gate A)
Already covered in §G9.2 STEP 7-8. The one efficiency note: a `beat`'s `moves`
field MUST be a `string[]`, not a string — if you pass `'e4 c6 d4'` the gate
iterates over CHARACTERS and fails "SAN moves are legal". Use a helper:
`const b = (init) => ({ ...rest, moves: init.moves.trim().split(/\s+/) })`.

## LAYER 2 — Model games (data is ready-made)
The deep-build files already carry `topModelGames` with full PGNs. Extract:
```js
// per variation's deep file: topModelGames[i] → strip headers to bare SAN,
// read White/Black from the PGN headers, studentSide = whichever is the player.
```
- **Student-side WINS only** (modelGames-orientation gate rejects draws/losses).
  The deep data's `outcome:'win'` games are pre-filtered — just confirm.
- **Hand-author every overview** (≥40 chars, names opponent+rating+line+story).
  Boilerplate ("Master game from…") is filtered out by `isNarratedModelGame`,
  so a templated game silently never surfaces.
- `loadModelGamesData` reloads unconditionally every boot → no revision bump.

## LAYER 3 — Middlegame plans (extract spine-terminus + real continuation)
**The extraction that makes this trivial** — per variation, print:
1. the variation `pgn`'s terminal FEN (the spine terminus = the plan's
   `criticalPositionFen`, Gate C continuity),
2. the representative game's **continuation past the spine** (~10 real moves),
3. **every square a STUDENT move lands on** in that continuation.
```js
// walk the variation spine, then the rep game's next ~10 plies from the same
// position; for each ply where mover===studentChar, print san+'->'+move.to
```
Then author the plan declaring a theme the line ACTUALLY demonstrates:
- **`pawnBreaks`/`pieceManeuvers` must name a square the student lands on** —
  the `middlegamePlanThemes` gate walks the line and requires one student move
  to land on a declared goal square. 🚨 Don't declare "Nd7→Nf8→Ng6" if the
  data-line plays `h4` — declare what the moves SHOW (read the landing-squares
  printout, pick a real one).
- moves = the real continuation (G3). annotations 1:1 with moves. learnCues
  (≤8 words) 1:1. Last annotation must NOT be a promise ("ready to…",
  "prepares…") — the gate's PROMISE regex rejects it.

## LAYER 4 — Pitfalls (ENGINE-VERIFY, never trust memory)
🚨 **The cardinal lesson of this session: propose candidates, then let Stockfish
confirm which are REAL mistakes. Most "obvious" pitfalls aren't** — in a solid
positional system, a move-order "error" is usually just a transposition (delta
~0). Author ONLY the engine-confirmed ones; the rest self-hide (empty > invented).

```js
// for each candidate [setupSANs, wrongMove, correctMove]:
//   play setup → fen; eval(fen+wrong), eval(fen+right)
//   🚨 SIGN CONVENTION: Stockfish `score cp` is SIDE-TO-MOVE relative. After
//      the student's move it is the OPPONENT to move, so:
//         studentEval = -rawEval        (ALWAYS negate, regardless of color)
//      Getting this wrong flips every white-student result and makes a solid
//      system look pitfall-free. (Cost me a full re-run this session.)
//   keep if (studentEval_right - studentEval_wrong) >= ~40cp
```
Then author each kept pitfall: `fen`, `wrongMove`, `correctMove`, full
`explanation`, `shortNarration` (≤8 words), `sources`. common-mistakes.json is
imported directly (bundled) → reaches devices with the new bundle, no revision.

## LAYER 5 — Endgames (real game → transition FEN → tail, per the locked rule)
Only where the deep file's `endgameTypeBreakdown` shows a recurring REAL ending
(R+minor+P, R+P, etc. — not "middlegame (Q+pieces)"). Extract:
```js
// take the variation's representative game; walk until queens are off AND
// ply>=20 → that's the transition FEN (the plan's criticalPositionFen).
// the next ~10 plies are the real endgame tail; print student landing squares.
```
Author the endgame plan (id suffix `-endgame`, EndgamePlansSection filters it)
the same shape as a middlegame plan, theme = the conversion (a passer's
push-square, an outpost). Ground narration in the concept corpus
(Capablanca/Lasker minor+rook endings) + cite the real game. **No recurring
real ending → the section self-hides. Never fabricate one.**

---

## VERIFY-YOUR-OWN-WORK (the checks that aren't gated for pro-rep, so YOU run them)

pro-rep lives in the runtime `LESSONS` map, OUTSIDE the registry, so a few
quality gates that protect masterclass openings DON'T fire on it. Run them
manually with a throwaway script before shipping:

1. **Arrows — NOW GATED for LESSON arrows (David 2026-06-01 "gate the arrows!").**
   `src/data/proRepLessonArrows.test.ts` (in ship-check) enforces, for every
   arrow on every pro-rep LESSON beat: non-pawn origin + valid piece GEOMETRY
   (`from→to` on the piece's knight-hop/diagonal/file-rank line). It deliberately
   ALLOWS the thematic long-diagonal aim (a `b2→g7` fianchetto arrow blocked by
   pawns is correct lead-the-eye), and skips move-path arrows (vacated origin) +
   pawn-push arrows. New lessons must pass clean (Carlsen does); a 6-entry
   SHRINKING baseline grandfathers pre-existing cross-pro quirks.
   Still run the STRICTER dev checker `scripts/pro-repertoire/_arrowcheck.mjs`
   "<sans>" <from> <to> while authoring to also catch sight-lines blocked by your
   OWN pieces (that's a style call the gate can't make without false-positiving
   the fianchetto aim). **PLAN-LINE arrows (middlegame-plans.json) are still
   ungated** — verify those with the dev checker by hand.
2. **Narration board-accuracy** — `proRepPlanAccuracy` DOES gate pro-rep (it
   caught 4 of my "two bishops" claims where no real 2-vs-1 existed on the
   board). A "bishop pair"/"two bishops" claim requires a frame in the line
   where one side has 2 bishops vs <2. Every `e4-knight`/`d5-pawn` hyphenated
   claim must be true on the board at that ply.
3. **Voice** — `proRepNarrationVoice` (G9.4) bans move-number prefixes in
   `say`/`sayShort`/plan/model/pitfall text ("1.b3" → "the b3 opening";
   "2.Nc3" → "Nc3"). Polly reads "2." as "two". sayShort/learnCues ≤ 8 words.

## GEMS — the one that needs the EXTRA_WALK trick for solid systems
(Full doctrine in CLAUDE.md gem §1-8.) The 2026-05-31 addition: a SOLID/
positional repertoire's gems live in the OPPONENT's amateur side-tries, NOT the
curated mainline (the pro curates the quiet line, so the variation pgns walk
equal positions → 0 gems). Seed `EXTRA_WALK` in `mine-punish-gems.mjs` with the
common dubious opponent tries the student FACES (Fantasy f3, h4-lunge, dxc5)
BEFORE concluding "no gems" — that's where Naroditsky's/Gotham's/Hikaru's Caro
gems all came from. Per-node engine re-audit (every anchored opponent node)
confirms whether a system is genuinely gem-free. And: `engineCp >= 100` = tier
`confirmed` (the gate requires positional < 100); the material gate already
blocks false initiative, so a +1.0 attacking crush with no material won is still
`confirmed`.

---

## SHIP (once, batched)
1. `npm run ship-check` → READY TO PUSH (the gates above ride inside it).
2. Commit per layer locally; push to `main` ONCE at the end (Vercel cap).
3. Post-deploy: verify the bundle hash advanced, then run the interactive
   audit (clone `scripts/audit-hikaru-prorep-prod.mjs` +
   `scripts/audit-pro-tab-wiring-prod.mjs`). Gate A (curated lesson, no legacy
   fallback) + content surfaces + 0 app errors + the wiring closed loop.
4. **Sandbox can't drive**: the player-page opening LIST (`db.openings` write
   stalls, G1.4) and live voice playback (headless autoplay) — route those to
   David on device. Everything else is verifiable in-sandbox.

## TIME
Hours, batched by layer. Each extraction script is ~30 lines and pays for itself
across all openings. The authoring is fast BECAUSE the data is printed in front
of you — you're transcribing real moves into prose, not inventing.
