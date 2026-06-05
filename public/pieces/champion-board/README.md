# Champion board pieces (the on-board gold set)

Drop the **12 rendered board pieces** here to power the **"Gold (Champion)"**
piece set (Settings → Board → Piece Set).

## Requirements (so they read on a real board)

- **Flat, SIDE-PROFILE silhouettes** — like a real chess set seen from the
  side. NOT the 3/4 heroic cosmic crops (those go in `../champion-hero/` for
  menus; they're too bulky to read at ~40px on a phone board).
- **Transparent background** (no cosmic backdrop, no glow baked into a box).
- **Square canvas**, consistent height + baseline across all 12 so pieces
  don't jump in size square to square.
- Already gold/green — the app applies **no** tint to these (the tint is only
  for the fallback glyphs).

## Filenames (exact)

```
wK.png  wQ.png  wR.png  wB.png  wN.png  wP.png   ← gold / light side
bK.png  bQ.png  bR.png  bB.png  bN.png  bP.png   ← dark / opposite side
```

(`.png` is the default. To use `.webp` or `.svg`, change `CHAMPION_IMAGE_EXT`
in `src/services/championPieceSet.ts`.)

## Turning them on

Set `CHAMPION_USE_CUSTOM_IMAGES = true` in
`src/services/championPieceSet.ts` (or just ask Claude). That's the only code
change — every board picks them up on reload. Any individual piece that's
missing falls back to the gold-tinted cburnett glyph automatically, so a
partial set never shows a broken image.
