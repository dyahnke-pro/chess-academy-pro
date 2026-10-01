# Hand walk — Tactics tab (2026-10-01)

Localhost, current `main` (5272825), muted. Real data: chess.com account `erik`
imported through the UI (3,388 games), analysed by the real pipeline (home
openings first). Every puzzle card was engine-checked (Stockfish 18, depth 14)
against its board. Walk first, flag only — fixes come after.

Real-user usage (PostHog, App Store, 60d): hub 23 users → Weaknesses 9,
My Mistakes 9, Patterns 6, Weakness drill 5, Analysis Practice 4, Adaptive 3,
Calculation 3, Drill 1. Daily / Setup / Profile: 0.

## P0 — wrong or harmful

- **AD6 — the next puzzle's whole solution is spoken before the student moves.**
  `PuzzleBoard` concept-speak effect: on puzzle change the reset effect clears
  `conceptSpokenRef` while `terminal` is still `true` from the solved puzzle for
  that render, so the effect speaks the NEW puzzle's `conceptExplanation`
  ("rook to g1 … queen takes g1 … rook takes g1, winning the queen"). Every
  `PuzzleBoard` surface (adaptive, master, classic, themed drills).
- **W4 — a solved mistake puzzle is not recorded unless "Next puzzle" is tapped.**
  `MistakePuzzleBoard` calls `onComplete` only from the Next button. Solve and
  leave → no attempt, no SRS date.
- **M2 — "Re-analyze Games" deletes every imported mistake puzzle (and its SRS
  progress) and re-runs Stockfish over ALL games serially.** A second analysis
  pipeline beside `runBackgroundAnalysis`, no package cap.
- **AD5 — an assisted solve climbed the reach ladder like a clean one.**
  CORRECTED while fixing: the 1487 → 1699 was mostly the deliberate +200
  stretch seed (`initReachState`), plus +12 for the solve. The real defect: a
  solve after a wrong move AND a hint counted as a win, inflating the 80%
  success target. Fixed: `ReachOutcome` = clean | assisted | missed; assisted
  holds.
- **WK4 — the themed drill serves the wrong theme.** "Pins" (5 mistakes) opened
  a 20-puzzle drill starting on a discovered attack: the card counts by tag, the
  drill also admits any position that merely contains a pin (`detectTactics`).
  Two membership definitions.

## P1 — teaching is wrong or empty

- **T1 — the card leads with a fact unrelated to the mistake** (~15/33). Rc3
  hangs the rook to bxc3; the card opens "Bishop on h8 pins pawn on b2". Kh8
  loses to Ng6+; the card opens "Queen on e3 pins knight on f4" — the knight that
  escapes with the fork. The refutation is computed (moveNarrations say "your
  move let them play bxc3, winning the rook") but not led with.
- **T2 — no owner on pieces** ("Queen on c7 pins rook on b6").
- **T3 — solution reasons are descriptions** ("brings the queen to the half-open
  c-file" when Qc5 guards the loose d6 the intro named; "Rd8 develops the rook"
  at move 45 of an endgame; Qxd3 narrated only as "Your opponent replies Qh5+").
- **W3 — the solved explanation never closes on the threat the intro named**,
  and calls the student's move "The engine plays Qc5".
- **W1 — wrong-move feedback says nothing about the move played** and gives the
  forcing-scan habit when the answer is quiet.
- **T4 / W2 — template hints** ("a pawn move that stakes a claim in the center"
  in endgames); "Why?" repeats the same hint.
- **AD4 — "Smothered mate … when the enemy king is in the corner"** with the king
  on e8; "checkmate — checkmate".
- **P2 — "pushes the passed pawn to e4"** when e5 is not passed before the move.
- **PS2 — the Pattern Recognition example board has no arrow/highlight** on the
  pattern.
- **AP1 — Analysis Practice: a correct answer flashes 0.9 s, never spoken.**

## P2 — vocabulary / labels

- **WK1 — raw enum ids in the UI**: "removing_the_guard", "checkmate",
  "battery" (`TACTIC_THEME_LABELS: Record<string,string>` + `?? key`).
- **WK2 — "Hanging Pieces" twice**: `tactic:hanging_piece` and `hanging_pieces`.
- **M3 / WK3 — "Missed tactical sequences" is the biggest bucket** (23/33,
  66, 130×) and names no pattern.
- **M5 — moves 17–20 filed as "Opening".**
- **M1 — My Mistakes after an import says "Import Games"**; no way to start
  analysis from here.
- **RT1 — five ratings on one tab** (1487 / 1699 / 1692 / 1492 / 2400, Master
  "Session −500").
- **DT1 — Daily: "15,299 due for review"** after one attempt.
- **V1 — "Let's see / Let's find"** ("let us" — banned pronoun). **V2** "second-rank
  rook to b3". **V3** the mistake is announced twice back-to-back.
- **PS1 — "Computed live by: tacticsDetector (ray-trace …)"** shown to students.
- **OT1 — Opening Traps groups lowercase, apostrophes stripped, "other" bucket.**
- Endgame Technique tile opens "Drill: Mixed"; "1 attempts"; Hint 2 shown
  with no Hint 1.
- **H1 — 26 hub tiles**; 23 users open the hub, 9 go further.

## Sandbox notes (not app defects)

- Lichess `/api/games/user/*` returns 404 from this egress for every user;
  `/api/user/*` works. Imported via chess.com instead.
- Withdrawn: "g5 was okay" grading flag — sign misread; ~1 pawn at depth 14,
  inaccuracy is fair.
