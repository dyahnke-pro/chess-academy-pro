import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import { sanitizeForTTS, voiceService } from '../../services/voiceService';
import { generateWalkthroughNarrations } from '../../services/walkthroughLlmNarrator';
import { DrillMode } from './DrillMode';
import { PracticeMode } from './PracticeMode';
import { OpeningPlayMode } from './OpeningPlayMode';
import { TrainMode } from './TrainMode';
import { WalkthroughMode } from './WalkthroughMode';
import { MasteryRing } from './MasteryRing';
import { MiniBoard } from '../Board/MiniBoard';
import { MiddlegamePlansSection, type MiddlegameAction } from './MiddlegamePlansSection';
import { EndgamePlansSection } from './EndgamePlansSection';
import { ModelGamesSection } from './ModelGamesSection';
import { ModelGameViewer } from './ModelGameViewer';
import { MiddlegamePlanStudy } from './MiddlegamePlanStudy';
import { MiddlegamePractice } from './MiddlegamePractice';
import { PlayableLinePlayer } from './PlayableLinePlayer';
import { CheckpointQuiz } from './CheckpointQuiz';
import { ClassicWisdomSection } from './ClassicWisdomSection';
import { BookReader } from './BookReader';
import { ListenableProse } from './ListenableProse';
import { VariationTabs, buildVariationTabs } from './VariationTabs';
import { getRuyTabPlanIds } from '../../services/ruyMasterclassTabs';
import { getPircTabPlanIds } from '../../services/pircMasterclassTabs';
import { getViennaTabPlanIds } from '../../services/viennaMasterclassTabs';
import { LessonPlayer } from './LessonPlayer';
import { getLessonScript, getVariationLessonScript, lessonToPlayableLine } from '../../data/lessons';
import {
  RUY_TRAP_LESSONS,
  getRuyTrapsForTab,
  getRuyTrapPlayableLine,
  type RuyTrapDef,
} from '../../data/lessons/ruyTrapLessons';
import {
  VIENNA_TRAP_LESSONS,
  getViennaTrapsForTab,
  getViennaTrapPlayableLine,
  type ViennaTrapDef,
} from '../../data/lessons/viennaTrapLessons';
import {
  CARO_TRAP_LESSONS,
  getCaroTrapsForTab,
  getCaroTrapPlayableLine,
  type CaroTrapDef,
} from '../../data/lessons/caroKannTrapLessons';
import {
  getPunishGemsForTab,
  getPunishGemById,
  gemId,
  gemInaccuracyFen,
  gemToPlayableLine,
  isSurfaceableGem,
} from '../../data/lessons/punishGems';
import { CommonMistakesSection } from './CommonMistakesSection';
import { OpeningZoneHeader } from './OpeningZoneHeader';
import { PageHelp } from '../Layout/PageHelp';
import { MasterclassCoachChat } from './MasterclassCoachChat';
import commonMistakesData from '../../data/common-mistakes.json';
import { commonMistakeToPlayableLine } from '../../utils/commonMistakeLine';
import middlegamePlansData from '../../data/middlegame-plans.json';
import checkpointQuizzesData from '../../data/checkpoint-quizzes.json';
import type { CommonMistake, CheckpointQuizItem } from '../../types';
import {
  getOpeningById,
  getMasteryPercent,
  getLinesDiscovered,
  getLinesPerfected,
  getTotalLines,
  toggleFavorite,
  markRungComplete,
  unlockOpeningAllLines,
} from '../../services/openingService';
import {
  MAIN_LINE_INDEX,
  isRungComplete,
  isRungUnlocked,
  isLineUnlockedAll,
  areWeaponsUnlocked,
  nextRung,
  lockHint,
  RUNG_LABEL,
  WEAPONS_LOCK_HINT,
  unlockBudgetFor,
} from '../../utils/wlppLadder';
import { useAppStore } from '../../stores/appStore';
import {
  enrollOpening,
  unenrollOpening,
  isEnrolled,
} from '../../services/srsOpeningService';
import { narrateOpeningSection } from '../../services/openingSectionNarrator';
import { useStarAnimationStore } from '../../stores/starAnimationStore';
import { useCoachMemoryStore } from '../../stores/coachMemoryStore';
import type { OpeningRecord, MiddlegamePlan, ModelGame } from '../../types';
import {
  ArrowLeft,
  BookOpen as LearnIcon,
  Brain,
  Swords,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  Repeat,
  Clock,
  Target,
  Volume2,
  Square as StopIcon,
  Crosshair,
  GraduationCap,
  Heart,
  PlayCircle,
  Loader2,
  Sparkles,
  CheckCircle2,
  Lock,
  Check,
} from 'lucide-react';

type ViewMode =
  | 'detail'
  | 'learn'
  | 'practice'
  | 'play'
  | 'variation-learn'
  | 'variation-practice'
  | 'variation-play'
  | 'trap-learn'
  | 'trap-practice'
  | 'trap-play'
  | 'warning-learn'
  | 'warning-practice'
  | 'warning-play'
  | 'walkthrough'
  | 'variation-walkthrough'
  | 'trap-walkthrough'
  | 'warning-walkthrough'
  | 'train-traps'
  | 'train-warnings'
  | 'named-trap'
  | 'named-trap-learn'
  | 'named-trap-practice'
  | 'named-trap-play'
  | 'gem-watch'
  | 'gem-learn'
  | 'gem-practice'
  | 'gem-play'
  | 'middlegame-watch'
  | 'middlegame-plan'
  | 'middlegame-practice'
  | 'middlegame-play'
  | 'pitfall-watch'
  | 'pitfall-learn'
  | 'pitfall-practice'
  | 'model-game';

function computeFenFromPgn(pgn: string, setupFen?: string): string {
  const tokens = pgn.trim().split(/\s+/).filter(Boolean);
  // setupFen optional: puzzle-derived trap lines start from a
  // middlegame position rather than move 1. See OpeningVariation
  // type comment in src/types/index.ts.
  const chess = setupFen ? new Chess(setupFen) : new Chess();
  for (const san of tokens) {
    try {
      chess.move(san);
    } catch {
      break;
    }
  }
  return chess.fen();
}

