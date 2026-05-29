# Pro-Repertoire Deep Build Doctrine

**Status:** LOCKED (David 2026-05-28). This document is the procedure for
any session that builds a pro-rep opening at full G9.1 depth. Read it
front-to-back before writing a line of code. The Naroditsky Alapin
build (the reference) was executed against this doctrine; its files are
the canonical pattern.

---

## §0. THE VOCABULARY LOCK — non-negotiable

When working on pro-rep, **do NOT use these words** anywhere — not in
commit messages, not in code comments, not in lesson narration, not in
internal reasoning, not in chat replies:

- "masterclass" / "masterclass-shaped" / "masterclass-level"
- "masterclass-quality" / "masterclass-grade"
- "promote into the masterclass" / "matches the masterclass standard"

**Why this matters:** the M-word, applied to pro-rep work, primes the
session to (a) treat the M-system as the higher tier and pro-rep as
something climbing toward it, (b) reach for M-lesson files as templates
instead of the player's game data, (c) worry about M-gates that don't
apply, (d) conflate two separate code paths that just happen to share
UI components. The M-system and pro-rep are SEPARATE SYSTEMS with
SEPARATE source data, SEPARATE gates, and SEPARATE quality bars.

**The pro-rep quality bar has its own name:** *G9.1 deep build*. The
shared UI shape (WLPP, `PlayableLinePlayer`, variation tabs) is *the
pro-rep build shape* or *the pro opening detail shape*. Use "M-word"
ONLY when literally referring to the M-system files (the lesson files
registered in `registry.ts OPENINGS`, the M-gates, the masters-DB
spine). G9's phrase *"look and feel like masterclass"* is a one-time
directional analogy for the UI; it is NOT a license to use the word
as the quality target's name inside pro-rep work.

If you catch yourself typing "masterclass" while authoring pro-rep:
**stop, delete the sentence, rewrite using "pro-rep" or "G9.1 deep
build" instead.** The vocabulary discipline IS the doctrine.

---

## §1a. THE TRAP RULE — TRAPS MUST BE MINED, NEVER AUTHORED (David 2026-05-28, locked after I shipped 3 fabricated trapLines)

**Every `trapLine` entry MUST come from the trap mining pipeline. Never
from general chess knowledge. Never from "typical [opening] tactical
patterns." Never from "what usually happens in [opening]." If the
specific blunder + punish pattern is not in the player's chess.com
archive, the trap DOES NOT EXIST for this build.**

The mining procedure:

1. Build/use the per-opening miner:
   `scripts/pro-repertoire/mine-<player>-<opening>-traps.mjs`
2. The miner walks the player's actual chess.com archive, identifies
   real blunder positions (Black's move opens a tactical sequence
   where the next 3-5 White moves win material), and groups by
   `(position FEN before blunder, blunder SAN)`.
3. Output: a sorted list of patterns by frequency. Patterns occurring
   in ≥3 games are strong candidates.
4. The reference miner used for the Alapin
   (`mine-alapin-traps.mjs`) yielded 1,648 blunder positions across
   1,896 games and 1,336 unique trap patterns; top 6 patterns
   account for ~156 games where opponents fell into the SAME trap
   repeatedly.

For each surfaced trap pattern that you author into
`pro-repertoires.json`:

- **`pgn`** = the prefix moves (reaching the position before the
  blunder) + the blunder SAN + the next 4-6 plies of the actual
  punishment, ALL taken directly from one of the games in the cluster.
  Never reconstruct the punish from "what the principled line would
  be"; copy it from the real game.
