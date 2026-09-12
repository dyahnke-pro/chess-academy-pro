# App Surface Map + Audit Coverage (2026-09-12)

Every user-facing route in the app (source of truth: `src/App.tsx`), grouped by
zone, with this session's audit-coverage status. Coverage legend:

- ✅ **verified green on prod** this session (real drive, muted, 3-instrument where applicable)
- 🔧 **audit-rot flagged** — the APP is fine; the audit script was stale (fix shipped or pending)
- ⬜ **not swept this session** — no fresh prod verification

The app's core loop (Learn it → play it → find the holes → drill them shut) is
the spine; everything else supports it.

---

## 1. Entry / hubs
| Route | What it is | Coverage |
|---|---|---|
| `/` | Home Dashboard — 5 stacked bars (Openings/Coach/Weaknesses/Tactics + Kids) + SmartSearch | ✅ dashboard (fixed 4→5) |
| `/coach`, `/coach/home` | Coach hub tiles | ✅ untouched-surfaces |

## 2. Coach — the brain surfaces (the heart)
| Route | What it is | Coverage |
|---|---|---|
| `/coach/teach` | **Learn with Coach** — DB-anchored walkthroughs, WLPP, chat | ✅ routing (bare-name 3/3, nav fix), on-topic; ⬜ adversarial break-loop |
| `/coach/play` | **Play with Coach** — live game, blunder cards, phase narration | ✅ **full-game 10/10** (played to finish, cards fired, persisted) |
| `/coach/review`, `/coach/review/:gameId` | **Post-game review** — ply walk + diagnostic cards | ✅ **real-game 18/18** + overhaul contracts |
| `/coach/chat` | Standalone coach chat | ⬜ |
| `/coach/analyse` | Static position analysis | ⬜ |
| `/coach/plan` | **Training Plan** — repertoire rolodex (White/Black folders) | ⬜ |
| `/coach/pro-games` | Rewatch a pro's real games by opening | ⬜ |
| `/coach/report` | Coach report | ⬜ |
| `/coach/fundamentals` | Fundamentals lessons | ⬜ |
| `/coach/library` | Coach library | ⬜ |
| `/coach/academy`, `/academy`, `/academy/course/:id`(+`/lesson`,`/train`) | Academy courses | ⬜ |
| `/coach/endgame`, `/coach/endgame-trainer/:lessonId` | Endgame trainer | ⬜ |
| `/coach/train` | Adaptive coach-led training | ⬜ |
| `/coach/session/:kind` | Dynamic session router (walkthrough/play/puzzle/middlegame) | ✅ tactical-awareness, master-integration (🔧 prefetch-capture rot), unified-coach 8/8 |

**Coach grounding/integration (cross-cutting):** master-play grounding 🔧 (audit rot — app emits events), player-games ✅, tactical-awareness ✅ 6/6, unified-coach personalization ✅ 8/8.

## 3. Openings
| Route | What it is | Coverage |
|---|---|---|
| `/openings` | Explorer — 5 tabs (Masterclasses/Elite/Gambits/Counter/All) | ✅ openings-ui (fixed Elite-tab timing) |
| `/openings/:id` | Opening detail — WLPP, variations, gems, traps, plans, book reader | ✅ trap-tiles*, 🔧 book-reader (zone-render rot); ⬜ punish-gems full-play loop |
| `/openings/pro/:playerId`(+`/:id`) | Pro repertoire pages | ⬜ |
| `/openings/srs` | Opening SRS | ⬜ |

\* trap-tiles: pro-gothamchess-caro-kann flagged (pro-seed render timing, not a missing button)

## 4. Tactics / puzzles
| Route | What it is | Coverage |
|---|---|---|
| `/tactics` | Tactics hub | ✅ tactics |
| `/tactics/{classic,adaptive,mistakes,opening-traps,profile,drill,setup,create,lichess,calculation,find-square,patterns,analysis-practice,weakness-drill,weakness-themes}` | Individual trainers | ⬜ (hub ✅; individual trainers not deep-driven) |
| `/puzzles/*`, `/weaknesses/{classic,adaptive,mistakes,puzzles,games,lichess-dashboard}` | Alias routes into the same trainers | ⬜ |

