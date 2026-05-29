# Naroditsky on the King's Indian Defense — voice corpus

Pass A skeleton (2026-05-29). Data fingerprint + URL list. Per the
narration split-pass rule (locked David 2026-05-29), narration is
authored in a separate Pass B session that will fill the
distillations + transcript excerpts here, then ground every beat in
this content.

## Data fingerprint (from his chess.com archive)

- **4,432 games** in the KID as Black (his most-played Black opening)
- **65.0% score** across the whole sample
- **7 distinct named White setups** with ≥100 games each:
  - Classical mainline (Be2 Mar del Plata) — 715g, 30-ply spine
  - Anti-KID with Nf3 first — 592g, 22-ply spine
  - Makogonov (h3) — 335g, 30-ply spine
  - Fianchetto (g3) — 316g, 22-ply spine
  - Sämisch (f3) — 292g, 30-ply spine
  - Petrosian / Nge2 setup — 167g, 25-ply spine
  - Four Pawns Attack — 106g, 22-ply spine

## Endgame distribution (decisive games per variation)

| Variation | R+min+P | Q+P | minor+P | R+P |
|---|---|---|---|---|
| classical-mainline | 26.4% | 14.5% | 8.8% | 10.0% |
| fianchetto | 29.4% | 14.3% | 8.7% | 4.8% |
| anti-kid-nf3 | 23.3% | 17.3% | 9.2% | 6.5% |
| makogonov | 25.8% | 14.8% | 8.1% | 8.4% |
| saemisch | 29.7% | 14.5% | 8.6% | 8.6% |
| petrosian-nge2 | 28.4% | 14.9% | 8.8% | 7.4% |
| four-pawns | 23.0% | 9.2% | 12.6% | 6.9% |

R + minor + P dominates everywhere (22-29%); Q+P is the secondary
endgame (13-17%). 2-3 endgame plans per variation by the
≥10% rule.

## Middlegame plan clusters (per ply, by frequency)

See `/tmp/kid-plans.out` for full output. Top patterns:
- **Classical mainline**: kingside Nh5 → Nf4 → f5 storm + Nc6/c6/exd4 trades
- **Fianchetto / Anti-KID Nf3**: Qa5 queenside + exd4 simplification + Nc5 reroute
- **Makogonov**: Na6 → c5 → c6 setup + Nh5/Nf4 break
- **Sämisch**: a6 → b5 queenside expansion (Bronstein/Panno style)
- **Petrosian Nge2**: a6 → b5 → Re8 + h5
- **Four Pawns**: dxe5 trade + Nc6 / Ne8-Nd6 reroute

## Mined White-blunder trap patterns

See `data/sources/danielnaroditsky-kid-trap-candidates.json` for the
full mined list. Top patterns (1,854 unique, 2,185 total blunders
across 2,650 KID wins):

| # | Games | Move | At ply | Notable victims |
|---|---|---|---|---|
| 1 | 30 | f3 at move 9 | ply 17 | (varied) |
| 2 | 26 | cxd5 at move 4 | ply 7 | (varied) |
| 3 | 22 | e4 at move 4 | ply 7 | (varied) |
| 4 | 21 | Nd5 at move 10 | ply 19 | (varied) |
| 5 | 18 | Re1 at move 8 | ply 15 | (varied) |
| 6 | 16 | Qd2 at move 8 | ply 15 | (varied) |
| 7 | 14 | O-O at move 7 | ply 13 | (varied) |
| 8 | 13 | Be3 at move 10 | ply 19 | (varied) |
| 11 | 11 | Qxd8 at move 8 | ply 15 | Firouzja 3087, nihalsarin 2949 |
| 12 | 10 | Nc3 at move 7 | ply 13 | GMBenjaminBok 2963 |
| 14 | 8 | Be3 at move 6 | ply 11 | (varied) |
| 15 | 8 | f4 at move 5 | ply 9 | NikoTheodorou 2958 |

Top trap candidates surface in the lesson `trapLines[]` array for
Pass A; Pass B narration explains the refutation mechanism.

## Voice — sources for Pass B narration

### Speedrun YouTube content (URLs only; transcripts blocked from sandbox)

These are referenceable but the transcripts can only be pulled from
David's local machine via `yt-dlp`. The URLs themselves are NOT in
the narrationSources allowlist (youtube.com isn't whitelisted), so
beat text referencing his YouTube content uses neutral framing
without verbatim quotes.

Pass B should pull these via `yt-dlp` on David's local machine and
drop the .en.vtt transcripts at
`data/sources/danielnaroditsky-voice/transcripts/`:

- TODO Pass B — search his YouTube channel for KID-specific videos.
  Pattern from Alapin corpus: "GM Naroditsky's <Opening> | Theory
  Speedrun" or "Mastering the King's Indian" etc.

### Lichess studies + community distillations (accessible)

- TODO Pass B — search lichess.org for community-curated Naroditsky
  KID summaries (Gordima-style distillation pages). Example URL
  pattern: `https://lichess.org/@/Gordima/blog/...`.

### Consensus framings (apply to KID universally — gather URLs)

The KID's identity (from textbook framings, to be cited in
narrations):
- **Counter-attack opening**: Black accepts a space disadvantage in
  exchange for kingside dynamism. The Bg7 is the most important piece
  on the board.
- **Mar del Plata fight (Classical/Be2)**: race between Black's
  ...f5-f4-g4 kingside storm and White's c4-c5-cxd6 queenside
  break.
- **Sämisch (f3)**: White's f3 prevents ...Ng4 and ...Nh5; Black's
  reply is ...a6 + ...b5 + ...Na5 to fix the queenside.
- **Four Pawns**: White over-extends with c4-d4-e4-f4; Black
  undermines with ...e5 + ...dxe5 + counter-attack.
- **Fianchetto**: positional fight; Black plays Yugoslav with ...e5
  + ...Nbd7 + ...Qa5 + ...b5.

URLs to gather in Pass B:
- TODO Pass B — chess.com KID opening page
  (`https://www.chess.com/openings/Kings-Indian-Defense`)
- TODO Pass B — lichess opening explorer entries per variation
- TODO Pass B — chessable.com Naroditsky course if one exists
- TODO Pass B — wikipedia.org entries for each named variation

## Narration rule (Pass B reminder)

Every beat in every KID lesson narrates from:
1. The position on the board (what just changed) — verified by
   chess.js per the §1c NARRATION FACT-CHECK GATE
2. The data fingerprint above (game count + percentage)
3. The voice corpus framings (sourced; URL cited per beat)

Never invent:
- A specific move he plays that isn't in the tree
- A quote attributed to him verbatim (unless transcript-backed)
- A game count or score percentage — these come from the archive only
- A line continuation he supposedly recommends — only what the data shows

`sources[]` on every beat: 1+ reputable https URL per the
`narrationSources.ts` allowlist (chess.com, lichess.org,
chessbase.com, chessable.com, wikipedia.org, 365chess.com).
