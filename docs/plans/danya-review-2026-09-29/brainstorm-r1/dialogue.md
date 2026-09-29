**Root cause:** chat is a closed list of about 55 regex lanes. G0 removed the model's free answer and put nothing in its place that turns an arbitrary question into a board query. So any question the regexes miss falls into a generic board readout or a stock "can't verify" line. Even the lanes that do match hand back a verdict and an eval, never a line played out.

**The fall-through** (`coachApi.ts:6335-6389` and `6484-6500`). A chess-looking question no lane catches goes: `computeLiveBoardVerdict` → `signalReroute` → `serveGroundedPositionDefault` ("The best move is X, about N points", whatever was asked) → opening picker → `STOCK_GROUNDING_FALLBACK` (`:1772`). No chat surface ever plays a line on the board; the only "what-if board" is in review (`CoachGameReview.tsx:3588`). The "is Nf3 ok / what if" lane (`questionIntents.ts:588`, then `coachApi.ts:5489`, then `groundedAnswer.ts:1724`) returns a verdict, an eval and one arrow, with no line showing how the move gets punished.

**Audit reports:** none on disk. This clone has no coach-all-questions or multilingual run. OUTLINE J3 still lists the exhaustive run as owed.

**PostHog, native App Store users, 60 days.** Excluded: David's devices, Cupertino, audit runs, 472 taps of the canned best-move button, 256 hint asks, and "I played X" turns.
- 86 real typed turns from 6 devices.
- **33 (38%) got the stock "I can't verify that precisely" line.**
- 14 (16%) got a best-move readout that ignored the question.
- 9 (10%) got "Material is even, no engine read".
- By hand, only about 15 (17%) actually answered what was asked.
- Most came from Play chat and home chat; only a few from Learn.

**The three biggest failure classes:**
1. **Questions about the move just played ("that").** "Why was that a bad move", "Why do they move their queen like that", "Doesn't that mess the structure up", "Why Qe1 is correct", "Couldn't he take the knight with the king" all got the stock line or "best move is c4". Nothing resolves "that" to the last ply and works out what it caused.
2. **Wrong-lane capture.** Detectors match on words, not on what is being asked about.
   - "What is bxe7" and "What does Bxe7 mean" got a pawn-chain definition.
   - "What is the blacks opening" got an isolated-pawn definition.
   - "My knight to d5, was that a good move" got "You're clearly better" or a grade of Qd6. "What's my next move" got "You're losing, 15.8 points down".
3. **Help, meta and game-input requests.** "Help", "How to improve middle game", "How can I visual the next moves", "Review my last", a chess.com game link and pasted PGNs all got the stock line. Thai "teach me the Italian" asks in home chat got "Material is even" six times.

**Danya's answers** (from the transcripts): he always names the refuting reply and plays two to four moves to a consequence.
- "Why not simply c4? Because Black responds with c6, and after…"
- "Can't you take with the knight? You can, but you yield the e-file…"
- "What if I do it anyway: Nf6+, Nxf6, exf6, and that pawn is almost as strong as a knight."

**A Danya-style answer engine under G0:**
1. Every turn becomes a typed `BoardQuery` from a closed schema:
   - subject: move, line, piece, plan, concept, game or meta;
   - referent: resolved to a ply or square by coordinates, with the side;
   - kind: why, why-not, what-if, or meaning.
2. Code answers the query. The engine scores the candidate. `computePvLine` produces the punishing line, and `detectTactics` / `positionFacts` read each ply of it. `refutedAlternative` supplies the move people usually play here.
3. The answer is a line: "X? Then Y, Z — and [computed consequence]."
4. The board plays that line, move by move, on a scratch position with arrows, then snaps back.
5. If the query can't be resolved, the coach asks a clarifying question with the candidate referents as choices ("the queen move or the pawn take?"). The stock line goes away.

**Question for the other brains:** can the language model be the parser that maps free text to a `BoardQuery` (enums plus squares checked by chess.js) without breaking G0? It would decide what was asked, never what is true. Regexes provably can't cover it: 38% of real turns hit the stock line.