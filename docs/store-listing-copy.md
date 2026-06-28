# Store Listing Copy — Chess Academy Pro (FINALIZED)

Ready-to-paste copy for **Google Play** and the **Apple App Store**, with every
specific numeric claim verified against the shipped data so a store reviewer
can't flag an unverifiable specific.

Resolves the TODO in `LAUNCH_PLAYBOOK.md` §5.

---

## Verification table — every specific claim → real number → source

| Claim in copy | Verified number | How counted | Source file |
|---|---|---|---|
| Tactics / puzzles | **15,000** (we say "thousands of") | `puzzles.json` is a flat array, `.length === 15000`; imported as the live bank by 9 services incl. `puzzleService.ts` | `src/data/puzzles.json` |
| Distinct tactical themes (forks, pins, skewers, sacs, mating nets…) | **72** | every one of the 15,000 puzzles carries `themes`; `new Set(themes)` = 72 distinct | `src/data/puzzles.json` |
| Opening lines in the database | **3,654** | flat array `.length` | `src/data/openings-lichess.json` |
| Guided opening masterclasses (curated WLPP repertoires) | **42** (we say "dozens") | array `.length`; also = 42 `main:` entries in the masterclass gate registry `OPENINGS[]` | `src/data/repertoire.json` + `src/data/lessons/registry.ts` |
| Curated lessons registered (main + variation) | **130 main**, 129 variation-lesson sets | `.openingId]:` registrations + `..._VARIATION_LESSONS` spreads in the LESSONS map | `src/data/lessons/index.ts` |
| Pro-player repertoires | 15 players / 81 openings | `pro-repertoires.json` `players.length`=15, `openings.length`=81 | `src/data/pro-repertoires.json` |
| Model games (student-side wins) | **570** | array `.length` | `src/data/model-games.json` |
| Middlegame plans | **520** | array `.length` | `src/data/middlegame-plans.json` |
| Opening pitfalls / common mistakes | 125 openings covered | object keys `.length` | `src/data/common-mistakes.json` |
| Punish-gems (tactical traps in lines) | 296 | array `.length` | `src/data/punish-gems.json` |
| Pro game references (coach breadth corpus) | 2,209 | array `.length` | `public/data/pro-game-references.json` |
| Mating patterns | 37 | array `.length` | `src/data/mating-patterns.json` |
| Real-master-game sourcing | TRUE | masters DB ships in `public/data/`; spines are data-built from it | `public/data/openings-masters-db.json`, `openings-lichess-spine.json` |
| Full-strength Stockfish, local | TRUE | Stockfish 18 WASM runs in a Web Worker on-device | `package.json` (`stockfish 18.0.5`), `stockfishEngine.ts` |
| Rating-adaptive puzzle difficulty | TRUE | every puzzle has a `rating`; difficulty bands resolve per user rating | `src/data/puzzles.json`, puzzle services |
| Spaced repetition | TRUE | Dexie SRS engine | `srsEngine.ts` |
| Kids mode | TRUE | dedicated `/kid/*` surfaces | `src/components/Kid/` |

### Claims SOFTENED / changed from the draft

- **"thousands of … tactics puzzles"** — KEPT. 15,000 is literally thousands.
  (We could say "15,000" but a round "thousands of" is safer against future
  data churn and still true.)
- **"millions of real master games"** — SOFTENED to **"hundreds of thousands
  of real master games."** We can't independently substantiate "millions" from
  the shipped artifacts; the masters DB + spine are derived from a large master
  corpus but the on-disk position aggregates don't prove a 7-figure game count.
  "Built from real master games" is the safe, true core claim.
- **"From your first opening to your first 2000"** — SOFTENED. "2000" reads as
  a specific rating promise we don't measure or guarantee. Replaced with
  **"from your first opening to advanced play"** / "from beginner to club
  strength" — true, non-numeric, non-promissory.
