# Chat reads every computer (2026-10-09, David: "Do them all now")

## Why (third time this gap opened)
Measured 2026-10-09: 345 board computers in the code; chat's answer files call
69 directly; the registry (`boardComputers.ts`, one-coach P4) holds 15 and marks
chat `CHAT_OWED` on most. `positionFacts` — the live narration's one producer,
ranking dozens of computers into proof-bearing clauses — is never called by chat.
The live replay of real questions failed exactly where a computer existed but
chat did not ask it (why-not lines, the line itself, "why?", critical moments,
basic rules). P4 rotted because "owed" was a legal answer and most computers
never joined the registry.

## The shape
1. `chatBoardRead` — chat's one board read: `computePositionFacts` (posture
   `walk`, the student asked) + every registry entry chat can feed. Cached per FEN.
2. Selection by referent — clauses whose squares touch the asked piece / square /
   move; an open ask ("explain", "why?", "what's going on") takes the top ranks.
   The ranking is positionFacts' own (the one door); chat adds none.
3. Coverage gate — `chatComputerReach.test.ts` enumerates every computer and fails
   unless it is reachable from the chat answer graph or listed with a reason
   (shrink-only). `CHAT_OWED` deleted.

## Status
- [ ] chatBoardRead + selection
- [ ] wired into coachApi (board catch-all, piece/square asks, open asks, follow-ups)
- [ ] coverage gate + triage of the 345
- [ ] registry: CHAT_OWED removed; each entry wired or reasoned
- [ ] replay re-run on live; compare with 2026-10-09 baseline