- **`explanation`** = describes the trap pattern with reference to the
  REAL OPPONENT COUNT ("62 opponents fell into this in his archive,
  including HansOnTwitch 3161 and ckgchess 2888") — those are the
  receipts that prove this is data-grounded.
- **`name`** = describes the blunder + punish in chess terms ("Nc6
  Block fails to exf7+", not "common Alapin tactical motif").

🚨 **The 3-game-minimum convention.** A pattern that appears in <3
games is too rare to be a teaching trap — it may be an over-the-board
accident or a 1-off mistake. Skip patterns with <3 games unless one
of them is a marquee opponent (≥2700-rated) AND you can verify it's
the same idea, not a transposition.

🚨 **The false-positive filter.** Material-swing miners produce false
positives when:
- The "blunder" is the main-line continuation (Black plays the
  principled move; the temporary material swing is normal
  exchange dynamics)
- The "punish" is a simple trade where material balance returns to
  even within 2-3 plies
- The position is a known book-correct line

When inspecting mined patterns, ALWAYS verify by replaying the punish
sequence in chess.js and checking that AFTER the punish, the material
balance favors White by ≥2 points net (not just temporarily).

🚨 **Acknowledge what mining doesn't find.** If the miner returns
fewer trap patterns than you'd intuitively expect, that's the answer
— the player doesn't have those traps in their archive. Don't fill
the gap with fabricated tactical motifs. Pro-rep is what the data
shows, not what theory says.

The 6 traps in the Alapin reference build break down as:
- 2 spine-derived (Nb5 fork, Bc4-Gambit) — extracted from the spine
  variations in the deep-build output; data-grounded
- 1 lifted from mining (Bc4-Gambit + exf7+ Nc6 blunder, 62 games)
- 3 FABRICATED tonight (Nxe5 pawn grab, premature Nxe4, Wing-grab
  Qxb2) — VIOLATION, scheduled for removal + replacement with
  mined patterns

The cardinal rule (§1 below) was always supposed to cover this; the
trap-specific carve-out exists because trapLines are easy to
fabricate when you "know" common opening tactics. The mining
pipeline is the enforcement: if the miner doesn't surface it, the
trap doesn't ship.

---

## §1b. THE SHOW-YOUR-WORK RULE — every authored move must be traceable to a script's stdout (David 2026-05-28, locked after multiple fabrication incidents in a single session)

**The §1 cardinal rule says "no fabrication." The §1a TRAP RULE says
"traps must be mined." This §1b rule generalizes both:**

🚨 **Every move in every PGN you ship to `pro-repertoires.json`,
`middlegame-plans.json`, `model-games.json`, or
`common-mistakes.json` MUST have been copied from a script's stdout
within the same session.** If you're typing chess moves into a `pgn`
or `moves` field from your head, you're fabricating. Period.

The valid sources for each kind of move sequence:

| Where the moves live | Source script (run first, then paste from stdout) |
|---|---|
| `variations[].pgn` (pro-rep entry) | `extract-opening-tree.mjs` — the spine + variations array |
| `trapLines[].pgn` | `mine-<player>-<opening>-traps.mjs` — top mined patterns + sample game |
| `warningLines[].pgn` | `extract-game-positions-<player>-<opening>.mjs` — a position from a real game where the player FELL into the pattern (their loss), OR a tested anti-pattern walked from a real game |
| `playableLines[0].moves` (middlegame plans) | `middlegame-past-spine-<player>-<opening>.mjs` — the data-derived continuation past the spine end |
| `playableLines[0].fen` (endgame plan FEN) | `extract-game-positions-<player>-<opening>.mjs` — a specific position from a real game |
| `endgame plan moves` | `extract-game-positions-...` — the NEXT 4-6 plies of that game's actual play |
| Model game `pgn` | The player's chess.com archive (raw PGN from `pick-model-games.mjs` output) |

**The procedure when authoring an entry:**

1. **Run the source script FIRST** (before authoring the prose).
2. **Paste the move sequence verbatim** into the entry.
3. **chess.js-validate it via the entry's build script** to catch typos.
4. **Then write the prose** referring to specific moves in the sequence.

🚨 **The "60-second rule":** if more than 60 seconds have passed
between running the source script and pasting a move sequence, RE-RUN
the script. The temptation to "I remember the right move was Nb5" or
"I think the punish was exf7+" is exactly how fabrication happens.
Treat the script output as a copy-paste source, not as memory aid.

**Failure modes this rule prevents (all hit in the 2026-05-28
session):**

- **The "wing-grab Qxb2 in e6 French" trap.** I "knew" this was a
  common Alapin pattern. The miner showed it doesn't appear in his
  data. I shipped a fabricated trap.
- **The "Nxe5 pawn grab" trap.** I "knew" this is what would happen
  if a beginner grabbed the e-pawn. The miner showed the actual
  patterns are different. Fabricated.
- **The d6-mainline endgame plan with `Nc1`.** I wrote the moves
  from memory of how the line "should continue." chess.js rejected
  it as illegal — there was no knight that could reach c1.
- **The e6-french endgame plan with `Rb3`.** Same pattern: I composed
  the punish "based on what I'd play here." chess.js rejected it.
- **The nc6-line endgame plan with `Bh6` from a position where the
  bishop was already on h6.** Pure fabrication; never looked at the
  FEN.
- **The d5-open endgame plan with `Bd6` to a square that already
  had a bishop.** Same.

In ALL of these cases, the fix was to actually pull the next moves
from the game text via `extract-game-positions-...mjs` and paste
them verbatim. Once I did that, the moves were legal AND
data-grounded.

**If a script doesn't exist yet for the kind of move you need, CREATE
THE SCRIPT FIRST.** Don't author from memory while "noting" that the
script would have to be built. The script IS the authoring tool.

**The cultural rule that drives this:** Pro-rep is the player's
DATA, walked through templates. It is NOT "what a coach would author
about this opening." If you find yourself thinking "this position
SHOULD have this trap" or "the principled continuation here would
be," STOP. That's the fabrication voice. The data either has it or
it doesn't. Build = mine + extract + paste + validate. Repeat until
the entry is built. No mental composition.

---

## §1c. THE NARRATION FACT-CHECK GATE — chess.js verifies every claim (David 2026-05-28, locked after the Nb5 narration bug)

**Every authored "the X attacks Y" / "eyes Z" / "forks" / "pins"
claim in narration MUST be verifiable by chess.js at the position
the beat reaches.** If you write "the knight attacks the queen", the
knight MUST actually attack the queen's square at that position.

The gate that enforces this:
`src/data/narrationFactCheck.test.ts`

Patterns covered (V1):

| Claim pattern | Verification |
|---|---|
| "the <piece> (attacks/threatens/hits) the <enemy piece>" | The just-moved piece's attack set must include a square holding an enemy piece of that type |
| "eyes <square>" | The just-moved piece's attack set must include that square |
| "fork(s)" | The just-moved piece must attack ≥2 non-pawn enemy pieces |

When you author a beat or annotation, the gate runs against:
1. Every `say` and `sayShort` in every lesson beat
2. Every `annotations[i]` in every plan's `playableLines[0]`

**Pre-author practice:** before writing prose about "what just
happened on the board," play the move in chess.js and inspect:
- What squares the just-moved piece now attacks (use
  `chess.attackers(targetSq, color)` reversed)
- What enemy pieces are on those attacked squares
- What the actual chess facts are

THEN write prose referring to verified facts. Don't write "the
bishop on c4 eyes f7" and assume — confirm with chess.js that c4 to
f7 isn't blocked by a piece on d5.

**Baseline:** the gate has a `BASELINE_VIOLATIONS` set holding 22
legacy violations in existing content (Scotch, French, Vienna,
Sicilian Dragon, London, Albin, Queens Gambit, etc.). The baseline
ONLY EVER SHRINKS — when a baseline entry is fixed, drop it from
the list. No new violations may be added to the baseline.

**Speed:** the gate is ~15s end-to-end. The 3 sub-tests have 30s
timeouts.

---

## §1. THE CARDINAL RULE — NO FABRICATED MOVES

This is a hard, no-exceptions rule:

**Every move in every lesson, plan, trap, model game, warning, and
pitfall MUST come from one of these sources:**

1. The player's chess.com archive at `data/sources/<player>-chesscom/`
2. The extracted tree at `data/sources/<player>-trees/<opening>.json`
3. The deep-build per variation at `data/sources/<player>-deep/<opening>-<variation>.json`
4. Pulled from chess.js when computing a recapture/check/castle that's
   a deterministic legal move from a position derived from the above

**You will NEVER:**

- Pull a move from training memory ("the theoretical reply is…")
- Pull a move from book knowledge ("the textbook continuation is…")
- Pull a move from your own play intuition ("I'd play…")
- Pull a move from an LLM-generated continuation
- Pull a move from a third-party theory database that isn't in his archive

**If the data doesn't show the move he plays, the move DOES NOT EXIST
for this build.** A variation with insufficient data gets dropped, not
filled in with imagination. A trap that can't be anchored to his actual
games gets dropped, not fabricated. A model game with no overview you
can write from real data gets skipped, not boilerplated.

**LLMs cannot play chess.** This rule is the spine of every gate that
follows. If you find yourself about to type a chess move without
checking the tree first — stop, pull the tree, verify the move is in
his data, then type it. No exceptions. None.

---

## §2. THE 16-STEP PROCEDURE

Each step has explicit success criteria. Do not advance to step N+1
until step N is verified.

### STEP −1 — Build/copy the per-opening scripts BEFORE authoring anything (David 2026-05-28, locked)

🚨 **The sequencing rule (§1b enforcement at the procedure level):**
before you write ONE LINE of prose about this opening, the following
scripts must exist on disk and have been RUN with their output saved:

| Script | Run output goes to | What it produces |
|---|---|---|
| `mine-<player>-<opening>-traps.mjs` | candidates JSON file | Ranked mined trap patterns |
| `middlegame-past-spine-<opening>.mjs` | stdout | Real middlegame continuations past each variation's spine end |
| `wider-corpus-endgame-<opening>.mjs` | stdout | Endgame structure distribution per variation |
| `count-plans-<opening>.mjs` | stdout | Middlegame plan cluster counts per variation |
| `extract-game-positions-<player>-<opening>.mjs` | stdout (per model game) | FENs + next-N-plies for the endgame anchor positions |

Each script is forked from the Alapin reference and edited to match
the new opening's prefixes. The edit is mechanical — replace
variation keys + prefix arrays. **DO NOT skip this step.** If you find
yourself authoring trapLines without the miner having run, STOP and
go back. If you find yourself writing playable-line moves for a plan
without the middlegame-past-spine script having run, STOP. If you
find yourself authoring an endgame plan FEN without
extract-game-positions having run, STOP.

The Alapin build broke when I tried to skip this step three times in
one session (fabricated traps, fabricated endgame moves, fabricated
narration). The scripts ARE the authoring tools. The build script's
output IS your raw material. Authoring without running them = $1b
violation.

After the scripts have run and their output is on disk, the
authoring task becomes mechanical: pick the top entries from each
output, paste the move sequences verbatim, write prose that refers
to the literal moves. No memory. No "principled play would be." No
"the natural reply is."

---

### STEP 0 — Verify the player's data is on disk

```bash
ls data/sources/<player>-chesscom/ | wc -l
```

Expected: ≥1 monthly archive file (the player has games on chess.com).
A prolific player like Naroditsky has 149 months / 140k+ games; a
smaller creator may have 20-50 months / 5k-20k games.

If missing:
```bash
node scripts/pro-repertoire/fetch-chesscom.mjs <chesscom-username>
```

One-time, ~70 seconds for 140k games. Raw archives go to
`data/sources/<player>-chesscom/` (gitignored).

**Success criterion:** `ls data/sources/<player>-chesscom/*.jsonl | wc -l`
returns a number > 0.

### STEP 1 — Add the opening to the tree extractor

Edit `scripts/pro-repertoire/extract-opening-tree.mjs` `OPENINGS` map.
Each entry needs:
- `name`: the canonical opening name
- `color`: 'white' or 'black' — the student's side
- `minPrefix`: SAN array, the minimum prefix that identifies the opening
- `maxDepth: 80` (always 80)

**Verification:**
```bash
node scripts/pro-repertoire/extract-opening-tree.mjs <player> <openingId>
```

Output goes to `data/sources/<player>-trees/<openingId>.json` and
`<openingId>-model-games.json`.

The tree carries: `root`, per-position game counts (W/D/L), `spine`
(most-played path with `MIN_BRANCH_GAMES ≥ 5`), `variations` array
(branches off the spine with ≥5 games), `bestUrls` per node.

**Success criterion:** the JSON file exists and has `totals.gamesMatchingOpening > 30`.
If < 30, the player doesn't really play this opening — drop it.

### STEP 2 — Identify named variations from the tree data

Inspect the tree's `variations` array. Filter for entries with `games >= 30`
that have a CANONICAL name (textbook variation name). Aim for 4–8
variation tabs.

```bash
node -e "
const t = JSON.parse(require('fs').readFileSync('data/sources/<player>-trees/<opening>.json','utf8'));
for (const v of t.variations.slice(0, 10)) {
  console.log(v.depthFromOriginPrefix, v.prefixToHere.join(' '), v.branchSan, v.games + 'g', v.scorePct + '%');
}
"
```

**The variation count rule (David 2026-05-25 locked):** build ALL
validated variations — every line passing the (a)–(d) test:

- (a) ≥30 games in the player's archive
- (b) the line is a CANONICAL named variation (Tartakower, Mar del
  Plata, English Attack, etc.) OR an idiosyncratic line the player
  plays very frequently (e.g. his 80%+ score sub-line)
- (c) structurally distinct from the other variations (not just a
  transposition of an already-listed line)
- (d) at least one student-side-winning model game exists in the
  data

**Do NOT ask the user how many variations to build.** Build all that
qualify. No cap. No "is six enough."

### STEP 3 — Deep-build per variation

For each variation, add a key to `OPENINGS` in
`scripts/pro-repertoire/deep-build-data.mjs` with:
- `prefix`: the SAN array identifying that variation (≥3 plies past
  the opening's `minPrefix`)
- `label`: human-readable name for the deep-build output

Then run:
```bash
for v in <variation-keys>; do
  node scripts/pro-repertoire/deep-build-data.mjs <player> <opening> $v
done
```

Output per variation at `data/sources/<player>-deep/<opening>-<variation>.json`:
- `spineMoves`: the data-derived spine for THIS variation
- Aggregate per-ply choices: every move he plays at each ply with
  game counts
- Middlegame patterns: frequency-ranked moves at plies 12-25 across
  games-at-terminus
- Endgame structure breakdown: classified board states at the END
  of each game
- Top 5 model games with full PGNs

**Verification check (catches the prefix-mismatch bug):**
```bash
node -e "
const f = JSON.parse(require('fs').readFileSync('data/sources/<player>-deep/<opening>-<variation>.json','utf8'));
console.log(f.totalGames, 'games |', f.spineMoves.length, 'plies in spine');
"
```

**Success criterion:** `totalGames >= 30` AND `spineMoves.length >= 8`.
If either fails, the variation prefix needs adjusting (probably too
specific or wrong move order).

### STEP 4 — Count plans HONESTLY using the WIDER CORPUS rule

🚨 **THIS IS THE NON-NEGOTIABLE WIDER-CORPUS RULE (David 2026-05-28,
locked after the Fantasy Caro endgame mistake):**

Every plan-counting, endgame-classification, or structural analysis
MUST run across the FULL set of games matching the variation's
identifying prefix — typically hundreds of games — **NEVER on the 3-4
games that reach the deep aggregate terminus**.

The terminus is for spine construction only; everything ELSE
(middlegame patterns, endgame structures, plan counts) is broader-
corpus analysis. A previous session classified the Fantasy Caro as
"no endgame plans — most games end mid-board" based on 3 games at the
deep terminus. The actual answer across the 189 Fantasy games was 56%
reach real endgames including a 132-ply decisive Q+P win.

Use the wider-corpus templates already on disk:

```bash
# Generic adaptable templates from the Alapin build:
node scripts/pro-repertoire/wider-corpus-endgame-alapin.mjs
node scripts/pro-repertoire/count-plans-alapin.mjs
```

These hardcode the Alapin variation prefixes — copy them, rename to
`<opening>-` variants, and edit the `VARIATIONS` map at the top to
match the new opening's prefixes.

**The plan-count rule:** each cluster with ≥10% frequency at a key
middlegame ply (12, 14, 16, 18, 20) is ONE candidate middlegame plan.
**For endgames:** each endgame TYPE reached by ≥10% of games (across
the wider corpus, not just terminus games) is a candidate endgame plan.

Document the plan count BEFORE authoring. Example output from the
Alapin reference build:

| Variation | MG plans | EG plans |
|-----------|----------|----------|
| nf6-main (1,105g) | 5 (exd6 / Bc4 / Bc2 / Qe2 / Nc3) | 3 (R+min+P 29% / Q+P 11% / R+P 9%) |
| d5-open (783g)    | 3 (Be3 / Nb5 / Nf3) | 4 (R+min+P 27% / Q+P 12% / R+P 12% / min+P 10%) |
| e6-french (344g)  | 3 (O-O / dxc5 / Bg5) | 2 (R+min+P 22% / Q+P 12%) |
| d6-mainline (173g)| 2 (h3 / Nf3) | 2 (R+min+P 30% / Q+P 11%) |
| g6-dragon (125g)  | 3 (Nf3 / Nc3 / Bb5) | 2 (R+min+P 26% / Q+P 10%) |
| nc6-line (116g)   | 2 (Nc3+Bd3 / d5) | 3 (R+min+P 34% / Q+P 13% / min+P 11%) |

### STEP 5 — Gather voice corpus

Voice content makes the build accurate. Author from his actual
words/ideas, not imagination.

Sources accessible from sandbox:
```bash
WebSearch "<player> <opening> teaching key ideas"
WebSearch "<player> <opening> speedrun summary principles"
WebFetch <listudy URL>           # general principles
WebFetch <lichess study URL>     # community-curated distillation
WebFetch <chess blog URL>        # third-party content summaries
```

**Save gathered content** to
`data/sources/<player>-voice/per-opening/<opening>.md` with per-source
attribution. Reference these in lesson `sources[]` arrays.

**YouTube transcripts are sandbox-blocked** (Google bot-check on
datacenter IPs, confirmed 2026-05-28). When transcript-level voice is
needed, the URLs themselves go in `sources[]` (youtube.com is NOT in
the narrationSources allowlist currently — see §3 below — so beat text
referencing his YouTube content should use neutral framing without
verbatim quotes). Don't burn time fighting YouTube from sandbox.

**Success criterion:** at least 2-3 distinct URLs that resolve under
the narrationSources allowlist (§3) — lichess.org, chess.com,
chessbase.com, chessable.com, wikipedia.org, 365chess.com, etc.

### STEP 6 — Author the per-variation lessons

File: `src/data/lessons/pro<Player><Opening>Variations.ts`

Reference pattern: `src/data/lessons/proNaroditskyAlapinVariations.ts`
(the canonical Alapin build).

Each variation gets a `LessonScript` with 7-12 beats. Each beat:
- `id`: short kebab-case
- `moves`: SAN sequence from the start of the opening, MUST be
  chess.js-legal (verify with `new Chess(); for (m of moves) chess.move(m);`)
- `say`: full Watch register prose (60-150 words, references game
  counts + his voice principles + sources). NO move-number prefixes
  in prose ("3.Nc3" → "Nc3" or "the queen's knight to c3").
- `sayShort`: ≤8-word Learn cue (move + 3-5 word echo)
- `arrows`: green vision arrows only, never from a pawn, clear
  sight-line (the `lessonIntegrity` gate enforces)
- `highlights`: orange move squares (auto-painted, don't author);
  yellow for key squares the narration names; blue for context
- `sources`: array with `concept:<id>` | reputable https URL (from
  the narrationSources allowlist). NO `book:<id>` unless the opening
  is in the corpus.

Export pattern:
```ts
export const PRO_<PLAYER>_<OPENING>_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-<player>-<opening>::<Variation Name 1>': VAR1,
  'pro-<player>-<opening>::<Variation Name 2>': VAR2,
  // ...
};
```

The key MUST match exactly the `name` field of the corresponding
variation in `pro-repertoires.json`.

### STEP 7 — Register the variation lessons

Edit `src/data/lessons/index.ts`:

```ts
import { PRO_<PLAYER>_<OPENING>_VARIATION_LESSONS } from './pro<Player><Opening>Variations';
// ...
const VARIATION_LESSONS: Record<string, LessonScript> = {
  // ...existing...
  ...PRO_<PLAYER>_<OPENING>_VARIATION_LESSONS,
};
```

**This is the fix for the "smaller board on variation tabs" UX gap.**
Without a `LessonScript` for the variation key, the variation tab
falls through to the legacy `WalkthroughMode` (smaller board, eval
bar). WITH a registered lesson, the tab renders `PlayableLinePlayer`
(the consistent bigger board).

**Verification:** `npx tsc --noEmit` — must pass.

### STEP 8 — Expand the pro-repertoires.json entry

Edit `src/data/pro-repertoires.json`. The entry needs:

```json
{
  "id": "pro-<player>-<opening>",
  "playerId": "<player>",
  "eco": "<ECO code>",
  "name": "<Opening Name> (<Player>)",
  "pgn": "<the main spine PGN, ≥15 plies>",
  "color": "white|black",
  "style": "<short style descriptor>",
  "overview": "<300-500 chars, paraphrased from voice corpus, citing data fingerprint>",
  "keyIdeas": [
    "<4-6 strings, each grounded in data + voice>"
  ],
  "traps": [
    "<2-4 prose blurbs about opponent tactical traps>"
  ],
  "warnings": [
    "<2-4 prose blurbs about pitfalls his side could fall into>"
  ],
  "variations": [
    {
      "name": "<MUST exactly match the LessonScript record key suffix>",
      "pgn": "<the full data-derived variation spine, ≥15 plies>",
      "explanation": "<200-400 chars, paraphrased + cites game count + score>",
      "sources": [
        "<URL from narrationSources allowlist>",
        "https://api.chess.com/pub/player/<player>/games/archives"
      ]
    }
  ],
  "trapLines": [
    {
      "name": "<the trap's distinguishing idea>",
      "pgn": "<≥6 plies, chess.js-legal, ends with student gaining material/decisive position>",
      "explanation": "<full prose explaining the trap mechanism>"
    }
  ],
  "warningLines": [
    {
      "name": "<the slip's distinguishing idea>",
      "pgn": "<≥6 plies, chess.js-legal, ends with student losing material/positionally lost>",
      "explanation": "<full prose explaining what goes wrong>"
    }
  ],
  "sources": [
    "<URL from narrationSources allowlist>",
    "https://api.chess.com/pub/player/<player>/games/archives"
  ]
}
```

### STEP 9 — Author middlegame plans

**Reference pattern (the CORRECT one — David 2026-05-28 locked after
the prod audit caught the wrong pattern):**
`scripts/pro-repertoire/rebuild-alapin-plans-hand-authored.mjs`

🚨 **DO NOT use `build-<opening>-plans.mjs` (the auto-annotation
generator) as your reference.** That script emits boilerplate
annotations like `${san} — ${sideName}'s ${pieceName} to ${to} —
data-derived continuation.` which speaks robotically through the TTS
("e-pawn takes d6 — White's pawn captures on d6 — material exchange").
David caught this on the Alapin prod audit and the plans had to be
rebuilt. The hand-authored script is the LOCKED reference; the auto-
annotation script is a research tool that helps you discover the
data-derived continuation, but the annotations you ship MUST be
hand-written.

Per the data from STEP 4, build N plans where N is what the data
shows. Each plan is fully hand-authored as a JSON-like object:

```js
{
  id: 'mp-pro<player><opening>-<plan-name>',
  openingId: 'pro-<player>-<opening>',
  title: '<variation> — <plan name>',
  overview: '<hand-written 2-4 sentence story explaining the plan idea>',
  // setupSans takes the position from the starting position to the
  // PLAN ANCHOR position. The anchor MUST be AT or PAST the opening
  // terminus — never mid-opening (see "Two cardinal rules" below).
  setupSans: ['<the moves that reach the plan anchor>'],
  // moves[] is the playable line shown to the student — typically
  // 4-8 moves of REAL middlegame play from his game data
  moves: ['<middlegame move 1>', '<middlegame move 2>', ...],
  // annotations[i] is HAND-WRITTEN prose explaining the plan's idea
  // at move i. NOT generated. NOT formula. NOT "${piece} to ${square}
  // — data-derived continuation". Real teaching prose specific to
  // what's happening on the board.
  annotations: [
    '<2-4 sentences explaining move 1 in the plan>',
    '<2-4 sentences explaining move 2>',
    ...
  ],
  // learnCues[i] is the ≤8-word echo cue for the Learn mode register
  learnCues: [
    '<≤8 words capturing move 1\'s key idea>',
    ...
  ],
  // declared themes — must match squares the moves[] line lands on
  pawnBreaks: ['<theme strings that name squares the line visits>'],
  pieceManeuvers: ['<theme strings>'],
  strategicThemes: ['<higher-level themes>'],
  endgameTransitions: ['<which endgame structures this plan converts to>'],
  sources: [SRC],
}
```

**The TWO CARDINAL RULES for plan authoring (David 2026-05-28, both
locked after the Alapin prod audit caught violations):**

#### Rule 1 — The plan MUST be anchored AT or PAST the opening terminus

🚨 The "critical position FEN" of a middlegame plan must be a position
where the OPENING IS OVER or just ending. The playable line must walk
MIDDLEGAME play — not restate further opening moves.

**Symptom of violation:** the plan's setupSans is short (8-12 plies),
the moves[] continuation walks the next 4-8 plies of the opening
spine, and the student hears prose like "Now we play Bc4 hitting the
knight on d5 and eyeing f7" — that's STILL teaching the opening, not a
middlegame plan.

**Correct anchor positions** (using the Alapin nf6-main spine as the
reference, 32-ply spine ending at `Qg4 g6`):

- The queenside-crawl conversion plan anchors AFTER `a5` (move 11);
  walks `Nd5 a6 b6 d4 e6 Ne5` — that's middlegame execution of the
  cramping plan
- The exd6 tempo-on-the-queen plan anchors AFTER `d5` by Black (move
  6); walks `exd6 Qxd6 O-O Be6 Bxe6 Qxe6` — that's the late opening
  through to the middlegame transition
- The d5-open Nb5 fork plan anchors AFTER `Be3` (move 7); walks 8
  middlegame moves through the trade-down sequence

**Diagnostic:** if your plan's playable line is the OPENING SPINE
continuation, you have NOT yet authored a middlegame plan — you've
just restated the opening. Reposition the anchor 4-6 plies deeper,
into territory where structural advantages are being CASHED IN, not
SET UP.

#### Rule 2 — Every annotation MUST be hand-written prose

🚨 The build script must NOT auto-generate annotations from piece
name + destination square. Every entry in `annotations[]` is
hand-written, plan-specific teaching prose.

**Symptom of violation:** the prod audit shows TTS speaking
generic-sounding text like "knight to b6 — Black's knight to b6 —
data-derived continuation" or "bishop to b3 — White's bishop to b3 —
data-derived continuation". That's the auto-generator's signature.

**Correct annotations:**

- Are 2-4 sentences each, not 1 fragment
- Reference the SPECIFIC tactical/strategic IDEA at that move
- Cite a game-count or score percentage when relevant ("his 25% pick
  at this position")
- Name the squares/pieces the move CHANGES (not just "X to Y")
- Connect to the plan's overall story (not standalone narration)

Example HAND-AUTHORED annotation from the Alapin queenside-crawl
plan, move 2 (`a6`):

> *"The crawl reaches its destination: a6 fixes Black's b7-pawn
> permanently. Every Black piece now has to consider the b7-weakness
> for the rest of the game. Notice the rook on a1 sees the open
> a-file directly."*

Example WRONG (auto-generated, what NOT to ship):

> *"a6 — White's pawn to a6 — data-derived continuation."*

The hand-authored version is teaching; the auto-generated version is
just describing the move the student already saw on the board.

#### How the build script enforces these rules

The `rebuild-<opening>-plans-hand-authored.mjs` pattern:

1. Each plan in the `PLANS` array contains `setupSans`, `moves`,
   `annotations`, and `learnCues` arrays — all hand-written.
2. The script's job is to VALIDATE (not to author):
   - chess.js validation that setupSans is legal
   - chess.js validation that moves[] is legal from the resulting FEN
   - Length check: `annotations.length === moves.length` (so every
     move has a hand-written annotation)
   - Length check: `learnCues.length === moves.length`
3. Themes (pawnBreaks/pieceManeuvers) are still hand-written but
   MUST match data-derived moves — see the themes-must-match-line
   rule below.

**The themes-must-match-line rule (David 2026-05-28, locked after the
Classical Tartakower mismatch):**

When you derive a continuation from tree data, INSPECT the actual
moves before authoring `pawnBreaks` and `pieceManeuvers`. Declare
themes that the line ACTUALLY demonstrates. Don't author themes that
match your imagination of the position — author themes that match the
data-derived moves.

The `middlegamePlanThemes.test` gate enforces this: the test reads
goal-squares from declared `pawnBreaks` and `pieceManeuvers` strings,
then walks the playable line and checks at least one student move
LANDS on a goal square. Themes that don't match the line → gate fails.

### STEP 10 — Author endgame plans (when data supports them)

The R+min+P endgame is dominant across most variations (22-34% of
decisive games in the Alapin reference). Each endgame plan:
- `id` ending in `-endgame` (the EndgamePlansSection filters by this)
- `criticalPositionFen`: a real endgame position from one of his games
- `playableLines[0]`: a 6-12 move conversion sequence with annotations
- `pawnBreaks`/`pieceManeuvers`: themes the actual conversion demonstrates

**Endgame plans only when data supports — using the WIDER CORPUS.** If
< 10% of decisive games reach a structural endgame, don't fabricate
one. Empty > generic > invented.

### STEP 11 — Common-mistakes / pitfalls

3-5 entries per opening in `src/data/common-mistakes.json` keyed by
`pro-<player>-<opening>`. Each entry:

```json
{
  "fen": "<position FEN where the mistake occurs>",
  "wrongMove": "<SAN of the bad move>",
  "correctMove": "<SAN of the principled reply>",
  "explanation": "<200-400 chars explaining WHY the wrong move fails>",
  "shortNarration": "<≤8-word echo cue>",
  "sources": [
    "<URL from narrationSources allowlist>"
  ]
}
```

Each FEN must be a real position reachable from the data; each
`wrongMove` and `correctMove` must be chess.js-legal from that FEN.

### STEP 12 — Multi-game model games

3-5 model games PER variation. NOT 1 — David's directive: *"wins only.
replace the draws!"*

Use the picker output already on disk:
`data/sources/<player>-trees/<opening>-model-games.json`

For each variation, pick the top games where:
- `studentColor` matches the opening's `color`
- `result` matches student winning (1-0 for white, 0-1 for black)
- `opponentRating` is highest available

Then for each game, hand-author an overview (≥40 chars, NOT
templated, NOT "Full game by X in Y, watch how the pro handles…").
The `isNarratedModelGame` filter checks the overview for boilerplate
patterns; templated games get filtered out at display.

Reference pattern: `scripts/pro-repertoire/build-alapin-model-games.mjs`.

The hand-authored overviews tie each game to the variation's themes
from the lesson — cite the opponent + rating + the specific structural
or tactical pattern the game showcases.

### STEP 12.5 — Route plans to their variation tabs (CRITICAL)

🚨 **This step was missed in the Alapin reference build — David caught
it post-deploy. Plans were authored correctly but ALL surfaced under
the main opening tab; the variation tabs were showing zero plans.**

The fix:

1. Create `src/services/pro<Player><Opening>TabPlans.ts`:
   ```ts
   export const PRO_<PLAYER>_<OPENING>_TAB_PLAN_IDS: Record<string, string[]> = {
     main: ['<plan-id>', '<plan-id>'],
     '<variation name lowercased>': ['<plan-id>'],
     // one entry per variation; [] for variations without plans yet
   };

   export function getPro<Player><Opening>TabPlanIds(
     openingId: string,
     tabKey: string
   ): string[] | null {
     if (openingId !== 'pro-<player>-<opening>') return null;
     return PRO_<PLAYER>_<OPENING>_TAB_PLAN_IDS[tabKey] ?? null;
   }
   ```

   The variation key is the EXACT `variation.name` field from
   `pro-repertoires.json`, lower-cased (including the … character
   U+2026 if used, NOT three dots).

2. Import + register in `src/components/Openings/OpeningDetailPage.tsx`:
   ```ts
   import { getPro<Player><Opening>TabPlanIds } from '../../services/pro<Player><Opening>TabPlans';
   // ...
   const subjectPlanIds =
     // ...existing resolver chain...
     getPro<Player><Opening>TabPlanIds(opening.id, pircTabKey) ??
     // ...
   ```

   **Use `pircTabKey` (the full variation name, NOT `tabKey`)** — the
   display label is sometimes truncated ("Spine 4…d6 Bc4 Ga…") which
   wouldn't match the full-name key. Pirc set this pattern.

3. Verify on prod: navigate to each variation tab + check the
   Middlegame Plans section shows the right plans.

**Reference:** `src/services/proNaroditskyAlapinTabPlans.ts` — the
canonical pro-rep tab-plan resolver.

### STEP 13 — Update proRepertoireOpeningMap.json

If the opening exists as an entry in `src/data/proRepertoireOpeningMap.json`:

```json
{
  "_doc": "...",
  "map": {
    // ...
    "pro-<player>-<opening>": "<canonical-opening-id>"
  }
}
```

The canonical-opening-id is the one tagged in `chess-concepts.json`'s
`openings` map (caro-kann, ruy-lopez, french-defence, italian-game,
etc.). This enables source-verification gating.

If no canonical mapping exists (modern openings like Trompowsky,
Alapin, KIA, etc.), DO NOT add a mapping. The opening is non-mapped
and the proRepertoireSources gate skips it.

### STEP 14 — Bump PRO_DATA_REVISION

```ts
// src/services/dataLoader.ts
const PRO_DATA_REVISION = '<YYYY-MM-DD>-<player>-<opening>-deep-build';
```

This triggers `reconcileProRepertoires()` on already-seeded devices.
Per G8, the reconciler ALSO deletes per-player orphans, so any entries
scrapped from the JSON get cleaned out of Dexie on next boot.

### STEP 15 — Validate

```bash
npx vitest run \
  src/data/lessons/ \
  src/data/pro-repertoires.test.ts \
  src/data/pro-repertoires-orientation.test.ts \
  src/data/proRepertoireSources.test.ts \
  src/data/modelGames.test.ts \
  src/data/modelGames-orientation.test.ts \
  src/data/middlegamePlanThemes.test.ts \
  src/data/commonMistakeNarration.test.ts

npm run ship-check       # must print READY TO PUSH
```

All gates must be green before pushing. The most common trips and
their fixes are catalogued in §4 below.

### STEP 16 — Push to main + 3-instrument audit

```bash
git push origin HEAD:main

# Wait for Vercel (~2-3 min; bundle hash changes when ready)
curl -s "https://chess-academy-pro.vercel.app/?b=$(date +%s)" | grep -oE 'index-[A-Za-z0-9\-]+\.js'

# Run the 3-instrument audit
AUDIT_SANDBOX=1 node scripts/audit-pro-<player>-<opening>-prod.mjs
```

The 3-instrument audit drives:
1. **Playwright** — clicks variation tabs, presses Watch, asserts the
   bigger-board `PlayableLinePlayer` renders, verifies `/api/tts`
   streaming fires
2. **Audit-stream pull** — verifies coach-narration-spoken / voice-
   speak-invoked events emitted from the live app
3. **Local listener sidecar** — captures voice events with source +
   verbosity tag so we know exactly what got spoken

Reference pattern: `scripts/audit-pro-naroditsky-alapin-prod.mjs`.

**Done = audit checks green + voice fires + Dexie has all variations.**

---

## §3. THE GATE ROSTER

Every gate that protects pro-rep content from drift or fabrication.

### Hard-fail gates (block ship)

1. **`pro-repertoires.test.ts`** — PGN legality
   - Every variation's PGN must be chess.js-legal start-to-finish
   - Every trapLine's PGN must be chess.js-legal
   - Every warningLine's PGN must be chess.js-legal
   - The opening's overall PGN must be chess.js-legal
   - The count of openings in the entry array matches the test's
     expected length (update the test when adding entries)

2. **`pro-repertoires-orientation.test.ts`** — trap/warning orientation
   - No warningLine ends with the student up clear material (then it
     would be a trap, not a warning)
   - No entry under either array ends in checkmate AGAINST the student
   - trapLines must end with the student gaining material / decisive
     position (or a known position the data shows is winning)

3. **`proRepertoireSources.test.ts`** — source resolvability
   - Every variation has a non-empty `sources` array
   - EVERY source resolves: `book:<id>` (where `<id>` is in the
     `openings` map of `chess-concepts.json`), OR `concept:<id>`
     (where `<id>` is in `concepts`), OR a URL whose host is in the
     `REPUTABLE_DOMAINS` allowlist (`wikipedia.org`, `chess.com`,
     `chessable.com`, `lichess.org`, `365chess.com`, `chessgames.com`,
     `britannica.com`, `chesstempo.com`, `chessbase.com`, `chess24.com`,
     `thechessworld.com`, `gameknot.com`, `chesspathways.com`)
   - 🚫 youtube.com is NOT in the allowlist — beat text can reference
     his YouTube content via neutral framing, but `sources[]` arrays
     must cite an allowlist domain

4. **`modelGames-orientation.test.ts`** — model game wins-only
   - No model game with `studentSide` set shows that side LOSING or
     DRAWING
   - All games surfaced via `isNarratedModelGame` must have hand-
     authored overviews (≥40 chars, not boilerplate)

5. **`middlegamePlanThemes.test.ts`** — themes match actual moves
   - Each playable line MUST play a student move that LANDS on a
     square named in the plan's `pawnBreaks` or `pieceManeuvers`
     strings
   - No bare-promise endings ("Black is ready for …e5" without
     actually playing …e5)

6. **`commonMistakeNarration.test.ts`** — pitfall narration coverage
   - Every common mistake has both `explanation` and `shortNarration`
   - `wrongMove` and `correctMove` must be chess.js-legal from the
     declared `fen`

7. **`lessonIntegrity.test.ts`** — lesson arrow / highlight legality
   - Arrows never originate from a pawn
   - Arrows have clear sight-lines (no piece blocking)
   - Highlights reference valid squares

### Informational gates (warn but don't block)

8. **Sources allowlist** for narration units — each authored beat
   should cite at least 1 resolvable source

9. **Wider-corpus check** — when claiming a structural pattern, the
   pattern must be supported by ≥10% of games (per wider-corpus
   classification, not just terminus games)

---

## §4. THE FAILURE-MODE CATALOG

Every failure I've personally hit this session + the fix. Read this
before starting any new opening — most of these will trip you too.

### Failure: PGN illegal moves
**Symptom:** `pro-repertoires.test.ts` fails with `'Error: Illegal move "X" at half-move N in: <pgn>'`

**Cause:** authored a variation PGN from memory ("the textbook
continuation is..."), didn't verify with chess.js.

**Fix:** Open chess.js or a local script, play the PGN move-by-move,
find the illegal move, replace with the actual move from the tree's
spineMoves. Never copy-paste a PGN from theory text; always derive
from `deep-build-data.mjs` output.

### Failure: plan annotations are auto-generated boilerplate
**Symptom:** the prod audit (Polly TTS narration capture) shows
each plan beat speaking robotic text like *"e-pawn takes d6 — White's
pawn captures on d6 — material exchange"* or *"knight to b6 — Black's
knight to b6 — data-derived continuation"*. Every annotation sounds
like a formula: `${san} — ${side}'s ${piece} to ${square} —
data-derived continuation.`

**Cause:** the build script auto-generated annotations from piece
name + destination square instead of letting the author write the
narration. The `build-<opening>-plans.mjs` pattern (the FIRST Alapin
build) did this — it walked the tree continuation and wrote prose
per move using a template.

**Fix:** STEP 9 Rule 2 above. Use the `rebuild-<opening>-plans-
hand-authored.mjs` pattern instead — each plan in the `PLANS` array
ships its OWN `annotations[]` and `learnCues[]` arrays, hand-written
per move. The build script's job is to validate chess.js legality
and array-length matches, NOT to author prose.

If you find yourself typing a template like `prose = ${san} — ${side}
... ${pieceName} to ${to} — ...` in a build script, STOP. That's
the boilerplate path. Author the annotations as data instead.

### Failure: plan restates opening play instead of middlegame
**Symptom:** the plan's playable line walks moves that are STILL
part of the opening spine — the student hears prose teaching opening
ideas (e.g. "Bc4 hits the knight on d5 AND eyes f7") when the plan
was supposed to teach a middlegame conversion.

**Cause:** the plan's `setupSans` is short (8-12 plies, mid-opening)
and the `moves[]` continuation walks the next 4-6 plies of the
opening. The plan is sitting INSIDE the opening phase instead of
past it.

**Fix:** STEP 9 Rule 1 above. Reposition the plan's anchor 4-6
plies deeper — into the position where the opening's structural
advantages are about to be CASHED IN, not SET UP. Use the
middlegame-past-spine analysis (see STEP 4 + the
`middlegame-past-spine-<opening>.mjs` template) to find the actual
middlegame moves his games play past the opening terminus, then
walk THOSE in the playable line.

**Diagnostic:** ask "is the line in this plan teaching the student
HOW to enter this opening, or what to do AFTER they've reached the
middlegame?" If it's the first, you have an opening lesson disguised
as a plan. Reanchor.

### Failure: theme-empty plan
**Symptom:** `middlegamePlanThemes.test.ts` fails with
`mp-<id>#0 {"themeEmpty":true}`.

**Cause:** declared `pieceManeuvers` like "Nd7 → Nf8 → Ng6 reroute"
but the tree-derived continuation starts with `O-O h4 Nf4`. The
themes don't match the moves.

**Fix:** Inspect the actual moves the build script produced BEFORE
authoring themes. Edit `pawnBreaks` and `pieceManeuvers` to name
squares the line ACTUALLY plays into. The themes-must-match-line
rule is in STEP 9 above.

### Failure: source unresolvable
**Symptom:** `proRepertoireSources.test.ts` fails listing variations
"missing a resolvable source".

**Cause:** cited `book:sicilian-alapin` but `sicilian-alapin` is in
`chess-concepts.json`'s `openingDefinitions`, NOT in the `openings`
map that `bookOpenings` is built from. Modern openings (Trompowsky,
Alapin, KIA, Pirc Austrian, etc.) generally don't have book corpus
entries.

**Fix:** Drop the `book:<id>` ref and rely on URL sources from the
allowlist domains. Don't ever cite YouTube URLs (not allowed). The
Naroditsky Alapin Bc4-Gambit variation hit this exact bug.

### Failure: wider-corpus underestimate
**Symptom:** declared "no endgame plans" because the 3-4 terminus
games happened not to reach an endgame. David caught this on the
Fantasy Caro after I had moved on.

**Cause:** ran endgame classification on terminus games only, not
the wider variation corpus. The terminus is for spine construction;
endgame distribution needs the FULL prefix-matching corpus
(hundreds of games).

**Fix:** Use the wider-corpus script template
(`wider-corpus-endgame-alapin.mjs`), adapt to the new opening's
prefixes, run across ALL games matching the variation prefix. Bucket
endgame types at the final position. Anything ≥10% across the wider
corpus is a candidate plan.

### Failure: variation tabs show smaller board
**Symptom:** clicking a variation tab on `/openings/pro/<player>/<opening>`
shows a small board with eval bar on the right (the legacy
`WalkthroughMode`), not the consistent bigger board.

**Cause:** the variation has a `name` in `pro-repertoires.json` but
no matching key in the `VARIATION_LESSONS` map. The fallback is
intentional for non-curated openings but undesired for the deep build.

**Fix:** Author a `LessonScript` for each variation, export from
`pro<Player><Opening>Variations.ts`, register in
`lessons/index.ts`. The record key must EXACTLY match
`pro-<player>-<opening>::<variation.name>`.

### Failure: pro-rep entry count test
**Symptom:** `pro-repertoires.test.ts` fails:
`expected length 91 but got 89`.

**Cause:** added or removed entries; didn't update the test count.

**Fix:** Read the test's expected count in `pro-repertoires.test.ts`,
update to the new count, update the comment explaining what's in
the count.

### Failure: variation pgn matched 0 games in deep-build
**Symptom:** running `deep-build-data.mjs <player> <opening> <variation>`
prints `Games matched: 0`.

**Cause:** the variation prefix is too long or includes a move that
isn't in the tree's most-played path. Or you confused a sub-branch
inside the spine with a Black 2nd-move alternative.

**Fix:** Inspect the tree's `variations` array to see the
`prefixToHere` and `branchSan` for each branch. Build the variation
prefix as `minPrefix + prefixToHere + [branchSan]` to match the
exact data path.

### Failure: trap line "TOOTHLESS"
**Symptom:** `pro-repertoires-orientation.test.ts` flags a trap line
as `TOOTHLESS_WARNING` — the PGN doesn't end with the student up
material.

**Cause:** the trapLine PGN doesn't go far enough — stops mid-tactic
before the material is won.

**Fix:** Extend the PGN with the rest of the punish sequence, or
move the entry to `warningLines[]` (where the student LOSING is the
expected outcome).

### Failure: claimed verbatim quote from YouTube transcript
**Symptom:** the build authors a beat narration with quotation
marks around a "his words" passage but the URL doesn't actually
back the quote.

**Cause:** YouTube transcripts are blocked from the sandbox.
Authored "what he probably said" instead of "what he actually said."

**Fix:** Drop the verbatim quotation marks. Use neutral framing:
"per his speedrun coverage" / "in his style" / "consistent with
his approach." The URL can stay in `sources[]` to prove the video
exists, but don't claim verbatim text without transcript backing.

### Failure: plans authored but all shown on main tab
**Symptom:** all middlegame plans surface under the main opening tab;
variation tabs show "no plans for this scope" (or worse, the
`emptyNote` fallback). David caught this on the Alapin post-deploy.

**Cause:** the plan's `openingId` is `pro-<player>-<opening>` but
that's the OPENING-WIDE id. The OpeningDetailPage filters by
`filterPlanIds` per tab, which is computed by a chain of
`get<Opening>TabPlanIds(openingId, tabKey)` resolvers. No
pro-rep-specific resolver existed.

**Fix:** STEP 12.5 above — create a `pro<Player><Opening>TabPlans.ts`
resolver mapping each variation name (lowercased) to its plan IDs;
register it in `OpeningDetailPage.tsx` using `pircTabKey` (the full
variation name).

### Failure: fabricated trap content from "typical opening tactical patterns"
**Symptom:** trap entries that look reasonable as chess BUT don't
appear in the player's actual chess.com archive when you check the
miner output. Detected post-hoc when David asks "how many were found
by mining?" and the miner returns ZERO matches for your authored
patterns.

**Cause:** rationalizing fabrication as "based on common Alapin
[or whatever] tactical motifs." The §1 cardinal rule says no
fabrication; the §1a TRAP RULE says traps must be mined. Authoring
"Nxe5 pawn grab" / "premature Nxe4" / "Wing-grab Qxb2" from chess
intuition violates BOTH rules.

**Fix:** §1a + §1b + STEP −1 above. The miner runs FIRST. Top
patterns get authored. If the miner doesn't surface a pattern, that
pattern does not exist for this build. Delete it.

### Failure: endgame plan moves illegal because composed from memory
**Symptom:** the build script for plans fails with `Invalid move:
<SAN>` at move 2 or 3 of the endgame plan continuation. Multiple
endgame plans broke this way in the Alapin build (Nc1 from a knight
on e1, Rb3 illegal due to position state, Bd6 to a square already
occupied by a bishop, Bh6 to a square already occupied).

**Cause:** I was writing the endgame plan's `moves` array by
composing "the natural continuation from this FEN" rather than
extracting the literal next-N-plies of the actual game past the
anchor position.

**Fix:** ALWAYS use `extract-game-positions-<player>-<opening>.mjs`
to pull the next 6-8 plies past the anchor FEN. Paste them verbatim
into the plan. The endgame plan is anchored at ONE specific real
game; the moves come from THAT game's continuation, not your
composition.

### Failure: warning line shows the CORRECT sequence not the wrong one
**Symptom:** the warning line's PGN walks the move sequence Black
SHOULD play / White SHOULD play, ending at a fine position. The
warning becomes useless — the student watches the GOOD move sequence
while being told it's the bad one. (The "Voluntary Bb3 Trade"
warning had this exact bug.)

**Cause:** authoring warningLines by walking the main continuation
of the variation and labeling it "wrong." The author conflates
"the line where the warning trigger appears" with "the line showing
the bad move + bad consequence."

**Fix:** every warning's PGN must walk the WRONG MOVE through to a
position where the student is structurally WORSE OFF (or up
material if the warning is about Black slipping into a trap). The
explanation walks: ERROR (the bad move named explicitly) →
CONSEQUENCE (the position the PGN ends at, where the student is
visibly worse) → FIX (what to play instead). If the PGN ends at a
position where material is even / position is equal, the warning
doesn't show the consequence and should be rewritten.

### Failure: middlegame plan anchored at beat N of M (mid-opening) instead of M of M (spine end)
**Symptom:** the student opens a "middlegame plan" and the
playable line just walks the next 4-6 moves of the opening spine
they already saw in the variation lesson. The plan teaches NOTHING
new — it restates the opening.

**Cause:** I set the plan's `setupSans` to a short prefix (e.g.
12-15 plies, mid-opening), then `moves` walked the next 4-6 plies
of the spine. So the "plan" was a continuation of the OPENING, not
the MIDDLEGAME.

**Fix:** STEP 9 Rule 1 — `setupSans` MUST reach the full variation
spine end (where the opening terminus is). `moves` then walks 4-6
plies of REAL MIDDLEGAME play from one of the player's actual game
continuations past that position (sourced from
`extract-game-positions-...mjs`).

### Failure: auto-generated annotation boilerplate ("X — data-derived continuation")
**Symptom:** the prod audit shows TTS speaking robotic prose like
"e-pawn takes d6 — White's pawn captures on d6 — material
exchange" for every move. Sounds like a formula because it is one.

**Cause:** the build script auto-generated annotations from
`${san} — ${side}'s ${piece} to ${square} — data-derived
continuation.` Templates.

**Fix:** STEP 9 Rule 2 — every plan's `annotations[]` is HAND-WRITTEN
data in the build script's `PLANS` array, not generated. The build
script's job is to chess.js-validate and emit JSON; never to
author prose.

### Failure: narration claims chess facts that aren't true (Nb5 attacks the queen)
**Symptom:** the narrationFactCheck gate fires with
`claim "X attacks Y" — piece on <sq> does NOT attack any enemy Y`.

**Cause:** I wrote prose like "the knight attacks the queen"
without verifying with chess.js that the knight's attack set
includes a queen's square. Knight squares are NOT intuitive (the
knight on b5 attacks a3/a7/c3/c7/d4/d6 — NOT d5 where the queen
sat).

**Fix:** §1c — run chess.js BEFORE authoring narration. Inspect
the attack set with `chess.attackers(targetSq, color)` reversed.
Then write prose that matches the actual attacks. The
`narrationFactCheck` gate catches violations post-hoc.

### Failure: used the M-word in pro-rep work
**Symptom:** session loops — David corrects you, you apologize, you
slip again 3 messages later.

**Cause:** read `CLAUDE.md` G9's phrase "look and feel like
masterclass" and started using "masterclass" as a quality adjective.

**Fix:** §0 vocabulary lock above. Catch yourself, delete the
sentence, rewrite. The discipline IS the fix.

---

## §5. THE FILE-MANIFEST CHECKLIST

Every artifact that should exist when a pro-rep deep build is "done."

- [ ] `data/sources/<player>-chesscom/*.jsonl` — raw archives (gitignored)
- [ ] `data/sources/<player>-trees/<opening>.json` — extracted tree
- [ ] `data/sources/<player>-trees/<opening>-model-games.json` — picks
- [ ] `data/sources/<player>-deep/<opening>-<variation>.json` — per variation (one file per data-supported variation)
- [ ] `data/sources/<player>-voice/per-opening/<opening>.md` — voice corpus
- [ ] `scripts/pro-repertoire/extract-opening-tree.mjs` — opening added to OPENINGS map
- [ ] `scripts/pro-repertoire/deep-build-data.mjs` — variations added to OPENINGS map
- [ ] `scripts/pro-repertoire/wider-corpus-endgame-<opening>.mjs` — adapted from Alapin template
- [ ] `scripts/pro-repertoire/count-plans-<opening>.mjs` — adapted from Alapin template
- [ ] `scripts/pro-repertoire/middlegame-past-spine-<opening>.mjs` — finds real middlegame patterns past the opening terminus (STEP 4 / STEP 9 Rule 1)
- [ ] `scripts/pro-repertoire/rebuild-<opening>-plans-hand-authored.mjs` — middlegame plan build with HAND-WRITTEN annotations (NOT the auto-annotation `build-<opening>-plans.mjs` pattern, which is banned per STEP 9 Rule 2)
- [ ] `scripts/pro-repertoire/build-<opening>-model-games.mjs` — generates model games
- [ ] `scripts/audit-pro-<player>-<opening>-prod.mjs` — 3-instrument audit
- [ ] `src/data/lessons/pro<Player><Opening>Variations.ts` — variation lessons
- [ ] `src/data/lessons/index.ts` — imports + spread
- [ ] `src/data/pro-repertoires.json` — entry with 4-8 variations + traps + warnings
- [ ] `src/data/middlegame-plans.json` — plans (one per data-supported cluster)
- [ ] `src/data/model-games.json` — 3-5 games per variation (real wins, hand-authored)
- [ ] `src/data/common-mistakes.json` — 3-5 pitfalls under the openingId key
- [ ] `src/services/pro<Player><Opening>TabPlans.ts` — variation→plan-ids resolver (STEP 12.5)
- [ ] `src/components/Openings/OpeningDetailPage.tsx` — import + add resolver to the chain
- [ ] `src/data/proRepertoireOpeningMap.json` — mapping if classical opening
- [ ] `src/services/dataLoader.ts` — `PRO_DATA_REVISION` bumped

---

## §6. THE REFERENCE BUILD

When in doubt about how something should look, consult the **Naroditsky
Alapin build** (shipped 2026-05-28 against this doctrine). The build
files in their canonical form:

- Tree: `data/sources/danielnaroditsky-trees/alapin-sicilian.json`
- Deep-build per variation: `data/sources/danielnaroditsky-deep/alapin-sicilian-{nf6-spine,d5-open,e6-french,d6-mainline,g6-dragon,nc6-line,nf6-d6-sub,nf6-e6-sub}.json`
- Voice: `data/sources/danielnaroditsky-voice/per-opening/alapin.md`
- Variation lessons: `src/data/lessons/proNaroditskyAlapinVariations.ts` (7 variations × 7-12 beats)
- Main spine lesson: `PRO_NAR_ALAPIN_LESSON` in `proNaroditskyAllRemaining.ts` (12 beats)
- Pro-rep entry: `pro-naroditsky-alapin` in `src/data/pro-repertoires.json` (7 variations + 3 trapLines + 2 warningLines)
- Plans: 8 entries in `src/data/middlegame-plans.json` matching `pro-naroditsky-alapin` — REBUILT 2026-05-28 with hand-written annotations + post-opening anchors (see `scripts/pro-repertoire/rebuild-alapin-plans-hand-authored.mjs` — the LOCKED reference for STEP 9)
- Plan→tab routing: `src/services/proNaroditskyAlapinTabPlans.ts` (STEP 12.5)
- Middlegame-past-spine analysis: `scripts/pro-repertoire/middlegame-past-spine-alapin.mjs` (the data discovery tool for STEP 9 Rule 1)
- Model games: 12 real wins in `src/data/model-games.json` matching `pro-naroditsky-alapin` (incl. Carlsen, Hikaru ×2, Firouzja ×2, Hans Niemann, Wesley So)
- Pitfalls: 4 entries in `src/data/common-mistakes.json` under `pro-naroditsky-alapin`
- Audit: `scripts/audit-pro-naroditsky-alapin-prod.mjs` (13 PASS / 0 FAIL / 5 WARN on first prod run)

The **Naroditsky Caro-Kann build** is the other deep-build reference,
shipped earlier. It additionally demonstrates per-variation endgame
plans (R+P conversions) that the Alapin build deferred.

---

## §7. WHAT TO DO IF SOMETHING DOESN'T FIT THIS PROCEDURE

The doctrine is a default, not a cage. If the player has unusual data
characteristics (e.g. very few games, multiple distinct repertoires
across time periods, openings the tree extractor doesn't recognize):

1. **Note the deviation in the commit message and a TODO in the lesson
   file's header comment.**
2. **Build what the data supports, drop what it doesn't.** Empty >
   generic > invented.
3. **Flag it to David for review** before pushing.

Specifically:
- If a player has < 50 games in an opening, the variation count
  threshold (STEP 2 part a) may need to drop to "≥10 games" to
  surface meaningful sub-lines.
- If a player has < 5 winning games per variation, the multi-game
  model games rule (STEP 12) drops to "as many as the data shows."
- If voice corpus is sparse (no Lichess study, no third-party blog
  coverage), beat narration leans more on data-fingerprint citations
  ("his X% pick at this position") and less on paraphrased voice
  framing.

The cardinal rules (§1 NO FABRICATION, §0 VOCABULARY LOCK) NEVER
flex. The procedural steps flex where the data requires.

---

## §8. ENDING THE SESSION

When the build is "done" per the file-manifest checklist:

1. Commit the work with a structured message:
   ```
   feat(pro-rep): <player> <opening> G9.1 deep build — N variations + M plans + traps

   - data extraction: <bullet list>
   - per-variation lessons: <bullet list of variations + beat counts>
   - pro-repertoires.json: <variation count> + <trap count> + <warning count>
   - middlegame plans: <count> new plans
   - model games: <count> real wins (top opponents)
   - common-mistakes: <count> pitfalls
   - gates: all green / ship-check READY TO PUSH

   PRO_DATA_REVISION → <date>-<player>-<opening>-deep-build
   ```

2. Push to `main` (NOT a feature branch — per CLAUDE.md deployment
   policy, the harness branch default is overridden by the
   standing-permission to push to main).

3. Wait for Vercel deploy (~2-3 min; bundle hash changes).

4. Run the 3-instrument audit. Report PASS/FAIL/WARN counts to David.

5. If any FAIL: investigate the root cause, fix, re-push, re-audit.
   Don't claim "shipped" until the audit is green.

6. Update CLAUDE.md's PRO-REP DEEP BUILD section if any new failure
   mode was discovered (per "any mistake like that you find, plug
   in the fix to rules" — David 2026-05-28).

---

**End of doctrine. The Alapin build IS the proof this works.**
