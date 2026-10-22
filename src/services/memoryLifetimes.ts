/**
 * EVERY IN-PAGE MEMORY DECLARES ITS LIFETIME (David 2026-10-19, persistent
 * memory, design rule 2). A ref that accumulates (a Set, a Map, an array, an
 * object) inside a component or hook is a memory, and someone has to decide
 * whether it outlives the board, the game, or the app. This table is that
 * decision, one row per memory; `memoryLifetimes.gate.test.ts` fails the build
 * on any accumulating ref in `src/components` or `src/hooks` that has no row.
 *
 * - `per-board`  — about this position / this card / this screen; forgetting
 *   it on the next board is correct (timers and render scratch live here too).
 * - `per-game`   — a say-once ledger about THIS game; a new game starts clean.
 * - `persisted`  — survives the app closing; `via` names where it is kept.
 *
 * Key: `<path>::<ref name>`.
 */
type MemoryLifetime = 'per-board' | 'per-game' | 'persisted';

interface MemoryLifetimeRow {
  lifetime: MemoryLifetime;
  what: string;
  /** Required for `persisted`: the store that keeps it. */
  via?: string;
}

export const MEMORY_LIFETIMES: Record<string, MemoryLifetimeRow> = {
  // ── Academy / board / common ──
  'src/components/Academy/CourseTrainerPage.tsx::progressRef': { lifetime: 'per-board', what: 'attempts per drill line this course session' },
  'src/components/Board/VoiceChatMic.tsx::messagesRef': { lifetime: 'per-board', what: 'voice turn transcript for the brain call' },
  'src/components/Common/ScrollHintBar.tsx::initialRef': { lifetime: 'per-board', what: 'render scratch' },
  'src/components/ui/RewardLayer.tsx::particles': { lifetime: 'per-board', what: 'animation scratch' },
  'src/components/ui/RewardLayer.tsx::flash': { lifetime: 'per-board', what: 'animation scratch' },
  'src/hooks/useJackpot.ts::timers': { lifetime: 'per-board', what: 'timers' },
  'src/hooks/useJackpot.ts::queue': { lifetime: 'per-board', what: 'payouts waiting their turn on screen' },
  'src/components/ui/RewardLayer.tsx::bannerQueue': { lifetime: 'per-board', what: 'banners waiting their turn on screen' },
  'src/hooks/useChessGame.ts::legalMovesRef': { lifetime: 'per-board', what: 'legal moves of the selected piece' },
  'src/hooks/useWeaknessSignals.ts::ref': { lifetime: 'persisted', what: 'weakness signals, read from them', via: 'weakness spine' },
  'src/components/Coach/CoachesLibraryPage.tsx::paraRefs': { lifetime: 'per-board', what: 'paragraph DOM refs' },
  'src/components/Coach/GlobalCoachDrawer.tsx::savedMessagesRef': { lifetime: 'per-board', what: 'drawer chat across open/close; the brain copy is in coachMemoryStore' },

  // ── Play ──
  'src/components/Coach/CoachGamePage.tsx::quizStateRef': { lifetime: 'per-board', what: 'the open quiz; the answer goes to capabilityEvidence' },
  'src/components/Coach/CoachGamePage.tsx::announcedHangingRef': { lifetime: 'per-game', what: 'loose pieces already named this game' },
  'src/components/Coach/CoachGamePage.tsx::tacticAnimTimersRef': { lifetime: 'per-board', what: 'timers' },
  'src/components/Coach/CoachGamePage.tsx::clockHistoryRef': { lifetime: 'per-game', what: 'clock per move, saved on db.games at game end' },
  'src/hooks/useLiveCoach.ts::saidRef': { lifetime: 'per-game', what: 'say-once ledger' },
  'src/hooks/useLiveCoach.ts::evalHistoryRef': { lifetime: 'per-game', what: 'eval trace this game' },

  // ── Review ──
  'src/components/Coach/CoachGameReview.tsx::walkExploreSansRef': { lifetime: 'per-board', what: 'moves tried on the free board' },
  'src/components/Coach/CoachGameReview.tsx::taughtPliesRef': { lifetime: 'per-game', what: 'say-once ledger' },
  'src/components/Coach/CoachGameReview.tsx::quizzedPliesRef': { lifetime: 'per-game', what: 'say-once ledger' },
  'src/components/Coach/CoachGameReview.tsx::rewindOfferedPliesRef': { lifetime: 'per-game', what: 'say-once ledger' },
  'src/components/Coach/CoachGameReview.tsx::criticalDoneRef': { lifetime: 'per-game', what: 'critical moments already handled' },
  'src/components/Coach/CoachGameReview.tsx::narratedPliesRef': { lifetime: 'per-game', what: 'plies narrated this walk' },
  'src/hooks/useReviewEngineLines.ts::analyzedPliesRef': { lifetime: 'per-game', what: 'plies with engine lines' },
  'src/hooks/useReviewPlayback.ts::spokenPliesRef': { lifetime: 'per-game', what: 'say-once ledger' },
  'src/hooks/useReviewPlayback.ts::declineLoggedRef': { lifetime: 'per-game', what: 'plies whose "no fundamental" audit row was logged' },

  // ── Learn (the lead wires these) ──
  'src/components/Coach/CoachTeachPage.tsx::taughtGemIdsRef': { lifetime: 'per-board', what: 'traps taught this visit (to persist: learn-traps-taught)' },
  'src/components/Coach/CoachTeachPage.tsx::forkLogRef': { lifetime: 'per-board', what: 'roads walked this visit (to persist: learn-forks)' },
  'src/components/Coach/CoachTeachPage.tsx::recentUserInputsRef': { lifetime: 'per-board', what: 'recent typed inputs' },
  'src/components/Coach/CoachTeachPage.tsx::responseLengthsRef': { lifetime: 'per-board', what: 'reply lengths' },
  'src/components/Coach/CoachTeachPage.tsx::fundamentalSeenRef': { lifetime: 'per-game', what: 'say-once ledger' },
  'src/components/Coach/CoachTeachPage.tsx::skillQueueRef': { lifetime: 'per-game', what: 'skill changes to announce' },
  'src/components/Coach/CoachTeachPage.tsx::skillRecapRef': { lifetime: 'per-game', what: 'skill recap for this game' },
  'src/components/Coach/CoachTeachPage.tsx::announcedPliesRef': { lifetime: 'per-game', what: 'say-once ledger' },
  'src/components/Coach/CoachTeachPage.tsx::announcedBoardsRef': { lifetime: 'per-game', what: 'say-once ledger' },
  'src/components/Coach/CoachTeachPage.tsx::planToldBoardsRef': { lifetime: 'per-game', what: 'say-once ledger' },
  'src/components/Coach/CoachTeachPage.tsx::drilledMotifsRef': { lifetime: 'persisted', what: 'motifs drilled shut, read from it', via: 'mistakePuzzles' },
  'src/components/Coach/CoachTeachPage.tsx::drilledSaidRef': { lifetime: 'per-game', what: 'say-once ledger' },
  'src/components/Coach/CoachTeachPage.tsx::liveGradesRef': { lifetime: 'per-game', what: 'grades, saved on db.games at game end' },
  'src/components/Coach/CoachTeachPage.tsx::steeredPliesRef': { lifetime: 'per-game', what: 'plies the coach steered a focus question into, saved on db.games (steeredPlies) at game end' },
  'src/components/Coach/CoachTeachPage.tsx::coachMadePliesRef': { lifetime: 'per-game', what: 'plies whose board the coach made a chance on (a taught slip, a steer, a plant): a find there is not strength evidence' },
  'src/components/Coach/CoachTeachPage.tsx::planArcRef': { lifetime: 'per-game', what: 'plan arc this game' },
  'src/components/Coach/CoachTeachPage.tsx::positionalSaidRef': { lifetime: 'per-game', what: 'say-once ledger' },
  'src/components/Coach/CoachTeachPage.tsx::sessionStatsRef': { lifetime: 'per-board', what: 'session tallies' },
  'src/components/Coach/CoachTeachPage.tsx::chainArrowsRef': { lifetime: 'per-board', what: 'arrows of the spoken chain' },
  'src/components/Coach/CoachTeachPage.tsx::solvedDrillKeysRef': { lifetime: 'per-board', what: 'drills solved this visit; SRS defers them across visits' },
  'src/components/Coach/CoachTeachPage.tsx::lessonParamStartRef': { lifetime: 'per-board', what: 'deep-link start guard' },
  'src/components/Coach/CoachTeachPage.tsx::playOutPromptedFor': { lifetime: 'per-board', what: 'play-out prompt asked (to persist: learn-playout-prompted)' },
  'src/components/Coach/CoachTeachPage.tsx::provenConceptsRef': { lifetime: 'persisted', what: 'proven concepts, read from them', via: 'conceptRecord (db.meta)' },
  'src/components/Coach/CoachTeachPage.tsx::provenWaitingRef': { lifetime: 'per-game', what: 'skills proven while a mission ran, shown when it resolves (the record already holds them)' },
  'src/components/Coach/CoachTeachPage.tsx::briefModesRef': { lifetime: 'per-game', what: 'which Campaign cards brief when they go live this game (full / try-only), read off the record at game start' },
  'src/components/Coach/CoachTeachPage.tsx::heldMissionLinesRef': { lifetime: 'per-game', what: 'mission lines held while a briefing is on screen, said when it closes' },
  'src/components/Coach/CoachTeachPage.tsx::campaignCardsRef': { lifetime: 'per-game', what: "this Campaign game's phase cards, for the recap" },
  'src/hooks/useTeachWalkthrough.ts::deltaSaidRef': { lifetime: 'per-game', what: 'say-once ledger per tree' },
  'src/hooks/useTeachWalkthrough.ts::lessonVoiceRef': { lifetime: 'per-game', what: 'say-once ledger per tree' },
  'src/hooks/useTeachWalkthrough.ts::gemLinesRef': { lifetime: 'per-board', what: 'gem lines for the picker' },
  'src/hooks/useTeachWalkthrough.ts::playedGemIdsRef': { lifetime: 'per-board', what: 'traps watched this visit' },

  // ── Openings ──
  'src/components/Openings/LessonPlayer.tsx::timersRef': { lifetime: 'per-board', what: 'timers' },
  'src/components/Openings/LessonPlayer.tsx::revealTimersRef': { lifetime: 'per-board', what: 'timers' },
  'src/components/Openings/MiddlegamePractice.tsx::chatHistoryRef': { lifetime: 'per-board', what: 'chat turns for the brain call' },
  'src/components/Openings/OpeningPlayMode.tsx::weaknessSignalsRef': { lifetime: 'persisted', what: 'weakness signals, read from them', via: 'weakness spine' },
  'src/components/Openings/PlayableLinePlayer.tsx::faucetFiredRef': { lifetime: 'per-board', what: 'say-once per move index' },
  'src/components/Openings/SrsTrainerPage.tsx::lineResultsRef': { lifetime: 'per-board', what: 'grades of the line, written at line end' },
  'src/components/Openings/TrainMode.tsx::completedLinesRef': { lifetime: 'persisted', what: 'trap/warning lines finished, by name', via: 'studentMemory trap-lines-done' },
  'src/components/Openings/WalkthroughMode.tsx::fallbackTimers': { lifetime: 'per-board', what: 'timers' },

  // ── Tactics / puzzles ──
  'src/components/Puzzles/AdaptivePuzzlePage.tsx::seenIdsRef': { lifetime: 'per-board', what: 'puzzles served this session; across sessions selection reads db.puzzles attempts' },
  'src/components/Puzzles/AdaptivePuzzlePage.tsx::reachHistoryRef': { lifetime: 'per-board', what: 'rating points this session' },
  'src/components/Puzzles/DeepRunPage.tsx::seenRef': { lifetime: 'per-game', what: 'puzzles served this run' },
  'src/components/Puzzles/MistakePuzzleBoard.tsx::saidHabitsRef': { lifetime: 'per-board', what: 'say-once ledger' },
  'src/components/Puzzles/MistakePuzzleBoard.tsx::recalledRef': { lifetime: 'per-board', what: 'say-once ledger' },
  'src/components/Puzzles/PuzzleBoard.tsx::stepTimersRef': { lifetime: 'per-board', what: 'timers' },
  'src/components/Puzzles/PuzzleBoard.tsx::saidHabitsRef': { lifetime: 'per-board', what: 'say-once ledger' },
  'src/components/Puzzles/PuzzleBoard.tsx::recalledRef': { lifetime: 'per-board', what: 'say-once ledger' },
  'src/components/Puzzles/WeaknessTagDrillPage.tsx::answeredRef': { lifetime: 'per-game', what: 'answers so far, filed as the tag spacing when the drill is left' },
  'src/components/Tactics/TacticDrillPage.tsx::seenIdsRef': { lifetime: 'per-game', what: 'puzzles served this drill' },
  'src/components/Tactics/TacticDrillPage.tsx::completedRef': { lifetime: 'per-game', what: 'drill positions done' },
  'src/components/Tactics/TacticDrillPage.tsx::resultsRef': { lifetime: 'per-game', what: 'drill results' },
  'src/components/Tactics/TacticDrillPage.tsx::noteIdsSeenRef': { lifetime: 'per-board', what: 'notes shown this visit' },
};
