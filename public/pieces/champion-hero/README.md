# Champion hero art (menu / splash pieces)

Drop the **heroic 3/4-view renders** here — the dramatic, cosmic-background,
gold-and-green sculpted pieces (the same treatment as the app icon's knight).

These are for **menu / splash / piece-picker preview** surfaces only — they are
intentionally **not** used as on-board pieces (the flat side-profile renders in
`../champion-board/` are, because hero crops are too bulky to read at board
size).

## Filenames (exact)

```
wK.png  wQ.png  wR.png  wB.png  wN.png  wP.png   ← gold / light side
bK.png  bQ.png  bR.png  bB.png  bN.png  bP.png   ← dark / opposite side
```

Helper URLs: `championHeroPieceUrl(pieceKey)` in
`src/services/championPieceSet.ts`. Menu wiring lands in a follow-up once the
art exists.