export function OpeningDetailPage(): JSX.Element {
  const { id, playerId } = useParams<{ id: string; playerId?: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isProContext = location.pathname.includes('/openings/pro/');
  const triggerStarAnimation = useStarAnimationStore((store) => store.trigger);
  const [opening, setOpening] = useState<OpeningRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('detail');
  const [activeVariationIndex, setActiveVariationIndex] = useState(-1);
  const [activeTrapLineIndex, setActiveTrapLineIndex] = useState(-1);
  const [activeWarningLineIndex, setActiveWarningLineIndex] = useState(-1);
  const [activeNamedTrapId, setActiveNamedTrapId] = useState<string | null>(null);
  const [activeGemId, setActiveGemId] = useState<string | null>(null);
  const [narratingSection, setNarratingSection] = useState<string | null>(null);
  const [activeMiddlegamePlan, setActiveMiddlegamePlan] = useState<MiddlegamePlan | null>(null);
  const [activeMistake, setActiveMistake] = useState<CommonMistake | null>(null);
  const [activeModelGame, setActiveModelGame] = useState<ModelGame | null>(null);
  // Two-tap guard for the expert-pass unlock: spending a 1-of-1 lifetime pass
  // shouldn't die to a misclick, so the first tap arms, the second commits.
  const [confirmingUnlock, setConfirmingUnlock] = useState(false);
  const weaponUnlockPasses = useAppStore((s) => s.activeProfile?.weaponUnlockPasses);
  const recordWeaponUnlockPass = useAppStore((s) => s.recordWeaponUnlockPass);
  // Which variation tab is selected (-1 = main line). Drives the
  // full-page rescope: every section below renders for the selected
  // variation as its own opening ("seven openings in one").
  const [selectedTabIndex, setSelectedTabIndex] = useState(-1);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizPlayFen, setQuizPlayFen] = useState<string | null>(null);
  const [srsEnrolled, setSrsEnrolled] = useState<boolean>(false);
  const [srsBusy, setSrsBusy] = useState<boolean>(false);
  const [srsFlash, setSrsFlash] = useState<string | null>(null);

  const loadOpening = useCallback(async (): Promise<void> => {
    if (!id) return;
    const result = await getOpeningById(id);
    setOpening(result ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void loadOpening();
  }, [loadOpening]);

  // SRS enrollment state — refreshed every time the opening loads
  // so toggling from another tab eventually reconciles.
  useEffect(() => {
    if (!id) return;
    void isEnrolled(id).then(setSrsEnrolled);
  }, [id]);

  const handleToggleSrs = useCallback(async (): Promise<void> => {
    if (!opening || srsBusy) return;
    setSrsBusy(true);
    try {
      if (srsEnrolled) {
        await unenrollOpening(opening.id);
        setSrsEnrolled(false);
        setSrsFlash('Removed from trainer');
      } else {
        const result = await enrollOpening(opening);
        setSrsEnrolled(true);
        if (result.added > 0) {
          setSrsFlash(`Added ${result.added} card${result.added !== 1 ? 's' : ''} to trainer`);
        } else if (result.alreadyEnrolled > 0) {
          setSrsFlash('Already in trainer');
        } else {
          setSrsFlash('No reviewable positions in this line');
        }
      }
      setTimeout(() => setSrsFlash(null), 2200);
    } finally {
      setSrsBusy(false);
    }
  }, [opening, srsEnrolled, srsBusy]);

  useEffect(() => {
    return () => {
      voiceService.stop();
    };
  }, []);

  const handleComplete = useCallback((): void => {
    void loadOpening();
  }, [loadOpening]);

  const handleExit = useCallback((): void => {
    setViewMode('detail');
    setActiveVariationIndex(-1);
    setActiveTrapLineIndex(-1);
    setActiveWarningLineIndex(-1);
    setActiveMiddlegamePlan(null);
    setQuizPlayFen(null);
    void loadOpening();
  }, [loadOpening]);

  const handleQuizPlayPosition = useCallback((fen: string): void => {
    setQuizPlayFen(fen);
    setViewMode('play');
  }, []);

  const handleMiddlegameAction = useCallback(
    (plan: MiddlegamePlan, action: MiddlegameAction): void => {
      setActiveMiddlegamePlan(plan);
      const mode: ViewMode =
        action === 'learn'
          ? 'middlegame-plan'
          : action === 'practice'
            ? 'middlegame-practice'
            : action === 'play'
              ? 'middlegame-play'
              : 'middlegame-watch';
      setViewMode(mode);
    },
    [],
  );

  /** Pitfall WLPP (David 2026-05-24): every common mistake is a playable
   *  line, NOT a static card. Watch/Learn/Practice drive PlayableLinePlayer
   *  on the antidote line (the student plays the CORRECT move; the narration
   *  says why the wrong move is the error — never drilling the wrong move).
   *  Play hands off to the coach on this opening so the student meets the
   *  pitfall live. Grounded: the line comes from the mistake's real
   *  fen/correctMove (chess.js-validated), never invented. */
  const handlePitfallAction = useCallback(
    (mistake: CommonMistake, action: 'watch' | 'learn' | 'practice' | 'play'): void => {
      if (action === 'play') {
        const name = opening?.name ?? '';
        if (!name) return;
        useCoachMemoryStore.getState().setIntendedOpening({
          name,
          color: opening?.color ?? 'white',
          capturedFromSurface: 'openings-play',
          pgn: opening?.pgn,
        });
        void navigate(`/coach/play?side=${opening?.color ?? 'white'}`);
        return;
      }
      setActiveMistake(mistake);
      setViewMode(`pitfall-${action}` as ViewMode);
    },
    [opening, navigate],
  );

  // Variation tab is URL-addressable (?line=marshall) so the training
  // plan, weaknesses, coach chat, etc. can deep-link a specific variation.
  // The URL is the source of truth: the handler updates it, this effect
  // syncs selectedTabIndex from it.
  useEffect(() => {
    if (!opening) return;
    const line = searchParams.get('line');
    if (!line) {
      setSelectedTabIndex(-1);
      return;
    }
    const tabs = buildVariationTabs(opening.id, opening.variations);
    const match =
      tabs.find((t) => t.label.toLowerCase() === line.toLowerCase()) ??
      (/^\d+$/.test(line) ? tabs.find((t) => t.index === Number(line)) : undefined);
    setSelectedTabIndex(match ? match.index : -1);
  }, [opening, searchParams]);

  const handleSelectTab = useCallback(
    (index: number): void => {
      const next = new URLSearchParams(searchParams);
      const label =
        index >= 0
          ? buildVariationTabs(opening?.id ?? '', opening?.variations).find((t) => t.index === index)?.label
          : undefined;
      if (label) next.set('line', label.toLowerCase());
      else next.delete('line');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams, opening],
  );

  // Pre-warm the LLM narration cache when the user picks a variation
  // — fires before WalkthroughMode mounts, so by the time they tap
  // Play the Dexie cache hit returns instantly. Without this the
  // first 3-4 moves play with bare-SAN stubs while the LLM call (~7s)
  // catches up. Idempotent — already-cached results return without
  // a fresh API call.
  const prewarmVariationNarration = useCallback((index: number): void => {
    if (!opening) return;
    const variation = opening.variations?.[index];
    if (!variation?.pgn) return;
    void generateWalkthroughNarrations({
      openingName: opening.name,
      variationName: variation.name,
      pgn: variation.pgn,
    }).catch(() => { /* never break navigation on a pre-warm failure */ });
  }, [opening]);

  const handleStartVariationWalkthrough = useCallback((index: number): void => {
    setActiveVariationIndex(index);
    prewarmVariationNarration(index);
    setViewMode('variation-walkthrough');
  }, [prewarmVariationNarration]);

  const handleStartVariationLearn = useCallback((index: number): void => {
    setActiveVariationIndex(index);
    setViewMode('variation-learn');
  }, []);

  const handleStartVariationPractice = useCallback((index: number): void => {
    setActiveVariationIndex(index);
    setViewMode('variation-practice');
  }, []);

  const handleStartVariationPlay = useCallback((index: number): void => {
    // Play uses the SAME room as Play with Coach: declare the line as the
    // intended opening and hand off to /coach/play. The user plays the
    // line from move 1 against the coach (not an autoplay), and the coach's
    // plan-tracker follows whether they stay on book.
    const v = opening?.variations?.[index];
    const name = v ? v.name : opening?.name ?? '';
    const color = opening?.color ?? 'white';
    const pgn = v ? v.pgn : opening?.pgn;
    if (!name) return;
    useCoachMemoryStore.getState().setIntendedOpening({
      name,
      color,
      capturedFromSurface: 'openings-play',
      pgn,
    });
    void navigate(`/coach/play?side=${color}`);
  }, [opening, navigate]);

  const handleStartWarningLineAction = useCallback((index: number, action: 'learn' | 'practice' | 'play' | 'walkthrough'): void => {
    setActiveWarningLineIndex(index);
    setViewMode(`warning-${action}` as ViewMode);
  }, []);

  // Named-trap WLPP: Watch plays the beat lesson; Learn/Practice play the
  // lesson's correct teaching line (voice-guided / silent+hint); Play hands
  // off to the coach locked to this opening.
  const handleNamedTrapAction = useCallback(
    (trapId: string, action: 'watch' | 'learn' | 'practice' | 'play'): void => {
      setActiveNamedTrapId(trapId);
      setViewMode(
        action === 'watch'
          ? 'named-trap'
          : action === 'learn'
            ? 'named-trap-learn'
            : action === 'practice'
              ? 'named-trap-practice'
              : 'named-trap-play',
      );
    },
    [],
  );

  // Punish-gem WLPP: Watch plays the punish out, Learn voice-guides the
  // student's moves, Practice is silent + hint, Play hands off to the coach
  // locked to this opening. The weapon-section spine (WO: punish-gems).
  const handleGemAction = useCallback(
    (id: string, action: 'watch' | 'learn' | 'practice' | 'play'): void => {
      setActiveGemId(id);
      setViewMode(`gem-${action}` as ViewMode);
    },
    [],
  );

  const handleToggleFavorite = useCallback(async (): Promise<void> => {
    if (!opening) return;
    const newVal = await toggleFavorite(opening.id);
    setOpening({ ...opening, isFavorite: newVal });
  }, [opening]);

  // ─── Voice narration ──────────────────────────────────────────────────────
  // Sections currently waiting on the LLM paragraph (traps/warnings only).
  const [loadingSection, setLoadingSection] = useState<string | null>(null);
  // Token counter so a stale async fetch can't start speaking after the user
  // has already tapped the button again.
  const narrationRequestToken = useRef(0);

  const speakText = useCallback((sectionId: string, text: string): void => {
    if (!text) {
      setNarratingSection(null);
      return;
    }
    setNarratingSection(sectionId);
    // Read-aloud affordance, exempt from voice verbosity settings (David
    // 2026-05-24: voice settings govern in-game narration only).
    void voiceService.speakReadAloud(sanitizeForTTS(text)).finally(() => {
      setNarratingSection((current) => (current === sectionId ? null : current));
    });
  }, []);

  const toggleNarration = useCallback((
    sectionId: string,
    text: string,
    options?: { kind?: 'traps' | 'warnings'; bullets?: string[] | null },
  ): void => {
    if (narratingSection === sectionId || loadingSection === sectionId) {
      voiceService.stop();
      narrationRequestToken.current += 1;
      setNarratingSection(null);
      setLoadingSection(null);
      return;
    }

    voiceService.stop();
    narrationRequestToken.current += 1;
    const token = narrationRequestToken.current;

    // Traps & warnings go through the LLM narrator: the dry bullet-list
    // readout is replaced by one cohesive teaching paragraph. Cached, so
    // only the first tap per section per opening pays the round-trip.
    if (opening && options?.kind && options.bullets && options.bullets.length > 0) {
      setLoadingSection(sectionId);
      void narrateOpeningSection({
        openingId: opening.id,
        openingName: opening.name,
        color: opening.color,
        kind: options.kind,
        bullets: options.bullets,
      })
        .then((paragraph) => {
          if (narrationRequestToken.current !== token) return; // superseded
          setLoadingSection(null);
          speakText(sectionId, paragraph || text);
        })
        .catch(() => {
          if (narrationRequestToken.current !== token) return;
          setLoadingSection(null);
          speakText(sectionId, text);
        });
      return;
    }

    speakText(sectionId, text);
  }, [narratingSection, loadingSection, opening, speakText]);

  // Precompute warning line FENs for thumbnails (Pitfalls zone).

  const warningLineFens = useMemo((): string[] => {
    if (!opening?.warningLines) return [];
    return opening.warningLines.map((v) => computeFenFromPgn(v.pgn, v.setupFen));
  }, [opening?.warningLines]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-theme-text-muted">Loading opening...</p>
      </div>
    );
  }

  if (!opening) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-theme-text-muted">Opening not found.</p>
      </div>
    );
  }

  // Walkthrough mode (main line or variation)
  if (viewMode === 'walkthrough') {
    const lesson = getLessonScript(opening.id);
    if (lesson) {
      return (
        <LessonPlayer
          script={lesson}
          onExit={handleExit}
          onComplete={() => { void markRungComplete(opening.id, MAIN_LINE_INDEX, 'watch').then(() => loadOpening()); }}
          onContinueToNext={() => setViewMode('learn')}
        />
      );
    }
  }
  if (viewMode === 'variation-walkthrough') {
    const variationName = opening.variations?.[activeVariationIndex]?.name;
    const vlesson = getVariationLessonScript(opening.id, variationName);
    if (vlesson) {
      return (
        <LessonPlayer
          script={vlesson}
          onExit={handleExit}
          onComplete={() => {
            // Watching the subline's master class through completes the Watch rung.
            void markRungComplete(opening.id, activeVariationIndex, 'watch').then(() => loadOpening());
          }}
          onContinueToNext={() => handleStartVariationLearn(activeVariationIndex)}
        />
      );
    }
  }
  if (viewMode === 'walkthrough' || viewMode === 'variation-walkthrough') {
    return (
      <WalkthroughMode
        opening={opening}
        variationIndex={viewMode === 'variation-walkthrough' ? activeVariationIndex : undefined}
        onExit={handleExit}
      />
    );
  }

  // Named-trap masterclass lesson (hand-authored show -> snap-back beats,
  // tab-routed via getRuyTrapsForTab / getViennaTrapsForTab). Watch plays
  // the beat lesson. Per-opening lookup falls through to the right module.
  const namedTrapLessons =
    opening.id === 'ruy-lopez' ? RUY_TRAP_LESSONS
      : opening.id === 'vienna-game' ? VIENNA_TRAP_LESSONS
      : opening.id === 'caro-kann' ? CARO_TRAP_LESSONS
        : {};
  if (viewMode === 'named-trap' && activeNamedTrapId && activeNamedTrapId in namedTrapLessons) {
    return (
      <LessonPlayer
        script={namedTrapLessons[activeNamedTrapId]}
        onExit={handleExit}
      />
    );
  }

  // Named-trap LEARN / PRACTICE — play the lesson's correct teaching line
  // (the beat narration is carried onto the moves verbatim). Learn guides
  // with voice; Practice is silent with a hint button.
  if (
    (viewMode === 'named-trap-learn' || viewMode === 'named-trap-practice') &&
    activeNamedTrapId
  ) {
    const trapLine =
      opening.id === 'ruy-lopez' ? getRuyTrapPlayableLine(activeNamedTrapId)
        : opening.id === 'vienna-game' ? getViennaTrapPlayableLine(activeNamedTrapId)
          : opening.id === 'caro-kann' ? getCaroTrapPlayableLine(activeNamedTrapId)
            : null;
    if (trapLine) {
      return (
        <PlayableLinePlayer
          line={trapLine}
          boardOrientation={opening.color}
          mode={viewMode === 'named-trap-learn' ? 'learn' : 'practice'}
          onComplete={handleExit}
          onExit={handleExit}
        />
      );
    }
  }

  // Named-trap PLAY — the coach MUST follow the trap's exact teaching line,
  // not the opening's generic main line (David 2026-05-24).
  if (viewMode === 'named-trap-play' && activeNamedTrapId) {
    const trapLine =
      opening.id === 'ruy-lopez' ? getRuyTrapPlayableLine(activeNamedTrapId)
        : opening.id === 'vienna-game' ? getViennaTrapPlayableLine(activeNamedTrapId)
          : opening.id === 'caro-kann' ? getCaroTrapPlayableLine(activeNamedTrapId)
            : null;
    const trapCustom = trapLine
      ? { name: trapLine.title, pgn: trapLine.moves.join(' '), explanation: '' }
      : undefined;
    return (
      <OpeningPlayMode
        opening={opening}
        customLine={trapCustom}
        onExit={handleExit}
      />
    );
  }

  // Punish-gem WLPP — Watch the crush played out, Learn it (voice-guided),
  // Practice it (silent + hint). The line is built from the gem's played-out
  // playLine; every move carries its lead-the-eye arrow.
  if (
    (viewMode === 'gem-watch' || viewMode === 'gem-learn' || viewMode === 'gem-practice') &&
    activeGemId
  ) {
    const gem = getPunishGemById(activeGemId);
    const gemLine = gem ? gemToPlayableLine(gem) : null;
    if (gemLine) {
      return (
        <PlayableLinePlayer
          line={gemLine}
          boardOrientation={opening.color}
          mode={viewMode === 'gem-watch' ? 'watch' : viewMode === 'gem-learn' ? 'learn' : 'practice'}
          onComplete={handleExit}
          onExit={handleExit}
        />
      );
    }
  }

  // Punish-gem PLAY — the coach MUST follow the gem's exact line (David
  // 2026-05-24: "it MUST stick to the line/variation being taught"). Pass the
  // gem's played-out line as the customLine so OpeningPlayMode locks the
  // opponent to it instead of playing the opening's generic main line.
  if (viewMode === 'gem-play' && activeGemId) {
    const gem = getPunishGemById(activeGemId);
    const gemLine = gem
      ? { name: `Punish ${gem.inaccuracy} with ${gem.punish}`, pgn: gem.playLine, explanation: gem.why }
      : undefined;
    return <OpeningPlayMode opening={opening} customLine={gemLine} onExit={handleExit} />;
  }

  // Pitfall WLPP — the antidote line for a common mistake. Watch plays the
  // correct move with the narration explaining why the wrong move fails;
  // Learn voice-guides the student to play the correct move; Practice is
  // silent + hint. The line is synthesized from the mistake's real
  // fen/correctMove (or its authored punishmentLine) — never invented.
  if (
    (viewMode === 'pitfall-watch' || viewMode === 'pitfall-learn' || viewMode === 'pitfall-practice') &&
    activeMistake
  ) {
    const pitfallMode = viewMode === 'pitfall-watch' ? 'watch' : viewMode === 'pitfall-learn' ? 'learn' : 'practice';
    const pitfallLine = commonMistakeToPlayableLine(activeMistake, pitfallMode);
    if (pitfallLine) {
      return (
        <PlayableLinePlayer
          line={pitfallLine}
          boardOrientation={opening.color}
          mode={pitfallMode}
          onComplete={handleExit}
          onExit={handleExit}
        />
      );
    }
  }

  // Walkthrough mode (trap/warning lines)
  if (viewMode === 'trap-walkthrough' && opening.trapLines?.[activeTrapLineIndex]) {
    return (
      <WalkthroughMode
        opening={opening}
        customLine={opening.trapLines[activeTrapLineIndex]}
        subLineKey={`trap-${activeTrapLineIndex}`}
        onExit={handleExit}
      />
    );
  }
  if (viewMode === 'warning-walkthrough' && opening.warningLines?.[activeWarningLineIndex]) {
    return (
      <WalkthroughMode
        opening={opening}
        customLine={opening.warningLines[activeWarningLineIndex]}
        subLineKey={`warning-${activeWarningLineIndex}`}
        onExit={handleExit}
      />
    );
  }

  // Learn mode (main line or variation). LEARN must GUIDE you move-by-move
  // while YOU play — NOT auto-play the chapter (that's Watch). So convert the
  // masterclass lesson into a playable line and drive it through
  // PlayableLinePlayer in 'learn' mode. (Previously this mounted LessonPlayer,
  // i.e. Learn === Watch — the §1a bug.)
  if (viewMode === 'learn' || viewMode === 'variation-learn') {
    const learnLesson = viewMode === 'variation-learn'
      ? getVariationLessonScript(opening.id, opening.variations?.[activeVariationIndex]?.name)
      : getLessonScript(opening.id);
    const learnLine = lessonToPlayableLine(learnLesson);
    if (learnLine) {
      const learnLineIdx = viewMode === 'variation-learn' ? activeVariationIndex : MAIN_LINE_INDEX;
      return (
        <PlayableLinePlayer
          line={learnLine}
          boardOrientation={opening.color}
          mode="learn"
          onComplete={() => { void markRungComplete(opening.id, learnLineIdx, 'learn').then(() => loadOpening()); }}
          onExit={handleExit}
        />
      );
    }
    const learnLineIdx = viewMode === 'variation-learn' ? activeVariationIndex : MAIN_LINE_INDEX;
    return (
      <DrillMode
        opening={opening}
        variationIndex={viewMode === 'variation-learn' ? activeVariationIndex : undefined}
        onComplete={() => { void markRungComplete(opening.id, learnLineIdx, 'learn').then(() => loadOpening()); }}
        onExit={handleExit}
      />
    );
  }

  // Learn mode (trap/warning lines)
  if (viewMode === 'trap-learn' && opening.trapLines?.[activeTrapLineIndex]) {
    return (
      <DrillMode
        opening={opening}
        customLine={opening.trapLines[activeTrapLineIndex]}
        onComplete={handleComplete}
        onExit={handleExit}
      />
    );
  }
  if (viewMode === 'warning-learn' && opening.warningLines?.[activeWarningLineIndex]) {
    return (
      <DrillMode
        opening={opening}
        customLine={opening.warningLines[activeWarningLineIndex]}
        onComplete={handleComplete}
        onExit={handleExit}
      />
    );
  }

  // Practice mode (main line or variation)
  if (viewMode === 'practice' || viewMode === 'variation-practice') {
    const practiceLineIdx = viewMode === 'variation-practice' ? activeVariationIndex : MAIN_LINE_INDEX;
    return (
      <PracticeMode
        opening={opening}
        variationIndex={viewMode === 'variation-practice' ? activeVariationIndex : undefined}
        onComplete={() => { void markRungComplete(opening.id, practiceLineIdx, 'practice').then(() => loadOpening()); }}
        onExit={handleExit}
      />
    );
  }

  // Practice mode (trap/warning lines)
  if (viewMode === 'trap-practice' && opening.trapLines?.[activeTrapLineIndex]) {
    return (
      <PracticeMode
        opening={opening}
        customLine={opening.trapLines[activeTrapLineIndex]}
        onComplete={handleComplete}
        onExit={handleExit}
      />
    );
  }
  if (viewMode === 'warning-practice' && opening.warningLines?.[activeWarningLineIndex]) {
    return (
      <PracticeMode
        opening={opening}
        customLine={opening.warningLines[activeWarningLineIndex]}
        onComplete={handleComplete}
        onExit={handleExit}
      />
    );
  }

  // Play mode (main line, or from quiz position)
  if (viewMode === 'play') {
    return (
      <OpeningPlayMode
        opening={opening}
        startFen={quizPlayFen ?? undefined}
        onExit={handleExit}
      />
    );
  }

  // Play mode (variation)
  if (viewMode === 'variation-play' && opening.variations?.[activeVariationIndex]) {
    return (
      <OpeningPlayMode
        opening={opening}
        customLine={opening.variations[activeVariationIndex]}
        onExit={handleExit}
      />
    );
  }

  // Play mode (trap/warning lines)
  if (viewMode === 'trap-play' && opening.trapLines?.[activeTrapLineIndex]) {
    return (
      <OpeningPlayMode
        opening={opening}
        customLine={opening.trapLines[activeTrapLineIndex]}
        onExit={handleExit}
      />
    );
  }
  if (viewMode === 'warning-play' && opening.warningLines?.[activeWarningLineIndex]) {
    return (
      <OpeningPlayMode
        opening={opening}
        customLine={opening.warningLines[activeWarningLineIndex]}
        onExit={handleExit}
      />
    );
  }

  // Train mode (traps or warnings)
  if (viewMode === 'train-traps' && opening.trapLines && opening.trapLines.length > 0) {
    return (
      <TrainMode
        opening={opening}
        lines={opening.trapLines}
        sectionLabel="Traps & Pitfalls"
        onExit={handleExit}
      />
    );
  }

  if (viewMode === 'train-warnings' && opening.warningLines && opening.warningLines.length > 0) {
    return (
      <TrainMode
        opening={opening}
        lines={opening.warningLines}
        sectionLabel="Watch Out For"
        onExit={handleExit}
      />
    );
  }

  // Middlegame WATCH / LEARN / PRACTICE — one player, three modes over the
  // plan's playable line (David 2026-05-21):
  //   • watch    — auto-play with voice (demo), then replay from memory.
  //   • learn    — voice guides each move (says the idea + shows it); you play.
  //   • practice — same board, silent; you replay the line from memory.
  // When the plan has no playable line we fall back to the legacy study /
  // free-practice surfaces below.
  if (
    activeMiddlegamePlan &&
    activeMiddlegamePlan.playableLines &&
    activeMiddlegamePlan.playableLines.length > 0 &&
    (viewMode === 'middlegame-watch' ||
      viewMode === 'middlegame-plan' ||
      viewMode === 'middlegame-practice')
  ) {
    const playMode =
      viewMode === 'middlegame-plan'
        ? 'learn'
        : viewMode === 'middlegame-practice'
          ? 'practice'
          : 'watch';
    return (
      <PlayableLinePlayer
        line={activeMiddlegamePlan.playableLines[0]}
        boardOrientation={opening.color}
        mode={playMode}
        onComplete={handleExit}
        onExit={handleExit}
      />
    );
  }

  // Model game viewer — watch a real master win with this opening (the
  // student's side always WINS; the section filters out any loss).
  if (viewMode === 'model-game' && activeModelGame) {
    return (
      <ModelGameViewer
        game={activeModelGame}
        boardOrientation={opening.color}
        onExit={handleExit}
      />
    );
  }

  // Middlegame LEARN fallback — no playable line: study the plan
  // (overview, breaks, maneuvers, themes).
  if ((viewMode === 'middlegame-watch' || viewMode === 'middlegame-plan') && activeMiddlegamePlan) {
    return (
      <MiddlegamePlanStudy
        plan={activeMiddlegamePlan}
        boardOrientation={opening.color}
        onExit={handleExit}
      />
    );
  }

  // Middlegame PRACTICE fallback — no playable line: free practice vs engine.
  if (viewMode === 'middlegame-practice' && activeMiddlegamePlan) {
    return (
      <MiddlegamePractice
        plan={activeMiddlegamePlan}
        playerColor={opening.color}
        onExit={handleExit}
      />
    );
  }

  // Middlegame PLAY — play vs the coach from the plan's critical position.
  if (viewMode === 'middlegame-play' && activeMiddlegamePlan) {
    return (
      <OpeningPlayMode
        opening={opening}
        startFen={activeMiddlegamePlan.criticalPositionFen}
        onExit={handleExit}
      />
    );
  }

  // Detail view
  const mastery = getMasteryPercent(opening);
  const totalLines = getTotalLines(opening);
  const discovered = getLinesDiscovered(opening);
  const perfected = getLinesPerfected(opening);

  // Data lookups for new features
  const mistakes = (commonMistakesData as Record<string, CommonMistake[]>)[opening.id] ?? [];
  // Middlegame plans for this opening — used for the Master zone's
  // "listen" narration (plan titles + overviews).
  const openingPlans = (middlegamePlansData as MiddlegamePlan[]).filter(
    (p) => p.openingId === opening.id,
  );
  const quizzes = (checkpointQuizzesData as Record<string, CheckpointQuizItem[]>)[opening.id] ?? [];
  const currentQuiz: CheckpointQuizItem | null = quizzes[quizIndex] as CheckpointQuizItem | undefined ?? null;

  // ── Variation tabs / full-page rescope ────────────────────────────
  // The 7 first-class variation tabs; selecting one rescopes the whole
  // page to that variation ("seven openings in one"). Per-variation
  // overview = its explanation until Phase 5 authors fuller copy; key
  // ideas / endgame / traps share the opening's for the initial rescope.
  const variationTabs = buildVariationTabs(opening.id, opening.variations);
  const tabLabel = variationTabs.find((t) => t.index === selectedTabIndex)?.label;
  const selectedVariation =
    selectedTabIndex >= 0 ? opening.variations?.[selectedTabIndex] ?? null : null;
  const isVariation = selectedVariation !== null;

  // WLPP unlock ladder for the active line (main = MAIN_LINE_INDEX). Forward-
  // lock only; the per-line "unlock all" escape frees everything. Weapons
  // unlock once Play is done.
  const ladderLine = isVariation ? selectedTabIndex : MAIN_LINE_INDEX;
  const ladderUnlockedAll = isLineUnlockedAll(opening, ladderLine);
  const weaponsUnlocked = areWeaponsUnlocked(opening, ladderLine);
  const ladderNext = nextRung(opening, ladderLine);
  // "I already know this" expert pass — a lifetime budget of ONE per color
  // (one White opening + one Black opening). Spending it unlocks the WHOLE
  // opening (every line), so the ladder can't be defeated by clicking
  // "I'm an expert" everywhere.
  const unlockBudget = unlockBudgetFor(weaponUnlockPasses, opening.id, opening.color);
  const colorLabel = opening.color === 'white' ? 'White' : 'Black';
  const handleUnlockAll = (): void => {
    if (!unlockBudget.allowed) return;
    // Spending a 1-of-1 lifetime pass shouldn't die to a misclick: the first
    // tap arms the confirm, the second commits.
    if (!confirmingUnlock) { setConfirmingUnlock(true); return; }
    setConfirmingUnlock(false);
    void unlockOpeningAllLines(opening.id, opening.variations?.length ?? 0)
      .then(() => { recordWeaponUnlockPass(opening.color, opening.id); return loadOpening(); })
      .catch((err: unknown) => { console.warn('[OpeningDetailPage] unlockOpeningAllLines failed:', err); });
  };

  const subjectName = selectedVariation?.name ?? opening.name;
  const subjectOverview =
    selectedVariation?.overview ?? selectedVariation?.explanation ?? opening.overview;
  const subjectKeyIdeas = selectedVariation
    ? selectedVariation.keyIdeas ?? opening.keyIdeas
    : opening.keyIdeas;
  const tabKey = isVariation ? (tabLabel ?? '').toLowerCase() : 'main';
  // The Pirc plan table keys on the FULL variation name; Ruy keys on its
  // curated SHORT label. tabLabel is the (possibly truncated) display label
  // — "Austrian Attack with e5 c5" shows as "Austrian Attack w…", which
  // wouldn't match the full-name key. So resolve Pirc plans off the full
  // variation name, not the display label.
  const pircTabKey = isVariation ? (selectedVariation?.name ?? '').toLowerCase() : 'main';
  const planPrefix = `mp-${opening.id.replace(/-/g, '')}`;
  // Curated openings (Ruy, Pirc, Vienna) use HAND-PICKED plan tables (no
  // algo show-all). Other openings fall back: variation → its own plan,
  // main line → all plans.
  const subjectPlanIds =
    getRuyTabPlanIds(opening.id, tabKey) ??
    getPircTabPlanIds(opening.id, pircTabKey) ??
    getViennaTabPlanIds(opening.id, tabKey) ??
    (isVariation ? [`${planPrefix}-${tabKey}`] : undefined);

  // HAND-PICKED named traps for this tab (hand-authored beat lessons).
  // The STANDALONE Weapons SECTION HEADER is removed (David 2026-05-21:
  // no blank/empty masterclass zones), but each real student-side WEAPON
  // still gets its own green-outlined tile. Same WLPP shape as warnings.
  // Ruy → ruyTrapLessons; Vienna → viennaTrapLessons. Per-opening lookup.
  const namedTraps: (RuyTrapDef | ViennaTrapDef | CaroTrapDef)[] =
    opening.id === 'ruy-lopez' ? getRuyTrapsForTab(tabKey)
      : opening.id === 'vienna-game' ? getViennaTrapsForTab(tabKey)
      : opening.id === 'caro-kann' ? getCaroTrapsForTab(tabKey)
        : [];
  const namedWeapons = namedTraps.filter((t) => t.kind === 'weapon');
  const namedWarnings = namedTraps.filter((t) => t.kind === 'warning');

  // Punish-the-inaccuracy GEMS for THIS tab — the weapon-section spine: the
  // common move the opponent actually plays here that scores badly for them,
  // and the punish played out. On a variation tab, filtered to gems that live
  // on that tab's spine; on the main tab, every gem for the opening. (WO:
  // docs/plans/2026-05-23-punish-gems-wo.md.)
  const tabSpinePgn = selectedVariation
    ? selectedVariation.pgn.replace(/\d+\.(\.\.)?/g, ' ').replace(/\s+/g, ' ').trim()
    : undefined;
  // Only WEAPONS surface — engine-verified real benefit (≥ +0.5). Practical
  // (DB-scored, unverified) and weak gems are hidden; the section repopulates
  // when the Stockfish CI (mine-punish-gems.yml) grades them (David 2026-05-24).
  // Strongest first — the tactical crushes lead, the honest positional edges
  // sit last (David 2026-05-24: order by strength, weak ones at the bottom).
  const tabGems = getPunishGemsForTab(opening.id, tabSpinePgn)
    .filter(isSurfaceableGem)
    .sort((a, b) => (b.engineCp ?? 0) - (a.engineCp ?? 0));

  // Zone self-hide flags — NO blank/empty zones on the masterclass
  // (David 2026-05-21). A zone header renders only when it has content for
  // the current opening/tab; otherwise it's removed entirely.
  const tabHasPlans = subjectPlanIds
    ? (middlegamePlansData as MiddlegamePlan[]).some((p) => subjectPlanIds.includes(p.id))
    : openingPlans.length > 0;
  // Main-line note: when the MAIN tab has no plan of its own but the opening
  // DOES carry plans (all on its variation tabs — e.g. the Pirc), state that
  // fact in the Middlegame section instead of hiding it (David 2026-05-22).
  const openingHasVariationPlans =
    !isVariation &&
    !tabHasPlans &&
    (middlegamePlansData as MiddlegamePlan[]).some((p) => p.openingId === opening.id);
  const mainPlanNote = openingHasVariationPlans
    ? "There's no single main-line plan here — the middlegame depends on which system your opponent picks. Choose a variation tab above to study its plan."
    : undefined;
  const hasMasterContent =
    Boolean(currentQuiz && !quizCompleted) || tabHasPlans || Boolean(mainPlanNote);
  const hasPitfalls =
    namedWarnings.length > 0 ||
    (opening.warnings?.length ?? 0) > 0 ||
    (opening.warningLines?.length ?? 0) > 0 ||
    mistakes.length > 0;

  // 4-button Watch/Learn/Practice/Play row for a named trap (weapon or
  // warning). Watch = beat lesson; Learn = voice-guided play; Practice =
  // silent + hint; Play = coach locked to this opening.
  const NamedTrapWLPP = ({ trapId }: { trapId: string }): JSX.Element => {
    const btn = 'flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg bg-theme-surface border border-theme-border text-theme-text-muted hover:text-theme-text hover:bg-theme-border text-[10px] font-medium transition-colors';
    return (
      <div className="grid grid-cols-4 gap-1.5 mt-2">
        <button onClick={() => handleNamedTrapAction(trapId, 'watch')} className={`${btn} opening-action-glow opening-action-glow-watch`} data-testid={`named-trap-watch-${trapId}`}>
          <PlayCircle size={15} />Watch
        </button>
        <button onClick={() => handleNamedTrapAction(trapId, 'learn')} className={`${btn} opening-action-glow opening-action-glow-learn`} data-testid={`named-trap-learn-${trapId}`}>
          <LearnIcon size={15} />Learn
        </button>
        <button onClick={() => handleNamedTrapAction(trapId, 'practice')} className={`${btn} opening-action-glow opening-action-glow-practice`} data-testid={`named-trap-practice-${trapId}`}>
          <Brain size={15} />Practice
        </button>
        <button onClick={() => handleNamedTrapAction(trapId, 'play')} className={`${btn} opening-action-glow opening-action-glow-play`} data-testid={`named-trap-play-${trapId}`}>
          <Swords size={15} />Play
        </button>
      </div>
    );
  };

  // Same WLPP row for a punish gem — Watch the crush played out, Learn it
  // (voice-guided), Practice (silent + hint), Play (coach locked to opening).
  const GemWLPP = ({ id }: { id: string }): JSX.Element => {
    const btn = 'flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg bg-theme-surface border border-theme-border text-theme-text-muted hover:text-theme-text hover:bg-theme-border text-[10px] font-medium transition-colors';
    return (
      <div className="grid grid-cols-4 gap-1.5 mt-2">
        <button onClick={() => handleGemAction(id, 'watch')} className={`${btn} opening-action-glow opening-action-glow-watch`} data-testid={`gem-watch-${id}`}>
          <PlayCircle size={15} />Watch
        </button>
        <button onClick={() => handleGemAction(id, 'learn')} className={`${btn} opening-action-glow opening-action-glow-learn`} data-testid={`gem-learn-${id}`}>
          <LearnIcon size={15} />Learn
        </button>
        <button onClick={() => handleGemAction(id, 'practice')} className={`${btn} opening-action-glow opening-action-glow-practice`} data-testid={`gem-practice-${id}`}>
          <Brain size={15} />Practice
        </button>
        <button onClick={() => handleGemAction(id, 'play')} className={`${btn} opening-action-glow opening-action-glow-play`} data-testid={`gem-play-${id}`}>
          <Swords size={15} />Play
        </button>
      </div>
    );
  };

  const NarrationButton = ({
    sectionId,
    text,
    kind,
    bullets,
  }: {
    sectionId: string;
    text: string;
    kind?: 'traps' | 'warnings';
    bullets?: string[] | null;
  }): JSX.Element => {
    const isNarrating = narratingSection === sectionId;
    const isLoading = loadingSection === sectionId;
    return (
      <button
        onClick={() => toggleNarration(sectionId, text, kind ? { kind, bullets } : undefined)}
        className="ml-auto p-1.5 rounded-lg hover:bg-theme-border/50 text-theme-text-muted hover:text-theme-accent transition-colors"
        aria-label={
          isLoading
            ? 'Preparing narration'
            : isNarrating
              ? 'Stop narration'
              : 'Narrate section'
        }
        data-testid={`narrate-${sectionId}`}
      >
        {isLoading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : isNarrating ? (
          <StopIcon size={14} />
        ) : (
          <Volume2 size={14} />
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col flex-1 p-4 md:p-6 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-6 overflow-y-auto" data-testid="opening-detail">
      <MasterclassCoachChat openingId={opening.id} variationName={opening.variations?.[activeVariationIndex]?.name} />
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => void navigate(isProContext && playerId ? `/openings/pro/${playerId}` : '/openings')}
          className="p-2 rounded-lg hover:bg-theme-surface transition-colors"
          aria-label="Back to openings"
          data-testid="back-button"
        >
          <ArrowLeft size={18} className="text-theme-text" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-theme-text">{subjectName}</h1>
          <div className="flex items-center gap-2 text-sm text-theme-text-muted">
            <span className="font-mono">{opening.eco}</span>
            <span className="w-1 h-1 rounded-full bg-theme-text-muted" />
            <span className="capitalize">{opening.color}</span>
            {opening.style && (
              <>
                <span className="w-1 h-1 rounded-full bg-theme-text-muted" />
                <span>{opening.style}</span>
              </>
            )}
          </div>
        </div>
        <PageHelp
          helpId="opening-detail"
          title="How to use a Masterclass"
          steps={[
            { label: 'Watch', body: 'Sit back — the line plays itself while the coach explains every idea. This is where you GET the opening.' },
            { label: 'Learn', body: 'Now you play the moves. The voice cues each one; you make it on the board. Locks the line into your hands.' },
            { label: 'Practice', body: 'Same line, silent. A Hint button if you blank. Prove you can play it with no help.' },
            { label: 'Play', body: 'Play it out against the coach, locked to this opening. Real reps against resistance.' },
            { label: 'Weapons', body: 'The common mistakes your opponent actually makes here — and exactly how to punish them. Watch the crush, then Learn / Practice / Play it like any line.' },
            { label: 'Ask the coach', body: 'Stuck on a move? Ask anytime — the coach knows which line you are studying.' },
            { label: 'The climb', body: 'Watch → Learn → Practice → Play. Each rung makes the opening more yours. Do them in order.' },
          ]}
        />
        <button
          onClick={(e) => {
            // Fire the star-slide animation only when the click will
            // FAVORITE (false→true). Unfavoriting doesn't earn the
            // visual. Source rect captured BEFORE handleToggleFavorite
            // runs so the heart's pre-toggle position is what the
            // ghost slides from.
            if (!opening.isFavorite) {
              const r = e.currentTarget.getBoundingClientRect();
              triggerStarAnimation({
                sourceRect: { x: r.x, y: r.y, width: r.width, height: r.height },
                openingName: opening.name,
                openingColor: opening.color,
              });
            }
            void handleToggleFavorite();
          }}
          className="p-2 rounded-lg hover:bg-theme-surface transition-colors"
          aria-label={opening.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          data-testid="favorite-btn"
        >
          <Heart
            size={20}
            className={opening.isFavorite ? 'text-red-500 fill-red-500' : 'text-theme-text-muted'}
          />
        </button>
        <MasteryRing percent={mastery} size={48} />
      </div>

      {/* Line stats */}
      {totalLines > 0 && (
        <div className="flex gap-4 mb-4 text-sm text-theme-text-muted">
          <span data-testid="lines-discovered">{discovered}/{totalLines} lines discovered</span>
          <span data-testid="lines-perfected">{perfected}/{totalLines} lines perfected</span>
        </div>
      )}

      {/* Variation tabs — selecting one rescopes the whole page to that
          variation. The main line is the default (leftmost pill). */}
      <VariationTabs
        tabs={variationTabs}
        selectedIndex={selectedTabIndex}
        onSelect={handleSelectTab}
        mainLabel={opening.id === 'caro-kann' ? 'Classical System' : undefined}
      />

      {/* WALKTHROUGH, LEARN, PRACTICE, PLAY buttons — the WLPP unlock ladder.
          Each rung unlocks the next; locked rungs are greyed with a hint.
          The per-line "unlock all" escape (below) frees the whole ladder. */}
      {(() => {
        const launchPlay = (): void => {
          // Play has no in-page completion signal (main line hands off to
          // /coach/play), so reaching Play counts as "played" — this is what
          // unlocks the line's weapons. The unlock-all escape is the safety
          // valve if a learner wants the weapons without playing.
          void markRungComplete(opening.id, ladderLine, 'play').then(() => loadOpening());
          if (isVariation) {
            handleStartVariationPlay(selectedTabIndex);
            return;
          }
          useCoachMemoryStore.getState().setIntendedOpening({
            name: opening.name,
            color: opening.color,
            capturedFromSurface: 'openings-play',
            pgn: opening.pgn,
          });
          void navigate(`/coach/play?side=${opening.color}`);
        };
        const rungs = [
          { rung: 'watch' as const, label: 'Watch', icon: <PlayCircle size={18} />, glow: 'opening-action-glow-watch', testid: 'walkthrough-btn',
            base: 'bg-theme-accent text-white hover:opacity-90',
            onClick: () => (isVariation ? handleStartVariationWalkthrough(selectedTabIndex) : setViewMode('walkthrough')) },
          { rung: 'learn' as const, label: 'Learn', icon: <LearnIcon size={18} />, glow: 'opening-action-glow-learn', testid: 'learn-btn',
            base: 'bg-theme-surface border border-theme-border text-theme-text hover:bg-theme-border',
            onClick: () => (isVariation ? handleStartVariationLearn(selectedTabIndex) : setViewMode('learn')) },
          { rung: 'practice' as const, label: 'Practice', icon: <Brain size={18} />, glow: 'opening-action-glow-practice', testid: 'practice-btn',
            base: 'bg-theme-surface border border-theme-border text-theme-text hover:bg-theme-border',
            onClick: () => (isVariation ? handleStartVariationPractice(selectedTabIndex) : setViewMode('practice')) },
          { rung: 'play' as const, label: 'Play', icon: <Swords size={18} />, glow: 'opening-action-glow-play', testid: 'play-btn',
            base: 'bg-theme-surface border border-theme-border text-theme-text hover:bg-theme-border',
            onClick: launchPlay },
        ];
        return (
          <div className="mb-6">
            <div className="grid grid-cols-4 gap-1.5">
              {rungs.map((r) => {
                const unlocked = isRungUnlocked(opening, ladderLine, r.rung);
                const complete = isRungComplete(opening, ladderLine, r.rung);
                return (
                  <button
                    key={r.rung}
                    onClick={unlocked ? r.onClick : undefined}
                    disabled={!unlocked}
                    title={unlocked ? undefined : lockHint(r.rung)}
                    className={`relative flex flex-col items-center justify-center gap-1 py-3 rounded-xl font-semibold text-xs transition-all opening-action-glow ${r.glow} ${
                      unlocked ? r.base : 'bg-theme-surface border border-theme-border text-theme-text-muted opacity-40 cursor-not-allowed'
                    }`}
                    data-testid={r.testid}
                    data-locked={!unlocked}
                  >
                    {unlocked ? r.icon : <Lock size={18} />}
                    {r.label}
                    {complete && (
                      <span className="absolute top-1 right-1 text-emerald-400" data-testid={`rung-done-${r.rung}`}>
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {/* Ladder guidance + unlock-all escape */}
            <div className="flex items-center justify-between mt-2 px-0.5">
              <span className="text-xs text-theme-text-muted" data-testid="ladder-hint">
                {ladderUnlockedAll
                  ? 'All unlocked'
                  : ladderNext
                    ? `Next: ${RUNG_LABEL[ladderNext]} it`
                    : 'Ladder complete — weapons unlocked'}
              </span>
              {!ladderUnlockedAll && (
                unlockBudget.allowed ? (
                  <button
                    onClick={handleUnlockAll}
                    className="text-xs text-theme-text-muted hover:text-amber-300 underline underline-offset-2"
                    data-testid="unlock-all-btn"
                  >
                    {confirmingUnlock
                      ? `Spend your ${colorLabel} expert pass? Tap to confirm`
                      : `I already know this opening — use ${colorLabel} expert pass`}
                  </button>
                ) : (
                  <span className="text-xs text-theme-text-muted/70" data-testid="unlock-all-spent">
                    {colorLabel} expert pass already used
                  </span>
                )
              )}
            </div>
          </div>
        );
      })()}

      {/* SRS trainer enrollment */}
      <div className="flex items-center gap-2 mb-5" data-testid="srs-enroll-row">
        <button
          onClick={() => void handleToggleSrs()}
          disabled={srsBusy}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors border-2 ${
            srsEnrolled
              ? 'bg-purple-500/15 border-purple-400/60 text-purple-200 hover:bg-purple-500/25'
              : 'bg-theme-surface border-purple-500/30 text-theme-text hover:border-purple-400/60'
          } disabled:opacity-60 disabled:cursor-wait`}
          data-testid={srsEnrolled ? 'srs-unenroll-btn' : 'srs-enroll-btn'}
        >
          {srsEnrolled ? <CheckCircle2 size={16} /> : <Sparkles size={16} />}
          {srsEnrolled ? 'In trainer' : 'Add to trainer'}
        </button>
        {srsEnrolled && (
          <button
            onClick={() => void navigate('/openings/srs')}
            className="px-3 py-2.5 rounded-xl bg-purple-500/15 border-2 border-purple-400/60 text-purple-200 text-sm font-semibold hover:bg-purple-500/25 transition-colors"
            data-testid="srs-open-btn"
          >
            Review
          </button>
        )}
      </div>
      {srsFlash && (
        <p className="text-xs text-purple-300 -mt-3 mb-4" data-testid="srs-flash">
          {srsFlash}
        </p>
      )}

      {/* ═══ ZONE 2 — UNDERSTAND ═══════════════════════════════════════
          "Here's what this opening IS and what masters have said
          about it." Contains: Overview + Key Ideas + Classic Wisdom.
          See docs/plans/2026-05-19-narration-tone-rewrite.md for the
          full teaching arc design. */}
      <OpeningZoneHeader
        color="cyan"
        icon={BookOpen}
        title="Understand"
        tagline="What this opening is and what masters have said about it."
        isActive={narratingSection === 'understand-zone'}
        onActivate={() => {
          const parts = [
            opening.overview,
            opening.keyIdeas && opening.keyIdeas.length > 0
              ? `Key ideas. ${opening.keyIdeas.join('. ')}`
              : '',
          ].filter(Boolean);
          if (parts.length > 0) toggleNarration('understand-zone', parts.join('. '));
        }}
      />

      {/* Overview — listenable prose (tap-to-read, per-paragraph relisten).
          Rescopes to the selected variation's text. */}
      {subjectOverview && (
        <ListenableProse
          key={`overview-${selectedTabIndex}`}
          title="Overview"
          icon={BookOpen}
          iconColor="text-theme-accent"
          idPrefix="overview"
          items={subjectOverview.split('\n\n').filter(Boolean)}
        />
      )}

      {/* Key Ideas — listenable bullets. */}
      {subjectKeyIdeas && subjectKeyIdeas.length > 0 && (
        <ListenableProse
          key={`keyIdeas-${selectedTabIndex}`}
          title="Key Ideas"
          icon={Lightbulb}
          iconColor="text-yellow-500"
          idPrefix="keyIdeas"
          items={subjectKeyIdeas}
          variant="bullets"
        />
      )}

      {/* Classic Wisdom — passages from Capablanca / Lasker / Staunton /
          Young / Edge / Bird (Project Gutenberg, public domain) that
          mention this opening. Renders nothing if no passages matched. */}
      <ClassicWisdomSection
        openingName={opening.name}
        renderNarrationButton={(text) => (
          <NarrationButton sectionId="classic-wisdom" text={text} />
        )}
        onActivate={(text) => toggleNarration('classic-wisdom', text)}
      />

      {/* From the Books — one audiobook-style tabbed reader (Opening /
          Middlegame / Endgame chapters) read aloud passage-by-passage.
          Replaces the prior split BookPagesSection + ConceptBookSection. */}
      <BookReader
        key={`book-${selectedTabIndex}`}
        openingName={subjectName}
        overview={subjectOverview}
        keyIdeas={subjectKeyIdeas}
      />

      {/* ═══ ZONE 3 — MASTER ═══════════════════════════════════════════
          "Test what you grasped. See the plans. Study one complete
          game." Contains: Quiz + Middlegame Plans + Model Games. */}
      {hasMasterContent && (
        <OpeningZoneHeader
          color="blue"
          icon={GraduationCap}
          title="Master"
          tagline="Test what you grasped. See the plans. Study one complete game."
          isActive={narratingSection === 'master-zone'}
          onActivate={() => {
            if (openingPlans.length === 0) return;
            const text = openingPlans
              .map((p) => `${p.title}. ${p.overview}`)
              .join('. ');
            toggleNarration('master-zone', text);
          }}
        />
      )}

      {/* Checkpoint Quiz — after Key Ideas */}
      {currentQuiz && !quizCompleted && (
        <CheckpointQuiz
          quiz={currentQuiz}
          boardOrientation={opening.color}
          onComplete={() => {
            if (quizIndex < quizzes.length - 1) {
              setQuizIndex((prev) => prev + 1);
            } else {
              setQuizCompleted(true);
            }
          }}
          onPlayPosition={handleQuizPlayPosition}
        />
      )}

      {/* Middlegame Plans — Watch / Learn / Practice / Play per plan.
          The theory prose now lives inside Learn (MiddlegamePlanStudy),
          so there's no separate inline theory dump.
          Phase architecture (2026-05-22): this section now filters OUT
          `-endgame` plans — those render below in EndgamePlansSection. */}
      <MiddlegamePlansSection
        openingId={opening.id}
        boardOrientation={opening.color}
        onAction={handleMiddlegameAction}
        filterPlanIds={subjectPlanIds}
        emptyNote={mainPlanNote}
      />

      {/* Endgame Plans — opening-specific endgames that arise from the
          characteristic structure (e.g. Ruy Exchange → kingside-majority
          K&P, Ruy Berlin → queenless ending). Self-hides for openings
          whose character is decided in the middlegame (Vienna, sharp
          gambits, attacking lines). Per playbook §4: only GENUINE,
          LINE-SPECIFIC endgames belong here — general endgame technique
          lives in the BookReader's Endgame chapter. */}
      <EndgamePlansSection
        openingId={opening.id}
        boardOrientation={opening.color}
        onAction={handleMiddlegameAction}
        filterPlanIds={subjectPlanIds}
      />

      {/* MODEL GAMES — watch a real master win with this opening. Self-hides
          when there's no student-side win sourced; the section drops any game
          where the student's side loses (David 2026-05-21). Opening-level
          (games aren't tagged per variation). */}
      <ModelGamesSection
        openingId={opening.id}
        studentColor={opening.color}
        onSelectGame={(game) => { setActiveModelGame(game); setViewMode('model-game'); }}
      />

      {/* WEAPONS LOCK — the line's weapons (gems + named traps) stay locked
          until the user has Played the line (David: "lock the gems until play
          has been completed"). The unlock-all escape frees them early. */}
      {!weaponsUnlocked && (tabGems.length > 0 || namedWeapons.length > 0) && (
        <div
          className="bg-theme-surface rounded-xl p-4 mb-4 border border-theme-border opacity-80 flex items-center gap-3"
          data-testid="weapons-locked-card"
        >
          <Lock size={18} className="text-theme-text-muted shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-theme-text">Weapons locked</h3>
            <p className="text-xs text-theme-text-muted mt-0.5">{WEAPONS_LOCK_HINT}</p>
          </div>
          {unlockBudget.allowed ? (
            <button
              onClick={handleUnlockAll}
              className="text-xs text-theme-text-muted hover:text-amber-300 underline underline-offset-2 shrink-0"
              data-testid="weapons-unlock-all-btn"
            >
              {confirmingUnlock ? `Spend ${colorLabel} pass?` : `Use ${colorLabel} expert pass`}
            </button>
          ) : (
            <span className="text-xs text-theme-text-muted/70 shrink-0" data-testid="weapons-unlock-spent">
              {colorLabel} pass used
            </span>
          )}
        </div>
      )}

      {/* Punish-the-inaccuracy GEMS — the weapon-section SPINE (WO:
          docs/plans/2026-05-23-punish-gems-wo.md). The common move the
          opponent actually plays here that scores badly for them, mined from
          the amateur DB, with the punish played out (masters). The student
          Watches the crush, then Learns / Practices / Plays it. Named traps
          (below) are the rarer hand-authored jewels layered on top. */}
      {weaponsUnlocked && tabGems.length > 0 && (
        <div className="bg-theme-surface rounded-xl p-4 mb-4 border border-emerald-500/30" data-testid="punish-gems-card">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-emerald-400" />
            <h3 className="text-sm font-semibold text-theme-text">
              {tabGems.length === 1 ? 'Punish the common inaccuracy' : 'Punish the common inaccuracies'}
            </h3>
          </div>
          <div className="space-y-3">
            {tabGems.map((gem) => {
              const id = gemId(gem);
              return (
                <div
                  key={id}
                  className="w-full p-3 rounded-lg border border-theme-border"
                  data-testid={`punish-gem-${id}`}
                >
                  <div className="flex items-start gap-3">
                    <MiniBoard fen={gemInaccuracyFen(gem)} size={64} orientation={opening.color} />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-theme-text">
                        Opponent plays {gem.inaccuracy} — punish with {gem.punish}
                      </span>
                      <p className="text-xs text-theme-text-muted mt-0.5">{gem.why}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-semibold text-emerald-400/90">
                          {gem.freqPct}% of opponents · you score {gem.practicalScore}%
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            gem.tier === 'confirmed'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-sky-500/20 text-sky-300'
                          }`}
                        >
                          {gem.engineCp !== null
                            ? `${gem.tier === 'confirmed' ? 'Crush' : 'Edge'} ${gem.engineCp >= 0 ? '+' : ''}${(gem.engineCp / 100).toFixed(1)}`
                            : gem.tier === 'confirmed' ? 'Crush' : 'Edge'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <GemWLPP id={id} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Named WEAPONS for THIS tab — student-side punishments when the
          opponent slips. A single green-outlined card (no "Weapons" SECTION
          header — no blank zones per playbook §0.5), rendered between
          Master and Pitfalls so the arc reads: plans → weapons you wield
          → things you avoid. Same WLPP shape as the warnings tile. */}
      {weaponsUnlocked && namedWeapons.length > 0 && (
        <div className="bg-theme-surface rounded-xl p-4 mb-4 border border-green-500/30" data-testid="named-weapon-card">
          <div className="flex items-center gap-2 mb-3">
            <Swords size={14} className="text-green-500" />
            <h3 className="text-sm font-semibold text-theme-text">
              {namedWeapons.length === 1 ? 'Weapon on this line' : 'Weapons on this line'}
            </h3>
          </div>
          <div className="space-y-1">
            {namedWeapons.map((trap) => (
              <div
                key={trap.id}
                className="w-full p-3 rounded-lg"
                data-testid={`named-trap-${trap.id}`}
              >
                <div className="min-w-0">
                  <span className="text-sm font-medium text-theme-text">{trap.name}</span>
                  <p className="text-xs text-green-400/80 mt-0.5">When the opponent slips, this is how you punish.</p>
                </div>
                <NamedTrapWLPP trapId={trap.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ ZONE 5 — PITFALLS ═════════════════════════════════════════
          "Don't fall into these. Avoid these moves." Contains:
          Warning Lines (specific PGNs that punish the student) +
          Common Mistakes (move-by-move corrections). */}
      {hasPitfalls && (
        <OpeningZoneHeader
          color="amber"
          icon={AlertTriangle}
          title="Pitfalls"
          tagline="Don't fall into these. Avoid these moves."
          aside={
            (opening.warningLines?.length ?? 0) + mistakes.length > 0 ? (
              <span className="text-xs font-semibold text-amber-400">
                {(opening.warningLines?.length ?? 0) + mistakes.length} items
              </span>
            ) : undefined
          }
        />
      )}

      {/* Named anti-traps for THIS tab — show the trap, then snap the
          board back to the avoiding move. Hand-routed beat lessons. */}
      {namedWarnings.length > 0 && (
        <div className="bg-theme-surface rounded-xl p-4 mb-4 border border-amber-500/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-theme-text">Traps to avoid on this line</h3>
          </div>
          <div className="space-y-1">
            {namedWarnings.map((trap) => (
              <div
                key={trap.id}
                className="w-full p-3 rounded-lg"
                data-testid={`named-trap-${trap.id}`}
              >
                <div className="min-w-0">
                  <span className="text-sm font-medium text-theme-text">{trap.name}</span>
                  <p className="text-xs text-amber-400/80 mt-0.5">See the trap, then the move that dodges it.</p>
                </div>
                <NamedTrapWLPP trapId={trap.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings — Pitfalls zone card, amber outline to match the
          zone header (David 2026-05-20). Suppressed on Ruy tabs that
          carry curated named anti-traps (the lesson is the content). */}
      {namedWarnings.length === 0 && opening.warnings && opening.warnings.length > 0 && (
        <div className="bg-theme-surface rounded-xl p-4 mb-4 border border-amber-500/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-theme-text">Watch Out For</h3>
            <NarrationButton
              sectionId="warnings"
              text={opening.warnings.join('. ')}
              kind="warnings"
              bullets={opening.warnings}
            />
            {opening.warningLines && opening.warningLines.length > 0 && (
              <button
                onClick={() => setViewMode('train-warnings')}
                className="p-1.5 rounded-lg hover:bg-theme-border/50 text-theme-text-muted hover:text-amber-500 transition-colors"
                aria-label="Train warnings"
                title="Train"
                data-testid="train-warnings-btn"
              >
                <Crosshair size={14} />
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {opening.warnings.map((warning, i) => (
              <li key={i} className="text-sm text-theme-text-muted">{warning}</li>
            ))}
          </ul>
          {opening.warningLines && opening.warningLines.length > 0 && (
            <div className="space-y-1 mt-3 pt-3 border-t border-theme-border">
              {opening.warningLines.map((line, i) => (
                <div
                  key={i}
                  className="w-full p-3 rounded-lg hover:bg-theme-border/50 transition-colors"
                  data-testid={`warning-line-${i}`}
                >
                  <button
                    onClick={() => handleStartWarningLineAction(i, 'walkthrough')}
                    className="flex items-center gap-3 w-full text-left"
                    aria-label={`Open ${line.name}`}
                  >
                    <MiniBoard fen={warningLineFens[i]} size={48} orientation={opening.color} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-theme-text">{line.name}</span>
                      <p className="text-xs text-theme-text-muted truncate mt-0.5">{line.explanation}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1.5 mt-2 ml-[60px]">
                    <button
                      onClick={() => handleStartWarningLineAction(i, 'walkthrough')}
                      className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-theme-accent/20 bg-theme-surface border border-theme-border hover:border-theme-accent/40 text-theme-text-muted hover:text-theme-accent transition-colors opening-action-glow opening-action-glow-watch"
                      aria-label={`Watch ${line.name}`}
                      title="Watch"
                      data-testid={`warning-walkthrough-${i}`}
                    >
                      <PlayCircle size={16} />
                    </button>
                    <button
                      onClick={() => handleStartWarningLineAction(i, 'learn')}
                      className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-theme-accent/20 bg-theme-surface border border-theme-border hover:border-theme-accent/40 text-theme-text-muted hover:text-theme-accent transition-colors opening-action-glow opening-action-glow-learn"
                      aria-label={`Learn ${line.name}`}
                      title="Learn"
                      data-testid={`warning-learn-${i}`}
                    >
                      <LearnIcon size={16} />
                    </button>
                    <button
                      onClick={() => handleStartWarningLineAction(i, 'practice')}
                      className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-theme-accent/20 bg-theme-surface border border-theme-border hover:border-theme-accent/40 text-theme-text-muted hover:text-theme-accent transition-colors opening-action-glow opening-action-glow-practice"
                      aria-label={`Practice ${line.name}`}
                      title="Practice"
                      data-testid={`warning-practice-${i}`}
                    >
                      <Brain size={16} />
                    </button>
                    <button
                      onClick={() => handleStartWarningLineAction(i, 'play')}
                      className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-theme-accent/20 bg-theme-surface border border-theme-border hover:border-theme-accent/40 text-theme-text-muted hover:text-theme-accent transition-colors opening-action-glow opening-action-glow-play"
                      aria-label={`Play ${line.name}`}
                      title="Play"
                      data-testid={`warning-play-${i}`}
                    >
                      <Swords size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Common Mistakes — Pitfalls zone tail (moved from above
          Traps section so the teaching arc reads Weapons → Pitfalls).
          Amber-outlined to match the zone (David 2026-05-20). When a
          mistake has a punishmentLine, the card surfaces a "Watch the
          punishment" button that mounts PlayableLinePlayer — same WLPP
          surface as middlegame plans. */}
      {mistakes.length > 0 && (
        <div className="rounded-xl border border-amber-500/30">
          <CommonMistakesSection
            mistakes={mistakes}
            boardOrientation={opening.color}
            onPitfallAction={handlePitfallAction}
          />
        </div>
      )}

      {/* Woodpecker stats */}
      {opening.woodpeckerReps > 0 && (
        <div className="bg-theme-surface rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-theme-text mb-3">Woodpecker Stats</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-theme-accent mb-1">
                <Repeat size={14} />
              </div>
              <p className="text-lg font-bold text-theme-text" data-testid="wp-reps">{opening.woodpeckerReps}</p>
              <p className="text-[10px] text-theme-text-muted uppercase">Total Reps</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-theme-accent mb-1">
                <Clock size={14} />
              </div>
              <p className="text-lg font-bold text-theme-text" data-testid="wp-speed">
                {opening.woodpeckerSpeed !== null ? `${Math.round(opening.woodpeckerSpeed)}s` : '—'}
              </p>
              <p className="text-[10px] text-theme-text-muted uppercase">Best Time</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-theme-accent mb-1">
                <Target size={14} />
              </div>
              <p className="text-lg font-bold text-theme-text">
                {opening.woodpeckerLastDate
                  ? new Date(opening.woodpeckerLastDate).toLocaleDateString()
                  : '—'}
              </p>
              <p className="text-[10px] text-theme-text-muted uppercase">Last Drilled</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
