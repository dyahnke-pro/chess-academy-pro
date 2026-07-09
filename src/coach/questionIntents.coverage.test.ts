import { describe, it, expect } from 'vitest';
import { buildQuestionGrounding } from './questionIntents';
import type { MasterGroundingOptions } from '../services/coachApi';

/**
 * PHASE 4 — GROUNDING COVERAGE HARNESS (David 2026-07-09: "do 4 first" — drive
 * the free-compose fall-through to ~0 before shipping).
 *
 * After the rip there is NO free-compose path: an un-mapped chess turn falls to
 * the safe GROUNDED default (engine eval + best line), never to a free LLM. So
 * "coverage" is now: does a representative bank of REAL-shaped coach questions
 * route to a RICH assembler (its own fact-computer), or only to the position
 * default? Both are grounded; the richer the assembler hit-rate, the better the
 * answer. This harness is PURE (no browser, no LLM) — it runs the actual
 * `buildQuestionGrounding` intent router the spine uses and tallies the lane.
 *
 * The bank is informed by the real prod distribution (PostHog 30-day pull,
 * 2026-07-09): 452 `coach_question_asked` via coachService.ask across teach /
 * game-chat / hint / mic surfaces, plus the ~150 grounding-gate trips the rip
 * eliminates. Questions span every grounded family (F1-F17) + the live-board
 * classes + a few genuinely non-chess turns (which correctly fire no intent).
 */

// The INTENT-signaling keys of MasterGroundingOptions — the flags that route a
// turn to a specific assembler. EXCLUDES:
//  - the raw liveState passthroughs (currentFen / moveHistory / tactics /
//    engine* / studentColor / openingId / surface) — data, not an intent.
//  - `openingProfileKind` / `repertoireGapKind` — REFINEMENT fields that carry a
//    DEFAULT value ('strongest' / 'hole') regardless of the ask; they only mean
//    anything when their paired `openingProfileQuestion` / `repertoireGapQuestion`
//    flag is true (which is how the dispatch gates them). Counting the default as
//    "intent fired" would wrongly flag every turn. (The default-value behavior is
//    harmless but sloppy — a candidate cleanup: return undefined when the paired
//    predicate is false.)
const INTENT_KEYS: ReadonlyArray<keyof MasterGroundingOptions> = [
  'planQuestion', 'bestMoveQuestion', 'tacticsQuestion', 'progressQuestion',
  'trendQuestion', 'openingProfileQuestion', 'statsQuestion',
  'strengthsQuestion', 'openingAccuracyQuestion', 'openingTrapsQuestion',
  'openingTrapsSystemAsk', 'reviewDueQuestion', 'mistakesQuestion',
  'tacticsProfileQuestion', 'phaseQuestion', 'repertoireGapQuestion',
  'accuracyQuestion', 'consistencyQuestion',
  'convertingQuestion', 'colorQuestion', 'recordsQuestion', 'recordVsTarget',
  'moveRatingQuestion', 'trainingRequestKind', 'puzzleStatsQuestion',
  'transferGapQuestion', 'skillRadarQuestion', 'masterPlayQuestion',
  'conceptQuestion', 'playerGamesQuestion', 'endgameQuestion',
  'positionAssessmentQuestion', 'teachingMethodQuestion', 'settingsQuestion',
  'appHelpQuestion',
];

function intentFired(g: MasterGroundingOptions): boolean {
  return INTENT_KEYS.some((k) => {
    const v = g[k];
    return typeof v === 'boolean' ? v : v !== undefined && v !== null;
  });
}

const FEN_MIDGAME = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 4';

/** Representative real-shaped questions. `lane`:
 *  - 'assembler' — MUST fire a rich intent (its own fact-computer).
 *  - 'position'  — a live-board chess turn with no rich intent; grounds via the
 *                  safe position default (engine eval + best line). Still G0.
 *  - 'convo'     — genuinely non-chess; correctly fires NO intent. */
