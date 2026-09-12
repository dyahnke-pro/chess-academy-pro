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

## Coverage summary (this session)
- **✅ verified green on prod:** Dashboard, Openings explorer, Tactics hub, Weaknesses, **Review (real-game 18/18)**, **Play (full-game 10/10)**, coach routing/nav, player-games, tactical-awareness, unified-coach, untouched-surfaces, stream-optin, storage-persistence*.
- **🔧 audit-rot flagged (app fine, no product bug):** master-integration (prefetch capture), teach-forkdive (capture design), settings-behavior (route consolidation), strength-calibration (fresh-context), book-reader (zone render). Systemic cause for most: the 2026-09-11 opt-in stream blinded event-capture audits → `enableAuditCapture` helper built + proven.
- **⬜ biggest untested surfaces (ranked by user value):** Kids deep-play, the import→mistakes→drill learning-loop chain, `/coach/teach` adversarial break-loop, individual tactics trainers, `/coach/plan` + `/coach/chat` + `/coach/analyse`, Academy courses, endgame trainer, pro-rep pages, punish-gems full-play loop.

## Product-bug tally this session
**One** real product bug found and fixed: `/coach/teach` navigation capture (nav
imperatives taught a wrong opening). Everything else swept = healthy app or stale
audit. Fixes shipped: nav bug, dashboard/openings-ui/bare-name/review audits, the
event-capture enabler.