## 5. Weaknesses (insights)
| Route | What it is | Coverage |
|---|---|---|
| `/weaknesses` | Cross-game weakness analysis (patterns, opening tiles, mistake rows) | ✅ weaknesses 21/21 |

## 6. Games library
| Route | What it is | Coverage |
|---|---|---|
| `/games` | Saved games → review | ⬜ (persistence verified via full-game audit) |
| `/games/import` | PGN / Lichess import | ⬜ (the front of the learning-loop chain) |

## 7. Kids (`/kid/*`) — permanently corpus-excluded; own contracts
6 piece hubs (pawn/rook/knight/bishop/queen/king), each with puzzles + sandbox
games (maze/race/sweep/army/etc.), plus journey, fairy-tale, play-games,
mini-games, level-select. **Entirely ⬜ this session.** LLM-hallucination gate is
the key contract (a P0 if it ever invents chess content).

## 8. Settings / legal / debug
| Route | Coverage |
|---|---|
| `/settings`, `/settings/onboarding` | 🔧 settings-behavior (narration trigger stale — route consolidation) |
| first-run strength calibration (bubble) | 🔧 calibration (fresh-context + page-help-modal timing) |
| `/privacy`, `/terms`, `/support` | ⬜ (static) |
| `/debug/audit`, `/debug/opening-blunders`, `/neon-mock` | dev-only |

---

## Coverage summary (this session + overnight sweep 2026-09-12)
- **✅ verified green on prod:** Dashboard, Openings explorer, Tactics hub, Weaknesses, **Review (real-game 18/18)**, **Play (full-game 10/10)**, coach routing/nav, player-games, tactical-awareness, unified-coach, untouched-surfaces, stream-optin, storage-persistence (8/8), **strength-calibration (3/3, rewritten to fully-adaptive)**, **settings-behavior G5 (4/4)**, **teach-forkdive (15/15)**, **master-integration (10/10)**.
- **✅ audit-rot REPAIRED this sweep (app was healthy; audits were stale):**
  - storage-persistence — read the event at emission off the stream, not the 300-cap Dexie tail.
  - strength-calibration — rewrote to the fully-adaptive contract (first-run picker removed by David 2026-09-02; component now orphaned dead code, flagged for deletion).
  - settings-behavior — route consolidation (`/coach/session/walkthrough` → `?teach=X&auto=1`), key on `coach-narration-spoken` (mute-preserved, not `voice-speak-invoked`), proven local capture, confirm the verbosity write before navigating.
  - master-integration — aggregate prefetch check reads the reliable Dexie source, not racy prod POSTs.
  - teach-forkdive — already green (stale flag).
  - break-loop — chaos injectors rebuilt to never manufacture false chaos-* breaks.
- **🔧 partially restored:** book-reader — core read-aloud tripwire GREEN (book-reader mounts after exiting the auto-started masterclass; reads route through speakReadAloud/bypassVerbosity, no briefCap). 4 residual per-paragraph TEXT-capture fails read `/api/tts` requests that cached clips serve from browser cache; needs clickAndCapture rewired to the listener (separate refinement).
- **⬜ biggest untested surfaces (ranked by user value):** Kids deep-play, the import→mistakes→drill learning-loop chain, individual tactics trainers, `/coach/plan` + `/coach/chat` + `/coach/analyse`, Academy courses, endgame trainer, pro-rep pages, punish-gems full-play loop.

## Product-bug tally
**Two** real product bugs found + fixed + verified on prod:
1. `/coach/teach` navigation capture (nav imperatives taught a wrong opening).
2. **Static-routed walkthroughs never generated their optional stages** — tapping
   a static opening tile (e.g. "Sicilian Defense") started the Watch walk but
   never cached the tree or fired background stage-gen, so "Continue learning"
   never surfaced at the leaf and a "drill <static opening>" jump parked forever.
   Fixed (cache + gen, matching the other tiers); verified on prod (continue-learning
   enables at 52s, 4 stages generate).
Everything else swept = healthy app or stale audit. Soundness sweep: clean (all
negative-eval lessons are honest gambit showcases or honestly-flagged worse lines).