- **"Every game you play is analyzed"** — KEPT but phrased as the loop intent
  (Stockfish review → mistakes → weaknesses → next session), which the app does.

### Privacy / data-flow note (do NOT over-claim)

The app runs **Stockfish locally** (WASM, on-device). But voice and chat are
**not** on-device: TTS goes to **AWS Polly**, the coach LLM goes to
**DeepSeek + Anthropic**, product analytics go to **PostHog**, and cloud sync
is **optional BYO-Supabase**. So copy must NOT say "your data never leaves your
device." The accurate phrasing used below: **"engine analysis runs on your
device; the AI coach's voice and chat are powered by secure cloud services."**

---

# GOOGLE PLAY

### App title (≤30 chars)
```
Chess Academy Pro: AI Coach
```
*(27 chars)*

### Short description (≤80 chars)
```
Your AI chess coach: learn openings, drill tactics, fix weaknesses, improve.
```
*(76 chars)*

### Full description (≤4000 chars — keyword-rich, human)

```
Chess Academy Pro — your AI chess coach

Learn chess the way a grandmaster would teach you: out loud, move by move, with the board lighting up exactly where to look. Chess Academy Pro is an AI-powered chess coach that talks you through every opening, tactic, and endgame — pointing arrows at the threats, naming the plan, and adapting to your level as you improve.

ONE CONNECTED TRAINING LOOP — NOT A PILE OF FEATURES
Most chess apps hand you puzzles in one corner and openings in another and leave you to figure out what to study. Chess Academy Pro closes the loop. The games you play are analyzed, your mistakes are sorted into the patterns you keep missing, and those weaknesses flow straight into your next puzzles, openings, and lessons. Spaced repetition brings the hard ones back until they stick, the coach teaches the idea behind each one, and your progress feeds the next session. Learn, play, identify your weaknesses, drill them shut — a complete training loop that always knows what you should work on next.

OPENINGS THAT TEACH, NOT MEMORIZE
Dozens of openings are built into guided masterclasses. Watch the coach narrate the main line, then Learn it move by move, Practice it in silence, and Play it against the engine — all on one screen. The lines aren't pulled from a dusty book; they're built from real master games, so you study what strong players actually play. Lead-the-eye arrows and highlights move your attention to the right square as the coach speaks, so you understand the idea instead of just copying moves. Explore over 3,000 opening lines, complete with middlegame plans, model games, traps, and the pitfalls to avoid.

TACTICS AND PUZZLES THAT STICK
Train with thousands of tactics puzzles — forks, pins, skewers, sacrifices, mating nets, and dozens more themes — backed by spaced repetition so the patterns you miss come back until they're automatic. Difficulty adapts to your rating, keeping every puzzle in the sweet spot between too easy and too hard.

REAL ANALYSIS, REAL FEEDBACK
A full-strength Stockfish engine reviews your games, finds your mistakes, and the coach explains why a move was wrong and what to play instead — in plain language, not engine jargon. Those mistakes don't just disappear; they become the weaknesses your training loop targets next.

ENDGAMES, MIDDLEGAME PLANS, AND MORE
Master the rook, pawn, and minor-piece endgames that decide real games. Learn the middlegame plans that flow naturally out of your openings, and study the traps and tactical shots hiding in every line — each one taught with the same voice-guided, arrow-led clarity.

BUILT FOR EVERY LEVEL
From your first opening to advanced play, the coach meets you where you are and pushes you forward. There's even a dedicated kids mode with friendly, encouraging lessons designed for young players.

A NOTE ON PRIVACY
Engine analysis runs on your device. The AI coach's voice and chat are powered by secure cloud services so the coaching feels natural and responsive. Cloud sync is optional.

Chess Academy Pro is the coach in your pocket that never gets tired of explaining — and never loses track of what you need to work on. Install it, pick an opening, and start improving today.

Keywords: chess, chess coach, chess trainer, learn chess, chess openings, chess tactics, chess puzzles, endgames, Stockfish analysis, chess lessons, improve at chess, chess strategy.
```
*(~3,250 chars — within the 4,000 limit; keyword line at the end aids Play search indexing.)*

