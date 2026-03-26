# Work Order: Gambits Tab + New Pro Players

## Branch
`claude/review-chess-docs-U73uk` (or create a new branch off `main`)

## Context
- Voice pack architecture is merged to `main` (PR #15)
- 5 new gambit annotation files already committed to the branch: `danish-gambit.json`, `stafford-gambit.json`, `englund-gambit.json`, `scotch-gambit.json`, `vienna-gambit.json`
- `af_bella_checkpoint.bin` exists on Google Drive (partial voice pack, 500+ clips)
- All existing pro player repertoires verified accurate against Lichess data

---

## Task 1: Create `src/data/gambits.json`

Same format as `repertoire.json`. 12 gambits with full rich data (overview, keyIdeas, traps, warnings, variations).

### White Gambits:
| ID | Name | ECO | PGN | Color |
|----|------|-----|-----|-------|
| `kings-gambit` | King's Gambit | C30 | `e4 e5 f4` | white |
| `evans-gambit` | Evans Gambit | C51 | `e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O` | white |
| `scotch-gambit` | Scotch Gambit | C44 | `e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 e5` | white |
| `vienna-gambit` | Vienna Gambit | C25 | `e4 e5 Nc3 Nf6 f4 exf4 e5` | white |
| `danish-gambit` | Danish Gambit | C21 | `e4 e5 d4 exd4 c3 dxc3 Bc4 cxb2 Bxb2` | white |
| `smith-morra-gambit` | Smith-Morra Gambit | B21 | `e4 c5 d4 cxd4 c3 dxc3 Nxc3` | white |

### Black Gambits:
| ID | Name | ECO | PGN | Color |
|----|------|-----|-----|-------|
| `stafford-gambit` | Stafford Gambit | C42 | `e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6` | black |
| `marshall-attack` | Marshall Attack | C89 | `e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5` | black |
| `englund-gambit` | Englund Gambit | A40 | `d4 e5 dxe5 Nc6 Nf3 Qe7` | black |
| `budapest-gambit` | Budapest Gambit | A51 | `d4 Nf6 c4 e5 dxe5 Ng4` | black |
| `albin-countergambit` | Albin Countergambit | D08 | `d4 d5 c4 e5 dxe5 d4` | black |
| `benko-gambit` | Benko Gambit | A57 | `d4 Nf6 c4 c5 d5 b5 cxb5 a6` | black |

Each needs: `id`, `eco`, `name`, `pgn`, `color`, `style`, `overview`, `keyIdeas[]`, `traps[]`, `warnings[]`, `variations[]` (2-4 per gambit with name, pgn, explanation).

Annotations already exist in `src/data/annotations/` for all 12 gambits (the 5 new ones + 7 pre-existing).

---

## Task 2: Add `isGambit` flag to `OpeningRecord`

In `src/types/index.ts`, add to `OpeningRecord`:
```typescript
isGambit?: boolean;
```

---

## Task 3: Add Gambit Loader to `src/services/dataLoader.ts`

- `import gambitData from '../data/gambits.json'`
- Add `loadGambitData()` function (same pattern as `loadRepertoireData` but sets `isGambit: true`)
- Call it from `seedDatabase()`
- **Bump `SEED_KEY`** from `db_seeded_v9` to `db_seeded_v10`

---

## Task 4: Add `getGambitOpenings()` to `src/services/openingService.ts`

```typescript
export async function getGambitOpenings(): Promise<OpeningRecord[]> {
  return db.openings.filter((o) => o.isGambit === true).toArray();
}
```

---

## Task 5: Create `src/components/Openings/GambitsTab.tsx`

A new tab component showing gambits grouped by color:
- **White Gambits** section (King's Gambit, Evans, Scotch Gambit, Vienna, Danish, Smith-Morra)
- **Black Gambits** section (Stafford, Marshall Attack, Englund, Budapest, Albin, Benko)

Use the same `OpeningCard` component. Route to `/openings/${gambit.id}` on click.
Import `Swords` from lucide-react for the icon.

---

## Task 6: Add Gambits Tab to `OpeningExplorerPage.tsx`

1. Change `TabMode` to: `'repertoire' | 'all' | 'gambits' | 'pro'`
2. Add 4th tab button between "All Openings" and "Pro Repertoires":
   - Icon: `Swords` from lucide-react
   - Label: "Gambits"
3. Add render condition: `{tab === 'gambits' && <GambitsTab />}`

---

## Task 7: Add 7 New Pro Players to `src/data/pro-repertoires.json`

### New Players (add to `players` array):
```json
{ "id": "gukesh", "name": "Gukesh Dommaraju", "title": "GM", "rating": 2763, "style": "Classical, Attacking", "description": "The youngest undisputed World Chess Champion in history. Known for launching brilliant attacks from quiet openings.", "imageInitials": "GD" },
{ "id": "praggnanandhaa", "name": "Praggnanandhaa R", "title": "GM", "rating": 2740, "style": "Balanced, Calculating", "description": "Indian prodigy who reached the World Cup final at 18. Exceptional calculation and endgame technique.", "imageInitials": "PR" },
{ "id": "niemann", "name": "Hans Niemann", "title": "GM", "rating": 2700, "style": "Dynamic, Competitive", "description": "American GM known for dynamic play and competitive fighting spirit.", "imageInitials": "HN" },
{ "id": "ericrosen", "name": "Eric Rosen", "title": "IM", "rating": 2377, "style": "Trappy, Creative", "description": "The Stafford Gambit king. Famous for creative gambits and devastating opening traps.", "imageInitials": "ER" },
{ "id": "annacramling", "name": "Anna Cramling", "title": "WFM", "rating": 2175, "style": "Solid, Classical", "description": "Daughter of GM Pia Cramling. Popular streamer who invented 'The Cow' opening. Plays her mum's openings with her dad's style.", "imageInitials": "AC" },
{ "id": "chesswithakeem", "name": "Akeem Brown", "title": "CM", "rating": 2304, "style": "Tactical, Blitz Specialist", "description": "Youngest National Master in Jamaican history at 16. Teaches openings and gambits with a philosophy connecting chess to life.", "imageInitials": "AB" },
{ "id": "samayraina", "name": "Samay Raina", "title": "", "rating": 1938, "style": "Entertaining, Improving", "description": "Indian comedian and chess streamer. Known for hilarious commentary and piece nicknames. Won SuperPogChamps 2025.", "imageInitials": "SR" }
```

### New Openings (add to `openings` array):

For each player, add 3-4 openings. Here are the verified lines:

**Gukesh (3 openings):**
- White: Italian Game/Giuoco Piano — `e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+`
- White: Catalan Opening — `d4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4 Qc2`
- Black: Sicilian Najdorf — `e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6`

**Praggnanandhaa (3 openings):**
- White: Ruy Lopez — `e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O`
- White: Catalan — `d4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O`
- Black: Sicilian Najdorf — `e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6`

**Hans Niemann (3 openings):**
- White: Ruy Lopez Anti-Marshall — `e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 exd5`
- Black: Sicilian Najdorf — `e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6`
- Black: Grunfeld Defense — `d4 Nf6 c4 g6 Nc3 d5`

**Eric Rosen (3 openings):**
- White: Italian Game — `e4 e5 Nf3 Nc6 Bc4 Bc5`
- Black: Stafford Gambit — `e4 e5 Nf3 Nf6 Nxe5 Nc6`
- Black: Englund Gambit — `d4 e5`

**Anna Cramling (3 openings):**
- White: Italian Game — `e4 e5 Nf3 Nc6 Bc4 Bc5`
- White: London System — `d4 d5 Bf4 Nf6 e3 e6 Nf3 Be7 Bd3`
- Black: Sicilian Defense — `e4 c5`

**Akeem Brown (3 openings):**
- White: Italian Game — `e4 e5 Nf3 Nc6 Bc4 Bc5`
- White: Scotch Game — `e4 e5 Nf3 Nc6 d4 exd4 Nxd4`
- White: King's Gambit — `e4 e5 f4`

**Samay Raina (3 openings):**
- White: Italian Game — `e4 e5 Nf3 Nc6 Bc4 Bc5`
- Black: Sicilian Najdorf — `e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6`
- Black: Nimzo-Indian — `d4 Nf6 c4 e6 Nc3 Bb4`

Each opening needs the full treatment: `id`, `playerId`, `eco`, `name`, `pgn`, `color`, `style`, `overview`, `keyIdeas[]`, `traps[]`, `warnings[]`, `variations[]`. Write in an engaging coaching voice explaining WHY each player favors this opening.

---

## Task 8: Wire `af_bella.bin` Voice Pack

1. Create dir: `public/voice-packs/`
2. Copy the checkpoint file there: `af_bella_checkpoint.bin` → `public/voice-packs/af_bella.bin`
3. The app already looks for it at `/voice-packs/{voiceId}.bin` via `DashboardPage.tsx` and `VoiceSettingsPanel.tsx`

---

## Task 9: Tests & Validation

- Run `npm run test:run` — all tests must pass
- Run `npm run typecheck` — no errors
- Run `npm run lint` — no new errors
- Verify the gambit tab renders with `data-testid="tab-gambits"`

---

## Task 10: Commit, Push, PR, Merge

Per CLAUDE.md deployment policy: commit, push, create PR, merge immediately. Don't ask — just do it.

---

## Files to Create
- `src/data/gambits.json`
- `src/components/Openings/GambitsTab.tsx`

## Files to Modify
- `src/types/index.ts` (add `isGambit`)
- `src/services/dataLoader.ts` (add gambit loader, bump seed version)
- `src/services/openingService.ts` (add `getGambitOpenings`)
- `src/components/Openings/OpeningExplorerPage.tsx` (add 4th tab)
- `src/data/pro-repertoires.json` (add 7 players + their openings)

## Do NOT
- Touch any voice/speech/kokoro files
- Modify existing repertoire or annotation data
- Change the DB schema
- Add new npm dependencies
