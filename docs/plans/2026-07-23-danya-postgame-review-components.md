# Danya's post-game review — component spec (evidence-based, 10 games)

The reference for building our post-game review to mirror Naroditsky's. Every
component below is observed in his ACTUAL narration across 10 of his speedrun
games (transcripts in `data/sources/naroditsky-voice/transcripts/`, gitignored).
Quotes are his real words. Build the review to reproduce THESE components.

## The 10 knob-dialing games (his real narrated games)

| Video | Opening | Notes |
|---|---|---|
| `YXz0xSbhY70` (anchor) | Sicilian Grand Prix | he's Black; distilled in `danya-teachings.json` |
| `fABTn305-Eg` | Sicilian Grand Prix | he's Black; **most complete review section** |
| `TIpUDMzQVmU` | Pirc, Classical | |
| `YzI6qI-33_U` | Grünfeld / Accelerated Dragon | |
| `speedrun-QxHsw4ZS2Ts` | Slav | |
| `speedrun-ktoa6lk6qNk` | Sicilian | explicit critical-moments recap |
| `speedrun-oH407-a1v-4` | Accelerated Dragon | engine cheat-check review |
| `speedrun-hzotV0aslmY` | Bird | conversion "device" review |
| `speedrun-d6tZXETpqT0` | Modern / Pillsbury | |
| `speedrun-G1UdMY89U1k` | Sicilian, Alapin | repertoire recommendation |

## Overall shape — TWO analysis modes, he announces the switch

> "let's transition from ChessBase to chess.com… the part where we use the
> engine has elapsed; now we go into the middlegame, and **that I'd like to
> analyze without the engine**." *(Grand Prix)*

- **PHASE 1 — engine-ON opening analysis** (ChessBase + Stockfish).
- **PHASE 2 — engine-OFF middlegame/endgame analysis** (his reasoning, illustrated with model games).
- **PHASE 3 — synthesis** (recap, theme, moral, verdict, repertoire rec).
- Wrapped in framing/voice components throughout.

---

## PHASE 1 — engine-ON OPENING analysis

- **C1. Open the analysis / name the tools.** "let's analyze — we're going to use ChessBase… we have Stockfish here."
- **C2. Re-walk the opening, GRADE each move vs the engine.** "e4 top, bishop e2 top, castle's top, top, top, top — one inaccuracy, knight g5." · "A6 is the engine's top recommendation at depth 30."
- **C3. Cite THEORY + database** (game counts, popularity, scores). "the main line is Bishop B5 — now the most popular move, scores well, over a thousand games." · "173 games in the database."
- **C4. Cite MODEL / master games by name.** "Carlsen had this against Yangyi in blitz… Duda played D6 — a bad move, this is a blitz game."
- **C5. CORRECT his own in-game claims.** "when I said G6 has no downside, that was a bit of a lie." · "I said this was a blunder in-game — but after A6 you win the pawn back."
- **C6. Deep SUB-LINES off the critical opening decision.** "…Bxb5, D5 — a move you'd never play unless you knew it was good… Qxd5 loses to a fork; A6, Nc3, Nf6 wins the pawn back with interest."
- **C7. Name the engine's PREFERRED move + why it's TESTING.** "I love the engine's recommendation D5 — it's very testing; 172 games, most GMs took the pawn and that's a mistake."
- **C8. What was LEFT OUT / further study.** "we didn't analyze the whole Grand Prix — Bishop C4, the Botvinnik setup — analyze it on your own."

## PHASE 2 — engine-OFF MIDDLEGAME/ENDGAME analysis

- **C9. Illustrative MODEL-GAME SEARCHES — the pattern repeats.** "let me run a search — this game… bang, F5, the beautiful combination." · "another one, completely different game, ends exactly the same way — this is the beauty of studying openings."
- **C10. The DANGER / plan illustration.** "how dangerous this attack can be… this is why I did not want to castle kingside, this is why we did all we did."
- **C11. Re-examine each critical MIDDLEGAME moment — "what should X have done?"** "E5 is already a mistake, premature — the moment it was played I was considering Queen D4. What should white have done? F5, or Bishop D2."
- **C12. Deep tactical LINES with the refutation.** "Rxf7… Qd4, Kh1, Nf2 wins the queen — no it doesn't, because Qxf2…"
- **C13. The MISSED resources — for BOTH sides.** "what I missed — …H6, counter-attacking the knight, a detail I missed." · "Sam had a resource — the desperado sac Ng5 — but he missed it."
- **C14. Named TACTICAL CONCEPTS / HEURISTICS.** interception tactics · type-2 undefended piece · deflection · the one-piece threshold rule · the bathtub formation · the fishing-pole · "you can't blindly apply concepts — smothered mate doesn't work here" · the Sam Shankland question.
- **C15. Correct the TEMPTING-BUT-WRONG line, give the right one.** "Bishop F6 is wrong — the correct move is a Zen move: trade away your opponent's strongest piece."
- **C16. Name the DECISIVE move.** "F6 is the move that ends all of White's resistance."
- **C17. Endgame / practical TECHNIQUE.** "it's not possible to force a perpetual — hide the king away, block with the queen." · "you can always set a trap, always."

## PHASE 3 — synthesis

- **C18. Critical-moments recap IN SEQUENCE.** "critical moments: opening well; Rook E8 not the best; Knight F3 a slight inaccuracy…"
- **C19. Name the GAME'S THEME.** "the theme of the game — slowly putting pressure, inducing concessions."
- **C20. The MORAL / generalizable rule.** "the moral: in the Benoni, attack d6 with Nd2–Nc4, meet …a6 with a4."
- **C21. Self-critique of his own THINKING PROCESS.** "I should have updated my perception of the board… stop on a dime and change your approach."
- **C22. Honest OVERALL VERDICT.** "not the highest quality, but instructive." · "a lackluster game, but utility to derive."
- **C23. Repertoire RECOMMENDATION / what to study.** "my official recommendation vs c5 is the Alapin or the Morra."

## FRAMING / VOICE (throughout)

- **C24. Teaching-level awareness.** "if you're a beginner, some of this will seem overwhelming, but I'm breaking down every move… nothing embarrassing about going at your own pace."
- **C25. Meta-commentary on the analysis.** "deeper analysis than I expected — I went under the surface."
- **C26. Socratic questions throughout.** "who can tell me why Bishop G7 looks like a blunder?"
- **C27. Repertoire-building framing.** "this is an opening speedrun — help you build a repertoire from scratch."
- **C28. Warm / honest / first-person-plural**; admits his own inaccuracies flatly.

---

## BUILD ORDER

**We start at PHASE 1** (engine-ON opening analysis, C1–C8). Then Phase 2, then
Phase 3, then the framing layer. Each component gets mapped to the tool that
produces it (or flagged as a gap to build). G0 holds throughout: every fact is
computed (engine/DB/chess.js); the voice only phrases it.
