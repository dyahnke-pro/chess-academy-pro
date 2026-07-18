# Opening Matchup + Continue-the-Game (David 2026-07-18)

Two linked asks from David:

1. **Teach any two openings against each other — even ones that don't
   normally meet.** *"When they can't meet the coach should say that but
   then use stockfish to still make the request happen … no reason we can't
   show what happens and teach the best lines."* And the "it played a
   French" bug: asking for **KIA vs Sicilian Dragon** taught the DB's
   `King's Indian Attack: Sicilian Variation` entry, whose move order is
   `e4 e6 d3 d5…` — French-looking, NOT the Dragon setup he named.

2. **Continue the lesson into a full game.** *"I want the coach to be able
   to play and narrate a full game. Once the opening teaching has been
   completed the coach should ask the user if they want the game/teaching
   to continue so they can see a middle and endgame."* And: *"I want the
   coach to contour the lesson if desired on ALL opening or teaching
   requests, not just opening vs opening"* — e.g. after "teach me the
   Vienna," ask if they want to see the rest of the game.

## Feature A — matchup by CONSTRUCTION (not a coincidental named entry)

Show the two setups the user actually named. For "X vs Y":

- **Setup source = the opening's own DB line.** The deepest DB entry that
  is a genuine child of the opening (normalized name === the opening or
  starts with it), White's plies for the White opening, Black's plies for
  the Black opening. This gives KIA → `e4 d3 Nd2 Ngf3 g3 Bg2 O-O Re1` and
  the Dragon → `c5 d6 Nc6 g6 Bg7 Nf6 O-O Be6`.
- **Merge:** play each side's setup moves in order, skipping any illegal in
  the current position (the opponent deviated), producing the real
  collision: `e4 c5 d3 d6 Nd2 Nc6 Ngf3 g6 g3 Bg7 Bg2 Nf6 O-O O-O Re1 Be6`
  — KIA vs the **Dragon**, exactly as asked. Every move is the DB's (G3).
- **Stockfish bridges + extends.** When a setup clashes (no legal setup
  move) or after both are established, `stockfishEngine.getBestMove`
  continues toward a middlegame — real, legal engine moves. Best-effort:
  engine unavailable → the chess.js merge (~16–20 real setup plies) stands.
- **Honest note when they don't normally meet.** They "meet" if a strict
  named DB matchup entry exists (both openings' family tokens present as
  whole tokens). If not (QG vs Sicilian, Italian vs French), prepend: *"The
  Queen's Gambit and the Sicilian don't normally meet … but here's what it
  looks like when White sets up the Queen's Gambit and Black the
  Sicilian,"* then teach it anyway.
- **Same-colour pairs** (two Black defenses) genuinely can't share a board
  → honest message + each side as a chip. No construction.

Files: `src/services/openingMatchup.ts` (`planOpeningMatchup` sync +
`buildMatchupLine` async Stockfish), wired in `CoachTeachPage.handleSubmit`.

## Feature B — continue into the middlegame + endgame (ALL lessons)

After ANY opening walkthrough completes (single opening OR matchup), the
coach asks: *"Want to keep going and watch the middlegame and endgame?"*
On yes, the coach plays out both sides with Stockfish best-play from the
final opening position and narrates the phases (grounded commentary: eval
swings, captures, tactics, phase transitions) to a natural conclusion.

Files: a `continueGame` runtime that extends the board from the lesson's
terminal FEN with `stockfishEngine.getBestMove` + grounded narration; a
completion hook in the walkthrough that surfaces the prompt.

## Status: shipped — Feature A (construction + honest note) + Feature B (narrated continuation), both verified on localhost (Stockfish WASM plays both sides, grounded phase/material narration, no errors).