---

# APPLE APP STORE

iOS does **not** index the description for search — so the body front-loads the
hook, and the discoverability lives in the 100-char **keyword field**.

### App name (≤30 chars)
```
Chess Academy Pro: AI Coach
```
*(27 chars)*

### Subtitle (≤30 chars)
```
Learn, drill & improve at chess
```
*(31 → use:)* 
```
Learn, drill, improve at chess
```
*(30 chars)*

### Promotional text (≤170 chars — editable any time, no review)
```
Your AI chess coach talks you through every opening, tactic, and endgame — arrows on the board, plans named, difficulty adapting to your level as you improve.
```
*(157 chars)*

### Keyword field (≤100 chars — comma-separated, NO spaces, no repeats from name/subtitle)
```
opening,tactics,puzzle,endgame,trainer,grandmaster,stockfish,analysis,strategy,lesson,study,checkmate
```
*(100 chars exactly — "chess", "coach", "learn", "drill", "improve" omitted because they're already in the app name/subtitle, which Apple also indexes.)*

### Description (front-loaded hook first)

```
Your AI chess coach that talks you through every move.

Chess Academy Pro teaches chess out loud, move by move, with the board lighting up exactly where to look — arrows on the threats, the plan named, the difficulty adapting to your level. It's the coach in your pocket that never gets tired of explaining, and never loses track of what you need to work on next.

ONE CONNECTED TRAINING LOOP
The games you play are analyzed, your mistakes are sorted into the patterns you keep missing, and those weaknesses flow straight into your next puzzles, openings, and lessons. Spaced repetition brings the hard ones back until they stick. Learn, play, identify your weaknesses, drill them shut.

OPENINGS THAT TEACH, NOT MEMORIZE
Dozens of openings come as guided masterclasses: Watch the coach narrate the main line, Learn it move by move, Practice in silence, then Play it against the engine — all on one screen. Lines are built from real master games, with over 3,000 opening lines, middlegame plans, model games, and traps. Lead-the-eye arrows move your attention to the right square as the coach speaks.

THOUSANDS OF TACTICS THAT STICK
Train forks, pins, skewers, sacrifices, and mating nets with spaced repetition, difficulty adapting to your rating automatically.

REAL ANALYSIS
A full-strength Stockfish engine reviews your games and the coach explains, in plain language, why a move was wrong and what to play instead.

ENDGAMES, PLANS & A KIDS MODE
Master the endgames that decide games, learn the middlegame plans that grow out of your openings, and hand the dedicated kids mode to a young player.

Engine analysis runs on your device; the AI coach's voice and chat are powered by secure cloud services. Cloud sync is optional.

Pick an opening and start improving today.
```

---

## Screenshot tagline / subtitle (use on both stores' screenshot frames)

> **Learn, play, identify your weaknesses, drill them shut.**

Alternate shorter frame captions (pick per screenshot):
- "Your AI chess coach — out loud, move by move."
- "Openings that teach, not memorize."
- "Thousands of tactics. Spaced repetition. Adapts to you."
- "Stockfish review, explained in plain language."
- "Arrows lead your eye. The coach names the plan."

---

## Character-count quick reference

| Field | Limit | Used |
|---|---|---|
| Play — app title | 30 | 27 |
| Play — short description | 80 | 76 |
| Play — full description | 4000 | ~3,250 |
| App Store — app name | 30 | 27 |
| App Store — subtitle | 30 | 30 |
| App Store — promotional text | 170 | 157 |
| App Store — keyword field | 100 | 100 |

*All specific numbers above are verified — see the verification table at the top.
"Dozens" = 42 masterclasses, "over 3,000 lines" = 3,654, "thousands of puzzles"
= 15,000. Nothing is rounded UP past what the data supports.*
