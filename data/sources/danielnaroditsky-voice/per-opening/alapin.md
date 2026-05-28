# Naroditsky on the Alapin Sicilian — voice corpus

Gathered 2026-05-28 for the pro-rep deep build. Sources are URL-attributed
so every lesson `sources[]` array can cite them by `narrationSources`
allowlist domain.

## Data fingerprint (from his chess.com archive)

- **2,752 games** in the Alapin (his most-played anti-Sicilian)
- **73.8% score** across the whole sample
- **28-ply spine** in the main 2...Nf6 line (1,105 games on the spine)
- **6 distinct Black 2nd-move replies** with ≥100 games each:
  - 2...Nf6 (1,105g, ~62%) — main spine
  - 2...d5 Open Variation (783g, 71.3%)
  - 2...e6 French-style (344g, 74.0%)
  - 2...d6 main line (173g, 80.6%)
  - 2...g6 Hyper-Dragon (125g, 79.6%)
  - 2...Nc6 line (116g, 88.4%)
- **2 internal sub-branches** in the Nf6 spine at 4.Nf3:
  - 4...d6 (394g, 70.3%)
  - 4...e6 (185g, 72.4%)

## Voice — what he teaches

### Gordima's Lichess distillation (URL-cited)

> *"Alapin is a common weapon by great blitz players like Naroditsky,
> Bortnyk, Zhigalko, etc. When Black goes for Sicilian, Danya mainly
> combines Bb5 lines with Alapin. What makes Danya's Alapin unique is,
> for example, the Bb5+ line followed by Bc4 against Nf6-d6."*

Source: https://lichess.org/@/Gordima/blog/naroditskys-blitz-repertoire/O0IqPlQR

Key teaching ideas extracted:
- The Alapin is a **practical** anti-Sicilian weapon — its job is keeping
  the game out of deep theoretical Najdorf/Sveshnikov memorisation
- His version is **NOT pure Alapin** — he mixes in Bb5/Moscow/Rossolimo
  ideas via transposition
- Distinguishing trick: **Bb5+ followed by Bc4** against the 2...d6 setup
  (the 394g sub-line in his data)

### Consensus framing (ChessBase / Demchenko / 365Chess)

The Alapin's identity:
- "Take control of the game as early as move two"
- "Sidestep heavy Sicilian theory"
- "Logical piece development, early central control, practical positions"
- "Solid yet flexible while remaining surprisingly aggressive"
- "Practical chances to outplay your opponent rather than memorise"

Sources:
- https://en.chessbase.com/post/svitlana-demchenko-silence-the-sicilian-win-with-the-alapin-variation-2-c3
- https://www.chess.com/openings/Alapin-Sicilian-Defense
- https://www.365chess.com/chess-openings/Sicilian-Defense

### YouTube speedrun URLs (his actual content, transcript blocked from sandbox)

These are referenceable but the transcripts can only be pulled from
David's local machine via `yt-dlp`. The URLs themselves are in
`narrationSources` allowlist (youtube.com).

- "The Alapin (C3) Sicilian Defense | The Sensei Speedrun"
  https://www.youtube.com/watch?v=o29kg7LLAVg
- "Sicilian — Alapin Variation In-Depth Analysis | Theory Speedrun"
  https://www.youtube.com/watch?v=kWk-UW7GdnY
- "GM Naroditsky's Top Theory Speedrun | The Sicilian Defense, Alapin"
  https://www.youtube.com/watch?v=KNwKz9Ssi8c
- "Speedrun Is Back!! | Sicilian — Alapin | Theory Speedrun"
  https://www.youtube.com/watch?v=ktoa6lk6qNk
- "Best Game So Far!! | Mastering the Alapin Sicilian | Theory Speedrun"
  https://www.youtube.com/watch?v=nkDlJMpLezk

When a beat narration references his specific YouTube content, cite the
URL — that proves the source exists. The detailed transcript content
is a future enrichment (yt-dlp from local machine) and the beat text
can mention "in his speedrun coverage" without claiming verbatim quotes.

## The Naroditsky Alapin signature (from data, not from invented theory)

These are the moves/patterns the data demonstrates — every beat in the
authored lessons must anchor here:

1. **The 73.8% score is in the 2...Nf6 spine** — the deep main line.
   Other variations score similarly or higher (the d6 line at 80.6%
   is his best, but it's only 173 games).

2. **The opening spine ends at move 14** with `Bxe6 Qxe6 a4 Qd7 a5 Nd5
   a6 b6 d4 e6 Ne5 Nxe5 dxe5 Be7 Qg4` — the queenside crawl + central
   piece play. This is the position the lesson walks to.

3. **The queenside crawl (a4-a5-a6)** is the defining plan — appears
   ~25% of games at move 11 and is the structural feature he plays for.

4. **The Bb3 + Bxe6 trade-down** is the standard sequence — kill
   Black's light-squared bishop before he can coordinate.

5. **The exd6 en-passant** is the central break — 25% of his
   continuation choices at move 7 (273 of 1,102 games at that ply).

6. **R + minor + P endgames** are the dominant conversion structure —
   29.4% of decisive endings in the main spine, 27-34% across every
   variation. The endgame plan is built around the queenside passer +
   bishop pair.

## Lesson narration rule (locked)

Every beat in every Alapin lesson narrates from:
1. The position on the board (what just changed)
2. The data fingerprint (game count + percentage)
3. The voice corpus framing above (sourced)

Never invent:
- A specific move he plays that isn't in the tree
- A quote attributed to him verbatim (unless transcript-backed)
- A game count or score percentage — these come from the archive only
- A line continuation he supposedly recommends — only what the data shows

`sources[]` on every beat: 1+ of `book:sicilian-alapin`,
`https://lichess.org/@/Gordima/blog/naroditskys-blitz-repertoire/O0IqPlQR`,
`https://en.chessbase.com/post/svitlana-demchenko-silence-the-sicilian-win-with-the-alapin-variation-2-c3`,
`https://www.chess.com/openings/Alapin-Sicilian-Defense`, his archive
URL, or a YouTube URL above.
