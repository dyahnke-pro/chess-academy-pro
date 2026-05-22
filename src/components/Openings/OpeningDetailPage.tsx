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
import { getLessonScript, getVariationLessonScript } from '../../data/lessons';
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
import { CommonMistakesSection } from './CommonMistakesSection';
import { OpeningZoneHeader } from './OpeningZoneHeader';
import commonMistakesData from '../../data/common-mistakes.json';
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
  markLineDiscovered,
} from '../../services/openingService';
import {
  enrollOpening,
  unenrollOpening,
  isEnrolled,
} from '../../services/srsOpeningService';
import { narrateOpeningSection } from '../../services/openingSectionNarrator';
import { useStarAnimationStore } from '../../stores/starAnimationStore';
import { useCoachMemoryStore } from '../../stores/coachMemoryStore';
import type { OpeningRecord, MiddlegamePlan } from '../../types';
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
  | 'middlegame-watch'
  | 'middlegame-plan'
  | 'middlegame-practice'
  | 'middlegame-play'
  | 'mistake-watch';

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
  const [narratingSection, setNarratingSection] = useState<string | null>(null);
  const [activeMiddlegamePlan, setActiveMiddlegamePlan] = useState<MiddlegamePlan | null>(null);
  const [activeMistake, setActiveMistake] = useState<CommonMistake | null>(null);
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

  /** Mount PlayableLinePlayer (watch mode) on the mistake's authored
   *  punishment line. Mistakes intentionally only get WATCH — Learn /
   *  Practice / Play would be asking the student to drill the WRONG
   *  move, which contradicts the pedagogy. The static expand-card stays
   *  for mistakes without a punishmentLine (legacy fallback). */
  const handleMistakeWatch = useCallback((mistake: CommonMistake): void => {
    setActiveMistake(mistake);
    setViewMode('mistake-watch');
  }, []);

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
    void voiceService.speakForced(sanitizeForTTS(text)).finally(() => {
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
      return <LessonPlayer script={lesson} onExit={handleExit} />;
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
            // Watching the subline's master class through marks it Learned.
            void markLineDiscovered(opening.id, activeVariationIndex).then(() => loadOpening());
          }}
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

  // Named-trap PLAY — play it out against the coach, locked to this opening.
  if (viewMode === 'named-trap-play' && activeNamedTrapId) {
    return (
      <OpeningPlayMode
        opening={opening}
        onExit={handleExit}
      />
    );
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

  // Learn mode (main line or variation)
  if (viewMode === 'learn' || viewMode === 'variation-learn') {
    // When a master class exists for this line, Learn plays it (the
    // authored chapter) instead of the generic LLM move-narrator drill.
    const learnLesson = viewMode === 'variation-learn'
      ? getVariationLessonScript(opening.id, opening.variations?.[activeVariationIndex]?.name)
      : getLessonScript(opening.id);
    if (learnLesson) {
      return (
        <LessonPlayer
          script={learnLesson}
          onExit={handleExit}
          onComplete={viewMode === 'variation-learn'
            ? () => { void markLineDiscovered(opening.id, activeVariationIndex).then(() => loadOpening()); }
            : undefined}
        />
      );
    }
    return (
      <DrillMode
        opening={opening}
        variationIndex={viewMode === 'variation-learn' ? activeVariationIndex : undefined}
        onComplete={handleComplete}
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
    return (
      <PracticeMode
        opening={opening}
        variationIndex={viewMode === 'variation-practice' ? activeVariationIndex : undefined}
        onComplete={handleComplete}
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

  // Common Mistake WATCH — auto-play the wrong move + its punishment
  // with narration. Only WATCH is wired (Learn/Practice/Play would ask
  // the student to drill the wrong move, which contradicts the point).
  if (viewMode === 'mistake-watch' && activeMistake?.punishmentLine) {
    return (
      <PlayableLinePlayer
        line={activeMistake.punishmentLine}
        boardOrientation={opening.color}
        mode="watch"
        onComplete={handleExit}
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
  const namedTraps: (RuyTrapDef | ViennaTrapDef)[] =
    opening.id === 'ruy-lopez' ? getRuyTrapsForTab(tabKey)
      : opening.id === 'vienna-game' ? getViennaTrapsForTab(tabKey)
        : [];
  const namedWeapons = namedTraps.filter((t) => t.kind === 'weapon');
  const namedWarnings = namedTraps.filter((t) => t.kind === 'warning');

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
      />

      {/* WALKTHROUGH, LEARN, PRACTICE, PLAY buttons */}
      <div className="grid grid-cols-4 gap-1.5 mb-6">
        <button
          onClick={() =>
            isVariation ? handleStartVariationWalkthrough(selectedTabIndex) : setViewMode('walkthrough')
          }
          className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-theme-accent text-white font-semibold text-xs hover:opacity-90 transition-opacity opening-action-glow opening-action-glow-watch"
          data-testid="walkthrough-btn"
        >
          <PlayCircle size={18} />
          Watch
        </button>
        <button
          onClick={() => (isVariation ? handleStartVariationLearn(selectedTabIndex) : setViewMode('learn'))}
          className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-theme-surface border border-theme-border text-theme-text font-semibold text-xs hover:bg-theme-border transition-colors opening-action-glow opening-action-glow-learn"
          data-testid="learn-btn"
        >
          <LearnIcon size={18} />
          Learn
        </button>
        <button
          onClick={() =>
            isVariation ? handleStartVariationPractice(selectedTabIndex) : setViewMode('practice')
          }
          className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-theme-surface border border-theme-border text-theme-text font-semibold text-xs hover:bg-theme-border transition-colors opening-action-glow opening-action-glow-practice"
          data-testid="practice-btn"
        >
          <Brain size={18} />
          Practice
        </button>
        <button
          onClick={() => {
            if (isVariation) {
              handleStartVariationPlay(selectedTabIndex);
              return;
            }
            // Same room as Play with Coach — declare the main line and hand
            // off to /coach/play to play it from move 1 against the coach.
            useCoachMemoryStore.getState().setIntendedOpening({
              name: opening.name,
              color: opening.color,
              capturedFromSurface: 'openings-play',
              pgn: opening.pgn,
            });
            void navigate(`/coach/play?side=${opening.color}`);
          }}
          className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-theme-surface border border-theme-border text-theme-text font-semibold text-xs hover:bg-theme-border transition-colors opening-action-glow opening-action-glow-play"
          data-testid="play-btn"
        >
          <Swords size={18} />
          Play
        </button>
      </div>

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
          so there's no separate inline theory dump. */}
      <MiddlegamePlansSection
        openingId={opening.id}
        boardOrientation={opening.color}
        onAction={handleMiddlegameAction}
        filterPlanIds={subjectPlanIds}
        emptyNote={mainPlanNote}
      />

      {/* Named WEAPONS for THIS tab — student-side punishments when the
          opponent slips. A single green-outlined card (no "Weapons" SECTION
          header — no blank zones per playbook §0.5), rendered between
          Master and Pitfalls so the arc reads: plans → weapons you wield
          → things you avoid. Same WLPP shape as the warnings tile. */}
      {namedWeapons.length > 0 && (
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
            onWatchPunishment={handleMistakeWatch}
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
