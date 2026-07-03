# Glek Sharpening + "Sharpen the Systems" Sweep — 2026-07-03

David watched Naroditsky's DYI speedrun (video `fGBhk9oqdbg`, "Hippo & Glek
Unveiled") teaching the **sharp** Glek: the `Ne2` prophylaxis, the `f4`
bishop-trap, and the `g4`/`Ng3`/f5 kingside storm. Our Glek tab only had the
*calm* plan (Be3 trade + Nh4→f5). Task: (1) add the sharp Naroditsky plan,
narrations guided by his video; (2) sweep the app's other openings for quiet
systems that can be sharpened "in the same manner", and build the ones that
hold up.

## Part 1 — Glek f4-trap plan: **BUILT + engine-verified** ✅

New middlegame plan `mp-fourknightsgame-glek-f4trap`
(`src/data/middlegame-plans.json`), wired onto the Glek tab
(`fourKnightsMasterclassTabs.ts` → `'glek system': [...,'mp-fourknightsgame-glek-f4trap']`).

The whole line, **engine-verified** (Stockfish 18 WASM, depth 18-20), grounded
in Naroditsky's teaching (transcript pulled via yt-dlp — reference only, prose
original):

- **Fork-trick backstory** (why `...d6` is mandatory): `4.g3 Bc5 5.Bg2 O-O?!
  6.Nxe5! Nxe5 7.d4!` (centre fork) `Bd6 8.dxe5 Bxe5 9.O-O` → **+0.25**, bishop
  pair + dark squares. (Only +0.25 → a *lesson point*, NOT a punish-gem; below
  the +0.5 weapon bar, correctly not surfaced as a gem.)
- **The trap tabiya** (after `9...d6?!`, blocking the bishop's retreat):
  `Ne2!` is the **engine's #1 move** (+0.59) — Naroditsky's prophylaxis confirmed.
  `...Nd7` is Black's **only** defence (engine forces it — exactly as he says).
  `f4! Bf6 g4! g6 Ng3 Bg7` → **White +0.6/+0.7**: the bishop is entombed, White
  owns the f5 outpost and a rolling kingside storm.
- Premature `f5` (pawn) drops to −0.28 — the sound version routes the *knight*
  to f5. The plan reflects this (Ng3, not a pawn ram).

Narration is Naroditsky house-style (in-depth, shows every move, explains the
*why*), two registers (`annotations` + `learnCues`), lead-the-eye arrows
(green knight vision arrows only — pawn arrows are illegal per the
`middlegamePlanner` `sees()` gate) + orange move / yellow key-square highlights.
Gates green: `middlegamePlanThemes`, `middlegamePlanner` (lead-eye), 
`middlegamePlanFenCoherence`, `MiddlegamePlansSection`.

## Part 2 — The sweep: which quiet systems can be sharpened "in the same manner"?

**Method.** "Same manner" = a quiet/system opening whose calm setup hides a
*concrete, engine-verified* attacking resource (prophylaxis → pawn storm →
knight-to-f5 outpost → trap/entomb a bishop). Every candidate was
**engine-tested before any authoring** — no storm ships unless Stockfish
endorses it from the student's side (soundness doctrine: a quiet line that only
equalizes must NOT be dressed up as winning).

### Finding: the app is already well-sharpened. The Glek was the real gap.

Most system openings **already** carry their sharp plan:

| System | Sharp plan already present |
|---|---|
| King's Indian Attack | "e5 Kingside Expansion" + "vs French: e5-Wedge Kingside Attack" (incl. h4/Nf1-h2 storm) |
| London System | "e5-Outpost and f4 Kingside Play" + Jobava "Kingside Lunge" (h4/Ng4) |
| Italian Game | "Modern d3: the Nf1-g3-f5 Manoeuvre" (the Glek's twin — already there) |
| Trompowsky | "Raptor: the g4-g5 Kingside Storm" |
| Scotch | "Scotch Gambit: the f5/e5 Pawn Storm" |
| Vienna | "Classical: the f5 Outpost Attack" + the Gambit |
| Bird's | "Classical kingside attack" + "Stonewall Rook-Lift Attack" |
| Caro-Kann | "Exchange: Opposite Castling and the …h-Pawn Storm" |
| Four Knights | Glek (calm) **+ NEW Glek f4-trap** ✅ |

### Candidates engine-tested and **rejected** (would violate soundness):

- **Queen's Gambit — Pillsbury Attack** (`queens-gambit` is White; the famous
  Ne5/Bd3/f4/Qf3/Rf3-h3 kingside crush vs the Orthodox QGD). **Engine: only
  ~−0.2/equal** against modern defence (…dxc4/…c5 free Black; engine prefers
  quiet Bxf6/Rad1 over the storm). Historically instructive but objectively
  equalizes — NOT shipped as a winning plan (soundness gate). *This is the
  guardrail working: LLMs can't play chess, so we verify.*
- **English — Botvinnik f4-f5 kingside storm** (`english-opening`, White).
  Real tabiya is only **+0.25**; forcing `f4-f5` **drops to −0.38** (premature,
  backfires — same failure mode as premature Glek f5). White's real English
  edge is the **queenside** (already covered by "Reversed Sicilian: Queenside
  Expansion"). Not shipped.
- **London Greek Gift (Bxh7+)** — position-specific tactical shot, not a general
  plan; well-defended it equalizes. The London's two existing kingside plans
  already cover its attack. Not shipped.

### Backlog (needs deeper / human-curated research before it could ship soundly)

Flagged, NOT faked (empty > invented). Each would need real grounding + engine
confirmation on a specific sound line:

- **Closed Sicilian — Spassky f4-f5-g4-g5 + Qd2-Bh6 avalanche.** The textbook
  quiet-to-storm. Lives in pro-rep (Carlsen/Hikaru/EricRosen closed-Sicilian)
  where it's player-attributed — would ground in that player's games, not the
  masterclass set.
- **QGD Exchange — opposite-side-castling kingside pawn storm** (White O-O-O +
  h4-g4). Distinct from the shipped short-castle minority attack; a real
  alternative treatment, but needs a verified concrete line.
- **Petrov — Cochrane Gambit (Nxf7!?).** A sacrifice showcase (honest negative
  eval allowed for gambits), not a "sound edge" plan — would ship labelled as a
  showcase if David wants it.

## Status

- [x] Glek f4-trap plan authored, engine-verified, wired, gates green.
- [x] Sweep run with engine verification on every candidate.
- [ ] Backlog items above — await David's greenlight (each is a real build, not
      a fabrication; only build what the engine confirms).

## Next-session pickup

The Glek build is the template: pull the pro's video (yt-dlp works in-env),
build the line with the Stockfish-WASM harness (`node_modules/stockfish/bin/
stockfish-18-lite-single.js` driven over UCI — see the scratch harnesses used
here), **verify the engine endorses the sharp move from the student's side**,
then author two-register Naroditsky-style narration with lead-the-eye arrows
(knight/bishop/rook vision arrows only — pawns fail `sees()`), wire the plan id
into the opening's `*MasterclassTabs.ts` map. If the engine won't endorse it,
it doesn't ship — document it in the backlog instead.
