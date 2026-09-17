# The 25 parked draft PRs — where does each belong?

David 2026-09-17: *"i want you to dig through the MD files and anywhere else you
can think of to figure out where these belong."*

**25 open PRs, every one a draft, oldest 2026-07-04.** (David remembered 19; the
real count is 25.) None has been touched since; several are months old.

## How each was classified — and why the obvious method does not work

`origin/main` in this container is a **168-commit shallow snapshot with no
common ancestor** to any PR branch. So `git merge-base`, `git cherry`, ahead/
behind counts and branch diffs are all meaningless here — every branch reads
"3,500–6,800 ahead". Anything derived from history is noise.

Only CONTENT answers it, in three tiers of confidence:

- **PROVEN** — the behaviour was executed, or the exact line read, on `main`.
- **STRONG** — ≥80% of the PR tip-commit's added lines are present on `main`.
- **WEAK** — a low line-match. **This is NOT proof of "owed."** A fix that
  landed as a *rewritten* regex matches none of its original lines. Two PRs
  below (#740, #758) scored 0/12 on the line scan and are demonstrably LANDED
  when the code is actually run. Every WEAK row needs a behavioural check
  before anyone acts on it.

## The verdicts

### Genuinely OWED — proven, and worth shipping

| PR | what | proof |
|---|---|---|
| **750** | `.catch()` on `seedPuzzles()` / `seedVerifiedLibraryNote()` at boot — an unhandled IndexedDB transaction abort | **PROVEN.** `origin/main:src/App.tsx:403-404` is still the bare `void seedPuzzles();`. Open since **26 June**. |
| **760** | `sanitizeForTTS` does not expand a lowercase piece letter at the start of a clause | **PROVEN.** On `main`, `sanitizeForTTS('b supports the centre')` returns it **unchanged** — TTS reads "b" as a letter. |
| **726** | `scripts/` novel-opening hunter (rare moves Stockfish rates strong) | No such script on `main`. |

### Already LANDED — close them

| PR | confidence |
|---|---|
| **740** smart-apostrophe sanitizer | **PROVEN** — `"white’s R is active"` → `"white's rook is active"` on main |
| **758** lowercase piece letters | **PROVEN** — `the p on f3` → `the pawn on f3`, `hanging q` → `hanging queen` |
| **806** variation tabs / honest lines counter | STRONG (12/12) |
| **720** walkthrough control words | STRONG (2/2) |
| **704** coach response-quality audit | STRONG (12/12) |
| **696** remove legacy walkthrough board | STRONG (11/12) |
| **692** unify opening-tab chrome | STRONG (12/12) |
| **685** hide "Most Common" tab | STRONG (10/12) |

### SUPERSEDED — close, do not lift

| PR | why |
|---|---|
| **678** deepen middlegame plans | `main` has **578** plans; this branch has **329**. Main moved far past it. |
| **669** Queen's Gambit family masterclasses | **The docs already ruled on this.** `docs/plans/2026-05-25-finish-white-openings-WO.md:30`: *"`#669` (open draft, branch `claude/zen-tesla-JuPbF`) is **STALE** — its content predates the new SEALED gates (it lacks `sources`/`learnCues`/`shortNarration`, has un-narrated gems). **Do not lift it.** Build QG fresh to the current standard."* Note `qgd.ts`, `queensGambit.ts`, `catalanOpening.ts` DID land; only `qga.ts` is absent — so **QGA is the one masterclass of the family still owed**, and it must be built fresh, not lifted. |

### NEEDS A BEHAVIOURAL CHECK before any decision (WEAK scan only)

`932` user-report log · `906` video-lesson notes · `902` grounded corpus +
position facts · `845` grounding-inversion docs · `732` beta guide · `728`
bare move-report routing · `715` Academy curriculum · `711` Champion piece set
· `710` gate board-claims · `705` hide empty pro repertoires · `682` French b3
pitfall · `671` White/Black masterclass split

Partial signals gathered, none decisive: `positionFacts` exists on main (3
files) so **902** is likely landed in some form; 18 'academy' files on main so
**715** likely landed; no `colorFilter`/`whiteTab` symbols so **671** may be
genuinely absent; `champion` appears only under `Kid/` so **711**'s piece set
may be absent. Each of these is a guess until the behaviour is run.

## What the MD corpus contributed

Only **two** of the 25 are mentioned anywhere in the 193 plan docs plus the root
MDs — `#669` (ruled STALE, above) and `#720` (in the 2026-06-12 functional-audit
campaign). **The other 23 were opened and never written down anywhere.** That is
the actual finding behind David's question: the docs are excellent at recording
what was *built* and almost silent on what was *parked*.

## Recommendation

1. **Ship #750 today.** A one-line boot-crash guard should not sit for three
   months.
2. **Ship #760** (or fold it into the sanitizer as a fresh fix — the branch is
   old and the file has moved).
3. **Close 740, 758, 806, 720, 704, 696, 692, 685** as landed; close **678** and
   **669** as superseded, quoting the WO doc on 669.
4. **Build QGA fresh** to the sealed-gate standard — it is the one real content
   hole the family left.
5. Run the behavioural checks on the remaining 12 before touching them.
6. **The process fix:** a PR that is opened and abandoned leaves no trace in any
   doc. Either PRs get closed when their work lands by another route, or
   `PLAN.md` carries a parked-work section. Otherwise this recurs — 23 of 25
   were invisible until someone went looking.
