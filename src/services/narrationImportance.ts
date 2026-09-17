// narrationImportance — THE COMPUTER decides what is spoken (David 2026-08-26,
// LOCKED — see CLAUDE.md "THE COMPUTER DECIDES WHAT IS SPOKEN").
//
// The coach's fact-computers detect a LOT. Not all of it should be spoken, and
// the LLM must NOT be the one that decides what to keep — deciding what matters
// is a chess judgment, and G0 says the LLM makes none. This module is that
// decision, in code: given the grounded signals a surface already holds, it
// returns whether a moment earns voice and how it RANKS (the briefing orders by
// rank; the LLM then voices everything, most-important-first).
//
// It does NOT re-run the engine and it does NOT add a second criticality. It
// COMPOSES the existing grounded primitives — `scanCriticality` (rating-scaled
// decision-leverage), the played move's cpLoss (realized swing), the null-move
// threat probe (must-defend), a declared teaching beat, and the WDL/eval
// contested gate. Importance is rating-relative: the same board matters
// differently to a 1200 and a 2200.
//
// Why not "did the eval bar move": that is too blunt and fails four ways —
// (1) the sharp-but-flat position (only move found, bar flat, yet critical),
// (2) the decided blow-out (+8→+5 in a won game moves the bar, means nothing),
// (3) the standing threat (bar flat NOW, piece hangs next move), (4) the quiet
// lesson (plan in a calm position). The composition below catches all four.
import { criticalityThresholds, type CriticalMoment } from './criticalityScan';

export interface ImportanceSignals {
  /** Prospective decision-leverage — `scanCriticality`'s read of THIS position
   *  (rating-scaled severity + gap). null when no scan was run. */
  decision: Pick<CriticalMoment, 'severity' | 'gapCp'> | null;
  /** Realized swing of the move JUST PLAYED, mover-POV COST in cp (>0 = the move
   *  made things worse). null for a prospective-only read (no move to grade). */
  cpLossCp: number | null;
  /** Live standing must-defend material in points, from the null-move threat
   *  probe — what the opponent wins next move if unmet. 0 when nothing hangs. */
  threatNet: number;
  /** A declared teaching beat here (opening name / plan / keystone). NOT
   *  eval-driven — this is the curriculum, and it speaks in a quiet position. */
  teachingBeat: boolean;
  /** A chess.js-computed STANDING DANGER: a pin/skewer in waiting on your own
   *  king or queen, a castled king with a broken shelter under real fire, a
   *  central king with the file about to open, or a trade that would create one
   *  of those. The engine-derived signals cannot see any of these, and they are
   *  most dangerous where the eval looks settled — so, like `threatNet`, this is
   *  NOT gated by the contested test. Optional: a surface that runs no such
   *  probe simply omits it. */
  standingDanger?: boolean;
  /** White-POV cp at this position — for the contested gate + the mate override. */
  evalCpWhitePov: number | null;
  /** Stockfish WDL (per-mille) at this position — the practical contested read. */
  wdl: readonly [number, number, number] | null;
}

export type ImportanceTier =
  | 'mate' | 'only-move' | 'blunder' | 'must-defend' | 'critical' | 'swing'
  | 'teaching' | 'convert' | 'none';

export interface ImportanceVerdict {
  /** Does this moment earn voice at all? */
  speak: boolean;
  /** Ranking weight — higher leads in the briefing (and survives truncation). */
  rank: number;
  /** The dominant reason it speaks (or 'none'). */
  tier: ImportanceTier;
  /** Every signal that fired, for observability / the facts trail. */
  reasons: string[];
  /** Whether the position is still contested (false = decided). */
  contested: boolean;
}

/** A position is DECIDED when the practical result is lopsided — a swing inside
 *  a decided game is not important (kills the "+8→+5" false positive). WDL is
 *  the honest read; the eval magnitude is the fallback when WDL is absent. */
const DECIDED_WDL = 900;      // per-mille win or loss
const DECIDED_EVAL_CP = 600;  // 6 pawns, fallback
const MATE_CP = 100000;

export function isContested(
  evalCpWhitePov: number | null,
  wdl: readonly [number, number, number] | null,
): boolean {
  if (wdl) return wdl[0] < DECIDED_WDL && wdl[2] < DECIDED_WDL;
  if (evalCpWhitePov != null) return Math.abs(evalCpWhitePov) < DECIDED_EVAL_CP;
  return true; // unknown → treat as contested; never silence on missing data
}

