import { useCallback, useEffect, useRef, useState } from 'react';
import { createStandingFactMemory, fullmoveOf, type StandingFactMemory } from '../services/standingFactMemory';
import { voiceService } from '../services/voiceService';
import { stockfishEngine, resolveWorkerUrl } from '../services/stockfishEngine';
import { computePositionFacts, clauseClaims, type LastMoveInput, type PhaseFact, NAMES_NO_MOVE } from '../services/positionFacts';
import { NO_PROOF } from '../services/proof';
import { useWeaknessSignals } from './useWeaknessSignals';
import { useStudentNeed } from './useStudentNeed';
import { lastMoveIfStudent, sansOfPgn } from '../services/lastMoveOfLine';
import { logAppAudit } from '../services/appAuditor';

import { db } from '../db/schema';
import { getCachedStockfish, setCachedStockfish } from './stockfishFenCache';
import { isSpokenSentenceGrounded } from '../services/coachAnswerGates';
import { buildFedTacticsContext, speakDeepestLookahead } from '../services/liveTacticsContext';
import { selectTeaching, renderThesis, pliesFromSans } from '../services/teachingSelector';
import { registerFor } from '../coach/surfaceContract';
import { splitSpeakableSentences } from '../utils/sentenceSplit';
import type { PhaseNarrationVerbosity, StockfishAnalysis } from '../types';
import type { PhaseTransitionEvent } from '../services/phaseTransitionDetector';
import { DEFAULT_STUDENT_RATING } from '../services/ratingBands';
import { positionOf } from '../utils/samePosition';

interface UsePhaseNarrationArgs {
  /** Full PGN at narration time — fed into the grounding block. */
  getPgn: () => string;
  /** The student's seat. REQUIRED (B3): the need context is loaded for one
   *  colour at mount, and a transition event names its `playerColor` only when
   *  it fires — too late to load for, and a default would be a guessed seat. */
  playerColor: 'white' | 'black';
  /** Opening name as detected by the coach game screen. */
  getOpeningName: () => string | null;
  /**
   * The board the student is looking at RIGHT NOW.
   *
   * A transition report is computed from the position where the transition was
   * detected, but it is spoken sentence by sentence over the seconds that
   * follow — by which time the game has usually moved on. In a live Learn game
   * (2026-08-09) the coach said "The best move is fxe7. It wins the bishop on
   * e7." having ALREADY played fxe7: true of the detection position, and a
   * plain falsehood about the board in front of the student, who was looking
   * at a white pawn on e7.
   *
   * Given this, each sentence is judged against the live board instead, so a
   * claim the position has outrun is dropped rather than spoken. Optional: a
   * caller that does not pass it keeps the old detection-position behaviour.
   */
  getLiveFen?: () => string;
  /** Persist the finished phase-transition report as a chat message (David
   *  2026-07-01: the report should live in the messages under the board, not
   *  a transient banner that pops up then disappears). Called once with the
   *  final report text when the narration content is finalized. */
  onReport?: (text: string) => void;
  /** The page's say-once memory for THIS game, or null to keep the hook's own.
   *  Required so a surface decides: Learn passes its memory, so the balance
   *  sheet at the phase turn and the page's positional read are ONE ledger
   *  (Learn walk, fresh Nimzo game, 2026-09-26: "their king is still in the
   *  centre" and "a3 is isolated" said on three moves through two lanes that
   *  each kept their own memory). */
  getStanding: (() => StandingFactMemory) | null;
  /** The surface's turn door — REQUIRED. The report is handed over ONCE, as
   *  typed facts carrying their claim keys, and decided as one wave of the
   *  turn it was read on, never sentence by sentence (root causes 5 and 6,
   *  Smith-Morra replay 2026-10-19). Resolves with what was actually spoken,
   *  which is what the report keeps. There is no other path: a surface that
   *  narrates a transition does it through its door (G8.5). */
  speakFacts: (facts: readonly PhaseFact[], fen: string) => Promise<string>;
}

interface UsePhaseNarrationResult {
  narrate: (event: PhaseTransitionEvent, verbosity: Exclude<PhaseNarrationVerbosity, 'off'>) => Promise<void>;
  cancel: () => void;
  isNarrating: boolean;
  currentText: string;
  error: string | null;
}

