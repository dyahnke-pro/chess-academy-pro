# fileTradeAt — the rook trade for an open file

## A. Identity
- File: `src/services/fileTrade.ts` (123 lines): `fileTradeAt(fenBefore, san, costCp, line)` (53–101), `fileTradeLine(t, moverIsStudent, fen)` (103–123).
- Registry: `boardComputers.ts` `fileTradeAt` (6985), kind `trade`, either seat. Census: 4 lesson lines, all said ("Your rook on f1 challenges their rook on f3 for the open f-file. If they trade, it's an even swap. If they step off, the file is yours."). Run: 1 fire (g-1013773584 ply 59 Rf1, cost 80).

## B. Facts
- **B1** `FileTrade` (21–23): `challenge {file, rook, facing}` | `hand-off {file, on, retaker, next {piece, from, to}}`.
- **B2 dropped:** nothing material — the read is small; the engine's cost is a gate only.
- **B3 cheap:** the inverse forms on the same board: (a) THEIR challenge (call with their move) followed by the student stepping off the file (the student's rook leaves `file` and the engine's best traded) — the student handed the file over; (b) the student's best move WAS a challenge / hand-off (call `fileTradeAt` on (fenBefore, best)) and the student played elsewhere at cost ≥ floor.
- **B4 gates:** cost known and < `MISTAKE_CP` (100, engineConstants 124; line 54); a rook move; the file open (no pawns, 61); challenge: their only rook/queen on the file, their only rook overall, face to face, even SEE (66–78); hand-off: a rook takes their rook, the cheapest retake is not a major, then no major of theirs on the file, and the engine's line puts the mover's next major on it safely (80–99).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "challenges … for the open file; step off and the file is yours" | — |
| CONSEQUENCE | yes | "the file is yours" | — |
| BETTER MOVE + JOB | n/a (good move) | — | for the inverse |
| HABIT | no | — | — |

## D. Lesson recipes
`fileTradeAt` fires on sound moves only → Review/chat; the mistake forms are the inverses (B3).

| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| FT1 | strategize (don't step off) | S | (a): their challenge, the student's rook left the file, cost ≥ floor | file | "When they challenge your rook on an open file, stepping off hands them the file: trade, or the {file}-file is theirs." | "Their rook owns the {file}-file." | "{best} traded on {sq}." | "On an open file, the side that steps off loses it." | full | the student's move won material elsewhere | C |
| FT2 | strategize (challenge) | S | (b): the best move was a challenge, the student played elsewhere, cost ≥ floor | file, their rook | "Rooks belong on open files — and when theirs owns one, challenge it: a trade is even, stepping off gives you the file." | | "{best} challenged on the {file}-file." | "Look for the open file, then put a rook on it first." | full once past | — | C |
| FT3 | knowledge (hand-off) | both | hand-off (good move) | — | "Trading rooks can win a file: after the take-back, your next rook comes to it." | | | | Review/chat | | H |
| FT4 | record | S | — | — | RED/GREY full · AMBER one clause · GREEN silent | | | | | | `holdState` on `passive-rook` |

Not applicable: calculate / structure / phase (a file read).

## E. Mistake link
- Student: `positionalReason` **passive-rook** ("The better move puts your rook on the {file}", positionalReason 186) — FT1/FT2 give the reason (the challenge / stepping off) the generic note lacks.
- Opponent: their stepping off (Review).

## F. Build changes
1. Add `fileTradeMissed(fenBefore, studentSan, bestSan, costCp)` and `fileHandedOver(theirChallenge, studentSan)` (B3) — both pure, both reuse `fileTradeAt`'s checks.
2. `errorWhy`: when `positionalReason` returns `passive-rook`, attach FT1/FT2 if they fire (the specific file and rook).

## G. Proof boards (run)
- Challenge (sound, Review): g chesscom-1013773584 ply 59 Rf1 (student, cost 80) `2k5/1p1n4/8/p2p4/6RP/3B1rp1/PPP5/1K5R w - - 1 30` → challenge on the f-file facing the rook f3 (census lines-0.jsonl:5531).
- No mistake board yet for FT1/FT2 (needs F1).

## H. Open questions
- none.