/**
 * The importance verdict.
 *
 * `rating` scales the swing/decision bars (a 2-pawn swing is a must-know for a
 * 1200; a 0.5 subtlety is for a 2200 — the slip-detector doctrine, shared with
 * `criticalityThresholds`). Per the ALGO-BASED supreme law, the rating is the
 * COLD-START PRIOR: it stands in where we have no data on this student.
 *
 * `studentBoost` is the DATA term — how much THIS student's own recorded
 * mistakes raise this moment. It is `boostFor(match)` computed by the CALLER
 * with the existing fine-grained join (`matchTacticPattern(conceptId) ??
 * matchClauseKind(kind)`), the same one `positionFacts`, `reviewFacetRank` and
 * `needScore` already use.
 *
 * 🚨 WHY IT ARRIVES PRE-MATCHED INSTEAD OF BEING LOOKED UP HERE. The first
 * design had this function do its own `Record<ImportanceTier, cluster>` lookup.
 * That would have been a FOURTH join of facts to holes beside three finer ones,
 * free to drift from them — and it would have joined on a LOSSY key, since an
 * `ImportanceTier` of 'blunder' can be a hung piece, a missed mate or a bad
 * trade. One authored row would have discarded the exact specificity the
 * student's data carries. Caught 2026-09-17 when David asked "is this algo
 * based?" — it was not. The join stays where it already is; only its RESULT
 * comes here.
 *
 * RAISE-ONLY, structurally. `boostFor` returns 0 or positive (0 for a hole the
 * lifecycle marks `fixed`), so data can lift a moment over the interrupt bar
 * and can never push one under it. That matters because nothing yet records
 * CORRECT play, so "no weakness here" cannot be told apart from "never met it"
 * — absent is not silent. A negative term would be inferring mastery from
 * missing data.
 */
export function computeImportance(
  s: ImportanceSignals,
  rating = 1500,
  studentBoost = 0,
): ImportanceVerdict {
  const contested = isContested(s.evalCpWhitePov, s.wdl);
  const th = criticalityThresholds(rating);
  const reasons: string[] = [];
  let rank = 0;
  let tier: ImportanceTier = 'none';
  const bump = (r: number, t: ImportanceTier, why: string): void => {
    reasons.push(why);
    if (r > rank) { rank = r; tier = t; }
  };

  // Teaching beats speak in ANY phase — but a decided game shifts them from the
  // full plan to the single "this is technique now" convert beat.
  if (s.teachingBeat) {
    if (contested) bump(40, 'teaching', 'declared teaching beat');
    else bump(20, 'convert', 'decided — convert-mode teaching');
  }

  // The DECISION/SWING signals only matter while the game is contested — a swing
  // inside a decided game (+8→+5) is the "eval-bar moved" false positive the
  // contested gate exists to kill (doctrine failure #2).
  if (contested) {
    if (s.cpLossCp != null && s.cpLossCp >= th.critical) {
      const big = s.cpLossCp >= th.critical * 2;
      bump(big ? 90 : 70, big ? 'blunder' : 'swing', `realized swing ${(s.cpLossCp / 100).toFixed(1)}p`);
    }
    if (s.decision) {
      if (s.decision.severity === 'only-move') bump(85, 'only-move', 'only move holds');
      else if (s.decision.severity === 'critical') bump(65, 'critical', 'a decision hinges here');
    }
  }

  // MUST-DEFEND is NOT gated by contested (B#1, deep-dive 2026-09-12). A live
  // standing threat that drops ≥ a minor is exactly what the flat/decided bar
  // HIDES (doctrine item #3: "catches the hanging-piece the flat bar hides"):
  // in a WON game it becomes the "consolidate — don't let them punch back" beat
  // (positionFacts frames it by eval), and losing a piece is precisely what
  // un-decides a won game; in a lost game it is still valid defensive advice.
  // The old `if (contested)` gate silenced a real hang whenever the student was
  // clearly winning — the purpose-built winning-framing beat could never fire.
  if (s.threatNet >= 3) bump(75, 'must-defend', `must-defend: ${s.threatNet} hangs`);

  // A STANDING DANGER, same reasoning and the same ungated treatment: a pin or
  // skewer in waiting on your own king/queen, a castled king whose shelter is
  // broken with real attackers on it, a central king with the file about to
  // open. Pure chess.js geometry, so the engine-derived signals above cannot
  // see it at all — and it is most dangerous exactly where the eval looks
  // settled, which is what the contested gate would otherwise silence. Ranked
  // just under must-defend: a live hang is now, this is next move.
  if (s.standingDanger) bump(74, 'must-defend', 'a standing danger on the board');

  // A forced mate outranks everything, contested-gate or not.
  if (s.evalCpWhitePov != null && Math.abs(s.evalCpWhitePov) >= MATE_CP) {
    bump(100, 'mate', 'forced mate on the board');
  }

  // ── THE STUDENT TERM (algo-based supreme law) ────────────────────────────
  // Their own recorded mistakes raise this moment. RAISE-ONLY and only on a
  // moment that ALREADY fired: a weakness makes a real moment more worth
  // stopping for, it never MANUFACTURES one out of a quiet ply. Without that
  // guard a persistent hole would make every position important and the coach
  // would interrupt constantly — the "things don't get stated" failure inverted
  // into "nothing can be heard over the noise".
  if (studentBoost > 0 && rank > 0) {
    rank += studentBoost;
    reasons.push(`this student's own recorded weakness (+${studentBoost})`);
  }

  return { speak: rank > 0, rank, tier, reasons, contested };
}
