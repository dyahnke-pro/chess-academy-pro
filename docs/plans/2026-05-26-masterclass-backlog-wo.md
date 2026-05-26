# WO — Finish the Masterclass Backlog (new session, Full network)

**Created 2026-05-26 by the plan-soundness session. Read this top to bottom
before doing anything.** This is a self-contained handoff: a cold session
should be able to finish the entire remaining masterclass backlog to the
locked standard from this doc alone. Also read `CLAUDE.md` and
`docs/opening-masterclass-playbook.md` — this WO does not replace them, it
sequences them.

---

## 0. WHY THIS EXISTS / WHAT JUST HAPPENED

An audit found the masterclasses were uneven: the early classical openings
were built fully, but the later build-out skipped tools. The dormant
Stockfish soundness gate (`mastersCoverage` 7b, behind `RUN_MASTERS_AUDIT`)
had let **middlegame-plan lines drift** — extended deep with "most-common"
moves instead of engine-best, several teaching an objectively **losing**
position (Caro Advance hung a piece, +5.3 White; Nimzo Kasparov narrated a
"doubled-pawns" idea that doesn't even occur in that variation).

The previous session fixed the **plan soundness** and built an **idea-first
prelude**. The big content gaps (gems, model games, sources) were
**network-blocked** in the old sandbox — the Lichess explorer
(`explorer.lichess.ovh`) was unreachable. **David has now set network access
to Full**, so a fresh session CAN reach the explorer and finish them.

### What is DONE and ON MAIN (PR #684, squash `afc8fc5`)
- **Severe-tier middlegame plans re-authored** (engine-sound, 7b ≤120cp,
  idea-first preludes, honest narration): caro-advance, caro-tartakower,
  nimzo-kasparov, nimzo-leningrad, najdorf-6a4, najdorf-fischer, slav-main,
  ruy-d4, sveshnikov-9bxf6, dragon-levenfish.
- **Idea-first prelude infra**: `intro {say, sayShort?, arrows, highlights}`
  on `PlayableMiddlegameLine` (`src/types/index.ts`), and `PlayableLinePlayer`
  now narrates the idea on the STATIC board with arrows/highlights at the
  intro beat (`demoMoveIndex < 0`) before the moves play. Backward-compatible.
- `api/lichess-explorer.ts` reads `LICHESS` env var (in addition to
  `LICHESS_API_KEY`/`LICHESS_TOKEN`).

### What is ON THE BRANCH but NOT yet on main
Branch `claude/gracious-hawking-5YDuq`, commits after the #684 squash:
- `0178d0b` — the 11 **moderate-tier** plans re-authored to engine-sound
  lines (qga, semi-slav, ruy-f4, caro-fantasy, caro-panov, scandinavian,
  benko, dutch, grünfeld, benoni, old-indian).
- `0e1d027` — qga prefix fix (an edit had dropped its first two plies).
These need a **new PR** to land (PR #684 is already merged).

### Known residual (NOT a bug — a sanctioned concession)
A few moderate plans (notably **qga**) read slightly over 120cp **even on the
engine's own best line**, because those openings are genuinely a touch worse
for the student — "best play" still reads as minor drift at the gate's depth.
David's explicit rule: *concessions to illustrate the idea are fine, as long
as the narration is honest.* Do NOT chase these to ≤120 with contrived moves.
The hard contract is only: **no plan teaches a LOSING position** (eval flips
to clearly lost). All of those are fixed.

---

## 1. FIRST: ENVIRONMENT SETUP (every fresh session)

```bash
npm ci                                   # fresh clone has no node_modules
sudo apt-get update && sudo apt-get install -y stockfish   # engine for mining + 7b
ls -x /usr/games/stockfish && printf 'uci\nquit\n' | /usr/games/stockfish | grep "id name"
```
- **Stockfish path: `/usr/games/stockfish`** — pass it as `STOCKFISH_PATH`.
  `resolveStockfish()` also auto-finds it.
- **Verify the explorer is now reachable** (the whole point of the relaunch):
  ```bash
  curl -s -m 20 "https://explorer.lichess.ovh/lichess?play=e2e4&ratings=1600&speeds=blitz" -w "\n[%{http_code}]\n" | head -c 200
  ```
  Expect HTTP 200 + JSON `{"white":...,"moves":[...]}`. If you still get
  `CERTIFICATE_VERIFY_FAILED` / 503, the allowlist didn't take — STOP and tell
  David (the relaunch didn't apply Full network).
- **LICHESS PAT** (for explorer rate limits / authenticated calls): in Vercel
  env + project memory (`lip_…`). David may have rotated it after this
  session exposed the value — **ask him for the current PAT**; never commit it.
- **The miner calls the Vercel PROXY by default** (`const PROXY =
  'https://chess-academy-pro.vercel.app/api/lichess-explorer'` in
  `scripts/mine-punish-gems.mjs`). That proxy's Vercel-EDGE→Lichess hop was
  failing (`status 0`, an edge-runtime issue, NOT auth). With Full network you
  can reach `explorer.lichess.ovh` **directly** — so **first `curl` the proxy**
  (`?source=lichess&play=e2e4`); if it still returns `upstream-blocked`, patch
  the miner's `explorer()` fetch to hit `https://explorer.lichess.ovh/${source}`
  directly (add the `Authorization: Bearer <PAT>` header) instead of the proxy.
  Test direct works first (it should, now that it's allowlisted).

---

## 2. THE NARRATION STANDARD — READ THIS BEFORE AUTHORING ANYTHING

Every spoken line in the app — gem narration, plan annotations, lesson beats,
the idea-first prelude — obeys these. Violations make a session tune out and
are content bugs. (Source: CLAUDE.md "Narration Voice Rules" + the playbook
"NARRATION STANDARD" + this session's prelude rules.)

### 2.1 Two registers, BOTH hand-written (never generated, never templated)
- **Watch = the FULL teaching line.** Vivid, per-move, names the squares and
  the idea. Benchmark = the Naroditsky `pro-repertoires.json` `explanation`
  voice. This is `beat.say` (lessons) / plan `annotations[i]` / gem `watch[i]`.
- **Learn = a TRUNCATED reinforcement CUE.** The move plus a 3-5 word echo of
  the Watch idea ("Nd5 — fork the queen, eye c7"), **≤8 words**, NOT a full
  sentence, NOT bare move dictation. This is `beat.sayShort` / plan
  `learnCues[i]` / gem `learn[i]`.
- **Practice = SILENT.** No voice; a Hint button reveals the arrow.
- **Play = the coach room LOCKED to the exact line** (`OpeningPlayMode` with
  `customLine`), never the generic `/coach/play`.

### 2.2 The 10 voice rules (the voice is the POSITION teaching, not the UI)
1. **Concrete over generic.** "The rook attacks the c7-pawn" beats "this is a
   good move." Every sentence names a square, a piece, or a concept.
2. **Never reference the interface.** No "tap", "click", "press Next", "use
   the chat button." The voice knows the position, not the buttons.
3. **Don't restate the board.** If the rook just went to h7, don't say "Rook
   to h7" — the student saw it. Voice carries what the picture doesn't.
4. **Silence is acceptable.** An empty annotation = no narration. Use it for
   routine/auto-played opponent moves. Save voice for moments that change
   understanding. (In plans, leave setup-move annotations `''`.)
5. **Ban acknowledgments.** No "Correct!", "Great job!", "Excellent!". The
   position changing in the student's favour IS the acknowledgment.
6. **Ban first-person / meta.** No "I think…", "Let me show you…", "Now we'll
   see…". The narrator is the position, not a tutor character.
7. **Name the pattern, not the move.** "Anastasia's mate", "the Lucena", "the
   minority attack" — the SAN is on the board; the NAME is the takeaway.
8. **Drill positions stay silent** (puzzle drills are practice, not teaching).
9. **Vary stems** when a phrase must repeat — don't copy the same opener.
10. **No length floor.** Two words beats two sentences when two words is what
    the position needs.

### 2.3 HONESTY ALWAYS (David, emphatic this session)
- **State the real engine assessment.** If the line equalises, say
  "comfortable, balanced" — NEVER "Black is better." If it's a slight edge,
  say so. The board must not contradict the narration ("Black besieges e5"
  while Black is down a piece = a lie the gate now catches).
- **"Illustrating the idea, not the engine's #1" is allowed and encouraged**
  for plans, *if narrated honestly.* You may even say the moves aren't the
  top engine choice but show the real idea (open the c-file, the kingside
  storm, the break). Right ideas, elegantly + honestly taught.
- **When UNSURE: leave blank / skip / ASK David — never guess.** Empty >
  generic > invented. We invent NOTHING (LLMs can't play chess; that's the
  whole reason for the gates). A half-built shelf flagged for review is
  correct; a confident fabrication is the cardinal sin.

### 2.4 The idea-first prelude (the format built this session)
Every plan line carries an `intro` rendered on the STATIC critical position
BEFORE any move:
- `intro.say` — narrate the plan's whole idea on the still board (Watch
  register). `intro.sayShort` — the ≤8-word version.
- `intro.arrows` — **GREEN** (`rgba(34, 197, 94, 0.85)`): the dynamics — the
  pawn breaks (…c5, …f6) and the long diagonals/files that OPEN once the
  position cracks (where a bishop will rake, the file a rook will own).
- `intro.highlights` — **YELLOW** (`rgba(255, 235, 59, 0.5)`): TWO jobs —
  (a) the **target** squares (the weakness attacked), AND (b) the **key
  squares pieces want to REACH** (outposts / maneuver destinations). Light up
  the destination before the journey.
- **THE PRELUDE MUST MATCH THE MOVES (David's hard rule).** Only promise what
  the line actually plays. If the line doesn't open the c-file, do NOT say
  "the c-file opens." This rule caught two would-be lies last session
  (sveshnikov "ready to use it"; nimzo "doubled pawns" that never form). The
  theme gate's PROMISE regex also fails on phrasings like "ready to / prepares
  to / is ready / planning to / about to" — state accomplished facts.

### 2.5 The lead-the-eye colour language (per-MOVE markers)
- **ORANGE** (`rgba(255,165,0,0.55)`) = the move's own two squares —
  **auto-painted by the player / by `add-leadeye-to-plans.mjs`; do NOT author
  by hand.**
- **GREEN** arrows = vision (threat / intent / the relationship the annotation
  describes).
- **YELLOW** highlights = a key square the narration names.
- After authoring annotations, **run `node scripts/add-leadeye-to-plans.mjs`**
  — it regenerates the per-move arrows/highlights, grounded + legality-gated.
  It only touches plans whose annotations changed; verify with `git diff
  --stat`. (It does NOT touch the `intro` markers — author those by hand.)

### 2.6 Independent-verification SOURCES (required, gated)
Every masterclass narration unit carries `sources: []` with ≥1 RESOLVABLE
ref: `concept:<id>` (in `chess-concepts.json`), `book:<openingId>` (in
`opening-book-pages.json`), or a reputable chess URL (wikipedia / chess.com /
chessable / lichess — see `REPUTABLE_DOMAINS` in
`src/data/lessons/narrationSources.ts`). **Verify ideas against the source,
not training recall.** ⚠️ Avoid the hollow pattern the audit flagged: do NOT
slap the same `[book:<x>, concept:pos-center, <x>-wikipedia]` triple on every
unit. `pos-center`/`pos-development` are over-used; cite the SPECIFIC concept
that matches the unit's idea.

### 2.7 Board-truth (the `narrationAccuracy` gate)
Never name a piece/square that isn't there ("the f5-knight" when no knight is
on f5). The gate rejects it. The MOVES come from the DB / engine (G3); the
LLM only writes prose.

---

## 3. THE BUILD METHOD (per content type)

### 3.A — Land the in-flight PLAN work (do FIRST, ~30 min)
1. Install stockfish (§1). Run the full plan-soundness sweep:
   ```bash
   RUN_MASTERS_AUDIT=1 STOCKFISH_PATH=/usr/games/stockfish \
     npx vitest run src/data/lessons/mastersCoverage.test.ts -t "plan move loses" 2>&1 \
     | grep -oE "mp-[a-z0-9-]+ move [0-9]+ [A-Za-z0-9+#=-]+ . loses [0-9]+cp" | sort -u
   ```
   Expected residuals: qga + maybe 1-2 slightly-worse openings reading
   130-230cp on engine-best lines (sanctioned concessions, §0). If anything
   reads >~300cp or a STUDENT move flips the eval to clearly losing, fix it
   (method 3.B-plan below).
2. Also run the fast data gates:
   ```bash
   npx vitest run src/data/middlegamePlanThemes.test.ts src/data/middlegamePlanner.test.ts \
     src/components/Openings/MiddlegamePlansSection.test.tsx \
     src/components/Openings/OpeningDetailPage.wiring.test.ts
   npm run ship-check        # must print READY TO PUSH
   ```
3. Open a **new PR** (branch → main; #684 is merged so a fresh PR is needed),
   then **merge it** (squash). Per Deployment Policy: this is production.
4. **Post-deploy audit (G1, MANDATORY):** wait for Vercel, then run the
   surface's audits (`audit-leadeye-plans.mjs`, `audit-punish-gems-loop.mjs`
   3-pass) against localhost (`AUDIT_SMOKE_URL=http://localhost:5173`,
   `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`).
   ⚠️ The interactive WLPP **click**-to-play hits the IndexedDB write-stall in
   the sandbox (the help-modal re-opens because its "seen" flag write stalls).
   That is the documented G1 §4 limitation — route the live-playback visual
   check to David's device. Verify what you CAN (content renders, narration
   text in the data, markers grounded, gates green).

### 3.B — GEMS for the ~30 openings without them (the big one)
**Which openings have ZERO gems** (from this session's audit): every
masterclass EXCEPT the 12 that already have them (ruy, vienna, scotch,
kings-gambit, italian, french, caro-kann, pirc, scandinavian, alekhine,
benko, nimzo). So mine: the Sicilians (dragon, najdorf, sveshnikov, alapin),
all the Indian/Slav defences (KID, grünfeld, benoni, queens-indian,
old-indian, slav, semi-slav, nimzo already has some), petrov, philidor, qgd,
qga, two-knights, budapest, albin, schliemann, four-knights, evans, reti,
english, london, catalan, dutch, kings-indian-attack, **queens-gambit,
trompowsky, birds** (the recent white trio), kings-indian-defence.

**THE GEM DOCTRINE (locked — non-negotiable):**
1. **ENGINE-FIRST discovery, not practical win-rate.** The amateur explorer
   (ratings ~1600-2000) says what's COMMON at the student's level; STOCKFISH
   says what's PUNISHABLE. Take common opponent moves, keep the ones the
   engine refutes. A practical-score filter HIDES the real crushes — don't
   use it.
2. **Refute with the engine's BEST move** (it finds the sac/fork), not the
   most-popular human reply. The punish is a real legal move — in-scope for G3
   (only the opening SPINE must be DB-anchored ≥6 plies).
3. **Grade at the QUIET END** of a best-play-both-sides playout, never one
   ply. Require final eval ≥ bar AND a real jump from the pre-inaccuracy
   baseline (the move's fault, not the opening's).
4. **Tiers:** ≥ +1.0 = `confirmed` (crush); +0.5..+1.0 = `positional`
   (clearly better, honest label, never "crush"); below +0.5 → dropped. Only
   confirmed + positional surface.
5. **Walk every variation's full line** node-by-node.
6. **🌐 GOOGLE-VERIFY the final set against theory** before shipping. The
   engine can be right where intuition is wrong (Ruy `…a6` really drops a
   pawn) and can flag a respected mainline you'd wrongly ship. Spot-check the
   headline crushes + any surprise; drop what theory says is fine.
7. **Source = the AMATEUR explorer** (`?source=lichess`, ratings 1600,1800,2000),
   NOT `openings-masters-db.json` (masters don't play refutable blunders → 0
   gems by design).

**Mine:**
```bash
OPENINGS=<id> STOCKFISH_PATH=/usr/games/stockfish node scripts/mine-punish-gems.mjs
```
Seeds auto-derive from `repertoire.json` (color → studentChar, common variation
prefix → baseSeed). ⚠️ **The miner MERGES**, but a scoped `OPENINGS=<id>` run
that finds 0 gems will leave that opening empty — fine; a NON-scoped or wrong
run can drop existing gems, so always scope by opening and check the count
before/after (`node -e "console.log(require('./src/data/punish-gems.json').length)"`).

**Then HAND-AUTHOR narration** in `src/data/lessons/punishGemNarration.ts`:
```ts
GEM_NARRATION['<gemId>'] = {
  sources: ['book:<id>', 'concept:<specific-id>', '<reputable-url>'],
  watch: [ /* one full-register line per playLine ply; '' = silent routine move */ ],
  learn: [ /* ≤8-word cue per ply the STUDENT plays; '' for opponent auto-moves */ ],
};
```
- gemId = `${openingId}:${lineMoves_with_underscores}:${inaccuracy}` (see the
  file header). `watch`/`learn` array lengths == the gem's `playLine` plies.
- A gem only SURFACES once narrated (`isSurfaceableGem`) — un-narrated mined
  gems are an invisible backlog; narrate them or they don't ship.
- Narrate per §2 (concrete, honest, name the pattern, sources match the idea).

**Verify:** `npx vitest run src/data/punishGems.test.ts` (legality, DB-anchor
≥6ply, tier evals, the two-register + source contract). Then
`AUDIT_OPENING=<id> node scripts/audit-punish-gems-loop.mjs` (the 3-PASS
contract: MET only on 3 consecutive error-free passes; each digs deeper).

### 3.C — MODEL GAMES for the 19 openings without them (incl. Pirc)
- **One game PER first-class variation, each showing the STUDENT'S side
  WINNING — a WIN, never a draw, never a loss.** A draw is not a model game.
- **Source REAL games** (never fabricate a PGN). With Full network:
  - Live: the explorer's `topGames[]` at the variation's named position →
    filter `winner === <student colour>`; export full PGN via
    `…/api/lichess-game-export?id=<id>` (or `lichess.org/game/export/<id>`).
  - Offline fallback: `docs/audit-runs/2026-05-19-pro-games-gen/raw-fetched.json`
    (~2,000 real pro games) + `scripts/curate-pro-games-to-model-games.mjs`
    (re-key matches to the masterclass `openingId`).
- Add to `src/data/model-games.json` with `studentSide` = student colour, a
  **hand-authored overview** (boilerplate "Master game from the Lichess
  masters database…" is filtered out by `isNarratedModelGame` — never
  bulk-import + stamp), and `sources`. Add the opening to the `PROTECTED` list
  in `src/data/modelGames-orientation.test.ts`.
- No real student-win for a variation → OMIT it (empty > losing/drawn >
  fabricated).
- **Verify:** `npx vitest run src/data/modelGames-orientation.test.ts` (rejects
  studentSide losses AND draws). ⚠️ Known gate blind-spot: it only checks games
  WITH `studentSide` set — set it on every masterclass game so losses can't
  evade it. There's also a mislabeled DRAW to remove: `mg-pro-caruana-nimzo-1`
  (1/2-1/2, no studentSide) + 7 boilerplate Lichess imports
  (`mg-lichess-*` in kings-gambit / najdorf / sveshnikov).

### 3.D — MASTERS-LEGITIMACY audit (now runnable with the explorer)
`mastersCoverage` Holes **6a/7a** verify that taught past-book + plan moves are
actually master-played (not plausible invention). They were SKIPPED (explorer
unreachable). Now run them:
```bash
RUN_MASTERS_AUDIT=1 STOCKFISH_PATH=/usr/games/stockfish \
  npx vitest run src/data/lessons/mastersCoverage.test.ts
```
This runs ALL four holes (6a legitimacy, 6b Stockfish soundness, 7a, 7b). It's
slow (Stockfish per move + explorer per position) — run per-opening with `-t
"<openingId>"` or let the full run go in the background. Fix / baseline any
flagged past-book move that isn't master-played (per the baseline rules in
the test — baselines only shrink).

### 3.E — SOURCES quality pass (follow-up, lower priority)
The `sources[]` gate passes but the data is a hollow per-opening template
(same triple copy-pasted; only 25 of 56 concept ids ever used). When you touch
a narration unit, replace the generic `pos-center`/`pos-development` with the
SPECIFIC concept that matches its idea, verified against the actual source
text. Not a blocker; improve incrementally.

---

## 4. GATE ROSTER (what must be green)

`npm run ship-check` runs the curated content gates. Individually:
- `lessonIntegrity` / `lessonDepth` / `lessonSources` / `lessonTabIntegrity` /
  `narrationAccuracy` / `narrationGrounding` — lesson move-lines + narration.
- `middlegamePlanner` / `middlegamePlanThemes` — plan lines demonstrate their
  theme (student move lands on a declared goal square), no promise-endings,
  learnCues + sources present.
- `punishGems` — gem legality / DB-anchor / tier / two-register + sources.
- `modelGames-orientation` — no studentSide loss/draw.
- `openingManifests` / `openingWiring` / `OpeningDetailPage.wiring` — manifests
  + each opening produces ≥1 valid tab with a distinct lesson + sections mount.
- `repertoire-orientation` / `pro-repertoires-orientation` — trap data.
- **`mastersCoverage`** (engine + explorer; CI `engine-soundness.yml` runs it
  on every plan/lesson change — the regression gate that was dormant).

Per-opening interactive (after deploy): `AUDIT_OPENING=<id>
audit-punish-gems-loop.mjs` (3-pass), `audit-leadeye-plans.mjs`,
`audit-named-traps.mjs`, `audit-opening-walkthrough.mjs`.

---

## 5. GOTCHAS (things that ate hours)

- **IndexedDB openings-store WRITE-STALL in the sandbox** (CLAUDE.md G1 §4):
  writes to `db.openings` stall; reads work. So the help-modal "seen" flag
  can't persist (modal re-opens, intercepts WLPP clicks), and unlock/rung
  persistence can't be verified here. Prove write LOGIC with fake-indexeddb
  unit tests; route live-commit + interactive-click checks to David's device.
  This is NOT a network issue — Full network does not fix it.
- **Eval noise on slightly-worse openings.** At the gate's depth, an
  engine-BEST move in a slightly-worse position can read 130-230cp "loss vs
  best." Don't chase those to ≤120 with contrived moves — they're concessions.
  Only fix moves that flip the eval to clearly LOSING or are a STUDENT blunder.
- **The miner's proxy vs direct** (§1) — test the proxy; fall back to direct
  `explorer.lichess.ovh` + Bearer PAT if the Vercel-edge proxy still 0s.
- **Deploy policy: push to `main`.** David HATES previews. Work on main / merge
  PRs straight away; one deploy per finished task (Vercel free-tier 100/day
  cap). MERGING A PR IS NOT THE END — run the post-deploy audit next (G1).
- **Don't fabricate chess content.** Moves from the DB/engine; prose from you;
  when unsure, leave blank / ask. Empty > generic > invented.
- **Rotate the exposed keys.** This session's screenshot exposed the
  Anthropic + DeepSeek API key values; David may rotate them. The LICHESS PAT
  value (`lip_…`) was also pasted in chat — ask David for the current one.

---

## 6. DEFINITION OF DONE
- In-flight moderate-plan PR merged to main + post-deploy audit green.
- Every masterclass opening either has engine-mined + hand-narrated gems, or a
  recorded "mined, 0 gems" result (so "never mined" ≠ "no gems exist").
- Every first-class variation that has a real student-winning game has a
  model game; the rest self-hide (no losing/drawn/boilerplate games).
- `mastersCoverage` (all four holes) green or honestly baselined.
- `npm run ship-check` → READY TO PUSH, and `engine-soundness.yml` green on
  main. Narration throughout obeys §2 (two registers, honest, prelude matches
  moves, sources resolvable + specific).
- Anything you couldn't verify in-sandbox (interactive playback) explicitly
  flagged for David's device — never claim "done" you didn't verify.
