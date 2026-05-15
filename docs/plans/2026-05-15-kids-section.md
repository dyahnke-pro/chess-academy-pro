# Kids Section — Plan

**Status:** design approved, implementation pending.
**Date:** 2026-05-15.
**Owner:** Claude (driving), David (decisions).
**Branch:** `claude/kids-section-review-MATFl`.

This plan governs every change to `/kid/*` until it lands. Updated as
work progresses. Decisions live in the log at the bottom.

---

## Vision

The kid section is a self-contained, adult-app-isolated chess school
for one specific kid (David's brother). Six pieces, each with its
own hub. Each hub has two layers: **sandbox games** (move-this-piece-
around challenges) and **puzzles** (find-the-move using only this
piece). Both layers scale with the kid:

- **Puzzles** are fully adaptive (ELO-based, drawn from the Lichess
  DB + a hand-curated sub-400 training pool we will build).
- **Sandbox games** step in 5-level bands (1-5 easy, 6-10 medium,
  11-15 hard, 16-20 expert) — banded rather than continuously
  adaptive because there's no game-data DB in the wild to mine.

The kid never sees adult-app personality, never hears an edgy coach
voice, never touches LLM-generated chess content that could swear,
hallucinate, or invent illegal moves at him. The board is simpler
than the adult board (no eval bar, no PGN, no arrows-on-hover).
Text is bigger. Praise is allowed but only on real milestones, not
every move.

---

## Site map (end-state)

```
/kid                                       Kid hub (Dashboard-style 2-col grid)
├── /kid/journey                           Pawn's Journey (story curriculum)
│   └── /kid/journey/:chapterId            One chapter (lessons + DB-anchored puzzles)
├── /kid/fairy-tale                        Fairy Tale Quest (alt story curriculum)
│   └── /kid/fairy-tale/:chapterId
├── /kid/puzzles                           Puzzle Quest (general tactics, adaptive)
├── /kid/play-games                        Guided Famous Games (5 of them, story-led)
│   └── /kid/play-games/:gameId
│
├── /kid/pawn-games        (RENAMED from /kid/mini-games)    Pawn hub
│   ├── /kid/pawn-games/sandbox/:gameId/:level
│   └── /kid/pawn-games/puzzles            (filtered Lichess pawn puzzles, adaptive)
├── /kid/rook-games                                          Rook hub
│   ├── /kid/rook-games/sandbox/:gameId/:level
│   └── /kid/rook-games/puzzles
├── /kid/knight-games                                        Knight hub
│   ├── /kid/knight-games/sandbox/:gameId/:level
│   └── /kid/knight-games/puzzles
├── /kid/bishop-games      (NEW, replaces in-place setView)  Bishop hub
│   ├── /kid/bishop-games/sandbox/:gameId/:level
│   └── /kid/bishop-games/puzzles
├── /kid/queen-games                                         Queen hub
│   ├── /kid/queen-games/sandbox/:gameId/:level
│   └── /kid/queen-games/puzzles
└── /kid/king-games        (NEW, replaces 2 loose tiles)     King hub
    ├── /kid/king-games/sandbox/:gameId/:level
    └── /kid/king-games/puzzles
```

Every piece hub has **identical shape**: one tile per sandbox game
with a level grid (showing 5-level bands), plus a single "Puzzles"
tile that opens an adaptive puzzle session filtered for that piece.

---

## Per-piece game spec (20 levels each, 5-level bands)

Each band has 5 levels. Levels within a band share a mechanic with
parameter increases (board size, distractor count, target count,
par moves). Game vocabulary synthesized from chess-teaching
literature (Acorn Chess, Korpalski, Randolph "Teaching Chess the
Easy and Fun Way", Exeter Chess Club, Little Chess Champs).

### ♟ Pawn — `/kid/pawn-games`

| Band | Levels | Games |
|---|---|---|
| Easy 1-5 | Pawn Parade (1v1 + 1v2 races) | one pawn, no captures yet |
| Med 6-10 | Pawn Wars (4v4 → 8v8) (existing) | full captures, no king |
| Hard 11-15 | Blocker (existing), Stop-the-Pawn (defender role) | one pawn racing, kid defends |
| Expert 16-20 | En Passant Drills, King & Pawn Wars, Pawn Chain Builder | tactical pawn structure |

### ♜ Rook — `/kid/rook-games`

| Band | Levels | Games |
|---|---|---|
| Easy 1-5 | Rook Maze (small) (existing), Rook Roads | navigate, no captures |
| Med 6-10 | Row Clearer (existing), Rook Snooker | capture in fewest / specific order |
| Hard 11-15 | Rook Rout (rook vs many pawns), Cat & Mouse (Rook n' Pawns) | tactics + defense |
| Expert 16-20 | Two-Rook Roller (mate vs lone king), Rook Tour (8×8), Back-Rank Patrol | coordination + mate |

### ♞ Knight — `/kid/knight-games`

| Band | Levels | Games |
|---|---|---|
| Easy 1-5 | Knight Hops (single L-moves to a target) | piece-movement fluency |
| Med 6-10 | Leap Frog (existing), Hungry Knight (small board) | obstacle awareness |
| Hard 11-15 | Knight Sweep (existing), Knight Snooker, Fork the King & Queen | tactics |
| Expert 16-20 | Knight Tour (5×5 → 8×8), Cat & Mouse (Knight n' Pawns), Outpost Drills | full mastery |

### ♝ Bishop — `/kid/bishop-games` (NEW HUB)

Replaces the in-place `setView` rendering in `KidModePage.tsx:118-124,303-346`.

| Band | Levels | Games |
|---|---|---|
| Easy 1-5 | Diagonal Maze, Bishop Rails | navigate diagonals |
| Med 6-10 | Bishop vs Pawns (existing), Light/Dark-square drills | captures on color |
| Hard 11-15 | Color Wars (existing), Cat & Mouse (Bishop n' Pawns) | two-bishop coord |
| Expert 16-20 | Two-Bishop Mate (vs lone king), Bishop Three-Check, Long Diagonal Defender | endgame patterns |

### ♛ Queen — `/kid/queen-games`

| Band | Levels | Games |
|---|---|---|
| Easy 1-5 | Queen Maze, Queen Tour | freedom of movement |
| Med 6-10 | Queen Sweep, Queen vs Army (existing, easy band) | hungry pattern |
| Hard 11-15 | Queen's Gauntlet (existing), Queen Snooker, Cat & Mouse | tactical |
| Expert 16-20 | King Hunt (mate-in-N), Avoid the Knights, Queen Fork Frenzy | hardest patterns |

### ♚ King — `/kid/king-games` (NEW HUB)

Replaces the two loose tiles at `KidModePage.tsx:369-407`.

| Band | Levels | Games |
|---|---|---|
| Easy 1-5 | King Maze (find safe square), King March (existing) | basic king movement |
| Med 6-10 | King Escape (existing), Stay-Out-of-Check | check awareness |
| Hard 11-15 | Opposition Drills, K+P vs K endgame | endgame theory |
| Expert 16-20 | Castle Run (under threat), The King's Walk (full-board), Stalemate Tracker | full-board king |

**Total: 6 × 20 = 120 sandbox levels.** Combined with adaptive
puzzles drawn from a re-curated 25K Lichess pool + a 300-500
hand-crafted sub-400 training pool: effectively unlimited content.

---

## Adaptive difficulty model

### Puzzles — fully adaptive ELO

- Per-piece rating, persisted in Dexie per profile per piece.
  Schema addition: `kidRatingByPiece: Record<ChessPiece, number>`.
- Start at **100** (David's call) — symbolic floor; the kid
  feels he's earning the climb.
- Range 100-2000.
- After each puzzle: **+25 correct / −15 incorrect**, capped.
- Filter Lichess pool: `rating ∈ [kid_rating - 50, kid_rating + 50]`
  AND `movingPiece == piece` AND `theme ∈ KID_SAFE_THEMES`
  AND `popularity > 80`.
- **Sub-400 training pool** (rating 100-400): hand-crafted
  micro-puzzles like "capture the hanging queen (only one legal
  capture)", "promote the pawn (no defender)", "mate in 1 with
  K+Q vs K". These are procedurally generatable from chess.js
  using piece-value heuristics. Tag `source: 'training'`.
  Adaptive filter pulls from training pool below 400, transitions
  to Lichess at 400+. (Phase 0.6 below.)

### Sandbox games — 5-level bands, NOT continuously adaptive

- Levels 1-5 unlocked by default.
- Levels 6-10 unlock after **3-of-5** cleared in band 1-5.
- Same gate for 11-15 → 16-20.
- Within a band, level params scale (board size, distractor
  count, par moves) but the mechanic is the same.
- **"Easier / Just Right / Harder" override** — kid can drop a
  band without grinding through it.

---

## Personality + voice rules (the safety lane)

This is the highest-priority risk: David's brother must never
hear the app's adult coach personality (which can be edgy/blunt).
Three contracts:

1. **All kid LLM calls go through a new `getKidLlmResponse`
   wrapper** in `coachApi.ts` that **forces** `personality: 'default'`
   and voice: Ruth regardless of the user's coach settings. The
   wrapper is the only entry point kid code is allowed to use.
2. **Every `voiceService.speak` call from kid surfaces passes
   `personality: 'default'` explicitly** (today it relies on the
   default fall-through, which is fragile — one line change
   could break it). Unit test fails if any kid file calls
   `speak()` without the arg.
3. **Kid system prompts assert safety on every call:** "Output
   JSON/text only. No slang, no negative language, no comparison
   to other kids, no taunting. Age-appropriate, 5-10 year old
   reading level. ≤ 12 words per field."

---

## Text-readability rules

- Base font 18px (mobile), 20px (tablet+). Headings 1.5× base.
- Line-height ≥ 1.5.
- High-contrast: black-on-white OR white-on-dark, never gray-on-gray.
- One sentence per box, ≤ 12 words.
- **No SAN in kid-facing text.** No `Nxf6` — say "Knight takes
  the bishop."
- No idioms ("a piece of cake", "by the skin of your teeth") —
  literal language only.
- Buttons ≥ 80px tall on mobile.

---

## Simpler chess board for kids

New `KidChessboard` facade wrapping `ConsistentChessboard`,
removing:
- Eval bar
- Move list / PGN
- Arrows-on-hover, premove drag
- Coordinate labels (toggle in Settings later)
- Flip/undo/reset buttons in the default state

Keeps:
- Big legal-move dots
- Last-move highlight
- Check highlight (giant red ring)
- Big piece sounds
- Drag-and-drop with snap

Every kid surface uses `KidChessboard`. Replaces 7 current
violations of the "ConsistentChessboard is the only board"
rule:
- `BishopVsPawns.tsx`, `ColorWars.tsx`, `KingEscape.tsx`,
  `KingMarch.tsx`, `KidModePage.tsx`, `MiniGamePage.tsx`,
  `GuidedGamePage.tsx`, `KidPiecePage.tsx`,
  `GameChapterPage.tsx`.

---

## Non-negotiables

These get written into `CLAUDE.md` under a new "Kids section —
non-negotiables" section so the next session can't blow past them.

1. **LLM only writes prose, never plays moves.** chess.js
   validates every move. Same rule as `/coach/teach`.
2. **LLM never selects which puzzle/level the kid sees.** Puzzle
   selection is deterministic: filter `puzzles.json` by piece +
   rating band + theme; pick first N. The LLM only writes hint
   and encouragement text.
3. **No coach personality leaks into kid mode.** Every kid LLM
   call goes through `getKidLlmResponse` which pins personality
   to `'default'` and voice to Ruth.
4. **Voice is Ruth, default tone, no exceptions.**
   `voiceService` calls from kid surfaces pass
   `personality: 'default'` explicitly.
5. **Narration constraints — kid carve-out.** Praise IS allowed,
   but **only on milestones**: chapter complete, level cleared,
   all-stars run, puzzle session summary. Per-move praise
   ("Great move!", "Excellent!" after every click) is banned —
   tunes out. Restate the move's *effect* instead ("the knight
   is safe now").
6. **No SAN in kid-facing text.** Spelled-out moves only.
7. **No timer pressure** unless a game's whole point is the timer
   (e.g. Color Wars). Untimed by default.
8. **Adaptive difficulty per-piece, persisted in Dexie**, never
   lost on session end.
9. **Every kid hub looks the same.** Identical shape across all 6
   pieces. No `setView` rendering — everything routes.
10. **Kid mode never reads from or writes to coach state.**
    `useBoardContext` removed from `KidPiecePage` and
    `GameChapterPage`. The only Zustand keys kid mode reads:
    `activeProfile`, `activeTheme`, `setActiveTheme`.
11. **Bottom-nav phantom padding removed.** `pb-[calc(6.5rem+...)]`
    → `pb-6` everywhere under `/kid` since no bottom nav renders
    there (KidLayout is a sibling of AppLayout).
12. **`KidChessboard` is the only board** under `/kid/*`. Other
    primitives are banned.
13. **CC0 only.** Lichess puzzle data only. No copyrighted
    ChessKid content.
14. **The 6 pieces own their hubs.** Names: `pawn-games`,
    `rook-games`, `knight-games`, `bishop-games`, `queen-games`,
    `king-games`. Pre-existing `/kid/mini-games` is renamed.
15. **Sandbox levels step in 5-level bands.** No continuous ELO
    adaptation for sandbox games — only for puzzles.
16. **Every puzzle has a `movingPiece` tag.** Filtering by piece
    requires it. Build step in CI computes it from chess.js
    applied to the puzzle's UCI move (Lichess `moves` field is
    UCI not SAN — current `puzzles.json` filtered by SAN
    first-char returns 100% pawn for everything).
17. **The DB is the source of truth in kid mode. The LLM only
    writes prose.** Same contract as
    `generateOpeningFromDbNarration`. Puzzle positions and
    solutions come from `puzzles.json` + the 100-400 training
    pool. Sandbox levels come from `*Levels.ts` config files.
    The LLM is ONLY ever asked for hint text and encouragement,
    never FENs, never moves, never level layouts. Every LLM
    output is sanitized; on any anomaly fall back to static
    templates. **An LLM hallucinating chess content in kid
    mode is a P0 bug.**

---

## What stays vs what changes

**Stays as-is (already correct):**
- Pawn's Journey + Fairy Tale curriculum + chapter shape
  (`GameMapPage` / `GameChapterPage`).
- Star + progress persistence via `journeyService` /
  `rookGameService` / `miniGameService`.
- Guided famous games (`/kid/play-games`) — these are great.
- Lichess puzzle DB at `puzzles.json` (will be re-curated, not
  replaced).
- `useChessGame`, chess.js validation, sound packs.

**Changes:**
- Kid hub layout → Dashboard-style 2-col grid, semantic
  per-piece colors.
- Bishop + King get real hub routes; `setView` patterns removed.
- `mini-games` → `pawn-games` rename.
- `kidPuzzleService` inverted: DB picks positions/solutions, LLM
  only writes prose. `ai-` puzzle ID prefix removed.
- Personality-bleed closed in `kidPuzzleService` + `voiceService`
  via new `getKidLlmResponse` wrapper.
- Bottom-nav phantom padding removed (15+ files).
- All kid boards → new `KidChessboard` facade.
- 6 new sandbox templates per piece (24 templates total, 4
  levels each = 96 new levels) + 4 existing per piece = 120 total.
- New per-piece adaptive puzzle session under each hub.

---

## Implementation order

Each numbered phase is one PR. Status: `pending` until done.

### Phase 1 — Safety first (smallest blast radius, hardest contract)
**Status:** pending.
Close personality bleed in `kidPuzzleService.ts:94` and
`voiceService` calls from kid surfaces. New `getKidLlmResponse`
wrapper in `coachApi.ts`. Unit tests fail if any kid file
imports `getCoachChatResponse` directly or calls
`voiceService.speak` without an explicit `personality` arg.

### Phase 2 — Write non-negotiables to CLAUDE.md
**Status:** pending.
Adds the "Kids section — non-negotiables" section (items 1-17
above) so the next session can't violate them silently.

### Phase 3 — `KidChessboard` facade
**Status:** pending.
New component wrapping `ConsistentChessboard`. Swaps in across 7
existing files. Cosmetic + removes a CLAUDE.md violation. No
behavior change.

### Phase 0.5 — Puzzle pool re-curation (data only)
**Status:** pending.
1. Download Lichess full puzzle CSV (250MB, CC0).
2. Filter: `rating ∈ [400, 1500]`, `popularity > 80`,
   `themes ∋ KID_SAFE_THEMES`.
3. Run every puzzle through chess.js → tag `movingPiece` from
   first parsed SAN.
4. Sample 25K total: ~10K in 400-800, ~10K in 800-1200, ~5K in
   1200-1500.
5. Replace/augment `puzzles.json`. Bundle stays under 8MB.

### Phase 0.6 — Sub-400 training pool
**Status:** pending.
Hand-crafted / procedurally-generated micro-puzzles rated 100-400.
- 100-200 ELO: one-move free-capture (hanging piece,
  K+Q vs lone unprotected piece).
- 200-300 ELO: one-move free-promotion (P on 7th, clear path).
- 300-400 ELO: one-move mate-in-1 with overwhelming material
  (K+Q vs K, queen one square from mate; K+R+R vs K, two-rook
  back-rank).
Target: 500 puzzles, ~50KB JSON, tagged `source: 'training'`.
Build step adds them to `puzzles.json`.

### Phase 4 — King + Bishop hubs
**Status:** pending.
New routes `/kid/king-games` and `/kid/bishop-games`. Migrate
King Escape + King March + Bishop vs Pawns + Color Wars from
loose tiles / `setView` to routed hubs matching Rook/Knight/Queen
shape.

### Phase 5 — `mini-games` → `pawn-games` rename
**Status:** pending.
Route rename. Nav update in `KidModePage`. 301-style redirect
from `/kid/mini-games` → `/kid/pawn-games` for any existing
bookmarks.

### Phase 6 — Adaptive rating model (Dexie schema bump)
**Status:** pending.
Schema v? → adds `kidRatingByPiece: Record<ChessPiece, number>` to
profile. Upgrade function seeds 100 for all pieces.

### Phase 7 — 120 sandbox levels
**Status:** pending.
One piece at a time, 6 PRs. Each PR adds the new game templates +
level configs + tests for the piece. Order: Pawn → Rook → Knight
→ Bishop → Queen → King.

### Phase 8 — Per-piece adaptive puzzle session
**Status:** pending.
Extends `puzzleService` with `getPiecePuzzles(piece, rating, count)`.
Adds `/kid/<piece>-games/puzzles` route to each hub.

### Phase 9 — Hub layout rewrite (Dashboard-style)
**Status:** pending.
`KidModePage` → 2-col grid, semantic per-piece colors, first tile
col-span-2 for active chapter. Removes the long-scroll one-column
list.

### Phase 10 — Text + font sweep
**Status:** pending.
`KidLayout` sets base font, removes SAN from all copy, swaps
banned-phrase narration to milestone-only praise, removes
acknowledgments per item #5 in non-negotiables.

### Phase 11 — Full audit script
**Status:** pending.
`scripts/audit-kid-llm-hallucination.mjs`:
- Walks every kid chapter/puzzle session.
- Captures every LLM request/response via the audit-stream.
- Fails if any LLM response field contains a FEN/UCI/SAN regex.
- Fails if any rendered puzzle's `id` starts with `ai-`.
- Fails if any kid surface imports `getCoachChatResponse` directly.
- Fails if any kid file calls `voiceService.speak` without
  `personality: 'default'`.
- Fails if any kid file imports `ControlledChessBoard` or
  `react-chessboard` directly.
- Fails if any kid surface uses `pb-[calc(6.5rem`.
- Fails if any kid hub uses `setView` for navigation.

### Phase 12 — Full play audit (Playwright)
**Status:** pending.
`scripts/audit-kids-section.mjs` walks the full route tree:
`/kid` → every hub → every game → every level → puzzle session
→ chapter → back to hub. Verifies UI loads, board renders,
move-attempt feedback works, adaptive rating updates persist,
no console errors, no unexpected LLM calls.

---

## Decisions log

| Date | Decision | David's words |
|---|---|---|
| 2026-05-15 | 20 sandbox games per piece, 5-level bands, every 5 levels steps up. | "Every five games should step up in difficulty." |
| 2026-05-15 | Puzzles fully adaptive (large DB). | "Puzzles fully adaptive since we have a large db." |
| 2026-05-15 | No kid-game DB found → procedural sandbox games + curated templates from chess-teaching literature. | "If you find a game db then adaptive games too." |
| 2026-05-15 | Start kid rating at 100 ELO, not 400. | "Start at 100 elo." |
| 2026-05-15 | Build a hand-crafted sub-400 training-wheel puzzle pool to honor the 100-ELO floor (Lichess bottoms out at 400). | "I think you got it" after option A was proposed. |
| 2026-05-15 | Personality removed from kid mode; Ruth default everywhere. | "Remove the personality. Just use Ruth's default as personality." |
| 2026-05-15 | DB is the source of truth in kid mode. LLM only writes prose. Same inversion as `generateOpeningFromDbNarration`. | "Make sure the coach doesn't hallucinate, I think we prevented that by giving it the source of truth." |
| 2026-05-15 | Simpler chess board for kids is fine. | "I'm ok with a simpler chess board for kids. Simpler is better." |
| 2026-05-15 | After implementation: full audit + full play audit. | "Then run full audit to make sure all the non-negotiables are kept... then do a full play audit." |

---

## Next-session pickup

1. **Read this doc end-to-end** before touching `/kid/*`.
2. Check the **Decisions log** for anything that's changed since.
3. Pick up at the **first `pending` phase**. Phases are ordered to
   minimize blast radius and surface contract violations early.
4. **Phase 1 (safety) must land before any other phase.** The
   personality-bleed in `kidPuzzleService.ts:94` is a live
   risk every time a kid hits Pawn's Journey or Fairy Tale.
5. After each phase: update its `Status:` line in this doc, add
   a row to the decisions log if anything new came up, commit
   the doc update with the phase's PR.
6. **Run the post-deploy audit** after every phase that touches
   a runtime path (per CLAUDE.md mandatory post-deploy ritual).