const BANK: ReadonlyArray<{ q: string; lane: 'assembler' | 'position' | 'convo'; fen?: string }> = [
  // F2 live position / best-move / plan (game-chat + teach)
  { q: "what's the best move here?", lane: 'assembler', fen: FEN_MIDGAME },
  { q: 'who is winning right now?', lane: 'assembler', fen: FEN_MIDGAME },
  { q: "what's my plan in this position?", lane: 'assembler', fen: FEN_MIDGAME },
  { q: 'are there any tactics here?', lane: 'assembler', fen: FEN_MIDGAME },
  { q: 'is my knight hanging?', lane: 'assembler', fen: FEN_MIDGAME },
  { q: 'what do the masters play here?', lane: 'assembler', fen: FEN_MIDGAME },
  { q: 'how should I rate the move I just played?', lane: 'assembler', fen: FEN_MIDGAME },
  // F1 / F12 weakness + progress + stats (self-knowledge)
  { q: 'what am I weak at?', lane: 'assembler' },
  { q: 'am I improving?', lane: 'assembler' },
  { q: "what's my rating trend?", lane: 'assembler' },
  { q: 'what are my most common mistakes?', lane: 'assembler' },
  { q: "what's my puzzle accuracy?", lane: 'assembler' },
  { q: 'how consistent am I?', lane: 'assembler' },
  { q: 'how good am I at converting winning positions?', lane: 'assembler' },
  { q: 'do I play better as white or black?', lane: 'assembler' },
  { q: "what's my record against the Sicilian?", lane: 'assembler' },
  { q: 'show me my skill radar', lane: 'assembler' },
  { q: "what's my tactics profile?", lane: 'assembler' },
  { q: 'what reviews are due?', lane: 'assembler' },
  // F1 opening profile / accuracy / traps / repertoire gap
  { q: "what's my strongest opening?", lane: 'assembler' },
  { q: 'how accurate am I in the Caro-Kann?', lane: 'assembler' },
  { q: 'what traps can I play in the Italian?', lane: 'assembler' },
  { q: 'where are the gaps in my repertoire?', lane: 'assembler' },
  // F5 pedagogy / F15 app-help / F17 settings
  { q: 'how do you teach the Vienna?', lane: 'assembler' },
  { q: 'what does the Tactics tab do?', lane: 'assembler' },
  { q: 'how does the Calculation trainer work?', lane: 'assembler' },
  { q: 'is my voice narration on?', lane: 'assembler' },
  { q: "what's my narration level?", lane: 'assembler' },
  // F3 concept / F8 endgame / F4 player-games
  { q: "what's a fork?", lane: 'assembler' },
  { q: 'explain the back-rank mate', lane: 'assembler' },
  { q: 'how do I win a king and pawn endgame?', lane: 'assembler' },
  // Model-game lookup is served by the cerebellum tool loop + the position
  // default (this turn carries a FEN), not a dedicated chat assembler — so it
  // grounds via the position lane, still G0.
  { q: 'show me a model game in this line', lane: 'position', fen: FEN_MIDGAME },
  // F7 training requests
  { q: 'give me a fork puzzle', lane: 'assembler' },
  { q: 'drill my weaknesses', lane: 'assembler' },
  // position-default: a live-board chess turn with no rich intent
  { q: 'hmm, interesting position', lane: 'position', fen: FEN_MIDGAME },
  { q: 'talk me through what you see', lane: 'position', fen: FEN_MIDGAME },
  // genuinely non-chess conversational (fire NO intent → the conversational
  // lane, chess-forbidden + swept). NB: a bare "what's the <noun>?" trips the
  // deliberately-broad concept regex (so "what's zwischenzug" is caught); that
  // over-match is SAFE post-rip — assembleConceptAnswer returns null for a
  // non-chess noun and the turn falls to the conversational lane — so the bank
  // uses non-interrogative smalltalk to isolate the router decision.
  { q: 'thanks, that helps!', lane: 'convo' },
  { q: 'you are awesome', lane: 'convo' },
  { q: 'ok, let us keep going', lane: 'convo' },
];

describe('grounding coverage — the Phase-4 fall-through gate', () => {
  it('every question in the bank routes to its expected grounded lane', () => {
    const misrouted: string[] = [];
    let assembler = 0;
    let position = 0;
    let convo = 0;

    for (const { q, lane, fen } of BANK) {
      const g = buildQuestionGrounding(q, fen ? { fen } : {});
      const fired = intentFired(g);
      if (lane === 'assembler') {
        assembler += 1;
        if (!fired) misrouted.push(`ASSEMBLER-MISS: "${q}" fired no intent`);
      } else if (lane === 'position') {
        position += 1;
        // no rich intent expected, but it has a FEN → grounds via the position
        // default. A rich intent firing is fine too (still grounded).
      } else {
        convo += 1;
        if (fired) misrouted.push(`CONVO-LEAK: "${q}" fired a chess intent`);
      }
    }

    console.log(
      `[coverage] assembler=${assembler} position-default=${position} conversational=${convo} ` +
        `| chess-question rich-assembler coverage = ${assembler}/${assembler + position} ` +
        `(${Math.round((assembler / (assembler + position)) * 100)}%)`,
    );

    expect(misrouted).toEqual([]);
  });

  it('NO chess question falls through to a free-compose lane (post-rip: none exists)', () => {
    // The structural guarantee: every chess-signal turn either fires an
    // assembler OR (with a board) grounds on the position default. There is no
    // free-LLM chess lane to fall into. A chess question with a live FEN must
    // therefore always be groundable.
    for (const { q, lane, fen } of BANK) {
      if (lane === 'convo') continue;
      const g = buildQuestionGrounding(q, fen ? { fen } : {});
      const grounded = intentFired(g) || Boolean(g.currentFen);
      expect(grounded, `"${q}" has no grounded lane`).toBe(true);
    }
  });
});
