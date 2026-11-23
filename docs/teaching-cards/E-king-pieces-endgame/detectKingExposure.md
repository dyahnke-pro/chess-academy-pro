# Card — `detectKingExposure` (a castled king whose shelter broke, with pieces aimed at it)

## A. Identity
- File: `src/services/kingSafety.ts:125` `detectKingExposure(fen, color)`; renderer `kingExposureClause` (:287); helpers `shieldCount` (:102), `shieldLoss` (:113), `kingRing`.
- Registry `boardComputers.ts:5642` `kingExposure` (kind `king`; Learn via `positionFacts.ts:1725`, chat `groundedAnswer.ts:814`, weaknesses `moveInsight.ts:920`) and `:5670` (their shelter cracked, kind `king`, `squares: []`). In `positionFacts.ts:723` the clause rides the `latent-danger` kind (census kind).
- Census: 42 fired / 22 said (Learn 3/18, chat 19/24). Held: said-already 11, in-flux 7, beside-mate 2.

## B. Facts
- **B1** `KingExposure`: `kingSquare`, `missingShield` (2 or 3 of the castled shelter pawns gone), `attackerSquares` (enemy B/R/Q hitting the king ring).
- **B2 dropped**: which shelter FILES are missing (`shieldCount` counts, not squares — `kingCover` :88-93 knows the file of each gap); the attacker PIECE types (only squares handed, :153 knows `p.type`); knights are excluded from attackers (:153) — dropped silently; `kingExposureClause` hardwires "Your king's" (:289) — the clause is single-seat.
- **B3 cheap**: `gapFiles` (the files with no shield pawn → "the h-file and g-file are open to your king"); `heavyOnGap` (an enemy rook/queen that reaches a gap file in one move — the concrete consequence); `causedBy` = `shieldLoss(fenBefore, fenAfter, color)` > 0 (the move that broke it — the mistake); `coverMove` (a piece that can stand on a gap square: B/N to g2/f3/h3 etc.).
- **B4 gates**: attacker has a queen (:135); king on a castled shelter square (:136-137); ≥2 shield pawns missing (:141); ≥1 enemy B/R/Q on the king ring (:156).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "Your king's cover is thin … Look after the king before you throw more forces forward." — a rule with a general board tail | which pawns, which attackers (specific) |
| CONSEQUENCE | no | — | `heavyOnGap` ("their rook reaches the h-file and checks") |
| BETTER MOVE + JOB | no | — | `coverMove` / errorWhy better move ("Bf1 covered g2") |
| HABIT | no | — | record `weakened-king-safety` |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| KE1 | CONSEQ (pawn move broke it) | S defender | `causedBy > 0` on the student's move, exposure true after | gap files, attackers | "Pawns in front of your king can't move back: with the {gapFile}-pawn gone, their {attacker} looks straight at your king." / "Every shelter pawn you push is a door you can't close again." | "Their {heavy} reaches the {gapFile}-file next and the king has nothing in front of it." | "{best} kept the {gapFile}-pawn home." (once past) | "Before you push a pawn in front of your castled king, ask what it lets in." | "That opened the {gapFile}-file in front of your king." | missingShield < 2; no queen | C causedBy, gapFiles |
| KE2 | STRAT | S defender | exposure true, student's move was an attacking move elsewhere (cost) | — | "With your king's cover gone, defence comes first: an attack elsewhere is too slow." | "Their pieces arrive at {king} before yours arrive at theirs." | "{best} brought a defender to {sq}." | KE1 | "Your king's cover is thin — their {attacker} already aims at it." | — | H |
| KE3 | PLAN (cover) | S defender | coverMove exists | piece, square | "When the pawns are gone, a piece has to stand where they stood: a bishop on g2 or a knight on f3 is the new shelter." | — | "{best} put the {piece} on {sq} in front of the king." | — | — | coverMove hangs the piece | C |
| KE4 | IDENT (attacker) | S attacker | their shelter cracked (`:5670`) after their move | gap files | "Their shelter is cracked: aim your rooks and queen at the open files in front of their king." | "The {gapFile}-file leads to their king." | — | "When their king's pawns move, look at the files they opened." | after their move: "Their king lost its {gapFile}-pawn." | `squares: []` today (no support) | C gapFiles |
| KE5 | combo + kingSiege | both | exposure + siege margin ≥2 | — | "A broken shelter and more attackers than defenders: that is a mating attack, not a weakness." | "Mate or heavy loss follows." | — | — | — | — | H both |
| KE6 | exception | — | no queen | — | silent (gate :135): the endgame king is a piece | — | — | — | — | — | — |
| KE7 | KNOW | both | knights excluded today | — | "A knight on {sq} next to the king counts as an attacker too" — needs B2 fix (knights) | | | | | | C |
| — | phase endgame | — | — | n/a — gated by queen; endgame cards own the flip | | | | | | | |
| — | record | — | RED/GREY full · AMBER "Your king's cover is thin." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student: `positionalReason` `weakened-king-safety` (shelter gap, `positionalReason.ts:157-165`) → KE1/KE2; `costReason` allowed mate/material through the gap file → KE1+KE5.
- Opponent's mistake: their pawn push cracked the shelter → KE4.
- KE3 is the better-move job of KE1/KE2 (Review; Learn after the move).

## F. Build changes
1. `kingSafety.ts:125` — return `gapFiles: string[]` (from `kingCover`'s per-file scan, :88-93) and `attackers: {square, piece}[]` (types at :153). Consider adding knights (`p.type === 'n'`) — sensitivity: old {q,r,b} → new {q,r,b,n}; miss board `vc-1PI3xfMiUE4-34` (their knight e2 next to the king h1), guard: a castled king with a knight on f3-ish of THEIRS with shelter whole (missingShield gate keeps it silent).
2. `kingSafety.ts:287` — `kingExposureClause` becomes a chat renderer only; Learn uses recipes KE1–KE5 in `mistakeLesson.ts`.
3. Registry `:5642` — add `causedBy` via `shieldLoss(fenBefore, fenAfter)` when a move is in hand.
4. Registry `:5677` — `squares: [king, ...gap squares]` (support).

## G. Proof boards
- KE1/KE2: `vc-1PI3xfMiUE4-48` `3r1rk1/pp3ppp/3b4/3N4/2B1P2n/2PP3q/PP3Q2/R4RK1 w` — said "all three of the pawns in front of it are gone" (Learn line `lines-0.jsonl#7284` same shape).
- Guard: rook endings (queen gone) — the 2026-09-27 hand-walk case cited at :130-133.

## H. Open questions
- Should knights count as attackers on the shelter (F1)? Changes how often it fires.
