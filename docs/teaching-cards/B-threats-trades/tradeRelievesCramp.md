# tradeRelievesCramp — the cramped side wants trades

## A. Identity
- File: `src/services/tradeRelievesCramp.ts` (111 lines): `tradeRelievesCramp(fen, lines, student)` (51–111), `safeMoves` (44–49), `CRAMP_PERCENT = 85` (41); uses `ownsMoreSpace` (the one space rule).
- Registry: `boardComputers.ts` `tradeRelievesCramp` (7713), kind `trade`; also `moveThoughtFacts` 767 (idea `trade`, weight 48), `reviewFullData` 1444, `moveInsight` 999.
- Reach: lesson, review, learn via the thought, chat, tactics, weaknesses. Census: 123 lines (77 said): lesson 110 (64 said, 46 held `already-said`), review 13. Run: 32 fires (18 their move, 14 the student's), 4 on an opponent move costing ≥ 100.

## B. Facts
- **B1** `TradeRelievesCramp` (31–40): `cramped` (colour), `trade` (SAN, inside the engine line), `target` (square taken), `text`, `squares`, `line {fen, sans}` (the line up to the trade and take-back).
- **B2 dropped:** which rule decided "cramped" — pawns (`byPawns`) or mobility (`mobility.mine/theirs`) — is only visible in the words; `intruders` (the planted pieces); the line index of the trade (how many moves away).
- **B3 cheap:** whether the trade is `trade`-ply 0 (available NOW) or later in the line — `moves.slice(0, i+2)` already has it; whether the student's move just made (or allowed) the trade.
- **B4 gates:** a middlegame (a queen on, 4+ pieces a side, 57–58); cramped by pawns, or by mobility ≤ 85% with an intruder minor on the cramped side's 3rd/4th rank (59–71); a line within 50 cp of best (78); the cramped side's first three moves (84); an even trade (a bishop counted as a knight) taken straight back (85–90), on an intruder square unless the pawn rule fired (91).
- **False at times (board truth):** the target is named by the piece that stands on `m.to` AT THE TRADE inside the line, while the sentence is said about the board now. Run: g chesscom-1012441262 ply 16 …Bg4 — "Bxf3 would take off your knight on f3" with White's QUEEN on f3 on the board said (the knight reaches f3 later in the line).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "Short of space, look to trade … The fewer pieces on the board, the less their space matters." | — |
| CONSEQUENCE | partly | the mobility count (when that rule fired) | — |
| BETTER MOVE + JOB | partly | `trade` (for the cramped student) | — |
| HABIT | no | — | — |

## D. Lesson recipes
Causes: **CR-OFFER** (S, the side with room): the student's move allowed (offered) the cramped side's even trade and cost ≥ floor — "with a cramped opponent avoid simplifications"; **CR-MISS** (S, cramped): the student was cramped, the trade was the engine's choice (ply 0) and the student played something else costing ≥ floor.

| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CR1 | strategize (keep pieces on) | S (room) | CR-OFFER | their trade, target | "With a cramped opponent, avoid trades: every pair that comes off gives them room." / "They're short of space, so they want pieces off — your move let them trade your {piece}." | "Their cramp eases." | "{best} kept the {piece} out of the trade." | "When you have more space, keep pieces on." | full | the trade target is not on the board as named (F1) | H + C (allowed: the trade appears at ply 0 only after the student's move) |
| CR2 | strategize (trade to breathe) | S (cramped) | CR-MISS | trade, target | "When you're cramped, trade pieces: the fewer pieces on the board, the less their space matters." / "Short of room, look to trade off the piece doing the cramping — {target}." | — | "{trade} — it takes off their {piece}." | "Cramped? Trade. Spacious? Keep pieces on." | full once past | the trade is not at ply 0 (B3) | H |
| CR3 | identify (the cramping piece) | S | mobility rule, intruder | piece, counts | "A piece planted in your half is what cramps you: their {piece} on {sq}, and your pieces have {m} squares to their {t}." | | "{best} traded it off." | | full | — | H (counts) |
| CR4 | opponent seat | O | their cramped side traded correctly / missed it | — | Review only (not a student mistake) | | | | | | |
| CR5 | record | S | — | — | RED/GREY full · AMBER one clause · GREEN silent | | | | | | `holdState` on `space-trade` (new) |

Not applicable: endgame (gated out — the room that matters there is the kings'), calculate (the line is the engine's).

## E. Mistake link
- Student: `positionalReason` has no tag for "allowed a relieving trade" / "didn't trade when cramped" — new cause `cramp-trade` (CR1/CR2); today such a cost is filed as `no-plan` / `misplaced-piece` with no square.
- Opponent: CR4.

## F. Build changes
1. Board truth (`tradeRelievesCramp.ts` 95, `theirPiece` from `m.captured` inside the line): name the target by the piece on `m.to` on the CURRENT board, or — when it differs — say it as a line ("after {line}, {trade} takes off your knight"); never "your knight on f3" when f3 holds a queen now. Board that must change: g chesscom-1012441262 ply 16 …Bg4.
2. Return `rule: 'pawns' | 'mobility'`, `mobility`, `intruders`, `tradePly` (B2/B3).
3. CR-OFFER needs the before/after diff: the trade at ply 0 after the student's move and not before (call on both boards).
4. Speak in Learn only on CR1/CR2 (the 46 `already-said` holds are the standing read repeating).

## G. Proof boards (run)
- CR1 (their trade, the student offered?): g chesscom-1012441262 ply 8 …Nc6 → "With less space, they'll look to trade, and Bxf3 gets rid of your knight on f3."
- F1 false board: g chesscom-1012441262 ply 16 …Bg4 (cost 113) `r1bqk2r/ppp1p1bp/2np1np1/6N1/3PP3/2P2Q2/PP3PPP/RNB1K2R b KQ - 0 8`.
- CR2 (student cramped): g chesscom-1001055178 ply 47 Bf3 (student White) → "Short of space, look to trade: Rxd4 removes their rook on d4." (cost 21 — guard: not a mistake).
- Census: lines-0.jsonl:112 (mobility counts said), lines-0.jsonl:1477.

## H. Open questions
- none.