/** How far the board may travel past a detected phase boundary and still have
 *  the report spoken, in plies.
 *
 *  Three: the coach's reply, the student's next move, and its reply — the
 *  realistic span between detecting the boundary and finishing a spoken
 *  report. A structural announcement ("the opening is over") stays true across
 *  that window; a tactical one would not, which is why the per-sentence board
 *  grading is untouched and still judges every claim against the position it
 *  was computed from. */
const PHASE_REPORT_PLY_GRACE = 3;

/** Stockfish analysis depth for phase narration. PHASE-LAG-01 set 12;
 *  PHASE-LAG-02 drops to 10 to match Read Position. Deterministic
 *  tactics detection runs on every FEN in buildChessContextMessage
 *  regardless, so the engine contributes only eval direction + top
 *  lines — not something that benefits from deeper search here. */
const STOCKFISH_DEPTH = 10;
const NARRATION_SPEAK_TIMEOUT_MS = 60_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label}-timeout`)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
  });
}

/**
 * Fires automatic narration at phase boundaries (opening→middlegame,
 * middlegame→endgame). Consumer holds the phase-transition ledger and
 * calls `narrate()` when the detector produces an event AND all
 * gating conditions pass (verbosity ≠ 'off', no blunder pending, no
 * position-narration in flight).
 *
 * Shape parallels `usePositionNarration` so the two hooks are
 * interchangeable from an observability standpoint — same grounding
 * pipeline, same timeout discipline, same token-supersession
 * cancellation.
 */
export function usePhaseNarration(args: UsePhaseNarrationArgs): UsePhaseNarrationResult {
  const weaknessRef = useWeaknessSignals(); // student model → re-ranks phase narration (Phase 1)
  // …AND THE NEED TERM (B3) — the line is read from the PGN at fire time.
  // Declared BEFORE the need hook: the hook reads the `sans` getter during
  // render now (it mints the ONE opening key from the line), so the ref it
  // closes over must already exist.
  const argsRef = useRef(args);
  argsRef.current = args;
  const studentNeedRef = useStudentNeed({
    studentColor: args.playerColor, openingId: null, eco: null,
    sans: () => sansOfPgn(argsRef.current.getPgn() ?? ''),
  });
  // SAY-ONCE across the game — see useLiveCoach for the reasoning. Phase
  // transitions are rarer, but the structure line is exactly the kind of
  // standing fact that would open every one of them identically.
  // …and the set FORGETS when the board goes backwards. The rule (and the
  // reasoning) lives in `standingFactMemory` — CoachTeachPage carried its own
  // copy of it, under different ref names, with a comment admitting as much.
  const ownStandingRef = useRef(createStandingFactMemory());
  const standingRef = { get current(): StandingFactMemory { return argsRef.current.getStanding?.() ?? ownStandingRef.current; } };
  const [isNarrating, setIsNarrating] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const activeTokenRef = useRef(0);
  // Capture args in a ref so the narrate callback's dependency list
  // stays empty — the hook is called once per coach play session and
  // should reuse the same narrate reference across renders.

  useEffect(() => {
    return () => {
      activeTokenRef.current += 1;
      voiceService.stop();
      setIsNarrating(false);
      setCurrentText('');
      setError(null);
    };
  }, []);

  const cancel = useCallback(() => {
    activeTokenRef.current += 1;
    voiceService.stop();
    setIsNarrating(false);
    setCurrentText('');
  }, []);

  const narrate = useCallback(async (
    event: PhaseTransitionEvent,
    verbosity: Exclude<PhaseNarrationVerbosity, 'off'>,
  ): Promise<void> => {
    activeTokenRef.current += 1;
    const token = activeTokenRef.current;
    voiceService.stop();
    setError(null);
    setCurrentText('');
    setIsNarrating(true);
    // WO-PHASE-LAG-01: detection timestamp drives the tap-to-first-word
    // latency measurement. Phase narration has no literal tap — "tap"
    // here means "the moment the hook received the detection event".
    const detectedTs = Date.now();

    // Full-trail instrumentation (WO-PHASE-FIX-02): record that the
    // hook actually received an event. If Dave ever sees a
    // 'phase-transition-detected' audit entry without a matching
    // 'usePhaseNarration received' entry, the dispatch wiring is
    // broken between CoachGamePage and the hook.
    void logAppAudit({
      kind: 'phase-transition-detected',
      category: 'subsystem',
      source: 'usePhaseNarration',
      // The triggering RULE rides the summary, where PostHog keeps it. It is
      // the field that answers "why did the opening end HERE" — and it used to
      // live only in a console.log printed to a devtools console nobody was
      // watching in production. A boundary that keeps firing on
      // `move-15-safety` means the seven real rules are too strict; that is
      // tunable only if the reason is durable.
      summary: `received: ${event.kind} verbosity=${verbosity}${event.triggeringRule ? ` rule=${event.triggeringRule}` : ''} move=${event.triggeringMoveSan}`,
      details: JSON.stringify(event),
      fen: event.fen,
    });

    try {
      /** The tactics read of `event.fen`, once the engine lands — the whole-
       *  fact grade below reads it. */
      let phaseTactics: Awaited<ReturnType<typeof buildFedTacticsContext>> | undefined = undefined;
      /** Whether the search had landed by the first fact (latency audit). */
      let engineResolved = false;
      let pfConcrete = false; // positionFacts produced a real board-truth clause
      let sentenceCount = 0;
      /** Every fact already offered on this transition, normalised. */
      const spokenKeys = new Set<string>();
      const sayKey = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      let staleLogged = false;
      /** Same POSITION, ignoring the clocks — a halfmove counter ticking is
       *  not the board moving. */
      const samePhasePosition = (a: string, b: string): boolean =>
        positionOf(a) === positionOf(b);
      /** The report's facts, typed, in the order they were computed. ONE door
       *  call decides them as a wave of the turn they were read on (root
       *  causes 5 and 6, Smith-Morra replay 2026-10-19). */
      const phaseFacts: PhaseFact[] = [];
      /** ONE FACT, GRADED WHOLE, for the door. If any sentence of it is
       *  refused the whole fact is refused, so an answer is never heard
       *  without the claim it answers. */
      const offerFact = (f: PhaseFact): void => {
        const text = f.text.trim();
        if (!text || reportOutrun()) return;
        const { sentences, rest } = splitSpeakableSentences(text);
        const parts = rest.trim() ? [...sentences, rest.trim()] : sentences;
        if (!parts.every((p) => isSpokenSentenceGrounded(p, f.gradeFen ?? event.fen, 'usePhaseNarration', phaseTactics))) return;
        const key = sayKey(text);
        if (key && spokenKeys.has(key)) return;
        if (key) spokenKeys.add(key);
        phaseFacts.push({ ...f, text });
      };
      const noteFirstDispatch = (chars: number): void => {
        sentenceCount += 1;
        if (sentenceCount === 1) {
          const firstDispatchMs = Date.now() - detectedTs;
          void logAppAudit({
            kind: 'phase-narration-latency',
            category: 'subsystem',
            source: 'usePhaseNarration',
            summary: `detection-to-first-dispatch ${firstDispatchMs}ms (${event.kind})`,
            details: JSON.stringify({
              tapToFirstDispatchMs: firstDispatchMs,
              firstSentenceChars: chars,
              stockfishResolved: engineResolved,
              transitionKind: event.kind,
            }),
            fen: event.fen,
          });
        }
      };
      /** Has the game moved too far past this report for it to speak? */
      const reportOutrun = (): boolean => {
        // Per-sentence spoken gate — this surface streams sentences to
        // Polly as they arrive (before the spine's final-text gate), so a
        // board-false OR out-of-vocab-tactic sentence must be dropped HERE,
        // before it's spoken. Pass phaseTactics so the tactic half fires too —
        // it was omitted, so a hallucinated fork/pin was board-checked only and
        // still SPOKEN (David 2026-07-04 PostHog sweep).
        // ── ONE DECISION ABOUT STALENESS, NOT ONE PER SENTENCE ─────────────
        //
        // 🔒 THE COACH WAS GOING SILENT EXACTLY WHERE IT SHOULD TEACH. The
        // 2026-08-11 PostHog sweep found this gate dropping lines like "Queen
        // on d8 pins pawn on d3 against queen on d1" — and they were NOT
        // hallucinations. The claim is computed at `event.fen`, the transition
        // position, and this graded it against `getLiveFen()`, the board right
        // now. Both are correct boards; they are just different ones. So a
        // sentence that was true when detected became "board-false" purely
        // because the student moved while the narration was being phrased and
        // streamed.
        //
        // Worse than the silence was its GRANULARITY. Judged per sentence
        // against a board that moves underneath them, some survived and some
        // did not — so the student heard a narration with holes in it, one
        // clause referring to a piece the next clause had already abandoned.
        // Half a teaching line is not half as good as a whole one.
        //
        // Staleness is a property of the TRANSITION, not of each sentence, so
        // it is decided once, up front. If the board has already moved past the
        // position this report is about, the whole report is abandoned — no
        // half-narration, and the reason is logged rather than looking like the
        // gate eating content. If it has not, every sentence is graded against
        // `event.fen`: the board it was actually computed from, which is what
        // grading is supposed to mean and removes the race entirely.
        // ── A BOUNDARY IS NOT A TACTIC: IT SURVIVES THE NEXT MOVE ──────────
        //
        // 🔒 EXACT-POSITION STALENESS WAS TOO STRICT FOR THIS PARTICULAR
        // CLAIM, and it is why the audit still caught a transition being
        // abandoned even after the call site was fixed to hand over the live
        // board. "The opening is over" does not stop being true because one
        // more move was played — unlike "the knight on f6 is pinned", which
        // does. Judging a structural announcement by a tactical rule threw
        // away teaching that was still perfectly correct.
        //
        // So the window is measured in PLIES, not in exact equality. Three is
        // the coach's reply, the student's next move, and its reply — the
        // realistic span between detecting a boundary and finishing a spoken
        // report. Past that it is genuinely old news and the whole-abandon
        // rule stands, because a student four plies on has moved to a
        // different problem.
        //
        // The per-sentence grading below is UNCHANGED and still runs against
        // `event.fen`: the board each claim was computed from. This relaxes
        // only which reports get to speak, never what they may assert.
        const sansNow = (argsRef.current.getPgn() ?? '')
          .split(/\s+/).filter((t) => t && !/^\d+\.$/.test(t));
        const pliesSince = sansNow.length - event.moveNumber;
        const liveNow = argsRef.current.getLiveFen?.() ?? event.fen;
        const movedOn = !samePhasePosition(liveNow, event.fen);
        // An UNKNOWN distance is not a short one. If the ply arithmetic cannot
        // be done — no `moveNumber` on the event, an unreadable pgn — the
        // grace window is not merely skipped, it collapses back to the strict
        // exact-position rule. A widened guard that silently stops guarding
        // when its input goes missing is worse than the narrow one it
        // replaced, and `NaN > 3` is false, which is the quiet way to get
        // there.
        const distanceKnown = Number.isFinite(pliesSince);
        if (movedOn && (!distanceKnown || pliesSince > PHASE_REPORT_PLY_GRACE)) {
          if (!staleLogged) {
            staleLogged = true;
            void logAppAudit({
              kind: 'coach-surface-migrated',
              category: 'subsystem',
              source: 'usePhaseNarration.stale',
              summary: `the board moved ${pliesSince} plies past this ${event.kind} before the narration could speak — abandoning it whole`,
              fen: event.fen,
            });
          }
          return true;
        }
        return false;
      };
      // THE ONE SELECTOR reads the live game so far (unified-coach N1): the
      // thesis — the tactic the game has turned on — is a computed DNA-register
      // sentence in the present register, offered to the door like every
      // other fact of the report. Silent
      // when nothing has turned yet; a phase transition is a beat, and this is
      // the one game-level fact it may carry.
      try {
        const sans = (argsRef.current.getPgn() ?? '').split(/\s+/).filter((t) => t && !/^\d+\.$/.test(t));
        const pkg = selectTeaching({ plies: pliesFromSans(sans), studentColor: event.playerColor, kind: 'live', surface: 'phase-narration' });
        // Only a real TURN (an eval swing) is a game-level fact at a phase
        // change; a pin that merely "landed" — here a bishop retreat keeping an
        // old pin — is a detector event, not the story of the game.
        const thesis = pkg.thesis.kind === 'turned' ? renderThesis(pkg.thesis, registerFor('phase-narration')) : '';
        if (thesis) offerFact({ text: thesis, claims: [`thesis:${sayKey(thesis)}`], proof: NO_PROOF.description, namesStudentMove: NAMES_NO_MOVE });
      } catch { /* the selector is a bonus here, never a blocker */ }

      // WO-PHASE-LAG-02: check the shared Stockfish FEN cache first.
      // When Read Position ran the engine on this exact board a few
      // seconds ago (or another phase transition produced the same
      // position), we skip the engine cycle entirely and jump straight
      // to LLM dispatch. Emits narration-stockfish-cache-hit for
      // observability parity with usePositionNarration.
      let stockfishAnalysis: StockfishAnalysis | null;
      const cachedAnalysis = getCachedStockfish(event.fen);
      if (cachedAnalysis) {
        void logAppAudit({
          kind: 'narration-stockfish-cache-hit',
          category: 'subsystem',
          source: 'usePhaseNarration',
          summary: 'skipped Stockfish — cached analysis',
          fen: event.fen,
        });
        stockfishAnalysis = cachedAnalysis;
        engineResolved = true;
      } else {
        // WO-PHASE-LAG-01: mirror WO-POLISH-03's parallel + race pattern.
        // Stockfish runs alongside the rest of setup; we race it against
        // a short budget so LLM dispatch isn't blocked by engine
        // analysis. PHASE_NARRATION_ADDITION already handles missing
        // stockfishAnalysis gracefully. WO-PHASE-LAG-02: depth 12 → 10,
        // budget 500ms → 300ms, successful analyses cached for reuse.
        // David 2026-07-03: the old `analyzePosition(depth) raced-to-null`
        // pattern searched to a FIXED depth (unbounded time) and threw the
        // result away on timeout — so the slow iOS asm.js build (the WASM
        // builds OOM / call_indirect-trap on iPhone) NEVER returned an eval and
        // the brain guessed "equal material." `analyzeWithBudget` instead lets
        // the engine search for the budget, then `stop()`s it and returns the
        // BEST line it reached so far — depth 5/6 on asm, full depth on desktop
        // (which resolves early). We take whatever it found in the time instead
        // of demanding a target depth; a real shallow eval beats null. The
        // code-counted material balance still covers a truly dead engine (G0).
        // Budget is generous because desktop resolves on depth well before it,
        // so it only bounds the genuinely-slow asm path.
        const engineIsAsm = resolveWorkerUrl().variant === 'asm';
        const budgetMs = engineIsAsm ? 5000 : 1200;
        stockfishAnalysis = await stockfishEngine
          .analyzeWithBudget(event.fen, STOCKFISH_DEPTH, budgetMs)
          .then((r) => {
            setCachedStockfish(event.fen, r);
            return r as StockfishAnalysis | null;
          })
          .catch(() => null as StockfishAnalysis | null);
        engineResolved = stockfishAnalysis !== null;
      }
      if (token !== activeTokenRef.current) return;

      const profile = await db.profiles.get('main');
      const rating = profile?.currentRating ?? DEFAULT_STUDENT_RATING;

      // GROUNDING INVERSION (G0): hand the brain the REAL, code-computed tactics
      // for this position so it can only VOICE them — instead of free-reasoning
      // over the board and naming a pin/fork that isn't there (PostHog
      // `phase-narration.tacticClaimGate … no tactics context`, David 2026-06-22).
      // The prompt below already promises a "Tactics analysis block"; without
      // this the block was never sent, so the LLM invented tactics and the gate
      // stripped them. Reuses the Stockfish read just done — no extra round trip.
      phaseTactics = await buildFedTacticsContext(
        event.fen,
        event.playerColor === 'white' ? 'w' : 'b',
        rating,
        stockfishAnalysis,
        undefined, // default analyzer
        profile?.skillRadar?.tactics, // adaptive lookahead (David 2026-07-03)
      ).catch(() => undefined);
      if (token !== activeTokenRef.current) return;

      // POSITION FACTS — enrich the phase beat with the computed board-truth
      // supply: the opponent's standing threat, their intent, and the leans-on
      // why-probe. Excludes key-moment + convert — this surface deliberately
      // drops the eval/decision framing (David 2026-08-23). Reuses the analysis
      // already read; the importance model gates whether anything speaks.
      try {
        standingRef.current.observe(fullmoveOf(event.fen));
        if (stockfishAnalysis?.topLines?.length) {
          const pf = await computePositionFacts({
      boardComputers: 'composer',
            // Mid-game, unasked-for. The transition has to earn its sentence.
            posture: 'interrupt',
            fen: event.fen,
            moverColor: event.fen.split(' ')[1] === 'b' ? 'b' : 'w',
            studentColor: event.playerColor === 'white' ? 'w' : 'b',
            rating,
            analysis: stockfishAnalysis,
            evalBoard: (f) => stockfishEngine.evalBoard(f),
            studentWeaknesses: weaknessRef.current,
            // THE HEAT MAP + THE NEED TERM (B3). The transition fires on the
            // student's move, so the last move of the line is theirs when the
            // PGN really produces `event.fen`; otherwise absent. `cpLoss: null`
            // — this surface never graded the move.
            ...((): { lastMove?: LastMoveInput } => {
              const lm = lastMoveIfStudent(sansOfPgn(argsRef.current.getPgn() ?? ''), event.playerColor, event.fen);
              return lm ? { lastMove: lm } : {};
            })(),
            studentNeedContext: studentNeedRef.current,
            alreadySaid: standingRef.current.said,
            // What they keep doing — the game so far (the speed-run depth).
            history: sansOfPgn(argsRef.current.getPgn() ?? ''),
            // WO-TEACH-02 S4 — this board IS the turn of the game, so the
            // composer takes stock: who's better, and why.
            phaseTurn: event.kind === 'opening-to-middlegame' ? 'middlegame' : 'endgame',
          });
          for (const t of pf.remember) standingRef.current.said.add(t);
          // EVERY CLAUSE AS ITSELF, carrying the claim keys the turn's own
          // position-facts lane gives the same clause (`clauseClaims`), so
          // the door's ledger sees one fact where both lanes say it.
          {
            pf.clauses.forEach((c, i) => {
              if (c.kind === 'key-moment' || c.kind === 'convert' || !c.text.trim()) return;
              pfConcrete = true;
              offerFact({
                text: c.text, claims: clauseClaims(pf, i, event.fen), proof: c.proof ?? NO_PROOF.description, namesStudentMove: c.namesStudentMove,
                ...(c.squares ? { squares: c.squares } : {}), ...(c.stakes ? { stakes: c.stakes } : {}),
                ...(c.lines ? { lines: c.lines } : {}), ...(c.gradeFen ? { gradeFen: c.gradeFen } : {}),
                factKind: c.kind, ...(c.skill ? { skill: c.skill } : {}),
              });
            });
          }
        }
      } catch { /* the position-facts lane is a bonus, never a blocker */ }
      if (token !== activeTokenRef.current) return;

      // P5 — GUARANTEED deep look-ahead (David 2026-07-26): the deepest
      // foresight, pre-composed in code (G0), offered as a fact of the report.
      const phaseLookahead = phaseTactics ? speakDeepestLookahead(phaseTactics, 'student', event.playerColor === 'white' ? 'w' : 'b', false, weaknessRef.current) : null;
      if (phaseLookahead) offerFact({ text: phaseLookahead, claims: [`phase-lookahead:${sayKey(phaseLookahead)}`], proof: NO_PROOF.description, namesStudentMove: NAMES_NO_MOVE });

      // ── NOTHING CONCRETE, NOTHING SPOKEN ───────────────────────────────────
      // David 2026-08-08: "phase narration stays silent if no notes are
      // available", and the label it used to open with is "just useless noise".
      // A status announcement is never offered; only a computed fact is.
      if (!phaseLookahead && !pfConcrete && phaseFacts.length === 0) {
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'usePhaseNarration.silent',
          summary: `nothing concrete at this ${event.kind} (no fact, no look-ahead) — staying silent`,
          fen: event.fen,
        });
        return;
      }

      // ── THROUGH THE DOOR, ONCE ──────────────────────────────────────────
      // The whole report is one wave of its turn: the door decides it with
      // the turn's cost, what the turn already said and its lead, and what it
      // spoke is what the report keeps.
      if (phaseFacts.length === 0 || token !== activeTokenRef.current) return;
      noteFirstDispatch(phaseFacts[0].text.length);
      let spoken = '';
      try {
        spoken = await withTimeout(argsRef.current.speakFacts(phaseFacts, event.fen), NARRATION_SPEAK_TIMEOUT_MS, 'phase-narration-speak');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      }
      if (spoken.trim() && token === activeTokenRef.current) {
        setCurrentText(spoken);
        argsRef.current.onReport?.(spoken.trim());
      }
    } finally {
      if (token === activeTokenRef.current) {
        setIsNarrating(false);
      }
    }
  }, []);

  return { narrate, cancel, isNarrating, currentText, error };
}
